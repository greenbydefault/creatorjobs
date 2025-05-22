(function() {
    'use strict';

    // Stelle sicher, dass $memberstackDom zum Zeitpunkt der Ausführung dieses Skripts verfügbar ist.
    // Wenn dieses Skript sehr früh geladen wird (z.B. im <head> ohne defer), könnte $memberstackDom noch undefined sein.
    // Es ist oft besser, auf window.onload oder DOMContentLoaded zu warten oder Memberstack-spezifische Events zu nutzen,
    // bevor man auf $memberstackDom zugreift, falls es Timing-Probleme gibt.
    // Für den Moment gehen wir davon aus, dass es beim Ausführen des Event-Listeners (später) verfügbar ist.

    function initializeChatService() {
        const memberstackDOM = window.$memberstackDom;

        if (!memberstackDOM) {
            console.log('Memberstack not initialized for chat service. Chat functionality might not work.');
            // Hier KEIN return auf Top-Level der IIFE, wenn die IIFE selbst keinen Wert zurückgeben soll.
            // Der Event-Listener unten wird trotzdem angehängt.
            // Die Logik innerhalb von createChat wird dann den memberstackToken prüfen.
            // return; // Dieses return war potenziell das Problem, wenn die IIFE-Struktur fehlerhaft war.
        }

        // Den Token erst holen, wenn er wirklich gebraucht wird (innerhalb von createChat)
        // oder wenn sicher ist, dass Memberstack initialisiert ist.

        async function createChat(targetUserId) {
            const currentMemberstackToken = memberstackDOM ? memberstackDOM.getMemberCookie() : null;

            if (!currentMemberstackToken) {
                console.log('Cannot create chat: User not signed in (no Memberstack token).');
                // Optional: Benutzer informieren, dass er sich anmelden muss
                // alert('Bitte melden Sie sich an, um einen Chat zu starten.');
                return;
            }

            console.log(`Attempting to create chat with target User ID: ${targetUserId}`);

            try {
                const response = await fetch('https://createchathttp-sjrrovvuma-ew.a.run.app', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ apikey: currentMemberstackToken, iduser: targetUserId })
                });

                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (e) {
                        errorData = await response.text();
                    }
                    console.error('Failed to create chat. Server responded with:', response.status, errorData);
                    return;
                }
                window.open('https://www.creatorjobs.com/dashboard/nachrichten', '_blank');
            } catch (error) {
                console.error('Error during createChat fetch:', error);
            }
        }

        document.body.addEventListener('click', function(event) {
            const chatButton = event.target.closest('[data-creatorjobs-action="create-chat"]');
            if (chatButton) {
                event.preventDefault(); 
                const targetUserId = chatButton.getAttribute('data-creatorjobs-target');

                if (!window.$memberstackDom) { // Erneute Prüfung, falls Memberstack spät lädt
                    console.log('Memberstack not available when chat button was clicked.');
                    // Optional: Benutzer informieren
                    return;
                }

                if (targetUserId) {
                    console.log(`Chat button clicked for target: ${targetUserId}`);
                    createChat(targetUserId);
                } else {
                    console.warn('Chat button clicked, but no target User ID found (data-creatorjobs-target missing or empty).', chatButton);
                }
            }
        });

        console.log('Chat service with event delegation initialized.');
    }

    // Warte, bis Memberstack ($memberstackDom) definitiv verfügbar ist, bevor der Service initialisiert wird.
    // Dies ist eine robustere Methode, als sich nur auf die Skript-Lade-Reihenfolge zu verlassen.
    if (window.$memberstackDom) {
        initializeChatService();
    } else {
        // Fallback: Versuche es nach einem kurzen Delay oder warte auf ein Memberstack-Event
        // Memberstack bietet oft eigene Events wie `[ms-load]` oder Callbacks.
        // Hier ein einfacher Timeout als Beispiel, aber Events sind besser.
        console.log('Memberstack not immediately available for chat service, will try after DOMContentLoaded or delay.');
        if (document.readyState === "loading") {
            document.addEventListener('DOMContentLoaded', function() {
                if (window.$memberstackDom) {
                    initializeChatService();
                } else {
                    console.error("Memberstack still not available after DOMContentLoaded for chat service.");
                }
            });
        } else {
            // DOM ist bereits geladen, aber $memberstackDom war nicht da.
            // Dies könnte bedeuten, dass Memberstack asynchron lädt und noch nicht fertig ist.
            // Ein spezifisches Memberstack "ready" Event wäre hier ideal.
            // Als Notlösung:
            setTimeout(function() {
                 if (window.$memberstackDom) {
                    initializeChatService();
                } else {
                    console.error("Memberstack still not available after delay for chat service.");
                }
            }, 1000); // Warte 1 Sekunde
        }
    }

})();
