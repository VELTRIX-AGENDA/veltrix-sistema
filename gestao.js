/**
 * VELTRIX - Sistema de Agendamento Inteligente
 * Módulo: Command Center & Motor de Retenção de Carteira
 */

const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

let metaGestao = Number(localStorage.getItem("metaGestao")) || 0;
// Captura a configuração de dias de recorrência do proprietário (padrão: 20 dias)
let diasRecorrencia = Number(localStorage.getItem("diasRecorrencia")) || 20;

const btnSalvarMetaGestao = document.getElementById("btnSalvarMetaGestao");
const btnSalvarRecorrencia = document.getElementById("btnSalvarRecorrencia");

// Inicializa os campos de texto com os valores salvos
document.getElementById("metaGestao").value = metaGestao > 0 ? metaGestao : "";
document.getElementById("diasRecorrencia").value = diasRecorrencia;

// Listeners de Salvamento
btnSalvarMetaGestao.addEventListener("click", salvarMetaGestao);
btnSalvarRecorrencia.addEventListener("click", salvarRegraRecorrencia);

// Executa a inicialização de todos os indicadores do painel
atualizarGestao();

function atualizarGestao() {
    const hoje = obterDataHoje();
    const inicioMes = obterInicioMes();

    const agendamentosHoje = agendamentos.filter(function (item) {
        return item.data === hoje;
    });

    const agendamentosMes = agendamentos.filter(function (item) {
        return item.data >= inicioMes && item.data <= hoje;
    });

    const finalizadosHoje = agendamentosHoje.filter(function (item) {
        return item.status === "Finalizado";
    });

    const finalizadosMes = agendamentosMes.filter(function (item) {
        return item.status === "Finalizado";
    });

    const canceladosMes = agendamentosMes.filter(function (item) {
        return item.status === "Cancelado";
    });

    const faturamentoHoje = somarFaturamento(finalizadosHoje);
    const faturamentoMes = somarFaturamento(finalizadosMes);

    const ticketMedio = finalizadosMes.length > 0 ? faturamentoMes / finalizadosMes.length : 0;
    const taxaCancelamento = agendamentosMes.length > 0 ? (canceladosMes.length / agendamentosMes.length) * 100 : 0;

    document.getElementById("gestaoHoje").innerText = agendamentosHoje.length;
    document.getElementById("gestaoFaturamentoHoje").innerText = formatarMoeda(faturamentoHoje);
    document.getElementById("gestaoFaturamentoMes").innerText = formatarMoeda(faturamentoMes);
    document.getElementById("gestaoTicket").innerText = formatarMoeda(ticketMedio);
    document.getElementById("gestaoCancelamentos").innerText = taxaCancelamento.toFixed(1) + "%";

    // Executa e processa a análise preditiva de clientes inativos antes de atualizar os alertas
    const totalClientesInativos = processarClientesParaRetencao();

    atualizarClientesEspeciais();
    atualizarRetornoClientes(finalizadosMes);
    atualizarTopProfissional(finalizadosMes);
    atualizarTopServico(finalizadosMes);
    atualizarRankings(finalizadosMes);
    atualizarMeta(faturamentoMes);
    
    // Passa a quantidade de clientes atrasados para o motor de alertas
    atualizarAlertas(agendamentosHoje, canceladosMes, faturamentoMes, totalClientesInativos);
}

function somarFaturamento(lista) {
    let total = 0;
    for (let i = 0; i < lista.length; i++) {
        total += Number(lista[i].preco || 0);
    }
    return total;
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

    document.getElementById("gestaoVip").innerText = vip;
    document.getElementById("gestaoRubi").innerText = rubi;
}

function atualizarRetornoClientes(finalizados) {
    const clientes = {};

    for (let i = 0; i < finalizados.length; i++) {
        const chave = finalizados[i].telefone || finalizados[i].nome.toLowerCase();
        if (!clientes[chave]) {
            clientes[chave] = 0;
        }
        clientes[chave]++;
    }

    const totalClientes = Object.keys(clientes).length;
    const clientesRetornaram = Object.values(clientes).filter(function (total) {
        return total >= 2;
    }).length;

    const taxa = totalClientes > 0 ? (clientesRetornaram / totalClientes) * 100 : 0;
    document.getElementById("gestaoRetorno").innerText = taxa.toFixed(1) + "%";
}

// MOTOR DE RETENÇÃO PREDITIVA E SAÚDE DA CARTEIRA DE CLIENTES
function processarClientesParaRetencao() {
    const historicoPorCliente = {};

    // Agrupa agendamentos executados com sucesso por cliente
    agendamentos.forEach(function (item) {
        if (item.status !== "Finalizado") return;
        const chave = item.telefone || item.nome.trim().toLowerCase();
        
        if (!historicoPorCliente[chave]) {
            historicoPorCliente[chave] = {
                nome: item.nome,
                ultimaData: item.data
            };
        } else if (item.data > historicoPorCliente[chave].ultimaData) {
            historicoPorCliente[chave].ultimaData = item.data;
        }
    });

    const hojeStr = obterDataHoje();
    const dataHoje = new Date(hojeStr + "T00:00:00");
    let clientesInativos = 0;

    Object.values(historicoPorCliente).forEach(function (cliente) {
        const dataUltimoAtendimento = new Date(cliente.ultimaData + "T00:00:00");
        
        // Calcula a diferença em dias entre a data atual e o último atendimento
        const diferencaTempo = Math.abs(dataHoje - dataUltimoAtendimento);
        const diferencaDias = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

        if (diferencaDias > diasRecorrencia) {
            clientesInativos++;
        }
    });

    const painelStatus = document.getElementById("statusRetencao");
    if (clientesInativos === 0) {
        painelStatus.innerHTML = `<strong>🎉 Carteira ativa:</strong> Todos os seus clientes ativos realizaram agendamentos dentro do prazo de ${diasRecorrencia} dias.`;
    } else {
        painelStatus.innerHTML = `<strong>⚠️ Atenção:</strong> Existem <strong>${clientesInativos} clientes</strong> que não agendam há mais de ${diasRecorrencia} dias. Monitore seus relatórios ou use o módulo WhatsApp para trazê-los de volta.`;
    }

    return clientesInativos;
}

function atualizarTopProfissional(finalizados) {
    const ranking = {};

    for (let i = 0; i < finalizados.length; i++) {
        const nome = finalizados[i].barbeiro || finalizados[i].profissional || "Sem profissional";
        const valor = Number(finalizados[i].preco || 0);

        if (!ranking[nome]) {
            ranking[nome] = 0;
        }
        ranking[nome] += valor;
    }

    const lista = Object.entries(ranking).sort(function (a, b) {
        return b[1] - a[1];
    });

    document.getElementById("gestaoTopProfissional").innerText = lista.length > 0 ? lista[0][0] : "-";
}

function atualizarTopServico(finalizados) {
    const ranking = {};

    for (let i = 0; i < finalizados.length; i++) {
        const nome = finalizados[i].servico || "Serviço não informado";
        if (!ranking[nome]) {
            ranking[nome] = 0;
        }
        ranking[nome]++;
    }

    const lista = Object.entries(ranking).sort(function (a, b) {
        return b[1] - a[1];
    });

    document.getElementById("gestaoTopServico").innerText = lista.length > 0 ? lista[0][0] : "-";
}

function atualizarRankings(finalizados) {
    mostrarRankingProfissionais(finalizados);
    mostrarRankingServicos(finalizados);
    mostrarRankingClientes(finalizados);
}

function mostrarRankingProfissionais(finalizados) {
    const ranking = {};

    for (let i = 0; i < finalizados.length; i++) {
        const nome = finalizados[i].barbeiro || finalizados[i].profissional || "Sem profissional";
        const valor = Number(finalizados[i].preco || 0);

        if (!ranking[nome]) {
            ranking[nome] = { quantidade: 0, total: 0 };
        }
        ranking[nome].quantidade++;
        ranking[nome].total += valor;
    }

    renderizarRanking("rankingProfissionais", ranking, "atend.");
}

function mostrarRankingServicos(finalizados) {
    const ranking = {};

    for (let i = 0; i < finalizados.length; i++) {
        const nome = finalizados[i].servico || "Serviço não informado";
        const valor = Number(finalizados[i].preco || 0);

        if (!ranking[nome]) {
            ranking[nome] = { quantidade: 0, total: 0 };
        }
        ranking[nome].quantidade++;
        ranking[nome].total += valor;
    }

    renderizarRanking("rankingServicos", ranking, "vendas");
}

function mostrarRankingClientes(finalizados) {
    const ranking = {};

    for (let i = 0; i < finalizados.length; i++) {
        const chave = finalizados[i].telefone || finalizados[i].nome.toLowerCase();
        const valor = Number(finalizados[i].preco || 0);

        if (!ranking[chave]) {
            ranking[chave] = {
                nome: finalizados[i].nome,
                quantidade: 0,
                total: 0
            };
        }
        ranking[chave].quantidade++;
        ranking[chave].total += valor;
    }

    const caixa = document.getElementById("rankingClientes");
    caixa.innerHTML = "";

    const lista = Object.values(ranking).sort(function (a, b) {
        return b.total - a.total;
    });

    if (lista.length === 0) {
        caixa.innerHTML = `<div class="empty-state">Nenhum cliente no período.</div>`;
        return;
    }

    lista.slice(0, 5).forEach(function (item, index) {
        caixa.innerHTML += `
            <div class="servico-ranking">
                <strong>${medalha(index)} ${item.nome}</strong>
                <span>${item.quantidade} visitas • ${formatarMoeda(item.total)}</span>
            </div>
        `;
    });
}

function renderizarRanking(id, ranking, textoQuantidade) {
    const caixa = document.getElementById(id);
    caixa.innerHTML = "";

    const lista = Object.entries(ranking).sort(function (a, b) {
        return b[1].total - a[1].total;
    });

    if (lista.length === 0) {
        caixa.innerHTML = `<div class="empty-state">Nenhum dado encontrado.</div>`;
        return;
    }

    lista.slice(0, 5).forEach(function (item, index) {
        caixa.innerHTML += `
            <div class="servico-ranking">
                <strong>${medalha(index)} ${item[0]}</strong>
                <span>${item[1].quantidade} ${textoQuantidade} • ${formatarMoeda(item[1].total)}</span>
            </div>
        `;
    });
}

function atualizarMeta(faturamentoMes) {
    const caixa = document.getElementById("resultadoMetaGestao");

    if (metaGestao <= 0) {
        caixa.innerHTML = `<div class="empty-state">Nenhuma meta configurada.</div>`;
        return;
    }

    const percentual = (faturamentoMes / metaGestao) * 100;

    caixa.innerHTML = `
        <div class="servico-ranking">
            <strong>Meta</strong>
            <span>${formatarMoeda(metaGestao)}</span>
        </div>
        <div class="servico-ranking">
            <strong>Realizado</strong>
            <span>${formatarMoeda(faturamentoMes)}</span>
        </div>
        <div class="servico-ranking">
            <strong>Progresso</strong>
            <span>${percentual.toFixed(1)}%</span>
        </div>
    `;
}

function salvarMetaGestao() {
    metaGestao = Number(document.getElementById("metaGestao").value || 0);
    localStorage.setItem("metaGestao", String(metaGestao));
    atualizarGestao();
    alert("Meta de faturamento salva com sucesso!");
}

function salvarRegraRecorrencia() {
    const inputDias = document.getElementById("diasRecorrencia").value;
    diasRecorrencia = Number(inputDias) > 0 ? Number(inputDias) : 20;

    localStorage.setItem("diasRecorrencia", String(diasRecorrencia));
    atualizarGestao();
    alert(`Regra salva! O VELTRIX lembrará você de trazer de volta clientes sumidos há mais de ${diasRecorrencia} dias.`);
}

function atualizarAlertas(agendamentosHoje, canceladosMes, faturamentoMes, totalClientesInativos) {
    const caixa = document.getElementById("gestaoAlertas");
    caixa.innerHTML = "";

    let alertas = [];

    const canceladosHoje = agendamentosHoje.filter(function (item) {
        return item.status === "Cancelado";
    });

    if (canceladosHoje.length >= 3) {
        alertas.push("⚠ " + canceladosHoje.length + " cancelamentos hoje");
    }

    // GATILHO DE ALERTA: Verifica se existem clientes esfriando fora da janela de recorrência
    if (totalClientesInativos > 0) {
        alertas.push(`🏃‍♂️ ${totalClientesInativos} clientes abandonando a carteira`);
    }

    if (metaGestao > 0) {
        const percentual = (faturamentoMes / metaGestao) * 100;

        if (percentual >= 100) {
            alertas.push("🔥 Meta mensal batida");
        } else if (percentual >= 80) {
            alertas.push("📈 Meta mensal acima de 80%");
        } else if (percentual < 50) {
            alertas.push("⚠ Meta mensal abaixo de 50%");
        }
    }

    if (canceladosMes.length >= 10) {
        alertas.push("⚠ Alto volume de cancelamentos no mês");
    }

    if (agendamentosHoje.length === 0) {
        alertas.push("📅 Nenhum atendimento agendado para hoje");
    }

    if (alertas.length === 0) {
        caixa.innerHTML = `
            <div class="servico-ranking">
                <strong>✅ Operação saudável</strong>
                <span>Nenhum alerta crítico</span>
            </div>
        `;
        return;
    }

    for (let i = 0; i < alertas.length; i++) {
        caixa.innerHTML += `
            <div class="servico-ranking">
                <strong>${alertas[i]}</strong>
                <span>Verifique a operação</span>
            </div>
        `;
    }
}

function obterDataHoje() {
    const hoje = new Date();
    return formatarData(hoje);
}

function obterInicioMes() {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    return formatarData(inicio);
}

function medalha(index) {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return "⭐";
}

function formatarMoeda(valor) {
    return "R$ " + Number(valor || 0).toFixed(2);
}

function formatarData(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return ano + "-" + mes + "-" + dia;
}