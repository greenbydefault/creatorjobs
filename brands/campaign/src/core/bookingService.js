// brands/campaign/src/core/bookingService.js
(function () {
  'use strict';

  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.core = window.WEBFLOW_API.core || {};

  /**
   * Service zur Verwaltung von Buchungen (Zusagen) von Bewerbern für Jobs.
   * Aktualisiert sowohl das Job-Item ('booked-creators') als auch das User-Item ('booked-jobs').
   */
  class BookingService {
    constructor() {
      // Abhängigkeiten aus dem globalen Namespace holen
      this.cache = window.WEBFLOW_API.cache;
      this.webflowService = window.WEBFLOW_API.services;
      this.config = window.WEBFLOW_API.config;
    }

    /**
     * Überprüft, ob ein Bewerber für einen bestimmten Job gebucht (zugesagt) ist.
     * @param {string} jobId - Die ID des Jobs.
     * @param {string} applicantId - Die Webflow Member ID des Bewerbers.
     * @returns {boolean} True, wenn der Bewerber gebucht ist, sonst false.
     */
    isBooked(jobId, applicantId) {
      if (!jobId || !applicantId || !this.cache || !this.cache.jobDataCache || !this.cache.jobDataCache[jobId]) {
        return false;
      }
      const jobData = this.cache.jobDataCache[jobId].jobDetails;
      if (!jobData || !jobData.fieldData || !Array.isArray(jobData.fieldData['booked-creators'])) {
        return false;
      }
      return jobData.fieldData['booked-creators'].includes(applicantId);
    }

    /**
     * Schaltet den Buchungsstatus eines Bewerbers für einen Job um.
     * Aktualisiert 'booked-creators' im Job-Item und 'booked-jobs' im User-Item.
     * @param {string} jobId - Die ID des Jobs.
     * @param {string} applicantId - Die Webflow Member ID des Bewerbers (User Item ID).
     * @returns {Promise<boolean|null>} Der neue Buchungsstatus (true, wenn gebucht, false, wenn nicht) oder null bei einem Fehler.
     */
    async toggleBooking(jobId, applicantId) {
      if (!jobId || !applicantId) {
        console.error('BookingService.toggleBooking: JobID oder ApplicantID fehlt.');
        return null;
      }
      if (!this.cache || !this.webflowService || !this.config || !this.webflowService.updateJobItem_MJ || !this.webflowService.updateUserItem_MJ) {
        console.error('BookingService.toggleBooking: Abhängigkeiten (cache, webflowService, config, updateJobItem_MJ, updateUserItem_MJ) nicht geladen.');
        return null;
      }

      // 1. Aktuellen Status und Daten aus dem Cache holen
      let jobCacheEntry = this.cache.getJobDataFromCache(jobId);
      let jobDetails = jobCacheEntry.jobDetails;

      if (!jobDetails || !jobDetails.fieldData) {
        console.warn(`BookingService.toggleBooking: Job-Details für Job ${jobId} nicht vollständig im Cache. Versuche Nachladen.`);
        const fetchedJob = await this.webflowService.fetchWebflowItem(this.config.JOB_COLLECTION_ID_MJ, jobId);
        if (fetchedJob && !fetchedJob.error && fetchedJob.fieldData) {
          this.cache.updateJobCacheWithJobDetails(jobId, fetchedJob);
          jobDetails = fetchedJob;
        } else {
          console.error(`BookingService.toggleBooking: Konnte Job-Details für Job ${jobId} nicht laden.`);
          return null;
        }
      }

      const currentBookedCreators = Array.isArray(jobDetails.fieldData['booked-creators'])
        ? [...jobDetails.fieldData['booked-creators']]
        : [];
      const isCurrentlyBooked = currentBookedCreators.includes(applicantId);
      let newBookingStatus = !isCurrentlyBooked;

      // --- Update Job Item ('booked-creators') ---
      let newBookedCreatorsList;
      if (newBookingStatus) { // Hinzufügen
        newBookedCreatorsList = [...currentBookedCreators, applicantId];
      } else { // Entfernen
        newBookedCreatorsList = currentBookedCreators.filter(id => id !== applicantId);
      }

      console.log(`BookingService: Job ${jobId}, Applicant ${applicantId}. Neuer Status: ${newBookingStatus ? 'BUCHEN' : 'ENT-BUCHEN'}.`);

      try {
        const jobUpdateSuccess = await this.webflowService.updateJobItem_MJ(jobId, {
          'booked-creators': newBookedCreatorsList
        });

        if (!jobUpdateSuccess) {
          console.error(`BookingService.toggleBooking: Fehler beim Aktualisieren von 'booked-creators' für Job ${jobId}.`);
          return null; // Breche ab, wenn das Job-Update fehlschlägt
        }

        // Cache für Job aktualisieren
        jobDetails.fieldData['booked-creators'] = newBookedCreatorsList;
        this.cache.updateJobCacheWithJobDetails(jobId, jobDetails);
        console.log(`BookingService: Cache für Job ${jobId} ('booked-creators') aktualisiert.`);

        // --- Update User Item ('booked-jobs') ---
        // Wir müssen zuerst das User-Item laden, um die aktuelle Liste der 'booked-jobs' zu bekommen.
        const userItem = await this.webflowService.fetchWebflowItem(this.config.USER_COLLECTION_ID_MJ, applicantId);
        if (!userItem || userItem.error || !userItem.fieldData) {
          console.error(`BookingService.toggleBooking: Konnte User-Item ${applicantId} nicht laden, um 'booked-jobs' zu aktualisieren. Fehler:`, userItem?.message);
          // Hier könnte man überlegen, das Job-Update rückgängig zu machen, aber das ist komplex.
          // Fürs Erste: Fehler loggen und weitermachen, der Job ist zumindest aktualisiert.
          // Das UI-Event wird trotzdem ausgelöst, aber der User-Teil ist inkonsistent.
          document.dispatchEvent(new CustomEvent('bookingUpdated', { detail: { jobId, applicantId, isBooked: newBookingStatus } }));
          return newBookingStatus; // Gebe den Status des Job-Updates zurück
        }

        const currentUserBookedJobs = Array.isArray(userItem.fieldData['booked-jobs'])
          ? [...userItem.fieldData['booked-jobs']]
          : [];

        let newUserBookedJobsList;
        if (newBookingStatus) { // Job wurde zum User hinzugefügt
          if (!currentUserBookedJobs.includes(jobId)) { // Nur hinzufügen, wenn noch nicht vorhanden
            newUserBookedJobsList = [...currentUserBookedJobs, jobId];
          } else {
            newUserBookedJobsList = currentUserBookedJobs; // Keine Änderung nötig
          }
        } else { // Job wurde vom User entfernt
          newUserBookedJobsList = currentUserBookedJobs.filter(id => id !== jobId);
        }

        // Nur updaten, wenn sich die Liste geändert hat
        if (JSON.stringify(newUserBookedJobsList) !== JSON.stringify(currentUserBookedJobs)) {
            const userUpdateSuccess = await this.webflowService.updateUserItem_MJ(applicantId, {
            'booked-jobs': newUserBookedJobsList
            });

            if (!userUpdateSuccess) {
            console.error(`BookingService.toggleBooking: Fehler beim Aktualisieren von 'booked-jobs' für User ${applicantId}.`);
            // Auch hier: Job-Update war erfolgreich, aber User-Update nicht.
            } else {
            console.log(`BookingService: User-Item ${applicantId} ('booked-jobs') erfolgreich aktualisiert.`);
            // Optional: User-Item im Cache aktualisieren, falls ein User-Cache existiert.
            // Für dieses Beispiel gehen wir davon aus, dass der User-Cache nicht so kritisch ist wie der Job-Cache.
            }
        } else {
            console.log(`BookingService: Keine Änderung an 'booked-jobs' für User ${applicantId} notwendig.`);
        }


        // UI-Update-Event auslösen
        document.dispatchEvent(new CustomEvent('bookingUpdated', {
          detail: {
            jobId: jobId,
            applicantId: applicantId,
            isBooked: newBookingStatus
          }
        }));

        return newBookingStatus;

      } catch (error) {
        console.error(`BookingService.toggleBooking: Schwerwiegender Fehler für Job ${jobId}, Applicant ${applicantId}:`, error);
        return null;
      }
    }
  }

  window.WEBFLOW_API.core.bookingService = new BookingService();
  console.log("BookingService (bookingService.js) wurde initialisiert.");

})();
