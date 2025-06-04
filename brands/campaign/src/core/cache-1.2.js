// brands/campaign/src/core/cache-1.1.js
(function () {
  'use strict';

  window.WEBFLOW_API = window.WEBFLOW_API || {};
  const cacheAPI = window.WEBFLOW_API.cache = window.WEBFLOW_API.cache || {};

  cacheAPI.currentWebflowMemberId_MJ = null;
  cacheAPI.allMyJobsData_MJ = [];
  cacheAPI.jobDataCache = {};
  cacheAPI.currentApplicantPageSize = 15;

  /**
   * Initialisiert einen Cache-Eintrag für eine gegebene Job-ID oder stellt sicher,
   * dass die notwendige Struktur vorhanden ist, ohne bestehende jobDetails zu überschreiben.
   * @param {string} jobId - Die ID des Jobs.
   */
  cacheAPI.initializeJobCache = function(jobId) {
    if (!jobId) {
      console.error("initializeJobCache: jobId ist undefiniert oder null.");
      return;
    }
    if (!cacheAPI.jobDataCache[jobId]) {
      // Der Eintrag existiert noch nicht, also mit Standardstruktur initialisieren
      console.log(`Cache-Eintrag für Job ID ${jobId} existierte nicht. Initialisiere jetzt mit Standardstruktur.`);
      cacheAPI.jobDataCache[jobId] = {
        allItems: [],
        sortedAndFilteredItems: [],
        activeFilters: { follower: [], category: [], creatorType: [], relevantOnly: false, plusOnly: false },
        jobDetails: {} // jobDetails wird initial leer sein und später befüllt
      };
    } else {
      // Der Eintrag existiert bereits. Stelle sicher, dass alle Untereigenschaften vorhanden sind,
      // aber überschreibe jobDetails NICHT, wenn es bereits Daten enthält.
      const entry = cacheAPI.jobDataCache[jobId];
      if (!entry.allItems) entry.allItems = [];
      if (!entry.sortedAndFilteredItems) entry.sortedAndFilteredItems = [];
      if (!entry.activeFilters) entry.activeFilters = { follower: [], category: [], creatorType: [], relevantOnly: false, plusOnly: false };
      if (!entry.jobDetails) entry.jobDetails = {}; // Nur initialisieren, wenn es wirklich fehlt
      // console.log(`Cache für Job ID ${jobId} existiert bereits. Sub-Properties sichergestellt.`);
    }
  };

  /**
   * Ruft den gesamten Cache-Eintrag für eine spezifische Job-ID ab.
   * Stellt sicher, dass der Cache-Eintrag initialisiert ist.
   * @param {string} jobId - Die ID des Jobs.
   * @returns {Object|null} Der Cache-Eintrag für den Job oder null bei ungültiger JobId.
   */
  cacheAPI.getJobDataFromCache = function(jobId) {
    if (!jobId) {
      console.error("getJobDataFromCache: jobId ist undefiniert oder null.");
      return null;
    }
    cacheAPI.initializeJobCache(jobId); // Stellt sicher, dass der Eintrag und seine Struktur existieren
    return cacheAPI.jobDataCache[jobId];
  };

  /**
   * Aktualisiert die aktiven Filter für einen spezifischen Job im Cache.
   * @param {string} jobId - Die ID des Jobs.
   * @param {Object} newFilters - Die neuen aktiven Filter-Einstellungen.
   */
  cacheAPI.updateJobCacheWithActiveFilters = function(jobId, newFilters) {
    if (!jobId) {
      console.error("updateJobCacheWithActiveFilters: jobId ist undefiniert oder null.");
      return;
    }
    cacheAPI.initializeJobCache(jobId); // Sicherstellen, dass der Eintrag existiert
    cacheAPI.jobDataCache[jobId].activeFilters = newFilters;
    // console.log(`Aktive Filter für Job ID ${jobId} im Cache aktualisiert:`, JSON.parse(JSON.stringify(newFilters)));
  };

  /**
   * Aktualisiert die rohen Bewerber-Items für einen spezifischen Job im Cache.
   * @param {string} jobId - Die ID des Jobs.
   * @param {Array<Object>} applicants - Das Array der Bewerber-Items.
   */
  cacheAPI.updateJobCacheWithApplicants = function(jobId, applicants) {
    if (!jobId) {
      console.error("updateJobCacheWithApplicants: jobId ist undefiniert oder null.");
      return;
    }
    cacheAPI.initializeJobCache(jobId); // Sicherstellen, dass der Eintrag existiert
    cacheAPI.jobDataCache[jobId].allItems = applicants;
    // console.log(`${applicants.length} rohe Bewerber-Items für Job ID ${jobId} im Cache gespeichert.`);
  };

  /**
   * Aktualisiert die Job-Details (fieldData des Job-Items) für einen spezifischen Job im Cache.
   * @param {string} jobId - Die ID des Jobs.
   * @param {Object} jobDetails - Das Job-Details-Objekt.
   */
  cacheAPI.updateJobCacheWithJobDetails = function(jobId, jobDetails) {
    if (!jobId) {
      console.error("updateJobCacheWithJobDetails: jobId ist undefiniert oder null.");
      return;
    }
    cacheAPI.initializeJobCache(jobId); // Sicherstellen, dass der Eintrag existiert
    // Wichtig: Hier werden die jobDetails gesetzt. Wenn initializeJobCache vorher
    // jobDetails auf {} gesetzt hat (weil der Eintrag neu war), ist das okay.
    // Wenn der Eintrag existierte, hat initializeJobCache die bestehenden jobDetails nicht überschrieben.
    cacheAPI.jobDataCache[jobId].jobDetails = jobDetails;
    // console.log(`Job-Details für Job ID ${jobId} im Cache gespeichert.`);
  };

  /**
   * Aktualisiert die sortierten und gefilterten Bewerber-Items für einen spezifischen Job im Cache.
   * @param {string} jobId - Die ID des Jobs.
   * @param {Array<Object>} items - Das Array der sortierten und gefilterten Bewerber-Items.
   */
  cacheAPI.updateJobCacheWithSortedAndFilteredItems = function(jobId, items) {
    if (!jobId) {
      console.error("updateJobCacheWithSortedAndFilteredItems: jobId ist undefiniert oder null.");
      return;
    }
    cacheAPI.initializeJobCache(jobId); // Sicherstellen, dass der Eintrag existiert
    cacheAPI.jobDataCache[jobId].sortedAndFilteredItems = items;
    // console.log(`${items.length} sortierte/gefilterte Items für Job ID ${jobId} im Cache gespeichert.`);
  };

  cacheAPI.logCacheState = function(jobId, message = "Current Cache State") {
    if (!jobId) {
      console.warn("logCacheState: jobId ist undefiniert oder null. Logge allgemeinen Cache, falls verfügbar.");
      console.log(`Allgemeiner Cache-Status (${message}):`, JSON.parse(JSON.stringify(cacheAPI.jobDataCache)));
      return;
    }
    if (cacheAPI.jobDataCache[jobId]) {
      console.log(`Cache-Status für Job ID ${jobId} (${message}):`, JSON.parse(JSON.stringify(cacheAPI.jobDataCache[jobId])));
    } else {
      console.log(`Cache-Status für Job ID ${jobId} (${message}): Noch nicht initialisiert.`);
    }
  };

  cacheAPI.clearJobCacheEntry = function(jobId) {
    if (!jobId) {
      console.warn("clearJobCacheEntry: jobId ist undefiniert oder null.");
      return;
    }
    if (cacheAPI.jobDataCache[jobId]) {
      delete cacheAPI.jobDataCache[jobId];
      console.log(`Cache-Eintrag für Job ID ${jobId} gelöscht.`);
    } else {
      console.log(`Kein Cache-Eintrag zum Löschen für Job ID ${jobId}.`);
    }
  };

  cacheAPI.clearAllJobSpecificCache = function() {
    cacheAPI.jobDataCache = {};
    console.log("Alle job-spezifischen Cache-Einträge (jobDataCache) wurden gelöscht.");
  };

  console.log("WEBFLOW_API.cache Modul (cache-1.1.js) überarbeitet initialisiert.");
})();
