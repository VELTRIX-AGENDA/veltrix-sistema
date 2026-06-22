const agendamentos =
    JSON.parse(localStorage.getItem("agendamentos")) || [];

const btnFiltrarRelatorio =
    document.getElementById("btnFiltrarRelatorio");

btnFiltrarRelatorio.addEventListener("click", gerarRelatorio);

filtroHoje();

function gerarRelatorio() {
    const dataInicial =
        document.getElementById("dataInicialRelatorio").value;

    const dataFinal =
        document.getElementById("dataFinalRelatorio").value;

    if (dataInicial === "" || dataFinal === "") {
        alert("Informe a data inicial e final.");
        return;
    }

    const filtrados = agendamentos.filter(function (item) {
        return item.data >= dataInicial &&
               item.data <= dataFinal;
    });

    const finalizados = filtrados.filter(function (item) {
        return item.status === "Finalizado";
    });

    const cancelados = filtrados.filter(function (item) {
        return item.status === "Cancelado";
    });

    let faturamento = 0;

    for (let i = 0; i < finalizados.length; i++) {
        faturamento += Number(finalizados[i].preco || 0);
    }

    const ticket =
        finalizados.length > 0
            ? faturamento / finalizados.length
            : 0;

    const taxaCancelamento =
        filtrados.length > 0
            ? (cancelados.length / filtrados.length) * 100
            : 0;

    document.getElementById("relatorioFaturamento").innerText =
        formatarMoeda(faturamento);

    document.getElementById("relatorioAtendimentos").innerText =
        filtrados.length;

    document.getElementById("relatorioFinalizados").innerText =
        finalizados.length;

    document.getElementById("relatorioCancelados").innerText =
        cancelados.length;

    document.getElementById("relatorioTicket").innerText =
        formatarMoeda(ticket);

    document.getElementById("relatorioTaxaCancelamento").innerText =
        taxaCancelamento.toFixed(1) + "%";

    mostrarProfissionalDestaque(finalizados);
    mostrarServicoDestaque(finalizados);
    mostrarRankingProfissionais(finalizados);
    mostrarRankingServicos(finalizados);
}

function mostrarProfissionalDestaque(finalizados) {
    const ranking = {};

    for (let i = 0; i < finalizados.length; i++) {
        const nome = finalizados[i].barbeiro || "Sem profissional";
        const valor = Number(finalizados[i].preco || 0);

        if (!ranking[nome]) {
            ranking[nome] = {
                atendimentos: 0,
                faturamento: 0
            };
        }

        ranking[nome].atendimentos++;
        ranking[nome].faturamento += valor;
    }

    const lista =
        Object.entries(ranking).sort(function (a, b) {
            return b[1].faturamento - a[1].faturamento;
        });

    const caixa =
        document.getElementById("relatorioProfissionalDestaque");

    caixa.innerHTML = "";

    if (lista.length === 0) {
        caixa.innerHTML = `
            <div class="empty-state">
                Nenhum profissional no período.
            </div>
        `;
        return;
    }

    const vencedor = lista[0];

    caixa.innerHTML = `
        <div class="servico-ranking">
            <strong>🏆 ${vencedor[0]}</strong>
            <span>
                ${vencedor[1].atendimentos} atend. • ${formatarMoeda(vencedor[1].faturamento)}
            </span>
        </div>
    `;
}

function mostrarServicoDestaque(finalizados) {
    const ranking = {};

    for (let i = 0; i < finalizados.length; i++) {
        const servico = finalizados[i].servico || "Serviço não informado";
        const valor = Number(finalizados[i].preco || 0);

        if (!ranking[servico]) {
            ranking[servico] = {
                vendas: 0,
                faturamento: 0
            };
        }

        ranking[servico].vendas++;
        ranking[servico].faturamento += valor;
    }

    const lista =
        Object.entries(ranking).sort(function (a, b) {
            return b[1].vendas - a[1].vendas;
        });

    const caixa =
        document.getElementById("relatorioServicoDestaque");

    caixa.innerHTML = "";

    if (lista.length === 0) {
        caixa.innerHTML = `
            <div class="empty-state">
                Nenhum serviço no período.
            </div>
        `;
        return;
    }

    const vencedor = lista[0];

    caixa.innerHTML = `
        <div class="servico-ranking">
            <strong>🥇 ${vencedor[0]}</strong>
            <span>
                ${vencedor[1].vendas} vendas • ${formatarMoeda(vencedor[1].faturamento)}
            </span>
        </div>
    `;
}

function mostrarRankingProfissionais(finalizados) {
    const ranking = {};

    for (let i = 0; i < finalizados.length; i++) {
        const nome = finalizados[i].barbeiro || "Sem profissional";
        const valor = Number(finalizados[i].preco || 0);

        if (!ranking[nome]) {
            ranking[nome] = {
                atendimentos: 0,
                faturamento: 0
            };
        }

        ranking[nome].atendimentos++;
        ranking[nome].faturamento += valor;
    }

    renderizarRanking(
        "relatorioRankingProfissionais",
        ranking,
        "atendimentos"
    );
}

function mostrarRankingServicos(finalizados) {
    const ranking = {};

    for (let i = 0; i < finalizados.length; i++) {
        const nome = finalizados[i].servico || "Serviço não informado";
        const valor = Number(finalizados[i].preco || 0);

        if (!ranking[nome]) {
            ranking[nome] = {
                atendimentos: 0,
                faturamento: 0
            };
        }

        ranking[nome].atendimentos++;
        ranking[nome].faturamento += valor;
    }

    renderizarRanking(
        "relatorioRankingServicos",
        ranking,
        "vendas"
    );
}

function renderizarRanking(id, ranking, textoQuantidade) {
    const caixa =
        document.getElementById(id);

    caixa.innerHTML = "";

    const lista =
        Object.entries(ranking).sort(function (a, b) {
            return b[1].faturamento - a[1].faturamento;
        });

    if (lista.length === 0) {
        caixa.innerHTML = `
            <div class="empty-state">
                Nenhum dado encontrado.
            </div>
        `;
        return;
    }

    lista.slice(0, 10).forEach(function (item, index) {
        caixa.innerHTML += `
            <div class="servico-ranking">
                <strong>${medalha(index)} ${item[0]}</strong>
                <span>
                    ${item[1].atendimentos} ${textoQuantidade} • ${formatarMoeda(item[1].faturamento)}
                </span>
            </div>
        `;
    });
}

function filtroHoje() {
    const hoje = formatarData(new Date());

    document.getElementById("dataInicialRelatorio").value = hoje;
    document.getElementById("dataFinalRelatorio").value = hoje;

    gerarRelatorio();
}

function filtroSemana() {
    const hoje = new Date();
    const inicio = new Date();

    inicio.setDate(hoje.getDate() - 7);

    document.getElementById("dataInicialRelatorio").value =
        formatarData(inicio);

    document.getElementById("dataFinalRelatorio").value =
        formatarData(hoje);

    gerarRelatorio();
}

function filtroMes() {
    const hoje = new Date();

    const inicio = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        1
    );

    document.getElementById("dataInicialRelatorio").value =
        formatarData(inicio);

    document.getElementById("dataFinalRelatorio").value =
        formatarData(hoje);

    gerarRelatorio();
}

function filtroTodos() {
    if (agendamentos.length === 0) {
        const hoje = formatarData(new Date());

        document.getElementById("dataInicialRelatorio").value = hoje;
        document.getElementById("dataFinalRelatorio").value = hoje;

        gerarRelatorio();
        return;
    }

    const datas = agendamentos.map(function (item) {
        return item.data;
    });

    datas.sort();

    document.getElementById("dataInicialRelatorio").value = datas[0];
    document.getElementById("dataFinalRelatorio").value = datas[datas.length - 1];

    gerarRelatorio();
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