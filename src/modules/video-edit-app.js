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
     */
    initSaveButtonListener(button) {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            
            if (!this.currentVideoData) {
                DEBUG.log("Keine aktuellen Video-Daten zum Speichern", null, 'error');
                return;
            }
            
            // Formular finden
            const form = document.getElementById(CONFIG.EDIT_FORM_ID) || 
                        document.querySelector(`[data-modal-id="${CONFIG.EDIT_MODAL_ID}"] form`);
            
            if (!form) {
                DEBUG.log("Edit-Formular nicht gefunden", null, 'error');
                return;
            }
            
            // Validiere die Zeichenlänge
            const nameField = this.findField(form, CONFIG.EDIT_NAME_FIELD);
            const descField = this.findField(form, CONFIG.EDIT_DESCRIPTION_FIELD);
            
            if (nameField && nameField.value.length > CONFIG.NAME_CHAR_LIMIT) {
                alert(`Der Name darf maximal ${CONFIG.NAME_CHAR_LIMIT} Zeichen lang sein.`);
                nameField.focus();
                return;
            }
            
            if (descField && descField.value.length > CONFIG.DESCRIPTION_CHAR_LIMIT) {
                alert(`Die Beschreibung darf maximal ${CONFIG.DESCRIPTION_CHAR_LIMIT} Zeichen lang sein.`);
                descField.focus();
                return;
            }
            
            // Ändere den Button-Text während des Speicherns
            const originalText = button.value || button.textContent;
            button.disabled = true;
            if (button.type === 'submit') {
                button.value = "Wird gespeichert...";
            } else {
                button.textContent = "Wird gespeichert...";
            }
            
            try {
                // Hole die Formulardaten
                const formData = {
                    name: this.getValue(form, CONFIG.EDIT_NAME_FIELD, this.currentVideoData.fieldData["video-name"] || ""),
                    kategorie: this.getValue(form, CONFIG.EDIT_CATEGORY_FIELD, this.currentVideoData.fieldData["video-kategorie"] || ""),
                    beschreibung: this.getValue(form, CONFIG.EDIT_DESCRIPTION_FIELD, this.currentVideoData.fieldData["video-beschreibung"] || ""),
                    openVideo: this.getChecked(form, CONFIG.EDIT_PUBLIC_FIELD)
                };
                
                // Validiere die Daten
                if (!formData.name) {
                    alert("Bitte gib einen Namen für das Video ein.");
                    return;
                }
                
                DEBUG.log("Formulardaten zum Speichern:", formData);
                
                // Führe das Update durch
                const result = await VIDEO_API.updateVideo(this.currentVideoData.id, formData, this.currentVideoData);
                
                if (result) {
                    DEBUG.log("Video erfolgreich aktualisiert:", result);
                    
                    // Schließe das Modal
                    const editModal = document.querySelector(`[data-modal-id="${CONFIG.EDIT_MODAL_ID}"]`);
                    if (editModal && window.modalManager) {
                        window.modalManager.closeModal(editModal);
                    }
                    
                    // Event auslösen, um den Feed neu zu laden
                    document.dispatchEvent(new CustomEvent('videoFeedUpdate'));
                    
                    // Zeige eine Erfolgsmeldung
                    alert("Video erfolgreich aktualisiert!");
                } else {
                    throw new Error("Unbekannter Fehler beim Aktualisieren des Videos");
                }
            } catch (error) {
                DEBUG.log("Fehler beim Speichern:", error, 'error');
                alert("Fehler beim Speichern der Änderungen. Bitte versuche es erneut.");
            } finally {
                // Button zurücksetzen
                button.disabled = false;
                if (button.type === 'submit') {
                    button.value = originalText;
                } else {
                    button.textContent = originalText;
                }
            }
        });
        
        DEBUG.log("Save-Button initialisiert");
    }
    
    /**
     * Event-Listener für Delete-Button initialisieren
     */
    initDeleteButton() {
        // Finde den Delete-Button im Edit-Modal
        const deleteButton = document.getElementById(CONFIG.EDIT_DELETE_BUTTON);
        
        if (!deleteButton) {
            DEBUG.log("Kein Delete-Button gefunden", null, 'warn');
            return;
        }
        
        deleteButton.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (!this.currentVideoData) {
                DEBUG.log("Keine aktuellen Video-Daten zum Löschen", null, 'error');
                return;
            }
            
            // Bestätigungsdialog anzeigen
            if (confirm("Bist du sicher, dass du dieses Video löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.")) {
                this.handleVideoDelete(this.currentVideoData.id, deleteButton);
            }
        });
        
        DEBUG.log("Delete-Button initialisiert");
    }
    
    /**
     * Hilfsfunktion zum Durchführen des Löschens
     */
    async handleVideoDelete(videoId, button) {
        if (!videoId) {
            DEBUG.log("Keine Video-ID zum Löschen", null, 'error');
            return;
        }
        
        // Ändere den Button-Text während des Löschens
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = "Wird gelöscht...";
        
        try {
            // Hole Video-Daten, falls noch nicht geladen
            const videoData = this.currentVideoData || await VIDEO_API.getVideoById(videoId);
            
            if (!videoData) {
                throw new Error("Video-Daten konnten nicht geladen werden");
            }
            
            // 1. Uploadcare-Datei löschen, falls vorhanden
            if (videoData.fieldData["video-link"]) {
                const videoUrl = videoData.fieldData["video-link"];
                const fileUuid = UPLOADCARE.extractUploadcareUuid(videoUrl);
                
                if (fileUuid) {
                    DEBUG.log(`Uploadcare-UUID gefunden: ${fileUuid}`);
                    try {
                        await UPLOADCARE.deleteUploadcareFile(fileUuid);
                    } catch (uploadcareError) {
                        DEBUG.log("Fehler beim Löschen der Uploadcare-Datei:", uploadcareError, 'error');
                        // Wir machen trotzdem weiter mit dem Löschen des Videos
                    }
                }
            }
            
            // 2. Aus dem Member-Feed entfernen
            if (videoData.fieldData["webflow-id"] || videoData.fieldData["memberstack-id"]) {
                try {
                    if (videoData.fieldData["webflow-id"]) {
                        await MEMBER_API.updateMemberVideoFeed(
                            videoData.fieldData["webflow-id"], 
                            videoId, 
                            true // true = entfernen
                        );
                    }
                    
                    if (videoData.fieldData["memberstack-id"] && 
                        videoData.fieldData["memberstack-id"] !== videoData.fieldData["webflow-id"]) {
                        await MEMBER_API.updateMemberVideoFeed(
                            videoData.fieldData["memberstack-id"], 
                            videoId,
                            true // true = entfernen
                        );
                    }
                } catch (memberError) {
                    DEBUG.log("Fehler beim Entfernen aus dem Member-Feed:", memberError, 'warn');
                    // Wir können hier weitermachen mit dem Löschen des Videos
                }
            }
            
            // 3. Video im CMS löschen
            const result = await VIDEO_API.deleteVideo(videoId);
            
            if (result) {
                DEBUG.log("Video erfolgreich gelöscht");
                
                // Schließe das Modal
                const editModal = document.querySelector(`[data-modal-id="${CONFIG.EDIT_MODAL_ID}"]`);
                if (editModal && window.modalManager) {
                    window.modalManager.closeModal(editModal);
                }
                
                // Event auslösen, um den Feed neu zu laden
                document.dispatchEvent(new CustomEvent('videoFeedUpdate'));
                
                // Zeige eine Erfolgsmeldung
                alert("Video erfolgreich gelöscht!");
            } else {
                throw new Error("Unbekannter Fehler beim Löschen des Videos");
            }
        } catch (error) {
            DEBUG.log("Fehler beim Löschen:", error, 'error');
            alert("Fehler beim Löschen des Videos. Bitte versuche es erneut.");
        } finally {
            // Button zurücksetzen
            button.disabled = false;
            button.textContent = originalText;
        }
    }
    
    /**
     * Hilfsfunktionen zum Abrufen von Feldwerten
     */
    getValue(form, fieldName, defaultValue = "") {
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
            DEBUG.log(`Feld '${fieldName}' nicht gefunden. Verwende Standardwert: '${defaultValue}'`, null, 'warn');
            return defaultValue;
        }
        
        return field.value || defaultValue;
    }
    
    getChecked(form, fieldName) {
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
            if (field && field.type === 'checkbox') break;
        }
        
        if (!field || field.type !== 'checkbox') {
            DEBUG.log(`Checkbox '${fieldName}' nicht gefunden. Standard: false`, null, 'warn');
            return false;
        }
        
        return field.checked;
    }
}

// Singleton-Instanz exportieren
export const VIDEO_EDIT_APP = new VideoEditApp();
