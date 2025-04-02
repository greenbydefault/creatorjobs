// src/modules/uploadcare.js
import { CONFIG } from '../config.js';
import { DEBUG } from './debug.js';

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
     * Funktion zum Abrufen der Dateiinformationen
     */
    getUploadcareFileInfo() {
        try {
            const uploaderCtx = document.querySelector('[id*="uploaderCtx"]');
            if (!uploaderCtx) return null;
            
            const api = uploaderCtx.getAPI();
            const state = api.getOutputCollectionState();
            
            if (state.successCount > 0) {
                // Nimm die erste erfolgreiche Datei
                const fileEntry = state.successEntries[0];
                
                // Speichere die UUID und CDN URL
                this.fileUuid = fileEntry.uuid || "";
                this.fileCdnUrl = fileEntry.cdnUrl || "";
                
                DEBUG.log("Uploadcare Datei gefunden:", {
                    name: fileEntry.name,
                    uuid: this.fileUuid,
                    originalCdnUrl: this.fileCdnUrl
                });
                
                // Aktualisiere versteckte Felder im Formular, falls vorhanden
                this.updateHiddenFields();
                
                // Zeige Dateiinformationen an
                this.displayFileInfo(fileEntry);
                
                return fileEntry;
            }
            
            // Prüfe, ob derzeit eine Datei hochgeladen wird
            if (state.uploadingCount > 0) {
                const uploadingFile = state.uploadingEntries[0];
                this.displayFileInfo(uploadingFile, true);
            }
            
            return null;
        } catch (error) {
            DEBUG.log("Fehler beim Abrufen der Uploadcare-Dateiinformationen:", error, 'error');
            return null;
        }
    }
    
    /**
     * Behandelt einen erfolgreichen Upload
     */
    async handleUploadSuccess(event) {
        DEBUG.log("Uploadcare Upload erfolgreich:", event.detail);
        const fileEntry = this.getUploadcareFileInfo();
        
        // Deaktiviere den Submit-Button während der Konvertierung
        const form = document.getElementById(CONFIG.FORM_ID);
        const submitButton = form ? form.querySelector('input[type="submit"], button[type="submit"]') : null;
        let originalValue = ""; // Initialisiere originalValue
        
        if (submitButton) {
            submitButton.disabled = true;
            originalValue = submitButton.value || submitButton.textContent; // Speichere Original-Wert
            submitButton.value = submitButton.type === 'submit' ? "Video wird optimiert..." : originalValue;
            submitButton.textContent = submitButton.type !== 'submit' ? "Video wird optimiert..." : submitButton.textContent;
        }
        
        // Wenn Video hochgeladen, starte die Konvertierung
        if (fileEntry && this.fileUuid) {
            try {
                // Zeige Konvertierungsstatus an
                this.isVideoProcessing = true;
                if (fileEntry) {
                    this.displayFileInfo(fileEntry, false);
                }
                
                // Starte die Videokonvertierung mit dem Worker
                const result = await this.convertVideoWithWorker(this.fileUuid);
                
                // Aktualisiere die Anzeige nach der Konvertierung
                if (fileEntry) {
                    this.displayFileInfo(fileEntry, false);
                }
            } catch (error) {
                DEBUG.log("Fehler bei der Videokonvertierung:", error, 'error');
            } finally {
                // Reaktiviere den Submit-Button
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.value = submitButton.type === 'submit' ? originalValue : submitButton.value;
                    submitButton.textContent = submitButton.type !== 'submit' ? originalValue : submitButton.textContent;
                }
            }
        }
    }
    
    /**
     * Behandelt einen Upload-Fortschritt
     */
    handleUploadProgress(event) {
        DEBUG.log("Upload-Fortschritt:", event.detail);
        this.getUploadcareFileInfo();
    }
    
    /**
     * Zeigt Dateiinformation an
     */
    displayFileInfo(fileEntry, isUploading = false) {
        const fileInfoDiv = document.getElementById('fileInfo');
        if (!fileInfoDiv) return;
        
        let statusText = "";
        
        if (isUploading) {
            statusText = `<span style="color: #0066cc;">Wird hochgeladen (${Math.round(fileEntry.uploadProgress)}%)...</span>`;
        } else if (this.isVideoProcessing) {
            statusText = '<span style="color: #ff9900;">Video wird optimiert...</span>';
        } else {
            statusText = '<span style="color: green;">Erfolgreich hochgeladen</span>';
        }
        
        fileInfoDiv.innerHTML = `
            <div>
                <p class="is-txt-16"><strong>Datei:</strong> ${fileEntry.name}</p>
                <p class="is-txt-16"><strong>Größe:</strong> ${this.formatFileSize(fileEntry.size)}</p>
                <p class="is-txt-16"><strong>Status:</strong> ${statusText}</p>
            </div>
        `;
    }
    
    /**
     * Formatiert die Dateigröße
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Aktualisiert versteckte Felder im Formular
     */
    updateHiddenFields() {
        const form = document.getElementById(CONFIG.FORM_ID);
        if (!form) return;
        
        // Suche nach versteckten Feldern für die UUID und CDN URL
        const videoLinkInput = form.querySelector("input[name='Video Link'], input[name='VideoLink'], input[name='video-link']");
        if (videoLinkInput) {
            // Bevorzuge die konvertierte URL, falls vorhanden
            videoLinkInput.value = this.processedUrl || this.fileCdnUrl;
            DEBUG.log("Verstecktes Feld 'Video Link' aktualisiert:", videoLinkInput.value);
        }
        
        // Optional: Feld für die UUID finden und aktualisieren
        const uuidInput = form.querySelector("input[name='File UUID'], input[name='FileUUID'], input[name='file-uuid']");
        if (uuidInput) {
            uuidInput.value = this.fileUuid;
            DEBUG.log("Verstecktes Feld 'File UUID' aktualisiert:", this.fileUuid);
        }
    }
    
    /**
     * Funktion zur Videokonvertierung mit dem Cloudflare Worker
     */
    async convertVideoWithWorker(uuid) {
        if (!uuid) {
            DEBUG.log("Keine UUID für Videokonvertierung vorhanden", null, 'warn');
            return null;
        }

        try {
            this.isVideoProcessing = true;
            DEBUG.log("Starte Videokonvertierung für UUID:", uuid);

            // Sende Anfrage an den Cloudflare Worker
            const response = await fetch(CONFIG.VIDEO_CONVERT_WORKER_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    uuid: uuid,
                    format: "mp4",
                    quality: "lighter",
                    size: "360x640"
                })
            });

            // Verarbeite die Antwort
            if (!response.ok) {
                throw new Error(`Worker-Fehler: ${response.status}`);
            }

            const data = await response.json();
            DEBUG.log("Worker-Antwort erhalten:", data);
            
            this.isVideoProcessing = false;

            if (data.status === "success" && data.result) {
                // Verarbeite die Antwort, wobei result ein Array sein kann
                let convertedUuid = null;
                
                if (Array.isArray(data.result) && data.result.length > 0) {
                    // Nimm das erste Element des Arrays
                    const firstResult = data.result[0];
                    // Prüfe, ob es eine UUID enthält
                    if (firstResult && firstResult.uuid) {
                        convertedUuid = firstResult.uuid;
                    }
                } else if (data.result.uuid) {
                    // Falls result direkt ein Objekt mit uuid ist
                    convertedUuid = data.result.uuid;
                }
                
                if (convertedUuid) {
                    DEBUG.log("Videokonvertierung erfolgreich, UUID:", convertedUuid);
                    // Setze die neue URL
                    this.processedUrl = `https://ucarecdn.com/${convertedUuid}/`;
                    
                    // Aktualisiere versteckte Felder
                    this.updateHiddenFields();
                    
                    return { uuid: convertedUuid };
                } else {
                    DEBUG.log("Keine UUID in der Worker-Antwort gefunden:", data, 'warn');
                    return null;
                }
            } else {
                DEBUG.log("Unerwartetes Format der Worker-Antwort:", data, 'warn');
                return null;
            }
        } catch (error) {
            this.isVideoProcessing = false;
            DEBUG.log("Fehler bei der Videokonvertierung:", error, 'error');
            return null;
        }
    }
    
    /**
     * Extrahiert die Uploadcare-UUID aus einer URL
     */
    extractUploadcareUuid(videoUrl) {
        if (!videoUrl) return null;

        // Überprüfen, ob es eine Uploadcare-URL ist
        if (videoUrl.includes('ucarecdn.com')) {
            // Extrahiere die UUID aus der URL (Format: https://ucarecdn.com/UUID/filename)
            const uuidMatch = videoUrl.match(/ucarecdn\.com\/([a-f0-9-]+)/i);
            if (uuidMatch && uuidMatch[1]) {
                return uuidMatch[1];
            }
        }
        
        // Überprüfe auf einen direkten Uploadcare-Dateilink (cdnX.uploadcare)
        if (videoUrl.includes('uploadcare')) {
            const uuidMatch = videoUrl.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
            if (uuidMatch && uuidMatch[1]) {
                return uuidMatch[1];
            }
        }

        DEBUG.log("Konnte keine Uploadcare UUID aus der URL extrahieren:", videoUrl, 'warn');
        return null;
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

// Singleton-Instanz exportieren
export const UPLOADCARE = new UploadcareService();
