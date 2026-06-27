/**
 * VELTRIX - Sistema de Agendamento Inteligente
 * Módulo: Gerenciamento de Usuários e Perfis de Acesso (usuarios.js)
 */

/**
 * 1. FUNÇÃO DE ALTERNAR SENHA (ISOLADA NO TOPO)
 */
function alternarVisibilidadeSenha() {
    const campoSenha = document.getElementById("senhaUsuario");
    const botaoOlho = document.getElementById("btnToggleSenhaUsuario");

    if (!campoSenha || !botaoOlho) return;

    if (campoSenha.type === "password") {
        campoSenha.type = "text";
        botaoOlho.innerText = "🙈";
    } else {
        campoSenha.type = "password";
        botaoOlho.innerText = "👁️";
    }
}

/**
 * 2. ESTADO GLOBAL E CAPTURA DO DOM
 */
const listaUsuariosContainer = document.getElementById("listaUsuarios");
const btnSalvarUsuario = document.getElementById("btnSalvarUsuario");

const selectNome = document.getElementById("nomeUsuario");
const inputEmail = document.getElementById("emailUsuario");
const inputSenha = document.getElementById("senhaUsuario");
const inputPerfil = document.getElementById("perfilUsuario");

/**
 * 3. INICIALIZAÇÃO
 */
document.addEventListener("DOMContentLoaded", () => {
    popularSelectProfissionais();
    renderizarListaUsuarios();
    
    if (btnSalvarUsuario) {
        btnSalvarUsuario.onclick = processarCadastroUsuario;
    }
});

/**
 * Busca profissionais cadastrados no localStorage e popula o select
 */
function popularSelectProfissionais() {
    if (!selectNome) return;

    // Varre chaves possíveis que você possa estar usando para salvar sua equipe
    const profissionais = JSON.parse(localStorage.getItem("barbeiros")) || 
                          JSON.parse(localStorage.getItem("profissionais")) || [];

    let htmlOpcoes = `<option value="">Selecione um profissional</option>`;
    
    profissionais.forEach(prof => {
        if (prof.nome) {
            htmlOpcoes += `<option value="${prof.nome}">${prof.nome}</option>`;
        }
    });

    // Permite criar um login administrativo que não necessariamente corta cabelo
    htmlOpcoes += `<option value="Administrador Geral">Administrador Geral (Sem vínculo)</option>`;
    
    selectNome.innerHTML = htmlOpcoes;
}

function obterUsuariosDoBanco() {
    return JSON.parse(localStorage.getItem("usuarios")) || [];
}

function processarCadastroUsuario() {
    const nome = selectNome.value;
    const email = inputEmail.value.trim().toLowerCase();
    const senha = inputSenha.value.trim();
    const perfil = inputPerfil.value;

    if (!nome || !email || !senha || !perfil) {
        alert("🚨 Erro: Todos os campos são obrigatórios.");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("🚨 Erro: Por favor, insira um e-mail válido.");
        return;
    }

    let bancoUsuarios = obterUsuariosDoBanco();
    const usuarioExistenteIndex = bancoUsuarios.findIndex(user => user.email === email);

    if (usuarioExistenteIndex !== -1) {
        bancoUsuarios[usuarioExistenteIndex] = { nome, email, senha, perfil };
        alert(`💾 Usuário [${email}] atualizado!`);
    } else {
        bancoUsuarios.push({ nome, email, senha, perfil });
        alert(`✨ Novo usuário criado!`);
    }

    localStorage.setItem("usuarios", JSON.stringify(bancoUsuarios));
    limparFormularioUsuarios();
    renderizarListaUsuarios();
}

function renderizarListaUsuarios() {
    if (!listaUsuariosContainer) return;
    listaUsuariosContainer.innerHTML = "";
    const usuarios = obterUsuariosDoBanco();

    if (usuarios.length === 0) {
        listaUsuariosContainer.innerHTML = `<div class="empty-state">Nenhum operador cadastrado.</div>`;
        return;
    }

    usuarios.forEach((usuario) => {
        const ehAdministradorNativo = (usuario.email === "admin@veltrix.com" || usuario.email === "admin@agendei.com");
        
        const botaoExcluirHtml = ehAdministradorNativo 
            ? `<small style="color: #64748B; font-style: italic;">Conta master</small>`
            : `<button onclick="eliminarUsuario('${usuario.email}')" style="background: #1e293b; color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 8px; margin-top: 8px; border-radius: 10px; font-size: 12px; cursor: pointer;">Remover Acesso</button>`;

        listaUsuariosContainer.innerHTML += `
            <div class="agendamento-item">
                <strong>👤 ${usuario.nome}</strong>
                <span>📧 Email: ${usuario.email}</span>
                <span>🔑 Perfil: <small class="status-badge status-atendimento">${usuario.perfil}</small></span>
                ${botaoExcluirHtml}
            </div>
        `;
    });
}

function eliminarUsuario(emailUsuario) {
    if (emailUsuario === "admin@veltrix.com" || emailUsuario === "admin@agendei.com") {
        alert("🔒 Erro: Credenciais master não podem ser apagadas.");
        return;
    }

    if (!confirm(`Deseja revogar o acesso de ${emailUsuario}?`)) return;

    let bancoUsuarios = obterUsuariosDoBanco();
    bancoUsuarios = bancoUsuarios.filter(user => user.email !== emailUsuario);
    localStorage.setItem("usuarios", JSON.stringify(bancoUsuarios));
    renderizarListaUsuarios();
}

function limparFormularioUsuarios() {
    if(selectNome) selectNome.value = "";
    if(inputEmail) inputEmail.value = "";
    if(inputSenha) inputSenha.value = "";
    if(inputPerfil) inputPerfil.value = "";
    
    const botaoOlho = document.getElementById("btnToggleSenhaUsuario");
    if (inputSenha && botaoOlho) {
        inputSenha.type = "password";
        botaoOlho.innerText = "👁️";
    }
}
