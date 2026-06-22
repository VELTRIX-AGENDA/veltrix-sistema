const btnSalvarCliente = document.getElementById("btnSalvarCliente");
const campoPesquisa = document.getElementById("pesquisarCliente");

const clientes =
    JSON.parse(localStorage.getItem("clientes")) || [];

removerDuplicados();
mostrarClientes();

campoPesquisa.addEventListener("input", function () {
    mostrarClientes(campoPesquisa.value);
});

btnSalvarCliente.addEventListener("click", function () {
    const nome = document.getElementById("nomeCliente").value.trim();
    const telefone = document.getElementById("telefoneCliente").value.trim();
    const observacao = document.getElementById("observacaoCliente").value.trim();

    if (nome === "") {
        alert("Informe o nome.");
        return;
    }

    const clienteExistente = clientes.find(function (cliente) {
        const mesmoNome =
            cliente.nome.trim().toLowerCase() === nome.toLowerCase();

        const mesmoTelefone =
            telefone !== "" && cliente.telefone === telefone;

        return mesmoNome || mesmoTelefone;
    });

    if (clienteExistente) {
        clienteExistente.nome = nome;

        if (telefone !== "") {
            clienteExistente.telefone = telefone;
        }

        clienteExistente.observacao = observacao;
    } else {
        clientes.push({
            nome: nome,
            telefone: telefone,
            observacao: observacao
        });
    }

    salvarClientes();
    limparFormulario();
    mostrarClientes(campoPesquisa.value);
});

function mostrarClientes(pesquisa = "") {
    const lista = document.getElementById("listaClientes");

    const agendamentos =
        JSON.parse(localStorage.getItem("agendamentos")) || [];

    lista.innerHTML = "";

    const clientesOrdenados = [...clientes]
        .filter(function (cliente) {
            return cliente.nome
                .toLowerCase()
                .includes(pesquisa.toLowerCase());
        })
        .sort(function (a, b) {
            return a.nome.localeCompare(b.nome);
        });

    if (clientesOrdenados.length === 0) {
        lista.innerHTML = `
            <div class="empty-state">
                Nenhum cliente encontrado.
            </div>
        `;
        return;
    }

    for (let i = 0; i < clientesOrdenados.length; i++) {
        const cliente = clientesOrdenados[i];
        const indiceOriginal = clientes.indexOf(cliente);

        const historico = agendamentos.filter(function (agendamento) {
            const mesmoTelefone =
                cliente.telefone &&
                agendamento.telefone === cliente.telefone;

            const mesmoNome =
                agendamento.nome.trim().toLowerCase() ===
                cliente.nome.trim().toLowerCase();

            return mesmoTelefone || mesmoNome;
        });

        const finalizados = historico.filter(function (agendamento) {
            return agendamento.status === "Finalizado";
        });

        const consecutivos =
            contarFinalizadosConsecutivos(historico);

        let totalGasto = 0;

        for (let j = 0; j < finalizados.length; j++) {
            totalGasto += Number(finalizados[j].preco || 0);
        }

        const ultimaVisita = obterUltimaVisita(finalizados);
        const servicoFavorito = obterServicoFavorito(finalizados);
        const nivel = obterNivelCliente(consecutivos);

        lista.innerHTML += `
            <div class="dashboard-active-card cliente-card" onclick="abrirCliente(${indiceOriginal})">

                <strong>
                    ${cliente.nome}
                    ${nivel.selo}
                </strong>

                <span>
                    ${nivel.nome} • ${finalizados.length} visitas • R$ ${totalGasto.toFixed(2)}
                </span>

                <div class="cliente-detalhes" id="cliente-${indiceOriginal}">
                    <span>Telefone: ${cliente.telefone || "Não informado"}</span>
                    <span>Finalizados consecutivos: ${consecutivos}</span>
                    <span>Última Visita: ${ultimaVisita}</span>
                    <span>Serviço Favorito: ${servicoFavorito}</span>
                    <span>Observação: ${cliente.observacao || "Sem observações"}</span>

                    <button onclick="excluirCliente(event, ${indiceOriginal})">
                        Excluir Cliente
                    </button>
                </div>
            </div>
        `;
    }
}

function obterNivelCliente(consecutivos) {
    if (consecutivos >= 50) {
        return {
            nome: "Cliente MASTER",
            selo: '<span class="master-badge">🔴 MASTER</span>'
        };
    }

    if (consecutivos >= 15) {
        return {
            nome: "Cliente VIP",
            selo: '<span class="vip-badge">💎 VIP</span>'
        };
    }

    return {
        nome: "Cliente",
        selo: ""
    };
}

function contarFinalizadosConsecutivos(historico) {
    const ordenado = [...historico].sort(function (a, b) {
        const dataA = a.data + " " + a.horario;
        const dataB = b.data + " " + b.horario;

        return dataA.localeCompare(dataB);
    });

    let sequencia = 0;

    for (let i = 0; i < ordenado.length; i++) {
        if (ordenado[i].status === "Finalizado") {
            sequencia++;
        }

        if (ordenado[i].status === "Cancelado") {
            sequencia = 0;
        }
    }

    return sequencia;
}

function abrirCliente(posicao) {
    const detalhes =
        document.getElementById("cliente-" + posicao);

    if (detalhes) {
        detalhes.classList.toggle("mostrar");
    }
}

function obterUltimaVisita(finalizados) {
    if (finalizados.length === 0) {
        return "Nenhuma visita finalizada";
    }

    const ordenados = [...finalizados].sort(function (a, b) {
        return b.data.localeCompare(a.data);
    });

    return formatarDataVisual(ordenados[0].data);
}

function obterServicoFavorito(finalizados) {
    if (finalizados.length === 0) {
        return "Ainda não definido";
    }

    const ranking = {};

    for (let i = 0; i < finalizados.length; i++) {
        const servico = finalizados[i].servico;

        if (!ranking[servico]) {
            ranking[servico] = 0;
        }

        ranking[servico]++;
    }

    const ordenado = Object.entries(ranking).sort(function (a, b) {
        return b[1] - a[1];
    });

    return ordenado[0][0];
}

function removerDuplicados() {
    const mapa = {};
    const clientesLimpos = [];

    for (let i = 0; i < clientes.length; i++) {
        const chave =
            clientes[i].nome.trim().toLowerCase();

        if (!mapa[chave]) {
            mapa[chave] = true;
            clientesLimpos.push(clientes[i]);
        }
    }

    clientes.length = 0;
    clientes.push(...clientesLimpos);

    salvarClientes();
}

function excluirCliente(event, posicao) {
    event.stopPropagation();

    clientes.splice(posicao, 1);

    salvarClientes();

    mostrarClientes(campoPesquisa.value);
}

function salvarClientes() {
    localStorage.setItem(
        "clientes",
        JSON.stringify(clientes)
    );
}

function limparFormulario() {
    document.getElementById("nomeCliente").value = "";
    document.getElementById("telefoneCliente").value = "";
    document.getElementById("observacaoCliente").value = "";
}

function formatarDataVisual(data) {
    const partes = data.split("-");
    return partes[2] + "/" + partes[1] + "/" + partes[0];
}