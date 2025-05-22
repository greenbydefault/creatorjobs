(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.utils = window.WEBFLOW_API.utils || {};

  /**
   * Erzeugt eine Verzögerung.
   * @param {number} ms - Die Verzögerung in Millisekunden.
   * @returns {Promise<void>}
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Normalisiert eine URL, indem es https:// voranstellt, falls kein Protokoll vorhanden ist.
   * @param {string | null | undefined} url - Die zu normalisierende URL.
   * @returns {string | null} Die normalisierte URL oder null bei ungültiger Eingabe.
   */
  function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  }

  // Funktionen dem WEBFLOW_API Objekt hinzufügen, um sie global verfügbar zu machen
  window.WEBFLOW_API.utils.delay = delay;
  window.WEBFLOW_API.utils.normalizeUrl = normalizeUrl;

})();
