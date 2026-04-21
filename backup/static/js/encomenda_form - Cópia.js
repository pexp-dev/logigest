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

    // Flag para distinguir modo de importação (única vs múltipla)
    let modoImportacaoMultiplas = false;

    // ==================== Funções de utilidade (formulário) ====================
    function mostrarFormulário() {
        viewTable.classList.add('hidden');
        viewForm.classList.remove('hidden');
    }

    window.mostrarFormulario = mostrarFormulário;

    // ==================== Formulário ====================
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
    }

    // ==================== Pesquisa unificada ====================
    function abrirPesquisaUnificada(linha) {
        currentEditingLinha = linha;
        const modal = document.getElementById('modal-pesquisa-universal');
        document.getElementById('modal-pesquisa-titulo').textContent = 'Pesquisar Artigo ou Catálogo';
        document.getElementById('tab-artigos').classList.add('active');
        document.getElementById('tab-catalogos').classList.remove('active');
        const container = document.getElementById('pesquisa-universal-container');
        if (container) carregarInterfacePesquisa(container, 'artigos');
        modal.classList.add('show');
    }

    function carregarInterfacePesquisa(container, tipo) {
        container.innerHTML = '';
        const template = tipo === 'artigos' ? templateModalArtigos : templateModalCatalogos;
        const clone = template.content.cloneNode(true);
        container.appendChild(clone);
        container.dataset.tipo = tipo;
        
        if (tipo === 'artigos') {
            inicializarPesquisaArtigos();
        } else {
            inicializarPesquisaCatalogos();
        }
    }

    let artigosCompletos = [], artigosFiltradosModal = [], paginaAtualArtigos = 1;
    function inicializarPesquisaArtigos() {
        const input = document.getElementById('pesquisa-artigos-input');
        const btnPesquisar = document.getElementById('btn-pesquisar-artigos');
        const tbody = document.querySelector('#tabela-artigos-pesquisa tbody');
        const loading = document.getElementById('loading-artigos');
        const infoPagina = document.getElementById('info-pagina-artigos');
        const btnAnterior = document.getElementById('btn-anterior-artigos');
        const btnSeguinte = document.getElementById('btn-seguinte-artigos');
        
        async function carregar() {
            loading.style.display = 'block';
            try {
                const resp = await fetch('/validar/api/artigos?q=');
                artigosCompletos = await resp.json();
                aplicarFiltros();
            } catch (err) { tbody.innerHTML = '<tr><td colspan="4">Erro</td></tr>'; }
            finally { loading.style.display = 'none'; }
        }
        
        function aplicarFiltros() {
            const termo = input.value.toLowerCase().trim();
            artigosFiltradosModal = artigosCompletos.filter(a => !termo || a.codigo?.toLowerCase().includes(termo) || a.name?.toLowerCase().includes(termo));
            paginaAtualArtigos = 1;
            renderizar();
            atualizarPaginacao();
        }
        
        function renderizar() {
            const inicio = (paginaAtualArtigos-1)*12, fim = inicio+12;
            const itens = artigosFiltradosModal.slice(inicio, fim);
            tbody.innerHTML = '';
            itens.forEach(art => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${Utils.escapeHtml(art.codigo)}</td>
                    <td>${Utils.escapeHtml(art.name)}</td>
                    <td>${art.oficial?.dimensoes?.x || ''}×${art.oficial?.dimensoes?.y || ''}×${art.oficial?.dimensoes?.z || ''}</td>
                    <td><button class="btn btn-sm btn-primary selecionar-artigo" data-codigo="${art.codigo}">Selecionar</button></td>
                `;
                tbody.appendChild(tr);
            });
            document.querySelectorAll('.selecionar-artigo').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const codigo = btn.dataset.codigo;
                    const resp = await fetch(`/validar/api/artigo/${codigo}`);
                    const artigo = await resp.json();
                    if (currentEditingLinha) {
                        currentEditingLinha.tipo = 'artigo';
                        currentEditingLinha.artigo_codigo = artigo.codigo;
                        currentEditingLinha.catalogo_id = null;
                        currentEditingLinha.filhos = [];
                        if (artigo.oficial?.dimensoes) currentEditingLinha.dimensoes = { ...artigo.oficial.dimensoes };
                        if (artigo.name) currentEditingLinha.descricao = artigo.name;
                        renderizarLinhas();
                        fecharModalPesquisa();
                    }
                });
            });
        }
        
        function atualizarPaginacao() {
            const total = Math.ceil(artigosFiltradosModal.length/12);
            infoPagina.textContent = `Página ${paginaAtualArtigos} de ${total||1}`;
            btnAnterior.disabled = paginaAtualArtigos<=1;
            btnSeguinte.disabled = paginaAtualArtigos>=total;
        }
        
        btnPesquisar.addEventListener('click', aplicarFiltros);
        input.addEventListener('keyup', e => e.key==='Enter' && aplicarFiltros());
        btnAnterior.addEventListener('click', () => { if(paginaAtualArtigos>1){ paginaAtualArtigos--; renderizar(); atualizarPaginacao(); } });
        btnSeguinte.addEventListener('click', () => { if(paginaAtualArtigos < Math.ceil(artigosFiltradosModal.length/12)){ paginaAtualArtigos++; renderizar(); atualizarPaginacao(); } });
        carregar();
    }

    let catalogosCompletos = [], catalogosFiltradosModal = [], paginaAtualCatalogos = 1;
    function inicializarPesquisaCatalogos() {
        const input = document.getElementById('pesquisa-catalogos-input');
        const btnPesquisar = document.getElementById('btn-pesquisar-catalogos');
        const tbody = document.querySelector('#tabela-catalogos-pesquisa tbody');
        const loading = document.getElementById('loading-catalogos');
        const infoPagina = document.getElementById('info-pagina-catalogos');
        const btnAnterior = document.getElementById('btn-anterior-catalogos');
        const btnSeguinte = document.getElementById('btn-seguinte-catalogos');
        
        async function carregar() {
            loading.style.display = 'block';
            try {
                const resp = await fetch('/validar/api/catalogo');
                catalogosCompletos = await resp.json();
                aplicarFiltros();
            } catch (err) { tbody.innerHTML = '<tr><td colspan="5">Erro</td></tr>'; }
            finally { loading.style.display = 'none'; }
        }
        
        function aplicarFiltros() {
            const termo = input.value.toLowerCase().trim();
            catalogosFiltradosModal = catalogosCompletos.filter(c => !termo || c.id?.toLowerCase().includes(termo) || c.nome?.toLowerCase().includes(termo));
            paginaAtualCatalogos = 1;
            renderizar();
            atualizarPaginacao();
        }
        
        function renderizar() {
            const inicio = (paginaAtualCatalogos-1)*12, fim = inicio+12;
            const itens = catalogosFiltradosModal.slice(inicio, fim);
            tbody.innerHTML = '';
            itens.forEach(cat => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${Utils.escapeHtml(cat.id)}</td>
                    <td>${Utils.escapeHtml(cat.nome)}</td>
                    <td>${cat.dimensoes?.x || ''}×${cat.dimensoes?.y || ''}×${cat.dimensoes?.z || ''}</td>
                    <td>${Utils.escapeHtml(cat.linha || '')}</td>
                    <td><button class="btn btn-sm btn-primary selecionar-catalogo" data-id="${cat.id}">Selecionar</button></td>
                `;
                tbody.appendChild(tr);
            });
            document.querySelectorAll('.selecionar-catalogo').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.dataset.id;
                    const resp = await fetch(`/validar/api/catalogo/${id}`);
                    const catalogo = await resp.json();
                    if (currentEditingLinha) {
                        if (currentEditingLinha.catalogo_id && currentEditingLinha.catalogo_id !== id) {
                            if (!confirm('Já existe um catálogo nesta linha. Substituir?')) return;
                        }
                        const artigosAssociados = catalogo.artigos_associados || [];
                        const filhos = [];
                        for (const codigo of artigosAssociados) {
                            let nome = codigo;
                            try {
                                const artResp = await fetch(`/validar/api/artigo/${codigo}`);
                                if (artResp.ok) {
                                    const art = await artResp.json();
                                    nome = art.name || codigo;
                                }
                            } catch(e) {}
                            filhos.push({
                                artigo_codigo: codigo,
                                qtd: 1,
                                descricao: nome,
                                fornecedor: '',
                                ref_fornecedor: ''
                            });
                        }
                        currentEditingLinha.tipo = 'catalogo';
                        currentEditingLinha.catalogo_id = catalogo.id;
                        currentEditingLinha.artigo_codigo = null;
                        currentEditingLinha.descricao = catalogo.nome || '';
                        currentEditingLinha.dimensoes = catalogo.dimensoes || {};
                        currentEditingLinha.filhos = filhos;
                        renderizarLinhas();
                        fecharModalPesquisa();
                    } else if (currentAddCatalogoCallback) {
                        await currentAddCatalogoCallback(catalogo);
                        fecharModalPesquisa();
                    }
                });
            });
        }
        
        function atualizarPaginacao() {
            const total = Math.ceil(catalogosFiltradosModal.length/12);
            infoPagina.textContent = `Página ${paginaAtualCatalogos} de ${total||1}`;
            btnAnterior.disabled = paginaAtualCatalogos<=1;
            btnSeguinte.disabled = paginaAtualCatalogos>=total;
        }
        
        btnPesquisar.addEventListener('click', aplicarFiltros);
        input.addEventListener('keyup', e => e.key==='Enter' && aplicarFiltros());
        btnAnterior.addEventListener('click', () => { if(paginaAtualCatalogos>1){ paginaAtualCatalogos--; renderizar(); atualizarPaginacao(); } });
        btnSeguinte.addEventListener('click', () => { if(paginaAtualCatalogos < Math.ceil(catalogosFiltradosModal.length/12)){ paginaAtualCatalogos++; renderizar(); atualizarPaginacao(); } });
        carregar();
    }

    function fecharModalPesquisa() {
        const modal = document.getElementById('modal-pesquisa-universal');
        if (modal) modal.classList.remove('show');
        currentEditingLinha = null;
        currentAddCatalogoCallback = null;
    }

    // ==================== Adicionar novos itens ====================
    function adicionarArtigo() {
        linhas.push({
            id: nextId++,
            tipo: 'artigo',
            ref_cliente: '',
            descricao: '',
            descricao_odoo: '',
            qtd: 1,
            artigo_codigo: '',
            catalogo_id: null,
            dimensoes: { x: null, y: null, z: null },
            tag1: '',
            tag2: '',
            filhos: []
        });
        renderizarLinhas();
    }

    function adicionarSecao() {
        const titulo = prompt('Título da secção:', 'Nova Secção');
        if (titulo) {
            linhas.push({ id: nextId++, tipo: 'secao', descricao: titulo });
            renderizarLinhas();
        }
    }

    function adicionarNota() {
        linhas.push({ id: nextId++, tipo: 'nota', descricao: '' });
        renderizarLinhas();
    }

    async function adicionarCatalogo() {
        currentAddCatalogoCallback = async (catalogo) => {
            const artigosAssociados = catalogo.artigos_associados || [];
            const filhos = [];
            for (const codigo of artigosAssociados) {
                let nome = codigo;
                try {
                    const artResp = await fetch(`/validar/api/artigo/${codigo}`);
                    if (artResp.ok) {
                        const art = await artResp.json();
                        nome = art.name || codigo;
                    }
                } catch(e) {}
                filhos.push({
                    artigo_codigo: codigo,
                    qtd: 1,
                    descricao: nome,
                    fornecedor: '',
                    ref_fornecedor: ''
                });
            }
            linhas.push({
                id: nextId++,
                tipo: 'catalogo',
                ref_cliente: '',
                descricao: catalogo.nome || '',
                descricao_odoo: '',
                qtd: 1,
                artigo_codigo: null,
                catalogo_id: catalogo.id,
                dimensoes: catalogo.dimensoes || {},
                tag1: '',
                tag2: '',
                filhos: filhos
            });
            renderizarLinhas();
        };
        const modal = document.getElementById('modal-pesquisa-universal');
        document.getElementById('modal-pesquisa-titulo').textContent = 'Selecionar Catálogo';
        document.getElementById('tab-artigos').classList.remove('active');
        document.getElementById('tab-catalogos').classList.add('active');
        const container = document.getElementById('pesquisa-universal-container');
        if (container) carregarInterfacePesquisa(container, 'catalogos');
        modal.classList.add('show');
    }

    // ==================== Totais ====================
    function atualizarTotais() {
        let totalQtd = 0;
        for (const linha of linhas) {
            if (linha.tipo === 'artigo') totalQtd += (linha.qtd || 0);
            if (linha.tipo === 'catalogo' && linha.filhos) {
                for (const f of linha.filhos) totalQtd += (f.qtd || 0);
            }
        }
        let valorBase = totalQtd * 100;
        let iva = valorBase * 0.23;
        let total = valorBase + iva;
        document.getElementById('subtotal-sem-impostos').innerText = valorBase.toFixed(2) + ' €';
        document.getElementById('total-iva').innerText = iva.toFixed(2) + ' €';
        document.getElementById('total-geral').innerText = total.toFixed(2) + ' €';
    }

    // ==================== Guardar encomenda ====================
    async function guardarEncomenda() {
        let numeroOriginal = encNumero.value.trim();
        if (!numeroOriginal) { alert('Nº Encomenda obrigatório.'); return; }
        const numeroSanitizado = Utils.sanitizarNumero(numeroOriginal);
        const cabecalho = {
            numero: numeroOriginal,
            cliente: encCliente.value,
            data: encData.value,
            obs: encObs.value,
            projeto: encProjeto.value,
            ref_cliente: encRefCliente.value
        };
        const dados = { cabecalho, linhas };
        try {
            let url = '/validar/api/encomendas/guardar';
            let method = 'POST';
            if (editMode && currentNumeroSanitizado === numeroSanitizado) {
                url = `/validar/api/encomendas/${encodeURIComponent(numeroSanitizado)}`;
                method = 'PUT';
            }
            const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados, null, 2) });
            if (resp.ok) {
                alert('Encomenda guardada com sucesso.');
                window.mostrarListagem();
            } else {
                const err = await resp.json();
                alert('Erro: ' + (err.detail || 'Falha ao guardar'));
            }
        } catch (err) { alert('Erro: ' + err.message); }
    }

    // ==================== Importar Excel (única) ====================
    function abrirModalImportar() {
        modalExcel.classList.add('show');
    }
    function fecharModalImportar() {
        modalExcel.classList.remove('show');
        excelFileInput.value = '';
        modoImportacaoMultiplas = false;
    }
    async function importarExcel() {
        const file = excelFileInput.files[0];
        if (!file) {
            alert('Selecione um ficheiro Excel.');
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        try {
            const resp = await fetch('/validar/api/encomendas/importar_excel', {
                method: 'POST',
                body: formData
            });
            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.detail || 'Erro ao importar');
            }
            const data = await resp.json();
            if (data.cabecalho) {
                encCliente.value = data.cabecalho.cliente || '';
                encData.value = data.cabecalho.data || '';
                encNumero.value = data.cabecalho.numero || '';
                encRefCliente.value = data.cabecalho.ref_cliente || '';
                encProjeto.value = data.cabecalho.projeto || '';
            }
            linhas = data.linhas.map(l => ({
                ...l,
                id: nextId++,
                tipo: l.tipo || 'artigo',
                filhos: []
            }));
            renderizarLinhas();
            fecharModalImportar();
            alert(`Importadas ${linhas.length} linhas.`);
        } catch (err) {
            alert('Erro: ' + err.message);
        }
    }

    async function importarMultiplasExcel() {
        const file = excelFileInput.files[0];
        if (!file) {
            alert('Selecione um ficheiro Excel.');
            return;
        }
        const formData = new FormData();
        formData.append('file', file);
        try {
            const resp = await fetch('/validar/api/encomendas/importar_multiplas_excel', {
                method: 'POST',
                body: formData
            });
            if (!resp.ok) {
                const err = await resp.json();
                throw new Error(err.detail || 'Erro ao importar');
            }
            const data = await resp.json();
            let msg = data.mensagem;
            if (data.criadas && data.criadas.length > 0) {
                msg += '\n\nCriadas:\n' + data.criadas.join('\n');
            }
            if (data.ignoradas && data.ignoradas.length > 0) {
                msg += '\n\nIgnoradas (já existiam):\n' + data.ignoradas.join('\n');
            }
            alert(msg);
            fecharModalImportar();
            window.carregarEncomendas();
        } catch (err) {
            alert('Erro: ' + err.message);
        }
    }

    // ==================== Eventos do formulário ====================
    function bindEvents() {
        btnNova?.addEventListener('click', () => { limparFormulario(); mostrarFormulário(); });
        btnBack?.addEventListener('click', () => window.mostrarListagem());
        btnCancelarForm?.addEventListener('click', () => window.mostrarListagem());
        btnGuardar?.addEventListener('click', guardarEncomenda);
        btnImportarExcel?.addEventListener('click', () => {
            modoImportacaoMultiplas = false;
            abrirModalImportar();
        });
        btnImportarMultiplas?.addEventListener('click', () => {
            modoImportacaoMultiplas = true;
            abrirModalImportar();
        });
        importarConfirm?.addEventListener('click', async () => {
            if (modoImportacaoMultiplas) {
                await importarMultiplasExcel();
                modoImportacaoMultiplas = false;
            } else {
                await importarExcel();
            }
        });
        importarCancel?.addEventListener('click', fecharModalImportar);
        document.getElementById('add-artigo')?.addEventListener('click', (e) => { e.preventDefault(); adicionarArtigo(); });
        document.getElementById('add-secao')?.addEventListener('click', (e) => { e.preventDefault(); adicionarSecao(); });
        document.getElementById('add-nota')?.addEventListener('click', (e) => { e.preventDefault(); adicionarNota(); });
        document.getElementById('add-catalogo')?.addEventListener('click', (e) => { e.preventDefault(); adicionarCatalogo(); });
        document.querySelector('#modal-pesquisa-universal .close-modal')?.addEventListener('click', fecharModalPesquisa);
        document.getElementById('btn-fechar-pesquisa')?.addEventListener('click', fecharModalPesquisa);
        document.getElementById('tab-artigos')?.addEventListener('click', () => {
            const container = document.getElementById('pesquisa-universal-container');
            if (container) carregarInterfacePesquisa(container, 'artigos');
            document.getElementById('modal-pesquisa-titulo').textContent = 'Artigos';
            document.getElementById('tab-artigos').classList.add('active');
            document.getElementById('tab-catalogos').classList.remove('active');
        });
        document.getElementById('tab-catalogos')?.addEventListener('click', () => {
            const container = document.getElementById('pesquisa-universal-container');
            if (container) carregarInterfacePesquisa(container, 'catalogos');
            document.getElementById('modal-pesquisa-titulo').textContent = 'Catálogos';
            document.getElementById('tab-catalogos').classList.add('active');
            document.getElementById('tab-artigos').classList.remove('active');
        });
    }

    window.abrirEncomendaParaEdicao = async function(numeroOriginal) {
        const numeroSanitizado = Utils.sanitizarNumero(numeroOriginal);
        try {
            const resp = await fetch(`/validar/api/encomendas/${encodeURIComponent(numeroSanitizado)}`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const dados = await resp.json();
            carregarDadosNoFormulario(dados);
            mostrarFormulário();
        } catch (err) {
            alert('Erro ao carregar encomenda: ' + err.message);
        }
    };

    function init() {
        bindEvents();
    }

    init();
})();