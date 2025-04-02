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
        
        // Alle anderen Methoden bleiben unverändert:
        // - analyzeForm()
        // - initFormSubmit()
        // - handleFormSubmit()
        // - getFormValue()
        // - findCheckbox()
        // - getVideoLink()
        // - getKategorieId()
        // - showProgressBar()
        // - hideProgressBar()
        // - updateProgressBar()

        // [Alle Methoden aus dem Originalskript würden hier unverändert eingefügt]
        // Aus Platzgründen nur Platzhalter, in der tatsächlichen Implementierung 
        // würden alle Methoden vollständig übernommen werden
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.videoUploadApp = new VideoUploadApp();
})();
