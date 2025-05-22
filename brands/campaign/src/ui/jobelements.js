(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  // Abhängigkeiten (werden zur Laufzeit über window.WEBFLOW_API aufgelöst)
  // MAPPINGS, jobDataCache, fetchAllApplicantsForJob, sortApplicantsGlobally, loadAndDisplayApplicantsForJob

  /**
   * Erstellt und gibt das DOM-Fragment für einen einzelnen Job-Eintrag zurück.
   * Inklusive Header, Toggle-Button und Container für Bewerber.
   * @param {object} jobItem - Das Job-Item-Objekt von Webflow.
   * @returns {DocumentFragment | HTMLElement} Das DOM-Element des Jobs oder ein Fragment bei Fehlern.
   */
  function createJobEntryElement(jobItem) {
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS;
    const jobDataCache = window.WEBFLOW_API.cache.jobDataCache;
    const { fetchAllApplicantsForJob } = window.WEBFLOW_API.services;
    const { sortApplicantsGlobally } = window.WEBFLOW_API.core;
    // loadAndDisplayApplicantsForJob wird aus appLogic geholt

    if (jobItem.error && jobItem.status !== 429 && jobItem.status !== 404) { // 429/404 werden speziell behandelt
        console.warn(`Job (ID: ${jobItem.id || 'unbekannt'}) konnte nicht geladen werden: ${jobItem.message}. Er wird nicht gerendert.`);
        // Optional: Ein Fehlerelement zurückgeben, das im UI angezeigt wird
        const errorP = document.createElement('p');
        errorP.textContent = `Job ${jobItem.id || 'unbekannt'} konnte nicht geladen werden.`;
        errorP.classList.add("job-entry", "visible", "error-message");
        return errorP;
    }
    // Rate Limit und 404 werden in der aufrufenden Funktion (renderMyJobsList) behandelt,
    // um eine globale Nachricht anzuzeigen oder den Job einfach zu überspringen.

    const jobFieldData = jobItem.fieldData;
    if (!jobFieldData && !jobItem.error) { // Nur loggen, wenn es kein bekannter Fehler ist
      console.warn("Job-Item ohne fieldData übersprungen:", jobItem);
      const errorP = document.createElement('p');
      errorP.textContent = `Jobdaten für ${jobItem.id || 'unbekannt'} sind unvollständig.`;
      errorP.classList.add("job-entry", "visible", "error-message");
      return errorP;
    }
     if (!jobFieldData && jobItem.error) { // Wenn es ein Fehlerobjekt ohne fieldData ist (z.B. 404)
        // Dieses wird schon in renderMyJobsList behandelt, hier nichts tun oder spezifisches Element
        return null; // Wird in renderMyJobsList übersprungen
    }


    const jobWrapper = document.createElement("div");
    jobWrapper.classList.add("my-job-item", "job-entry"); // job-entry für Sichtbarkeit
    jobWrapper.dataset.jobId = jobItem.id;

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
    statusTag.classList.add("job-tag"); // Basisklasse
    statusTag.textContent = jobFieldData["job-status"] || "Unbekannt";
    if (jobFieldData["job-status"] === "Aktiv") statusTag.classList.add("is-bg-light-green"); // Webflow Klasse
    if (jobFieldData["job-status"] === "Beendet") statusTag.classList.add("is-bg-light-red"); // Webflow Klasse
    statusCell.appendChild(statusTag);
    jobHeaderDiv.appendChild(statusCell);

    const applicantIdsForThisSpecificJob = jobFieldData["bewerber"] || [];
    const applicantsCountCell = document.createElement("div");
    applicantsCountCell.classList.add("db-table-row-item");
    applicantsCountCell.textContent = `Bewerber: ${applicantIdsForThisSpecificJob.length}`;
    jobHeaderDiv.appendChild(applicantsCountCell);
    
    // Platzhalter für Aktionen (Edit/View Job) - ursprünglich leer
    const jobActionsCell = document.createElement("div");
    jobActionsCell.classList.add("db-table-row-item");
    // Hier könnten später Icons/Links zum Bearbeiten des Jobs etc. hin
    jobHeaderDiv.appendChild(jobActionsCell);


    jobWrapper.appendChild(jobHeaderDiv);

    // Toggle Button Row
    const toggleButtonRow = document.createElement("div");
    toggleButtonRow.classList.add("applicants-toggle-row");

    const toggleDivElement = document.createElement("div");
    toggleDivElement.classList.add("db-table-applicants"); // Webflow Klasse für den Klickbereich

    const toggleTextSpan = document.createElement("span");
    toggleTextSpan.classList.add("is-txt-16");
    toggleTextSpan.textContent = "Bewerberliste anzeigen";

    const toggleIconImg = document.createElement("img");
    toggleIconImg.src = "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/682c5e5b84cac09c56cdbebe_angle-down-small.svg"; // Pfad anpassen
    toggleIconImg.alt = "Toggle Icon";
    toggleIconImg.classList.add("db-icon-24", "toggle-icon"); // Klassen anpassen

    toggleDivElement.appendChild(toggleTextSpan);
    toggleDivElement.appendChild(toggleIconImg);
    toggleButtonRow.appendChild(toggleDivElement);
    jobWrapper.appendChild(toggleButtonRow);

    // Container für Bewerberliste (initial versteckt)
    const applicantsListContainer = document.createElement("div");
    applicantsListContainer.classList.add("applicants-list-container");
    applicantsListContainer.style.display = "none";
    applicantsListContainer.dataset.jobId = jobItem.id; // Für Referenz
    applicantsListContainer.dataset.allApplicantsLoaded = 'false'; // Status, ob Rohdaten geladen sind
    jobWrapper.appendChild(applicantsListContainer);

    // Pagination Wrapper (initial versteckt)
    let paginationWrapper = jobWrapper.querySelector(".db-table-pagination");
    if (!paginationWrapper) {
      paginationWrapper = document.createElement("div");
      paginationWrapper.classList.add("db-table-pagination");
      jobWrapper.appendChild(paginationWrapper); // Füge es am Ende des jobWrappers hinzu
    }
    paginationWrapper.style.display = "none";


    // Event Listener für Toggle
    toggleDivElement.addEventListener("click", async () => {
      const isHidden = applicantsListContainer.style.display === "none";
      if (toggleDivElement.classList.contains('loading')) return; // Verhindere Mehrfachklicks während Ladevorgang

      toggleDivElement.classList.add('loading'); // Ladezustand setzen
      toggleTextSpan.textContent = isHidden ? "Lade Bewerber..." : "Schließe...";


      if (isHidden) {
        applicantsListContainer.style.display = "block";
        // toggleTextSpan.textContent = "Bewerberliste ausblenden"; // Wird nach Laden gesetzt
        toggleIconImg.classList.add("icon-up"); // Webflow Klasse für Icon-Rotation

        // Initialisiere Cache für diesen Job, falls nicht vorhanden
        if (!jobDataCache[jobItem.id]) {
          jobDataCache[jobItem.id] = { activeFilters: { follower: [] } }; // Standardfilter initialisieren
        }
        jobDataCache[jobItem.id].jobDetails = jobFieldData; // Jobdetails speichern/aktualisieren

        // Lade Rohdaten der Bewerber, falls noch nicht geschehen oder Anzahl nicht übereinstimmt
        const applicantIds = jobFieldData["bewerber"] || [];
        if (!jobDataCache[jobItem.id].allItems || jobDataCache[jobItem.id].allItems.length !== applicantIds.length || applicantsListContainer.dataset.allApplicantsLoaded === 'false') {
          applicantsListContainer.innerHTML = ''; // Alten Inhalt leeren
          const loadingAllMsg = document.createElement("p");
          loadingAllMsg.classList.add("applicants-message");
          loadingAllMsg.textContent = "Lade alle Bewerberdaten für Sortierung und Filterung...";
          applicantsListContainer.appendChild(loadingAllMsg);

          const fetchedItems = await fetchAllApplicantsForJob(jobItem.id, applicantIds);
          loadingAllMsg.remove();
          jobDataCache[jobItem.id].allItems = fetchedItems;
          applicantsListContainer.dataset.allApplicantsLoaded = 'true';
        }

        // Sortiere und filtere (auch wenn nur Rohdaten neu geladen wurden)
        // Die Filter werden aus jobDataCache[jobItem.id].activeFilters gelesen
        // Hier wird angenommen, dass applyAndReloadApplicants die Sortierung intern macht.
        // Alternativ: explizit sortieren und dann loadAndDisplay.
        // Fürs Erste: Sortiere hier, dann lade die erste Seite.
        jobDataCache[jobItem.id].sortedAndFilteredItems = sortApplicantsGlobally(
            jobDataCache[jobItem.id].allItems.filter(item => { // Vorfilterung basierend auf activeFilters
                if (!jobDataCache[jobItem.id].activeFilters.follower || jobDataCache[jobItem.id].activeFilters.follower.length === 0) return true;
                if (item.error || !item.fieldData) return false;
                return jobDataCache[jobItem.id].activeFilters.follower.includes(item.fieldData["creator-follower"]);
            }),
            jobDataCache[jobItem.id].jobDetails
        );

        if (window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob) {
            await window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob(jobItem.id, applicantsListContainer, paginationWrapper, 1);
        } else {
            console.error("loadAndDisplayApplicantsForJob nicht gefunden in appLogic");
            applicantsListContainer.innerHTML = "<p class='applicants-message error-message'>Fehler beim Laden der Bewerberanzeige.</p>";
        }
        toggleTextSpan.textContent = "Bewerberliste ausblenden";

      } else {
        // Bereich einklappen
        applicantsListContainer.style.display = "none";
        if(paginationWrapper) paginationWrapper.style.display = "none";
        toggleTextSpan.textContent = "Bewerberliste anzeigen";
        toggleIconImg.classList.remove("icon-up");
      }
      toggleDivElement.classList.remove('loading'); // Ladezustand entfernen
    });

    return jobWrapper;
  }

  window.WEBFLOW_API.ui.createJobEntryElement = createJobEntryElement;

})();
