// frontend-admin/js/data-access/dataSaver.js

/**
 * Guarda os dados dos transportadores no backend.
 * @param {Array} carriers - O array de transportadores a guardar.
 * @returns {Promise<Object>} Uma promessa que resolve com a resposta do servidor.
 */
export async function saveCarriersData(carriers) {
    try {
        const response = await fetch('/admin/save-carriers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(carriers)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao guardar transportadores: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro na função saveCarriersData:", error);
        throw error; // Re-lança o erro para ser tratado pela função chamadora
    }
}

/**
 * Guarda os dados das tabelas de preços no backend.
 * @param {Array} priceTables - O array de tabelas de preços a guardar.
 * @returns {Promise<Object>} Uma promessa que resolve com a resposta do servidor.
 */
export async function savePriceTablesData(priceTables) {
    try {
        const response = await fetch('/admin/save-price-tables', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(priceTables)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao guardar tabelas de preços: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro na função savePriceTablesData:", error);
        throw error; // Re-lança o erro para ser tratado pela função chamadora
    }
}
