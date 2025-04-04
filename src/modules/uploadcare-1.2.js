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

    class UploadcareService {
        constructor() {
            // Uploadcare Datei-Informationen speichern
            this.fileUuid = "";
            this.fileCdnUrl = "";
            this.processedUrl = ""; // URL mit Videokonvertierung
            this.isVideoProcessing = false;
        }
        
        /**
         * Initialisiert den Uploadcare-Service
         */
        init() {
            // Prüfe, ob das Uploadcare-Element existiert
            const uploaderCtx = document.querySelector('[id*="uploaderCtx"]');
            if (!uploaderCtx) {
                DEBUG.log("Uploadcare Context Provider nicht gefunden", null, 'warn');
                return;
            }

            DEBUG.log("Uploadcare Context Provider gefunden", uploaderCtx);

            // Event-Listener für erfolgreiche Uploads
            uploaderCtx.addEventListener('file-upload-success', this.handleUploadSuccess.bind(this));
            
            // Event-Listener für Upload-Fortschritt
            uploaderCtx.addEventListener('file-upload-progress', this.handleUploadProgress.bind(this));
            
            // Event-Listener für Start des Uploads
            uploaderCtx.addEventListener('file-upload-start', () => {
                DEBUG.log("Upload gestartet");
            });
            
            // Event-Listener für Upload-Fehler
            uploaderCtx.addEventListener('file-upload-failed', (event) => {
                DEBUG.log("Upload fehlgeschlagen:", event.detail, 'error');
            });
            
            // Regelmäßige Überprüfung für Uploads
            setInterval(this.getUploadcareFileInfo.bind(this), 1000);
        }
        
        /**
         * Behandelt erfolgreiche Uploads
         * @param {Event} event - Das Upload-Erfolgs-Event
         */
        handleUploadSuccess(event) {
            const fileInfo = event.detail;
            DEBUG.log("Upload erfolgreich:", fileInfo);
            
            if (fileInfo && fileInfo.uuid) {
                this.fileUuid = fileInfo.uuid;
                this.fileCdnUrl = fileInfo.cdnUrl;
                
                // Bei Videos: Initiiere Konvertierung
                if (fileInfo.mimeType && fileInfo.mimeType.startsWith('video/')) {
                    DEBUG.log(`Video-Upload erkannt: ${fileInfo.name} (${fileInfo.mimeType})`);
                    this.isVideoProcessing = true;
                    this.initiateVideoConversion(fileInfo.uuid);
                }
            }
        }
        
        /**
         * Verarbeitet den Upload-Fortschritt
         * @param {Event} event - Das Upload-Fortschritts-Event
         */
        handleUploadProgress(event) {
            const progress = event.detail.progress;
            DEBUG.log(`Upload-Fortschritt: ${Math.round(progress * 100)}%`);
            
            // UI aktualisieren, falls ein Progress-Element existiert
            const progressElem = document.getElementById(CONFIG.UPLOAD_PROGRESS_ID);
            if (progressElem) {
                progressElem.style.width = `${Math.round(progress * 100)}%`;
            }
        }
        
        /**
         * Initiiert die Videokonvertierung
         * @param {string} fileUuid - Die UUID der hochgeladenen Datei
         */
        async initiateVideoConversion(fileUuid) {
            if (!fileUuid) return;
            
            try {
                DEBUG.log(`Starte Videokonvertierung für UUID: ${fileUuid}`);
                
                // Verwende den Worker für die Videokonvertierung
                const response = await fetch(CONFIG.VIDEO_CONVERT_WORKER_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        uuid: fileUuid
                    })
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    DEBUG.log("Fehler bei der Videokonvertierung:", `${response.status} ${errorText}`, 'error');
                    return;
                }
                
                const result = await response.json();
                DEBUG.log("Videokonvertierung initiiert:", result);
                
                // Speichere die verarbeitete URL
                if (result && result.url) {
                    this.processedUrl = result.url;
                }
            } catch (error) {
                DEBUG.log("Fehler bei der Videokonvertierung:", error, 'error');
            }
        }
        
        /**
         * Ruft Informationen über die Uploadcare-Datei ab
         */
        async getUploadcareFileInfo() {
            if (!this.fileUuid || !this.isVideoProcessing) return;
            
            try {
                // Verwende den Worker, um Informationen über die Datei zu erhalten
                const response = await fetch(`${CONFIG.WORKER_BASE_URL}https://api.uploadcare.com/files/${this.fileUuid}/`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/vnd.uploadcare-v0.7+json'
                    }
                });
                
                if (!response.ok) {
                    DEBUG.log("Fehler beim Abrufen der Dateiinformationen", response.status, 'warn');
                    return;
                }
                
                const fileInfo = await response.json();
                
                // Prüfe, ob die Konvertierung abgeschlossen ist
                if (fileInfo && fileInfo.is_ready) {
                    DEBUG.log("Video ist fertig verarbeitet:", fileInfo);
                    this.isVideoProcessing = false;
                    
                    // Wenn kein processedUrl gesetzt ist, verwende die Standard-CDN-URL
                    if (!this.processedUrl) {
                        this.processedUrl = this.fileCdnUrl;
                    }
                }
            } catch (error) {
                DEBUG.log("Fehler beim Abrufen der Dateiinformationen:", error, 'error');
            }
        }

        /**
         * Löscht eine Datei von Uploadcare
         */
        async deleteUploadcareFile(fileUuid) {
            if (!fileUuid) {
                DEBUG.log("Keine Uploadcare-UUID zum Löschen angegeben", null, 'error');
                return false;
            }
            
            // Wenn SKIP_UPLOADCARE_DELETE aktiviert ist, nicht löschen
            if (CONFIG.SKIP_UPLOADCARE_DELETE) {
                DEBUG.log(`SKIP_UPLOADCARE_DELETE ist aktiviert. Überspringe Löschung von ${fileUuid}`, null, 'warn');
                return true;
            }

            try {
                DEBUG.log(`Lösche Uploadcare-Datei mit UUID: ${fileUuid}`);
                
                // Verwende den Worker für die Uploadcare-API
                const response = await fetch(CONFIG.UPLOADCARE_WORKER_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.uploadcare-v0.7+json'
                    },
                    body: JSON.stringify({
                        uuid: fileUuid,
                        action: 'delete'
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    DEBUG.log("Fehler beim Löschen der Uploadcare-Datei:", `${response.status} ${errorText}`, 'error');
                    return false;
                }

                DEBUG.log(`Uploadcare-Datei ${fileUuid} erfolgreich gelöscht`);
                return true;
            } catch (error) {
                DEBUG.log("Fehler beim Löschen der Uploadcare-Datei:", error, 'error');
                return false;
            }
        }
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.UPLOADCARE = new UploadcareService();
})();
