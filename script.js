const botao = document.getElementById("btnEntrar");

criarUsuariosPadrao();

botao.addEventListener("click", function () {
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value.trim();

    if (email === "") {
        alert("Por favor, preencha o email.");
        return;
    }

    if (senha === "") {
        alert("Por favor, preencha a senha.");
        return;
    }

    const usuarios =
        JSON.parse(localStorage.getItem("usuarios")) || [];

    const usuario = usuarios.find(function (item) {
        return item.email === email && item.senha === senha;
    });

    if (!usuario) {
        alert("Email ou senha inválidos.");
        return;
    }

    localStorage.setItem(
        "usuarioLogado",
        JSON.stringify(usuario)
    );

    window.location.href = "dashboard.html";
});

function criarUsuariosPadrao() {
    const usuariosPadrao = [
        {
            nome: "Proprietário",
            email: "admin@veltrix.com",
            senha: "123456",
            perfil: "Proprietario"
        },
        {
            nome: "Proprietário",
            email: "admin@agendei.com",
            senha: "1234",
            perfil: "Proprietario"
        },
        {
            nome: "Gerente",
            email: "gerente@veltrix.com",
            senha: "123456",
            perfil: "Gerente"
        },
        {
            nome: "Profissional",
            email: "profissional@veltrix.com",
            senha: "123456",
            perfil: "Profissional"
        }
    ];

    localStorage.setItem(
        "usuarios",
        JSON.stringify(usuariosPadrao)
    );
}