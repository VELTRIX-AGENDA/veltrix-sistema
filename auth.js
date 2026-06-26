/**
 * VELTRIX - Sistema de Autenticação e Segurança Inteligente Multi-Tenant
 * Módulo: Fluxo Separado, Validação Antisequencial de Senha, Medidor de Força e Dados do Estabelecimento
 */

// --- VERIFICAÇÃO DE SESSÃO PERMANENTE (LOCALSTORAGE) ---
// Se o usuário já estiver logado e tentar acessar a página de login/cadastro, manda direto para a dashboard
if (localStorage.getItem("usuarioLogado")) {
    // Evita loop de redirecionamento se já estiver na dashboard ou páginas internas
    if (window.location.pathname.includes("index.html") || window.location.pathname.endsWith("/") || window.location.pathname.includes("login")) {
        window.location.href = "dashboard.html";
    }
}

// 1. INICIALIZAÇÃO DO EMAILJS
emailjs.init({
    publicKey: "JM2E6ko8vRLfYh1Ty", // Sua chave pública ativa
});

// Captura de Elementos do DOM
const secaoCredenciais = document.getElementById("secaoCredenciais");
const secaoVerificacao = document.getElementById("secaoVerificacao");

const authTitle = document.getElementById("auth-title");
const authDesc = document.getElementById("auth-desc");
const btnAlternarModo = document.getElementById("btnAlternarModo");
const textoAlternar = document.getElementById("textoAlternar");

const inputEmail = document.getElementById("regEmail");
const inputSenha = document.getElementById("regSenha");
const inputCodigo = document.getElementById("codigoInput");

// ELEMENTOS ADICIONADOS PARA CAPTURA MULTI-TENANT
const inputNomeEmpresa = document.getElementById("regEmpresa");
const inputNomeUsuario = document.getElementById("regNome");
const grupoNome = document.getElementById("grupoNome");
const grupoEmpresa = document.getElementById("grupoEmpresa");

const btnEnviarCodigo = document.getElementById("btnEnviarCodigo");
const btnConfirmarCadastro = document.getElementById("btnConfirmarCadastro");
const btnVoltar = document.getElementById("btnVoltar");
const btnToggleSenha = document.getElementById("btnToggleSenha");

// Elementos da barra de requisitos de senha
const containerRequisitosSenha = document.getElementById("containerRequisitosSenha");
const barraForcaSenha = document.getElementById("barraForcaSenha");
const textoRequisitosSenha = document.getElementById("textoRequisitosSenha");

// Estado da Aplicação
let modoAtual = "login"; // Pode ser "login" ou "cadastro"

let dadosTemporarios = {
    nome: "",
    email: "",
    senha: "",
    empresa: "",
    codigoGerado: ""
};

// Eventos de Inicialização
if (btnEnviarCodigo) btnEnviarCodigo.addEventListener("click", processarAutenticacao);
if (btnConfirmarCadastro) btnConfirmarCadastro.addEventListener("click", validarCodigoEEntrar);
if (btnVoltar) btnVoltar.addEventListener("click", () => alternarTelas(false));
if (btnToggleSenha) btnToggleSenha.addEventListener("click", alternarVisibilidadeSenha);
if (btnAlternarModo) btnAlternarModo.addEventListener("click", alternarModoAbas);
if (inputSenha) inputSenha.addEventListener("input", gerenciarMedidorSenha);

/**
 * Alterna visualmente entre os modos de Login e Cadastro
 */
function alternarModoAbas(e) {
    if (e) e.preventDefault();
    
    if (containerRequisitosSenha) containerRequisitosSenha.style.display = "none";
    if (barraForcaSenha) barraForcaSenha.style.width = "0%";
    
    if (modoAtual === "login") {
        modoAtual = "cadastro";
        if (authTitle) authTitle.innerText = "Criar Nova Conta";
        if (authDesc) authDesc.innerText = "Cadastre seu estabelecimento na plataforma inteligente";
        if (btnEnviarCodigo) btnEnviarCodigo.innerText = "Enviar Código de Verificação";
        if (textoAlternar) textoAlternar.innerText = "Já possui uma conta?";
        if (btnAlternarModo) btnAlternarModo.innerText = "Faça Login";
        if (containerRequisitosSenha) containerRequisitosSenha.style.display = "block";
        
        // Exibe os novos campos criados para coletar os dados do Tenant
        if (grupoNome) grupoNome.style.display = "block";
        if (grupoEmpresa) grupoEmpresa.style.display = "block";
        
        gerenciarMedidorSenha();
    } else {
        modoAtual = "login";
        if (authTitle) authTitle.innerText = "Acessar Conta";
        if (authDesc) authDesc.innerText = "Entre na sua conta da plataforma";
        if (btnEnviarCodigo) btnEnviarCodigo.innerText = "Entrar Direto";
        if (textoAlternar) textoAlternar.innerText = "Não tem uma conta?";
        if (btnAlternarModo) btnAlternarModo.innerText = "Cadastre-se";
        
        // Oculta os campos deixando a tela limpa apenas com e-mail e senha para login
        if (grupoNome) grupoNome.style.display = "none";
        if (grupoEmpresa) grupoEmpresa.style.display = "none";
    }
}

/**
 * Controla a visibilidade do input de senha (Olho)
 */
function alternarVisibilidadeSenha() {
    if (inputSenha.type === "password") {
        inputSenha.type = "text";
        btnToggleSenha.innerText = "🙈";
    } else {
        inputSenha.type = "password";
        btnToggleSenha.innerText = "👁️";
    }
}

/**
 * Validador de Regras de Segurança: Letras Maiúsculas, Sequências e Repetições
 */
function analisarRegrasSenha(senha) {
    const temMaiuscula = /[A-Z]/.test(senha);
    const temRepeticao = /(\w)\1\1/.test(senha);

    let temSequencia = false;
    const sequenciasProibidas = ["012", "123", "234", "345", "456", "567", "678", "789", "987", "876", "765", "654", "543", "432", "321", "210", "abc", "bcd", "cde", "def"];
    
    const senhaMinuscula = senha.toLowerCase();
    for (let seq of sequenciasProibidas) {
        if (senhaMinuscula.includes(seq)) {
            temSequencia = true;
            break;
        }
    }

    return { temMaiuscula, temRepeticao, temSequencia };
}

/**
 * Controla visualmente o medidor de força (Barrinha Colorida)
 */
function gerenciarMedidorSenha() {
    if (modoAtual !== "cadastro" || !barraForcaSenha) return;

    const senha = inputSenha.value;
    
    if (!senha) {
        barraForcaSenha.style.width = "0%";
        if (textoRequisitosSenha) textoRequisitosSenha.style.color = "#8a8a93";
        return;
    }

    const { temMaiuscula, temRepeticao, temSequencia } = analisarRegrasSenha(senha);
    
    if (senha.length < 6 || temRepeticao || temSequencia || !temMaiuscula) {
        barraForcaSenha.style.width = "30%";
        barraForcaSenha.style.background = "#ef4444"; 
        if (textoRequisitosSenha) textoRequisitosSenha.style.color = "#ef4444";
    } else if (senha.length >= 6 && senha.length < 10) {
        barraForcaSenha.style.width = "65%";
        barraForcaSenha.style.background = "#eab308"; 
        if (textoRequisitosSenha) textoRequisitosSenha.style.color = "#2cc185";
    } else {
        barraForcaSenha.style.width = "100%";
        barraForcaSenha.style.background = "#2cc185"; 
        if (textoRequisitosSenha) textoRequisitosSenha.style.color = "#2cc185";
    }
}

/**
 * Processador central: Decide se autentica direto ou se exige nova validação
 */
function processarAutenticacao(e) {
    if (e && typeof e.preventDefault === 'function') {
        e.preventDefault();
    }

    const email = inputEmail.value.trim();
    const senha = inputSenha.value;

    if (!email || !email.includes("@")) {
        alert("Por favor, insira um e-mail válido.");
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem("veltrix_usuarios")) || [];
    const usuarioExistente = usuarios.find(u => u.email === email);

    // --- FLUXO 1: MODO LOGIN ATIVO ---
    if (modoAtual === "login") {
        if (!usuarioExistente) {
            alert("Este e-mail não está cadastrado. Mudamos para o modo de Cadastro.");
            modoAtual = "login"; 
            alternarModoAbas(); 
            return;
        }
        
        if (usuarioExistente.senha !== senha) {
            alert("Senha incorreta para este usuário.");
            return;
        }

        // Recupera e injeta dinamicamente os dados reais salvos no cadastro
        const estruturaSessao = {
            nome: usuarioExistente.nome || "Gestor",
            perfil: "Administrador",
            empresa: usuarioExistente.empresa || "Estabelecimento"
        };

        // Salva de forma persistente no localStorage
        localStorage.setItem("usuarioLogado", JSON.stringify(estruturaSessao));
        alert("Login efetuado com sucesso! Redirecionando...");
        window.location.href = "dashboard.html";
        return;
    }

    // --- FLUXO 2: MODO CADASTRO ATIVO ---
    if (usuarioExistente) {
        alert("Este e-mail já possui cadastro ativo. Por favor, faça login direto.");
        modoAtual = "cadastro"; 
        alternarModoAbas();   
        return;
    }

    // Captura e validação real dos dados digitados nos novos campos expostos
    const nomeUsuario = inputNomeUsuario ? inputNomeUsuario.value.trim() : "";
    const nomeEmpresa = inputNomeEmpresa ? inputNomeEmpresa.value.trim() : "";

    if (!nomeUsuario || !nomeEmpresa) {
        alert("Por favor, preencha o seu nome e o nome do seu estabelecimento.");
        return;
    }

    // Validações de segurança de senha
    if (senha.length < 6) {
        alert("A senha precisa ter no mínimo 6 caracteres.");
        return;
    }

    const { temMaiuscula, temRepeticao, temSequencia } = analisarRegrasSenha(senha);

    if (!temMaiuscula) {
        alert("Sua nova senha deve conter pelo menos uma letra MAIÚSCULA.");
        return;
    }
    if (temRepeticao) {
        alert("Por motivos de segurança, não use sequências repetidas na senha (Ex: 111, aaa).");
        return;
    }
    if (temSequencia) {
        alert("Senha fraca detectada! Evite usar sequências numéricas ou de letras (Ex: 123, abc, 654).");
        return;
    }

    // Gerador de OTP Token
    const codigoSecreto = Math.floor(100000 + Math.random() * 900000).toString();

    dadosTemporarios.nome = nomeUsuario;
    dadosTemporarios.email = email;
    dadosTemporarios.senha = senha;
    dadosTemporarios.empresa = nomeEmpresa;
    dadosTemporarios.codigoGerado = codigoSecreto;

    btnEnviarCodigo.innerText = "Enviando e-mail...";
    btnEnviarCodigo.disabled = true;

    const parametrosTemplate = {
        to_email: email,
        verification_code: codigoSecreto
    };

    console.log("Iniciando requisição EmailJS para:", email);

    emailjs.send("service_65tw8a6", "template_kvb78jx", parametrosTemplate)
        .then((response) => {
            console.log("Sucesso EmailJS:", response);
            alert("Código de verificação enviado com sucesso!");
            alternarTelas(true);
        })
        .catch((erro) => {
            console.error("Erro interno no envio:", erro);
            alert("Falha ao enviar e-mail. Resposta do servidor: " + (erro.text || JSON.stringify(erro)));
        })
        .finally(() => {
            btnEnviarCodigo.innerText = modoAtual === "cadastro" ? "Enviar Código de Verificação" : "Entrar Direto";
            btnEnviarCodigo.disabled = false;
        });
}

/**
 * Validação final do OTP para gravação permanente do novo registro
 */
function validarCodigoEEntrar() {
    const codigoDigitado = inputCodigo.value.trim();

    if (codigoDigitado !== dadosTemporarios.codigoGerado) {
        alert("Código incorreto! Verifique novamente a sua caixa de entrada.");
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem("veltrix_usuarios")) || [];
    
    const novoUsuario = {
        nome: dadosTemporarios.nome,
        email: dadosTemporarios.email,
        senha: dadosTemporarios.senha,
        empresa: dadosTemporarios.empresa
    };

    usuarios.push(novoUsuario);
    localStorage.setItem("veltrix_usuarios", JSON.stringify(usuarios));

    // Salva de forma permanente vinculando e transportando os dados para o Dashboard
    const estruturaSessao = {
        nome: dadosTemporarios.nome,
        perfil: "Administrador",
        empresa: dadosTemporarios.empresa
    };
    localStorage.setItem("usuarioLogado", JSON.stringify(estruturaSessao));

    alert("Conta criada com sucesso! Bem-vindo ao ecossistema VELTRIX.");
    window.location.href = "dashboard.html"; 
}

/**
 * Chaveador de seções visuais
 */
function alternarTelas(mostrarVerificacao) {
    if (mostrarVerificacao) {
        if (secaoCredenciais) secaoCredenciais.style.display = "none";
        if (secaoVerificacao) secaoVerificacao.style.display = "block";
    } else {
        if (secaoCredenciais) secaoCredenciais.style.display = "block";
        if (secaoVerificacao) secaoVerificacao.style.display = "none";
        if (inputCodigo) inputCodigo.value = "";
    }
}

/**
 * FUNÇÃO DE LOGOUT COMPLETA E EXPLICITA
 * Remove a sessão e redireciona o usuário de volta à tela de login/index
 */
function fazerLogout() {
    localStorage.removeItem("usuarioLogado");
    alert("Sessão encerrada com sucesso.");
    window.location.href = "index.html"; // ou o nome da sua página de login principal
}

// Expõe a função para ser chamada via HTML (ex: onclick="fazerLogout()")
window.fazerLogout = fazerLogout;
