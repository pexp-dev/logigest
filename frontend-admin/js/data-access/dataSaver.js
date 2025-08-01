// frontend-admin/js/data-access/dataSaver.js

const API_BASE_URL = 'http://localhost:8000/api'; // URL base da sua API FastAPI

/**
 * Salva a lista completa de transportadores no backend.
 * @param {Array<Object>} carriers - O array de transportadores a serem salvos.
 * @returns {Promise<void>} Uma promessa que resolve quando a operação é concluída.
 */
export async function saveCarriersData(carriers) {
    console.log('A guardar transportadores no backend:', carriers);
    try {
        const response = await fetch(`${API_BASE_URL}/carriers`, {
            method: 'POST', // Usamos POST para enviar a lista completa
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(carriers)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Resposta do backend ao guardar transportadores:', result);
    } catch (error) {
        console.error('Erro ao guardar transportadores:', error);
        throw error;
    }
}

/**
 * Salva os dados de uma tabela de preços específica no backend.
 * @param {Object} priceTableData - O objeto completo da tabela de preços a ser salvo.
 * @returns {Promise<Object>} Uma promessa que resolve com a resposta do servidor.
 */
export async function savePriceTableData(priceTableData) { // Renomeado para refletir que guarda uma única tabela
    console.log(`A guardar tabela de preços com ID ${priceTableData.id} no backend:`, priceTableData);
    try {
        const response = await fetch(`${API_BASE_URL}/price-tables/${priceTableData.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(priceTableData)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao guardar tabela de preços: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro na função savePriceTableData:", error);
        throw error;
    }
}

/**
 * Elimina uma tabela de preços específica do backend.
 * @param {string} tableId - O ID da tabela de preços a ser eliminada.
 * @returns {Promise<Object>} Uma promessa que resolve com a resposta do servidor.
 */
export async function deletePriceTableData(tableId) {
    console.log(`A eliminar tabela de preços com ID ${tableId} do backend...`);
    try {
        const response = await fetch(`${API_BASE_URL}/price-tables/${tableId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao eliminar tabela de preços: ${response.status} ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Erro na função deletePriceTableData:", error);
        throw error;
    }
}
