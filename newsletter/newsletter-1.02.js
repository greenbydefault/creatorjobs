// --- Konfiguration ---
const WORKER_URL = "https://newsletter.oliver-258.workers.dev/"; 

// --- Elemente aus dem DOM holen ---
// Du kannst die ID des Buttons in Webflow ändern, z.B. auf 'send-test-button'
const sendButton = document.getElementById('get-items'); 
const statusElement = document.getElementById('status');

// --- Event Listener für den Button ---
if (sendButton) {
    sendButton.addEventListener('click', async () => {
        if (statusElement) statusElement.textContent = 'Löse Worker aus, um Test-Newsletter zu senden...';
        sendButton.disabled = true;

        try {
            // Rufe den Worker mit der POST-Methode auf, um die Aktion zu starten.
            // Es werden keine Daten mehr im Body mitgeschickt, der Aufruf allein ist das Signal.
            const response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            // Die Antwort vom Worker als JSON verarbeiten.
            const result = await response.json();

            if (!response.ok) {
                // Zeigt die spezifische Fehlermeldung vom Worker an, falls etwas schiefgeht.
                throw new Error(result.message || 'Ein unbekannter Fehler ist aufgetreten.');
            }
            
            // Zeigt die Erfolgsmeldung vom Worker an (z.B. "Test-Kampagne erfolgreich gesendet!").
            if (statusElement) statusElement.textContent = result.message;
            console.log("Erfolgreiche Antwort vom Worker:", result);

        } catch (error) {
            console.error("Fehler beim Aufrufen des Workers:", error);
            if (statusElement) statusElement.textContent = `Fehler: ${error.message}`;
        } finally {
            sendButton.disabled = false;
        }
    });
} else {
    console.error("Fehler: Button mit der ID 'get-items' wurde auf der Seite nicht gefunden.");
}
