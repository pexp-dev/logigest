// arquivo.js
import { ListManager } from './list_common.js';

// Utilitários
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function escapeAttr(str) {
    if (!str) return '';
    return str.replace(/["']/g, m => ({ '"': '&quot;', "'": '&#39;' }[m]));
}

function formatarDataISO(dataISO) {
    if (!dataISO) return '';
    try {
        const data = new Date(dataISO);
        if (isNaN(data.getTime())) return dataISO;
        const dia = data.getDate().toString().padStart(2, '0');
        const mes = (data.getMonth() + 1).toString().padStart(2, '0');
        const ano = data.getFullYear();
        const horas = data.getHours().toString().padStart(2, '0');
        const minutos = data.getMinutes().toString().padStart(2, '0');
        return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
    } catch (e) {
        return dataISO;
    }
}

// ==================== Ações específicas ====================
async function marcarComoLido(nomeArquivo) {
    try {
        const formData = new FormData();
        formData.append('nome_arquivo', nomeArquivo);
        const resp = await fetch('/validar/api/marcar_exportado', { method: 'POST', body: formData });
        if (!resp.ok) throw new Error('Erro ao marcar como lido');
        
        // Atualizar os dados em memória
        const item = manager.data.find(a => a.nome === nomeArquivo);
        if (item) item.exportado = true;
        const filtItem = manager.filteredData.find(a => a.nome === nomeArquivo);
        if (filtItem) filtItem.exportado = true;
        manager.renderTable();
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function exportarExcel(nomeArquivo) {
    try {
        const formData = new FormData();
        formData.append('nome_arquivo', nomeArquivo);
        const resp = await fetch('/validar/api/gerar_excel', { method: 'POST', body: formData });
        if (!resp.ok) throw new Error('Erro na exportação');
        const blob = await resp.blob();
        if (blob.size === 0) throw new Error('Ficheiro vazio');
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo.replace('.json', '.xlsx');
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        await marcarComoLido(nomeArquivo);
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function exportarAlertas(nomeArquivo) {
    try {
        const formData = new FormData();
        formData.append('nome_arquivo', nomeArquivo);
        const resp = await fetch('/validar/api/gerar_excel_alertas', { method: 'POST', body: formData });
        if (!resp.ok) throw new Error('Erro na exportação de alertas');
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nomeArquivo.replace('.json', '_alertas.xlsx');
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        await marcarComoLido(nomeArquivo);
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function exportarSelecionados(nomes) {
    if (!nomes || nomes.length === 0) {
        alert('Nenhum documento selecionado.');
        return;
    }
    for (const nome of nomes) {
        try {
            await exportarExcel(nome);
        } catch (err) {
            console.error(`Erro ao exportar ${nome}:`, err);
            alert(`Erro ao exportar ${nome}: ${err.message}`);
        }
    }
    manager.selectedIds.clear();
    manager.renderTable();
    manager.updateSelectionPanel();
}

// ==================== Configuração do ListManager ====================
const config = {
    endpoint: '/validar/api/arquivo/listar',

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

    storageKey: 'arquivo_colunas',
    linhasPorPagina: 40,

    colunasPadrao: ['checkbox', 'documento', 'data', 'processado_em', 'total_fatura', 'estado', 'acoes'],
    colunasDisponiveis: [
        { value: 'checkbox', label: 'Selecção' },
        { value: 'documento', label: 'Documento' },
        { value: 'data', label: 'Data da Fatura' },
        { value: 'processado_em', label: 'Processado em' },
        { value: 'total_fatura', label: 'Total (€)' },
        { value: 'estado', label: 'Estado' },
        { value: 'acoes', label: 'Ações' }
    ],

    getItemId: (item) => item.nome,   // Identificador único = nome do arquivo

    processData: (rawData) => {
        return rawData.map(item => ({
            ...item,
            id: item.nome
        }));
    },

    getFiltrosExtras: () => ({
        status: document.getElementById('filtro-status')?.value || '',
        dataIni: document.getElementById('filtro-data-ini')?.value || '',
        dataFim: document.getElementById('filtro-data-fim')?.value || '',
        totalMin: document.getElementById('filtro-total-min')?.value || '',
        totalMax: document.getElementById('filtro-total-max')?.value || ''
    }),

    limparFiltrosExtras: () => {
        const ids = ['filtro-status', 'filtro-data-ini', 'filtro-data-fim', 'filtro-total-min', 'filtro-total-max'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    },

    filterItem: (item, termo, filtros) => {
        if (termo) {
            const doc = (item.documento || '').toLowerCase();
            const data = (item.data || '').toLowerCase();
            const total = (item.total_fatura || 0).toString();
            if (!doc.includes(termo) && !data.includes(termo) && !total.includes(termo)) {
                return false;
            }
        }

        if (filtros.status) {
            const isExportado = (filtros.status === 'sim');
            if (item.exportado !== isExportado) return false;
        }

        if (filtros.dataIni || filtros.dataFim) {
            const dataProc = item.processado_em ? new Date(item.processado_em) : null;
            if (dataProc) {
                if (filtros.dataIni && new Date(filtros.dataIni) > dataProc) return false;
                if (filtros.dataFim && new Date(filtros.dataFim) < dataProc) return false;
            } else {
                if (filtros.dataIni || filtros.dataFim) return false;
            }
        }

        const total = item.total_fatura || 0;
        if (filtros.totalMin && total < parseFloat(filtros.totalMin)) return false;
        if (filtros.totalMax && total > parseFloat(filtros.totalMax)) return false;

        return true;
    },

    sortItem: (a, b, ordenarPor, ordemAscendente) => {
        let valA, valB;
        switch (ordenarPor) {
            case 'documento':
            case 'data':
                valA = (a[ordenarPor] || '').toLowerCase();
                valB = (b[ordenarPor] || '').toLowerCase();
                break;
            case 'processado_em':
                valA = a.processado_em ? new Date(a.processado_em).getTime() : 0;
                valB = b.processado_em ? new Date(b.processado_em).getTime() : 0;
                break;
            case 'total_fatura':
                valA = parseFloat(a.total_fatura) || 0;
                valB = parseFloat(b.total_fatura) || 0;
                break;
            default:
                return 0;
        }
        if (valA < valB) return ordemAscendente ? -1 : 1;
        if (valA > valB) return ordemAscendente ? 1 : -1;
        return 0;
    },

    renderHeader: (colunasVisiveis) => {
        let html = '<tr>';
        if (colunasVisiveis.includes('checkbox')) {
            html += '<th class="checkbox-col"><input type="checkbox" id="select-all"></th>';
        }
        if (colunasVisiveis.includes('documento')) html += '<th data-coluna="documento" class="sortable">Documento</th>';
        if (colunasVisiveis.includes('data')) html += '<th data-coluna="data" class="sortable">Data da Fatura</th>';
        if (colunasVisiveis.includes('processado_em')) html += '<th data-coluna="processado_em" class="sortable">Processado em</th>';
        if (colunasVisiveis.includes('total_fatura')) html += '<th data-coluna="total_fatura" class="sortable">Total (€)</th>';
        if (colunasVisiveis.includes('estado')) html += '<th data-coluna="estado">Estado</th>';
        if (colunasVisiveis.includes('acoes')) html += '<th>Ações</th>';
        html += '</tr>';
        return html;
    },

    renderRow: (item, colunasVisiveis) => {
        const nomeArquivo = item.nome;
        const exportado = item.exportado;
        const totalFormatado = (item.total_fatura || 0).toFixed(2) + ' €';
        
        let html = '';
        if (colunasVisiveis.includes('checkbox')) {
            html += `<td class="checkbox-col"><input type="checkbox" class="row-select" value="${escapeAttr(nomeArquivo)}"></td>`;
        }
        if (colunasVisiveis.includes('documento')) html += `<td>${escapeHtml(item.documento || '')}</td>`;
        if (colunasVisiveis.includes('data')) html += `<td>${escapeHtml(item.data || '')}</td>`;
        if (colunasVisiveis.includes('processado_em')) html += `<td>${escapeHtml(formatarDataISO(item.processado_em))}</td>`;
        if (colunasVisiveis.includes('total_fatura')) html += `<td>${totalFormatado}</td>`;
        if (colunasVisiveis.includes('estado')) {
            html += `<td>${!exportado ? '<span class="badge badge-novo">Novo</span>' : ''}</td>`;
        }
        if (colunasVisiveis.includes('acoes')) {
            html += `<td class="action-cell">
                <div class="dropdown">
                    <button class="dropdown-btn"><i class="fas fa-cog"></i></button>
                    <div class="dropdown-content hidden">
                        <a href="#" class="dropdown-item export-excel" data-nome="${escapeAttr(nomeArquivo)}"><i class="fas fa-file-excel"></i> Exportar Excel</a>
                        <a href="#" class="dropdown-item export-alerts" data-nome="${escapeAttr(nomeArquivo)}"><i class="fas fa-chart-line"></i> Exportar Alertas</a>
                        ${!exportado ? `<a href="#" class="dropdown-item mark-read" data-nome="${escapeAttr(nomeArquivo)}"><i class="fas fa-check-circle"></i> Marcar como lido</a>` : ''}
                    </div>
                </div>
            </td>`;
        }
        return html;
    },

    // O ListManager já trata da abertura/fecho do menu; não precisamos do initDropdowns antigo.
    onAfterRender: () => {
        // Nada a fazer aqui, a não ser que queiras reaplicar algo.
    },

    onExportSelected: (selectedIds) => {
        exportarSelecionados(selectedIds);
    }
};

// Instância do ListManager
const manager = new ListManager(config);

// ==================== Listener delegado para ações dos itens do dropdown ====================
// Como o menu é movido para o body (portal), delegamos a partir do document.
document.addEventListener('click', (e) => {
    // Só nos interessa se for um item de dropdown
    const dropdownItem = e.target.closest('.dropdown-item');
    if (!dropdownItem) return;

    e.preventDefault();
    e.stopPropagation();

    const nome = dropdownItem.dataset.nome;
    if (!nome) return;

    // Fecha o menu (o ListManager também fechará ao clicar fora, mas podemos forçar)
    if (manager.activePortalMenu) {
        manager.closePortalDropdown();
    }

    if (dropdownItem.classList.contains('export-excel')) {
        exportarExcel(nome);
    } else if (dropdownItem.classList.contains('export-alerts')) {
        exportarAlertas(nome);
    } else if (dropdownItem.classList.contains('mark-read')) {
        marcarComoLido(nome);
    }
});

// Listener para o botão extra "Exportar Alertas (selecionados)"
document.addEventListener('DOMContentLoaded', () => {
    const exportAlertsSelected = document.getElementById('export-alerts-selected');
    if (exportAlertsSelected) {
        exportAlertsSelected.addEventListener('click', async (e) => {
            e.preventDefault();
            const ids = Array.from(manager.selectedIds);
            if (ids.length === 0) {
                alert('Nenhum documento selecionado.');
                return;
            }
            for (const nome of ids) {
                try {
                    await exportarAlertas(nome);
                } catch (err) {
                    console.error(`Erro ao exportar alertas de ${nome}:`, err);
                    alert(`Erro ao exportar alertas de ${nome}: ${err.message}`);
                }
            }
            manager.selectedIds.clear();
            manager.renderTable();
            manager.updateSelectionPanel();
        });
    }
});

// Inicializar
manager.init();