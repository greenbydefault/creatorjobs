/**
 * ContractTypeFactory-Modul - Verwaltet die verschiedenen Vertragstypen
 */
var ContractTypeFactory = (function() {
    // Private Variablen
    var contractTypes = {};
    var selector = null;
    
    // Private Methoden
    function init() {
        Debug.info('ContractTypeFactory-Modul initialisiert');
        createContractTypeSelector();
    }
    
    function createContractTypeSelector() {
        // Prüfen, ob der Selektor bereits existiert
        selector = document.getElementById('contract-type-selector');
        
        if (!selector) {
            Debug.info('Erstelle Vertragstyp-Selektor');
            
            // Container des Formulars finden
            var formContainer = document.querySelector('.db-contact-generator-wrapper');
            if (!formContainer) {
                Debug.error('Formular-Container nicht gefunden');
                return;
            }
            
            // Selektor-Container erstellen
            var selectorContainer = document.createElement('div');
            selectorContainer.className = 'contract-type-selector-container';
            selectorContainer.style.marginBottom = '20px';
            
            // Label erstellen
            var label = document.createElement('label');
            label.setAttribute('for', 'contract-type-selector');
            label.textContent = 'Vertragstyp auswählen:';
            label.style.display = 'block';
            label.style.marginBottom = '5px';
            label.style.fontWeight = 'bold';
            
            // Dropdown erstellen
            selector = document.createElement('select');
            selector.id = 'contract-type-selector';
            selector.className = 'form-select';
            selector.style.width = '100%';
            selector.style.padding = '8px';
            selector.style.borderRadius = '4px';
            selector.style.border = '1px solid #ccc';
            
            // Standard-Option hinzufügen
            var defaultOption = document.createElement('option');
            defaultOption.value = 'influencer';
            defaultOption.textContent = 'Influencer-Vertrag';
            selector.appendChild(defaultOption);
            
            // Selektor-Container zusammenbauen
            selectorContainer.appendChild(label);
            selectorContainer.appendChild(selector);
            
            // Vor dem Formular einfügen
            formContainer.parentNode.insertBefore(selectorContainer, formContainer);
            
            // Event-Listener hinzufügen
            selector.addEventListener('change', function() {
                var selectedType = this.value;
                Debug.info('Vertragstyp gewechselt zu:', selectedType);
                
                // Aktiven Vertragstyp wechseln
                var contract = getContractType(selectedType);
                if (contract) {
                    contract.init();
                    
                    // Zum ersten Schritt zurückgehen
                    Navigation.goToStep(1);
                }
            });
        }
    }
    
    function registerContractType(type, contractModule) {
        if (!type || !contractModule) {
            Debug.error('Ungültiger Vertragstyp oder Modul:', type);
            return;
        }
        
        Debug.info('Registriere Vertragstyp:', type);
        contractTypes[type] = contractModule;
        
        // Wenn der Selektor existiert, Option hinzufügen
        if (selector) {
            var exists = false;
            
            // Prüfen, ob Option bereits existiert
            for (var i = 0; i < selector.options.length; i++) {
                if (selector.options[i].value === type) {
                    exists = true;
                    break;
                }
            }
            
            // Option hinzufügen, wenn sie noch nicht existiert
            if (!exists) {
                var option = document.createElement('option');
                option.value = type;
                option.textContent = contractModule.getDisplayName();
                selector.appendChild(option);
            }
        }
    }
    
    function getContractType(type) {
        if (!contractTypes[type]) {
            Debug.error('Vertragstyp nicht gefunden:', type);
            return null;
        }
        
        return contractTypes[type];
    }
    
    function getAvailableContractTypes() {
        return Object.keys(contractTypes);
    }
    
    // Öffentliche API
    return {
        init: init,
        registerContractType: registerContractType,
        getContractType: getContractType,
        getAvailableContractTypes: getAvailableContractTypes
    };
})();
