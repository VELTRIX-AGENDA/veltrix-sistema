/**
 * VELTRIX - Sistema de Agendamento Inteligente
 * Módulo: WhatsApp Engine & Disparos de Retenção
 */

const agendamentos = JSON.parse(localStorage.getItem("agendamentos")) || [];
const diasRegraConfigurada = Number(localStorage.getItem("diasRecorrencia")) || 20;

// Inicializa a renderização das automações
processarPainelWhatsApp();

function processarPainelWhatsApp() {
    document.getElementById("textoExplicativoRegra").innerText = `Clientes cujo último atendimento finalizado foi há mais de ${diasRegraConfigurada} dias (conforme sua regra definida na Gestão).`;
    
    renderizarLembretesProximos();
    renderizarClientesSumidos();
}

// 1. GERENCIA E RENDERIZA OS LEMBRETES DE 1 HORA ANTES
function renderizarLembretesProximos() {
    const container = document.getElementById("listaLembretesHoje");
    container.innerHTML = "";
    
    const hoje = obterDataHojeFormatada();
    
    // Filtra agendamentos de hoje que não foram cancelados
    const agendamentosHoje = agendamentos.filter(item => item.data === hoje && item.status !== "Cancelado");
    
    document.getElementById("badgeHoje").innerText = agendamentosHoje.length;

    if (agendamentosHoje.length === 0) {
        container.innerHTML = `<div class="empty-state" style="text-align:center; color:#8a8a93; padding:15px;">Nenhum agendamento para hoje.</div>`;
        return;
    }

    agendamentosHoje.forEach(item => {
        // Texto customizado para o lembrete de 1 hora antes
        const msgLembrete = `Olá, ${item.nome}! Passando para lembrar do seu atendimento hoje às *${item.horario}* com o profissional *${item.barbeiro || item.profissional}* para o serviço de *${item.servico}*. 🗓️\n\nPodemos confirmar a sua presença?`;
        const linkWhats = `https://wa.me/${limparTelefone(item.telefone)}?text=${encodeURIComponent(msgLembrete)}`;

        container.innerHTML += `
            <div class="servico-ranking" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: #26262b; padding: 12px; border-radius: 8px;">
                <div>
                    <strong style="display:block; color:#fff;">⏰ ${item.horario} - ${item.nome}</strong>
                    <span style="font-size:12px; color:#8a8a93;">${item.servico} • ${item.barbeiro || item.profissional}</span>
                </div>
                <a href="${linkWhats}" target="_blank" class="primary-action" style="background-color: #3498db; margin: 0; padding: 6px 12px; font-size: 12px; width: auto; border-radius: 6px; text-decoration: none; text-align: center;">
                    Lembrar (1h)
                </a>
            </div>
        `;
    });
}

// 2. GERENCIA E RENDERIZA O RESGATE AUTOMÁTICO (EX: 20 DIAS)
function renderizarClientesSumidos() {
    const container = document.getElementById("listaClientesSumidos");
    container.innerHTML = "";

    const historicoPorCliente = {};

    // Agrupa e encontra o último atendimento de cada cliente
    agendamentos.forEach(item => {
        if (item.status !== "Finalizado") return;
        const chave = item.telefone || item.nome.trim().toLowerCase();
        
        if (!historicoPorCliente[chave]) {
            historicoPorCliente[chave] = {
                nome: item.nome,
                telefone: item.telefone,
                ultimaData: item.data,
                ultimoServico: item.servico
            };
        } else if (item.data > historicoPorCliente[chave].ultimaData) {
            historicoPorCliente[chave].ultimaData = item.data;
            historicoPorCliente[chave].ultimoServico = item.servico;
        }
    });

    const hojeStr = obterDataHojeFormatada();
    const dataHoje = new Date(hojeStr + "T00:00:00");
    let contagemSumidos = 0;

    Object.values(historicoPorCliente).forEach(cliente => {
        const dataUltimoAtendimento = new Date(cliente.ultimaData + "T00:00:00");
        const diferencaTempo = Math.abs(dataHoje - dataUltimoAtendimento);
        const diferencaDias = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24));

        // Se o cliente estourou os dias configurados pelo dono
        if (diferencaDias > diasRegraConfigurada) {
            contagemSumidos++;

            // Mensagem ultra personalizada de pós-venda / retenção ativa
            const msgRetorno = `Olá, ${cliente.nome}! Faz mais de ${diferencaDias} dias que você veio fazer sua última visita (*${cliente.ultimoServico}*). Sentimos sua falta! 🔥\n\nQue tal aproveitar para renovar o visual hoje? Escolha o melhor horário clicando no nosso link de agendamento online:`;
            const linkWhats = `https://wa.me/${limparTelefone(cliente.telefone)}?text=${encodeURIComponent(msgRetorno)}`;

            container.innerHTML += `
                <div class="servico-ranking" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; background: #26262b; padding: 12px; border-radius: 8px;">
                    <div>
                        <strong style="display:block; color:#fff;">👤 ${cliente.nome}</strong>
                        <span style="font-size:12px; color:#e74c3c;">Sumido(a) há ${diferencaDias} dias</span>
                    </div>
                    <a href="${linkWhats}" target="_blank" class="primary-action" style="background-color: #2cc185; margin: 0; padding: 6px 12px; font-size: 12px; width: auto; border-radius: 6px; text-decoration: none; text-align: center;">
                        Chamar de Volta
                    </a>
                </div>
            `;
        }
    });

    document.getElementById("badgeSumidos").innerText = contagemSumidos;

    if (contagemSumidos === 0) {
        container.innerHTML = `<div class="empty-state" style="text-align:center; color:#8a8a93; padding:15px;">Parabéns! Nenhum cliente sumido da carteira.</div>`;
    }
}

// FUNÇÕES AUXILIARES DE SUPORTE
function obterDataHojeFormatada() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function limparTelefone(telefone) {
    // Remove parênteses, traços, espaços e deixa apenas os números para a API do WhatsApp
    return String(telefone).replace(/\D/g, "");
}