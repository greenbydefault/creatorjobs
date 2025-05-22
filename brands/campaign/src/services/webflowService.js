(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.services = window.WEBFLOW_API.services || {};

  // Abhängigkeiten aus dem globalen Namespace holen
  const config = window.WEBFLOW_API.config;
  const { delay } = window.WEBFLOW_API.utils; // Stellt sicher, dass helpers.js vorher geladen wurde

  /**
   * Baut die vollständige Worker-URL für einen gegebenen API-Endpunkt.
   * @param {string} apiUrl - Die Webflow API URL.
   * @returns {string} Die vollständige Worker URL.
   */
  function buildWorkerUrl_MJ(apiUrl) {
    const baseUrl = config.WORKER_BASE_URL_MJ.endsWith('/') ? config.WORKER_BASE_URL_MJ : config.WORKER_BASE_URL_MJ + '/';
    return `${baseUrl}?url=${encodeURIComponent(apiUrl)}`;
  }

  /**
   * Ruft ein einzelnes Item aus einer Webflow Collection ab.
   * @param {string} collectionId - Die ID der Webflow Collection.
   * @param {string} itemId - Die ID des abzurufenden Items.
   * @returns {Promise<object|null>} Das Item-Objekt oder ein Fehlerobjekt.
   */
  async function fetchWebflowItem(collectionId, itemId) {
    if (!itemId) {
      console.warn(`Ungültige Item-ID für Collection ${collectionId} übergeben.`);
      return null;
    }
    const apiUrl = `${config.API_BASE_URL_MJ}/${collectionId}/items/${itemId}/live`;
    const workerUrl = buildWorkerUrl_MJ(apiUrl);

    try {
      const response = await fetch(workerUrl);
      if (!response.ok) {
        if (response.status === 404) {
          // Spezifisches Fehlerobjekt für "nicht gefunden"
          return { id: itemId, error: true, status: 404, message: `Item ${itemId} not found.` };
        }
        const errorText = await response.text();
        console.error(`API-Fehler beim Abrufen von Item ${itemId} aus Collection ${collectionId}: ${response.status} - ${errorText}`);
        if (response.status === 429) {
          console.warn(`Rate limit getroffen bei Item ${itemId}.`);
          // Spezifisches Fehlerobjekt für Rate Limiting
          return { error: true, status: 429, message: "Too Many Requests for item " + itemId, id: itemId };
        }
        // Allgemeines API-Fehlerobjekt
        return { id: itemId, error: true, status: response.status, message: `API Error for item ${itemId}: ${errorText}` };
      }
      return await response.json();
    } catch (error) {
      console.error(`❌ Netzwerkfehler oder anderer Fehler beim Abrufen des Items (${collectionId}/${itemId}): ${error.message}`);
      // Netzwerkfehler-Objekt
      return { id: itemId, error: true, status: 'network_error', message: `Network error for item ${itemId}: ${error.message}` };
    }
  }

  /**
   * Ruft alle Bewerber für einen bestimmten Job ab, basierend auf einer Liste von IDs.
   * @param {string} jobId - Die ID des Jobs (für Logging und Kontext).
   * @param {string[]} applicantIds - Ein Array von Bewerber-Item-IDs.
   * @returns {Promise<object[]>} Ein Array von abgerufenen Bewerber-Items (können auch Fehlerobjekte enthalten).
   */
  async function fetchAllApplicantsForJob(jobId, applicantIds) {
    console.log(`DEBUG: fetchAllApplicantsForJob START - Job ID: ${jobId}, Anzahl IDs: ${applicantIds.length}`);
    const fetchedItems = [];
    let successfulFetches = 0;

    if (applicantIds.length > 0) {
      const promises = applicantIds.map((applicantId, index) =>
        delay(index * (config.API_CALL_DELAY_MS / 2)) // Leichte Staffelung der Aufrufe
          .then(() => fetchWebflowItem(config.USER_COLLECTION_ID_MJ, applicantId))
      );
      const results = await Promise.all(promises);
      results.forEach(item => {
        if (item) { // fetchWebflowItem kann null zurückgeben bei ungültiger ID vorher, oder ein Fehlerobjekt
          fetchedItems.push(item);
          if (!item.error) successfulFetches++;
        }
      });
    }
    console.log(`DEBUG: fetchAllApplicantsForJob END - Job ID: ${jobId}, ${successfulFetches} von ${applicantIds.length} Items erfolgreich geladen.`);
    return fetchedItems;
  }

  // Exponieren der Service-Funktionen
  window.WEBFLOW_API.services.buildWorkerUrl_MJ = buildWorkerUrl_MJ;
  window.WEBFLOW_API.services.fetchWebflowItem = fetchWebflowItem;
  window.WEBFLOW_API.services.fetchAllApplicantsForJob = fetchAllApplicantsForJob;

})();
