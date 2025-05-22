// src/app.js
(function() {
    'use strict';

    window.WEBFLOW_API = window.WEBFLOW_API || {};

    // Abhängigkeiten
    const CONFIG = window.WEBFLOW_API.config;
    const State = window.WEBFLOW_API.state;
    const apiService = window.WEBFLOW_API.apiService;
    const memberService = window.WEBFLOW_API.memberService;
    const uiManager = window.WEBFLOW_API.uiManager;
    const UTILS = window.WEBFLOW_API.utils; // Für delay

    const app = {
        displayMyJobsAndApplicants: async function() {
            const container = document.getElementById("jobs-list");
            if (!container) {
                console.error("❌ Container 'jobs-list' für displayMyJobsAndApplicants nicht gefunden.");
                return;
            }
            // Stelle sicher, dass uiManager und seine Methoden geladen sind
            if (uiManager?.renderMyJobsSkeletonLoader && CONFIG?.SKELETON_JOBS_COUNT_MJ) {
                 uiManager.renderMyJobsSkeletonLoader(container, CONFIG.SKELETON_JOBS_COUNT_MJ);
            } else {
                console.warn("uiManager.renderMyJobsSkeletonLoader oder Konfiguration nicht verfügbar.");
                container.innerHTML = "<p>Lade...</p>";
            }


            try {
                let webflowMemberId = null;
                if (memberService?.getCurrentWebflowMemberId) {
                    webflowMemberId = await memberService.getCurrentWebflowMemberId();
                } else {
                     console.error("❌ memberService.getCurrentWebflowMemberId ist nicht verfügbar.");
                     container.innerHTML = "<p class='error-message job-entry visible'>Fehler beim Laden der Benutzer-ID-Funktion.</p>";
                     return;
                }
                // State.currentWebflowMemberId_MJ wird innerhalb von getCurrentWebflowMemberId gesetzt

                if (!State?.currentWebflowMemberId_MJ) {
                    console.error("❌ Kein 'webflow-member-id' nach Abruf durch memberService gefunden.");
                    container.innerHTML = "<p class='error-message job-entry visible'>Benutzerdaten konnten nicht geladen werden (Keine Member ID).</p>";
                    return;
                }
                console.log(`✅ MyJobs: Webflow Member ID: ${State.currentWebflowMemberId_MJ}`);

                if (UTILS?.delay && CONFIG?.API_CALL_DELAY_MS) await UTILS.delay(CONFIG.API_CALL_DELAY_MS);

                let currentUserItem = null;
                if (apiService?.fetchWebflowItem && CONFIG?.USER_COLLECTION_ID_MJ) {
                    currentUserItem = await apiService.fetchWebflowItem(CONFIG.USER_COLLECTION_ID_MJ, State.currentWebflowMemberId_MJ);
                } else {
                    console.error("❌ apiService.fetchWebflowItem oder USER_COLLECTION_ID_MJ nicht verfügbar.");
                    container.innerHTML = "<p class='error-message job-entry visible'>Fehler beim Abrufen der Benutzerdaten-Funktion.</p>";
                    return;
                }


                if (!currentUserItem || (currentUserItem.error && currentUserItem.status !== 429 && currentUserItem.status !== 404)) {
                    console.error("❌ Benutzerdaten des aktuellen Users nicht gefunden oder kritischer Fehler beim Abruf.", currentUserItem);
                    container.innerHTML = `<p class='error-message job-entry visible'>Benutzerdaten des aktuellen Users konnten nicht geladen werden (API-Fehler: ${currentUserItem?.message || 'Unbekannt'}).</p>`;
                    return;
                }
                if (currentUserItem.error && currentUserItem.status === 429) {
                    console.warn("Rate limit beim Abrufen des aktuellen Benutzers. Breche ab.");
                    container.innerHTML = `<p class='error-message job-entry visible'>Zu viele Anfragen beim Laden der initialen Benutzerdaten. Bitte versuche es später erneut.</p>`;
                    return;
                }
                if (currentUserItem.error && currentUserItem.status === 404) {
                    console.warn(`Benutzer mit Webflow Member ID ${State.currentWebflowMemberId_MJ} nicht in der User Collection gefunden.`);
                    if (uiManager?.renderMyJobsAndApplicants) uiManager.renderMyJobsAndApplicants([]);
                    return;
                }
                if (!currentUserItem.fieldData) { // Keine fieldData, aber auch kein 404 Fehler
                    console.error("❌ Benutzerdaten des aktuellen Users (fieldData) nicht gefunden, obwohl User existiert.", currentUserItem);
                    if (uiManager?.renderMyJobsAndApplicants) uiManager.renderMyJobsAndApplicants([]);
                    return;
                }

                const postedJobIds = currentUserItem.fieldData["posted-jobs"] || [];
                console.log(`User hat ${postedJobIds.length} Jobs im Feld 'posted-jobs'.`);

                if (postedJobIds.length === 0) {
                    if (uiManager?.renderMyJobsAndApplicants) uiManager.renderMyJobsAndApplicants([]);
                    return;
                }

                let myJobItems = [];
                if (apiService?.fetchWebflowItem && CONFIG?.JOB_COLLECTION_ID_MJ) {
                    for (const jobId of postedJobIds) {
                        console.log(`Fetching job item: ${jobId}`);
                        if (UTILS?.delay && CONFIG?.API_CALL_DELAY_MS) await UTILS.delay(CONFIG.API_CALL_DELAY_MS);
                        const jobItem = await apiService.fetchWebflowItem(CONFIG.JOB_COLLECTION_ID_MJ, jobId);
                        if (jobItem) {
                            myJobItems.push(jobItem);
                        } else {
                            console.warn(`Job ${jobId} führte zu einer unerwarteten null-Antwort von fetchWebflowItem.`);
                            myJobItems.push({ id: jobId, error: true, status: 'fetch_null_error', message: `Unerwartete null-Antwort für Job ${jobId}.` });
                        }
                    }
                } else {
                     console.error("❌ apiService.fetchWebflowItem oder JOB_COLLECTION_ID_MJ nicht verfügbar.");
                     container.innerHTML = "<p class='error-message job-entry visible'>Fehler beim Abrufen der Jobdaten-Funktion.</p>";
                     return;
                }


                console.log("--- Überprüfung der geladenen Job-Daten (myJobItems) ---");
                myJobItems.forEach(job => {
                    if (job.error) {
                        console.log(`Job ID: ${job.id}, Fehler: ${job.message}, Status: ${job.status}`);
                    } else if (job.fieldData) {
                        console.log(`Job ID: ${job.id}, Name: ${job.fieldData.name}, Bewerber IDs im Job-Objekt: ${JSON.stringify(job.fieldData["bewerber"] || [])}`);
                    } else {
                        console.log(`Job ID: ${job.id}, Unerwarteter Zustand (weder fieldData noch error-Property). Item:`, job);
                    }
                });
                console.log("-----------------------------------------------------");

                if (myJobItems.length === 0 && postedJobIds.length > 0) {
                    container.innerHTML = `<p class='info-message job-entry visible'>Keine Jobdaten konnten geladen oder verarbeitet werden.</p>`;
                    return;
                }

                if (State?.setAllMyJobsData) State.setAllMyJobsData(myJobItems);
                else window.WEBFLOW_API.state.allMyJobsData_MJ = myJobItems; // Direkter Fallback

                if (uiManager?.renderMyJobsAndApplicants) uiManager.renderMyJobsAndApplicants(myJobItems);
                else console.error("uiManager.renderMyJobsAndApplicants ist nicht verfügbar.");

            } catch (error) {
                console.error("❌ Schwerwiegender Fehler in displayMyJobsAndApplicants:", error);
                if (container) {
                    container.innerHTML = `<p class='error-message job-entry visible'>Ein allgemeiner Fehler ist aufgetreten: ${error.message}. Bitte versuche es später erneut.</p>`;
                }
            }
        },

        initializePageSizeSelector: function() {
            // Diese Funktion wird von uiManager bereitgestellt und sollte dort aufgerufen/initialisiert werden,
            // da sie den State und UI-Neuladungen beeinflusst.
            // Hier rufen wir die uiManager-Version auf, falls sie existiert.
            if (uiManager?.initializePageSizeSelector) {
                uiManager.initializePageSizeSelector();
            } else {
                console.warn("uiManager.initializePageSizeSelector ist nicht verfügbar.");
                // Fallback, falls die Logik direkt hier bleiben soll (nicht empfohlen für saubere Trennung)
                // const pageSizeSelector = document.getElementById('job-applicants-page-size-selector');
                // if (pageSizeSelector && State) { ... Logik von initializePageSizeSelector hier ... }
            }
        },

        initializeApp: function() {
            // Stellt sicher, dass die UI-Manager-Funktionen verfügbar sind
            if (window.WEBFLOW_API.uiManager) {
                 this.initializePageSizeSelector(); // Ruft die uiManager-Version auf
                 this.displayMyJobsAndApplicants();
            } else {
                console.error("WEBFLOW_API.uiManager ist nicht initialisiert. App kann nicht starten.");
                const container = document.getElementById("jobs-list");
                if (container) {
                    container.innerHTML = "<p class='error-message job-entry visible'>Fehler beim Initialisieren der Anwendungskomponenten.</p>";
                }
            }
        }
    };

    window.WEBFLOW_API.app = app;

    // DOMContentLoaded Listener, um die App zu starten
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.WEBFLOW_API.app.initializeApp());
    } else {
        // DOM ist bereits geladen
        window.WEBFLOW_API.app.initializeApp();
    }

})();
