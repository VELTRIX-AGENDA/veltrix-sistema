/**
 * VELTRIX - Sistema de Agendamento Inteligente
 * Módulo: Profissionais (Ajustado com IDs Únicos contra bugs)
 */

const btnAdicionarBarbeiro = document.getElementById("btnAdicionarBarbeiro");
const listaBarbeiros = document.getElementById("listaBarbeiros");
const formProfissional = document.getElementById("formProfissional");

// Carrega os dados persistidos ou inicializa
let barbeiros = JSON.parse(localStorage.getItem("barbeiros")) || [];

// Mantém suas limpezas automáticas de segurança ao iniciar
limparDisponibilidadesOrfas();
mostrarBarbeiros();

btnAdicionarBarbeiro.addEventListener("click", function () {
    const nome = document.getElementById("nomeBarbeiro").value.trim();
    const campoFoto = document.getElementById("fotoBarbeiro");

    if (nome === "") {
        alert("Informe o nome do profissional.");
        return;
    }

    // Validação usando o nome atual
    const profissionalExistente = barbeiros.find(function (item) {
        return item.nome.trim().toLowerCase() === nome.toLowerCase();
    });

    if (profissionalExistente) {
        alert("Esse profissional já está cadastrado.");
        return;
    }

    if (campoFoto.files.length > 0) {
        const leitor = new FileReader();
        leitor.onload = function () {
            salvarNovoProfissional(nome, leitor.result);
        };
        leitor.readAsDataURL(campoFoto.files[0]);
    } else {
        salvarNovoProfissional(nome, "");
    }
});

function mostrarFormulario() {
    formProfissional.style.display =
        formProfissional.style.display === "none" ? "block" : "none";
}

function salvarNovoProfissional(nome, foto) {
    // MODIFICAÇÃO: Agora cada barbeiro ganha um ID único inalterável
    barbeiros.push({
        id: "bar_" + Date.now(),
        nome: nome,
        foto: foto
    });

    salvarBarbeiros();

    document.getElementById("nomeBarbeiro").value = "";
    document.getElementById("fotoBarbeiro").value = "";
    formProfissional.style.display = "none";

    mostrarBarbeiros();
}

function mostrarBarbeiros() {
    listaBarbeiros.innerHTML = "";

    // Mantém sua ótima lógica de ordenação alfabética
    const profissionaisOrdenados = [...barbeiros].sort(function (a, b) {
        return a.nome.localeCompare(b.nome);
    });

    for (let i = 0; i < profissionaisOrdenados.length; i++) {
        const profissional = profissionaisOrdenados[i];
        const inicial = profissional.nome.charAt(0).toUpperCase();

        const fotoHtml = profissional.foto
            ? `<img src="${profissional.foto}" class="profissional-card-foto">`
            : `<div class="profissional-card-avatar">${inicial}</div>`;

        // MODIFICAÇÃO: Passamos o profissional.id (String) entre aspas para a função de exclusão
        listaBarbeiros.innerHTML += `
            <div class="profissional-quadrado">
                ${fotoHtml}
                <strong>${profissional.nome}</strong>
                <button onclick="excluirBarbeiro('${profissional.id}')">
                    Excluir
                </button>
            </div>
        `;
    }

    // Mantém o seu botão de adicionar no final da lista
    listaBarbeiros.innerHTML += `
        <div class="profissional-quadrado adicionar-profissional" onclick="mostrarFormulario()">
            <div class="add-icon">+</div>
            <strong>Adicionar</strong>
        </div>
    `;
}

// MODIFICAÇÃO: Agora a exclusão localiza pelo ID inalterável, protegendo sua base
function excluirBarbeiro(id) {
    const profissional = barbeiros.find(item => item.id === id);
    
    if (!profissional) return;

    const confirmar = confirm(
        "Deseja realmente excluir este profissional? As disponibilidades dele também serão removidas."
    );

    if (!confirmar) return;

    // Remove as disponibilidades atreladas ao nome dele
    removerDisponibilidadesDoProfissional(profissional.nome);

    // Filtra o array removendo o profissional correto pelo ID
    barbeiros = barbeiros.filter(item => item.id !== id);

    salvarBarbeiros();
    limparDisponibilidadesOrfas();
    mostrarBarbeiros();
}

function removerDisponibilidadesDoProfissional(nomeProfissional) {
    const disponibilidades = JSON.parse(localStorage.getItem("disponibilidades")) || [];

    const novasDisponibilidades = disponibilidades.filter(function (item) {
        return item.barbeiro !== nomeProfissional;
    });

    localStorage.setItem("disponibilidades", JSON.stringify(novasDisponibilidades));
}

function limparDisponibilidadesOrfas() {
    const disponibilidades = JSON.parse(localStorage.getItem("disponibilidades")) || [];

    const nomesProfissionais = barbeiros.map(function (item) {
        return item.nome;
    });

    const disponibilidadesValidas = disponibilidades.filter(function (item) {
        return nomesProfissionais.includes(item.barbeiro);
    });

    localStorage.setItem("disponibilidades", JSON.stringify(disponibilidadesValidas));
}

function salvarBarbeiros() {
    localStorage.setItem("barbeiros", JSON.stringify(barbeiros));
}