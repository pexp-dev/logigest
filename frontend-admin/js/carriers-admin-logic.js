// frontend-admin/js/carriers-admin-logic.js

// Importa funções da camada de acesso a dados
import { loadCarriers, loadCountries } from './data-access/dataLoader.js';
import { saveCarriersData } from './data-access/dataSaver.js';

// Importa elementos e funções de UI do novo módulo
import {
    carrierListElement, carrierDetailSection, carrierForm, detailTitle,
    newCarrierBtn, closeDetailBtn, saveCarrierBtn, deleteCarrierBtn, formMessage,
    searchCarrierInput, carrierCountryInput, carrierCountryAutocompleteList,
    carrierNameInput, carrierAddressInput, carrierCityInput, carrierPostalCodeInput,
    carrierPhoneInput, carrierEmailInput, carrierWebsiteInput, carrierModeInput,
    carrierTypeInput, carrierServicesInput, carrierNotesInput,
    contactNameInput, contactFunctionInput, contactEmailInput, contactPhoneInput,
    carrierLogoInput, carrierLogoPreview, removeLogoBtn,
    additionalContactsContainer, addAdditionalContactBtn, toggleAdditionalContactBtn,
    toggleMainContactBtn, mainContactDetails,
    renderCarrierList, openCarrierFormUI, closeCarrierFormUI,
    addAdditionalContactFieldUI, toggleMainContactDetailsUI, toggleAdditionalContactDetailsUI,
    applyPhoneFormattingUI, displayMessage, clearMessage
} from './carriers-admin-ui.js';


// Variáveis de estado globais
let currentCarriers = []; // Array que mantém o estado atual dos transportadores
let editingCarrierId = null; // ID do transportador atualmente em edição
// allCountries agora guarda objetos completos de país, com nome, indicativo_telefone, regex_telefone
let allCountries = []; 
let activeCountryAutocompleteItem = -1; // Para navegação com teclado no autocomplete


// --- Funções de Inicialização ---

/**
 * Carrega a lista de países do backend e filtra/valida os dados.
 */
async function initializeCountries() {
    try {
        const countriesData = await loadCountries(); // loadCountries retorna array de objetos {nome, iso, ...}
        // Garante que allCountries é um array e que cada item é um objeto com a propriedade 'nome'
        // Filtra para remover quaisquer entradas nulas/indefinidas ou objetos sem a propriedade 'nome'
        allCountries = Array.isArray(countriesData) 
            ? countriesData.filter(countryObj => countryObj && typeof countryObj.nome === 'string') 
            : []; 
        console.log(`Países carregados: ${allCountries.length} países.`); // NOVO LOG AQUI
    } catch (error) {
        console.error('Erro ao carregar lista de países:', error);
        allCountries = []; // Define como array vazio em caso de erro
        displayMessage('Erro ao carregar lista de países.', 'error');
    }
}

/**
 * Inicializa a aplicação: carrega transportadores e configura listeners.
 */
async function init() {
    console.log('carriers-admin-logic.js: init function called');
    await initializeCountries();
    await refreshCarrierList();

    // Event Listeners (ligados aqui na lógica)
    newCarrierBtn.addEventListener('click', () => openCarrierForm());
    closeDetailBtn.addEventListener('click', () => closeCarrierForm());
    carrierForm.addEventListener('submit', handleFormSubmit);
    searchCarrierInput.addEventListener('input', filterCarrierList);
    deleteCarrierBtn.addEventListener('click', handleDeleteCarrier);

    // Event Listeners para o Logo
    carrierLogoInput.addEventListener('change', handleLogoUpload);
    removeLogoBtn.addEventListener('click', removeLogo);

    // Event Listener para Contactos Adicionais
    addAdditionalContactBtn.addEventListener('click', () => addAdditionalContactField());
    if (toggleAdditionalContactBtn) {
        toggleAdditionalContactBtn.addEventListener('click', toggleAdditionalContactDetailsUI);
    }

    // Event Listener para o campo do país para preencher o indicativo de telefone e aplicar regex
    // Este listener permanece no input, mas a função é chamada via lógica
    carrierCountryInput.addEventListener('input', updatePhoneFieldsForCountry);

    // Event Listener para o toggle do Contacto Principal
    toggleMainContactBtn.addEventListener('click', toggleMainContactDetailsUI);

    // Configura o autocomplete para o campo do país
    setupCarrierCountryAutocomplete();

    // EXPOR FUNÇÕES GLOBAIS PARA O HTML (oninput, onfocus, onblur, etc.)
    // Estas funções são chamadas diretamente pelos atributos no HTML, por isso precisam ser globais.
    window.handleCarrierCountryInput = handleCarrierCountryInput;
    window.selectCarrierCountryFromAutocomplete = selectCarrierCountryFromAutocomplete;
    window.handleCarrierCountryBlur = handleCarrierCountryBlur;
}


// --- Funções de Gestão de Dados e Lógica ---

/**
 * Recarrega a lista de transportadores do backend e renderiza.
 */
async function refreshCarrierList() {
    try {
        currentCarriers = await loadCarriers();
        renderCarrierList(currentCarriers, editingCarrierId); // Passa editingCarrierId para a UI
        // Adiciona event listeners aos itens da lista após renderizar
        document.querySelectorAll('.carrier-item').forEach(item => {
            item.addEventListener('click', () => openCarrierForm(item.dataset.id));
        });
    } catch (error) {
        console.error('Erro ao carregar a lista de transportadores:', error);
        carrierListElement.innerHTML = '<p class="error">Erro ao carregar transportadores.</p>';
    }
}

/**
 * Abre o formulário para criar um novo transportador ou editar um existente.
 * Esta função orquestra o carregamento de dados e a atualização da UI.
 * @param {string|null} carrierId - O ID do transportador a editar, ou null para um novo.
 */
async function openCarrierForm(carrierId = null) {
    editingCarrierId = carrierId;
    let carrierData = {};

    if (carrierId) {
        const carrier = currentCarriers.find(c => c.id === carrierId);
        if (carrier) {
            carrierData = JSON.parse(JSON.stringify(carrier)); // Copia para evitar modificações diretas
        } else {
            console.error(`Transportador com ID ${carrierId} não encontrado.`);
            displayMessage('Transportador não encontrado.', 'error');
            closeCarrierForm();
            return;
        }
    } else {
        // Inicializa um novo transportador vazio
        carrierData = {
            id: generateUniqueId(),
            name: '',
            address: '',
            city: '',
            postalCode: '',
            country: '',
            phone: '',
            email: '',
            website: '',
            mode: [],
            type: [],
            services: [],
            notes: '',
            logo: null,
            contact: { name: '', function: '', email: '', phone: '' },
            additionalContacts: []
        };
    }

    // Chama a função de UI para renderizar o formulário
    openCarrierFormUI(
        carrierData, editingCarrierId,
        addAdditionalContactField, updatePhoneFieldsForCountry // Passa callbacks para a UI
    );
}

/**
 * Fecha o formulário de transportador e volta para a lista.
 */
function closeCarrierForm() {
    closeCarrierFormUI(); // Chama a função de UI para fechar
    editingCarrierId = null;
    clearMessage();
}

/**
 * Lida com o upload do logo.
 * Converte a imagem para Base64 e exibe a pré-visualização.
 */
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            carrierLogoPreview.src = e.target.result;
            carrierLogoPreview.classList.remove('hidden');
            removeLogoBtn.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        carrierLogoPreview.src = '';
        carrierLogoPreview.classList.add('hidden');
        removeLogoBtn.classList.add('hidden');
    }
}

/**
 * Remove o logo do formulário e da pré-visualização.
 */
function removeLogo() {
    carrierLogoInput.value = '';
    carrierLogoPreview.src = '';
    carrierLogoPreview.classList.add('hidden');
    removeLogoBtn.classList.add('hidden');
}


/**
 * Lida com a submissão do formulário (guardar transportador).
 * @param {Event} event - O evento de submissão.
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    const carrierId = document.getElementById('carrierId').value;
    const isNew = !currentCarriers.some(c => c.id === carrierId);

    // Valida o país selecionado antes de salvar
    const countryValue = carrierCountryInput.value.trim();
    const selectedCountryObject = allCountries.find(countryObj => countryObj && countryObj.nome.toLowerCase() === countryValue.toLowerCase());
    if (!selectedCountryObject) {
        displayMessage('Por favor, selecione um país válido da lista de sugestões.', 'error');
        return;
    }

    // Recolhe dados do contacto principal
    const mainContact = {
        name: contactNameInput.value.trim(),
        function: contactFunctionInput.value.trim(),
        email: contactEmailInput.value.trim(),
        phone: contactPhoneInput.value.trim() // O telefone já inclui o indicativo
    };

    // Recolhe dados dos contactos adicionais
    const additionalContacts = [];
    document.querySelectorAll('.additional-contact-item').forEach(item => {
        const gridWrapper = item.querySelector('.contact-details-grid-wrapper');
        const contact = {
            name: gridWrapper.querySelector('.additional-contact-name').value.trim(),
            function: gridWrapper.querySelector('.additional-contact-function').value.trim(),
            email: gridWrapper.querySelector('.additional-contact-email').value.trim(),
            phone: gridWrapper.querySelector('.additional-contact-phone').value.trim() // O telefone já inclui o indicativo
        };
        // Só adiciona se tiver pelo menos o nome preenchido
        if (contact.name) {
            additionalContacts.push(contact);
        }
    });

    const carrierData = {
        id: carrierId,
        name: carrierNameInput.value.trim(),
        address: carrierAddressInput.value.trim(),
        city: carrierCityInput.value.trim(),
        postalCode: carrierPostalCodeInput.value.trim(),
        country: selectedCountryObject.nome, // Salva o nome validado do país
        phone: carrierPhoneInput.value.trim(), // Telefone completo do transportador
        email: carrierEmailInput.value.trim(),
        website: carrierWebsiteInput.value.trim(),
        // Processa os campos de Modo, Tipo e Serviços como arrays de strings
        mode: carrierModeInput.value.split(',').map(s => s.trim()).filter(s => s),
        type: carrierTypeInput.value.split(',').map(s => s.trim()).filter(s => s),
        services: carrierServicesInput.value.split(',').map(s => s.trim()).filter(s => s),
        notes: carrierNotesInput.value.trim(),
        logo: carrierLogoPreview.src && !carrierLogoPreview.classList.contains('hidden') ? carrierLogoPreview.src : null,
        contact: mainContact,
        additionalContacts: additionalContacts
    };

    if (!carrierData.name) {
        displayMessage('O nome do transportador é obrigatório!', 'error');
        return;
    }

    try {
        if (isNew) {
            currentCarriers.push(carrierData);
        } else {
            const index = currentCarriers.findIndex(c => c.id === carrierId);
            if (index !== -1) {
                currentCarriers[index] = carrierData;
            }
        }
        await saveCarriersData(currentCarriers);
        displayMessage('Transportador guardado com sucesso!', 'success');
        await refreshCarrierList();
        openCarrierForm(carrierId); // Reabre o formulário para manter o contexto
    } catch (error) {
        console.error('Erro ao guardar transportador:', error);
        displayMessage('Erro ao guardar transportador.', 'error');
    }
}

/**
 * Lida com a eliminação de um transportador.
 */
async function handleDeleteCarrier() {
    if (!editingCarrierId) return;

    // Usar uma modal personalizada em vez de `confirm()`
    // Por simplicidade, para este exemplo, vamos manter o `confirm`
    // mas em uma aplicação real, você usaria uma UI modal.
    if (confirm('Tem certeza que deseja eliminar este transportador? Esta ação é irreversível.')) {
        currentCarriers = currentCarriers.filter(c => c.id !== editingCarrierId);
        try {
            await saveCarriersData(currentCarriers);
            displayMessage('Transportador eliminado com sucesso!', 'success');
            closeCarrierForm();
            await refreshCarrierList();
        } catch (error) {
            console.error('Erro ao eliminar transportador:', error);
            displayMessage('Erro ao eliminar transportador.', 'error');
        }
    }
}

/**
 * Filtra a lista de transportadores com base no input de pesquisa.
 */
function filterCarrierList() {
    const searchTerm = searchCarrierInput.value.toLowerCase();
    const filteredCarriers = currentCarriers.filter(carrier =>
        (carrier.name && carrier.name.toLowerCase().includes(searchTerm)) ||
        (carrier.contact?.name && carrier.contact.name.toLowerCase().includes(searchTerm)) ||
        (carrier.email && carrier.email.toLowerCase().includes(searchTerm)) ||
        (carrier.phone && carrier.phone.toLowerCase().includes(searchTerm)) ||
        (Array.isArray(carrier.mode) && carrier.mode.some(m => m.toLowerCase().includes(searchTerm))) ||
        (Array.isArray(carrier.type) && carrier.type.some(t => t.toLowerCase().includes(searchTerm))) ||
        (Array.isArray(carrier.services) && carrier.services.some(service => service.toLowerCase().includes(searchTerm))) ||
        (carrier.country && carrier.country.toLowerCase().includes(searchTerm)) ||
        (Array.isArray(carrier.additionalContacts) && carrier.additionalContacts.some(contact =>
            (contact.name && contact.name.toLowerCase().includes(searchTerm)) ||
            (contact.email && contact.email.toLowerCase().includes(searchTerm)) ||
            (contact.phone && contact.phone.toLowerCase().includes(searchTerm))
        ))
    );
    renderCarrierList(filteredCarriers, editingCarrierId);
}


// --- Funções de Gestão de Contactos Adicionais (Lógica) ---

/**
 * Adiciona um novo conjunto de campos para um contacto adicional.
 * Esta função é o callback passado para a UI.
 * @param {object} [contact={}] - Dados do contacto para pré-preencher os campos.
 */
function addAdditionalContactField(contact = {}) {
    addAdditionalContactFieldUI(contact, updatePhoneFieldsForCountry, removeAdditionalContact);
}

/**
 * Remove um contacto adicional da UI.
 * Esta função é o callback passado para a UI.
 * @param {HTMLElement} contactDiv - O elemento div do contacto a remover.
 */
function removeAdditionalContact(contactDiv) {
    contactDiv.remove();
    // Se todos os contactos adicionais forem removidos, recolhe a secção
    if (additionalContactsContainer.children.length === 0) {
        additionalContactsContainer.classList.add('hidden');
        if (toggleAdditionalContactBtn) toggleAdditionalContactBtn.textContent = '+';
    }
}


/**
 * Preenche o campo de telefone com o indicativo e aplica a regex,
 * para o transportador, contacto principal e contactos adicionais.
 */
function updatePhoneFieldsForCountry() {
    const selectedCountryName = carrierCountryInput.value;
    // allCountries agora contém objetos completos, então a busca é direta
    // Adicionado um null check para countryObj para evitar erro se for undefined
    const selectedCountry = allCountries.find(countryObj => countryObj && countryObj.nome === selectedCountryName);

    let phoneCode = '';
    let phoneRegex = '.*'; // Regex padrão que aceita qualquer coisa se não houver correspondência

    if (selectedCountry) {
        phoneCode = selectedCountry.indicativo_telefone || '';
        phoneRegex = selectedCountry.regex_telefone || '.*';
    }

    // Aplica ao telefone do transportador
    applyPhoneFormattingUI(carrierPhoneInput, carrierPhoneInput.value, phoneCode, phoneRegex);

    // Aplica ao telefone do contacto principal
    applyPhoneFormattingUI(contactPhoneInput, contactPhoneInput.value, phoneCode, phoneRegex);

    // Aplica a todos os telefones de contactos adicionais
    document.querySelectorAll('.additional-contact-phone').forEach(input => {
        applyPhoneFormattingUI(input, input.value, phoneCode, phoneRegex);
    });
}


// --- Funções de Autocomplete para o Campo País (Lógica) ---
// Estas funções são expostas globalmente via `window` para serem chamadas pelo HTML.

/**
 * Lida com a entrada de texto no campo de autocomplete de país.
 * @param {Event} e - O evento de input.
 */
function handleCarrierCountryInput(e) {
    const input = e.target;
    const list = carrierCountryAutocompleteList;
    let val = input.value.trim().toLowerCase();
    
    let filtered = [];
    if (allCountries && allCountries.length > 0) {
        // Garante que countryObj e countryObj.nome existem antes de usar toLowerCase
        filtered = allCountries.filter(countryObj => countryObj && countryObj.nome && countryObj.nome.toLowerCase().startsWith(val));
    }

    list.innerHTML = ''; // Limpa a lista
    activeCountryAutocompleteItem = -1; // Reseta o item ativo

    if (filtered.length > 0) {
        filtered.forEach((countryObj, index) => {
            // Garante que countryObj e countryObj.nome existem antes de usar
            if (countryObj && countryObj.nome) { 
                const div = document.createElement('div');
                div.classList.add('autocomplete-item');
                div.textContent = countryObj.nome;
                div.dataset.index = index; // Armazena o índice para navegação com teclado
                // Chama a função globalmente exposta
                div.onmousedown = () => window.selectCarrierCountryFromAutocomplete(countryObj.nome); 
                list.appendChild(div);
            }
        });
        list.style.display = "block";
    } else {
        list.style.display = "none";
    }
}

/**
 * Seleciona um país da lista de autocomplete e atualiza o campo.
 * @param {string} countryName - O nome do país selecionado.
 */
function selectCarrierCountryFromAutocomplete(countryName) {
    carrierCountryInput.value = countryName;
    carrierCountryAutocompleteList.style.display = "none";
    // Dispara o evento 'input' manualmente para que updatePhoneFieldsForCountry seja chamado
    carrierCountryInput.dispatchEvent(new Event('input'));
}

/**
 * Lida com o evento blur (perda de foco) no campo de autocomplete de país.
 * @param {Event} e - O evento blur.
 */
function handleCarrierCountryBlur(e) {
    // Adiciona um pequeno atraso para permitir que o clique no item da lista seja processado
    setTimeout(() => {
        let val = carrierCountryInput.value.trim();
        let match = null;
        if (allCountries && allCountries.length > 0) {
            // Garante que countryObj e countryObj.nome existem antes de usar toLowerCase
            match = allCountries.find(countryObj => countryObj && countryObj.nome && countryObj.nome.toLowerCase() === val.toLowerCase());
        }

        if (match) {
            carrierCountryInput.value = match.nome; // Garante que o nome exato é usado
        } else {
            // Se o valor não corresponder a nenhum país, limpa o campo
            carrierCountryInput.value = '';
        }
        carrierCountryAutocompleteList.style.display = "none"; // Esconde a lista
        // Dispara o evento 'input' manualmente para que updatePhoneFieldsForCountry seja chamado
        carrierCountryInput.dispatchEvent(new Event('input'));
    }, 150); // Pequeno atraso
}

/**
 * Configura o autocomplete para o campo do país (navegação com teclado).
 */
function setupCarrierCountryAutocomplete() {
    carrierCountryInput.addEventListener('keydown', function(e) {
        const items = carrierCountryAutocompleteList.querySelectorAll('.autocomplete-item');
        if (!items.length) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            activeCountryAutocompleteItem = Math.min(activeCountryAutocompleteItem + 1, items.length - 1);
            updateActiveCountryAutocompleteItem();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            activeCountryAutocompleteItem = Math.max(activeCountryAutocompleteItem - 1, 0);
            updateActiveCountryAutocompleteItem();
        } else if (e.key === "Enter" && activeCountryAutocompleteItem >= 0) {
            e.preventDefault();
            // Simula um clique no item ativo
            items[activeCountryAutocompleteItem].click();
        }
    });

    function updateActiveCountryAutocompleteItem() {
        const items = carrierCountryAutocompleteList.querySelectorAll('.autocomplete-item');
        items.forEach((item, i) => {
            if (i === activeCountryAutocompleteItem) item.classList.add('active');
            else item.classList.remove('active');
        });
        if (activeCountryAutocompleteItem >= 0 && items[activeCountryAutocompleteItem]) {
            items[activeCountryAutocompleteItem].scrollIntoView({ block: "nearest" });
        }
    }
}


// --- Funções Utilitárias ---

/**
 * Gera um ID único simples (para uso temporário na fase local).
 * Em um ambiente de produção ou com Odoo, o ID seria gerado pelo backend/DB.
 */
function generateUniqueId() {
    return 'carrier_' + Date.now() + Math.random().toString(16).substr(2, 5);
}


// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', init);
