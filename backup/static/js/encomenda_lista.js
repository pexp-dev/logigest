// encomenda_lista.js
import { ListManager } from './list_common.js';
import * as Utils from './encomenda_comum.js';

(function() {
    // ==================== Configuração do ListManager ====================
    const manager = new ListManager({
        endpoint: '/validar/api/encomendas',
        tableId: 'tabela-dados',       // ID da tabela no HTML
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
        storageKey: 'encomendas_colunas',
        linhasPorPagina: Utils.LINHAS_POR_PAGINA || 40,

        // Identificador único (número da encomenda)
        getItemId: (item) => item.numero,

        // Colunas padrão e disponíveis
        colunasPadrao: [...Utils.COLUNAS_PADRAO],
        colunasDisponiveis: [
            { value: 'checkbox', label: 'Selecção' },
            { value: 'numero', label: 'Número' },
            { value: 'cliente', label: 'Cliente' },
            { value: 'data', label: 'Data' },
            { value: 'projeto', label: 'Projeto' },
            { value: 'ref_cliente', label: 'Ref. Cliente' },
            { value: 'total', label: 'Total (€)' },
            { value: 'obs', label: 'Observações' },
            { value: 'acoes', label: 'Ações' }
        ],

        processData: (data) => data, // API já devolve array de encomendas

        // Filtros extras (campos específicos)
        getFiltrosExtras: () => ({
            cliente: document.getElementById('filtro-cliente')?.value || '',
            projeto: document.getElementById('filtro-projeto')?.value || '',
            ref_cliente: document.getElementById('filtro-ref-cliente')?.value || '',
            obs: document.getElementById('filtro-obs')?.value || '',
            data_inicio: document.getElementById('filtro-data-inicio')?.value || '',
            data_fim: document.getElementById('filtro-data-fim')?.value || ''
        }),

        // Callback para limpar filtros extras
        limparFiltrosExtras: () => {
            const ids = ['filtro-cliente', 'filtro-projeto', 'filtro-ref-cliente', 'filtro-obs', 'filtro-data-inicio', 'filtro-data-fim'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
        },

        // Função de filtro por item
        filterItem: (enc, termo, filtros) => {
            // Pesquisa textual (número, cliente)
            if (termo) {
                const normNum = Utils.normalizeString(enc.numero || '');
                const normCli = Utils.normalizeString(enc.cliente || '');
                if (!normNum.includes(termo) && !normCli.includes(termo)) return false;
            }

            // Filtros estruturados
            if (filtros.cliente && !Utils.normalizeString(enc.cliente || '').includes(Utils.normalizeString(filtros.cliente))) return false;
            if (filtros.projeto && !Utils.normalizeString(enc.projeto || '').includes(Utils.normalizeString(filtros.projeto))) return false;
            if (filtros.ref_cliente && !Utils.normalizeString(enc.ref_cliente || '').includes(Utils.normalizeString(filtros.ref_cliente))) return false;
            if (filtros.obs && !Utils.normalizeString(enc.obs || '').includes(Utils.normalizeString(filtros.obs))) return false;

            if (filtros.data_inicio && enc.data && enc.data < filtros.data_inicio) return false;
            if (filtros.data_fim && enc.data && enc.data > filtros.data_fim) return false;

            return true;
        },

        // Ordenação
        sortItem: (a, b, ordenarPor, ordemAscendente) => {
            let valA, valB;
            if (ordenarPor === 'data') {
                valA = a.data ? new Date(a.data) : null;
                valB = b.data ? new Date(b.data) : null;
                if (!valA && !valB) return 0;
                if (!valA) return 1;
                if (!valB) return -1;
            } else if (ordenarPor === 'total') {
                valA = parseFloat(a.total) || 0;
                valB = parseFloat(b.total) || 0;
            } else {
                valA = (a[ordenarPor] || '').toString().toLowerCase();
                valB = (b[ordenarPor] || '').toString().toLowerCase();
            }

            if (valA < valB) return ordemAscendente ? -1 : 1;
            if (valA > valB) return ordemAscendente ? 1 : -1;
            return 0;
        },

        // Cabeçalho da tabela
        renderHeader: (colunasVisiveis) => {
            const labels = {
                numero: 'Número',
                cliente: 'Cliente',
                data: 'Data',
                projeto: 'Projeto',
                ref_cliente: 'Ref. Cliente',
                total: 'Total (€)',
                obs: 'Observações',
                acoes: 'Ações'
            };
            let html = '<tr><th class="checkbox-col"><input type="checkbox" id="select-all"></th>';
            for (const col of colunasVisiveis) {
                if (col === 'checkbox' || col === 'acoes') continue;
                // Apenas colunas que não são "acoes" (ações será sempre a última)
                html += `<th data-coluna="${col}" class="sortable">${labels[col] || col}</th>`;
            }
            html += '<th>Ações</th></tr>';
            return html;
        },

        // Linha da tabela
        renderRow: (enc, colunasVisiveis) => {
            let html = `<td class="checkbox-col"><input type="checkbox" class="row-select" value="${enc.numero}"></td>`;
            for (const col of colunasVisiveis) {
                if (col === 'checkbox') continue;
                if (col === 'acoes') {
                    html += `<td class="action-cell">
                        <div class="dropdown">
                            <button class="dropdown-btn"><i class="fas fa-cog"></i></button>
                            <div class="dropdown-content hidden">
                                <a href="#" class="dropdown-item edit-item" data-id="${enc.numero}"><i class="fas fa-edit"></i> Editar</a>
                                <a href="#" class="dropdown-item delete-item" data-id="${enc.numero}"><i class="fas fa-trash-alt"></i> Eliminar</a>
                            </div>
                        </div>
                    </td>`;
                } else if (col === 'data') {
                    html += `<td>${enc.data || ''}</td>`;
                } else if (col === 'total') {
                    html += `<td>${enc.total ? enc.total.toFixed(2) + ' €' : ''}</td>`;
                } else {
                    html += `<td>${enc[col] !== undefined ? enc[col] : ''}</td>`;
                }
            }
            return html;
        },

        // Ações pós-renderização (não necessário, mas mantido)
        onAfterRender: () => {
            // O ListManager já trata dos dropdowns
        },

        // Exportação de selecionados
        onExportSelected: (ids) => {
            if (ids.length === 0) {
                alert('Nenhuma encomenda selecionada.');
                return;
            }
            // Podes implementar exportação para Excel ou CSV aqui
            alert('Funcionalidade de exportação de encomendas ainda não implementada.');
        }
    });

    // ==================== Delegação de eventos para ações das linhas ====================
    document.addEventListener('click', async (e) => {
        const item = e.target.closest('.dropdown-item');
        if (!item) return;

        e.preventDefault();
        e.stopPropagation();

        const id = item.dataset.id;
        if (!id) return;

        // Fecha o menu portal
        if (manager.activePortalMenu) {
            manager.closePortalDropdown();
        }

        if (item.classList.contains('edit-item')) {
            // Redireciona para a página de edição
            window.location.href = `/validar/encomenda_cliente/editar/${encodeURIComponent(id)}`;
        } else if (item.classList.contains('delete-item')) {
            if (!confirm(`Eliminar encomenda ${id}?`)) return;
            const numeroSanitizado = Utils.sanitizarNumero(id);
            try {
                const resp = await fetch(`/validar/api/encomendas/${encodeURIComponent(numeroSanitizado)}`, { method: 'DELETE' });
                if (resp.ok) {
                    manager.loadData(); // recarrega a lista
                } else {
                    alert('Erro ao eliminar encomenda.');
                }
            } catch (err) {
                console.error(err);
                alert('Erro de comunicação.');
            }
        }
    });

    // ==================== Inicialização ====================
    async function init() {
        // Carregar dicionários para selects de filtro (se necessário)
        // Podes adicionar aqui a lógica de carregar clientes, etc.

        manager.init();
    }

    // Expor funções globais para compatibilidade com outros scripts (opcional)
    window.carregarEncomendas = () => manager.loadData();

    init();
})();