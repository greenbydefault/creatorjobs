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
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`API request failed with status ${response.status}: ${errorData.message || 'Unknown error'}`);
            }
            return response.json();
        }
    };
    const CACHE = window.WEBFLOW_API.cache || {
        get: (key) => null,
        set: (key, data) => {}
    };

    class MemberApiService {
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
            
            // API-URL für User erstellen
            const memberCollectionId = CONFIG.MEMBERS_COLLECTION_ID;
            
            // Direkter API-Aufruf mit /live Endpunkt für veröffentlichte Inhalte
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
                
                // Überprüfen des video-feed Feldes
                if (user.fieldData && user.fieldData["video-feed"]) {
                    DEBUG.log(`User hat video-feed Feld mit ${Array.isArray(user.fieldData["video-feed"]) ? 
                        user.fieldData["video-feed"].length + " Einträgen" : 
                        "Wert " + typeof user.fieldData["video-feed"]}`);
                } else {
                    DEBUG.log('User hat KEIN video-feed Feld in fieldData!', null, 'warn');
                    DEBUG.log('Verfügbare Felder: ' + 
                        (user.fieldData ? Object.keys(user.fieldData).join(", ") : "keine fieldData"));
                }
                
                return user;
            } catch (error) {
                DEBUG.log(`Fehler beim Abrufen des Users mit Webflow-ID ${webflowId}`, error, 'error');
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
            
            if (!user.fieldData["video-feed"]) {
                DEBUG.log('Keine Video-Referenzen im User-Profil gefunden', null, 'warn');
                DEBUG.log('Verfügbare Felder: ' + Object.keys(user.fieldData).join(", "));
                return [];
            }
            
            const videoFeed = user.fieldData["video-feed"];
            
            DEBUG.log(`Video-Feed-Typ: ${Array.isArray(videoFeed) ? "Array" : typeof videoFeed}`);
            DEBUG.log(`Video-Feed-Länge: ${Array.isArray(videoFeed) ? videoFeed.length : "N/A"}`);
            
            if (!videoFeed || !Array.isArray(videoFeed) || videoFeed.length === 0) {
                DEBUG.log('Leerer Video-Feed im User-Profil');
                return [];
            }
            
            DEBUG.log(`${videoFeed.length} Video-IDs im User-Feed gefunden`);
            
            let videos = [];
            
            try {
                videos = await videoApiService.fetchVideosInChunks(videoFeed);
                DEBUG.log(`${videos.length} Videos geladen mit den nötigen Daten`);
            } catch (error) {
                DEBUG.log('Fehler beim Laden der Videos', error, 'error');
            }
            
            return videos;
        }
        
        /**
         * Aktualisiert den Video-Feed eines Members und veröffentlicht die Änderung sofort.
         * @param {string} memberId - Die Member-ID
         * @param {string} videoId - Die Video-ID
         * @param {boolean} remove - true, wenn Video entfernt werden soll
         * @returns {Promise<Object>} - Das aktualisierte Member-Objekt
         */
        async updateMemberVideoFeed(memberId, videoId, remove = false) {
            if (!memberId || !videoId) {
                DEBUG.log("Member ID oder Video ID fehlt", null, 'error');
                return null;
            }

            try {
                const member = await this.getUserByWebflowId(memberId);
                
                if (!member) {
                    DEBUG.log(`Kein Member mit ID ${memberId} gefunden`, null, 'warn');
                    return null;
                }
                
                const currentVideoFeed = Array.isArray(member.fieldData["video-feed"]) ? 
                    [...member.fieldData["video-feed"]] : [];
                
                let updatedVideoFeed;
                let needsUpdate = false;

                if (remove) {
                    const initialLength = currentVideoFeed.length;
                    updatedVideoFeed = currentVideoFeed.filter(id => id !== videoId);
                    if (updatedVideoFeed.length < initialLength) {
                        needsUpdate = true;
                        DEBUG.log(`Entferne Video ${videoId} aus Feed des Members ${memberId}`);
                    }
                } else {
                    if (!currentVideoFeed.includes(videoId)) {
                        updatedVideoFeed = [...currentVideoFeed, videoId];
                        needsUpdate = true;
                        DEBUG.log(`Füge Video ${videoId} zum Feed des Members ${memberId} hinzu`);
                    } else {
                        updatedVideoFeed = currentVideoFeed;
                        DEBUG.log(`Video ${videoId} ist bereits im Feed des Members`);
                    }
                }

                if (!needsUpdate) {
                    return member; // Keine Änderung notwendig
                }
                
                const updateApiUrl = API.buildApiUrl(`/${CONFIG.MEMBERS_COLLECTION_ID}/items/${member.id}`);
                const updateWorkerUrl = API.buildWorkerUrl(updateApiUrl);
                
                const payload = {
                    fieldData: { "video-feed": updatedVideoFeed }
                };
                
                DEBUG.log("Sende Member-Update an Webflow API:", payload);
                
                // Führe das Update mit PATCH durch (nur das geänderte Feld senden)
                const updatedMember = await API.fetchApi(updateWorkerUrl, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                // --- NEUER TEIL: ITEM SOFORT VERÖFFENTLICHEN ---
                if (updatedMember && updatedMember.id) {
                    DEBUG.log(`Item ${updatedMember.id} erfolgreich aktualisiert. Starte Veröffentlichung...`);

                    const publishApiUrl = API.buildApiUrl(`/${CONFIG.MEMBERS_COLLECTION_ID}/items/publish`);
                    const publishWorkerUrl = API.buildWorkerUrl(publishApiUrl);
                    const publishPayload = { itemIds: [updatedMember.id] };

                    await API.fetchApi(publishWorkerUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(publishPayload)
                    });

                    DEBUG.log(`Veröffentlichungs-Anfrage für Item ${updatedMember.id} gesendet.`);
                }
                // --- ENDE NEUER TEIL ---

                return updatedMember;

            } catch (error) {
                DEBUG.log("Fehler beim Aktualisieren des Member Video-Feeds:", error, 'error');
                return null;
            }
        }
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.MEMBER_API = new MemberApiService();
})();
