// src/modules/cache.js
import { CONFIG } from '../config.js';
import { DEBUG } from './debug.js';

class CacheService {
    constructor(expirationTime = CONFIG.CACHE_EXPIRATION) {
        this.items = {};
        this.expiration = expirationTime;
        DEBUG.log('Cache initialisiert mit Expiration: ' + expirationTime + 'ms');
    }

    /**
     * Holt einen Wert aus dem Cache
     * @param {string} key - Der Cache-Schlüssel
     * @returns {any|null} - Der gecachte Wert oder null wenn nicht vorhanden/abgelaufen
     */
    get(key) {
        const item = this.items[key];
        if (!item) return null;
        
        // Prüfen ob abgelaufen
        if (Date.now() - item.timestamp > this.expiration) { 
            DEBUG.log(`Cache-Eintrag für '${key}' abgelaufen`, null, 'info');
            delete this.items[key];
            return null;
        }
        
        DEBUG.log(`Cache-Hit für '${key}'`, null, 'info');
        return item.data;
    }

    /**
     * Speichert einen Wert im Cache
     * @param {string} key - Der Cache-Schlüssel
     * @param {any} data - Die zu cachenden Daten
     */
    set(key, data) {
        this.items[key] = {
            timestamp: Date.now(),
            data: data
        };
        DEBUG.log(`Neuer Cache-Eintrag für '${key}' erstellt`, null, 'info');
    }

    /**
     * Leert den Cache vollständig
     */
    clear() {
        this.items = {};
        DEBUG.log('Cache wurde geleert', null, 'info');
    }
}

// Singleton-Instanz exportieren
export const CACHE = new CacheService();
