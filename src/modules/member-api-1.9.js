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
  const API = window.WEBFLOW_API.API || {
    buildApiUrl: (path, params = {}) => path,
    buildWorkerUrl: (url) => url,
    fetchApi: async (url, options = {}) => {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }
  };

  class MemberApiService {
    /**
     * Holt einen User anhand seiner Webflow-ID (immer /live)
     */
    async getUserByWebflowId(webflowId) {
      if (!webflowId) throw new Error('Webflow-ID fehlt');
      DEBUG.log(`Suche User mit Webflow-ID: ${webflowId}`);

      const memberCollectionId = CONFIG.MEMBERS_COLLECTION_ID;
      // ✅ Immer /live lesen
      const apiUrl = API.buildApiUrl(`/${memberCollectionId}/items/${webflowId}/live`);
      const workerUrl = API.buildWorkerUrl(apiUrl);

      DEBUG.log(`API-URL: ${apiUrl}`);
      DEBUG.log(`Worker-URL: ${workerUrl}`);

      try {
        const user = await API.fetchApi(workerUrl);
        if (!user || !user.id) {
          DEBUG.log(`Kein User gefunden mit Webflow-ID ${webflowId}`, null, 'warn');
          return null;
        }
        return user;
      } catch (error) {
        DEBUG.log(`Fehler beim Abrufen des Users mit Webflow-ID ${webflowId}`, error, 'error');
        return null;
      }
    }

    /**
     * Prüft, ob das Video-Item bereits live (veröffentlicht) ist.
     */
    async isVideoLive(videoId) {
      try {
        const url = API.buildApiUrl(`/${CONFIG.VIDEOS_COLLECTION_ID}/items/${videoId}/live`);
        const worker = API.buildWorkerUrl(url);
        const res = await API.fetchApi(worker);
        return !!res && !!res.id; // live-Version vorhanden
      } catch (e) {
        return false; // 404/validation ⇒ nicht live
      }
    }

    /**
     * Veröffentlicht ein Video-Item, damit es in /live-Referenzen genutzt werden kann.
     */
    async publishVideo(videoId) {
      const publishUrl = API.buildApiUrl(`/${CONFIG.VIDEOS_COLLECTION_ID}/items/publish`);
      const worker = API.buildWorkerUrl(publishUrl);
      const body = {
        itemIds: [videoId],
        // Optional: Domains, falls dein Worker diese erwartet. Ansonsten leer lassen.
        publishToDomains: CONFIG.PUBLISH_TO_DOMAINS || []
      };
      DEBUG.log('Veröffentliche Video-Item (publish):', body);
      return API.fetchApi(worker, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }

    /**
     * Stellt sicher, dass das referenzierte Video live ist (mit kleinem Retry-Backoff)
     */
    async ensureVideoLive(videoId, attempts = 3) {
      for (let i = 0; i < attempts; i++) {
        if (await this.isVideoLive(videoId)) return true;
        try { await this.publishVideo(videoId); } catch (_) {}
        // kleines Backoff, damit die Veröffentlichung serverseitig durchläuft
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
      }
      return this.isVideoLive(videoId);
    }

    /**
     * Aktualisiert den Video-Feed eines Members – sofort live
     */
    async updateMemberVideoFeed(memberId, videoId, remove = false) {
      if (!memberId || !videoId) {
        DEBUG.log('Member ID oder Video ID fehlt', null, 'error');
        return null;
      }

      try {
        // 1) Sicherstellen, dass das referenzierte Video live ist
        const liveOk = await this.ensureVideoLive(videoId);
        if (!liveOk) {
          DEBUG.log(`Video ${videoId} ist nicht live – Abbruch, um Validation Error zu vermeiden`, null, 'error');
          return null;
        }

        // 2) Member LIVE holen
        const member = await this.getUserByWebflowId(memberId);
        if (!member) {
          DEBUG.log(`Kein Member mit ID ${memberId} gefunden`, null, 'warn');
          return null;
        }

        // 3) Video-Feed aktualisieren (lokal)
        const currentVideoFeed = Array.isArray(member.fieldData?.['video-feed']) ? member.fieldData['video-feed'] : [];
        let updatedVideoFeed;
        if (remove) {
          updatedVideoFeed = currentVideoFeed.filter((id) => id !== videoId);
          DEBUG.log(`Entferne Video ${videoId} aus Feed des Members ${memberId}`);
        } else {
          if (currentVideoFeed.includes(videoId)) {
            DEBUG.log(`Video ${videoId} ist bereits im Feed des Members`);
            return member; // Nichts zu tun
          }
          updatedVideoFeed = [...currentVideoFeed, videoId];
          DEBUG.log(`Füge Video ${videoId} zum Feed des Members ${memberId} hinzu`);
        }

        // 4) LIVE aktualisieren (PATCH /live)
        const livePatchUrl = API.buildApiUrl(`/${CONFIG.MEMBERS_COLLECTION_ID}/items/${member.id}/live`);
        const livePatchWorker = API.buildWorkerUrl(livePatchUrl);

        const payload = {
          isArchived: false,
          isDraft: false,
          fieldData: { 'video-feed': updatedVideoFeed },
        };

        DEBUG.log('Sende Member-Update an Webflow LIVE API (PATCH):', { url: livePatchUrl, payload });
        const res = await API.fetchApi(livePatchWorker, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        return res;
      } catch (error) {
        DEBUG.log('Fehler beim Aktualisieren des Member Video-Feeds (live):', error, 'error');
        return null;
      }
    }
  }

  // Singleton-Instanz im globalen Namespace registrieren
  window.WEBFLOW_API.MEMBER_API = new MemberApiService();
})();
