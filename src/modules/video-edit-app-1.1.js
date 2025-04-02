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
        
        // ... Rest der Methoden bleibt unverändert
        // (fillEditForm, initCharacterCounters, setupCharacterCounter, updateCharCounter, etc.)
        
        // [Alle Methoden aus dem Original-Skript]
        
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
        
        // Zusätzliche Hilfsmethoden (getValue, getChecked, etc.) bleiben unverändert
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.videoEditApp = new VideoEditApp();
})();
