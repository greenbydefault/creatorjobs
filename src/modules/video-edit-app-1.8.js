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
    const VIDEO_API = window.WEBFLOW_API.VIDEO_API || {
        getVideoById: async () => null,
        updateVideo: async () => null,
        deleteVideo: async () => false
    };
    const MEMBER_API = window.WEBFLOW_API.MEMBER_API || {
        updateMemberVideoFeed: async () => null
    };
    const UPLOADCARE = window.WEBFLOW_API.UPLOADCARE || {
        extractUploadcareUuid: () => null,
        deleteUploadcareFile: async () => false
    };

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
         * Setzt den Wert eines Toggle/Checkbox-Elements im Edit-Formular
         * @param {string} fieldName - Der Name des Feldes
         * @param {boolean} value - Der zu setzende Wert
         */
        setToggleValue(fieldName, value) {
            const form = document.getElementById(CONFIG.EDIT_FORM_ID);
            if (!form) {
                DEBUG.log(`Formular mit ID '${CONFIG.EDIT_FORM_ID}' nicht gefunden`, null, 'warn');
                return;
            }
            
            // Mehrere Selektoren für verschiedene Attribute testen
            const selectors = [
                `input[type="checkbox"][name="${fieldName}"]`,
                `input[type="checkbox"][data-name="${fieldName}"]`,
                `input[type="checkbox"]#${fieldName.replace(/\s+/g, '-').toLowerCase()}`
            ];
            
            // Wichtig: Nur innerhalb des Formulars suchen!
            let toggle = null;
            for (const selector of selectors) {
                const elements = form.querySelectorAll(selector);
                
                if (elements.length > 0) {
                    // Wenn mehrere Elemente gefunden wurden, wähle eines aus
                    toggle = elements[0];
                    DEBUG.log(`Toggle '${fieldName}' gefunden (${elements.length} Elemente) mit Selektor: ${selector}`);
                    break;
                }
            }
            
            if (!toggle) {
                DEBUG.log(`Toggle-Element '${fieldName}' nicht gefunden`, null, 'warn');
                
                // Fallback: Globale Suche (nur für Debug-Zwecke)
                const globalElements = document.querySelectorAll(`input[type="checkbox"][data-name="${fieldName}"]`);
                if (globalElements.length > 0) {
                    DEBUG.log(`Hinweis: ${globalElements.length} Toggle-Elemente global gefunden, aber nicht im Formular`, null, 'warn');
                }
                
                return;
            }
            
            // Wert setzen und Event auslösen
            toggle.checked = value;
            DEBUG.log(`Toggle-Wert für '${fieldName}' gesetzt: ${value}`);
            
            // Wichtig: Ein Change-Event auslösen, damit Webflow-Event-Handler reagieren
            const event = new Event('change', { bubbles: true });
            toggle.dispatchEvent(event);
            
            // Zusätzlich: Explizit click-Event für spezielle Handler
            if (toggle.checked !== value) {
                DEBUG.log(`Toggle-Wert wurde nicht korrekt gesetzt, versuche click-Event`, null, 'warn');
                toggle.click();
            }
        }
        
        /**
         * Event-Listener für Edit-Buttons initialisieren
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
         * Initialisiert den Event-Listener für einen Save-Button
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
                    const result = await VIDEO_API.updateVideo(formData, this.currentVideoData.id);
                    
                    if (result) {
                        DEBUG.log("Video erfolgreich aktualisiert:", result);
                        
                        // Schließe das Modal
                        const editModal = document.querySelector(`[data-modal-id="${CONFIG.EDIT_MODAL_ID}"]`);
                        if (editModal && window.modalManager) {
                            window.modalManager.closeModal(editModal);
                        }
                        
                        // Optional: Seite neu laden, um die Änderungen anzuzeigen
                        setTimeout(() => {
                            window.location.reload();
                        }, 500);
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
                // Führe das Löschen durch
                const result = await VIDEO_API.deleteVideo(videoId);
                
                if (result) {
                    DEBUG.log("Video erfolgreich gelöscht");
                    
                    // Schließe das Modal
                    const editModal = document.querySelector(`[data-modal-id="${CONFIG.EDIT_MODAL_ID}"]`);
                    if (editModal && window.modalManager) {
                        window.modalManager.closeModal(editModal);
                    }
                    
                    // Optional: Seite neu laden, um die Änderungen anzuzeigen
                    setTimeout(() => {
                        window.location.reload();
                    }, 500);
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
            if (categoryValue && typeof categoryValue === 'string' && CONFIG.CATEGORY_MAPPING) {
                DEBUG.log(`Suche Kategorie-Mapping für ID: ${categoryValue}`);
                
                const mappedName = CONFIG.CATEGORY_MAPPING[categoryValue];
                if (mappedName) {
                    categoryName = mappedName;
                    DEBUG.log(`Kategorie-Name aus Mapping gefunden: ${categoryName} für ID: ${categoryValue}`);
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
         * Hilfsfunktion zum Abrufen von Feldwerten
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
        
        /**
         * Hilfsfunktion zum Abrufen des Status einer Checkbox
         */
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

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.videoEditApp = new VideoEditApp();
})();
