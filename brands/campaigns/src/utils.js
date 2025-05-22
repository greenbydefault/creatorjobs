// src/utils.js
(function() {
    'use strict';

    window.WEBFLOW_API = window.WEBFLOW_API || {};

    const utils = {
        /**
         * Erzeugt eine Promise, die nach einer bestimmten Zeit aufgelöst wird.
         * @param {number} ms - Die Verzögerungszeit in Millisekunden.
         * @returns {Promise<void>}
         */
        delay: function(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        /**
         * Normalisiert eine URL, indem sichergestellt wird, dass sie mit http:// oder https:// beginnt.
         * @param {string | null | undefined} url - Die zu normalisierende URL.
         * @returns {string | null} - Die normalisierte URL oder null, wenn die Eingabe ungültig ist.
         */
        normalizeUrl: function(url) {
            if (!url || typeof url !== 'string') return null;
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }
            return `https://${url}`;
        }
    };

    window.WEBFLOW_API.utils = utils;

})();
