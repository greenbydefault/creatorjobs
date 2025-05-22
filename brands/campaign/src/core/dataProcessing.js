(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.core = window.WEBFLOW_API.core || {};

  // Abhängigkeiten
  // calculateMatchScore wird hier nicht direkt benötigt, aber sortApplicantsGlobally ruft es auf.
  // MAPPINGS wird in calculateMatchScore verwendet.
  // jobDataCache und andere Cache-Variablen
  // loadAndDisplayApplicantsForJob (aus appLogic) für den Reload

  /**
   * Sortiert eine Liste von Bewerber-Items global (nach Match-Score, dann Plus-Status, dann Name).
   * @param {object[]} applicantItems - Array von rohen Bewerber-Items.
   * @param {object|null} jobFieldData - Die Felddaten des zugehörigen Jobs für das Scoring.
   * @returns {object[]} Array von sortierten Bewerber-Items, jeweils mit `matchInfo`.
   */
  function sortApplicantsGlobally(applicantItems, jobFieldData) {
    const { calculateMatchScore } = window.WEBFLOW_API.core; // Holen der Scoring-Funktion
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS; // Mappings für Scoring

    const itemsWithScore = applicantItems.map(applicant => {
      let matchInfo = { score: -1, details: {}, rawScore: 0, maxScore: 0 }; // Default für Fehlerfälle
      if (applicant && applicant.fieldData && !applicant.error) {
        if (jobFieldData) {
          matchInfo = calculateMatchScore(applicant.fieldData, jobFieldData, MAPPINGS);
        } else {
          // Fall: Job-Daten nicht verfügbar, aber Bewerberdaten sind da. Score 0.
          matchInfo = { score: 0, details: { note: "Job data missing for scoring" }, rawScore: 0, maxScore: 0 };
        }
      } else if (applicant && applicant.error) {
        // Behalte Fehlerinformationen, aber setze Score für Sortierung ggf. niedrig
        matchInfo = { score: -1, details: { error: applicant.message, status: applicant.status }, rawScore: 0, maxScore: 0, id: applicant.id, error: true, status: applicant.status, message: applicant.message };
      }
      // Füge matchInfo zum Bewerberobjekt hinzu, auch wenn es ein Fehlerobjekt ist
      return { ...applicant, matchInfo };
    });

    return itemsWithScore.sort((a, b) => {
      const aIsValid = a && a.fieldData && !a.error;
      const bIsValid = b && b.fieldData && !b.error;

      // Gültige Items vor ungültigen Items
      if (aIsValid && !bIsValid) return -1;
      if (!aIsValid && bIsValid) return 1;
      if (!aIsValid && !bIsValid) return 0; // Beide ungültig, Reihenfolge egal oder nach ID

      // Primäre Sortierung: Match Score (absteigend)
      if (b.matchInfo.score !== a.matchInfo.score) {
        return b.matchInfo.score - a.matchInfo.score;
      }

      // Sekundäre Sortierung: Plus-Mitglied (Plus zuerst)
      const aIsPlus = a.fieldData["plus-mitglied"] === true;
      const bIsPlus = b.fieldData["plus-mitglied"] === true;
      if (aIsPlus && !bIsPlus) return -1;
      if (!aIsPlus && bIsPlus) return 1;

      // Tertiäre Sortierung: Name (alphabetisch)
      const nameA = a.fieldData.name || "";
      const nameB = b.fieldData.name || "";
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Wendet die aktuellen Filter an und lädt die Bewerberliste für einen Job neu.
   * @param {string} jobId - Die ID des Jobs.
   * @param {HTMLElement} applicantsListContainer - Der Container der Bewerberliste.
   * @param {HTMLElement} paginationWrapper - Der Wrapper für die Paginierung.
   */
  async function applyAndReloadApplicants(jobId, applicantsListContainer, paginationWrapper) {
    const jobCache = window.WEBFLOW_API.cache.jobDataCache[jobId];
    if (!jobCache || !jobCache.allItems) {
      console.warn("DEBUG: applyAndReloadApplicants - Keine Rohdaten im Cache für Job", jobId);
      return;
    }

    // Aktive Filter auslesen (Beispiel für Follower-Filter)
    const activeFollowerFilters = [];
    // Der Filter-Row-Container ist ein Kind von applicantsListContainer oder dessen Elternelement
    const filterRowContainer = applicantsListContainer.querySelector(".db-table-filter-row") || applicantsListContainer.parentElement.querySelector(".db-table-filter-row");

    if (filterRowContainer) {
        const followerCheckboxes = filterRowContainer.querySelectorAll(`.db-filter-checkbox[data-filter-type="follower"]:checked`);
        followerCheckboxes.forEach(cb => activeFollowerFilters.push(cb.dataset.filterValue));
    } else {
        console.warn("Filter-Row-Container nicht gefunden für Job", jobId);
    }
    
    jobCache.activeFilters = { follower: activeFollowerFilters }; // Hier könnten weitere Filtertypen hinzukommen
    console.log(`DEBUG: Job ${jobId} - Aktive Follower-Filter:`, activeFollowerFilters);

    let filteredItems = jobCache.allItems;
    if (activeFollowerFilters.length > 0) {
      filteredItems = filteredItems.filter(item => {
        if (item.error || !item.fieldData) return false; // Fehlerhafte oder unvollständige Items überspringen
        const applicantFollowerId = item.fieldData["creator-follower"];
        return activeFollowerFilters.includes(applicantFollowerId);
      });
    }
    // Hier könnten weitere Filter angewendet werden

    console.log(`DEBUG: Job ${jobId} - Anzahl Items nach Filterung: ${filteredItems.length}`);

    const jobDetails = jobCache.jobDetails;
    if (!jobDetails) {
      console.error(`DEBUG: Job ${jobId} - Job-Details nicht im Cache gefunden für Sortierung bei Filteranwendung.`);
      // Fallback: Sortiere ohne JobDetails, was zu Score 0 führt, aber zumindest alphabetisch sortiert
      jobCache.sortedAndFilteredItems = sortApplicantsGlobally(filteredItems, null);
    } else {
      jobCache.sortedAndFilteredItems = sortApplicantsGlobally(filteredItems, jobDetails);
    }
    
    // Bewerberliste neu laden und anzeigen (Seite 1)
    // Diese Funktion muss aus window.WEBFLOW_API.appLogic geholt werden
    if (window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob) {
        await window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, 1);
    } else {
        console.error("loadAndDisplayApplicantsForJob Funktion nicht im appLogic Modul gefunden für Reload.");
    }
  }

  window.WEBFLOW_API.core.sortApplicantsGlobally = sortApplicantsGlobally;
  window.WEBFLOW_API.core.applyAndReloadApplicants = applyAndReloadApplicants;

})();
