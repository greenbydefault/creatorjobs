
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
            const workerBase = CONFIG?.WORKER_BASE_URL_MJ;
            if (!workerBase) {
                console.error("KONFIGURATIONSFEHLER: WORKER_BASE_URL_MJ ist in der Konfiguration nicht definiert! Nutze direkte apiUrl als Fallback.");
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
            // 1. Prüfe, ob collectionId vorhanden ist
            if (!collectionId) {
                const errorMessage = `Parameter 'collectionId' fehlt. Item '${itemId || 'unbekannt'}' kann nicht abgerufen werden.`;
                console.error(`FEHLER bei fetchWebflowItem: ${errorMessage}`);
                return {
                    error: true,
                    status: 'parameter_error',
                    message: errorMessage,
                    details: { itemId: itemId || null }
                };
            }

            // 2. Prüfe, ob itemId vorhanden ist
            if (!itemId) {
                const errorMessage = `Parameter 'itemId' fehlt. Item aus Collection '${collectionId}' kann nicht abgerufen werden.`;
                console.warn(`WARNUNG bei fetchWebflowItem: ${errorMessage}`);
                return {
                    error: true,
                    status: 'parameter_error',
                    message: errorMessage,
                    details: { collectionId: collectionId }
                };
            }

            // 3. Prüfe, ob die API Basis-URL konfiguriert ist
            const apiBase = CONFIG?.API_BASE_URL_MJ;
            if (!apiBase) {
                const errorMessage = `API Basis-URL (API_BASE_URL_MJ) nicht konfiguriert. Item '${itemId}' aus Collection '${collectionId}' kann nicht abgerufen werden.`;
                console.error(`KONFIGURATIONSFEHLER bei fetchWebflowItem: ${errorMessage}`);
                return {
                    error: true,
                    status: 'config_error',
                    message: errorMessage,
                    details: { collectionId: collectionId, itemId: itemId }
                };
            }

            const apiUrl = `${apiBase}/${collectionId}/items/${itemId}/live`;
            const workerUrl = this.buildWorkerUrl_MJ(apiUrl);

            // Zusätzliche Prüfung: buildWorkerUrl_MJ könnte die apiUrl zurückgeben, wenn WORKER_BASE_URL_MJ fehlt.
            // Dies ist an sich kein Fehler hier, da die Funktion so implementiert ist, aber man sollte sich dessen bewusst sein.

            try {
                const response = await fetch(workerUrl);
                if (!response.ok) {
                    const errorDetails = { collectionId: collectionId, itemId: itemId };
                    if (response.status === 404) {
                        const message = `Item '${itemId}' in Collection '${collectionId}' nicht gefunden (404).`;
                        console.warn(`API INFO: ${message}`);
                        return { ...errorDetails, error: true, status: 404, message: message };
                    }

                    const errorText = await response.text(); // Versuche, den Fehlertext zu lesen
                    const message = `API-Fehler (${response.status}) beim Abrufen von Item '${itemId}' aus Collection '${collectionId}'. Antwort: ${errorText}`;
                    console.error(message);

                    if (response.status === 429) { // Rate Limit
                        console.warn(`Rate Limit getroffen bei Item '${itemId}' aus Collection '${collectionId}'.`);
                        return { ...errorDetails, error: true, status: 429, message: `Rate Limit für Item '${itemId}' in Collection '${collectionId}'.` };
                    }
                    return { ...errorDetails, error: true, status: response.status, message: `API Fehler: ${errorText || 'Unbekannter API Fehler'}` };
                }
                // Erfolgreiche Antwort
                const data = await response.json();
                // Optional: Füge Kontext zur erfolgreichen Antwort hinzu, falls benötigt
                // return { ...data, _collectionId: collectionId, _itemId: itemId };
                return data;

            } catch (error) {
                const networkErrorMessage = `Netzwerkfehler oder anderer Fehler beim Abrufen des Items ('${collectionId}/${itemId}'): ${error.message}`;
                console.error(`❌ ${networkErrorMessage}`);
                return {
                    collectionId: collectionId,
                    itemId: itemId,
                    error: true,
                    status: 'network_error',
                    message: networkErrorMessage
                };
            }
        },

        /**
         * Ruft alle Bewerber für einen bestimmten Job ab.
         * @param {string} jobId - Die ID des Jobs.
         * @param {string[]} applicantIds - Ein Array von Bewerber-IDs.
         * @returns {Promise<object[]>} - Ein Array von Bewerber-Item-Objekten.
         */
        fetchAllApplicantsForJob: async function(jobId, applicantIds) {
            console.log(`DEBUG: fetchAllApplicantsForJob START - Job ID: ${jobId}, Anzahl IDs: ${applicantIds ? applicantIds.length : 0}`);
            const fetchedItems = [];
            let successfulFetches = 0;

            const userColId = CONFIG?.USER_COLLECTION_ID_MJ;
            const apiDelay = CONFIG?.API_CALL_DELAY_MS || 5; // Standardwert 5ms, falls nicht konfiguriert
            const utilsDelay = UTILS?.delay;

            if (!userColId) {
                console.error("KONFIGURATIONSFEHLER: USER_COLLECTION_ID_MJ ist in der Konfiguration nicht definiert! Bewerber können nicht geladen werden.");
                return []; // Leeres Array bei Konfigurationsfehler
            }
            if (!utilsDelay) {
                console.warn("WARNUNG: UTILS.delay ist nicht verfügbar! API-Aufrufe erfolgen ohne Verzögerung. Dies kann zu Rate-Limiting führen.");
            }

            if (applicantIds && applicantIds.length > 0) {
                const promises = applicantIds.map((applicantId, index) => {
                    // Stelle sicher, dass applicantId gültig ist, bevor ein Promise erstellt wird
                    if (!applicantId) {
                        console.warn(`WARNUNG: Ungültige (leere) applicantId im Array für Job ${jobId} an Index ${index}. Überspringe.`);
                        return Promise.resolve({ error: true, status: 'parameter_error', message: 'Leere applicantId übersprungen', details: {jobId, index} }); // Gibt ein Fehlerobjekt zurück, um die Struktur beizubehalten
                    }
                    const requestPromise = () => this.fetchWebflowItem(userColId, applicantId);
                    
                    if (utilsDelay && apiDelay > 0) { // Nur verzögern, wenn utilsDelay vorhanden und apiDelay positiv ist
                        return utilsDelay(index * (apiDelay / 2)).then(requestPromise);
                    } else {
                        return requestPromise(); // Sofort ausführen, falls keine Verzögerung möglich/nötig
                    }
                });

                const results = await Promise.all(promises);
                results.forEach(item => {
                    if (item) { // Stelle sicher, dass ein Item zurückgegeben wurde (auch Fehlerobjekte)
                        fetchedItems.push(item);
                        if (!item.error) {
                            successfulFetches++;
                        } else {
                            // Logge Fehler hier detaillierter, falls nötig
                            console.warn(`Fehler beim Laden eines Bewerbers für Job ${jobId}: ${item.message || 'Unbekannter Fehler'} (Status: ${item.status || 'N/A'})`);
                        }
                    }
                });
            } else {
                console.log(`DEBUG: Keine applicantIds für Job ID: ${jobId} vorhanden oder Array ist leer.`);
            }

            console.log(`DEBUG: fetchAllApplicantsForJob END - Job ID: ${jobId}, ${successfulFetches} von ${applicantIds ? applicantIds.length : 0} Items erfolgreich geladen.`);
            return fetchedItems;
        }
    };

    window.WEBFLOW_API.apiService = apiService;

})();
