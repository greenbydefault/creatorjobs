// src/index.js - Haupteinstiegspunkt für die Webflow Video API Integration
import { CONFIG } from './config.js';
import { DEBUG } from './modules/debug.js';
import { CACHE } from './modules/cache.js';
import { API } from './modules/api-service.js';
import { VIDEO_API } from './modules/video-api.js';
import { MEMBER_API } from './modules/member-api.js';
import { UPLOADCARE } from './modules/uploadcare.js';
import { MEMBERSTACK } from './modules/memberstack.js';
import { UI } from './modules/ui-manager.js';
import { VIDEO_FEED_APP } from './modules/video-feed-app.js';
import { VIDEO_EDIT_APP } from './modules/video-edit-app.js';
import { VIDEO_UPLOAD_APP } from './modules/video-upload-app.js';

/**
 * Hauptklasse, die die Integration in Webflow koordiniert
 */
class WebflowVideoAPI {
    constructor() {
        // Für die globale Verfügbarkeit der konfigurierten Module
        this.config = CONFIG;
        this.debug = DEBUG;
        this.cache = CACHE;
        this.api = API;
        this.videoApi = VIDEO_API;
        this.memberApi = MEMBER_API;
        this.uploadcare = UPLOADCARE;
        this.memberstack = MEMBERSTACK;
        this.ui = UI;
        this.videoFeedApp = VIDEO_FEED_APP;
        this.videoEditApp = VIDEO_EDIT_APP;
        this.videoUploadApp = VIDEO_UPLOAD_APP;
        
        // Debug-Flag direkt setzen
        DEBUG.setEnabled(CONFIG.DEBUG_MODE);
    }
    
    /**
     * Initialisiert die Integration basierend auf der aktuellen Seite
     */
    init() {
        DEBUG.log("Initialisiere Webflow Video API Integration");
        
        try {
            // Prüfe, welche Module auf der aktuellen Seite initialisiert werden sollen
            // basierend auf DOM-Elementen, die typischerweise auf bestimmten Seiten vorhanden sind
            
            // Wenn Video-Feed-Container vorhanden, initialisiere Feed App
            if (document.getElementById(CONFIG.VIDEO_CONTAINER_ID) || document.querySelector('.db-upload-wrapper')) {
                DEBUG.log("Video-Feed erkannt, initialisiere Feed App");
                this.videoFeedApp.init();
            }
            
            // Wenn Upload-Formular vorhanden, initialisiere Upload App
            if (document.getElementById(CONFIG.FORM_ID)) {
                DEBUG.log("Upload-Formular erkannt, initialisiere Upload App");
                this.videoUploadApp.init();
            }
            
            // Wenn Edit-Elemente vorhanden, initialisiere Edit App
            if (document.getElementById(CONFIG.EDIT_FORM_ID) || 
                document.querySelector(`[data-modal-id="${CONFIG.EDIT_MODAL_ID}"]`) ||
                document.querySelectorAll('[data-video-edit]').length > 0) {
                DEBUG.log("Video-Edit-Funktionalität erkannt, initialisiere Edit App");
                this.videoEditApp.init();
            }
            
            // Globale Debug-Funktionen bereitstellen
            this.initDebugTools();
            
            DEBUG.log("Webflow Video API Integration erfolgreich initialisiert");
        } catch (error) {
            DEBUG.log("Fehler bei der Initialisierung der Webflow Video API Integration", error, 'error');
        }
    }
    
    /**
     * Stellt globale Debug-Funktionen bereit
     */
    initDebugTools() {
        window.videoFeedDebug = {
            enable: () => DEBUG.setEnabled(true),
            disable: () => DEBUG.setEnabled(false),
            status: () => console.log(`Debugging ist derzeit ${DEBUG.enabled ? 'aktiviert' : 'deaktiviert'}`),
            showConfig: () => console.log('Aktuelle Konfiguration:', CONFIG),
            clearCache: () => {
                CACHE.clear();
                console.log('Cache geleert');
            },
            reloadFeed: () => {
                console.log('Lade Video-Feed neu...');
                this.videoFeedApp.loadUserVideos();
            }
        };
    }
}

// Warteschlange für Aufrufe vor der Initialisierung
window.WEBFLOW_API_QUEUE = window.WEBFLOW_API_QUEUE || [];

// Erstelle die Hauptinstanz
const webflowVideoAPI = new WebflowVideoAPI();

// Globales WEBFLOW_API-Objekt
window.WEBFLOW_API = webflowVideoAPI;

// Initialisiere die Anwendung nach dem DOM-Laden
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Kurze Verzögerung, um sicherzustellen, dass alle abhängigen Skripte geladen sind
        setTimeout(() => {
            webflowVideoAPI.init();
            
            // Verarbeite die Warteschlange
            if (window.WEBFLOW_API_QUEUE && window.WEBFLOW_API_QUEUE.length > 0) {
                DEBUG.log(`Verarbeite ${window.WEBFLOW_API_QUEUE.length} gepufferte Aufrufe`);
                
                window.WEBFLOW_API_QUEUE.forEach(call => {
                    try {
                        if (typeof call === 'function') {
                            call(webflowVideoAPI);
                        }
                    } catch (error) {
                        DEBUG.log("Fehler beim Verarbeiten eines gepufferten Aufrufs", error, 'error');
                    }
                });
                
                // Leere die Warteschlange
                window.WEBFLOW_API_QUEUE = [];
            }
        }, 100);
    });
} else {
    // DOM bereits geladen
    setTimeout(() => {
        webflowVideoAPI.init();
    }, 100);
}
