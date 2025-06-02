(function () {
  'use strict';

  // Ensure the global WEBFLOW_API and WEBFLOW_API.cache namespaces exist
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  const cacheAPI = window.WEBFLOW_API.cache = window.WEBFLOW_API.cache || {};

  // --- Private Helper Functions (optional, but good practice) ---
  function _ensureJobCacheEntry(jobId) {
    if (!cacheAPI.jobDataCache[jobId]) {
      console.warn(`Cache entry for Job ID ${jobId} did not exist. Initializing now.`);
      cacheAPI.initializeJobCache(jobId); // Call the public initializer
    }
  }

  // --- Global Cache Data Structures ---
  cacheAPI.currentWebflowMemberId_MJ = null; // Stores the Webflow Member ID of the current user
  cacheAPI.allMyJobsData_MJ = []; // Stores raw data of all jobs fetched for the current user
  cacheAPI.jobDataCache = {};     // Main cache object, keyed by jobId
                                  // Structure of jobDataCache[jobId]:
                                  // {
                                  //   allItems: [], // Raw applicant items for this job
                                  //   sortedAndFilteredItems: [], // Filtered and sorted applicant items
                                  //   activeFilters: { follower: [], category: [], creatorType: [], relevantOnly: false },
                                  //   jobDetails: {} // Field data of the job item itself
                                  // }
  cacheAPI.currentApplicantPageSize = 15; // Default page size for applicant lists

  // --- Cache Management Functions ---

  /**
   * Initializes a cache entry for a given job ID if it doesn't already exist.
   * Sets up default structures for applicants, filters, and job details.
   * @param {string} jobId - The ID of the job to initialize the cache for.
   */
  cacheAPI.initializeJobCache = function(jobId) {
    if (!jobId) {
        console.error("initializeJobCache: jobId is undefined or null.");
        return;
    }
    if (!cacheAPI.jobDataCache[jobId]) {
      cacheAPI.jobDataCache[jobId] = {
        allItems: [],
        sortedAndFilteredItems: [],
        activeFilters: { // Default filters
          follower: [],
          category: [],
          creatorType: [],
          relevantOnly: false
        },
        jobDetails: {}
      };
      console.log(`Cache for Job ID ${jobId} initialized with default structure.`);
    } else {
      // console.log(`Cache for Job ID ${jobId} already exists. No re-initialization needed.`);
    }
  };

  /**
   * Retrieves the entire cache entry for a specific job ID.
   * Ensures the cache entry is initialized if it doesn't exist.
   * @param {string} jobId - The ID of the job.
   * @returns {Object|null} The cache entry for the job, or null if jobId is invalid.
   */
  cacheAPI.getJobDataFromCache = function(jobId) {
    if (!jobId) {
        console.error("getJobDataFromCache: jobId is undefined or null.");
        return null;
    }
    // Ensure the entry exists by calling initializeJobCache.
    // This guarantees that we always return a consistent structure, even if it's just the default empty one.
    cacheAPI.initializeJobCache(jobId);
    return cacheAPI.jobDataCache[jobId];
  };

  /**
   * Updates the active filters for a specific job in the cache.
   * @param {string} jobId - The ID of the job.
   * @param {Object} newFilters - The new active filter settings.
   */
  cacheAPI.updateJobCacheWithActiveFilters = function(jobId, newFilters) {
    if (!jobId) {
        console.error("updateJobCacheWithActiveFilters: jobId is undefined or null.");
        return;
    }
    _ensureJobCacheEntry(jobId); // Make sure the job entry exists
    cacheAPI.jobDataCache[jobId].activeFilters = newFilters;
    // console.log(`Active filters for Job ID ${jobId} updated in cache:`, JSON.parse(JSON.stringify(newFilters)));
  };

  /**
   * Updates the raw applicant items for a specific job in the cache.
   * @param {string} jobId - The ID of the job.
   * @param {Array<Object>} applicants - The array of applicant items.
   */
  cacheAPI.updateJobCacheWithApplicants = function(jobId, applicants) {
    if (!jobId) {
        console.error("updateJobCacheWithApplicants: jobId is undefined or null.");
        return;
    }
     _ensureJobCacheEntry(jobId);
    cacheAPI.jobDataCache[jobId].allItems = applicants;
    // console.log(`${applicants.length} raw applicant items for Job ID ${jobId} stored in cache.`);
  };

  /**
   * Updates the job details (fieldData of the job item) for a specific job in the cache.
   * @param {string} jobId - The ID of the job.
   * @param {Object} jobDetails - The job details object.
   */
  cacheAPI.updateJobCacheWithJobDetails = function(jobId, jobDetails) {
    if (!jobId) {
        console.error("updateJobCacheWithJobDetails: jobId is undefined or null.");
        return;
    }
    _ensureJobCacheEntry(jobId);
    cacheAPI.jobDataCache[jobId].jobDetails = jobDetails;
    // console.log(`Job details for Job ID ${jobId} stored in cache.`);
  };

  /**
   * Updates the sorted and filtered applicant items for a specific job in the cache.
   * @param {string} jobId - The ID of the job.
   * @param {Array<Object>} items - The array of sorted and filtered applicant items.
   */
  cacheAPI.updateJobCacheWithSortedAndFilteredItems = function(jobId, items) {
    if (!jobId) {
        console.error("updateJobCacheWithSortedAndFilteredItems: jobId is undefined or null.");
        return;
    }
    _ensureJobCacheEntry(jobId);
    cacheAPI.jobDataCache[jobId].sortedAndFilteredItems = items;
    // console.log(`${items.length} sorted/filtered items for Job ID ${jobId} stored in cache.`);
  };

  /**
   * Logs the current state of the cache for a specific job ID.
   * @param {string} jobId - The ID of the job.
   * @param {string} message - A descriptive message for the log.
   */
  cacheAPI.logCacheState = function(jobId, message = "Current Cache State") {
    if (!jobId) {
        console.warn("logCacheState: jobId is undefined or null. Logging general cache if available.");
        console.log(`General Cache State (${message}):`, JSON.parse(JSON.stringify(cacheAPI.jobDataCache)));
        return;
    }
    if (cacheAPI.jobDataCache[jobId]) {
      console.log(`Cache State for Job ID ${jobId} (${message}):`, JSON.parse(JSON.stringify(cacheAPI.jobDataCache[jobId])));
    } else {
      console.log(`Cache State for Job ID ${jobId} (${message}): Not yet initialized.`);
    }
  };

  /**
   * Clears the cache for a specific job ID.
   * @param {string} jobId - The ID of the job to clear from cache.
   */
  cacheAPI.clearJobCacheEntry = function(jobId) {
    if (!jobId) {
        console.warn("clearJobCacheEntry: jobId is undefined or null.");
        return;
    }
    if (cacheAPI.jobDataCache[jobId]) {
      delete cacheAPI.jobDataCache[jobId];
      console.log(`Cache entry for Job ID ${jobId} cleared.`);
    } else {
      console.log(`No cache entry to clear for Job ID ${jobId}.`);
    }
  };

  /**
   * Clears all job-specific cache entries.
   * Keeps other global cache variables like currentWebflowMemberId_MJ and allMyJobsData_MJ intact.
   */
  cacheAPI.clearAllJobSpecificCache = function() {
    cacheAPI.jobDataCache = {};
    console.log("All job-specific cache entries (jobDataCache) have been cleared.");
  };

  console.log("WEBFLOW_API.cache module initialized with functions.");

})();
