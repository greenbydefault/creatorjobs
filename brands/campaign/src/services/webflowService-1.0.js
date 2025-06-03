// brands/campaign/src/services/webflowService.js
(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.services = window.WEBFLOW_API.services || {};

  // Abhängigkeiten aus dem globalen Namespace holen
  const config = window.WEBFLOW_API.config; // Sollte apiConfig.js sein
  const { delay } = (window.WEBFLOW_API.utils || {}); // Stellt sicher, dass helpers.js vorher geladen wurde

  /**
   * Baut die vollständige Worker-URL für einen gegebenen API-Endpunkt.
   * @param {string} apiUrl - Die Webflow API URL.
   * @returns {string} Die vollständige Worker URL.
   */
  function buildWorkerUrl_MJ(apiUrl) {
    // Stelle sicher, dass config und WORKER_BASE_URL_MJ definiert sind
    if (!config || !config.WORKER_BASE_URL_MJ) {
      console.error("buildWorkerUrl_MJ: Konfiguration (WORKER_BASE_URL_MJ) nicht gefunden!");
      return apiUrl; // Fallback oder Fehlerbehandlung
    }
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

  /**
   * Aktualisiert spezifische Felder eines Items in einer Webflow Collection.
   * @param {string} collectionId - Die ID der Webflow Collection.
   * @param {string} itemId - Die ID des zu aktualisierenden Items.
   * @param {object} fieldDataToUpdate - Ein Objekt, das die zu aktualisierenden Felder enthält (z.B. {'job-favoriten': ['id1', 'id2']}).
   * @returns {Promise<boolean>} True bei Erfolg, false bei einem Fehler.
   */
  async function updateWebflowItem_MJ(collectionId, itemId, fieldDataToUpdate) {
    if (!collectionId || !itemId || !fieldDataToUpdate) {
      console.error('updateWebflowItem_MJ: CollectionID, ItemID oder fieldDataToUpdate fehlt.');
      return false;
    }
    if (!config || !config.API_BASE_URL_MJ) {
      console.error("updateWebflowItem_MJ: Konfiguration (API_BASE_URL_MJ) nicht gefunden!");
      return false;
    }

    // Wichtig: Das Feld 'job-favoriten' ist ein Multi-Referenz-Feld.
    // Webflow erwartet hier ein Array von Item-IDs (Strings).
    // Stelle sicher, dass die Daten im richtigen Format sind.
    // Beispiel: fieldDataToUpdate = { 'job-favoriten': ['applicantId1', 'applicantId2'] }

    const apiUrl = `${config.API_BASE_URL_MJ}/${collectionId}/items/${itemId}/live`; // /live für sofortige Veröffentlichung
    const workerUrl = buildWorkerUrl_MJ(apiUrl);

    const payload = {
      fieldData: fieldDataToUpdate
    };

    console.log(`webflowService.updateWebflowItem_MJ: Sende PATCH an ${apiUrl} für Item ${itemId} mit Payload:`, JSON.stringify(payload));

    try {
      const response = await fetch(workerUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // Autorisierungsheader, falls vom Worker benötigt oder direkt an Webflow gesendet wird
          // 'Authorization': `Bearer ${config.WEBFLOW_API_TOKEN}`, // Beispiel
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API-Fehler beim Aktualisieren von Item ${itemId} in Collection ${collectionId}: ${response.status} - ${errorText}`);
        // Versuche, die JSON-Antwort zu parsen, falls es eine gibt
        try {
            const errorJson = JSON.parse(errorText);
            console.error('Fehlerdetails (JSON):', errorJson);
             if (errorJson.problems) {
                errorJson.problems.forEach(problem => console.error(`Webflow Problem: ${problem}`));
            }
        } catch (e) {
            // Nichts tun, wenn es kein JSON ist
        }
        return false;
      }
      console.log(`Item ${itemId} in Collection ${collectionId} erfolgreich aktualisiert.`);
      return true;
    } catch (error) {
      console.error(`Netzwerkfehler oder anderer Fehler beim Aktualisieren des Items (${collectionId}/${itemId}): ${error.message}`);
      return false;
    }
  }

  /**
   * Spezifische Funktion zum Aktualisieren eines Job-Items.
   * @param {string} jobId - Die ID des Jobs.
   * @param {object} updatedFieldData - Die zu aktualisierenden Felddaten.
   * @returns {Promise<boolean>} True bei Erfolg, false bei einem Fehler.
   */
  async function updateJobItem_MJ(jobId, updatedFieldData) {
    if (!config || !config.JOB_COLLECTION_ID_MJ) {
      console.error("updateJobItem_MJ: Konfiguration (JOB_COLLECTION_ID_MJ) nicht gefunden!");
      return false;
    }
    return await updateWebflowItem_MJ(config.JOB_COLLECTION_ID_MJ, jobId, updatedFieldData);
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

    if (!config || !config.USER_COLLECTION_ID_MJ || !config.API_CALL_DELAY_MS) {
        console.error("fetchAllApplicantsForJob: Konfiguration (USER_COLLECTION_ID_MJ, API_CALL_DELAY_MS) nicht gefunden!");
        return applicantIds.map(id => ({ id, error: true, status: 'config_error', message: 'API Konfiguration fehlt.' }));
    }
    const delayFn = typeof delay === 'function' ? delay : (ms) => new Promise(resolve => setTimeout(resolve, ms));


    if (applicantIds.length > 0) {
      const promises = applicantIds.map((applicantId, index) =>
        delayFn(index * (config.API_CALL_DELAY_MS / 2)) // Leichte Staffelung der Aufrufe
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

  // Exponieren der Service-Funktionen
  window.WEBFLOW_API.services.buildWorkerUrl_MJ = buildWorkerUrl_MJ;
  window.WEBFLOW_API.services.fetchWebflowItem = fetchWebflowItem;
  window.WEBFLOW_API.services.fetchAllApplicantsForJob = fetchAllApplicantsForJob;
  window.WEBFLOW_API.services.updateWebflowItem_MJ = updateWebflowItem_MJ; // Generische Funktion
  window.WEBFLOW_API.services.updateJobItem_MJ = updateJobItem_MJ; // Spezifische Funktion für Jobs

  console.log("WebflowService (webflowService.js) wurde aktualisiert mit updateWebflowItem_MJ und updateJobItem_MJ.");
})();
