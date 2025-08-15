(function () {
  'use strict';

  // Stelle sicher, dass WEBFLOW_API existiert
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.config = window.WEBFLOW_API.config || {};

  // Globale Objekte und Abhängigkeiten vorbereiten
  const CONFIG = window.WEBFLOW_API.config;
  const DEBUG = window.WEBFLOW_API.debug || {
    log: function (message, data = null, level = 'info') {
      console.log(`[${level}] ${message}`, data || '');
    },
  };

  class UploadcareService {
    constructor() {
      // Uploadcare Datei-Informationen speichern
      this.fileUuid = '';
      this.fileCdnUrl = '';
      this.processedUrl = ''; // URL mit Videokonvertierung
      this.isVideoProcessing = false;

      // ✅ Neu: Zustände zur Vermeidung doppelter Initialisierung / Logs
      this._initialized = false;
      this._pollingIntervalId = null;
      this._uploaderCtx = null;
      this._onSuccess = null;
      this._onProgress = null;
      this._onStart = null;
      this._onFailed = null;
      this._lastLoggedUuid = null;
      this._lastProgress = -1;
    }

    /**
     * Idempotente Initialisierung des Uploadcare-Services
     */
    init() {
      // Prüfe, ob das Uploadcare-Element existiert
      const uploaderCtx = document.querySelector('[id*="uploaderCtx"]');
      if (!uploaderCtx) {
        DEBUG.log('Uploadcare Context Provider nicht gefunden', null, 'warn');
        return;
      }

      // Falls bereits initialisiert, nicht erneut binden
      if (this._initialized) {
        DEBUG.log('UPLOADCARE.init() bereits ausgeführt – überspringe erneute Initialisierung');
        return;
      }

      this._uploaderCtx = uploaderCtx;
      DEBUG.log('Uploadcare Context Provider gefunden', uploaderCtx);

      // Event-Listener NUR EINMAL binden (und für späteres Entfernen speichern)
      this._onSuccess = this.handleUploadSuccess.bind(this);
      this._onProgress = this.handleUploadProgress.bind(this);
      this._onStart = () => DEBUG.log('Upload gestartet');
      this._onFailed = (event) => {
        DEBUG.log('Upload fehlgeschlagen:', event?.detail, 'error');
      };

      uploaderCtx.addEventListener('file-upload-success', this._onSuccess, { once: false });
      uploaderCtx.addEventListener('file-upload-progress', this._onProgress, { once: false });
      uploaderCtx.addEventListener('file-upload-start', this._onStart, { once: false });
      uploaderCtx.addEventListener('file-upload-failed', this._onFailed, { once: false });

      // Regelmäßige Überprüfung für Uploads – existierendes Intervall vorher stoppen
      if (this._pollingIntervalId) {
        clearInterval(this._pollingIntervalId);
      }
      this._pollingIntervalId = setInterval(() => this.getUploadcareFileInfo(), 1000);

      this._initialized = true;
    }

    /**
     * Optional: Aufräumen (z. B. beim Navigieren zwischen Seiten)
     */
    destroy() {
      if (this._uploaderCtx) {
        if (this._onSuccess) this._uploaderCtx.removeEventListener('file-upload-success', this._onSuccess);
        if (this._onProgress) this._uploaderCtx.removeEventListener('file-upload-progress', this._onProgress);
        if (this._onStart) this._uploaderCtx.removeEventListener('file-upload-start', this._onStart);
        if (this._onFailed) this._uploaderCtx.removeEventListener('file-upload-failed', this._onFailed);
      }
      if (this._pollingIntervalId) {
        clearInterval(this._pollingIntervalId);
        this._pollingIntervalId = null;
      }
      this._initialized = false;
      this._lastLoggedUuid = null;
      this._lastProgress = -1;
    }

    /**
     * Funktion zum Abrufen der Dateiinformationen
     */
    getUploadcareFileInfo() {
      try {
        const uploaderCtx = this._uploaderCtx || document.querySelector('[id*="uploaderCtx"]');
        if (!uploaderCtx) return null;

        const api = uploaderCtx.getAPI();
        const state = api.getOutputCollectionState();

        if (state.successCount > 0) {
          // Nimm die erste erfolgreiche Datei
          const fileEntry = state.successEntries[0];

          // Speichere die UUID und CDN URL
          this.fileUuid = fileEntry.uuid || '';
          this.fileCdnUrl = fileEntry.cdnUrl || '';

          // 🔇 Nur loggen, wenn sich die UUID ändert (verhindert Spam)
          if (this._lastLoggedUuid !== this.fileUuid) {
            DEBUG.log('Uploadcare Datei gefunden:', {
              name: fileEntry.name,
              uuid: this.fileUuid,
              originalCdnUrl: this.fileCdnUrl,
            });
            this._lastLoggedUuid = this.fileUuid;
          }

          // Aktualisiere versteckte Felder im Formular, falls vorhanden
          this.updateHiddenFields();

          // Zeige Dateiinformationen an
          this.displayFileInfo(fileEntry);

          // 🛑 Polling stoppen – wir haben die Datei
          if (this._pollingIntervalId) {
            clearInterval(this._pollingIntervalId);
            this._pollingIntervalId = null;
          }

          return fileEntry;
        }

        // Prüfe, ob derzeit eine Datei hochgeladen wird – Progress nur loggen/rendern, wenn er sich ändert
        if (state.uploadingCount > 0) {
          const uploadingFile = state.uploadingEntries[0];
          const progress = Math.round(uploadingFile.uploadProgress || 0);
          if (progress !== this._lastProgress) {
            this.displayFileInfo(uploadingFile, true);
            this._lastProgress = progress;
          }
        }

        return null;
      } catch (error) {
        DEBUG.log('Fehler beim Abrufen der Uploadcare-Dateiinformationen:', error, 'error');
        return null;
      }
    }

    /**
     * Behandelt einen erfolgreichen Upload
     */
    async handleUploadSuccess(event) {
      DEBUG.log('Uploadcare Upload erfolgreich:', event?.detail);
      const fileEntry = this.getUploadcareFileInfo();

      // Deaktiviere den Submit-Button während der Konvertierung
      const form = document.getElementById(CONFIG.FORM_ID);
      const submitButton = form ? form.querySelector('input[type="submit"], button[type="submit"]') : null;
      let originalValue = '';

      if (submitButton) {
        submitButton.disabled = true;
        originalValue = submitButton.value || submitButton.textContent;
        if (submitButton.type === 'submit') submitButton.value = 'Video wird optimiert...';
        else submitButton.textContent = 'Video wird optimiert...';
      }

      // Wenn Video hochgeladen, starte die Konvertierung
      if (fileEntry && this.fileUuid) {
        try {
          // Zeige Konvertierungsstatus an
          this.isVideoProcessing = true;
          this.displayFileInfo(fileEntry, false);

          // Starte die Videokonvertierung mit dem Worker
          await this.convertVideoWithWorker(this.fileUuid);

          // Aktualisiere die Anzeige nach der Konvertierung
          this.displayFileInfo(fileEntry, false);
        } catch (error) {
          DEBUG.log('Fehler bei der Videokonvertierung:', error, 'error');
        } finally {
          // Reaktiviere den Submit-Button
          if (submitButton) {
            submitButton.disabled = false;
            if (submitButton.type === 'submit') submitButton.value = originalValue;
            else submitButton.textContent = originalValue;
          }
        }
      }
    }

    /**
     * Behandelt einen Upload-Fortschritt
     */
    handleUploadProgress(event) {
      // Keine Log-Spam – nur aktualisieren, getUploadcareFileInfo verarbeitet Deduplikation
      this.getUploadcareFileInfo();
    }

    /**
     * Zeigt Dateiinformation an
     */
    displayFileInfo(fileEntry, isUploading = false) {
      const fileInfoDiv = document.getElementById('fileInfo');
      if (!fileInfoDiv) return;

      let statusText = '';

      if (isUploading) {
        statusText = ` Wird hochgeladen (${Math.round(fileEntry.uploadProgress || 0)}%)... `;
      } else if (this.isVideoProcessing) {
        statusText = ' Video wird optimiert... ';
      } else {
        statusText = ' Erfolgreich hochgeladen ';
      }

      fileInfoDiv.innerHTML = `

 Datei: ${fileEntry.name}
 Größe: ${this.formatFileSize(fileEntry.size)}
 Status: ${statusText}

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
        DEBUG.log('Keine UUID für Videokonvertierung vorhanden', null, 'warn');
        return null;
      }

      try {
        this.isVideoProcessing = true;
        DEBUG.log('Starte Videokonvertierung für UUID:', uuid);

        // Sende Anfrage an den Cloudflare Worker
        const response = await fetch(CONFIG.VIDEO_CONVERT_WORKER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            uuid: uuid,
            format: 'mp4',
            quality: 'lighter',
            size: '360x640',
          }),
        });

        // Verarbeite die Antwort
        if (!response.ok) {
          throw new Error(`Worker-Fehler: ${response.status}`);
        }

        const data = await response.json();
        DEBUG.log('Worker-Antwort erhalten:', data);

        this.isVideoProcessing = false;

        if (data.status === 'success' && data.result) {
          // Verarbeite die Antwort, wobei result ein Array sein kann
          let convertedUuid = null;

          if (Array.isArray(data.result) && data.result.length > 0) {
            const firstResult = data.result[0];
            if (firstResult && firstResult.uuid) {
              convertedUuid = firstResult.uuid;
            }
          } else if (data.result.uuid) {
            convertedUuid = data.result.uuid;
          }

          if (convertedUuid) {
            DEBUG.log('Videokonvertierung erfolgreich, UUID:', convertedUuid);
            this.processedUrl = `https://ucarecdn.com/${convertedUuid}/`;
            this.updateHiddenFields();
            return { uuid: convertedUuid };
          } else {
            DEBUG.log('Keine UUID in der Worker-Antwort gefunden:', data, 'warn');
            return null;
          }
        } else {
          DEBUG.log('Unerwartetes Format der Worker-Antwort:', data, 'warn');
          return null;
        }
      } catch (error) {
        this.isVideoProcessing = false;
        DEBUG.log('Fehler bei der Videokonvertierung:', error, 'error');
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
        const uuidMatch = videoUrl.match(/ucarecdn\.com\/([a-f0-9-]+)/i);
        if (uuidMatch && uuidMatch[1]) return uuidMatch[1];
      }

      // Überprüfe auf einen direkten Uploadcare-Dateilink (cdnX.uploadcare)
      if (videoUrl.includes('uploadcare')) {
        const uuidMatch = videoUrl.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (uuidMatch && uuidMatch[1]) return uuidMatch[1];
      }

      DEBUG.log('Konnte keine Uploadcare UUID aus der URL extrahieren:', videoUrl, 'warn');
      return null;
    }

    /**
     * Löscht eine Datei von Uploadcare
     */
    async deleteUploadcareFile(fileUuid) {
      if (!fileUuid) {
        DEBUG.log('Keine Uploadcare-UUID zum Löschen angegeben', null, 'error');
        return false;
      }

      if (CONFIG.SKIP_UPLOADCARE_DELETE) {
        DEBUG.log(`SKIP_UPLOADCARE_DELETE ist aktiviert. Überspringe Löschung von ${fileUuid}`, null, 'warn');
        return true;
      }

      try {
        DEBUG.log(`Lösche Uploadcare-Datei mit UUID: ${fileUuid}`);

        const response = await fetch(CONFIG.UPLOADCARE_WORKER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/vnd.uploadcare-v0.7+json',
          },
          body: JSON.stringify({ uuid: fileUuid, action: 'delete' }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          DEBUG.log('Fehler beim Löschen der Uploadcare-Datei:', `${response.status} ${errorText}`, 'error');
          return false;
        }

        DEBUG.log(`Uploadcare-Datei ${fileUuid} erfolgreich gelöscht`);
        return true;
      } catch (error) {
        DEBUG.log('Fehler beim Löschen der Uploadcare-Datei:', error, 'error');
        return false;
      }
    }
  }

  // Singleton-Instanz im globalen Namespace registrieren
  window.WEBFLOW_API.UPLOADCARE = new UploadcareService();
})();
