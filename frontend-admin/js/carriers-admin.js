// frontend-admin/js/carriers-admin.js

// Importa funções da camada de acesso a dados
import { loadCarriers, loadCountries } from './data-access/dataLoader.js';
import { saveCarriersData } from './data-access/dataSaver.js';

const carrierListElement = document.getElementById('carrierList');
const carrierDetailSection = document.getElementById('carrierDetailSection');
const carrierForm = document.getElementById('carrierForm');
const detailTitle = document.getElementById('detailTitle');
const newCarrierBtn = document.getElementById('newCarrierBtn');
const closeDetailBtn = document.getElementById('closeDetailBtn');
const saveCarrierBtn = document.getElementById('saveCarrierBtn');
const deleteCarrierBtn = document.getElementById('deleteCarrierBtn');
const formMessage = document.getElementById('formMessage');
const searchCarrierInput = document.getElementById('searchCarrier');
// Removida a referência a countryDatalist, pois não será mais usada para o autocomplete principal
const carrierCountryInput = document.getElementById('carrierCountry'); // Referência para o input do país
const carrierCountryAutocompleteList = document.getElementById('carrierCountryAutocompleteList'); // NOVO: Referência para a lista de autocomplete do país

// Elementos para o Transportador
const carrierPhoneInput = document.getElementById('carrierPhone');
const carrierEmailInput = document.getElementById('carrierEmail');
const carrierWebsiteInput = document.getElementById('carrierWebsite');
const carrierServicesInput = document.getElementById('carrierServices'); // Campo existente para Serviços

// Elementos para Modo e Tipo
const carrierModeInput = document.getElementById('carrierMode');
const carrierTypeInput = document.getElementById('carrierType');

// Elementos para o Contacto Principal
const contactNameInput = document.getElementById('contactName');
const contactFunctionInput = document.getElementById('contactFunction');
const contactEmailInput = document.getElementById('contactEmail');
const contactPhoneInput = document.getElementById('contactPhone');

// Elementos para o Logo
const carrierLogoInput = document.getElementById('carrierLogoInput');
const carrierLogoPreview = document.getElementById('carrierLogoPreview');
const removeLogoBtn = document.getElementById('removeLogoBtn');

// Elementos para Contactos Adicionais
const additionalContactsContainer = document.getElementById('additionalContactsContainer');
const addAdditionalContactBtn = document.getElementById('addAdditionalContactBtn');
const toggleAdditionalContactBtn = document.getElementById('toggleAdditionalContactBtn');

// Novos elementos para o toggle do Contacto Principal
const toggleMainContactBtn = document.getElementById('toggleMainContactBtn');
const mainContactDetails = document.getElementById('mainContactDetails');


let currentCarriers = []; // Array que mantém o estado atual dos transportadores
let editingCarrierId = null; // ID do transportador atualmente em edição
let allCountries = []; // Lista de países para o autocomplete (agora guarda objetos completos)
let activeCountryAutocompleteItem = -1; // Para navegação com teclado no autocomplete

// --- Funções de Inicialização ---

/**
 * Carrega a lista de países.
 */
async function initializeCountries() {
    try {
        const countriesData = await loadCountries();
        // CORRIGIDO: Armazena os objetos completos dos países, não apenas os nomes
        allCountries = countriesData; 
        // Não populamos mais o datalist, pois usaremos uma lista de autocomplete personalizada
    } catch (error) {
        console.error('Erro ao carregar lista de países:', error);
        // Pode exibir uma mensagem para o utilizador aqui se necessário
    }
}


/**
 * Inicializa a aplicação: carrega transportadores e configura listeners.
 */
async function init() {
    await initializeCountries();
    await refreshCarrierList();

    // Event Listeners
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
        toggleAdditionalContactBtn.addEventListener('click', toggleAdditionalContactDetails);
    }

    // Event Listener para o campo do país para preencher o indicativo de telefone e aplicar regex
    // Este listener permanece, pois updatePhoneFieldsForCountry é importante para o formato do telefone
    carrierCountryInput.addEventListener('input', updatePhoneFieldsForCountry);

    // Event Listener para o toggle do Contacto Principal
    toggleMainContactBtn.addEventListener('click', toggleMainContactDetails);

    // NOVO: Configura o autocomplete para o campo do país
    setupCarrierCountryAutocomplete();

    // NOVO: Expõe as funções de autocomplete globalmente para uso no HTML
    window.handleCarrierCountryInput = handleCarrierCountryInput;
    window.selectCarrierCountryFromAutocomplete = selectCarrierCountryFromAutocomplete;
    window.handleCarrierCountryBlur = handleCarrierCountryBlur;
}

// --- Funções de Gestão de UI ---

/**
 * Exibe a lista de transportadores na UI.
 * @param {Array} carriersToDisplay - A lista de transportadores a exibir.
 */
function renderCarrierList(carriersToDisplay) {
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
            <strong>${carrier.name || 'Nome Desconhecido'}</strong>
            <small>${carrier.email || 'N/A'} | ${carrier.phone || 'N/A'}</small>
        `;
        carrierItem.addEventListener('click', () => openCarrierForm(carrier.id));
        carrierListElement.appendChild(carrierItem);
    });

    if (editingCarrierId) {
        const activeItem = document.querySelector(`.carrier-item[data-id="${editingCarrierId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
}

/**
 * Abre o formulário para criar um novo transportador ou editar um existente.
 * @param {string|null} carrierId - O ID do transportador a editar, ou null para um novo.
 */
async function openCarrierForm(carrierId = null) {
    console.log('Botão "Adicionar Novo Transportador" clicado ou transportador selecionado. Abrindo formulário...');
    carrierForm.reset();
    formMessage.textContent = '';
    editingCarrierId = carrierId;

    // Limpa e oculta a pré-visualização do logo
    carrierLogoPreview.src = '';
    carrierLogoPreview.classList.add('hidden');
    removeLogoBtn.classList.add('hidden');

    // Limpa contactos adicionais
    additionalContactsContainer.innerHTML = '';

    // NOVO: Esconde a lista de autocomplete ao abrir o formulário
    carrierCountryAutocompleteList.style.display = 'none';
    activeCountryAutocompleteItem = -1;


    if (carrierId) {
        detailTitle.textContent = 'Editar Transportador';
        deleteCarrierBtn.classList.remove('hidden');
        const carrier = currentCarriers.find(c => c.id === carrierId);
        if (carrier) {
            // Preenche o formulário com os dados do transportador
            document.getElementById('carrierId').value = carrier.id;
            document.getElementById('carrierName').value = carrier.name || '';
            carrierWebsiteInput.value = carrier.website || '';
            document.getElementById('carrierAddress').value = carrier.address || '';
            document.getElementById('carrierCity').value = carrier.city || '';
            document.getElementById('carrierPostalCode').value = carrier.postalCode || '';
            carrierCountryInput.value = carrier.country || '';
            carrierPhoneInput.value = carrier.phone || ''; // Telefone completo do transportador
            carrierEmailInput.value = carrier.email || ''; // Email do transportador

            carrierServicesInput.value = Array.isArray(carrier.services) ? carrier.services.join(', ') : '';
            document.getElementById('carrierNotes').value = carrier.notes || '';

            // Preenche Modo e Tipo
            carrierModeInput.value = Array.isArray(carrier.mode) ? carrier.mode.join(', ') : '';
            carrierTypeInput.value = Array.isArray(carrier.type) ? carrier.type.join(', ') : '';

            // Preenche dados do Contacto Principal
            contactNameInput.value = carrier.contact?.name || '';
            contactFunctionInput.value = carrier.contact?.function || '';
            contactEmailInput.value = carrier.contact?.email || '';
            contactPhoneInput.value = carrier.contact?.phone || ''; // Telefone completo do contacto principal

            // Exibe o logo se existir
            if (carrier.logo) {
                carrierLogoPreview.src = carrier.logo;
                carrierLogoPreview.classList.remove('hidden');
                removeLogoBtn.classList.remove('hidden');
            }

            // Renderiza contactos adicionais
            if (Array.isArray(carrier.additionalContacts) && carrier.additionalContacts.length > 0) {
                carrier.additionalContacts.forEach(contact => addAdditionalContactField(contact));
                additionalContactsContainer.classList.remove('hidden'); // Expande a secção se houver contactos
                if (toggleAdditionalContactBtn) toggleAdditionalContactBtn.textContent = '-'; // Atualiza o texto do botão
            } else {
                additionalContactsContainer.classList.add('hidden'); // Garante que está escondido se não houver contactos
                if (toggleAdditionalContactBtn) toggleAdditionalContactBtn.textContent = '+'; // Atualiza o texto do botão
            }

            // Se estiver a editar e houver dados de contacto principal, expande a secção
            if (carrier.contact?.name || carrier.contact?.function || carrier.contact?.email || carrier.contact?.phone) {
                mainContactDetails.classList.remove('hidden');
                toggleMainContactBtn.textContent = '-';
            } else {
                mainContactDetails.classList.add('hidden');
                toggleMainContactBtn.textContent = '+';
            }

            // Aplica a regex e indicativo ao carregar
            updatePhoneFieldsForCountry();

        } else {
            console.error(`Transportador com ID ${carrierId} não encontrado.`);
            closeCarrierForm();
            return;
        }
    } else {
        detailTitle.textContent = 'Adicionar Novo Transportador';
        deleteCarrierBtn.classList.add('hidden');
        document.getElementById('carrierId').value = generateUniqueId();
        // Para um novo transportador, o contacto principal começa recolhido
        mainContactDetails.classList.add('hidden');
        toggleMainContactBtn.textContent = '+';
        // Contactos adicionais começam minimizados para um novo transportador
        additionalContactsContainer.classList.add('hidden');
        if (toggleAdditionalContactBtn) toggleAdditionalContactBtn.textContent = '+';
        // Limpa e aplica regex padrão para novo transportador
        updatePhoneFieldsForCountry();
    }

    carrierDetailSection.classList.remove('hidden');
    document.querySelectorAll('.carrier-item.active').forEach(item => item.classList.remove('active'));
    if (carrierId) {
        const activeItem = document.querySelector(`.carrier-item[data-id="${carrierId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }
}

/**
 * Fecha o formulário de transportador.
 */
function closeCarrierForm() {
    carrierDetailSection.classList.add('hidden');
    editingCarrierId = null;
    document.querySelectorAll('.carrier-item.active').forEach(item => item.classList.remove('active'));
    formMessage.textContent = '';
    carrierLogoPreview.src = '';
    carrierLogoPreview.classList.add('hidden');
    removeLogoBtn.classList.add('hidden');
    additionalContactsContainer.innerHTML = ''; // Limpa contactos adicionais ao fechar
    // Garante que o contacto principal está recolhido ao fechar
    mainContactDetails.classList.add('hidden');
    toggleMainContactBtn.textContent = '+';
    // Garante que contactos adicionais estão recolhidos ao fechar
    additionalContactsContainer.classList.add('hidden');
    if (toggleAdditionalContactBtn) toggleAdditionalContactBtn.textContent = '+';
    // Limpa regexes ao fechar o formulário
    carrierPhoneInput.removeAttribute('pattern');
    contactPhoneInput.removeAttribute('pattern');
    document.querySelectorAll('.additional-contact-phone').forEach(input => input.removeAttribute('pattern'));

    // NOVO: Esconde a lista de autocomplete ao fechar o formulário
    carrierCountryAutocompleteList.style.display = 'none';
    activeCountryAutocompleteItem = -1;
}

// --- Funções de Gestão de Contactos Adicionais ---

/**
 * Adiciona um novo conjunto de campos para um contacto adicional.
 * @param {object} [contact={}] - Dados do contacto para pré-preencher os campos.
 */
function addAdditionalContactField(contact = {}) {
    const contactDiv = document.createElement('div');
    contactDiv.classList.add('additional-contact-item');
    // Adiciona um wrapper para os campos do formulário para aplicar o grid layout
    contactDiv.innerHTML = `
        <div class="contact-details-grid-wrapper">
            <div class="form-group">
                <label>Nome:</label>
                <input type="text" class="additional-contact-name" value="${contact.name || ''}">
            </div>
            <div class="form-group">
                <label>Função:</label>
                <input type="text" class="additional-contact-function" value="${contact.function || ''}">
            </div>
            <div class="form-group">
                <label>Email:</label>
                <input type="email" class="additional-contact-email" value="${contact.email || ''}">
            </div>
            <div class="form-group">
                <label>Telefone:</label>
                <input type="tel" class="additional-contact-phone" value="${contact.phone || ''}" placeholder="+XXX YYY ZZZ ZZZ">
            </div>
        </div>
        <button type="button" class="remove-additional-contact-btn delete-btn">Remover</button>
    `;
    additionalContactsContainer.appendChild(contactDiv);

    // Adiciona listener para o botão de remover deste contacto específico
    contactDiv.querySelector('.remove-additional-contact-btn').addEventListener('click', () => {
        contactDiv.remove();
        // Se todos os contactos adicionais forem removidos, recolhe a secção
        if (additionalContactsContainer.children.length === 0) {
            additionalContactsContainer.classList.add('hidden');
            if (toggleAdditionalContactBtn) toggleAdditionalContactBtn.textContent = '+';
        }
    });

    // Aplica a regex ao novo campo de telefone, se um país já estiver selecionado
    updatePhoneFieldsForCountry();

    // Expande a secção de contactos adicionais quando um novo é adicionado
    if (additionalContactsContainer.classList.contains('hidden')) {
        additionalContactsContainer.classList.remove('hidden');
        if (toggleAdditionalContactBtn) toggleAdditionalContactBtn.textContent = '-';
    }
}

/**
 * Alterna a visibilidade dos detalhes do contacto principal.
 */
function toggleMainContactDetails() {
    mainContactDetails.classList.toggle('hidden');
    const button = toggleMainContactBtn;
    if (mainContactDetails.classList.contains('hidden')) {
        button.textContent = '+';
    } else {
        button.textContent = '-';
    }
}

/**
 * Alterna a visibilidade dos detalhes dos contactos adicionais.
 */
function toggleAdditionalContactDetails() {
    additionalContactsContainer.classList.toggle('hidden');
    const button = toggleAdditionalContactBtn;
    if (additionalContactsContainer.classList.contains('hidden')) {
        button.textContent = '+';
    } else {
        button.textContent = '-';
    }
}


/**
 * Preenche o campo de telefone com o indicativo e aplica a regex,
 * para o transportador, contacto principal e contactos adicionais.
 */
function updatePhoneFieldsForCountry() {
    const selectedCountryName = carrierCountryInput.value;
    // CORRIGIDO: allCountries agora contém objetos completos, então a busca é direta
    const selectedCountry = allCountries.find(countryObj => countryObj.nome === selectedCountryName);

    let phoneCode = '';
    let phoneRegex = '.*'; // Regex padrão que aceita qualquer coisa se não houver correspondência

    if (selectedCountry) {
        // CORRIGIDO: Já temos o objeto completo, não precisamos de o procurar novamente
        phoneCode = selectedCountry.indicativo_telefone || '';
        phoneRegex = selectedCountry.regex_telefone || '.*';
    }

    // Função auxiliar para aplicar indicativo e regex a um campo de telefone
    function applyPhoneFormatting(inputElement, currentPhoneValue, code, regex) {
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

        // NOVO: Adiciona um event listener para limpar espaços ao digitar/colar
        // Verifica se o listener já foi adicionado para evitar duplicados
        if (!inputElement.dataset.hasSpaceCleaner) {
            inputElement.addEventListener('input', function() {
                this.value = this.value.replace(/\s/g, ''); // Remove todos os espaços
            });
            inputElement.dataset.hasSpaceCleaner = 'true'; // Marca que o listener foi adicionado
        }
    }

    // Aplica ao telefone do transportador
    applyPhoneFormatting(carrierPhoneInput, carrierPhoneInput.value, phoneCode, phoneRegex);

    // Aplica ao telefone do contacto principal
    applyPhoneFormatting(contactPhoneInput, contactPhoneInput.value, phoneCode, phoneRegex);

    // Aplica a todos os telefones de contactos adicionais
    document.querySelectorAll('.additional-contact-phone').forEach(input => {
        applyPhoneFormatting(input, input.value, phoneCode, phoneRegex);
    });
}

// --- Funções de Autocomplete para o Campo País ---

/**
 * Lida com a entrada de texto no campo de autocomplete de país.
 * @param {Event} e - O evento de input.
 */
function handleCarrierCountryInput(e) {
    const input = e.target;
    const list = carrierCountryAutocompleteList;
    let val = input.value.trim().toLowerCase();
    
    // Filtra allCountries (que agora são objetos completos) pelos nomes
    let filtered = val
        ? allCountries.filter(countryObj => countryObj.nome.toLowerCase().startsWith(val))
        : allCountries;

    list.innerHTML = ''; // Limpa a lista
    activeCountryAutocompleteItem = -1; // Reseta o item ativo

    if (filtered.length > 0) {
        filtered.forEach((countryObj, index) => {
            const div = document.createElement('div');
            div.classList.add('autocomplete-item');
            div.textContent = countryObj.nome;
            div.dataset.index = index; // Armazena o índice para navegação com teclado
            div.onmousedown = () => selectCarrierCountryFromAutocomplete(countryObj.nome); // Usa mousedown para evitar blur antes do click
            list.appendChild(div);
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
        // CORRIGIDO: allCountries agora contém objetos completos, a busca é por nome
        let match = allCountries.find(countryObj => countryObj.nome.toLowerCase() === val.toLowerCase());
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


// --- Funções de Gestão de Dados ---

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
 * Recarrega a lista de transportadores do backend e renderiza.
 */
async function refreshCarrierList() {
    try {
        currentCarriers = await loadCarriers();
        renderCarrierList(currentCarriers);
    } catch (error) {
        console.error('Erro ao carregar a lista de transportadores:', error);
        carrierListElement.innerHTML = '<p class="error">Erro ao carregar transportadores.</p>';
    }
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
    // CORRIGIDO: allCountries agora contém objetos completos, a busca é por nome
    const selectedCountryObject = allCountries.find(countryObj => countryObj.nome.toLowerCase() === countryValue.toLowerCase());
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
        // Agora, os campos estão dentro de .contact-details-grid-wrapper
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
        name: document.getElementById('carrierName').value.trim(),
        address: document.getElementById('carrierAddress').value.trim(),
        city: document.getElementById('carrierCity').value.trim(),
        postalCode: document.getElementById('carrierPostalCode').value.trim(),
        country: selectedCountryObject.nome, // Salva o nome validado do país
        phone: carrierPhoneInput.value.trim(), // Telefone completo do transportador
        email: carrierEmailInput.value.trim(),
        website: carrierWebsiteInput.value.trim(),
        // Processa os campos de Modo, Tipo e Serviços como arrays de strings
        mode: carrierModeInput.value.split(',').map(s => s.trim()).filter(s => s),
        type: carrierTypeInput.value.split(',').map(s => s.trim()).filter(s => s),
        services: carrierServicesInput.value.split(',').map(s => s.trim()).filter(s => s),
        notes: document.getElementById('carrierNotes').value.trim(),
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
        openCarrierForm(carrierId);
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
        // Inclui Modo e Tipo na pesquisa
        (Array.isArray(carrier.mode) && carrier.mode.some(m => m.toLowerCase().includes(searchTerm))) ||
        (Array.isArray(carrier.type) && carrier.type.some(t => t.toLowerCase().includes(searchTerm))) ||
        (Array.isArray(carrier.services) && carrier.services.some(service => service.toLowerCase().includes(searchTerm))) ||
        (carrier.country && carrier.country.toLowerCase().includes(searchTerm)) || // Inclui o país na pesquisa
        (Array.isArray(carrier.additionalContacts) && carrier.additionalContacts.some(contact =>
            (contact.name && contact.name.toLowerCase().includes(searchTerm)) ||
            (contact.email && contact.email.toLowerCase().includes(searchTerm)) ||
            (contact.phone && contact.phone.toLowerCase().includes(searchTerm))
        ))
    );
    renderCarrierList(filteredCarriers);
}

// --- Funções Utilitárias ---

/**
 * Gera um ID único simples (para uso temporário na fase local).
 * Em um ambiente de produção ou com Odoo, o ID seria gerado pelo backend/DB.
 */
function generateUniqueId() {
    return 'carrier_' + Date.now() + Math.random().toString(16).substr(2, 5);
}

/**
 * Exibe uma mensagem na UI.
 * @param {string} msg - A mensagem a exibir.
 * @param {string} type - 'success' ou 'error'.
 */
function displayMessage(msg, type) {
    formMessage.textContent = msg;
    formMessage.className = `message ${type}`;
    setTimeout(() => {
        formMessage.textContent = '';
        formMessage.className = 'message';
    }, 5000);
}

// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', init);
