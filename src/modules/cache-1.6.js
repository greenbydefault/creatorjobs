(function() {
    'use strict';

    // Stelle sicher, dass WEBFLOW_API existiert
    window.WEBFLOW_API = window.WEBFLOW_API || {};
    window.WEBFLOW_API.config = window.WEBFLOW_API.config || {};

    // Globale Objekte und Abhängigkeiten vorbereiten
    const CONFIG = window.WEBFLOW_API.config;
    const DEBUG = window.WEBFLOW_API.debug || {
        log: function(message, data = null, level = 'info') {
            console.log(`[${level}] ${message}`, data || '');
        }
    };

    /**
     * Komplett deaktivierte Cache-Klasse
     */
    class NoCacheService {
        constructor() {
            DEBUG.log(`Cache-System vollständig deaktiviert`);
        }

        get(key) {
            return null;
        }

        set(key, data, customExpiration = null) {
            // Nichts tun
        }

        remove(key) {
            return true;
        }

        removePattern(pattern) {
            return 0;
        }

        clear() {
            DEBUG.log('Cache.clear() aufgerufen (Cache ist bereits deaktiviert)');
            return true;
        }
        
        setExpiration(newExpiration) {
            return true;
        }

        setDisabled(disabled) {
            return true;
        }
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.cache = new NoCacheService();
    
    // Globale Hilfsfunktion zum "Löschen" des Caches
    window.clearVideoCache = function() {
        DEBUG.log('Cache bereits vollständig deaktiviert');
        return true;
    };
})();
