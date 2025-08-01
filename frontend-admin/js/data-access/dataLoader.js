// frontend-admin/js/data-access/dataLoader.js

const API_BASE_URL = 'http://localhost:8000/api'; // URL base da sua API FastAPI

/**
 * Carrega a lista de transportadores do backend.
 * @returns {Promise<Array<Object>>} Uma promessa que resolve para um array de transportadores.
 */
export async function loadCarriers() {
    console.log('A carregar transportadores do backend...');
    try {
        const response = await fetch(`${API_BASE_URL}/carriers`);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error('Erro ao carregar transportadores:', error);
        return [];
    }
}

/**
 * Carrega o índice (metadados) das tabelas de preços do backend.
 * Este endpoint retorna uma lista de objetos leves com 'id', 'name', 'type', 'carrierName', etc.
 * @returns {Promise<Array<Object>>} Uma promessa que resolve para um array de metadados de tabelas de preços.
 */
export async function loadPriceTablesIndex() {
    console.log('A carregar índice de tabelas de preços do backend...');
    try {
        const response = await fetch(`${API_BASE_URL}/price-tables/index`);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn("Endpoint /api/price-tables/index não encontrado ou sem dados. A iniciar com lista vazia.");
                return [];
            }
            throw new Error(`Erro HTTP! Estado: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error("Erro ao carregar índice de tabelas de preços:", error);
        return [];
    }
}

/**
 * Carrega os dados completos de uma tabela de preços específica pelo seu ID.
 * @param {string} tableId - O ID da tabela de preços a carregar.
 * @returns {Promise<Object|null>} Uma promessa que resolve para o objeto da tabela de preços completa ou null se não encontrada.
 */
export async function loadPriceTableById(tableId) {
    console.log(`A carregar tabela de preços com ID: ${tableId} do backend...`);
    try {
        const response = await fetch(`${API_BASE_URL}/price-tables/${tableId}`);
        if (!response.ok) {
            if (response.status === 404) {
                console.warn(`Tabela de preços com ID ${tableId} não encontrada.`);
                return null;
            }
            throw new Error(`Erro HTTP! Estado: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Erro ao carregar tabela de preços ${tableId}:`, error);
        return null;
    }
}

/**
 * Carrega a lista de países do backend.
 * @returns {Promise<Array<Object>>} Uma promessa que resolve para um array de objetos de país completos.
 */
export async function loadCountries() {
    console.log('A carregar países do backend...');
    try {
        const response = await fetch(`${API_BASE_URL}/countries`);
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        const data = await response.json();
        // CORRIGIDO: Retorna o array de objetos completos, sem mapear apenas para nomes.
        // O price-tables-admin-logic.js irá mapear para nomes se precisar.
        return Array.isArray(data) ? data : []; 
    } catch (error) {
        console.error('Erro ao carregar países:', error);
        return []; // Retorna um array vazio em caso de erro
    }
}

/**
 * Salva os dados completos de uma tabela de preços no backend.
 * Se tableId for null/undefined, cria uma nova tabela. Caso contrário, atualiza a existente.
 * @param {Object} priceTableData - O objeto completo da tabela de preços a salvar.
 * @returns {Promise<string>} Uma promessa que resolve para o ID da tabela salva/atualizada.
 */
export async function saveFullPriceTable(priceTableData) {
    console.log("A salvar tabela de preços no backend...", priceTableData);
    const method = priceTableData.id ? 'PUT' : 'POST';
    const url = priceTableData.id ? `${API_BASE_URL}/price-tables/${priceTableData.id}` : `${API_BASE_URL}/price-tables`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(priceTableData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro HTTP ao salvar tabela: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result.id || priceTableData.id;
    } catch (error) {
        console.error('Erro ao salvar tabela de preços:', error);
        throw error;
    }
}

/**
 * Elimina uma tabela de preços do backend.
 * @param {string} tableId - O ID da tabela de preços a eliminar.
 * @returns {Promise<void>} Uma promessa que resolve quando a eliminação é concluída.
 */
export async function deletePriceTable(tableId) {
    console.log(`A eliminar tabela de preços com ID: ${tableId} do backend...`);
    try {
        const response = await fetch(`${API_BASE_URL}/price-tables/${tableId}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro HTTP ao eliminar tabela: ${response.status} - ${errorText}`);
        }
        console.log(`Tabela ${tableId} eliminada com sucesso.`);
    } catch (error) {
        console.error(`Erro ao eliminar tabela de preços ${tableId}:`, error);
        throw error;
    }
}
