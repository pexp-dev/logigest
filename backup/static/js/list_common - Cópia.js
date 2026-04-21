// list_common.js
// Módulo genérico para gestão de listagens (tabelas com pesquisa, filtros, colunas, paginação e seleção)

export class ListManager {
    constructor(config) {
        // Configuração obrigatória
        this.endpoint = config.endpoint;
        this.tableId = config.tableId || 'tabela-dados';
        this.containerId = config.containerId || 'table-container';
        this.loadingId = config.loadingId || 'loading';
        this.paginacaoId = config.paginacaoId || 'paginacao';
        this.infoPaginaId = config.infoPaginaId || 'info-pagina';
        this.btnAnteriorId = config.btnAnteriorId || 'btn-anterior';
        this.btnSeguinteId = config.btnSeguinteId || 'btn-seguinte';
        this.totalRegistosId = config.totalRegistosId || 'total-registos';
        this.pesquisaInputId = config.pesquisaInputId || 'pesquisa';
        this.btnPesquisarId = config.btnPesquisarId || 'btn-pesquisar';
        this.btnLimparFiltrosId = config.btnLimparFiltrosId || 'btn-limpar-filtros';
        this.btnFiltrosId = config.btnFiltrosId || 'btn-filtros';
        this.filtrosDropdownId = config.filtrosDropdownId || 'filtros-dropdown';
        this.btnAplicarFiltrosId = config.btnAplicarFiltrosId || 'btn-aplicar-filtros';
        this.btnColunasId = config.btnColunasId || 'btn-colunas';
        this.colunasDropdownId = config.colunasDropdownId || 'colunas-dropdown';
        this.selectAllId = config.selectAllId || 'select-all';
        this.selectionPanelId = config.selectionPanelId || 'selection-panel';
        this.selectedCountId = config.selectedCountId || 'selected-count';
        this.unselectAllId = config.unselectAllId || 'unselect-all';
        this.selectAllDomainId = config.selectAllDomainId || 'select-all-domain';
        this.totalCountBadgeId = config.totalCountBadgeId || 'total-count-badge';
        this.actionsDropdownBtnId = config.actionsDropdownBtnId || 'actionsDropdownBtn';
        this.actionsDropdownMenuId = config.actionsDropdownMenuId || 'actionsDropdownMenu';
        this.exportSelectedId = config.exportSelectedId || 'export-selected';
        this.storageKey = config.storageKey || 'list_columns';
        this.linhasPorPagina = config.linhasPorPagina || 15;
        this.colunasPadrao = config.colunasPadrao || [];
        this.colunasDisponiveis = config.colunasDisponiveis || [];
        // Funções de renderização customizadas
        this.renderRow = config.renderRow;
        this.renderHeader = config.renderHeader;
        this.processData = config.processData;
        this.getFiltrosExtras = config.getFiltrosExtras;
        this.filterItem = config.filterItem;
        this.sortItem = config.sortItem;
        this.onAfterRender = config.onAfterRender;
        this.onExportSelected = config.onExportSelected;

        // Estado interno – inicialização explícita
        this.data = [];
        this.filteredData = [];
        this.paginaAtual = 1;
        this.selectedIds = new Set();          // <-- ESSENCIAL
        this.colunasVisiveis = [];
        this.ordenarPor = null;
        this.ordemAscendente = true;
    }

    async init() {
        this.cacheElements();
        this.loadColumnVisibility();
        this.populateColunasDropdown();
        this.bindEvents();
        await this.loadData();
    }

    cacheElements() {
        this.table = document.getElementById(this.tableId);
        this.tbody = this.table?.querySelector('tbody');
        this.container = document.getElementById(this.containerId);
        this.loadingDiv = document.getElementById(this.loadingId);
        this.paginacaoDiv = document.getElementById(this.paginacaoId);
        this.infoPagina = document.getElementById(this.infoPaginaId);
        this.btnAnterior = document.getElementById(this.btnAnteriorId);
        this.btnSeguinte = document.getElementById(this.btnSeguinteId);
        this.totalRegistos = document.getElementById(this.totalRegistosId);
        this.pesquisaInput = document.getElementById(this.pesquisaInputId);
        this.btnPesquisar = document.getElementById(this.btnPesquisarId);
        this.btnLimparFiltros = document.getElementById(this.btnLimparFiltrosId);
        this.btnFiltros = document.getElementById(this.btnFiltrosId);
        this.filtrosDropdown = document.getElementById(this.filtrosDropdownId);
        this.btnAplicarFiltros = document.getElementById(this.btnAplicarFiltrosId);
        this.btnColunas = document.getElementById(this.btnColunasId);
        this.colunasDropdown = document.getElementById(this.colunasDropdownId);
        this.selectAll = document.getElementById(this.selectAllId);
        this.selectionPanel = document.getElementById(this.selectionPanelId);
        this.selectedCountSpan = document.getElementById(this.selectedCountId);
        this.unselectAllBtn = document.getElementById(this.unselectAllId);
        this.selectAllDomainBtn = document.getElementById(this.selectAllDomainId);
        this.totalCountBadge = document.getElementById(this.totalCountBadgeId);
        this.actionsDropdownBtn = document.getElementById(this.actionsDropdownBtnId);
        this.actionsDropdownMenu = document.getElementById(this.actionsDropdownMenuId);
        this.exportSelectedBtn = document.getElementById(this.exportSelectedId);
    }

    loadColumnVisibility() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length) {
                    this.colunasVisiveis = parsed;
                    if (!this.colunasVisiveis.includes('acoes')) this.colunasVisiveis.push('acoes');
                    return;
                }
            } catch (e) {}
        }
        this.colunasVisiveis = [...this.colunasPadrao];
    }

    saveColumnVisibility() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.colunasVisiveis));
    }

    populateColunasDropdown() {
        if (!this.colunasDropdown) return;
        this.colunasDropdown.innerHTML = '';
        this.colunasDisponiveis.forEach(col => {
            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = col.value;
            cb.checked = this.colunasVisiveis.includes(col.value);
            label.appendChild(cb);
            label.appendChild(document.createTextNode(` ${col.label}`));
            this.colunasDropdown.appendChild(label);
        });
        const btnAplicar = document.createElement('button');
        btnAplicar.id = 'aplicar-colunas';
        btnAplicar.className = 'btn btn-primary btn-sm';
        btnAplicar.textContent = 'Aplicar';
        this.colunasDropdown.appendChild(btnAplicar);
        btnAplicar.addEventListener('click', () => {
            const checkboxes = this.colunasDropdown.querySelectorAll('input[type="checkbox"]');
            this.colunasVisiveis = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
            if (!this.colunasVisiveis.includes('acoes')) this.colunasVisiveis.push('acoes');
            this.saveColumnVisibility();
            this.colunasDropdown.classList.add('hidden');
            this.renderTable();
        });
    }

    bindEvents() {
        this.btnPesquisar?.addEventListener('click', () => this.aplicarFiltros());
        this.pesquisaInput?.addEventListener('keyup', (e) => { if (e.key === 'Enter') this.aplicarFiltros(); });
        this.btnLimparFiltros?.addEventListener('click', () => this.limparFiltros());
        this.btnFiltros?.addEventListener('click', (e) => { e.stopPropagation(); this.filtrosDropdown?.classList.toggle('hidden'); });
        this.btnAplicarFiltros?.addEventListener('click', () => { this.filtrosDropdown?.classList.add('hidden'); this.aplicarFiltros(); });
        this.btnColunas?.addEventListener('click', (e) => { e.stopPropagation(); this.colunasDropdown?.classList.toggle('hidden'); });
        this.btnAnterior?.addEventListener('click', () => this.paginaAnterior());
        this.btnSeguinte?.addEventListener('click', () => this.paginaSeguinte());
        this.selectAll?.addEventListener('change', (e) => this.handleSelectAll(e));
        this.unselectAllBtn?.addEventListener('click', () => this.unselectAll());
        this.selectAllDomainBtn?.addEventListener('click', () => this.selectAllDomain());
        this.exportSelectedBtn?.addEventListener('click', () => this.exportSelected());
        if (this.actionsDropdownBtn && this.actionsDropdownMenu) {
            this.actionsDropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.actionsDropdownMenu.classList.toggle('hidden');
            });
        }
        document.addEventListener('click', (e) => {
            if (this.btnFiltros && this.filtrosDropdown && !this.btnFiltros.contains(e.target) && !this.filtrosDropdown.contains(e.target))
                this.filtrosDropdown.classList.add('hidden');
            if (this.btnColunas && this.colunasDropdown && !this.btnColunas.contains(e.target) && !this.colunasDropdown.contains(e.target))
                this.colunasDropdown.classList.add('hidden');
            if (this.actionsDropdownBtn && this.actionsDropdownMenu && !this.actionsDropdownBtn.contains(e.target) && !this.actionsDropdownMenu.contains(e.target))
                this.actionsDropdownMenu.classList.add('hidden');
        });
    }

    async loadData() {
        this.showLoader();
        try {
            const resp = await fetch(this.endpoint);
            if (!resp.ok) throw new Error('Erro ao carregar dados');
            const rawData = await resp.json();
            this.data = this.processData ? this.processData(rawData) : rawData;
            this.aplicarFiltros();
        } catch (err) {
            console.error(err);
            if (this.container) this.container.innerHTML = '<p class="text-danger text-center">Erro ao carregar dados.</p>';
        } finally {
            this.hideLoader();
        }
    }

    showLoader() {
        if (this.loadingDiv) this.loadingDiv.style.display = 'block';
        if (this.table) this.table.style.display = 'none';
        if (this.paginacaoDiv) this.paginacaoDiv.style.display = 'none';
    }

    hideLoader() {
        if (this.loadingDiv) this.loadingDiv.style.display = 'none';
        if (this.table) this.table.style.display = 'table';
        if (this.paginacaoDiv) this.paginacaoDiv.style.display = 'flex';
    }

    existemFiltrosAtivos() {
        if (this.pesquisaInput && this.pesquisaInput.value.trim() !== '') return true;
        if (this.getFiltrosExtras) {
            const extras = this.getFiltrosExtras();
            return Object.values(extras).some(v => v !== null && v !== '');
        }
        return false;
    }

    atualizarBotaoLimpar() {
        if (this.btnLimparFiltros) {
            this.btnLimparFiltros.style.display = this.existemFiltrosAtivos() ? 'inline-flex' : 'none';
        }
    }

    limparFiltros() {
        if (this.pesquisaInput) this.pesquisaInput.value = '';
        if (typeof this.limparFiltrosExtras === 'function') {
            this.limparFiltrosExtras();
        }
        this.aplicarFiltros();
        this.atualizarBotaoLimpar();
    }

    aplicarFiltros() {
        const termo = this.pesquisaInput ? this.pesquisaInput.value.toLowerCase().trim() : '';
        const filtrosExtras = this.getFiltrosExtras ? this.getFiltrosExtras() : {};
        this.filteredData = this.data.filter(item => {
            return this.filterItem(item, termo, filtrosExtras);
        });
        if (this.ordenarPor) {
            this.filteredData.sort((a, b) => this.sortItem(a, b, this.ordenarPor, this.ordemAscendente));
        }
        // Garantir que selectedIds é um Set antes de limpar
        if (!this.selectedIds) this.selectedIds = new Set();
        this.selectedIds.clear();
        this.paginaAtual = 1;
        this.renderTable();
        this.updatePagination();
        this.updateSelectionPanel();
        this.atualizarBotaoLimpar();
    }

    ordenarPorColuna(coluna) {
        if (this.ordenarPor === coluna) {
            this.ordemAscendente = !this.ordemAscendente;
        } else {
            this.ordenarPor = coluna;
            this.ordemAscendente = true;
        }
        this.aplicarFiltros();
    }

    renderTable() {
        if (!this.tbody) return;
        const inicio = (this.paginaAtual - 1) * this.linhasPorPagina;
        const fim = inicio + this.linhasPorPagina;
        const paginaItens = this.filteredData.slice(inicio, fim);
        
        const thead = this.table.querySelector('thead');
        if (thead) {
            thead.innerHTML = this.renderHeader(this.colunasVisiveis);
            this.attachSortEvents();
        }
        
        this.tbody.innerHTML = '';
        paginaItens.forEach(item => {
            const rowHtml = this.renderRow(item, this.colunasVisiveis);
            const tr = document.createElement('tr');
            tr.innerHTML = rowHtml;
            this.tbody.appendChild(tr);
        });
        
        this.updateSelectAllCheckbox();
        this.attachRowCheckboxEvents();
        
        if (this.onAfterRender) {
            this.onAfterRender();
        }
    }

    attachSortEvents() {
        this.table.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const coluna = th.dataset.coluna;
                this.ordenarPorColuna(coluna);
            });
        });
    }

    attachRowCheckboxEvents() {
        this.tbody.querySelectorAll('.row-select').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const id = e.target.value;
                if (e.target.checked) this.selectedIds.add(id);
                else this.selectedIds.delete(id);
                this.updateSelectAllCheckbox();
                this.updateSelectionPanel();
            });
        });
    }

    updateSelectAllCheckbox() {
        if (!this.selectAll) return;
        const checkboxes = this.tbody.querySelectorAll('.row-select');
        const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
        this.selectAll.checked = allChecked;
        this.selectAll.indeterminate = !allChecked && Array.from(checkboxes).some(cb => cb.checked);
    }

    handleSelectAll(e) {
        const checkboxes = this.tbody.querySelectorAll('.row-select');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
            const id = cb.value;
            if (e.target.checked) this.selectedIds.add(id);
            else this.selectedIds.delete(id);
        });
        this.updateSelectionPanel();
    }

    unselectAll() {
        this.selectedIds.clear();
        this.tbody.querySelectorAll('.row-select').forEach(cb => cb.checked = false);
        if (this.selectAll) {
            this.selectAll.checked = false;
            this.selectAll.indeterminate = false;
        }
        this.updateSelectionPanel();
    }

    selectAllDomain() {
        this.filteredData.forEach(item => {
            // O identificador pode variar; assume-se que cada item tem uma propriedade 'id' ou 'codigo'
            const id = item.id || item.codigo || item.numero;
            if (id) this.selectedIds.add(id);
        });
        this.tbody.querySelectorAll('.row-select').forEach(cb => cb.checked = true);
        if (this.selectAll) {
            this.selectAll.checked = true;
            this.selectAll.indeterminate = false;
        }
        this.updateSelectionPanel();
    }

    updateSelectionPanel() {
        const count = this.selectedIds.size;
        if (this.selectedCountSpan) this.selectedCountSpan.textContent = count;
        if (this.selectionPanel) {
            this.selectionPanel.style.display = count > 0 ? 'flex' : 'none';
        }
        const totalFiltrados = this.filteredData.length;
        if (count > 0 && count < totalFiltrados) {
            if (this.selectAllDomainBtn) this.selectAllDomainBtn.classList.remove('hidden');
            if (this.totalCountBadge) this.totalCountBadge.textContent = totalFiltrados;
        } else {
            if (this.selectAllDomainBtn) this.selectAllDomainBtn.classList.add('hidden');
        }
    }

    updatePagination() {
        const totalPaginas = Math.ceil(this.filteredData.length / this.linhasPorPagina) || 1;
        if (this.paginacaoDiv) {
            this.paginacaoDiv.style.display = this.filteredData.length > this.linhasPorPagina ? 'flex' : 'none';
        }
        if (this.infoPagina) {
            const inicio = (this.paginaAtual - 1) * this.linhasPorPagina + 1;
            const fim = Math.min(this.paginaAtual * this.linhasPorPagina, this.filteredData.length);
            this.infoPagina.textContent = `${inicio}-${fim}`;
        }
        if (this.totalRegistos) {
            this.totalRegistos.textContent = this.filteredData.length;
        }
        if (this.btnAnterior) this.btnAnterior.disabled = this.paginaAtual <= 1;
        if (this.btnSeguinte) this.btnSeguinte.disabled = this.paginaAtual >= totalPaginas;
    }

    paginaAnterior() {
        if (this.paginaAtual > 1) {
            this.paginaAtual--;
            this.renderTable();
            this.updatePagination();
        }
    }

    paginaSeguinte() {
        const total = Math.ceil(this.filteredData.length / this.linhasPorPagina);
        if (this.paginaAtual < total) {
            this.paginaAtual++;
            this.renderTable();
            this.updatePagination();
        }
    }

    exportSelected() {
        const ids = Array.from(this.selectedIds);
        if (ids.length === 0) {
            alert('Nenhum item selecionado.');
            return;
        }
        if (this.onExportSelected) {
            this.onExportSelected(ids);
        } else {
            alert('Exportação não implementada.');
        }
    }
}