// pesquisa.js - Versão com persistência fiel de colunas, normalização, debounce e melhorias UX

window.addEventListener('DOMContentLoaded', () => {

    // ==================== Elementos DOM ====================
    const pesquisaInput = document.getElementById('pesquisa');
    const btnPesquisar = document.getElementById('btn-pesquisar');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
    const tabela = document.getElementById('resultados');
    const tbody = tabela.querySelector('tbody');
    const cabecalhos = tabela.querySelectorAll('thead th');
    const paginacaoDiv = document.querySelector('.paginacao');
    const btnFiltros = document.getElementById('btn-filtros');
    const filtrosDropdown = document.getElementById('filtros-dropdown');
    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
    const btnColunas = document.getElementById('btn-colunas');
    const colunasDropdown = document.getElementById('colunas-dropdown');
    const aplicarColunas = document.getElementById('aplicar-colunas');
    const actionsDropdownBtn = document.getElementById('actionsDropdownBtn');
    const actionsDropdownMenu = document.getElementById('actionsDropdownMenu');
    const infoPagina = document.getElementById('info-pagina');
    const btnAnterior = document.getElementById('btn-anterior');
    const btnSeguinte = document.getElementById('btn-seguinte');
    const selectAllCheckbox = document.getElementById('select-all');
    const searchBar = document.getElementById('search-bar');
    const selectionPanel = document.getElementById('selection-panel');
    const selectedCountSpan = document.getElementById('selected-count');
    const unselectAllBtn = document.getElementById('unselect-all');
    const exportSelectedBtn = document.getElementById('export-selected');
    const selectAllDomainBtn = document.getElementById('select-all-domain');
    const totalCountBadge = document.getElementById('total-count-badge');
    const loadingDiv = document.getElementById('loading');

    // ==================== Constantes ====================
    const STORAGE_KEY = 'artigos_search_state';
    const LINHAS_POR_PAGINA = 24;
    const DEBOUNCE_DELAY = 300;
    // Apenas usada se não houver nada guardado
    const COLUNAS_PADRAO = ['codigo', 'name', 'descricao', 'categoria', 'linha', 'tipo', 'modelo_catalogo', 'estado', 'ultimo_preco', 'acoes'];

    // ==================== Estado ====================
    let todosArtigos = [];
    let artigosFiltrados = [];
    let paginaAtual = 1;
    let selectedCodigos = new Set();
    let colunasVisiveis = [...COLUNAS_PADRAO];
    let ordenarPor = null;
    let ordemAscendente = true;
    let debounceTimer = null;

    // --- Persistência de colunas (CORRIGIDA: sem união forçada com as padrão) ---
    const colunasGuardadas = localStorage.getItem('colunasVisiveis');
    if (colunasGuardadas) {
        try {
            const parsed = JSON.parse(colunasGuardadas);
            if (Array.isArray(parsed) && parsed.length > 0) {
                colunasVisiveis = parsed;
                // Garantir que a coluna "ações" nunca desaparece
                if (!colunasVisiveis.includes('acoes')) colunasVisiveis.push('acoes');
            }
        } catch (e) { /* ignorar */ }
    }

    // ==================== Funções auxiliares ====================
    function showLoader() {
        loadingDiv.style.display = 'block';
        tabela.style.display = 'none';
        if (paginacaoDiv) paginacaoDiv.style.display = 'none';
    }

    function hideLoader() {
        loadingDiv.style.display = 'none';
        tabela.style.display = 'table';
        if (paginacaoDiv) paginacaoDiv.style.display = 'flex';
    }

    function normalizeString(str) {
        return String(str || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    const campoPorHeader = {
        'Código': 'codigo',
        'Nome': 'name',
        'Descrição': 'descricao',
        'Categoria': 'categoria',
        'Linha': 'linha',
        'Tipo': 'tipo',
        'Modelo Catálogo': 'modelo_catalogo',
        'Estado': 'estado',
        'Preço unit.': 'ultimo_preco',
        'Qtd vs Preço': 'quantidade_vs_preco',
        'Último preço': 'ultimo_preco',
        'Último ano': 'ultimo_ano',
        'Nome do Vendedor': 'seller_product_name',
        'Observações': 'obs',
        'Modelo': 'modelo',
        'Tipo Cartão': 'tipo_cartao',
        'Dimensão X': 'dimensao_x',
        'Dimensão Y': 'dimensao_y',
        'Dimensão Z': 'dimensao_z',
        'Última Fatura': 'ultima_fatura',
        'Ações': null
    };

    function getValorCampo(art, campo) {
        if (campo === 'codigo') return art.codigo ?? '';
        if (campo === 'name') return art.name ?? '';
        if (campo === 'descricao') return art.oficial?.descricao ?? '';
        if (campo === 'categoria') return art.categoria ?? '';
        if (campo === 'linha') return art.linha ?? '';
        if (campo === 'tipo') return art.tipo ?? '';
        if (campo === 'modelo_catalogo') return art.modelo_catalogo ?? '';
        if (campo === 'estado') return art.estado ?? '';
        if (campo === 'ultimo_preco') return art.ultimo_preco ?? '';
        if (campo === 'ultimo_ano') return art.ultimo_ano ?? '';
        if (campo === 'seller_product_name') return art.seller_product_name ?? '';
        if (campo === 'obs') return art.obs ?? '';
        if (campo === 'modelo') return art.oficial?.modelo ?? '';
        if (campo === 'tipo_cartao') return art.oficial?.tipo_cartao ?? '';
        if (campo === 'dimensao_x') return art.oficial?.dimensoes?.x ?? '';
        if (campo === 'dimensao_y') return art.oficial?.dimensoes?.y ?? '';
        if (campo === 'dimensao_z') return art.oficial?.dimensoes?.z ?? '';
        if (campo === 'ultima_fatura') return art.ultima_fatura ?? '';
        if (campo === 'quantidade_vs_preco') {
            const qvp = art.quantidade_vs_preco;
            if (!qvp) return '';
            return Object.entries(qvp).map(([q, dados]) => `${q}: ${dados.preco_medio}`).join('; ');
        }
        return '';
    }

    // ==================== Deteção de filtros ativos ====================
    function existemFiltrosAtivos() {
        if (pesquisaInput.value.trim() !== '') return true;
        const selects = ['categoria', 'linha', 'tipo', 'modelo_catalogo', 'estado', 'tipo_cartao'];
        for (let id of selects) {
            const el = document.getElementById(`filtro-${id}`);
            if (el && el.value !== '') return true;
        }
        const textos = ['seller-product-name', 'obs', 'modelo', 'ultima-fatura'];
        for (let id of textos) {
            const el = document.getElementById(`filtro-${id}`);
            if (el && el.value.trim() !== '') return true;
        }
        const numeros = ['dimensao-x', 'dimensao-y', 'dimensao-z'];
        for (let id of numeros) {
            const el = document.getElementById(`filtro-${id}`);
            if (el && el.value !== '') return true;
        }
        return false;
    }

    function atualizarBotaoLimpar() {
        if (btnLimparFiltros) {
            btnLimparFiltros.style.display = existemFiltrosAtivos() ? 'inline-flex' : 'none';
        }
    }

    function limparFiltrosCompletos() {
        pesquisaInput.value = '';
        const selects = ['categoria', 'linha', 'tipo', 'modelo_catalogo', 'estado', 'tipo_cartao'];
        selects.forEach(id => { const el = document.getElementById(`filtro-${id}`); if (el) el.value = ''; });
        const textos = ['seller-product-name', 'obs', 'modelo', 'ultima-fatura'];
        textos.forEach(id => { const el = document.getElementById(`filtro-${id}`); if (el) el.value = ''; });
        const dims = ['dimensao-x', 'dimensao-y', 'dimensao-z'];
        dims.forEach(id => { const el = document.getElementById(`filtro-${id}`); if (el) el.value = ''; });
        aplicarFiltros();
        atualizarBotaoLimpar();
    }

    // ==================== Persistência de estado da pesquisa ====================
    function saveSearchState() {
        const state = {
            termo: pesquisaInput.value,
            categoria: document.getElementById('filtro-categoria').value,
            linha: document.getElementById('filtro-linha').value,
            tipo: document.getElementById('filtro-tipo').value,
            modelo_catalogo: document.getElementById('filtro-modelo-catalogo').value,
            estado: document.getElementById('filtro-estado').value,
            seller_product_name: document.getElementById('filtro-seller-product-name').value,
            obs: document.getElementById('filtro-obs').value,
            modelo: document.getElementById('filtro-modelo').value,
            tipo_cartao: document.getElementById('filtro-tipo-cartao').value,
            dimensao_x: document.getElementById('filtro-dimensao-x').value,
            dimensao_y: document.getElementById('filtro-dimensao-y').value,
            dimensao_z: document.getElementById('filtro-dimensao-z').value,
            ultima_fatura: document.getElementById('filtro-ultima-fatura').value,
            ordenarPor: ordenarPor,
            ordemAscendente: ordemAscendente,
            paginaAtual: paginaAtual
        };
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function loadSearchState() {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (!saved) return null;
        try { return JSON.parse(saved); } catch { return null; }
    }

    async function restoreAndRefresh() {
        const state = loadSearchState();
        if (!state) return false;
        pesquisaInput.value = state.termo || '';
        document.getElementById('filtro-categoria').value = state.categoria || '';
        document.getElementById('filtro-linha').value = state.linha || '';
        document.getElementById('filtro-tipo').value = state.tipo || '';
        document.getElementById('filtro-modelo-catalogo').value = state.modelo_catalogo || '';
        document.getElementById('filtro-estado').value = state.estado || '';
        document.getElementById('filtro-seller-product-name').value = state.seller_product_name || '';
        document.getElementById('filtro-obs').value = state.obs || '';
        document.getElementById('filtro-modelo').value = state.modelo || '';
        document.getElementById('filtro-tipo-cartao').value = state.tipo_cartao || '';
        document.getElementById('filtro-dimensao-x').value = state.dimensao_x || '';
        document.getElementById('filtro-dimensao-y').value = state.dimensao_y || '';
        document.getElementById('filtro-dimensao-z').value = state.dimensao_z || '';
        document.getElementById('filtro-ultima-fatura').value = state.ultima_fatura || '';
        ordenarPor = state.ordenarPor || null;
        ordemAscendente = state.ordemAscendente !== undefined ? state.ordemAscendente : true;
        paginaAtual = state.paginaAtual || 1;
        await carregarTodosArtigos();
        aplicarFiltros(); // já chama renderizarTabela e saveSearchState
        atualizarBotaoLimpar();
        return true;
    }

    // ==================== Carregamento de dados ====================
    async function carregarDicionarios() {
        try {
            const resp = await fetch('/validar/api/dicionarios/todos');
            if (!resp.ok) return;
            const dicionarios = await resp.json();
            const selects = {
                categoria: document.getElementById('filtro-categoria'),
                linha: document.getElementById('filtro-linha'),
                tipo: document.getElementById('filtro-tipo'),
                modelo_catalogo: document.getElementById('filtro-modelo-catalogo'),
                estado: document.getElementById('filtro-estado'),
                tipo_cartao: document.getElementById('filtro-tipo-cartao')
            };
            for (const [key, select] of Object.entries(selects)) {
                if (dicionarios[key] && select) {
                    dicionarios[key].forEach(op => {
                        const option = document.createElement('option');
                        option.value = op;
                        option.textContent = op;
                        select.appendChild(option);
                    });
                }
            }
        } catch (err) {
            console.error('Erro ao carregar dicionários:', err);
        }
    }

    async function carregarTodosArtigos() {
        showLoader();
        try {
            const resp = await fetch('/validar/api/artigos?q=');
            if (!resp.ok) throw new Error('Erro ao carregar artigos');
            todosArtigos = await resp.json();
            artigosFiltrados = [...todosArtigos];
            // Sincronizar checkboxes do dropdown de colunas
            document.querySelectorAll('#colunas-dropdown input[type="checkbox"]').forEach(cb => {
                cb.checked = colunasVisiveis.includes(cb.value);
            });
            renderizarTabela();
            selectedCodigos.clear();
            atualizarPainelSelecao();
            atualizarBotaoLimpar();
        } catch (err) {
            console.error(err);
            alert('Não foi possível carregar a base de dados.');
        } finally {
            hideLoader();
        }
    }

    // ==================== Filtragem e ordenação ====================
    function aplicarFiltros() {
        const termoNormalizado = normalizeString(pesquisaInput.value);
        const filtros = {
            categoria: document.getElementById('filtro-categoria').value,
            linha: document.getElementById('filtro-linha').value,
            tipo: document.getElementById('filtro-tipo').value,
            modelo_catalogo: document.getElementById('filtro-modelo-catalogo').value,
            estado: document.getElementById('filtro-estado').value,
            seller_product_name: normalizeString(document.getElementById('filtro-seller-product-name').value),
            obs: normalizeString(document.getElementById('filtro-obs').value),
            modelo: normalizeString(document.getElementById('filtro-modelo').value),
            tipo_cartao: document.getElementById('filtro-tipo-cartao').value,
            dimensao_x: document.getElementById('filtro-dimensao-x').value,
            dimensao_y: document.getElementById('filtro-dimensao-y').value,
            dimensao_z: document.getElementById('filtro-dimensao-z').value,
            ultima_fatura: normalizeString(document.getElementById('filtro-ultima-fatura').value)
        };

        artigosFiltrados = todosArtigos.filter(art => {
            if (termoNormalizado) {
                const match = normalizeString(art.codigo).includes(termoNormalizado) ||
                    normalizeString(art.name).includes(termoNormalizado) ||
                    normalizeString(art.seller_product_name).includes(termoNormalizado) ||
                    normalizeString(art.obs).includes(termoNormalizado) ||
                    normalizeString(art.oficial?.descricao).includes(termoNormalizado);
                if (!match) return false;
            }
            if (filtros.categoria && art.categoria !== filtros.categoria) return false;
            if (filtros.linha && art.linha !== filtros.linha) return false;
            if (filtros.tipo && art.tipo !== filtros.tipo) return false;
            if (filtros.modelo_catalogo && art.modelo_catalogo !== filtros.modelo_catalogo) return false;
            if (filtros.estado && art.estado !== filtros.estado) return false;
            if (filtros.tipo_cartao && art.oficial?.tipo_cartao !== filtros.tipo_cartao) return false;
            if (filtros.seller_product_name && !normalizeString(art.seller_product_name).includes(filtros.seller_product_name)) return false;
            if (filtros.obs && !normalizeString(art.obs).includes(filtros.obs)) return false;
            if (filtros.modelo && !normalizeString(art.oficial?.modelo).includes(filtros.modelo)) return false;
            if (filtros.ultima_fatura && !normalizeString(art.ultima_fatura).includes(filtros.ultima_fatura)) return false;
            if (filtros.dimensao_x && Number(art.oficial?.dimensoes?.x) !== Number(filtros.dimensao_x)) return false;
            if (filtros.dimensao_y && Number(art.oficial?.dimensoes?.y) !== Number(filtros.dimensao_y)) return false;
            if (filtros.dimensao_z && Number(art.oficial?.dimensoes?.z) !== Number(filtros.dimensao_z)) return false;
            return true;
        });

        if (ordenarPor) {
            const camposNumericos = ['ultimo_preco', 'ultimo_ano', 'dimensao_x', 'dimensao_y', 'dimensao_z'];
            artigosFiltrados.sort((a, b) => {
                let valA = getValorCampo(a, ordenarPor);
                let valB = getValorCampo(b, ordenarPor);
                if (camposNumericos.includes(ordenarPor)) {
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                } else {
                    valA = String(valA).toLowerCase();
                    valB = String(valB).toLowerCase();
                }
                if (valA < valB) return ordemAscendente ? -1 : 1;
                if (valA > valB) return ordemAscendente ? 1 : -1;
                return 0;
            });
        }

        selectedCodigos.clear();
        atualizarPainelSelecao();
        paginaAtual = 1;
        renderizarTabela();
        saveSearchState();
        atualizarBotaoLimpar();
    }

    const aplicarFiltrosDebounced = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => aplicarFiltros(), DEBOUNCE_DELAY);
    };

    // ==================== Renderização da tabela ====================
    function renderizarTabela() {
        const inicio = (paginaAtual - 1) * LINHAS_POR_PAGINA;
        const fim = inicio + LINHAS_POR_PAGINA;
        const artigosPagina = artigosFiltrados.slice(inicio, fim);

        tbody.innerHTML = '';
        for (const art of artigosPagina) {
            const tr = document.createElement('tr');
            const codigo = art.codigo;
            const tdCheck = document.createElement('td');
            tdCheck.classList.add('checkbox-col');
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.classList.add('row-select');
            chk.value = codigo;
            chk.checked = selectedCodigos.has(codigo);
            tdCheck.appendChild(chk);
            tr.appendChild(tdCheck);
            for (const col of colunasVisiveis) {
                const td = document.createElement('td');
                if (col === 'acoes') {
                    const link = document.createElement('a');
                    link.href = `/validar/artigo/${encodeURIComponent(codigo)}`;
                    link.textContent = 'Ver';
                    td.appendChild(link);
                } else {
                    td.textContent = getValorCampo(art, col);
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        }

        cabecalhos.forEach(th => {
            const coluna = th.dataset.coluna;
            if (coluna) {
                th.style.display = colunasVisiveis.includes(coluna) ? '' : 'none';
            }
        });

        const totalPaginas = Math.ceil(artigosFiltrados.length / LINHAS_POR_PAGINA) || 1;
        infoPagina.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
        btnAnterior.disabled = paginaAtual <= 1;
        btnSeguinte.disabled = paginaAtual >= totalPaginas;
        atualizarSelectAllPagina();
    }

    // ==================== Gestão de selecção ====================
    function atualizarSelectAllPagina() {
        const checkboxesPagina = Array.from(document.querySelectorAll('#resultados tbody .row-select'));
        const todosChecked = checkboxesPagina.length > 0 && checkboxesPagina.every(cb => cb.checked);
        selectAllCheckbox.checked = todosChecked;
        selectAllCheckbox.indeterminate = !todosChecked && checkboxesPagina.some(cb => cb.checked);
    }

    function atualizarPainelSelecao() {
        const count = selectedCodigos.size;
        selectedCountSpan.textContent = count;
        const totalFiltrados = artigosFiltrados.length;
        if (count > 0 && count < totalFiltrados) {
            selectAllDomainBtn.classList.remove('hidden');
            totalCountBadge.textContent = totalFiltrados;
        } else {
            selectAllDomainBtn.classList.add('hidden');
        }
        if (count > 0) {
            if (searchBar) searchBar.style.display = 'none';
            selectionPanel.style.display = 'flex';
        } else {
            if (searchBar) searchBar.style.display = 'flex';
            selectionPanel.style.display = 'none';
        }
    }

    // ==================== Eventos ====================
    function bindEvents() {
        btnPesquisar.addEventListener('click', () => aplicarFiltros());
        pesquisaInput.addEventListener('input', aplicarFiltrosDebounced);
        pesquisaInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') aplicarFiltros(); });
        if (btnLimparFiltros) btnLimparFiltros.addEventListener('click', limparFiltrosCompletos);

        btnAnterior.addEventListener('click', () => {
            if (paginaAtual > 1) { paginaAtual--; renderizarTabela(); saveSearchState(); }
        });
        btnSeguinte.addEventListener('click', () => {
            const totalPaginas = Math.ceil(artigosFiltrados.length / LINHAS_POR_PAGINA);
            if (paginaAtual < totalPaginas) { paginaAtual++; renderizarTabela(); saveSearchState(); }
        });

        btnFiltros.addEventListener('click', (e) => { e.stopPropagation(); filtrosDropdown.classList.toggle('hidden'); });
        btnAplicarFiltros.addEventListener('click', () => { filtrosDropdown.classList.add('hidden'); aplicarFiltros(); });

        // Auto-aplicação de filtros em selects e inputs (excepto pesquisa)
        const autoApplyElements = [
            ...document.querySelectorAll('#filtros-dropdown select'),
            ...document.querySelectorAll('#filtros-dropdown input[type="text"]:not(#pesquisa)')
        ];
        autoApplyElements.forEach(el => {
            if (el) el.addEventListener('change', aplicarFiltros);
            if (el && el.type === 'text') el.addEventListener('input', aplicarFiltrosDebounced);
        });

        btnColunas.addEventListener('click', (e) => { e.stopPropagation(); colunasDropdown.classList.toggle('hidden'); });
        aplicarColunas.addEventListener('click', () => {
            const checkboxes = colunasDropdown.querySelectorAll('input[type="checkbox"]');
            const novasColunas = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
            if (novasColunas.length === 0) {
                alert("Tem de deixar pelo menos uma coluna visível.");
                return;
            }
            colunasVisiveis = novasColunas;
            if (!colunasVisiveis.includes('acoes')) colunasVisiveis.push('acoes');
            localStorage.setItem('colunasVisiveis', JSON.stringify(colunasVisiveis));
            colunasDropdown.classList.add('hidden');
            renderizarTabela();
            saveSearchState();
        });

        document.addEventListener('click', (e) => {
            if (!btnFiltros.contains(e.target) && !filtrosDropdown.contains(e.target)) filtrosDropdown.classList.add('hidden');
            if (!btnColunas.contains(e.target) && !colunasDropdown.contains(e.target)) colunasDropdown.classList.add('hidden');
            if (actionsDropdownBtn && actionsDropdownMenu && !actionsDropdownBtn.contains(e.target) && !actionsDropdownMenu.contains(e.target)) {
                actionsDropdownMenu.classList.add('hidden');
            }
        });

        tbody.addEventListener('change', (e) => {
            if (e.target.classList.contains('row-select')) {
                const codigo = e.target.value;
                if (e.target.checked) selectedCodigos.add(codigo);
                else selectedCodigos.delete(codigo);
                atualizarPainelSelecao();
                atualizarSelectAllPagina();
            }
        });

        selectAllCheckbox.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('#resultados tbody .row-select');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                const codigo = cb.value;
                if (e.target.checked) selectedCodigos.add(codigo);
                else selectedCodigos.delete(codigo);
            });
            atualizarPainelSelecao();
        });

        selectAllDomainBtn.addEventListener('click', () => {
            artigosFiltrados.forEach(art => selectedCodigos.add(art.codigo));
            document.querySelectorAll('#resultados tbody .row-select').forEach(cb => cb.checked = true);
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
            atualizarPainelSelecao();
        });

        unselectAllBtn.addEventListener('click', () => {
            selectedCodigos.clear();
            document.querySelectorAll('#resultados tbody .row-select').forEach(cb => cb.checked = false);
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            atualizarPainelSelecao();
        });

        exportSelectedBtn.addEventListener('click', async () => {
            const codigos = Array.from(selectedCodigos);
            if (codigos.length === 0) { alert('Nenhum artigo selecionado.'); return; }
            try {
                const response = await fetch('/validar/api/artigos/exportar_excel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ codigos })
                });
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Erro ao exportar');
                }
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'artigos_selecionados.xlsx';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            } catch (err) {
                alert('Erro na exportação: ' + err.message);
            }
        });

        if (actionsDropdownBtn && actionsDropdownMenu) {
            actionsDropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                actionsDropdownMenu.classList.toggle('hidden');
            });
        }

        cabecalhos.forEach(th => {
            const campo = campoPorHeader[th.textContent.trim()];
            if (campo) {
                th.addEventListener('click', () => {
                    if (ordenarPor === campo) ordemAscendente = !ordemAscendente;
                    else { ordenarPor = campo; ordemAscendente = true; }
                    aplicarFiltros();
                });
            }
        });
    }

    // ==================== Inicialização ====================
    async function init() {
        bindEvents();
        await carregarDicionarios();
        const restored = await restoreAndRefresh();
        if (!restored) await carregarTodosArtigos();
        window.addEventListener('beforeunload', () => saveSearchState());
        window.addEventListener('pageshow', (event) => { if (event.persisted) restoreAndRefresh(); });
    }

    init();
});