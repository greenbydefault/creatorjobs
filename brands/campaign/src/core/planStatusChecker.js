(function () {
  'use strict';

  // Ensure the global WEBFLOW_API and necessary sub-namespaces exist
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.planLogic = window.WEBFLOW_API.planLogic || {};
  window.WEBFLOW_API.cache = window.WEBFLOW_API.cache || {}; // Ensure cache namespace is available

  /**
   * Checks if the current Memberstack member has any active plan connection.
   * @param {Object} memberData - The member data object from Memberstack.
   * @returns {boolean} True if an active plan connection exists, false otherwise.
   */
  function hasActivePlanConnection(memberData) {
    if (!memberData || !memberData.planConnections || !Array.isArray(memberData.planConnections)) {
      // console.warn("hasActivePlanConnection: Member data or planConnections are missing or not an array.");
      return false;
    }
    return memberData.planConnections.some(connection => connection.status === "ACTIVE");
  }

  /**
   * Applies styling to job entries based on the user's plan status and job end dates.
   * - If no active plan: Jobs older than 3 days (based on 'job-date-end') are greyed out and made non-interactive.
   * This function assumes job items are already rendered in the DOM and have a 'data-job-id' attribute.
   * It also assumes job data is available in `window.WEBFLOW_API.cache.allMyJobsData_MJ`.
   */
  async function applyPlanBasedJobStyling() {
    console.log("applyPlanBasedJobStyling: Starting to apply plan-based styling.");

    let member;
    try {
      if (typeof window.$memberstackDom === 'undefined') {
        console.warn("applyPlanBasedJobStyling: Memberstack not available yet. Retrying in 1s.");
        // Optional: Implement a more robust retry mechanism or ensure this runs after Memberstack is ready.
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (typeof window.$memberstackDom === 'undefined') {
            console.error("applyPlanBasedJobStyling: Memberstack still not available after delay. Aborting.");
            return;
        }
      }
      member = await window.$memberstackDom.getCurrentMember();
    } catch (error) {
      console.error("applyPlanBasedJobStyling: Error fetching current Memberstack member:", error);
      return; // Cannot proceed without member data
    }

    if (!member || !member.data) {
      console.warn("applyPlanBasedJobStyling: Could not retrieve valid member data from Memberstack.");
      return;
    }

    const isActivePlan = hasActivePlanConnection(member.data);
    console.log(`applyPlanBasedJobStyling: User has active plan: ${isActivePlan}`);

    // Select all job row elements. Adjust selector if your job rows have a different common class.
    // This selector targets elements that are direct children of 'jobs-list' and have the 'my-job-item' class.
    const jobRows = document.querySelectorAll("#jobs-list > .my-job-item");
    // console.log(`applyPlanBasedJobStyling: Found ${jobRows.length} job rows to process.`);

    if (!window.WEBFLOW_API.cache.allMyJobsData_MJ) {
        console.error("applyPlanBasedJobStyling: window.WEBFLOW_API.cache.allMyJobsData_MJ is not available. Cannot get job end dates.");
        return;
    }

    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    // Set time to the end of the day for threeDaysAgo to correctly compare with job-date-end
    threeDaysAgo.setHours(23, 59, 59, 999);


    jobRows.forEach(jobRow => {
      const jobId = jobRow.dataset.jobId;
      if (!jobId) {
        // console.warn("applyPlanBasedJobStyling: Found a job row without a data-job-id attribute.", jobRow);
        return;
      }

      // Find the corresponding job data in the cache
      const jobData = window.WEBFLOW_API.cache.allMyJobsData_MJ.find(job => job.id === jobId);

      if (!jobData || jobData.error || !jobData.fieldData) {
        // console.warn(`applyPlanBasedJobStyling: No valid data in cache for job ID ${jobId}. Skipping styling for this row.`);
        return;
      }

      const jobEndDateString = jobData.fieldData["job-date-end"]; // Or "online-bis" if that's the correct field key

      // Always remove the disabled class first to handle re-renders or plan status changes
      jobRow.classList.remove("is-disabled-due-to-plan");
      jobRow.style.pointerEvents = ""; // Reset pointer events

      if (!isActivePlan) {
        if (jobEndDateString) {
          try {
            const jobEndDate = new Date(jobEndDateString);
            // It's common for 'end dates' to mean 'valid through this day', so compare with the end of that day.
            jobEndDate.setHours(23, 59, 59, 999);

            // If jobEndDate is before threeDaysAgo (i.e., older than 3 days)
            if (jobEndDate < threeDaysAgo) {
              console.log(`applyPlanBasedJobStyling: Job ID ${jobId} (Enddatum: ${jobEndDateString}) ist älter als 3 Tage und Nutzer hat keinen aktiven Plan. Deaktiviere.`);
              jobRow.classList.add("is-disabled-due-to-plan");
            } else {
              // console.log(`applyPlanBasedJobStyling: Job ID ${jobId} (Enddatum: ${jobEndDateString}) ist nicht älter als 3 Tage. Bleibt aktiv.`);
            }
          } catch (e) {
            console.warn(`applyPlanBasedJobStyling: Konnte Job-Enddatum für Job ID ${jobId} nicht verarbeiten: "${jobEndDateString}"`, e);
          }
        } else {
          // console.warn(`applyPlanBasedJobStyling: Kein Enddatum ('job-date-end') für Job ID ${jobId} gefunden. Kann Deaktivierungslogik nicht anwenden.`);
        }
      } else {
         // User has an active plan, ensure job is not disabled by this logic
         // console.log(`applyPlanBasedJobStyling: User hat aktiven Plan. Job ID ${jobId} bleibt normal aktiv.`);
      }
    });
    console.log("applyPlanBasedJobStyling: Finished applying plan-based styling.");
  }

  // Expose the function to be callable from other scripts
  window.WEBFLOW_API.planLogic.applyPlanBasedJobStyling = applyPlanBasedJobStyling;

  console.log("WEBFLOW_API.planLogic (planStatusChecker.js) module initialized.");

})();
