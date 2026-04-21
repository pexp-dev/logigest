// procura_medidas.js
document.addEventListener('DOMContentLoaded', () => {
    const btnPesquisar = document.getElementById('btn-pesquisar');
    const btnLimpar = document.getElementById('btn-limpar-filtros');
    const loading = document.getElementById('loading');
    const resultadosContainer = document.getElementById('resultados-container');
    const tbody = document.querySelector('#tabela-resultados tbody');
    const totalSpan = document.getElementById('total-resultados');
    const btnAnterior = document.getElementById('btn-anterior');
    const btnSeguinte = document.getElementById('btn-seguinte');
    const infoPagina = document.getElementById('info-pagina');

    let currentOffset = 0;
    let currentLimit = 100;
    let totalItems = 0;
    let currentItems = [];

    // ========== 1. TIPOS DE CARTÃO ==========
    const CODIGOS_TIPOS_CARTAO = [
        "BC", "BC.KK", "BC.RR", "BCA", "BK",
        "EB", "BB", "KK", "ACC", "AC"
    ];

    function interpretarTipoCartao(codigo) {
        if (!codigo) return null;
        const tipo = codigo.toUpperCase();
        const regex = /^([A-Z]{2,3})(?:\.([A-Z]{2,3}))?(?:\.\d+)?$/;
        const match = tipo.match(regex);
        if (!match) return tipo;
        const prefixo = match[1];
        const subtipo = match[2];
        const familias = {
            "B": "SIMPLES", "C": "SIMPLES",
            "BC": "DUPLO", "ACC": "DUPLO",
            "BCA": "TRIPLO", "BKC": "TRIPLO"
        };
        const papeis = {
            "KK": "KRAFT", "RR": "NORMAL",
            "TT": "RECICLADO", "WT": "BRANCO"
        };
        const familia = familias[prefixo];
        const papel = subtipo ? papeis[subtipo] : null;
        const partes = [familia, papel].filter(p => p);
        return partes.length ? partes.join(" ") : tipo;
    }

    const mapaTipos = new Map();
    for (const codigo of CODIGOS_TIPOS_CARTAO) {
        const legivel = interpretarTipoCartao(codigo);
        if (!mapaTipos.has(legivel)) mapaTipos.set(legivel, []);
        mapaTipos.get(legivel).push(codigo);
    }
    const tiposOrdenados = Array.from(mapaTipos.keys()).sort();

    const tipoSelect = document.getElementById('filtro_tipo_cartao');
    tipoSelect.innerHTML = '<option value="">Todos os tipos de cartão</option>';
    for (const nome of tiposOrdenados) {
        const opt = document.createElement('option');
        opt.value = nome;
        opt.textContent = nome;
        tipoSelect.appendChild(opt);
    }

    // ========== 2. MODELOS ==========
    const MODELOS_VALIDOS = [
        "201", "203", "409", "427", "401", "402", "404", "414",
        "417", "421", "431", "432", "441", "442", "451", "100"
    ];

    const modeloSelect = document.getElementById('filtro_modelo');
    modeloSelect.innerHTML = '<option value="">Todos os modelos</option>';
    [...MODELOS_VALIDOS].sort().forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = m;
        modeloSelect.appendChild(opt);
    });

    // ========== 3. LINHA ==========
    async function carregarDicionarioLinha() {
        try {
            const resp = await fetch('/validar/api/dicionarios/todos');
            if (!resp.ok) return;
            const dict = await resp.json();
            const linhaSelect = document.getElementById('filtro_linha');
            linhaSelect.innerHTML = '<option value="">Todas as linhas</option>';
            if (dict.linha && dict.linha.length) {
                dict.linha.forEach(l => {
                    const opt = document.createElement('option');
                    opt.value = l;
                    opt.textContent = l;
                    linhaSelect.appendChild(opt);
                });
            }
        } catch (err) {
            console.error('Erro ao carregar dicionário de linha:', err);
        }
    }

    // ========== 4. LIMPAR FILTROS (com modo "ambos" e margem 3) ==========
function limparFiltros() {
    document.getElementById('x').value = '';
    document.getElementById('y').value = '';
    document.getElementById('z').value = '';
    document.getElementById('modo_x').value = 'ambos';
    document.getElementById('modo_y').value = 'ambos';
    document.getElementById('modo_z').value = 'ambos';
    document.getElementById('margem_x').value = '3';
    document.getElementById('margem_y').value = '3';
    document.getElementById('margem_z').value = '3';
    
    // NOVO: desmarcar o checkbox
    const chk = document.getElementById('ignorar-orientacao');
    if (chk) chk.checked = false;
    
    const tipoSelectEl = document.getElementById('filtro_tipo_cartao');
    const modeloSelectEl = document.getElementById('filtro_modelo');
    const linhaSelectEl = document.getElementById('filtro_linha');
    if (tipoSelectEl) tipoSelectEl.value = '';
    if (modeloSelectEl) modeloSelectEl.value = '';
    if (linhaSelectEl) linhaSelectEl.value = '';
    
    resultadosContainer.style.display = 'none';
    currentOffset = 0;
    totalItems = 0;
    currentItems = [];
    
    document.querySelectorAll('th .sort-icon').forEach(icon => icon.remove());
    window.currentSortColumn = null;
    window.currentSortDir = null;
    
    const btn = document.getElementById('btn-limpar-filtros');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> Limpo!';
    setTimeout(() => {
        btn.innerHTML = originalHTML;
    }, 1000);
}

    // ========== 5. CONSTRUIR URL (cm → mm) ==========
function getApiUrl(offset) {
    let x_cm = document.getElementById('x').value;
    let y_cm = document.getElementById('y').value;
    let z_cm = document.getElementById('z').value;
    
    const x = x_cm !== '' ? parseFloat(x_cm) * 10 : '';
    const y = y_cm !== '' ? parseFloat(y_cm) * 10 : '';
    const z = z_cm !== '' ? parseFloat(z_cm) * 10 : '';
    
    const modo_x = document.getElementById('modo_x').value;
    const modo_y = document.getElementById('modo_y').value;
    const modo_z = document.getElementById('modo_z').value;
    
    let margem_x_cm = parseFloat(document.getElementById('margem_x').value) || 0;
    let margem_y_cm = parseFloat(document.getElementById('margem_y').value) || 0;
    let margem_z_cm = parseFloat(document.getElementById('margem_z').value) || 0;
    const margem_x = margem_x_cm * 10;
    const margem_y = margem_y_cm * 10;
    const margem_z = margem_z_cm * 10;

    const tipoSelecionado = document.getElementById('filtro_tipo_cartao').value;
    const modelo = document.getElementById('filtro_modelo').value;
    const linha = document.getElementById('filtro_linha').value;
    
    // NOVO: obter estado do checkbox
    const ignorarOrientacao = document.getElementById('ignorar-orientacao').checked;

    const params = new URLSearchParams();
    if (x !== '') params.append('x', x);
    if (y !== '') params.append('y', y);
    if (z !== '') params.append('z', z);
    params.append('modo_x', modo_x);
    params.append('modo_y', modo_y);
    params.append('modo_z', modo_z);
    params.append('margem_x', margem_x);
    params.append('margem_y', margem_y);
    params.append('margem_z', margem_z);
    
    // NOVO: adicionar parâmetro se estiver marcado
    if (ignorarOrientacao) params.append('ignorar_orientacao', 'true');

    if (tipoSelecionado && mapaTipos.has(tipoSelecionado)) {
        mapaTipos.get(tipoSelecionado).forEach(cod => params.append('tipo_cartao', cod));
    }
    if (modelo) params.append('modelo', modelo);
    if (linha) params.append('linha', linha);

    params.append('limit', currentLimit);
    params.append('offset', offset);
    return `/validar/api/artigos/procurar_por_medidas?${params.toString()}`;
}

    // ========== 6. PESQUISAR ==========
    async function pesquisar(offset = 0) {
        loading.style.display = 'block';
        resultadosContainer.style.display = 'none';
        try {
            const url = getApiUrl(offset);
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('Erro na pesquisa');
            const data = await resp.json();
            totalItems = data.total;
            currentOffset = data.offset;
            currentItems = data.items;
            renderizarResultados(currentItems);
            totalSpan.textContent = `(${totalItems} resultados)`;
            resultadosContainer.style.display = 'block';
            atualizarPaginacao();
            if (window.currentSortColumn) {
                ordenarTabela(window.currentSortColumn, window.currentSortDir);
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao pesquisar: ' + err.message);
        } finally {
            loading.style.display = 'none';
        }
    }

    // ========== 7. RENDERIZAR (mm → cm, SEM decimais) ==========
    function renderizarResultados(items) {
        tbody.innerHTML = '';
        if (items.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="8">Nenhum artigo encontrado com os critérios informados.</td>';
            tbody.appendChild(tr);
            return;
        }
        for (const art of items) {
            const dims = art.oficial?.dimensoes || {};
            // Arredondar para inteiro (sem casas decimais)
            const formatCm = (mm) => {
                if (mm === undefined || mm === null) return '?';
                return Math.round(mm / 10).toString();
            };
            const x_cm = formatCm(dims.x);
            const y_cm = formatCm(dims.y);
            const z_cm = formatCm(dims.z);
            const dimStr = `${x_cm} × ${y_cm} × ${z_cm} cm`;
            
            const preco = art.ultimo_preco ? `${art.ultimo_preco.toFixed(2)} €` : '';
            const ano = art.ultimo_ano || '';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${art.codigo || ''}</td>
                <td>${art.name || ''}</td>
                <td>${dimStr}</td>
                <td>${art.oficial?.tipo_cartao || ''}</td>
                <td>${art.oficial?.modelo || ''}</td>
                <td>${preco}</td>
                <td>${ano}</td>
                <td><a href="/validar/artigo/${art.codigo}" target="_blank">Ver detalhe</a></td>
            `;
            tbody.appendChild(tr);
        }
    }

    function atualizarPaginacao() {
        const totalPaginas = Math.ceil(totalItems / currentLimit);
        const paginaAtual = Math.floor(currentOffset / currentLimit) + 1;
        infoPagina.textContent = `Página ${paginaAtual} de ${totalPaginas || 1}`;
        btnAnterior.disabled = currentOffset === 0;
        btnSeguinte.disabled = currentOffset + currentLimit >= totalItems;
    }

    // ========== 8. ORDENAÇÃO (mantém igual) ==========
    function ordenarTabela(coluna, tipo = 'string', dir = null) {
        if (!currentItems.length) return;
        if (dir === null) {
            if (window.currentSortColumn === coluna) {
                window.currentSortDir = window.currentSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                window.currentSortDir = 'asc';
            }
        } else {
            window.currentSortDir = dir;
        }
        window.currentSortColumn = coluna;
        
        let sorted = [...currentItems];
        const colIndex = {
            'codigo': 0, 'name': 1, 'dimensoes': 2, 'tipo_cartao': 3,
            'modelo': 4, 'preco': 5, 'ano': 6
        }[coluna];
        if (colIndex === undefined) return;
        
        sorted.sort((a, b) => {
            let aVal, bVal;
            if (coluna === 'preco') {
                aVal = a.ultimo_preco || 0;
                bVal = b.ultimo_preco || 0;
            } else if (coluna === 'ano') {
                aVal = a.ultimo_ano || '';
                bVal = b.ultimo_ano || '';
                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            } else if (coluna === 'dimensoes') {
                aVal = a.oficial?.dimensoes?.x || 0;
                bVal = b.oficial?.dimensoes?.x || 0;
            } else if (coluna === 'codigo') {
                aVal = (a.codigo || '').toLowerCase();
                bVal = (b.codigo || '').toLowerCase();
            } else if (coluna === 'name') {
                aVal = (a.name || '').toLowerCase();
                bVal = (b.name || '').toLowerCase();
            } else if (coluna === 'tipo_cartao') {
                aVal = (a.oficial?.tipo_cartao || '').toLowerCase();
                bVal = (b.oficial?.tipo_cartao || '').toLowerCase();
            } else if (coluna === 'modelo') {
                aVal = (a.oficial?.modelo || '').toLowerCase();
                bVal = (b.oficial?.modelo || '').toLowerCase();
            } else {
                return 0;
            }
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return window.currentSortDir === 'asc' ? aVal - bVal : bVal - aVal;
            } else {
                const comparison = String(aVal).localeCompare(String(bVal));
                return window.currentSortDir === 'asc' ? comparison : -comparison;
            }
        });
        renderizarResultados(sorted);
        document.querySelectorAll('th .sort-icon').forEach(icon => icon.remove());
        const th = document.querySelector(`th[data-campo="${coluna}"]`);
        if (th) {
            const icon = document.createElement('span');
            icon.className = 'sort-icon';
            icon.innerHTML = window.currentSortDir === 'asc' ? ' ▲' : ' ▼';
            th.appendChild(icon);
        }
    }

    // ========== 9. EVENTOS ==========
    document.querySelectorAll('#tabela-resultados th').forEach(th => {
        const campo = th.getAttribute('data-campo');
        const tipo = th.getAttribute('data-tipo');
        if (campo && campo !== 'acoes') {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => ordenarTabela(campo, tipo));
        }
    });

    document.getElementById('x').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('y').focus(); }
    });
    document.getElementById('y').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('z').focus(); }
    });
    document.getElementById('z').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); pesquisar(0); }
    });

    btnPesquisar.addEventListener('click', () => pesquisar(0));
    btnLimpar.addEventListener('click', limparFiltros);
    btnAnterior.addEventListener('click', () => {
        const newOffset = Math.max(0, currentOffset - currentLimit);
        pesquisar(newOffset);
    });
    btnSeguinte.addEventListener('click', () => {
        const newOffset = currentOffset + currentLimit;
        if (newOffset < totalItems) pesquisar(newOffset);
    });

    carregarDicionarioLinha();
});