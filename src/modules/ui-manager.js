// src/modules/ui-manager.js
import { CONFIG } from '../config.js';
import { DEBUG } from './debug.js';

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
     * Sucht ein Element per ID mit Fallback auf Klasse
     * @param {string} name - Name für das gespeicherte Element
     * @param {string} id - ID des Elements
     * @param {string} fallbackSelector - Optionaler Fallback-Selektor
     * @returns {HTMLElement|null} - Das gefundene Element oder null
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
     * Zeigt den Mitgliedschaftsplan-Status an
     * @param {string} status - Der Status (Free/Plus)
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
     * Aktualisiert den Upload-Counter und Fortschrittsbalken
     * @param {number} videoCount - Anzahl der Videos
     * @param {number} maxUploads - Maximale Anzahl von Uploads
     * @returns {boolean} - true, wenn das Limit erreicht ist
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
     * Zeigt eine Ladeanimation im Container an
     */
    showLoading() {
        if (!this.elements.videoContainer) {
            DEBUG.log('Video-Container nicht gefunden, kann Ladeanimation nicht anzeigen', null, 'warn');
            return;
        }
        
        // Container leeren
        this.elements.videoContainer.innerHTML = '';
        
        // CSS für Skeleton Loader hinzufügen, falls noch nicht vorhanden
        if (!document.getElementById('skeleton-loader-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'skeleton-loader-styles';
            styleElement.textContent = `
                .skeleton-item {
                    position: relative;
                    overflow: hidden;
                }
                .skeleton-video-pulse, .skeleton-text-pulse, .skeleton-button-pulse {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: skeleton-pulse 1.5s ease-in-out infinite;
                    border-radius: 4px;
                }
                .skeleton-video-pulse {
                    width: 100%;
                    height: 100%;
                    min-height: 180px;
                }
                .skeleton-button-pulse {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                }
                @keyframes skeleton-pulse {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
            `;
            document.head.appendChild(styleElement);
        }
        
        // DocumentFragment für bessere Performance
        const fragment = document.createDocumentFragment();
        
        // Erstelle 3 Skeleton-Items
        for (let i = 0; i < 3; i++) {
            const skeleton = document.createElement('div');
            skeleton.classList.add('db-upload-wrapper-item', 'skeleton-item');
            
            skeleton.innerHTML = `
                <div class="db-upload-item-video skeleton-video">
                    <div class="skeleton-video-pulse" style="animation-delay: ${i * 0.15}s"></div>
                </div>
                <div class="db-upload-item-details">
                    <div class="db-upload-details-container">
                        <div class="skeleton-text-pulse" style="width: ${70 - i * 10}%; height: 20px; animation-delay: ${i * 0.1}s"></div>
                        <div class="skeleton-text-pulse" style="width: ${40 + i * 5}%; height: 14px; margin-top: 8px; animation-delay: ${i * 0.2}s"></div>
                    </div>
                    <div class="skeleton-button-pulse" style="animation-delay: ${i * 0.25}s"></div>
                </div>
            `;
            
            fragment.appendChild(skeleton);
        }
        
        // Alle Skeleton-Items auf einmal anhängen
        this.elements.videoContainer.appendChild(fragment);
        DEBUG.log('Ladeanimation angezeigt');
    }
    
    /**
     * Zeigt eine Fehlermeldung im Container an
     * @param {string} message - Die anzuzeigende Fehlermeldung
     */
    showError(message) {
        if (!this.elements.videoContainer) {
            DEBUG.log('Video-Container nicht gefunden, kann Fehlermeldung nicht anzeigen', null, 'warn');
            return;
        }
        
        this.elements.videoContainer.innerHTML = `
            <div class="error-message" style="padding: 20px; text-align: center; color: #e53e3e; background-color: #fff5f5; border: 1px solid #e53e3e; border-radius: 4px; margin: 20px 0;">
                <p>🚫 ${message}</p>
                <button style="margin-top: 10px; padding: 6px 12px; background: #4a5568; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="window.WEBFLOW_API.videoFeedApp.loadUserVideos()">
                    Erneut versuchen
                </button>
            </div>
        `;
        DEBUG.log(`Fehlermeldung angezeigt: ${message}`, null, 'error');
    }
    
    /**
     * Erstellt einen "Erstes Video hochladen" Button bei leerem Video-Feed
     */
    createEmptyStateUploadButton() {
        if (!this.elements.videoContainer) {
            DEBUG.log('Video-Container nicht gefunden, kann leeren Zustand nicht anzeigen', null, 'warn');
            return;
        }
        
        const buttonContainer = document.createElement("div");
        buttonContainer.classList.add("db-upload-empty-state");
        
        // Upload-Button mit den notwendigen Attributen
        const uploadButton = document.createElement("a");
        uploadButton.href = "#"; 
        uploadButton.classList.add("db-upload-more-upload-button");
        uploadButton.setAttribute("data-modal-toggle", "new-upload");
        uploadButton.textContent = "Lade dein erstes Video hoch";
        
        buttonContainer.appendChild(uploadButton);
        this.elements.videoContainer.appendChild(buttonContainer);
        DEBUG.log('Leerer Zustand mit Upload-Button angezeigt');
    }
    
    /**
     * Rendert Videos im Container
     * @param {Array} videos - Array mit Video-Daten
     * @param {number} maxUploads - Max. erlaubte Uploads für den User
     */
    renderVideos(videos, maxUploads) {
        if (!this.elements.videoContainer) {
            DEBUG.log('Video-Container nicht gefunden, kann Videos nicht anzeigen', null, 'warn');
            return;
        }
        
        DEBUG.log(`Beginne Rendering von ${videos?.length || 0} Videos mit maxUploads = ${maxUploads}`);
        
        // Container leeren
        this.elements.videoContainer.innerHTML = "";
        
        // Prüfen, ob Videos vorhanden sind
        if (!videos || videos.length === 0) {
            this.createEmptyStateUploadButton();
            this.updateUploadCounter(0, maxUploads); // Expliziter counter update für leeren Zustand
            return;
        }
        
        // Prüfen, ob das Limit erreicht ist
        const isLimitReached = videos.length >= maxUploads;
        
        // DocumentFragment für bessere Performance
        const fragment = document.createDocumentFragment();
        
        // Videos rendern
        videos.forEach(videoData => {
            if (!videoData || !videoData["video-link"]) return;
            
            const wrapperDiv = document.createElement("div");
            wrapperDiv.classList.add("db-upload-wrapper-item");
            
            // Video-Element
            const videoDiv = document.createElement("div");
            videoDiv.classList.add("db-upload-item-video");
            
            const videoElement = document.createElement("video");
            videoElement.src = videoData["video-link"];
            videoElement.controls = true;
            videoElement.classList.add("db-upload-video");
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
            titleDiv.textContent = videoData["video-name"] || "Unbenanntes Video";
            
            // Kategorie - nur den Namen ohne "Kategorie:" davor
            const categoryName = videoData["kategorie-name"] || "Nicht angegeben";
            const categoryP = document.createElement("p");
            categoryP.classList.add("is-txt-tiny");
            categoryP.textContent = categoryName;
            
            // Debug-Ausgabe für Kategorie-Namen
            DEBUG.log(`Video ${videoData.id} verwendet Kategorie "${categoryName}" (Original-ID: "${videoData["video-kategorie"]}")`);
            
            // Edit-Button
            const editButton = document.createElement("button");
            editButton.classList.add("db-upload-settings");
            
            const videoId = videoData.id;
            editButton.setAttribute("data-video-edit", videoId);
            editButton.innerHTML = `<img src="https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/678a26c04581673826145b8b_settings.svg" alt="Bearbeiten">`;
            editButton.title = "Video bearbeiten";
            
            // Event-Handler für Edit-Button
            editButton.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Option 1: Wenn die editVideo-Funktion im globalen Scope ist
                if (typeof window.editVideo === "function") {
                    window.editVideo(videoId);
                } 
                // Option 2: Manuell ein Event auslösen
                else {
                    DEBUG.log(`Edit-Event ausgelöst für Video ID: ${videoId}`);
                    const editEvent = new CustomEvent('videoEditRequest', { 
                        detail: { videoId: videoId } 
                    });
                    document.dispatchEvent(editEvent);
                }
            };
            
            // Struktur zusammenfügen
            detailsContainerDiv.appendChild(titleDiv);
            detailsContainerDiv.appendChild(categoryP);
            detailsDiv.appendChild(detailsContainerDiv);
            detailsDiv.appendChild(editButton);
            
            wrapperDiv.appendChild(videoDiv);
            wrapperDiv.appendChild(detailsDiv);
            
            fragment.appendChild(wrapperDiv);
        });
        
        // Alle Video-Elemente auf einmal anhängen
        this.elements.videoContainer.appendChild(fragment);
        
        // Button für neue Videos hinzufügen, wenn Limit nicht erreicht
        if (!isLimitReached && videos.length > 0) {
            const addButtonContainer = document.createElement("div");
            addButtonContainer.classList.add("db-upload-add-new");
            
            const addButton = document.createElement("a");
            addButton.href = "#";
            addButton.classList.add("db-upload-more-upload-button");
            addButton.setAttribute("data-modal-toggle", "new-upload");
            addButton.textContent = "Video hinzufügen";
            
            addButtonContainer.appendChild(addButton);
            this.elements.videoContainer.appendChild(addButtonContainer);
        }
        
        DEBUG.log(`${videos.length} Videos gerendert, maxUploads = ${maxUploads}`);
        
        // Expliziten Upload-Counter-Update durchführen
        return this.updateUploadCounter(videos.length, maxUploads);
    }
}

// Singleton-Instanz exportieren
export const UI = new UIManager();
