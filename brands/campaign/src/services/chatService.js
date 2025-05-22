// src/services/chatService.js (oder dein gewählter Pfad/Name)
(function() {
    'use strict';

    const memberstackDOM = window.$memberstackDom;

    if (!memberstackDOM) {
        console.log('Memberstack not initialized for chat service');
        return;
    }

    const memberstackToken = memberstackDOM.getMemberCookie();

    if (!memberstackToken) {
        console.log('User not signed in (chat service)');
    } else {
        console.log('User signed in, chat service can operate.');
    }

    async function createChat(targetUserId) {
        if (!memberstackToken) {
            console.log('Cannot create chat: User not signed in (no Memberstack token).');
            return;
        }

        console.log(`Attempting to create chat with target User ID: ${targetUserId}`);

        try {
            const response = await fetch('https://createchathttp-sjrrovvuma-ew.a.run.app', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apikey: memberstackToken, iduser: targetUserId })
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
            window.location.href = 'https://www.creatorjobs.com/dashboard/nachrichten';
        } catch (error) {
            console.error('Error during createChat fetch:', error);
        }
    }

    document.body.addEventListener('click', function(event) {
        const chatButton = event.target.closest('[data-creatorjobs-action="create-chat"]');
        if (chatButton) {
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

    console.log('Chat service with event delegation initialized.');

})();
