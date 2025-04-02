// src/modules/api-service.js
(function() {
  'use strict';

  // Zugriff auf globale Objekte
  const CONFIG = window.WEBFLOW_API.config;
  const DEBUG = window.WEBFLOW_API.debug;
  
  // Rest des Moduls...
  
  // Registriere im globalen Namespace
  window.WEBFLOW_API.something = new SomethingClass();
})();

class ApiService {
    /**
     * Erstellt eine Worker-URL für Cross-Origin-Anfragen
     * @param {string} apiUrl - Die Original-API-URL
     * @returns {string} - Die Worker-URL
     */
    buildWorkerUrl(apiUrl) {
        return `${CONFIG.WORKER_BASE_URL}${encodeURIComponent(apiUrl)}`;
    }

    /**
     * Erstellt einen vollständigen API-Endpunkt
     * @param {string} path - Der API-Pfad
     * @param {Object} params - Query-Parameter
     * @returns {string} - Die vollständige API-URL
     */
    buildApiUrl(path, params = {}) {
        const baseUrl = CONFIG.BASE_URL;
        const fullUrl = `${baseUrl}${path}`;
        
        // Parameter als Query-String hinzufügen, wenn vorhanden
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
            if (value === undefined) continue;
            
            if (typeof value === 'object') {
                queryParams.append(key, encodeURIComponent(JSON.stringify(value)));
            } else {
                queryParams.append(key, value);
            }
        }
        
        const queryString = queryParams.toString();
        const finalUrl = queryString ? `${fullUrl}?${queryString}` : fullUrl;
        
        DEBUG.log(`API-URL erstellt: ${finalUrl}`);
        return finalUrl;
    }

    /**
     * Führt eine API-Anfrage durch mit Retry-Logik
     * @param {string} url - Die API-URL
     * @param {Object} options - Fetch-Optionen
     * @param {number} retries - Anzahl der Wiederholungsversuche
     * @returns {Promise<Object>} - Die API-Antwort
     */
    async fetchApi(url, options = {}, retries = 2) {
        let attempt = 1;
        
        while (true) {
            try {
                DEBUG.log(`API-Anfrage (Versuch ${attempt}/${retries + 1}) an ${url}`);
                const response = await fetch(url, options);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    DEBUG.log(`API-Fehler ${response.status}: ${errorText}`, null, 'error');
                    
                    if (attempt <= retries) {
                        const delay = Math.min(1000 * attempt, 3000); // Exponential Backoff
                        DEBUG.log(`Wiederhole in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        attempt++;
                        continue;
                    }
                    
                    throw new Error(`API-Fehler: ${response.status} - ${errorText.substring(0, 100)}`);
                }
                
                // Versuche, die Antwort als JSON zu parsen
                try {
                    return await response.json();
                } catch (parseError) {
                    // Wenn JSON-Parsing fehlschlägt, gib den Text zurück
                    const text = await response.text();
                    if (text.trim() === '') {
                        return { success: true }; // Leere Antwort gilt als Erfolg
                    }
                    return { success: true, text };
                }
            } catch (error) {
                if (attempt <= retries) {
                    const delay = Math.min(1000 * attempt, 3000);
                    DEBUG.log(`Fehler, wiederhole in ${delay}ms... ${error.message}`, null, 'warn');
                    await new Promise(resolve => setTimeout(resolve, delay));
                    attempt++;
                    continue;
                }
                DEBUG.log('Maximale Anzahl an Versuchen erreicht', error, 'error');
                throw error;
            }
        }
    }
}

// Singleton-Instanz exportieren
export const API = new ApiService();
