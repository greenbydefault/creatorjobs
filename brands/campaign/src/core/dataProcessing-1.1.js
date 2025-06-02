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

  const {
    calculateMatchScore,
    calculateWeightedScore
  } = window.WEBFLOW_API.matchScoring;
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
      // Return an empty array or an array of error objects
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
        // This case should ideally be handled by fetchWebflowItem returning an error object
        console.warn(`fetchWebflowItem returned null for applicantId: ${applicantId}`);
        return {
          id: applicantId,
          error: true,
          message: `Bewerberdaten für ID ${applicantId} konnten nicht abgerufen werden (null response).`,
          status: 'fetch_null_error'
        };
      }
      // Ensure the returned object always has an id, even if it's an error from fetchWebflowItem
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
        // Log and return an error object if the promise was rejected
        console.error("Error fetching an applicant:", result.reason);
        // Try to find ID from reason if possible, otherwise it's a general error for an applicant
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
   * Filters and sorts applicants based on active filters and job details.
   * @param {string} jobId - The ID of the job.
   * @returns {Array<Object>} - An array of sorted and filtered applicant items with score info.
   */
  function filterAndSortApplicants(jobId) {
    const jobCache = getJobDataFromCache(jobId);
    if (!jobCache || !jobCache.allItems || !jobCache.jobDetails) {
      console.warn(`Keine Rohdaten oder Jobdetails für Job ${jobId} im Cache zum Filtern/Sortieren.`);
      return [];
    }

    const {
      allItems,
      jobDetails,
      activeFilters
    } = jobCache;
    console.log(`Filtere und sortiere Bewerber für Job ${jobId}. Aktive Filter:`, activeFilters);
    console.log(`Job Details für Scoring:`, jobDetails);

    const applicantsWithScores = allItems.map(applicant => {
      if (applicant.error || !applicant.fieldData) {
        return applicant; // Keep error objects or invalid items as they are
      }
      const scoreInfo = calculateMatchScore(applicant.fieldData, jobDetails.fieldData);
      const weightedScore = calculateWeightedScore(scoreInfo, jobDetails.fieldData);
      return { ...applicant,
        scoreInfo,
        weightedScore
      };
    });

    const filteredApplicants = applicantsWithScores.filter(applicant => {
      if (applicant.error || !applicant.fieldData) {
        // Option: decide if items with errors should always be excluded or passed through
        // For now, let's pass them through and let the rendering logic handle display of errors
        // If you want to exclude items that had fetching errors, return false here.
        // However, if a filter is "relevantOnly", an item with an error might be considered not relevant.
        // Let's refine this: if it's an error, it doesn't meet any positive criteria.
        if (activeFilters.relevantOnly) return false; // If error and relevantOnly, filter out
        return true; // Otherwise, pass through to be potentially handled by UI
      }

      const fieldData = applicant.fieldData;

      // Filter by "Nur relevante Bewerber"
      // MODIFIED LOGIC STARTS HERE
      if (activeFilters.relevantOnly) {
        let hasFollowers = false;
        let hasSocialMedia = false;
        const normalizeUrlFunc = normalizeUrl || (window.WEBFLOW_API.utils && window.WEBFLOW_API.utils.normalizeUrl);


        // 1. Check for follower count
        // Assuming "creator-follower" contains a value if follower data is present.
        // The value itself (e.g., a range ID) indicates presence.
        if (fieldData["creator-follower"]) {
          hasFollowers = true;
        }

        // 2. Check for social media links
        if (fieldData && normalizeUrlFunc) {
          const socialKeys = ['instagram', 'tiktok', 'youtube'];
          for (const key of socialKeys) {
            if (normalizeUrlFunc(fieldData[key])) {
              hasSocialMedia = true;
              break; // One valid link is enough
            }
          }
        } else if (!normalizeUrlFunc) {
            console.warn("normalizeUrl function is not available. Cannot check social media links for 'relevantOnly' filter.");
        }

        // An applicant is considered "relevant" if they have followers OR social media.
        // If they have neither, they are filtered out when "relevantOnly" is active.
        if (!hasFollowers && !hasSocialMedia) {
          console.log(`Filtering out applicant ${fieldData.name || applicant.id} due to relevantOnly (no followers AND no social media).`);
          return false;
        }
      }
      // MODIFIED LOGIC ENDS HERE


      // Filter by follower range
      if (activeFilters.follower && activeFilters.follower.length > 0) {
        const followerRangeId = fieldData["creator-follower"];
        if (!followerRangeId || !activeFilters.follower.includes(followerRangeId)) {
          return false;
        }
      }

      // Filter by category
      if (activeFilters.category && activeFilters.category.length > 0) {
        const category = fieldData["creator-main-categorie"];
        if (!category || !activeFilters.category.includes(category)) {
          return false;
        }
      }

      // Filter by creator type
      if (activeFilters.creatorType && activeFilters.creatorType.length > 0) {
        const creatorTypeId = fieldData["creator-type"];
        if (!creatorTypeId || !activeFilters.creatorType.includes(creatorTypeId)) {
          return false;
        }
      }
      return true;
    });

    // Sort by weighted score (descending), then by name (ascending) as a tie-breaker
    const sortedApplicants = filteredApplicants.sort((a, b) => {
      // Handle cases where items might be errors or lack scores
      const scoreA = a.error ? -Infinity : a.weightedScore;
      const scoreB = b.error ? -Infinity : b.weightedScore;
      const nameA = a.fieldData ? .name || '';
      const nameB = b.fieldData ? .name || '';

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return nameA.localeCompare(nameB);
    });

    console.log(`Sortierte und gefilterte Bewerber für Job ${jobId}:`, sortedApplicants);
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
    const jobCache = getJobDataFromCache(jobId);

    // 1. Update activeFilters in cache from UI elements
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


    // 2. Re-filter and sort applicants using data from cache
    filterAndSortApplicants(jobId); // This updates jobCache.sortedAndFilteredItems

    // 3. Re-render the applicants list (usually page 1 after filter change)
    // The loadAndDisplayApplicantsForJob function will use the updated sortedAndFilteredItems from cache
    if (window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob) {
      await window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, 1); // Reset to page 1
    } else {
      console.error("loadAndDisplayApplicantsForJob function not found on window.WEBFLOW_API.appLogic");
    }

    // 4. Update active filter badges UI
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
    initializeJobCache(jobId); // Ensure cache entry exists

    // Store job details in cache
    if (jobDetailsFromMJ) {
      updateJobCacheWithJobDetails(jobId, jobDetailsFromMJ);
    } else {
      // This case should ideally not happen if called from toggleJobApplicantsVisibility
      // as jobDetailsFromMJ comes from allMyJobsData_MJ which should be populated.
      console.warn(`Job-Details für Job ${jobId} wurden nicht an initializeJobData übergeben. Versuche, sie separat zu laden...`);
      // Optional: Fetch job details if not provided, though this might be redundant
      // if allMyJobsData_MJ is the source of truth for job listings.
      // For now, we assume jobDetailsFromMJ is sufficient.
    }

    if (!applicantIdsFromJob || applicantIdsFromJob.length === 0) {
      console.log(`Job ${jobId} hat keine Bewerber-IDs. Initialisiere mit leeren Bewerbern.`);
      updateJobCacheWithApplicants(jobId, []);
      filterAndSortApplicants(jobId); // Process with empty list to set sortedAndFilteredItems
      return true;
    }

    try {
      const applicants = await fetchApplicantData(jobId, applicantIdsFromJob);
      updateJobCacheWithApplicants(jobId, applicants);
      filterAndSortApplicants(jobId); // Filter and sort immediately after fetching
      logCacheState(jobId, "Nach Initialisierung der Job-Daten (inkl. Bewerber)");
      return true;
    } catch (error) {
      console.error(`Fehler beim Initialisieren der Daten für Job ${jobId}:`, error);
      // Store error state in cache or handle appropriately
      updateJobCacheWithApplicants(jobId, applicantIdsFromJob.map(id => ({
        id,
        error: true,
        message: `Fehler beim Laden der Bewerberdaten für Job ${jobId}: ${error.message}`,
        status: 'init_error'
      })));
      filterAndSortApplicants(jobId); // Process error list
      return false;
    }
  }


  window.WEBFLOW_API.core.fetchApplicantData = fetchApplicantData;
  window.WEBFLOW_API.core.filterAndSortApplicants = filterAndSortApplicants;
  window.WEBFLOW_API.core.applyAndReloadApplicants = applyAndReloadApplicants;
  window.WEBFLOW_API.core.initializeJobData = initializeJobData;

})();
