// catalogo.js - refatorado com ListManager (versão compatível com portal dropdowns)
import { ListManager } from './list_common.js';

(function() {
    // ==================== Elementos DOM ====================
    const viewTable = document.getElementById('view-table');
    const viewForm = document.getElementById('view-form');
    const btnNovo = document.getElementById('btn-novo');
    const btnBack = document.getElementById('btn-back');
    const cancelFormBtn = document.getElementById('cancel-form');
    const form = document.getElementById('form-catalogo');

    const idInput = document.getElementById('catalogo-id-input');
    const hiddenIdInput = document.getElementById('catalogo-id');
    const nomeInput = document.getElementById('catalogo-nome');
    const dimX = document.getElementById('dim-x');
    const dimY = document.getElementById('dim-y');
    const dimZ = document.getElementById('dim-z');
    const linhaSelect = document.getElementById('catalogo-linha');
    const tipoSelect = document.getElementById('catalogo-tipo');
    const modeloCatalogoSelect = document.getElementById('catalogo-modelo-catalogo');
    const estadoSelect = document.getElementById('catalogo-estado');
    const paginaInput = document.getElementById('catalogo-pagina');
    const completoCheckbox = document.getElementById('catalogo-completo');
    const corretoOdooCheckbox = document.getElementById('catalogo-correto-odoo');
    const associadosList = document.getElementById('associados-list');
    const associarInput = document.getElementById('associar-input');
    const btnAdicionarAssociado = document.getElementById('btn-adicionar-associado');
    const obsTextarea = document.getElementById('catalogo-obs');

    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.id = 'autocomplete-suggestions';
    suggestionsDiv.className = 'autocomplete-suggestions';
    suggestionsDiv.style.display = 'none';
    if (associarInput) associarInput.parentNode.appendChild(suggestionsDiv);

    let associados = [];
    let editMode = false;
    const artigoCache = new Map();

    // ==================== ListManager ====================
    const manager = new ListManager({
        endpoint: '/validar/api/catalogo',
        tableId: 'tabela-dados',
        containerId: 'table-container',
        loadingId: 'loading',
        paginacaoId: 'paginacao',
        infoPaginaId: 'info-pagina',
        btnAnteriorId: 'btn-anterior',
        btnSeguinteId: 'btn-seguinte',
        totalRegistosId: 'total-registos',
        pesquisaInputId: 'pesquisa',
        btnPesquisarId: 'btn-pesquisar',
        btnLimparFiltrosId: 'btn-limpar-filtros',
        btnFiltrosId: 'btn-filtros',
        filtrosDropdownId: 'filtros-dropdown',
        btnAplicarFiltrosId: 'btn-aplicar-filtros',
        btnColunasId: 'btn-colunas',
        colunasDropdownId: 'colunas-dropdown',
        selectAllId: 'select-all',
        selectionPanelId: 'selection-panel',
        selectedCountId: 'selected-count',
        unselectAllId: 'unselect-all',
        selectAllDomainId: 'select-all-domain',
        totalCountBadgeId: 'total-count-badge',
        actionsDropdownBtnId: 'actionsDropdownBtn',
        actionsDropdownMenuId: 'actionsDropdownMenu',
        exportSelectedId: 'export-selected',
        storageKey: 'catalogo_colunas',
        linhasPorPagina: 40,
        getItemId: (item) => item.id,   // <-- IMPORTANTE
        colunasPadrao: ['id', 'nome', 'dimensoes', 'linha', 'tipo', 'modelo_catalogo', 'estado', 'pagina', 'completo', 'correto_odoo', 'artigos_associados', 'acoes'],
        colunasDisponiveis: [
            { value: 'id', label: 'ID' },
            { value: 'nome', label: 'Nome' },
            { value: 'dimensoes', label: 'Dimensões (cm)' },
            { value: 'linha', label: 'Linha' },
            { value: 'tipo', label: 'Tipo' },
            { value: 'modelo_catalogo', label: 'Modelo Catálogo' },
            { value: 'estado', label: 'Estado' },
            { value: 'pagina', label: 'Pág.' },
            { value: 'completo', label: 'Completo' },
            { value: 'correto_odoo', label: 'Odoo' },
            { value: 'artigos_associados', label: 'Artigos Associados' },
            { value: 'acoes', label: 'Ações' }
        ],
        processData: (data) => data,
        getFiltrosExtras: () => ({
            linha: document.getElementById('filtro-linha')?.value || '',
            tipo: document.getElementById('filtro-tipo')?.value || '',
            modelo_catalogo: document.getElementById('filtro-modelo-catalogo')?.value || '',
            estado: document.getElementById('filtro-estado')?.value || '',
            completo: document.getElementById('filtro-completo')?.value || '',
            correto_odoo: document.getElementById('filtro-correto-odoo')?.value || '',
            pagina_min: document.getElementById('filtro-pagina-min')?.value || '',
            pagina_max: document.getElementById('filtro-pagina-max')?.value || ''
        }),
        filterItem: (item, termo, filtros) => {
            if (termo) {
                let searchString = `${item.id || ''} ${item.nome || ''} ${item.linha || ''} ${item.tipo || ''} ${item.modelo_catalogo || ''} ${item.estado || ''} ${item.obs || ''} ${item.correto_odoo ? 'odoo correto' : ''}`;
                const associados = item.artigos_associados || [];
                associados.forEach(entry => {
                    let codigo = typeof entry === 'object' ? entry.codigo : entry;
                    if (codigo) searchString += ' ' + codigo;
                });
                if (!searchString.toLowerCase().includes(termo)) return false;
            }
            if (filtros.linha && item.linha !== filtros.linha) return false;
            if (filtros.tipo && item.tipo !== filtros.tipo) return false;
            if (filtros.modelo_catalogo && item.modelo_catalogo !== filtros.modelo_catalogo) return false;
            if (filtros.estado && item.estado !== filtros.estado) return false;
            if (filtros.completo) {
                const completo = filtros.completo === 'sim';
                if (item.completo !== completo) return false;
            }
            if (filtros.correto_odoo) {
                const correto = filtros.correto_odoo === 'sim';
                if (item.correto_odoo !== correto) return false;
            }
            const paginaMin = filtros.pagina_min ? parseInt(filtros.pagina_min) : null;
            const paginaMax = filtros.pagina_max ? parseInt(filtros.pagina_max) : null;
            if (paginaMin !== null && (item.pagina === undefined || item.pagina < paginaMin)) return false;
            if (paginaMax !== null && (item.pagina === undefined || item.pagina > paginaMax)) return false;
            return true;
        },
        sortItem: (a, b, ordenarPor, ordemAscendente) => {
            let valA, valB;
            if (ordenarPor === 'dimensoes') {
                valA = (a.dimensoes?.x || 0) + (a.dimensoes?.y || 0) + (a.dimensoes?.z || 0);
                valB = (b.dimensoes?.x || 0) + (b.dimensoes?.y || 0) + (b.dimensoes?.z || 0);
            } else if (ordenarPor === 'pagina') {
                valA = a.pagina || 0;
                valB = b.pagina || 0;
            } else if (ordenarPor === 'completo') {
                valA = a.completo ? 1 : 0;
                valB = b.completo ? 1 : 0;
            } else if (ordenarPor === 'correto_odoo') {
                valA = a.correto_odoo ? 1 : 0;
                valB = b.correto_odoo ? 1 : 0;
            } else {
                valA = a[ordenarPor] || '';
                valB = b[ordenarPor] || '';
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
            }
            if (valA < valB) return ordemAscendente ? -1 : 1;
            if (valA > valB) return ordemAscendente ? 1 : -1;
            return 0;
        },
        renderHeader: (colunasVisiveis) => {
            const labels = {
                id: 'ID', nome: 'Nome', dimensoes: 'Dimensões (cm)', linha: 'Linha',
                tipo: 'Tipo', modelo_catalogo: 'Modelo Catálogo', estado: 'Estado',
                pagina: 'Pág.', completo: 'Completo', correto_odoo: 'Odoo',
                artigos_associados: 'Artigos Associados', acoes: 'Ações'
            };
            let html = '<tr><th class="checkbox-col"><input type="checkbox" id="select-all"></th>';
            for (const col of colunasVisiveis) {
                if (col === 'acoes') continue;
                html += `<th data-coluna="${col}" class="sortable">${labels[col] || col}</th>`;
            }
            html += '<th>Ações</th></tr>';
            return html;
        },
        renderRow: (item, colunasVisiveis) => {
            let html = `<td class="checkbox-col"><input type="checkbox" class="row-select" value="${item.id}"></td>`;
            for (const col of colunasVisiveis) {
                if (col === 'acoes') {
                    html += `<td class="action-cell">
                        <div class="dropdown">
                            <button class="dropdown-btn"><i class="fas fa-cog"></i></button>
                            <div class="dropdown-content hidden">
                                <a href="#" class="dropdown-item edit-item" data-id="${item.id}"><i class="fas fa-edit"></i> Editar</a>
                                <a href="#" class="dropdown-item delete-item" data-id="${item.id}"><i class="fas fa-trash-alt"></i> Eliminar</a>
                                <a href="#" class="dropdown-item duplicate-item" data-id="${item.id}"><i class="fas fa-copy"></i> Duplicar</a>
                            </div>
                        </div>
                    </td>`;
                } else if (col === 'artigos_associados') {
                    const assoc = item.artigos_associados || [];
                    const contagem = new Map();
                    assoc.forEach(entry => {
                        let codigo, qtd = 1;
                        if (typeof entry === 'object' && entry.codigo) {
                            codigo = entry.codigo;
                            qtd = entry.quantidade || 1;
                        } else if (typeof entry === 'string') {
                            codigo = entry;
                        }
                        if (codigo) contagem.set(codigo, (contagem.get(codigo) || 0) + qtd);
                    });
                    let badges = '';
                    for (const [codigo, total] of contagem) {
                        badges += `<span class="badge-assoc">${total > 1 ? total + 'x ' : ''}${codigo}</span>`;
                    }
                    html += `<td>${badges}</td>`;
                } else if (col === 'dimensoes') {
                    html += `<td>${item.dimensoes?.x || 0} x ${item.dimensoes?.y || 0} x ${item.dimensoes?.z || 0}</td>`;
                } else if (col === 'completo') {
                    html += `<td>${item.completo ? '✅' : '❌'}</td>`;
                } else if (col === 'correto_odoo') {
                    html += `<td style="text-align:center;">${item.correto_odoo ? '<i class="fas fa-check" style="color: #0d6efd; font-size: 1.2rem;"></i>' : ''}</td>`;
                } else {
                    html += `<td>${item[col] !== undefined && item[col] !== null ? item[col] : ''}</td>`;
                }
            }
            return html;
        },
        onAfterRender: () => {
            // Nada necessário aqui, o ListManager gere os dropdowns
        },
        onExportSelected: (ids) => {
            const itensSelecionados = manager.filteredData.filter(item => ids.includes(item.id));
            if (itensSelecionados.length === 0) return;
            const cabecalho = ['ID', 'Nome', 'Dimensões X', 'Dimensões Y', 'Dimensões Z', 'Linha', 'Tipo', 'Modelo Catálogo', 'Estado', 'Página', 'Completo', 'Correto Odoo', 'Artigos Associados', 'Observações'];
            const linhas = itensSelecionados.map(item => [
                item.id, item.nome, item.dimensoes.x, item.dimensoes.y, item.dimensoes.z,
                item.linha || '', item.tipo || '', item.modelo_catalogo || '', item.estado || '',
                item.pagina || '', item.completo ? 'Sim' : 'Não',
                item.correto_odoo ? 'Sim' : 'Não',
                (() => {
                    const assoc = item.artigos_associados || [];
                    const contagem = new Map();
                    assoc.forEach(entry => {
                        let codigo, qtd = 1;
                        if (typeof entry === 'object' && entry.codigo) {
                            codigo = entry.codigo;
                            qtd = entry.quantidade || 1;
                        } else if (typeof entry === 'string') {
                            codigo = entry;
                        }
                        if (codigo) contagem.set(codigo, (contagem.get(codigo) || 0) + qtd);
                    });
                    return Array.from(contagem.entries()).map(([cod, total]) => total > 1 ? `${total}x${cod}` : cod).join('; ');
                })(),
                item.obs || ''
            ]);
            const conteudo = [cabecalho, ...linhas].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')).join('\n');
            const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.setAttribute('download', 'catalogo_selecionados.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    });

    // ==================== Funções auxiliares ====================
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m]);
    }

    function gerarSlug(texto) {
        return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    }

    function atualizarIdAutomatico() {
        if (editMode) return;
        const nome = nomeInput.value.trim();
        const linha = linhaSelect.value;
        if (nome && linha) {
            idInput.value = `${gerarSlug(linha)}_${gerarSlug(nome)}`;
        } else if (nome) {
            idInput.value = gerarSlug(nome);
        }
    }

    async function fetchArtigoDetalhes(codigo) {
        if (artigoCache.has(codigo)) return artigoCache.get(codigo);
        try {
            const resp = await fetch(`/validar/api/artigo/${codigo}`);
            if (!resp.ok) return null;
            const data = await resp.json();
            artigoCache.set(codigo, data);
            return data;
        } catch {
            return null;
        }
    }

    async function renderAssociados() {
        if (!associadosList) return;
        if (associados.length === 0) {
            associadosList.innerHTML = '<div style="padding: 10px; color: var(--text-secondary);">Nenhum artigo associado.</div>';
            return;
        }
        associadosList.innerHTML = '<div style="padding: 10px; text-align: center;"><i class="fas fa-spinner fa-pulse"></i> A carregar detalhes...</div>';
        for (let assoc of associados) {
            if (!assoc.detalhes) assoc.detalhes = await fetchArtigoDetalhes(assoc.codigo);
        }
        const table = document.createElement('table');
        table.className = 'tabela-associados';
        table.innerHTML = `<thead><tr><th>Código</th><th>Nome</th><th>Dimensões</th><th>Tipo Cartão</th><th>Ações</th></tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        for (const assoc of associados) {
            const art = assoc.detalhes;
            const qtd = assoc.quantidade || 1;
            const codigoExibido = qtd > 1 ? `${qtd}x ${assoc.codigo}` : assoc.codigo;
            const nome = art?.name || '---';
            const dims = art?.oficial?.dimensoes;
            const dimensoes = dims ? `${dims.x} × ${dims.y} × ${dims.z} mm` : '---';
            let tipoCartao = art?.oficial?.tipo_cartao || '---';
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${escapeHtml(codigoExibido)}</td><td>${escapeHtml(nome)}</td><td>${dimensoes}</td><td>${escapeHtml(tipoCartao)}</td><td><button class="btn-remover-assoc" data-codigo="${assoc.codigo}"><i class="fas fa-trash-alt"></i> Remover</button></td>`;
            tbody.appendChild(tr);
        }
        associadosList.innerHTML = '';
        associadosList.appendChild(table);
        associadosList.querySelectorAll('.btn-remover-assoc').forEach(btn => {
            btn.addEventListener('click', () => {
                const codigo = btn.dataset.codigo;
                associados = associados.filter(a => a.codigo !== codigo);
                renderAssociados();
            });
        });
    }

    async function adicionarAssociado(codigo) {
        const existing = associados.find(a => a.codigo === codigo);
        if (existing) {
            const confirmado = await mostrarModalConfirmacao(`O artigo "${codigo}" já existe. Adicionar mais uma unidade?`);
            if (confirmado) {
                existing.quantidade = (existing.quantidade || 1) + 1;
                renderAssociados();
            }
        } else {
            associados.push({ codigo, quantidade: 1, detalhes: null });
            renderAssociados();
        }
    }

    function mostrarModalConfirmacao(mensagem) {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-validacao');
            if (!modal) { resolve(confirm(mensagem)); return; }
            const titulo = document.getElementById('modal-titulo');
            const msg = document.getElementById('modal-mensagem');
            const sim = document.getElementById('modal-sim');
            const nao = document.getElementById('modal-nao');
            titulo.textContent = 'Confirmar';
            msg.textContent = mensagem;
            modal.classList.add('show');
            const onSim = () => { cleanup(); resolve(true); };
            const onNao = () => { cleanup(); resolve(false); };
            const cleanup = () => {
                modal.classList.remove('show');
                sim.removeEventListener('click', onSim);
                nao.removeEventListener('click', onNao);
            };
            sim.addEventListener('click', onSim);
            nao.addEventListener('click', onNao);
        });
    }

    // ==================== Eventos das ações (delegação global) ====================
    document.addEventListener('click', async (e) => {
        const item = e.target.closest('.dropdown-item');
        if (!item) return;
        e.preventDefault();
        e.stopPropagation();

        const id = item.dataset.id;
        if (!id) return;

        // Fecha o menu portal se existir
        if (manager.activePortalMenu) {
            manager.closePortalDropdown();
        }

        if (item.classList.contains('edit-item')) {
            const data = manager.data.find(i => i.id === id);
            if (data) openEdit(data);
        } else if (item.classList.contains('delete-item')) {
            const confirmado = await mostrarModalConfirmacao(`Eliminar item ${id}?`);
            if (!confirmado) return;
            try {
                const resp = await fetch(`/validar/api/catalogo/${id}`, { method: 'DELETE' });
                if (resp.ok) manager.loadData();
                else alert('Erro ao eliminar');
            } catch (err) {
                console.error(err);
            }
        } else if (item.classList.contains('duplicate-item')) {
            const data = manager.data.find(i => i.id === id);
            if (data) openDuplicate(data);
        }
    });

    // ==================== Autocomplete ====================
    let timeoutId = null;
    associarInput?.addEventListener('input', () => {
        clearTimeout(timeoutId);
        const q = associarInput.value.trim();
        if (q.length < 2) {
            suggestionsDiv.style.display = 'none';
            return;
        }
        timeoutId = setTimeout(async () => {
            try {
                const resp = await fetch(`/validar/api/artigos?q=${encodeURIComponent(q)}`);
                if (!resp.ok) throw new Error('Erro na pesquisa');
                const artigos = await resp.json();
                const limitados = artigos.slice(0, 20);
                suggestionsDiv.innerHTML = '';
                if (limitados.length === 0) {
                    suggestionsDiv.style.display = 'none';
                    return;
                }
                limitados.forEach(art => {
                    const dims = art.oficial?.dimensoes;
                    const dimText = dims ? `${dims.x}×${dims.y}×${dims.z}` : '';
                    const texto = dimText ? `${art.codigo} • ${dimText}` : art.codigo;
                    const suggestion = document.createElement('div');
                    suggestion.className = 'autocomplete-suggestion';
                    suggestion.textContent = texto;
                    suggestion.addEventListener('click', () => {
                        associarInput.value = art.codigo;
                        suggestionsDiv.style.display = 'none';
                    });
                    suggestionsDiv.appendChild(suggestion);
                });
                suggestionsDiv.style.display = 'block';
            } catch {
                suggestionsDiv.style.display = 'none';
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!associarInput?.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.style.display = 'none';
        }
    });

    btnAdicionarAssociado?.addEventListener('click', async () => {
        const cod = associarInput.value.trim();
        if (cod) {
            await adicionarAssociado(cod);
            associarInput.value = '';
            suggestionsDiv.style.display = 'none';
        }
    });

    // ==================== Formulário ====================
    function openNew() {
        editMode = false;
        idInput.value = '';
        if (hiddenIdInput) hiddenIdInput.value = '';
        idInput.readOnly = false;
        nomeInput.value = '';
        dimX.value = dimY.value = dimZ.value = '';
        linhaSelect.value = '';
        tipoSelect.value = 'Coleção';
        modeloCatalogoSelect.value = 'Catálogo Atual';
        estadoSelect.value = 'Ativo';
        paginaInput.value = '';
        completoCheckbox.checked = false;
        corretoOdooCheckbox.checked = false;
        obsTextarea.value = '';
        associados = [];
        renderAssociados();
        viewTable.classList.add('hidden');
        viewForm.classList.remove('hidden');
    }

    function openEdit(item) {
        editMode = true;
        idInput.value = item.id;
        if (hiddenIdInput) hiddenIdInput.value = item.id;
        idInput.readOnly = true;
        nomeInput.value = item.nome;
        dimX.value = item.dimensoes.x;
        dimY.value = item.dimensoes.y;
        dimZ.value = item.dimensoes.z;
        linhaSelect.value = item.linha || '';
        tipoSelect.value = item.tipo || '';
        modeloCatalogoSelect.value = item.modelo_catalogo || '';
        estadoSelect.value = item.estado || '';
        paginaInput.value = item.pagina || '';
        completoCheckbox.checked = item.completo === true;
        corretoOdooCheckbox.checked = item.correto_odoo === true;
        obsTextarea.value = item.obs || '';
        associados = converterAssociadosParaObjetos(item.artigos_associados || []);
        renderAssociados();
        viewTable.classList.add('hidden');
        viewForm.classList.remove('hidden');
    }

    function openDuplicate(item) {
        editMode = false;
        idInput.value = '';
        if (hiddenIdInput) hiddenIdInput.value = '';
        idInput.readOnly = false;
        nomeInput.value = item.nome;
        dimX.value = item.dimensoes.x;
        dimY.value = item.dimensoes.y;
        dimZ.value = item.dimensoes.z;
        linhaSelect.value = item.linha || '';
        tipoSelect.value = item.tipo || '';
        modeloCatalogoSelect.value = item.modelo_catalogo || '';
        estadoSelect.value = item.estado || '';
        paginaInput.value = item.pagina || '';
        completoCheckbox.checked = item.completo === true;
        corretoOdooCheckbox.checked = item.correto_odoo === true;
        obsTextarea.value = item.obs || '';
        associados = converterAssociadosParaObjetos(item.artigos_associados || []);
        renderAssociados();
        viewTable.classList.add('hidden');
        viewForm.classList.remove('hidden');
        atualizarIdAutomatico();
    }

    function converterAssociadosParaObjetos(assocArray) {
        if (!Array.isArray(assocArray)) return [];
        if (assocArray.length > 0 && typeof assocArray[0] === 'object' && assocArray[0].codigo !== undefined) {
            return assocArray.map(a => ({ ...a, detalhes: null }));
        }
        const map = new Map();
        assocArray.forEach(cod => {
            const existing = map.get(cod);
            if (existing) existing.quantidade++;
            else map.set(cod, { codigo: cod, quantidade: 1, detalhes: null });
        });
        return Array.from(map.values());
    }

    function closeForm() {
        viewForm.classList.add('hidden');
        viewTable.classList.remove('hidden');
        manager.loadData();
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = idInput.value.trim();
        const nome = nomeInput.value.trim();
        const x = parseFloat(dimX.value);
        const y = parseFloat(dimY.value);
        const z = parseFloat(dimZ.value);
        if (!id || !nome || isNaN(x) || isNaN(y) || isNaN(z)) {
            alert('Preencha todos os campos obrigatórios.');
            return;
        }
        if (!editMode && manager.data.some(item => item.id === id)) {
            alert(`Já existe um item com o ID "${id}".`);
            return;
        }
        let artigos_associados = [];
        associados.forEach(assoc => {
            for (let i = 0; i < (assoc.quantidade || 1); i++) artigos_associados.push(assoc.codigo);
        });
        const data = {
            id, nome, dimensoes: { x, y, z }, linha: linhaSelect.value, tipo: tipoSelect.value,
            modelo_catalogo: modeloCatalogoSelect.value, estado: estadoSelect.value,
            pagina: paginaInput.value ? parseInt(paginaInput.value) : null, completo: completoCheckbox.checked,
            correto_odoo: corretoOdooCheckbox.checked,
            artigos_associados, obs: obsTextarea.value
        };
        try {
            const resp = await fetch('/validar/api/catalogo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (resp.ok) closeForm();
            else { const err = await resp.json(); alert('Erro: ' + (err.detail || 'Falha ao guardar')); }
        } catch (err) {
            alert('Erro de comunicação');
        }
    });

    // ==================== Inicialização ====================
    async function loadDictionaries() {
        try {
            const resp = await fetch('/validar/api/dicionarios/todos');
            if (!resp.ok) return;
            const dicts = await resp.json();
            const populate = (select, options) => {
                select.innerHTML = '<option value="">-- Selecionar --</option>';
                options.forEach(opt => { const o = document.createElement('option'); o.value = opt; o.textContent = opt; select.appendChild(o); });
            };
            populate(linhaSelect, dicts.linha || []);
            populate(tipoSelect, dicts.tipo || []);
            populate(modeloCatalogoSelect, dicts.modelo_catalogo || []);
            populate(estadoSelect, dicts.estado || []);
            populate(document.getElementById('filtro-linha'), dicts.linha || []);
            populate(document.getElementById('filtro-tipo'), dicts.tipo || []);
            populate(document.getElementById('filtro-modelo-catalogo'), dicts.modelo_catalogo || []);
            populate(document.getElementById('filtro-estado'), dicts.estado || []);
        } catch (e) {
            console.error('Erro ao carregar dicionários', e);
        }
    }

    nomeInput?.addEventListener('input', atualizarIdAutomatico);
    linhaSelect?.addEventListener('change', atualizarIdAutomatico);
    btnNovo?.addEventListener('click', openNew);
    btnBack?.addEventListener('click', closeForm);
    cancelFormBtn?.addEventListener('click', closeForm);

    // Iniciar ListManager e carregar dicionários
    manager.init();
    loadDictionaries();

    // Exportações adicionais
    document.getElementById('export-detalhado')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const ids = Array.from(manager.selectedIds);
        if (ids.length === 0) { alert('Selecione pelo menos um item.'); return; }
        try {
            const formData = new FormData();
            formData.append('ids', JSON.stringify(ids));
            const resp = await fetch('/validar/api/catalogo/exportar_excel', { method: 'POST', body: formData });
            if (resp.ok) {
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'catalogo_detalhado.xlsx';
                a.click();
                URL.revokeObjectURL(url);
            } else {
                const err = await resp.json();
                alert('Erro: ' + (err.detail || 'Falha ao exportar'));
            }
        } catch (err) {
            alert('Erro ao comunicar com o servidor.');
        }
    });

    document.getElementById('export-compostos')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const ids = Array.from(manager.selectedIds);
        if (ids.length === 0) { alert('Selecione pelo menos um item.'); return; }
        try {
            const formData = new FormData();
            formData.append('ids', JSON.stringify(ids));
            const resp = await fetch('/validar/api/catalogo/exportar_formato_personalizado', { method: 'POST', body: formData });
            if (resp.ok) {
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'catalogo_compostos.xlsx';
                a.click();
                URL.revokeObjectURL(url);
            } else {
                const err = await resp.json();
                alert('Erro: ' + (err.detail || 'Falha ao exportar'));
            }
        } catch (err) {
            alert('Erro ao comunicar com o servidor.');
        }
    });
})();