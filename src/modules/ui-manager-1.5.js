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
            
            // Skeleton-Styles initialisieren
            this.initSkeletonStyles();
            
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
         * Initialisiert die CSS-Styles für die Skeleton-Loader
         */
        initSkeletonStyles() {
            if (document.getElementById('skeleton-styles')) return;
            
            DEBUG.log('Initialisiere Skeleton-Styles');
            
            const styleEl = document.createElement('style');
            styleEl.id = 'skeleton-styles';
            styleEl.textContent = `
                @keyframes skeletonPulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 0.8; }
                    100% { opacity: 0.6; }
                }
                
                .skeleton-item {
                    animation: skeletonPulse 1.5s ease-in-out infinite;
                }
                
                .skeleton-video {
                    background-color: #e6e6e6;
                    min-height: 180px;
                    border-radius: 8px;
                }
                
                .skeleton-text {
                    background-color: #e6e6e6;
                    height: 16px;
                    margin: 8px 0;
                    border-radius: 4px;
                }
                
                .skeleton-title {
                    width: 80%;
                    height: 20px;
                }
                
                .skeleton-category {
                    width: 60%;
                    height: 14px;
                }
                
                .skeleton-button {
                    background-color: #e6e6e6;
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                }
                
                .skeleton-details-container {
                    display: flex;
                    flex-direction: column;
                    flex: 1;
                }
            `;
            
            document.head.appendChild(styleEl);
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
         * Zeigt Skeleton-Loader im Video-Container an
         * @param {number} count - Anzahl der anzuzeigenden Skeleton-Items
         */
        showLoading(count = 3) {
            const container = this.elements.videoContainer;
            if (!container) {
                DEBUG.log('Video-Container zum Anzeigen des Skeleton-Loaders nicht gefunden!', null, 'warn');
                return;
            }
            
            // Container leeren
            container.innerHTML = '';
            
            DEBUG.log(`Zeige ${count} Skeleton-Loader an`);
            
            // Skeleton-Items einfügen
            for (let i = 0; i < count; i++) {
                const skeletonItem = this.createSkeletonItem();
                container.appendChild(skeletonItem);
            }
        }
        
        /**
         * Erstellt ein einzelnes Skeleton-Item, das einem Video-Element entspricht
         * @returns {HTMLElement} - Das Skeleton-Item-Element
         */
        createSkeletonItem() {
            // Wrapper-Element erstellen
            const wrapperDiv = document.createElement("div");
            wrapperDiv.classList.add("db-upload-wrapper-item", "skeleton-item");
            
            // Video-Platzhalter
            const videoDiv = document.createElement("div");
            videoDiv.classList.add("db-upload-item-video", "skeleton-video");
            
            // Details-Container
            const detailsDiv = document.createElement("div");
            detailsDiv.classList.add("db-upload-item-details");
            
            // Details-Container für Titel und Kategorie
            const detailsContainerDiv = document.createElement("div");
            detailsContainerDiv.classList.add("db-upload-details-container", "skeleton-details-container");
            
            // Titel-Platzhalter
            const titleDiv = document.createElement("div");
            titleDiv.classList.add("db-upload-video-title", "skeleton-text", "skeleton-title");
            
            // Kategorie-Platzhalter
            const categoryP = document.createElement("div");
            categoryP.classList.add("is-txt-tiny", "skeleton-text", "skeleton-category");
            
            // Edit-Button-Platzhalter
            const editButton = document.createElement("div");
            editButton.classList.add("db-upload-settings", "skeleton-button");
            
            // Struktur zusammenfügen (wie bei echten Videos)
            detailsContainerDiv.appendChild(titleDiv);
            detailsContainerDiv.appendChild(categoryP);
            detailsDiv.appendChild(detailsContainerDiv);
            detailsDiv.appendChild(editButton);
            
            wrapperDiv.appendChild(videoDiv);
            wrapperDiv.appendChild(detailsDiv);
            
            return wrapperDiv;
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
                <div class="db-upload-empty-state">
                    <a href="#" class="db-upload-more-upload-button" data-modal-toggle="new-upload">
                        Lade dein erstes Video hoch
                    </a>
                </div>
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
                container.innerHTML = this.createEmptyStateUploadButton();
                return;
            }
            
            // WICHTIG: Immer alle vorhandenen Videos anzeigen, unabhängig vom Limit
            
            // DocumentFragment für bessere Performance
            const fragment = document.createDocumentFragment();
            
            // Videos rendern
            videos.forEach(videoData => {
                try {
                    // Verbesserte Überprüfung für die tatsächliche Datenstruktur
                    const videoId = videoData.id || "";
                    const videoName = videoData["video-name"] || "Unbenanntes Video";
                    const videoLink = videoData["video-link"] || "";
                    const videoKategorie = videoData["video-kategorie"] || "";
                    const kategorieName = videoData["kategorie-name"] || "Sonstige";
                    
                    // Verbesserte Überprüfung der erforderlichen Daten
                    if (!videoId || !videoLink) {
                        DEBUG.log("Video hat keine ID oder Link und wird übersprungen", videoData, 'warn');
                        return;
                    }
                    
                    // Erstelle die exakt gleiche HTML-Struktur wie in der alten Implementierung
                    const wrapperDiv = document.createElement("div");
                    wrapperDiv.classList.add("db-upload-wrapper-item");
                    wrapperDiv.setAttribute('data-video-id', videoId);
                    
                    // Video-Element
                    const videoDiv = document.createElement("div");
                    videoDiv.classList.add("db-upload-item-video");
                    
                    const videoElement = document.createElement("video");
                    videoElement.src = videoLink;
                    videoElement.controls = true;
                    videoElement.classList.add("db-upload-video");
                    
                    // Error-Handler für Videofehler
                    videoElement.addEventListener("error", () => {
                        videoDiv.innerHTML = `
                            <div class="video-error">
                                <p>Video konnte nicht geladen werden</p>
                            </div>
                        `;
                    });
                    
                    videoDiv.appendChild(videoElement);
                    
                    // Details-Container
                    const detailsDiv = document.createElement("div");
                    detailsDiv.classList.add("db-upload-item-details");
                    
                    // Container für Titel und Kategorie
                    const detailsContainerDiv = document.createElement("div");
                    detailsContainerDiv.classList.add("db-upload-details-container");
                    
                    // Titel
                    const titleDiv = document.createElement("div");
                    titleDiv.classList.add("db-upload-video-title");
                    titleDiv.textContent = videoName;
                    
                    // Kategorie
                    const categoryP = document.createElement("p");
                    categoryP.classList.add("is-txt-tiny");
                    categoryP.textContent = kategorieName;
                    
                    // Edit-Button
                    const editButton = document.createElement("button");
                    editButton.classList.add("db-upload-settings");
                    editButton.setAttribute("data-video-edit", videoId);
                    editButton.innerHTML = `<img src="https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/678a26c04581673826145b8b_settings.svg" alt="Bearbeiten">`;
                    editButton.title = "Video bearbeiten";
                    
                    // Event-Handler für Edit-Button
                    editButton.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        if (window.editVideo && typeof window.editVideo === 'function') {
                            window.editVideo(videoId);
                        } else {
                            DEBUG.log('editVideo-Funktion nicht verfügbar', null, 'warn');
                            
                            // Fallback: Event auslösen
                            const editEvent = new CustomEvent('videoEditRequest', { 
                                detail: { videoId: videoId } 
                            });
                            document.dispatchEvent(editEvent);
                        }
                    });
                    
                    // Struktur zusammenfügen
                    detailsContainerDiv.appendChild(titleDiv);
                    detailsContainerDiv.appendChild(categoryP);
                    detailsDiv.appendChild(detailsContainerDiv);
                    detailsDiv.appendChild(editButton);
                    
                    wrapperDiv.appendChild(videoDiv);
                    wrapperDiv.appendChild(detailsDiv);
                    
                    // Wrapper zum Fragment hinzufügen
                    fragment.appendChild(wrapperDiv);
                    
                } catch (error) {
                    DEBUG.log(`Fehler beim Rendern von Video:`, error, 'error');
                }
            });
            
            // Alle Video-Elemente auf einmal anhängen
            container.appendChild(fragment);
            
            // Button für neue Videos hinzufügen, wenn Limit nicht erreicht
            const isLimitReached = videos.length >= maxUploads;
            
            if (!isLimitReached && videos.length > 0) {
                const addButtonContainer = document.createElement("div");
                addButtonContainer.classList.add("db-upload-add-new");
                
                const addButton = document.createElement("a");
                addButton.href = "#";
                addButton.classList.add("db-upload-more-upload-button");
                addButton.setAttribute("data-modal-toggle", "new-upload");
                addButton.textContent = "Video hinzufügen";
                
                addButtonContainer.appendChild(addButton);
                container.appendChild(addButtonContainer);
            }
            
            DEBUG.log(`${videos.length} Videos gerendert, maxUploads = ${maxUploads}`);
        }
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.UI = new UIManager();
})();
