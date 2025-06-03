// brands/campaign/src/services/webflowService.js
(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.services = window.WEBFLOW_API.services || {};

  const config = window.WEBFLOW_API.config;
  const { delay } = (window.WEBFLOW_API.utils || {});

  function buildWorkerUrl_MJ(apiUrl) {
    if (!config || !config.WORKER_BASE_URL_MJ) {
      console.error("buildWorkerUrl_MJ: Konfiguration (WORKER_BASE_URL_MJ) nicht gefunden!");
      return apiUrl;
    }
    const baseUrl = config.WORKER_BASE_URL_MJ.endsWith('/') ? config.WORKER_BASE_URL_MJ : config.WORKER_BASE_URL_MJ + '/';
    return `${baseUrl}?url=${encodeURIComponent(apiUrl)}`;
  }

  async function fetchWebflowItem(collectionId, itemId) {
    if (!itemId) {
      console.warn(`Ungültige Item-ID für Collection ${collectionId} übergeben.`);
      return null;
    }
    if (!config || !config.API_BASE_URL_MJ) {
      console.error("fetchWebflowItem: Konfiguration (API_BASE_URL_MJ) nicht gefunden!");
      return { id: itemId, error: true, status: 'config_error', message: 'API Konfiguration fehlt.' };
    }
    const apiUrl = `${config.API_BASE_URL_MJ}/${collectionId}/items/${itemId}/live`;
    const workerUrl = buildWorkerUrl_MJ(apiUrl);

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
  }

  async function updateWebflowItem_MJ(collectionId, itemId, fieldDataToUpdate) {
    if (!collectionId || !itemId || !fieldDataToUpdate) {
      console.error('updateWebflowItem_MJ: CollectionID, ItemID oder fieldDataToUpdate fehlt.');
      return false;
    }
    if (!config || !config.API_BASE_URL_MJ) {
      console.error("updateWebflowItem_MJ: Konfiguration (API_BASE_URL_MJ) nicht gefunden!");
      return false;
    }

    const apiUrl = `${config.API_BASE_URL_MJ}/${collectionId}/items/${itemId}/live`;
    const workerUrl = buildWorkerUrl_MJ(apiUrl);
    const payload = { fieldData: fieldDataToUpdate };

    console.log(`webflowService.updateWebflowItem_MJ: Sende PATCH an ${apiUrl} für Item ${itemId} mit Payload:`, JSON.stringify(payload));

    try {
      const response = await fetch(workerUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API-Fehler beim Aktualisieren von Item ${itemId} in Collection ${collectionId}: ${response.status} - ${errorText}`);
        try {
            const errorJson = JSON.parse(errorText);
            console.error('Fehlerdetails (JSON):', errorJson);
             if (errorJson.problems) {
                errorJson.problems.forEach(problem => console.error(`Webflow Problem: ${problem}`));
            }
        } catch (e) { /* Nichts tun, wenn es kein JSON ist */ }
        return false;
      }
      console.log(`Item ${itemId} in Collection ${collectionId} erfolgreich aktualisiert.`);
      return true;
    } catch (error) {
      console.error(`Netzwerkfehler oder anderer Fehler beim Aktualisieren des Items (${collectionId}/${itemId}): ${error.message}`);
      return false;
    }
  }

  async function updateJobItem_MJ(jobId, updatedFieldData) {
    if (!config || !config.JOB_COLLECTION_ID_MJ) {
      console.error("updateJobItem_MJ: Konfiguration (JOB_COLLECTION_ID_MJ) nicht gefunden!");
      return false;
    }
    return await updateWebflowItem_MJ(config.JOB_COLLECTION_ID_MJ, jobId, updatedFieldData);
  }

  /**
   * Spezifische Funktion zum Aktualisieren eines User-Items (Creators).
   * @param {string} userId - Die ID des Users/Creators.
   * @param {object} updatedFieldData - Die zu aktualisierenden Felddaten (z.B. {'booked-jobs': ['jobId1']}).
   * @returns {Promise<boolean>} True bei Erfolg, false bei einem Fehler.
   */
  async function updateUserItem_MJ(userId, updatedFieldData) {
    if (!config || !config.USER_COLLECTION_ID_MJ) {
      console.error("updateUserItem_MJ: Konfiguration (USER_COLLECTION_ID_MJ) nicht gefunden!");
      return false;
    }
    return await updateWebflowItem_MJ(config.USER_COLLECTION_ID_MJ, userId, updatedFieldData);
  }

  async function fetchAllApplicantsForJob(jobId, applicantIds) {
    console.log(`DEBUG: fetchAllApplicantsForJob START - Job ID: ${jobId}, Anzahl IDs: ${applicantIds.length}`);
    const fetchedItems = [];
    let successfulFetches = 0;

    if (!config || !config.USER_COLLECTION_ID_MJ || !config.API_CALL_DELAY_MS) {
        console.error("fetchAllApplicantsForJob: Konfiguration (USER_COLLECTION_ID_MJ, API_CALL_DELAY_MS) nicht gefunden!");
        return applicantIds.map(id => ({ id, error: true, status: 'config_error', message: 'API Konfiguration fehlt.' }));
    }
    const delayFn = typeof delay === 'function' ? delay : (ms) => new Promise(resolve => setTimeout(resolve, ms));

    if (applicantIds.length > 0) {
      const promises = applicantIds.map((applicantId, index) =>
        delayFn(index * (config.API_CALL_DELAY_MS / 2))
          .then(() => fetchWebflowItem(config.USER_COLLECTION_ID_MJ, applicantId))
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

  window.WEBFLOW_API.services.buildWorkerUrl_MJ = buildWorkerUrl_MJ;
  window.WEBFLOW_API.services.fetchWebflowItem = fetchWebflowItem;
  window.WEBFLOW_API.services.fetchAllApplicantsForJob = fetchAllApplicantsForJob;
  window.WEBFLOW_API.services.updateWebflowItem_MJ = updateWebflowItem_MJ;
  window.WEBFLOW_API.services.updateJobItem_MJ = updateJobItem_MJ;
  window.WEBFLOW_API.services.updateUserItem_MJ = updateUserItem_MJ; // Neue Funktion exponieren

  console.log("WebflowService (webflowService.js) wurde aktualisiert mit updateUserItem_MJ.");
})();
