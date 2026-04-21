// catalogo.js - com botão limpar filtros, persistência, modal personalizado e tabela de associados
// (sem dependência do elemento #form-title)

window.addEventListener('DOMContentLoaded', () => {
    // ==================== Elementos DOM ====================
    const viewTable = document.getElementById('view-table');
    const viewForm = document.getElementById('view-form');
    const btnNovo = document.getElementById('btn-novo');
    const btnBack = document.getElementById('btn-back');
    const cancelFormBtn = document.getElementById('cancel-form');
    // const formTitle = document.getElementById('form-title');  // Já não existe no HTML
    const tabela = document.getElementById('tabela-catalogo');
    const tbody = tabela.querySelector('tbody');
    const loading = document.getElementById('loading');
    const form = document.getElementById('form-catalogo');

    // Paginação
    const paginacaoDiv = document.getElementById('paginacao');
    const infoPagina = document.getElementById('info-pagina');
    const btnAnterior = document.getElementById('btn-anterior');
    const btnSeguinte = document.getElementById('btn-seguinte');
    const LINHAS_POR_PAGINA = 17;

    // Elementos de pesquisa e filtros
    const pesquisaInput = document.getElementById('pesquisa');
    const btnPesquisar = document.getElementById('btn-pesquisar');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
    const btnFiltros = document.getElementById('btn-filtros');
    const filtrosDropdown = document.getElementById('filtros-dropdown');
    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
    const btnColunas = document.getElementById('btn-colunas');
    const colunasDropdown = document.getElementById('colunas-dropdown');
    const aplicarColunas = document.getElementById('aplicar-colunas');

    // Filtros específicos
    const filtroLinha = document.getElementById('filtro-linha');
    const filtroTipo = document.getElementById('filtro-tipo');
    const filtroModeloCatalogo = document.getElementById('filtro-modelo-catalogo');
    const filtroEstado = document.getElementById('filtro-estado');
    const filtroCompleto = document.getElementById('filtro-completo');
    const filtroCorretoOdoo = document.getElementById('filtro-correto-odoo');
    const filtroPaginaMin = document.getElementById('filtro-pagina-min');
    const filtroPaginaMax = document.getElementById('filtro-pagina-max');

    // Elementos de seleção
    const selectAllCheckbox = document.getElementById('select-all');
    const selectionPanel = document.getElementById('selection-panel');
    const selectedCountSpan = document.getElementById('selected-count');
    const unselectAllBtn = document.getElementById('unselect-all');
    const selectAllDomainBtn = document.getElementById('select-all-domain');
    const totalCountBadge = document.getElementById('total-count-badge');
    const exportSelectedBtn = document.getElementById('export-selected');
    const exportDetalhadoBtn = document.getElementById('export-detalhado');
    const exportCompostosBtn = document.getElementById('export-compostos');  // NOVO
    const actionsDropdownBtn = document.getElementById('actionsDropdownBtn');
    const actionsDropdownMenu = document.getElementById('actionsDropdownMenu');

    // Inputs do formulário
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

    // Estado
    let associados = [];
    let editMode = false;
    let todosItens = [];
    let itensFiltrados = [];
    let paginaAtual = 1;
    let selectedIds = new Set();
    let ordenarPor = null;
    let ordemAscendente = true;

    // Cache para detalhes dos artigos
    const artigoCache = new Map();

    // Colunas visíveis
    let colunasVisiveis = ['id', 'nome', 'dimensoes', 'linha', 'tipo', 'modelo_catalogo', 'estado', 'pagina', 'completo', 'correto_odoo', 'artigos_associados', 'acoes'];
    const colunasGuardadas = localStorage.getItem('catalogo_colunas');
    if (colunasGuardadas) {
        try {
            const parsed = JSON.parse(colunasGuardadas);
            if (!parsed.includes('acoes')) parsed.push('acoes');
            colunasVisiveis = parsed;
        } catch (e) {}
    }

    // ==================== Funções de deteção de filtros ativos ====================
    function existemFiltrosAtivos() {
        if (pesquisaInput.value.trim() !== '') return true;
        if (filtroLinha.value !== '') return true;
        if (filtroTipo.value !== '') return true;
        if (filtroModeloCatalogo.value !== '') return true;
        if (filtroEstado.value !== '') return true;
        if (filtroCompleto.value !== '') return true;
        if (filtroCorretoOdoo.value !== '') return true;
        if (filtroPaginaMin.value !== '') return true;
        if (filtroPaginaMax.value !== '') return true;
        return false;
    }

    function atualizarBotaoLimpar() {
        if (btnLimparFiltros) {
            btnLimparFiltros.style.display = existemFiltrosAtivos() ? 'inline-flex' : 'none';
        }
    }

    function limparFiltrosCompletos() {
        pesquisaInput.value = '';
        filtroLinha.value = '';
        filtroTipo.value = '';
        filtroModeloCatalogo.value = '';
        filtroEstado.value = '';
        filtroCompleto.value = '';
        filtroCorretoOdoo.value = '';
        filtroPaginaMin.value = '';
        filtroPaginaMax.value = '';
        aplicarFiltros();
        atualizarBotaoLimpar();
    }

    // ==================== Gerar ID automático ====================
    function gerarSlug(texto) {
        return texto
            .toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    function atualizarIdAutomatico() {
        if (editMode) return;
        const nome = nomeInput.value.trim();
        const linha = linhaSelect.value;
        if (nome && linha) {
            const slugLinha = gerarSlug(linha);
            const slugNome = gerarSlug(nome);
            idInput.value = `${slugLinha}_${slugNome}`;
        } else if (nome) {
            idInput.value = gerarSlug(nome);
        }
    }

    nomeInput.addEventListener('input', atualizarIdAutomatico);
    linhaSelect.addEventListener('change', atualizarIdAutomatico);

    // ==================== Carregar dicionários ====================
    async function loadDictionaries() {
        try {
            const resp = await fetch('/validar/api/dicionarios/todos');
            if (!resp.ok) return;
            const dicts = await resp.json();
            populateSelect(linhaSelect, dicts.linha || []);
            populateSelect(tipoSelect, dicts.tipo || []);
            populateSelect(modeloCatalogoSelect, dicts.modelo_catalogo || []);
            populateSelect(estadoSelect, dicts.estado || []);
            populateSelect(filtroLinha, dicts.linha || []);
            populateSelect(filtroTipo, dicts.tipo || []);
            populateSelect(filtroModeloCatalogo, dicts.modelo_catalogo || []);
            populateSelect(filtroEstado, dicts.estado || []);
        } catch (err) {
            console.error('Erro ao carregar dicionários', err);
        }
    }

    function populateSelect(select, options) {
        select.innerHTML = '<option value="">-- Selecionar --</option>';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt;
            select.appendChild(option);
        });
    }

    // ==================== Buscar detalhes de artigo ====================
    async function fetchArtigoDetalhes(codigo) {
        if (artigoCache.has(codigo)) return artigoCache.get(codigo);
        try {
            const resp = await fetch(`/validar/api/artigo/${codigo}`);
            if (!resp.ok) return null;
            const data = await resp.json();
            artigoCache.set(codigo, data);
            return data;
        } catch (err) {
            console.error(`Erro ao buscar ${codigo}:`, err);
            return null;
        }
    }

    // ==================== Renderizar tabela de associados (sem Descrição e Linha) ====================
    async function renderAssociados() {
        if (!associadosList) return;
        if (associados.length === 0) {
            associadosList.innerHTML = '<div style="padding: 10px; color: var(--text-secondary);">Nenhum artigo associado.</div>';
            return;
        }

        associadosList.innerHTML = '<div style="padding: 10px; text-align: center;"><i class="fas fa-spinner fa-pulse"></i> A carregar detalhes...</div>';

        for (let assoc of associados) {
            if (!assoc.detalhes) {
                const detalhes = await fetchArtigoDetalhes(assoc.codigo);
                assoc.detalhes = detalhes;
            }
        }

        const table = document.createElement('table');
        table.className = 'tabela-associados';
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr style="background-color: var(--bg-tertiary);">
                <th style="padding: 8px;">Código</th>
                <th>Nome</th>
                <th>Dimensões</th>
                <th>Tipo Cartão</th>
                <th>Ações</th>
              </tr>
        `;
        table.appendChild(thead);
        const tbodyAssoc = document.createElement('tbody');
        for (const assoc of associados) {
            const art = assoc.detalhes;
            const qtd = assoc.quantidade || 1;
            const codigoExibido = qtd > 1 ? `${qtd}x ${assoc.codigo}` : assoc.codigo;
            const nome = art?.name || '---';
            const dims = art?.oficial?.dimensoes;
            const dimensoes = dims ? `${dims.x} × ${dims.y} × ${dims.z} mm` : '---';
            let tipoCartao = art?.oficial?.tipo_cartao || '---';
            const tipoLegivel = interpretarTipoCartaoSimples(tipoCartao);
            const tipoExibido = tipoLegivel !== tipoCartao ? `${tipoCartao} (${tipoLegivel})` : tipoCartao;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 8px;"><strong>${escapeHtml(codigoExibido)}</strong></td>
                <td>${escapeHtml(nome)}</td>
                <td>${dimensoes}</td>
                <td>${escapeHtml(tipoExibido)}</td>
                <td><button class="btn-remover-assoc" data-codigo="${assoc.codigo}"><i class="fas fa-trash-alt"></i> Remover</button></td>
            `;
            tbodyAssoc.appendChild(tr);
        }
        table.appendChild(tbodyAssoc);
        associadosList.innerHTML = '';
        associadosList.appendChild(table);

        document.querySelectorAll('.btn-remover-assoc').forEach(btn => {
            btn.addEventListener('click', () => {
                const codigo = btn.dataset.codigo;
                associados = associados.filter(a => a.codigo !== codigo);
                renderAssociados();
            });
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function interpretarTipoCartaoSimples(codigo) {
        if (!codigo) return codigo;
        const tipo = codigo.toUpperCase();
        const regex = /^([A-Z]{2,3})(?:\.([A-Z]{2,3}))?(?:\.\d+)?$/;
        const match = tipo.match(regex);
        if (!match) return codigo;
        const prefixo = match[1];
        const subtipo = match[2];
        const familias = { "B": "SIMPLES", "C": "SIMPLES", "BC": "DUPLO", "ACC": "DUPLO", "BCA": "TRIPLO", "BKC": "TRIPLO" };
        const papeis = { "KK": "KRAFT", "RR": "NORMAL", "TT": "RECICLADO", "WT": "BRANCO" };
        const familia = familias[prefixo];
        const papel = subtipo ? papeis[subtipo] : null;
        const partes = [familia, papel].filter(p => p);
        return partes.length ? partes.join(" ") : codigo;
    }

    // ==================== Adicionar associado com modal personalizado ====================
    async function adicionarAssociado(codigo) {
        const existing = associados.find(a => a.codigo === codigo);
        if (existing) {
            const confirmado = await mostrarModalConfirmacao(
                `O artigo "${codigo}" já existe. Deseja adicionar mais uma unidade?`
            );
            if (confirmado) {
                existing.quantidade = (existing.quantidade || 1) + 1;
                renderAssociados();
            }
        } else {
            associados.push({ codigo: codigo, quantidade: 1, detalhes: null });
            renderAssociados();
        }
    }

    // ==================== Autocomplete ====================
    let timeoutId = null;
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.id = 'autocomplete-suggestions';
    suggestionsDiv.className = 'autocomplete-suggestions';
    suggestionsDiv.style.display = 'none';
    associarInput.parentNode.appendChild(suggestionsDiv);

    associarInput.addEventListener('input', () => {
        if (timeoutId) clearTimeout(timeoutId);
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
            } catch (err) {
                console.error('Erro no autocomplete:', err);
                suggestionsDiv.style.display = 'none';
            }
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!associarInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.style.display = 'none';
        }
    });

    btnAdicionarAssociado.addEventListener('click', async () => {
        const cod = associarInput.value.trim();
        if (cod) {
            await adicionarAssociado(cod);
            associarInput.value = '';
            suggestionsDiv.style.display = 'none';
        }
    });

    // ==================== Converter associados ====================
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

    // ==================== Carregar catálogo ====================
    async function loadCatalog() {
        loading.style.display = 'block';
        tabela.style.display = 'none';
        try {
            const resp = await fetch('/validar/api/catalogo');
            if (!resp.ok) throw new Error('Erro ao carregar catálogo');
            todosItens = await resp.json();
            aplicarFiltros();
        } catch (err) {
            console.error(err);
            alert('Não foi possível carregar o catálogo.');
        } finally {
            loading.style.display = 'none';
            tabela.style.display = 'table';
        }
    }

    // ==================== Filtragem e ordenação ====================
    function aplicarFiltros() {
        const termo = pesquisaInput.value.toLowerCase().trim();
        const filtros = {
            linha: filtroLinha.value,
            tipo: filtroTipo.value,
            modelo_catalogo: filtroModeloCatalogo.value,
            estado: filtroEstado.value,
            completo: filtroCompleto.value,
            correto_odoo: filtroCorretoOdoo.value,
            pagina_min: filtroPaginaMin.value ? parseInt(filtroPaginaMin.value) : null,
            pagina_max: filtroPaginaMax.value ? parseInt(filtroPaginaMax.value) : null
        };

        itensFiltrados = todosItens.filter(item => {
            // Filtro textual (inclui códigos dos associados)
            if (termo) {
                let searchString = `${item.id || ''} ${item.nome || ''} ${item.linha || ''} ${item.tipo || ''} ${item.modelo_catalogo || ''} ${item.estado || ''} ${item.obs || ''} ${item.correto_odoo ? 'odoo correto' : ''}`;
                const associados = item.artigos_associados || [];
                associados.forEach(entry => {
                    let codigo = '';
                    if (typeof entry === 'object' && entry.codigo) {
                        codigo = entry.codigo;
                    } else if (typeof entry === 'string') {
                        codigo = entry;
                    }
                    if (codigo) searchString += ' ' + codigo;
                });
                searchString = searchString.toLowerCase();
                if (!searchString.includes(termo)) return false;
            }

            // Filtros estruturados
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
            if (filtros.pagina_min !== null && (item.pagina === undefined || item.pagina < filtros.pagina_min)) return false;
            if (filtros.pagina_max !== null && (item.pagina === undefined || item.pagina > filtros.pagina_max)) return false;
            return true;
        });

        aplicarOrdenacao();
        paginaAtual = 1;
        selectedIds.clear();
        renderTable();
        atualizarPaginacao();
        salvarEstado();
        atualizarBotaoLimpar();
    }

    function aplicarOrdenacao() {
        if (!ordenarPor) return;
        itensFiltrados.sort((a, b) => {
            let valA, valB;
            if (ordenarPor === 'dimensoes') {
                valA = a.dimensoes.x + a.dimensoes.y + a.dimensoes.z;
                valB = b.dimensoes.x + b.dimensoes.y + b.dimensoes.z;
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
        });
    }

    function ordenarPorColuna(coluna) {
        if (ordenarPor === coluna) {
            ordemAscendente = !ordemAscendente;
        } else {
            ordenarPor = coluna;
            ordemAscendente = true;
        }
        aplicarOrdenacao();
        renderTable();
        atualizarPaginacao();
        salvarEstado();
        document.querySelectorAll('th.sortable').forEach(th => {
            const col = th.dataset.coluna;
            if (col === coluna) {
                th.classList.add(ordemAscendente ? 'asc' : 'desc');
            } else {
                th.classList.remove('asc', 'desc');
            }
        });
    }

    // ==================== Paginação ====================
    function atualizarPaginacao() {
        const totalPaginas = Math.ceil(itensFiltrados.length / LINHAS_POR_PAGINA);
        if (totalPaginas <= 1) {
            paginacaoDiv.style.display = 'none';
            return;
        }
        paginacaoDiv.style.display = 'flex';
        infoPagina.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
        btnAnterior.disabled = paginaAtual <= 1;
        btnSeguinte.disabled = paginaAtual >= totalPaginas;
    }

    function irPaginaAnterior() { if (paginaAtual > 1) { paginaAtual--; renderTable(); atualizarPaginacao(); } }
    function irPaginaSeguinte() { const total = Math.ceil(itensFiltrados.length / LINHAS_POR_PAGINA); if (paginaAtual < total) { paginaAtual++; renderTable(); atualizarPaginacao(); } }

    // ==================== Renderização da tabela principal ====================
    function renderTable() {
        const inicio = (paginaAtual - 1) * LINHAS_POR_PAGINA;
        const fim = inicio + LINHAS_POR_PAGINA;
        const arquivosPagina = itensFiltrados.slice(inicio, fim);

        tbody.innerHTML = '';
        arquivosPagina.forEach(item => {
            const tr = document.createElement('tr');
            const id = item.id;

            const tdCheck = document.createElement('td');
            tdCheck.classList.add('checkbox-col');
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.classList.add('row-select');
            chk.value = id;
            chk.checked = selectedIds.has(id);
            tdCheck.appendChild(chk);
            tr.appendChild(tdCheck);

            for (const col of colunasVisiveis) {
                const td = document.createElement('td');
                if (col === 'acoes') {
                    const dropdownDiv = document.createElement('div');
                    dropdownDiv.className = 'dropdown';
                    const btn = document.createElement('button');
                    btn.className = 'dropdown-btn';
                    btn.innerHTML = '<i class="fas fa-cog"></i>';
                    dropdownDiv.appendChild(btn);
                    const dropdownContent = document.createElement('div');
                    dropdownContent.className = 'dropdown-content';
                    const editItem = document.createElement('a');
                    editItem.href = '#';
                    editItem.className = 'dropdown-item';
                    editItem.innerHTML = '<i class="fas fa-edit"></i> Editar';
                    editItem.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openEdit(item);
                        dropdownContent.classList.remove('show');
                    });
                    const deleteItem = document.createElement('a');
                    deleteItem.href = '#';
                    deleteItem.className = 'dropdown-item';
                    deleteItem.innerHTML = '<i class="fas fa-trash-alt"></i> Eliminar';
                    deleteItem.addEventListener('click', async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await deleteItemById(item.id);
                        dropdownContent.classList.remove('show');
                    });
                    const duplicateItem = document.createElement('a');
                    duplicateItem.href = '#';
                    duplicateItem.className = 'dropdown-item';
                    duplicateItem.innerHTML = '<i class="fas fa-copy"></i> Duplicar';
                    duplicateItem.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDuplicate(item);
                        dropdownContent.classList.remove('show');
                    });
                    dropdownContent.appendChild(editItem);
                    dropdownContent.appendChild(deleteItem);
                    dropdownContent.appendChild(duplicateItem);
                    dropdownDiv.appendChild(dropdownContent);
                    td.appendChild(dropdownDiv);
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('.dropdown-content').forEach(d => {
                            if (d !== dropdownContent) d.classList.remove('show');
                        });
                        const isShowing = dropdownContent.classList.contains('show');
                        if (isShowing) {
                            dropdownContent.classList.remove('show');
                        } else {
                            const rect = dropdownDiv.getBoundingClientRect();
                            const menuHeight = dropdownContent.scrollHeight;
                            const spaceBelow = window.innerHeight - rect.bottom;
                            const spaceAbove = rect.top;
                            dropdownContent.classList.remove('up');
                            if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
                                dropdownContent.classList.add('up');
                            }
                            dropdownContent.classList.add('show');
                        }
                    });
                } else if (col === 'artigos_associados') {
                    const assocArray = item.artigos_associados || [];
                    const contagem = new Map();
                    assocArray.forEach(entry => {
                        let codigo, qtd = 1;
                        if (typeof entry === 'object' && entry !== null && entry.codigo) {
                            codigo = entry.codigo;
                            qtd = entry.quantidade || 1;
                        } else if (typeof entry === 'string') {
                            codigo = entry;
                        } else return;
                        contagem.set(codigo, (contagem.get(codigo) || 0) + qtd);
                    });
                    for (const [codigo, total] of contagem.entries()) {
                        const span = document.createElement('span');
                        span.className = 'badge-assoc';
                        span.textContent = total > 1 ? `${total}x ${codigo}` : codigo;
                        td.appendChild(span);
                    }
                } else if (col === 'dimensoes') {
                    td.textContent = `${item.dimensoes.x} x ${item.dimensoes.y} x ${item.dimensoes.z}`;
                } else if (col === 'completo') {
                    td.textContent = item.completo ? '✅' : '❌';
                } else if (col === 'correto_odoo') {
                    if (item.correto_odoo) {
                        td.innerHTML = '<i class="fas fa-check" style="color: #0d6efd; font-size: 1.2rem;"></i>';
                        td.style.textAlign = 'center';
                    } else {
                        td.textContent = '';
                    }
                } else {
                    td.textContent = item[col] !== undefined && item[col] !== null ? item[col] : '';
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });

        document.querySelectorAll('#tabela-catalogo thead th').forEach(th => {
            const coluna = th.dataset.coluna;
            if (coluna) th.style.display = colunasVisiveis.includes(coluna) ? '' : 'none';
        });

        atualizarSelectAllPagina();
        atualizarPainelSelecao();
        document.querySelectorAll('.row-select').forEach(cb => {
            cb.removeEventListener('change', handleRowSelect);
            cb.addEventListener('change', handleRowSelect);
        });
    }

    function handleRowSelect(e) {
        const id = e.target.value;
        if (e.target.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        atualizarSelectAllPagina();
        atualizarPainelSelecao();
    }

    function atualizarSelectAllPagina() {
        const checkboxes = Array.from(document.querySelectorAll('#tabela-catalogo .row-select'));
        const todosChecked = checkboxes.length > 0 && checkboxes.every(cb => cb.checked);
        selectAllCheckbox.checked = todosChecked;
        selectAllCheckbox.indeterminate = !todosChecked && checkboxes.some(cb => cb.checked);
    }

    function atualizarPainelSelecao() {
        const count = selectedIds.size;
        selectedCountSpan.textContent = count;
        const totalFiltrados = itensFiltrados.length;
        if (count > 0 && count < totalFiltrados) {
            selectAllDomainBtn.classList.remove('hidden');
            totalCountBadge.textContent = totalFiltrados;
        } else {
            selectAllDomainBtn.classList.add('hidden');
        }
        if (count > 0) selectionPanel.classList.remove('hidden');
        else selectionPanel.classList.add('hidden');
    }

    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('#tabela-catalogo .row-select');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
            const id = cb.value;
            if (e.target.checked) selectedIds.add(id);
            else selectedIds.delete(id);
        });
        atualizarSelectAllPagina();
        atualizarPainelSelecao();
    });

    unselectAllBtn.addEventListener('click', () => {
        selectedIds.clear();
        document.querySelectorAll('#tabela-catalogo .row-select').forEach(cb => cb.checked = false);
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        atualizarPainelSelecao();
    });

    selectAllDomainBtn.addEventListener('click', () => {
        itensFiltrados.forEach(item => selectedIds.add(item.id));
        document.querySelectorAll('#tabela-catalogo .row-select').forEach(cb => cb.checked = true);
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
        atualizarPainelSelecao();
    });

    // ==================== Exportações ====================
    function exportarCSV() {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        const itensSelecionados = itensFiltrados.filter(item => ids.includes(item.id));
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
                    if (typeof entry === 'object' && entry !== null && entry.codigo) {
                        codigo = entry.codigo;
                        qtd = entry.quantidade || 1;
                    } else if (typeof entry === 'string') {
                        codigo = entry;
                    } else return;
                    contagem.set(codigo, (contagem.get(codigo) || 0) + qtd);
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

    exportSelectedBtn.addEventListener('click', exportarCSV);
    if (exportDetalhadoBtn) {
        exportDetalhadoBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const ids = Array.from(selectedIds);
            if (ids.length === 0) { alert('Selecione pelo menos um item.'); return; }
            try {
                const formData = new FormData();
                formData.append('ids', JSON.stringify(ids));
                const response = await fetch('/validar/api/catalogo/exportar_excel', { method: 'POST', body: formData });
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'catalogo_detalhado.xlsx';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                } else {
                    const error = await response.json();
                    alert('Erro: ' + (error.detail || 'Falha ao exportar'));
                }
            } catch (err) { console.error(err); alert('Erro ao comunicar com o servidor.'); }
        });
    }

    // NOVA EXPORTAÇÃO DE COMPOSTOS
    if (exportCompostosBtn) {
        exportCompostosBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const ids = Array.from(selectedIds);
            if (ids.length === 0) { alert('Selecione pelo menos um item.'); return; }
            try {
                const formData = new FormData();
                formData.append('ids', JSON.stringify(ids));
                const response = await fetch('/validar/api/catalogo/exportar_formato_personalizado', { method: 'POST', body: formData });
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'catalogo_compostos.xlsx';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                } else {
                    const error = await response.json();
                    alert('Erro: ' + (error.detail || 'Falha ao exportar'));
                }
            } catch (err) { console.error(err); alert('Erro ao comunicar com o servidor.'); }
        });
    }

    // ==================== Colunas ====================
    function atualizarCheckboxesColunas() {
        const checkboxes = colunasDropdown.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => { cb.checked = colunasVisiveis.includes(cb.value); });
    }
    btnColunas.addEventListener('click', (e) => { e.stopPropagation(); colunasDropdown.classList.toggle('hidden'); atualizarCheckboxesColunas(); });
    aplicarColunas.addEventListener('click', () => {
        const checkboxes = colunasDropdown.querySelectorAll('input[type="checkbox"]');
        colunasVisiveis = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
        if (!colunasVisiveis.includes('acoes')) colunasVisiveis.push('acoes');
        localStorage.setItem('catalogo_colunas', JSON.stringify(colunasVisiveis));
        colunasDropdown.classList.add('hidden');
        renderTable();
        salvarEstado();
    });

    // ==================== Filtros ====================
    btnFiltros.addEventListener('click', (e) => { e.stopPropagation(); filtrosDropdown.classList.toggle('hidden'); });
    btnAplicarFiltros.addEventListener('click', () => { filtrosDropdown.classList.add('hidden'); aplicarFiltros(); });
    btnPesquisar.addEventListener('click', () => aplicarFiltros());
    pesquisaInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') aplicarFiltros(); });
    if (btnLimparFiltros) btnLimparFiltros.addEventListener('click', limparFiltrosCompletos);

    document.addEventListener('click', (e) => {
        if (!btnFiltros.contains(e.target) && !filtrosDropdown.contains(e.target)) filtrosDropdown.classList.add('hidden');
        if (!btnColunas.contains(e.target) && !colunasDropdown.contains(e.target)) colunasDropdown.classList.add('hidden');
        if (actionsDropdownBtn && actionsDropdownMenu && !actionsDropdownBtn.contains(e.target) && !actionsDropdownMenu.contains(e.target)) {
            actionsDropdownMenu.classList.add('hidden');
        }
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
        }
    });

    // ==================== Persistência de estado ====================
    function salvarEstado() {
        const state = {
            termo: pesquisaInput.value,
            linha: filtroLinha.value,
            tipo: filtroTipo.value,
            modelo_catalogo: filtroModeloCatalogo.value,
            estado: filtroEstado.value,
            completo: filtroCompleto.value,
            correto_odoo: filtroCorretoOdoo.value,
            pagina_min: filtroPaginaMin.value,
            pagina_max: filtroPaginaMax.value,
            ordenarPor: ordenarPor,
            ordemAscendente: ordemAscendente,
            paginaAtual: paginaAtual
        };
        sessionStorage.setItem('catalogo_state', JSON.stringify(state));
    }

    function carregarEstado() {
        const saved = sessionStorage.getItem('catalogo_state');
        if (!saved) return;
        try {
            const state = JSON.parse(saved);
            pesquisaInput.value = state.termo || '';
            filtroLinha.value = state.linha || '';
            filtroTipo.value = state.tipo || '';
            filtroModeloCatalogo.value = state.modelo_catalogo || '';
            filtroEstado.value = state.estado || '';
            filtroCompleto.value = state.completo || '';
            filtroCorretoOdoo.value = state.correto_odoo || '';
            filtroPaginaMin.value = state.pagina_min !== undefined ? state.pagina_min : '';
            filtroPaginaMax.value = state.pagina_max !== undefined ? state.pagina_max : '';
            ordenarPor = state.ordenarPor || null;
            ordemAscendente = state.ordemAscendente !== undefined ? state.ordemAscendente : true;
            paginaAtual = state.paginaAtual || 1;
        } catch (e) {}
    }

    // ==================== Formulário ====================
    function openNew() {
        editMode = false;
        idInput.value = '';
        if (hiddenIdInput) hiddenIdInput.value = '';
        idInput.readOnly = false;
        nomeInput.value = '';
        dimX.value = '';
        dimY.value = '';
        dimZ.value = '';
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
        if (suggestionsDiv) suggestionsDiv.style.display = 'none';
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
        if (suggestionsDiv) suggestionsDiv.style.display = 'none';
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
        if (suggestionsDiv) suggestionsDiv.style.display = 'none';
    }

    function closeForm() {
        viewForm.classList.add('hidden');
        viewTable.classList.remove('hidden');
        loadCatalog();
    }

    // ==================== Modal de confirmação ====================
    function mostrarModalConfirmacao(mensagem) {
        return new Promise((resolve) => {
            const modal = document.getElementById('modal-validacao');
            const tituloEl = document.getElementById('modal-titulo');
            const msgEl = document.getElementById('modal-mensagem');
            const sim = document.getElementById('modal-sim');
            const nao = document.getElementById('modal-nao');
            if (!modal || !tituloEl || !msgEl || !sim || !nao) { resolve(confirm(mensagem)); return; }
            tituloEl.textContent = 'Confirmar';
            msgEl.textContent = mensagem;
            modal.classList.add('show');
            const handlerSim = () => {
                modal.classList.remove('show');
                sim.removeEventListener('click', handlerSim);
                nao.removeEventListener('click', handlerNao);
                resolve(true);
            };
            const handlerNao = () => {
                modal.classList.remove('show');
                sim.removeEventListener('click', handlerSim);
                nao.removeEventListener('click', handlerNao);
                resolve(false);
            };
            sim.addEventListener('click', handlerSim);
            nao.addEventListener('click', handlerNao);
        });
    }

    async function deleteItemById(id) {
        const confirmado = await mostrarModalConfirmacao(`Eliminar item ${id}?`);
        if (!confirmado) return;
        try {
            const resp = await fetch(`/validar/api/catalogo/${id}`, { method: 'DELETE' });
            if (resp.ok) loadCatalog();
            else alert('Erro ao eliminar');
        } catch (err) { console.error(err); }
    }

    // ==================== Submeter formulário ====================
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
        if (!editMode && todosItens.some(item => item.id === id)) {
            alert(`Já existe um item com o ID "${id}". Por favor, altere o nome ou a linha para gerar um ID único.`);
            return;
        }
        let artigos_associados = [];
        associados.forEach(assoc => {
            const qtd = assoc.quantidade || 1;
            for (let i = 0; i < qtd; i++) artigos_associados.push(assoc.codigo);
        });
        const data = {
            id, nome, dimensoes: { x, y, z }, linha: linhaSelect.value, tipo: tipoSelect.value,
            modelo_catalogo: modeloCatalogoSelect.value, estado: estadoSelect.value,
            pagina: paginaInput.value ? parseInt(paginaInput.value) : null, completo: completoCheckbox.checked,
            correto_odoo: corretoOdooCheckbox.checked,
            artigos_associados, obs: obsTextarea.value
        };
        try {
            const resp = await fetch('/validar/api/catalogo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (resp.ok) closeForm();
            else { const err = await resp.json(); alert('Erro: ' + (err.detail || 'Falha ao guardar')); }
        } catch (err) { console.error(err); alert('Erro de comunicação'); }
    });

    // ==================== Eventos de ordenação ====================
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => ordenarPorColuna(th.dataset.coluna));
    });

    btnAnterior.addEventListener('click', irPaginaAnterior);
    btnSeguinte.addEventListener('click', irPaginaSeguinte);
    if (actionsDropdownBtn && actionsDropdownMenu) {
        actionsDropdownBtn.addEventListener('click', (e) => { e.stopPropagation(); actionsDropdownMenu.classList.toggle('hidden'); });
    }
    btnNovo.addEventListener('click', openNew);
    btnBack.addEventListener('click', closeForm);
    cancelFormBtn.addEventListener('click', closeForm);

    // ==================== Inicialização ====================
    carregarEstado();
    loadDictionaries();
    loadCatalog();
});