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

  const STATUS = {
    IDLE: 'idle',
    UPLOADING: 'uploading',
    PROCESSING: 'processing',
    READY: 'ready',
  };

  class UploadcareService {
    constructor() {
      this.fileUuid = '';
      this.fileCdnUrl = '';
      this.processedUrl = '';
      this.isVideoProcessing = false;

      // Zustands-/Flicker-Guards
      this._initialized = false;
      this._pollingIntervalId = null;
      this._uploaderCtx = null;
      this._onSuccess = null;
      this._onProgress = null;
      this._onStart = null;
      this._onFailed = null;
      this._lastProgress = -1;
      this._lastLoggedUuid = null;
      this._status = STATUS.IDLE;
    }

    init() {
      const uploaderCtx = document.querySelector('[id*="uploaderCtx"]');
      if (!uploaderCtx) {
        DEBUG.log('Uploadcare Context Provider nicht gefunden', null, 'warn');
        return;
      }
      if (this._initialized) {
        DEBUG.log('UPLOADCARE.init() bereits ausgeführt – überspringe erneute Initialisierung');
        return;
      }

      this._uploaderCtx = uploaderCtx;
      DEBUG.log('Uploadcare Context Provider gefunden', uploaderCtx);

      this._onSuccess = this.handleUploadSuccess.bind(this);
      this._onProgress = this.handleUploadProgress.bind(this);
      this._onStart = () => DEBUG.log('Upload gestartet');
      this._onFailed = (event) => DEBUG.log('Upload fehlgeschlagen:', event?.detail, 'error');

      uploaderCtx.addEventListener('file-upload-success', this._onSuccess);
      uploaderCtx.addEventListener('file-upload-progress', this._onProgress);
      uploaderCtx.addEventListener('file-upload-start', this._onStart);
      uploaderCtx.addEventListener('file-upload-failed', this._onFailed);

      if (this._pollingIntervalId) clearInterval(this._pollingIntervalId);
      this._pollingIntervalId = setInterval(() => this.getUploadcareFileInfo(), 1000);

      this._initialized = true;
    }

    destroy() {
      if (this._uploaderCtx) {
        if (this._onSuccess) this._uploaderCtx.removeEventListener('file-upload-success', this._onSuccess);
        if (this._onProgress) this._uploaderCtx.removeEventListener('file-upload-progress', this._onProgress);
        if (this._onStart) this._uploaderCtx.removeEventListener('file-upload-start', this._onStart);
        if (this._onFailed) this._uploaderCtx.removeEventListener('file-upload-failed', this._onFailed);
      }
      if (this._pollingIntervalId) clearInterval(this._pollingIntervalId);
      this._pollingIntervalId = null;
      this._initialized = false;
      this._status = STATUS.IDLE;
      this._lastProgress = -1;
      this._lastLoggedUuid = null;
    }

    getUploadcareFileInfo() {
      try {
        const uploaderCtx = this._uploaderCtx || document.querySelector('[id*="uploaderCtx"]');
        if (!uploaderCtx) return null;

        const api = uploaderCtx.getAPI();
        const state = api.getOutputCollectionState();

        if (state.successCount > 0) {
          const fileEntry = state.successEntries[0];
          this.fileUuid = fileEntry.uuid || '';
          this.fileCdnUrl = fileEntry.cdnUrl || '';

          if (this._lastLoggedUuid !== this.fileUuid) {
            DEBUG.log('Uploadcare Datei gefunden:', {
              name: fileEntry.name,
              uuid: this.fileUuid,
              originalCdnUrl: this.fileCdnUrl,
            });
            this._lastLoggedUuid = this.fileUuid;
          }

          this.updateHiddenFields();

          // Wenn wir NICHT in Verarbeitung sind, zeigen wir "bereit" an und stoppen Polling.
          if (this._status !== STATUS.PROCESSING) {
            this._status = STATUS.READY;
            this.displayFileInfo(fileEntry, false, 'ready');
            if (this._pollingIntervalId) {
              clearInterval(this._pollingIntervalId);
              this._pollingIntervalId = null;
            }
          }
          return fileEntry;
        }

        // Upload läuft – nur aktualisieren, wenn der Wert sich ändert
        if (state.uploadingCount > 0 && this._status !== STATUS.PROCESSING && this._status !== STATUS.READY) {
          const uploadingFile = state.uploadingEntries[0];
          this._status = STATUS.UPLOADING;
          const p = Math.round(uploadingFile.uploadProgress || 0);
          if (p !== this._lastProgress) {
            this._lastProgress = p;
            this.displayFileInfo(uploadingFile, true);
          }
        }
        return null;
      } catch (error) {
        DEBUG.log('Fehler beim Abrufen der Uploadcare-Dateiinformationen:', error, 'error');
        return null;
      }
    }

    async handleUploadSuccess(event) {
      DEBUG.log('Uploadcare Upload erfolgreich:', event?.detail);
      const fileEntry = this.getUploadcareFileInfo();

      const form = document.getElementById(CONFIG.FORM_ID);
      const submitButton = form ? form.querySelector('input[type="submit"], button[type="submit"]') : null;
      let originalValue = '';
      if (submitButton) {
        submitButton.disabled = true;
        originalValue = submitButton.value || submitButton.textContent;
        if (submitButton.type === 'submit') submitButton.value = 'Video wird optimiert...';
        else submitButton.textContent = 'Video wird optimiert...';
      }

      if (fileEntry && this.fileUuid) {
        try {
          this._status = STATUS.PROCESSING;
          this.isVideoProcessing = true;
          this.displayFileInfo(fileEntry, false, 'processing');

          await this.convertVideoWithWorker(this.fileUuid);

          // Nach erfolgreicher Konvertierung
          this.isVideoProcessing = false;
          this._status = STATUS.READY;

          // Keine weiteren Progress-Events gewünscht → Listener entfernen
          if (this._uploaderCtx && this._onProgress) {
            this._uploaderCtx.removeEventListener('file-upload-progress', this._onProgress);
          }
          if (this._pollingIntervalId) {
            clearInterval(this._pollingIntervalId);
            this._pollingIntervalId = null;
          }

          this.displayFileInfo(fileEntry, false, 'ready');
        } catch (error) {
          DEBUG.log('Fehler bei der Videokonvertierung:', error, 'error');
        } finally {
          if (submitButton) {
            submitButton.disabled = false;
            if (submitButton.type === 'submit') submitButton.value = originalValue;
            else submitButton.textContent = originalValue;
          }
        }
      }
    }

    handleUploadProgress() {
      // Nur pollen; Dedupe/Statuslogik übernimmt getUploadcareFileInfo
      this.getUploadcareFileInfo();
    }

    /**
     * Zeigt Dateiinformation an
     * @param {Object} fileEntry
     * @param {boolean} isUploading
     * @param {('uploading'|'processing'|'ready')} forceState
     */
    displayFileInfo(fileEntry, isUploading = false, forceState = null) {
      const fileInfoDiv = document.getElementById('fileInfo');
      if (!fileInfoDiv) return;

      const state = forceState || (isUploading ? 'uploading' : this._status);
      let statusText = '';

      if (state === 'uploading') {
        statusText = ` Wird hochgeladen (${Math.round(fileEntry.uploadProgress || 0)}%)... `;
      } else if (state === 'processing') {
        statusText = ' Video wird optimiert... ';
      } else {
        // FINALER, STABILER STATUS
        statusText = ' Zum Upload bereit ';
      }

      fileInfoDiv.innerHTML = `

 Datei: ${fileEntry.name}
 Größe: ${this.formatFileSize(fileEntry.size)}
 Status: ${statusText}

      `;
    }

    formatFileSize(bytes) {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    updateHiddenFields() {
      const form = document.getElementById(CONFIG.FORM_ID);
      if (!form) return;

      const videoLinkInput = form.querySelector("input[name='Video Link'], input[name='VideoLink'], input[name='video-link']");
      if (videoLinkInput) {
        videoLinkInput.value = this.processedUrl || this.fileCdnUrl;
        DEBUG.log("Verstecktes Feld 'Video Link' aktualisiert:", videoLinkInput.value);
      }

      const uuidInput = form.querySelector("input[name='File UUID'], input[name='FileUUID'], input[name='file-uuid']");
      if (uuidInput) {
        uuidInput.value = this.fileUuid;
        DEBUG.log("Verstecktes Feld 'File UUID' aktualisiert:", this.fileUuid);
      }
    }

    async convertVideoWithWorker(uuid) {
      if (!uuid) {
        DEBUG.log('Keine UUID für Videokonvertierung vorhanden', null, 'warn');
        return null;
      }
      try {
        DEBUG.log('Starte Videokonvertierung für UUID:', uuid);
        const response = await fetch(CONFIG.VIDEO_CONVERT_WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uuid, format: 'mp4', quality: 'lighter', size: '360x640' }),
        });
        if (!response.ok) throw new Error(`Worker-Fehler: ${response.status}`);
        const data = await response.json();
        DEBUG.log('Worker-Antwort erhalten:', data);

        if (data.status === 'success' && data.result) {
          let convertedUuid = null;
          if (Array.isArray(data.result) && data.result.length > 0) {
            const first = data.result[0];
            if (first && first.uuid) convertedUuid = first.uuid;
          } else if (data.result.uuid) {
            convertedUuid = data.result.uuid;
          }
          if (convertedUuid) {
            DEBUG.log('Videokonvertierung erfolgreich, UUID:', convertedUuid);
            this.processedUrl = `https://ucarecdn.com/${convertedUuid}/`;
            this.updateHiddenFields();
            return { uuid: convertedUuid };
          }
          DEBUG.log('Keine UUID in der Worker-Antwort gefunden:', data, 'warn');
          return null;
        }
        DEBUG.log('Unerwartetes Format der Worker-Antwort:', data, 'warn');
        return null;
      } catch (error) {
        DEBUG.log('Fehler bei der Videokonvertierung:', error, 'error');
        return null;
      }
    }

    extractUploadcareUuid(videoUrl) {
      if (!videoUrl) return null;
      if (videoUrl.includes('ucarecdn.com')) {
        const m = videoUrl.match(/ucarecdn\.com\/([a-f0-9-]+)/i);
        if (m && m[1]) return m[1];
      }
      if (videoUrl.includes('uploadcare')) {
        const m = videoUrl.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (m && m[1]) return m[1];
      }
      DEBUG.log('Konnte keine Uploadcare UUID aus der URL extrahieren:', videoUrl, 'warn');
      return null;
    }

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
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/vnd.uploadcare-v0.7+json' },
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

  window.WEBFLOW_API.UPLOADCARE = new UploadcareService();
})();
