/**
 * VELTRIX - Sistema de Agendamento Inteligente
 * Módulo: Painel Analítico e Operacional Cloud Pro (dashboard.js)
 */

// Captura a sessão do estabelecimento logado para isolamento Multi-Tenant seguro
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
const tenantID = usuarioLogado.empresa || "Geral";

let agendamentos = [];
const dashboardAtivos = document.getElementById("dashboardAtivos");

// Inicialização Conectada ao Firestore
escutarAgendamentosDashboard();

/**
 * ⏳ ESCUTA EM TEMPO REAL (VERSÃO DIAGNÓSTICO SEM FILTROS)
 */
function escutarAgendamentosDashboard() {
    console.log("Iniciando escuta no Firestore... Tenant atual:", tenantID);
    
    // Removemos temporariamente o .where() para diagnosticar a estrutura
    db.collection("veltrix_agendamentos")
        .onSnapshot(snapshot => {
            agendamentos = [];
            console.log("Total de documentos encontrados na nuvem:", snapshot.size);
            
            snapshot.forEach(doc => {
                const dados = doc.data();
                console.log("Documento lido:", doc.id, dados); // Mostra a estrutura real no console do navegador
                agendamentos.push({ id: doc.id, ...dados });
            });
            
            // Dispara as atualizações da tela
            atualizarIndicadores();
            mostrarAtendimentosAtivos();
            mostrarProximoAtendimento();
        }, erro => console.error("Erro crítico ao sincronizar Firestore no Dashboard:", erro));
}
/**
 * 🛠️ HELPER DE NORMALIZAÇÃO: Garante correspondência de datas independente do input (AAAA-MM-DD)
 */
function normalizarDataParaISO(dataStr) {
    if (!dataStr) return "";
    // Se a data já estiver no formato correto AAAA-MM-DD
    if (dataStr.includes("-") && dataStr.split("-")[0].length === 4) {
        return dataStr;
    }
    // Se a data vier no formato PT-BR DD/MM/AAAA, converte para ISO
    if (dataStr.includes("/")) {
        const partes = dataStr.split("/");
        if (partes.length === 3) {
            return `${partes[2]}-${partes[1]}-${partes[0]}`;
        }
    }
    return dataStr;
}

function obterDataHoje() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return ano + "-" + mes + "-" + dia;
}

function atualizarIndicadores() {
    const hoje = obterDataHoje();

    // Filtro blindado contra divergência de formatação de string
    const agendamentosHoje = agendamentos.filter(function (item) {
        return normalizarDataParaISO(item.data) === hoje;
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

    if (document.getElementById("totalHoje")) document.getElementById("totalHoje").innerText = agendamentosHoje.length;
    if (document.getElementById("emAtendimento")) document.getElementById("emAtendimento").innerText = emAtendimento.length;
    if (document.getElementById("finalizadosHoje")) document.getElementById("finalizadosHoje").innerText = finalizados.length;
    if (document.getElementById("faturamentoHoje")) document.getElementById("faturamentoHoje").innerText = "R$ " + faturamento.toFixed(2);

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
            const dataA = normalizarDataParaISO(a.data) + " " + a.horario;
            const dataB = normalizarDataParaISO(b.data) + " " + b.horario;
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

    if (document.getElementById("clientesVip")) document.getElementById("clientesVip").innerText = vip;
    if (document.getElementById("clientesRubi")) document.getElementById("clientesRubi").innerText = rubi;
}

function atualizarMelhorProfissional(finalizadosHoje) {
    const ranking = {};

    for (let i = 0; i < finalizadosHoje.length; i++) {
        const profissional = finalizadosHoje[i].profissional || finalizadosHoje[i].barbeiro;
        if (!profissional) continue;
        const valor = Number(finalizadosHoje[i].preco || 0);

        if (!ranking[profissional]) {
            ranking[profissional] = 0;
        }
        ranking[profissional] += valor;
    }

    const lista = Object.entries(ranking).sort(function (a, b) {
        return b[1] - a[1];
    });

    const campo = document.getElementById("melhorProfissional");
    if (!campo) return;

    if (lista.length === 0) {
        campo.innerText = "-";
        return;
    }
    campo.innerText = lista[0][0];
}

/**
 * 🎨 RENDERIZAÇÃO OPERACIONAL COM IDENTIDADE VISUAL ATUALIZADA
 */
function mostrarAtendimentosAtivos() {
    if (!dashboardAtivos) return;
    dashboardAtivos.innerHTML = "";

    const ativos = agendamentos.filter(function (item) {
        return item.status === "Agendado" || item.status === "Em Atendimento";
    });

    if (ativos.length === 0) {
        dashboardAtivos.innerHTML = `
            <div class="empty-state">
                Nenhum atendimento ativo no momento.
            </div>
        `;
        return;
    }

    // Ordenação Cronológica Estrita
    ativos.sort((a, b) => a.horario.localeCompare(b.horario));

    ativos.forEach(function (item) {
        const cardContainer = document.createElement("div");
        cardContainer.className = "dashboard-active-card";
        
        let corStatus = "#f1c40f"; // Amarelo para Agendado
        if (item.status === "Em Atendimento") corStatus = "#3498db"; // Azul

        // Estilização injetada em conformidade com o CSS corporativo
        cardContainer.style.borderLeft = `5px solid ${corStatus}`;
        cardContainer.style.marginBottom = "15px";
        cardContainer.style.padding = "15px";
        cardContainer.style.background = "rgba(255, 255, 255, 0.03)";
        cardContainer.style.borderRadius = "8px";

        cardContainer.setAttribute("onclick", `alternarAcoes('${item.id}')`);
        
        const botaoWhats = item.telefone 
            ? `<button onclick="abrirWhats(event, '${item.telefone}', '${item.nome}')" style="display:inline-block; width:auto; padding:4px 10px; margin-left:10px; background:#25D366; color:white; border-radius:8px; font-size:11px; border:none; cursor:pointer; font-weight:bold;">🟢 Whats</button>` 
            : '';

        const nomePrestador = item.profissional || item.barbeiro || "Geral";
        const dataExibicao = typeof VELTRIX_UTILS !== "undefined" ? VELTRIX_UTILS.formatarDataParaExibicao(item.data) : item.data;

        cardContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <div>
                        <strong style="font-size: 1.1em; color: #fff;">${item.nome}</strong> ${botaoWhats}
                    </div>
                    <span style="display: block; margin-top: 5px; color: #ddd; font-weight: bold;">${item.servico}</span>
                    <span style="display: block; font-size: 0.9em; color: #aaa;">Profissional: ${nomePrestador} • ${dataExibicao} às ${item.horario}</span>
                </div>
                <span style="background: ${corStatus}; color: #000; font-weight: bold; padding: 4px 8px; border-radius: 4px; font-size: 0.8em;">
                    ${item.status}
                </span>
            </div>

            <div class="acoes-atendimento" id="acoes-${item.id}" style="margin-top: 12px;">
                ${item.status === "Agendado" ? `<button onclick="alterarStatusDashboard(event, '${item.id}', 'Em Atendimento')">Iniciar Atendimento</button>` : ""}
                ${item.status === "Em Atendimento" ? `<button onclick="alterarStatusDashboard(event, '${item.id}', 'Finalizado')">Finalizar</button>` : ""}
                <button onclick="alterarStatusDashboard(event, '${item.id}', 'Cancelado')">Cancelar</button>
            </div>
        `;
        
        dashboardAtivos.appendChild(cardContainer);
    });
}

function alternarAcoes(idDoc) {
    const acoes = document.getElementById("acoes-" + idDoc);
    if (acoes) {
        acoes.classList.toggle("mostrar");
    }
}

function alterarStatusDashboard(event, idDoc, novoStatus) {
    event.stopPropagation();
    db.collection("veltrix_agendamentos").doc(idDoc).update({
        status: novoStatus
    })
    .catch(erro => console.error("Erro ao alterar status no dashboard:", erro));
}

function mostrarProximoAtendimento() {
    const hoje = obterDataHoje();

    const futuros = agendamentos
        .filter(function (item) {
            return normalizarDataParaISO(item.data) >= hoje &&
                   item.status !== "Finalizado" &&
                   item.status !== "Cancelado";
        })
        .sort(function (a, b) {
            const dataA = normalizarDataParaISO(a.data) + " " + a.horario;
            const dataB = normalizarDataParaISO(b.data) + " " + b.horario;
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
    const nomePrestador = proximo.profissional || proximo.barbeiro || "Geral";
    const dataExibicao = typeof VELTRIX_UTILS !== "undefined" ? VELTRIX_UTILS.formatarDataParaExibicao(proximo.data) : proximo.data;

    proximoCliente.innerText = proximo.nome;
    proximoDetalhes.innerText =
        proximo.servico +
        " • " +
        nomePrestador +
        " • " +
        dataExibicao +
        " às " +
        proximo.horario;
}

function abrirWhats(event, telefone, nomeCliente) {
    event.stopPropagation(); 
    
    const nomeEmpresaEstoque = tenantID !== "Geral" ? tenantID : "nosso estabelecimento";

    const agendamentoCliente = agendamentos.find(function(item) {
        return (item.telefone === telefone || item.nome === nomeCliente) && 
               (item.status === "Agendado" || item.status === "Em Atendimento");
    });

    const servico = agendamentoCliente ? agendamentoCliente.servico : "Agendamento";
    const barbeiro = agendamentoCliente ? (agendamentoCliente.profissional || agendamentoCliente.barbeiro) : "Profissional";
    const horario = agendamentoCliente ? agendamentoCliente.horario : "--:--";
    
    let dataFormatada = "--/--/----";
    if (agendamentoCliente && agendamentoCliente.data) {
        dataFormatada = typeof VELTRIX_UTILS !== "undefined" ? VELTRIX_UTILS.formatarDataParaExibicao(agendamentoCliente.data) : agendamentoCliente.data;
    }

    const numeroLimpo = telefone.replace(/\D/g, "");
    
    const emojiBarber = "\u{1F487}"; 
    const emojiCalendar = "\u{1F4C5}"; 
    const emojiClock = "\u{23F1}"; 
    const emojiScissors = "\u{2702}"; 
    const emojiUser = "\u{1F464}"; 
    const emojiPin = "\u{1F4CC}"; 
    const emojiFire = "\u{1F525}"; 

    let textoMensagem = "Olá, *" + nomeCliente + "*! " + emojiBarber + "\n\n";
    textoMensagem += "Seu atendimento foi confirmado com sucesso na *" + nomeEmpresaEstoque + "*. Confira os detalhes:\n\n";
    textoMensagem += emojiCalendar + " *Data:* " + dataFormatada + "\n";
    textoMensagem += emojiClock + " *Horário:* " + horario + "\n";
    textoMensagem += emojiScissors + " *Serviço:* " + servico + "\n";
    textoMensagem += emojiUser + " *Profissional:* " + barbeiro + "\n\n";
    textoMensagem += emojiPin + " _Por favor, tente chegar com 5 minutos de antecedência._\n\n";
    textoMensagem += "Obrigado pela preferência! Te esperamos em breve. " + emojiFire;

    const mensagemPronta = encodeURIComponent(textoMensagem);
    const urlWhats = "https://api.whatsapp.com/send?phone=55" + numeroLimpo + "&text=" + mensagemPronta;
    
    window.open(urlWhats, "_blank");
}
