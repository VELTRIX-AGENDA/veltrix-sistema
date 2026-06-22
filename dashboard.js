const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];
const dashboardAtivos = document.getElementById("dashboardAtivos");

atualizarIndicadores();
mostrarAtendimentosAtivos();
mostrarProximoAtendimento();

function obterDataHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return ano + "-" + mes + "-" + dia;
}

function atualizarIndicadores() {
    const hoje = obterDataHoje();

    const agendamentosHoje = agendamentos.filter(function (item) {
        return item.data === hoje;
    });

    const emAtendimento = agendamentosHoje.filter(function (item) {
        return item.status === "Em Atendimento";
    });

    const finalizados = agendamentosHoje.filter(function (item) {
        return item.status === "Finalizado";
    });

    let faturamento = 0;

    for (let i = 0; i < finalizados.length; i++) {
        faturamento += Number(finalizados[i].preco || 0);
    }

    document.getElementById("totalHoje").innerText = agendamentosHoje.length;
    document.getElementById("emAtendimento").innerText = emAtendimento.length;
    document.getElementById("finalizadosHoje").innerText = finalizados.length;
    document.getElementById("faturamentoHoje").innerText = "R$ " + faturamento.toFixed(2);

    atualizarClientesEspeciais();
    atualizarMelhorProfissional(finalizados);
}

function atualizarClientesEspeciais() {
    const clientes = {};

    for (let i = 0; i < agendamentos.length; i++) {
        const chave = agendamentos[i].telefone || agendamentos[i].nome.toLowerCase();

        if (!clientes[chave]) {
            clientes[chave] = [];
        }
        clientes[chave].push(agendamentos[i]);
    }

    let vip = 0;
    let rubi = 0;

    Object.values(clientes).forEach(function (historico) {
        historico.sort(function (a, b) {
            const dataA = a.data + " " + a.horario;
            const dataB = b.data + " " + b.horario;
            return dataA.localeCompare(dataB);
        });

        let sequencia = 0;

        for (let i = 0; i < historico.length; i++) {
            if (historico[i].status === "Finalizado") {
                sequencia++;
            }
            if (historico[i].status === "Cancelado") {
                sequencia = 0;
            }
        }

        if (sequencia >= 50) {
            rubi++;
        } else if (sequencia >= 15) {
            vip++;
        }
    });

    document.getElementById("clientesVip").innerText = vip;
    document.getElementById("clientesRubi").innerText = rubi;
}

function atualizarMelhorProfissional(finalizadosHoje) {
    const ranking = {};

    for (let i = 0; i < finalizadosHoje.length; i++) {
        const profesional = finalizadosHoje[i].barbeiro;
        const valor = Number(finalizadosHoje[i].preco || 0);

        if (!ranking[profesional]) {
            ranking[profesional] = 0;
        }
        ranking[profesional] += valor;
    }

    const lista = Object.entries(ranking).sort(function (a, b) {
        return b[1] - a[1];
    });

    const campo = document.getElementById("melhorProfissional");

    if (lista.length === 0) {
        campo.innerText = "-";
        return;
    }
    campo.innerText = lista[0][0];
}

function mostrarAtendimentosAtivos() {
    const ativos = agendamentos.filter(function (item) {
        return item.status === "Agendado" || item.status === "Em Atendimento";
    });

    dashboardAtivos.innerHTML = "";

    if (ativos.length === 0) {
        dashboardAtivos.innerHTML = `
            <div class="empty-state">
                Nenhum atendimento ativo no momento.
            </div>
        `;
        return;
    }

    agendamentos.forEach(function (item, i) {
        if (item.status !== "Agendado" && item.status !== "Em Atendimento") {
            return;
        }

        const cardContainer = document.createElement("div");
        cardContainer.className = "dashboard-active-card";
        cardContainer.setAttribute("onclick", `alternarAcoes(${i})`);
        
        const botaoWhats = item.telefone 
            ? `<button onclick="abrirWhats(event, '${item.telefone}', '${item.nome}')" style="display:inline-block; width:auto; padding:4px 10px; margin-left:10px; background:#25D366; color:white; border-radius:8px; font-size:11px; border:none; cursor:pointer; font-weight:bold;">🟢 Whats</button>` 
            : '';

        cardContainer.innerHTML = `
            <div>
                <strong>${item.nome}</strong> ${botaoWhats}
            </div>
            <span>${item.servico}</span>
            <span>${item.barbeiro} • ${item.data} às ${item.horario}</span>
            <small>Status: ${item.status}</small>

            <div class="acoes-atendimento" id="acoes-${i}">
                <button onclick="alterarStatusDashboard(event, ${i}, 'Em Atendimento')">
                    Iniciar Atendimento
                </button>

                <button onclick="alterarStatusDashboard(event, ${i}, 'Finalizado')">
                    Finalizar
                </button>

                <button onclick="alterarStatusDashboard(event, ${i}, 'Cancelado')">
                    Cancelar
                </button>
            </div>
        `;
        
        dashboardAtivos.appendChild(cardContainer);
    });
}

function alternarAcoes(posicao) {
    const acoes = document.getElementById("acoes-" + posicao);
    if (acoes) {
        acoes.classList.toggle("mostrar");
    }
}

function alterarStatusDashboard(event, posicao, novoStatus) {
    event.stopPropagation();

    agendamentos[posicao].status = novoStatus;

    localStorage.setItem("agendamentos", JSON.stringify(agendamentos));

    atualizarIndicadores();
    mostrarAtendimentosAtivos();
    mostrarProximoAtendimento();
}

function mostrarProximoAtendimento() {
    const hoje = obterDataHoje();

    const futuros = agendamentos
        .filter(function (item) {
            return item.data >= hoje &&
                   item.status !== "Finalizado" &&
                   item.status !== "Cancelado";
        })
        .sort(function (a, b) {
            const dataA = a.data + " " + a.horario;
            const dataB = b.data + " " + b.horario;
            return dataA.localeCompare(dataB);
        });

    const proximoCliente = document.getElementById("proximoCliente");
    const proximoDetalhes = document.getElementById("proximoDetalhes");

    if (!proximoCliente || !proximoDetalhes) {
        return;
    }

    if (futuros.length === 0) {
        proximoCliente.innerText = "Nenhum atendimento próximo";
        proximoDetalhes.innerText = "A agenda está livre no momento.";
        return;
    }

    const proximo = futuros[0];

    proximoCliente.innerText = proximo.nome;
    proximoDetalhes.innerText =
        proximo.servico +
        " • " +
        proximo.barbeiro +
        " • " +
        proximo.data +
        " às " +
        proximo.horario;
}

// FUNÇÃO EXCLUSIVA MULTI-TENANT COM CÓDIGOS UNICODE À PROVA DE FALHAS
function abrirWhats(event, telefone, nomeCliente) {
    event.stopPropagation(); 
    
    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado"));
    const nomeEmpresaEstoque = usuarioLogado && usuarioLogado.empresa ? usuarioLogado.empresa : "nosso estabelecimento";

    const agendamentoCliente = agendamentos.find(function(item) {
        return (item.telefone === telefone || item.nome === nomeCliente) && 
               (item.status === "Agendado" || item.status === "Em Atendimento");
    });

    const servico = agendamentoCliente ? agendamentoCliente.servico : "Agendamento";
    const barbeiro = agendamentoCliente ? agendamentoCliente.barbeiro : "Profissional";
    const horario = agendamentoCliente ? agendamentoCliente.horario : "--:--";
    
    let dataFormatada = "--/--/----";
    if (agendamentoCliente && agendamentoCliente.data) {
        const partes = agendamentoCliente.data.split("-");
        if (partes.length === 3) {
            dataFormatada = partes[2] + "/" + partes[1] + "/" + partes[0];
        }
    }

    const numeroLimpo = telefone.replace(/\D/g, "");
    
    // Mapeamento Unicode Hexadecimal para blindar e impedir caracteres quebrados (losangos)
    const emojiBarber = "\u{1F487}"; // 💈
    const emojiCalendar = "\u{1F4C5}"; // 📅
    const emojiClock = "\u{23F1}"; // ⏰
    const emojiScissors = "\u{2702}"; // ✂️
    const emojiUser = "\u{1F464}"; // 👤
    const emojiPin = "\u{1F4CC}"; // 📍
    const emojiFire = "\u{1F525}"; // 🔥

    // Montagem do texto estruturado utilizando os escapes mapeados acima
    let textoMensagem = "Olá, *" + nomeCliente + "*! " + emojiBarber + "\n\n";
    textoMensagem += "Seu atendimento foi confirmado com sucesso na *" + nomeEmpresaEstoque + "*. Confira os detalhes:\n\n";
    textoMensagem += emojiCalendar + " *Data:* " + dataFormatada + "\n";
    textoMensagem += emojiClock + " *Horário:* " + horario + "\n";
    textoMensagem += emojiScissors + " *Serviço:* " + servico + "\n";
    textoMensagem += emojiUser + " *Profissional:* " + barbeiro + "\n\n";
    textoMensagem += emojiPin + " _Por favor, tente chegar com 5 minutos de antecedência._\n\n";
    textoMensagem += "Obrigado pela preferência! Te esperamos em breve. " + emojiFire;

    // Processamento e conversão de URI limpa
    const mensagemPronta = encodeURIComponent(textoMensagem);
    const urlWhats = "https://api.whatsapp.com/send?phone=55" + numeroLimpo + "&text=" + mensagemPronta;
    
    window.open(urlWhats, "_blank");
}