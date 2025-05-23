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
    console.log(`DEBUG: loadAndDisplayApplicantsForJob START - Job ID: ${jobId}, Page: ${pageNumber}`);
    
    const { jobDataCache, currentApplicantPageSize } = window.WEBFLOW_API.cache;
    const { createFilterRowElement, createApplicantTableHeaderElement, createApplicantRowElement, renderPaginationControls, renderActiveFilterBadgesUI } = window.WEBFLOW_API.ui; // renderActiveFilterBadgesUI hinzugefügt
    
    const mainToggleButton = document.querySelector(`.my-job-item[data-job-id="${jobId}"] .checkbox-toggle`); 
    if (mainToggleButton && mainToggleButton.disabled) { 
        // return; 
    }
    if (mainToggleButton) mainToggleButton.disabled = true;

    // Sicherstellen, dass die Filter-UI-Elemente vorhanden sind, bevor Badges gerendert werden
    let filterRow = applicantsListContainer.querySelector(".db-table-filter-row");
    if (!filterRow) {
      // Erstelle die gesamte Filterzeile, wenn sie nicht existiert.
      // createFilterRowElement fügt auch den Container für die Badges hinzu.
      const newFilterRow = createFilterRowElement(jobId, applicantsListContainer, paginationWrapper);
      applicantsListContainer.insertBefore(newFilterRow, applicantsListContainer.firstChild);
      filterRow = newFilterRow; // Aktualisiere die Referenz
    }
    
    // Den Container für die Badges finden (wird in createFilterRowElement erstellt)
    const activeFiltersDisplayContainer = filterRow.querySelector(".db-active-filters-display");


    if (!applicantsListContainer.querySelector(".db-table-header.db-table-applicant")) {
      const headerElement = createApplicantTableHeaderElement();
      const currentFilterRow = applicantsListContainer.querySelector(".db-table-filter-row"); // Holen der aktuellen Filterzeile
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

    const jobCache = jobDataCache[jobId];
    if (!jobCache || !jobCache.sortedAndFilteredItems) {
      console.error(`DEBUG: Keine sortierten/gefilterten Daten im Cache für Job ${jobId}.`);
      spinnerDiv.remove(); 
      const errorText = document.createElement("p");
      errorText.classList.add("applicants-message");
      errorText.textContent = 'Fehler: Bewerberdaten konnten nicht geladen werden (Cache-Problem).';
      applicantsContentElement.appendChild(errorText);
      if (mainToggleButton) mainToggleButton.disabled = false;
      return;
    }

    const jobDetailsForRows = jobCache.jobDetails; 
    if (!jobDetailsForRows) {
      console.warn(`DEBUG: Job-Details für Job ${jobId} nicht im Cache beim Rendern der Bewerberzeilen.`);
    }

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
          if (applicantItemWithScore.status === 429) {
            errorMsg.textContent = `Bewerberdaten (ID: ${applicantItemWithScore.id || 'unbekannt'}) konnten wegen API-Limits nicht geladen werden.`;
          } else if (applicantItemWithScore.status === 404) {
            errorMsg.textContent = `Bewerber (ID: ${applicantItemWithScore.id || 'unbekannt'}) wurde nicht gefunden oder existiert nicht mehr.`;
          } else {
            errorMsg.textContent = applicantItemWithScore.message || `Daten für Bewerber ${applicantItemWithScore.id || 'unbekannt'} konnten nicht geladen werden.`;
          }
          applicantsContentElement.appendChild(errorMsg);
        }
      });
    }
    
    console.log(`DEBUG: Job ${jobId}, Seite ${pageNumber}: ${validApplicantsRenderedOnThisPage} Bewerber gerendert aus ${pageItems.length} Items für diese Seite.`);

    if (validApplicantsRenderedOnThisPage === 0 && allSortedAndFilteredItems.length > 0 && pageItems.length > 0) {
        const noDataMsg = document.createElement("p");
        noDataMsg.classList.add("applicants-message");
        noDataMsg.textContent = "Keine gültigen Bewerberdaten für diese Seite gefunden (möglicherweise alle mit Fehlern).";
        applicantsContentElement.appendChild(noDataMsg);
    } else if (allSortedAndFilteredItems.length === 0 && jobCache.allItems && jobCache.allItems.length > 0) {
        const noMatchMsg = document.createElement("p");
        noMatchMsg.classList.add("applicants-message");
        noMatchMsg.textContent = "Keine Bewerber entsprechen den aktuellen Filterkriterien oder konnten geladen werden.";
        applicantsContentElement.appendChild(noMatchMsg);
        if (paginationWrapper) paginationWrapper.style.display = "none";
    } else if (allSortedAndFilteredItems.length === 0) {
        const noApplicantsMsg = document.createElement("p");
        noApplicantsMsg.classList.add("applicants-message");
        noApplicantsMsg.textContent = "Für diesen Job liegen keine (gültigen) Bewerbungen vor oder es konnten keine geladen werden.";
        applicantsContentElement.appendChild(noApplicantsMsg);
        if (paginationWrapper) paginationWrapper.style.display = "none";
    }

    await renderPaginationControls(jobId, allSortedAndFilteredItems, applicantsContentElement, paginationWrapper, pageNumber, totalPages);
    
    // NEU: Aktive Filter-Badges rendern/aktualisieren
    if (activeFiltersDisplayContainer && renderActiveFilterBadgesUI) {
        renderActiveFilterBadgesUI(jobId, activeFiltersDisplayContainer, applicantsListContainer, paginationWrapper);
    } else {
        console.warn("Container für aktive Filter-Badges nicht gefunden oder renderActiveFilterBadgesUI nicht verfügbar.");
    }

    if (mainToggleButton) mainToggleButton.disabled = false; 
  }

  function renderMyJobsList(jobItemsToRender) { 
    const { createJobEntryElement } = window.WEBFLOW_API.ui;
    const container = document.getElementById("jobs-list");
    if (!container) {
      console.error("❌ Container 'jobs-list' nicht gefunden für renderMyJobsList.");
      return;
    }

    const existingJobItems = container.querySelectorAll(".my-job-item");
    existingJobItems.forEach(item => item.remove());

    const messages = container.querySelectorAll(".job-entry:not(.db-table-header)");
    messages.forEach(msg => {
        if (!msg.classList.contains("my-job-item")) { 
            msg.remove();
        }
    });

    if (jobItemsToRender.length === 0) {
      if (!container.querySelector(".info-message")) { 
        const noJobsMsg = document.createElement("p");
        noJobsMsg.textContent = "Keine Jobs entsprechen den aktuellen Filterkriterien.";
        noJobsMsg.classList.add("job-entry", "visible", "info-message"); 
        container.appendChild(noJobsMsg);
      }
      return;
    }

    const fragment = document.createDocumentFragment();
    let globalRateLimitMessageShown = false; 

    jobItemsToRender.forEach(jobItem => {
      if (jobItem.error && jobItem.status === 429) {
        console.warn(`Job (ID: ${jobItem.id || 'unbekannt'}) konnte wegen Rate Limit nicht geladen werden.`);
        if (!globalRateLimitMessageShown && !document.getElementById('global-rate-limit-message')) {
          const globalRateLimitInfo = document.createElement("p");
          globalRateLimitInfo.id = 'global-rate-limit-message';
          globalRateLimitInfo.textContent = "Hinweis: Einige Jobdaten konnten aufgrund von API-Anfragelimits nicht geladen werden. Die betroffenen Jobs werden nicht angezeigt.";
          globalRateLimitInfo.classList.add("job-entry", "visible", "error-message");
          if (container.firstChild && !container.firstChild.classList.contains("db-table-header")) {
            container.insertBefore(globalRateLimitInfo, container.firstChild.nextSibling); 
          } else if (container.firstChild && container.firstChild.classList.contains("db-table-header")){
             container.insertBefore(globalRateLimitInfo, container.firstChild.nextSibling);
          }
          else {
            container.appendChild(globalRateLimitInfo);
          }
          globalRateLimitMessageShown = true;
        }
        return; 
      }
      
      if (jobItem.error && jobItem.status === 404) {
          console.warn(`Job (ID: ${jobItem.id || 'unbekannt'}) wurde nicht gefunden (404) und wird nicht gerendert.`);
          return; 
      }

      const jobElement = createJobEntryElement(jobItem);
      if (jobElement) { 
        fragment.appendChild(jobElement);
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
  }

  function filterAndRenderJobs() {
    const cache = window.WEBFLOW_API.cache;
    if (!cache || !cache.allMyJobsData_MJ) {
        console.warn("Keine Job-Rohdaten im Cache zum Filtern vorhanden.");
        renderMyJobsList([]); 
        return;
    }

    const showActive = document.getElementById('job-status-active')?.checked;
    const showDone = document.getElementById('job-status-done')?.checked;
    
    const searchInput = document.getElementById('filter-search');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";

    console.log(`Filter-Status: Aktiv=${showActive}, Beendet=${showDone}, Suche='${searchTerm}'`);

    let filteredJobs = cache.allMyJobsData_MJ.filter(jobItem => {
        if (jobItem.error || !jobItem.fieldData) return false; 

        const status = getJobStatus(jobItem.fieldData); 

        let statusMatch = false;
        if (showActive && showDone) {
            statusMatch = true; 
        } else if (showActive) {
            statusMatch = (status === "Aktiv");
        } else if (showDone) {
            statusMatch = (status === "Beendet");
        } else if (!showActive && !showDone) {
             statusMatch = true; 
        }
        if (!statusMatch) return false;

        if (searchTerm) {
            const jobName = jobItem.fieldData.name ? jobItem.fieldData.name.toLowerCase() : "";
            if (!jobName.includes(searchTerm)) {
                return false;
            }
        }
        
        return true; 
    });

    renderMyJobsList(filteredJobs);
  }

  async function initializeMyJobsDisplay() {
    if (!window.WEBFLOW_API.config) {
        console.error("❌ Konfigurationsmodul nicht geladen. Breche initializeMyJobsDisplay ab.");
        const container = document.getElementById("jobs-list");
        if (container) container.innerHTML = "<p class='error-message job-entry visible'>Fehler: Konfiguration konnte nicht geladen werden.</p>";
        return;
    }
    const { API_CALL_DELAY_MS, USER_COLLECTION_ID_MJ, JOB_COLLECTION_ID_MJ, SKELETON_JOBS_COUNT_MJ } = window.WEBFLOW_API.config;
    
    if (!window.WEBFLOW_API.cache) {
        console.error("❌ Cache-Modul nicht geladen. Breche initializeMyJobsDisplay ab.");
        const container = document.getElementById("jobs-list");
        if (container) container.innerHTML = "<p class='error-message job-entry visible'>Fehler: Cache konnte nicht geladen werden.</p>";
        return;
    }
    const cache = window.WEBFLOW_API.cache;

    if (!window.WEBFLOW_API.services || !window.WEBFLOW_API.services.fetchWebflowItem) {
        console.error("❌ Service-Modul oder fetchWebflowItem nicht geladen. Breche initializeMyJobsDisplay ab.");
        const container = document.getElementById("jobs-list");
        if (container) container.innerHTML = "<p class='error-message job-entry visible'>Fehler: API-Services konnten nicht geladen werden.</p>";
        return;
    }
    const { fetchWebflowItem } = window.WEBFLOW_API.services;

    const { delay } = window.WEBFLOW_API.utils || { delay: ms => new Promise(resolve => setTimeout(resolve, ms))}; 

    if (!window.WEBFLOW_API.ui || !window.WEBFLOW_API.ui.renderMyJobsSkeletonLoader || !window.WEBFLOW_API.ui.createMyJobsTableHeaderElement) {
        console.error("❌ UI-Modul oder benötigte UI-Funktionen nicht geladen. Breche initializeMyJobsDisplay ab.");
        const container = document.getElementById("jobs-list");
        if (container) container.innerHTML = "<p class='error-message job-entry visible'>Fehler: UI-Komponenten konnten nicht geladen werden.</p>";
        return;
    }
    const { renderMyJobsSkeletonLoader, createMyJobsTableHeaderElement } = window.WEBFLOW_API.ui;


    const container = document.getElementById("jobs-list");
    if (!container) {
      console.error("❌ Container 'jobs-list' für initializeMyJobsDisplay nicht gefunden.");
      return;
    }
    
    if (!container.querySelector(".db-table-header.db-table-my-jobs")) {
        const myJobsHeader = createMyJobsTableHeaderElement();
        container.appendChild(myJobsHeader);
    }
    renderMyJobsSkeletonLoader(container, SKELETON_JOBS_COUNT_MJ); 

    try {
      if (typeof window.$memberstackDom === 'undefined') {
        console.log("Warte auf Memberstack...");
        await new Promise(resolve => {
          const interval = setInterval(() => {
            if (typeof window.$memberstackDom !== 'undefined') {
              clearInterval(interval);
              console.log("Memberstack geladen.");
              resolve();
            }
          }, 100);
        });
      }
      
      const member = await window.$memberstackDom.getCurrentMember();
      cache.currentWebflowMemberId_MJ = member?.data?.customFields?.['webflow-member-id'];

      if (!cache.currentWebflowMemberId_MJ) {
        console.error("❌ Kein 'webflow-member-id' im Memberstack-Profil gefunden.");
        container.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
        container.innerHTML += "<p class='error-message job-entry visible'>Benutzer-Identifikation via Memberstack fehlgeschlagen. Deine Jobs können nicht geladen werden.</p>";
        return;
      }
      console.log(`✅ MyJobs: Webflow Member ID: ${cache.currentWebflowMemberId_MJ}`);

      await delay(API_CALL_DELAY_MS); 
      const currentUserItem = await fetchWebflowItem(USER_COLLECTION_ID_MJ, cache.currentWebflowMemberId_MJ);

      if (!currentUserItem || (currentUserItem.error && currentUserItem.status !== 429 && currentUserItem.status !== 404)) {
        console.error("❌ Aktuelle Benutzerdaten nicht gefunden oder kritischer Fehler beim Abruf.", currentUserItem);
        let errorMsgText = "Deine Benutzerdaten konnten nicht geladen werden.";
        if(currentUserItem && currentUserItem.message) errorMsgText += ` Fehler: ${currentUserItem.message}`;
        container.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
        container.innerHTML += `<p class='error-message job-entry visible'>${errorMsgText}</p>`;
        return;
      }
      if (currentUserItem.error && currentUserItem.status === 429) {
        console.warn("Rate limit beim Abrufen des aktuellen Benutzers. Breche ab.");
        container.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
        container.innerHTML += `<p class='error-message job-entry visible'>Zu viele Anfragen beim Laden der initialen Benutzerdaten. Bitte versuche es später erneut.</p>`;
        return;
      }
       if (currentUserItem.error && currentUserItem.status === 404) {
        console.warn("Aktueller Benutzer nicht in der Webflow Collection gefunden (404).");
        container.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
        container.innerHTML += `<p class='error-message job-entry visible'>Dein Benutzerprofil wurde in Webflow nicht gefunden. Es können keine Jobs geladen werden.</p>`;
        return;
      }
      if (!currentUserItem.fieldData && !(currentUserItem.error)) { 
        console.error("❌ Benutzerdaten des aktuellen Users (fieldData) nicht gefunden, obwohl User existiert.", currentUserItem);
        filterAndRenderJobs(); 
        return;
      }

      const postedJobIds = currentUserItem.fieldData ? currentUserItem.fieldData["posted-jobs"] || [] : [];
      console.log(`User hat ${postedJobIds.length} Jobs im Feld 'posted-jobs'.`);

      if (postedJobIds.length === 0) {
        filterAndRenderJobs(); 
        return;
      }

      let myJobItemsPromises = postedJobIds.map(async (jobId, index) => {
        await delay(index * API_CALL_DELAY_MS); 
        console.log(`Fetching job item: ${jobId}`);
        const jobItem = await fetchWebflowItem(JOB_COLLECTION_ID_MJ, jobId);
        if (jobItem) {
          return jobItem;
        } else {
          console.warn(`Job ${jobId} führte zu einer unerwarteten null-Antwort von fetchWebflowItem.`);
          return { id: jobId, error: true, status: 'fetch_null_error', message: `Unerwartete null-Antwort für Job ${jobId}.` };
        }
      });
      
      const myJobItemsResults = await Promise.all(myJobItemsPromises);
      cache.allMyJobsData_MJ = myJobItemsResults.filter(item => item !== null); 

      console.log("--- Überprüfung der geladenen Job-Daten (allMyJobsData_MJ) ---");
      cache.allMyJobsData_MJ.forEach(job => {
        if (job.error) {
          console.log(`Job ID: ${job.id}, Fehler: ${job.message}, Status: ${job.status}`);
        } else if (job.fieldData) {
          console.log(`Job ID: ${job.id}, Name: ${job.fieldData.name}, Bewerber IDs im Job-Objekt: ${JSON.stringify(job.fieldData["bewerber"] || [])}`);
        } else {
          console.log(`Job ID: ${job.id}, Unerwarteter Zustand (weder fieldData noch error-Property). Item:`, job);
        }
      });
      console.log("-----------------------------------------------------");
      
      container.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
      filterAndRenderJobs(); 

    } catch (error) {
      console.error("❌ Schwerwiegender Fehler in initializeMyJobsDisplay:", error);
      container.querySelectorAll(".my-job-item-skeleton").forEach(el => el.remove());
      if (container) {
        container.innerHTML += `<p class='error-message job-entry visible'>Ein allgemeiner Fehler ist aufgetreten: ${error.message}. Bitte versuche es später erneut.</p>`;
      }
    }
  }


  window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob = loadAndDisplayApplicantsForJob;
  window.WEBFLOW_API.appLogic.filterAndRenderJobs = filterAndRenderJobs; 
  window.WEBFLOW_API.appLogic.initializeMyJobsDisplay = initializeMyJobsDisplay;

})();
