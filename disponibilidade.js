/**
 * VELTRIX - Sistema de Agendamento Inteligente
 * Módulo: Regras de Disponibilidade e Turnos da Equipe
 */

// Inicialização dos dados vindos do LocalStorage
let disponibilidades = JSON.parse(localStorage.getItem("disponibilidades")) || [];
const barbeiros = JSON.parse(localStorage.getItem("barbeiros")) || [];

// Captura de Elementos do DOM
const selectBarbeiro = document.getElementById("barbeiroDisponibilidade");
const checkboxesDias = document.querySelectorAll(".dia");
const inputEntrada = document.getElementById("entrada");
const inputSaida = document.getElementById("saida");
const inputInicioIntervalo = document.getElementById("inicioIntervalo");
const inputFimIntervalo = document.getElementById("fimIntervalo");
const btnSalvar = document.getElementById("btnSalvarDisponibilidade");
const containerLista = document.getElementById("listaDisponibilidades");

// Inicializa a Tela
carregarSelectProfissionais();
renderizarDisponibilidades();

btnSalvar.addEventListener("click", salvarDisponibilidade);

/**
 * Preenche o elemento Select com os profissionais cadastrados no sistema
 */
function carregarSelectProfissionais() {
    selectBarbeiro.innerHTML = '<option value="">Selecione um Profissional</option>';
    
    // Ordena os profissionais por nome para exibição limpa
    const ordenados = [...barbeiros].sort((a, b) => a.nome.localeCompare(b.nome));
    
    ordenados.forEach(prof => {
        const option = document.createElement("option");
        option.value = prof.nome; // Mantém compatibilidade com a chave de busca por string do seu barbeiro.js
        option.textContent = prof.nome;
        selectBarbeiro.appendChild(option);
    });
}

/**
 * Coleta os dados do formulário, valida consistência de horários e salva as regras
 */
function salvarDisponibilidade() {
    const profissional = selectBarbeiro.value;
    const entrada = inputEntrada.value;
    const saida = inputSaida.value;
    const inicioIntervalo = inputInicioIntervalo.value;
    const fimIntervalo = inputFimIntervalo.value;

    // Captura apenas os dias da semana que foram marcados
    const diasSelecionados = [];
    checkboxesDias.forEach(cb => {
        if (cb.checked) diasSelecionados.push(cb.value);
    });

    // --- VALIDAÇÕES DE SEGURANÇA ---
    if (!profissional) {
        alert("Por favor, selecione um profissional.");
        return;
    }
    if (diasSelecionados.length === 0) {
        alert("Selecione ao menos um dia da semana.");
        return;
    }
    if (!entrada || !saida) {
        alert("Os horários de Entrada e Saída são obrigatórios.");
        return;
    }
    if (entrada >= saida) {
        alert("O horário de início do turno não pode ser maior ou igual ao término.");
        return;
    }
    if ((inicioIntervalo && !fimIntervalo) || (!inicioIntervalo && fimIntervalo)) {
        alert("Para configurar um intervalo de almoço/descanso, preencha os dois campos de horário.");
        return;
    }
    if (inicioIntervalo && fimIntervalo) {
        if (inicioIntervalo >= fimIntervalo) {
            alert("O início do intervalo deve ser menor que o fim do intervalo.");
            return;
        }
        if (inicioIntervalo <= entrada || fimIntervalo >= saida) {
            alert("O intervalo precisa estar dentro do período de turno de trabalho (entre entrada e saída).");
            return;
        }
    }

    // Cria e insere um registro para cada dia selecionado para facilitar a busca do calendário cliente
    diasSelecionados.forEach(dia => {
        // Evita duplicidade de agenda: se o profissional já tem turno no mesmo dia, remove o antigo antes de sobrepor
        disponibilidades = disponibilidades.filter(item => !(item.barbeiro === profissional && item.dia === dia));

        disponibilidades.push({
            id: "disp_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
            barbeiro: profissional,
            dia: dia,
            entrada: entrada,
            saida: saida,
            inicioIntervalo: inicioIntervalo || null,
            fimIntervalo: fimIntervalo || null
        });
    });

    // Salva e atualiza visual
    localStorage.setItem("disponibilidades", JSON.stringify(disponibilidades));
    limparFormulario();
    renderizarDisponibilidades();
    alert("Disponibilidade configurada com sucesso!");
}

/**
 * Renderiza o painel visual com todas as regras operacionais ativas
 */
function renderizarDisponibilidades() {
    containerLista.innerHTML = "";

    if (disponibilidades.length === 0) {
        containerLista.innerHTML = `
            <div class="empty-state" style="text-align: center; color: #8a8a93; padding: 20px;">
                Nenhum horário de trabalho configurado.
            </div>
        `;
        return;
    }

    // Agrupa visualmente por profissional para não poluir a tela do administrador
    const agrupadoPorProfissional = {};
    disponibilidades.forEach(item => {
        if (!agrupadoPorProfissional[item.barbeiro]) {
            agrupadoPorProfissional[item.barbeiro] = [];
        }
        agrupadoPorProfissional[item.barbeiro].push(item);
    });

    // Cria os blocos de visualização
    for (const prof in agrupadoPorProfissional) {
        let blocoHtml = `
            <div style="background: #26262b; padding: 14px; margin-bottom: 15px; border-radius: 8px;">
                <strong style="color: #2cc185; font-size: 16px; display: block; margin-bottom: 8px; border-bottom: 1px solid #3a3a3c; padding-bottom: 4px;">
                    👤 ${prof}
                </strong>
        `;

        agrupadoPorProfissional[prof].forEach(item => {
            const txtIntervalo = item.inicioIntervalo ? ` • Almoço: ${item.inicioIntervalo} às ${item.fimIntervalo}` : " • Sem Intervalo";
            
            blocoHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 13px;">
                    <span style="color: #fff;">
                        🗓️ <strong>${item.dia}</strong>: ${item.entrada}h - ${item.saida}h <small style="color: #8a8a93;">${txtIntervalo}</small>
                    </span>
                    <button onclick="excluirDisponibilidade('${item.id}')" style="background: transparent; color: #e74c3c; border: none; font-weight: bold; cursor: pointer; padding: 2px 6px;">
                        ×
                    </button>
                </div>
            `;
        });

        blocoHtml += `</div>`;
        containerLista.innerHTML += blocoHtml;
    }
}

/**
 * Remove uma regra de horário específica da base
 */
function excluirDisponibilidade(id) {
    if (confirm("Deseja remover essa regra de horário específica?")) {
        disponibilidades = disponibilidades.filter(item => item.id !== id);
        localStorage.setItem("disponibilidades", JSON.stringify(disponibilidades));
        renderizarDisponibilidades();
    }
}

/**
 * Reseta o estado dos inputs do formulário
 */
function limparFormulario() {
    selectBarbeiro.value = "";
    inputEntrada.value = "";
    inputSaida.value = "";
    inputInicioIntervalo.value = "";
    inputFimIntervalo.value = "";
    checkboxesDias.forEach(cb => cb.checked = false);
}