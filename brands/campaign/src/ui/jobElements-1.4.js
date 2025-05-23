(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  // Abhängigkeiten (werden zur Laufzeit über window.WEBFLOW_API aufgelöst)
  // MAPPINGS, jobDataCache, fetchAllApplicantsForJob, sortApplicantsGlobally, loadAndDisplayApplicantsForJob

  /**
   * Formatiert ein Datum in das Format DD.MM.YYYY.
   * @param {string | Date} dateInput - Das Eingabedatum (String oder Date-Objekt).
   * @returns {string} Das formatierte Datum oder "K.A." bei ungültiger Eingabe.
   */
  function formatDate(dateInput) {
    if (!dateInput) return "K.A.";
    try {
      const date = new Date(dateInput);
      // Setze die Uhrzeit auf Mitternacht, um nur das Datum zu vergleichen
      date.setHours(0, 0, 0, 0);
      if (isNaN(date.getTime())) return "K.A."; // Ungültiges Datum
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Monate sind 0-basiert
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch (e) {
      console.warn("Fehler beim Formatieren des Datums:", dateInput, e);
      return "K.A.";
    }
  }

  /**
   * Erstellt und gibt das DOM-Fragment für einen einzelnen Job-Eintrag zurück.
   * Inklusive Header, Toggle-Switch und Container für Bewerber.
   * @param {object} jobItem - Das Job-Item-Objekt von Webflow.
   * @returns {DocumentFragment | HTMLElement} Das DOM-Element des Jobs oder ein Fragment bei Fehlern.
   */
  function createJobEntryElement(jobItem) {
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS;
    const jobDataCache = window.WEBFLOW_API.cache.jobDataCache;
    const { fetchAllApplicantsForJob } = window.WEBFLOW_API.services;
    const { sortApplicantsGlobally } = window.WEBFLOW_API.core;
    // loadAndDisplayApplicantsForJob wird aus appLogic geholt

    const jobFieldData = jobItem.fieldData; 

    if (jobItem.error && jobItem.status !== 429 && jobItem.status !== 404) { 
        console.warn(`Job (ID: ${jobItem.id || 'unbekannt'}) konnte nicht geladen werden: ${jobItem.message}. Er wird nicht gerendert.`);
        const errorP = document.createElement('p');
        errorP.textContent = `Job ${jobItem.id || 'unbekannt'} konnte nicht geladen werden.`;
        errorP.classList.add("job-entry", "visible", "error-message");
        return errorP;
    }
    
    if (!jobFieldData && !jobItem.error) { 
      console.warn("Job-Item ohne fieldData übersprungen:", jobItem);
      const errorP = document.createElement('p');
      errorP.textContent = `Jobdaten für ${jobItem.id || 'unbekannt'} sind unvollständig.`;
      errorP.classList.add("job-entry", "visible", "error-message");
      return errorP;
    }
     if (!jobFieldData && jobItem.error) { 
        return null; 
    }


    const jobWrapper = document.createElement("div");
    jobWrapper.classList.add("my-job-item", "job-entry"); 
    jobWrapper.dataset.jobId = jobItem.id;

    const jobHeaderDiv = document.createElement("div");
    jobHeaderDiv.classList.add("db-table-row", "db-table-my-job");

    // 1. Kampagne (Job-Name und Bild)
    const jobInfoDataCell = document.createElement("div");
    jobInfoDataCell.classList.add("db-table-row-item", "justify-left");
    if (jobFieldData["job-image"]?.url || jobFieldData["job-image"]) {
      const jobImg = document.createElement("img");
      jobImg.classList.add("db-table-img", "is-margin-right-12");
      jobImg.src = jobFieldData["job-image"].url || jobFieldData["job-image"];
      jobImg.alt = jobFieldData.name || "Job Bild";
      jobImg.onerror = () => { jobImg.src = 'https://placehold.co/100x100/E0E0E0/BDBDBD?text=Bildfehler'; };
      jobInfoDataCell.appendChild(jobImg);
    }
    const jobNameSpan = document.createElement("span");
    jobNameSpan.classList.add("truncate");
    jobNameSpan.textContent = jobFieldData.name || "Unbenannter Job";
    jobInfoDataCell.appendChild(jobNameSpan);
    jobHeaderDiv.appendChild(jobInfoDataCell);

    // 2. Online bis
    const onlineBisCell = document.createElement("div");
    onlineBisCell.classList.add("db-table-row-item");
    const onlineBisTag = document.createElement("span");
    onlineBisTag.classList.add("job-tag", "customer"); // Klasse "customer" hinzugefügt
    onlineBisTag.textContent = formatDate(jobFieldData["job-date-end"]); // CMS-Feld "job-date-end" verwenden
    onlineBisCell.appendChild(onlineBisTag);
    jobHeaderDiv.appendChild(onlineBisCell);

    // 3. Budget (Honorar)
    const paymentCell = document.createElement("div");
    paymentCell.classList.add("db-table-row-item");
    const paymentTag = document.createElement("span");
    paymentTag.classList.add("job-tag", "customer"); // Klasse "customer" hinzugefügt
    paymentTag.textContent = jobFieldData["job-payment"] ? `${jobFieldData["job-payment"]} €` : "K.A.";
    paymentCell.appendChild(paymentTag);
    jobHeaderDiv.appendChild(paymentCell);

    // 4. Kategorie
    const categoryCell = document.createElement("div");
    categoryCell.classList.add("db-table-row-item");
    const categoryTag = document.createElement("span");
    categoryTag.classList.add("job-tag", "customer"); // Klasse "customer" hinzugefügt
    categoryTag.textContent = jobFieldData["industrie-kategorie"] || "K.A.";
    categoryCell.appendChild(categoryTag);
    jobHeaderDiv.appendChild(categoryCell);

    // 5. Bewerber (Anzahl)
    const applicantIdsForThisSpecificJob = jobFieldData["bewerber"] || [];
    const applicantsCountCell = document.createElement("div");
    applicantsCountCell.classList.add("db-table-row-item");
    const applicantsCountTag = document.createElement("span");
    applicantsCountTag.classList.add("job-tag", "customer"); // Klasse "customer" hinzugefügt
    applicantsCountTag.textContent = `${applicantIdsForThisSpecificJob.length}`;
    applicantsCountCell.appendChild(applicantsCountTag);
    jobHeaderDiv.appendChild(applicantsCountCell);

    // 6. Status (basierend auf job-date-end)
    const statusCell = document.createElement("div");
    statusCell.classList.add("db-table-row-item");
    const statusTag = document.createElement("div"); 
    statusTag.classList.add("job-tag"); // Behält div und spezifische Hintergrundklassen

    const jobEndDateString = jobFieldData["job-date-end"];
    if (jobEndDateString) {
        try {
            const jobEndDate = new Date(jobEndDateString);
            jobEndDate.setHours(23, 59, 59, 999); // Ende des Tages für den Vergleich
            const today = new Date();
            today.setHours(0,0,0,0); // Anfang des heutigen Tages

            if (jobEndDate >= today) {
                statusTag.textContent = "Aktiv";
                statusTag.classList.add("is-bg-light-green");
            } else {
                statusTag.textContent = "Beendet";
                statusTag.classList.add("is-bg-light-red");
            }
        } catch (e) {
            console.warn("Konnte Job-Enddatum nicht verarbeiten:", jobEndDateString, e);
            statusTag.textContent = "Unbekannt";
        }
    } else {
        statusTag.textContent = "Unbekannt"; // Falls kein Enddatum vorhanden ist
    }
    statusCell.appendChild(statusTag);
    jobHeaderDiv.appendChild(statusCell);
    
    // 7. Toggle-Switch "Bewerber anzeigen" - NEUE STRUKTUR
    const toggleCell = document.createElement("div");
    toggleCell.classList.add("db-table-row-item", "cell-align-center"); 

    const toggleLabelElement = document.createElement("label"); // Parent ist jetzt das Label
    toggleLabelElement.classList.add("toggle-show-list");
    // Das Label braucht kein 'for', wenn die Checkbox ein direktes Kind ist,
    // aber es schadet auch nicht, wenn die ID der Checkbox gesetzt ist.
    // toggleLabelElement.htmlFor = `toggle-applicants-${jobItem.id}`;


    const toggleCheckbox = document.createElement("input");
    toggleCheckbox.type = "checkbox";
    toggleCheckbox.classList.add("checkbox-toggle"); // Behält diese Klasse für den Event-Listener
    toggleCheckbox.id = `toggle-applicants-${jobItem.id}`; 

    const toggleSliderSpan = document.createElement("span");
    toggleSliderSpan.classList.add("toggle-slider-show-list");

    toggleLabelElement.appendChild(toggleCheckbox);
    toggleLabelElement.appendChild(toggleSliderSpan);
    toggleCell.appendChild(toggleLabelElement); // Das Label wird der Zelle hinzugefügt
    jobHeaderDiv.appendChild(toggleCell);


    jobWrapper.appendChild(jobHeaderDiv);

    const applicantsListContainer = document.createElement("div");
    applicantsListContainer.classList.add("applicants-list-container");
    applicantsListContainer.style.display = "none";
    applicantsListContainer.dataset.jobId = jobItem.id; 
    applicantsListContainer.dataset.allApplicantsLoaded = 'false'; 
    jobWrapper.appendChild(applicantsListContainer);

    let paginationWrapper = jobWrapper.querySelector(".db-table-pagination");
    if (!paginationWrapper) {
      paginationWrapper = document.createElement("div");
      paginationWrapper.classList.add("db-table-pagination");
      jobWrapper.appendChild(paginationWrapper); 
    }
    paginationWrapper.style.display = "none";

    toggleCheckbox.addEventListener("change", async () => {
      const isChecked = toggleCheckbox.checked;
      if (isChecked) {
        applicantsListContainer.style.display = "block";
        if (!jobDataCache[jobItem.id]) {
          jobDataCache[jobItem.id] = { activeFilters: { follower: [], category: [], creatorType: [], relevantOnly: false } };
        }
        jobDataCache[jobItem.id].jobDetails = jobFieldData; 

        const applicantIds = jobFieldData["bewerber"] || [];
        if (!jobDataCache[jobItem.id].allItems || jobDataCache[jobItem.id].allItems.length !== applicantIds.length || applicantsListContainer.dataset.allApplicantsLoaded === 'false') {
          applicantsListContainer.innerHTML = ''; 
          const loadingAllMsg = document.createElement("p");
          loadingAllMsg.classList.add("applicants-message");
          loadingAllMsg.textContent = "Lade alle Bewerberdaten für Sortierung und Filterung...";
          applicantsListContainer.appendChild(loadingAllMsg);

          const fetchedItems = await fetchAllApplicantsForJob(jobItem.id, applicantIds);
          loadingAllMsg.remove();
          jobDataCache[jobItem.id].allItems = fetchedItems;
          applicantsListContainer.dataset.allApplicantsLoaded = 'true';
        }
        
        if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.applyAndReloadApplicants) {
            await window.WEBFLOW_API.core.applyAndReloadApplicants(jobItem.id, applicantsListContainer, paginationWrapper);
        } else {
            jobDataCache[jobItem.id].sortedAndFilteredItems = sortApplicantsGlobally(
                jobDataCache[jobItem.id].allItems, 
                jobDataCache[jobItem.id].jobDetails
            );
            if (window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob) {
                await window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob(jobItem.id, applicantsListContainer, paginationWrapper, 1);
            } else {
                console.error("loadAndDisplayApplicantsForJob nicht gefunden in appLogic");
                applicantsListContainer.innerHTML = "<p class='applicants-message error-message'>Fehler beim Laden der Bewerberanzeige.</p>";
            }
        }
      } else {
        applicantsListContainer.style.display = "none";
        if(paginationWrapper) paginationWrapper.style.display = "none";
      }
    });

    return jobWrapper;
  }
  
  /**
   * Erstellt den Header für die "Meine Jobs"-Tabelle.
   * @returns {HTMLElement} Das Header-DOM-Element.
   */
  function createMyJobsTableHeaderElement() {
    const headerDiv = document.createElement("div");
    headerDiv.classList.add("db-table-header", "db-table-my-jobs"); 

    const columns = [
        { text: "Kampagne", classes: ["justify-left", "flex-grow-2"] }, 
        { text: "Online bis", classes: [] },
        { text: "Budget", classes: [] },
        { text: "Kategorie", classes: [] },
        { text: "Bewerber", classes: ["cell-align-center"] }, 
        { text: "Status", classes: [] }, 
        { text: "Bewerber Anzeigen", icon: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/68301a7669101ccdf5c57eff_eye.svg", alt: "Anzeigen", classes: ["cell-align-center"] } 
    ];

    columns.forEach(colInfo => {
        const colDiv = document.createElement("div");
        colDiv.classList.add("db-table-row-item");
        if (colInfo.classes) {
            colInfo.classes.forEach(cls => colDiv.classList.add(cls));
        }

        if (colInfo.text && !colInfo.icon) { 
            const textSpan = document.createElement("span");
            textSpan.classList.add("is-txt-16", "is-txt-bold"); 
            textSpan.textContent = colInfo.text;
            colDiv.appendChild(textSpan);
        } else if (colInfo.icon && colInfo.text) { 
             const iconImg = document.createElement("img");
            iconImg.src = colInfo.icon;
            iconImg.alt = colInfo.alt || "Icon";
            iconImg.classList.add("db-icon-24", "is-margin-right-small"); 
            colDiv.appendChild(iconImg);
            const textSpan = document.createElement("span");
            textSpan.classList.add("is-txt-16", "is-txt-bold"); 
            textSpan.textContent = colInfo.text;
            colDiv.appendChild(textSpan);
            colDiv.style.display = "flex"; 
            colDiv.style.alignItems = "center";
        } else if (colInfo.icon) { 
             const iconImg = document.createElement("img");
            iconImg.src = colInfo.icon;
            iconImg.alt = colInfo.alt || "Icon";
            iconImg.classList.add("db-icon-24"); 
            colDiv.appendChild(iconImg);
        }
        headerDiv.appendChild(colDiv);
    });
    return headerDiv;
  }


  // Exponieren der UI-Funktionen
  window.WEBFLOW_API.ui.createJobEntryElement = createJobEntryElement;
  window.WEBFLOW_API.ui.createMyJobsTableHeaderElement = createMyJobsTableHeaderElement; 

})();
