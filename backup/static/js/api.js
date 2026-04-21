// api.js - Funções para chamar a API do backend

const API_BASE = '/validar/api';

export async function fetchDocumento() {
    const resp = await fetch(`${API_BASE}/validacao/documento`);
    if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.detail || 'Erro ao carregar documento');
    }
    return await resp.json();
}

export async function guardarRascunho(itemIdx, dados) {
    const resp = await fetch(`${API_BASE}/validacao/guardar_rascunho?item_idx=${itemIdx}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });
    if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.detail || 'Erro ao guardar rascunho');
    }
    return await resp.json();
}

export async function validarItem(itemIdx, dados) {
    const resp = await fetch(`${API_BASE}/validacao/validar_item?item_idx=${itemIdx}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    });
    if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.detail || 'Erro ao validar item');
    }
    return await resp.json();
}

export async function todosValidados() {
    const resp = await fetch(`${API_BASE}/validacao/todos_validados`, {
        method: 'POST'
    });
    if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.detail || 'Erro ao verificar itens validados');
    }
    return await resp.json();
}

export async function atualizarBD(reprocess = false) {
    const url = `${API_BASE}/atualizar_bd?reprocess=${reprocess}`;
    console.log('🔍 Chamando atualizarBD com URL:', url);
    const resp = await fetch(url, { method: 'POST' });
    if (!resp.ok) {
        const error = await resp.json();
        throw new Error(error.detail || 'Erro ao atualizar base de dados');
    }
    return await resp.json();
}