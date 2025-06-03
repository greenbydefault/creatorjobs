(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.core = window.WEBFLOW_API.core || {};

  const services = window.WEBFLOW_API.services || {};
  const {
    fetchWebflowItem,
  } = services;

  const utils = window.WEBFLOW_API.utils || {};
  const {
    normalizeUrl,
    delay: utilDelay
  } = utils;

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
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error("Error fetching an applicant:", result.reason);
        const id = result.reason && result.reason.id ? result.reason.id : 'unknown_applicant_id';
        return {
          id: id,
          error: true,
          message: result.reason?.message || "Unbekannter Fehler beim Abrufen eines Bewerbers.",
          status: result.reason?.status || 'promise_rejected'
        };
      }
    });
  }

  function filterAndSortApplicants(jobId, explicitFilters = null) {
    let jobCache = null;
    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.getJobDataFromCache === 'function') {
        jobCache = window.WEBFLOW_API.cache.getJobDataFromCache(jobId);
    } else {
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
        } else {
            console.warn(`filterAndSortApplicants: Keine expliziten Filter übergeben und keine activeFilters im Cache für Job ${jobId}. Verwende Standard (keine Filter).`);
            activeFiltersToUse = { follower: [], category: [], creatorType: [], relevantOnly: false, plusOnly: false }; // Default für plusOnly hinzugefügt
        }
    }

    console.log(`filterAndSortApplicants: Job ${jobId}, activeFiltersToUse:`, JSON.parse(JSON.stringify(activeFiltersToUse)));

    const filteredApplicants = allItems.filter(applicant => {
      const applicantNameOrId = applicant.fieldData?.name || applicant.id || "Unbekannter Bewerber";

      if (applicant.error || !applicant.fieldData) {
        if (activeFiltersToUse && (activeFiltersToUse.relevantOnly || activeFiltersToUse.plusOnly)) { // Auch bei plusOnly filtern, wenn fieldData fehlt
            console.log(`[Filter] Filtert Bewerber (Fehler/keine fieldData): ${applicantNameOrId}`);
            return false;
        }
        return true; 
      }

      const fieldData = applicant.fieldData;

      // Neuer Filter: Nur Plus Mitglieder
      if (activeFiltersToUse && activeFiltersToUse.plusOnly) {
        if (!fieldData["plus-mitglied"]) { // Annahme: "plus-mitglied" ist ein Boolean-Feld
            // console.log(`[PlusOnly] Filtert ${applicantNameOrId} (kein Plus-Mitglied)`);
            return false;
        }
      }

      if (activeFiltersToUse && activeFiltersToUse.relevantOnly) {
        console.log(`[RelevantOnly] Prüfung für Bewerber: ${applicantNameOrId}`);
        let hasSocialMedia = false;
        const normalizeUrlFunc = typeof normalizeUrl === 'function' ? normalizeUrl : null;
        
        if (fieldData && normalizeUrlFunc) {
          const socialKeys = ['instagram', 'tiktok', 'youtube'];
          for (const key of socialKeys) {
            const rawUrl = fieldData[key];
            const normalized = normalizeUrlFunc(rawUrl);
            // console.log(`  [RelevantOnly] Social Key '${key}': Roh='${rawUrl}', Normalisiert='${normalized}'`); // Auskommentiert für weniger Logs
            if (normalized) {
              hasSocialMedia = true;
            }
          }
        } else {
            console.log(`  [RelevantOnly] normalizeUrlFunc nicht verfügbar oder keine fieldData für Social Media Check.`);
        }
        // console.log(`  [RelevantOnly] Finale Prüfung für ${applicantNameOrId}: hasSocialMedia=${hasSocialMedia}`); // Auskommentiert

        if (!hasSocialMedia) {
            console.log(`  [RelevantOnly] >>> WIRD GEFILTERT (keine Social Media Links): ${applicantNameOrId}`);
            return false;
        } else {
            // console.log(`  [RelevantOnly] >>> WIRD BEIBEHALTEN (hat Social Media Links): ${applicantNameOrId}`); // Auskommentiert
        }
      }

      if (activeFiltersToUse?.follower?.length > 0) {
        const followerRangeId = fieldData["creator-follower"];
        if (!followerRangeId || !activeFiltersToUse.follower.includes(followerRangeId)) {
            return false;
        }
      }
      if (activeFiltersToUse?.category?.length > 0) {
        const category = fieldData["creator-main-categorie"];
        if (!category || !activeFiltersToUse.category.includes(category)) {
            return false;
        }
      }
      if (activeFiltersToUse?.creatorType?.length > 0) {
        const creatorTypeId = fieldData["creator-type"];
        if (!creatorTypeId || !activeFiltersToUse.creatorType.includes(creatorTypeId)) {
            return false;
        }
      }
      return true;
    });

    console.log(`filterAndSortApplicants: Job ${jobId}, Anzahl gefilterter Bewerber: ${filteredApplicants.length}`);

    const sortedApplicants = filteredApplicants.sort((a, b) => {
      if (a.error && !b.error) return 1;
      if (!a.error && b.error) return -1;
      if (a.error && b.error) return (a.id || '').localeCompare(b.id || '');
      const nameA = (a.fieldData?.name) || '';
      const nameB = (b.fieldData?.name) || '';
      const nameCompare = nameA.localeCompare(nameB);
      if (nameCompare !== 0) return nameCompare;
      return (a.id || '').localeCompare(b.id || '');
    });

    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithSortedAndFilteredItems === 'function') {
        window.WEBFLOW_API.cache.updateJobCacheWithSortedAndFilteredItems(jobId, sortedApplicants);
    } else {
        console.warn("filterAndSortApplicants: window.WEBFLOW_API.cache.updateJobCacheWithSortedAndFilteredItems is not available.");
    }
    return sortedApplicants;
  }

  async function applyAndReloadApplicants(jobId, applicantsListContainer, paginationWrapper) {
    console.log(`applyAndReloadApplicants called for Job ID: ${jobId}`);
    const newActiveFilters = { follower: [], category: [], creatorType: [], relevantOnly: false, plusOnly: false }; // plusOnly hinzugefügt

    const followerCheckboxes = document.querySelectorAll(`input[type="checkbox"][data-filter-type="follower"][id^="filter-${jobId}-follower-"]:checked`);
    followerCheckboxes.forEach(cb => cb.dataset.filterValue ? newActiveFilters.follower.push(cb.dataset.filterValue) : console.warn("Follower checkbox found without data-filter-value:", cb));

    const categoryCheckboxes = document.querySelectorAll(`input[type="checkbox"][data-filter-type="category"][id^="filter-${jobId}-category-"]:checked`);
    categoryCheckboxes.forEach(cb => cb.dataset.filterValue ? newActiveFilters.category.push(cb.dataset.filterValue) : console.warn("Category checkbox found without data-filter-value:", cb));

    const creatorTypeCheckboxes = document.querySelectorAll(`input[type="checkbox"][data-filter-type="creatorType"][id^="filter-${jobId}-creatorType-"]:checked`);
    creatorTypeCheckboxes.forEach(cb => cb.dataset.filterValue ? newActiveFilters.creatorType.push(cb.dataset.filterValue) : console.warn("CreatorType checkbox found without data-filter-value:", cb));

    const relevantOnlyCheckbox = document.getElementById(`filter-${jobId}-relevantOnly`);
    if (relevantOnlyCheckbox && relevantOnlyCheckbox.checked) {
      newActiveFilters.relevantOnly = true;
    }

    // Status der "Nur Plus Mitglieder"-Checkbox auslesen
    const plusOnlyCheckbox = document.getElementById(`filter-${jobId}-plusOnly`);
    if (plusOnlyCheckbox && plusOnlyCheckbox.checked) {
        newActiveFilters.plusOnly = true;
    }

    console.log(`UI-Filter für Job ${jobId} ermittelt:`, JSON.parse(JSON.stringify(newActiveFilters)));

    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithActiveFilters === 'function') {
        window.WEBFLOW_API.cache.updateJobCacheWithActiveFilters(jobId, newActiveFilters);
    } else {
        console.warn("applyAndReloadApplicants: window.WEBFLOW_API.cache.updateJobCacheWithActiveFilters is not available.");
    }

    filterAndSortApplicants(jobId, newActiveFilters);

    if (window.WEBFLOW_API.appLogic && typeof window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob === 'function') {
      await window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, 1);
    } else {
      console.error("applyAndReloadApplicants: loadAndDisplayApplicantsForJob function not found on window.WEBFLOW_API.appLogic.");
    }

    const filterRow = applicantsListContainer.querySelector(".db-table-filter-row");
    const activeFiltersDisplayContainer = filterRow ? filterRow.querySelector(".db-active-filters-display") : null;
    if (activeFiltersDisplayContainer && window.WEBFLOW_API.ui && typeof window.WEBFLOW_API.ui.renderActiveFilterBadgesUI === 'function') {
      window.WEBFLOW_API.ui.renderActiveFilterBadgesUI(jobId, activeFiltersDisplayContainer, applicantsListContainer, paginationWrapper);
    }
  }

  async function initializeJobData(jobId, applicantIdsFromJob, jobDetailsFromMJ) {
    if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.initializeJobCache === 'function') {
        window.WEBFLOW_API.cache.initializeJobCache(jobId);
    } else {
        console.warn("initializeJobData: window.WEBFLOW_API.cache.initializeJobCache is not available.");
    }
    if (jobDetailsFromMJ) {
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithJobDetails === 'function') {
          window.WEBFLOW_API.cache.updateJobCacheWithJobDetails(jobId, jobDetailsFromMJ);
      } else {
          console.warn("initializeJobData: window.WEBFLOW_API.cache.updateJobCacheWithJobDetails is not available.");
      }
    }
    if (!applicantIdsFromJob || applicantIdsFromJob.length === 0) {
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithApplicants === 'function') {
          window.WEBFLOW_API.cache.updateJobCacheWithApplicants(jobId, []);
      } else {
          console.warn("initializeJobData: window.WEBFLOW_API.cache.updateJobCacheWithApplicants is not available.");
      }
      filterAndSortApplicants(jobId);
      return true;
    }
    try {
      const applicants = await fetchApplicantData(jobId, applicantIdsFromJob);
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithApplicants === 'function') {
          window.WEBFLOW_API.cache.updateJobCacheWithApplicants(jobId, applicants);
      } else {
          console.warn("initializeJobData: window.WEBFLOW_API.cache.updateJobCacheWithApplicants is not available.");
      }
      filterAndSortApplicants(jobId);
      return true;
    } catch (error) {
      console.error(`initializeJobData: Fehler beim Initialisieren der Daten für Job ${jobId}:`, error);
      const errorApplicants = applicantIdsFromJob.map(id => ({
        id, error: true, message: `Fehler beim Laden der Bewerberdaten für Job ${jobId}: ${error.message}`, status: 'init_error'
      }));
      if (window.WEBFLOW_API.cache && typeof window.WEBFLOW_API.cache.updateJobCacheWithApplicants === 'function') {
          window.WEBFLOW_API.cache.updateJobCacheWithApplicants(jobId, errorApplicants);
      } else {
          console.warn("initializeJobData: window.WEBFLOW_API.cache.updateJobCacheWithApplicants is not available.");
      }
      filterAndSortApplicants(jobId);
      return false;
    }
  }

  window.WEBFLOW_API.core.fetchApplicantData = fetchApplicantData;
  window.WEBFLOW_API.core.filterAndSortApplicants = filterAndSortApplicants;
  window.WEBFLOW_API.core.applyAndReloadApplicants = applyAndReloadApplicants;
  window.WEBFLOW_API.core.initializeJobData = initializeJobData;

})();
