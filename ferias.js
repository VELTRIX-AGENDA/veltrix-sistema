const profissionalFerias =
    document.getElementById("profissionalFerias");

const btnSalvarFerias =
    document.getElementById("btnSalvarFerias");

const ferias =
    JSON.parse(localStorage.getItem("ferias")) || [];

limparFeriasOrfas();
carregarProfissionais();
mostrarFerias();

btnSalvarFerias.addEventListener("click", function () {
    const profissional = profissionalFerias.value;
    const dataInicial = document.getElementById("dataInicial").value;
    const dataFinal = document.getElementById("dataFinal").value;
    const motivo = document.getElementById("motivo").value.trim();

    if (profissional === "") {
        alert("Selecione um profissional.");
        return;
    }

    if (dataInicial === "") {
        alert("Informe a data inicial.");
        return;
    }

    if (dataFinal === "") {
        alert("Informe a data final.");
        return;
    }

    if (dataFinal < dataInicial) {
        alert("A data final não pode ser menor que a data inicial.");
        return;
    }

    ferias.push({
        profissional: profissional,
        dataInicial: dataInicial,
        dataFinal: dataFinal,
        motivo: motivo || "Ausência cadastrada"
    });

    salvarFerias();
    limparFormulario();
    mostrarFerias();
});

function carregarProfissionais() {
    const profissionais =
        JSON.parse(localStorage.getItem("barbeiros")) || [];

    profissionalFerias.innerHTML =
        '<option value="">Selecione um profissional</option>';

    for (let i = 0; i < profissionais.length; i++) {
        profissionalFerias.innerHTML += `
            <option value="${profissionais[i].nome}">
                ${profissionais[i].nome}
            </option>
        `;
    }
}

function limparFeriasOrfas() {
    const profissionais =
        JSON.parse(localStorage.getItem("barbeiros")) || [];

    const nomesProfissionais =
        profissionais.map(function (item) {
            return item.nome;
        });

    for (let i = ferias.length - 1; i >= 0; i--) {
        if (!nomesProfissionais.includes(ferias[i].profissional)) {
            ferias.splice(i, 1);
        }
    }

    salvarFerias();
}

function mostrarFerias() {
    limparFeriasOrfas();

    const lista =
        document.getElementById("listaFerias");

    lista.innerHTML = "";

    if (ferias.length === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                Nenhum período cadastrado.
            </div>
        `;
        return;
    }

    const ordenadas =
        [...ferias].sort(function (a, b) {
            return a.dataInicial.localeCompare(b.dataInicial);
        });

    for (let i = 0; i < ordenadas.length; i++) {
        const item = ordenadas[i];
        const indiceOriginal = ferias.indexOf(item);

        lista.innerHTML += `
            <div class="dashboard-active-card">
                <strong>${item.profissional}</strong>

                <span>
                    ${formatarDataVisual(item.dataInicial)}
                    até
                    ${formatarDataVisual(item.dataFinal)}
                </span>

                <span>
                    Motivo: ${item.motivo || "Ausência cadastrada"}
                </span>

                <button onclick="excluirFerias(${indiceOriginal})">
                    Excluir Período
                </button>
            </div>
        `;
    }
}

function excluirFerias(posicao) {
    const confirmar =
        confirm("Deseja excluir este período?");

    if (!confirmar) {
        return;
    }

    ferias.splice(posicao, 1);

    salvarFerias();

    mostrarFerias();
}

function salvarFerias() {
    localStorage.setItem(
        "ferias",
        JSON.stringify(ferias)
    );
}

function limparFormulario() {
    profissionalFerias.value = "";
    document.getElementById("dataInicial").value = "";
    document.getElementById("dataFinal").value = "";
    document.getElementById("motivo").value = "";
}

function formatarDataVisual(data) {
    const partes = data.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}