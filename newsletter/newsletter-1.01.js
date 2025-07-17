// --- Konfiguration ---
const WORKER_URL = "https://newsletter.oliver-258.workers.dev/"; 
const COLLECTION_ID = "6448faf9c5a8a17455c05525";

// --- Elemente aus dem DOM holen ---
// Stelle sicher, dass diese IDs mit den Elementen auf deiner Webflow-Seite übereinstimmen.
const getItemsButton = document.getElementById('get-items');
const statusElement = document.getElementById('status');

// --- Event Listener für den Button ---
// Prüfe, ob der Button existiert, bevor der Listener hinzugefügt wird.
if (getItemsButton) {
    getItemsButton.addEventListener('click', async () => {
        if (statusElement) statusElement.textContent = 'Lade Daten vom Worker...';
        getItemsButton.disabled = true;

        try {
            // Baue die URL zum Worker zusammen, inklusive der Collection-ID als Parameter
            const fetchUrl = `${WORKER_URL}?collectionId=${COLLECTION_ID}`;
            
            // Rufe den Worker auf
            const response = await fetch(fetchUrl);

            if (!response.ok) {
                throw new Error(`Fehler vom Worker: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (statusElement) statusElement.textContent = 'Daten erhalten, filtere nach Juli 2025...';

            // Filtere die Items und extrahiere die gewünschten Felder
            const julyItems = data.items
                .filter(item => {
                    // Erstelle ein Datumsobjekt aus dem `createdOn` String
                    const createdDate = new Date(item.createdOn);
                    // Prüfe, ob der Monat Juli ist (0-11) und das Jahr 2025 ist.
                    // Wir verwenden UTC-Methoden, da der Zeitstempel im 'Z'-Format (UTC) vorliegt.
                    return createdDate.getUTCMonth() === 6 && createdDate.getUTCFullYear() === 2025;
                })
                .map(item => {
                    // Erstelle ein neues, sauberes Objekt mit den benötigten Daten
                    return {
                        name: item.fieldData.name,
                        aufgaben: item.fieldData['deine-aufgaben']
                    };
                });

            // Gib das Ergebnis in der Konsole aus
            console.log(`Erfolgreich ${julyItems.length} Items aus Juli 2025 gefunden:`);
            console.log(julyItems);

            if (statusElement) statusElement.textContent = `Fertig! ${julyItems.length} Items in der Konsole ausgegeben.`;

        } catch (error) {
            console.error("Ein Fehler ist aufgetreten:", error);
            if (statusElement) statusElement.textContent = `Fehler: ${error.message}`;
        } finally {
            getItemsButton.disabled = false;
        }
    });
} else {
    console.error("Fehler: Button mit der ID 'get-items' wurde auf der Seite nicht gefunden.");
}
