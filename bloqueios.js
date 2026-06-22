const campoBarbeiro =
    document.getElementById("barbeiroBloqueio");

const btnSalvar =
    document.getElementById("btnSalvarBloqueio");

const bloqueios =
    JSON.parse(localStorage.getItem("bloqueios")) || [];

limparBloqueiosOrfaos();
carregarProfissionais();
mostrarBloqueios();

btnSalvar.addEventListener("click", function () {
    const barbeiro = campoBarbeiro.value;
    const data = document.getElementById("dataBloqueio").value;
    const horaInicial = document.getElementById("horaInicial").value;
    const horaFinal = document.getElementById("horaFinal").value;
    const motivo = document.getElementById("motivo").value.trim();

    if (barbeiro === "") {
        alert("Selecione um profissional.");
        return;
    }

    if (data === "") {
        alert("Informe a data.");
        return;
    }

    if (horaInicial === "") {
        alert("Informe a hora inicial.");
        return;
    }

    if (horaFinal === "") {
        alert("Informe a hora final.");
        return;
    }

    if (horaFinal <= horaInicial) {
        alert("O horário final deve ser maior que o horário inicial.");
        return;
    }

    bloqueios.push({
        barbeiro: barbeiro,
        data: data,
        horaInicial: horaInicial,
        horaFinal: horaFinal,
        motivo: motivo || "Bloqueio especial"
    });

    salvarBloqueios();
    limparFormulario();
    mostrarBloqueios();
});

function carregarProfissionais() {
    const profissionais =
        JSON.parse(localStorage.getItem("barbeiros")) || [];

    campoBarbeiro.innerHTML =
        '<option value="">Selecione um profissional</option>';

    for (let i = 0; i < profissionais.length; i++) {
        campoBarbeiro.innerHTML += `
            <option value="${profissionais[i].nome}">
                ${profissionais[i].nome}
            </option>
        `;
    }
}

function limparBloqueiosOrfaos() {
    const profissionais =
        JSON.parse(localStorage.getItem("barbeiros")) || [];

    const nomesProfissionais =
        profissionais.map(function (item) {
            return item.nome;
        });

    for (let i = bloqueios.length - 1; i >= 0; i--) {
        if (!nomesProfissionais.includes(bloqueios[i].barbeiro)) {
            bloqueios.splice(i, 1);
        }
    }

    salvarBloqueios();
}

function mostrarBloqueios() {
    limparBloqueiosOrfaos();

    const lista =
        document.getElementById("listaBloqueios");

    lista.innerHTML = "";

    if (bloqueios.length === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                Nenhum bloqueio cadastrado.
            </div>
        `;
        return;
    }

    const ordenados =
        [...bloqueios].sort(function (a, b) {
            const dataA = a.data + " " + a.horaInicial;
            const dataB = b.data + " " + b.horaInicial;

            return dataA.localeCompare(dataB);
        });

    for (let i = 0; i < ordenados.length; i++) {
        const item = ordenados[i];
        const indiceOriginal = bloqueios.indexOf(item);

        lista.innerHTML += `
            <div class="dashboard-active-card">
                <strong>${item.barbeiro}</strong>

                <span>Data: ${formatarDataVisual(item.data)}</span>
                <span>Horário: ${item.horaInicial} até ${item.horaFinal}</span>
                <span>Motivo: ${item.motivo || "Bloqueio especial"}</span>

                <button onclick="excluirBloqueio(${indiceOriginal})">
                    Excluir Bloqueio
                </button>
            </div>
        `;
    }
}

function excluirBloqueio(posicao) {
    const confirmar =
        confirm("Deseja excluir este bloqueio?");

    if (!confirmar) {
        return;
    }

    bloqueios.splice(posicao, 1);

    salvarBloqueios();

    mostrarBloqueios();
}

function salvarBloqueios() {
    localStorage.setItem(
        "bloqueios",
        JSON.stringify(bloqueios)
    );
}

function limparFormulario() {
    campoBarbeiro.value = "";
    document.getElementById("dataBloqueio").value = "";
    document.getElementById("horaInicial").value = "";
    document.getElementById("horaFinal").value = "";
    document.getElementById("motivo").value = "";
}

function formatarDataVisual(data) {
    const partes = data.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}