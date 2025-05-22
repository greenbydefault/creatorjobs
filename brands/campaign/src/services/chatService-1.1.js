// (function() {
    'use strict';

    const memberstackDOM = window.$memberstackDom;

    if (!memberstackDOM) {
        console.log('Memberstack not initialized');
        return; // Frühzeitiger Abbruch, wenn Memberstack nicht da ist
    }

    const memberstackToken = memberstackDOM.getMemberCookie();

    if (!memberstackToken) {
        console.log('User not signed in');
        // Hier keine weitere Aktion nötig, da der Button-Listener ohnehin prüft
    } else {
        console.log('User signed in with Memberstack token.'); // Token nicht loggen
    }

    async function createChat(targetUserId) {
        if (!memberstackToken) {
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
                    // Ggf. weitere Header, falls von deiner API benötigt (z.B. Authorization)
                },
                body: JSON.stringify({ apikey: memberstackToken, iduser: targetUserId })
            });

            if (!response.ok) {
                // Versuche, die Fehlerantwort vom Server zu lesen
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = await response.text();
                }
                console.error('Failed to create chat. Server responded with:', response.status, errorData);
                // Optional: Benutzer über den Fehler informieren
                // alert(`Chat konnte nicht erstellt werden. Fehler: ${response.status}`);
                return;
            }

            // Annahme: Die API gibt bei Erfolg relevante Daten zurück oder zumindest einen 2xx Status
            // const responseData = await response.json(); // Falls die API JSON zurückgibt
            // console.log('Chat creation successful:', responseData);

            // Chat-Fenster in einem neuen Tab öffnen
            window.open('https://www.creatorjobs.com/dashboard/nachrichten', '_blank');

        } catch (error) {
            console.error('Error during createChat fetch:', error);
            // Optional: Benutzer über den Fehler informieren
            // alert('Ein Netzwerkfehler ist aufgetreten. Bitte versuchen Sie es später erneut.');
        }
    }

    // Event Delegation: Listener am document.body (oder einem näheren, statischen Elternelement)
    document.body.addEventListener('click', function(event) {
        // event.target ist das tatsächlich geklickte Element
        // .closest() sucht das nächste Elternelement (oder das Element selbst), das dem Selector entspricht
        const chatButton = event.target.closest('[data-creatorjobs-action="create-chat"]');

        if (chatButton) {
            // Verhindere Standardaktionen, falls der Button z.B. ein Link wäre
            event.preventDefault(); 
            
            const targetUserId = chatButton.getAttribute('data-creatorjobs-target');

            if (targetUserId) {
                console.log(`Chat button clicked for target: ${targetUserId}`);
                createChat(targetUserId);
            } else {
                console.warn('Chat button clicked, but no target User ID found (data-creatorjobs-target missing or empty).', chatButton);
            }
        }
    });

    console.log('Chat script with event delegation initialized.');

})();
