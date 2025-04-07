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
     * Deaktivierte Cache-Klasse
     * Alle Methoden liefern Standardwerte zurück, speichern aber keine Daten
     */
    class DisabledCache {
        constructor() {
            DEBUG.log(`Cache-System ist permanent deaktiviert`);
        }

        setDisabled(disabled) {
            // Ignorieren - Cache ist immer deaktiviert
            return true;
        }

        get(key) {
            // Immer null zurückgeben (kein Cache)
            return null;
        }

        set(key, data, customExpiration = null) {
            // Nichts tun - Cache ist deaktiviert
            return;
        }

        remove(key) {
            // Nichts tun - Cache ist deaktiviert
            return true;
        }

        removePattern(pattern) {
            // Nichts tun - Cache ist deaktiviert
            return 0;
        }

        clear() {
            // Event trotzdem auslösen für andere Module
            DEBUG.log('Cache-Clear aufgerufen (Cache ist deaktiviert)');
            const event = new CustomEvent('cacheClear', { detail: { source: 'manual' } });
            document.dispatchEvent(event);
            return true;
        }
        
        setExpiration(newExpiration) {
            // Nichts tun - Cache ist deaktiviert
            return true;
        }
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.cache = new DisabledCache();
    
    // Globale Hilfsfunktion zum "Löschen" des Caches
    window.clearVideoCache = function() {
        DEBUG.log('Cache-Clear Funktion aufgerufen (Cache ist deaktiviert)');
        // Event auslösen
        const event = new CustomEvent('cacheClear', { detail: { source: 'manual' } });
        document.dispatchEvent(event);
        return true;
    };
    
    // Event-Listener beibehalten, aber keine Cache-Aktionen durchführen
    document.addEventListener('videoCreated', (e) => {
        DEBUG.log('Video erstellt Event empfangen (Cache ist deaktiviert)');
    });
    
    document.addEventListener('videoDeleted', (e) => {
        DEBUG.log('Video gelöscht Event empfangen (Cache ist deaktiviert)');
    });
})();
