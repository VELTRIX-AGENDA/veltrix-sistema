/**
 * VELTRIX - Sistema de Agendamento Inteligente
 * Módulo: Painel Operacional da Agenda Geral (agenda.js)
 */

let agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];

// Sanitização profissional da base de dados local
agendamentos = agendamentos.filter(item => {
    if (!item.data) return false;
    const ano = Number(item.data.split("-")[0]);
    return ano >= 2024 && ano <= 2100;
});
localStorage.setItem("agendamentos", JSON.stringify(agendamentos));

// Seletores do DOM
const listaAgenda = document.getElementById("listaAgenda");
const filtroProfissional = document.getElementById("filtroProfissional");
const filtroStatus = document.getElementById("filtroStatus");

let listaFiltrada = [...agendamentos];
let indiceEditando = null;

// Inicialização Core
carregarProfissionais();
carregarCamposEdicao();
filtroHoje();

// Event Listeners
if (filtroProfissional) filtroProfissional.addEventListener("change", aplicarFiltros);
if (filtroStatus) filtroStatus.addEventListener("change", aplicarFiltros);

const editServico = document.getElementById("editServico");
const editProfissional = document.getElementById("editProfissional");
const editData = document.getElementById("editData");

if (editServico) editServico.addEventListener("change", () => gerarHorariosEdicao());
if (editProfissional) editProfissional.addEventListener("change", () => gerarHorariosEdicao());
if (editData) editData.addEventListener("change", () => gerarHorariosEdicao());

function carregarProfissionais() {
    if (!filtroProfissional) return;
    const profissionais = JSON.parse(localStorage.getItem("colaboradores")) || 
                          JSON.parse(localStorage.getItem("barbeiros")) || [];

    profissionais.forEach(prof => {
        filtroProfissional.innerHTML += `
            <option value="${prof.nome}">${prof.nome}</option>
        `;
    });
}

function carregarCamposEdicao() {
    const servicos = JSON.parse(localStorage.getItem("servicos")) || [];
    const profissionais = JSON.parse(localStorage.getItem("colaboradores")) || 
                          JSON.parse(localStorage.getItem("barbeiros")) || [];

    const editServicoField = document.getElementById("editServico");
    const editProfissionalField = document.getElementById("editProfissional");

    if (editServicoField) editServicoField.innerHTML = '<option value="">Selecione um serviço</option>';
    if (editProfissionalField) editProfissionalField.innerHTML = '<option value="">Selecione um profissional</option>';

    servicos.forEach(serv => {
        if (editServicoField) {
            editServicoField.innerHTML += `
                <option value="${serv.nome}" data-tempo="${serv.duracao}" data-preco="${serv.preco}">
                    ${serv.nome} - ${serv.duracao} min - ${VELTRIX_UTILS.formatarMoeda(serv.preco)}
                </option>
            `;
        }
    });

    profissionais.forEach(prof => {
        if (editProfissionalField) {
            editProfissionalField.innerHTML += `
                <option value="${prof.nome}">${prof.nome}</option>
            `;
        }
    });
}

function filtroTodos() {
    listaFiltrada = [...agendamentos];
    aplicarFiltros();
}

function filtroHoje() {
    const hoje = VELTRIX_UTILS.formatarDataParaInput(new Date());
    listaFiltrada = agendamentos.filter(item => item.data === hoje);
    aplicarFiltros();
}

function filtroAmanha() {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataStr = VELTRIX_UTILS.formatarDataParaInput(amanha);

    listaFiltrada = agendamentos.filter(item => item.data === dataStr);
    aplicarFiltros();
}

function filtroSemana() {
    const hojeStr = VELTRIX_UTILS.formatarDataParaInput(new Date());
    const finalSemana = new Date();
    finalSemana.setDate(finalSemana.getDate() + 7);
    const fimStr = VELTRIX_UTILS.formatarDataParaInput(finalSemana);

    listaFiltrada = agendamentos.filter(item => item.data >= hojeStr && item.data <= fimStr);
    aplicarFiltros();
}

function aplicarFiltros() {
    let resultado = [...listaFiltrada];
    const profissionalSelecionado = filtroProfissional ? filtroProfissional.value : "";
    const status = filtroStatus ? filtroStatus.value : "todos";

    if (profissionalSelecionado !== "") {
        resultado = resultado.filter(item => item.barbeiro === profissionalSelecionado || item.profissional === profissionalSelecionado);
    }

    if (status === "ativos") {
        resultado = resultado.filter(item => item.status === "Agendado" || item.status === "Em Atendimento");
    } else if (status !== "todos") {
        resultado = resultado.filter(item => item.status === status);
    }

    atualizarResumoAgenda(resultado);
    renderizarAgenda(resultado);
}

function atualizarResumoAgenda(lista) {
    const ativos = lista.filter(item => item.status === "Agendado" || item.status === "Em Atendimento");
    const finalizados = lista.filter(item => item.status === "Finalizado");
    const cancelados = lista.filter(item => item.status === "Cancelado");

    const totalEl = document.getElementById("agendaTotal");
    const ativosEl = document.getElementById("agendaAtivos");
    const finalizadosEl = document.getElementById("agendaFinalizados");
    const canceladosEl = document.getElementById("agendaCancelados");

    if (totalEl) totalEl.innerText = lista.length;
    if (ativosEl) ativosEl.innerText = ativos.length;
    if (finalizadosEl) finalizadosEl.innerText = finalizados.length;
    if (canceladosEl) canceladosEl.innerText = cancelados.length;
}

function renderizarAgenda(lista) {
    if (!listaAgenda) return;
    listaAgenda.innerHTML = "";

    if (lista.length === 0) {
        listaAgenda.innerHTML = `<div class="empty-state">Nenhum agendamento encontrado.</div>`;
        return;
    }

    const grupos = {};
    lista.forEach(item => {
        if (!grupos[item.data]) grupos[item.data] = [];
        grupos[item.data].push(item);
    });

    const datasOrdenadas = Object.keys(grupos).sort();

    datasOrdenadas.forEach(data => {
        listaAgenda.innerHTML += `
            <div class="agenda-dia">
                ${obterNomeDia(data)} • ${VELTRIX_UTILS.formatarDataParaExibicao(data)}
            </div>
        `;

        grupos[data].sort((a, b) => a.horario.localeCompare(b.horario));

        grupos[data].forEach(agendamento => {
            const indiceOriginal = agendamentos.indexOf(agendamento);
            const status = agendamento.status || "Agendado";
            const podeAlterar = status === "Agendado" || status === "Em Atendimento";
            const nomePrestador = agendamento.profissional || agendamento.barbeiro;

            listaAgenda.innerHTML += `
                <div class="agenda-card" onclick="${podeAlterar ? `alternarAcoesAgenda(${indiceOriginal})` : ""}">
                    <div class="agenda-card-topo">
                        <div>
                            <strong>${agendamento.horario}</strong>
                            <span>${agendamento.nome}</span>
                        </div>
                        <small class="${classeStatus(status)}">${status}</small>
                    </div>
                    <div class="agenda-card-info">
                        <span>Profissional: ${nomePrestador}</span>
                        <span>Serviço: ${agendamento.servico}</span>
                        <span>Telefone: ${agendamento.telefone || "Não informado"}</span>
                    </div>
                    ${podeAlterar ? `
                        <div class="acoes-atendimento" id="acoes-agenda-${indiceOriginal}">
                            <button onclick="alterarStatusAgenda(event, ${indiceOriginal}, 'Em Atendimento')">Iniciar Atendimento</button>
                            <button onclick="alterarStatusAgenda(event, ${indiceOriginal}, 'Finalizado')">Finalizar</button>
                            <button onclick="alterarStatusAgenda(event, ${indiceOriginal}, 'Cancelado')">Cancelar</button>
                            <button onclick="abrirEdicaoAgendamento(event, ${indiceOriginal})">Editar</button>
                            <button onclick="enviarWhatsApp(event, ${indiceOriginal})">WhatsApp</button>
                        </div>
                    ` : `<div class="status-fechado">Atendimento encerrado</div>`}
                </div>
            `;
        });
    });
}

function abrirEdicaoAgendamento(event, posicao) {
    event.stopPropagation();
    const agendamento = agendamentos[posicao];
    indiceEditando = posicao;

    document.getElementById("editNome").value = agendamento.nome;
    document.getElementById("editTelefone").value = agendamento.telefone;
    document.getElementById("editServico").value = agendamento.servico;
    document.getElementById("editProfissional").value = agendamento.profissional || agendamento.barbeiro;
    document.getElementById("editData").value = agendamento.data;
    document.getElementById("editObservacao").value = agendamento.observacao || "";

    const box = document.getElementById("boxEditarAgendamento");
    if (box) box.style.display = "flex";
    gerarHorariosEdicao(agendamento.horario);

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function salvarEdicaoAgendamento() {
    if (indiceEditando === null) return;

    const nome = document.getElementById("editNome").value.trim();
    const telefone = document.getElementById("editTelefone").value.trim();
    const servico = document.getElementById("editServico").value;
    const profissional = document.getElementById("editProfissional").value;
    const data = document.getElementById("editData").value;
    const horario = document.getElementById("editHorario").value;
    const observacao = document.getElementById("editObservacao").value.trim();

    const campoServico = document.getElementById("editServico");
    const opcaoServico = campoServico.options[campoServico.selectedIndex];
    const tempo = opcaoServico.getAttribute("data-tempo");
    const preco = opcaoServico.getAttribute("data-preco");

    if (!nome || !telefone || !servico || !profissional || !data || !horario) {
        alert("Preencha todos os campos obrigatórios.");
        return;
    }

    agendamentos[indiceEditando].nome = nome;
    agendamentos[indiceEditando].telefone = telefone;
    agendamentos[indiceEditando].servico = servico;
    agendamentos[indiceEditando].barbeiro = profissional;
    agendamentos[indiceEditando].profissional = profissional;
    agendamentos[indiceEditando].data = data;
    agendamentos[indiceEditando].horario = horario;
    agendamentos[indiceEditando].observacao = observacao;
    agendamentos[indiceEditando].tempo = tempo;
    agendamentos[indiceEditando].preco = preco;

    localStorage.setItem("agendamentos", JSON.stringify(agendamentos));

    cancelarEdicaoAgendamento();
    atualizarBaseFiltroAtual();
    aplicarFiltros();
}

function cancelarEdicaoAgendamento() {
    indiceEditando = null;
    const box = document.getElementById("boxEditarAgendamento");
    if (box) box.style.display = "none";
}

function gerarHorariosEdicao(horarioAtual = "") {
    const editProf = document.getElementById("editProfissional");
    const editDt = document.getElementById("editData");
    const editSrv = document.getElementById("editServico");
    const horarioSelect = document.getElementById("editHorario");

    if (!horarioSelect) return;
    horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';

    if (!editProf || !editDt || !editSrv) return;
    const profesional = editProf.value;
    const data = editDt.value;
    const servico = editSrv.value;

    if (!profesional || !data || !servico) return;

    const disponibilidade = obterDisponibilidadeDoDia(profesional, data);
    if (!disponibilidade) {
        horarioSelect.innerHTML = '<option value="">Sem horários disponíveis</option>';
        return;
    }

    const opcaoServico = editSrv.options[editSrv.selectedIndex];
    const tempo = Number(opcaoServico.getAttribute("data-tempo"));

    let inicio = converterHorarioParaMinutos(disponibilidade.entrada);
    const fim = converterHorarioParaMinutos(disponibilidade.saida);

    while (inicio + tempo <= fim) {
        const horarioFormatado = converterMinutosParaHorario(inicio);
        const inicioNovo = inicio;
        const fimNovo = inicioNovo + tempo;

        const dentroIntervalo = conflitaComIntervalo(inicioNovo, fimNovo, disponibilidade);

        const ocupado = agendamentos.some((item, index) => {
            if (index === indiceEditando) return false;
            const nomeProf = item.profissional || item.barbeiro;
            if (nomeProf !== profesional || item.data !== data) return false;

            const inicioAgendamento = converterHorarioParaMinutos(item.horario);
            const fimAgendamento = inicioAgendamento + Number(item.tempo);

            return inicioNovo < fimAgendamento && fimNovo > inicioAgendamento;
        });

        const bloqueado = estaBloqueado(profesional, data, inicioNovo, fimNovo);

        if (!ocupado && !bloqueado && !dentroIntervalo) {
            horarioSelect.innerHTML += `<option value="${horarioFormatado}">${horarioFormatado}</option>`;
        }
        inicio += 30;
    }

    if (horarioAtual !== "") {
        horarioSelect.innerHTML += `<option value="${horarioAtual}">${horarioAtual} atual</option>`;
        horarioSelect.value = horarioAtual;
    }

    if (horarioSelect.options.length === 1) {
        horarioSelect.innerHTML = '<option value="">Sem horários disponíveis</option>';
    }
}

function atualizarBaseFiltroAtual() {
    listaFiltrada = [...agendamentos];
}

function obterDisponibilidadeDoDia(profissional, data) {
    const diaSemana = obterDiaSemana(data);
    const disponibilidades = JSON.parse(localStorage.getItem("disponibilidades")) || [];

    return disponibilidades.find(item => {
        const nomeProf = item.profissional || item.barbeiro;
        return nomeProf === profesional && item.dia === diaSemana;
    });
}

function estaBloqueado(profissional, data, inicioNovo, fimNovo) {
    const bloqueios = JSON.parse(localStorage.getItem("bloqueios")) || [];

    return bloqueios.some(bloqueio => {
        const nomeProf = bloqueio.profissional || bloqueio.barbeiro;
        if (nomeProf !== profissional || bloqueio.data !== data) return false;

        const inicioBloqueio = converterHorarioParaMinutos(bloqueio.horaInicial);
        const fimBloqueio = converterHorarioParaMinutos(bloqueio.horaFinal);

        return inicioNovo < fimBloqueio && fimNovo > inicioBloqueio;
    });
}

function conflitaComIntervalo(inicioNovo, fimNovo, disponibilidade) {
    if (!disponibilidade.inicioIntervalo || !disponibilidade.fimIntervalo) return false;

    const inicioIntervalo = converterHorarioParaMinutos(disponibilidade.inicioIntervalo);
    const fimIntervalo = converterHorarioParaMinutos(disponibilidade.fimIntervalo);

    return inicioNovo < fimIntervalo && fimNovo > inicioIntervalo;
}

function alternarAcoesAgenda(posicao) {
    const caixa = document.getElementById("acoes-agenda-" + posicao);
    if (caixa) caixa.classList.toggle("mostrar");
}

function alterarStatusAgenda(event, posicao, novoStatus) {
    event.stopPropagation();
    agendamentos[posicao].status = novoStatus;
    localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
    aplicarFiltros();
}

function classeStatus(status) {
    if (status === "Agendado") return "status-badge status-agendado";
    if (status === "Em Atendimento") return "status-badge status-atendimento";
    if (status === "Finalizado") return "status-badge status-finalizado";
    if (status === "Cancelado") return "status-badge status-cancelado";
    return "status-badge";
}

function obterNomeDia(data) {
    const dataObj = new Date(data + "T00:00:00");
    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    return dias[dataObj.getDay()];
}

function obterDiaSemana(data) {
    const dataObj = new Date(data + "T00:00:00");
    const dias = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return dias[dataObj.getDay()];
}

function converterHorarioParaMinutos(horario) {
    const partes = horario.split(":");
    return Number(partes[0]) * 60 + Number(partes[1]);
}

function converterMinutosParaHorario(minutosTotais) {
    const horas = Math.floor(minutosTotais / 60);
    const minutos = minutosTotais % 60;
    return String(horas).padStart(2, "0") + ":" + String(minutos).padStart(2, "0");
}

function enviarWhatsApp(event, posicao) {
    event.stopPropagation();
    const agendamento = agendamentos[posicao];

    if (!agendamento.telefone) {
        alert("Cliente sem telefone cadastrado.");
        return;
    }

    let telefone = agendamento.telefone.replace(/\D/g, "");
    if (!telefone.startsWith("55")) telefone = "55" + telefone;

    const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
    const dadosEmpresa = JSON.parse(localStorage.getItem("dadosEmpresa")) || {};
    
    let nomeEmpresa = usuarioLogado.nomeEmpresa || 
                      usuarioLogado.empresa || 
                      dadosEmpresa.nome || 
                      dadosEmpresa.nomeFantasia;

    if (!nomeEmpresa) {
        const elementoTitulo = document.querySelector("h1") || document.querySelector(".dashboard-header h1") || document.querySelector(".logo-text");
        if (elementoTitulo && elementoTitulo.innerText.trim() !== "") {
            nomeEmpresa = elementoTitulo.innerText.trim();
        } else {
            nomeEmpresa = "Nosso Estabelecimento";
        }
    }

    const mensagem = `Olá ${agendamento.nome}.\n\n` +
                     `Seu atendimento está confirmado! ✅\n\n` +
                     `📅 Data: ${VELTRIX_UTILS.formatarDataParaExibicao(agendamento.data)}\n` +
                     `⏰ Horário: ${agendamento.horario}\n` +
                     `✂️ Serviço: ${agendamento.servico}\n` +
                     `💈 Profissional: ${agendamento.profissional || agendamento.barbeiro}\n\n` +
                     `Obrigado por escolher a ${nomeEmpresa}.`;

    const url = "https://api.whatsapp.com/send?phone=" + telefone + "&text=" + encodeURIComponent(mensagem);
    window.open(url, "_blank");
}
