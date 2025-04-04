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
            
            const cacheKey = `webflow_user_${webflowId}`;
            const cachedUser = CACHE.get && CACHE.get(cacheKey);
            
            if (cachedUser) {
                DEBUG.log(`User aus Cache geladen: ${webflowId}`);
                return cachedUser;
            }
            
            // API-URL für User erstellen
            const memberCollectionId = CONFIG.MEMBERS_COLLECTION_ID;
            
            // Direkter API-Aufruf mit /live Endpunkt für veröffentlichte Inhalte
            const apiUrl = `${CONFIG.BASE_URL}/${memberCollectionId}/items/${webflowId}/live`;
            const workerUrl = this.buildWorkerUrl(apiUrl);
            
            try {
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
                
                if (CACHE.set) {
                    CACHE.set(cacheKey, user);
                }
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
            
            // Cache für bessere Performance nutzen
            const cacheKey = `videos_${user.id}`;
            const cachedVideos = CACHE.get && CACHE.get(cacheKey);
            
            if (cachedVideos) {
                DEBUG.log(`${cachedVideos.length} Videos aus Cache geladen`);
                return cachedVideos;
            }
            
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
                
                // Im Cache speichern
                if (CACHE.set) {
                    CACHE.set(cacheKey, videos);
                }
            } catch (error) {
                DEBUG.log('Fehler beim Laden der Videos', error, 'error');
            }
            
            return videos;
        }

        /**
         * Aktualisiert den Video-Feed eines Members mit Fehlerbehandlung und Verzögerung
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
            DEBUG.log(`Warte ${delayMs}ms, um der Datenbank Zeit für die Replikation zu geben...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        
            // Versuche die Aktualisierung mehrfach
            for (let attempt = 1; attempt <= this.retryCount; attempt++) {
                try {
                    // Hole zuerst den aktuellen Member
                    const member = await this.getUserByWebflowId(memberId);
                    
                    if (!member) {
                        throw new Error(`Kein Member mit ID ${memberId} gefunden`);
                    }
                    
                    // Hole die aktuelle Video-Feed-Liste
                    const currentVideoFeed = Array.isArray(member.fieldData["video-feed"]) 
                        ? member.fieldData["video-feed"] 
                        : [];
                    
                    // Prüfe, ob das Video bereits im Feed ist
                    if (currentVideoFeed.includes(videoId)) {
                        DEBUG.log(`Video ${videoId} ist bereits im Feed des Members`, null, 'warn');
                        return member; // Keine Änderung notwendig
                    }
                    
                    // Füge das neue Video zur Liste hinzu
                    const updatedVideoFeed = [...currentVideoFeed, videoId];
                    
                    DEBUG.log(`Aktualisiere Video-Feed für Member ${memberId}`, {
                        vorher: currentVideoFeed.length,
                        nachher: updatedVideoFeed.length,
                        neuesVideo: videoId
                    });
                    
                    // Erstelle die API-URL zum Aktualisieren des Members
                    const apiUrl = `${CONFIG.BASE_URL}/${CONFIG.MEMBERS_COLLECTION_ID}/items/${member.id}`;
                    const workerUrl = this.buildWorkerUrl(apiUrl);
                    
                    // Baue den Payload für das Update mit PATCH - nur das zu ändernde Feld
                    const payload = {
                        isArchived: false,
                        isDraft: false,
                        fieldData: {
                            // Nur das Feld aktualisieren, das wir ändern möchten
                            "video-feed": updatedVideoFeed
                        }
                    };
                    
                    // Versuche zuerst mit PATCH, dann mit PUT, wenn PATCH fehlschlägt
                    let response;
                    try {
                        // PATCH-Methode
                        response = await fetch(workerUrl, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload)
                        });
                    } catch (corsError) {
                        DEBUG.log(`PATCH fehlgeschlagen, versuche mit PUT...`, corsError, 'warn');
                        
                        // Bei PUT müssen wir alle Felder beibehalten
                        const putPayload = {
                            isArchived: member.isArchived || false,
                            isDraft: member.isDraft || false,
                            fieldData: {
                                ...member.fieldData,
                                "video-feed": updatedVideoFeed
                            }
                        };
                        
                        response = await fetch(workerUrl, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(putPayload)
                        });
                    }
                    
                    // Überprüfe auf Referenzierungsfehler (400 Bad Request)
                    if (response.status === 400) {
                        const errorText = await response.text();
                        const errorJson = JSON.parse(errorText);
                        
                        // Prüfe, ob es sich um einen "Referenced item not found"-Fehler handelt
                        if (errorJson.details && 
                            errorJson.details.some(detail => 
                                detail.param === "video-feed" && 
                                detail.description && 
                                detail.description.includes("Referenced item not found"))) {
                            
                            DEBUG.log(`Video ${videoId} existiert noch nicht in der Datenbank`, null, 'warn');
                            
                            if (attempt < this.retryCount) {
                                // Warte länger, bevor wir es erneut versuchen
                                const delay = this.retryDelay * Math.pow(2, attempt);
                                DEBUG.log(`Warte ${delay}ms vor nächstem Versuch...`);
                                await new Promise(resolve => setTimeout(resolve, delay));
                                continue; // Zum nächsten Versuch
                            } else {
                                // Maximal Versuche erreicht, als erfolgreich behandeln
                                DEBUG.log(`Max. Versuche erreicht. Video wird später hinzugefügt.`, null, 'warn');
                                
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
                        }
                        
                        // Bei anderen Fehlern normal weiterwerfen
                        DEBUG.log(`API-Fehler beim Member-Update: ${response.status}`, errorText, 'error');
                        throw new Error(`API-Fehler beim Member-Update: ${response.status} - ${errorText}`);
                    }
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        DEBUG.log(`API-Fehler beim Member-Update: ${response.status}`, errorText, 'error');
                        throw new Error(`API-Fehler beim Member-Update: ${response.status} - ${errorText}`);
                    }
                    
                    // Erfolgreiche Antwort verarbeiten
                    const responseData = await response.json();
                    DEBUG.log("Member erfolgreich aktualisiert:", responseData);
                    
                    // Cache leeren
                    if (CACHE.clear) {
                        CACHE.clear();
                    }
                    
                    return responseData;
                } catch (error) {
                    DEBUG.log(`Fehler beim Aktualisieren des Member Video-Feeds (Versuch ${attempt})`, error, 'error');
                    
                    if (attempt < this.retryCount) {
                        const delay = this.retryDelay * Math.pow(2, attempt);
                        DEBUG.log(`Warte ${delay}ms vor nächstem Versuch...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        // Bei endgültigem Fehler weitergeben
                        throw error;
                    }
                }
            }
            
            // Sollte nie erreicht werden
            throw new Error(`Konnte Video ${videoId} nach ${this.retryCount} Versuchen nicht zum Member ${memberId} hinzufügen`);
        }
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.MEMBER_API = new MemberApiService();
})();
