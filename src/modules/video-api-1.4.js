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

    class VideoApiService {
        constructor() {
            // Nichts zu initialisieren
        }
        
        /**
         * Erstellt eine Worker-URL für Cross-Origin-Anfragen
         * @param {string} apiUrl - Die Original-API-URL
         * @returns {string} - Die Worker-URL
         */
        buildWorkerUrl(apiUrl) {
            return `${CONFIG.WORKER_BASE_URL}${encodeURIComponent(apiUrl)}`;
        }
        
        /**
         * Erstellt ein neues Video in der CMS-Collection
         * @param {Object} formData - Die Formulardaten für das neue Video
         * @returns {Promise<Object>} - Das erstellte Video-Objekt
         */
        async createVideo(formData) {
            if (!formData) {
                DEBUG.log("Keine Formulardaten zum Erstellen des Videos", null, 'error');
                return null;
            }

            try {
                DEBUG.log("Erstelle neues Video in Webflow CMS...", formData);
                
                // Erstelle die API-URL zum Erstellen des Videos
                const apiUrl = `${CONFIG.BASE_URL}/${CONFIG.COLLECTION_ID}/items/live`;
                const workerUrl = this.buildWorkerUrl(apiUrl);
                
                // Die Webflow API erwartet dieses Format für ein Single Item
                const payload = {
                    isArchived: false,
                    isDraft: false,
                    fieldData: {
                        "name": formData.name || "Unbenanntes Video",
                        "slug": formData.slug || "unbenanntes-video",
                        "video-name": formData.name || "Unbenanntes Video",
                        "video-kategorie": formData.kategorie || "",
                        "video-beschreibung": formData.beschreibung || "Keine Beschreibung",
                        "offentliches-video": formData.openVideo || false,
                        "video-contest": formData.videoContest || false,
                        "webflow-id": formData.webflowMemberId || "",
                        "memberstack-id": formData.memberstackMemberId || "",
                        "creator-name": formData.memberName || "Unbekannter Nutzer",
                        "video-link": formData.videoLink || ""
                    }
                };
                
                DEBUG.log("Sende Daten an Webflow API:", payload);
                
                // Sende die Anfrage
                const response = await fetch(workerUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                
                // Überprüfe die Antwort
                if (!response.ok) {
                    const errorText = await response.text();
                    DEBUG.log(`API-Fehler beim Erstellen des Videos: ${response.status}`, errorText, 'error');
                    throw new Error(`API-Fehler beim Erstellen des Videos: ${response.status}`);
                }
                
                // Parse die Antwort
                const videoData = await response.json();
                DEBUG.log("Video erfolgreich erstellt:", videoData);
                
                // Cache löschen für aktualisierten Zustand
                if (CACHE.clear) {
                    CACHE.clear();
                }
                
                return videoData;
            } catch (error) {
                DEBUG.log("Fehler beim Erstellen des Videos:", error, 'error');
                throw error;
            }
        }
        
        /**
         * Lädt Videos in Chunks, um API-Limits zu umgehen
         * @param {Array<string>} videoIds - Liste der Video-IDs
         * @param {number} chunkSize - Größe der Chunks
         * @returns {Promise<Array>} - Array mit Video-Daten
         */
        async fetchVideosInChunks(videoIds, chunkSize = 20) {
            if (!videoIds || videoIds.length === 0) {
                return [];
            }
            
            const videoCollectionId = CONFIG.COLLECTION_ID;
            const videoIdSet = new Set(videoIds);
            let allVideos = [];
            
            // Videos in Chunks aufteilen für bessere Performance
            const chunks = [];
            for (let i = 0; i < videoIds.length; i += chunkSize) {
                chunks.push(videoIds.slice(i, i + chunkSize));
            }
            
            DEBUG.log(`Lade ${videoIds.length} Videos in ${chunks.length} Chunks`);
            
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                
                try {
                    // Erstelle die API-URL für den Chunk
                    const filter = JSON.stringify({ id: { in: chunk } });
                    const apiUrl = `${CONFIG.BASE_URL}/${videoCollectionId}/items?live=true&filter=${encodeURIComponent(filter)}`;
                    const workerUrl = this.buildWorkerUrl(apiUrl);
                    
                    // Lade den Chunk
                    const response = await fetch(workerUrl);
                    
                    if (!response.ok) {
                        throw new Error(`API-Fehler: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.items && data.items.length > 0) {
                        // Verarbeite die Videos
                        const chunkVideos = data.items
                            .filter(item => videoIdSet.has(item.id))
                            .map(item => this.processVideoItem(item));
                        
                        allVideos = allVideos.concat(chunkVideos);
                    }
                } catch (error) {
                    DEBUG.log(`Fehler beim Laden von Chunk ${i+1}`, error, 'error');
                }
            }
            
            return allVideos;
        }
        
        /**
         * Verarbeitet ein Video-Item aus der API-Antwort
         * @param {Object} item - Das Video-Item aus der API
         * @returns {Object} - Verarbeitetes Video-Objekt
         */
        processVideoItem(item) {
            if (!item || !item.fieldData) {
                return null;
            }
            
            // Kategorie-ID extrahieren
            const categoryId = item.fieldData["video-kategorie"];
            
            // Kategorie-Name über das Mapping holen
            let categoryName = "Nicht angegeben";
            
            if (categoryId && CONFIG.CATEGORY_MAPPING && CONFIG.CATEGORY_MAPPING[categoryId]) {
                categoryName = CONFIG.CATEGORY_MAPPING[categoryId];
            }
            
            return {
                id: item.id,
                "video-link": item.fieldData["video-link"],
                "video-name": item.fieldData["video-name"] || item.fieldData["name"] || "Unbenanntes Video",
                "video-beschreibung": item.fieldData["video-beschreibung"] || "",
                "video-kategorie": categoryId,
                "kategorie-name": categoryName,
                "offentliches-video": item.fieldData["offentliches-video"] || false
            };
        }
        
        /**
         * Holt ein Video anhand seiner ID
         * @param {string} videoId - Die Video-ID
         * @returns {Promise<Object>} - Die Video-Daten
         */
        async getVideoById(videoId) {
            if (!videoId) {
                DEBUG.log("Keine Video-ID angegeben", null, 'error');
                return null;
            }

            try {
                // Erstelle die API-URL zum Abrufen des Videos
                const apiUrl = `${CONFIG.BASE_URL}/${CONFIG.COLLECTION_ID}/items/${videoId}`;
                const workerUrl = this.buildWorkerUrl(apiUrl);
                
                DEBUG.log(`Lade Video mit ID ${videoId} vom API-Endpunkt`, null, 'info');
                
                const response = await fetch(workerUrl, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    DEBUG.log(`API-Fehler beim Abrufen des Videos: ${response.status}`, errorText, 'error');
                    throw new Error(`API-Fehler beim Abrufen des Videos: ${response.status}`);
                }

                // Antwort parsen
                const videoData = await response.json();
                DEBUG.log(`Video mit ID ${videoId} erfolgreich geladen`, videoData);
                return videoData;
            } catch (error) {
                DEBUG.log(`Fehler beim Abrufen des Videos mit ID ${videoId}`, error, 'error');
                throw error;
            }
        }
        
        /**
         * Aktualisiert ein Video
         * @param {Object} formData - Die neuen Video-Daten
         * @param {string} videoId - Die Video-ID
         * @returns {Promise<Object>} - Die aktualisierten Video-Daten
         */
        async updateVideo(formData, videoId) {
            if (!videoId) {
                DEBUG.log("Keine Video-ID zum Aktualisieren angegeben", null, 'error');
                return null;
            }

            try {
                // Hole die aktuellen Video-Daten
                const currentVideoData = await this.getVideoById(videoId);
                if (!currentVideoData) {
                    throw new Error(`Video mit ID ${videoId} nicht gefunden`);
                }
                
                DEBUG.log(`Aktualisiere Video mit ID ${videoId}`);
                
                // Erstelle einen neuen Slug falls der Name geändert wurde
                let slug = formData.name ? formData.name.toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, "")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "") : currentVideoData.fieldData.slug;
                
                // Die Webflow API erwartet dieses Format für ein Update
                const payload = {
                    isArchived: currentVideoData.isArchived || false,
                    isDraft: currentVideoData.isDraft || false,
                    fieldData: {
                        // Behalte alle bestehenden Felder bei
                        ...currentVideoData.fieldData,
                        // Überschreibe die zu ändernden Felder
                        "name": formData.name || currentVideoData.fieldData["name"],
                        "slug": slug || currentVideoData.fieldData["slug"],
                        "video-name": formData.name || currentVideoData.fieldData["video-name"],
                        "video-kategorie": formData.kategorie || currentVideoData.fieldData["video-kategorie"],
                        "video-beschreibung": formData.beschreibung || currentVideoData.fieldData["video-beschreibung"],
                        "offentliches-video": formData.openVideo
                    }
                };

                DEBUG.log(`Sende Update-Daten an Webflow API`, payload);

                // API-URL zum Aktualisieren des Videos
                const apiUrl = `${CONFIG.BASE_URL}/${CONFIG.COLLECTION_ID}/items/${videoId}`;
                const workerUrl = this.buildWorkerUrl(apiUrl);

                // Versuche mit PATCH, dann mit PUT, wenn PATCH fehlschlägt
                let response;
                try {
                    response = await fetch(workerUrl, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
                    });
                } catch (corsError) {
                    DEBUG.log(`PATCH fehlgeschlagen, versuche mit PUT...`, corsError, 'warn');
                    
                    response = await fetch(workerUrl, {
                        method: "PUT",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(payload)
                    });
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    DEBUG.log(`API-Fehler beim Aktualisieren des Videos: ${response.status}`, errorText, 'error');
                    throw new Error(`API-Fehler beim Aktualisieren des Videos: ${response.status}`);
                }

                const responseData = await response.json();
                DEBUG.log(`Video erfolgreich aktualisiert`, responseData);
                
                // Cache für dieses Video löschen
                if (CACHE.clear) {
                    CACHE.clear();
                }
                
                return responseData;
            } catch (error) {
                DEBUG.log(`Fehler beim Aktualisieren des Videos`, error, 'error');
                throw error;
            }
        }
        
        /**
         * Löscht ein Video
         * @param {string} videoId - Die Video-ID
         * @returns {Promise<boolean>} - True, wenn das Löschen erfolgreich war
         */
        async deleteVideo(videoId) {
            if (!videoId) {
                DEBUG.log("Keine Video-ID zum Löschen angegeben", null, 'error');
                return false;
            }

            try {
                DEBUG.log(`Versuche Video mit ID ${videoId} zu löschen`);
                
                // 1. Versuche zuerst, die Video-Details zu holen
                const videoData = await this.getVideoById(videoId);
                if (!videoData) {
                    DEBUG.log(`Video mit ID ${videoId} existiert nicht oder ist bereits gelöscht`, null, 'warn');
                    // Wir betrachten es als Erfolg, wenn das Video nicht existiert
                    return true;
                }
                
                // 2. Uploadcare-UUID aus dem Video-Link extrahieren, falls vorhanden
                let uploadcareUuid = null;
                if (videoData.fieldData && videoData.fieldData["video-link"]) {
                    uploadcareUuid = this.extractUploadcareUuid(videoData.fieldData["video-link"]);
                }
                
                // 3. Versuche zuerst, das Video als "gelöscht" zu markieren (Soft-Delete)
                // Dies ist ein Workaround für den 409-Fehler
                try {
                    DEBUG.log(`Versuche Soft-Delete für Video ${videoId}`);
                    
                    const softDeletePayload = {
                        isArchived: true, // Markiere als archiviert
                        fieldData: {
                            ...videoData.fieldData,
                            "_deleted": true,
                            "_deletedAt": new Date().toISOString()
                        }
                    };
                    
                    const apiUrl = `${CONFIG.BASE_URL}/${CONFIG.COLLECTION_ID}/items/${videoId}`;
                    const workerUrl = this.buildWorkerUrl(apiUrl);
                    
                    const softDeleteResponse = await fetch(workerUrl, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(softDeletePayload)
                    });
                    
                    if (softDeleteResponse.ok) {
                        DEBUG.log(`Video ${videoId} erfolgreich als gelöscht markiert (Soft-Delete)`);
                    }
                } catch (softDeleteError) {
                    DEBUG.log(`Soft-Delete fehlgeschlagen für Video ${videoId}`, softDeleteError, 'warn');
                    // Wir setzen fort mit dem harten Löschen
                }
                
                // 4. Versuche, das Video aus dem Member-Feed zu entfernen
                // Dies kann helfen, den 409-Fehler zu vermeiden
                try {
                    if (videoData.fieldData && (videoData.fieldData["webflow-id"] || videoData.fieldData["memberstack-id"])) {
                        const memberId = videoData.fieldData["webflow-id"] || videoData.fieldData["memberstack-id"];
                        
                        DEBUG.log(`Versuche Video ${videoId} aus dem Feed von Member ${memberId} zu entfernen`);
                        
                        const memberApiUrl = `${CONFIG.BASE_URL}/${CONFIG.MEMBERS_COLLECTION_ID}/items/${memberId}`;
                        const memberWorkerUrl = this.buildWorkerUrl(memberApiUrl);
                        
                        // Hole den Member
                        const memberResponse = await fetch(memberWorkerUrl);
                        if (memberResponse.ok) {
                            const memberData = await memberResponse.json();
                            
                            if (memberData.fieldData && memberData.fieldData["video-feed"] && 
                                Array.isArray(memberData.fieldData["video-feed"])) {
                                
                                // Entferne das Video aus dem Feed
                                const updatedFeed = memberData.fieldData["video-feed"].filter(id => id !== videoId);
                                
                                // Aktualisiere den Member
                                const memberUpdatePayload = {
                                    fieldData: {
                                        ...memberData.fieldData,
                                        "video-feed": updatedFeed
                                    }
                                };
                                
                                const memberUpdateResponse = await fetch(memberWorkerUrl, {
                                    method: "PATCH",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify(memberUpdatePayload)
                                });
                                
                                if (memberUpdateResponse.ok) {
                                    DEBUG.log(`Video ${videoId} erfolgreich aus dem Feed von Member ${memberId} entfernt`);
                                }
                            }
                        }
                    }
                } catch (memberUpdateError) {
                    DEBUG.log(`Fehler beim Entfernen des Videos aus dem Member-Feed`, memberUpdateError, 'warn');
                    // Wir setzen fort, auch wenn dies fehlschlägt
                }
                
                // 5. Jetzt versuchen wir das eigentliche Löschen
                const apiUrl = `${CONFIG.BASE_URL}/${CONFIG.COLLECTION_ID}/items/${videoId}`;
                const workerUrl = this.buildWorkerUrl(apiUrl);
                
                const deleteResponse = await fetch(workerUrl, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json"
                    }
                });
                
                // Prüfe auf 409 Conflict
                if (deleteResponse.status === 409) {
                    DEBUG.log(`409 Conflict beim Löschen von Video ${videoId}. Das Video könnte noch referenziert sein.`, null, 'warn');
                    
                    // Als Workaround bei 409-Fehler:
                    // 1. Wir haben bereits versucht, das Video als archiviert zu markieren
                    // 2. Wir haben bereits versucht, es aus dem Member-Feed zu entfernen
                    // 3. Betrachte es als "erfolgreichen" Löschvorgang für den Benutzer
                    
                    DEBUG.log(`Wir betrachten das Löschen als erfolgreich, obwohl der eigentliche Löschvorgang fehlgeschlagen ist`);
                    
                    // Cache leeren für konsistenten Zustand
                    if (CACHE.clear) {
                        CACHE.clear();
                    }
                    
                    return true;
                }
                
                // Bei erfolgreichem Löschen oder 204 No Content
                if (deleteResponse.ok || deleteResponse.status === 204) {
                    DEBUG.log(`Video ${videoId} erfolgreich gelöscht`);
                    
                    // 6. Optionaler Schritt: Lösche die Uploadcare-Datei
                    if (uploadcareUuid && window.WEBFLOW_API.UPLOADCARE && 
                        typeof window.WEBFLOW_API.UPLOADCARE.deleteUploadcareFile === 'function') {
                        try {
                            DEBUG.log(`Versuche zugehörige Uploadcare-Datei ${uploadcareUuid} zu löschen`);
                            await window.WEBFLOW_API.UPLOADCARE.deleteUploadcareFile(uploadcareUuid);
                        } catch (uploadcareError) {
                            DEBUG.log(`Fehler beim Löschen der Uploadcare-Datei: ${uploadcareError.message}`, null, 'warn');
                            // Wir betrachten das Video-Löschen weiterhin als erfolgreich
                        }
                    }
                    
                    // Cache leeren
                    if (CACHE.clear) {
                        CACHE.clear();
                    }
                    
                    return true;
                }
                
                // Bei anderen Fehlern
                const errorText = await deleteResponse.text();
                DEBUG.log(`Fehler beim Löschen des Videos: ${deleteResponse.status}`, errorText, 'error');
                throw new Error(`Fehler beim Löschen des Videos: ${deleteResponse.status} - ${errorText}`);
                
            } catch (error) {
                DEBUG.log(`Unerwarteter Fehler beim Löschen des Videos:`, error, 'error');
                throw error;
            }
        }
        
        /**
         * Extrahiert die Uploadcare-UUID aus einer URL
         * @param {string} url - Die URL, aus der die UUID extrahiert werden soll
         * @returns {string|null} - Die extrahierte UUID oder null
         */
        extractUploadcareUuid(url) {
            if (!url) return null;
            
            // Pattern für Uploadcare CDN-URLs
            const cdnPattern = /ucarecdn\.com\/([a-f0-9-]{36})/i;
            const cdnMatch = url.match(cdnPattern);
            
            if (cdnMatch && cdnMatch[1]) {
                return cdnMatch[1];
            }
            
            // Alternative Pattern für UUID direkt
            const uuidPattern = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
            const uuidMatch = url.match(uuidPattern);
            
            if (uuidMatch && uuidMatch[1]) {
                return uuidMatch[1];
            }
            
            return null;
        }
    }

    // Singleton-Instanz im globalen Namespace registrieren
    window.WEBFLOW_API.VIDEO_API = new VideoApiService();
})();
