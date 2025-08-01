// frontend-admin/js/price-tables-admin-ui.js

// --- Obtenção de Elementos UI ---

// Elementos da secção de listagem
export const priceTableListElement = document.getElementById('priceTableList');
export const priceTableListSection = document.getElementById('priceTableListSection');
export const newPriceTableBtn = document.getElementById('newPriceTableBtn');
export const filterCarrierSelect = document.getElementById('filterCarrier');
export const filterTypeSelect = document.getElementById('filterType');

// Elementos da secção de detalhe
export const priceTableDetailSection = document.getElementById('priceTableDetailSection');
export const detailTitle = document.getElementById('detailTitle');
export const closeDetailBtn = document.getElementById('closeDetailBtn');
export const priceTableMetadataForm = document.getElementById('priceTableMetadataForm');
export const priceTableIdInput = document.getElementById('priceTableId');
export const tableNameInput = document.getElementById('tableName');
export const tableCarrierNameSelect = document.getElementById('tableCarrierName');
export const tableCarrierIdInput = document.getElementById('tableCarrierId');
export const tableTypeSelect = document.getElementById('tableType');
export const tableNotesInput = document.getElementById('tableNotes');
export const destinationsTableContainer = document.getElementById('destinationsTableContainer');
export const addDestinationBtn = document.getElementById('addDestinationBtn');
export const conversionSection = document.getElementById('conversionSection');
export const savePriceTableBtn = document.getElementById('savePriceTableBtn');
export const deletePriceTableBtn = document.getElementById('deletePriceTableBtn');
export const formMessage = document.getElementById('formMessage');
export const countryDatalist = document.getElementById('countryDatalist');

// Elemento principal (pai de ambas as secções)
export const adminContent = document.querySelector('.admin-content');

// --- Funções de Renderização e Manipulação da UI ---

/**
 * Renderiza a lista de tabelas de preços.
 * @param {Array<Object>} priceTables - Array de objetos de metadados de tabelas de preços.
 * @param {string|null} activeTableId - O ID da tabela ativa para aplicar um estilo de destaque.
 */
export function renderPriceTableList(priceTables, activeTableId = null) {
    if (!priceTableListElement) return;

    if (priceTables.length === 0) {
        priceTableListElement.innerHTML = '<p>Nenhuma tabela de preços encontrada. Adicione uma nova!</p>';
        return;
    }

    priceTableListElement.innerHTML = priceTables.map(table => `
        <div class="price-table-item table-card ${table.id === activeTableId ? 'active' : ''}" data-id="${htmlEscape(table.id)}">
            <h3>${htmlEscape(table.name)}</h3>
            <p><strong>Transportador:</strong> ${htmlEscape(table.carrierName)}</p>
            <p><strong>Tipo:</strong> ${htmlEscape(table.type)}</p>
            <p><strong>Última Modificação:</strong> ${htmlEscape(table.lastModified || 'N/A')}</p>
        </div>
    `).join('');
}

/**
 * Popula os dropdowns de filtro com base nos dados do índice.
 * @param {Array<Object>} priceTables - Array de objetos de metadados de tabelas de preços.
 */
export function populateFilters(priceTables) {
    if (filterCarrierSelect) {
        const carriers = [...new Set(priceTables.map(table => table.carrierName))].sort();
        filterCarrierSelect.innerHTML = '<option value="">Todos os Transportadores</option>' +
            carriers.map(carrier => `<option value="${htmlEscape(carrier)}">${htmlEscape(carrier)}</option>`).join('');
    }
    // O filtro de tipo é estático no HTML por enquanto, mas poderia ser dinâmico também.
}

/**
 * Popula o select de transportadores no formulário de detalhes.
 * @param {Array<Object>} carriers - Array de objetos de transportadores (ex: {id: 'ID1', name: 'Nome1'}).
 * @param {string|null} selectedCarrierId - O ID do transportador a ser pré-selecionado.
 */
export function populateCarrierSelect(carriers, selectedCarrierId = null) {
    if (!tableCarrierNameSelect) return;

    tableCarrierNameSelect.innerHTML = '<option value="">Selecione um Transportador</option>';
    carriers.forEach(carrier => {
        const option = document.createElement('option');
        option.value = carrier.id; // O valor da opção será o ID do transportador
        option.textContent = carrier.name;
        if (selectedCarrierId && carrier.id === selectedCarrierId) {
            option.selected = true;
        }
        tableCarrierNameSelect.appendChild(option);
    });

    // Se um transportador foi pré-selecionado, preenche o ID automaticamente
    if (selectedCarrierId) {
        const selectedCarrier = carriers.find(c => c.id === selectedCarrierId);
        if (selectedCarrier) {
            tableCarrierIdInput.value = selectedCarrier.id;
        }
    } else {
        tableCarrierIdInput.value = ''; // Limpa o ID se nada estiver selecionado
    }
}

/**
 * Popula o elemento <datalist> com os nomes dos países.
 * @param {Array<string>} countries - Array de nomes de países.
 */
export function populateCountryDatalist(countries) {
    if (!countryDatalist) return;
    countryDatalist.innerHTML = countries.map(country => `<option value="${htmlEscape(country)}"></option>`).join('');
}

/**
 * Controla o estado de ativação/desativação do botão "Guardar Tabela".
 * @param {boolean} enabled - True para ativar, False para desativar.
 */
export function setSaveButtonState(enabled) {
    if (savePriceTableBtn) {
        savePriceTableBtn.disabled = !enabled;
    }
}

/**
 * Abre o formulário de edição de tabela de preços e preenche-o com os dados.
 * @param {Object} currentFullPriceTable - O objeto completo da tabela de preços.
 * @param {string|null} editingPriceTableId - O ID da tabela em edição (null para nova).
 * @param {Array<Object>} allCarriers - Lista de todos os objetos de transportadores.
 * @param {Array<string>} allCountries - Lista de países para autocomplete.
 * @param {Array<string>} allPriceKeys - Lista de chaves de preço (escalões).
 * @param {number|null} editLineIdx - Índice da linha em edição na tabela de destinos.
 * @param {Object|null} editLineBackup - Backup da linha em edição.
 * @param {number|null} confirmDeleteIdx - Índice da linha a ser confirmada para eliminação.
 * @param {boolean} editConversionActive - Se a secção de conversão está em modo de edição.
 * @param {Object|null} editConversionBackup - Backup da secção de conversão.
 * @param {Function} rowBufferChange - Função para atualizar o buffer da linha.
 * @param {Function} saveEditRow - Função para salvar a linha.
 * @param {Function} cancelEditRow - Função para cancelar a edição da linha.
 * @param {Function} confirmDeleteRow - Função para confirmar a eliminação da linha.
 * @param {Function} cancelDeleteRow - Função para cancelar a eliminação da linha.
 * @param {Function} removeRow - Função para remover a linha.
 * @param {Function} addRow - Função para adicionar uma nova linha.
 * @param {Function} editConversion - Função para iniciar a edição da conversão.
 * @param {Function} saveEditConversion - Função para salvar a conversão.
 * @param {Function} cancelEditConversion - Função para cancelar a conversão.
 * @param {Function} editConversionBuffer - Função para atualizar o buffer da conversão.
 * @param {Function} displayMessage - Função para exibir mensagens.
 * @param {Function} clearMessage - Função para limpar mensagens.
 */
export function openPriceTableFormUI(
    currentFullPriceTable, editingPriceTableId, allCarriers, allCountries, allPriceKeys,
    editLineIdx, editLineBackup, confirmDeleteIdx, editConversionActive, editConversionBackup,
    rowBufferChange, saveEditRow, cancelEditRow, confirmDeleteRow, cancelDeleteRow, removeRow, addRow,
    editConversion, saveEditConversion, cancelEditConversion, editConversionBuffer,
    displayMessage, clearMessage
) {
    if (!priceTableDetailSection || !priceTableListSection) return;

    priceTableListSection.classList.add('hidden');
    priceTableDetailSection.classList.remove('hidden');

    // Preencher metadados
    detailTitle.textContent = currentFullPriceTable.name ? `Editar Tabela de Preços: ${currentFullPriceTable.name}` : 'Nova Tabela de Preços';
    priceTableIdInput.value = currentFullPriceTable.id || '';
    tableNameInput.value = currentFullPriceTable.name || '';

    // Preencher o select de transportadores e o ID
    populateCarrierSelect(allCarriers, currentFullPriceTable.carrierId);
    tableTypeSelect.value = currentFullPriceTable.type || '';
    tableNotesInput.value = currentFullPriceTable.notes || '';

    // Renderizar tabela de destinos
    renderDestinationsTable(
        currentFullPriceTable.destinations, allCountries, allPriceKeys,
        editLineIdx, editLineBackup, confirmDeleteIdx,
        rowBufferChange, saveEditRow, cancelEditRow, confirmDeleteRow, cancelDeleteRow, removeRow
    );

    // Renderizar secção de conversão
    renderConversionSection(
        currentFullPriceTable.conversion, editConversionActive, editConversionBackup,
        editConversion, saveEditConversion, cancelEditConversion, editConversionBuffer
    );

    // Mostrar/esconder botão de eliminar
    if (editingPriceTableId) {
        deletePriceTableBtn.classList.remove('hidden');
    } else {
        deletePriceTableBtn.classList.add('hidden');
    }
    clearMessage();
    setSaveButtonState(false); // Desativar o botão ao abrir o formulário
}

/**
 * Fecha o formulário de edição e volta para a lista.
 */
export function closePriceTableFormUI() {
    if (!priceTableDetailSection || !priceTableListSection) return;
    priceTableDetailSection.classList.add('hidden');
    priceTableListSection.classList.remove('hidden');
    clearMessage();
    setSaveButtonState(false); // Desativar o botão ao fechar o formulário
}

/**
 * Renderiza a tabela de destinos dentro do container.
 * @param {Array<Object>} destinations - Array de objetos de destino.
 * @param {Array<string>} allCountries - Lista de países para autocomplete.
 * @param {Array<string>} allPriceKeys - Lista de chaves de preço (escalões).
 * @param {number|null} editLineIdx - Índice da linha atualmente em edição.
 * @param {Object|null} editLineBackup - Cópia de segurança da linha em edição.
 * @param {number|null} confirmDeleteIdx - Índice da linha a ser confirmada para eliminação.
 * @param {Function} rowBufferChange - Função de callback para mudanças no buffer da linha.
 * @param {Function} saveEditRow - Função de callback para salvar a linha.
 * @param {Function} cancelEditRow - Função de callback para cancelar a edição da linha.
 * @param {Function} confirmDeleteRow - Função de callback para confirmar a eliminação da linha.
 * @param {Function} cancelDeleteRow - Função de callback para cancelar a eliminação da linha.
 * @param {Function} removeRow - Função de callback para remover a linha.
 */
export function renderDestinationsTable(
    destinations, allCountries, allPriceKeys,
    editLineIdx, editLineBackup, confirmDeleteIdx,
    rowBufferChange, saveEditRow, cancelEditRow, confirmDeleteRow, cancelDeleteRow, removeRow
) {
    if (!destinationsTableContainer) return;

    let html = '<table><thead><tr>';
    html += '<th>País</th><th>Código</th><th>Nome</th>';
    allPriceKeys.forEach(key => html += `<th>${htmlEscape(key)}</th>`);
    html += '<th class="actions">Ações</th></tr></thead><tbody>';

    destinations.forEach((dest, idx) => {
        const isEditing = (editLineIdx === idx);
        const isConfirmDelete = (confirmDeleteIdx === idx);
        const currentDest = isEditing ? editLineBackup : dest; // Usa o backup se estiver em edição

        html += `<tr class="${isEditing ? 'editing' : 'readonly'}">`; // Adiciona classe 'editing'

        // País (com autocomplete)
        if (isEditing) {
            html += `<td>${renderCountryAutocomplete(currentDest.country, idx, allCountries)}</td>`;
        } else {
            html += `<td><input type="text" value="${htmlEscape(currentDest.country)}" readonly></td>`;
        }

        // Código e Nome
        html += `<td><input type="text" value="${htmlEscape(currentDest.code)}" ${isEditing ? '' : 'readonly'} onchange="window.rowBufferChange('code', this.value)"></td>`;
        html += `<td><input type="text" value="${htmlEscape(currentDest.name)}" ${isEditing ? '' : 'readonly'} onchange="window.rowBufferChange('name', this.value)"></td>`;

        // Rates (escalões)
        allPriceKeys.forEach(key => {
            let val = '';
            if (currentDest.rates && currentDest.rates[key] !== undefined) val = currentDest.rates[key];
            html += `<td><input type="text"
                value="${htmlEscape(val)}"
                ${isEditing ? '' : 'readonly'}
                oninput="window.onlyAllowNumericWithSingleDot(this)"
                onchange="window.rowBufferChange('rates', this.value, '${htmlEscape(key)}')"></td>`;
        });

        // Ações
        html += `<td class="actions">`;
        if (isEditing) {
            html += `<button onclick="window.saveEditRow(${idx})" class="save-btn">Gravar</button>`;
            html += `<button onclick="window.cancelEditRow()" class="cancel-btn">Cancelar</button>`;
        } else if (isConfirmDelete) {
            html += `<span>Tem a certeza?</span> `;
            html += `<button onclick="window.removeRow(${idx})" class="delete-btn">Sim</button>`;
            html += `<button onclick="window.cancelDeleteRow()" class="cancel-btn">Não</button>`;
        } else {
            html += `<button onclick="window.editRow(${idx})" class="edit-btn">Editar</button>`;
            if (destinations.length > 1) { // Só permite apagar se houver mais de 1 destino
                html += `<button onclick="window.confirmDeleteRow(${idx})" class="remove-btn">Apagar</button>`;
            }
        }
        html += `</td></tr>`;
    });

    html += '</tbody></table>';
    destinationsTableContainer.innerHTML = html;

    // Inicializa autocomplete país se necessário
    if (editLineIdx !== null) {
        setTimeout(() => {
            setupCountryAutocomplete(editLineIdx);
        }, 0);
    }
}

/**
 * Helper para renderizar o campo de país com autocomplete.
 * @param {string} value - Valor atual do campo.
 * @param {number} idx - Índice da linha.
 * @param {Array<string>} allCountries - Lista completa de países.
 * @returns {string} HTML para o campo de país com autocomplete.
 */
function renderCountryAutocomplete(value, idx, allCountries) {
    return `<div class="autocomplete-wrapper">
        <input type="text" id="country-input-${idx}" value="${htmlEscape(value)}"
            autocomplete="off" list="countryDatalist"
            oninput="window.countryAutocompleteInput(event, ${idx})"
            onfocus="window.countryAutocompleteInput(event, ${idx})"
            onblur="window.countryAutocompleteBlur(event, ${idx})"
            style="width: 160px">
        <div id="country-list-${idx}" class="autocomplete-list" style="display:none"></div>
    </div>`;
}

/**
 * Renderiza a secção de conversão (m3 e LDM).
 * @param {Object} conversionData - Objeto com dados de conversão.
 * @param {boolean} editConversionActive - Se a secção está em modo de edição.
 * @param {Object|null} editConversionBackup - Backup dos dados de conversão.
 * @param {Function} editConversion - Função para iniciar a edição.
 * @param {Function} saveEditConversion - Função para salvar.
 * @param {Function} cancelEditConversion - Função para cancelar.
 * @param {Function} editConversionBuffer - Função para atualizar o buffer.
 */
export function renderConversionSection(
    conversionData, editConversionActive, editConversionBackup,
    editConversion, saveEditConversion, cancelEditConversion, editConversionBuffer
) {
    if (!conversionSection) return;

    const currentConversion = editConversionActive ? editConversionBackup : conversionData;

    if (editConversionActive) {
        let html = `<div class="conversion-section">
            <b>Conversão (final do ficheiro):</b>
            <label>M3: <input id="conv-m3" type="number" value="${currentConversion.m3 ?? ''}" step="any" onchange="window.editConversionBuffer('m3', this.value)"></label>
            <label>LDM: <input id="conv-ldm" type="number" value="${currentConversion.LDM ?? ''}" step="any" onchange="window.editConversionBuffer('LDM', this.value)"></label>
            <span class="conversion-actions">
                <button onclick="window.saveEditConversion()" class="save-btn">Gravar</button>
                <button onclick="window.cancelEditConversion()" class="cancel-btn">Cancelar</button>
            </span>
        </div>`;
        conversionSection.innerHTML = html;
    } else {
        let html = `<div class="conversion-section">
            <b>Conversão (final do ficheiro):</b>
            <label>M3: <input id="conv-m3" type="number" value="${currentConversion.m3 ?? ''}" step="any" readonly></label>
            <label>LDM: <input id="conv-ldm" type="number" value="${currentConversion.LDM ?? ''}" step="any" readonly></label>
            <span class="conversion-actions">
                <button onclick="window.editConversion()" class="edit-btn">Editar</button>
            </span>
        </div>`;
        conversionSection.innerHTML = html;
    }
}

// --- Funções Auxiliares (para uso interno e exposição global) ---

/**
 * Escapa caracteres HTML para evitar XSS.
 * @param {string} s - A string a escapar.
 * @returns {string} A string escapada.
 */
export function htmlEscape(s) {
    return String(s === undefined || s === null ? '' : s)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/**
 * Permite apenas números e um único ponto decimal em um campo de input.
 * @param {HTMLInputElement} input - O elemento input.
 */
export function onlyAllowNumericWithSingleDot(input) {
    let v = input.value;
    v = v.replace(/[^0-9.]/g, '');
    let parts = v.split('.');
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    input.value = v;
}

/**
 * Exibe uma mensagem de feedback ao utilizador.
 * @param {string} msg - A mensagem a exibir.
 * @param {string} type - O tipo de mensagem ('success', 'error', 'info').
 */
export function displayMessage(msg, type = 'info') {
    if (!formMessage) return;
    formMessage.textContent = msg;
    formMessage.className = `message ${type}`;
    setTimeout(() => {
        clearMessage();
    }, 4000); // Limpa a mensagem após 4 segundos
}

/**
 * Limpa a mensagem de feedback.
 */
export function clearMessage() {
    if (!formMessage) return;
    formMessage.textContent = "";
    formMessage.className = "message"; // Resetar classes
}

// --- Funções de Autocomplete para País ---
// Estas funções precisam ser globais porque são chamadas diretamente do HTML gerado dinamicamente.

/**
 * Configura o autocomplete para o input de país.
 * @param {number} idx - O índice da linha da tabela.
 */
export function setupCountryAutocomplete(idx) {
    const input = document.getElementById('country-input-' + idx);
    const list = document.getElementById('country-list-' + idx);
    let activeItem = -1;

    if (!input || !list) return;

    input.addEventListener('keydown', function(e) {
        const items = list.querySelectorAll('.autocomplete-item');
        if (!items.length) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            activeItem = Math.min(activeItem + 1, items.length - 1);
            updateActive();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            activeItem = Math.max(activeItem - 1, 0);
            updateActive();
        } else if (e.key === "Enter" && activeItem >= 0) {
            e.preventDefault();
            items[activeItem].click();
        }
    });

    function updateActive() {
        const items = list.querySelectorAll('.autocomplete-item');
        items.forEach((item, i) => {
            if (i === activeItem) item.classList.add('active');
            else item.classList.remove('active');
        });
        if (activeItem >= 0 && items[activeItem]) {
            items[activeItem].scrollIntoView({ block: "nearest" });
        }
    }

    // Força sempre nome correto na saída do campo
    input.addEventListener('change', () => {
        let val = input.value.trim();
        // Acessa allCountries via window.allCountries, pois é uma variável global definida em price-tables-admin-logic.js
        let match = window.allCountries.find(c => c.toLowerCase() === val.toLowerCase());
        if (match) {
            input.value = match;
            // Chama a função global rowBufferChange
            window.rowBufferChange('country', match);
        }
    });
}

/**
 * Lida com a entrada de texto no campo de autocomplete de país.
 * @param {Event} e - O evento de input.
 * @param {number} idx - O índice da linha da tabela.
 */
export function countryAutocompleteInput(e, idx) {
    const input = document.getElementById('country-input-' + idx);
    const list = document.getElementById('country-list-' + idx);
    if (!input || !list) return;

    let val = input.value.trim().toLowerCase();
    // Acessa allCountries via window.allCountries
    let filtered = val
        ? window.allCountries.filter(c => c.toLowerCase().startsWith(val))
        : window.allCountries;

    list.innerHTML = filtered.map(c =>
        `<div class="autocomplete-item" onclick="window.selectCountryFromAutocomplete('${htmlEscape(c)}', ${idx})">${htmlEscape(c)}</div>`
    ).join('');
    list.style.display = filtered.length ? "block" : "none";
}

/**
 * Lida com a seleção de um país na lista de autocomplete.
 * @param {string} country - O nome do país selecionado.
 * @param {number} idx - O índice da linha da tabela.
 */
export function selectCountryFromAutocomplete(country, idx) {
    const input = document.getElementById('country-input-' + idx);
    if (!input) return;
    input.value = country;
    // Chama a função global rowBufferChange
    window.rowBufferChange('country', country);
    setTimeout(() => {
        const list = document.getElementById('country-list-' + idx);
        if (list) list.style.display = "none";
    }, 50);
}

/**
 * Lida com o evento blur (perda de foco) no campo de autocomplete de país.
 * @param {Event} e - O evento de blur.
 * @param {number} idx - O índice da linha da tabela.
 */
export function countryAutocompleteBlur(e, idx) {
    setTimeout(() => {
        const input = document.getElementById('country-input-' + idx);
        const list = document.getElementById('country-list-' + idx);
        if (!input || !list) return;

        let val = input.value.trim();
        // Acessa allCountries via window.allCountries
        let match = window.allCountries.find(c => c.toLowerCase() === val.toLowerCase());
        if (match) {
            input.value = match;
            window.rowBufferChange('country', match);
        } else {
            input.value = '';
            window.rowBufferChange('country', '');
        }
        list.style.display = "none";
    }, 150); // Pequeno atraso para permitir cliques na lista de autocomplete
}
