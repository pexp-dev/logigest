// frontend-admin/js/data-access/dataLoader.js

/**
 * Carrega a lista de transportadores do ficheiro JSON.
 * @returns {Promise<Array>} Uma promessa que resolve para um array de transportadores.
 */
export async function loadCarriers() {
    try {
        const response = await fetch('/data/carriers.json');
        if (!response.ok) {
            throw new Error(`Erro HTTP! Estado: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao carregar transportadores:", error);
        return []; // Retorna um array vazio em caso de erro
    }
}

/**
 * Carrega a lista de tabelas de preços do ficheiro JSON.
 * @returns {Promise<Array>} Uma promessa que resolve para um array de tabelas de preços.
 */
export async function loadPriceTables() {
    try {
        const response = await fetch('/data/price_tables_index.json');
        if (!response.ok) {
            // Se o ficheiro não for encontrado, pode ser a primeira vez, retorna array vazio
            if (response.status === 404) {
                console.warn("Ficheiro price_tables_index.json não encontrado. A iniciar com lista vazia.");
                return [];
            }
            throw new Error(`Erro HTTP! Estado: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao carregar tabelas de preços:", error);
        return []; // Retorna um array vazio em caso de erro
    }
}

/**
 * Carrega a lista de países do ficheiro JSON.
 * @returns {Promise<Array>} Uma promessa que resolve para um array de países.
 */
export async function loadCountries() {
    try {
        const response = await fetch('/data/countries.json');
        if (!response.ok) {
            throw new Error(`Erro HTTP! Estado: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro ao carregar países:", error);
        return []; // Retorna um array vazio em caso de erro
    }
}
