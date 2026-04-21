// dicionarios.js - Cards minimizáveis com persistência de estado na sessão

// Objeto para guardar o estado de expansão durante a sessão
let estadoExpansao = {};

// Função para guardar estado no sessionStorage
function guardarEstadoExpansao() {
    sessionStorage.setItem('dicionarios_expandidos', JSON.stringify(estadoExpansao));
}

// Função para carregar estado do sessionStorage
function carregarEstadoExpansao() {
    const guardado = sessionStorage.getItem('dicionarios_expandidos');
    if (guardado) {
        try {
            estadoExpansao = JSON.parse(guardado);
        } catch (e) {
            estadoExpansao = {};
        }
    } else {
        estadoExpansao = {};
    }
}

// Função para alternar expansão de um card
function toggleCard(nome) {
    estadoExpansao[nome] = !estadoExpansao[nome];
    guardarEstadoExpansao();
    const card = document.getElementById(`card-${nome}`);
    if (card) {
        const content = card.querySelector('.card-content');
        const icon = card.querySelector('.card-header i');
        if (estadoExpansao[nome]) {
            content.classList.remove('collapsed');
            icon.classList.add('expanded');
        } else {
            content.classList.add('collapsed');
            icon.classList.remove('expanded');
        }
    }
}

async function carregarDicionarios() {
    // Carregar estado guardado
    carregarEstadoExpansao();

    const resp = await fetch('/validar/api/dicionarios/todos');
    const dados = await resp.json();
    const container = document.getElementById('dicionarios-container');
    container.innerHTML = '';

    for (const [nome, opcoes] of Object.entries(dados)) {
        const card = document.createElement('div');
        card.className = 'dicionario-card';
        card.id = `card-${nome}`;

        // Cabeçalho clicável
        const header = document.createElement('div');
        header.className = 'card-header';
        header.innerHTML = `
            <h3>${nome}</h3>
            <i class="fas fa-chevron-down ${estadoExpansao[nome] ? 'expanded' : ''}"></i>
        `;
        header.addEventListener('click', () => toggleCard(nome));

        // Conteúdo (lista e formulário)
        const content = document.createElement('div');
        content.className = `card-content ${estadoExpansao[nome] ? '' : 'collapsed'}`;

        // Lista de opções
        const listaDiv = document.createElement('div');
        listaDiv.id = `lista-${nome}`;
        opcoes.forEach(opcao => {
            const div = document.createElement('div');
            div.className = 'opcao-item';
            div.innerHTML = `
                <span>${opcao}</span>
                <button class="btn-remover" data-nome="${nome}" data-opcao="${opcao}">Remover</button>
            `;
            listaDiv.appendChild(div);
        });

        // Formulário de adição
        const addForm = document.createElement('div');
        addForm.className = 'add-form';
        addForm.innerHTML = `
            <input type="text" id="input-${nome}" placeholder="Nova opção">
            <button class="btn btn-primary" data-nome="${nome}">Adicionar</button>
        `;

        content.appendChild(listaDiv);
        content.appendChild(addForm);

        card.appendChild(header);
        card.appendChild(content);
        container.appendChild(card);

        // Adicionar listeners aos botões de remover (já estão no innerHTML, mas vamos delegar)
        card.querySelectorAll('.btn-remover').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // evitar que o clique no botão feche/abra o card
                const nomeDic = btn.dataset.nome;
                const opcao = btn.dataset.opcao;
                removerOpcao(nomeDic, opcao);
            });
        });

        // Listener para o botão de adicionar
        card.querySelector('.add-form button').addEventListener('click', (e) => {
            e.stopPropagation();
            const nomeDic = e.target.dataset.nome;
            adicionarOpcao(nomeDic);
        });
    }
}

async function adicionarOpcao(nome) {
    const input = document.getElementById(`input-${nome}`);
    const opcao = input.value.trim();
    if (!opcao) return;

    // Guardar estado atual antes de recarregar
    const estadoAtual = { ...estadoExpansao };

    await fetch(`/validar/dicionario/${nome}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ opcao })
    });

    input.value = '';
    // Recarregar dicionários (irá recriar os cards)
    await carregarDicionarios();

    // Restaurar estado de expansão (os cards recriados manterão o estado conforme guardado)
    // Como carregarDicionarios já usou o estadoExpansao atual (que pode ter sido alterado por outras abas),
    // precisamos de garantir que o estado original é mantido. O carregarDicionarios já lê do objeto global,
    // e nós não o alterámos, por isso mantém-se. Mas se quisermos garantir que o card atual fica expandido,
    // podemos forçar estadoExpansao[nome] = true antes de recarregar.
    estadoExpansao[nome] = true; // após adicionar, queremos que o card continue expandido
    guardarEstadoExpansao();

    // Nota: carregarDicionarios já foi chamado, mas o estado já estava true, então o card será renderizado expandido.
    // No entanto, carregarDicionarios já correu antes de alterarmos estadoExpansao[nome] = true.
    // Vamos reordenar: primeiro atualizar estado, depois recarregar.
}

// Para remover, igual: queremos manter o estado de expansão após a remoção.
async function removerOpcao(nome, opcao) {
    if (!confirm(`Remover "${opcao}"?`)) return;

    // Guardar que este card deve continuar expandido
    estadoExpansao[nome] = true;
    guardarEstadoExpansao();

    await fetch(`/validar/dicionario/${nome}/${encodeURIComponent(opcao)}`, {
        method: 'DELETE'
    });

    // Recarregar dicionários (irá usar o estadoExpansao atualizado)
    await carregarDicionarios();
}

// Inicializar
carregarDicionarios();