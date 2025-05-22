(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.config = window.WEBFLOW_API.config || {};

  // 🔧 Konfiguration
  window.WEBFLOW_API.config.API_BASE_URL_MJ = "https://api.webflow.com/v2/collections";
  window.WEBFLOW_API.config.WORKER_BASE_URL_MJ = "https://meine-kampagnen.oliver-258.workers.dev/"; // Stelle sicher, dass dieser mit / endet, falls nötig, oder passe buildWorkerUrl an
  window.WEBFLOW_API.config.JOB_COLLECTION_ID_MJ = "6448faf9c5a8a17455c05525";
  window.WEBFLOW_API.config.USER_COLLECTION_ID_MJ = "6448faf9c5a8a15f6cc05526";
  window.WEBFLOW_API.config.SKELETON_JOBS_COUNT_MJ = 3;
  window.WEBFLOW_API.config.API_CALL_DELAY_MS = 5; // Verzögerung zwischen API-Aufrufen in Millisekunden

})();
