// src/memberService.js
(function() {
    'use strict';

    window.WEBFLOW_API = window.WEBFLOW_API || {};

    // Abhängigkeiten
    const State = window.WEBFLOW_API.state;

    const memberService = {
        /**
         * Ruft die Webflow Member ID des aktuellen Benutzers über Memberstack ab.
         * @returns {Promise<string | null>} Die Webflow Member ID oder null, wenn nicht gefunden.
         */
        getCurrentWebflowMemberId: async function() {
            try {
                if (typeof window.$memberstackDom === 'undefined') {
                    await new Promise(resolve => {
                        const interval = setInterval(() => {
                            if (typeof window.$memberstackDom !== 'undefined') {
                                clearInterval(interval);
                                resolve();
                            }
                        }, 100);
                    });
                }
                const member = await window.$memberstackDom.getCurrentMember();
                const webflowMemberId = member?.data?.customFields?.['webflow-member-id'];

                if (State?.setCurrentWebflowMemberId) { // Prüfen ob State und Methode existieren
                    State.setCurrentWebflowMemberId(webflowMemberId || null);
                } else {
                    console.warn("State.setCurrentWebflowMemberId ist nicht verfügbar.");
                    // Fallback: Direkte Zuweisung, wenn die state.js-Struktur anders ist oder nicht geladen wurde
                    window.WEBFLOW_API.state.currentWebflowMemberId_MJ = webflowMemberId || null;
                }


                if (webflowMemberId) {
                    return webflowMemberId;
                } else {
                    console.error("❌ Kein 'webflow-member-id' im Memberstack-Profil gefunden.");
                    return null;
                }
            } catch (error) {
                console.error("❌ Fehler beim Abrufen der Memberstack-Daten:", error);
                 if (State?.setCurrentWebflowMemberId) {
                    State.setCurrentWebflowMemberId(null);
                } else {
                    window.WEBFLOW_API.state.currentWebflowMemberId_MJ = null;
                }
                return null;
            }
        }
    };

    window.WEBFLOW_API.memberService = memberService;

})();
