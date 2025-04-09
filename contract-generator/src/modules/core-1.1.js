/**
 * Core-Modul - Haupteinstiegspunkt und Koordination der Anwendung
 */
(function() {
  'use strict';
  
  // Zugriff auf globale Objekte
  const ContractGenerator = window.ContractGenerator || {};
  const Debug = ContractGenerator.Debug || console;
  
  // Private Variablen
  var initialized = false;
  
  // Private Methoden
  function init() {
    if (initialized) {
      Debug.warn('Core-Modul bereits initialisiert');
      return;
    }
    
    Debug.info('Core-Modul initialisiert');
    
    // Prüfen, ob alle benötigten Module verfügbar sind
    checkRequiredModules();
    
    // Initialisiere die anderen Module in der richtigen Reihenfolge
    initializeModules();
    
    initialized = true;
  }
  
  function checkRequiredModules() {
    const requiredModules = [
      { name: 'Debug', object: ContractGenerator.Debug },
      { name: 'PDFGenerator', object: ContractGenerator.PDFGenerator },
      { name: 'Validation', object: ContractGenerator.Validation },
      { name: 'Navigation', object: ContractGenerator.Navigation },
      { name: 'UIController', object: ContractGenerator.UIController },
      { name: 'ContractTypeFactory', object: ContractGenerator.ContractTypeFactory }
    ];
    
    let missingModules = [];
    
    requiredModules.forEach(module => {
      if (!module.object) {
        missingModules.push(module.name);
      }
    });
    
    if (missingModules.length > 0) {
      Debug.warn('Fehlende Module:', missingModules.join(', '));
    }
  }
  
  function initializeModules() {
    try {
      // 1. PDFGenerator initialisieren (unabhängig)
      if (ContractGenerator.PDFGenerator && typeof ContractGenerator.PDFGenerator.init === 'function') {
        ContractGenerator.PDFGenerator.init();
      }
      
      // 2. UIController initialisieren (unabhängig)
      if (ContractGenerator.UIController && typeof ContractGenerator.UIController.init === 'function') {
        ContractGenerator.UIController.init();
      }
      
      // 3. Validation initialisieren (hängt von UI ab)
      if (ContractGenerator.Validation && typeof ContractGenerator.Validation.init === 'function') {
        ContractGenerator.Validation.init();
      }
      
      // 4. Navigation initialisieren (hängt von Validation und UI ab)
      if (ContractGenerator.Navigation && typeof ContractGenerator.Navigation.init === 'function') {
        ContractGenerator.Navigation.init();
      }
      
      // 5. ContractTypeFactory initialisieren (benötigt die anderen Module)
      if (ContractGenerator.ContractTypeFactory && typeof ContractGenerator.ContractTypeFactory.init === 'function') {
        ContractGenerator.ContractTypeFactory.init();
      }
      
      Debug.info('Alle Module erfolgreich initialisiert');
    } catch (error) {
      Debug.error('Fehler bei der Initialisierung der Module:', error);
    }
  }
  
  function loadDefaultContractType() {
    const config = ContractGenerator.config || {};
    const defaultType = config.CONTRACT_TYPES && config.CONTRACT_TYPES.INFLUENCER || 'influencer';
    
    if (ContractGenerator.ContractTypeFactory && 
        typeof ContractGenerator.ContractTypeFactory.loadContractType === 'function') {
      
      Debug.info('Lade Standard-Vertragstyp:', defaultType);
      ContractGenerator.ContractTypeFactory.loadContractType(defaultType);
    }
  }
  
  // Core-Modul definieren
  var Core = {
    init: init,
    loadDefaultContractType: loadDefaultContractType,
    getVersion: function() {
      return '1.0.0';
    }
  };
  
  // Core-Modul global verfügbar machen
  window.ContractGenerator = window.ContractGenerator || {};
  window.ContractGenerator.Core = Core;
})();
