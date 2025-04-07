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
    const UI = window.WEBFLOW_API.UI || {
        init: () => {},
        showLoading: () => {},
        showError: (message) => console.error(message),
        updatePlanStatus: () => {},
        renderVideos: () => {}
    };
    const MEMBERSTACK = window.WEBFLOW_API.MEMBERSTACK || {
        getCurrentMember: async () => null,
        getMembershipDetails: () => ({ limit: 3, status: 'Free' }),
        extractWebflowId: () => null
    };
    const MEMBER_API = window.WEBFLOW_API.MEMBER_API || {
        getUserByWebflowId: async () => null,
        getVideosFromUserFeed: async () => []
    };
    const VIDEO_API = window.WEBFLOW_API.VIDEO_API || {
        // Fallback-Implementierung
    };

    class VideoFeedApp {
        constructor() {
            this.currentMember = null;
            this.userVideos = [];
            this.isLoading = false;
        }
        
        /**
         * Initialisiert die App
         */
        init() {
            DEBUG.log('Initialisiere Video-Feed App');
            
            // UI-Elemente initialisieren
            UI.init();
            
            // Event-Listener für Video-Feed-Updates registrieren
            document.addEventListener('videoFeedUpdate', () => {
                DEBUG.log('Update-Event empfangen, lade Feed neu');
                this.loadUserVideos(true); // true = immer neu laden
            });
            
            // Zusätzliche Event-Listener für Video-Aktionen
            document.addEventListener('videoCreated', () => {
                DEBUG.log('Neues Video erstellt, Feed wird aktualisiert');
                this.loadUserVideos(true);
            });
            
            document.addEventListener('videoDeleted', () => {
                DEBUG.log('Video gelöscht, Feed wird aktualisiert');
                this.loadUserVideos(true);
            });
            
            // Videos laden
            this.loadUserVideos(true); // true = immer neu laden
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
                    // Hier könnten wir zusätzliche Logik implementieren, um das richtige zu finden
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
         * Lädt die Videos des eingeloggten Users
         * @param {boolean} forceReload - Wenn true, wird der Cache ignoriert
         */
        async loadUserVideos(forceReload = false) {
            try {
                // Verhindere parallele Ladeanfragen
                if (this.isLoading) {
                    DEBUG.log('Ladevorgang bereits aktiv, ignoriere Anfrage');
                    return;
                }
                
                this.isLoading = true;
                UI.showLoading();
                
                // Memberstack-User laden
                const member = await MEMBERSTACK.getCurrentMember();
                if (!member) {
                    UI.showError("Kein eingeloggter User gefunden");
                    this.isLoading = false;
                    return;
                }
                
                this.currentMember = member;
                const memberstackId = member.data.id;
                DEBUG.log(`Eingeloggter User mit Memberstack-ID ${memberstackId}`);
                
                // Membership-Details ermitteln
                const membershipDetails = MEMBERSTACK.getMembershipDetails(member);
                let maxUploads = membershipDetails.limit;
                DEBUG.log(`Ermittelte Membership-Details:`, membershipDetails);
                
                // Plan-Status anzeigen
                UI.updatePlanStatus(membershipDetails.status);
                
                // Webflow-ID aus den Memberstack-Daten extrahieren
                const webflowMemberId = MEMBERSTACK.extractWebflowId(member);
                
                if (!webflowMemberId) {
                    UI.showError("Keine Webflow-Member-ID in den Memberstack-Daten gefunden");
                    DEBUG.log('Memberstack-Daten ohne Webflow-ID:', member.data, 'error');
                    this.isLoading = false;
                    return;
                }
                
                // User direkt mit der Webflow-ID abrufen
                const user = await MEMBER_API.getUserByWebflowId(webflowMemberId);
                
                if (!user) {
                    UI.showError(`User mit Webflow-ID "${webflowMemberId}" nicht gefunden`);
                    this.isLoading = false;
                    return;
                }
                
                DEBUG.log('User erfolgreich gefunden, lade Videos...');
                
                // Videos aus dem Video-Feed des Users holen
                const videos = await MEMBER_API.getVideosFromUserFeed(user, VIDEO_API);
                this.userVideos = videos;
                
                // Wenn ein Benutzer mehr Videos hat als sein Limit, passe das Limit an
                if (videos.length > maxUploads) {
                    DEBUG.log(`Benutzer hat ${videos.length} Videos, aber das Limit ist ${maxUploads}. Passe Limit an.`, null, 'warn');
                    maxUploads = Math.max(videos.length, maxUploads);
                }
                
                DEBUG.log(`Vor dem Rendern - Videoanzahl: ${videos.length}, Max-Uploads: ${maxUploads}`);
                
                // Videos anzeigen und Upload-Counter aktualisieren
                UI.renderVideos(videos, maxUploads);
                
                this.isLoading = false;
            } catch (error) {
                DEBUG.log('Fehler beim Laden der Videos', error, 'error');
                UI.showError(`Fehler beim Laden des Video-Feeds: ${error.message}`);
                this.isLoading = false;
            }
        }
        
        /**
         * Erzwingt eine Neuladung der Videos
         */
        forceReload() {
            DEBUG.log('Erzwinge Neuladung des Video-Feeds');
            this.loadUserVideos(true);
        }
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.videoFeedApp = new VideoFeedApp();
    
    // Füge eine globale Funktion zum manuellen Neuladen des Feeds hinzu
    window.reloadVideoFeed = function() {
        if (window.WEBFLOW_API && window.WEBFLOW_API.videoFeedApp) {
            window.WEBFLOW_API.videoFeedApp.forceReload();
            return true;
        }
        return false;
    };

    // Globale Funktion zum Setzen von Toggle-Werten hinzufügen
    window.setToggleValue = function(fieldName, value) {
        if (window.WEBFLOW_API && window.WEBFLOW_API.videoFeedApp) {
            window.WEBFLOW_API.videoFeedApp.setToggleValue(fieldName, value);
            return true;
        }
        return false;
    };
})();
