// validacao.js - Versão final com alerta de preço e melhorias de consistência
import * as api from './api.js';
import { debounce, formatarValor, gerarNameSugerido } from './utils.js';

window.addEventListener('DOMContentLoaded', async () => {

    let documento = null;
    let itemIndex = 0;
    let camposEditados = new Set();
    let afterId = null;
    let dicionarios = {};

    // Funções para obter elementos dinamicamente (evita null references)
    function getDocInfo() { return document.getElementById('doc-info'); }
    function getItemList() { return document.getElementById('item-list'); }
    function getContador() { return document.getElementById('contador'); }
    function getBtnAnterior() { return document.getElementById('btn-anterior'); }
    function getBtnSeguinte() { return document.getElementById('btn-seguinte'); }
    function getItemCodigo() { return document.getElementById('item-codigo'); }
    function getInfoBd() { return document.getElementById('info-bd'); }
    function getCamposBody() { return document.getElementById('campos-body'); }
    function getBtnValidarItem() { return document.getElementById('btn-validar-item'); }
    function getBtnGuardar() { return document.getElementById('btn-guardar'); }
    function getBtnCancelar() { return document.getElementById('btn-cancelar'); }
    function getBtnAtualizarBD() { return document.getElementById('btn-atualizar-bd'); }
    function getBtnVoltar() { return document.getElementById('btn-voltar'); }
    function getItemActions() { return document.getElementById('item-actions'); }
    function getBtnCancelarDocumento() { return document.getElementById('btn-cancelar-documento'); }
    function getModalValidacao() { return document.getElementById('modal-validacao'); }
    function getModalTitulo() { return document.getElementById('modal-titulo'); }
    function getModalMensagem() { return document.getElementById('modal-mensagem'); }
    function getModalSim() { return document.getElementById('modal-sim'); }
    function getModalNao() { return document.getElementById('modal-nao'); }
    function getStatusBar() { return document.getElementById('status-bar'); }

    // Função para mostrar mensagens temporárias na status-bar (toast)
    function mostrarStatus(mensagem, corFundo = '#333') {
        const statusBar = getStatusBar();
        if (!statusBar) return;
        statusBar.textContent = mensagem;
        statusBar.style.backgroundColor = corFundo;
        statusBar.classList.add('show');
        setTimeout(() => {
            statusBar.classList.remove('show');
        }, 3000);
    }

    // Carregar dicionários e documento ao iniciar
    await carregarDicionarios();
    await carregarDocumento();

    // Eventos de navegação (com verificação de existência)
    getBtnAnterior()?.addEventListener('click', () => navegar(-1));
    getBtnSeguinte()?.addEventListener('click', () => navegar(1));
    getBtnGuardar()?.addEventListener('click', guardarRascunho);
    getBtnValidarItem()?.addEventListener('click', validarItemAtual);
    getBtnCancelar()?.addEventListener('click', cancelarAlteracoes);
    getBtnAtualizarBD()?.addEventListener('click', executarAtualizacao);
    getBtnVoltar()?.addEventListener('click', () => {
        if (getBtnVoltar()?.disabled) return;
        window.location.href = '/validar/';
    });

    getBtnCancelarDocumento()?.addEventListener('click', async () => {
        const confirmar = await mostrarModal(
            'Cancelar documento',
            'Tem a certeza que pretende cancelar este documento? Todas as alterações não guardadas serão perdidas.'
        );
        if (!confirmar) return;
        try {
            const resp = await fetch('/validar/api/cancelar_documento', { method: 'POST' });
            const data = await resp.json();
            if (resp.ok) {
                window.location.href = '/validar/';
            } else {
                mostrarStatus('❌ Erro: ' + (data.detail || data.message || 'Erro desconhecido'), '#9e2b2b');
            }
        } catch (err) {
            mostrarStatus('❌ Erro de ligação.', '#9e2b2b');
        }
    });

    // ==================== Funções auxiliares ====================

    async function carregarDicionarios() {
        try {
            const resp = await fetch('/validar/api/dicionarios/todos');
            if (resp.ok) {
                dicionarios = await resp.json();
            } else {
                console.warn('Não foi possível carregar dicionários');
                mostrarStatus('⚠️ Dicionários não carregados. Alguns campos serão de texto.', '#ff9800');
            }
        } catch (err) {
            console.error('Erro ao carregar dicionários:', err);
            mostrarStatus('⚠️ Erro ao carregar dicionários.', '#ff9800');
        }
    }

    function mostrarModal(titulo, mensagem) {
        return new Promise((resolve) => {
            const modal = getModalValidacao();
            const tituloEl = getModalTitulo();
            const msgEl = getModalMensagem();
            const sim = getModalSim();
            const nao = getModalNao();
            if (!modal || !tituloEl || !msgEl || !sim || !nao) {
                console.error('Elementos do modal não encontrados');
                resolve(false);
                return;
            }
            tituloEl.textContent = titulo;
            msgEl.textContent = mensagem;
            modal.classList.add('show');

            const handlerSim = () => {
                modal.classList.remove('show');
                sim.removeEventListener('click', handlerSim);
                nao.removeEventListener('click', handlerNao);
                resolve(true);
            };
            const handlerNao = () => {
                modal.classList.remove('show');
                sim.removeEventListener('click', handlerSim);
                nao.removeEventListener('click', handlerNao);
                resolve(false);
            };

            sim.addEventListener('click', handlerSim);
            nao.addEventListener('click', handlerNao);
        });
    }

    // ==================== Funções principais ====================

    async function carregarDocumento() {
        const docInfo = getDocInfo();
        try {
            documento = await api.fetchDocumento();
            if (docInfo) docInfo.textContent = `${documento.document_number} | ${documento.document_date}`;
            preencherLista();
            if (documento.items.length > 0) {
                mostrarItem(0);
                atualizarContador();
            }
            verificarTodosValidados();
        } catch (err) {
            if (docInfo) docInfo.textContent = 'Erro ao carregar documento.';
            mostrarStatus(err.message, '#9e2b2b');
        }
    }

    function preencherLista() {
        const itemList = getItemList();
        if (!itemList) return;
        itemList.innerHTML = '';
        documento.items.forEach((item, idx) => {
            const li = document.createElement('li');
            li.textContent = `${item.codigo} - ${item.ocr?.descricao || ''}`;
            li.dataset.index = idx;
            li.addEventListener('click', async () => {
                if (await confirmarAlteracoesPendentes()) {
                    mostrarItem(idx);
                }
            });
            if (item.flags?.validado_ok) li.classList.add('validado');
            itemList.appendChild(li);
        });
    }

    function atualizarContador() {
        const contador = getContador();
        if (!contador) return;
        const total = documento.items.length;
        contador.textContent = `${itemIndex + 1}/${total}`;
    }

    async function navegar(direcao) {
        const novoIndex = itemIndex + direcao;
        if (novoIndex < 0 || novoIndex >= documento.items.length) return;
        if (await confirmarAlteracoesPendentes()) {
            mostrarItem(novoIndex);
        }
    }

    async function confirmarAlteracoesPendentes() {
        if (camposEditados.size > 0) {
            return await mostrarModal(
                'Alterações não guardadas',
                'Tem alterações não guardadas. Deseja continuar sem guardar?'
            );
        }
        return true;
    }

    function mostrarItem(idx) {
        if (afterId) clearTimeout(afterId);
        if (!documento.items || idx >= documento.items.length) return;
        itemIndex = idx;
        const item = documento.items[idx];
        const itemCodigo = getItemCodigo();
        if (itemCodigo) itemCodigo.textContent = `Código: ${item.codigo}`;

        // Informação da BD (resumo)
        const infoBd = getInfoBd();
        if (infoBd) {
            if (item.bd && Object.keys(item.bd).length > 0) {
                infoBd.textContent = `Na BD: modelo=${item.bd.modelo || '-'} | tipo_cartao=${item.bd.tipo_cartao || '-'}`;
            } else {
                infoBd.textContent = 'Artigo não existe na BD.';
            }
        }

        // Gerar sugestão (draft/validado/BD/OCR)
        const sugestao = prepararSugestao(item);

        // Construir tabela de campos
        const campos = [
            { label: 'Fornecedor', chave: 'seller_product_name', editavel: false },
            { label: 'Código', chave: 'codigo', editavel: false },
            { label: 'Nome', chave: 'name', editavel: true },
            { label: 'Modelo', chave: 'modelo', editavel: true },
            { label: 'Tipo Cartão', chave: 'tipo_cartao', editavel: true },
            { label: 'Descrição', chave: 'descricao', editavel: true },
            { label: 'Dimensão X', chave: 'dim_x', editavel: true },
            { label: 'Dimensão Y', chave: 'dim_y', editavel: true },
            { label: 'Dimensão Z', chave: 'dim_z', editavel: true },
            { label: 'Quantidade', chave: 'quantidade', editavel: false },
            { label: 'Preço unit.', chave: 'preco_unit', editavel: false },
            { label: 'IVA', chave: 'iva', editavel: false },
            { label: 'Total', chave: 'total', editavel: false },
            { separador: true },
            { label: 'Categoria', chave: 'categoria', editavel: true },
            { label: 'Tipo', chave: 'tipo', editavel: true },
            { label: 'Linha', chave: 'linha', editavel: true },
            { label: 'Tipo de Medida', chave: 'modelo_catalogo', editavel: true },
            { label: 'Estado', chave: 'estado', editavel: true },
            { label: 'Observações', chave: 'obs', editavel: true }
        ];

        const camposBody = getCamposBody();
        if (!camposBody) return;
        camposBody.innerHTML = '';

        campos.forEach(campo => {
            if (campo.separador) {
                const trSep = document.createElement('tr');
                const tdSep = document.createElement('td');
                tdSep.colSpan = 4;
                tdSep.style.height = '20px';
                tdSep.style.borderBottom = '1px dashed #444';
                tdSep.style.background = 'transparent';
                trSep.appendChild(tdSep);
                camposBody.appendChild(trSep);
                return;
            }

            const tr = document.createElement('tr');
            const tdLabel = document.createElement('td');
            tdLabel.textContent = campo.label;
            tr.appendChild(tdLabel);

            // --- Coluna OCR ---
            const tdOcr = document.createElement('td');
            let ocrValor = '---';
            try {
                if (campo.editavel) {
                    if (campo.chave.startsWith('dim_')) {
                        const eixo = campo.chave.split('_')[1];
                        ocrValor = formatarValor(item.ocr?.dimensoes?.[eixo]);
                    } else {
                        ocrValor = item.ocr?.[campo.chave] || '---';
                    }
                } else {
                    if (['codigo', 'quantidade', 'preco_unit', 'iva', 'total'].includes(campo.chave)) {
                        ocrValor = formatarValor(item[campo.chave]);
                    } else {
                        ocrValor = item.ocr?.[campo.chave] || '---';
                    }
                }
            } catch (e) { }
            tdOcr.textContent = ocrValor;
            tr.appendChild(tdOcr);

            // --- Coluna BD ---
            const tdBd = document.createElement('td');
            let bdValor = '---';
            try {
                if (item.bd && Object.keys(item.bd).length > 0) {
                    if (campo.chave === 'codigo') bdValor = '---';
                    else if (campo.chave.startsWith('dim_')) {
                        const eixo = campo.chave.split('_')[1];
                        bdValor = formatarValor(item.bd.dimensoes?.[eixo]);
                    } else {
                        bdValor = formatarValor(item.bd[campo.chave]);
                    }
                }
            } catch (e) { }
            tdBd.textContent = bdValor;
            tr.appendChild(tdBd);

            // --- Coluna Sugestão (Edição) ---
            const tdSug = document.createElement('td');
            if (campo.editavel) {
                let elemento;
                let valorSugestao = campo.chave.startsWith('dim_') 
                    ? (sugestao.dimensoes?.[campo.chave.split('_')[1]] || '')
                    : (sugestao[campo.chave] || '');

                if (dicionarios[campo.chave]?.length > 0) {
                    elemento = document.createElement('select');
                    const opVazia = document.createElement('option');
                    opVazia.value = ''; opVazia.textContent = '-- Selecionar --';
                    elemento.appendChild(opVazia);
                    dicionarios[campo.chave].forEach(op => {
                        const option = document.createElement('option');
                        option.value = op; option.textContent = op;
                        elemento.appendChild(option);
                    });
                    elemento.value = valorSugestao;
                } else {
                    elemento = document.createElement('input');
                    elemento.value = valorSugestao;
                    
                    // Lógica de Normalização Uppercase em Tempo Real
                    if (['tipo_cartao', 'descricao', 'name'].includes(campo.chave)) {
                        elemento.addEventListener('input', () => {
                            const start = elemento.selectionStart;
                            const end = elemento.selectionEnd;
                            elemento.value = elemento.value.toUpperCase();
                            elemento.setSelectionRange(start, end);
                        });
                        
                        // Garante que ao sair do campo o valor final fica limpo e em maiúsculas
                        elemento.addEventListener('blur', () => {
                            elemento.value = elemento.value.trim().toUpperCase();
                        });
                    }
                }

                elemento.classList.add('editable-input');
                elemento.dataset.chave = campo.chave;

                const registrarMudanca = () => {
                    camposEditados.add(campo.chave);
                    atualizarEstadoVoltar();
                    if (campo.chave === 'descricao') agendarVerificacaoDescricao();
                    // Se o item estava validado, perde a validação
                    if (documento.items[itemIndex].flags?.validado_ok) {
                        documento.items[itemIndex].flags.validado_ok = false;
                        preencherLista(); // atualiza a cor na lista
                        verificarTodosValidados(); // esconde botão atualizar BD, se necessário
                    }
                };

                elemento.addEventListener('change', registrarMudanca);
                if (elemento.tagName === 'INPUT') elemento.addEventListener('input', registrarMudanca);
                
                tdSug.appendChild(elemento);
            } else {
                let sugVal = '---';
                try {
                    if (campo.chave.startsWith('dim_')) sugVal = formatarValor(sugestao.dimensoes?.[campo.chave.split('_')[1]]);
                    else sugVal = sugestao[campo.chave] || '---';
                } catch (e) { }
                tdSug.textContent = sugVal;
            }
            tr.appendChild(tdSug);
            camposBody.appendChild(tr);
        });

        camposEditados.clear();
        atualizarEstadoVoltar();
        atualizarContador();

        // ---------- Atualizar painel de alerta de preço (com segurança) ----------
        const alertPanel = document.getElementById('price-alert-panel');
        const alertContent = document.getElementById('price-alert-content');

        if (alertPanel && alertContent) {
            if (item.price_warning) {
                const warning = item.price_warning;
                const expected = warning.expected_price;
                const statusLabel = warning.status_label;
                const directionText = warning.direction_text;
                const sourceText = warning.source_text;
                const level = warning.level || 1; // Fallback para level 1

                alertContent.innerHTML = '';

                // Atualizar o título fixo com o status (se existir)
                const titleElement = alertPanel.querySelector('h4');
                if (titleElement) {
                    if (statusLabel) {
                        titleElement.innerHTML = `<i class="fas fa-chart-line"></i> Alerta de Preço <span style="font-weight:normal; color:#ffaa00;">${statusLabel}</span>`;
                    } else {
                        titleElement.innerHTML = `<i class="fas fa-chart-line"></i> Alerta de Preço`;
                    }
                }

                // Linha 2: preço esperado (se disponível)
                if (expected !== null && expected !== undefined) {
                    const expectedDiv = document.createElement('div');
                    expectedDiv.innerHTML = `<strong>Preço esperado:</strong> <span class="expected-price">${expected.toFixed(2)} €</span>`;
                    alertContent.appendChild(expectedDiv);
                }

                // Linha 3: direção (se disponível)
                if (directionText) {
                    const dirDiv = document.createElement('div');
                    dirDiv.textContent = directionText;
                    alertContent.appendChild(dirDiv);
                } else if (warning.message && !directionText) {
                    // Fallback para mensagens antigas
                    const msgDiv = document.createElement('div');
                    msgDiv.textContent = warning.message;
                    alertContent.appendChild(msgDiv);
                }

                // Linha 4: fonte (se disponível)
                if (sourceText) {
                    const srcDiv = document.createElement('div');
                    srcDiv.textContent = sourceText;
                    srcDiv.style.whiteSpace = 'pre-line';
                    alertContent.appendChild(srcDiv);
                }

                alertPanel.className = `price-alert-panel level-${level}`;
                alertPanel.style.display = 'block';
            } else {
                // Quando não há alerta, garantir que o título volta ao original (sem status)
                const titleElement = alertPanel.querySelector('h4');
                if (titleElement) {
                    titleElement.innerHTML = `<i class="fas fa-chart-line"></i> Alerta de Preço`;
                }
                alertPanel.style.display = 'none';
            }
        }
    }

    function prepararSugestao(item) {
        const ocr = item.ocr || {};
        const bd = item.bd || {};
        let base;

        if (item.draft && Object.keys(item.draft).length > 0) {
            base = { ...item.draft };
        } else if (item.validado && Object.keys(item.validado).length > 0) {
            base = { ...item.validado };
        } else if (bd && Object.keys(bd).length > 0) {
            base = {
                modelo: bd.modelo || null,
                tipo_cartao: bd.tipo_cartao || null,
                descricao: bd.descricao || '',
                seller_product_name: bd.seller_product_name || ocr.seller_product_name || '',
                codigo: item.codigo || '',
                name: bd.name || gerarNameSugerido(ocr.descricao, ocr.tipo_cartao),
                categoria: "Embalagens",   // fixo
                linha: bd.linha || '',
                tipo: bd.tipo || '',
                modelo_catalogo: bd.modelo_catalogo || '',
                estado: bd.estado || '',
                obs: bd.obs || '',
                dimensoes: bd.dimensoes ? { ...bd.dimensoes } : { x: null, y: null, z: null }
            };
            if (!base.dimensoes.x && ocr.dimensoes?.x) base.dimensoes.x = ocr.dimensoes.x;
            if (!base.dimensoes.y && ocr.dimensoes?.y) base.dimensoes.y = ocr.dimensoes.y;
            if (!base.dimensoes.z && ocr.dimensoes?.z) base.dimensoes.z = ocr.dimensoes.z;
        } else {
            base = {
                modelo: ocr.modelo || null,
                tipo_cartao: ocr.tipo_cartao || null,
                descricao: ocr.descricao || '',
                seller_product_name: ocr.seller_product_name || '',
                codigo: item.codigo || '',
                name: gerarNameSugerido(ocr.descricao, ocr.tipo_cartao),
                categoria: "Embalagens",   // fixo
                linha: '',
                tipo: '',
                modelo_catalogo: '',
                estado: '',
                obs: '',
                dimensoes: {
                    x: ocr.dimensoes?.x !== undefined ? ocr.dimensoes.x : null,
                    y: ocr.dimensoes?.y !== undefined ? ocr.dimensoes.y : null,
                    z: ocr.dimensoes?.z !== undefined ? ocr.dimensoes.z : null
                }
            };
        }

        // Garantir campos não editáveis
        if (!base.seller_product_name) base.seller_product_name = ocr.seller_product_name || '';
        if (!base.codigo) base.codigo = item.codigo || '';

        // Garantir campos editáveis
        if (!base.name) base.name = gerarNameSugerido(ocr.descricao, ocr.tipo_cartao);
        if (!base.modelo) base.modelo = ocr.modelo || null;
        if (!base.tipo_cartao) base.tipo_cartao = ocr.tipo_cartao || null;
        if (!base.descricao) base.descricao = ocr.descricao || '';
        if (!base.categoria) base.categoria = "Embalagens";
        if (!base.linha) base.linha = '';
        if (!base.tipo) base.tipo = '';
        if (!base.modelo_catalogo) base.modelo_catalogo = '';
        if (!base.estado) base.estado = '';
        if (!base.obs) base.obs = '';

        // Garantir estrutura de dimensões
        if (!base.dimensoes) base.dimensoes = {};
        ['x', 'y', 'z'].forEach(eixo => {
            if (base.dimensoes[eixo] === null || base.dimensoes[eixo] === undefined) {
                base.dimensoes[eixo] = ocr.dimensoes?.[eixo] !== undefined ? ocr.dimensoes[eixo] : null;
            }
        });

        return base;
    }

    function recolherSugestoes() {
        const dados = { dimensoes: {} };
        const camposBody = getCamposBody();
        if (!camposBody) return dados;

        const elementos = camposBody.querySelectorAll('input, select');
        elementos.forEach(el => {
            const chave = el.dataset.chave;
            if (!chave) return;

            let valor = el.value !== '' ? el.value : null;

            // Converter para maiúsculas nos campos desejados (como salvaguarda)
            if (['tipo_cartao', 'descricao', 'name'].includes(chave) && valor) {
                valor = valor.trim().toUpperCase();
            }

            if (chave.startsWith('dim_')) {
                const eixo = chave.split('_')[1];
                dados.dimensoes[eixo] = valor;
            } else {
                dados[chave] = valor;
            }
        });

        return dados;
    }

    // ==================== Ações ====================

    async function guardarRascunho() {
        const dados = recolherSugestoes();
        try {
            await api.guardarRascunho(itemIndex, dados);
            // Salvar o código do item atual para re-focá-lo após recarregar
            const codigoAtual = documento.items[itemIndex]?.codigo;
            
            await carregarDocumento();
            
            const novoIndice = documento.items.findIndex(item => item.codigo === codigoAtual);
            if (novoIndice !== -1) {
                mostrarItem(novoIndice);
            } else {
                mostrarItem(0);
            }
            camposEditados.clear();
            atualizarEstadoVoltar();
            mostrarStatus('💾 Rascunho guardado.', '#2e7d32');
        } catch (err) {
            mostrarStatus('❌ Erro ao guardar rascunho: ' + err.message, '#9e2b2b');
        }
    }

    async function validarItemAtual() {
    // 1. Verificar se o documento e o item existem ANTES de começar
    if (!documento || !documento.items || !documento.items[itemIndex]) {
        mostrarStatus('❌ Erro: Item não encontrado para validação.', '#9e2b2b');
        return;
    }

    const dados = recolherSugestoes();
    
    // 2. Guardar o código IMEDIATAMENTE numa variável local
    // Isto evita o erro "reading properties of undefined" se o array mudar depois
    const codigoParaValidar = documento.items[itemIndex].codigo;

    try {
        // Desativar o botão para evitar cliques duplos enquanto processa
        const btnValidar = getBtnValidarItem();
        if (btnValidar) btnValidar.disabled = true;

        await api.validarItem(itemIndex, dados);
        
        // 3. Recarregar os dados do servidor
        await carregarDocumento();
        
        // 4. Procurar o próximo item que ainda não está validado
        let proximoIdx = -1;
        if (documento && documento.items) {
            proximoIdx = documento.items.findIndex(item => !item.flags?.validado_ok);
        }

        if (proximoIdx !== -1) {
            mostrarItem(proximoIdx);
        } else if (documento && documento.items.length > 0) {
            // Se todos estiverem validados, fica no último
            mostrarItem(documento.items.length - 1);
        }

        await verificarTodosValidados();
        camposEditados.clear();
        atualizarEstadoVoltar();
        
        // Usar a variável local segura
        mostrarStatus(`✅ Item ${codigoParaValidar} validado!`, '#2e7d32');

    } catch (err) {
        console.error("Erro na validação:", err);
        mostrarStatus('❌ Erro ao validar item: ' + err.message, '#9e2b2b');
        atualizarEstadoVoltar(); // Reativar botões se falhar
    }
}

    async function verificarTodosValidados() {
        try {
            const resp = await api.todosValidados();
            const btn = getBtnAtualizarBD();
            if (btn) {
                btn.style.display = resp.todos_validados ? 'inline-block' : 'none';
            }
        } catch (err) {
            console.error('Erro ao verificar itens validados', err);
        }
    }

    function cancelarAlteracoes() {
        mostrarItem(itemIndex);
        camposEditados.clear();
        atualizarEstadoVoltar();
    }

    async function executarAtualizacao() {
        const confirmar = await mostrarModal(
            'Confirmar atualização',
            'Tem a certeza que pretende atualizar a base de dados com os itens validados?'
        );
        if (!confirmar) return;

        try {
            const resp = await api.atualizarBD(true);
            if (resp.status === 'ok') {
                mostrarStatus(resp.message || 'Base de dados atualizada.', '#2e7d32');
                setTimeout(() => {
                    window.location.href = '/validar/';
                }, 1500);
            } else {
                mostrarStatus('❌ Erro: ' + (resp.message || resp.detail || 'Erro desconhecido'), '#9e2b2b');
            }
        } catch (err) {
            mostrarStatus('❌ Erro ao atualizar BD: ' + err.message, '#9e2b2b');
        }
    }

    // ==================== Controlo do botão Voltar, botões de ação e botão validar ====================
    function atualizarEstadoVoltar() {
        const btnVoltar = getBtnVoltar();
        if (btnVoltar) {
            btnVoltar.disabled = camposEditados.size > 0;
        }
        const itemActions = getItemActions();
        if (itemActions) {
            if (camposEditados.size > 0) {
                itemActions.classList.add('visible');
            } else {
                itemActions.classList.remove('visible');
            }
        }
        // Atualizar estado do botão validar
        const btnValidar = getBtnValidarItem();
        if (btnValidar && documento.items[itemIndex]) {
            if (camposEditados.size > 0) {
                btnValidar.disabled = false;
                btnValidar.textContent = '✅ Validar Item';
            } else {
                const item = documento.items[itemIndex];
                btnValidar.disabled = item.flags?.validado_ok || false;
                btnValidar.textContent = item.flags?.validado_ok ? '✅ Item Validado' : '✅ Validar Item';
            }
        }
    }

    // ==================== Verificação de consistência (debounce) ====================
    const verificarConsistenciaDescricaoDebounced = debounce(() => {
        const descInput = document.querySelector('input[data-chave="descricao"]');
        const nameInput = document.querySelector('input[data-chave="name"]');
        const tipoInput = document.querySelector('input[data-chave="tipo_cartao"]');
        if (!descInput || !nameInput) return;
        
        const desc = descInput.value;
        const name = nameInput.value;
        const tipo = tipoInput ? tipoInput.value : '';
        const sugerido = gerarNameSugerido(desc, tipo);
        
        if (desc && name !== sugerido && camposEditados.has('descricao')) {
            nameInput.value = sugerido;
            camposEditados.add('name');
            atualizarEstadoVoltar();
        }
    }, 2000);

    function agendarVerificacaoDescricao() {
        verificarConsistenciaDescricaoDebounced();
    }
});