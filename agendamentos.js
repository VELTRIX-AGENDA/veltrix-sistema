/**
 * VELTRIX - Sistema de Agendamento Inteligente
 * Módulo: Criação de Atendimentos & Agendamento Externo do Cliente
 */

const botaoSalvar = document.getElementById("btnSalvar");
const campoServico = document.getElementById("servico");
const tempoServico = document.getElementById("tempoServico");

const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

// Captura parâmetros da URL para identificar se é o Cliente final acessando
const urlParams = new URLSearchParams(window.location.search);
const ModoCliente = urlParams.get('view') === 'cliente';

// Inicialização da Interface baseada no tipo de usuário
configurarAmbientePorUsuario();
carregarServicos();
carregarBarbeiros();

// Listeners
campoServico.addEventListener("change", function () {
    const opcaoSelecionada = campoServico.options[campoServico.selectedIndex];
    const tempo = opcaoSelecionada.getAttribute("data-tempo");
    tempoServico.innerText = tempo ? `Tempo estimado: ${tempo} minutos` : "";
    gerarHorariosDisponiveis();
});

document.getElementById("data").addEventListener("change", gerarHorariosDisponiveis);

// Detecta se é o cliente ou o profissional e altera o comportamento visual do App
function configurarAmbientePorUsuario() {
    if (ModoCliente) {
        // Esconde os elementos de navegação interna e administração
        document.getElementById("menuInferiorNavegacao").style.display = "none";
        document.getElementById("btnVoltarHeader").style.display = "none";
        
        // Customiza textos para comunicação direta com o cliente final
        document.getElementById("subtituloHeader").innerText = "Reserve seu horário em menos de 1 minuto";
        document.getElementById("tituloHero").innerText = "Olá! Seja Bem-vindo(a)";
        document.getElementById("textoHero").innerText = "Escolha os detalhes abaixo para agendar seu atendimento de forma simples.";
        botaoSalvar.innerText = "Concluir e Agendar";
    }
}

botaoSalvar.addEventListener("click", function () {
    const nome = document.getElementById("nome").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const servico = document.getElementById("servico").value;
    const opcaoServico = campoServico.options[campoServico.selectedIndex];
    const tempo = opcaoServico ? opcaoServico.getAttribute("data-tempo") : null;
    const preco = opcaoServico ? opcaoServico.getAttribute("data-preco") : null;
    const barbeiro = document.getElementById("barbeiro").value;
    const data = document.getElementById("data").value;
    const horario = document.getElementById("horario").value;
    const observacao = document.getElementById("observacao").value.trim();

    if (!nome) return alert("Por favor, digite seu nome.");
    if (!telefone) return alert("Por favor, digite seu telefone/WhatsApp.");
    if (!servico) return alert("Selecione o serviço desejado.");
    if (!barbeiro) return alert("Escolha o profissional de sua preferência.");
    if (!data) return alert("Selecione o dia do atendimento.");
    if (!validarDataCompleta(data)) return alert("Selecione uma data válida.");
    if (!horario) return alert("Escolha um horário disponível.");

    const novoInicio = converterHorarioParaMinutos(horario);
    const novoFim = novoInicio + Number(tempo);

    // Validação de Férias
    const ferias = JSON.parse(localStorage.getItem("ferias")) || [];
    const estaDeFerias = ferias.some(item => {
        const nomeProf = item.profissional || item.barbeiro;
        return nomeProf === barbeiro && data >= item.dataInicial && data <= item.dataFinal;
    });
    if (estaDeFerias) return alert("Este profissional estará ausente ou de folga nesta data. Escolha outro profissional ou dia.");

    // Validação de Turno de Trabalho
    const disponibilidadeDoDia = obterDisponibilidadeDoDia(barbeiro, data);
    if (!disponibilidadeDoDia) return alert("Este profissional não atende no dia da semana selecionado.");

    // Validação de Intervalos Internos (Almoço)
    if (conflitaComIntervalo(novoInicio, novoFim, disponibilidadeDoDia)) {
        return alert("O horário escolhido coincide com o intervalo do profissional. Escolha outro horário.");
    }

    // Validação de Bloqueios Avulsos
    const bloqueios = JSON.parse(localStorage.getItem("bloqueios")) || [];
    const horarioBloqueado = bloqueios.some(bloqueio => {
        const nomeProf = bloqueio.profissional || bloqueio.barbeiro;
        if (nomeProf !== barbeiro || bloqueio.data !== data) return false;
        return novoInicio < converterHorarioParaMinutos(bloqueio.horaFinal) && novoFim > converterHorarioParaMinutos(bloqueio.horaInicial);
    });
    if (horarioBloqueado) return alert("Este horário não está disponível para agendamento.");

    // Algoritmo Matemática de Colisão
    const horarioOcupado = agendamentos.some(agendamento => {
        const nomeProf = agendamento.profissional || agendamento.barbeiro;
        if (nomeProf !== barbeiro || agendamento.data !== data) return false;
        if (agendamento.status === "Cancelado") return false;
        return novoInicio < (converterHorarioParaMinutos(agendamento.horario) + Number(agendamento.tempo)) && novoFim > converterHorarioParaMinutos(agendamento.horario);
    });
    if (horarioOcupado) return alert("Este horário acabou de ser preenchido. Por favor, selecione outro.");

    // Executa persistência de dados
    cadastrarClienteAutomaticamente(nome, telefone);

    agendamentos.push({
        nome,
        telefone,
        servico,
        tempo,
        preco,
        barbeiro,
        profissional: barbeiro,
        data,
        horario,
        observacao,
        status: "Agendado"
    });

    localStorage.setItem("agendamentos", JSON.stringify(agendamentos));

    // FLUXO DE SAÍDA CONFIGURADO POR USUÁRIO
    if (ModoCliente) {
        // Exibe tela/modal de confirmação limpa para o Cliente final
        document.getElementById("modalSucessoCliente").style.display = "flex";
        
        // Mensagem estruturada para enviar de volta ao WhatsApp da empresa/dono
        const msgWhats = `Olá! Acabei de realizar meu agendamento pelo aplicativo da VELTRIX. 🎉\n\n👤 Nome: ${nome}\n💼 Serviço: ${servico}\n📅 Data: ${VELTRIX_UTILS.formatarDataParaExibicao(data)}\n⏰ Horário: ${horario}\n👤 Profissional: ${barbeiro}`;
        
        setTimeout(() => {
            // Retorna o cliente para o WhatsApp com o texto pronto para envio
            window.location.href = `https://wa.me/${telefone}?text=${encodeURIComponent(msgWhats)}`;
        }, 3500);

    } else {
        alert("Agendamento criado com sucesso!");
        window.location.href = "agenda.html";
    }
});

function carregarBarbeiros() {
    const lista = document.getElementById("listaProfissionaisAgendamento");
    const campoBarbeiro = document.getElementById("barbeiro");
    const profissionais = JSON.parse(localStorage.getItem("colaboradores")) || JSON.parse(localStorage.getItem("barbeiros")) || [];

    lista.innerHTML = "";
    campoBarbeiro.value = "";

    if (profissionais.length === 0) {
        lista.innerHTML = `<div class="empty-state">Nenhum profissional disponível no momento.</div>`;
        return;
    }

    profissionais.forEach((prof, idx) => {
        const inicial = prof.nome.charAt(0).toUpperCase();
        const fotoHtml = prof.foto ? `<img src="${prof.foto}" class="profissional-card-foto">` : `<div class="profissional-card-avatar">${inicial}</div>`;
        lista.innerHTML += `
            <div class="profissional-quadrado profesional-opcao" onclick="selecionarProfissional('${prof.nome}')" id="profissional-${idx}">
                ${fotoHtml}
                <strong>${prof.nome}</strong>
            </div>
        `;
    });
}

function selecionarProfissional(nome) {
    document.getElementById("barbeiro").value = nome;
    document.querySelectorAll(".profissional-opcao").forEach(card => card.classList.remove("selecionado"));

    const profissionais = JSON.parse(localStorage.getItem("colaboradores")) || JSON.parse(localStorage.getItem("barbeiros")) || [];
    const indice = profissionais.findIndex(item => item.nome === nome);
    const cardAlvo = document.getElementById(`profissional-${indice}`);
    if (cardAlvo) cardAlvo.classList.add("selecionado");

    gerarHorariosDisponiveis();
}

function carregarServicos() {
    const servicos = JSON.parse(localStorage.getItem("servicos")) || [];
    campoServico.innerHTML = '<option value="">Selecione um serviço</option>';
    servicos.forEach(serv => {
        campoServico.innerHTML += `<option value="${serv.nome}" data-tempo="${serv.duracao}" data-preco="${serv.preco}">${serv.nome} - ${serv.duracao} min - ${VELTRIX_UTILS.formatarMoeda(serv.preco)}</option>`;
    });
}

function gerarHorariosDisponiveis() {
    const barbeiro = document.getElementById("barbeiro").value;
    const data = document.getElementById("data").value;
    const servico = document.getElementById("servico").value;
    const horarioSelect = document.getElementById("horario");

    horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';
    if (!barbeiro || !data || !servico || !validarDataCompleta(data)) return;

    const ferias = JSON.parse(localStorage.getItem("ferias")) || [];
    const estaDeFerias = ferias.some(item => (item.profissional || item.barbeiro) === barbeiro && data >= item.dataInicial && data <= item.dataFinal);
    if (estaDeFerias) { horarioSelect.innerHTML = '<option value="">Profissional em férias</option>'; return; }

    const disponibilidade = obterDisponibilidadeDoDia(barbeiro, data);
    if (!disponibilidade) { horarioSelect.innerHTML = '<option value="">Sem expediente cadastrado</option>'; return; }

    const tempo = Number(campoServico.options[campoServico.selectedIndex].getAttribute("data-tempo"));
    let inicio = converterHorarioParaMinutos(disponibilidade.entrada);
    const fim = converterHorarioParaMinutos(disponibilidade.saida);

    while (inicio + tempo <= fim) {
        const horarioFormatado = converterMinutosParaHorario(inicio);
        const inicioNovo = inicio;
        const fimNovo = inicioNovo + tempo;

        const dentroDoIntervalo = conflitaComIntervalo(inicioNovo, fimNovo, disponibilidade);
        const bloqueios = JSON.parse(localStorage.getItem("bloqueios")) || [];
        const bloqueado = bloqueios.some(bloqueio => (bloqueio.profissional || bloqueio.barbeiro) === barbeiro && bloqueio.data === data && inicioNovo < converterHorarioParaMinutos(bloqueio.horaFinal) && fimNovo > converterHorarioParaMinutos(bloqueio.horaInicial));
        const ocupado = agendamentos.some(agendamento => (agendamento.profissional || agendamento.barbeiro) === barbeiro && agendamento.data === data && agendamento.status !== "Cancelado" && inicioNovo < (converterHorarioParaMinutos(agendamento.horario) + Number(agendamento.tempo)) && fimNovo > converterHorarioParaMinutos(agendamento.horario));

        if (!ocupado && !bloqueado && !dentroDoIntervalo) {
            horarioSelect.innerHTML += `<option value="${horarioFormatado}">${horarioFormatado}</option>`;
        }
        inicio += 30;
    }
    if (horarioSelect.options.length === 1) horarioSelect.innerHTML = '<option value="">Sem horários livres</option>';
}

function obterDisponibilidadeDoDia(barbeiro, data) {
    const dataObj = new Date(data + "T00:00:00");
    const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const disponibilidades = JSON.parse(localStorage.getItem("disponibilidades")) || [];
    return disponibilidades.find(item => (item.profissional || item.barbeiro) === barbeiro && item.dia === dias[dataObj.getDay()]);
}

function conflitaComIntervalo(inicioNovo, fimNovo, disponibilidade) {
    if (!disponibilidade.inicioIntervalo || !disponibilidade.fimIntervalo) return false;
    return inicioNovo < converterHorarioParaMinutos(disponibilidade.fimIntervalo) && fimNovo > converterHorarioParaMinutos(disponibilidade.inicioIntervalo);
}

function validarDataCompleta(data) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
    const ano = Number(data.split("-")[0]);
    return ano >= 2024 && ano <= 2100;
}

function converterHorarioParaMinutos(horario) {
    const partes = horario.split(":");
    return Number(partes[0]) * 60 + Number(partes[1]);
}

function converterMinutosParaHorario(minutosTotais) {
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function cadastrarClienteAutomaticamente(nome, telefone) {
    const clientes = JSON.parse(localStorage.getItem("clientes")) || [];
    const clienteExistente = clientes.find(c => (telefone !== "" && c.telefone === telefone) || c.nome.trim().toLowerCase() === nome.trim().toLowerCase());

    if (clienteExistente) {
        clienteExistente.nome = nome;
        clienteExistente.telefone = telefone;
    } else {
        clientes.push({ nome, telefone, observacao: "Cadastrado automaticamente via link externo" });
    }
    localStorage.setItem("clientes", JSON.stringify(clientes));
}