(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.appLogic = window.WEBFLOW_API.appLogic || {};

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

  async function loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, pageNumber = 1) {
    // console.log(`DEBUG: loadAndDisplayApplicantsForJob START - Job ID: ${jobId}, Page: ${pageNumber}`);
    
    const cacheModule = window.WEBFLOW_API.cache;
    const uiModule = window.WEBFLOW_API.ui;

    if (!cacheModule || !uiModule || 
        !uiModule.createFilterRowElement || 
        !uiModule.createApplicantTableHeaderElement ||
        !uiModule.createApplicantRowElement ||
        !uiModule.renderPaginationControls ||
        !uiModule.renderActiveFilterBadgesUI) {
        console.error("loadAndDisplayApplicantsForJob: Cache oder UI-Funktionen nicht verfügbar.");
        const mainToggleButtonError = document.querySelector(`.my-job-item[data-job-id="${jobId}"] .checkbox-toggle`);
        if (mainToggleButtonError) mainToggleButtonError.disabled = false;
        return;
    }

    const { jobDataCache, currentApplicantPageSize } = cacheModule;
    const { createFilterRowElement, createApplicantTableHeaderElement, createApplicantRowElement, renderPaginationControls, renderActiveFilterBadgesUI } = uiModule;
    
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

    const jobCache = jobDataCache ? jobDataCache[jobId] : null;
    if (!jobCache || !jobCache.sortedAndFilteredItems) {
      console.error(`DEBUG: Keine sortierten/gefilterten Daten im Cache für Job ${jobId}. JobCache:`, jobCache);
      spinnerDiv.remove(); 
      const errorText = document.createElement("p");
      errorText.classList.add("applicants-message");
      errorText.textContent = 'Fehler: Bewerberdaten konnten nicht geladen werden (Cache-Problem).';
      applicantsContentElement.appendChild(errorText);
      if (mainToggleButton) mainToggleButton.disabled = false;
      return;
    }

    const jobDetailsForRows = jobCache.jobDetails; 
    const allSortedAndFilteredItems = jobCache.sortedAndFilteredItems; 
    const totalPages = Math.ceil(allSortedAndFilteredItems.length / currentApplicantPageSize);
    const offset = (pageNumber - 1) * currentApplicantPageSize;
    const pageItems = allSortedAndFilteredItems.slice(offset, offset + currentApplicantPageSize);
    
    spinnerDiv.remove(); 

    let validApplicantsRenderedOnThisPage = 0;
    if (pageItems.length > 0) {
      pageItems.forEach((applicantItemWithScore, indexOnPage) => { 
        if (applicantItemWithScore && applicantItemWithScore.fieldData && !applicantItemWithScore.error) {
          const globalIndexInAllItems = offset + indexOnPage;
          const applicantRow = createApplicantRowElement(
            applicantItemWithScore, 
            jobDetailsForRows, 
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
        } else if (applicantItemWithScore && applicantItemWithScore.error) {
          const errorMsg = document.createElement("p");
          errorMsg.classList.add("applicants-message", "error-message-small"); 
          errorMsg.textContent = applicantItemWithScore.message || `Daten für Bewerber ${applicantItemWithScore.id || 'unbekannt'} konnten nicht geladen werden.`;
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
  }

  /**
   * Renders a list of job items into a specified container.
   * @param {Array<Object>} jobItemsToRender - Array of job items to display.
   * @param {string} containerId - The ID of the DOM element to render jobs into.
   */
  function renderMyJobsList(jobItemsToRender, containerId) { 
    const uiModule = window.WEBFLOW_API.ui;
    if (!uiModule || !uiModule.createJobEntryElement) {
        console.error(`renderMyJobsList: UI-Modul oder createJobEntryElement nicht verfügbar für Container ${containerId}.`);
        return;
    }
    const { createJobEntryElement } = uiModule;
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`❌ Container '${containerId}' nicht gefunden für renderMyJobsList.`);
      return;
    }

    // Remove existing job items and messages, but keep a potential header specific to this container
    // Assuming .my-job-item is the class for individual job entries
    // And .job-entry.info-message or .error-message for messages
    container.querySelectorAll(".my-job-item, .job-entry.info-message, .job-entry.error-message").forEach(item => item.remove());

    if (!jobItemsToRender || jobItemsToRender.length === 0) {
      // console.log(`renderMyJobsList: Keine Jobs zum Rendern für Container '${containerId}'. Zeige 'Keine Jobs'-Nachricht.`);
      const noJobsMsg = document.createElement("p");
      noJobsMsg.textContent = "Keine Jobs entsprechen den aktuellen Kriterien."; // Generic message
      noJobsMsg.classList.add("job-entry", "visible", "info-message"); 
      container.appendChild(noJobsMsg);
      // Call plan styling even if no jobs, to ensure consistency if there were old styled items
      if (window.WEBFLOW_API.planLogic && typeof window.WEBFLOW_API.planLogic.applyPlanBasedJobStyling === 'function') {
        window.WEBFLOW_API.planLogic.applyPlanBasedJobStyling();
      }
      return;
    }

    const fragment = document.createDocumentFragment();
    let globalRateLimitMessageShown = false; // This might need to be managed more globally if lists are separate

    jobItemsToRender.forEach(jobItem => {
      if (jobItem.error && jobItem.status === 429) {
        if (!globalRateLimitMessageShown && !document.getElementById(`global-rate-limit-message-${containerId}`)) { // Unique ID for message per container
          const globalRateLimitInfo = document.createElement("p");
          globalRateLimitInfo.id = `global-rate-limit-message-${containerId}`;
          globalRateLimitInfo.textContent = "Hinweis: Einige Jobdaten konnten aufgrund von API-Anfragelimits nicht geladen werden.";
          globalRateLimitInfo.classList.add("job-entry", "visible", "error-message");
          container.insertBefore(globalRateLimitInfo, container.firstChild);
          globalRateLimitMessageShown = true; // This logic might show the message in the first container that hits the limit
        }
        return; 
      }
      
      if (jobItem.error && jobItem.status === 404) {
          return; 
      }

      if (createJobEntryElement) {
          const jobElement = createJobEntryElement(jobItem); // createJobEntryElement should return a .my-job-item
          if (jobElement) { 
            fragment.appendChild(jobElement);
          }
      }
    });

    container.appendChild(fragment);

    requestAnimationFrame(() => {
      container.querySelectorAll(".my-job-item.job-entry:not(.job-error)").forEach(entry => {
        if (!entry.classList.contains("visible")) {
            entry.style.opacity = "0";
            requestAnimationFrame(() => {
                entry.style.transition = "opacity 0.5s ease-out";
                entry.style.opacity = "1";
                entry.classList.add("visible");
            });
        } else { 
            entry.style.opacity = "1";
        }
      });
      container.querySelectorAll(".job-entry.error-message, .job-entry.info-message").forEach(msg => {
          if (!msg.classList.contains("visible")) {
              msg.classList.add("visible"); 
          }
      });
    });

    if (window.WEBFLOW_API.planLogic && typeof window.WEBFLOW_API.planLogic.applyPlanBasedJobStyling === 'function') {
      // console.log(`renderMyJobsList: Rufe applyPlanBasedJobStyling für Container '${containerId}' auf...`);
      window.WEBFLOW_API.planLogic.applyPlanBasedJobStyling(); // This function queries globally, which is fine.
    } else {
      console.warn(`renderMyJobsList: window.WEBFLOW_API.planLogic.applyPlanBasedJobStyling Funktion nicht gefunden für Container '${containerId}'.`);
    }
  }

  function filterAndRenderJobs() {
    const cache = window.WEBFLOW_API.cache;
    if (!cache || !cache.allMyJobsData_MJ) {
        console.warn("Keine Job-Rohdaten im Cache zum Filtern vorhanden.");
        // Clear all potential job lists if data is missing
        renderMyJobsList([], "jobs-list-active"); 
        renderMyJobsList([], "jobs-list-closed");
        // renderMyJobsList([], "jobs-list"); // If you still have an "all" jobs list
        return;
    }

    const showActiveCheckbox = document.getElementById('job-status-active');
    const showDoneCheckbox = document.getElementById('job-status-done');
    
    // Determine which lists to display based on checkboxes.
    // This assumes tabs might control visibility of these containers,
    // and checkboxes filter *which types* of jobs are fetched/processed.
    // For simplicity, we'll use the checkboxes to decide if a list is populated.
    const shouldDisplayActive = showActiveCheckbox ? showActiveCheckbox.checked : true; // Default to true if no checkbox
    const shouldDisplayDone = showDoneCheckbox ? showDoneCheckbox.checked : true; // Default to true if no checkbox

    const searchInput = document.getElementById('filter-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

    console.log(`Filter-Status: Aktiv-Checkbox=${shouldDisplayActive}, Beendet-Checkbox=${shouldDisplayDone}, Suche='${searchTerm}'`);

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
        // "Unbekannt" status jobs are currently ignored for these specific lists
    });

    if (shouldDisplayActive) {
        console.log(`filterAndRenderJobs: Rendere ${activeJobs.length} aktive Jobs in #jobs-list-active.`);
        renderMyJobsList(activeJobs, "jobs-list-active");
    } else {
        console.log("filterAndRenderJobs: Aktive Jobs werden nicht angezeigt (Checkbox nicht aktiv). Leere #jobs-list-active.");
        renderMyJobsList([], "jobs-list-active"); // Clear active list if not displayed
    }

    if (shouldDisplayDone) {
        console.log(`filterAndRenderJobs: Rendere ${closedJobs.length} beendete Jobs in #jobs-list-closed.`);
        renderMyJobsList(closedJobs, "jobs-list-closed");
    } else {
        console.log("filterAndRenderJobs: Beendete Jobs werden nicht angezeigt (Checkbox nicht aktiv). Leere #jobs-list-closed.");
        renderMyJobsList([], "jobs-list-closed"); // Clear closed list if not displayed
    }
    
    // Handle the original #jobs-list if it's meant for "all" jobs and both checkboxes are active or no checkboxes exist
    // This part depends on how you want #jobs-list to behave with the new tabs.
    // For now, we assume it's not the primary display for active/closed when those specific containers exist.
    // If you want #jobs-list to show *all* (active and closed) when both checkboxes are checked:
    if (document.getElementById('jobs-list')) { // Check if the general list container still exists
        if (shouldDisplayActive && shouldDisplayDone) {
            // console.log(`filterAndRenderJobs: Rendere alle ${allJobsMatchingSearch.length} (durch Suche gefilterten) Jobs in #jobs-list.`);
            // renderMyJobsList(allJobsMatchingSearch, "jobs-list");
        } else if (!shouldDisplayActive && !shouldDisplayDone && !showActiveCheckbox && !showDoneCheckbox) {
            // If no status checkboxes exist at all, maybe show all in the main list
            // console.log(`filterAndRenderJobs: Keine Status-Checkboxes, rendere alle ${allJobsMatchingSearch.length} Jobs in #jobs-list.`);
            // renderMyJobsList(allJobsMatchingSearch, "jobs-list");
        } else {
            // Clear #jobs-list if it's not supposed to show a combined view based on current checkbox state
            // console.log("filterAndRenderJobs: Leere #jobs-list, da nicht alle Kategorien angezeigt werden sollen.");
            // renderMyJobsList([], "jobs-list");
        }
    }
  }

  async function initializeMyJobsDisplay() {
    // ... (rest of the function remains largely the same, ensure all module checks are robust) ...
    // The key is that it calls filterAndRenderJobs() at the end, which will now handle the new containers.

    if (!window.WEBFLOW_API.config) {
        console.error("❌ Konfigurationsmodul nicht geladen. Breche initializeMyJobsDisplay ab.");
        const container = document.getElementById("jobs-list") || document.getElementById("jobs-list-active"); // Try to find a valid container
        if (container) container.innerHTML = "<p class='error-message job-entry visible'>Fehler: Konfiguration konnte nicht geladen werden.</p>";
        return;
    }
    const { API_CALL_DELAY_MS, USER_COLLECTION_ID_MJ, JOB_COLLECTION_ID_MJ, SKELETON_JOBS_COUNT_MJ } = window.WEBFLOW_API.config;
    
    const cache = window.WEBFLOW_API.cache;
    if (!cache) { // Check for cache module itself
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

    // Determine a primary container for initial messages/skeleton, e.g., the "active" tab's container or the old "jobs-list"
    // This needs to align with which tab is visible by default.
    // For now, let's assume one of them will exist for skeleton/header.
    let initialContainer = document.getElementById("jobs-list-active") || document.getElementById("jobs-list");
    if (!initialContainer && document.getElementById("jobs-list-closed")) initialContainer = document.getElementById("jobs-list-closed");

    if (!initialContainer) {
      console.error("❌ Keinen initialen Job-Container (jobs-list-active, jobs-list, oder jobs-list-closed) für initializeMyJobsDisplay gefunden.");
      return;
    }
    
    // Assuming each tab might have its own header, or you have a general one.
    // This part might need adjustment based on your tab structure.
    // For now, let's assume a general header might be placed in one of the containers or above them.
    // If headers are specific per tab, createMyJobsTableHeaderElement might need to be called per tab container.
    // The current logic adds a header if ".db-table-header.db-table-my-jobs" is not found in `initialContainer`.
    if (!initialContainer.querySelector(".db-table-header.db-table-my-jobs")) {
        const myJobsHeader = createMyJobsTableHeaderElement ? createMyJobsTableHeaderElement() : null;
        if (myJobsHeader) initialContainer.appendChild(myJobsHeader);
    }
    if (renderMyJobsSkeletonLoader) renderMyJobsSkeletonLoader(initialContainer, SKELETON_JOBS_COUNT_MJ); 

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
        initialContainer.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
        initialContainer.innerHTML += "<p class='error-message job-entry visible'>Benutzer-Identifikation fehlgeschlagen.</p>";
        return;
      }

      await delay(API_CALL_DELAY_MS); 
      const currentUserItem = await fetchWebflowItem(USER_COLLECTION_ID_MJ, cache.currentWebflowMemberId_MJ);

      if (!currentUserItem || (currentUserItem.error && currentUserItem.status !== 429 && currentUserItem.status !== 404)) {
        let errorMsgText = "Deine Benutzerdaten konnten nicht geladen werden.";
        if(currentUserItem && currentUserItem.message) errorMsgText += ` Fehler: ${currentUserItem.message}`;
        initialContainer.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
        initialContainer.innerHTML += `<p class='error-message job-entry visible'>${errorMsgText}</p>`;
        return;
      }
      // Handle other specific errors (429, 404) as before, targeting `initialContainer` for messages

      const postedJobIds = currentUserItem.fieldData ? currentUserItem.fieldData["posted-jobs"] || [] : [];
      if (postedJobIds.length === 0) {
        initialContainer.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
        filterAndRenderJobs(); // This will show "no jobs" in the respective containers
        return;
      }

      let myJobItemsPromises = postedJobIds.map(async (jobId, index) => {
        await delay(index * API_CALL_DELAY_MS); 
        const jobItem = await fetchWebflowItem(JOB_COLLECTION_ID_MJ, jobId);
        return jobItem || { id: jobId, error: true, status: 'fetch_null_error', message: `Unerwartete null-Antwort.` };
      });
      
      const myJobItemsResults = await Promise.all(myJobItemsPromises);
      cache.allMyJobsData_MJ = myJobItemsResults.filter(item => item !== null); 
      
      // Remove skeletons from all potential containers
      document.querySelectorAll("#jobs-list .my-job-item-skeleton, #jobs-list-active .my-job-item-skeleton, #jobs-list-closed .my-job-item-skeleton").forEach(el => el.remove());
      filterAndRenderJobs(); 

    } catch (error) {
      console.error("❌ Schwerwiegender Fehler in initializeMyJobsDisplay:", error);
      // Clear skeletons and show error in a primary container
      const errorContainer = document.getElementById("jobs-list-active") || document.getElementById("jobs-list") || document.getElementById("jobs-list-closed");
      if (errorContainer) {
          errorContainer.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
          errorContainer.innerHTML += `<p class='error-message job-entry visible'>Ein allgemeiner Fehler ist aufgetreten.</p>`;
      }
    }
  }

  window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob = loadAndDisplayApplicantsForJob;
  window.WEBFLOW_API.appLogic.filterAndRenderJobs = filterAndRenderJobs; 
  window.WEBFLOW_API.appLogic.initializeMyJobsDisplay = initializeMyJobsDisplay;

})();
