const agendamentos =
    JSON.parse(localStorage.getItem("agendamentos")) || [];

const despesas =
    JSON.parse(localStorage.getItem("despesas")) || [];

let metaFinanceira =
    Number(localStorage.getItem("metaFinanceira")) || 0;

const btnFiltrar =
    document.getElementById("btnFiltrarFinanceiro");

const btnSalvarDespesa =
    document.getElementById("btnSalvarDespesa");

const btnSalvarMeta =
    document.getElementById("btnSalvarMeta");

btnFiltrar.addEventListener("click", filtrarFinanceiro);
btnSalvarDespesa.addEventListener("click", salvarDespesa);
btnSalvarMeta.addEventListener("click", salvarMeta);

document.getElementById("metaFinanceira").value =
    metaFinanceira > 0 ? metaFinanceira : "";

filtroHoje();

function filtrarFinanceiro() {
    const dataInicial =
        document.getElementById("dataInicialFinanceiro").value;

    const dataFinal =
        document.getElementById("dataFinalFinanceiro").value;

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

    const despesasFiltradas = despesas.filter(function (item) {
        return item.data >= dataInicial &&
               item.data <= dataFinal;
    });

    let faturamento = 0;

    for (let i = 0; i < finalizados.length; i++) {
        faturamento += Number(finalizados[i].preco || 0);
    }

    let totalDespesas = 0;

    for (let i = 0; i < despesasFiltradas.length; i++) {
        totalDespesas += Number(despesasFiltradas[i].valor || 0);
    }

    const lucro = faturamento - totalDespesas;

    const ticket =
        finalizados.length > 0
            ? faturamento / finalizados.length
            : 0;

    document.getElementById("faturamentoPeriodo").innerText =
        formatarMoeda(faturamento);

    document.getElementById("despesasPeriodo").innerText =
        formatarMoeda(totalDespesas);

    document.getElementById("lucroPeriodo").innerText =
        formatarMoeda(lucro);

    document.getElementById("totalFinalizados").innerText =
        finalizados.length;

    document.getElementById("totalCancelados").innerText =
        cancelados.length;

    document.getElementById("ticketMedio").innerText =
        formatarMoeda(ticket);

    mostrarDespesas(despesasFiltradas);
    mostrarTopProfissionais(finalizados);
    mostrarTopServicos(finalizados);
    mostrarTopClientes(finalizados);
    mostrarMeta(faturamento);
}

function salvarDespesa() {
    const descricao =
        document.getElementById("descricaoDespesa").value.trim();

    const valor =
        document.getElementById("valorDespesa").value;

    const data =
        document.getElementById("dataDespesa").value;

    if (descricao === "") {
        alert("Informe a descrição da despesa.");
        return;
    }

    if (valor === "") {
        alert("Informe o valor da despesa.");
        return;
    }

    if (data === "") {
        alert("Informe a data da despesa.");
        return;
    }

    despesas.push({
        descricao: descricao,
        valor: Number(valor),
        data: data
    });

    salvarDespesas();

    document.getElementById("descricaoDespesa").value = "";
    document.getElementById("valorDespesa").value = "";
    document.getElementById("dataDespesa").value = "";

    filtrarFinanceiro();
}

function mostrarDespesas(lista) {
    const caixa =
        document.getElementById("listaDespesas");

    caixa.innerHTML = "";

    if (lista.length === 0) {
        caixa.innerHTML = `
            <div class="empty-state">
                Nenhuma despesa neste período.
            </div>
        `;
        return;
    }

    const ordenadas =
        [...lista].sort(function (a, b) {
            return b.data.localeCompare(a.data);
        });

    for (let i = 0; i < ordenadas.length; i++) {
        const despesa = ordenadas[i];
        const indiceOriginal = despesas.indexOf(despesa);

        caixa.innerHTML += `
            <div class="servico-ranking">
                <strong>
                    ${despesa.descricao}
                    <br>
                    <small>${formatarDataVisual(despesa.data)}</small>
                </strong>

                <span>
                    ${formatarMoeda(despesa.valor)}
                    <button onclick="excluirDespesa(${indiceOriginal})">
                        Excluir
                    </button>
                </span>
            </div>
        `;
    }
}

function excluirDespesa(posicao) {
    const confirmar =
        confirm("Deseja excluir esta despesa?");

    if (!confirmar) {
        return;
    }

    despesas.splice(posicao, 1);

    salvarDespesas();

    filtrarFinanceiro();
}

function salvarDespesas() {
    localStorage.setItem(
        "despesas",
        JSON.stringify(despesas)
    );
}

function salvarMeta() {
    const valor =
        Number(document.getElementById("metaFinanceira").value || 0);

    metaFinanceira = valor;

    localStorage.setItem(
        "metaFinanceira",
        String(metaFinanceira)
    );

    filtrarFinanceiro();
}

function mostrarMeta(faturamento) {
    const caixa =
        document.getElementById("resultadoMeta");

    if (metaFinanceira <= 0) {
        caixa.innerHTML = `
            <div class="empty-state">
                Nenhuma meta definida.
            </div>
        `;
        return;
    }

    const percentual =
        (faturamento / metaFinanceira) * 100;

    caixa.innerHTML = `
        <div class="servico-ranking">
            <strong>Meta</strong>
            <span>${formatarMoeda(metaFinanceira)}</span>
        </div>

        <div class="servico-ranking">
            <strong>Realizado</strong>
            <span>${formatarMoeda(faturamento)}</span>
        </div>

        <div class="servico-ranking">
            <strong>Progresso</strong>
            <span>${percentual.toFixed(1)}%</span>
        </div>
    `;
}

function mostrarTopProfissionais(finalizados) {
    const ranking = {};

    for (let i = 0; i < finalizados.length; i++) {
        const profissional = finalizados[i].barbeiro || "Sem profissional";
        const valor = Number(finalizados[i].preco || 0);

        if (!ranking[profissional]) {
            ranking[profissional] = {
                atendimentos: 0,
                total: 0
            };
        }

        ranking[profissional].atendimentos++;
        ranking[profissional].total += valor;
    }

    const caixa =
        document.getElementById("topProfissionais");

    caixa.innerHTML = "";

    const lista =
        Object.entries(ranking).sort(function (a, b) {
            return b[1].total - a[1].total;
        });

    if (lista.length === 0) {
        caixa.innerHTML = `
            <div class="empty-state">
                Nenhum profissional no período.
            </div>
        `;
        return;
    }

    lista.slice(0, 5).forEach(function (item, index) {
        caixa.innerHTML += `
            <div class="servico-ranking">
                <strong>${medalha(index)} ${item[0]}</strong>
                <span>
                    ${item[1].atendimentos} atend. • ${formatarMoeda(item[1].total)}
                </span>
            </div>
        `;
    });
}

function mostrarTopServicos(finalizados) {
    const ranking = {};

    for (let i = 0; i < finalizados.length; i++) {
        const servico = finalizados[i].servico;
        const valor = Number(finalizados[i].preco || 0);

        if (!ranking[servico]) {
            ranking[servico] = {
                vendas: 0,
                total: 0
            };
        }

        ranking[servico].vendas++;
        ranking[servico].total += valor;
    }

    const caixa =
        document.getElementById("topServicos");

    caixa.innerHTML = "";

    const lista =
        Object.entries(ranking).sort(function (a, b) {
            return b[1].vendas - a[1].vendas;
        });

    if (lista.length === 0) {
        caixa.innerHTML = `
            <div class="empty-state">
                Nenhum serviço finalizado neste período.
            </div>
        `;
        return;
    }

    lista.slice(0, 5).forEach(function (item, index) {
        caixa.innerHTML += `
            <div class="servico-ranking">
                <strong>${medalha(index)} ${item[0]}</strong>
                <span>
                    ${item[1].vendas} vendas • ${formatarMoeda(item[1].total)}
                </span>
            </div>
        `;
    });
}

function mostrarTopClientes(finalizados) {
    const clientes = {};

    for (let i = 0; i < finalizados.length; i++) {
        const chave =
            finalizados[i].telefone ||
            finalizados[i].nome.toLowerCase();

        const nome = finalizados[i].nome;
        const valor = Number(finalizados[i].preco || 0);

        if (!clientes[chave]) {
            clientes[chave] = {
                nome: nome,
                visitas: 0,
                total: 0
            };
        }

        clientes[chave].visitas++;
        clientes[chave].total += valor;
    }

    const caixa =
        document.getElementById("topClientes");

    caixa.innerHTML = "";

    const lista =
        Object.values(clientes).sort(function (a, b) {
            return b.total - a.total;
        });

    if (lista.length === 0) {
        caixa.innerHTML = `
            <div class="empty-state">
                Nenhum cliente finalizado neste período.
            </div>
        `;
        return;
    }

    lista.slice(0, 5).forEach(function (item, index) {
        caixa.innerHTML += `
            <div class="servico-ranking">
                <strong>${medalha(index)} ${item.nome}</strong>
                <span>
                    ${item.visitas} visitas • ${formatarMoeda(item.total)}
                </span>
            </div>
        `;
    });
}

function filtroHoje() {
    const hoje = formatarData(new Date());

    document.getElementById("dataInicialFinanceiro").value = hoje;
    document.getElementById("dataFinalFinanceiro").value = hoje;
    document.getElementById("dataDespesa").value = hoje;

    filtrarFinanceiro();
}

function filtroOntem() {
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    const data = formatarData(ontem);

    document.getElementById("dataInicialFinanceiro").value = data;
    document.getElementById("dataFinalFinanceiro").value = data;
    document.getElementById("dataDespesa").value = data;

    filtrarFinanceiro();
}

function filtroSemana() {
    const hoje = new Date();
    const inicio = new Date();

    inicio.setDate(hoje.getDate() - 7);

    document.getElementById("dataInicialFinanceiro").value =
        formatarData(inicio);

    document.getElementById("dataFinalFinanceiro").value =
        formatarData(hoje);

    document.getElementById("dataDespesa").value =
        formatarData(hoje);

    filtrarFinanceiro();
}

function filtroMes() {
    const hoje = new Date();

    const inicio = new Date(
        hoje.getFullYear(),
        hoje.getMonth(),
        1
    );

    document.getElementById("dataInicialFinanceiro").value =
        formatarData(inicio);

    document.getElementById("dataFinalFinanceiro").value =
        formatarData(hoje);

    document.getElementById("dataDespesa").value =
        formatarData(hoje);

    filtrarFinanceiro();
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

function formatarDataVisual(data) {
    const partes = data.split("-");

    return partes[2] + "/" + partes[1] + "/" + partes[0];
}