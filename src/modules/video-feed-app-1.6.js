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
    const CACHE = window.WEBFLOW_API.cache || {
        clear: () => {},
        get: () => null,
        set: () => {}
    };
    const UI = window.WEBFLOW_API.UI || {
        init: () => {},
        showLoading: (count) => {},
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

    // Konstante für den localStorage Key
    const VIDEO_COUNT_STORAGE_KEY = 'webflow_video_count';
    const DEFAULT_SKELETON_COUNT = 3;

    class VideoFeedApp {
        constructor() {
            this.currentMember = null;
            this.userVideos = [];
            this.isLoading = false;
            this.lastVideoCount = this.getLastVideoCount();
            
            // Prüfe auf Cache-Busting-Parameter in der URL
            this.checkRefreshParameter();
        }
        
        /**
         * Holt die letzte bekannte Video-Anzahl aus dem localStorage
         * @returns {number} - Die Anzahl der Videos oder Standardwert
         */
        getLastVideoCount() {
            try {
                const storedCount = localStorage.getItem(VIDEO_COUNT_STORAGE_KEY);
                const count = parseInt(storedCount, 10);
                return !isNaN(count) && count > 0 ? count : DEFAULT_SKELETON_COUNT;
            } catch (error) {
                DEBUG.log('Fehler beim Lesen des video count aus localStorage', error, 'warn');
                return DEFAULT_SKELETON_COUNT;
            }
        }
        
        /**
         * Speichert die aktuelle Video-Anzahl im localStorage
         * @param {number} count - Die zu speichernde Anzahl
         */
        saveVideoCount(count) {
            try {
                if (count && count > 0) {
                    localStorage.setItem(VIDEO_COUNT_STORAGE_KEY, count.toString());
                    this.lastVideoCount = count;
                    DEBUG.log(`Video-Anzahl (${count}) im localStorage gespeichert`);
                }
            } catch (error) {
                DEBUG.log('Fehler beim Speichern des video count in localStorage', error, 'warn');
            }
        }
        
        /**
         * Prüft, ob die URL einen Refresh-Parameter enthält und löst ein Event aus
         */
        checkRefreshParameter() {
            try {
                const url = new URL(window.location.href);
                const refreshParam = url.searchParams.get('refresh');
                
                // Wenn ein refresh-Parameter existiert, Event auslösen
                if (refreshParam) {
                    DEBUG.log('Refresh-Parameter gefunden');
                    
                    // Event auslösen anstatt Cache zu leeren
                    const event = new CustomEvent('refreshRequest');
                    document.dispatchEvent(event);
                    
                    // Parameter aus der URL entfernen, um unnötige Refreshes zu vermeiden
                    url.searchParams.delete('refresh');
                    window.history.replaceState({}, document.title, url.toString());
                }
            } catch (error) {
                // Ignoriere Fehler, dies ist nur eine Hilfe-Funktion
                DEBUG.log('Fehler beim Prüfen des Refresh-Parameters', error, 'warn');
            }
        }
        
        /**
         * Initialisiert die App
         */
        init() {
            DEBUG.log('Initialisiere Video-Feed App');
            
            // UI-Elemente initialisieren
            UI.init();
            
            // Prüfe, ob ein neuer Upload stattgefunden hat
            this.checkForUploadParameters();
            
            // Event-Listener für Video-Feed-Updates registrieren
            document.addEventListener('videoFeedUpdate', () => {
                DEBUG.log('Update-Event empfangen, lade Feed neu');
                this.loadUserVideos(true);
            });
            
            // Event-Listener für Refresh-Anfragen
            document.addEventListener('refreshRequest', () => {
                DEBUG.log('Refresh-Event empfangen, lade Feed neu');
                this.loadUserVideos(true);
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
            this.loadUserVideos();
        }
        
        /**
         * Prüft auf URL-Parameter, die auf einen neuen Upload hinweisen
         */
        checkForUploadParameters() {
            try {
                const url = new URL(window.location.href);
                const newUpload = url.searchParams.get('newupload');
                
                if (newUpload) {
                    DEBUG.log('Neuer Upload erkannt');
                    
                    // Parameter aus der URL entfernen
                    url.searchParams.delete('newupload');
                    window.history.replaceState({}, document.title, url.toString());
                }
            } catch (error) {
                DEBUG.log('Fehler beim Prüfen der Upload-Parameter', error, 'warn');
            }
        }
        
        /**
         * Lädt die Videos des eingeloggten Users
         * @param {boolean} ignoreCache - Wenn true, wird der Cache ignoriert
         */
        async loadUserVideos(ignoreCache = false) {
            try {
                // Verhindere parallele Ladeanfragen
                if (this.isLoading) {
                    DEBUG.log('Ladevorgang bereits aktiv, ignoriere Anfrage');
                    return;
                }
                
                this.isLoading = true;
                
                // Zeige Skeleton-Loader mit der letzten bekannten Anzahl
                DEBUG.log(`Zeige Skeleton-Loader für ${this.lastVideoCount} Videos`);
                UI.showLoading(this.lastVideoCount);
                
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
                
                // Videos aus dem Video-Feed des Users holen
                const videos = await MEMBER_API.getVideosFromUserFeed(user, VIDEO_API);
                this.userVideos = videos;
                
                // Speichere die neue Video-Anzahl für zukünftige Skeleton-Loader
                this.saveVideoCount(videos.length);
                
                // Wenn ein Benutzer mehr Videos hat als sein Limit, passe das Limit an
                // Dies ist wichtig, damit bereits hochgeladene Videos weiterhin angezeigt werden
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
        
        /**
         * Setzt den Video-Count im localStorage zurück
         * Nützlich für Debugging oder als Extension-Methode
         */
        resetVideoCount() {
            try {
                localStorage.removeItem(VIDEO_COUNT_STORAGE_KEY);
                this.lastVideoCount = DEFAULT_SKELETON_COUNT;
                DEBUG.log('Video-Count zurückgesetzt auf Standardwert', this.lastVideoCount);
                return true;
            } catch (error) {
                DEBUG.log('Fehler beim Zurücksetzen des Video-Counts', error, 'error');
                return false;
            }
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
    
    // Debugging-Funktion zum Zurücksetzen des Video-Counts
    window.resetVideoFeedCount = function() {
        if (window.WEBFLOW_API && window.WEBFLOW_API.videoFeedApp) {
            return window.WEBFLOW_API.videoFeedApp.resetVideoCount();
        }
        return false;
    };
})();
