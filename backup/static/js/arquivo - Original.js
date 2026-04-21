// arquivo.js - com dropdowns funcionais e sem erros após re-renderização

window.addEventListener('DOMContentLoaded', () => {

    // ==================== Elementos DOM ====================
    const container = document.getElementById('arquivos-container');
    const loadingDiv = document.getElementById('loading');
    const paginacaoDiv = document.getElementById('paginacao');
    const infoPagina = document.getElementById('info-pagina');
    const btnAnterior = document.getElementById('btn-anterior');
    const btnSeguinte = document.getElementById('btn-seguinte');

    const pesquisaInput = document.getElementById('pesquisa');
    const btnPesquisar = document.getElementById('btn-pesquisar');
    const btnLimparFiltros = document.getElementById('btn-limpar-filtros');
    const btnFiltros = document.getElementById('btn-filtros');
    const filtrosDropdown = document.getElementById('filtros-dropdown');
    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros');
    const btnColunas = document.getElementById('btn-colunas');
    const colunasDropdown = document.getElementById('colunas-dropdown');
    const aplicarColunas = document.getElementById('aplicar-colunas');

    const selectAllCheckbox = document.getElementById('select-all');
    const selectionPanel = document.getElementById('selection-panel');
    const selectedCountSpan = document.getElementById('selected-count');
    const unselectAllBtn = document.getElementById('unselect-all');
    const selectAllDomainBtn = document.getElementById('select-all-domain');
    const totalCountBadge = document.getElementById('total-count-badge');
    const exportSelectedBtn = document.getElementById('export-selected');
    const actionsDropdownBtn = document.getElementById('actionsDropdownBtn');
    const actionsDropdownMenu = document.getElementById('actionsDropdownMenu');

    // ==================== Estado ====================
    let todosArquivos = [];
    let arquivosFiltrados = [];
    let paginaAtual = 1;
    let selectedNomes = new Set();
    let colunasVisiveis = ['checkbox', 'documento', 'data', 'processado_em', 'total_fatura', 'estado', 'acoes'];
    let ordenarPor = null;
    let ordemAscendente = true;

    const LINHAS_POR_PAGINA = 22;
    const STORAGE_KEY = 'arquivo_colunas';

    const colunasGuardadas = localStorage.getItem(STORAGE_KEY);
    if (colunasGuardadas) {
        try {
            const parsed = JSON.parse(colunasGuardadas);
            if (Array.isArray(parsed) && parsed.length) {
                colunasVisiveis = parsed;
                if (!colunasVisiveis.includes('acoes')) colunasVisiveis.push('acoes');
            }
        } catch(e) {}
    }

    // ==================== Funções auxiliares ====================
    function showLoader() {
        loadingDiv.style.display = 'block';
        container.style.display = 'none';
        if (paginacaoDiv) paginacaoDiv.style.display = 'none';
    }
    function hideLoader() {
        loadingDiv.style.display = 'none';
        container.style.display = 'block';
        if (paginacaoDiv) paginacaoDiv.style.display = 'flex';
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
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
    }
    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/["']/g, m => ({ '"':'&quot;', "'":'&#39;' }[m]));
    }

    // ==================== Filtros ====================
    function existemFiltrosAtivos() {
        if (pesquisaInput.value.trim() !== '') return true;
        const filtroStatus = document.getElementById('filtro-status')?.value;
        if (filtroStatus && filtroStatus !== '') return true;
        const filtroDataIni = document.getElementById('filtro-data-ini')?.value;
        if (filtroDataIni) return true;
        const filtroDataFim = document.getElementById('filtro-data-fim')?.value;
        if (filtroDataFim) return true;
        const filtroTotalMin = document.getElementById('filtro-total-min')?.value;
        if (filtroTotalMin && filtroTotalMin !== '') return true;
        const filtroTotalMax = document.getElementById('filtro-total-max')?.value;
        if (filtroTotalMax && filtroTotalMax !== '') return true;
        return false;
    }
    function atualizarBotaoLimpar() {
        if (btnLimparFiltros) {
            btnLimparFiltros.style.display = existemFiltrosAtivos() ? 'inline-flex' : 'none';
        }
    }
    function limparFiltrosCompletos() {
        pesquisaInput.value = '';
        const statusSelect = document.getElementById('filtro-status');
        if (statusSelect) statusSelect.value = '';
        const dataIni = document.getElementById('filtro-data-ini');
        if (dataIni) dataIni.value = '';
        const dataFim = document.getElementById('filtro-data-fim');
        if (dataFim) dataFim.value = '';
        const totalMin = document.getElementById('filtro-total-min');
        if (totalMin) totalMin.value = '';
        const totalMax = document.getElementById('filtro-total-max');
        if (totalMax) totalMax.value = '';
        aplicarFiltros();
        atualizarBotaoLimpar();
    }

    // ==================== API ====================
    async function carregarArquivos() {
        showLoader();
        try {
            const resp = await fetch('/validar/api/arquivo/listar');
            if (!resp.ok) throw new Error('Erro ao carregar');
            todosArquivos = await resp.json();
            if (todosArquivos.length === 0) {
                container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">Nenhum documento arquivado encontrado.</p>';
                paginacaoDiv.style.display = 'none';
                loadingDiv.style.display = 'none';
                return;
            }
            aplicarFiltros();
        } catch (err) {
            console.error(err);
            container.innerHTML = '<p style="color: var(--danger-bg); text-align: center;">Erro ao carregar arquivos.</p>';
            loadingDiv.style.display = 'none';
        } finally {
            hideLoader();
        }
    }

    async function marcarComoLido(nomeArquivo) {
        const formData = new FormData();
        formData.append('nome_arquivo', nomeArquivo);
        const resp = await fetch('/validar/api/marcar_exportado', { method: 'POST', body: formData });
        if (!resp.ok) throw new Error('Erro ao marcar como lido');
        const idx = todosArquivos.findIndex(a => a.nome === nomeArquivo);
        if (idx !== -1) todosArquivos[idx].exportado = true;
        const idxFilt = arquivosFiltrados.findIndex(a => a.nome === nomeArquivo);
        if (idxFilt !== -1) arquivosFiltrados[idxFilt].exportado = true;
        renderizarTabela();
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

    // ==================== Lógica de filtros e ordenação ====================
    function aplicarFiltros() {
        const termo = pesquisaInput.value.toLowerCase().trim();
        const filtroStatus = document.getElementById('filtro-status')?.value;
        const filtroDataIni = document.getElementById('filtro-data-ini')?.value;
        const filtroDataFim = document.getElementById('filtro-data-fim')?.value;
        const filtroTotalMin = parseFloat(document.getElementById('filtro-total-min')?.value);
        const filtroTotalMax = parseFloat(document.getElementById('filtro-total-max')?.value);

        arquivosFiltrados = todosArquivos.filter(arq => {
            if (termo) {
                const match = (arq.documento && arq.documento.toLowerCase().includes(termo)) ||
                              (arq.data && arq.data.toLowerCase().includes(termo)) ||
                              (arq.total_fatura && arq.total_fatura.toString().includes(termo));
                if (!match) return false;
            }
            if (filtroStatus !== undefined && filtroStatus !== '') {
                const isExportado = (filtroStatus === 'sim');
                if (arq.exportado !== isExportado) return false;
            }
            if (filtroDataIni || filtroDataFim) {
                const dataProc = arq.processado_em ? new Date(arq.processado_em) : null;
                if (dataProc) {
                    if (filtroDataIni && new Date(filtroDataIni) > dataProc) return false;
                    if (filtroDataFim && new Date(filtroDataFim) < dataProc) return false;
                } else if (filtroDataIni || filtroDataFim) return false;
            }
            const total = arq.total_fatura || 0;
            if (!isNaN(filtroTotalMin) && total < filtroTotalMin) return false;
            if (!isNaN(filtroTotalMax) && total > filtroTotalMax) return false;
            return true;
        });

        if (ordenarPor) {
            arquivosFiltrados.sort((a,b) => {
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
            });
        }

        selectedNomes.clear();
        paginaAtual = 1;
        renderizarTabela();
        atualizarPaginacao();
        atualizarPainelSelecao();
        atualizarBotaoLimpar();
    }

    function ordenarPorColuna(coluna) {
        if (ordenarPor === coluna) ordemAscendente = !ordemAscendente;
        else { ordenarPor = coluna; ordemAscendente = true; }
        aplicarFiltros();
    }

    // ==================== Renderização da tabela ====================
    function renderizarTabela() {
        const inicio = (paginaAtual - 1) * LINHAS_POR_PAGINA;
        const fim = inicio + LINHAS_POR_PAGINA;
        const paginaItens = arquivosFiltrados.slice(inicio, fim);

        let html = `
            <table>
                <thead>
                    <tr>
                        ${colunasVisiveis.includes('checkbox') ? '<th class="checkbox-col"><input type="checkbox" id="select-all"></th>' : ''}
                        ${colunasVisiveis.includes('documento') ? '<th data-coluna="documento" class="sortable">Documento</th>' : ''}
                        ${colunasVisiveis.includes('data') ? '<th data-coluna="data" class="sortable">Data da Fatura</th>' : ''}
                        ${colunasVisiveis.includes('processado_em') ? '<th data-coluna="processado_em" class="sortable">Processado em</th>' : ''}
                        ${colunasVisiveis.includes('total_fatura') ? '<th data-coluna="total_fatura" class="sortable">Total (€)</th>' : ''}
                        ${colunasVisiveis.includes('estado') ? '<th data-coluna="estado">Estado</th>' : ''}
                        ${colunasVisiveis.includes('acoes') ? '<th>Ações</th>' : ''}
                    </tr>
                </thead>
                <tbody>
        `;

        paginaItens.forEach(arq => {
            const exportado = arq.exportado;
            const totalFormatado = (arq.total_fatura || 0).toFixed(2) + ' €';
            const nomeArquivo = arq.nome;
            html += `<tr data-nome="${escapeAttr(nomeArquivo)}">`;
            if (colunasVisiveis.includes('checkbox')) {
                html += `<td class="checkbox-col"><input type="checkbox" class="row-select" value="${escapeAttr(nomeArquivo)}" ${selectedNomes.has(nomeArquivo) ? 'checked' : ''}></td>`;
            }
            if (colunasVisiveis.includes('documento')) html += `<td>${escapeHtml(arq.documento || '')}</td>`;
            if (colunasVisiveis.includes('data')) html += `<td>${escapeHtml(arq.data || '')}</td>`;
            if (colunasVisiveis.includes('processado_em')) html += `<td>${escapeHtml(formatarDataISO(arq.processado_em))}</td>`;
            if (colunasVisiveis.includes('total_fatura')) html += `<td>${totalFormatado}</td>`;
            if (colunasVisiveis.includes('estado')) {
                html += `<td class="status-cell">${!exportado ? '<span class="badge badge-novo">Novo</span>' : ''}</td>`;
            }
            if (colunasVisiveis.includes('acoes')) {
                html += `<td class="action-cell">
                    <div class="dropdown">
                        <button class="dropdown-btn"><i class="fas fa-cog"></i></button>
                        <div class="dropdown-content">
                            <a href="#" class="dropdown-item export-excel" data-nome="${escapeAttr(nomeArquivo)}"><i class="fas fa-file-excel"></i> Exportar Excel</a>
                            <a href="#" class="dropdown-item export-alerts" data-nome="${escapeAttr(nomeArquivo)}"><i class="fas fa-chart-line"></i> Exportar Alertas</a>
                            ${!exportado ? '<a href="#" class="dropdown-item mark-read" data-nome="'+escapeAttr(nomeArquivo)+'"><i class="fas fa-check-circle"></i> Marcar como lido</a>' : ''}
                        </div>
                    </div>
                </td>`;
            }
            html += `</tr>`;
        });

        html += `
                </tbody>
            </table>
        `;
        container.innerHTML = html;

        // Reattach dos eventos após renderização
        attachDropdownEvents();
        attachCheckboxEvents();
        attachSortEvents();
    }

    // ==================== Eventos de dropdown ====================
    function attachDropdownEvents() {
        // Abrir/fechar dropdown ao clicar no botão
        document.querySelectorAll('.dropdown-btn').forEach(btn => {
            btn.removeEventListener('click', dropdownClickHandler);
            btn.addEventListener('click', dropdownClickHandler);
        });
        // Fechar dropdowns ao clicar fora
        document.removeEventListener('click', outsideClickHandler);
        document.addEventListener('click', outsideClickHandler);
        // Ações dos itens (export, marcar) – usamos delegação para não precisar reattach
        container.removeEventListener('click', actionClickHandler);
        container.addEventListener('click', actionClickHandler);
    }

    function dropdownClickHandler(e) {
        e.stopPropagation();
        const dropdown = e.currentTarget.closest('.dropdown');
        const content = dropdown.querySelector('.dropdown-content');
        // Fechar todos os outros
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

        // Fechar o dropdown imediatamente
        const dropdown = link.closest('.dropdown');
        if (dropdown) {
            const content = dropdown.querySelector('.dropdown-content');
            if (content) content.classList.remove('show');
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

    // ==================== Eventos de checkbox e seleção ====================
    function attachCheckboxEvents() {
        const newSelectAll = document.getElementById('select-all');
        if (newSelectAll) {
            newSelectAll.removeEventListener('change', selectAllChangeHandler);
            newSelectAll.addEventListener('change', selectAllChangeHandler);
        }
        document.querySelectorAll('.row-select').forEach(cb => {
            cb.removeEventListener('change', rowSelectChangeHandler);
            cb.addEventListener('change', rowSelectChangeHandler);
        });
    }

    function selectAllChangeHandler(e) {
        const checkboxes = document.querySelectorAll('#arquivos-container .row-select');
        checkboxes.forEach(cb => {
            cb.checked = e.target.checked;
            const nome = cb.value;
            if (e.target.checked) selectedNomes.add(nome);
            else selectedNomes.delete(nome);
        });
        atualizarSelectAllPagina();
        atualizarPainelSelecao();
    }

    function rowSelectChangeHandler(e) {
        const nome = e.target.value;
        if (e.target.checked) selectedNomes.add(nome);
        else selectedNomes.delete(nome);
        atualizarSelectAllPagina();
        atualizarPainelSelecao();
    }

    function atualizarSelectAllPagina() {
        const checkboxes = document.querySelectorAll('#arquivos-container .row-select');
        const todosChecked = checkboxes.length > 0 && Array.from(checkboxes).every(cb => cb.checked);
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = todosChecked;
            selectAllCheckbox.indeterminate = !todosChecked && Array.from(checkboxes).some(cb => cb.checked);
        }
    }

    function atualizarPainelSelecao() {
        const count = selectedNomes.size;
        if (selectedCountSpan) selectedCountSpan.textContent = count;
        const totalFiltrados = arquivosFiltrados.length;
        if (count > 0 && count < totalFiltrados) {
            if (selectAllDomainBtn) selectAllDomainBtn.classList.remove('hidden');
            if (totalCountBadge) totalCountBadge.textContent = totalFiltrados;
        } else {
            if (selectAllDomainBtn) selectAllDomainBtn.classList.add('hidden');
        }
        if (count > 0) {
            if (selectionPanel) selectionPanel.style.display = 'flex';
        } else {
            if (selectionPanel) selectionPanel.style.display = 'none';
        }
    }

    async function exportarSelecionados() {
        const nomes = Array.from(selectedNomes);
        if (nomes.length === 0) { alert('Nenhum documento selecionado.'); return; }
        for (const nome of nomes) {
            try {
                await exportarExcel(nome);
                await marcarComoLido(nome);
            } catch(err) {
                console.error(`Erro ao exportar ${nome}:`, err);
                alert(`Erro ao exportar ${nome}: ${err.message}`);
            }
        }
        selectedNomes.clear();
        renderizarTabela();
        atualizarPainelSelecao();
    }

    // ==================== Eventos de ordenação ====================
    function attachSortEvents() {
        document.querySelectorAll('th.sortable').forEach(th => {
            th.removeEventListener('click', sortClickHandler);
            th.addEventListener('click', sortClickHandler);
        });
    }

    function sortClickHandler(e) {
        const coluna = e.currentTarget.dataset.coluna;
        ordenarPorColuna(coluna);
    }

    // ==================== Paginação ====================
    function atualizarPaginacao() {
        const totalPaginas = Math.ceil(arquivosFiltrados.length / LINHAS_POR_PAGINA) || 1;
        if (totalPaginas <= 1) {
            paginacaoDiv.style.display = 'none';
            return;
        }
        paginacaoDiv.style.display = 'flex';
        infoPagina.textContent = `Página ${paginaAtual} de ${totalPaginas}`;
        btnAnterior.disabled = paginaAtual <= 1;
        btnSeguinte.disabled = paginaAtual >= totalPaginas;
    }
    function irPaginaAnterior() { if (paginaAtual > 1) { paginaAtual--; renderizarTabela(); atualizarPaginacao(); } }
    function irPaginaSeguinte() { const total = Math.ceil(arquivosFiltrados.length / LINHAS_POR_PAGINA); if (paginaAtual < total) { paginaAtual++; renderizarTabela(); atualizarPaginacao(); } }

    // ==================== Colunas e Filtros dropdowns ====================
    function inicializarDropdownColunas() {
        const containerCol = colunasDropdown;
        if (!containerCol) return;
        const colunas = ['checkbox', 'documento', 'data', 'processado_em', 'total_fatura', 'estado', 'acoes'];
        containerCol.innerHTML = '';
        colunas.forEach(col => {
            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = col;
            cb.checked = colunasVisiveis.includes(col);
            label.appendChild(cb);
            label.appendChild(document.createTextNode(col === 'checkbox' ? ' Selecção' : ` ${col}`));
            containerCol.appendChild(label);
        });
        const btnAplicar = document.createElement('button');
        btnAplicar.id = 'aplicar-colunas';
        btnAplicar.className = 'btn btn-primary btn-sm';
        btnAplicar.textContent = 'Aplicar';
        containerCol.appendChild(btnAplicar);
        btnAplicar.addEventListener('click', () => {
            const checkboxes = containerCol.querySelectorAll('input[type="checkbox"]');
            colunasVisiveis = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
            if (!colunasVisiveis.includes('acoes')) colunasVisiveis.push('acoes');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(colunasVisiveis));
            colunasDropdown.classList.add('hidden');
            renderizarTabela();
        });
    }
    function inicializarFiltrosDropdown() {
        const filtrosHTML = `
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
        filtrosDropdown.innerHTML = filtrosHTML;
        const btnAplicar = document.getElementById('btn-aplicar-filtros');
        if (btnAplicar) btnAplicar.addEventListener('click', () => {
            filtrosDropdown.classList.add('hidden');
            aplicarFiltros();
        });
    }

    // ==================== Eventos principais ====================
    function bindEvents() {
        btnPesquisar.addEventListener('click', () => aplicarFiltros());
        pesquisaInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') aplicarFiltros(); });
        if (btnLimparFiltros) btnLimparFiltros.addEventListener('click', limparFiltrosCompletos);
        btnFiltros.addEventListener('click', (e) => { e.stopPropagation(); filtrosDropdown.classList.toggle('hidden'); });
        btnColunas.addEventListener('click', (e) => { e.stopPropagation(); colunasDropdown.classList.toggle('hidden'); });
        btnAnterior.addEventListener('click', irPaginaAnterior);
        btnSeguinte.addEventListener('click', irPaginaSeguinte);
        if (unselectAllBtn) {
            unselectAllBtn.addEventListener('click', () => {
                selectedNomes.clear();
                document.querySelectorAll('#arquivos-container .row-select').forEach(cb => cb.checked = false);
                if (selectAllCheckbox) selectAllCheckbox.checked = false;
                atualizarSelectAllPagina();
                atualizarPainelSelecao();
            });
        }
        if (selectAllDomainBtn) {
            selectAllDomainBtn.addEventListener('click', () => {
                arquivosFiltrados.forEach(arq => selectedNomes.add(arq.nome));
                document.querySelectorAll('#arquivos-container .row-select').forEach(cb => cb.checked = true);
                if (selectAllCheckbox) selectAllCheckbox.checked = true;
                atualizarSelectAllPagina();
                atualizarPainelSelecao();
            });
        }
        if (exportSelectedBtn) {
            exportSelectedBtn.addEventListener('click', exportarSelecionados);
        }
        if (actionsDropdownBtn && actionsDropdownMenu) {
            actionsDropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                actionsDropdownMenu.classList.toggle('hidden');
            });
        }
        document.addEventListener('click', (e) => {
            if (!btnFiltros.contains(e.target) && !filtrosDropdown.contains(e.target)) filtrosDropdown.classList.add('hidden');
            if (!btnColunas.contains(e.target) && !colunasDropdown.contains(e.target)) colunasDropdown.classList.add('hidden');
            if (actionsDropdownBtn && actionsDropdownMenu && !actionsDropdownBtn.contains(e.target) && !actionsDropdownMenu.contains(e.target)) {
                actionsDropdownMenu.classList.add('hidden');
            }
        });
    }

    // ==================== Inicialização ====================
    inicializarFiltrosDropdown();
    inicializarDropdownColunas();
    bindEvents();
    carregarArquivos();
});