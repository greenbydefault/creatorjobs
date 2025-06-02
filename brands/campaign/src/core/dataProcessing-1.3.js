(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.core = window.WEBFLOW_API.core || {};

  const {
    fetchWebflowItem,
    fetchCollectionItemsWithRetry
  } = window.WEBFLOW_API.services;
  const {
    jobDataCache,
    allMyJobsData_MJ,
    updateJobCacheWithApplicants,
    updateJobCacheWithJobDetails,
    updateJobCacheWithActiveFilters,
    updateJobCacheWithSortedAndFilteredItems,
    getJobDataFromCache,
    initializeJobCache,
    logCacheState,
    currentApplicantPageSize
  } = window.WEBFLOW_API.cache;

  // REMOVED: const { calculateMatchScore, calculateWeightedScore } = window.WEBFLOW_API.matchScoring;
  // This line caused the error because window.WEBFLOW_API.matchScoring was undefined.

  const {
    loadAndDisplayApplicantsForJob
  } = window.WEBFLOW_API.appLogic;
  const {
    normalizeUrl
  } = window.WEBFLOW_API.utils; // Ensure utils are loaded

  const MAPPINGS = window.WEBFLOW_API.MAPPINGS;


  /**
   * Fetches applicant data for a given job.
   * @param {string} jobId - The ID of the job.
   * @param {Array<string>} applicantIds - Array of applicant IDs.
   * @returns {Promise<Array<Object>>} - A promise that resolves to an array of applicant items.
   */
  async function fetchApplicantData(jobId, applicantIds) {
    if (!window.WEBFLOW_API.config || !window.WEBFLOW_API.services) {
      console.error("❌ Config or Services not available for fetchApplicantData.");
      return applicantIds.map(id => ({
        id: id,
        error: true,
        message: "Konfiguration oder API-Dienste nicht verfügbar.",
        status: 'config_error'
      }));
    }
    const {
      USER_COLLECTION_ID,
      API_CALL_DELAY_MS
    } = window.WEBFLOW_API.config;
    const {
      delay
    } = window.WEBFLOW_API.utils || {
      delay: ms => new Promise(resolve => setTimeout(resolve, ms))
    };

    if (!USER_COLLECTION_ID) {
      console.error("❌ USER_COLLECTION_ID ist nicht in der Konfiguration definiert.");
      return applicantIds.map(id => ({
        id: id,
        error: true,
        message: "User Collection ID nicht konfiguriert.",
        status: 'config_error'
      }));
    }

    console.log(`Fetching applicant data for job ${jobId}. Applicant IDs:`, applicantIds);
    const applicantPromises = applicantIds.map(async (applicantId, index) => {
      await delay(index * API_CALL_DELAY_MS); // Stagger API calls
      const applicantItem = await fetchWebflowItem(USER_COLLECTION_ID, applicantId);
      if (!applicantItem) {
        console.warn(`fetchWebflowItem returned null for applicantId: ${applicantId}`);
        return {
          id: applicantId,
          error: true,
          message: `Bewerberdaten für ID ${applicantId} konnten nicht abgerufen werden (null response).`,
          status: 'fetch_null_error'
        };
      }
      if (!applicantItem.id && applicantId) {
        applicantItem.id = applicantId;
      }
      return applicantItem;
    });

    const results = await Promise.allSettled(applicantPromises);
    const applicantData = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error("Error fetching an applicant:", result.reason);
        const id = result.reason && result.reason.id ? result.reason.id : 'unknown_applicant_id';
        return {
          id: id,
          error: true,
          message: result.reason && result.reason.message ? result.reason.message : "Unbekannter Fehler beim Abrufen eines Bewerbers.",
          status: result.reason && result.reason.status ? result.reason.status : 'promise_rejected'
        };
      }
    });
    console.log(`Fetched applicant data for job ${jobId}:`, applicantData);
    return applicantData;
  }


  /**
   * Filters and sorts applicants based on active filters.
   * Job details are no longer used for scoring in this version.
   * @param {string} jobId - The ID of the job.
   * @returns {Array<Object>} - An array of sorted and filtered applicant items.
   */
  function filterAndSortApplicants(jobId) {
    const jobCache = getJobDataFromCache(jobId);
    if (!jobCache || !jobCache.allItems /* || !jobCache.jobDetails */) { // jobDetails might not be strictly needed if only for scoring
      console.warn(`Keine Rohdaten (allItems) für Job ${jobId} im Cache zum Filtern/Sortieren.`);
      return [];
    }

    const {
      allItems, // These are applicants, some might have .error
      // jobDetails, // No longer directly used here for scoring
      activeFilters
    } = jobCache;
    console.log(`Filtere und sortiere Bewerber für Job ${jobId}. Aktive Filter:`, activeFilters);
    // console.log(`Job Details für Scoring:`, jobDetails); // This log is removed as scoring is removed.

    // The map to add scores is removed. We filter `allItems` directly.
    // const applicantsWithScores = allItems.map(applicant => {
    //   if (applicant.error || !applicant.fieldData) {
    //     return applicant;
    //   }
    //   // REMOVED: Score calculation
    //   // const scoreInfo = calculateMatchScore(applicant.fieldData, jobDetails.fieldData);
    //   // const weightedScore = calculateWeightedScore(scoreInfo, jobDetails.fieldData);
    //   // return { ...applicant, scoreInfo, weightedScore };
    //   return applicant; // Just return the applicant as is
    // });

    const filteredApplicants = allItems.filter(applicant => {
      if (applicant.error || !applicant.fieldData) {
        if (activeFilters.relevantOnly) return false;
        return true;
      }

      const fieldData = applicant.fieldData;

      if (activeFilters.relevantOnly) {
        let hasFollowers = false;
        let hasSocialMedia = false;
        const normalizeUrlFunc = normalizeUrl || (window.WEBFLOW_API.utils && window.WEBFLOW_API.utils.normalizeUrl);

        if (fieldData["creator-follower"]) {
          hasFollowers = true;
        }

        if (fieldData && normalizeUrlFunc) {
          const socialKeys = ['instagram', 'tiktok', 'youtube'];
          for (const key of socialKeys) {
            if (normalizeUrlFunc(fieldData[key])) {
              hasSocialMedia = true;
              break;
            }
          }
        } else if (!normalizeUrlFunc) {
            console.warn("normalizeUrl function is not available. Cannot check social media links for 'relevantOnly' filter.");
        }

        if (!hasFollowers && !hasSocialMedia) {
          console.log(`Filtering out applicant ${fieldData.name || applicant.id} due to relevantOnly (no followers AND no social media).`);
          return false;
        }
      }

      if (activeFilters.follower && activeFilters.follower.length > 0) {
        const followerRangeId = fieldData["creator-follower"];
        if (!followerRangeId || !activeFilters.follower.includes(followerRangeId)) {
          return false;
        }
      }

      if (activeFilters.category && activeFilters.category.length > 0) {
        const category = fieldData["creator-main-categorie"];
        if (!category || !activeFilters.category.includes(category)) {
          return false;
        }
      }

      if (activeFilters.creatorType && activeFilters.creatorType.length > 0) {
        const creatorTypeId = fieldData["creator-type"];
        if (!creatorTypeId || !activeFilters.creatorType.includes(creatorTypeId)) {
          return false;
        }
      }
      return true;
    });

    // Sort by name (ascending), then by ID as a tie-breaker. Error items are pushed to the end.
    const sortedApplicants = filteredApplicants.sort((a, b) => {
      // Push items with errors to the end of the list
      if (a.error && !b.error) return 1; // a comes after b
      if (!a.error && b.error) return -1; // a comes before b
      if (a.error && b.error) { // If both are errors, sort by ID or maintain order
          const idA_err = a.id || '';
          const idB_err = b.id || '';
          return idA_err.localeCompare(idB_err);
      }

      // If neither are errors, sort by name
      const nameA = (a.fieldData && a.fieldData.name) || '';
      const nameB = (b.fieldData && b.fieldData.name) || '';

      const nameCompare = nameA.localeCompare(nameB);
      if (nameCompare !== 0) {
        return nameCompare;
      }

      // If names are the same, sort by ID as a tie-breaker
      const idA = a.id || '';
      const idB = b.id || '';
      return idA.localeCompare(idB);
    });

    console.log(`Sortierte und gefilterte Bewerber für Job ${jobId} (ohne Score):`, sortedApplicants);
    updateJobCacheWithSortedAndFilteredItems(jobId, sortedApplicants);
    return sortedApplicants;
  }


  /**
   * Main function to apply filters and reload/re-render applicants for a job.
   * This is typically called when a filter changes.
   * @param {string} jobId - The ID of the job.
   * @param {HTMLElement} applicantsListContainer - The DOM element where applicant rows are rendered.
   * @param {HTMLElement} paginationWrapper - The DOM element for pagination controls.
   */
  async function applyAndReloadApplicants(jobId, applicantsListContainer, paginationWrapper) {
    console.log(`applyAndReloadApplicants called for Job ID: ${jobId}`);
    // const jobCache = getJobDataFromCache(jobId); // Not directly used here, but functions below use it

    const newActiveFilters = {
      follower: [],
      category: [],
      creatorType: [],
      relevantOnly: false,
    };

    const followerCheckboxes = document.querySelectorAll(`#filter-${jobId}-follower input[type="checkbox"]:checked`);
    followerCheckboxes.forEach(cb => newActiveFilters.follower.push(cb.dataset.filterValue));

    const categoryCheckboxes = document.querySelectorAll(`#filter-${jobId}-category input[type="checkbox"]:checked`);
    categoryCheckboxes.forEach(cb => newActiveFilters.category.push(cb.dataset.filterValue));

    const creatorTypeCheckboxes = document.querySelectorAll(`#filter-${jobId}-creatorType input[type="checkbox"]:checked`);
    creatorTypeCheckboxes.forEach(cb => newActiveFilters.creatorType.push(cb.dataset.filterValue));

    const relevantOnlyCheckbox = document.getElementById(`filter-${jobId}-relevantOnly`);
    if (relevantOnlyCheckbox && relevantOnlyCheckbox.checked) {
      newActiveFilters.relevantOnly = true;
    }

    updateJobCacheWithActiveFilters(jobId, newActiveFilters);
    console.log(`Aktualisierte aktive Filter für Job ${jobId}:`, newActiveFilters);
    logCacheState(jobId, "Nach Aktualisierung der aktiven Filter in applyAndReloadApplicants");

    filterAndSortApplicants(jobId);

    if (window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob) {
      await window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, 1);
    } else {
      console.error("loadAndDisplayApplicantsForJob function not found on window.WEBFLOW_API.appLogic");
    }

    const filterRow = applicantsListContainer.querySelector(".db-table-filter-row");
    const activeFiltersDisplayContainer = filterRow ? filterRow.querySelector(".db-active-filters-display") : null;
    if (activeFiltersDisplayContainer && window.WEBFLOW_API.ui && window.WEBFLOW_API.ui.renderActiveFilterBadgesUI) {
      window.WEBFLOW_API.ui.renderActiveFilterBadgesUI(jobId, activeFiltersDisplayContainer, applicantsListContainer, paginationWrapper);
    } else {
      console.warn("Container für aktive Filter-Badges nicht gefunden oder renderActiveFilterBadgesUI nicht verfügbar beim Neuladen.");
    }

    logCacheState(jobId, "Nach applyAndReloadApplicants");
  }


  /**
   * Initializes the data for a specific job, fetching job details and applicant data.
   * @param {string} jobId - The ID of the job.
   * @param {Array<string>} applicantIdsFromJob - Array of applicant IDs associated with the job.
   * @param {Object} jobDetailsFromMJ - Job details object, typically from allMyJobsData_MJ.
   * @returns {Promise<boolean>} - True if initialization was successful, false otherwise.
   */
  async function initializeJobData(jobId, applicantIdsFromJob, jobDetailsFromMJ) {
    console.log(`Initialisiere Daten für Job ${jobId}. Bewerber-IDs vom Job-Objekt:`, applicantIdsFromJob);
    initializeJobCache(jobId);

    if (jobDetailsFromMJ) {
      updateJobCacheWithJobDetails(jobId, jobDetailsFromMJ);
    } else {
      console.warn(`Job-Details für Job ${jobId} wurden nicht an initializeJobData übergeben.`);
    }

    if (!applicantIdsFromJob || applicantIdsFromJob.length === 0) {
      console.log(`Job ${jobId} hat keine Bewerber-IDs. Initialisiere mit leeren Bewerbern.`);
      updateJobCacheWithApplicants(jobId, []);
      filterAndSortApplicants(jobId);
      return true;
    }

    try {
      const applicants = await fetchApplicantData(jobId, applicantIdsFromJob);
      updateJobCacheWithApplicants(jobId, applicants);
      filterAndSortApplicants(jobId);
      logCacheState(jobId, "Nach Initialisierung der Job-Daten (inkl. Bewerber)");
      return true;
    } catch (error) {
      console.error(`Fehler beim Initialisieren der Daten für Job ${jobId}:`, error);
      updateJobCacheWithApplicants(jobId, applicantIdsFromJob.map(id => ({
        id,
        error: true,
        message: `Fehler beim Laden der Bewerberdaten für Job ${jobId}: ${error.message}`,
        status: 'init_error'
      })));
      filterAndSortApplicants(jobId);
      return false;
    }
  }


  window.WEBFLOW_API.core.fetchApplicantData = fetchApplicantData;
  window.WEBFLOW_API.core.filterAndSortApplicants = filterAndSortApplicants;
  window.WEBFLOW_API.core.applyAndReloadApplicants = applyAndReloadApplicants;
  window.WEBFLOW_API.core.initializeJobData = initializeJobData;

})();
