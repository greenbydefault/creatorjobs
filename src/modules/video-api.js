// src/modules/video-api.js
import { CONFIG } from '../config.js';
import { DEBUG } from './debug.js';
import { API } from './api-service.js';
import { CACHE } from './cache.js';

class VideoApiService {
    /**
     * Holt ein einzelnes Video anhand seiner ID
     * @param {string} videoId - Die Video-ID
     * @returns {Promise<Object>} - Die Video-Daten
     */
    async getVideoById(videoId) {
        try {
            const apiUrl = API.buildApiUrl(`/${CONFIG.COLLECTION_ID}/items/${videoId}`);
            const workerUrl = API.buildWorkerUrl(apiUrl);
            
            DEBUG.log(`Rufe Video mit ID ${videoId} ab...`);
            
            return await API.fetchApi(workerUrl);
        } catch (error) {
            DEBUG.log(`Fehler beim Abrufen des Videos mit ID ${videoId}`, error, 'error');
            throw error;
        }
    }
    
    /**
     * Lädt Videos in Chunks, um die Performance zu verbessern
     * @param {Array<string>} videoIds - Array mit Video-IDs
     * @param {number} chunkSize - Größe jedes Chunks
     * @returns {Promise<Array>} - Array mit Video-Daten
     */
    async fetchVideosInChunks(videoIds, chunkSize = 20) {
        if (!videoIds || videoIds.length === 0) {
            return [];
        }
        
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
                const apiUrl = API.buildApiUrl(`/${CONFIG.COLLECTION_ID}/items`, {
                    live: true,
                    filter: { id: { in: chunk } }
                });
                
                const workerUrl = API.buildWorkerUrl(apiUrl);
                const data = await API.fetchApi(workerUrl);
                
                if (data.items && data.items.length > 0) {
                    // Sicherstellen, dass wir nur Videos mit IDs im Set behalten und verarbeiten
                    const chunkVideos = data.items
                        .filter(item => videoIdSet.has(item.id))
                        .map(item => this.processVideoItem(item))
                        .filter(video => video && video["video-link"]);
                    
                    allVideos = allVideos.concat(chunkVideos);
                }
            } catch (error) {
                DEBUG.log(`Fehler beim Laden von Chunk ${i+1}`, error, 'error');
            }
        }
        
        return allVideos;
    }
    
    /**
     * Verarbeitet ein Video-Item in ein einheitliches Format
     * @param {Object} item - Das Video-Item aus der API
     * @returns {Object} - Das verarbeitete Video-Objekt
     */
    processVideoItem(item) {
        if (!item || !item.fieldData) {
            return null;
        }
        
        // Kategorie-ID extrahieren und detailliertes Logging hinzufügen
        const categoryId = item.fieldData["video-kategorie"];
        DEBUG.log(`Verarbeite Video ${item.id} mit Kategorie-ID: "${categoryId}"`);
        
        // Kategorie-Name über das Mapping holen
        let categoryName = "Nicht angegeben";
        
        if (categoryId) {
            // Überprüfe das Mapping
            if (CONFIG.CATEGORY_MAPPING && CONFIG.CATEGORY_MAPPING[categoryId]) {
                categoryName = CONFIG.CATEGORY_MAPPING[categoryId];
                DEBUG.log(`Kategorie-Mapping gefunden: "${categoryId}" => "${categoryName}"`);
            } else {
                // Kein Mapping gefunden - detaillierte Informationen ausgeben
                DEBUG.log(`⚠️ Kein Kategorie-Mapping gefunden für ID: "${categoryId}"`, null, 'warn');
                
                // Erste 6 Zeichen überprüfen (für teilweise übereinstimmungen)
                const prefix = categoryId.substring(0, 6);
                const possibleMatches = Object.keys(CONFIG.CATEGORY_MAPPING)
                    .filter(key => key.startsWith(prefix));
                
                if (possibleMatches.length > 0) {
                    DEBUG.log(`Mögliche Kategorie-Übereinstimmungen gefunden:`, possibleMatches);
                    
                    // Nutze die erste mögliche Übereinstimmung
                    const firstMatch = possibleMatches[0];
                    categoryName = CONFIG.CATEGORY_MAPPING[firstMatch];
                    DEBUG.log(`Verwende ähnliche Kategorie: "${firstMatch}" => "${categoryName}"`);
                } else {
                    categoryName = "Kategorie " + categoryId.substring(0, 6);
                }
            }
        }
        
        return {
            id: item.id,
            "video-link": item.fieldData["video-link"],
            "video-name": item.fieldData["video-name"] || item.fieldData["name"] || "Unbenanntes Video",
            "video-kategorie": categoryId,
            "kategorie-name": categoryName
        };
    }
    
    /**
     * Erstellt ein neues Video-Element im CMS
     * @param {Object} formData - Die Formulardaten für das Video
     * @returns {Promise<Object>} - Die erstellten Video-Daten
     */
    async createVideo(formData) {
        const apiUrl = API.buildApiUrl(`/${CONFIG.COLLECTION_ID}/items/live`);
        const workerUrl = API.buildWorkerUrl(apiUrl);
        
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

        try {
            return await API.fetchApi(workerUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            DEBUG.log("Fehler beim Erstellen des CMS Items:", error, 'error');
            throw error;
        }
    }
    
    /**
     * Aktualisiert ein vorhandenes Video
     * @param {string} videoId - Die ID des zu aktualisierenden Videos
     * @param {Object} formData - Die neuen Daten für das Video
     * @param {Object} currentData - Die aktuellen Daten des Videos
     * @returns {Promise<Object>} - Die aktualisierten Video-Daten
     */
    async updateVideo(videoId, formData, currentData) {
        if (!videoId || !currentData) {
            throw new Error("Keine Video-ID oder aktuelle Daten zum Aktualisieren");
        }

        try {
            const apiUrl = API.buildApiUrl(`/${CONFIG.COLLECTION_ID}/items/${videoId}`);
            const workerUrl = API.buildWorkerUrl(apiUrl);
            
            // Erstelle einen neuen Slug falls der Name geändert wurde
            let slug = formData.name.toLowerCase()
                .replace(/\s+/g, "-")
                .replace(/[^a-z0-9-]/g, "")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "");
            
            // Die Webflow API erwartet dieses Format für ein Update
            const payload = {
                isArchived: currentData.isArchived || false,
                isDraft: currentData.isDraft || false,
                fieldData: {
                    // Behalte alle bestehenden Felder bei
                    ...currentData.fieldData,
                    // Überschreibe die zu ändernden Felder
                    "name": formData.name || currentData.fieldData["name"],
                    "slug": slug || currentData.fieldData["slug"],
                    "video-name": formData.name || currentData.fieldData["video-name"],
                    "video-kategorie": formData.kategorie || currentData.fieldData["video-kategorie"],
                    "video-beschreibung": formData.beschreibung || currentData.fieldData["video-beschreibung"],
                    "offentliches-video": formData.openVideo
                }
            };

            DEBUG.log("Sende Update-Daten an Webflow API:", payload);

            // Versuche zuerst mit PATCH, dann mit PUT wenn PATCH fehlschlägt
            try {
                DEBUG.log("Versuche Update mit PATCH...");
                return await API.fetchApi(workerUrl, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
            } catch (corsError) {
                DEBUG.log("PATCH fehlgeschlagen, versuche mit PUT...", corsError, 'warn');
                
                return await API.fetchApi(workerUrl, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
            }
        } catch (error) {
            DEBUG.log("Fehler beim Aktualisieren des Videos:", error, 'error');
            throw error;
        }
    }
    
    /**
     * Löscht ein Video
     * @param {string} videoId - Die ID des zu löschenden Videos
     * @returns {Promise<boolean>} - true, wenn erfolgreich gelöscht
     */
    async deleteVideo(videoId) {
        try {
            const apiUrl = API.buildApiUrl(`/${CONFIG.COLLECTION_ID}/items/${videoId}`);
            const workerUrl = API.buildWorkerUrl(apiUrl);
            
            const response = await fetch(workerUrl, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json"
                }
            });
            
            // Bei DELETE gibt die API möglicherweise keinen Inhalt zurück (204 No Content)
            return response.status === 204 || response.ok;
        } catch (error) {
            DEBUG.log("Fehler beim Löschen des Videos:", error, 'error');
            return false;
        }
    }
}

// Singleton-Instanz exportieren
export const VIDEO_API = new VideoApiService();
