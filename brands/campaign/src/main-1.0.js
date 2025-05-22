(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};

  // Abhängigkeiten (werden zur Laufzeit aufgelöst)
  // const { initializeMyJobsDisplay } = window.WEBFLOW_API.appLogic;
  // const cache = window.WEBFLOW_API.cache;
  // const { sortApplicantsGlobally } = window.WEBFLOW_API.core; (für Page Size Change)
  // const { loadAndDisplayApplicantsForJob } = window.WEBFLOW_API.appLogic; (für Page Size Change)

  /**
   * Initialisiert den Seitengrößen-Selektor für die Bewerberliste.
   */
  function initializePageSizeSelector() {
    const cache = window.WEBFLOW_API.cache; // Zugriff auf den Cache sicherstellen
    if (!cache) {
        console.error("Cache Modul nicht geladen, initializePageSizeSelector kann nicht ausgeführt werden.");
        return;
    }

    const pageSizeSelector = document.getElementById('job-applicants-page-size-selector');
    if (pageSizeSelector) {
      pageSizeSelector.value = cache.currentApplicantPageSize; // Standardwert setzen

      pageSizeSelector.addEventListener('change', async (event) => {
        const newSize = parseInt(event.target.value, 10);
        if (newSize === 15 || newSize === 25) { // Nur erlaubte Werte
          const oldSize = cache.currentApplicantPageSize;
          cache.currentApplicantPageSize = newSize;
          console.log(`DEBUG: Seitengröße geändert von ${oldSize} auf ${cache.currentApplicantPageSize}`);

          // Finde den aktuell geöffneten Bewerbercontainer (falls vorhanden)
          const openApplicantContainer = document.querySelector('.applicants-list-container[style*="display: block"]');
          if (openApplicantContainer) {
            const jobId = openApplicantContainer.dataset.jobId;
            const jobCacheEntry = cache.jobDataCache[jobId];
            const jobWrapper = openApplicantContainer.closest('.my-job-item');
            const paginationWrapper = jobWrapper ? jobWrapper.querySelector(".db-table-pagination") : null;
            const toggleDivElement = jobWrapper ? jobWrapper.querySelector(".db-table-applicants") : null;

            if (jobCacheEntry && jobCacheEntry.allItems && paginationWrapper && toggleDivElement && jobCacheEntry.jobDetails) {
              console.log(`DEBUG: Lade Job ${jobId} mit neuer Seitengröße ${cache.currentApplicantPageSize} neu (Seite 1).`);
              
              if (toggleDivElement) toggleDivElement.style.pointerEvents = 'none'; // Interaktion verhindern
              if (paginationWrapper) {
                  paginationWrapper.querySelectorAll('.db-pagination-count:not(.ellipsis)').forEach(el => el.classList.add("disabled-loading"));
              }
              
              let itemsToDisplay = jobCacheEntry.allItems;
              if (jobCacheEntry.activeFilters.follower && jobCacheEntry.activeFilters.follower.length > 0) {
                  itemsToDisplay = itemsToDisplay.filter(item => {
                      if (item.error || !item.fieldData) return false;
                      const applicantFollowerId = item.fieldData["creator-follower"];
                      return jobCacheEntry.activeFilters.follower.includes(applicantFollowerId);
                  });
              }
              
              if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.sortApplicantsGlobally &&
                  window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob) {
                  
                  const { sortApplicantsGlobally } = window.WEBFLOW_API.core;
                  const { loadAndDisplayApplicantsForJob } = window.WEBFLOW_API.appLogic;
                  const MAPPINGS = window.WEBFLOW_API.MAPPINGS;

                  jobCacheEntry.sortedAndFilteredItems = sortApplicantsGlobally(itemsToDisplay, jobCacheEntry.jobDetails, MAPPINGS);
                  
                  loadAndDisplayApplicantsForJob(jobId, openApplicantContainer, paginationWrapper, 1)
                    .then(() => { // Ersetzt .finally() für Erfolg und Fehler
                        if (toggleDivElement) toggleDivElement.style.pointerEvents = 'auto';
                    })
                    .catch((error) => { // Stellt sicher, dass Fehler nicht verschluckt werden und Aufräumarbeiten stattfinden
                        if (toggleDivElement) toggleDivElement.style.pointerEvents = 'auto';
                        console.error("Fehler beim Neuladen der Bewerber nach Seitengrößenänderung:", error);
                        // Fehler weiterwerfen, falls er an anderer Stelle behandelt werden soll
                        // throw error; 
                    });
              } else {
                  console.error("Benötigte Funktionen für Seitengrößenänderung nicht gefunden.");
                  if (toggleDivElement) toggleDivElement.style.pointerEvents = 'auto';
              }
            }
          }
        }
      });
    } else {
      console.warn("DEBUG: Element für Seitengrößenauswahl ('job-applicants-page-size-selector') nicht gefunden. Nutze Standard: " + (cache.currentApplicantPageSize || 15));
    }
  }

  /**
   * Initialisierungsfunktion, die nach dem Laden des DOM aufgerufen wird.
   */
  function initializeApp() {
    if (window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.initializeMyJobsDisplay) {
        initializePageSizeSelector();
        window.WEBFLOW_API.appLogic.initializeMyJobsDisplay();
    } else {
        console.error("AppLogic ist noch nicht bereit. Initialisierung verzögert oder fehlgeschlagen.");
        setTimeout(() => {
            if (window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.initializeMyJobsDisplay) {
                console.log("AppLogic jetzt bereit, starte Initialisierung (verzögert).");
                initializePageSizeSelector();
                window.WEBFLOW_API.appLogic.initializeMyJobsDisplay();
            } else {
                console.error("AppLogic auch nach Verzögerung nicht bereit. Gib auf.");
                const container = document.getElementById("jobs-list");
                if (container) container.innerHTML = "<p class='error-message job-entry visible'>Fehler beim Initialisieren der Anwendung. Wichtige Komponenten fehlen.</p>";
            }
        }, 500);
    }
  }

  window.addEventListener("DOMContentLoaded", initializeApp);
  window.WEBFLOW_API.initializeApp = initializeApp;

})();
