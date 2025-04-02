// src/modules/video-upload-app.js
import { CONFIG } from '../config.js';
import { DEBUG } from './debug.js';
import { VIDEO_API } from './video-api.js';
import { MEMBER_API } from './member-api.js';
import { UPLOADCARE } from './uploadcare.js';
import { MEMBERSTACK } from './memberstack.js';

class VideoUploadApp {
    constructor() {
        this.currentMember = null;
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
    }
    
    /**
     * Analysiert das Formular und alle Felder (für Debug-Zwecke)
     */
    analyzeForm() {
        const form = document.getElementById(CONFIG.FORM_ID);
        if (!form) {
            DEBUG.log(`Formular mit ID '${CONFIG.FORM_ID}' nicht gefunden.`, null, 'warn');
            return;
        }
        
        DEBUG.log("Formular-Analyse:");
        
        // Alle Input-Elemente im Formular auflisten
        const allInputs = form.querySelectorAll("input, textarea, select");
        DEBUG.log(`Gefundene Formularelemente: ${allInputs.length}`);
        
        allInputs.forEach((input, index) => {
            DEBUG.log(`${index + 1}. Element:`, {
                tag: input.tagName,
                type: input.type || "N/A",
                name: input.name || "Kein Name",
                id: input.id || "Keine ID",
                "data-name": input.getAttribute("data-name") || "Kein data-name",
                value: input.type === 'checkbox' ? input.checked : (input.value || "Kein Wert")
            });
        });
    }
    
    /**
     * Initialisiert den Event-Listener für das Formular
     */
    initFormSubmit() {
        const form = document.getElementById(CONFIG.FORM_ID);
        if (!form) {
            DEBUG.log(`Formular mit ID '${CONFIG.FORM_ID}' nicht gefunden.`, null, 'error');
            return;
        }

        DEBUG.log("Video Upload Script geladen für Formular:", form.id);
        
        // Erstelle den Container für Dateiinformationen, falls er nicht existiert
        if (!document.getElementById('fileInfo')) {
            const fileInfoDiv = document.createElement('div');
            fileInfoDiv.id = 'fileInfo';
            form.appendChild(fileInfoDiv);
        }

        // Event-Listener für das Formular
        form.addEventListener("submit", this.handleFormSubmit.bind(this));
    }
    
    /**
     * Behandelt die Formular-Übermittlung
     */
    async handleFormSubmit(event) {
        event.preventDefault();
        DEBUG.log("Formular wird gesendet...");
        
        // Prüfe, ob ein Video hochgeladen wurde
        if (!UPLOADCARE.fileUuid) {
            alert("Bitte lade zuerst ein Video hoch, bevor du das Formular absendest.");
            return;
        }
        
        // Prüfe, ob die Videokonvertierung noch läuft
        if (UPLOADCARE.isVideoProcessing) {
            alert("Die Videooptimierung läuft noch. Bitte warte einen Moment.");
            return;
        }
        
        // Stelle sicher, dass wir die neueste URL verwenden
        const currentVideoLink = UPLOADCARE.processedUrl || UPLOADCARE.fileCdnUrl;
        if (UPLOADCARE.processedUrl) {
            DEBUG.log("Verwende die konvertierte Video-URL:", UPLOADCARE.processedUrl);
        } else if (UPLOADCARE.fileCdnUrl) {
            DEBUG.log("Keine konvertierte URL gefunden, verwende Original:", UPLOADCARE.fileCdnUrl);
        } else {
            this.showProgressBar();
            this.updateProgressBar(0.3, false, "Kein Video-Link gefunden. Bitte versuche es erneut oder kontaktiere den Support.");
            return;
        }
        
        // Formular-Element
        const form = document.getElementById(CONFIG.FORM_ID);
        
        // Ausblenden des erfolgs-DIVs, falls vorhanden
        const successDiv = document.getElementById(CONFIG.SUCCESS_DIV_ID);
        if (successDiv) {
            successDiv.style.display = 'none';
        }

        // Videoname abrufen oder Default verwenden
        const videoName = this.getFormValue(form, "input[name='Name']", "Unbenanntes Video");
        
        // Erstelle einen Slug aus Videoname und UUID
        let slug = videoName.toLowerCase()
            .replace(/\s+/g, "-")        // Leerzeichen zu Bindestrichen
            .replace(/[^a-z0-9-]/g, "")  // Nur alphanumerische und Bindestriche
            .replace(/-+/g, "-")         // Mehrfache Bindestriche zu einem
            .replace(/^-|-$/g, "");      // Bindestriche am Anfang und Ende entfernen
            
        // Füge UUID hinzu
        if (UPLOADCARE.fileUuid) {
            slug = `${slug}-${UPLOADCARE.fileUuid.slice(0, 8)}`; // Nimm die ersten 8 Zeichen der UUID
        }

        // Hole Mitgliedschaftsdaten
        let webflowMemberId = "";
        let memberstackMemberId = "";
        let memberName = "Unbekannter Nutzer";
        
        try {
            // Versuche den aktuellen Memberstack-User zu laden
            const member = await MEMBERSTACK.getCurrentMember();
            if (member && member.data) {
                memberstackMemberId = member.data.id;
                memberName = member.data.email || member.data.name || "Mitglied";
                webflowMemberId = MEMBERSTACK.extractWebflowId(member);
                
                DEBUG.log("Memberstack-User gefunden:", {
                    id: memberstackMemberId,
                    name: memberName,
                    webflowId: webflowMemberId
                });
            }
        } catch (memberError) {
            DEBUG.log("Fehler beim Laden des Memberstack-Users:", memberError, 'warn');
            // Wir können trotzdem fortfahren, da wir die IDs aus dem Formular lesen können
        }
        
        // Ermittle die Formulardaten
        const formWebflowId = this.getFormValue(form, "input[name='Webflow Member ID']", webflowMemberId);
        const formMemberstackId = this.getFormValue(form, "input[name='Memberstack Member ID']", memberstackMemberId);
        
        // Verwende die IDs aus dem Formular, wenn sie nicht leer sind, sonst die aus Memberstack
        webflowMemberId = formWebflowId || webflowMemberId;
        memberstackMemberId = formMemberstackId || memberstackMemberId;
        
        // Debugge die IDs
        DEBUG.log("Verwendete Member IDs:", {
            webflow: webflowMemberId,
            memberstack: memberstackMemberId
        });
        
        // Hole den Video-Link aus dem Formular oder aus Uploadcare
        const videoLink = this.getVideoLink(form) || currentVideoLink;
        
        // Validiere kritische Felder - Prüfe auf Fehler vor dem API-Aufruf
        if (!videoLink) {
            const errorMessage = "Video Link konnte nicht ermittelt werden. Bitte versuche das Video erneut hochzuladen.";
            DEBUG.log(errorMessage, null, 'error');
            this.showProgressBar();
            this.updateProgressBar(0.3, false, errorMessage);
            return;
        }
        
        // Erstelle das Formular-Daten-Objekt
        const formData = {
            name: videoName,
            slug: slug,
            kategorie: this.getKategorieId(form),
            beschreibung: this.getFormValue(form, "textarea[name='Beschreibung']") || this.getFormValue(form, "input[name='Beschreibung']", "Keine Beschreibung"),
            openVideo: this.findCheckbox(form, ['open video', 'Open Video', 'öffentliches video', 'Öffentliches Video']),
            videoContest: this.findCheckbox(form, ['video contest', 'Video Contest']),
            webflowMemberId: webflowMemberId,
            memberstackMemberId: memberstackMemberId,
            memberName: this.getFormValue(form, "input[name='Member Name']", memberName),
            videoLink: videoLink
        };

        DEBUG.log("Erfasste Formulardaten:", formData);

        // Zeige den Fortschrittsbalken an
        this.showProgressBar();

        try {
            // Fortschrittssimulation für die API-Anfrage
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 0.1; // Erhöhe um 10%
                if (progress > 0.9) {
                    clearInterval(progressInterval);
                }
                this.updateProgressBar(progress, true);
            }, 300);

            // 1. Tatsächliche API-Anfrage zum Erstellen des Videos
            DEBUG.log("Erstelle neues Video in Webflow CMS...");
            const videoResult = await VIDEO_API.createVideo(formData);
            
            // Setze den Fortschritt auf 70% nach dem erfolgreichen Video-Upload
            clearInterval(progressInterval);
            this.updateProgressBar(0.7, true);
            
            // Extrahiere die ID des neu erstellten Videos
            const newVideoId = videoResult.id;
            if (!newVideoId) {
                throw new Error("Video wurde erstellt, aber keine ID erhalten");
            }
            
            DEBUG.log("Video erfolgreich erstellt mit ID:", newVideoId);
            
            // Prüfe, ob Member-IDs vorhanden sind
            let hasMemberId = !!(webflowMemberId || memberstackMemberId);
            
            if (!hasMemberId) {
                DEBUG.log("Keine Member IDs gefunden, überspringe Member-Update", null, 'warn');
                // Zeige Warnung im Fortschrittsbalken, aber markiere als erfolgreich
                this.updateProgressBar(1.0, true, "Video erfolgreich hochgeladen, aber es wurde kein Mitgliedsprofil gefunden.", true);
                
                // Zeige Erfolgs-DIV an, falls vorhanden
                if (successDiv) {
                    successDiv.style.display = 'block';
                }
                return;
            }
            
            // 2. Aktualisiere den Member mit dem neuen Video
            DEBUG.log("Füge Video zum Member-Profil hinzu...");
            this.updateProgressBar(0.8, true);
            
            try {
                // Versuche zuerst mit Webflow ID, dann mit Memberstack ID
                let memberUpdateResult = null;
                
                if (webflowMemberId) {
                    DEBUG.log("Versuche Update mit Webflow Member ID:", webflowMemberId);
                    try {
                        memberUpdateResult = await MEMBER_API.updateMemberVideoFeed(webflowMemberId, newVideoId);
                    } catch (e) {
                        DEBUG.log("Fehler beim Update mit Webflow ID:", e.message, 'warn');
                    }
                }
                
                if (!memberUpdateResult && memberstackMemberId) {
                    DEBUG.log("Webflow ID fehlgeschlagen, versuche mit Memberstack ID:", memberstackMemberId);
                    try {
                        memberUpdateResult = await MEMBER_API.updateMemberVideoFeed(memberstackMemberId, newVideoId);
                    } catch (e) {
                        DEBUG.log("Fehler beim Update mit Memberstack ID:", e.message, 'warn');
                    }
                }
                
                if (memberUpdateResult) {
                    DEBUG.log("Member-Profil erfolgreich aktualisiert:", memberUpdateResult);
                    
                    // Alles erfolgreich - setze Fortschritt auf 100%
                    this.updateProgressBar(1.0, true);
                    
                    // Zeige Erfolgs-DIV an, falls vorhanden
                    if (successDiv) {
                        successDiv.style.display = 'block';
                    }
                    
                    // Event auslösen, um den Feed neu zu laden
                    document.dispatchEvent(new CustomEvent('videoFeedUpdate'));
                } else {
                    // Member nicht gefunden oder Update fehlgeschlagen, aber Video wurde trotzdem erstellt
                    DEBUG.log("Video wurde erstellt, aber Member-Update fehlgeschlagen: Member nicht gefunden", null, 'warn');
                    
                    // Zeige Warnung im Fortschrittsbalken, aber markiere als erfolgreich
                    this.updateProgressBar(0.9, true, "Video erfolgreich hochgeladen, aber die Zuordnung zu deinem Profil ist fehlgeschlagen.", true);
                    
                    // Zeige Erfolgs-DIV trotzdem an, falls vorhanden
                    if (successDiv) {
                        successDiv.style.display = 'block';
                    }
                    
                    // Event auslösen, um den Feed neu zu laden
                    document.dispatchEvent(new CustomEvent('videoFeedUpdate'));
                }
            } catch (memberError) {
                DEBUG.log("Video wurde erstellt, aber Member-Update fehlgeschlagen:", memberError, 'warn');
                
                // Zeige Warnung im Fortschrittsbalken, aber markiere als erfolgreich
                this.updateProgressBar(0.9, true, "Video erfolgreich hochgeladen, aber die Zuordnung zu deinem Profil ist fehlgeschlagen.", true);
                
                // Zeige Erfolgs-DIV trotzdem an, falls vorhanden
                if (successDiv) {
                    successDiv.style.display = 'block';
                }
                
                // Event auslösen, um den Feed neu zu laden
                document.dispatchEvent(new CustomEvent('videoFeedUpdate'));
            }
        } catch (error) {
            DEBUG.log("Fehler beim Hochladen:", error, 'error');
            
            // Versuche eine spezifische Fehlermeldung zu extrahieren
            let errorMessage = "Es ist leider ein Fehler beim Hochladen aufgetreten. Bitte versuche es erneut.";
            
            if (error && error.message) {
                // Versuche, eine benutzerfreundlichere Meldung aus dem Fehler zu extrahieren
                if (error.message.includes("401")) {
                    errorMessage = "Authentifizierungsfehler. Bitte versuche es erneut oder kontaktiere den Support.";
                } else if (error.message.includes("404")) {
                    errorMessage = "Die API konnte nicht gefunden werden. Bitte kontaktiere den Support.";
                } else if (error.message.includes("500")) {
                    errorMessage = "Serverfehler beim Verarbeiten des Videos. Bitte versuche es später erneut.";
                } else if (error.message.includes("Member")) {
                    errorMessage = "Dein Mitgliedsprofil konnte nicht gefunden werden. Bitte versuche es erneut oder kontaktiere den Support.";
                }
            }
            
            // Zeige Fehlerstatus im Fortschrittsbalken
            this.updateProgressBar(0.3, false, errorMessage);
        }
    }
    
    /**
     * Hilfsfunktion zum Extrahieren eines Formularwerts
     */
    getFormValue(form, selector, defaultValue = "") {
        const element = form.querySelector(selector);
        if (!element) {
            DEBUG.log(`Feld '${selector}' nicht gefunden. Setze Standardwert: '${defaultValue}'`, null, 'warn');
            return defaultValue;
        }
        DEBUG.log(`Feld '${selector}' gefunden:`, element.value);
        return element.value || defaultValue;
    }
    
    /**
     * Hilfsfunktion zum Finden einer Checkbox
     */
    findCheckbox(form, possibleNames) {
        for (const name of possibleNames) {
            // Versuche verschiedene Selektoren
            const selectors = [
                `input[name='${name}']`,
                `input[data-name='${name}']`,
                `input#${name}`,
                `input[placeholder='${name}']`
            ];
            
            for (const selector of selectors) {
                const element = form.querySelector(selector);
                if (element && element.type === 'checkbox') {
                    DEBUG.log(`Checkbox gefunden mit Selektor: ${selector}`);
                    return element.checked;
                }
            }
        }
        
        DEBUG.log(`Keine Checkbox mit Namen ${possibleNames.join(', ')} gefunden`, null, 'warn');
        return false;
    }
    
    /**
     * Videolink extrahieren oder aus Uploadcare abrufen
     */
    getVideoLink(form) {
        // Falls wir bereits eine prozessierte URL haben, verwende diese
        if (UPLOADCARE.processedUrl) {
            DEBUG.log("Verwende prozessierte Uploadcare URL als Video-Link:", UPLOADCARE.processedUrl);
            return UPLOADCARE.processedUrl;
        }
        
        // Falls keine prozessierte URL, aber eine Standard-CDN URL verfügbar ist
        if (UPLOADCARE.fileCdnUrl) {
            DEBUG.log("Verwende Uploadcare CDN URL als Video-Link:", UPLOADCARE.fileCdnUrl);
            return UPLOADCARE.fileCdnUrl;
        }
        
        // Ansonsten versuche die Felder zu finden
        const videoLinkSelectors = [
            "input[name='Video Link']",
            "input[name='VideoLink']",
            "input[name='video-link']",
            "input[data-name='Video Link']",
            "input[data-name='video-link']"
        ];
        
        for (const selector of videoLinkSelectors) {
            const element = form.querySelector(selector);
            if (element) {
                DEBUG.log(`Video-Link-Feld gefunden mit Selektor: ${selector}`, element.value);
                return element.value;
            }
        }
        
        DEBUG.log("Kein Video-Link-Feld gefunden. Setze leer.", null, 'warn');
        return "";
    }
    
    /**
     * Kategorien-ID extrahieren oder leeren String verwenden
     */
    getKategorieId(form) {
        // Versuche verschiedene Selektoren für das Kategorie-Feld
        const kategorieSelectors = [
            "select[name='Kategorie']",
            "select[data-name='Kategorie']",
            "input[name='Kategorie']",
            "input[data-name='Kategorie']"
        ];
        
        for (const selector of kategorieSelectors) {
            const element = form.querySelector(selector);
            if (element) {
                DEBUG.log(`Kategorie-Feld gefunden mit Selektor: ${selector}`, element.value);
                return element.value;
            }
        }
        
        // Wenn nicht gefunden, versuche einen festen Wert
        DEBUG.log("Kein Kategorie-Feld gefunden. Standard-Kategorie wird verwendet.", null, 'warn');
        return "2f1f2fe0cd35ddd19ca98f4b85b16258"; // Standard-Kategorie-ID
    }
    
    /**
     * Zeige den benutzerdefinierten Fortschrittsbalken an
     */
    showProgressBar() {
        const progressWrapper = document.querySelector('.db-modal-progress-wrapper');
        
        if (progressWrapper) {
            progressWrapper.style.display = 'block';
            this.updateProgressBar(0, true); // Initialisiere den Balken mit 0%
        } else {
            DEBUG.log("Fortschrittsbalken-Wrapper nicht gefunden", null, 'warn');
        }
    }
    
    /**
     * Verstecke den benutzerdefinierten Fortschrittsbalken
     */
    hideProgressBar() {
        const progressWrapper = document.querySelector('.db-modal-progress-wrapper');
        
        if (progressWrapper) {
            progressWrapper.style.display = 'none';
        }
    }
    
    /**
     * Aktualisiere den benutzerdefinierten Fortschrittsbalken
     */
    updateProgressBar(progress, isSuccess = true, errorMessage = "", isWarning = false) {
        const progressBar = document.querySelector('.db-modal-progessbar');
        const progressText = document.querySelector('.db-modal-progress-text');
        const progressPercentage = document.querySelector('.db-modal-progress-percentage');
        const progressImg = document.querySelector('.db-modal-progress-img');
        
        if (!progressBar || !progressText || !progressPercentage) {
            DEBUG.log("Fortschrittsbalken-Elemente nicht gefunden", null, 'warn');
            return;
        }
        
        // Konvertiere Fortschritt in Prozent
        const percent = Math.round(progress * 100);
        
        // Aktualisiere die Fortschrittsbalken-Breite
        progressBar.style.width = `${percent}%`;
        
        // Aktualisiere die Prozentanzeige
        progressPercentage.textContent = `${percent}%`;
        
        // Färbe den Balken je nach Status
        if (isWarning) {
            // Warnungszustand - gelb
            progressBar.style.backgroundColor = '#FFC107'; 
            progressText.textContent = errorMessage || "Video hochgeladen, aber es gibt ein Problem mit deinem Profil.";
        } else if (isSuccess) {
            // Erfolg - grün
            progressBar.style.backgroundColor = '#4CAF50'; 
            progressText.textContent = percent === 100 ? "Erfolgreich hochgeladen!" : "Wird hochgeladen...";
        } else {
            // Fehler - rot
            progressBar.style.backgroundColor = '#FF6974'; 
            progressText.textContent = errorMessage || "Es ist leider ein Fehler aufgetreten. Bitte versuche es erneut.";
        }

        // Optional: Bild aktualisieren, falls vorhanden
        if (progressImg) {
            // Hier könnte das Bild je nach Status geändert werden
        }
    }
}

// Singleton-Instanz exportieren
export const VIDEO_UPLOAD_APP = new VideoUploadApp();
