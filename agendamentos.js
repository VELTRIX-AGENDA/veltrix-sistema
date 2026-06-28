/**
 * VELTRIX - Sistema de Agendamento Inteligente
 * Módulo: Criação de Atendimentos & Agendamento Externo do Cliente na Nuvem
 */

const botaoSalvar = document.getElementById("btnSalvar");
const campoServico = document.getElementById("servico");
const tempoServico = document.getElementById("tempoServico");

// Captura a sessão do estabelecimento logado para isolamento Multi-Tenant
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
const tenantID = usuarioLogado.empresa || "Geral";

// Captura parâmetros da URL para identificar se é o Cliente final acessando
const urlParams = new URLSearchParams(window.location.search);
const ModoCliente = urlParams.get('view') === 'cliente';

let agendamentosNuvem = [];

// Inicialização da Interface
configurarAmbientePorUsuario();
configurarTravaCalendario();
carregarServicosNuvem();
carregarBarbeirosNuvem();
escutarAgendamentosDoDia();

// Listeners
if (campoServico) {
    campoServico.addEventListener("change", function () {
        const opcaoSelecionada = campoServico.options[campoServico.selectedIndex];
        const tempo = opcaoSelecionada ? opcaoSelecionada.getAttribute("data-tempo") : null;
        tempoServico.innerText = tempo ? `Tempo estimado: ${tempo} minutos` : "";
        gerarHorariosDisponiveis();
    });
}

const campoDataInput = document.getElementById("data");
if (campoDataInput) campoDataInput.addEventListener("change", gerarHorariosDisponiveis);

const campoBarbeiroInput = document.getElementById("barbeiro");
if (campoBarbeiroInput) campoBarbeiroInput.addEventListener("change", gerarHorariosDisponiveis);

/**
 * 🔒 TRAVA 1: Impede a escolha de qualquer data anterior a hoje no calendário
 */
function configurarTravaCalendario() {
    const campoData = document.getElementById("data");
    if (campoData && typeof VELTRIX_UTILS !== 'undefined') {
        const hoje = VELTRIX_UTILS.formatarDataParaInput(new Date());
        campoData.min = hoje; // Desabilita dias passados visualmente
    }
}

function configurarAmbientePorUsuario() {
    if (ModoCliente) {
        const menuInf = document.getElementById("menuInferiorNavegacao");
        const btnVoltar = document.getElementById("btnVoltarHeader");
        if (menuInf) menuInf.style.display = "none";
        if (btnVoltar) btnVoltar.style.display = "none";
        
        const subtituloHeader = document.getElementById("subtituloHeader");
        const tituloHero = document.getElementById("tituloHero");
        const textoHero = document.getElementById("textoHero");
        
        if (subtituloHeader) subtituloHeader.innerText = "Reserve seu horário em menos de 1 minuto";
        if (tituloHero) tituloHero.innerText = "Olá! Seja Bem-vindo(a)";
        if (textoHero) textoHero.innerText = "Escolha os detalhes abaixo para agendar seu atendimento de forma simples.";
        if (botaoSalvar) botaoSalvar.innerText = "Concluir e Agendar";
    }
}

/**
 * ⏳ ESCUTA EM TEMPO REAL: Baixa os agendamentos da nuvem para evitar colisões
 */
function escutarAgendamentosDoDia() {
    db.collection("veltrix_agendamentos")
        .where("tenantID", "==", tenantID)
        .onSnapshot(snapshot => {
            agendamentosNuvem = [];
            snapshot.forEach(doc => {
                agendamentosNuvem.push(doc.data());
            });
            gerarHorariosDisponiveis(); // Recalcula a grade quando houver novos agendamentos
        }, erro => {
            console.log("Aguardando inicialização das tabelas: ", erro.message);
        });
}

/**
 * 🚀 SALVAMENTO NA NUVEM COM VERIFICAÇÃO DE SEGURANÇA SEVERA
 */
if (botaoSalvar) {
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

        // 🔒 TRAVA BACKEND-CLIENT: Impede o agendamento se o horário/data inserido for menor que o momento do clique
        const agora = new Date();
        const dataHojeStr = VELTRIX_UTILS.formatarDataParaInput(agora);
        const horaAtualMinutos = (agora.getHours() * 60) + agora.getMinutes();
        const novoInicio = converterHorarioParaMinutos(horario);
        const novoFim = novoInicio + Number(tempo);

        if (data < dataHojeStr) {
            return alert("Não é possível realizar agendamentos em datas passadas.");
        }
        if (data === dataHojeStr && novoInicio < horaAtualMinutos) {
            return alert("Esse horário já passou. Escolha um horário futuro.");
        }

        // Validações de Escopo (Férias, Turno, Intervalo) obtidas da Nuvem/LocalStorage de apoio
        const ferias = JSON.parse(localStorage.getItem("ferias")) || [];
        const estaDeFerias = ferias.some(item => (item.profissional || item.barbeiro) === barbeiro && data >= item.dataInicial && data <= item.dataFinal);
        if (estaDeFerias) return alert("Este profissional está ausente nesta data.");

        const disponibilidadeDoDia = obterDisponibilidadeDoDia(barbeiro, data);
        if (!disponibilidadeDoDia) return alert("Este profissional não atende neste dia.");

        if (conflitaComIntervalo(novoInicio, novoFim, disponibilidadeDoDia)) return alert("Horário coincide com o intervalo do profissional.");

        // Algoritmo de Colisão Inteligente na Nuvem
        const horarioOcupado = agendamentosNuvem.some(agendamento => {
            const nomeProf = agendamento.profissional || agendamento.barbeiro;
            if (nomeProf !== barbeiro || agendamento.data !== data) return false;
            if (agendamento.status === "Cancelado") return false;
            return novoInicio < (converterHorarioParaMinutos(agendamento.horario) + Number(agendamento.tempo)) && novoFim > converterHorarioParaMinutos(agendamento.horario);
        });
        if (horarioOcupado) return alert("Este horário acabou de ser preenchido por outro cliente.");

        botaoSalvar.disabled = true;
        botaoSalvar.innerText = "Agendando...";

        // GRAVAÇÃO DA RESERVA NO CLOUD FIRESTORE
        db.collection("veltrix_agendamentos").add({
            tenantID: tenantID,
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
            status: "Agendado",
            criadoEm: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            cadastrarClienteAutomaticamente(nome, telefone);

            if (ModoCliente) {
                document.getElementById("modalSucessoCliente").style.display = "flex";
                const msgWhats = `Olá! Acabei de realizar meu agendamento pelo aplicativo da VELTRIX. 🎉\n\n👤 Nome: ${nome}\n💼 Serviço: ${servico}\n📅 Data: ${VELTRIX_UTILS.formatarDataParaExibicao(data)}\n⏰ Horário: ${horario}\n👤 Profissional: ${barbeiro}`;
                setTimeout(() => {
                    window.location.href = `https://wa.me/${telefone}?text=${encodeURIComponent(msgWhats)}`;
                }, 3500);
            } else {
                alert("Agendamento created com sucesso!");
                window.location.href = "agenda.html";
            }
        })
        .catch(erro => {
            alert("Erro ao processar agendamento: " + erro.message);
            botaoSalvar.disabled = false;
            botaoSalvar.innerText = ModoCliente ? "Concluir e Agendar" : "Confirmar Agendamento";
        });
    });
}

/**
 * 🎨 CARREGAMENTO DINÂMICO DOS PROFISSIONAIS (FIRESTORE)
 */
function carregarBarbeirosNuvem() {
    const lista = document.getElementById("listaProfissionaisAgendamento");
    const campoBarbeiro = document.getElementById("barbeiro");

    db.collection("veltrix_barbeiros").where("tenantID", "==", tenantID).get()
        .then(snapshot => {
            if (lista) lista.innerHTML = "";
            if (campoBarbeiro && campoBarbeiro.tagName === "SELECT") campoBarbeiro.innerHTML = '<option value="">Selecione o profissional</option>';

            snapshot.forEach((doc) => {
                const prof = doc.data();
                if (campoBarbeiro && campoBarbeiro.tagName === "SELECT") {
                    campoBarbeiro.innerHTML += `<option value="${prof.nome}">${prof.nome}</option>`;
                }
                if (lista) {
                    const inicial = prof.nome.charAt(0).toUpperCase();
                    const fotoHtml = prof.foto ? `<img src="${prof.foto}" class="profissional-card-foto">` : `<div class="profissional-card-avatar">${inicial}</div>`;
                    
                    lista.innerHTML += `
                        <div class="profissional-quadrado profesional-opcao" onclick="selecionarProfissional('${prof.nome}', this)">
                            ${fotoHtml}
                            <strong>${prof.nome}</strong>
                        </div>
                    `;
                }
            });
        }).catch(err => console.log("Aguardando documentos de profissionais...", err.message));
}

/**
 * 🎯 SELEÇÃO DE PROFISSIONAL COM FEEDBACK VISUAL CORRIGIDO
 */
function selecionarProfissional(nome, elementoClicado) {
    const inputBarbeiro = document.getElementById("barbeiro");
    if (!inputBarbeiro) return;
    
    inputBarbeiro.value = nome;
    
    // Remove a classe visual 'selecionado' de todos os cards da listagem
    document.querySelectorAll(".profesional-opcao").forEach(card => {
        card.classList.remove("selecionado");
    });
    
    // Aplica a classe de destaque diretamente no card que recebeu o clique do usuário
    if (elementoClicado) {
        elementoClicado.classList.add("selecionado");
    }
    
    // Dispara a atualização visual dos horários
    gerarHorariosDisponiveis();
}

function carregarServicosNuvem() {
    db.collection("veltrix_servicos").where("tenantID", "==", tenantID).get()
        .then(snapshot => {
            if (!campoServico) return;
            campoServico.innerHTML = '<option value="">Selecione um serviço</option>';
            snapshot.forEach(doc => {
                const serv = doc.data();
                campoServico.innerHTML += `<option value="${serv.nome}" data-tempo="${serv.duracao}" data-preco="${serv.preco}">${serv.nome} - ${serv.duracao} min - ${VELTRIX_UTILS.formatarMoeda(serv.preco)}</option>`;
            });
        }).catch(err => console.log("Aguardando documentos de serviços...", err.message));
}

/**
 * 🔒 TRAVA 2: Remove horários passados dinamicamente no dia corrente
 */
function gerarHorariosDisponiveis() {
    const barbeiroSelect = document.getElementById("barbeiro");
    const dataSelect = document.getElementById("data");
    
    if (!barbeiroSelect || !dataSelect || !campoServico) return;
    
    const barbeiro = barbeiroSelect.value;
    const data = dataSelect.value;
    const servico = campoServico.value;
    const horarioSelect = document.getElementById("horario");

    if (!horarioSelect) return;
    horarioSelect.innerHTML = '<option value="">Selecione um horário</option>';
    if (!barbeiro || !data || !servico || !validarDataCompleta(data)) return;

    // Métricas do Agora
    const agora = new Date();
    const dataHojeStr = VELTRIX_UTILS.formatarDataParaInput(agora);
    const horaAtualMinutos = (agora.getHours() * 60) + agora.getMinutes();

    const disponibilidade = obterDisponibilidadeDoDia(barbeiro, data);
    if (!disponibilidade) { horarioSelect.innerHTML = '<option value="">Sem expediente cadastrado</option>'; return; }

    const opcaoSelecionada = campoServico.options[campoServico.selectedIndex];
    if (!opcaoSelecionada) return;
    const tempo = Number(opcaoSelecionada.getAttribute("data-tempo"));
    let inicio = converterHorarioParaMinutos(disponibilidade.entrada);
    const fim = converterHorarioParaMinutos(disponibilidade.saida);

    while (inicio + tempo <= fim) {
        const horarioFormatado = converterMinutosParaHorario(inicio);
        const inicioNovo = inicio;
        const fimNovo = inicioNovo + tempo;

        // 🛑 TRAVA EM TEMPO REAL: Se for o dia de hoje, ignora qualquer slot que já passou
        if (data === dataHojeStr && inicioNovo < horaAtualMinutos) {
            inicio += 30;
            continue; 
        }

        const dentroDoIntervalo = conflitaComIntervalo(inicioNovo, fimNovo, disponibilidade);
        const bloqueios = JSON.parse(localStorage.getItem("bloqueios")) || [];
        const bloqueado = bloqueios.some(bloqueio => (bloqueio.profissional || bloqueio.barbeiro) === barbeiro && bloqueio.data === data && inicioNovo < converterHorarioParaMinutos(bloqueio.horaFinal) && fimNovo > converterHorarioParaMinutos(bloqueio.horaInicial));
        const ocupado = agendamentosNuvem.some(agendamento => (agendamento.profissional || agendamento.barbeiro) === barbeiro && agendamento.data === data && agendamento.status !== "Cancelado" && inicioNovo < (converterHorarioParaMinutos(agendamento.horario) + Number(agendamento.tempo)) && fimNovo > converterHorarioParaMinutos(agendamento.horario));

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
    const minutos = minutosTotais % 60; // CORRIGIDO: Removida atribuição fantasma que quebrava o script
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
