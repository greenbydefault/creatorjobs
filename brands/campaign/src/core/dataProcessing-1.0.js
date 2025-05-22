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
    const { calculateMatchScore } = window.WEBFLOW_API.core; 
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS; 

    const itemsWithScore = applicantItems.map(applicant => {
      let matchInfo = { score: -1, details: {}, rawScore: 0, maxScore: 0 }; 
      if (applicant && applicant.fieldData && !applicant.error) {
        if (jobFieldData) {
          matchInfo = calculateMatchScore(applicant.fieldData, jobFieldData, MAPPINGS);
        } else {
          matchInfo = { score: 0, details: { note: "Job data missing for scoring" }, rawScore: 0, maxScore: 0 };
        }
      } else if (applicant && applicant.error) {
        matchInfo = { score: -1, details: { error: applicant.message, status: applicant.status }, rawScore: 0, maxScore: 0, id: applicant.id, error: true, status: applicant.status, message: applicant.message };
      }
      return { ...applicant, matchInfo };
    });

    return itemsWithScore.sort((a, b) => {
      const aIsValid = a && a.fieldData && !a.error;
      const bIsValid = b && b.fieldData && !b.error;

      if (aIsValid && !bIsValid) return -1;
      if (!aIsValid && bIsValid) return 1;
      if (!aIsValid && !bIsValid) return 0; 

      if (b.matchInfo.score !== a.matchInfo.score) {
        return b.matchInfo.score - a.matchInfo.score;
      }

      const aIsPlus = a.fieldData["plus-mitglied"] === true;
      const bIsPlus = b.fieldData["plus-mitglied"] === true;
      if (aIsPlus && !bIsPlus) return -1;
      if (!aIsPlus && bIsPlus) return 1;

      const nameA = a.fieldData.name || "";
      const nameB = b.fieldData.name || "";
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Überprüft, ob ein Bewerber als "relevant" gilt (hat Videos oder Social Media Links).
   * @param {object} applicantFieldData - Die Felddaten des Bewerbers.
   * @returns {boolean} True, wenn relevant, sonst false.
   */
  function isApplicantRelevant(applicantFieldData) {
    if (!applicantFieldData) return false;

    // Auf Videos prüfen
    for (let i = 1; i <= 5; i++) {
      const videoLinkField = `creator-video-link-${i}`;
      if (applicantFieldData[videoLinkField] && typeof applicantFieldData[videoLinkField] === 'string' && applicantFieldData[videoLinkField].trim() !== '') {
        return true; // Mindestens ein Video gefunden
      }
    }

    // Auf Social Media Links prüfen
    const socialPlatformsKeys = ["instagram", "tiktok", "youtube"]; // Ggf. anpassen, falls mehr Plattformen
    for (const key of socialPlatformsKeys) {
      if (applicantFieldData[key] && typeof applicantFieldData[key] === 'string' && applicantFieldData[key].trim() !== '') {
        return true; // Mindestens ein Social Media Link gefunden
      }
    }
    return false; // Weder Videos noch Social Media Links gefunden
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

    const filterRowContainer = applicantsListContainer.querySelector(".db-table-filter-row") || applicantsListContainer.parentElement.querySelector(".db-table-filter-row");
    
    const activeFilters = {
        follower: [],
        category: [],
        creatorType: [],
        relevantOnly: false
    };

    if (filterRowContainer) {
        // Follower Filter
        const followerCheckboxes = filterRowContainer.querySelectorAll(`.db-filter-checkbox[data-filter-type="follower"]:checked`);
        followerCheckboxes.forEach(cb => activeFilters.follower.push(cb.dataset.filterValue));

        // Category Filter
        const categoryCheckboxes = filterRowContainer.querySelectorAll(`.db-filter-checkbox[data-filter-type="category"]:checked`);
        categoryCheckboxes.forEach(cb => activeFilters.category.push(cb.dataset.filterValue));
        
        // Creator Type Filter
        const creatorTypeCheckboxes = filterRowContainer.querySelectorAll(`.db-filter-checkbox[data-filter-type="creatorType"]:checked`);
        creatorTypeCheckboxes.forEach(cb => activeFilters.creatorType.push(cb.dataset.filterValue));

        // Relevant Only Toggle
        const relevantOnlyCheckbox = filterRowContainer.querySelector(`.db-filter-checkbox[data-filter-type="relevantOnly"]`);
        if (relevantOnlyCheckbox) {
            activeFilters.relevantOnly = relevantOnlyCheckbox.checked;
        }
    } else {
        console.warn("Filter-Row-Container nicht gefunden für Job", jobId, "Filter können nicht ausgelesen werden.");
    }
    
    jobCache.activeFilters = activeFilters; 
    console.log(`DEBUG: Job ${jobId} - Aktive Filter:`, JSON.stringify(activeFilters));

    let filteredItems = jobCache.allItems.filter(item => {
        if (item.error || !item.fieldData) return false; 

        // Follower Filter anwenden
        if (activeFilters.follower.length > 0) {
            const applicantFollowerId = item.fieldData["creator-follower"];
            if (!activeFilters.follower.includes(applicantFollowerId)) {
                return false;
            }
        }

        // Category Filter anwenden
        if (activeFilters.category.length > 0) {
            const applicantCategory = item.fieldData["creator-main-categorie"];
            if (!activeFilters.category.includes(applicantCategory)) {
                return false;
            }
        }

        // Creator Type Filter anwenden
        if (activeFilters.creatorType.length > 0) {
            const applicantCreatorType = item.fieldData["creator-type"];
            if (!activeFilters.creatorType.includes(applicantCreatorType)) {
                return false;
            }
        }
        
        // Relevant Only Filter anwenden
        if (activeFilters.relevantOnly) {
            if (!isApplicantRelevant(item.fieldData)) {
                return false;
            }
        }

        return true; // Bewerber besteht alle aktiven Filter
    });
    
    console.log(`DEBUG: Job ${jobId} - Anzahl Items nach Filterung: ${filteredItems.length}`);

    const jobDetails = jobCache.jobDetails;
    if (!jobDetails) {
      console.error(`DEBUG: Job ${jobId} - Job-Details nicht im Cache gefunden für Sortierung bei Filteranwendung.`);
      jobCache.sortedAndFilteredItems = sortApplicantsGlobally(filteredItems, null);
    } else {
      jobCache.sortedAndFilteredItems = sortApplicantsGlobally(filteredItems, jobDetails);
    }
    
    if (window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob) {
        await window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, 1);
    } else {
        console.error("loadAndDisplayApplicantsForJob Funktion nicht im appLogic Modul gefunden für Reload.");
    }
  }

  window.WEBFLOW_API.core.sortApplicantsGlobally = sortApplicantsGlobally;
  window.WEBFLOW_API.core.applyAndReloadApplicants = applyAndReloadApplicants;

})();
