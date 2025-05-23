(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};

  /**
   * Initialisiert den Seitengrößen-Selektor für die Bewerberliste.
   */
  function initializePageSizeSelector() {
    const cache = window.WEBFLOW_API.cache; 
    if (!cache) {
        console.error("Cache Modul nicht geladen, initializePageSizeSelector kann nicht ausgeführt werden.");
        return;
    }

    const pageSizeSelector = document.getElementById('job-applicants-page-size-selector');
    if (pageSizeSelector) {
      pageSizeSelector.value = cache.currentApplicantPageSize; 

      pageSizeSelector.addEventListener('change', async (event) => {
        const newSize = parseInt(event.target.value, 10);
        if (newSize === 15 || newSize === 25) { 
          const oldSize = cache.currentApplicantPageSize;
          cache.currentApplicantPageSize = newSize;
          console.log(`DEBUG: Seitengröße geändert von ${oldSize} auf ${cache.currentApplicantPageSize}`);

          const openApplicantContainer = document.querySelector('.applicants-list-container[style*="display: block"]');
          if (openApplicantContainer) {
            const jobId = openApplicantContainer.dataset.jobId;
            const jobCacheEntry = cache.jobDataCache[jobId];
            const jobWrapper = openApplicantContainer.closest('.my-job-item');
            const paginationWrapper = jobWrapper ? jobWrapper.querySelector(".db-table-pagination") : null;
            const toggleDivElement = jobWrapper ? jobWrapper.querySelector(".checkbox-toggle") : null; 

            if (jobCacheEntry && jobCacheEntry.allItems && paginationWrapper && toggleDivElement && jobCacheEntry.jobDetails) {
              console.log(`DEBUG: Lade Job ${jobId} mit neuer Seitengröße ${cache.currentApplicantPageSize} neu (Seite 1).`);
              
              if (toggleDivElement) toggleDivElement.disabled = true; 
              if (paginationWrapper) {
                  paginationWrapper.querySelectorAll('.db-pagination-count:not(.ellipsis)').forEach(el => el.classList.add("disabled-loading"));
              }
              
              let itemsToDisplay = jobCacheEntry.allItems;
              // Wende bestehende Bewerberfilter an, bevor sortiert wird
              if (jobCacheEntry.activeFilters) {
                  if (jobCacheEntry.activeFilters.follower && jobCacheEntry.activeFilters.follower.length > 0) {
                      itemsToDisplay = itemsToDisplay.filter(item => {
                          if (item.error || !item.fieldData) return false;
                          const applicantFollowerId = item.fieldData["creator-follower"];
                          return jobCacheEntry.activeFilters.follower.includes(applicantFollowerId);
                      });
                  }
                  if (jobCacheEntry.activeFilters.category && jobCacheEntry.activeFilters.category.length > 0) {
                     itemsToDisplay = itemsToDisplay.filter(item => {
                        if (item.error || !item.fieldData) return false;
                        const applicantCategory = item.fieldData["creator-main-categorie"];
                        return jobCacheEntry.activeFilters.category.includes(applicantCategory);
                     });
                  }
                  if (jobCacheEntry.activeFilters.creatorType && jobCacheEntry.activeFilters.creatorType.length > 0) {
                     itemsToDisplay = itemsToDisplay.filter(item => {
                        if (item.error || !item.fieldData) return false;
                        const applicantCreatorType = item.fieldData["creator-type"];
                        return jobCacheEntry.activeFilters.creatorType.includes(applicantCreatorType);
                     });
                  }
                  if (jobCacheEntry.activeFilters.relevantOnly === true) {
                      // Stelle sicher, dass die Funktion isApplicantRelevant existiert
                      if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.isApplicantRelevant) { 
                          itemsToDisplay = itemsToDisplay.filter(item => {
                              if (item.error || !item.fieldData) return false;
                              return window.WEBFLOW_API.core.isApplicantRelevant(item.fieldData);
                          });
                      } else {
                          console.warn("isApplicantRelevant function not found in core module for page size change filtering.");
                      }
                  }
              }
              
              if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.sortApplicantsGlobally &&
                  window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob) {
                  
                  const { sortApplicantsGlobally } = window.WEBFLOW_API.core;
                  const { loadAndDisplayApplicantsForJob } = window.WEBFLOW_API.appLogic;
                  const MAPPINGS = window.WEBFLOW_API.MAPPINGS; // MAPPINGS wird in sortApplicantsGlobally benötigt


                  jobCacheEntry.sortedAndFilteredItems = sortApplicantsGlobally(itemsToDisplay, jobCacheEntry.jobDetails, MAPPINGS);
                  
                  loadAndDisplayApplicantsForJob(jobId, openApplicantContainer, paginationWrapper, 1)
                    .then(() => { 
                        if (toggleDivElement) toggleDivElement.disabled = false;
                    })
                    .catch((error) => { 
                        if (toggleDivElement) toggleDivElement.disabled = false;
                        console.error("Fehler beim Neuladen der Bewerber nach Seitengrößenänderung:", error);
                    });
              } else {
                  console.error("Benötigte Funktionen für Seitengrößenänderung nicht gefunden.");
                  if (toggleDivElement) toggleDivElement.disabled = false;
              }
            } else {
                 if (toggleDivElement) toggleDivElement.disabled = false; // Sicherstellen, dass der Toggle nicht blockiert bleibt
                 console.warn("Einige Elemente für die Seitengrößenänderung fehlen.", jobCacheEntry, paginationWrapper, toggleDivElement);
            }
          }
        }
      });
    } else {
      console.warn("DEBUG: Element für Seitengrößenauswahl ('job-applicants-page-size-selector') nicht gefunden. Nutze Standard: " + (cache.currentApplicantPageSize || 15));
    }
  }

  /**
   * Initialisiert die Event-Listener für die Job-Status-Filter UND den Live-Suchfilter.
   */
  function initializeJobFilters() {
    const activeCheckbox = document.getElementById('job-status-active');
    const doneCheckbox = document.getElementById('job-status-done');
    const searchInput = document.getElementById('filter-search'); // Suchfeld

    function handleFilterChange() {
        if (window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.filterAndRenderJobs) {
            console.log("Job-Filter geändert, rufe filterAndRenderJobs auf.");
            window.WEBFLOW_API.appLogic.filterAndRenderJobs();
        } else {
            console.error("filterAndRenderJobs Funktion nicht im appLogic Modul gefunden.");
        }
    }

    if (activeCheckbox) {
        activeCheckbox.addEventListener('change', handleFilterChange);
    } else {
        console.warn("Checkbox 'job-status-active' nicht gefunden.");
    }

    if (doneCheckbox) {
        doneCheckbox.addEventListener('change', handleFilterChange);
    } else {
        console.warn("Checkbox 'job-status-done' nicht gefunden.");
    }

    if (searchInput) {
        searchInput.addEventListener('input', handleFilterChange); 
    } else {
        console.warn("Suchfeld 'filter-search' nicht gefunden.");
    }
  }

  /**
   * Initialisierungsfunktion, die nach dem Laden des DOM aufgerufen wird.
   */
  function initializeApp() {
    // Sicherstellen, dass alle benötigten Module geladen sind, bevor Initialisierungsfunktionen aufgerufen werden
    if (window.WEBFLOW_API &&
        window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.initializeMyJobsDisplay &&
        window.WEBFLOW_API.cache && // Prüfe auf Cache für initializePageSizeSelector
        window.WEBFLOW_API.appLogic.filterAndRenderJobs) { // Prüfe auf filterAndRenderJobs für initializeJobFilters
        
        initializePageSizeSelector();
        initializeJobFilters(); 
        window.WEBFLOW_API.appLogic.initializeMyJobsDisplay(); 
    } else {
        console.error("AppLogic oder andere Kernmodule sind noch nicht bereit. Initialisierung verzögert oder fehlgeschlagen.");
        // Fallback mit Timeout, um zu versuchen, die Initialisierung später auszuführen
        setTimeout(() => {
            if (window.WEBFLOW_API &&
                window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.initializeMyJobsDisplay &&
                window.WEBFLOW_API.cache &&
                window.WEBFLOW_API.appLogic.filterAndRenderJobs) {
                
                console.log("AppLogic jetzt bereit, starte Initialisierung (verzögert).");
                initializePageSizeSelector();
                initializeJobFilters();
                window.WEBFLOW_API.appLogic.initializeMyJobsDisplay();
            } else {
                console.error("AppLogic auch nach Verzögerung nicht bereit. Gib auf.");
                const container = document.getElementById("jobs-list");
                if (container) container.innerHTML = "<p class='error-message job-entry visible'>Fehler beim Initialisieren der Anwendung. Wichtige Komponenten fehlen.</p>";
            }
        }, 1000); // Erhöhter Timeout für mehr Puffer
    }
  }

  // Event Listener für DOMContentLoaded oder window.onload für robustere Ausführung
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
  } else {
    // DOM bereits geladen
    initializeApp();
  }
  
  window.WEBFLOW_API.initializeApp = initializeApp; // Für eventuelle externe Aufrufe oder Debugging

})();
