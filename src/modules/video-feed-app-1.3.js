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
            
            // Prüfe auf Cache-Busting-Parameter in der URL
            this.checkRefreshParameter();
        }
        
        /**
         * Prüft, ob die URL einen Refresh-Parameter enthält und leert ggf. den Cache
         */
        checkRefreshParameter() {
            try {
                const url = new URL(window.location.href);
                const refreshParam = url.searchParams.get('refresh');
                
                // Wenn ein refresh-Parameter existiert, leere den Cache
                if (refreshParam) {
                    DEBUG.log('Refresh-Parameter gefunden, Cache wird geleert');
                    
                    // Cache leeren
                    if (CACHE && typeof CACHE.clear === 'function') {
                        CACHE.clear();
                    }
                    
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
                
                // Cache löschen und Daten neu laden
                if (CACHE && typeof CACHE.clear === 'function') {
                    CACHE.clear();
                }
                this.loadUserVideos(true); // true = cache ignorieren
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
                    DEBUG.log('Neuer Upload erkannt, Cache wird ignoriert');
                    
                    // Cache leeren
                    if (CACHE && typeof CACHE.clear === 'function') {
                        CACHE.clear();
                    }
                    
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
                UI.showLoading();
                
                // Bei Bedarf Cache leeren
                if (ignoreCache && CACHE && typeof CACHE.clear === 'function') {
                    DEBUG.log('Cache wird gelöscht, um aktuelle Daten zu laden');
                    CACHE.clear();
                }
                
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
         * Erzwingt eine Neuladung der Videos ohne Cache
         */
        forceReload() {
            DEBUG.log('Erzwinge Neuladung des Video-Feeds ohne Cache');
            
            // Cache leeren
            if (CACHE && typeof CACHE.clear === 'function') {
                CACHE.clear();
            }
            
            // Videos neu laden mit Cache-Umgehung
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
})();
