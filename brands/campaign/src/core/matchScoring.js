(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.core = window.WEBFLOW_API.core || {};

  // Abhängigkeiten
  const MAPPINGS = window.WEBFLOW_API.MAPPINGS;

  /**
   * Berechnet den Match-Score zwischen den Anforderungen eines Jobs und den Attributen eines Bewerbers.
   * @param {object} applicantFieldData - Die Felddaten des Bewerber-Items.
   * @param {object} jobFieldData - Die Felddaten des Job-Items.
   * @returns {object} Ein Objekt mit Score, Details, Roh-Score und maximal möglichem Score.
   */
  function calculateMatchScore(applicantFieldData, jobFieldData) {
    if (!applicantFieldData || !jobFieldData) {
      return { score: 0, details: {}, rawScore: 0, maxScore: 0 };
    }
    if (typeof MAPPINGS === 'undefined') {
        console.error("❌ MAPPINGS-Objekt ist nicht definiert in calculateMatchScore.");
        // Fallback, um Totalausfall zu vermeiden, aber Scoring wird ungenau.
        return { score: 0, details: { error: "MAPPINGS not loaded" }, rawScore: 0, maxScore: 0 };
    }


    let totalScore = 0;
    let maxScorePossible = 0;
    const criteriaEvaluationDetails = {};

    const scoringCriteria = [
      { name: "Kategorie", jobField: "industrie-kategorie", applicantField: "creator-main-categorie", points: 20, type: "exactStringMatch" },
      { name: "Creator Typ", jobField: "job-required-creator-types", applicantField: "creator-type", points: 25, type: "idInJobArray", mappingName: "creatorTypen" },
      { name: "Standort (Bundesland)", jobField: "job-required-bundeslaender", applicantField: "bundesland-option", points: 15, type: "idInJobArray", mappingName: "bundeslaender" },
      { name: "Follower", jobField: "job-required-follower-id", applicantField: "creator-follower", points: 15, type: "exactIdMatch" },
      { name: "Alter", jobField: "job-required-age-id", applicantField: "creator-age", points: 10, type: "exactIdMatch" },
      { name: "Sprachen", jobField: "job-required-sprachen-ids", applicantField: "sprachen", points: 15, type: "anyIdOverlapInArrays", mappingName: "sprachen" }
    ];

    scoringCriteria.forEach(criterion => {
      maxScorePossible += criterion.points;
      let criterionAchievedPoints = 0;
      let jobRequirementValue = jobFieldData[criterion.jobField];
      let applicantAttributeValue = applicantFieldData[criterion.applicantField];
      let isMatch = false;

      const jobValExists = jobRequirementValue !== undefined && jobRequirementValue !== null;
      const appValExists = applicantAttributeValue !== undefined && applicantAttributeValue !== null;

      if (jobValExists && appValExists) {
        switch (criterion.type) {
          case "exactStringMatch":
            if (typeof applicantAttributeValue === 'string' && typeof jobRequirementValue === 'string' &&
                applicantAttributeValue.trim().toLowerCase() === jobRequirementValue.trim().toLowerCase()) {
              isMatch = true;
            }
            break;
          case "exactIdMatch":
            if (applicantAttributeValue === jobRequirementValue) {
              isMatch = true;
            }
            break;
          case "idInJobArray":
            if (Array.isArray(jobRequirementValue) && jobRequirementValue.includes(applicantAttributeValue)) {
              isMatch = true;
            }
            break;
          case "anyIdOverlapInArrays":
            const jobArray = Array.isArray(jobRequirementValue) ? jobRequirementValue : (jobRequirementValue ? [jobRequirementValue] : []);
            const appArray = Array.isArray(applicantAttributeValue) ? applicantAttributeValue : (applicantAttributeValue ? [applicantAttributeValue] : []);
            if (appArray.some(appId => jobArray.includes(appId))) {
              isMatch = true;
            }
            break;
        }
      }

      if (isMatch) {
        criterionAchievedPoints = criterion.points;
        totalScore += criterion.points;
      }

      const mappingForCriterion = criterion.mappingName && MAPPINGS ? MAPPINGS[criterion.mappingName] : null;
      let jobDisplayValues = "N/A";
      if (jobValExists) {
          if (Array.isArray(jobRequirementValue)) {
              jobDisplayValues = jobRequirementValue.map(id => (mappingForCriterion && mappingForCriterion[id]) || id);
          } else {
              jobDisplayValues = (mappingForCriterion && mappingForCriterion[jobRequirementValue]) || jobRequirementValue;
          }
      }

      let appDisplayValues = "N/A";
      if (appValExists) {
          if (Array.isArray(applicantAttributeValue)) {
              appDisplayValues = applicantAttributeValue.map(id => (mappingForCriterion && mappingForCriterion[id]) || id);
          } else {
              appDisplayValues = (mappingForCriterion && mappingForCriterion[applicantAttributeValue]) || applicantAttributeValue;
          }
      }
      
      criteriaEvaluationDetails[criterion.name] = {
        matched: isMatch,
        jobRequirement: jobDisplayValues,
        applicantValue: appDisplayValues,
        pointsAwarded: criterionAchievedPoints,
        maxPoints: criterion.points
      };
    });

    const percentageScore = maxScorePossible > 0 ? Math.round((totalScore / maxScorePossible) * 100) : 0;
    return {
      score: percentageScore,
      details: criteriaEvaluationDetails,
      rawScore: totalScore,
      maxScore: maxScorePossible
    };
  }

  window.WEBFLOW_API.core.calculateMatchScore = calculateMatchScore;

})();
