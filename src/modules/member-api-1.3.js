(function() {
    'use strict';

    // ... bestehender Code bis zur getUserByWebflowId-Methode ...

    /**
     * Holt einen User anhand seiner Webflow-ID
     * @param {string} webflowId - Die Webflow-ID des Users
     * @returns {Promise<Object>} - Die User-Daten
     */
    async getUserByWebflowId(webflowId) {
        if (!webflowId) {
            throw new Error("Webflow-ID fehlt");
        }
        
        DEBUG.log(`Suche User mit Webflow-ID: ${webflowId}`);
        
        // Cache wird nicht mehr verwendet
        
        // API-URL für User erstellen
        const memberCollectionId = CONFIG.MEMBERS_COLLECTION_ID;
        
        // Direkter API-Aufruf mit /live Endpunkt für veröffentlichte Inhalte
        const apiUrl = `${CONFIG.BASE_URL}/${memberCollectionId}/items/${webflowId}/live`;
        const workerUrl = this.buildWorkerUrl(apiUrl);
        
        try {
            // Kleine Verzögerung hinzufügen, um mögliche Timing-Probleme zu lösen
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const user = await this.fetchApi(workerUrl);
            
            if (!user || !user.id) {
                DEBUG.log(`Kein User gefunden mit Webflow-ID ${webflowId}`, null, 'warn');
                return null;
            }
            
            DEBUG.log(`User gefunden: ${user.id}`);
            
            // Überprüfen des video-feed Feldes
            if (user.fieldData && user.fieldData["video-feed"]) {
                DEBUG.log(`User hat video-feed Feld mit ${Array.isArray(user.fieldData["video-feed"]) ? 
                    user.fieldData["video-feed"].length + " Einträgen" : 
                    "Wert " + typeof user.fieldData["video-feed"]}`);
            } else {
                DEBUG.log('User hat KEIN video-feed Feld in fieldData!', null, 'warn');
            }
            
            // Cache wird nicht mehr verwendet
            
            return user;
        } catch (error) {
            DEBUG.log(`Fehler beim Abrufen des Users mit Webflow-ID ${webflowId}`, error, 'error');
            throw error;
        }
    }
    
    /**
     * Lädt Videos aus dem Feed eines Users
     * @param {Object} user - Das User-Objekt
     * @param {Object} videoApiService - Der Video-API-Service 
     * @returns {Promise<Array>} - Array mit Video-Daten
     */
    async getVideosFromUserFeed(user, videoApiService) {
        if (!user || !user.fieldData) {
            DEBUG.log('Keine fieldData im User-Profil gefunden', null, 'warn');
            return [];
        }
        
        // Vorsichtiger Zugriff auf das video-feed Feld
        if (!user.fieldData["video-feed"]) {
            DEBUG.log('Keine Video-Referenzen im User-Profil gefunden', null, 'warn');
            return [];
        }
        
        // Das video-feed Feld enthält die IDs der Videos im User-Profil
        const videoFeed = user.fieldData["video-feed"];
        
        // Debug-Info über das video-feed Feld
        DEBUG.log(`Video-Feed-Typ: ${Array.isArray(videoFeed) ? "Array" : typeof videoFeed}`);
        DEBUG.log(`Video-Feed-Länge: ${Array.isArray(videoFeed) ? videoFeed.length : "N/A"}`);
        
        if (!videoFeed || !Array.isArray(videoFeed) || videoFeed.length === 0) {
            DEBUG.log('Leerer Video-Feed im User-Profil');
            return [];
        }
        
        DEBUG.log(`${videoFeed.length} Video-IDs im User-Feed gefunden`);
        
        // Cache wird nicht mehr verwendet
        
        // Videos laden
        let videos = [];
        
        try {
            // Prüfe, ob der videoApiService die fetchVideosInChunks-Methode hat
            if (videoApiService && typeof videoApiService.fetchVideosInChunks === 'function') {
                videos = await videoApiService.fetchVideosInChunks(videoFeed);
            } else {
                DEBUG.log('fetchVideosInChunks nicht verfügbar, lade keine Videos', null, 'warn');
            }
            
            DEBUG.log(`${videos.length} Videos geladen mit den nötigen Daten`);
            
            // Cache wird nicht mehr verwendet
        } catch (error) {
            DEBUG.log('Fehler beim Laden der Videos', error, 'error');
        }
        
        return videos;
    }

    // ... Rest der Datei bleibt gleich ...

    /**
     * Aktualisiert den Video-Feed eines Members mit Fehlerbehandlung und Verzögerung
     */
    async updateMemberVideoFeed(memberId, videoId, delayMs = 1500) {
        // ... bestehender Code ...
        
        // Bei erfolgreicher Aktualisierung
        const responseData = await response.json();
        DEBUG.log("Member erfolgreich aktualisiert:", responseData);
        
        // Cache-Referenz entfernen
        // Kein Cache mehr zu leeren
        
        return responseData;
        
        // ... Rest der Methode bleibt gleich ...
    }

    // ... Rest der Datei bleibt gleich ...
})();
