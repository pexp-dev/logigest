// utils.js - Funções utilitárias com interpretação de tipo de cartão

// Lógica de interpretação do tipo de cartão (adaptada do Python)
const FAMILIA = {
    "BC": "DUPLO",
    "ACC": "DUPLO",
    "BCA": "TRIPLO",
    "BKC": "TRIPLO",
};

const PAPEL = {
    "KK": "KRAFT",
    "RR": "NORMAL",
};

const REGEX_CARTAO = /^(?<prefixo>[A-Z]{2,3})(?:\.(?<subtipo>[A-Z]{2}))?(?:\.\d+)?$/;

export function interpretarTipoCartao(tipo) {
    if (!tipo) return null;
    const match = tipo.match(REGEX_CARTAO);
    if (!match) return tipo;
    const prefixo = match.groups?.prefixo;
    const subtipo = match.groups?.subtipo;
    const familia = FAMILIA[prefixo];
    const papel = PAPEL[subtipo];
    const partes = [];
    if (familia) partes.push(familia);
    if (papel) partes.push(papel);
    return partes.length > 0 ? partes.join(" ") : tipo;
}

export function gerarNameSugerido(descricao, tipoCartao) {
    if (!descricao) return "";
    const tipoFinal = interpretarTipoCartao(tipoCartao);
    if (tipoFinal) {
        return `CAIXA - ${descricao} - ${tipoFinal}`;
    }
    return `CAIXA - ${descricao}`;
}

export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

export function formatarValor(valor) {
    if (valor === null || valor === undefined) return '---';
    if (typeof valor === 'number') {
        if (Number.isInteger(valor)) return valor.toString();
        return valor.toString();
    }
    return valor.toString() || '---';
}