// arquivo.js
import { ListManager } from './list_common.js';

document.addEventListener('DOMContentLoaded', () => {
    // ==================== Configuração específica ====================
    const COLUNAS_DISPONIVEIS = [
        { value: 'checkbox', label: 'Selecção' },
        { value: 'documento', label: 'Documento' },
        { value: 'data', label: 'Data da Fatura' },
        { value: 'processado_em', label: 'Processado em' },
        { value: 'total_fatura', label: 'Total (€)' },
        { value: 'estado', label: 'Estado' },
        { value: 'acoes', label: 'Ações' }
    ];
    
    const COLUNAS_PADRAO = ['checkbox', 'documento', 'data', 'processado_em', 'total_fatura', 'estado', 'acoes'];
    
    // Estado específico para dropdowns inline
    let selectedNomes = new Set();
    
    // Funções auxiliares
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
    }
    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/["']/g, m => ({ '"':'&quot;', "'":'&#39;' }[m]));
    }
    function formatarDataISO(dataISO) {
        if (!dataISO) return '';
        try {
            const data = new Date(dataISO);
            if (isNaN(data.getTime())) return dataISO;
            const dia = data.getDate().toString().padStart(2,'0');
            const mes = (data.getMonth()+1).toString().padStart(2,'0');
            const ano = data.getFullYear();
            const horas = data.getHours().toString().padStart(2,'0');
            const minutos = data.getMinutes().toString().padStart(2,'0');
            return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
        } catch(e) { return dataISO; }
    }
    
    // ==================== Instância do ListManager ====================
    const manager = new ListManager({
        endpoint: '/validar/api/arquivo/listar',
        tableId: 'tabela-dados', // ou 'resultados' se preferires manter
        containerId: 'arquivos-container',
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
        linhasPorPagina: 22,
        colunasPadrao: COLUNAS_PADRAO,
        colunasDisponiveis: COLUNAS_DISPONIVEIS,
        
        // Processa os dados recebidos da API para o formato interno
        processData: (rawData) => {
            return rawData.map(item => ({
                ...item,
                id: item.nome, // identificador único para seleção
            }));
        },
        
        // Renderiza o cabeçalho da tabela
        renderHeader: (colunasVisiveis) => {
            let html = '<tr>';
            if (colunasVisiveis.includes('checkbox')) html += '<th class="checkbox-col"><input type="checkbox" id="select-all"></th>';
            if (colunasVisiveis.includes('documento')) html += '<th data-coluna="documento" class="sortable">Documento</th>';
            if (colunasVisiveis.includes('data')) html += '<th data-coluna="data" class="sortable">Data da Fatura</th>';
            if (colunasVisiveis.includes('processado_em')) html += '<th data-coluna="processado_em" class="sortable">Processado em</th>';
            if (colunasVisiveis.includes('total_fatura')) html += '<th data-coluna="total_fatura" class="sortable">Total (€)</th>';
            if (colunasVisiveis.includes('estado')) html += '<th data-coluna="estado">Estado</th>';
            if (colunasVisiveis.includes('acoes')) html += '<th>Ações</th>';
            html += '</tr>';
            return html;
        },
        
        // Renderiza uma linha da tabela
        renderRow: (item, colunasVisiveis) => {
            let html = '';
            if (colunasVisiveis.includes('checkbox')) {
                html += `<td class="checkbox-col"><input type="checkbox" class="row-select" value="${escapeAttr(item.nome)}" ${selectedNomes.has(item.nome) ? 'checked' : ''}></td>`;
            }
            if (colunasVisiveis.includes('documento')) html += `<td>${escapeHtml(item.documento || '')}</td>`;
            if (colunasVisiveis.includes('data')) html += `<td>${escapeHtml(item.data || '')}</td>`;
            if (colunasVisiveis.includes('processado_em')) html += `<td>${escapeHtml(formatarDataISO(item.processado_em))}</td>`;
            if (colunasVisiveis.includes('total_fatura')) html += `<td>${(item.total_fatura || 0).toFixed(2)} €</td>`;
            if (colunasVisiveis.includes('estado')) {
                html += `<td class="status-cell">${!item.exportado ? '<span class="badge badge-novo">Novo</span>' : ''}</td>`;
            }
            if (colunasVisiveis.includes('acoes')) {
                html += `<td class="action-cell">
                    <div class="dropdown">
                        <button class="dropdown-btn"><i class="fas fa-cog"></i></button>
                        <div class="dropdown-content">
                            <a href="#" class="dropdown-item export-excel" data-nome="${escapeAttr(item.nome)}"><i class="fas fa-file-excel"></i> Exportar Excel</a>
                            <a href="#" class="dropdown-item export-alerts" data-nome="${escapeAttr(item.nome)}"><i class="fas fa-chart-line"></i> Exportar Alertas</a>
                            ${!item.exportado ? '<a href="#" class="dropdown-item mark-read" data-nome="'+escapeAttr(item.nome)+'"><i class="fas fa-check-circle"></i> Marcar como lido</a>' : ''}
                        </div>
                    </div>
                </td>`;
            }
            return html;
        },
        
        // Obtém os valores dos filtros extras
        getFiltrosExtras: () => {
            return {
                status: document.getElementById('filtro-status')?.value || '',
                dataIni: document.getElementById('filtro-data-ini')?.value || '',
                dataFim: document.getElementById('filtro-data-fim')?.value || '',
                totalMin: document.getElementById('filtro-total-min')?.value || '',
                totalMax: document.getElementById('filtro-total-max')?.value || ''
            };
        },
        
        // Função de limpeza dos filtros extras (chamada ao limpar filtros)
        limparFiltrosExtras: () => {
            document.getElementById('filtro-status').value = '';
            document.getElementById('filtro-data-ini').value = '';
            document.getElementById('filtro-data-fim').value = '';
            document.getElementById('filtro-total-min').value = '';
            document.getElementById('filtro-total-max').value = '';
        },
        
        // Filtro customizado por item
        filterItem: (item, termo, filtros) => {
            // Termo de pesquisa
            if (termo) {
                const match = (item.documento && item.documento.toLowerCase().includes(termo)) ||
                              (item.data && item.data.toLowerCase().includes(termo)) ||
                              (item.total_fatura && item.total_fatura.toString().includes(termo));
                if (!match) return false;
            }
            // Status (exportado/lido)
            if (filtros.status !== undefined && filtros.status !== '') {
                const isExportado = (filtros.status === 'sim');
                if (item.exportado !== isExportado) return false;
            }
            // Data processamento
            if (filtros.dataIni || filtros.dataFim) {
                const dataProc = item.processado_em ? new Date(item.processado_em) : null;
                if (dataProc) {
                    if (filtros.dataIni && new Date(filtros.dataIni) > dataProc) return false;
                    if (filtros.dataFim && new Date(filtros.dataFim) < dataProc) return false;
                } else if (filtros.dataIni || filtros.dataFim) return false;
            }
            // Total fatura
            const total = item.total_fatura || 0;
            if (filtros.totalMin && total < parseFloat(filtros.totalMin)) return false;
            if (filtros.totalMax && total > parseFloat(filtros.totalMax)) return false;
            return true;
        },
        
        // Ordenação
        sortItem: (a, b, ordenarPor, ordemAscendente) => {
            let valA = a[ordenarPor] || '';
            let valB = b[ordenarPor] || '';
            if (ordenarPor === 'processado_em') {
                valA = new Date(valA).getTime() || 0;
                valB = new Date(valB).getTime() || 0;
            } else if (ordenarPor === 'total_fatura') {
                valA = parseFloat(valA) || 0;
                valB = parseFloat(valB) || 0;
            } else {
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
            }
            if (valA < valB) return ordemAscendente ? -1 : 1;
            if (valA > valB) return ordemAscendente ? 1 : -1;
            return 0;
        },
        
        // Callback após renderizar a tabela (para ativar dropdowns)
        onAfterRender: () => {
            attachDropdownEvents();
        },
        
        // Exportação de selecionados
        onExportSelected: (ids) => {
            exportarSelecionados(ids);
        }
    });
    
    // ==================== Funções específicas de ações ====================
    async function marcarComoLido(nomeArquivo) {
        const formData = new FormData();
        formData.append('nome_arquivo', nomeArquivo);
        const resp = await fetch('/validar/api/marcar_exportado', { method: 'POST', body: formData });
        if (!resp.ok) throw new Error('Erro ao marcar como lido');
        // Atualizar dados no manager e re-renderizar
        const item = manager.data.find(a => a.nome === nomeArquivo);
        if (item) item.exportado = true;
        manager.aplicarFiltros(); // re-aplica filtros e renderiza
    }
    
    async function exportarExcel(nomeArquivo) {
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
    }
    
    async function exportarAlertas(nomeArquivo) {
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
    }
    
    async function exportarSelecionados(nomes) {
        for (const nome of nomes) {
            try {
                await exportarExcel(nome);
                await marcarComoLido(nome);
            } catch(err) {
                console.error(`Erro ao exportar ${nome}:`, err);
                alert(`Erro ao exportar ${nome}: ${err.message}`);
            }
        }
        manager.selectedIds.clear();
        manager.renderTable();
        manager.updateSelectionPanel();
    }
    
    // ==================== Dropdowns inline (específico desta página) ====================
    function attachDropdownEvents() {
        document.querySelectorAll('.dropdown-btn').forEach(btn => {
            btn.removeEventListener('click', dropdownClickHandler);
            btn.addEventListener('click', dropdownClickHandler);
        });
        document.removeEventListener('click', outsideClickHandler);
        document.addEventListener('click', outsideClickHandler);
        // Delegação para ações dos dropdowns
        const container = document.getElementById('arquivos-container');
        container.removeEventListener('click', actionClickHandler);
        container.addEventListener('click', actionClickHandler);
    }
    
    function dropdownClickHandler(e) {
        e.stopPropagation();
        const dropdown = e.currentTarget.closest('.dropdown');
        const content = dropdown.querySelector('.dropdown-content');
        document.querySelectorAll('.dropdown-content').forEach(d => {
            if (d !== content) d.classList.remove('show');
        });
        content.classList.toggle('show');
    }
    
    function outsideClickHandler(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
        }
    }
    
    async function actionClickHandler(e) {
        const target = e.target;
        const link = target.closest('.dropdown-item');
        if (!link) return;
        e.preventDefault();
        e.stopPropagation();
        const nome = link.dataset.nome;
        if (!nome) return;
        // Fechar dropdown
        const dropdown = link.closest('.dropdown');
        if (dropdown) {
            dropdown.querySelector('.dropdown-content')?.classList.remove('show');
        }
        if (link.classList.contains('export-excel')) {
            try {
                await exportarExcel(nome);
                await marcarComoLido(nome);
            } catch(err) {
                alert('Erro: ' + err.message);
            }
        } else if (link.classList.contains('export-alerts')) {
            try {
                await exportarAlertas(nome);
                await marcarComoLido(nome);
            } catch(err) {
                alert('Erro: ' + err.message);
            }
        } else if (link.classList.contains('mark-read')) {
            try {
                await marcarComoLido(nome);
            } catch(err) {
                alert('Erro: ' + err.message);
            }
        }
    }
    
    // ==================== Inicialização dos filtros (HTML do dropdown) ====================
    function inicializarFiltrosDropdown() {
        const filtrosDropdown = document.getElementById('filtros-dropdown');
        if (!filtrosDropdown) return;
        filtrosDropdown.innerHTML = `
            <label>Estado:</label>
            <select id="filtro-status">
                <option value="">Todos</option>
                <option value="nao">Não exportado (Novo)</option>
                <option value="sim">Exportado (Lido)</option>
            </select>
            <label>Data de processamento (início):</label>
            <input type="date" id="filtro-data-ini">
            <label>Data de processamento (fim):</label>
            <input type="date" id="filtro-data-fim">
            <label>Total (€) mínimo:</label>
            <input type="number" id="filtro-total-min" step="0.01">
            <label>Total (€) máximo:</label>
            <input type="number" id="filtro-total-max" step="0.01">
            <button id="btn-aplicar-filtros" class="btn btn-primary btn-sm">Aplicar</button>
        `;
        const btnAplicar = document.getElementById('btn-aplicar-filtros');
        if (btnAplicar) {
            btnAplicar.addEventListener('click', () => {
                filtrosDropdown.classList.add('hidden');
                manager.aplicarFiltros();
            });
        }
    }
    
    // ==================== Arranque ====================
    inicializarFiltrosDropdown();
    manager.init();
});