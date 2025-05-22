// src/logic/sorting.js
// This module handles the sorting logic for applicants.

import { calculateMatchScore } from './matchScoring.js';
// MAPPINGS will be passed as an argument if needed by calculateMatchScore, or imported if static within this scope

/**
 * Sorts an array of applicant items globally.
 * Primary sort: Match score (descending).
 * Secondary sort: Plus membership (Plus members first).
 * Tertiary sort: Applicant name (alphabetical).
 * @param {object[]} applicantItems - Array of applicant items (raw, without score info yet).
 * @param {object | null} jobFieldData - The fieldData for the job, used for scoring. Can be null if scoring is not possible.
 * @param {object} allMappings - The MAPPINGS object from config.js.
 * @returns {object[]} The sorted array of applicant items, each with a `matchInfo` property.
 */
export function sortApplicantsGlobally(applicantItems, jobFieldData, allMappings) {
    const itemsWithScore = applicantItems.map(applicant => {
        let matchInfo = { score: -1, details: {}, rawScore: 0, maxScore: 0 }; // Default for errors or missing data
        if (applicant && applicant.fieldData && !applicant.error) {
            if (jobFieldData) {
                matchInfo = calculateMatchScore(applicant.fieldData, jobFieldData, allMappings);
            } else {
                // If jobFieldData is not available, assign a neutral score or handle as per requirements
                matchInfo = { score: 0, details: { note: "Job data missing for scoring" }, rawScore: 0, maxScore: 0 };
            }
        } else if (applicant && applicant.error) {
            // Keep default score for items that had fetching errors
             matchInfo = { score: -1, details: { note: `Error fetching applicant: ${applicant.message}` }, rawScore: 0, maxScore: 0, id: applicant.id };
        }
        return { ...applicant, matchInfo };
    });

    return itemsWithScore.sort((a, b) => {
        const aIsValid = a && a.fieldData && !a.error;
        const bIsValid = b && b.fieldData && !b.error;

        // Valid items come before items with errors
        if (aIsValid && !bIsValid) return -1;
        if (!aIsValid && bIsValid) return 1;
        // If both are errors or both are valid, proceed with other criteria
        // (Items with errors will have score -1, naturally sorting them lower if both are errors)

        // Primary sort: Match score (descending)
        if (b.matchInfo.score !== a.matchInfo.score) {
            return b.matchInfo.score - a.matchInfo.score;
        }

        // Secondary sort: Plus membership (Plus members first)
        // This only applies if both items are valid
        if (aIsValid && bIsValid) {
            const aIsPlus = a.fieldData["plus-mitglied"] === true;
            const bIsPlus = b.fieldData["plus-mitglied"] === true;
            if (aIsPlus && !bIsPlus) return -1;
            if (!aIsPlus && bIsPlus) return 1;
        }


        // Tertiary sort: Applicant name (alphabetical)
        // This only applies if both items are valid
        if (aIsValid && bIsValid) {
            const nameA = a.fieldData.name || "";
            const nameB = b.fieldData.name || "";
            return nameA.localeCompare(nameB);
        }
        
        // If one is valid and other is error, this was handled. If both error, name sort can be a tie-breaker.
        const nameA = a.fieldData?.name || a.id || ""; // Fallback to ID if name missing for error items
        const nameB = b.fieldData?.name || b.id || "";
        return nameA.localeCompare(nameB);
    });
}
