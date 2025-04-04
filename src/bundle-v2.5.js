/**
 * Webflow Video API Bundle
 * Hauptdatei zum Laden und Zusammenführen aller Module
 */
(function() {
  'use strict';

  // Globales Namespace-Objekt
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  
  // Konfiguration
  const defaultConfig = {
    // API-Endpunkte
    BASE_URL: "https://api.webflow.com/v2/collections",
    WORKER_BASE_URL: "https://upload.oliver-258.workers.dev/?url=",
    VIDEO_CONVERT_WORKER_URL: "https://video-convert.oliver-258.workers.dev",
    UPLOADCARE_WORKER_URL: "https://deleteuploadcare.oliver-258.workers.dev",
    
    // Collection-IDs
    COLLECTION_ID: "67d806e65cadcadf2f41e659", // Collection ID für Videos
    MEMBERS_COLLECTION_ID: "6448faf9c5a8a15f6cc05526", // Collection ID für Members
    
    // Form-IDs
    FORM_ID: "db-upload-video",
    SUCCESS_DIV_ID: "db-upload-susscess",
    EDIT_MODAL_ID: "upload-edit",
    EDIT_FORM_ID: "video-edit-form",
    EDIT_NAME_FIELD: "Name Edit",
    EDIT_CATEGORY_FIELD: "Kategorie Edit",
    EDIT_DESCRIPTION_FIELD: "Beschreibung Edit",
    EDIT_PUBLIC_FIELD: "Open Video Edit",
    EDIT_SAVE_BUTTON: "video-edit-save",
    EDIT_DELETE_BUTTON: "video-delete-button",
    DELETE_CONFIRM_MODAL_ID: "delete-confirm-modal",
    
    // UI-Element-IDs
    VIDEO_CONTAINER_ID: 'video-feed',
    UPLOAD_LIMIT_TITLE_ID: 'upload-limit-title',
    UPLOAD_COUNTER_ID: 'uploads-counter',
    UPLOAD_PROGRESS_ID: 'uploads-progress',
    UPLOAD_LIMIT_MESSAGE_ID: 'upload-limit-message',
    PLAN_STATUS_ID: 'plan-status',
    
    // Limits
    NAME_CHAR_LIMIT: 64,
    DESCRIPTION_CHAR_LIMIT: 144,
    FREE_MEMBER_LIMIT: 1,
    PAID_MEMBER_LIMIT: 12,
    
    // Cache-Zeit in Millisekunden (5 Minuten)
    CACHE_EXPIRATION: 5 * 60 * 1000,
    
    // Debug-Einstellungen
    DEBUG_MODE: true,
    
    // Kategorie-Mapping
    CATEGORY_MAPPING: {
      "a1c318daa4a4fdc904d0ea6ae57e9eb6": "Travel",
      "a1c318": "Travel",
      "f7375698898acddde00653547c8fa793": "Entertainment",
      "0e068df04f18438e4a5b68d397782f36": "Food",
      "2f1f2fe0cd35ddd19ca98f4b85b16258": "Beauty",
      "d98ec62473786dfe4b680ffaff56df3d": "Fashion",
      "7a825bdb2886afb7afc15ace93407334": "Fitness",
      "172297c1eff716fecb37e1086835fb54": "Technology",
      "0150c802834f25c5eb9a235e5f333086": "Gaming",
      "827b3ec71e6dd2e64687ac4a2bcde003": "Art & Culture",
      "17907bdb5206dc3d81ffc984f810e58b": "Household",
      "d9e7f4c91b3e5a8022c3a6497f1d8b55": "Home & Living"
    },
    
    // Flags
    SKIP_UPLOADCARE_DELETE: false
  };
  
  // Zusammenführen der Config mit benutzerspezifischen Überschreibungen
  window.WEBFLOW_API.config = Object.assign({}, defaultConfig, window.WEBFLOW_API || {});
  
  // Modul-Pfade
  const MODULE_PATHS = {
    debug: './modules/debug-1.1.js',
    cache: './modules/cache-1.2.js',
    apiService: './modules/api-service-1.0.js',
    videoApi: './modules/video-api-1.1.js',
    memberApi: './modules/member-api-1.1.js',
    uploadcare: './modules/uploadcare-1.4.js',
    memberstack: './modules/memberstack-1.1.js',
    uiManager: './modules/ui-manager-1.3.js',
    videoFeedApp: './modules/video-feed-app-1.2.js',
    videoEditApp: './modules/video-edit-app-1.2.js',
    videoUploadApp: './modules/video-upload-app-1.2.js'
  };
  
  // Debugging-Ausgabe
  function log(message, data, level = 'info') {
    if (!window.WEBFLOW_API.config.DEBUG_MODE) return;
    
    const prefix = '📋 WEBFLOW_API:';
    
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
    
    // Basis-URL für GitHub
    // HIER MUSST DU DEN PFAD ZU DEINEM GITHUB-REPOSITORY ANGEBEN
    const baseUrl = 'https://cdn.jsdelivr.net/gh/greenbydefault/creatorjobs/src';
    
    try {
      // Module in der richtigen Abhängigkeitsreihenfolge laden
      // 1. Grundlegende Module
      await loadScript(`${baseUrl}/${MODULE_PATHS.debug}`);
      await loadScript(`${baseUrl}/${MODULE_PATHS.cache}`);
      
      // 2. API Module
      await loadScript(`${baseUrl}/${MODULE_PATHS.apiService}`);
      await loadScript(`${baseUrl}/${MODULE_PATHS.videoApi}`);
      await loadScript(`${baseUrl}/${MODULE_PATHS.memberApi}`);
      
      // 3. Integrationsmodule
      await loadScript(`${baseUrl}/${MODULE_PATHS.uploadcare}`);
      await loadScript(`${baseUrl}/${MODULE_PATHS.memberstack}`);
      await loadScript(`${baseUrl}/${MODULE_PATHS.uiManager}`);
      
      // 4. Hauptanwendungsmodule
      await loadScript(`${baseUrl}/${MODULE_PATHS.videoFeedApp}`);
      await loadScript(`${baseUrl}/${MODULE_PATHS.videoEditApp}`);
      await loadScript(`${baseUrl}/${MODULE_PATHS.videoUploadApp}`);
      
      log('Alle Module erfolgreich geladen');
      
      // Initialisiere die Anwendungen
      initializeWebflowApi();
    } catch (error) {
      log('Fehler beim Laden der Module', error, 'error');
      
      // Fallback: Stelle sicher, dass APIs definiert sind, damit keine Fehler auftreten
      initializeFallbackApi();
    }
  }
  
  /**
   * Initialisiert die Webflow API nach dem Laden aller Module
   */
  function initializeWebflowApi() {
    log('Initialisiere Webflow Video API');
    
    // Prüfe, welche Module auf der aktuellen Seite initialisiert werden sollen
    // basierend auf DOM-Elementen, die typischerweise auf bestimmten Seiten vorhanden sind
    const config = window.WEBFLOW_API.config;
    
    // Wenn Video-Feed-Container vorhanden, initialisiere Feed App
    if (document.getElementById(config.VIDEO_CONTAINER_ID) || document.querySelector('.db-upload-wrapper')) {
      log("Video-Feed erkannt, initialisiere Feed App");
      if (window.WEBFLOW_API.videoFeedApp && typeof window.WEBFLOW_API.videoFeedApp.init === 'function') {
        window.WEBFLOW_API.videoFeedApp.init();
      }
    }
    
    // Wenn Upload-Formular vorhanden, initialisiere Upload App
    if (document.getElementById(config.FORM_ID)) {
      log("Upload-Formular erkannt, initialisiere Upload App");
      if (window.WEBFLOW_API.videoUploadApp && typeof window.WEBFLOW_API.videoUploadApp.init === 'function') {
        window.WEBFLOW_API.videoUploadApp.init();
      }
    }
    
    // Wenn Edit-Elemente vorhanden, initialisiere Edit App
    if (document.getElementById(config.EDIT_FORM_ID) || 
        document.querySelector(`[data-modal-id="${config.EDIT_MODAL_ID}"]`) ||
        document.querySelectorAll('[data-video-edit]').length > 0) {
      log("Video-Edit-Funktionalität erkannt, initialisiere Edit App");
      if (window.WEBFLOW_API.videoEditApp && typeof window.WEBFLOW_API.videoEditApp.init === 'function') {
        window.WEBFLOW_API.videoEditApp.init();
      }
    }
    
    // Globale Debug-Funktionen bereitstellen
    initDebugTools();
    
    log("Webflow Video API Integration erfolgreich initialisiert");
  }
  
  /**
   * Initialisiert Fallback-APIs, falls das Laden der Module fehlschlägt
   */
  function initializeFallbackApi() {
    log('Initialisiere Fallback-API', null, 'warn');
    
    // Stelle sicher, dass grundlegende API-Elemente existieren, um Fehler zu vermeiden
    if (!window.WEBFLOW_API.debug) {
      window.WEBFLOW_API.debug = {
        log: function(message) { log(message); },
        setEnabled: function(enabled) { window.WEBFLOW_API.config.DEBUG_MODE = enabled; }
      };
    }
    
    if (!window.WEBFLOW_API.videoFeedApp) {
      window.WEBFLOW_API.videoFeedApp = {
        init: function() { log('Dummy videoFeedApp.init aufgerufen', null, 'warn'); },
        loadUserVideos: function() { log('Dummy videoFeedApp.loadUserVideos aufgerufen', null, 'warn'); }
      };
    }
    
    if (!window.WEBFLOW_API.videoEditApp) {
      window.WEBFLOW_API.videoEditApp = {
        init: function() { log('Dummy videoEditApp.init aufgerufen', null, 'warn'); }
      };
      
      // Globale editVideo-Funktion bereitstellen
      window.editVideo = function(videoId) {
        log(`Dummy editVideo aufgerufen mit ID: ${videoId}`, null, 'warn');
        alert("Video-Bearbeitung ist derzeit nicht verfügbar. Bitte lade die Seite neu und versuche es erneut.");
      };
    }
    
    if (!window.WEBFLOW_API.videoUploadApp) {
      window.WEBFLOW_API.videoUploadApp = {
        init: function() { log('Dummy videoUploadApp.init aufgerufen', null, 'warn'); }
      };
    }
  }
  
  /**
   * Stellt globale Debug-Funktionen bereit
   */
  function initDebugTools() {
    window.videoFeedDebug = {
      enable: function() { 
        if (window.WEBFLOW_API.debug && typeof window.WEBFLOW_API.debug.setEnabled === 'function') {
          window.WEBFLOW_API.debug.setEnabled(true);
        } else {
          window.WEBFLOW_API.config.DEBUG_MODE = true;
          log('Debugging aktiviert');
        }
      },
      disable: function() { 
        if (window.WEBFLOW_API.debug && typeof window.WEBFLOW_API.debug.setEnabled === 'function') {
          window.WEBFLOW_API.debug.setEnabled(false);
        } else {
          window.WEBFLOW_API.config.DEBUG_MODE = false;
          log('Debugging deaktiviert');
        }
      },
      status: function() { 
        console.log(`Debugging ist derzeit ${window.WEBFLOW_API.config.DEBUG_MODE ? 'aktiviert' : 'deaktiviert'}`);
      },
      showConfig: function() { 
        console.log('Aktuelle Konfiguration:', window.WEBFLOW_API.config);
      },
      clearCache: function() {
        if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.clear === 'function') {
          window.WEBFLOW_API.cache.clear();
          console.log('Cache geleert');
        } else {
          console.log('Cache-Modul nicht verfügbar');
        }
      },
      reloadFeed: function() {
        console.log('Lade Video-Feed neu...');
        if (window.WEBFLOW_API.videoFeedApp && typeof window.WEBFLOW_API.videoFeedApp.loadUserVideos === 'function') {
          window.WEBFLOW_API.videoFeedApp.loadUserVideos();
        } else {
          console.log('VideoFeedApp nicht verfügbar');
        }
      }
    };
  }
  
  // Warteschlange für Aufrufe vor der Initialisierung
  window.WEBFLOW_API_QUEUE = window.WEBFLOW_API_QUEUE || [];
  
  // Initialisiere die Anwendung nach dem DOM-Laden
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // Kurze Verzögerung, um sicherzustellen, dass alle abhängigen Skripte geladen sind
      setTimeout(() => {
        loadModules();
        
        // Verarbeite die Warteschlange
        if (window.WEBFLOW_API_QUEUE && window.WEBFLOW_API_QUEUE.length > 0) {
          log(`Verarbeite ${window.WEBFLOW_API_QUEUE.length} gepufferte Aufrufe`);
          
          window.WEBFLOW_API_QUEUE.forEach(call => {
            try {
              if (typeof call === 'function') {
                call(window.WEBFLOW_API);
              }
            } catch (error) {
              log("Fehler beim Verarbeiten eines gepufferten Aufrufs", error, 'error');
            }
          });
          
          // Leere die Warteschlange
          window.WEBFLOW_API_QUEUE = [];
        }
      }, 100);
    });
  } else {
    // DOM bereits geladen
    setTimeout(() => {
      loadModules();
    }, 100);
  }
})();
