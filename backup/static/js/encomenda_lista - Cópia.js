// encomenda_lista.js
import * as Utils from './encomenda_comum.js';

(function() {
    // ==================== Elementos DOM (listagem) ====================
    const viewTable = document.getElementById('view-table');
    // Se não estivermos na página de listagem, saímos silenciosamente
    if (!viewTable) {
        console.warn('encomenda_lista.js: view-table não encontrado. Script não será executado.');
        return;
    }

    const viewForm = document.getElementById('view-form');
    const loadingDiv = document.getElementById('loading');
    const tabelaEncomendas = document.getElementById('tabela-encomendas');
    const tbodyListagem = tabelaEncomendas ? tabelaEncomendas.querySelector('tbody') : null;
    const pesquisaInput = document.getElementById('pesquisa');
    const btnPesquisar = document.getElementById('btn-pesquisar');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
    const btnFiltros = document.getElementById('btn-filtros');
    const filtrosDropdown = document.getElementById('filtros-dropdown');
    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
    const btnColunas = document.getElementById('btn-colunas');
    const colunasDropdown = document.getElementById('colunas-dropdown');
    const aplicarColunas = document.getElementById('aplicar-colunas');
    const actionsDropdownBtn = document.getElementById('actionsDropdownBtn');
    const actionsDropdownMenu = document.getElementById('actionsDropdownMenu');
    const paginacaoDiv = document.getElementById('paginacao');
    const infoPagina = document.getElementById('info-pagina');
    const btnAnteriorPag = document.getElementById('btn-anterior');
    const btnSeguintePag = document.getElementById('btn-seguinte');
    const selectAll = document.getElementById('select-all');
    const selectionPanel = document.getElementById('selection-panel');
    const selectedCountSpan = document.getElementById('selected-count');
    const unselectAll = document.getElementById('unselect-all');
    const exportSelectedBtn = document.getElementById('export-selected');
    const selectAllDomainBtn = document.getElementById('select-all-domain');
    const totalCountBadge = document.getElementById('total-count-badge');

    // ==================== Estado da listagem ====================
    let encomendas = [];
    let encomendasFiltradas = [];
    let paginaAtual = 1;
    let selectedIds = new Set();
    let colunasVisiveis = [...Utils.COLUNAS_PADRAO];
    let ordenarPor = null;
    let ordemAscendente = true;
    let debounceTimer = null;

    // ==================== Persistência de colunas ====================
    const colunasGuardadas = localStorage.getItem('encomendas_colunas');
    if (colunasGuardadas) {
        try {
            const parsed = JSON.parse(colunasGuardadas);
            if (Array.isArray(parsed) && parsed.length > 0) {
                colunasVisiveis = parsed;
                if (!colunasVisiveis.includes('acoes')) colunasVisiveis.push('acoes');
            }
        } catch(e) {}
    }

    // ==================== Utilitários específicos da lista ====================
    function showLoading() {
        Utils.showLoading(loadingDiv, tabelaEncomendas, paginacaoDiv);
    }

    function hideLoading() {
        Utils.hideLoading(loadingDiv, tabelaEncomendas, paginacaoDiv);
    }

    // ==================== Deteção de filtros ativos ====================
    function existemFiltrosAtivos() {
        if (pesquisaInput && pesquisaInput.value.trim() !== '') return true;
        const campos = ['cliente', 'projeto', 'ref_cliente', 'obs'];
        for (let id of campos) {
            const el = document.getElementById(`filtro-${id}`);
            if (el && el.value.trim() !== '') return true;
        }
        const dataInicio = document.getElementById('filtro-data-inicio')?.value;
        const dataFim = document.getElementById('filtro-data-fim')?.value;
        if (dataInicio || dataFim) return true;
        return false;
    }

    function atualizarBotaoLimpar() {
        if (btnLimparFiltros) {
            btnLimparFiltros.style.display = existemFiltrosAtivos() ? 'inline-flex' : 'none';
        }
    }

    function limparFiltrosCompletos() {
        if (pesquisaInput) pesquisaInput.value = '';
        const campos = ['cliente', 'projeto', 'ref_cliente', 'obs'];
        campos.forEach(id => { const el = document.getElementById(`filtro-${id}`); if (el) el.value = ''; });
        const dataInicio = document.getElementById('filtro-data-inicio');
        const dataFim = document.getElementById('filtro-data-fim');
        if (dataInicio) dataInicio.value = '';
        if (dataFim) dataFim.value = '';
        aplicarFiltros();
        atualizarBotaoLimpar();
    }

    // ==================== Persistência de estado ====================
    function saveListState() {
        const state = {
            termo: pesquisaInput ? pesquisaInput.value : '',
            cliente: document.getElementById('filtro-cliente')?.value || '',
            projeto: document.getElementById('filtro-projeto')?.value || '',
            ref_cliente: document.getElementById('filtro-ref-cliente')?.value || '',
            obs: document.getElementById('filtro-obs')?.value || '',
            data_inicio: document.getElementById('filtro-data-inicio')?.value || '',
            data_fim: document.getElementById('filtro-data-fim')?.value || '',
            ordenarPor: ordenarPor,
            ordemAscendente: ordemAscendente,
            paginaAtual: paginaAtual,
            colunasVisiveis: colunasVisiveis
        };
        sessionStorage.setItem(Utils.STORAGE_KEY, JSON.stringify(state));
    }

    function loadListState() {
        const saved = sessionStorage.getItem(Utils.STORAGE_KEY);
        if (!saved) return null;
        try { return JSON.parse(saved); } catch { return null; }
    }

    async function restoreListState() {
        const state = loadListState();
        if (!state) return false;
        if (pesquisaInput) pesquisaInput.value = state.termo || '';
        const elCliente = document.getElementById('filtro-cliente');
        if (elCliente) elCliente.value = state.cliente || '';
        const elProjeto = document.getElementById('filtro-projeto');
        if (elProjeto) elProjeto.value = state.projeto || '';
        const elRef = document.getElementById('filtro-ref-cliente');
        if (elRef) elRef.value = state.ref_cliente || '';
        const elObs = document.getElementById('filtro-obs');
        if (elObs) elObs.value = state.obs || '';
        const elDataIni = document.getElementById('filtro-data-inicio');
        if (elDataIni) elDataIni.value = state.data_inicio || '';
        const elDataFim = document.getElementById('filtro-data-fim');
        if (elDataFim) elDataFim.value = state.data_fim || '';
        
        ordenarPor = state.ordenarPor || null;
        ordemAscendente = state.ordemAscendente !== undefined ? state.ordemAscendente : true;
        paginaAtual = state.paginaAtual || 1;
        if (state.colunasVisiveis) colunasVisiveis = state.colunasVisiveis;
        await carregarEncomendas();
        aplicarFiltros();
        atualizarBotaoLimpar();
        return true;
    }

    // ==================== Carregar dados ====================
    async function carregarEncomendas() {
        showLoading();
        try {
            const resp = await fetch('/validar/api/encomendas');
            if (!resp.ok) throw new Error();
            encomendas = await resp.json();
            document.querySelectorAll('#colunas-dropdown input[type="checkbox"]').forEach(cb => {
                cb.checked = colunasVisiveis.includes(cb.value);
            });
            aplicarFiltros();
        } catch (err) {
            console.error(err);
            alert('Erro ao carregar encomendas');
        } finally {
            hideLoading();
        }
    }

    // ==================== Filtragem e ordenação ====================
    function aplicarFiltros() {
        if (!encomendas) return;
        const termo = pesquisaInput ? Utils.normalizeString(pesquisaInput.value) : '';
        const filtroCliente = Utils.normalizeString(document.getElementById('filtro-cliente')?.value || '');
        const filtroProjeto = Utils.normalizeString(document.getElementById('filtro-projeto')?.value || '');
        const filtroRefCliente = Utils.normalizeString(document.getElementById('filtro-ref-cliente')?.value || '');
        const filtroObs = Utils.normalizeString(document.getElementById('filtro-obs')?.value || '');
        const dataInicio = document.getElementById('filtro-data-inicio')?.value;
        const dataFim = document.getElementById('filtro-data-fim')?.value;

        encomendasFiltradas = encomendas.filter(enc => {
            if (termo && !Utils.normalizeString(enc.numero).includes(termo) && !Utils.normalizeString(enc.cliente).includes(termo)) return false;
            if (filtroCliente && !Utils.normalizeString(enc.cliente).includes(filtroCliente)) return false;
            if (filtroProjeto && !Utils.normalizeString(enc.projeto || '').includes(filtroProjeto)) return false;
            if (filtroRefCliente && !Utils.normalizeString(enc.ref_cliente || '').includes(filtroRefCliente)) return false;
            if (filtroObs && !Utils.normalizeString(enc.obs || '').includes(filtroObs)) return false;
            if (dataInicio && enc.data && enc.data < dataInicio) return false;
            if (dataFim && enc.data && enc.data > dataFim) return false;
            return true;
        });

        if (ordenarPor) {
            encomendasFiltradas.sort((a, b) => {
                let valA = a[ordenarPor] || '';
                let valB = b[ordenarPor] || '';
                if (ordenarPor === 'data') { valA = new Date(valA); valB = new Date(valB); }
                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                if (valA < valB) return ordemAscendente ? -1 : 1;
                if (valA > valB) return ordemAscendente ? 1 : -1;
                return 0;
            });
        }

        selectedIds.clear();
        atualizarPainelSelecao();
        paginaAtual = 1;
        renderTabela();
        saveListState();
        atualizarBotaoLimpar();
    }

    const aplicarFiltrosDebounced = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => aplicarFiltros(), Utils.DEBOUNCE_DELAY);
    };

    // ==================== Renderização da tabela ====================
    function renderTabela() {
        if (!tbodyListagem) return;
        const inicio = (paginaAtual - 1) * Utils.LINHAS_POR_PAGINA;
        const fim = inicio + Utils.LINHAS_POR_PAGINA;
        const paginaItens = encomendasFiltradas.slice(inicio, fim);
        tbodyListagem.innerHTML = '';

        for (const enc of paginaItens) {
            const tr = document.createElement('tr');
            const tdCheck = document.createElement('td');
            tdCheck.classList.add('checkbox-col');
            const chk = document.createElement('input');
            chk.type = 'checkbox';
            chk.classList.add('row-select');
            chk.value = enc.numero;
            chk.checked = selectedIds.has(enc.numero);
            tdCheck.appendChild(chk);
            tr.appendChild(tdCheck);

            for (const col of colunasVisiveis) {
                const td = document.createElement('td');
                if (col === 'acoes') {
                    const btnEditar = document.createElement('button');
                    btnEditar.className = 'btn-icon-sm';
                    btnEditar.innerHTML = '<i class="fas fa-edit"></i>';
                    btnEditar.onclick = () => window.abrirEncomendaParaEdicao(enc.numero);
                    const btnEliminar = document.createElement('button');
                    btnEliminar.className = 'btn-icon-sm danger';
                    btnEliminar.innerHTML = '<i class="fas fa-trash-alt"></i>';
                    btnEliminar.onclick = () => eliminarEncomenda(enc.numero);
                    td.appendChild(btnEditar);
                    td.appendChild(btnEliminar);
                } else {
                    td.textContent = enc[col] ?? '';
                }
                tr.appendChild(td);
            }
            tbodyListagem.appendChild(tr);
        }

        const headers = tabelaEncomendas.querySelectorAll('thead th');
        headers.forEach(th => {
            const coluna = th.dataset.coluna;
            if (coluna) {
                th.style.display = colunasVisiveis.includes(coluna) ? '' : 'none';
            }
        });

        const totalPaginas = Math.ceil(encomendasFiltradas.length / Utils.LINHAS_POR_PAGINA) || 1;
        if (infoPagina) infoPagina.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
        if (btnAnteriorPag) btnAnteriorPag.disabled = paginaAtual <= 1;
        if (btnSeguintePag) btnSeguintePag.disabled = paginaAtual >= totalPaginas;
        if (paginacaoDiv) paginacaoDiv.style.display = encomendasFiltradas.length > Utils.LINHAS_POR_PAGINA ? 'flex' : 'none';

        atualizarSelectAllPagina();
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
        if (!selectAll) return;
        const checkboxes = Array.from(document.querySelectorAll('#tabela-encomendas .row-select'));
        const todosChecked = checkboxes.length > 0 && checkboxes.every(cb => cb.checked);
        selectAll.checked = todosChecked;
        selectAll.indeterminate = !todosChecked && checkboxes.some(cb => cb.checked);
    }

    function atualizarPainelSelecao() {
        const count = selectedIds.size;
        if (selectedCountSpan) selectedCountSpan.textContent = count;
        const totalFiltrados = encomendasFiltradas.length;
        if (count > 0 && count < totalFiltrados) {
            if (selectAllDomainBtn) selectAllDomainBtn.classList.remove('hidden');
            if (totalCountBadge) totalCountBadge.textContent = totalFiltrados;
        } else {
            if (selectAllDomainBtn) selectAllDomainBtn.classList.add('hidden');
        }
        if (selectionPanel) {
            selectionPanel.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    // ==================== Ordenação ====================
    function ordenarPorColuna(coluna) {
        if (ordenarPor === coluna) ordemAscendente = !ordemAscendente;
        else { ordenarPor = coluna; ordemAscendente = true; }
        aplicarFiltros();
        document.querySelectorAll('th.sortable').forEach(th => {
            if (th.dataset.coluna === coluna) {
                th.classList.add(ordemAscendente ? 'asc' : 'desc');
            } else {
                th.classList.remove('asc', 'desc');
            }
        });
    }

    // ==================== CRUD de encomendas ====================
    async function eliminarEncomenda(numeroOriginal) {
        if (!confirm(`Eliminar encomenda ${numeroOriginal}?`)) return;
        const numeroSanitizado = Utils.sanitizarNumero(numeroOriginal);
        try {
            const resp = await fetch(`/validar/api/encomendas/${encodeURIComponent(numeroSanitizado)}`, { method: 'DELETE' });
            if (resp.ok) carregarEncomendas();
            else alert('Erro ao eliminar');
        } catch (err) { alert('Erro'); }
    }

    // Expor funções globais
    window.mostrarListagem = function() {
        if (viewForm) viewForm.classList.add('hidden');
        if (viewTable) viewTable.classList.remove('hidden');
        carregarEncomendas();
    };
    window.carregarEncomendas = carregarEncomendas;

    // ==================== Eventos da listagem (com verificações) ====================
    function bindEvents() {
        if (btnPesquisar) btnPesquisar.addEventListener('click', () => aplicarFiltros());
        if (pesquisaInput) {
            pesquisaInput.addEventListener('input', aplicarFiltrosDebounced);
            pesquisaInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') aplicarFiltros(); });
        }
        if (btnLimparFiltros) btnLimparFiltros.addEventListener('click', limparFiltrosCompletos);

        if (btnAnteriorPag) btnAnteriorPag.addEventListener('click', () => { if (paginaAtual > 1) { paginaAtual--; renderTabela(); saveListState(); } });
        if (btnSeguintePag) btnSeguintePag.addEventListener('click', () => { const total = Math.ceil(encomendasFiltradas.length / Utils.LINHAS_POR_PAGINA); if (paginaAtual < total) { paginaAtual++; renderTabela(); saveListState(); } });

        if (btnFiltros) btnFiltros.addEventListener('click', (e) => { e.stopPropagation(); if (filtrosDropdown) filtrosDropdown.classList.toggle('hidden'); });
        if (btnAplicarFiltros) btnAplicarFiltros.addEventListener('click', () => { if (filtrosDropdown) filtrosDropdown.classList.add('hidden'); aplicarFiltros(); });

        const autoApply = [...document.querySelectorAll('#filtros-dropdown input, #filtros-dropdown select')];
        autoApply.forEach(el => {
            el.addEventListener('change', aplicarFiltros);
            if (el.type === 'text') el.addEventListener('input', aplicarFiltrosDebounced);
        });

        if (btnColunas) btnColunas.addEventListener('click', (e) => { e.stopPropagation(); if (colunasDropdown) colunasDropdown.classList.toggle('hidden'); });
        if (aplicarColunas) aplicarColunas.addEventListener('click', () => {
            const checkboxes = colunasDropdown.querySelectorAll('input[type="checkbox"]');
            const novas = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
            if (novas.length === 0) { alert("Tem de deixar pelo menos uma coluna visível."); return; }
            colunasVisiveis = novas;
            if (!colunasVisiveis.includes('acoes')) colunasVisiveis.push('acoes');
            localStorage.setItem('encomendas_colunas', JSON.stringify(colunasVisiveis));
            if (colunasDropdown) colunasDropdown.classList.add('hidden');
            renderTabela();
            saveListState();
        });

        document.addEventListener('click', (e) => {
            if (btnFiltros && filtrosDropdown && !btnFiltros.contains(e.target) && !filtrosDropdown.contains(e.target)) filtrosDropdown.classList.add('hidden');
            if (btnColunas && colunasDropdown && !btnColunas.contains(e.target) && !colunasDropdown.contains(e.target)) colunasDropdown.classList.add('hidden');
            if (actionsDropdownBtn && actionsDropdownMenu && !actionsDropdownBtn.contains(e.target) && !actionsDropdownMenu.contains(e.target)) {
                actionsDropdownMenu.classList.add('hidden');
            }
        });

        if (selectAll) selectAll.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('#tabela-encomendas .row-select');
            checkboxes.forEach(cb => {
                cb.checked = e.target.checked;
                const id = cb.value;
                if (e.target.checked) selectedIds.add(id);
                else selectedIds.delete(id);
            });
            atualizarSelectAllPagina();
            atualizarPainelSelecao();
        });

        if (unselectAll) unselectAll.addEventListener('click', () => {
            selectedIds.clear();
            document.querySelectorAll('#tabela-encomendas .row-select').forEach(cb => cb.checked = false);
            if (selectAll) {
                selectAll.checked = false;
                selectAll.indeterminate = false;
            }
            atualizarPainelSelecao();
        });

        if (selectAllDomainBtn) selectAllDomainBtn.addEventListener('click', () => {
            encomendasFiltradas.forEach(enc => selectedIds.add(enc.numero));
            document.querySelectorAll('#tabela-encomendas .row-select').forEach(cb => cb.checked = true);
            if (selectAll) {
                selectAll.checked = true;
                selectAll.indeterminate = false;
            }
            atualizarPainelSelecao();
        });

        if (exportSelectedBtn) exportSelectedBtn.addEventListener('click', async () => {
            const ids = Array.from(selectedIds);
            if (ids.length === 0) { alert('Selecione pelo menos uma encomenda.'); return; }
            alert('Funcionalidade de exportação de encomendas ainda não implementada.');
        });

        if (actionsDropdownBtn && actionsDropdownMenu) {
            actionsDropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                actionsDropdownMenu.classList.toggle('hidden');
            });
        }

        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => ordenarPorColuna(th.dataset.coluna));
        });
    }

    // ==================== Inicialização ====================
    async function init() {
        bindEvents();
        const restored = await restoreListState();
        if (!restored) await carregarEncomendas();
    }

    init();
})();