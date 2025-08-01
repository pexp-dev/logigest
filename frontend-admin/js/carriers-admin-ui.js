// frontend-admin/js/carriers-admin-ui.js

// --- Referências aos Elementos HTML ---
export const carrierListElement = document.getElementById('carrierList');
export const carrierDetailSection = document.getElementById('carrierDetailSection');
export const carrierForm = document.getElementById('carrierForm');
export const detailTitle = document.getElementById('detailTitle');
export const newCarrierBtn = document.getElementById('newCarrierBtn');
export const closeDetailBtn = document.getElementById('closeDetailBtn');
export const saveCarrierBtn = document.getElementById('saveCarrierBtn');
export const deleteCarrierBtn = document.getElementById('deleteCarrierBtn');
export const formMessage = document.getElementById('formMessage');
export const searchCarrierInput = document.getElementById('searchCarrier');

// Elementos do formulário de transportador
export const carrierNameInput = document.getElementById('carrierName');
export const carrierAddressInput = document.getElementById('carrierAddress');
export const carrierCityInput = document.getElementById('carrierCity');
export const carrierPostalCodeInput = document.getElementById('carrierPostalCode');
export const carrierCountryInput = document.getElementById('carrierCountry');
export const carrierCountryAutocompleteList = document.getElementById('carrierCountryAutocompleteList');
export const carrierPhoneInput = document.getElementById('carrierPhone');
export const carrierEmailInput = document.getElementById('carrierEmail');
export const carrierWebsiteInput = document.getElementById('carrierWebsite');
export const carrierModeInput = document.getElementById('carrierMode');
export const carrierTypeInput = document.getElementById('carrierType');
export const carrierServicesInput = document.getElementById('carrierServices');
export const carrierNotesInput = document.getElementById('carrierNotes');

// Elementos do Logo
export const carrierLogoInput = document.getElementById('carrierLogoInput');
export const carrierLogoPreview = document.getElementById('carrierLogoPreview');
export const removeLogoBtn = document.getElementById('removeLogoBtn');

// Elementos de Contacto Principal
export const contactNameInput = document.getElementById('contactName');
export const contactFunctionInput = document.getElementById('contactFunction');
export const contactEmailInput = document.getElementById('contactEmail');
export const contactPhoneInput = document.getElementById('contactPhone');
export const toggleMainContactBtn = document.getElementById('toggleMainContactBtn');
export const mainContactDetails = document.getElementById('mainContactDetails');

// Elementos de Contactos Adicionais
export const additionalContactsContainer = document.getElementById('additionalContactsContainer');
export const addAdditionalContactBtn = document.getElementById('addAdditionalContactBtn');
export const toggleAdditionalContactBtn = document.getElementById('toggleAdditionalContactBtn');


// --- Funções Utilitárias da UI ---

/**
 * Exibe uma mensagem na UI.
 * @param {string} msg - A mensagem a exibir.
 * @param {string} type - 'success' ou 'error'.
 */
export function displayMessage(msg, type) {
    formMessage.textContent = msg;
    formMessage.className = `message ${type}`;
    setTimeout(() => {
        formMessage.textContent = '';
        formMessage.className = 'message';
    }, 5000);
}

/**
 * Limpa qualquer mensagem exibida na UI.
 */
export function clearMessage() {
    formMessage.textContent = '';
    formMessage.className = 'message';
}

/**
 * Escapa strings para HTML para evitar ataques XSS.
 * @param {string} str - A string a escapar.
 * @returns {string} A string escapada.
 */
function htmlEscape(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
        }
    });
}


// --- Funções de Renderização e Manipulação da UI ---

/**
 * Exibe a lista de transportadores na UI.
 * @param {Array<Object>} carriersToDisplay - A lista de transportadores a exibir.
 * @param {string|null} activeCarrierId - O ID do transportador ativo (para marcar visualmente).
 */
export function renderCarrierList(carriersToDisplay, activeCarrierId = null) {
    carrierListElement.innerHTML = ''; // Limpa a lista atual
    if (carriersToDisplay.length === 0) {
        carrierListElement.innerHTML = '<p>Nenhum transportador encontrado.</p>';
        return;
    }

    carriersToDisplay.forEach(carrier => {
        const carrierItem = document.createElement('div');
        carrierItem.classList.add('carrier-item');
        carrierItem.dataset.id = carrier.id;

        carrierItem.innerHTML = `
            <strong>${htmlEscape(carrier.name || 'Nome Desconhecido')}</strong>
            <small>${htmlEscape(carrier.email || 'N/A')} | ${htmlEscape(carrier.phone || 'N/A')}</small>
        `;
        // O event listener será adicionado na lógica principal, aqui é apenas um placeholder
        carrierItem.onclick = () => { /* Placeholder, a lógica adiciona o listener real */ };
        carrierListElement.appendChild(carrierItem);
    });

    if (activeCarrierId) {
        const activeItem = document.querySelector(`.carrier-item[data-id="${activeCarrierId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
}

/**
 * Abre o formulário de detalhes do transportador e preenche com os dados.
 * @param {Object} carrierData - Os dados completos do transportador a exibir/editar.
 * @param {string|null} editingCarrierId - O ID do transportador em edição.
 * @param {Function} addAdditionalContactFieldCallback - Callback para adicionar campo de contacto adicional.
 * @param {Function} updatePhoneFieldsForCountryCallback - Callback para atualizar campos de telefone.
 */
export function openCarrierFormUI(
    carrierData, editingCarrierId,
    addAdditionalContactFieldCallback, updatePhoneFieldsForCountryCallback
) {
    carrierForm.reset();
    formMessage.textContent = '';
    detailTitle.textContent = editingCarrierId ? 'Editar Transportador' : 'Adicionar Novo Transportador';
    deleteCarrierBtn.classList.toggle('hidden', !editingCarrierId);

    // Limpa e oculta a pré-visualização do logo
    carrierLogoPreview.src = '';
    carrierLogoPreview.classList.add('hidden');
    removeLogoBtn.classList.add('hidden');

    // Limpa contactos adicionais
    additionalContactsContainer.innerHTML = '';

    // Esconde a lista de autocomplete ao abrir o formulário
    carrierCountryAutocompleteList.style.display = 'none';

    // Preenche o formulário com os dados do transportador
    document.getElementById('carrierId').value = carrierData.id || '';
    carrierNameInput.value = carrierData.name || '';
    carrierWebsiteInput.value = carrierData.website || '';
    carrierAddressInput.value = carrierData.address || '';
    carrierCityInput.value = carrierData.city || '';
    carrierPostalCodeInput.value = carrierData.postalCode || '';
    carrierCountryInput.value = carrierData.country || '';
    carrierPhoneInput.value = carrierData.phone || '';
    carrierEmailInput.value = carrierData.email || '';

    carrierServicesInput.value = Array.isArray(carrierData.services) ? carrierData.services.join(', ') : '';
    carrierNotesInput.value = carrierData.notes || '';

    carrierModeInput.value = Array.isArray(carrierData.mode) ? carrierData.mode.join(', ') : '';
    carrierTypeInput.value = Array.isArray(carrierData.type) ? carrierData.type.join(', ') : '';

    // Preenche dados do Contacto Principal
    contactNameInput.value = carrierData.contact?.name || '';
    contactFunctionInput.value = carrierData.contact?.function || '';
    contactEmailInput.value = carrierData.contact?.email || '';
    contactPhoneInput.value = carrierData.contact?.phone || '';

    // Exibe o logo se existir
    if (carrierData.logo) {
        carrierLogoPreview.src = carrierData.logo;
        carrierLogoPreview.classList.remove('hidden');
        removeLogoBtn.classList.remove('hidden');
    }

    // Renderiza contactos adicionais
    if (Array.isArray(carrierData.additionalContacts) && carrierData.additionalContacts.length > 0) {
        carrierData.additionalContacts.forEach(contact => addAdditionalContactFieldCallback(contact));
        additionalContactsContainer.classList.remove('hidden');
        if (toggleAdditionalContactBtn) toggleAdditionalContactBtn.textContent = '-';
    } else {
        additionalContactsContainer.classList.add('hidden');
        if (toggleAdditionalContactBtn) toggleAdditionalContactBtn.textContent = '+';
    }

    // Se estiver a editar e houver dados de contacto principal, expande a secção
    if (carrierData.contact?.name || carrierData.contact?.function || carrierData.contact?.email || carrierData.contact?.phone) {
        mainContactDetails.classList.remove('hidden');
        toggleMainContactBtn.textContent = '-';
    } else {
        mainContactDetails.classList.add('hidden');
        toggleMainContactBtn.textContent = '+';
    }

    // Aplica a regex e indicativo ao carregar
    updatePhoneFieldsForCountryCallback();

    carrierDetailSection.classList.remove('hidden');
    document.querySelectorAll('.carrier-item.active').forEach(item => item.classList.remove('active'));
    if (editingCarrierId) {
        const activeItem = document.querySelector(`.carrier-item[data-id="${editingCarrierId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
}

/**
 * Fecha o formulário de detalhes do transportador.
 */
export function closeCarrierFormUI() {
    carrierDetailSection.classList.add('hidden');
    document.querySelectorAll('.carrier-item.active').forEach(item => item.classList.remove('active'));
    formMessage.textContent = '';
    carrierLogoPreview.src = '';
    carrierLogoPreview.classList.add('hidden');
    removeLogoBtn.classList.add('hidden');
    additionalContactsContainer.innerHTML = '';
    mainContactDetails.classList.add('hidden');
    toggleMainContactBtn.textContent = '+';
    additionalContactsContainer.classList.add('hidden');
    if (toggleAdditionalContactBtn) toggleAdditionalContactBtn.textContent = '+';

    // Esconde a lista de autocomplete ao fechar o formulário
    carrierCountryAutocompleteList.style.display = 'none';
}

/**
 * Adiciona um novo conjunto de campos para um contacto adicional na UI.
 * @param {object} [contact={}] - Dados do contacto para pré-preencher os campos.
 * @param {Function} updatePhoneFieldsForCountryCallback - Callback para atualizar campos de telefone.
 * @param {Function} removeAdditionalContactCallback - Callback para remover o contacto.
 */
export function addAdditionalContactFieldUI(contact = {}, updatePhoneFieldsForCountryCallback, removeAdditionalContactCallback) {
    const contactDiv = document.createElement('div');
    contactDiv.classList.add('additional-contact-item');
    contactDiv.innerHTML = `
        <div class="contact-details-grid-wrapper">
            <div class="form-group">
                <label>Nome:</label>
                <input type="text" class="additional-contact-name" value="${htmlEscape(contact.name || '')}">
            </div>
            <div class="form-group">
                <label>Função:</label>
                <input type="text" class="additional-contact-function" value="${htmlEscape(contact.function || '')}">
            </div>
            <div class="form-group">
                <label>Email:</label>
                <input type="email" class="additional-contact-email" value="${htmlEscape(contact.email || '')}">
            </div>
            <div class="form-group">
                <label>Telefone:</label>
                <input type="tel" class="additional-contact-phone" value="${htmlEscape(contact.phone || '')}" placeholder="+XXX YYY ZZZ ZZZ">
            </div>
        </div>
        <button type="button" class="remove-additional-contact-btn delete-btn">Remover</button>
    `;
    additionalContactsContainer.appendChild(contactDiv);

    // Adiciona listener para o botão de remover deste contacto específico
    contactDiv.querySelector('.remove-additional-contact-btn').addEventListener('click', () => {
        removeAdditionalContactCallback(contactDiv); // Chama o callback na lógica
    });

    // Aplica a regex ao novo campo de telefone, se um país já estiver selecionado
    updatePhoneFieldsForCountryCallback();

    // Expande a secção de contactos adicionais quando um novo é adicionado
    if (additionalContactsContainer.classList.contains('hidden')) {
        additionalContactsContainer.classList.remove('hidden');
        if (toggleAdditionalContactBtn) toggleAdditionalContactBtn.textContent = '-';
    }
}

/**
 * Alterna a visibilidade dos detalhes do contacto principal na UI.
 */
export function toggleMainContactDetailsUI() {
    mainContactDetails.classList.toggle('hidden');
    const button = toggleMainContactBtn;
    if (mainContactDetails.classList.contains('hidden')) {
        button.textContent = '+';
    } else {
        button.textContent = '-';
    }
}

/**
 * Alterna a visibilidade dos detalhes dos contactos adicionais na UI.
 */
export function toggleAdditionalContactDetailsUI() {
    additionalContactsContainer.classList.toggle('hidden');
    const button = toggleAdditionalContactBtn;
    if (additionalContactsContainer.classList.contains('hidden')) {
        button.textContent = '+';
    } else {
        button.textContent = '-';
    }
}

/**
 * Aplica o indicativo de telefone e a regex a um campo de input de telefone.
 * @param {HTMLInputElement} inputElement - O elemento input do telefone.
 * @param {string} currentPhoneValue - O valor atual do telefone.
 * @param {string} code - O indicativo de telefone a aplicar.
 * @param {string} regex - A regex de validação a aplicar.
 */
export function applyPhoneFormattingUI(inputElement, currentPhoneValue, code, regex) {
    if (!inputElement) return;

    let newValue = currentPhoneValue || '';
    // Se o valor atual não começar com o indicativo, adicione-o
    if (code && !newValue.startsWith(code)) {
        // Remove qualquer indicativo anterior se houver (ex: +123, +44, etc.)
        newValue = newValue.replace(/^\+\d{1,4}\s?/, '').trim();
        newValue = code + (newValue ? ' ' + newValue : '');
    }
    inputElement.value = newValue;
    inputElement.setAttribute('pattern', regex);
    inputElement.title = `Formato esperado: ${regex}`; // Dica para o utilizador

    // Adiciona um event listener para limpar espaços ao digitar/colar
    // Verifica se o listener já foi adicionado para evitar duplicados
    if (!inputElement.dataset.hasSpaceCleaner) {
        inputElement.addEventListener('input', function() {
            this.value = this.value.replace(/\s/g, ''); // Remove todos os espaços
        });
        inputElement.dataset.hasSpaceCleaner = 'true'; // Marca que o listener foi adicionado
    }
}
