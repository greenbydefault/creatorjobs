(function () {
  'use strict';

  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.planLogic = window.WEBFLOW_API.planLogic || {};
  window.WEBFLOW_API.cache = window.WEBFLOW_API.cache || {};

  function hasActivePlanConnection(memberData) {
    if (!memberData || !memberData.planConnections || !Array.isArray(memberData.planConnections)) {
      console.warn("[PlanLogic] hasActivePlanConnection: Member-Daten oder planConnections fehlen oder sind kein Array.");
      return false;
    }
    // Loggen der planConnections zur detaillierten Überprüfung
    console.log("[PlanLogic] hasActivePlanConnection: Überprüfe folgende planConnections:", JSON.parse(JSON.stringify(memberData.planConnections)));
    return memberData.planConnections.some(connection => connection.status === "ACTIVE");
  }

  async function applyPlanBasedJobStyling() {
    console.log("[PlanLogic] applyPlanBasedJobStyling: Starte Überprüfung und Anpassung der Job-Stylings basierend auf Plan-Status.");

    let member;
    try {
      if (typeof window.$memberstackDom === 'undefined' || typeof window.$memberstackDom.getCurrentMember !== 'function') {
        console.warn("[PlanLogic] applyPlanBasedJobStyling: Memberstack ($memberstackDom.getCurrentMember) ist noch nicht verfügbar. Versuche es in 1 Sekunde erneut.");
        await new Promise(resolve => setTimeout(resolve, 1000)); // Kurze Wartezeit
        if (typeof window.$memberstackDom === 'undefined' || typeof window.$memberstackDom.getCurrentMember !== 'function') {
            console.error("[PlanLogic] applyPlanBasedJobStyling: Memberstack auch nach Verzögerung nicht verfügbar. Breche ab.");
            return;
        }
      }
      member = await window.$memberstackDom.getCurrentMember(); // Holt das Member-Objekt

    } catch (error) {
      console.error("[PlanLogic] applyPlanBasedJobStyling: Fehler beim Abrufen des aktuellen Memberstack-Benutzers:", error);
      return;
    }

    // Überprüfung, ob das Member-Objekt und dessen 'data'-Eigenschaft vorhanden sind
    if (!member || !member.data) {
      console.warn("[PlanLogic] applyPlanBasedJobStyling: Konnte keine gültigen Benutzerdaten von Memberstack abrufen. Member-Objekt:", member);
      // Hier könnten Sie entscheiden, ob Sie die Funktion abbrechen oder mit einem Standardwert (z.B. kein aktiver Plan) fortfahren.
      // Fürs Debugging ist ein Abbruch oft besser, um das Problem klar zu sehen.
      return;
    }

    // Erfolgreich Memberdaten abgerufen
    console.log(`[PlanLogic] applyPlanBasedJobStyling: Memberstack-Benutzerdaten erfolgreich geladen. Member ID: ${member.data.id}, E-Mail (Auth): ${member.data.auth?.email || 'N/A'}`);

    const isActivePlan = hasActivePlanConnection(member.data); // member.data ist das Objekt, das planConnections enthält
    console.log(`[PlanLogic] applyPlanBasedJobStyling: Ergebnis der Planprüfung - Hat der Benutzer einen aktiven Plan? ${isActivePlan}`);

    const jobRows = document.querySelectorAll("#jobs-list > .my-job-item");
    if (jobRows.length === 0) {
        // console.log("[PlanLogic] applyPlanBasedJobStyling: Keine Job-Zeilen (.my-job-item) im DOM gefunden zum Stylen.");
    }


    if (!window.WEBFLOW_API.cache.allMyJobsData_MJ) {
        console.error("[PlanLogic] applyPlanBasedJobStyling: window.WEBFLOW_API.cache.allMyJobsData_MJ ist nicht verfügbar. Kann Job-Enddaten nicht abrufen.");
        return;
    }

    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    threeDaysAgo.setHours(23, 59, 59, 999);

    jobRows.forEach(jobRow => {
      const jobId = jobRow.dataset.jobId;
      if (!jobId) {
        return;
      }

      const jobData = window.WEBFLOW_API.cache.allMyJobsData_MJ.find(job => job.id === jobId);

      if (!jobData || jobData.error || !jobData.fieldData) {
        return;
      }

      const jobEndDateString = jobData.fieldData["job-date-end"];

      jobRow.classList.remove("is-disabled-due-to-plan");
      jobRow.style.pointerEvents = "";

      if (!isActivePlan) {
        if (jobEndDateString) {
          try {
            const jobEndDate = new Date(jobEndDateString);
            jobEndDate.setHours(23, 59, 59, 999);

            if (jobEndDate < threeDaysAgo) {
              // console.log(`[PlanLogic] applyPlanBasedJobStyling: Job ID ${jobId} (Enddatum: ${jobEndDateString}) ist älter als 3 Tage und Nutzer hat keinen aktiven Plan. Deaktiviere.`);
              jobRow.classList.add("is-disabled-due-to-plan");
            }
          } catch (e) {
            // console.warn(`[PlanLogic] applyPlanBasedJobStyling: Konnte Job-Enddatum für Job ID ${jobId} nicht verarbeiten: "${jobEndDateString}"`, e);
          }
        }
      }
    });
    // console.log("[PlanLogic] applyPlanBasedJobStyling: Plan-basiertes Styling abgeschlossen.");
  }

  window.WEBFLOW_API.planLogic.applyPlanBasedJobStyling = applyPlanBasedJobStyling;

  console.log("WEBFLOW_API.planLogic (planStatusChecker.js) module initialized with extended debugging.");

})();
