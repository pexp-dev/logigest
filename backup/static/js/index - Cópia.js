// index.js

window.addEventListener('DOMContentLoaded', () => {
    inicializar();
});

window.addEventListener('pageshow', () => {
    inicializar();
});

function inicializar() {
    // Elementos
    const cardValidar = document.getElementById('card-validar');
    const cardUpload = document.getElementById('card-upload');
    const cardExportar = document.getElementById('card-exportar');
    const cardBase = document.getElementById('card-base');
    const cardCatalogo = document.getElementById('card-catalogo');  // NOVO
    const pendenteInfo = document.getElementById('pendente-info');
    const pendenteBadge = document.getElementById('pendente-badge');
    const validarMsg = document.getElementById('validar-mensagem');
    const uploadMsg = document.getElementById('upload-mensagem');
    const exportarInfo = document.getElementById('exportar-info');
    const exportarBadge = document.getElementById('exportar-badge');
    const exportarMsg = document.getElementById('exportar-mensagem');
    const hiddenFileInput = document.getElementById('hidden-file-input');
    const toast = document.getElementById('toast');
    const cardMedidas = document.getElementById('card-medidas');
    if (cardMedidas) {
        cardMedidas.addEventListener('click', () => {
            window.location.href = '/validar/procurar_medidas';
        });
    }

    // Elementos do modal
    const modal = document.getElementById('modal-ja-processado');
    const modalMsg = document.getElementById('modal-mensagem');
    const btnSim = document.getElementById('modal-sim');
    const btnNao = document.getElementById('modal-nao');

    let temPendente = false;
    let documentoPendente = null;
    let uploadEmCurso = false;
    let ficheiroPendente = null;

    // Card Base de Dados
    cardBase.addEventListener('click', () => {
        window.location.href = '/validar/base';
    });

    // Card Catálogo (NOVO)
    if (cardCatalogo) {
        cardCatalogo.addEventListener('click', () => {
            window.location.href = '/validar/catalogo';
        });
    }

    function mostrarToast(mensagem, cor = '#ffaa66') {
        toast.textContent = mensagem;
        toast.style.backgroundColor = cor;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    function mostrarModal(mensagem) {
        return new Promise((resolve) => {
            modalMsg.textContent = mensagem;
            modal.classList.add('show');

            const handlerSim = () => {
                modal.classList.remove('show');
                btnSim.removeEventListener('click', handlerSim);
                btnNao.removeEventListener('click', handlerNao);
                resolve(true);
            };
            const handlerNao = () => {
                modal.classList.remove('show');
                btnSim.removeEventListener('click', handlerSim);
                btnNao.removeEventListener('click', handlerNao);
                resolve(false);
            };

            btnSim.addEventListener('click', handlerSim);
            btnNao.addEventListener('click', handlerNao);
        });
    }

    async function verificarPendente() {
        try {
            const response = await fetch('/validar/api/validacao/documento');
            if (!response.ok) {
                throw new Error("Erro ao verificar documento pendente");
            }
            const data = await response.json();

            // Caso não haja documento pendente (data === null)
            // Não há documento pendente se:
            // - data é null
            // - data é undefined
            // - data é um objeto vazio
            // - data.items é null ou undefined
            // - data.items é um array vazio
            if (!data || !Array.isArray(data.items) || data.items.length === 0) {
                temPendente = false;
                documentoPendente = null;

                pendenteInfo.textContent = 'Nenhum documento pendente';
                pendenteBadge.style.display = 'none';

                cardValidar.classList.add('disabled');
                cardValidar.classList.remove('clickable');
                validarMsg.textContent = 'Faça upload primeiro';

                cardUpload.classList.add('clickable');
                cardUpload.classList.remove('disabled');
                uploadMsg.textContent = 'Clique para selecionar PDF';
                cardUpload.onclick = iniciarSelecaoFicheiro;

                cardValidar.onclick = () => {
                    mostrarToast('Não há documento pendente. Faça upload primeiro.', '#9e9e9e');
                };

                return;
            }

            // Se chegou aqui, há documento pendente
            temPendente = true;
            documentoPendente = data;

            const itens = Array.isArray(documentoPendente.items) ? documentoPendente.items : [];
            const numItens = itens.length;
            const pendentes = itens.filter(item => !item.flags?.validado_ok).length;


            pendenteInfo.innerHTML = `${documentoPendente.document_number}<br>${numItens} itens (${pendentes} por validar)`;

            if (pendentes > 0) {
                pendenteBadge.textContent = `${pendentes} pendente(s)`;
                pendenteBadge.style.display = 'inline-block';
            } else {
                pendenteBadge.style.display = 'none';
            }

            cardValidar.classList.add('clickable');
            cardValidar.classList.remove('disabled');
            validarMsg.textContent = 'Clique para validar';

            cardUpload.classList.add('disabled');
            cardUpload.classList.remove('clickable');
            uploadMsg.textContent = 'Conclua a validação pendente primeiro';
            cardUpload.onclick = () => {
                mostrarToast('Existe um documento pendente. Valide-o primeiro.', '#9e9e9e');
            };

            cardValidar.onclick = () => {
                window.location.href = '/validar/validacao';
            };

        } catch (err) {
            pendenteInfo.textContent = 'Erro ao verificar';
            // Opcional: pode manter para depuração, mas se não quiser, comente a linha abaixo
            // console.warn("Erro real em verificarPendente:", err.message);
            cardValidar.classList.add('disabled');
            cardUpload.classList.add('disabled');
        }
    }   

    async function verificarArquivo() {
        try {
            const resp = await fetch('/validar/api/arquivo/listar');
            if (resp.ok) {
                const arquivos = await resp.json();
                // Remover o console.log que exibe a lista enorme
                // console.log('Arquivos recebidos:', arquivos);
                const naoExportados = arquivos.filter(arq => !arq.exportado).length;
                exportarInfo.textContent = `${naoExportados} documento(s) por exportar`;
                if (naoExportados > 0) {
                    exportarBadge.textContent = naoExportados;
                    exportarBadge.style.display = 'inline-block';
                } else {
                    exportarBadge.style.display = 'none';
                }
                cardExportar.classList.add('clickable');
                cardExportar.classList.remove('disabled');
                exportarMsg.textContent = 'Clique para exportar';
                cardExportar.onclick = () => {
                    window.location.href = '/validar/arquivo';
                };
            } else {
                exportarInfo.textContent = 'Erro ao carregar';
                cardExportar.classList.add('disabled');
            }
        } catch (err) {
            // Pode manter para depuração, mas se não quiser, comente
            // console.error('Erro em verificarArquivo:', err);
            exportarInfo.textContent = 'Erro';
            cardExportar.classList.add('disabled');
        }
    }

    function iniciarSelecaoFicheiro() {
        if (uploadEmCurso || temPendente) return;
        // Bloqueia imediatamente o upload
        uploadEmCurso = true;
        cardUpload.classList.remove('clickable');
        cardUpload.classList.add('processing');
        uploadMsg.textContent = 'A processar...';
        hiddenFileInput.click();
    }

    hiddenFileInput.addEventListener('change', async (event) => {
        // Se o upload não estiver em curso (por exemplo, cancelado), ignora
        if (!uploadEmCurso) return;

        const file = event.target.files[0];
        if (!file) {
            redefinirUpload(); // Cancela o estado de upload
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            let resp = await fetch('/validar/api/digitalizacao/upload', {
                method: 'POST',
                body: formData
            });
            let data = await resp.json();

            if (data.status === 'ja_processado') {
                ficheiroPendente = file;
                const confirmar = await mostrarModal(data.message);
                if (confirmar) {
                    const formData2 = new FormData();
                    formData2.append('file', ficheiroPendente);
                    resp = await fetch('/validar/api/digitalizacao/upload?force=true', {
                        method: 'POST',
                        body: formData2
                    });
                    data = await resp.json();
                    if (resp.ok && data.status === 'ok') {
                        window.location.href = '/validar/validacao';
                    } else {
                        mostrarToast('❌ Erro: ' + (data.detail || data.message || 'Erro desconhecido'), '#d32f2f');
                        redefinirUpload();
                    }
                } else {
                    mostrarToast('Operação cancelada.', '#9e9e9e');
                    redefinirUpload();
                }
                return;
            }

            if (resp.ok && data.status === 'ok') {
                window.location.href = '/validar/validacao';
            } else {
                mostrarToast('❌ Erro: ' + (data.detail || data.message || 'Erro desconhecido'), '#d32f2f');
                redefinirUpload();
            }
        } catch (err) {
            mostrarToast('❌ Erro de ligação.', '#d32f2f');
            redefinirUpload();
        }
    });

    function redefinirUpload() {
        uploadEmCurso = false;
        cardUpload.classList.add('clickable');
        cardUpload.classList.remove('processing');
        uploadMsg.textContent = 'Clique para selecionar PDF';
        hiddenFileInput.value = '';
        ficheiroPendente = null;
    }

    // Chamar as verificações
    verificarPendente();
    verificarArquivo();
}