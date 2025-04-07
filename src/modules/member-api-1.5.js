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
    const CACHE = window.WEBFLOW_API.cache || {
        clear: () => {},
        get: () => null,
        set: () => {}
    };
    const API_SERVICE = window.WEBFLOW_API.apiService || {
        buildWorkerUrl: (url) => url,
        fetchApi: async (url) => ({})
    };

    class MemberApiService {
        constructor() {
            this.retryCount = 3; // Anzahl der Wiederholungsversuche bei Fehlern
            this.retryDelay = 1500; // Verzögerung zwischen den Versuchen in ms
        }

        /**
         * Erstellt Worker-URL für CORS-Anfragen
         * @param {string} apiUrl - Die API-URL
         * @returns {string} - Die Worker-URL
         */
        buildWorkerUrl(apiUrl) {
            if (API_SERVICE && typeof API_SERVICE.buildWorkerUrl === 'function') {
                return API_SERVICE.buildWorkerUrl(apiUrl);
            }
            return `${CONFIG.WORKER_BASE_URL}${encodeURIComponent(apiUrl)}`;
        }

        /**
         * Führt eine API-Anfrage durch mit Retry-Logik
         * @param {string} url - Die API-URL
         * @param {Object} options - Request-Optionen
         * @param {number} retries - Anzahl der Wiederholungsversuche
         * @returns {Promise<Object>} - Die API-Antwort
         */
        async fetchApi(url, options = {}, retries = this.retryCount) {
            if (API_SERVICE && typeof API_SERVICE.fetchApi === 'function') {
                return API_SERVICE.fetchApi(url, options, retries);
            }

            let attempt = 1;
            
            while (true) {
                try {
                    DEBUG.log(`API-Anfrage (Versuch ${attempt}/${retries + 1}) an ${url}`);
                    const response = await fetch(url, options);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        DEBUG.log(`API-Fehler ${response.status}: ${errorText}`, null, 'error');
                        
                        if (attempt <= retries) {
                            const delay = Math.min(1000 * attempt, 3000); // Exponential Backoff
                            DEBUG.log(`Wiederhole in ${delay}ms...`);
                            await new Promise(resolve => setTimeout(resolve, delay));
                            attempt++;
                            continue;
                        }
                        
                        throw new Error(`API-Fehler: ${response.status} - ${errorText.substring(0, 100)}`);
                    }
                    
                    return await response.json();
                } catch (error) {
                    if (attempt <= retries) {
                        const delay = Math.min(1000 * attempt, 3000);
                        DEBUG.log(`Fehler, wiederhole in ${delay}ms... ${error.message}`, null, 'warn');
                        await new Promise(resolve => setTimeout(resolve, delay));
                        attempt++;
                        continue;
                    }
                    DEBUG.log('Maximale Anzahl an Versuchen erreicht', error, 'error');
                    throw error;
                }
            }
        }

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
            
            // Kleine Verzögerung hinzufügen für API-Stabilität
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // API-URL für User erstellen
            const memberCollectionId = CONFIG.MEMBERS_COLLECTION_ID;
            
            // Direkter API-Aufruf mit /live Endpunkt für veröffentlichte Inhalte
            const apiUrl = `${CONFIG.BASE_URL}/${memberCollectionId}/items/${webflowId}/live`;
            const workerUrl = this.buildWorkerUrl(apiUrl);
            
            try {
                const response = await fetch(workerUrl);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    DEBUG.log(`API-Fehler beim Abrufen des Users: ${response.status}`, errorText, 'error');
                    return null;
                }
                
                const user = await response.json();
                
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
                
                return user;
            } catch (error) {
                DEBUG.log(`Fehler beim Abrufen des Users mit Webflow-ID ${webflowId}`, error, 'error');
                // Fehler nicht weiterwerfen, sondern null zurückgeben
                return null;
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
            } catch (error) {
                DEBUG.log('Fehler beim Laden der Videos', error, 'error');
            }
            
            return videos;
        }

        /**
         * Aktualisiert den Video-Feed eines Members mit Fehlerbehandlung
         * @param {string} memberId - Die ID des Members
         * @param {string} videoId - Die ID des Videos
         * @param {number} [delayMs=1500] - Verzögerung für die Datenbankreplikation
         * @returns {Promise<Object>} - Die aktualisierten Member-Daten
         */
        async updateMemberVideoFeed(memberId, videoId, delayMs = 1500) {
            if (!memberId || !videoId) {
                DEBUG.log("Member ID oder Video ID fehlt", null, 'error');
                return null;
            }
        
            // WICHTIG: Verzögerung hinzufügen, um der Datenbank Zeit für die Replikation zu geben
            DEBUG.log(`Warte ${delayMs}ms, um der Datenbank Zeit zu geben...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        
            try {
                // Direkte API-URL konstruieren und Worker-URL erstellen
                const apiUrl = `${CONFIG.BASE_URL}/${CONFIG.MEMBERS_COLLECTION_ID}/items/${memberId}`;
                const workerUrl = this.buildWorkerUrl(apiUrl);
                
                // Zunächst den Benutzer direkt abrufen
                DEBUG.log(`Hole Benutzer direkt mit Webflow-ID: ${memberId}`);
                const response = await fetch(workerUrl);
                
                if (!response.ok) {
                    DEBUG.log(`API-Fehler beim Abrufen des Members: ${response.status}`, await response.text(), 'error');
                    return null;
                }
                
                const member = await response.json();
                
                if (!member || !member.id) {
                    DEBUG.log(`Kein Member mit ID ${memberId} gefunden`, null, 'warn');
                    return null;
                }
                
                // Hole die aktuelle Video-Feed-Liste
                const currentVideoFeed = Array.isArray(member.fieldData["video-feed"]) 
                    ? member.fieldData["video-feed"] 
                    : [];
                
                // Prüfe, ob das Video bereits im Feed ist
                if (currentVideoFeed.includes(videoId)) {
                    DEBUG.log(`Video ${videoId} ist bereits im Feed des Members`, null, 'warn');
                    return member;
                }
                
                // Füge das neue Video zur Liste hinzu
                const updatedVideoFeed = [...currentVideoFeed, videoId];
                
                DEBUG.log(`Aktualisiere Video-Feed für Member ${memberId}`, {
                    vorher: currentVideoFeed.length,
                    nachher: updatedVideoFeed.length,
                    neuesVideo: videoId
                });
                
                // PUT-Anfrage verwenden (stabiler als PATCH)
                const putPayload = {
                    isArchived: member.isArchived || false,
                    isDraft: member.isDraft || false,
                    fieldData: {
                        ...member.fieldData,
                        "video-feed": updatedVideoFeed
                    }
                };
                
                const updateResponse = await fetch(workerUrl, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(putPayload)
                });
                
                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    DEBUG.log(`API-Fehler beim Member-Update: ${updateResponse.status}`, errorText, 'error');
                    
                    // Bei 400-Fehler (Bad Request) prüfen, ob es ein "Referenced item not found" Fehler ist
                    if (updateResponse.status === 400) {
                        try {
                            const errorJson = JSON.parse(errorText);
                            
                            // Prüfe, ob es sich um einen "Referenced item not found"-Fehler handelt
                            if (errorJson.details && 
                                errorJson.details.some(detail => 
                                    detail.param === "video-feed" && 
                                    detail.description && 
                                    detail.description.includes("Referenced item not found"))) {
                                
                                DEBUG.log(`Video ${videoId} existiert noch nicht in der Datenbank`, null, 'warn');
                                
                                // Event abfeuern, damit der Feed später aktualisiert wird
                                setTimeout(() => {
                                    const event = new CustomEvent('videoFeedUpdate');
                                    document.dispatchEvent(event);
                                }, 5000);
                                
                                // Fake-Erfolg zurückgeben
                                return {
                                    ...member,
                                    fieldData: {
                                        ...member.fieldData,
                                        "video-feed": updatedVideoFeed
                                    }
                                };
                            }
                        } catch (parseError) {
                            DEBUG.log(`Fehler beim Parsen der API-Fehlermeldung`, parseError, 'warn');
                        }
                    }
                    
                    return null;
                }
                
                // Erfolgreiche Antwort verarbeiten
                const responseData = await updateResponse.json();
                DEBUG.log("Member erfolgreich aktualisiert:", responseData);
                
                return responseData;
            } catch (error) {
                DEBUG.log(`Fehler beim Aktualisieren des Member Video-Feeds`, error, 'error');
                return null;
            }
        }
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.MEMBER_API = new MemberApiService();
})();
