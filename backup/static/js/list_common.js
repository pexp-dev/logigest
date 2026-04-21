// list_common.js
// Módulo genérico para gestão de listagens
// Versão final: dropdown via portal com devolução, redimensionamento sem ordenação acidental

export class ListManager {
    constructor(config) {
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

        this.renderRow = config.renderRow;
        this.renderHeader = config.renderHeader;
        this.processData = config.processData;
        this.getFiltrosExtras = config.getFiltrosExtras;
        this.filterItem = config.filterItem;
        this.sortItem = config.sortItem;
        this.onAfterRender = config.onAfterRender;
        this.onExportSelected = config.onExportSelected;
        this.limparFiltrosExtrasCallback = config.limparFiltrosExtras;

        this.getItemId = config.getItemId || (item => item.id);

        this.data = [];
        this.filteredData = [];
        this.paginaAtual = 1;
        this.selectedIds = new Set();
        this.colunasVisiveis = [];
        this.ordenarPor = null;
        this.ordemAscendente = true;

        this.columnWidthsKey = (config.storageKey || 'list_columns') + '_widths';
        this.columnWidths = {};

        this.activePortalMenu = null;
        this.lastActiveButton = null;
        this.activeMenuCell = null;
    }

    async init() {
        this.cacheElements();
        this.loadColumnVisibility();
        this.loadColumnWidths();
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

    loadColumnWidths() {
        try {
            const saved = localStorage.getItem(this.columnWidthsKey);
            this.columnWidths = saved ? JSON.parse(saved) : {};
        } catch (e) {
            this.columnWidths = {};
        }
    }

    saveColumnWidths() {
        localStorage.setItem(this.columnWidthsKey, JSON.stringify(this.columnWidths));
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
        if (this.btnPesquisar) this.btnPesquisar.addEventListener('click', () => this.aplicarFiltros());
        if (this.pesquisaInput) {
            this.pesquisaInput.addEventListener('input', this.debounce(() => this.aplicarFiltros(), 300));
        }
        if (this.btnLimparFiltros) this.btnLimparFiltros.addEventListener('click', () => this.limparFiltros());
        if (this.btnFiltros) {
            this.btnFiltros.addEventListener('click', (e) => {
                e.stopPropagation();
                this.filtrosDropdown?.classList.toggle('hidden');
            });
        }
        if (this.btnAplicarFiltros) {
            this.btnAplicarFiltros.addEventListener('click', () => {
                this.filtrosDropdown?.classList.add('hidden');
                this.aplicarFiltros();
            });
        }
        if (this.btnColunas) {
            this.btnColunas.addEventListener('click', (e) => {
                e.stopPropagation();
                this.colunasDropdown?.classList.toggle('hidden');
            });
        }
        if (this.btnAnterior) this.btnAnterior.addEventListener('click', () => this.paginaAnterior());
        if (this.btnSeguinte) this.btnSeguinte.addEventListener('click', () => this.paginaSeguinte());
        if (this.selectAll) this.selectAll.addEventListener('change', (e) => this.handleSelectAll(e));
        if (this.unselectAllBtn) this.unselectAllBtn.addEventListener('click', () => this.unselectAll());
        if (this.selectAllDomainBtn) this.selectAllDomainBtn.addEventListener('click', () => this.selectAllDomain());
        if (this.exportSelectedBtn) this.exportSelectedBtn.addEventListener('click', () => this.exportSelected());
        if (this.actionsDropdownBtn && this.actionsDropdownMenu) {
            this.actionsDropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.actionsDropdownMenu.classList.toggle('hidden');
            });
        }

        // Delegação para ordenação (cabeçalhos)
        if (this.table) {
            this.table.addEventListener('click', (e) => {
                const th = e.target.closest('th.sortable');
                if (!th) return;
                const coluna = th.dataset.coluna;
                this.ordenarPorColuna(coluna);
            });
        }

        // Dropdown das linhas via PORTAL com devolução à célula
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.dropdown-btn');
            
            if (!btn) {
                if (this.activePortalMenu && !e.target.closest('.dropdown-content')) {
                    this.closePortalDropdown();
                }
                return;
            }

            e.stopPropagation();
            e.preventDefault();

            const cell = btn.closest('td');
            const originalMenu = cell.querySelector('.dropdown-content');
            if (!originalMenu) return;

            if (this.activePortalMenu === originalMenu) {
                this.closePortalDropdown();
                return;
            }

            this.closePortalDropdown();

            this.activeMenuCell = cell;

            originalMenu.classList.remove('hidden');
            originalMenu.style.display = 'block';
            
            document.body.appendChild(originalMenu);
            
            const btnRect = btn.getBoundingClientRect();
            originalMenu.style.position = 'fixed';
            originalMenu.style.top = (btnRect.bottom + 4) + 'px';
            originalMenu.style.left = btnRect.left + 'px';
            originalMenu.style.zIndex = '9999';

            this.activePortalMenu = originalMenu;
            this.lastActiveButton = btn;

            const menuRect = originalMenu.getBoundingClientRect();
            if (menuRect.right > window.innerWidth) {
                originalMenu.style.left = (window.innerWidth - menuRect.width - 10) + 'px';
            }

            const row = btn.closest('tr');
            if (row) row.classList.add('dropdown-open');
        });

        // Fechar dropdowns de filtros/colunas ao clicar fora
        document.addEventListener('click', (e) => {
            if (this.btnFiltros && this.filtrosDropdown && !this.btnFiltros.contains(e.target) && !this.filtrosDropdown.contains(e.target))
                this.filtrosDropdown.classList.add('hidden');
            if (this.btnColunas && this.colunasDropdown && !this.btnColunas.contains(e.target) && !this.colunasDropdown.contains(e.target))
                this.colunasDropdown.classList.add('hidden');
            if (this.actionsDropdownBtn && this.actionsDropdownMenu && !this.actionsDropdownBtn.contains(e.target) && !this.actionsDropdownMenu.contains(e.target))
                this.actionsDropdownMenu.classList.add('hidden');
        });

        // Ajustar posição do portal ao rolar a página
        window.addEventListener('scroll', () => {
            if (this.activePortalMenu && this.lastActiveButton && this.activePortalMenu.parentNode === document.body) {
                const btnRect = this.lastActiveButton.getBoundingClientRect();
                this.activePortalMenu.style.top = (btnRect.bottom + 4) + 'px';
                this.activePortalMenu.style.left = btnRect.left + 'px';
                
                const menuRect = this.activePortalMenu.getBoundingClientRect();
                if (menuRect.right > window.innerWidth) {
                    this.activePortalMenu.style.left = (window.innerWidth - menuRect.width - 10) + 'px';
                }
            }
        }, { passive: true });
    }

    closePortalDropdown() {
        if (!this.activePortalMenu) return;

        const row = this.lastActiveButton?.closest('tr');
        if (row) row.classList.remove('dropdown-open');

        this.activePortalMenu.classList.add('hidden');
        this.activePortalMenu.style.display = 'none';
        
        if (this.activeMenuCell) {
            this.activeMenuCell.appendChild(this.activePortalMenu);
            this.activeMenuCell = null;
        }

        this.activePortalMenu = null;
        this.lastActiveButton = null;
    }

    debounce(fn, delay = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
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
        if (typeof this.limparFiltrosExtrasCallback === 'function') {
            this.limparFiltrosExtrasCallback();
        }
        this.aplicarFiltros();
        this.atualizarBotaoLimpar();
    }

    aplicarFiltros() {
        const termo = this.pesquisaInput ? this.pesquisaInput.value.toLowerCase().trim() : '';
        const filtrosExtras = this.getFiltrosExtras ? this.getFiltrosExtras() : {};

        const novoFiltrado = this.data.filter(item => 
            this.filterItem(item, termo, filtrosExtras)
        );

        if (this.ordenarPor) {
            novoFiltrado.sort((a, b) => this.sortItem(a, b, this.ordenarPor, this.ordemAscendente));
        }

        const idsFiltrados = new Set(novoFiltrado.map(item => this.getItemId(item)));
        for (let id of this.selectedIds) {
            if (!idsFiltrados.has(id)) {
                this.selectedIds.delete(id);
            }
        }

        this.filteredData = novoFiltrado;
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
        if (!this.tbody || !this.renderHeader || !this.renderRow) return;

        const inicio = (this.paginaAtual - 1) * this.linhasPorPagina;
        const fim = inicio + this.linhasPorPagina;
        const paginaItens = this.filteredData.slice(inicio, fim);
        
        const thead = this.table.querySelector('thead');
        if (thead) {
            thead.innerHTML = this.renderHeader(this.colunasVisiveis);
            
            const headers = this.table.querySelectorAll('th');
            headers.forEach(th => {
                const key = th.dataset.coluna;
                if (key && this.columnWidths[key]) {
                    th.style.width = this.columnWidths[key];
                }
            });

            this.selectAll = document.getElementById(this.selectAllId);
            if (this.selectAll) {
                this.selectAll.removeEventListener('change', this.handleSelectAll);
                this.selectAll.addEventListener('change', (e) => this.handleSelectAll(e));
            }
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
        this.initColumnResize();
        
        if (this.onAfterRender) this.onAfterRender();
    }

    initColumnResize() {
        const headers = this.table.querySelectorAll('th');
        headers.forEach(th => {
            const oldResizer = th.querySelector('.resizer');
            if (oldResizer) oldResizer.remove();

            const resizer = document.createElement('div');
            resizer.className = 'resizer';
            th.style.position = 'relative';
            th.appendChild(resizer);

            let startX, startWidth;
            let isResizing = false;

            const onMouseMove = (e) => {
                if (!isResizing) return;
                const newWidth = startWidth + (e.pageX - startX);
                if (newWidth >= 30) {
                    th.style.width = newWidth + 'px';
                }
            };

            const onMouseUp = (e) => {
                if (isResizing) {
                    e.stopPropagation();
                    e.preventDefault();
                    const key = th.dataset.coluna;
                    if (key) {
                        this.columnWidths[key] = th.style.width;
                        this.saveColumnWidths();
                    }
                }
                isResizing = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            // Impede que o clique no resizer dispare ordenação
            resizer.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });

            resizer.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                isResizing = true;
                startX = e.pageX;
                startWidth = th.offsetWidth;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    }

    attachRowCheckboxEvents() {
        this.tbody.querySelectorAll('.row-select').forEach(cb => {
            cb.removeEventListener('change', cb._handler);
            const handler = (e) => {
                const id = e.target.value;
                if (e.target.checked) this.selectedIds.add(id);
                else this.selectedIds.delete(id);
                this.updateSelectAllCheckbox();
                this.updateSelectionPanel();
            };
            cb.addEventListener('change', handler);
            cb._handler = handler;
        });
    }

    updateSelectAllCheckbox() {
        if (!this.selectAll) return;
        const checkboxes = this.tbody.querySelectorAll('.row-select');
        if (checkboxes.length === 0) {
            this.selectAll.checked = false;
            this.selectAll.indeterminate = false;
            return;
        }
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        const someChecked = Array.from(checkboxes).some(cb => cb.checked);
        this.selectAll.checked = allChecked;
        this.selectAll.indeterminate = !allChecked && someChecked;
    }

    handleSelectAll(e) {
        const isChecked = e.target.checked;
        const checkboxes = this.tbody.querySelectorAll('.row-select');
        checkboxes.forEach(cb => {
            cb.checked = isChecked;
            const id = cb.value;
            if (isChecked) this.selectedIds.add(id);
            else this.selectedIds.delete(id);
        });
        this.updateSelectAllCheckbox();
        this.updateSelectionPanel();
    }

    unselectAll() {
        this.selectedIds.clear();
        this.tbody.querySelectorAll('.row-select').forEach(cb => cb.checked = false);
        this.updateSelectAllCheckbox();
        this.updateSelectionPanel();
    }

    selectAllDomain() {
        this.filteredData.forEach(item => this.selectedIds.add(this.getItemId(item)));
        this.renderTable();
        this.updateSelectionPanel();
    }

    updateSelectionPanel() {
        const count = this.selectedIds.size;
        if (this.selectedCountSpan) this.selectedCountSpan.textContent = count;

        const searchWrapper = document.getElementById('search-bar-wrapper');
        if (count > 0) {
            if (this.selectionPanel) this.selectionPanel.style.display = 'flex';
            if (searchWrapper) searchWrapper.style.display = 'none';
        } else {
            if (this.selectionPanel) this.selectionPanel.style.display = 'none';
            if (searchWrapper) searchWrapper.style.display = 'flex';
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