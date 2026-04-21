// encomenda_comum.js

// Constantes
export const STORAGE_KEY = 'encomendas_list_state';
export const LINHAS_POR_PAGINA = 15;
export const DEBOUNCE_DELAY = 300;
export const COLUNAS_PADRAO = ['numero', 'cliente', 'data', 'total_linhas', 'acoes'];

// Utilitários
export function escapeHtml(str) {
    return str ? str.replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m])) : '';
}

export function normalizeString(str) {
    return String(str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

export function sanitizarNumero(num) {
    if (!num) return '';
    let safe = num.replace(/[\\/*?:"<>|\n\r\t /]/g, '_');
    safe = safe.replace(/_+/g, '_');
    safe = safe.replace(/^_+|_+$/g, '');
    if (!safe || safe === '.' || safe === '..') safe = 'encomenda';
    return safe;
}

export function showLoading(loadingDiv, tabela, paginacao) {
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (tabela) tabela.style.display = 'none';
    if (paginacao) paginacao.style.display = 'none';
}

export function hideLoading(loadingDiv, tabela, paginacao) {
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (tabela) tabela.style.display = 'table';
    if (paginacao) paginacao.style.display = 'flex';
}