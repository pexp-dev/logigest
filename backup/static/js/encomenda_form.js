// encomenda_form.js
import * as Utils from './encomenda_comum.js';

(function() {
    // ==================== Elementos DOM (formulário) ====================
    const viewTable = document.getElementById('view-table');
    const viewForm = document.getElementById('view-form');
    const btnNova = document.getElementById('btn-nova');
    const btnBack = document.getElementById('btn-back');
    const btnCancelarForm = document.getElementById('btn-cancelar-form');
    const encNumero = document.getElementById('enc-numero');
    const encCliente = document.getElementById('enc-cliente');
    const encData = document.getElementById('enc-data');
    const encObs = document.getElementById('enc-obs');
    const encProjeto = document.getElementById('enc-projeto');
    const encRefCliente = document.getElementById('enc-ref-cliente');
    const btnGuardar = document.getElementById('btn-guardar');
    const tbodyLinhas = document.getElementById('linhas-tbody');
    const btnImportarExcel = document.getElementById('btn-importar-excel');
    const btnImportarMultiplas = document.getElementById('btn-importar-multiplas');
    const modalExcel = document.getElementById('modal-excel');
    const importarConfirm = document.getElementById('importar-confirm');
    const importarCancel = document.getElementById('importar-cancel');
    const excelFileInput = document.getElementById('excel-file');

    // ==================== Templates ====================
    const templateLinhaArtigo = document.getElementById('template-linha-artigo');
    const templateLinhaSecao = document.getElementById('template-linha-secao');
    const templateLinhaNota = document.getElementById('template-linha-nota');
    const templateSubTabelaCatalogo = document.getElementById('template-subtabela-catalogo');
    const templateSubLinhaItem = document.getElementById('template-sub-linha-item');
    const templateModalArtigos = document.getElementById('template-modal-pesquisa-artigos');
    const templateModalCatalogos = document.getElementById('template-modal-pesquisa-catalogos');

    // ==================== Estado do formulário ====================
    let linhas = [];
    let nextId = 1;
    let editMode = false;
    let currentNumero = null;
    let currentNumeroSanitizado = null;
    let editingCell = null;

    // Modal pesquisa
    let currentEditingLinha = null;
    let currentAddCatalogoCallback = null;
    let modoImportacaoMultiplas = false;

    // ==================== Função de redimensionamento de colunas ====================
    function initTableResize(table, storageKey) {
        if (!table) return;

        const headers = table.querySelectorAll('th');
        let savedWidths = {};
        try {
            savedWidths = JSON.parse(localStorage.getItem(storageKey)) || {};
        } catch (e) {}

        // Aplicar larguras guardadas
        headers.forEach((th, index) => {
            const key = th.dataset.coluna || `col_${index}`;
            if (savedWidths[key]) {
                th.style.width = savedWidths[key];
            }
        });

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
                    const key = th.dataset.coluna || `col_${Array.from(headers).indexOf(th)}`;
                    const widths = {};
                    try {
                        const saved = localStorage.getItem(storageKey);
                        if (saved) Object.assign(widths, JSON.parse(saved));
                    } catch (e) {}
                    widths[key] = th.style.width;
                    localStorage.setItem(storageKey, JSON.stringify(widths));
                }
                isResizing = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            resizer.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                isResizing = true;
                startX = e.pageX;
                startWidth = th.offsetWidth;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            resizer.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
            });
        });
    }

    // ==================== Funções de utilidade (formulário) ====================
    function mostrarFormulário() {
        viewTable.classList.add('hidden');
        viewForm.classList.remove('hidden');
    }

    window.mostrarFormulario = mostrarFormulário;

    function limparFormulario() {
        encNumero.value = '';
        encCliente.value = '';
        encData.value = '';
        encObs.value = '';
        encProjeto.value = '';
        encRefCliente.value = '';
        linhas = [];
        renderizarLinhas();
        editMode = false;
        currentNumero = null;
        currentNumeroSanitizado = null;
    }

    function carregarDadosNoFormulario(dados) {
        encNumero.value = dados.cabecalho.numero || '';
        encCliente.value = dados.cabecalho.cliente || '';
        encData.value = dados.cabecalho.data || '';
        encObs.value = dados.cabecalho.obs || '';
        encProjeto.value = dados.cabecalho.projeto || '';
        encRefCliente.value = dados.cabecalho.ref_cliente || '';
        linhas = dados.linhas.map(l => {
            if (l.tipo === 'catalogo' && !l.filhos) l.filhos = [];
            if (l.descricao_odoo === undefined) l.descricao_odoo = '';
            return { ...l, id: nextId++ };
        });
        renderizarLinhas();
        editMode = true;
        currentNumero = dados.cabecalho.numero;
        currentNumeroSanitizado = Utils.sanitizarNumero(currentNumero);
    }

    // ==================== Edição inline ====================
    function formatarValor(linha, campo) {
        if (campo === 'qtd') return linha.qtd || 1;
        if (campo === 'dimensoes') {
            const d = linha.dimensoes || {};
            return `${d.x || ''}×${d.y || ''}×${d.z || ''}`;
        }
        if (campo === 'artigo_catalogo') {
            if (linha.artigo_codigo) return `${linha.artigo_codigo}`;
            if (linha.catalogo_id) return `${linha.catalogo_id}`;
            return '';
        }
        return linha[campo] || '';
    }

    function criarCelulaEditavel(linha, campo, tipo = 'text') {
        const td = document.createElement('td');
        const container = document.createElement('div');
        container.className = 'cell-with-icon';
        const spanValor = document.createElement('span');
        spanValor.textContent = formatarValor(linha, campo);
        spanValor.style.flex = '1';
        spanValor.style.cursor = 'pointer';
        container.appendChild(spanValor);
        if (campo === 'artigo_catalogo') {
            const icon = document.createElement('i');
            icon.className = 'fas fa-search td-pesquisa-icon';
            icon.title = 'Pesquisar artigo ou catálogo';
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                abrirPesquisaUnificada(linha);
            });
            container.appendChild(icon);
        }
        td.appendChild(container);
        spanValor.addEventListener('click', (e) => {
            e.stopPropagation();
            if (campo === 'artigo_catalogo') {
                abrirPesquisaUnificada(linha);
            } else {
                tornarCelulaEditavel(td, linha, campo, tipo);
            }
        });
        return td;
    }

    function tornarCelulaEditavel(td, linha, campo, tipo = 'text') {
        if (editingCell) return;
        let valorOriginal = linha[campo] !== undefined ? linha[campo] : '';
        const input = document.createElement('input');
        input.type = tipo === 'number' ? 'number' : 'text';
        input.value = valorOriginal;
        input.className = 'editable-input';
        td.innerHTML = '';
        td.appendChild(input);
        input.focus();
        const salvar = () => {
            let novoValor = input.type === 'number' ? parseFloat(input.value) : input.value;
            if (campo === 'qtd' && (isNaN(novoValor) || novoValor < 1)) novoValor = 1;
            if (novoValor !== valorOriginal) {
                linha[campo] = novoValor;
                renderizarLinhas();
            } else {
                td.textContent = formatarValor(linha, campo);
            }
            editingCell = null;
        };
        input.addEventListener('blur', salvar);
        input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
        editingCell = td;
    }

    function criarCelulaDimensoes(linha) {
        const td = document.createElement('td');
        const dims = linha.dimensoes || {};
        const exibir = () => { td.textContent = `${dims.x || ''}×${dims.y || ''}×${dims.z || ''}`; };
        exibir();
        td.style.cursor = 'pointer';
        td.addEventListener('click', (e) => {
            e.stopPropagation();
            if (editingCell) return;
            const container = document.createElement('div');
            container.style.display = 'flex';
            container.style.gap = '4px';
            const inputX = document.createElement('input'); inputX.type = 'number'; inputX.value = dims.x ?? ''; inputX.placeholder = 'X'; inputX.style.width = '50px';
            const inputY = document.createElement('input'); inputY.type = 'number'; inputY.value = dims.y ?? ''; inputY.placeholder = 'Y'; inputY.style.width = '50px';
            const inputZ = document.createElement('input'); inputZ.type = 'number'; inputZ.value = dims.z ?? ''; inputZ.placeholder = 'Z'; inputZ.style.width = '50px';
            container.appendChild(inputX); container.appendChild(inputY); container.appendChild(inputZ);
            td.innerHTML = ''; td.appendChild(container);
            const focusHandler = () => {
                dims.x = inputX.value ? parseFloat(inputX.value) : null;
                dims.y = inputY.value ? parseFloat(inputY.value) : null;
                dims.z = inputZ.value ? parseFloat(inputZ.value) : null;
                linha.dimensoes = dims;
                exibir();
                editingCell = null;
            };
            inputX.addEventListener('blur', focusHandler);
            inputY.addEventListener('blur', focusHandler);
            inputZ.addEventListener('blur', focusHandler);
            inputX.addEventListener('keypress', (e) => { if (e.key === 'Enter') inputX.blur(); });
            inputY.addEventListener('keypress', (e) => { if (e.key === 'Enter') inputY.blur(); });
            inputZ.addEventListener('keypress', (e) => { if (e.key === 'Enter') inputZ.blur(); });
            inputX.focus();
            editingCell = td;
        });
        return td;
    }

    function criarCelulaNumero(num) { const td = document.createElement('td'); td.textContent = num; return td; }

    function removerLinha(id) {
        const idx = linhas.findIndex(l => l.id === id);
        if (idx !== -1 && confirm('Remover esta linha?')) {
            linhas.splice(idx, 1);
            renderizarLinhas();
        }
    }

    // ==================== Renderização principal usando templates ====================
    function renderizarLinhas() {
        if (!tbodyLinhas) return;
        tbodyLinhas.innerHTML = '';
        let idx = 0;
        for (const linha of linhas) {
            idx++;
            if (linha.tipo === 'secao') {
                const clone = templateLinhaSecao.content.cloneNode(true);
                const tr = clone.querySelector('tr');
                tr.querySelector('.secao-titulo').textContent = linha.descricao || 'Nova Secção';
                const btnRemover = tr.querySelector('.btn-remover-linha');
                if (btnRemover) btnRemover.onclick = () => removerLinha(linha.id);
                tbodyLinhas.appendChild(tr);
                continue;
            }
            if (linha.tipo === 'nota') {
                const clone = templateLinhaNota.content.cloneNode(true);
                const tr = clone.querySelector('tr');
                const textarea = tr.querySelector('.nota-textarea');
                textarea.value = linha.descricao || '';
                textarea.addEventListener('blur', () => { linha.descricao = textarea.value; });
                const btnRemover = tr.querySelector('.btn-remover-linha');
                if (btnRemover) btnRemover.onclick = () => removerLinha(linha.id);
                tbodyLinhas.appendChild(tr);
                continue;
            }

            // Linha normal (artigo ou catálogo)
            const clone = templateLinhaArtigo.content.cloneNode(true);
            const tr = clone.querySelector('tr');
            tr.dataset.id = linha.id;

            // Preencher células
            tr.querySelector('.celula-numero').textContent = idx;
            
            // Substituir células editáveis
            const tds = tr.querySelectorAll('td');
            tds[1].replaceWith(criarCelulaEditavel(linha, 'ref_cliente'));
            tds[2].replaceWith(criarCelulaEditavel(linha, 'descricao'));
            tds[3].replaceWith(criarCelulaEditavel(linha, 'descricao_odoo'));
            tds[4].replaceWith(criarCelulaEditavel(linha, 'qtd', 'number'));
            tds[5].replaceWith(criarCelulaEditavel(linha, 'artigo_catalogo'));
            tds[6].replaceWith(criarCelulaDimensoes(linha));
            tds[7].replaceWith(criarCelulaEditavel(linha, 'tag1'));
            tds[8].replaceWith(criarCelulaEditavel(linha, 'tag2'));
            
            const btnRemover = tr.querySelector('.btn-remover-linha');
            if (btnRemover) btnRemover.onclick = () => removerLinha(linha.id);
            
            tbodyLinhas.appendChild(tr);

            // Sub-tabela para catálogo
            if (linha.tipo === 'catalogo' && linha.filhos && linha.filhos.length > 0) {
                const subClone = templateSubTabelaCatalogo.content.cloneNode(true);
                const subTr = subClone.querySelector('tr');
                subTr.dataset.parent = linha.id;
                
                const subTbody = subTr.querySelector('.sub-tbody');
                const addBtn = subTr.querySelector('.add-sub-item-header');
                
                // Preencher linhas filhas
                linha.filhos.forEach((filho, fIdx) => {
                    const itemClone = templateSubLinhaItem.content.cloneNode(true);
                    const itemTr = itemClone.querySelector('tr');
                    
                    const inputArtigo = itemTr.querySelector('.sub-artigo');
                    const inputQtd = itemTr.querySelector('.sub-qtd');
                    const inputDesc = itemTr.querySelector('.sub-descricao');
                    const inputForn = itemTr.querySelector('.sub-fornecedor');
                    const inputRef = itemTr.querySelector('.sub-ref');
                    const btnRemoverSub = itemTr.querySelector('.remover-sub');
                    
                    if (inputArtigo) inputArtigo.value = filho.artigo_codigo || '';
                    if (inputQtd) inputQtd.value = filho.qtd || 1;
                    if (inputDesc) inputDesc.value = filho.descricao || '';
                    if (inputForn) inputForn.value = filho.fornecedor || '';
                    if (inputRef) inputRef.value = filho.ref_fornecedor || '';
                    
                    const inputs = itemTr.querySelectorAll('input');
                    inputs.forEach(input => {
                        input.addEventListener('change', () => {
                            const campo = input.classList.contains('sub-artigo') ? 'artigo_codigo' :
                                         input.classList.contains('sub-qtd') ? 'qtd' :
                                         input.classList.contains('sub-descricao') ? 'descricao' :
                                         input.classList.contains('sub-fornecedor') ? 'fornecedor' : 'ref_fornecedor';
                            let val = input.value;
                            if (campo === 'qtd') val = parseInt(val) || 1;
                            filho[campo] = val;
                        });
                    });
                    
                    if (btnRemoverSub) {
                        btnRemoverSub.addEventListener('click', () => {
                            linha.filhos.splice(fIdx, 1);
                            renderizarLinhas();
                        });
                    }
                    
                    subTbody.appendChild(itemTr);
                });
                
                if (addBtn) {
                    addBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        linha.filhos.push({ artigo_codigo: '', qtd: 1, descricao: '', fornecedor: '', ref_fornecedor: '' });
                        renderizarLinhas();
                    });
                }
                
                tbodyLinhas.appendChild(subTr);
            }
        }
        atualizarTotais();

        // Inicializar redimensionamento para a tabela principal
        const mainTable = document.getElementById('tabela-linhas'); // ajusta se o id for diferente
        if (mainTable) {
            initTableResize(mainTable, 'encomenda_form_main');
        }

        // Inicializar redimensionamento para cada sub-tabela
        document.querySelectorAll('.sub-tabela').forEach(subTable => {
            const parentRow = subTable.closest('tr');
            const catalogoId = parentRow?.dataset?.parent || 'unknown';
            initTableResize(subTable, `encomenda_form_sub_${catalogoId}`);
        });
    }

    // ==================== Pesquisa unificada (mantida igual) ====================
    // ... (todo o código da pesquisa unificada permanece inalterado)

    // ==================== Totais, Guardar, Importar, etc. (mantidos iguais) ====================
    // ...

    // ==================== Inicialização ====================
    function init() {
        bindEvents();
    }

    init();
})();