/**
 * VELTRIX - Sistema de Agendamento Inteligente
 * Módulo: Catálogo e Gerenciamento de Serviços
 */

// Carrega os dados persistidos ou inicializa um array vazio
let servicos = JSON.parse(localStorage.getItem("servicos")) || [];

// Captura de Elementos do DOM
const inputNome = document.getElementById("nomeServico");
const inputDuracao = document.getElementById("duracaoServico");
const inputPreco = document.getElementById("precoServico");
const inputPesquisa = document.getElementById("pesquisarServico");
const btnSalvar = document.getElementById("btnAdicionarServico");
const containerLista = document.getElementById("listaServicos");

// Listeners de Eventos
btnSalvar.addEventListener("click", salvarServico);
inputPesquisa.addEventListener("input", filtrarServicos);

// Inicializa a renderização da tela
renderizarServicos(servicos);

/**
 * Controla o salvamento e validação de novos serviços
 */
function salvarServico() {
    const nome = inputNome.value.trim();
    const duracao = Number(inputDuracao.value);
    const preco = Number(inputPreco.value);

    // Validações de segurança
    if (!nome) {
        alert("Por favor, informe o nome do serviço.");
        return;
    }
    if (duracao <= 0) {
        alert("A duração do serviço precisa ser maior que zero minutos.");
        return;
    }
    if (preco <= 0) {
        alert("O valor do serviço precisa ser maior que R$ 0,00.");
        return;
    }

    // Cria o objeto com ID único baseado no timestamp para evitar bugs de exclusão
    const novoServico = {
        id: "srv_" + Date.now(),
        nome: nome,
        duracao: duracao,
        preco: preco
    };

    // Atualiza o estado da aplicação e o LocalStorage
    servicos.push(novoServico);
    sincronizarStorage();

    // Limpa os campos do formulário para o próximo input
    inputNome.value = "";
    inputDuracao.value = "";
    inputPreco.value = "";

    // Atualiza a visualização com a lista atualizada
    filtrarServicos();
    alert("Serviço salvo com sucesso!");
}

/**
 * Remove um serviço da base de dados através de seu ID exclusivo
 * @param {string} id - ID do serviço a ser deletado
 */
function excluirServico(id) {
    if (confirm("Tem certeza que deseja remover este serviço do catálogo?")) {
        servicos = servicos.filter(item => item.id !== id);
        sincronizarStorage();
        filtrarServicos();
    }
}

/**
 * Filtra dinamicamente a lista com base no termo digitado na barra de pesquisa
 */
function filtrarServicos() {
    const termo = inputPesquisa.value.toLowerCase().trim();
    
    const filtrados = servicos.filter(item => {
        return item.nome.toLowerCase().includes(termo);
    });

    renderizarServicos(filtrados);
}

/**
 * Constrói o HTML dos serviços cadastrados dentro do container correspondente
 * @param {Array} listaExibicao - Lista de serviços filtrada ou completa
 */
function renderizarServicos(listaExibicao) {
    containerLista.innerHTML = "";

    if (listaExibicao.length === 0) {
        containerLista.innerHTML = `
            <div class="empty-state" style="text-align: center; color: #8a8a93; padding: 20px;">
                Nenhum serviço encontrado.
            </div>
        `;
        return;
    }

    listaExibicao.forEach(item => {
        // Formata os dados para a exibição no padrão VELTRIX
        const precoFormatado = "R$ " + Number(item.preco).toFixed(2);
        const duracaoFormatada = item.duracao + " min";

        containerLista.innerHTML += `
            <div class="servico-ranking" style="display: flex; justify-content: space-between; align-items: center; background: #26262b; padding: 14px; margin-bottom: 10px; border-radius: 8px;">
                <div>
                    <strong style="display: block; color: #fff; font-size: 15px;">🛠️ ${item.nome}</strong>
                    <span style="font-size: 13px; color: #8a8a93;">${duracaoFormatada} • ${precoFormatado}</span>
                </div>
                <button 
                    onclick="excluirServico('${item.id}')" 
                    style="background: #e74c3c; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: bold;"
                >
                    Excluir
                </button>
            </div>
        `;
    });
}

/**
 * Centraliza a sincronização do estado com o armazenamento local
 */
function sincronizarStorage() {
    localStorage.setItem("servicos", JSON.stringify(servicos));
}