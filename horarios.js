/**
 * VELTRIX - Gestão Inteligente de Jornada de Trabalho
 * Módulo: Escala dos Profissionais na Nuvem Firestore
 */

const campoBarbeiroHorario = document.getElementById("barbeiroHorario");
const btnSalvarHorario = document.getElementById("btnSalvarHorario");

// Captura a sessão do estabelecimento logado para não misturar os dados
const usuarioLogado = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
const tenantID = usuarioLogado.empresa || "Geral";

let horariosEscala = [];

// Inicialização conectada
carregarBarbeirosNuvem();
escutarHorariosTrabalho();

if (btnSalvarHorario) {
    btnSalvarHorario.addEventListener("click", function () {
        const barbeiro = campoBarbeiroHorario.value;
        const entrada = document.getElementById("horaEntrada").value;
        const saida = document.getElementById("horaSaida").value;
        const inicioIntervalo = document.getElementById("inicioIntervalo").value;
        const fimIntervalo = document.getElementById("fimIntervalo").value;

        if (barbeiro === "") { alert("Selecione um profissional."); return; }
        if (entrada === "") { alert("Informe o horário de entrada."); return; }
        if (saida === "") { alert("Informe o horário de saída."); return; }

        // SALVANDO NA NUVEM: Vinculado ao ID da sua empresa
        db.collection("veltrix_escalas").add({
            tenantID: tenantID,
            barbeiro: barbeiro,
            entrada: entrada,
            saida: saida,
            inicioIntervalo: inicioIntervalo || "",
            fimIntervalo: fimIntervalo || "",
            atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            // Limpa os campos após o sucesso na nuvem
            campoBarbeiroHorario.value = "";
            document.getElementById("horaEntrada").value = "";
            document.getElementById("horaSaida").value = "";
            document.getElementById("inicioIntervalo").value = "";
            document.getElementById("fimIntervalo").value = "";
        })
        .catch(erro => console.error("Erro ao salvar escala na nuvem:", erro));
    });
}

function carregarBarbeirosNuvem() {
    // Busca os barbeiros cadastrados na nuvem para o seu estabelecimento
    db.collection("veltrix_barbeiros").where("tenantID", "==", tenantID).get()
        .then(snapshot => {
            campoBarbeiroHorario.innerHTML = '<option value="">Selecione um profissional</option>';
            snapshot.forEach(doc => {
                const dados = doc.data();
                campoBarbeiroHorario.innerHTML += `
                    <option value="${dados.nome}">${dados.nome}</option>
                `;
            });
        })
        .catch(erro => console.error("Erro ao carregar profissionais:", erro));
}

// ⏳ Escuta em Tempo Real: Se alguém deletar ou adicionar em outro celular, atualiza na tela na hora!
function escutarHorariosTrabalho() {
    db.collection("veltrix_escalas")
        .where("tenantID", "==", tenantID)
        .onSnapshot(snapshot => {
            horariosEscala = [];
            const lista = document.getElementById("listaHorarios");
            if (!lista) return;
            
            lista.innerHTML = "";

            snapshot.forEach(doc => {
                const id = doc.id;
                const dados = doc.data();
                horariosEscala.push({ id, ...dados });

                lista.innerHTML += `
                    <div class="agendamento-item">
                        <strong>Profissional: ${dados.barbeiro}</strong>
                        <span>Entrada: ${dados.entrada}</span>
                        <span>Saída: ${dados.saida}</span>
                        <span>Intervalo: ${dados.inicioIntervalo || "Sem intervalo"} até ${dados.fimIntervalo || "Sem intervalo"}</span>

                        <button onclick="excluirEscalaNuvem('${id}')" style="background-color: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                            Excluir
                        </button>
                    </div>
                `;
            });
        });
}

function excluirEscalaNuvem(docID) {
    if (confirm("Deseja realmente remover esta escala de trabalho da nuvem?")) {
        db.collection("veltrix_escalas").doc(docID).delete()
            .catch(erro => alert("Erro ao deletar: " + erro.message));
    }
}

window.excluirEscalaNuvem = excluirEscalaNuvem;
