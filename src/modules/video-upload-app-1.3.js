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
        createVideo: async () => null
    };
    const MEMBER_API = window.WEBFLOW_API.MEMBER_API || {
        updateMemberVideoFeed: async () => null
    };
    const UPLOADCARE = window.WEBFLOW_API.UPLOADCARE || {
        init: () => {},
        fileUuid: null,
        fileCdnUrl: '',
        processedUrl: '',
        isVideoProcessing: false
    };
    const MEMBERSTACK = window.WEBFLOW_API.MEMBERSTACK || {
        getCurrentMember: async () => null,
        extractWebflowId: () => null
    };
    class VideoUploadApp {
        constructor() {
            this.currentMember = null;
            
            // Fortschrittsbalken-Zustand
            this.progressBarVisible = false;
        }
        
        /**
         * Initialisiert die Upload-Funktionalität
         */
        init() {
            DEBUG.log('Initialisiere Video-Upload App');
            
            // Uploadcare initialisieren
            UPLOADCARE.init();
            
            // Event-Listener für das Formular
            this.initFormSubmit();
            
            // Formularanalyse durchführen für Debug-Zwecke
            this.analyzeForm();
            
            // Verstecke den Fortschrittsbalken bei der Initialisierung
            this.hideProgressBar();
        }
        
        /**
         * Analysiert das Formular und alle Felder
         */
        analyzeForm() {
            const form = document.getElementById(CONFIG.FORM_ID);
            if (!form) {
                DEBUG.log('Formular für Analyse nicht gefunden', null, 'warn');
                return;
            }
            
            DEBUG.log('Formular-Analyse:');
            
            // Alle Input-Elemente im Formular auflisten
            const allInputs = form.querySelectorAll('input, textarea, select');
            DEBUG.log(`Gefundene Formularelemente: ${allInputs.length}`);
            
            allInputs.forEach((input, index) => {
                DEBUG.log(`Element ${index + 1}:`, {
                    tag: input.tagName,
                    type: input.type || 'N/A',
                    name: input.name || 'Kein Name',
                    id: input.id || 'Keine ID',
                    'data-name': input.getAttribute('data-name') || 'Kein data-name',
                    value: input.type === 'checkbox' ? input.checked : (input.value || 'Kein Wert')
                });
            });
        }
        
        /**
         * Initialisiert Event-Listener für das Formular
         */
        initFormSubmit() {
            const form = document.getElementById(CONFIG.FORM_ID);
            if (!form) {
                DEBUG.log(`Formular mit ID '${CONFIG.FORM_ID}' nicht gefunden`, null, 'error');
                return;
            }
            
            DEBUG.log(`Event-Listener für Formular ${form.id} initialisiert`);
            
            form.addEventListener('submit', (event) => {
                event.preventDefault();
                this.handleFormSubmit(event);
            });
        }
        
        /**
         * Behandelt das Absenden des Formulars
         */
        async handleFormSubmit(event) {
            const form = event.target;
            DEBUG.log('Formular wird gesendet...');
            
            // Prüfe, ob ein Video hochgeladen wurde
            if (!UPLOADCARE.fileUuid) {
                alert('Bitte lade zuerst ein Video hoch, bevor du das Formular absendest.');
                return;
            }
            
            // Prüfe, ob die Videokonvertierung noch läuft
            if (UPLOADCARE.isVideoProcessing) {
                alert('Die Videooptimierung läuft noch. Bitte warte einen Moment.');
                return;
            }
            
            // Jetzt zeigen wir den Fortschrittsbalken an, nicht früher
            this.showProgressBar();
            this.updateProgressBar(10);
            
            try {
                // Hole die aktuelle Member-Information
                this.currentMember = await MEMBERSTACK.getCurrentMember();
                if (!this.currentMember) {
                    DEBUG.log('Kein eingeloggter Benutzer gefunden', null, 'warn');
                }
                
                // Erstelle einen Slug aus dem Namen
                const videoName = this.getFormValue('Name', 'Unbenanntes Video');
                let slug = videoName.toLowerCase()
                    .replace(/\s+/g, '-')
                    .replace(/[^a-z0-9-]/g, '')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '');
                
                // Füge UUID hinzu für Eindeutigkeit
                if (UPLOADCARE.fileUuid) {
                    slug = `${slug}-${UPLOADCARE.fileUuid.slice(0, 8)}`;
                }
                
                // Update Progress
                this.updateProgressBar(30);
                
                // Daten aus dem Formular sammeln
                const formData = {
                    name: videoName,
                    slug: slug,
                    kategorie: this.getKategorieId(),
                    beschreibung: this.getFormValue('Beschreibung', 'Keine Beschreibung'),
                    openVideo: this.findCheckbox(['open video', 'Open Video', 'öffentliches video', 'Öffentliches Video']),
                    videoContest: this.findCheckbox(['video contest', 'Video Contest']),
                    webflowMemberId: this.getFormValue('Webflow Member ID', this.currentMember ? this.currentMember.webflowId || '' : ''),
                    memberstackMemberId: this.getFormValue('Memberstack Member ID', this.currentMember ? this.currentMember.id || '' : ''),
                    memberName: this.getFormValue('Member Name', this.currentMember ? this.currentMember.name || 'Unbekannter Nutzer' : 'Unbekannter Nutzer'),
                    videoLink: this.getVideoLink()
                };
                
                DEBUG.log('Gesammelte Formulardaten:', formData);
                
                // Update Progress
                this.updateProgressBar(50);
                
                // Video im CMS erstellen
                const videoResult = await VIDEO_API.createVideo(formData);
                if (!videoResult || !videoResult.id) {
                    throw new Error('Video konnte nicht erstellt werden');
                }
                
                DEBUG.log('Video erfolgreich erstellt:', videoResult);
                
                // Update Progress
                this.updateProgressBar(70);
                
                // Aktualisiere den Member mit dem neuen Video
                if (formData.webflowMemberId || formData.memberstackMemberId) {
                    try {
                        const memberId = formData.webflowMemberId || formData.memberstackMemberId;
                        const memberResult = await MEMBER_API.updateMemberVideoFeed(memberId, videoResult.id);
                        DEBUG.log('Member-Profil aktualisiert:', memberResult);
                    } catch (memberError) {
                        DEBUG.log('Fehler beim Aktualisieren des Member-Profils', memberError, 'warn');
                        // Wir setzen fort, da das Video bereits erstellt wurde
                    }
                }
                
                // Update Progress
                this.updateProgressBar(100);
                
                // Erfolg! Zeige Erfolgs-DIV an oder leite weiter
                this.hideProgressBar();
                const successDiv = document.getElementById(CONFIG.SUCCESS_DIV_ID);
                if (successDiv) {
                    successDiv.style.display = 'block';
                    
                    // Formular ausblenden
                    form.style.display = 'none';
                }
                
                // Optional: Zur Bestätigungsseite weiterleiten
                // setTimeout(() => {
                //     window.location.href = "/upload-success";
                // }, 2000);
                
            } catch (error) {
                DEBUG.log('Fehler beim Verarbeiten des Formulars', error, 'error');
                alert('Fehler beim Hochladen des Videos. Bitte versuche es erneut.');
                this.hideProgressBar();
            }
        }
        
        /**
         * Findet ein Formularfeld und gibt seinen Wert zurück
         */
        getFormValue(fieldName, defaultValue = '') {
            const form = document.getElementById(CONFIG.FORM_ID);
            if (!form) return defaultValue;
            
            const selectors = [
                `[name="${fieldName}"]`,
                `[data-name="${fieldName}"]`,
                `#${fieldName.replace(/\s+/g, '-').toLowerCase()}`
            ];
            
            for (const selector of selectors) {
                const field = form.querySelector(selector);
                if (field) {
                    return field.value || defaultValue;
                }
            }
            
            DEBUG.log(`Feld '${fieldName}' nicht gefunden. Verwende Standardwert: '${defaultValue}'`, null, 'warn');
            return defaultValue;
        }
        
        /**
         * Sucht nach einer Checkbox mit einem der möglichen Namen
         */
        findCheckbox(possibleNames) {
            const form = document.getElementById(CONFIG.FORM_ID);
            if (!form) return false;
            
            for (const name of possibleNames) {
                const selectors = [
                    `input[type="checkbox"][name="${name}"]`,
                    `input[type="checkbox"][data-name="${name}"]`,
                    `input[type="checkbox"]#${name.replace(/\s+/g, '-').toLowerCase()}`,
                ];
                
                for (const selector of selectors) {
                    const checkbox = form.querySelector(selector);
                    if (checkbox) {
                        return checkbox.checked;
                    }
                }
            }
            
            DEBUG.log(`Keine Checkbox mit Namen ${possibleNames.join(', ')} gefunden`, null, 'warn');
            return false;
        }
        
        /**
         * Ermittelt den Video-Link aus Uploadcare oder dem Formular
         */
        getVideoLink() {
            // Zuerst prüfen, ob wir einen prozessierten Link von Uploadcare haben
            if (UPLOADCARE.processedUrl) {
                DEBUG.log('Verwende prozessierte Uploadcare URL:', UPLOADCARE.processedUrl);
                return UPLOADCARE.processedUrl;
            }
            
            // Dann prüfen, ob wir einen Standard CDN-Link haben
            if (UPLOADCARE.fileCdnUrl) {
                DEBUG.log('Verwende Uploadcare CDN URL:', UPLOADCARE.fileCdnUrl);
                return UPLOADCARE.fileCdnUrl;
            }
            
            // Als Fallback nach explizitem Feld im Formular suchen
            const videoLinkSelectors = [
                'input[name="Video Link"]',
                'input[name="VideoLink"]',
                'input[name="video-link"]',
                'input[data-name="Video Link"]',
                'input[data-name="video-link"]'
            ];
            
            const form = document.getElementById(CONFIG.FORM_ID);
            if (!form) return '';
            
            for (const selector of videoLinkSelectors) {
                const element = form.querySelector(selector);
                if (element && element.value) {
                    DEBUG.log(`Video-Link-Feld gefunden mit Selektor: ${selector}`, element.value);
                    return element.value;
                }
            }
            
            DEBUG.log('Kein Video-Link gefunden', null, 'warn');
            return '';
        }
        
        /**
         * Ermittelt die Kategorie-ID aus dem Formular
         */
        getKategorieId() {
            const form = document.getElementById(CONFIG.FORM_ID);
            if (!form) return '';
            
            const kategorieSelectors = [
                'select[name="Kategorie"]',
                'select[data-name="Kategorie"]',
                'input[name="Kategorie"]',
                'input[data-name="Kategorie"]'
            ];
            
            for (const selector of kategorieSelectors) {
                const element = form.querySelector(selector);
                if (element && element.value) {
                    DEBUG.log(`Kategorie-Feld gefunden mit Selektor: ${selector}`, element.value);
                    return element.value;
                }
            }
            
            // Fallback zu einer Standard-Kategorie
            DEBUG.log('Kein Kategorie-Feld gefunden. Standard-Kategorie wird verwendet.', null, 'warn');
            return '2f1f2fe0cd35ddd19ca98f4b85b16258'; // Standard-Kategorie-ID
        }
        
        /**
         * Zeigt die Fortschrittsanzeige an
         */
        showProgressBar() {
            const progressBar = document.querySelector('.db-modal-progress-wrapper');
            if (!progressBar) {
                DEBUG.log('Fortschrittsbalken nicht gefunden', null, 'warn');
                return;
            }
            
            this.progressBarVisible = true;
            progressBar.style.display = 'block';
            this.updateProgressBar(0);
            DEBUG.log('Fortschrittsbalken wird angezeigt');
        }
        
        /**
         * Versteckt die Fortschrittsanzeige
         */
        hideProgressBar() {
            const progressBar = document.querySelector('.db-modal-progress-wrapper');
            if (!progressBar) {
                DEBUG.log('Fortschrittsbalken nicht gefunden', null, 'warn');
                return;
            }
            
            this.progressBarVisible = false;
            progressBar.style.display = 'none';
            DEBUG.log('Fortschrittsbalken ausgeblendet');
        }
        
        /**
         * Aktualisiert die Fortschrittsanzeige
         * @param {number} percent - Prozentsatz des Fortschritts (0-100)
         */
        updateProgressBar(percent) {
            // Nur aktualisieren, wenn der Fortschrittsbalken sichtbar ist
            if (!this.progressBarVisible) {
                return;
            }
            
            const progressBarElem = document.querySelector('.db-modal-progessbar');
            const progressTextElem = document.querySelector('.db-modal-progress-text');
            const progressPercentElem = document.querySelector('.db-modal-progress-percentage');
            
            if (progressBarElem) {
                progressBarElem.style.width = `${percent}%`;
            }
            
            if (progressPercentElem) {
                progressPercentElem.textContent = `${percent}%`;
            }
            
            if (progressTextElem) {
                if (percent === 100) {
                    progressTextElem.textContent = 'Erfolgreich hochgeladen!';
                } else {
                    progressTextElem.textContent = 'Wird hochgeladen...';
                }
            }
        }
    }
    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.videoUploadApp = new VideoUploadApp();
})();
