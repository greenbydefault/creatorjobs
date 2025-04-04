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
     * Cache-Klasse zur temporären Speicherung von API-Antworten und anderen Daten
     */
    class SimpleCache {
        constructor(expirationTime = 30000) { // Standard-Ablaufzeit: 30 Sekunden statt 5 Minuten
            this.items = {};
            this.expiration = expirationTime;
            this.disabled = false; // Neuer Schalter zum Deaktivieren des Caches
            
            // Laden des gespeicherten Cache-Status
            const cachedDisabled = localStorage.getItem('webflow_api_cache_disabled');
            if (cachedDisabled !== null) {
                this.disabled = cachedDisabled === 'true';
            }
            
            DEBUG.log(`Cache initialisiert mit Expiration: ${this.expiration}ms (${this.disabled ? 'deaktiviert' : 'aktiviert'})`);
            
            // Event-Listener für Seiten-Refreshes hinzufügen
            window.addEventListener('beforeunload', () => {
                // Cache-Status speichern
                localStorage.setItem('webflow_api_cache_disabled', this.disabled.toString());
            });
        }

        /**
         * Aktiviert oder deaktiviert den Cache
         * @param {boolean} disabled - True zum Deaktivieren, false zum Aktivieren
         */
        setDisabled(disabled) {
            this.disabled = !!disabled;
            DEBUG.log(`Cache ${this.disabled ? 'deaktiviert' : 'aktiviert'}`);
            
            // Cache leeren, wenn er deaktiviert wird
            if (this.disabled) {
                this.clear();
            }
            
            // Cache-Status speichern
            localStorage.setItem('webflow_api_cache_disabled', this.disabled.toString());
            
            return this.disabled;
        }

        /**
         * Holt einen Wert aus dem Cache
         * @param {string} key - Der Cache-Schlüssel
         * @returns {any|null} - Der gecachte Wert oder null
         */
        get(key) {
            // Wenn Cache deaktiviert ist, gib sofort null zurück
            if (this.disabled) {
                return null;
            }
            
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
         * @param {number} customExpiration - Optionale benutzerdefinierte Ablaufzeit
         */
        set(key, data, customExpiration = null) {
            // Wenn Cache deaktiviert ist, nicht cachen
            if (this.disabled) {
                return;
            }
            
            this.items[key] = {
                timestamp: Date.now(),
                data: data,
                expiration: customExpiration || this.expiration
            };
            DEBUG.log(`Neuer Cache-Eintrag für '${key}' erstellt`, null, 'info');
        }

        /**
         * Löscht den angegebenen Eintrag aus dem Cache
         * @param {string} key - Der zu löschende Cache-Schlüssel
         */
        remove(key) {
            if (this.items[key]) {
                delete this.items[key];
                DEBUG.log(`Cache-Eintrag für '${key}' gelöscht`, null, 'info');
                return true;
            }
            return false;
        }

        /**
         * Löscht alle Schlüssel, die ein bestimmtes Muster enthalten
         * @param {string} pattern - Das Muster, nach dem gesucht werden soll
         */
        removePattern(pattern) {
            let count = 0;
            Object.keys(this.items).forEach(key => {
                if (key.includes(pattern)) {
                    delete this.items[key];
                    count++;
                }
            });
            
            if (count > 0) {
                DEBUG.log(`${count} Cache-Einträge mit Muster '${pattern}' gelöscht`, null, 'info');
            }
            
            return count;
        }

        /**
         * Leert den Cache vollständig
         */
        clear() {
            const count = Object.keys(this.items).length;
            this.items = {};
            DEBUG.log(`Cache wurde geleert (${count} Einträge)`, null, 'info');
            
            // Broadcast-Event für andere Module senden
            const event = new CustomEvent('cacheClear', { detail: { source: 'manual' } });
            document.dispatchEvent(event);
        }
        
        /**
         * Aktualisiert die Ablaufzeit für den Cache
         * @param {number} newExpiration - Neue Ablaufzeit in Millisekunden
         */
        setExpiration(newExpiration) {
            if (typeof newExpiration !== 'number' || newExpiration < 0) {
                DEBUG.log(`Ungültige Ablaufzeit: ${newExpiration}`, null, 'error');
                return false;
            }
            
            this.expiration = newExpiration;
            DEBUG.log(`Cache-Ablaufzeit aktualisiert: ${this.expiration}ms`, null, 'info');
            
            // Optional: Existierende Cache-Einträge mit der neuen Ablaufzeit aktualisieren
            Object.keys(this.items).forEach(key => {
                if (!this.items[key].customExpiration) {
                    // Nur die Einträge aktualisieren, die keine benutzerdefinierte Ablaufzeit haben
                    this.items[key].expiration = this.expiration;
                }
            });
            
            return true;
        }
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.cache = new SimpleCache(CONFIG.CACHE_EXPIRATION || 30000);
    
    // Globale Hilfsfunktion zum Löschen des Caches hinzufügen
    window.clearVideoCache = function() {
        if (window.WEBFLOW_API && window.WEBFLOW_API.cache) {
            window.WEBFLOW_API.cache.clear();
            return true;
        }
        return false;
    };
    
    // Event-Listener für cache-relevante Events
    document.addEventListener('videoCreated', (e) => {
        if (window.WEBFLOW_API && window.WEBFLOW_API.cache) {
            // Beim Erstellen eines Videos den video-feed-Cache löschen
            window.WEBFLOW_API.cache.removePattern('video');
            window.WEBFLOW_API.cache.removePattern('feed');
            
            DEBUG.log('Video erstellt, relevante Cache-Einträge gelöscht', null, 'info');
        }
    });
    
    document.addEventListener('videoDeleted', (e) => {
        if (window.WEBFLOW_API && window.WEBFLOW_API.cache) {
            // Beim Löschen eines Videos den Cache vollständig leeren
            window.WEBFLOW_API.cache.clear();
            
            DEBUG.log('Video gelöscht, Cache geleert', null, 'info');
        }
    });
})();
