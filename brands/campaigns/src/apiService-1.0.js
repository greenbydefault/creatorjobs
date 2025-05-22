// apiService.js
// Dieses Skript ist dafür verantwortlich, Anfragen an den Cloudflare Worker zu senden,
// der dann mit der Webflow API kommuniziert.

// Die Basis-URL deines Cloudflare Workers
const WORKER_BASE_URL = 'https://meine-kampagnen.oliver-258.workers.dev/'; // Passe dies ggf. an

/**
 * Ruft ein spezifisches Item aus einer Webflow Collection über den Cloudflare Worker ab.
 * @param {string} collectionId - Die ID der Webflow Collection. ACHTUNG: Hier lag das Problem!
 * @param {string} itemId - Die ID des Webflow Items.
 * @returns {Promise<object>} Die Item-Daten von Webflow.
 * @throws {Error} Wenn die collectionId oder itemId fehlt, oder wenn der Fetch-Aufruf fehlschlägt.
 */
async function fetchWebflowItem(collectionId, itemId) {
  // --- ANPASSUNG START ---
  // Stelle sicher, dass collectionId einen gültigen Wert hat.
  // Der String "undefined" kann auch ein Problem sein, wenn er fälschlicherweise übergeben wird.
  if (!collectionId || collectionId === "undefined") {
    const errorMessage = `ApiService Fehler: fetchWebflowItem wurde mit einer ungültigen collectionId aufgerufen: '${collectionId}'.`;
    console.error(errorMessage);
    // Wirf einen Fehler, der von der aufrufenden Funktion behandelt werden muss.
    throw new Error(errorMessage);
    // Alternativ könntest du hier null oder ein leeres Objekt zurückgeben,
    // aber ein Fehler ist oft klarer, um das Problem zu signalisieren.
    // return null; 
  }
  if (!itemId) {
    const errorMessage = "ApiService Fehler: fetchWebflowItem wurde ohne itemId aufgerufen.";
    console.error(errorMessage);
    throw new Error(errorMessage);
  }
  // --- ANPASSUNG ENDE ---

  console.log(`ApiService: Rufe Item '${itemId}' aus Collection '${collectionId}' ab.`);

  // Die Ziel-URL für die Webflow API (wird an den Worker als Parameter übergeben)
  const webflowApiTargetUrl = `https://api.webflow.com/v2/collections/${collectionId}/items/${itemId}/live`;
  
  // Die vollständige URL für den Aufruf des Workers
  const workerRequestUrl = `${WORKER_BASE_URL}?url=${encodeURIComponent(webflowApiTargetUrl)}`;

  try {
    // Dies war Zeile 37 in deinem ursprünglichen Fehler-Stacktrace
    const response = await fetch(workerRequestUrl, {
      method: 'GET',
      headers: {
        // Client-spezifische Header sind hier normalerweise nicht nötig,
        // da der Worker die Authentifizierung und andere notwendige Header für Webflow hinzufügt.
        // 'Accept': 'application/json' // Wird vom Worker oder Webflow standardmäßig erwartet
      }
    });

    if (!response.ok) {
      let errorBody = "Fehlerdetails nicht lesbar";
      try {
        // Versuche, den Fehlertext aus der Antwort des Workers zu bekommen
        errorBody = await response.text(); 
      } catch (e) {
        console.warn("ApiService: Konnte Fehler-Body nicht als Text lesen.", e);
      }
      const networkErrorMsg = `ApiService Fehler: Antwort vom Worker war nicht OK (${response.status} ${response.statusText}) für URL ${workerRequestUrl}. Antwort-Body: ${errorBody}`;
      console.error(networkErrorMsg);
      throw new Error(networkErrorMsg);
    }

    // Wenn die Antwort OK ist, parse das JSON
    return await response.json();

  } catch (error) {
    // Dies fängt Netzwerkfehler (z.B. Worker nicht erreichbar) oder Fehler beim response.json() parsen ab.
    console.error(`ApiService: Netzwerkfehler oder JSON-Parse-Fehler für URL ${workerRequestUrl}:`, error);
    // Den Fehler weiterleiten, damit die aufrufende Funktion ihn behandeln kann
    throw error; 
  }
}

// --- Beispielhafte aufrufende Funktion (ähnlich zu deinem displayMyJobsAndApplicants) ---
// Du musst diese Logik in deiner app.js oder wo auch immer displayMyJobsAndApplicants definiert ist, anpassen.

/**
 * Beispiel: Zeigt Item-Details an, nachdem sie von Webflow geladen wurden.
 * @param {string} currentCollectionId - Die Collection ID, die verwendet werden soll.
 * @param {string} currentItemId - Die Item ID, die geladen werden soll.
 */
async function displayItemDetailsExample(currentCollectionId, currentItemId) {
  // Simuliere ein HTML-Element für Fehlermeldungen
  const errorDisplayElement = document.getElementById('error-message-container') || { textContent: '' }; // Fallback

  try {
    // --- WICHTIGER DEBUGGING-SCHRITT ---
    // Überprüfe hier, welchen Wert currentCollectionId hat, BEVOR fetchWebflowItem aufgerufen wird.
    console.log(`displayItemDetailsExample: Aufruf mit Collection ID: '${currentCollectionId}', Item ID: '${currentItemId}'`);

    if (!currentCollectionId || currentCollectionId === "undefined") {
      const initErrorMsg = `FEHLER in displayItemDetailsExample: currentCollectionId ist '${currentCollectionId}', bevor fetchWebflowItem aufgerufen wird! Daten können nicht geladen werden.`;
      console.error(initErrorMsg);
      errorDisplayElement.textContent = initErrorMsg;
      return; // Breche ab, wenn die ID ungültig ist.
    }
    if (!currentItemId) {
        const initErrorMsg = `FEHLER in displayItemDetailsExample: currentItemId ist '${currentItemId}'. Item ID fehlt.`;
        console.error(initErrorMsg);
        errorDisplayElement.textContent = initErrorMsg;
        return;
    }

    // Rufe das Item ab
    const item = await fetchWebflowItem(currentCollectionId, currentItemId);

    console.log("displayItemDetailsExample: Empfangenes Item:", item);
    // Hier würdest du den Code einfügen, um das 'item' auf deiner Webseite darzustellen.
    // z.B. document.getElementById('item-name-display').textContent = item.name;
    //      document.getElementById('item-description-display').innerHTML = item.fieldData['rich-text-field']; // Beispiel
    errorDisplayElement.textContent = `Item "${item.fieldData?.name || currentItemId}" erfolgreich geladen!`; // Beispiel für Erfolgsmeldung

  } catch (error) {
    console.error("displayItemDetailsExample: Fehler beim Laden oder Anzeigen der Item-Details:", error.message);
    errorDisplayElement.textContent = `Fehler beim Laden der Daten: ${error.message}`;
  }
}
