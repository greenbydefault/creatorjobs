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
  const CACHE = window.WEBFLOW_API.cache || {
    get: (key) => null,
    set: (key, data) => {}
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

        DEBUG.log(`User gefunden: ${user.id}`);
        if (user.fieldData && user.fieldData['video-feed']) {
          DEBUG.log(
            `User hat video-feed Feld mit ${Array.isArray(user.fieldData['video-feed']) ? user.fieldData['video-feed'].length + ' Einträgen' : 'Wert ' + typeof user.fieldData['video-feed']}`
          );
        } else {
          DEBUG.log('User hat KEIN video-feed Feld in fieldData!', null, 'warn');
          DEBUG.log('Verfügbare Felder: ' + (user.fieldData ? Object.keys(user.fieldData).join(', ') : 'keine fieldData'));
        }
        return user;
      } catch (error) {
        DEBUG.log(`Fehler beim Abrufen des Users mit Webflow-ID ${webflowId}`, error, 'error');
        return null;
      }
    }

    /** Videos aus dem Feed eines Users laden */
    async getVideosFromUserFeed(user, videoApiService) {
      if (!user || !user.fieldData) {
        DEBUG.log('Keine fieldData im User-Profil gefunden', null, 'warn');
        return [];
      }
      if (!user.fieldData['video-feed']) {
        DEBUG.log('Keine Video-Referenzen im User-Profil gefunden', null, 'warn');
        DEBUG.log('Verfügbare Felder: ' + Object.keys(user.fieldData).join(', '));
        return [];
      }
      const videoFeed = user.fieldData['video-feed'];
      DEBUG.log(`Video-Feed-Typ: ${Array.isArray(videoFeed) ? 'Array' : typeof videoFeed}`);
      DEBUG.log(`Video-Feed-Länge: ${Array.isArray(videoFeed) ? videoFeed.length : 'N/A'}`);
      if (!videoFeed || !Array.isArray(videoFeed) || videoFeed.length === 0) {
        DEBUG.log('Leerer Video-Feed im User-Profil');
        return [];
      }
      try {
        const videos = await videoApiService.fetchVideosInChunks(videoFeed);
        DEBUG.log(`${videos.length} Videos geladen mit den nötigen Daten`);
        return videos;
      } catch (error) {
        DEBUG.log('Fehler beim Laden der Videos', error, 'error');
        return [];
      }
    }

    /**
     * Aktualisiert den Video-Feed eines Members – sofort live
     */
    async updateMemberVideoFeed(memberId, videoId, remove = false) {
      if (!memberId || !videoId) {
        DEBUG.log('Member ID oder Video ID fehlt', null, 'error');
        return null;
      }

      // Kurze techn. Wartezeit kann helfen, bis das neue Video-Item vom CMS indexiert ist
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        // 1) Member LIVE holen
        const member = await this.getUserByWebflowId(memberId);
        if (!member) {
          DEBUG.log(`Kein Member mit ID ${memberId} gefunden`, null, 'warn');
          return null;
        }

        // 2) Video-Feed aktualisieren (lokal)
        const currentVideoFeed = Array.isArray(member.fieldData['video-feed']) ? member.fieldData['video-feed'] : [];
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

        // 3) LIVE aktualisieren (PATCH /live)
        const livePatchUrl = API.buildApiUrl(`/${CONFIG.MEMBERS_COLLECTION_ID}/items/${member.id}/live`);
        const livePatchWorker = API.buildWorkerUrl(livePatchUrl);

        const payload = {
          isArchived: false,
          isDraft: false,
          fieldData: { 'video-feed': updatedVideoFeed },
        };

        DEBUG.log('Sende Member-Update an Webflow LIVE API (PATCH):', { url: livePatchUrl, payload });
        try {
          const res = await API.fetchApi(livePatchWorker, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          return res;
        } catch (patchErr) {
          DEBUG.log('PATCH /live fehlgeschlagen, versuche PUT /live...', patchErr, 'warn');

          // 4) Fallback: kompletter PUT auf /live mit gemergten Feldern
          const livePutUrl = livePatchUrl; // gleicher /live Pfad
          const livePutWorker = API.buildWorkerUrl(livePutUrl);
          const putPayload = {
            isArchived: member.isArchived || false,
            isDraft: member.isDraft || false,
            fieldData: { ...member.fieldData, 'video-feed': updatedVideoFeed },
          };

          return await API.fetchApi(livePutWorker, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(putPayload),
          });
        }
      } catch (error) {
        DEBUG.log('Fehler beim Aktualisieren des Member Video-Feeds (live):', error, 'error');
        return null;
      }
    }
  }

  // Singleton-Instanz im globalen Namespace registrieren
  window.WEBFLOW_API.MEMBER_API = new MemberApiService();
})();
