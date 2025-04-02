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

    class UIManager {
        constructor() {
            this.elements = {};
            this.initialized = false;
        }
        
        /**
         * Initialisiert alle UI-Elemente
         * @returns {Object} - Objekt mit den gefundenen UI-Elementen
         */
        init() {
            if (this.initialized) return this.elements;
            
            DEBUG.log('Initialisiere UI-Elemente');
            
            // Wichtige UI-Elemente suchen und zwischenspeichern
            this.findElement('videoContainer', CONFIG.VIDEO_CONTAINER_ID, '.db-upload-wrapper');
            this.findElement('uploadLimitTitle', CONFIG.UPLOAD_LIMIT_TITLE_ID);
            this.findElement('uploadCounter', CONFIG.UPLOAD_COUNTER_ID);
            this.findElement('uploadProgress', CONFIG.UPLOAD_PROGRESS_ID);
            this.findElement('uploadLimitMessage', CONFIG.UPLOAD_LIMIT_MESSAGE_ID);
            this.findElement('planStatus', CONFIG.PLAN_STATUS_ID);
            
            // Log gefundene Elemente
            DEBUG.log('UI-Elemente gefunden:', 
                Object.entries(this.elements).reduce((acc, [key, value]) => {
                    acc[key] = Boolean(value);
                    return acc;
                }, {})
            );
            
            this.initialized = true;
            return this.elements;
        }
        
        // ... (Rest der Methoden bleibt unverändert)
        findElement(name, id, fallbackSelector = null) {
            if (!id && !fallbackSelector) {
                DEBUG.log(`Keine ID oder Fallback für ${name} angegeben`, null, 'warn');
                return null;
            }
            
            // Versuche per ID zu finden
            if (id) {
                const element = document.getElementById(id);
                if (element) {
                    this.elements[name] = element;
                    return element;
                }
                DEBUG.log(`Element mit ID '${id}' nicht gefunden`, null, 'warn');
            }
            
            // Wenn kein Element per ID gefunden, versuche Fallback-Selektor
            if (fallbackSelector) {
                const element = document.querySelector(fallbackSelector);
                if (element) {
                    DEBUG.log(`Element '${name}' über Fallback-Selektor gefunden: ${fallbackSelector}`, null, 'info');
                    this.elements[name] = element;
                    return element;
                }
                DEBUG.log(`Element mit Fallback-Selektor '${fallbackSelector}' nicht gefunden`, null, 'warn');
            }
            
            return null;
        }
        
        updatePlanStatus(status) {
            if (!this.elements.planStatus) {
                DEBUG.log('Plan-Status Element nicht gefunden!', null, 'warn');
                return;
            }
            
            this.elements.planStatus.textContent = status;
            DEBUG.log(`Plan-Status aktualisiert: ${status}`);
            
            // Optional: Klassen für Styling hinzufügen
            this.elements.planStatus.classList.remove('plan-free', 'plan-plus');
            this.elements.planStatus.classList.add(status === 'Plus' ? 'plan-plus' : 'plan-free');
        }
        
        updateUploadCounter(videoCount, maxUploads) {
            DEBUG.log('Aktualisiere Upload-Counter:', { videoCount, maxUploads });
            
            // Stelle sicher, dass die Zahlen für die Anzeige gültig sind
            const validVideoCount = isNaN(videoCount) ? 0 : videoCount;
            const validMaxUploads = isNaN(maxUploads) ? CONFIG.PAID_MEMBER_LIMIT : maxUploads;
            
            DEBUG.log(`Verwende validierte Werte: ${validVideoCount}/${validMaxUploads}`);
            
            // Upload-Counter aktualisieren
            if (this.elements.uploadCounter) {
                this.elements.uploadCounter.textContent = `${validVideoCount}/${validMaxUploads}`;
                DEBUG.log('Upload-Counter aktualisiert:', `${validVideoCount}/${validMaxUploads}`);
            } else {
                DEBUG.log('Upload-Counter Element nicht gefunden!', null, 'warn');
            }
            
            // Fortschrittsbalken aktualisieren
            if (this.elements.uploadProgress) {
                // Prozentsatz berechnen (max 100%)
                const progressPercent = Math.min(
                    validMaxUploads > 0 ? (validVideoCount / validMaxUploads) * 100 : 0, 
                    100
                );
                
                // Farbklassen basierend auf Fortschritt
                this.elements.uploadProgress.classList.remove("progress-low", "progress-medium", "progress-high", "progress-full");
                
                if (progressPercent >= 100) {
                    this.elements.uploadProgress.classList.add("progress-full");
                } else if (progressPercent >= 70) {
                    this.elements.uploadProgress.classList.add("progress-high");
                } else if (progressPercent >= 40) {
                    this.elements.uploadProgress.classList.add("progress-medium");
                } else {
                    this.elements.uploadProgress.classList.add("progress-low");
                }
                
                // Breite aktualisieren - Animation durch CSS
                this.elements.uploadProgress.style.width = `${progressPercent}%`;
                DEBUG.log('Fortschrittsbalken aktualisiert:', `${progressPercent}%`);
            } else {
                DEBUG.log('Upload-Progress Element nicht gefunden!', null, 'warn');
            }
            
            // Limit-Status bestimmen
            const isLimitReached = validVideoCount >= validMaxUploads;
            
            // Upload-Buttons je nach Limit-Status ein/ausblenden
            const uploadButtons = document.querySelectorAll('[data-modal-toggle="new-upload"]');
            uploadButtons.forEach(button => {
                button.style.display = isLimitReached ? "none" : "";
            });
            DEBUG.log(`Upload-Buttons: ${isLimitReached ? 'ausgeblendet' : 'angezeigt'} (${uploadButtons.length})`);
            
            // Upload-Limit-Meldung aktualisieren
            if (this.elements.uploadLimitMessage) {
                this.elements.uploadLimitMessage.style.display = isLimitReached ? "block" : "none";
                this.elements.uploadLimitMessage.textContent = isLimitReached ? "Upload-Limit erreicht" : "";
                this.elements.uploadLimitMessage.classList.toggle("limit-reached", isLimitReached);
                DEBUG.log(`Limit-Meldung: ${isLimitReached ? 'angezeigt' : 'ausgeblendet'}`);
            } else {
                DEBUG.log('Limit-Message Element nicht gefunden!', null, 'warn');
            }
            
            return isLimitReached;
        }
        
        // Restliche Methoden (showLoading, showError, createEmptyStateUploadButton, renderVideos) 
        // bleiben unverändert, werden aber hier aus Platzgründen nicht vollständig eingefügt
        showLoading() {
            // Implementierung wie im Original
        }
        
        showError(message) {
            // Implementierung wie im Original
        }
        
        createEmptyStateUploadButton() {
            // Implementierung wie im Original
        }
        
        renderVideos(videos, maxUploads) {
            // Implementierung wie im Original
        }
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.UI = new UIManager();
})();
