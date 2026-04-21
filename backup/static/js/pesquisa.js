// pesquisa.js - refatorado com ListManager (versão compatível com portal dropdowns)
import { ListManager } from './list_common.js';

(function() {
    // ==================== ListManager ====================
    const manager = new ListManager({
        endpoint: '/validar/api/artigos?q=',
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
        storageKey: 'artigos_colunas',
        linhasPorPagina: 40,

        // <<< CORREÇÃO IMPORTANTE: identificador único para seleção >>>
        getItemId: (item) => item.codigo,

        colunasPadrao: ['codigo', 'name', 'descricao', 'categoria', 'linha', 'tipo', 'modelo_catalogo', 'estado', 'ultimo_preco', 'acoes'],
        colunasDisponiveis: [
            { value: 'codigo', label: 'Código' },
            { value: 'name', label: 'Nome' },
            { value: 'descricao', label: 'Descrição' },
            { value: 'categoria', label: 'Categoria' },
            { value: 'linha', label: 'Linha' },
            { value: 'tipo', label: 'Tipo' },
            { value: 'modelo_catalogo', label: 'Modelo Catálogo' },
            { value: 'estado', label: 'Estado' },
            { value: 'preco_unit', label: 'Preço unit.' },
            { value: 'quantidade_vs_preco', label: 'Qtd vs Preço' },
            { value: 'ultimo_preco', label: 'Último preço' },
            { value: 'ultimo_ano', label: 'Último ano' },
            { value: 'seller_product_name', label: 'Nome do Vendedor' },
            { value: 'obs', label: 'Observações' },
            { value: 'modelo', label: 'Modelo (oficial)' },
            { value: 'tipo_cartao', label: 'Tipo Cartão' },
            { value: 'dimensao_x', label: 'Dimensão X' },
            { value: 'dimensao_y', label: 'Dimensão Y' },
            { value: 'dimensao_z', label: 'Dimensão Z' },
            { value: 'ultima_fatura', label: 'Última Fatura' },
            { value: 'acoes', label: 'Ações' }
        ],
        processData: (data) => data,
        getFiltrosExtras: () => ({
            categoria: document.getElementById('filtro-categoria')?.value || '',
            linha: document.getElementById('filtro-linha')?.value || '',
            tipo: document.getElementById('filtro-tipo')?.value || '',
            modelo_catalogo: document.getElementById('filtro-modelo-catalogo')?.value || '',
            estado: document.getElementById('filtro-estado')?.value || '',
            seller_product_name: document.getElementById('filtro-seller-product-name')?.value || '',
            obs: document.getElementById('filtro-obs')?.value || '',
            modelo: document.getElementById('filtro-modelo')?.value || '',
            tipo_cartao: document.getElementById('filtro-tipo-cartao')?.value || '',
            dimensao_x: document.getElementById('filtro-dimensao-x')?.value || '',
            dimensao_y: document.getElementById('filtro-dimensao-y')?.value || '',
            dimensao_z: document.getElementById('filtro-dimensao-z')?.value || '',
            ultima_fatura: document.getElementById('filtro-ultima-fatura')?.value || ''
        }),
        filterItem: (art, termo, filtros) => {
            const norm = (str) => String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
            if (termo) {
                const match = norm(art.codigo).includes(termo) ||
                    norm(art.name).includes(termo) ||
                    norm(art.seller_product_name).includes(termo) ||
                    norm(art.obs).includes(termo) ||
                    norm(art.oficial?.descricao).includes(termo);
                if (!match) return false;
            }
            if (filtros.categoria && art.categoria !== filtros.categoria) return false;
            if (filtros.linha && art.linha !== filtros.linha) return false;
            if (filtros.tipo && art.tipo !== filtros.tipo) return false;
            if (filtros.modelo_catalogo && art.modelo_catalogo !== filtros.modelo_catalogo) return false;
            if (filtros.estado && art.estado !== filtros.estado) return false;
            if (filtros.tipo_cartao && art.oficial?.tipo_cartao !== filtros.tipo_cartao) return false;
            if (filtros.seller_product_name && !norm(art.seller_product_name).includes(norm(filtros.seller_product_name))) return false;
            if (filtros.obs && !norm(art.obs).includes(norm(filtros.obs))) return false;
            if (filtros.modelo && !norm(art.oficial?.modelo).includes(norm(filtros.modelo))) return false;
            if (filtros.ultima_fatura && !norm(art.ultima_fatura).includes(norm(filtros.ultima_fatura))) return false;
            if (filtros.dimensao_x && Number(art.oficial?.dimensoes?.x) !== Number(filtros.dimensao_x)) return false;
            if (filtros.dimensao_y && Number(art.oficial?.dimensoes?.y) !== Number(filtros.dimensao_y)) return false;
            if (filtros.dimensao_z && Number(art.oficial?.dimensoes?.z) !== Number(filtros.dimensao_z)) return false;
            return true;
        },
        sortItem: (a, b, ordenarPor, ordemAscendente) => {
            const getValor = (art, campo) => {
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
                    return Object.entries(qvp).map(([q, d]) => `${q}:${d.preco_medio}`).join(';');
                }
                return '';
            };
            let valA = getValor(a, ordenarPor);
            let valB = getValor(b, ordenarPor);
            const camposNumericos = ['ultimo_preco', 'ultimo_ano', 'dimensao_x', 'dimensao_y', 'dimensao_z'];
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
        },
        renderHeader: (colunasVisiveis) => {
            let html = '<tr><th class="checkbox-col"><input type="checkbox" id="select-all"></th>';
            const labels = {
                codigo: 'Código', name: 'Nome', descricao: 'Descrição', categoria: 'Categoria',
                linha: 'Linha', tipo: 'Tipo', modelo_catalogo: 'Modelo Catálogo', estado: 'Estado',
                preco_unit: 'Preço unit.', quantidade_vs_preco: 'Qtd vs Preço', ultimo_preco: 'Último preço',
                ultimo_ano: 'Último ano', seller_product_name: 'Nome do Vendedor', obs: 'Observações',
                modelo: 'Modelo', tipo_cartao: 'Tipo Cartão', dimensao_x: 'Dim X', dimensao_y: 'Dim Y',
                dimensao_z: 'Dim Z', ultima_fatura: 'Última Fatura', acoes: 'Ações'
            };
            for (const col of colunasVisiveis) {
                if (col === 'acoes') continue;
                html += `<th data-coluna="${col}" class="sortable">${labels[col] || col}</th>`;
            }
            html += '<th>Ações</th></tr>';
            return html;
        },
        renderRow: (art, colunasVisiveis) => {
            const getValor = (campo) => {
                if (campo === 'codigo') return art.codigo ?? '';
                if (campo === 'name') return art.name ?? '';
                if (campo === 'descricao') return art.oficial?.descricao ?? '';
                if (campo === 'categoria') return art.categoria ?? '';
                if (campo === 'linha') return art.linha ?? '';
                if (campo === 'tipo') return art.tipo ?? '';
                if (campo === 'modelo_catalogo') return art.modelo_catalogo ?? '';
                if (campo === 'estado') return art.estado ?? '';
                if (campo === 'preco_unit') return art.ultimo_preco ?? '';
                if (campo === 'quantidade_vs_preco') {
                    const qvp = art.quantidade_vs_preco;
                    if (!qvp) return '';
                    return Object.entries(qvp).map(([q, d]) => `${q}: ${d.preco_medio}`).join('; ');
                }
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
                return '';
            };
            let html = `<td class="checkbox-col"><input type="checkbox" class="row-select" value="${art.codigo}"></td>`;
            for (const col of colunasVisiveis) {
                if (col === 'acoes') {
                    html += `<td><a href="/validar/artigo/${encodeURIComponent(art.codigo)}">Ver</a></td>`;
                } else {
                    html += `<td>${getValor(col)}</td>`;
                }
            }
            return html;
        },
        onExportSelected: (ids) => {
            if (ids.length === 0) {
                alert('Nenhum artigo selecionado.');
                return;
            }
            fetch('/validar/api/artigos/exportar_excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigos: ids })
            })
            .then(async resp => {
                if (!resp.ok) {
                    const err = await resp.json();
                    throw new Error(err.detail || 'Erro ao exportar');
                }
                const blob = await resp.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'artigos_selecionados.xlsx';
                a.click();
                URL.revokeObjectURL(url);
            })
            .catch(err => alert('Erro na exportação: ' + err.message));
        }
    });

    // ==================== Carregar dicionários ====================
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
                    const emptyOption = select.querySelector('option[value=""]');
                    select.innerHTML = '';
                    if (emptyOption) select.appendChild(emptyOption.cloneNode(true));
                    else {
                        const opt = document.createElement('option');
                        opt.value = '';
                        opt.textContent = 'Todos';
                        select.appendChild(opt);
                    }
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

    // ==================== Inicialização ====================
    async function init() {
        await carregarDicionarios();
        manager.init();
    }

    init();
})();