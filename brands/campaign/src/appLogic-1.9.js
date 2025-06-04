// brands/campaign/src/appLogic-1.8.js
(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.appLogic = window.WEBFLOW_API.appLogic || {};

  // Hilfsfunktion, um den Job-Status zu ermitteln
  function getJobStatus(jobFieldData) {
    const jobEndDateString = jobFieldData["job-date-end"];
    if (jobEndDateString) {
      try {
        const jobEndDate = new Date(jobEndDateString);
        jobEndDate.setHours(23, 59, 59, 999);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (jobEndDate >= today) {
          return "Aktiv";
        } else {
          return "Beendet";
        }
      } catch (e) {
        console.warn("Konnte Job-Enddatum nicht verarbeiten für Status:", jobEndDateString, e);
        return "Unbekannt";
      }
    }
    return "Unbekannt";
  }

  /**
   * Lädt und zeigt Bewerber für einen bestimmten Job an, inklusive Paginierung und Filter.
   * Stellt sicher, dass die Job-Details (insb. Favoriten) aktuell sind.
   * @param {string} jobId - Die ID des Jobs.
   * @param {HTMLElement} applicantsListContainer - Der DOM-Container für die Bewerberliste.
   * @param {HTMLElement} paginationWrapper - Der DOM-Container für die Paginierungssteuerung.
   * @param {number} [pageNumber=1] - Die anzuzeigende Seitenzahl.
   */
  async function loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, pageNumber = 1) {
    console.log(`loadAndDisplayApplicantsForJob: START - Job ID: ${jobId}, Page: ${pageNumber}`);

    const cacheModule = window.WEBFLOW_API.cache;
    const uiModule = window.WEBFLOW_API.ui;
    const servicesModule = window.WEBFLOW_API.services;
    const configModule = window.WEBFLOW_API.config;

    if (!cacheModule || !uiModule || !servicesModule || !configModule ||
        !uiModule.createFilterRowElement ||
        !uiModule.createApplicantTableHeaderElement ||
        !uiModule.createApplicantRowElement ||
        !uiModule.renderPaginationControls ||
        !uiModule.renderActiveFilterBadgesUI ||
        !servicesModule.fetchWebflowItem) {
        console.error("loadAndDisplayApplicantsForJob: Kritische Module oder Funktionen (cache, ui, services, config) nicht verfügbar.");
        const mainToggleButtonError = document.querySelector(`.my-job-item[data-job-id="${jobId}"] .checkbox-toggle`);
        if (mainToggleButtonError) mainToggleButtonError.disabled = false;
        if(applicantsListContainer) applicantsListContainer.innerHTML = "<p class='applicants-message error-message'>Fehler beim Laden der Bewerber (fehlende Module).</p>";
        return;
    }

    const { jobDataCache, currentApplicantPageSize, updateJobCacheWithJobDetails, getJobDataFromCache } = cacheModule;
    const { createFilterRowElement, createApplicantTableHeaderElement, createApplicantRowElement, renderPaginationControls, renderActiveFilterBadgesUI } = uiModule;
    const { fetchWebflowItem } = servicesModule;
    const { JOB_COLLECTION_ID_MJ } = configModule;

    const mainToggleButton = document.querySelector(`.my-job-item[data-job-id="${jobId}"] .checkbox-toggle`);
    if (mainToggleButton) mainToggleButton.disabled = true;

    let filterRow = applicantsListContainer.querySelector(".db-table-filter-row");
    if (!filterRow) {
      const newFilterRow = createFilterRowElement(jobId, applicantsListContainer, paginationWrapper);
      applicantsListContainer.insertBefore(newFilterRow, applicantsListContainer.firstChild);
      filterRow = newFilterRow;
    }
    const activeFiltersDisplayContainer = filterRow.querySelector(".db-active-filters-display");

    if (!applicantsListContainer.querySelector(".db-table-header.db-table-applicant")) {
      const headerElement = createApplicantTableHeaderElement();
      const currentFilterRow = applicantsListContainer.querySelector(".db-table-filter-row");
      if (currentFilterRow && currentFilterRow.nextSibling) {
        applicantsListContainer.insertBefore(headerElement, currentFilterRow.nextSibling);
      } else if (currentFilterRow) {
        applicantsListContainer.appendChild(headerElement);
      } else {
        applicantsListContainer.insertBefore(headerElement, applicantsListContainer.firstChild);
      }
    }

    let applicantsContentElement = applicantsListContainer.querySelector(".actual-applicants-content");
    if (!applicantsContentElement) {
      applicantsContentElement = document.createElement("div");
      applicantsContentElement.classList.add("actual-applicants-content");
      const header = applicantsListContainer.querySelector(".db-table-header.db-table-applicant");
      if (header && header.nextSibling) {
        applicantsListContainer.insertBefore(applicantsContentElement, header.nextSibling);
      } else if (header) {
        applicantsListContainer.appendChild(applicantsContentElement);
      } else {
        applicantsListContainer.appendChild(applicantsContentElement);
      }
    }
    applicantsContentElement.innerHTML = '';
    applicantsListContainer.dataset.currentPage = pageNumber;

    const spinnerDiv = document.createElement("div");
    spinnerDiv.classList.add("spinner-table-small");
    spinnerDiv.style.margin = "20px auto";
    spinnerDiv.style.display = "block";
    applicantsContentElement.appendChild(spinnerDiv);

    let jobCache = getJobDataFromCache(jobId); // Stellt sicher, dass der Cache-Eintrag initialisiert ist

    // NEU: Sicherstellen, dass jobDetails aktuell sind, bevor sie verwendet werden
    if (!jobCache.jobDetails || !jobCache.jobDetails.fieldData || !jobCache.jobDetails.fieldData['job-favoriten']) { // Prüfe explizit auf job-favoriten
        console.warn(`loadAndDisplayApplicantsForJob: Job-Details (insb. Favoriten) für Job ${jobId} unvollständig im Cache. Lade nach...`);
        const fetchedJob = await fetchWebflowItem(JOB_COLLECTION_ID_MJ, jobId);
        if (fetchedJob && !fetchedJob.error && fetchedJob.fieldData) {
            updateJobCacheWithJobDetails(jobId, fetchedJob); // Cache mit den frischen Daten aktualisieren
            jobCache.jobDetails = fetchedJob; // Lokale Variable auch aktualisieren
            console.log(`loadAndDisplayApplicantsForJob: Job-Details für Job ${jobId} nachgeladen und Cache aktualisiert.`);
        } else {
            console.error(`loadAndDisplayApplicantsForJob: Konnte Job-Details für Job ${jobId} nicht nachladen. Fehler:`, fetchedJob?.message);
            // Fehlerbehandlung: Spinner entfernen und Meldung anzeigen
            spinnerDiv.remove();
            applicantsContentElement.innerHTML = "<p class='applicants-message error-message'>Fehler: Job-Informationen konnten nicht geladen werden.</p>";
            if (mainToggleButton) mainToggleButton.disabled = false;
            return;
        }
    }

    if (!jobCache.sortedAndFilteredItems) {
        console.warn(`loadAndDisplayApplicantsForJob: Keine sortierten/gefilterten Daten im Cache für Job ${jobId}. Es wird versucht, sie jetzt zu erstellen.`);
        if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.filterAndSortApplicants) {
            window.WEBFLOW_API.core.filterAndSortApplicants(jobId); // Dies sollte sortedAndFilteredItems im Cache setzen
            jobCache = getJobDataFromCache(jobId); // Cache erneut holen, um sicherzustellen, dass sortedAndFilteredItems da sind
             if (!jobCache.sortedAndFilteredItems) {
                console.error(`loadAndDisplayApplicantsForJob: Auch nach filterAndSortApplicants keine sortierten Daten für Job ${jobId}.`);
                spinnerDiv.remove();
                applicantsContentElement.innerHTML = "<p class='applicants-message error-message'>Fehler: Bewerberdaten konnten nicht sortiert/gefiltert werden.</p>";
                if (mainToggleButton) mainToggleButton.disabled = false;
                return;
            }
        } else {
            console.error("loadAndDisplayApplicantsForJob: filterAndSortApplicants Funktion nicht verfügbar.");
             spinnerDiv.remove();
            applicantsContentElement.innerHTML = "<p class='applicants-message error-message'>Fehler: Filterfunktion nicht verfügbar.</p>";
            if (mainToggleButton) mainToggleButton.disabled = false;
            return;
        }
    }
    
    // Verwende die (potenziell) gerade aktualisierten jobDetails
    const jobDetailsForRows = jobCache.jobDetails;
    const allSortedAndFilteredItems = jobCache.sortedAndFilteredItems;
    const totalPages = Math.ceil(allSortedAndFilteredItems.length / currentApplicantPageSize);
    const offset = (pageNumber - 1) * currentApplicantPageSize;
    const pageItems = allSortedAndFilteredItems.slice(offset, offset + currentApplicantPageSize);

    spinnerDiv.remove();

    let validApplicantsRenderedOnThisPage = 0;
    if (pageItems.length > 0) {
      pageItems.forEach((applicantItemWithScoreInfo, indexOnPage) => {
        if (applicantItemWithScoreInfo && applicantItemWithScoreInfo.fieldData && !applicantItemWithScoreInfo.error) {
          const globalIndexInAllItems = offset + indexOnPage;
          const applicantRow = createApplicantRowElement(
            applicantItemWithScoreInfo,
            jobDetailsForRows, // Hier werden die aktuellen jobDetails übergeben
            allSortedAndFilteredItems,
            globalIndexInAllItems,
            jobId
          );
          applicantsContentElement.appendChild(applicantRow);
          requestAnimationFrame(() => {
            applicantRow.style.opacity = "0";
            requestAnimationFrame(() => {
              applicantRow.style.transition = "opacity 0.3s ease-in-out";
              applicantRow.style.opacity = "1";
            });
          });
          validApplicantsRenderedOnThisPage++;
        } else if (applicantItemWithScoreInfo && applicantItemWithScoreInfo.error) {
          const errorMsg = document.createElement("p");
          errorMsg.classList.add("applicants-message", "error-message-small");
          errorMsg.textContent = applicantItemWithScoreInfo.message || `Daten für Bewerber ${applicantItemWithScoreInfo.id || 'unbekannt'} konnten nicht geladen werden.`;
          applicantsContentElement.appendChild(errorMsg);
        }
      });
    }

    if (validApplicantsRenderedOnThisPage === 0 && allSortedAndFilteredItems.length > 0 && pageItems.length > 0) {
        const noDataMsg = document.createElement("p");
        noDataMsg.classList.add("applicants-message");
        noDataMsg.textContent = "Keine gültigen Bewerberdaten für diese Seite gefunden.";
        applicantsContentElement.appendChild(noDataMsg);
    } else if (allSortedAndFilteredItems.length === 0 && jobCache.allItems && jobCache.allItems.length > 0) {
        const noMatchMsg = document.createElement("p");
        noMatchMsg.classList.add("applicants-message");
        noMatchMsg.textContent = "Keine Bewerber entsprechen den aktuellen Filterkriterien.";
        applicantsContentElement.appendChild(noMatchMsg);
        if (paginationWrapper) paginationWrapper.style.display = "none";
    } else if (allSortedAndFilteredItems.length === 0) {
        const noApplicantsMsg = document.createElement("p");
        noApplicantsMsg.classList.add("applicants-message");
        noApplicantsMsg.textContent = "Für diesen Job liegen keine Bewerbungen vor.";
        applicantsContentElement.appendChild(noApplicantsMsg);
        if (paginationWrapper) paginationWrapper.style.display = "none";
    }

    await renderPaginationControls(jobId, allSortedAndFilteredItems, applicantsContentElement, paginationWrapper, pageNumber, totalPages);

    if (activeFiltersDisplayContainer && renderActiveFilterBadgesUI) {
        renderActiveFilterBadgesUI(jobId, activeFiltersDisplayContainer, applicantsListContainer, paginationWrapper);
    }

    if (mainToggleButton) mainToggleButton.disabled = false;
    console.log(`loadAndDisplayApplicantsForJob: END - Job ID: ${jobId}, Page: ${pageNumber}`);
  }

  /**
   * Filtert die globale Jobliste und rendert die entsprechenden UI-Sektionen neu.
   */
  function filterAndRenderJobs() {
    const cache = window.WEBFLOW_API.cache;
    if (!cache || !cache.allMyJobsData_MJ) {
        console.warn("Keine Job-Rohdaten im Cache zum Filtern vorhanden.");
        if (window.WEBFLOW_API.ui && window.WEBFLOW_API.ui.renderMyJobsList) {
            window.WEBFLOW_API.ui.renderMyJobsList([], "jobs-list-active");
            window.WEBFLOW_API.ui.renderMyJobsList([], "jobs-list-closed");
            window.WEBFLOW_API.ui.renderMyJobsList([], "jobs-list");
        }
        return;
    }

    const searchInput = document.getElementById('filter-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

    let allJobsMatchingSearch = cache.allMyJobsData_MJ.filter(jobItem => {
        if (jobItem.error || !jobItem.fieldData) return false;
        if (searchTerm) {
            const jobName = jobItem.fieldData.name ? jobItem.fieldData.name.toLowerCase() : "";
            if (!jobName.includes(searchTerm)) {
                return false;
            }
        }
        return true;
    });

    const activeJobs = [];
    const closedJobs = [];

    allJobsMatchingSearch.forEach(jobItem => {
        const status = getJobStatus(jobItem.fieldData);
        if (status === "Aktiv") {
            activeJobs.push(jobItem);
        } else if (status === "Beendet") {
            closedJobs.push(jobItem);
        }
    });

    if (window.WEBFLOW_API.ui && window.WEBFLOW_API.ui.renderMyJobsList) {
        const { renderMyJobsList } = window.WEBFLOW_API.ui;
        if (document.getElementById('jobs-list')) {
            renderMyJobsList(allJobsMatchingSearch, "jobs-list");
        }
        if (document.getElementById('jobs-list-active')) {
            renderMyJobsList(activeJobs, "jobs-list-active");
        }
        if (document.getElementById('jobs-list-closed')) {
            renderMyJobsList(closedJobs, "jobs-list-closed");
        }
    }
  }

  /**
   * Initialisiert die Anzeige der "Meine Jobs"-Liste.
   * Lädt die Jobs des aktuellen Nutzers und rendert sie.
   */
  async function initializeMyJobsDisplay() {
    console.log("initializeMyJobsDisplay: Start");
    if (!window.WEBFLOW_API.config) {
        console.error("❌ Konfigurationsmodul nicht geladen. Breche initializeMyJobsDisplay ab.");
        const container = document.getElementById("jobs-list") || document.getElementById("jobs-list-active");
        if (container) container.innerHTML = "<p class='error-message job-entry visible'>Fehler: Konfiguration konnte nicht geladen werden.</p>";
        return;
    }
    const { API_CALL_DELAY_MS, USER_COLLECTION_ID_MJ, JOB_COLLECTION_ID_MJ, SKELETON_JOBS_COUNT_MJ } = window.WEBFLOW_API.config;

    const cache = window.WEBFLOW_API.cache;
    if (!cache) {
        console.error("❌ Cache-Modul nicht geladen. Breche initializeMyJobsDisplay ab.");
        const container = document.getElementById("jobs-list") || document.getElementById("jobs-list-active");
        if (container) container.innerHTML = "<p class='error-message job-entry visible'>Fehler: Cache konnte nicht geladen werden.</p>";
        return;
    }

    const services = window.WEBFLOW_API.services;
    if (!services || !services.fetchWebflowItem) {
        console.error("❌ Service-Modul oder fetchWebflowItem nicht geladen. Breche initializeMyJobsDisplay ab.");
        const container = document.getElementById("jobs-list") || document.getElementById("jobs-list-active");
        if (container) container.innerHTML = "<p class='error-message job-entry visible'>Fehler: API-Services konnten nicht geladen werden.</p>";
        return;
    }
    const { fetchWebflowItem } = services;

    const utilsModule = window.WEBFLOW_API.utils;
    const delay = utilsModule && typeof utilsModule.delay === 'function' ? utilsModule.delay : (ms => new Promise(resolve => setTimeout(resolve, ms)));

    const ui = window.WEBFLOW_API.ui;
    if (!ui || !ui.renderMyJobsSkeletonLoader || !ui.createMyJobsTableHeaderElement) {
        console.error("❌ UI-Modul oder benötigte UI-Funktionen nicht geladen. Breche initializeMyJobsDisplay ab.");
        const container = document.getElementById("jobs-list") || document.getElementById("jobs-list-active");
        if (container) container.innerHTML = "<p class='error-message job-entry visible'>Fehler: UI-Komponenten konnten nicht geladen werden.</p>";
        return;
    }
    const { renderMyJobsSkeletonLoader, createMyJobsTableHeaderElement } = ui;

    let initialContainer = document.getElementById("jobs-list") || document.getElementById("jobs-list-active");
    if (!initialContainer && document.getElementById("jobs-list-closed")) initialContainer = document.getElementById("jobs-list-closed");

    if (!initialContainer) {
      console.warn("Keinen initialen Job-Container für initializeMyJobsDisplay gefunden. Überspringe Skeleton/Header.");
    } else {
        if (!initialContainer.querySelector(".db-table-header.db-table-my-jobs")) {
            const myJobsHeader = createMyJobsTableHeaderElement ? createMyJobsTableHeaderElement() : null;
            if (myJobsHeader) initialContainer.appendChild(myJobsHeader);
        }
        if (renderMyJobsSkeletonLoader) renderMyJobsSkeletonLoader(initialContainer, SKELETON_JOBS_COUNT_MJ);
    }


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
      cache.currentWebflowMemberId_MJ = member?.data?.customFields?.['webflow-member-id'];

      if (!cache.currentWebflowMemberId_MJ) {
        console.error("❌ Kein 'webflow-member-id' im Memberstack-Profil gefunden.");
        document.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
        if (initialContainer) initialContainer.innerHTML += "<p class='error-message job-entry visible'>Benutzer-Identifikation fehlgeschlagen.</p>";
        return;
      }

      await delay(API_CALL_DELAY_MS);
      const currentUserItem = await fetchWebflowItem(USER_COLLECTION_ID_MJ, cache.currentWebflowMemberId_MJ);

      if (!currentUserItem || (currentUserItem.error && currentUserItem.status !== 429 && currentUserItem.status !== 404)) {
        let errorMsgText = "Deine Benutzerdaten konnten nicht geladen werden.";
        if(currentUserItem && currentUserItem.message) errorMsgText += ` Fehler: ${currentUserItem.message}`;
        document.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
        if (initialContainer) initialContainer.innerHTML += `<p class='error-message job-entry visible'>${errorMsgText}</p>`;
        return;
      }

      const postedJobIds = currentUserItem.fieldData ? currentUserItem.fieldData["posted-jobs"] || [] : [];
      if (postedJobIds.length === 0) {
        document.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
        filterAndRenderJobs();
        return;
      }

      let myJobItemsPromises = postedJobIds.map(async (jobId, index) => {
        await delay(index * API_CALL_DELAY_MS);
        const jobItem = await fetchWebflowItem(JOB_COLLECTION_ID_MJ, jobId);
        // WICHTIG: Hier werden die Job-Details (inkl. job-favoriten) in den Cache geschrieben.
        if (jobItem && !jobItem.error && jobItem.fieldData) {
            cache.updateJobCacheWithJobDetails(jobId, jobItem); // Stellt sicher, dass jobDetails im Cache sind
        }
        return jobItem || { id: jobId, error: true, status: 'fetch_null_error', message: `Unerwartete null-Antwort.` };
      });

      const myJobItemsResults = await Promise.all(myJobItemsPromises);
      // cache.allMyJobsData_MJ wird jetzt nicht mehr direkt verwendet,
      // da die Details bereits im jobDataCache sind.
      // Stattdessen stellen wir sicher, dass alle Jobs im Cache sind.
      myJobItemsResults.forEach(jobItem => {
          if (jobItem && jobItem.id && !jobItem.error) {
              if (!cache.jobDataCache[jobItem.id] || !cache.jobDataCache[jobItem.id].jobDetails) {
                  cache.updateJobCacheWithJobDetails(jobItem.id, jobItem);
              }
          }
      });
      // Für filterAndRenderJobs benötigen wir eine Liste aller Job-Items (können auch Fehlerobjekte sein)
      cache.allMyJobsData_MJ = myJobItemsResults.filter(item => item !== null);


      document.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
      filterAndRenderJobs();

    } catch (error) {
      console.error("❌ Schwerwiegender Fehler in initializeMyJobsDisplay:", error);
      document.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
      if (initialContainer) initialContainer.innerHTML += `<p class='error-message job-entry visible'>Ein allgemeiner Fehler ist aufgetreten.</p>`;
    }
  }

  window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob = loadAndDisplayApplicantsForJob;
  window.WEBFLOW_API.appLogic.filterAndRenderJobs = filterAndRenderJobs;
  window.WEBFLOW_API.appLogic.initializeMyJobsDisplay = initializeMyJobsDisplay;

  console.log("AppLogic (appLogic-1.8.js) wurde aktualisiert mit Cache-Aktualisierung für Job-Details.");
})();
