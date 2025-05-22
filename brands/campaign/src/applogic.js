(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.appLogic = window.WEBFLOW_API.appLogic || {};

  // Abhängigkeiten aus dem globalen Namespace
  // Diese werden aufgelöst, sobald die entsprechenden Module geladen wurden.
  // z.B. const { fetchWebflowItem, fetchAllApplicantsForJob } = window.WEBFLOW_API.services;
  // const { jobDataCache, currentApplicantPageSize, ... } = window.WEBFLOW_API.cache;
  // const { MAPPINGS, config } = window.WEBFLOW_API; (config ist window.WEBFLOW_API.config)
  // const { renderMyJobsSkeletonLoader, createJobEntryElement, ... } = window.WEBFLOW_API.ui;
  // const { sortApplicantsGlobally } = window.WEBFLOW_API.core;
  // const { delay } = window.WEBFLOW_API.utils;


  /**
   * Lädt und zeigt die Bewerber für einen bestimmten Job an, inklusive Filter, Header und Paginierung.
   * @param {string} jobId - Die ID des Jobs.
   * @param {HTMLElement} applicantsListContainer - Der Hauptcontainer für die Bewerberliste dieses Jobs.
   * @param {HTMLElement} paginationWrapper - Der Container für die Paginierungs-Controls.
   * @param {number} [pageNumber=1] - Die anzuzeigende Seitenzahl.
   */
  async function loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, pageNumber = 1) {
    console.log(`DEBUG: loadAndDisplayApplicantsForJob START - Job ID: ${jobId}, Page: ${pageNumber}`);
    
    // Abhängigkeiten holen, da diese Funktion auch von außerhalb (Pagination) aufgerufen wird
    const { jobDataCache, currentApplicantPageSize } = window.WEBFLOW_API.cache;
    const { createFilterRowElement, createApplicantTableHeaderElement, createApplicantRowElement, renderPaginationControls } = window.WEBFLOW_API.ui;
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS;


    const mainToggleButton = document.querySelector(`.my-job-item[data-job-id="${jobId}"] .db-table-applicants`);
    if (mainToggleButton) mainToggleButton.style.pointerEvents = 'none'; // Interaktion während Laden verhindern

    // Filterzeile hinzufügen, falls nicht vorhanden
    if (!applicantsListContainer.querySelector(".db-table-filter-row")) {
      const filterRowElement = createFilterRowElement(jobId, applicantsListContainer, paginationWrapper);
      applicantsListContainer.insertBefore(filterRowElement, applicantsListContainer.firstChild);
    }

    // Tabellenheader hinzufügen, falls nicht vorhanden
    if (!applicantsListContainer.querySelector(".db-table-header.db-table-applicant")) {
      const headerElement = createApplicantTableHeaderElement();
      const filterRow = applicantsListContainer.querySelector(".db-table-filter-row");
      if (filterRow && filterRow.nextSibling) {
        applicantsListContainer.insertBefore(headerElement, filterRow.nextSibling);
      } else if (filterRow) {
        applicantsListContainer.appendChild(headerElement);
      } else {
        // Sollte nicht passieren, wenn Filter Row immer zuerst da ist
        applicantsListContainer.insertBefore(headerElement, applicantsListContainer.firstChild);
      }
    }

    // Content-Bereich für die eigentlichen Bewerberzeilen sicherstellen
    let applicantsContentElement = applicantsListContainer.querySelector(".actual-applicants-content");
    if (!applicantsContentElement) {
      applicantsContentElement = document.createElement("div");
      applicantsContentElement.classList.add("actual-applicants-content");
      const header = applicantsListContainer.querySelector(".db-table-header.db-table-applicant");
      if (header && header.nextSibling) {
        applicantsListContainer.insertBefore(applicantsContentElement, header.nextSibling);
      } else if (header) { // Falls Header das letzte Element war (unwahrscheinlich)
        applicantsListContainer.appendChild(applicantsContentElement);
      } else { // Falls weder Filter noch Header da waren (sehr unwahrscheinlich)
         applicantsListContainer.appendChild(applicantsContentElement);
      }
    }

    applicantsContentElement.innerHTML = ''; // Alten Inhalt leeren
    applicantsListContainer.dataset.currentPage = pageNumber;

    const loadingMessage = document.createElement("p");
    loadingMessage.classList.add("applicants-message");
    loadingMessage.textContent = `Lade Bewerber (Seite ${pageNumber})...`;
    applicantsContentElement.appendChild(loadingMessage);

    const jobCache = jobDataCache[jobId];
    if (!jobCache || !jobCache.sortedAndFilteredItems) {
      console.error(`DEBUG: Keine sortierten/gefilterten Daten im Cache für Job ${jobId}.`);
      loadingMessage.textContent = 'Fehler: Bewerberdaten konnten nicht geladen werden (Cache-Problem).';
      if (mainToggleButton) mainToggleButton.style.pointerEvents = 'auto';
      return;
    }

    const jobDetailsForRows = jobCache.jobDetails; // Für Tooltips in createApplicantRowElement (falls noch verwendet)
    if (!jobDetailsForRows) {
      console.warn(`DEBUG: Job-Details für Job ${jobId} nicht im Cache beim Rendern der Bewerberzeilen.`);
    }

    const allSortedAndFilteredItems = jobCache.sortedAndFilteredItems;
    const totalPages = Math.ceil(allSortedAndFilteredItems.length / currentApplicantPageSize);
    const offset = (pageNumber - 1) * currentApplicantPageSize;
    const pageItems = allSortedAndFilteredItems.slice(offset, offset + currentApplicantPageSize);
    
    loadingMessage.remove(); // Lade-Nachricht entfernen

    let validApplicantsRenderedOnThisPage = 0;
    if (pageItems.length > 0) {
      pageItems.forEach(applicantItemWithScore => {
        if (applicantItemWithScore && applicantItemWithScore.fieldData && !applicantItemWithScore.error) {
          const applicantRow = createApplicantRowElement(applicantItemWithScore, jobDetailsForRows);
          applicantsContentElement.appendChild(applicantRow);
          // Fade-in Animation
          requestAnimationFrame(() => {
            applicantRow.style.opacity = "0";
            requestAnimationFrame(() => {
              applicantRow.style.transition = "opacity 0.3s ease-in-out";
              applicantRow.style.opacity = "1";
            });
          });
          validApplicantsRenderedOnThisPage++;
        } else if (applicantItemWithScore && applicantItemWithScore.error) {
          // Fehler beim Laden eines einzelnen Bewerbers anzeigen
          const errorMsg = document.createElement("p");
          errorMsg.classList.add("applicants-message", "error-message-small"); // Kleinere Fehlermeldung
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
        // Fall: Es gab ursprünglich Bewerber, aber nach Filterung keine mehr
        const noMatchMsg = document.createElement("p");
        noMatchMsg.classList.add("applicants-message");
        noMatchMsg.textContent = "Keine Bewerber entsprechen den aktuellen Filterkriterien oder konnten geladen werden.";
        applicantsContentElement.appendChild(noMatchMsg);
        if (paginationWrapper) paginationWrapper.style.display = "none";
    } else if (allSortedAndFilteredItems.length === 0) {
        // Fall: Generell keine Bewerber (oder alle mit Fehlern und keine Rohdaten)
        const noApplicantsMsg = document.createElement("p");
        noApplicantsMsg.classList.add("applicants-message");
        noApplicantsMsg.textContent = "Für diesen Job liegen keine (gültigen) Bewerbungen vor oder es konnten keine geladen werden.";
        applicantsContentElement.appendChild(noApplicantsMsg);
        if (paginationWrapper) paginationWrapper.style.display = "none";
    }


    // Paginierung rendern (oder ausblenden, falls nur eine Seite)
    await renderPaginationControls(jobId, allSortedAndFilteredItems, applicantsContentElement, paginationWrapper, pageNumber, totalPages);
    if (mainToggleButton) mainToggleButton.style.pointerEvents = 'auto'; // Interaktion wieder erlauben
    applicantsListContainer.dataset.allApplicantsLoaded = 'true'; // Markieren, dass die Anzeige aktualisiert wurde
  }


  /**
   * Rendert die Liste der Jobs des aktuellen Nutzers.
   * @param {object[]} jobItems - Array von Job-Item-Objekten.
   */
  function renderMyJobsList(jobItems) {
    const { createJobEntryElement } = window.WEBFLOW_API.ui;

    const container = document.getElementById("jobs-list");
    if (!container) {
      console.error("❌ Container 'jobs-list' nicht gefunden für renderMyJobsList.");
      return;
    }
    container.innerHTML = ""; // Alten Inhalt leeren

    if (jobItems.length === 0) {
      const noJobsMsg = document.createElement("p");
      noJobsMsg.textContent = "Du hast noch keine Jobs erstellt oder es wurden keine Jobs gefunden, die dir gehören.";
      noJobsMsg.classList.add("job-entry", "visible", "info-message"); // Sichtbar machen
      container.appendChild(noJobsMsg);
      return;
    }

    const fragment = document.createDocumentFragment();
    let globalRateLimitMessageShown = false;

    jobItems.forEach(jobItem => {
      // Spezielle Behandlung für Rate Limit Fehler, um eine globale Nachricht anzuzeigen
      if (jobItem.error && jobItem.status === 429) {
        console.warn(`Job (ID: ${jobItem.id || 'unbekannt'}) konnte wegen Rate Limit nicht geladen werden.`);
        if (!globalRateLimitMessageShown && !document.getElementById('global-rate-limit-message')) {
          const globalRateLimitInfo = document.createElement("p");
          globalRateLimitInfo.id = 'global-rate-limit-message';
          globalRateLimitInfo.textContent = "Hinweis: Einige Jobdaten konnten aufgrund von API-Anfragelimits nicht geladen werden. Die betroffenen Jobs werden nicht angezeigt.";
          globalRateLimitInfo.classList.add("job-entry", "visible", "error-message");
          // Füge die Nachricht oben in der Liste ein
          if (container.firstChild) container.insertBefore(globalRateLimitInfo, container.firstChild);
          else container.appendChild(globalRateLimitInfo);
          globalRateLimitMessageShown = true;
        }
        return; // Diesen Job nicht rendern
      }
      
      // Behandlung für 404 (Job nicht gefunden) - Job einfach nicht rendern
      if (jobItem.error && jobItem.status === 404) {
          console.warn(`Job (ID: ${jobItem.id || 'unbekannt'}) wurde nicht gefunden (404) und wird nicht gerendert.`);
          return; // Job nicht rendern
      }

      // Für andere Fehler oder wenn jobFieldData fehlt, gibt createJobEntryElement ein Fehlerelement oder null zurück
      const jobElement = createJobEntryElement(jobItem);
      if (jobElement) { // Nur hinzufügen, wenn ein gültiges Element zurückgegeben wurde
        fragment.appendChild(jobElement);
      }
    });

    container.appendChild(fragment);

    // Fade-in Animation für alle gültigen Job-Einträge
    requestAnimationFrame(() => {
      container.querySelectorAll(".my-job-item.job-entry:not(.job-error)").forEach(entry => {
        // Stelle sicher, dass es nicht schon sichtbar ist, um Re-Animation zu vermeiden
        if (!entry.classList.contains("visible")) {
            entry.style.opacity = "0";
            requestAnimationFrame(() => {
                entry.style.transition = "opacity 0.5s ease-out";
                entry.style.opacity = "1";
                entry.classList.add("visible");
            });
        } else { // Wenn es schon visible ist (z.B. durch Skeleton), nur Opazität setzen
            entry.style.opacity = "1";
        }
      });
      // Auch Fehlermeldungen sichtbar machen, falls sie nicht schon sind
       container.querySelectorAll(".job-entry.error-message, .job-entry.info-message").forEach(msg => {
           if (!msg.classList.contains("visible")) {
               msg.classList.add("visible"); // Direkt sichtbar, keine Animation für Fehler/Info
           }
       });
    });
  }


  /**
   * Hauptfunktion zum Abrufen und Anzeigen der Jobs und deren Bewerber.
   */
  async function initializeMyJobsDisplay() {
    const { API_CALL_DELAY_MS, USER_COLLECTION_ID_MJ, JOB_COLLECTION_ID_MJ, SKELETON_JOBS_COUNT_MJ } = window.WEBFLOW_API.config;
    const cache = window.WEBFLOW_API.cache;
    const { fetchWebflowItem } = window.WEBFLOW_API.services;
    const { delay } = window.WEBFLOW_API.utils;
    const { renderMyJobsSkeletonLoader } = window.WEBFLOW_API.ui;


    const container = document.getElementById("jobs-list");
    if (!container) {
      console.error("❌ Container 'jobs-list' für initializeMyJobsDisplay nicht gefunden.");
      return;
    }
    renderMyJobsSkeletonLoader(container, SKELETON_JOBS_COUNT_MJ);

    try {
      // Auf Memberstack warten (falls nicht schon geladen)
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
        container.innerHTML = "<p class='error-message job-entry visible'>Benutzer-Identifikation via Memberstack fehlgeschlagen. Deine Jobs können nicht geladen werden.</p>";
        return;
      }
      console.log(`✅ MyJobs: Webflow Member ID: ${cache.currentWebflowMemberId_MJ}`);

      await delay(API_CALL_DELAY_MS); // Kurze Pause vor dem ersten API-Call
      const currentUserItem = await fetchWebflowItem(USER_COLLECTION_ID_MJ, cache.currentWebflowMemberId_MJ);

      if (!currentUserItem || (currentUserItem.error && currentUserItem.status !== 429 && currentUserItem.status !== 404)) {
        console.error("❌ Aktuelle Benutzerdaten nicht gefunden oder kritischer Fehler beim Abruf.", currentUserItem);
        let errorMsgText = "Deine Benutzerdaten konnten nicht geladen werden.";
        if(currentUserItem && currentUserItem.message) errorMsgText += ` Fehler: ${currentUserItem.message}`;
        container.innerHTML = `<p class='error-message job-entry visible'>${errorMsgText}</p>`;
        return;
      }
      if (currentUserItem.error && currentUserItem.status === 429) {
        console.warn("Rate limit beim Abrufen des aktuellen Benutzers. Breche ab.");
        container.innerHTML = `<p class='error-message job-entry visible'>Zu viele Anfragen beim Laden der initialen Benutzerdaten. Bitte versuche es später erneut.</p>`;
        return;
      }
       if (currentUserItem.error && currentUserItem.status === 404) {
        console.warn("Aktueller Benutzer nicht in der Webflow Collection gefunden (404).");
        container.innerHTML = `<p class='error-message job-entry visible'>Dein Benutzerprofil wurde in Webflow nicht gefunden. Es können keine Jobs geladen werden.</p>`;
        return;
      }
      if (!currentUserItem.fieldData && !(currentUserItem.error)) { // Fehlerfall wurde oben behandelt
        console.error("❌ Benutzerdaten des aktuellen Users (fieldData) nicht gefunden, obwohl User existiert.", currentUserItem);
        renderMyJobsList([]); // Leere Liste rendern (zeigt "keine Jobs" Nachricht)
        return;
      }

      const postedJobIds = currentUserItem.fieldData ? currentUserItem.fieldData["posted-jobs"] || [] : [];
      console.log(`User hat ${postedJobIds.length} Jobs im Feld 'posted-jobs'.`);

      if (postedJobIds.length === 0) {
        renderMyJobsList([]); // Leere Liste rendern (zeigt "keine Jobs" Nachricht)
        return;
      }

      let myJobItemsPromises = postedJobIds.map(async (jobId, index) => {
        await delay(index * API_CALL_DELAY_MS); // Staffelung der Job-Abrufe
        console.log(`Fetching job item: ${jobId}`);
        const jobItem = await fetchWebflowItem(JOB_COLLECTION_ID_MJ, jobId);
        if (jobItem) {
          return jobItem;
        } else {
          // Sollte durch fetchWebflowItem abgedeckt sein, das ein Fehlerobjekt zurückgibt
          console.warn(`Job ${jobId} führte zu einer unerwarteten null-Antwort von fetchWebflowItem.`);
          return { id: jobId, error: true, status: 'fetch_null_error', message: `Unerwartete null-Antwort für Job ${jobId}.` };
        }
      });
      
      const myJobItemsResults = await Promise.all(myJobItemsPromises);
      cache.allMyJobsData_MJ = myJobItemsResults.filter(item => item !== null); // Filtere null-Werte (sollte nicht passieren)

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
      
      // Filtere Jobs, die aufgrund von 429 (Rate Limit) oder 404 (Nicht gefunden) nicht geladen werden konnten,
      // bevor sie an renderMyJobsList übergeben werden. Die Funktion behandelt diese Fälle dann intern.
      // Hier geht es darum, dass die globale allMyJobsData_MJ diese Fehlerobjekte enthält.
      // renderMyJobsList wird die spezifischen Nachrichten dafür anzeigen.
      const displayableJobs = cache.allMyJobsData_MJ; // renderMyJobsList kümmert sich um die Anzeige von Fehlern

      if (displayableJobs.length === 0 && postedJobIds.length > 0) {
         // Dieser Fall tritt ein, wenn alle Jobs Fehler hatten (z.B. alle 404 oder alle Rate Limited)
        container.innerHTML = `<p class='info-message job-entry visible'>Keine deiner Jobs konnten geladen oder verarbeitet werden. Überprüfe die Konsole für Details.</p>`;
        return;
      }
      
      renderMyJobsList(displayableJobs);

    } catch (error) {
      console.error("❌ Schwerwiegender Fehler in initializeMyJobsDisplay:", error);
      if (container) {
        container.innerHTML = `<p class='error-message job-entry visible'>Ein allgemeiner Fehler ist aufgetreten: ${error.message}. Bitte versuche es später erneut.</p>`;
      }
    }
  }


  // Exponieren der Hauptlogikfunktionen
  window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob = loadAndDisplayApplicantsForJob;
  window.WEBFLOW_API.appLogic.renderMyJobsList = renderMyJobsList;
  window.WEBFLOW_API.appLogic.initializeMyJobsDisplay = initializeMyJobsDisplay;

})();
