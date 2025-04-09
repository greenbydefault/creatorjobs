/**
 * Contract Generator - Hauptdatei
 * Lädt und verbindet alle Module des Vertragsgenerator-Systems
 */
(function() {
  'use strict';

  // Globales Namespace-Objekt
  window.ContractGenerator = window.ContractGenerator || {};
  
  // Konfiguration
  const config = {
    // Anzahl der Schritte im Influencer-Vertrag
    INFLUENCER_STEPS: 9,
    
    // Vertragstypen
    CONTRACT_TYPES: {
      INFLUENCER: 'influencer',
      // Weitere Vertragstypen hier hinzufügen
    },
    
    // Formular-IDs
    FORM_CONTAINER_ID: 'db-contact-generator-wrapper',
    CONTRACT_TYPE_SELECTOR_ID: 'contract-type-selector',
    
    // Debug-Einstellungen
    DEBUG_MODE: true
  };
  
  // Konfiguration global verfügbar machen
  window.ContractGenerator.config = config;
  
  // Modul-Pfade
  const MODULE_PATHS = {
    debug: './src/modules/debug-1.1.js',
    pdfGenerator: './src/modules/pdf-generator-1.1.js',
    validation: './src/modules/validation-1.1.js',
    navigation: './src/modules/navigation-1.1.js',
    uiController: './src/modules/ui-controller-1.1.js',
    contractTypeFactory: './src/modules/contract-type-factory-1.1.js',
    // Vertragstypen
    influencerContract: './src/contracts/influencer-1.1.js'
    // Weitere Vertragstypen hier hinzufügen
  };
  
  // Einfache Log-Funktion (bevor Debug-Modul geladen ist)
  function log(message, data, level = 'info') {
    if (!config.DEBUG_MODE) return;
    
    const prefix = '📝 ContractGenerator:';
    
    switch (level) {
      case 'warn':
        console.warn(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      case 'error':
        console.error(`${prefix} ${message}`, data !== undefined ? data : '');
        break;
      default:
        console.log(`${prefix} ${message}`, data !== undefined ? data : '');
    }
  }
  
  /**
   * Hilfsfunktion zum Laden eines Skripts
   * @param {string} src - Pfad zur Skriptdatei
   * @returns {Promise} - Promise, das aufgelöst wird, wenn das Skript geladen ist
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      script.onload = () => resolve(script);
      script.onerror = () => reject(new Error(`Fehler beim Laden von ${src}`));
      
      document.head.appendChild(script);
    });
  }
  
  /**
   * Lädt alle Module in der richtigen Reihenfolge
   */
  async function loadModules() {
    log('Starte Laden der Module...');
    
    // Basis-URL
    // HIER MUSST DU DEN PFAD ZU DEINEM REPOSITORY ANGEBEN
    const baseUrl = './'; // Ändere dies zum Pfad deines GitHub-Repositorys
    
    try {
      // Module in der richtigen Abhängigkeitsreihenfolge laden
      
      // 1. Grundlegende Module
      await loadScript(`${baseUrl}${MODULE_PATHS.debug}`);
      await loadScript(`${baseUrl}${MODULE_PATHS.pdfGenerator}`);
      
      // 2. Kernmodule
      await loadScript(`${baseUrl}${MODULE_PATHS.validation}`);
      await loadScript(`${baseUrl}${MODULE_PATHS.navigation}`);
      await loadScript(`${baseUrl}${MODULE_PATHS.uiController}`);
      await loadScript(`${baseUrl}${MODULE_PATHS.contractTypeFactory}`);
      
      // 3. Vertragsmodule
      await loadScript(`${baseUrl}${MODULE_PATHS.influencerContract}`);
      // Hier weitere Vertragstypen laden, wenn sie entwickelt werden
      
      log('Alle Module erfolgreich geladen');
      
      // Initialisiere die Anwendung
      initializeContractGenerator();
    } catch (error) {
      log('Fehler beim Laden der Module', error, 'error');
      
      // Fallback: Stelle sicher, dass Basisfunktionalität verfügbar ist
      initializeFallbackApi();
    }
  }
  
  /**
   * Initialisiert den Contract Generator nach dem Laden aller Module
   */
  function initializeContractGenerator() {
    log('Initialisiere Contract Generator');
    
    // Prüfe, ob Debug-Modul verfügbar ist und verwende es für weiteres Logging
    const debug = window.ContractGenerator.Debug || { info: log };
    
    // Prüfe, ob die Module korrekt geladen wurden
    if (!window.ContractGenerator.PDFGenerator) {
      debug.info('PDF Generator nicht verfügbar', null, 'warn');
    }
    if (!window.ContractGenerator.Validation) {
      debug.info('Validation nicht verfügbar', null, 'warn');
    }
    if (!window.ContractGenerator.Navigation) {
      debug.info('Navigation nicht verfügbar', null, 'warn');
    }
    if (!window.ContractGenerator.UIController) {
      debug.info('UIController nicht verfügbar', null, 'warn');
    }
    if (!window.ContractGenerator.ContractTypeFactory) {
      debug.info('ContractTypeFactory nicht verfügbar', null, 'warn');
    }
    
    // Module in der richtigen Reihenfolge initialisieren
    try {
      // 1. PDF Generator (unabhängig)
      if (window.ContractGenerator.PDFGenerator && typeof window.ContractGenerator.PDFGenerator.init === 'function') {
        window.ContractGenerator.PDFGenerator.init();
      }
      
      // 2. UI Controller (unabhängig)
      if (window.ContractGenerator.UIController && typeof window.ContractGenerator.UIController.init === 'function') {
        window.ContractGenerator.UIController.init();
      }
      
      // 3. Validation (hängt von UI ab)
      if (window.ContractGenerator.Validation && typeof window.ContractGenerator.Validation.init === 'function') {
        window.ContractGenerator.Validation.init();
      }
      
      // 4. Navigation (hängt von Validation und UI ab)
      if (window.ContractGenerator.Navigation && typeof window.ContractGenerator.Navigation.init === 'function') {
        window.ContractGenerator.Navigation.init();
      }
      
      // 5. ContractTypeFactory (benötigt die anderen Module)
      if (window.ContractGenerator.ContractTypeFactory && typeof window.ContractGenerator.ContractTypeFactory.init === 'function') {
        window.ContractGenerator.ContractTypeFactory.init();
      }
      
      // Initialisiere den Standard-Vertragstyp (Influencer)
      if (window.ContractGenerator.ContractTypeFactory && 
          typeof window.ContractGenerator.ContractTypeFactory.loadContractType === 'function') {
        window.ContractGenerator.ContractTypeFactory.loadContractType(config.CONTRACT_TYPES.INFLUENCER);
      }
      
      debug.info('Contract Generator erfolgreich initialisiert');
    } catch (error) {
      debug.info('Fehler bei der Initialisierung der Module', error, 'error');
      alert('Bei der Initialisierung ist ein Fehler aufgetreten. Bitte die Seite neu laden.');
    }
  }
  
  /**
   * Initialisiert Fallback-APIs, falls das Laden der Module fehlschlägt
   */
  function initializeFallbackApi() {
    log('Initialisiere Fallback-API', null, 'warn');
    
    // Einfache Fallback-Funktionen bereitstellen, damit die Seite nicht komplett fehlschlägt
    window.ContractGenerator.Debug = window.ContractGenerator.Debug || {
      info: log,
      warn: (msg) => log(msg, null, 'warn'),
      error: (msg) => log(msg, null, 'error')
    };
    
    // Dummy-Funktionen für essenzielle Funktionalitäten
    window.ContractGenerator.generateContract = function() {
      alert('Die Vertragsgenerierung ist momentan nicht verfügbar. Bitte versuche es später erneut.');
    };
  }
  
  /**
   * Stellt globale Debug-Funktionen bereit
   */
  function initDebugTools() {
    window.contractGeneratorDebug = {
      enable: function() {
        window.ContractGenerator.config.DEBUG_MODE = true;
        if (window.ContractGenerator.Debug && typeof window.ContractGenerator.Debug.enableDebug === 'function') {
          window.ContractGenerator.Debug.enableDebug();
        }
        console.log('Debugging aktiviert');
      },
      disable: function() {
        window.ContractGenerator.config.DEBUG_MODE = false;
        if (window.ContractGenerator.Debug && typeof window.ContractGenerator.Debug.disableDebug === 'function') {
          window.ContractGenerator.Debug.disableDebug();
        }
        console.log('Debugging deaktiviert');
      },
      status: function() {
        console.log(`Debugging ist derzeit ${window.ContractGenerator.config.DEBUG_MODE ? 'aktiviert' : 'deaktiviert'}`);
      },
      showConfig: function() {
        console.log('Aktuelle Konfiguration:', window.ContractGenerator.config);
      }
    };
  }
  
  // Warteschlange für Aufrufe vor der Initialisierung
  window.CONTRACTGENERATOR_QUEUE = window.CONTRACTGENERATOR_QUEUE || [];
  
  // Initialisiere die Anwendung nach dem DOM-Laden
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Kurze Verzögerung, um sicherzustellen, dass alle abhängigen Skripte geladen sind
      setTimeout(() => {
        loadModules();
        initDebugTools();
        
        // Verarbeite die Warteschlange
        if (window.CONTRACTGENERATOR_QUEUE && window.CONTRACTGENERATOR_QUEUE.length > 0) {
          log(`Verarbeite ${window.CONTRACTGENERATOR_QUEUE.length} gepufferte Aufrufe`);
          
          window.CONTRACTGENERATOR_QUEUE.forEach(call => {
            try {
              if (typeof call === 'function') {
                call(window.ContractGenerator);
              }
            } catch (error) {
              log("Fehler beim Verarbeiten eines gepufferten Aufrufs", error, 'error');
            }
          });
          
          // Leere die Warteschlange
          window.CONTRACTGENERATOR_QUEUE = [];
        }
      }, 100);
    });
  } else {
    // DOM bereits geladen
    setTimeout(() => {
      loadModules();
      initDebugTools();
    }, 100);
  }
})();
