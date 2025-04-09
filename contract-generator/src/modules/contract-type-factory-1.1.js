/**
 * ContractTypeFactory-Modul - Verwaltet die verschiedenen Vertragstypen
 */
(function() {
  'use strict';
  
  // Zugriff auf globale Objekte
  const ContractGenerator = window.ContractGenerator || {};
  const Debug = ContractGenerator.Debug || console;
  const config = ContractGenerator.config || {
    CONTRACT_TYPE_SELECTOR_ID: 'contract-type-selector',
    FORM_CONTAINER_ID: 'db-contact-generator-wrapper',
    CONTRACT_TYPES: {
      INFLUENCER: 'influencer'
    }
  };
  
  // Private Variablen
  var contractTypes = {};
  var activeContractType = null;
  var selector = null;
  var initialized = false;
  
  // Private Methoden
  function init() {
    if (initialized) {
      Debug.warn('ContractTypeFactory-Modul bereits initialisiert');
      return;
    }
    
    Debug.info('ContractTypeFactory-Modul initialisiert');
    createContractTypeSelector();
    initialized = true;
  }
  
  function createContractTypeSelector() {
    // Prüfen, ob der Selektor bereits existiert
    selector = document.getElementById(config.CONTRACT_TYPE_SELECTOR_ID);
    
    if (!selector) {
      Debug.info('Erstelle Vertragstyp-Selektor');
      
      // Container des Formulars finden
      var formContainer = document.querySelector('.' + config.FORM_CONTAINER_ID);
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
      label.setAttribute('for', config.CONTRACT_TYPE_SELECTOR_ID);
      label.textContent = 'Vertragstyp auswählen:';
      label.style.display = 'block';
      label.style.marginBottom = '5px';
      label.style.fontWeight = 'bold';
      
      // Dropdown erstellen
      selector = document.createElement('select');
      selector.id = config.CONTRACT_TYPE_SELECTOR_ID;
      selector.className = 'form-select';
      selector.style.width = '100%';
      selector.style.padding = '8px';
      selector.style.borderRadius = '4px';
      selector.style.border = '1px solid #ccc';
      
      // Standard-Option hinzufügen
      var defaultOption = document.createElement('option');
      defaultOption.value = config.CONTRACT_TYPES.INFLUENCER;
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
        loadContractType(selectedType);
      });
    }
    
    // Bereits registrierte Vertragstypen als Optionen hinzufügen
    updateSelectorOptions();
  }
  
  function updateSelectorOptions() {
    if (!selector) return;
    
    // Alle registrierten Vertragstypen durchgehen
    Object.keys(contractTypes).forEach(type => {
      const contractModule = contractTypes[type];
      
      // Prüfen, ob Option bereits existiert
      var exists = false;
      for (var i = 0; i < selector.options.length; i++) {
        if (selector.options[i].value === type) {
          exists = true;
          break;
        }
      }
      
      // Option hinzufügen, wenn sie noch nicht existiert
      if (!exists && contractModule && typeof contractModule.getDisplayName === 'function') {
        var option = document.createElement('option');
        option.value = type;
        option.textContent = contractModule.getDisplayName();
        selector.appendChild(option);
      }
    });
  }
  
  function registerContractType(type, contractModule) {
    if (!type || !contractModule) {
      Debug.error('Ungültiger Vertragstyp oder Modul:', type);
      return;
    }
    
    Debug.info('Registriere Vertragstyp:', type);
    contractTypes[type] = contractModule;
    
    // Selektor aktualisieren, falls bereits erstellt
    updateSelectorOptions();
  }
  
  function loadContractType(type) {
    var contractModule = contractTypes[type];
    
    if (!contractModule) {
      Debug.error('Vertragstyp nicht gefunden:', type);
      return null;
    }
    
    // Aktiven Vertragstyp setzen
    activeContractType = contractModule;
    
    // Vertragstyp initialisieren
    if (typeof contractModule.init === 'function') {
      contractModule.init();
    }
    
    // Zum ersten Schritt zurückgehen
    if (ContractGenerator.Navigation && typeof ContractGenerator.Navigation.goToStep === 'function') {
      ContractGenerator.Navigation.goToStep(1);
    }
    
    return contractModule;
  }
  
  function getContractType(type) {
    return contractTypes[type] || null;
  }
  
  function getActiveContractType() {
    return activeContractType;
  }
  
  function getAvailableContractTypes() {
    return Object.keys(contractTypes);
  }
  
  // ContractTypeFactory-Modul definieren
  var ContractTypeFactory = {
    init: init,
    registerContractType: registerContractType,
    loadContractType: loadContractType,
    getContractType: getContractType,
    getActiveContractType: getActiveContractType,
    getAvailableContractTypes: getAvailableContractTypes
  };
  
  // ContractTypeFactory-Modul global verfügbar machen
  window.ContractGenerator = window.ContractGenerator || {};
  window.ContractGenerator.ContractTypeFactory = ContractTypeFactory;
})();
