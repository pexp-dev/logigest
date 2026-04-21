// artigo.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-artigo');
    const formActions = document.getElementById('form-actions');
    const btnCancelar = document.getElementById('btn-cancelar');
    const artigoCodigo = document.getElementById('artigo-codigo').value;
    const statusBar = document.getElementById('status-bar');
    let dadosOriginais = {};

    // Ler dados do artigo (JSON vindo do template)
    const artigoDataElem = document.getElementById('artigo-data');
    let artigo = null;
    if (artigoDataElem) {
        try {
            artigo = JSON.parse(artigoDataElem.textContent);
        } catch (e) {
            console.error('Erro ao ler artigo', e);
        }
    }

    // Função para mostrar mensagem na status bar
    function mostrarMensagem(texto, tipo = 'sucesso') {
        statusBar.textContent = texto;
        if (tipo === 'sucesso') {
            statusBar.style.backgroundColor = '#2e7d32';
        } else if (tipo === 'erro') {
            statusBar.style.backgroundColor = '#9e2b2b';
        } else {
            statusBar.style.backgroundColor = '#333';
        }
        statusBar.style.color = 'white';
        statusBar.classList.add('show');
        setTimeout(() => {
            statusBar.classList.remove('show');
        }, 4000);
    }

    // Função para recolher os valores atuais
    function recolherDados() {
        const dados = {};
        const dimensoes = {
            x: form.querySelector('[name="dimensao_x"]').value,
            y: form.querySelector('[name="dimensao_y"]').value,
            z: form.querySelector('[name="dimensao_z"]').value
        };
        const campos = [
            'name', 'modelo', 'tipo_cartao', 'descricao',
            'categoria', 'linha', 'tipo', 'modelo_catalogo', 'estado', 'obs'
        ];
        campos.forEach(campo => {
            const input = form.querySelector(`[name="${campo}"]`);
            if (input) dados[campo] = input.value;
        });
        dados.dimensoes = dimensoes;
        return dados;
    }

    // Guardar estado original
    function guardarOriginais() {
        dadosOriginais = recolherDados();
    }

    // Restaurar estado original
    function restaurarOriginais() {
        const campos = [
            'name', 'modelo', 'tipo_cartao', 'descricao',
            'categoria', 'linha', 'tipo', 'modelo_catalogo', 'estado', 'obs'
        ];
        campos.forEach(campo => {
            const input = form.querySelector(`[name="${campo}"]`);
            if (input) input.value = dadosOriginais[campo] || '';
        });
        form.querySelector('[name="dimensao_x"]').value = dadosOriginais.dimensoes?.x || '';
        form.querySelector('[name="dimensao_y"]').value = dadosOriginais.dimensoes?.y || '';
        form.querySelector('[name="dimensao_z"]').value = dadosOriginais.dimensoes?.z || '';

        camposEditados.clear();
        atualizarEstadoBotoes();
    }

    // Controlo de edição
    let camposEditados = new Set();

    function atualizarEstadoBotoes() {
        if (camposEditados.size > 0) {
            formActions.classList.add('visible');
        } else {
            formActions.classList.remove('visible');
        }
    }

    // Adicionar listeners
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            if (input.name) {
                camposEditados.add(input.name);
                atualizarEstadoBotoes();
            }
        });
        input.addEventListener('change', () => {
            if (input.name) {
                camposEditados.add(input.name);
                atualizarEstadoBotoes();
            }
        });
    });

    // Cancelar
    btnCancelar.addEventListener('click', () => {
        if (camposEditados.size > 0) {
            if (confirm('Tem a certeza que pretende cancelar as alterações?')) {
                restaurarOriginais();
            }
        }
    });

    // Submissão
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const dados = recolherDados();

        try {
            const resp = await fetch(`/validar/api/artigo/${artigoCodigo}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });

            if (resp.ok) {
                mostrarMensagem('Artigo atualizado com sucesso!', 'sucesso');
                guardarOriginais();
                camposEditados.clear();
                atualizarEstadoBotoes();
            } else {
                const erro = await resp.json();
                throw new Error(erro.detail || 'Erro ao atualizar');
            }
        } catch (err) {
            mostrarMensagem('Erro: ' + err.message, 'erro');
        }
    });

    // Exportar Excel
    document.getElementById('btn-exportar-artigo').addEventListener('click', async () => {
        const btn = document.getElementById('btn-exportar-artigo');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> A exportar...';

        try {
            const resp = await fetch(`/validar/api/artigo/${artigoCodigo}/excel`);
            if (!resp.ok) throw new Error("Erro ao gerar Excel");

            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `artigo_${artigoCodigo}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            mostrarMensagem('Excel gerado com sucesso!', 'sucesso');
        } catch (err) {
            mostrarMensagem('Erro: ' + err.message, 'erro');
        }

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-file-excel"></i> Exportar Excel';
    });

    // ===============================
    // TOGGLE OCORRÊNCIAS
    // ===============================
    const header = document.getElementById('ocorrencias-header');
    const content = document.getElementById('ocorrencias-content');
    const icon = header?.querySelector('i');

    if (header && content) {
        header.addEventListener('click', () => {
            content.classList.toggle('collapsed');
            icon?.classList.toggle('expanded');
        });

        const total = artigo?.ocorrencias?.length || 0;

        if (total <= 5) {
            content.classList.remove('collapsed');
            icon?.classList.add('expanded');
        }
    }

    // ===============================
    // CHARTS
    // ===============================
    Chart.defaults.devicePixelRatio = window.devicePixelRatio;

    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'nearest',
            intersect: false
        },
        plugins: {
            legend: {
                labels: {
                    color: '#ccc',
                    font: { size: 14 }
                }
            }
        },
        scales: {
            x: {
                ticks: { color: '#ccc', font: { size: 12 } },
                grid: { color: '#333' }
            },
            y: {
                ticks: { color: '#ccc', font: { size: 12 } },
                grid: { color: '#333' }
            }
        }
    };

    const scatterOptions = {
        ...baseOptions,
        scales: {
            x: {
                ...baseOptions.scales.x,
                title: {
                    display: true,
                    text: 'Quantidade comprada',
                    color: '#ccc'
                }
            },
            y: {
                ...baseOptions.scales.y,
                title: {
                    display: true,
                    text: 'Preço unitário (€)',
                    color: '#ccc'
                }
            }
        }
    };

    function renderizarGraficos(artigo) {
        const stats = artigo.estatisticas;
        if (!stats || Object.keys(stats).length === 0) {
            console.warn('Sem estatísticas para gráficos');
            return;
        }

        const anos = Object.keys(stats).sort();
        const quantidades = anos.map(ano => stats[ano].total_unidades);

        const ocorrencias = artigo.ocorrencias || [];

        const valores = anos.map(ano => {
            return ocorrencias
                .filter(o => o.ano === ano)
                .reduce((acc, o) => acc + o.total, 0);
        });

        const precoMedio = anos.map(ano => stats[ano].media || 0);

        const ctxQuant = document.getElementById('chart-quantidade')?.getContext('2d');
        if (ctxQuant) {
            new Chart(ctxQuant, {
                type: 'bar',
                data: {
                    labels: anos,
                    datasets: [{
                        label: 'Unidades compradas',
                        data: quantidades,
                        backgroundColor: '#ffaa66',
                        borderRadius: 4
                    }]
                },
                options: baseOptions
            });
        }

        const ctxValor = document.getElementById('chart-valor')?.getContext('2d');
        if (ctxValor) {
            new Chart(ctxValor, {
                type: 'bar',
                data: {
                    labels: anos,
                    datasets: [{
                        label: 'Valor gasto (€)',
                        data: valores,
                        backgroundColor: '#66bb6a',
                        borderRadius: 4
                    }]
                },
                options: baseOptions
            });
        }

        const ctxPreco = document.getElementById('chart-preco-medio')?.getContext('2d');
        if (ctxPreco) {
            new Chart(ctxPreco, {
                type: 'line',
                data: {
                    labels: anos,
                    datasets: [{
                        label: 'Preço médio (€)',
                        data: precoMedio,
                        borderColor: '#ffaa66',
                        backgroundColor: 'transparent',
                        tension: 0.1,
                        fill: false,
                        pointBackgroundColor: '#ffaa66'
                    }]
                },
                options: baseOptions
            });
        }

        const pontos = ocorrencias.map(o => ({
            x: Number(o.quantidade) || 0,
            y: Number(o.preco_unit) || 0
        }));

        const ctxDisp = document.getElementById('chart-quantidade-preco')?.getContext('2d');
        if (ctxDisp) {
            new Chart(ctxDisp, {
                type: 'scatter',
                data: {
                    datasets: [{
                        label: 'Preço unitário',
                        data: pontos,
                        backgroundColor: '#ffaa66',
                        pointRadius: 6,
                        pointHoverRadius: 8
                    }]
                },
                options: scatterOptions
            });
        }
    }

    if (artigo) {
        renderizarGraficos(artigo);
    }

    // ===============================
    // DICIONÁRIOS
    // ===============================
    async function carregarDicionarios() {
        try {
            const resp = await fetch('/validar/api/dicionarios/todos');
            if (!resp.ok) throw new Error('Erro ao carregar dicionários');
            const dicionarios = await resp.json();

            for (let select of document.querySelectorAll('select[data-dicionario]')) {
                const nome = select.dataset.dicionario;
                const opcoes = dicionarios[nome] || [];
                const primeiro = select.options[0];

                select.innerHTML = '';
                select.appendChild(primeiro.cloneNode(true));

                opcoes.forEach(op => {
                    const option = document.createElement('option');
                    option.value = op;
                    option.textContent = op;
                    select.appendChild(option);
                });

                const valor = select.dataset.valor || '';
                select.value = valor;
            }

            guardarOriginais();
        } catch (err) {
            mostrarMensagem('Erro ao carregar dicionários', 'erro');
        }
    }

    carregarDicionarios();
});
