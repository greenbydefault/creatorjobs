// src/modules/video-edit-app.js
import { CONFIG } from '../config.js';
import { DEBUG } from './debug.js';
import { VIDEO_API } from './video-api.js';
import { MEMBER_API } from './member-api.js';
import { UPLOADCARE } from './uploadcare.js';

class VideoEditApp {
    constructor() {
        this.currentVideoData = null;
    }
    
    /**
     * Initialisiert die App
     */
    init() {
        DEBUG.log('Initialisiere Video-Edit App');
        
        // Event-Listener für Edit-Button initialisieren
        this.initVideoEditButtons();
        
        // Event-Listener für Save-Button initialisieren
        this.initSaveButton();
        
        // Event-Listener für Delete-Button initialisieren
        this.initDeleteButton();
        
        // EditVideo-Funktion global verfügbar machen
        window.editVideo = this.editVideo.bind(this);
        
        // Event-Listener für Edit-Requests aus anderen Skripten
        document.addEventListener('videoEditRequest', (e) => {
            if (e.detail && e.detail.videoId) {
                DEBUG.log("Edit-Event empfangen für Video ID:", e.detail.videoId);
                this.editVideo(e.detail.videoId);
            }
        });
    }
    
    /**
     * Video bearbeiten - Öffnet das Modal und füllt die Felder
     */
    async editVideo(videoId) {
        if (!videoId) {
            DEBUG.log("Keine Video-ID zum Bearbeiten übergeben", null, 'error');
            return;
        }

        DEBUG.log(`Lade Video-Informationen für ID: ${videoId}`);

        try {
            // Hole die Video-Informationen vom Webflow CMS
            const videoData = await VIDEO_API.getVideoById(videoId);
            
            if (!videoData) {
                throw new Error(`Video mit ID ${videoId} konnte nicht geladen werden`);
            }

            // Speichere das aktuelle Video für spätere Verwendung
            this.currentVideoData = videoData;

            // Öffne das Edit-Modal
            const editModal = document.querySelector(`[data-modal-id="${CONFIG.EDIT_MODAL_ID}"]`);
            if (editModal && window.modalManager) {
                window.modalManager.openModal(editModal);
            } else {
                DEBUG.log("Modal oder Modal-Manager nicht gefunden", null, 'warn');
            }

            // Fülle die Formularfelder mit den vorhandenen Daten
            await this.fillEditForm(videoData);

            // Initialisiere die Zeichenzähler für die Text-Eingabefelder
            this.initCharacterCounters();

        } catch (error) {
            DEBUG.log("Fehler beim Laden der Video-Informationen:", error, 'error');
            alert("Das Video konnte nicht geladen werden. Bitte versuche es später erneut.");
        }
    }
    
    /**
     * Formular mit Video-Daten füllen
     */
    async fillEditForm(videoData) {
        if (!videoData || !videoData.fieldData) {
            DEBUG.log("Keine Video-Daten zum Füllen des Formulars", null, 'warn');
            return;
        }

        // Suche nach dem Formular
        const form = document.getElementById(CONFIG.EDIT_FORM_ID) || 
                    document.querySelector(`[data-modal-id="${CONFIG.EDIT_MODAL_ID}"] form`);
        
        if (!form) {
            DEBUG.log("Edit-Formular nicht gefunden", null, 'warn');
            return;
        }

        // Hilfsfunktion zum Setzen von Feldwerten
        function setFieldValue(fieldName, value) {
            // Suche nach verschiedenen Selector-Varianten
            const selectors = [
                `[name="${fieldName}"]`,
                `[data-name="${fieldName}"]`, 
                `#${fieldName.replace(/\s+/g, "-").toLowerCase()}`
            ];
            
            let field = null;
            
            // Versuche verschiedene Selektoren
            for (const selector of selectors) {
                field = form.querySelector(selector);
                if (field) break;
            }
            
            if (!field) {
                DEBUG.log(`Feld '${fieldName}' nicht gefunden`, null, 'warn');
                return;
            }
            
            // Setze den Wert je nach Feldtyp
            if (field.type === 'checkbox') {
                field.checked = !!value;
            } else {
                field.value = value || "";
            }
            
            DEBUG.log(`Feld '${fieldName}' gesetzt:`, value);
        }
        
        // Versuche, die Kategorie-ID in einen lesbaren Namen umzuwandeln
        let categoryValue = videoData.fieldData["video-kategorie"];
        let categoryName = categoryValue;
        
        // Versuche, den Kategorie-Namen aus dem Mapping zu finden
        if (categoryValue && typeof categoryValue === 'string') {
            DEBUG.log(`Suche Kategorie-Mapping für ID: ${categoryValue}`);
            
            // Prüfe, ob die Kategorie-ID im Mapping existiert
            if (CONFIG.CATEGORY_MAPPING && CONFIG.CATEGORY_MAPPING[categoryValue]) {
                categoryName = CONFIG.CATEGORY_MAPPING[categoryValue];
                DEBUG.log(`Kategorie-Name aus Mapping gefunden: ${categoryName} für ID: ${categoryValue}`);
            } else {
                DEBUG.log(`Keine Kategorie-Zuordnung für ID: ${categoryValue}`, null, 'warn');
            }
        }
        
        // Felder füllen
        setFieldValue(CONFIG.EDIT_NAME_FIELD, videoData.fieldData["video-name"] || videoData.fieldData["name"]);
        setFieldValue(CONFIG.EDIT_CATEGORY_FIELD, categoryName);
        setFieldValue(CONFIG.EDIT_DESCRIPTION_FIELD, videoData.fieldData["video-beschreibung"]);
        setFieldValue(CONFIG.EDIT_PUBLIC_FIELD, videoData.fieldData["offentliches-video"]);
    }
    
    /**
     * Initialisiere die Zeichenzähler für Name und Beschreibung
     */
    initCharacterCounters() {
        const form = document.getElementById(CONFIG.EDIT_FORM_ID) || 
                    document.querySelector(`[data-modal-id="${CONFIG.EDIT_MODAL_ID}"] form`);
        
        if (!form) {
            DEBUG.log("Formular für Zeichenzähler nicht gefunden", null, 'warn');
            return;
        }
        
        // Finde die Eingabefelder und ihre Counter-Elemente
        const nameField = this.findField(form, CONFIG.EDIT_NAME_FIELD);
        const descriptionField = this.findField(form, CONFIG.EDIT_DESCRIPTION_FIELD);
        
        if (nameField) {
            this.setupCharacterCounter(nameField, CONFIG.NAME_CHAR_LIMIT);
        }
        
        if (descriptionField) {
            this.setupCharacterCounter(descriptionField, CONFIG.DESCRIPTION_CHAR_LIMIT);
        }
        
        DEBUG.log("Zeichenzähler initialisiert");
    }
    
    /**
     * Hilfsfunktion zum Finden eines Formularfeldes
     */
    findField(form, fieldName) {
        const selectors = [
            `[name="${fieldName}"]`,
            `[data-name="${fieldName}"]`, 
            `#${fieldName.replace(/\s+/g, "-").toLowerCase()}`
        ];
        
        for (const selector of selectors) {
            const field = form.querySelector(selector);
            if (field) return field;
        }
        
        DEBUG.log(`Feld '${fieldName}' für Zeichenzähler nicht gefunden`, null, 'warn');
        return null;
    }
    
    /**
     * Zeichenzähler für ein Feld einrichten
     */
    setupCharacterCounter(field, limit) {
        // Prüfe, ob das Feld ein Counter-Element angegeben hat
        const counterSelector = field.getAttribute('data-char-counter');
        let counterElement = null;
        
        if (counterSelector) {
            // Wenn ein Selektor im data-Attribut angegeben ist, suche das Element
            counterElement = document.querySelector(counterSelector);
        } else {
            // Wenn kein Selektor angegeben ist, erstelle ein neues Element
            const counterEl = document.createElement('div');
            counterEl.className = 'char-counter';
            counterEl.style.marginTop = '5px';
            counterEl.style.fontSize = '12px';
            counterEl.style.color = '#666';
            
            // Füge das Counter-Element nach dem Feld ein
            field.parentNode.insertBefore(counterEl, field.nextSibling);
            counterElement = counterEl;
        }
        
        if (!counterElement) {
            DEBUG.log("Kein Counter-Element für Feld gefunden:", field, 'warn');
            return;
        }
        
        // Setze den Grenzwert als Attribut am Feld
        field.setAttribute('data-char-limit', limit);
        
        // Initiale Aktualisierung des Zählers
        this.updateCharCounter(field, counterElement);
        
        // Event-Listener für Eingaben
        field.addEventListener('input', () => {
            this.updateCharCounter(field, counterElement);
        });
        
        DEBUG.log(`Zeichenzähler für Feld eingerichtet, Limit: ${limit}`);
    }
    
    /**
     * Aktualisiert den Zeichenzähler für ein Feld
     */
    updateCharCounter(field, counterElement) {
        const limit = parseInt(field.getAttribute('data-char-limit') || "0", 10);
        const currentLength = field.value.length;
        const remaining = limit - currentLength;
        
        // Aktualisiere den Text des Zählers
        counterElement.textContent = `${currentLength}/${limit} Zeichen`;
        
        // Visuelles Feedback zum Zeichenlimit
        if (remaining < 0) {
            // Über dem Limit
            counterElement.style.color = '#cc0000';
            field.style.borderColor = '#cc0000';
        } else if (remaining < limit * 0.1) {
            // Fast am Limit (weniger als 10% übrig)
            counterElement.style.color = '#ff9900';
            field.style.borderColor = '#ff9900';
        } else {
            // Genug Platz
            counterElement.style.color = '#666';
            field.style.borderColor = '';
        }
    }
    
    /**
     * Event-Listener für Edit-Button initialisieren
     */
    initVideoEditButtons() {
        // Suchen nach allen Edit-Buttons mit data-video-id Attribut
        const editButtons = document.querySelectorAll('[data-video-edit]');
        
        editButtons.forEach(button => {
            const videoId = button.getAttribute('data-video-edit');
            if (videoId) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation(); // Verhindert, dass das Event an übergeordnete Elemente weitergegeben wird
                    this.editVideo(videoId);
                });
            }
        });
        
        DEBUG.log(`${editButtons.length} Video-Edit-Buttons initialisiert`);
    }
    
    /**
     * Event-Listener für Save-Button initialisieren
     */
    initSaveButton() {
        // Finde den Save-Button im Edit-Modal
        const saveButton = document.getElementById(CONFIG.EDIT_SAVE_BUTTON);
        
        if (!saveButton) {
            const editModal = document.querySelector(`[data-modal-id="${CONFIG.EDIT_MODAL_ID}"]`);
            if (editModal) {
                // Suche nach einem Button im Modal
                const fallbackButton = editModal.querySelector('input[type="submit"], button[type="submit"]');
                if (fallbackButton) {
                    DEBUG.log("Verwende Fallback-Button zum Speichern");
                    this.initSaveButtonListener(fallbackButton);
                    return;
                }
            }
            
            DEBUG.log("Kein Save-Button gefunden", null, 'warn');
            return;
        }
        
        this.initSaveButtonListener(saveButton);
    }
    
    /**
     * Event-Listener für einen Save-Button registrieren
