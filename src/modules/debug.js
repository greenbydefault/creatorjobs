// src/modules/debug.js
import { CONFIG } from '../config.js';

class DebugService {
    constructor() {
        this.enabled = CONFIG.DEBUG_MODE;
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

// Singleton-Instanz exportieren
export const DEBUG = new DebugService();
