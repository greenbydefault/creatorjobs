/**
 * Core-Modul - Haupteinstiegspunkt der Anwendung
 */
var ContractGenerator = (function() {
    // Private Variablen
    var activeContractType = null;
    var contractTypes = {};
    
    // Private Methoden
    function init() {
        console.log('ContractGenerator initialisiert');
        
        // Module initialisieren
        Navigation.init();
        Validation.init();
        UIController.init();
        ContractTypeFactory.init();
        
        // Event-Listener für Vertragstyp-Änderungen
        setupEventListeners();
        
        // Standard-Vertragstyp laden (Influencer)
        loadContractType('influencer');
    }
    
    function setupEventListeners() {
        // Dropdown für Vertragstypen
        var contractTypeDropdown = document.getElementById('contract-type-selector');
        if (contractTypeDropdown) {
            contractTypeDropdown.addEventListener('change', function() {
                loadContractType(this.value);
            });
        }
    }
    
    function loadContractType(type) {
        activeContractType = ContractTypeFactory.getContractType(type);
        if (activeContractType) {
            activeContractType.init();
        }
    }
    
    // Öffentliche API
    return {
        init: init,
        registerContractType: function(type, module) {
            contractTypes[type] = module;
        },
        getActiveContractType: function() {
            return activeContractType;
        }
    };
})();

// Dokument geladen
document.addEventListener('DOMContentLoaded', function() {
    // Anwendung initialisieren
    ContractGenerator.init();
});
