(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.core = window.WEBFLOW_API.core || {};

  // Destructure services and utils safely, cache will be accessed directly
  const services = window.WEBFLOW_API.services || {};
  const {
    fetchWebflowItem,
    // fetchCollectionItemsWithRetry // Not currently used in this script
  } = services;

  const utils = window.WEBFLOW_API.utils || {};
  const {
    normalizeUrl,
    delay: utilDelay
  } = utils;

  const MAPPINGS = window.WEBFLOW_API.MAPPINGS || {};

  /**
   * Fetches applicant data for a given job.
   * @param {string} jobId - The ID of the job.
   * @param {Array<string>} applicantIds - Array of applicant IDs.
   * @returns {Promise<Array<Object>>} - A promise that resolves to an array of applicant items.
   */
  async function fetchApplicantData(jobId, applicantIds) {
    // Check for config and specific service function
    if (!window.WEBFLOW_API.config || typeof fetchWebflowItem !== 'function') {
      console.error("❌ Config or fetchWebflowItem service not available for fetchApplicantData.");
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

    const delayFunc = typeof utilDelay === 'function' ? utilDelay : (ms => new Promise(resolve => setTimeout(resolve, ms)));

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
      await delayFunc(index * API_CALL_DELAY_MS);
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
   * @param {string} jobId - The ID of the job.
   * @param {Object|null} explicitFilters - Explicit filters to use. If null, attempts to use filters from cache.
   * @returns {Array<Object>} - An array of sorted and filtered applicant items.
   */
  function filterAndSortApplicants(jobId, explicitFilters = null) {
    let jobCache = null;
    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.getJobDataFromCache === 'function') {
        jobCache = window.WEBFLOW_API.cache.getJobDataFromCache(jobId);
    } else {
        console.warn("window.WEBFLOW_API.cache.getJobDataFromCache is not available.");
    }

    if (!jobCache || !jobCache.allItems) {
      console.warn(`Keine Rohdaten (allItems) für Job ${jobId} im Cache zum Filtern/Sortieren.`);
      return [];
    }

    const { allItems } = jobCache;
    let activeFiltersToUse = explicitFilters;

    if (!activeFiltersToUse) { // If explicitFilters were not passed
        if (jobCache && jobCache.activeFilters) {
            activeFiltersToUse = jobCache.activeFilters;
            console.log(`filterAndSortApplicants für Job ${jobId} verwendet activeFilters aus dem Cache.`);
        } else {
            console.warn(`Keine expliziten Filter übergeben und keine activeFilters im Cache für Job ${jobId}. Verwende Standard (keine Filter).`);
            activeFiltersToUse = { follower: [], category: [], creatorType: [], relevantOnly: false }; // Default empty filters
        }
    }
    
    console.log(`Filtere und sortiere Bewerber für Job ${jobId}. Verwendete Filter:`, activeFiltersToUse);

    const filteredApplicants = allItems.filter(applicant => {
      if (applicant.error || !applicant.fieldData) {
        if (activeFiltersToUse && activeFiltersToUse.relevantOnly) return false;
        return true;
      }

      const fieldData = applicant.fieldData;

      if (activeFiltersToUse && activeFiltersToUse.relevantOnly) {
        let hasFollowers = false;
        let hasSocialMedia = false;
        const normalizeUrlFunc = typeof normalizeUrl === 'function' ? normalizeUrl : null;

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
            console.warn("normalizeUrl function is not available from utils. Cannot check social media links for 'relevantOnly' filter.");
        }

        if (!hasFollowers && !hasSocialMedia) {
          console.log(`Filtering out applicant ${fieldData.name || applicant.id} due to relevantOnly (no followers AND no social media).`);
          return false;
        }
      }

      if (activeFiltersToUse && activeFiltersToUse.follower && activeFiltersToUse.follower.length > 0) {
        const followerRangeId = fieldData["creator-follower"];
        if (!followerRangeId || !activeFiltersToUse.follower.includes(followerRangeId)) {
          return false;
        }
      }

      if (activeFiltersToUse && activeFiltersToUse.category && activeFiltersToUse.category.length > 0) {
        const category = fieldData["creator-main-categorie"];
        if (!category || !activeFiltersToUse.category.includes(category)) {
          return false;
        }
      }

      if (activeFiltersToUse && activeFiltersToUse.creatorType && activeFiltersToUse.creatorType.length > 0) {
        const creatorTypeId = fieldData["creator-type"];
        if (!creatorTypeId || !activeFiltersToUse.creatorType.includes(creatorTypeId)) {
          return false;
        }
      }
      return true;
    });

    const sortedApplicants = filteredApplicants.sort((a, b) => {
      if (a.error && !b.error) return 1;
      if (!a.error && b.error) return -1;
      if (a.error && b.error) {
          const idA_err = a.id || '';
          const idB_err = b.id || '';
          return idA_err.localeCompare(idB_err);
      }

      const nameA = (a.fieldData && a.fieldData.name) || '';
      const nameB = (b.fieldData && b.fieldData.name) || '';

      const nameCompare = nameA.localeCompare(nameB);
      if (nameCompare !== 0) {
        return nameCompare;
      }

      const idA = a.id || '';
      const idB = b.id || '';
      return idA.localeCompare(idB);
    });

    console.log(`Sortierte und gefilterte Bewerber für Job ${jobId} (ohne Score):`, sortedApplicants);
    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithSortedAndFilteredItems === 'function') {
        window.WEBFLOW_API.cache.updateJobCacheWithSortedAndFilteredItems(jobId, sortedApplicants);
    } else {
        console.warn("window.WEBFLOW_API.cache.updateJobCacheWithSortedAndFilteredItems is not available.");
    }
    return sortedApplicants;
  }


  /**
   * Main function to apply filters and reload/re-render applicants for a job.
   * @param {string} jobId - The ID of the job.
   * @param {HTMLElement} applicantsListContainer - The DOM element where applicant rows are rendered.
   * @param {HTMLElement} paginationWrapper - The DOM element for pagination controls.
   */
  async function applyAndReloadApplicants(jobId, applicantsListContainer, paginationWrapper) {
    console.log(`applyAndReloadApplicants called for Job ID: ${jobId}`);

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

    // Attempt to update cache, but proceed even if it fails
    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithActiveFilters === 'function') {
        window.WEBFLOW_API.cache.updateJobCacheWithActiveFilters(jobId, newActiveFilters);
    } else {
        console.warn("window.WEBFLOW_API.cache.updateJobCacheWithActiveFilters is not available. 'newActiveFilters' will be passed directly for this operation.");
    }
    console.log(`UI-Filter für Job ${jobId} ermittelt:`, newActiveFilters);
    
    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.logCacheState === 'function') {
        window.WEBFLOW_API.cache.logCacheState(jobId, "Nach Aktualisierung der aktiven Filter in applyAndReloadApplicants (Versuch)");
    }

    // Call filterAndSortApplicants with the newActiveFilters directly
    filterAndSortApplicants(jobId, newActiveFilters); // This will update sortedAndFilteredItems in cache internally

    // loadAndDisplayApplicantsForJob will read sortedAndFilteredItems from cache,
    // which should have been updated by the filterAndSortApplicants call above.
    if (window.WEBFLOW_API.appLogic && typeof window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob === 'function') {
      await window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, 1);
    } else {
      console.error("loadAndDisplayApplicantsForJob function not found on window.WEBFLOW_API.appLogic or appLogic itself is missing.");
    }

    const filterRow = applicantsListContainer.querySelector(".db-table-filter-row");
    const activeFiltersDisplayContainer = filterRow ? filterRow.querySelector(".db-active-filters-display") : null;
    
    if (activeFiltersDisplayContainer && window.WEBFLOW_API.ui && typeof window.WEBFLOW_API.ui.renderActiveFilterBadgesUI === 'function') {
      window.WEBFLOW_API.ui.renderActiveFilterBadgesUI(jobId, activeFiltersDisplayContainer, applicantsListContainer, paginationWrapper);
    } else {
      console.warn("Container für aktive Filter-Badges nicht gefunden oder renderActiveFilterBadgesUI nicht verfügbar auf window.WEBFLOW_API.ui.");
    }

    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.logCacheState === 'function') {
        window.WEBFLOW_API.cache.logCacheState(jobId, "Nach applyAndReloadApplicants");
    }
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
    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.initializeJobCache === 'function') {
        // initializeJobCache should set up jobCache[jobId].activeFilters to a default (e.g., empty filters)
        window.WEBFLOW_API.cache.initializeJobCache(jobId);
    } else {
        console.warn("window.WEBFLOW_API.cache.initializeJobCache is not available.");
    }

    if (jobDetailsFromMJ) {
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithJobDetails === 'function') {
          window.WEBFLOW_API.cache.updateJobCacheWithJobDetails(jobId, jobDetailsFromMJ);
      } else {
          console.warn("window.WEBFLOW_API.cache.updateJobCacheWithJobDetails is not available.");
      }
    } else {
      console.warn(`Job-Details für Job ${jobId} wurden nicht an initializeJobData übergeben.`);
    }

    if (!applicantIdsFromJob || applicantIdsFromJob.length === 0) {
      console.log(`Job ${jobId} hat keine Bewerber-IDs. Initialisiere mit leeren Bewerbern.`);
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithApplicants === 'function') {
          window.WEBFLOW_API.cache.updateJobCacheWithApplicants(jobId, []);
      } else {
          console.warn("window.WEBFLOW_API.cache.updateJobCacheWithApplicants is not available.");
      }
      // Call filterAndSortApplicants without explicit filters; it will use cache/defaults.
      filterAndSortApplicants(jobId);
      return true;
    }

    try {
      const applicants = await fetchApplicantData(jobId, applicantIdsFromJob);
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithApplicants === 'function') {
          window.WEBFLOW_API.cache.updateJobCacheWithApplicants(jobId, applicants);
      } else {
          console.warn("window.WEBFLOW_API.cache.updateJobCacheWithApplicants is not available.");
      }
      // Call filterAndSortApplicants without explicit filters; it will use cache/defaults.
      filterAndSortApplicants(jobId);
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.logCacheState === 'function') {
          window.WEBFLOW_API.cache.logCacheState(jobId, "Nach Initialisierung der Job-Daten (inkl. Bewerber)");
      }
      return true;
    } catch (error) {
      console.error(`Fehler beim Initialisieren der Daten für Job ${jobId}:`, error);
      const errorApplicants = applicantIdsFromJob.map(id => ({
        id,
        error: true,
        message: `Fehler beim Laden der Bewerberdaten für Job ${jobId}: ${error.message}`,
        status: 'init_error'
      }));
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithApplicants === 'function') {
          window.WEBFLOW_API.cache.updateJobCacheWithApplicants(jobId, errorApplicants);
      } else {
          console.warn("window.WEBFLOW_API.cache.updateJobCacheWithApplicants is not available. Cannot store error state for applicants.");
      }
      // Call filterAndSortApplicants without explicit filters; it will use cache/defaults.
      filterAndSortApplicants(jobId);
      return false;
    }
  }

  // Expose core functions
  window.WEBFLOW_API.core.fetchApplicantData = fetchApplicantData;
  window.WEBFLOW_API.core.filterAndSortApplicants = filterAndSortApplicants;
  window.WEBFLOW_API.core.applyAndReloadApplicants = applyAndReloadApplicants;
  window.WEBFLOW_API.core.initializeJobData = initializeJobData;

})();
