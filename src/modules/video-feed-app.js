// src/modules/video-feed-app.js
import { CONFIG } from '../config.js';
import { DEBUG } from './debug.js';
import { CACHE } from './cache.js';
import { UI } from './ui-manager.js';
import { MEMBERSTACK } from './memberstack.js';
import { MEMBER_API } from './member-api.js';
import { VIDEO_API } from './video-api.js';

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
            
            // Cache löschen und Daten neu laden
            CACHE.clear();
            this.loadUserVideos();
        });
        
        // Videos laden
        this.loadUserVideos();
    }
    
    /**
     * Lädt die Videos des eingeloggten Users
     */
    async loadUserVideos() {
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
            const maxUploads = membershipDetails.limit;
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
}

// Singleton-Instanz exportieren
export const VIDEO_FEED_APP = new VideoFeedApp();
