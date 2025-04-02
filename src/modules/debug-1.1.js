(function() {
    'use strict';

    // Stelle sicher, dass WEBFLOW_API existiert
    window.WEBFLOW_API = window.WEBFLOW_API || {};
    window.WEBFLOW_API.config = window.WEBFLOW_API.config || {};

    // Hole die Konfiguration oder setze Standardwerte
    const CONFIG = window.WEBFLOW_API.config;

    class DebugService {
        constructor() {
            // Verwende DEBUG_MODE aus Konfiguration oder setze standardmäßig auf false
            this.enabled = CONFIG.DEBUG_MODE || false;
            this.prefix = '📋 WEBFLOW_API:';
            this.levels = {
                info: true,
                warn: true,
                error: true
            };
        }
        
        /**
         * Loggt eine Nachricht, wenn Debugging aktiviert ist
         * @param {string} message - Die Log-Nachricht
         * @param {any} data - Optionale Daten zum Loggen
         * @param {string} level - Log-Level (info, warn, error)
         */
        log(message, data = null, level = 'info') {
            if (!this.enabled || !this.levels[level]) return;
            
            const prefix = this.prefix;
            
            switch (level) {
                case 'warn':
                    console.warn(`${prefix} ${message}`, data !== null ? data : '');
                    break;
                case 'error':
                    console.error(`${prefix} ${message}`, data !== null ? data : '');
                    break;
                default:
                    console.log(`${prefix} ${message}`, data !== null ? data : '');
            }
        }
        
        /**
         * Aktiviert oder deaktiviert das Debugging
         * @param {boolean} enabled - true zum Aktivieren, false zum Deaktivieren
         */
        setEnabled(enabled) {
            this.enabled = enabled;
            console.log(`${this.prefix} Debugging ${enabled ? 'aktiviert' : 'deaktiviert'}`);
        }
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.debug = new DebugService();
})();
