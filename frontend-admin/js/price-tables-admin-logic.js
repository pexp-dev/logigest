// frontend-admin/js/price-tables-admin-logic.js

// Importa todas as funções e elementos de UI do price-tables-admin-ui.js
import {
    priceTableListElement,
    priceTableDetailSection,
    priceTableMetadataForm,
    detailTitle,
    newPriceTableBtn,
    closeDetailBtn,
    savePriceTableBtn,
    deletePriceTableBtn,
    formMessage,
    priceTableListSection,
    adminContent,
    filterCarrierSelect,
    filterTypeSelect,
    priceTableIdInput,
    tableNameInput,
    tableCarrierNameSelect, // Importa o elemento select
    tableCarrierIdInput,
    tableTypeSelect,
    tableNotesInput,
    destinationsTableContainer,
    addDestinationBtn,
    conversionSection,
    countryDatalist,
    renderPriceTableList,
    populateFilters,
    openPriceTableFormUI,
    closePriceTableFormUI,
    renderDestinationsTable,
    renderConversionSection,
    htmlEscape,
    onlyAllowNumericWithSingleDot,
    displayMessage,
    clearMessage,
    setupCountryAutocomplete,
    countryAutocompleteInput,
    selectCountryFromAutocomplete,
    countryAutocompleteBlur,
    populateCarrierSelect, // Importa a função para popular o select de transportadores
    populateCountryDatalist, // Importa a função para popular o datalist de países
    setSaveButtonState // NOVO: Importa a função para controlar o estado do botão Guardar
} from './price-tables-admin-ui.js';

// Importa funções de acesso a dados do dataLoader.js
import {
    loadPriceTablesIndex,
    loadPriceTableById,
    loadCountries,
    loadCarriers // Importa loadCarriers
} from './data-access/dataLoader.js';

// Importa funções de salvamento e eliminação do dataSaver.js
import {
    savePriceTableData,
    deletePriceTableData
} from './data-access/dataSaver.js';

// --- Variáveis de Estado Global ---
let allPriceTablesIndex = [];
let currentFullPriceTable = null;
let editingPriceTableId = null;

let allCountries = [];
let allCarriers = []; // Variável para armazenar todos os transportadores
let allPriceKeys = [];

// Estado de edição de linha na tabela de destinos
let editLineIdx = null;
let editLineBackup = null;

// Estado de confirmação de eliminação de linha
let confirmDeleteIdx = null;

// Estado de edição da secção de conversão
let editConversionActive = false;
let editConversionBackup = null;

let isFormDirty = false; // NOVO: Variável para controlar se o formulário foi alterado

// --- Funções de Inicialização ---

/**
 * Carrega a lista de países, transportadores e o índice das tabelas de preços ao iniciar.
 */
async function initializeApp() {
    try {
        // Carrega e popula o datalist de países
        allCountries = await loadCountries();
        if (!Array.isArray(allCountries)) allCountries = [];
        window.allCountries = allCountries; // Expor globalmente para o autocomplete
        populateCountryDatalist(allCountries); // Popula o datalist no HTML

        // Carrega os transportadores
        allCarriers = await loadCarriers();
        if (!Array.isArray(allCarriers)) allCarriers = [];

        // Carrega o índice das tabelas de preços
        allPriceTablesIndex = await loadPriceTablesIndex();
        renderPriceTableList(allPriceTablesIndex);
        populateFilters(allPriceTablesIndex);

        addEventListeners();
        setSaveButtonState(false); // Desativa o botão Guardar ao iniciar a aplicação

    } catch (error) {
        console.error("Erro ao inicializar a aplicação:", error);
        displayMessage("Erro ao carregar dados iniciais. Por favor, tente novamente.", "error");
    }
}

/**
 * Adiciona todos os event listeners necessários aos elementos da UI.
 */
function addEventListeners() {
    newPriceTableBtn.addEventListener('click', handleNewPriceTable);
    closeDetailBtn.addEventListener('click', handleCloseDetail);
    filterCarrierSelect.addEventListener('change', handleFilterChange);
    filterTypeSelect.addEventListener('change', handleFilterChange);
    addDestinationBtn.addEventListener('click', handleAddDestination);

    const addEscalaoButton = document.getElementById('addEscalaoBtn');
    if (addEscalaoButton) {
        addEscalaoButton.addEventListener('click', handleAddEscalao);
    }
    savePriceTableBtn.addEventListener('click', handleSavePriceTable);

    priceTableListElement.addEventListener('click', (event) => {
        const item = event.target.closest('.price-table-item');
        if (item && item.dataset.id) {
            handlePriceTableSelected(item.dataset.id);
        }
    });

    deletePriceTableBtn.addEventListener('click', handleDeletePriceTable);

    // Listener para o select de transportadores
    tableCarrierNameSelect.addEventListener('change', handleCarrierSelectionChange);

    // NOVO: Listeners para marcar o formulário como "sujo"
    tableNameInput.addEventListener('input', markFormAsDirty);
    tableCarrierNameSelect.addEventListener('change', markFormAsDirty);
    tableTypeSelect.addEventListener('change', markFormAsDirty);
    tableNotesInput.addEventListener('input', markFormAsDirty);
}

/**
 * Marca o formulário como "sujo" (com alterações) e ativa o botão Guardar.
 */
function markFormAsDirty() {
    if (!isFormDirty) {
        isFormDirty = true;
        setSaveButtonState(true);
    }
}

/**
 * Lida com a mudança na seleção do transportador.
 */
function handleCarrierSelectionChange() {
    const selectedCarrierId = tableCarrierNameSelect.value;
    const selectedCarrier = allCarriers.find(c => c.id === selectedCarrierId);

    if (selectedCarrier) {
        tableCarrierIdInput.value = selectedCarrier.id;
        currentFullPriceTable.carrierName = selectedCarrier.name;
        currentFullPriceTable.carrierId = selectedCarrier.id;
    } else {
        tableCarrierIdInput.value = '';
        currentFullPriceTable.carrierName = '';
        currentFullPriceTable.carrierId = '';
        displayMessage("Transportador não encontrado. Por favor, selecione um transportador válido ou crie um novo em 'Transportadores'.", "error");
    }
    markFormAsDirty(); // Marca o formulário como sujo após a alteração
}


// --- Handlers de Eventos Principais ---

/**
 * Lida com o clique no botão "Adicionar Nova Tabela".
 */
function handleNewPriceTable() {
    currentFullPriceTable = {
        id: null,
        name: '',
        carrierName: '',
        carrierId: '',
        type: '',
        notes: '',
        destinations: [{ country: '', code: '', name: '', rates: {} }],
        conversion: { m3: '', LDM: '' }
    };
    editingPriceTableId = null;
    allPriceKeys = [];
    editLineIdx = null;
    editLineBackup = null;
    confirmDeleteIdx = null;
    editConversionActive = false;
    editConversionBackup = null;
    openPriceTableFormUI(
        currentFullPriceTable, editingPriceTableId, allCarriers, allCountries, allPriceKeys,
        editLineIdx, editLineBackup, confirmDeleteIdx, editConversionActive, editConversionBackup,
        window.rowBufferChange, window.saveEditRow, window.cancelEditRow, window.confirmDeleteRow, window.cancelDeleteRow, window.removeRow, window.addRow,
        window.editConversion, window.saveEditConversion, window.cancelEditConversion, window.editConversionBuffer,
        displayMessage, clearMessage
    );
    isFormDirty = false; // Resetar estado de "sujo" para nova tabela
    setSaveButtonState(false); // Desativar o botão
}

/**
 * Lida com o clique num item da lista de tabelas de preços.
 * @param {string} id - O ID da tabela de preços selecionada.
 */
async function handlePriceTableSelected(id) {
    clearMessage();
    editLineIdx = null;
    editLineBackup = null;
    confirmDeleteIdx = null;
    editConversionActive = false;
    editConversionBackup = null;

    try {
        currentFullPriceTable = await loadPriceTableById(id);
        if (!currentFullPriceTable) {
            displayMessage("Tabela de preços não encontrada.", "error");
            closePriceTableFormUI();
            return;
        }
        editingPriceTableId = id;

        const allKeys = new Set();
        if (currentFullPriceTable && currentFullPriceTable.destinations) {
            currentFullPriceTable.destinations.forEach(dest => {
                if (dest.rates) {
                    Object.keys(dest.rates).forEach(k => allKeys.add(k));
                }
            });
        }
        allPriceKeys = Array.from(allKeys);

        openPriceTableFormUI(
            currentFullPriceTable, editingPriceTableId, allCarriers, allCountries, allPriceKeys,
            editLineIdx, editLineBackup, confirmDeleteIdx, editConversionActive, editConversionBackup,
            window.rowBufferChange, window.saveEditRow, window.cancelEditRow, window.confirmDeleteRow, window.cancelDeleteRow, window.removeRow, window.addRow,
            window.editConversion, window.saveEditConversion, window.cancelEditConversion, window.editConversionBuffer,
            displayMessage, clearMessage
        );
        isFormDirty = false; // Resetar estado de "sujo" ao carregar uma tabela existente
        setSaveButtonState(false); // Desativar o botão
    } catch (error) {
        console.error("Erro ao carregar tabela de preços:", error);
        displayMessage("Erro ao carregar tabela de preços. Por favor, tente novamente.", "error");
        currentFullPriceTable = null;
        editingPriceTableId = null;
        closePriceTableFormUI();
    }
}

/**
 * Lida com o clique no botão "Fechar Detalhes".
 */
function handleCloseDetail() {
    closePriceTableFormUI();
    currentFullPriceTable = null;
    editingPriceTableId = null;
    renderPriceTableList(allPriceTablesIndex);
    isFormDirty = false; // Resetar estado de "sujo" ao fechar
    setSaveButtonState(false); // Desativar o botão
}

/**
 * Lida com a mudança nos filtros de transportador ou tipo.
 */
function handleFilterChange() {
    const carrierFilter = filterCarrierSelect.value;
    const typeFilter = filterTypeSelect.value;

    let filteredTables = allPriceTablesIndex;

    if (carrierFilter) {
        filteredTables = filteredTables.filter(table => table.carrierId === carrierFilter);
    }
    if (typeFilter) {
        filteredTables = filteredTables.filter(table => table.type === typeFilter);
    }

    renderPriceTableList(filteredTables, editingPriceTableId);
}

/**
 * Lida com o clique no botão "Guardar Tabela".
 */
async function handleSavePriceTable() {
    clearMessage();

    if (!tableNameInput.value.trim()) {
        displayMessage("O nome da tabela é obrigatório.", "error");
        return;
    }
    if (!tableCarrierNameSelect.value) {
        displayMessage("O nome do transportador é obrigatório.", "error");
        return;
    }
    if (!tableTypeSelect.value) {
        displayMessage("O tipo é obrigatório.", "error");
        return;
    }

    if (!currentFullPriceTable || !Array.isArray(currentFullPriceTable.destinations) || currentFullPriceTable.destinations.length === 0) {
        displayMessage("Pelo menos um destino é obrigatório.", "error");
        return;
    }

    for (let i = 0; i < currentFullPriceTable.destinations.length; i++) {
        const d = currentFullPriceTable.destinations[i];
        let country = (d.country || '').trim();
        let match = allCountries.find(c => c.toLowerCase() === country.toLowerCase());
        if (!match) {
            displayMessage(`Linha ${i + 1}: Selecione um país válido da lista!`, "error");
            return;
        }
        d.country = match;
        if (!d.code || d.code.trim() === '') {
            displayMessage(`Linha ${i + 1}: Código não pode ficar vazio.`, "error");
            return;
        }
        if (!d.rates || Object.keys(d.rates).length === 0) {
            displayMessage(`Linha ${i + 1}: Pelo menos um escalão é obrigatório.`, "error");
            return;
        }
        for (const key of allPriceKeys) {
            const val = d.rates[key];
            if (val === undefined || val === '') {
                displayMessage(`Linha ${i + 1}: Escalão "${key}" não pode ficar vazio.`, "error");
                return;
            }
            if (!/^[0-9]+(\.[0-9]+)?$/.test(val)) {
                displayMessage(`Linha ${i + 1}: Escalão "${key}" só pode conter números e ponto.`, "error");
                return;
            }
        }
    }

    currentFullPriceTable.name = tableNameInput.value.trim();
    const selectedCarrier = allCarriers.find(c => c.id === tableCarrierNameSelect.value);
    if (selectedCarrier) {
        currentFullPriceTable.carrierName = selectedCarrier.name;
        currentFullPriceTable.carrierId = selectedCarrier.id;
    } else {
        currentFullPriceTable.carrierName = '';
        currentFullPriceTable.carrierId = '';
    }
    currentFullPriceTable.type = tableTypeSelect.value;
    currentFullPriceTable.notes = tableNotesInput.value.trim();

    currentFullPriceTable.destinations.sort((a, b) => {
        let pa = (a.country || '').toLowerCase();
        let pb = (b.country || '').toLowerCase();
        if (pa < pb) return -1;
        if (pa > pb) return 1;
        let ca = (a.code || '').toLowerCase();
        let cb = (b.code || '').toLowerCase();
        if (ca < cb) return -1;
        if (ca > cb) return 1;
        return 0;
    });

    try {
        const result = await savePriceTableData(currentFullPriceTable);
        const savedId = result.id || currentFullPriceTable.id;

        displayMessage("Tabela de preços guardada com sucesso!", "success");

        allPriceTablesIndex = await loadPriceTablesIndex();
        renderPriceTableList(allPriceTablesIndex, savedId);
        populateFilters(allPriceTablesIndex);

        if (!currentFullPriceTable.id) {
            currentFullPriceTable.id = savedId;
            priceTableIdInput.value = savedId;
            editingPriceTableId = savedId;
            detailTitle.textContent = `Editar Tabela de Preços: ${currentFullPriceTable.name}`;
            deletePriceTableBtn.classList.remove('hidden');
        }
        isFormDirty = false; // Resetar estado de "sujo" após guardar
        setSaveButtonState(false); // Desativar o botão

    } catch (error) {
        console.error("Erro ao guardar tabela de preços:", error);
        displayMessage("Erro ao guardar tabela de preços. Por favor, tente novamente.", "error");
    }
}

/**
 * Lida com o clique no botão "Eliminar Tabela".
 */
async function handleDeletePriceTable() {
    if (!currentFullPriceTable || !currentFullPriceTable.id) {
        displayMessage("Nenhuma tabela selecionada para eliminar.", "error");
        return;
    }

    if (!confirm("Tem certeza que deseja eliminar esta tabela de preços? Esta ação não pode ser desfeita.")) {
        return;
    }

    try {
        await deletePriceTableData(currentFullPriceTable.id);
        displayMessage("Tabela de preços eliminada com sucesso!", "success");
        closePriceTableFormUI();
        currentFullPriceTable = null;
        editingPriceTableId = null;

        allPriceTablesIndex = await loadPriceTablesIndex();
        renderPriceTableList(allPriceTablesIndex);
        populateFilters(allPriceTablesIndex);
        isFormDirty = false; // Resetar estado de "sujo" após eliminar
        setSaveButtonState(false); // Desativar o botão
    } catch (error) {
        console.error("Erro ao eliminar tabela de preços:", error);
        displayMessage("Erro ao eliminar tabela de preços. Por favor, tente novamente.", "error");
    }
}

/**
 * Lida com o clique no botão "Adicionar Novo Destino".
 */
function handleAddDestination() {
    if (editLineIdx !== null || confirmDeleteIdx !== null) {
        displayMessage("Por favor, grave ou cancele a edição/eliminação da linha atual primeiro.", "info");
        return;
    }
    const emptyRates = {};
    allPriceKeys.forEach(key => { emptyRates[key] = ''; });
    currentFullPriceTable.destinations.push({
        country: '',
        code: '',
        name: '',
        rates: emptyRates
    });
    renderDestinationsTable(
        currentFullPriceTable.destinations, allCountries, allPriceKeys,
        editLineIdx, editLineBackup, confirmDeleteIdx,
        window.rowBufferChange, window.saveEditRow, window.cancelEditRow, window.confirmDeleteRow, window.cancelDeleteRow, window.removeRow
    );
    markFormAsDirty(); // Marca o formulário como sujo
    displayMessage("Novo destino adicionado. Preencha os campos.", "info");
}

/**
 * Lida com o clique no botão "Adicionar Novo Escalão/Coluna".
 */
function handleAddEscalao() {
    if (editLineIdx !== null || confirmDeleteIdx !== null) {
        displayMessage("Por favor, grave ou cancele a edição/eliminação da linha atual primeiro.", "info");
        return;
    }
    let novaCol = prompt('Nome do novo escalão/coluna (ex: "1001-2000" ou "minimum")');
    if (!novaCol) return;
    novaCol = novaCol.trim();
    if (!novaCol) return;
    if (allPriceKeys.includes(novaCol)) {
        displayMessage("Esse escalão já existe!", "error");
        return;
    }
    allPriceKeys.push(novaCol);
    currentFullPriceTable.destinations.forEach(dest => {
        if (!dest.rates) dest.rates = {};
        dest.rates[novaCol] = '';
    });
    renderDestinationsTable(
        currentFullPriceTable.destinations, allCountries, allPriceKeys,
        editLineIdx, editLineBackup, confirmDeleteIdx,
        window.rowBufferChange, window.saveEditRow, window.cancelEditRow, window.confirmDeleteRow, window.cancelDeleteRow, window.removeRow
    );
    markFormAsDirty(); // Marca o formulário como sujo
    displayMessage(`Escalão "${novaCol}" adicionado. Preencha os valores.`, "info");
}

// --- Funções de Edição de Linha (Expostas Globalmente) ---

/**
 * Inicia a edição de uma linha na tabela de destinos.
 * @param {number} idx - O índice da linha a editar.
 */
window.editRow = function(idx) {
    if (editLineIdx !== null || confirmDeleteIdx !== null) {
        displayMessage("Já existe uma linha em edição ou a ser eliminada. Grave/Cancele primeiro.", "info");
        return;
    }
    editLineIdx = idx;
    editLineBackup = JSON.parse(JSON.stringify(currentFullPriceTable.destinations[idx]));
    renderDestinationsTable(
        currentFullPriceTable.destinations, allCountries, allPriceKeys,
        editLineIdx, editLineBackup, confirmDeleteIdx,
        window.rowBufferChange, window.saveEditRow, window.cancelEditRow, window.confirmDeleteRow, window.cancelDeleteRow, window.removeRow
    );
    // Não marca como sujo aqui, pois a edição ainda não foi confirmada
};

/**
 * Atualiza o buffer da linha em edição.
 * @param {string} field - O nome do campo a atualizar (ex: 'country', 'code', 'name', 'rates').
 * @param {*} value - O novo valor do campo.
 * @param {string} [key] - A chave específica se o campo for 'rates' (ex: 'minimum', '1-100').
 */
window.rowBufferChange = function(field, value, key) {
    if (editLineIdx === null) return;
    if (field === 'rates') {
        editLineBackup.rates = editLineBackup.rates || {};
        editLineBackup.rates[key] = value;
    } else {
        editLineBackup[field] = value;
    }
    markFormAsDirty(); // Marca o formulário como sujo
};

/**
 * Salva as alterações da linha em edição.
 * @param {number} idx - O índice da linha que está a ser guardada.
 */
window.saveEditRow = function(idx) {
    let country = (editLineBackup.country || '').trim();
    let match = allCountries.find(c => c.toLowerCase() === country.toLowerCase());
    if (!match) {
        displayMessage('Selecione um país válido da lista!', "error");
        return;
    }
    editLineBackup.country = match;

    if (!editLineBackup.code || editLineBackup.code.trim() === '') {
        displayMessage('Código não pode ficar vazio!', "error");
        return;
    }
    if (!editLineBackup.rates || Object.keys(editLineBackup.rates).length === 0) {
        displayMessage('Pelo menos um escalão é obrigatório.', "error");
        return;
    }
    for (const key of allPriceKeys) {
        const val = editLineBackup.rates[key];
        if (val === undefined || val === '') {
            displayMessage(`Escalão "${key}" não pode ficar vazio.`, "error");
            return;
        }
        if (!/^[0-9]+(\.[0-9]+)?$/.test(val)) {
            displayMessage(`Escalão "${key}" só pode conter números e ponto.`, "error");
            return;
        }
    }

    currentFullPriceTable.destinations[idx] = JSON.parse(JSON.stringify(editLineBackup));
    editLineIdx = null;
    editLineBackup = null;
    renderDestinationsTable(
        currentFullPriceTable.destinations, allCountries, allPriceKeys,
        editLineIdx, editLineBackup, confirmDeleteIdx,
        window.rowBufferChange, window.saveEditRow, window.cancelEditRow, window.confirmDeleteRow, window.cancelDeleteRow, window.removeRow
    );
    markFormAsDirty(); // Marca o formulário como sujo
    displayMessage("Linha guardada com sucesso!", "success");
};

/**
 * Cancela a edição da linha, restaurando os valores originais.
 */
window.cancelEditRow = function() {
    editLineIdx = null;
    editLineBackup = null;
    renderDestinationsTable(
        currentFullPriceTable.destinations, allCountries, allPriceKeys,
        editLineIdx, editLineBackup, confirmDeleteIdx,
        window.rowBufferChange, window.saveEditRow, window.cancelEditRow, window.confirmDeleteRow, window.cancelDeleteRow, window.removeRow
    );
    // Não marca como sujo, pois as alterações foram desfeitas
    clearMessage();
};

/**
 * Prepara a linha para confirmação de eliminação.
 * @param {number} idx - O índice da linha a eliminar.
 */
window.confirmDeleteRow = function(idx) {
    if (editLineIdx !== null) {
        displayMessage("Por favor, grave ou cancele a edição da linha atual primeiro.", "info");
        return;
    }
    confirmDeleteIdx = idx;
    renderDestinationsTable(
        currentFullPriceTable.destinations, allCountries, allPriceKeys,
        editLineIdx, editLineBackup, confirmDeleteIdx,
        window.rowBufferChange, window.saveEditRow, window.cancelEditRow, window.confirmDeleteRow, window.cancelDeleteRow, window.removeRow
    );
};

/**
 * Cancela a eliminação da linha.
 */
window.cancelDeleteRow = function() {
    confirmDeleteIdx = null;
    renderDestinationsTable(
        currentFullPriceTable.destinations, allCountries, allPriceKeys,
        editLineIdx, editLineBackup, confirmDeleteIdx,
        window.rowBufferChange, window.saveEditRow, window.cancelEditRow, window.confirmDeleteRow, window.cancelDeleteRow, window.removeRow
    );
    clearMessage();
};

/**
 * Remove a linha da tabela após confirmação.
 * @param {number} idx - O índice da linha a remover.
 */
window.removeRow = function(idx) {
    if (currentFullPriceTable.destinations.length <= 1) {
        displayMessage('Pelo menos um destino tem de existir!', "error");
        confirmDeleteIdx = null;
        renderDestinationsTable(
            currentFullPriceTable.destinations, allCountries, allPriceKeys,
            editLineIdx, editLineBackup, confirmDeleteIdx,
            window.rowBufferChange, window.saveEditRow, window.cancelEditRow, window.confirmDeleteRow, window.cancelDeleteRow, window.removeRow
        );
        return;
    }
    currentFullPriceTable.destinations.splice(idx, 1);
    confirmDeleteIdx = null;
    if (editLineIdx === idx) {
        editLineIdx = null;
        editLineBackup = null;
    } else if (editLineIdx > idx) {
        editLineIdx--;
    }
    renderDestinationsTable(
        currentFullPriceTable.destinations, allCountries, allPriceKeys,
        editLineIdx, editLineBackup, confirmDeleteIdx,
        window.rowBufferChange, window.saveEditRow, window.cancelEditRow, window.confirmDeleteRow, window.cancelDeleteRow, window.removeRow
    );
    markFormAsDirty(); // Marca o formulário como sujo
    displayMessage("Linha eliminada com sucesso!", "success");
};

/**
 * Adiciona uma nova linha vazia à tabela de destinos.
 */
window.addRow = function() {
    if (editLineIdx !== null || confirmDeleteIdx !== null) {
        displayMessage("Por favor, grave ou cancele a edição/eliminação da linha atual primeiro.", "info");
        return;
    }
    const emptyRates = {};
    allPriceKeys.forEach(key => { emptyRates[key] = ''; });
    currentFullPriceTable.destinations.push({
        country: '',
        code: '',
        name: '',
        rates: emptyRates
    });
    renderDestinationsTable(
        currentFullPriceTable.destinations, allCountries, allPriceKeys,
        editLineIdx, editLineBackup, confirmDeleteIdx,
        window.rowBufferChange, window.saveEditRow, window.cancelEditRow, window.confirmDeleteRow, window.cancelDeleteRow, window.removeRow
    );
    markFormAsDirty(); // Marca o formulário como sujo
    displayMessage("Novo destino adicionado. Preencha os campos.", "info");
};

// --- Funções de Edição de Conversão (Expostas Globalmente) ---

/**
 * Inicia a edição da secção de conversão.
 */
window.editConversion = function() {
    if (editLineIdx !== null || confirmDeleteIdx !== null) {
        displayMessage("Por favor, grave ou cancele a edição/eliminação da linha atual primeiro.", "info");
        return;
    }
    editConversionActive = true;
    editConversionBackup = {
        m3: currentFullPriceTable.conversion.m3,
        LDM: currentFullPriceTable.conversion.LDM
    };
    renderConversionSection(
        currentFullPriceTable.conversion, editConversionActive, editConversionBackup,
        window.editConversion, window.saveEditConversion, window.cancelEditConversion, window.editConversionBuffer
    );
    // Não marca como sujo aqui, pois a edição ainda não foi confirmada
};

/**
 * Atualiza o buffer da secção de conversão.
 * @param {string} field - O campo a atualizar ('m3' ou 'LDM').
 * @param {*} value - O novo valor.
 */
window.editConversionBuffer = function(field, value) {
    if (!editConversionBackup) return;
    editConversionBackup[field] = value;
    markFormAsDirty(); // Marca o formulário como sujo
};

/**
 * Salva as alterações da secção de conversão.
 */
window.saveEditConversion = function() {
    const m3 = editConversionBackup.m3;
    const LDM = editConversionBackup.LDM;

    if (m3 !== '' && !/^[0-9]+(\.[0-9]+)?$/.test(m3)) {
        displayMessage('M3 só pode conter números e ponto.', "error");
        return;
    }
    if (LDM !== '' && !/^[0-9]+(\.[0-9]+)?$/.test(LDM)) {
        displayMessage('LDM só pode conter números e ponto.', "error");
        return;
    }

    currentFullPriceTable.conversion.m3 = m3;
    currentFullPriceTable.conversion.LDM = LDM;
    editConversionActive = false;
    editConversionBackup = null;
    renderConversionSection(
        currentFullPriceTable.conversion, editConversionActive, editConversionBackup,
        window.editConversion, window.saveEditConversion, window.cancelEditConversion, window.editConversionBuffer
    );
    markFormAsDirty(); // Marca o formulário como sujo
    displayMessage("Conversão alterada.", "success");
};

/**
 * Cancela a edição da secção de conversão.
 */
window.cancelEditConversion = function() {
    editConversionActive = false;
    editConversionBackup = null;
    renderConversionSection(
        currentFullPriceTable.conversion, editConversionActive, editConversionBackup,
        window.editConversion, window.saveEditConversion, window.cancelEditConversion, window.editConversionBuffer
    );
    // Não marca como sujo, pois as alterações foram desfeitas
    clearMessage();
};

// --- Funções Auxiliares (Expostas Globalmente para uso em HTML dinâmico) ---
window.htmlEscape = htmlEscape;
window.onlyAllowNumericWithSingleDot = onlyAllowNumericWithSingleDot;
window.displayMessage = displayMessage;
window.clearMessage = clearMessage;
window.countryAutocompleteInput = countryAutocompleteInput;
window.selectCountryFromAutocomplete = selectCountryFromAutocomplete;
window.countryAutocompleteBlur = countryAutocompleteBlur;

// --- Inicia a aplicação ---
initializeApp();
