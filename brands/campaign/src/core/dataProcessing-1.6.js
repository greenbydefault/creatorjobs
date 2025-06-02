(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.core = window.WEBFLOW_API.core || {};

  // Services and utils are expected to be on window.WEBFLOW_API
  const services = window.WEBFLOW_API.services || {};
  const {
    fetchWebflowItem,
  } = services;

  const utils = window.WEBFLOW_API.utils || {};
  const {
    normalizeUrl,
    delay: utilDelay
  } = utils;

  // MAPPINGS is expected to be on window.WEBFLOW_API
  // const MAPPINGS = window.WEBFLOW_API.MAPPINGS || {}; // Not directly used in this version of the script

  /**
   * Fetches applicant data for a given job.
   * @param {string} jobId - The ID of the job.
   * @param {Array<string>} applicantIds - Array of applicant IDs.
   * @returns {Promise<Array<Object>>} - A promise that resolves to an array of applicant items.
   */
  async function fetchApplicantData(jobId, applicantIds) {
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

    // console.log(`Fetching applicant data for job ${jobId}. Applicant IDs:`, applicantIds);
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
    // console.log(`Fetched applicant data for job ${jobId}:`, applicantData);
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
        // This warning should ideally not appear if cache.js is loaded and working
        console.warn("filterAndSortApplicants: window.WEBFLOW_API.cache.getJobDataFromCache is not available.");
    }

    if (!jobCache || !jobCache.allItems) {
      console.warn(`filterAndSortApplicants: Keine Rohdaten (allItems) für Job ${jobId} im Cache zum Filtern/Sortieren. jobCache:`, jobCache);
      return [];
    }

    const { allItems } = jobCache;
    let activeFiltersToUse = explicitFilters;

    if (!activeFiltersToUse) {
        if (jobCache && jobCache.activeFilters) {
            activeFiltersToUse = jobCache.activeFilters;
            // console.log(`filterAndSortApplicants für Job ${jobId} verwendet activeFilters aus dem Cache:`, JSON.parse(JSON.stringify(activeFiltersToUse)));
        } else {
            console.warn(`filterAndSortApplicants: Keine expliziten Filter übergeben und keine activeFilters im Cache für Job ${jobId}. Verwende Standard (keine Filter).`);
            activeFiltersToUse = { follower: [], category: [], creatorType: [], relevantOnly: false };
        }
    }
    
    // console.log(`Filtere und sortiere Bewerber für Job ${jobId}. Verwendete Filter:`, JSON.parse(JSON.stringify(activeFiltersToUse)));

    const filteredApplicants = allItems.filter(applicant => {
      if (applicant.error || !applicant.fieldData) {
        if (activeFiltersToUse && activeFiltersToUse.relevantOnly) return false;
        return true; // Pass through items with errors if not filtering by relevantOnly
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
            // console.warn("normalizeUrl function is not available from utils. Cannot check social media links for 'relevantOnly' filter.");
        }

        if (!hasFollowers && !hasSocialMedia) {
          // console.log(`Filtering out applicant ${fieldData.name || applicant.id} due to relevantOnly (no followers AND no social media).`);
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

    // console.log(`Sortierte und gefilterte Bewerber für Job ${jobId} (Anzahl: ${sortedApplicants.length}):`, sortedApplicants);
    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithSortedAndFilteredItems === 'function') {
        window.WEBFLOW_API.cache.updateJobCacheWithSortedAndFilteredItems(jobId, sortedApplicants);
    } else {
        console.warn("filterAndSortApplicants: window.WEBFLOW_API.cache.updateJobCacheWithSortedAndFilteredItems is not available.");
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

    // --- Erweiterte Diagnose für Filterauslesung ---
    // Prüfen Sie die Konsole auf diese Ausgaben. Wenn die "count" Werte 0 sind, obwohl Checkboxen
    // in der UI ausgewählt sind, dann stimmen die Selektoren nicht mit Ihrer HTML-Struktur überein
    // oder die data-filter-value Attribute fehlen/sind falsch.

    const followerCheckboxes = document.querySelectorAll(`#filter-${jobId}-follower input[type="checkbox"]:checked`);
    console.log(`applyAndReloadApplicants: Found ${followerCheckboxes.length} checked follower checkboxes for Job ID ${jobId}. Selector: #filter-${jobId}-follower input[type="checkbox"]:checked`);
    followerCheckboxes.forEach(cb => {
        if (cb.dataset.filterValue) {
            newActiveFilters.follower.push(cb.dataset.filterValue);
        } else {
            console.warn("applyAndReloadApplicants: Follower checkbox found without data-filter-value:", cb);
        }
    });

    const categoryCheckboxes = document.querySelectorAll(`#filter-${jobId}-category input[type="checkbox"]:checked`);
    console.log(`applyAndReloadApplicants: Found ${categoryCheckboxes.length} checked category checkboxes for Job ID ${jobId}. Selector: #filter-${jobId}-category input[type="checkbox"]:checked`);
    categoryCheckboxes.forEach(cb => {
        if (cb.dataset.filterValue) {
            newActiveFilters.category.push(cb.dataset.filterValue);
        } else {
            console.warn("applyAndReloadApplicants: Category checkbox found without data-filter-value:", cb);
        }
    });

    const creatorTypeCheckboxes = document.querySelectorAll(`#filter-${jobId}-creatorType input[type="checkbox"]:checked`);
    console.log(`applyAndReloadApplicants: Found ${creatorTypeCheckboxes.length} checked creatorType checkboxes for Job ID ${jobId}. Selector: #filter-${jobId}-creatorType input[type="checkbox"]:checked`);
    creatorTypeCheckboxes.forEach(cb => {
        if (cb.dataset.filterValue) {
            newActiveFilters.creatorType.push(cb.dataset.filterValue);
        } else {
            console.warn("applyAndReloadApplicants: CreatorType checkbox found without data-filter-value:", cb);
        }
    });

    const relevantOnlyCheckbox = document.getElementById(`filter-${jobId}-relevantOnly`);
    console.log(`applyAndReloadApplicants: RelevantOnly checkbox element for Job ID ${jobId} (selector: #filter-${jobId}-relevantOnly):`, relevantOnlyCheckbox);
    if (relevantOnlyCheckbox && relevantOnlyCheckbox.checked) {
      newActiveFilters.relevantOnly = true;
    }
    // --- Ende Diagnose ---

    console.log(`UI-Filter für Job ${jobId} ermittelt:`, JSON.parse(JSON.stringify(newActiveFilters)));


    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithActiveFilters === 'function') {
        window.WEBFLOW_API.cache.updateJobCacheWithActiveFilters(jobId, newActiveFilters);
    } else {
        console.warn("applyAndReloadApplicants: window.WEBFLOW_API.cache.updateJobCacheWithActiveFilters is not available. 'newActiveFilters' will be passed directly for this operation.");
    }
    
    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.logCacheState === 'function') {
        // window.WEBFLOW_API.cache.logCacheState(jobId, "Nach (versuchter) Aktualisierung der aktiven Filter in applyAndReloadApplicants");
    }

    filterAndSortApplicants(jobId, newActiveFilters);

    if (window.WEBFLOW_API.appLogic && typeof window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob === 'function') {
      await window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, 1); // Reset to page 1
    } else {
      console.error("applyAndReloadApplicants: loadAndDisplayApplicantsForJob function not found on window.WEBFLOW_API.appLogic or appLogic itself is missing.");
    }

    const filterRow = applicantsListContainer.querySelector(".db-table-filter-row");
    const activeFiltersDisplayContainer = filterRow ? filterRow.querySelector(".db-active-filters-display") : null;
    
    if (activeFiltersDisplayContainer && window.WEBFLOW_API.ui && typeof window.WEBFLOW_API.ui.renderActiveFilterBadgesUI === 'function') {
      window.WEBFLOW_API.ui.renderActiveFilterBadgesUI(jobId, activeFiltersDisplayContainer, applicantsListContainer, paginationWrapper);
    } else {
      // console.warn("Container für aktive Filter-Badges nicht gefunden oder renderActiveFilterBadgesUI nicht verfügbar auf window.WEBFLOW_API.ui.");
    }

    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.logCacheState === 'function') {
        // window.WEBFLOW_API.cache.logCacheState(jobId, "Nach applyAndReloadApplicants Abschluss");
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
    // console.log(`initializeJobData: Start für Job ${jobId}. Bewerber-IDs vom Job-Objekt:`, applicantIdsFromJob);
    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.initializeJobCache === 'function') {
        window.WEBFLOW_API.cache.initializeJobCache(jobId); // Ensures cache entry exists with default activeFilters
    } else {
        console.warn("initializeJobData: window.WEBFLOW_API.cache.initializeJobCache is not available.");
    }

    if (jobDetailsFromMJ) {
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithJobDetails === 'function') {
          window.WEBFLOW_API.cache.updateJobCacheWithJobDetails(jobId, jobDetailsFromMJ);
      } else {
          console.warn("initializeJobData: window.WEBFLOW_API.cache.updateJobCacheWithJobDetails is not available.");
      }
    } else {
      console.warn(`initializeJobData: Job-Details für Job ${jobId} wurden nicht übergeben.`);
    }

    if (!applicantIdsFromJob || applicantIdsFromJob.length === 0) {
      // console.log(`initializeJobData: Job ${jobId} hat keine Bewerber-IDs. Initialisiere mit leeren Bewerbern.`);
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithApplicants === 'function') {
          window.WEBFLOW_API.cache.updateJobCacheWithApplicants(jobId, []);
      } else {
          console.warn("initializeJobData: window.WEBFLOW_API.cache.updateJobCacheWithApplicants is not available.");
      }
      filterAndSortApplicants(jobId); // Uses default filters from initialized cache
      return true;
    }

    try {
      const applicants = await fetchApplicantData(jobId, applicantIdsFromJob);
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithApplicants === 'function') {
          window.WEBFLOW_API.cache.updateJobCacheWithApplicants(jobId, applicants);
      } else {
          console.warn("initializeJobData: window.WEBFLOW_API.cache.updateJobCacheWithApplicants is not available.");
      }
      filterAndSortApplicants(jobId); // Uses default filters from initialized cache
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.logCacheState === 'function') {
          // window.WEBFLOW_API.cache.logCacheState(jobId, "Nach Initialisierung der Job-Daten (inkl. Bewerber)");
      }
      return true;
    } catch (error) {
      console.error(`initializeJobData: Fehler beim Initialisieren der Daten für Job ${jobId}:`, error);
      const errorApplicants = applicantIdsFromJob.map(id => ({
        id,
        error: true,
        message: `Fehler beim Laden der Bewerberdaten für Job ${jobId}: ${error.message}`,
        status: 'init_error'
      }));
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithApplicants === 'function') {
          window.WEBFLOW_API.cache.updateJobCacheWithApplicants(jobId, errorApplicants);
      } else {
          console.warn("initializeJobData: window.WEBFLOW_API.cache.updateJobCacheWithApplicants is not available. Cannot store error state for applicants.");
      }
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
