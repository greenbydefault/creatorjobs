// brands/campaign/src/core/favoriteService.js
(function () {
  'use strict';

  // Sicherstellen, dass der globale Namespace existiert
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.core = window.WEBFLOW_API.core || {};

  /**
   * Service zur Verwaltung von Favoriten für Bewerber innerhalb eines Jobs.
   */
  class FavoriteService {
    constructor() {
      // Abhängigkeiten aus dem globalen Namespace holen (werden zur Laufzeit aufgelöst)
      this.cache = window.WEBFLOW_API.cache;
      this.webflowService = window.WEBFLOW_API.services; // webflowService.js muss updateJobItem bereitstellen
      this.config = window.WEBFLOW_API.config;
    }

    /**
     * Überprüft, ob ein Bewerber ein Favorit für einen bestimmten Job ist.
     * @param {string} jobId - Die ID des Jobs.
     * @param {string} applicantId - Die Webflow Member ID des Bewerbers.
     * @returns {boolean} True, wenn der Bewerber ein Favorit ist, sonst false.
     */
    isFavorite(jobId, applicantId) {
      if (!jobId || !applicantId || !this.cache || !this.cache.jobDataCache || !this.cache.jobDataCache[jobId]) {
        // console.warn('FavoriteService.isFavorite: Cache oder Job-Daten nicht verfügbar.', { jobId, applicantId });
        return false;
      }
      const jobData = this.cache.jobDataCache[jobId].jobDetails;
      if (!jobData || !jobData.fieldData || !Array.isArray(jobData.fieldData['job-favoriten'])) {
        // console.warn('FavoriteService.isFavorite: job-favoriten nicht im Cache gefunden oder kein Array.', { jobId, jobData });
        return false;
      }
      return jobData.fieldData['job-favoriten'].includes(applicantId);
    }

    /**
     * Schaltet den Favoritenstatus eines Bewerbers für einen Job um.
     * @param {string} jobId - Die ID des Jobs.
     * @param {string} applicantId - Die Webflow Member ID des Bewerbers.
     * @returns {Promise<boolean|null>} Der neue Favoritenstatus (true, wenn Favorit, false, wenn nicht) oder null bei einem Fehler.
     */
    async toggleFavorite(jobId, applicantId) {
      if (!jobId || !applicantId) {
        console.error('FavoriteService.toggleFavorite: JobID oder ApplicantID fehlt.');
        return null;
      }
      if (!this.cache || !this.webflowService || !this.config) {
        console.error('FavoriteService.toggleFavorite: Abhängigkeiten (cache, webflowService, config) nicht geladen.');
        return null;
      }
      if (!this.webflowService.updateJobItem_MJ) {
        console.error('FavoriteService.toggleFavorite: updateJobItem_MJ Funktion im webflowService nicht gefunden.');
        return null;
      }

      // 1. Aktuelle Favoritenliste aus dem Cache holen (oder direkt vom Job-Item, falls Cache nicht aktuell ist)
      // Für Robustheit holen wir die Job-Details, falls sie nicht tief im Cache sind.
      let jobCacheEntry = this.cache.getJobDataFromCache(jobId); // Stellt sicher, dass der Eintrag existiert
      let jobDetails = jobCacheEntry.jobDetails;

      // Falls jobDetails (insbesondere fieldData) noch nicht im Cache sind, versuchen, sie zu laden
      if (!jobDetails || !jobDetails.fieldData) {
        console.warn(`FavoriteService.toggleFavorite: Job-Details für Job ${jobId} nicht vollständig im Cache. Versuche Nachladen.`);
        const fetchedJob = await this.webflowService.fetchWebflowItem(this.config.JOB_COLLECTION_ID_MJ, jobId);
        if (fetchedJob && !fetchedJob.error && fetchedJob.fieldData) {
          this.cache.updateJobCacheWithJobDetails(jobId, fetchedJob); // Cache aktualisieren
          jobDetails = fetchedJob;
          jobCacheEntry = this.cache.getJobDataFromCache(jobId); // Cache-Eintrag neu holen
        } else {
          console.error(`FavoriteService.toggleFavorite: Konnte Job-Details für Job ${jobId} nicht laden.`);
          return null;
        }
      }

      const currentFavorites = Array.isArray(jobDetails.fieldData['job-favoriten'])
        ? [...jobDetails.fieldData['job-favoriten']] // Kopie erstellen
        : [];

      const isCurrentlyFavorite = currentFavorites.includes(applicantId);
      let newFavoritesList;
      let newFavoriteStatus;

      if (isCurrentlyFavorite) {
        // Entfernen
        newFavoritesList = currentFavorites.filter(id => id !== applicantId);
        newFavoriteStatus = false;
        console.log(`FavoriteService: Entferne ${applicantId} von Favoriten für Job ${jobId}.`);
      } else {
        // Hinzufügen
        newFavoritesList = [...currentFavorites, applicantId];
        newFavoriteStatus = true;
        console.log(`FavoriteService: Füge ${applicantId} zu Favoriten für Job ${jobId} hinzu.`);
      }

      try {
        // 2. Änderung an Webflow senden
        // Das Feld in Webflow heißt 'job-favoriten' und erwartet ein Array von Referenz-IDs (Strings)
        const updatedFieldData = {
          'job-favoriten': newFavoritesList
        };

        const success = await this.webflowService.updateJobItem_MJ(jobId, updatedFieldData);

        if (success) {
          // 3. Cache aktualisieren
          // Stelle sicher, dass fieldData existiert
          if (!jobDetails.fieldData) {
            jobDetails.fieldData = {};
          }
          jobDetails.fieldData['job-favoriten'] = newFavoritesList;
          this.cache.updateJobCacheWithJobDetails(jobId, jobDetails); // Aktualisiert den gesamten jobDetails-Teil des Caches
          console.log(`FavoriteService: Cache für Job ${jobId} mit neuer Favoritenliste aktualisiert.`);

          // 4. UI-Update-Event auslösen (optional, aber gut für Entkopplung)
          document.dispatchEvent(new CustomEvent('favoritesUpdated', {
            detail: {
              jobId: jobId,
              applicantId: applicantId,
              isFavorite: newFavoriteStatus,
              updatedFavoritesList: newFavoritesList // Die gesamte neue Liste für den Job
            }
          }));

          return newFavoriteStatus;
        } else {
          console.error(`FavoriteService.toggleFavorite: Fehler beim Aktualisieren des Job-Items ${jobId} in Webflow.`);
          return null;
        }
      } catch (error) {
        console.error(`FavoriteService.toggleFavorite: Schwerwiegender Fehler für Job ${jobId}, Applicant ${applicantId}:`, error);
        return null;
      }
    }
  }

  // Service-Instanz im globalen Namespace registrieren
  window.WEBFLOW_API.core.favoriteService = new FavoriteService();
  console.log("FavoriteService (favoriteService.js) wurde initialisiert und im globalen Namespace registriert.");

})();
