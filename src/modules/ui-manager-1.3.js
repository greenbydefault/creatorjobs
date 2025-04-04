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
        
        /**
         * Sucht ein Element per ID oder Fallback-Selektor
         * @param {string} name - Name für das Element im elements-Objekt
         * @param {string} id - Element-ID
         * @param {string} fallbackSelector - Optional: CSS-Selektor als Fallback
         * @returns {HTMLElement|null} - Gefundenes Element oder null
         */
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
        
        /**
         * Aktualisiert die Anzeige des Membership-Status
         * @param {string} status - Mitgliedschaftsstatus (z.B. "Free", "Plus")
         */
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
        
        /**
         * Aktualisiert den Upload-Counter und zugehörige UI-Elemente
         * @param {number} videoCount - Aktuelle Anzahl an Videos
         * @param {number} maxUploads - Maximale Anzahl an Uploads
         * @returns {boolean} - True wenn das Limit erreicht ist
         */
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
        
        /**
         * Zeigt einen Ladezustand im Video-Container an
         */
        showLoading() {
            const container = this.elements.videoContainer;
            if (!container) {
                DEBUG.log('Video-Container zum Anzeigen des Ladevorgangs nicht gefunden!', null, 'warn');
                return;
            }
            
            // Ladezustand anzeigen
            container.innerHTML = `
                <div class="db-card loading-state">
                    <div class="is-upload-loading">
                        <div class="is-spinner"></div>
                        <p>Lade Videos...</p>
                    </div>
                </div>
            `;
            DEBUG.log('Ladeanimation wird angezeigt');
        }
        
        /**
         * Zeigt eine Fehlermeldung im Video-Container an
         * @param {string} message - Fehlermeldung
         */
        showError(message) {
            const container = this.elements.videoContainer;
            if (!container) {
                DEBUG.log('Video-Container zum Anzeigen der Fehlermeldung nicht gefunden!', null, 'error');
                alert(message); // Fallback: Alert zeigen
                return;
            }
            
            // Fehlermeldung anzeigen
            container.innerHTML = `
                <div class="db-card error-state">
                    <div class="is-upload-error">
                        <div class="is-error-icon">⚠️</div>
                        <h4>Fehler beim Laden der Videos</h4>
                        <p>${message}</p>
                        <button class="db-reload-button" onclick="window.location.reload()">Seite neu laden</button>
                    </div>
                </div>
            `;
            DEBUG.log('Fehlermeldung wird angezeigt', message, 'error');
        }
        
        /**
         * Erstellt einen Upload-Button für den Leerstand
         * @returns {string} - HTML für den Upload-Button
         */
        createEmptyStateUploadButton() {
            // Prüfe, ob das Limit bereits erreicht ist
            if (this.elements.uploadLimitMessage && 
                this.elements.uploadLimitMessage.style.display === "block") {
                return `<div class="db-limit-message">Upload-Limit erreicht</div>`;
            }
            
            return `
                <a href="#" class="db-upload-button w-button" data-modal-toggle="new-upload">
                    Video hochladen
                </a>
            `;
        }
        
        /**
         * Rendert die Video-Karten im Container
         * @param {Array} videos - Array mit Video-Daten
         * @param {Number} maxUploads - Maximale Anzahl an Uploads
         */
        renderVideos(videos, maxUploads) {
            const container = this.elements.videoContainer;
            if (!container) {
                DEBUG.log('Video-Container nicht gefunden!', null, 'error');
                return;
            }
            
            DEBUG.log(`Rendere ${videos.length} Videos`);
            
            // Zurücksetzen des Containers
            container.innerHTML = '';
            
            // Upload-Counter aktualisieren
            this.updateUploadCounter(videos.length, maxUploads);
            
            // Wenn keine Videos vorhanden sind, zeige Leerstand-Nachricht
            if (!videos || videos.length === 0) {
                DEBUG.log('Keine Videos vorhanden, zeige Leerstand');
                container.innerHTML = `
                    <div class="db-card empty-state">
                        <div class="is-upload-empty">
                            <h4>Du hast noch keine Videos hochgeladen</h4>
                            <p>Starte jetzt und lade dein erstes Video hoch.</p>
                            ${this.createEmptyStateUploadButton()}
                        </div>
                    </div>
                `;
                return;
            }
            
            // WICHTIG: Immer alle vorhandenen Videos anzeigen, unabhängig vom Limit
            
            // Sortiere Videos nach Datum (neueste zuerst), falls verfügbar
            const sortedVideos = [...videos];
            
            // Erzeuge HTML für jedes Video
            sortedVideos.forEach(video => {
                try {
                    // Logge das komplette Video-Objekt zur Analyse
                    // DEBUG.log("Verarbeite Video-Objekt:", video);
                    
                    // Verbesserte Überprüfung für die tatsächliche Datenstruktur
                    // Wir akzeptieren jetzt verschiedene Feldnamen-Formate
                    const videoId = video.id || "";
                    
                    // Verbesserte Extraktion des Namens
                    const videoName = 
                        video.name || 
                        video["video-name"] || 
                        (video.fieldData && (video.fieldData["video-name"] || video.fieldData.name)) || 
                        "Unbenanntes Video";
                    
                    // Verbesserte Extraktion der Beschreibung
                    const videoDescription = 
                        video.description || 
                        video["video-beschreibung"] || 
                        (video.fieldData && video.fieldData["video-beschreibung"]) || 
                        "";
                    
                    // Verbesserte Extraktion des Video-Links
                    const videoLink = 
                        video.videoLink || 
                        video["video-link"] || 
                        (video.fieldData && video.fieldData["video-link"]) || 
                        "";
                    
                    // Verbesserte Überprüfung der erforderlichen Daten
                    if (!videoId) {
                        DEBUG.log("Video hat keine ID und wird übersprungen", video, 'warn');
                        return;
                    }
                    
                    // Verbesserte Extraktion der Kategorie
                    const videoKategorie = 
                        video.kategorie || 
                        video["video-kategorie"] || 
                        (video.fieldData && video.fieldData["video-kategorie"]) ||
                        "";
                    
                    // Kategorie-Namen aus Mapping ermitteln oder aus dem Objekt extrahieren
                    let kategorieName = "Sonstige";
                    if (CONFIG.CATEGORY_MAPPING && CONFIG.CATEGORY_MAPPING[videoKategorie]) {
                        kategorieName = CONFIG.CATEGORY_MAPPING[videoKategorie];
                    } else if (video["kategorie-name"]) {
                        kategorieName = video["kategorie-name"];
                    }
                    
                    // Video-Karte erstellen
                    const videoCard = document.createElement('div');
                    videoCard.className = 'db-card';
                    videoCard.setAttribute('data-video-id', videoId);
                    
                    // Thumbnail URL ermitteln, verwende Video-Link als Fallback
                    const thumbnailUrl = videoLink;
                    
                    // HTML-Inhalt der Karte
                    videoCard.innerHTML = `
                        <div class="db-card-image">
                            <div class="db-view-wrapper">
                                <div class="db-preview" style="background-image: url('${thumbnailUrl}')">
                                    <a href="${videoLink}" class="db-video-preview w-inline-block" target="_blank">
                                        <div class="db-watch"></div>
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div class="db-card-content">
                            <div class="db-card-top">
                                <div class="db-card-name-wrap">
                                    <h4 class="db-card-name">${videoName}</h4>
                                </div>
                                <div class="is-txt-14 is-light">${kategorieName}</div>
                            </div>
                            <div class="db-card-description">
                                <p>${videoDescription}</p>
                            </div>
                            <div class="db-card-bottom">
                                <a href="#" class="db-card-edit w-button" data-video-edit="${videoId}">Bearbeiten</a>
                            </div>
                        </div>
                    `;
                    
                    // Event-Listener für Edit-Button hinzufügen
                    const editButton = videoCard.querySelector(`[data-video-edit="${videoId}"]`);
                    if (editButton) {
                        editButton.addEventListener('click', (e) => {
                            e.preventDefault();
                            if (window.editVideo && typeof window.editVideo === 'function') {
                                window.editVideo(videoId);
                            } else {
                                DEBUG.log('editVideo-Funktion nicht verfügbar', null, 'warn');
                            }
                        });
                    }
                    
                    // Video-Karte zum Container hinzufügen
                    container.appendChild(videoCard);
                    
                } catch (error) {
                    DEBUG.log(`Fehler beim Rendern von Video:`, error, 'error');
                }
            });
        }
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.UI = new UIManager();
})();
