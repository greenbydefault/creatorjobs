(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  // Abhängigkeiten (werden zur Laufzeit über window.WEBFLOW_API aufgelöst)
  // MAPPINGS, jobDataCache, fetchAllApplicantsForJob, sortApplicantsGlobally, loadAndDisplayApplicantsForJob

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

    // jobFieldData hier definieren, bevor es verwendet wird
    const jobFieldData = jobItem.fieldData; 

    if (jobItem.error && jobItem.status !== 429 && jobItem.status !== 404) { 
        console.warn(`Job (ID: ${jobItem.id || 'unbekannt'}) konnte nicht geladen werden: ${jobItem.message}. Er wird nicht gerendert.`);
        const errorP = document.createElement('p');
        errorP.textContent = `Job ${jobItem.id || 'unbekannt'} konnte nicht geladen werden.`;
        errorP.classList.add("job-entry", "visible", "error-message");
        return errorP;
    }
    
    // Überprüfung, ob jobFieldData existiert, NACHDEM es definiert wurde
    if (!jobFieldData && !jobItem.error) { 
      console.warn("Job-Item ohne fieldData übersprungen:", jobItem);
      const errorP = document.createElement('p');
      errorP.textContent = `Jobdaten für ${jobItem.id || 'unbekannt'} sind unvollständig.`;
      errorP.classList.add("job-entry", "visible", "error-message");
      return errorP;
    }
    // Diese Bedingung prüft, ob es ein Fehlerobjekt ist UND jobFieldData nicht existiert (was bei Fehlerobjekten der Fall sein sollte)
     if (!jobFieldData && jobItem.error) { 
        // Wenn es ein Fehlerobjekt ist (z.B. 404, 429), wird es von der aufrufenden Funktion (renderMyJobsList) behandelt
        // oder hier könnte ein spezifisches Fehlerelement zurückgegeben werden, falls renderMyJobsList das nicht tut.
        // Für den Moment geben wir null zurück, damit renderMyJobsList es überspringen kann, wenn es ein Fehler ist.
        return null; 
    }


    const jobWrapper = document.createElement("div");
    jobWrapper.classList.add("my-job-item", "job-entry"); 
    jobWrapper.dataset.jobId = jobItem.id;

    // jobFieldData ist bereits oben definiert

    // Job Header
    const jobHeaderDiv = document.createElement("div");
    jobHeaderDiv.classList.add("db-table-row", "db-table-my-job");

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

    const paymentCell = document.createElement("div");
    paymentCell.classList.add("db-table-row-item");
    paymentCell.textContent = jobFieldData["job-payment"] ? `${jobFieldData["job-payment"]} €` : "K.A.";
    jobHeaderDiv.appendChild(paymentCell);

    const categoryCell = document.createElement("div");
    categoryCell.classList.add("db-table-row-item");
    categoryCell.textContent = jobFieldData["industrie-kategorie"] || "K.A.";
    jobHeaderDiv.appendChild(categoryCell);

    const statusCell = document.createElement("div");
    statusCell.classList.add("db-table-row-item");
    const statusTag = document.createElement("div");
    statusTag.classList.add("job-tag"); 
    statusTag.textContent = jobFieldData["job-status"] || "Unbekannt";
    if (jobFieldData["job-status"] === "Aktiv") statusTag.classList.add("is-bg-light-green"); 
    if (jobFieldData["job-status"] === "Beendet") statusTag.classList.add("is-bg-light-red"); 
    statusCell.appendChild(statusTag);
    jobHeaderDiv.appendChild(statusCell);

    const applicantIdsForThisSpecificJob = jobFieldData["bewerber"] || [];
    const applicantsCountCell = document.createElement("div");
    applicantsCountCell.classList.add("db-table-row-item");
    applicantsCountCell.textContent = `${applicantIdsForThisSpecificJob.length}`; // Nur die Zahl
    jobHeaderDiv.appendChild(applicantsCountCell);
    
    // NEU: Toggle-Switch Zelle
    const toggleCell = document.createElement("div");
    toggleCell.classList.add("db-table-row-item", "cell-align-center"); // Eigene Klasse für Zentrierung des Toggles

    const toggleWrapper = document.createElement("div");
    toggleWrapper.classList.add("checkbox-toggle-wrapper");

    const toggleCheckbox = document.createElement("input");
    toggleCheckbox.type = "checkbox";
    toggleCheckbox.classList.add("checkbox-toggle");
    toggleCheckbox.id = `toggle-applicants-${jobItem.id}`; // Eindeutige ID

    // Label für Barrierefreiheit (kann unsichtbar gemacht werden, wenn nur der Switch sichtbar sein soll)
    const toggleLabel = document.createElement("label");
    toggleLabel.htmlFor = toggleCheckbox.id;
    toggleLabel.classList.add("visually-hidden"); // Klasse, um Label für Screenreader zugänglich, aber unsichtbar zu machen
    toggleLabel.textContent = `Bewerberliste für Job ${jobFieldData.name || jobItem.id} anzeigen`;

    toggleWrapper.appendChild(toggleCheckbox);
    toggleWrapper.appendChild(toggleLabel); // Label hinzufügen
    toggleCell.appendChild(toggleWrapper);
    jobHeaderDiv.appendChild(toggleCell);


    jobWrapper.appendChild(jobHeaderDiv);

    // Die alte "applicants-toggle-row" wird entfernt.

    // Container für Bewerberliste (initial versteckt)
    const applicantsListContainer = document.createElement("div");
    applicantsListContainer.classList.add("applicants-list-container");
    applicantsListContainer.style.display = "none";
    applicantsListContainer.dataset.jobId = jobItem.id; 
    applicantsListContainer.dataset.allApplicantsLoaded = 'false'; 
    jobWrapper.appendChild(applicantsListContainer);

    // Pagination Wrapper (initial versteckt)
    let paginationWrapper = jobWrapper.querySelector(".db-table-pagination");
    if (!paginationWrapper) {
      paginationWrapper = document.createElement("div");
      paginationWrapper.classList.add("db-table-pagination");
      jobWrapper.appendChild(paginationWrapper); 
    }
    paginationWrapper.style.display = "none";


    // Event Listener für den neuen Toggle-Switch
    toggleCheckbox.addEventListener("change", async () => {
      const isChecked = toggleCheckbox.checked;
      // Verhindere Mehrfachklicks während Ladevorgang (optional, falls Ladezustand am Toggle sichtbar)
      // if (toggleCheckbox.disabled) return; 
      // toggleCheckbox.disabled = true; // Ladezustand setzen

      if (isChecked) {
        applicantsListContainer.style.display = "block";
        // Ggf. weitere Aktionen beim Öffnen (z.B. Icon-Änderung, falls noch gewünscht)

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
        
        // Wende aktuelle Filter an (oder Standard, falls keine gesetzt) und sortiere
        if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.applyAndReloadApplicants) {
            // applyAndReloadApplicants liest die Filter aus dem UI und sortiert dann
            await window.WEBFLOW_API.core.applyAndReloadApplicants(jobItem.id, applicantsListContainer, paginationWrapper);
        } else {
             // Fallback: Manuell sortieren und erste Seite laden
            jobDataCache[jobItem.id].sortedAndFilteredItems = sortApplicantsGlobally(
                jobDataCache[jobItem.id].allItems, // Hier sollten gefilterte Items stehen, wenn Filter schon existieren
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
        // Bereich einklappen
        applicantsListContainer.style.display = "none";
        if(paginationWrapper) paginationWrapper.style.display = "none";
        // Ggf. weitere Aktionen beim Schließen
      }
      // toggleCheckbox.disabled = false; // Ladezustand entfernen
    });

    return jobWrapper;
  }
  
  /**
   * Erstellt den Header für die "Meine Jobs"-Tabelle.
   * @returns {HTMLElement} Das Header-DOM-Element.
   */
  function createMyJobsTableHeaderElement() {
    const headerDiv = document.createElement("div");
    headerDiv.classList.add("db-table-header", "db-table-my-jobs"); // Angepasste Klasse

    const columns = [
        { text: "Job", classes: ["justify-left", "flex-grow-2"] }, // Beispiel für mehr Flexibilität
        { text: "Honorar", classes: [] },
        { text: "Kategorie", classes: [] },
        { text: "Status", classes: [] },
        { text: "Bewerber", classes: ["cell-align-center"] }, // Für die Anzahl
        { icon: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/68301a7669101ccdf5c57eff_eye.svg", alt: "Anzeigen", classes: ["cell-align-center"] } // Neues Icon
    ];

    columns.forEach(colInfo => {
        const colDiv = document.createElement("div");
        colDiv.classList.add("db-table-row-item");
        if (colInfo.classes) {
            colInfo.classes.forEach(cls => colDiv.classList.add(cls));
        }

        if (colInfo.text) {
            const textSpan = document.createElement("span");
            textSpan.classList.add("is-txt-16", "is-txt-bold"); 
            textSpan.textContent = colInfo.text;
            colDiv.appendChild(textSpan);
        } else if (colInfo.icon) {
            const iconImg = document.createElement("img");
            iconImg.src = colInfo.icon;
            iconImg.alt = colInfo.alt || "Icon";
            iconImg.classList.add("db-icon-24"); // Deine Icon-Klasse
            colDiv.appendChild(iconImg);
        }
        headerDiv.appendChild(colDiv);
    });
    return headerDiv;
  }


  // Exponieren der UI-Funktionen
  window.WEBFLOW_API.ui.createJobEntryElement = createJobEntryElement;
  window.WEBFLOW_API.ui.createMyJobsTableHeaderElement = createMyJobsTableHeaderElement; // Neue Funktion exponieren

})();
