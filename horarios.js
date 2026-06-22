const campoBarbeiroHorario = document.getElementById("barbeiroHorario");
const btnSalvarHorario = document.getElementById("btnSalvarHorario");

const horarios =
    JSON.parse(localStorage.getItem("horarios")) || [];

carregarBarbeiros();
mostrarHorarios();

btnSalvarHorario.addEventListener("click", function () {
    const barbeiro = campoBarbeiroHorario.value;
    const entrada = document.getElementById("horaEntrada").value;
    const saida = document.getElementById("horaSaida").value;
    const inicioIntervalo = document.getElementById("inicioIntervalo").value;
    const fimIntervalo = document.getElementById("fimIntervalo").value;

    if (barbeiro === "") {
        alert("Selecione um barbeiro.");
        return;
    }

    if (entrada === "") {
        alert("Informe o horário de entrada.");
        return;
    }

    if (saida === "") {
        alert("Informe o horário de saída.");
        return;
    }

    horarios.push({
        barbeiro: barbeiro,
        entrada: entrada,
        saida: saida,
        inicioIntervalo: inicioIntervalo,
        fimIntervalo: fimIntervalo
    });

    localStorage.setItem(
        "horarios",
        JSON.stringify(horarios)
    );

    campoBarbeiroHorario.value = "";
    document.getElementById("horaEntrada").value = "";
    document.getElementById("horaSaida").value = "";
    document.getElementById("inicioIntervalo").value = "";
    document.getElementById("fimIntervalo").value = "";

    mostrarHorarios();
});

function carregarBarbeiros() {
    const barbeiros =
        JSON.parse(localStorage.getItem("barbeiros")) || [];

    campoBarbeiroHorario.innerHTML =
        '<option value="">Selecione um barbeiro</option>';

    for (let i = 0; i < barbeiros.length; i++) {
        campoBarbeiroHorario.innerHTML += `
            <option value="${barbeiros[i].nome}">
                ${barbeiros[i].nome}
            </option>
        `;
    }
}

function mostrarHorarios() {
    const lista = document.getElementById("listaHorarios");

    lista.innerHTML = "";

    for (let i = 0; i < horarios.length; i++) {
        lista.innerHTML += `
            <div class="agendamento-item">
                <strong>Barbeiro: ${horarios[i].barbeiro}</strong>
                <span>Entrada: ${horarios[i].entrada}</span>
                <span>Saída: ${horarios[i].saida}</span>
                <span>Intervalo: ${horarios[i].inicioIntervalo || "Sem intervalo"} até ${horarios[i].fimIntervalo || "Sem intervalo"}</span>

                <button onclick="excluirHorario(${i})">
                    Excluir
                </button>
            </div>
        `;
    }
}

function excluirHorario(posicao) {
    horarios.splice(posicao, 1);

    localStorage.setItem(
        "horarios",
        JSON.stringify(horarios)
    );

    mostrarHorarios();
}