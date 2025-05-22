// src/apiService.js
(function() {
    'use strict';

    window.WEBFLOW_API = window.WEBFLOW_API || {};

    // Abhängigkeiten
    const CONFIG = window.WEBFLOW_API.config;
    const UTILS = window.WEBFLOW_API.utils;

    const apiService = {
        /**
         * Baut die URL für den Worker-Proxy.
         * @param {string} apiUrl - Die ursprüngliche API-URL.
         * @returns {string} - Die URL für den Worker.
         */
        buildWorkerUrl_MJ: function(apiUrl) {
            // Stelle sicher, dass CONFIG und WORKER_BASE_URL_MJ existieren
            const workerBase = CONFIG?.WORKER_BASE_URL_MJ;
            if (!workerBase) {
                console.error("WORKER_BASE_URL_MJ ist in der Konfiguration nicht definiert!");
                return apiUrl; // Fallback oder Fehlerbehandlung
            }
            const baseUrl = workerBase.endsWith('/') ? workerBase : workerBase + '/';
            return `${baseUrl}?url=${encodeURIComponent(apiUrl)}`;
        },

        /**
         * Ruft ein einzelnes Item aus einer Webflow Collection ab.
         * @param {string} collectionId - Die ID der Webflow Collection.
         * @param {string} itemId - Die ID des Items.
         * @returns {Promise<object | null>} - Das Item-Objekt oder ein Fehlerobjekt.
         */
        fetchWebflowItem: async function(collectionId, itemId) {
            if (!itemId) {
                console.warn(`Ungültige Item-ID für Collection ${collectionId} übergeben.`);
                return null;
            }
            // Stelle sicher, dass CONFIG und API_BASE_URL_MJ existieren
            const apiBase = CONFIG?.API_BASE_URL_MJ;
            if (!apiBase) {
                console.error("API_BASE_URL_MJ ist in der Konfiguration nicht definiert!");
                return { id: itemId, error: true, status: 'config_error', message: `API base URL not configured for item ${itemId}` };
            }

            const apiUrl = `${apiBase}/${collectionId}/items/${itemId}/live`;
            const workerUrl = this.buildWorkerUrl_MJ(apiUrl);

            try {
                const response = await fetch(workerUrl);
                if (!response.ok) {
                    if (response.status === 404) {
                        return { id: itemId, error: true, status: 404, message: `Item ${itemId} not found.` };
                    }
                    const errorText = await response.text();
                    console.error(`API-Fehler beim Abrufen von Item ${itemId} aus Collection ${collectionId}: ${response.status} - ${errorText}`);
                    if (response.status === 429) {
                        console.warn(`Rate limit getroffen bei Item ${itemId}.`);
                        return { error: true, status: 429, message: "Too Many Requests for item " + itemId, id: itemId };
                    }
                    return { id: itemId, error: true, status: response.status, message: `API Error for item ${itemId}: ${errorText}` };
                }
                return await response.json();
            } catch (error) {
                console.error(`❌ Netzwerkfehler oder anderer Fehler beim Abrufen des Items (${collectionId}/${itemId}): ${error.message}`);
                return { id: itemId, error: true, status: 'network_error', message: `Network error for item ${itemId}: ${error.message}` };
            }
        },

        /**
         * Ruft alle Bewerber für einen bestimmten Job ab.
         * @param {string} jobId - Die ID des Jobs.
         * @param {string[]} applicantIds - Ein Array von Bewerber-IDs.
         * @returns {Promise<object[]>} - Ein Array von Bewerber-Item-Objekten.
         */
        fetchAllApplicantsForJob: async function(jobId, applicantIds) {
            console.log(`DEBUG: fetchAllApplicantsForJob START - Job ID: ${jobId}, Anzahl IDs: ${applicantIds.length}`);
            const fetchedItems = [];
            let successfulFetches = 0;

            // Stelle sicher, dass CONFIG, USER_COLLECTION_ID_MJ und API_CALL_DELAY_MS existieren
            const userColId = CONFIG?.USER_COLLECTION_ID_MJ;
            const apiDelay = CONFIG?.API_CALL_DELAY_MS || 5;
            const utilsDelay = UTILS?.delay;

            if (!userColId) {
                console.error("USER_COLLECTION_ID_MJ ist in der Konfiguration nicht definiert!");
                return []; // Leeres Array bei Konfigurationsfehler
            }
            if (!utilsDelay) {
                console.error("UTILS.delay ist nicht verfügbar!");
                // Ohne delay fortfahren oder Fehler werfen
            }


            if (applicantIds && applicantIds.length > 0) {
                const promises = applicantIds.map((applicantId, index) =>
                    (utilsDelay ? utilsDelay(index * (apiDelay / 2)) : Promise.resolve()) // Fallback, falls delay nicht da
                    .then(() => this.fetchWebflowItem(userColId, applicantId))
                );
                const results = await Promise.all(promises);
                results.forEach(item => {
                    if (item) {
                        fetchedItems.push(item);
                        if (!item.error) successfulFetches++;
                    }
                });
            }
            console.log(`DEBUG: fetchAllApplicantsForJob END - Job ID: ${jobId}, ${successfulFetches} von ${applicantIds.length} Items erfolgreich geladen.`);
            return fetchedItems;
        }
    };

    window.WEBFLOW_API.apiService = apiService;

})();
