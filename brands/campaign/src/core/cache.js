(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.cache = window.WEBFLOW_API.cache || {};

  // Globale Cache- und Zustandvariablen
  window.WEBFLOW_API.cache.currentWebflowMemberId_MJ = null;
  window.WEBFLOW_API.cache.allMyJobsData_MJ = []; // Speichert die Rohdaten der Jobs des Nutzers
  window.WEBFLOW_API.cache.jobDataCache = {}; // Cache für Bewerberdaten und Jobdetails pro Job-ID
  // Struktur von jobDataCache[jobId]:
  // {
  //   allItems: [], // Alle rohen Bewerber-Items für diesen Job
  //   sortedAndFilteredItems: [], // Gefilterte und sortierte Bewerber-Items
  //   activeFilters: { follower: [] /* , andere Filter... */ },
  //   jobDetails: {} // Die Felddaten des Job-Items selbst
  // }

  window.WEBFLOW_API.cache.currentApplicantPageSize = 15; // Standard-Seitengröße für Bewerberlisten

})();
