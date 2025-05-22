// src/app.js
// Main application logic: initializes, fetches data, handles UI updates and interactions.

import {
    API_CALL_DELAY_MS,
    JOB_COLLECTION_ID_MJ,
    SKELETON_JOBS_COUNT_MJ,
    MAPPINGS
} from './config.js';
import * as state from './state.js'; // Import all state exports
import { delay } from './utils.js';
import { fetchWebflowItem, fetchAllApplicantsForJob } from './apiService-1.0.js';
import { calculateMatchScore } from './logic/matchScoring.js';
import { sortApplicantsGlobally } from './logic/sorting.js';
import { renderMyJobsSkeletonLoader } from './ui/skeletonLoaders.js';
import { createApplicantRowElement, createApplicantTableHeaderElement } from './ui/applicantRenderer.js';
import { createFilterRowElement } from './ui/filterControls.js';
import { renderPaginationControls } from './ui/paginationControls.js';
import { renderMyJobsAndApplicants as renderMyJobsUI } from './ui/jobRenderer.js'; // Renamed to avoid conflict

// Store the main container element reference
let jobsListContainerElement = null;

/**
 * Initializes the page size selector and its event listener.
 */
function initializePageSizeSelector() {
    const pageSizeSelector = document.getElementById('job-applicants-page-size-selector');
    if (pageSizeSelector) {
        pageSizeSelector.value = state.currentApplicantPageSize; // Set initial value
        pageSizeSelector.addEventListener('change', async (event) => {
            const newSize = parseInt(event.target.value, 10);
            if (newSize === 15 || newSize === 25) { // Validate size
                const oldSize = state.currentApplicantPageSize;
                state.setCurrentApplicantPageSize(newSize);
                console.log(`DEBUG: Seitengröße geändert von ${oldSize} auf ${state.currentApplicantPageSize}`);

                // If an applicant list is currently open, reload it with the new page size
                const openApplicantContainer = document.querySelector('.applicants-list-container[style*="display: block"]');
                if (openApplicantContainer) {
                    const jobId = openApplicantContainer.dataset.jobId;
                    const jobCacheEntry = state.getJobData(jobId);
                    const jobWrapper = openApplicantContainer.closest('.my-job-item');
                    const paginationWrapper = jobWrapper ? jobWrapper.querySelector(".db-table-pagination") : null;
                    const toggleDivElement = jobWrapper ? jobWrapper.querySelector(".db-table-applicants") : null;

                    if (jobCacheEntry && jobCacheEntry.allItems && paginationWrapper && toggleDivElement && jobCacheEntry.jobDetails) {
                        console.log(`DEBUG: Lade Job ${jobId} mit neuer Seitengröße ${state.currentApplicantPageSize} neu (Seite 1).`);
                        if (toggleDivElement) toggleDivElement.style.pointerEvents = 'none';
                        if (paginationWrapper) paginationWrapper.querySelectorAll('.db-pagination-count:not(.ellipsis)').forEach(el => el.classList.add("disabled-loading"));
                        
                        // Re-filter and re-sort based on current active filters before displaying page 1
                        let itemsToDisplay = jobCacheEntry.allItems;
                        if (jobCacheEntry.activeFilters.follower && jobCacheEntry.activeFilters.follower.length > 0) {
                            itemsToDisplay = itemsToDisplay.filter(item => {
                                if (item.error || !item.fieldData) return false;
                                const applicantFollowerId = item.fieldData["creator-follower"];
                                return jobCacheEntry.activeFilters.follower.includes(applicantFollowerId);
                            });
                        }
                        const newSortedAndFiltered = sortApplicantsGlobally(itemsToDisplay, jobCacheEntry.jobDetails, MAPPINGS);
                        state.updateJobDataCache(jobId, { sortedAndFilteredItems: newSortedAndFiltered });

                        await loadAndDisplayApplicantsForJob(jobId, openApplicantContainer, paginationWrapper, 1);
                        if (toggleDivElement) toggleDivElement.style.pointerEvents = 'auto';
                    }
                }
            }
        });
    } else {
        console.warn("DEBUG: Element für Seitengrößenauswahl ('job-applicants-page-size-selector') nicht gefunden. Nutze Standard: " + state.currentApplicantPageSize);
    }
}

/**
 * Handles changes from the filter controls.
 * Re-filters, re-sorts, and re-renders the applicants for a job.
 * @param {string} jobId - The ID of the job being filtered.
 * @param {object} activeFilters - The currently active filters (e.g., { follower: ['id1', 'id2'] }).
 */
async function handleFilterChange(jobId, activeFilters) {
    console.log(`DEBUG: handleFilterChange - Job ${jobId}, Aktive Filter:`, activeFilters);
    const jobCache = state.getJobData(jobId);
    if (!jobCache || !jobCache.allItems) {
        console.warn("DEBUG: handleFilterChange - Keine Rohdaten im Cache für Job", jobId);
        return;
    }

    state.updateJobDataCache(jobId, { activeFilters: activeFilters });

    let filteredItems = jobCache.allItems;
    // Apply follower filter (extend for other filters if added)
    if (activeFilters.follower && activeFilters.follower.length > 0) {
        filteredItems = filteredItems.filter(item => {
            if (item.error || !item.fieldData) return false; // Skip items with errors or no data
            const applicantFollowerId = item.fieldData["creator-follower"];
            return activeFilters.follower.includes(applicantFollowerId);
        });
    }
    console.log(`DEBUG: Job ${jobId} - Anzahl Items nach Filterung: ${filteredItems.length}`);

    const jobDetails = jobCache.jobDetails;
    if (!jobDetails) {
        console.error(`DEBUG: Job ${jobId} - Job-Details nicht im Cache gefunden für Sortierung bei Filteranwendung.`);
    }
    
    const newSortedAndFiltered = sortApplicantsGlobally(filteredItems, jobDetails, MAPPINGS);
    state.updateJobDataCache(jobId, { sortedAndFilteredItems: newSortedAndFiltered });
    
    const applicantsListContainer = document.querySelector(`.applicants-list-container[data-job-id="${jobId}"]`);
    const jobWrapper = applicantsListContainer ? applicantsListContainer.closest('.my-job-item') : null;
    const paginationWrapper = jobWrapper ? jobWrapper.querySelector(".db-table-pagination") : null;

    if (applicantsListContainer && paginationWrapper) {
        await loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, 1); // Reset to page 1
    } else {
        console.error("handleFilterChange: Could not find applicant list container or pagination wrapper for job", jobId);
    }
}


/**
 * Loads and displays a specific page of applicants for a job.
 * @param {string} jobId - The ID of the job.
 * @param {HTMLElement} applicantsListContainer - The container for the applicants list.
 * @param {HTMLElement} paginationWrapper - The container for pagination controls.
 * @param {number} [pageNumber=1] - The page number to display.
 */
export async function loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, pageNumber = 1) {
    console.log(`DEBUG: loadAndDisplayApplicantsForJob START - Job ID: ${jobId}, Page: ${pageNumber}`);
    
    const mainToggleButton = document.querySelector(`.my-job-item[data-job-id="${jobId}"] .db-table-applicants`);
    if (mainToggleButton) mainToggleButton.style.pointerEvents = 'none'; // Disable toggle during load

    // Ensure filter row and header are present
    if (!applicantsListContainer.querySelector(".db-table-filter-row")) {
        const jobCache = state.getJobData(jobId);
        const initialFilters = jobCache?.activeFilters || { follower: [] };
        const filterRowElement = createFilterRowElement(jobId, initialFilters, handleFilterChange);
        applicantsListContainer.insertBefore(filterRowElement, applicantsListContainer.firstChild);
    }
    if (!applicantsListContainer.querySelector(".db-table-header.db-table-applicant")) {
        const headerElement = createApplicantTableHeaderElement();
        const filterRow = applicantsListContainer.querySelector(".db-table-filter-row");
        if (filterRow && filterRow.nextSibling) {
            applicantsListContainer.insertBefore(headerElement, filterRow.nextSibling);
        } else if (filterRow) {
            applicantsListContainer.appendChild(headerElement);
        } else { // Should not happen if filter row is always added first
            applicantsListContainer.insertBefore(headerElement, applicantsListContainer.firstChild);
        }
    }

    // Ensure actual content container exists
    let applicantsContentElement = applicantsListContainer.querySelector(".actual-applicants-content");
    if (!applicantsContentElement) {
        applicantsContentElement = document.createElement("div");
        applicantsContentElement.classList.add("actual-applicants-content");
        const header = applicantsListContainer.querySelector(".db-table-header.db-table-applicant");
        if (header && header.nextSibling) {
            applicantsListContainer.insertBefore(applicantsContentElement, header.nextSibling);
        } else if (header) { // If header is the last child before this
            applicantsListContainer.appendChild(applicantsContentElement);
        } else { // If even header is not there (should be created above)
             applicantsListContainer.appendChild(applicantsContentElement); // Fallback
        }
    }
    
    applicantsContentElement.innerHTML = ''; // Clear previous page's applicants
    applicantsListContainer.dataset.currentPage = pageNumber;

    const loadingMessage = document.createElement("p");
    loadingMessage.classList.add("applicants-message");
    loadingMessage.textContent = `Lade Bewerber (Seite ${pageNumber})...`;
    applicantsContentElement.appendChild(loadingMessage);

    const jobCache = state.getJobData(jobId);
    if (!jobCache || !jobCache.sortedAndFilteredItems) {
        console.error(`DEBUG: Keine sortierten/gefilterten Daten im Cache für Job ${jobId}.`);
        loadingMessage.textContent = 'Fehler: Bewerberdaten konnten nicht geladen werden (Cache-Problem).';
        if (mainToggleButton) mainToggleButton.style.pointerEvents = 'auto';
        return;
    }
    
    const jobDetailsForRows = jobCache.jobDetails; // Used for match score tooltip, if re-enabled
    if (!jobDetailsForRows) {
        console.warn(`DEBUG: Job-Details für Job ${jobId} nicht im Cache beim Rendern der Bewerberzeilen.`);
    }

    const allSortedAndFilteredItems = jobCache.sortedAndFilteredItems;
    const totalItems = allSortedAndFilteredItems.length;
    const totalPages = Math.ceil(totalItems / state.currentApplicantPageSize);
    const offset = (pageNumber - 1) * state.currentApplicantPageSize;
    const pageItems = allSortedAndFilteredItems.slice(offset, offset + state.currentApplicantPageSize);
    
    loadingMessage.remove(); // Remove "Lade Bewerber..." message

    let validApplicantsRenderedOnThisPage = 0;
    if (pageItems.length > 0) {
        pageItems.forEach(applicantItemWithScore => {
            if (applicantItemWithScore && applicantItemWithScore.fieldData && !applicantItemWithScore.error) {
                const applicantRow = createApplicantRowElement(applicantItemWithScore, MAPPINGS);
                applicantsContentElement.appendChild(applicantRow);
                // Simple fade-in animation
                requestAnimationFrame(() => {
                    applicantRow.style.opacity = "0";
                    requestAnimationFrame(() => {
                        applicantRow.style.transition = "opacity 0.3s ease-in-out";
                        applicantRow.style.opacity = "1";
                    });
                });
                validApplicantsRenderedOnThisPage++;
            } else if (applicantItemWithScore && applicantItemWithScore.error) {
                // Display error message for this specific applicant if fetching failed
                const errorMsg = document.createElement("p");
                errorMsg.classList.add("applicants-message", "error-detail"); // More specific class
                if (applicantItemWithScore.status === 429) {
                    errorMsg.textContent = `Bewerberdaten (ID: ${applicantItemWithScore.id}) konnten wegen API-Limits nicht geladen werden.`;
                } else if (applicantItemWithScore.status === 404) {
                    errorMsg.textContent = `Bewerber (ID: ${applicantItemWithScore.id}) wurde nicht gefunden.`;
                } else {
                    errorMsg.textContent = applicantItemWithScore.message || `Daten für Bewerber ${applicantItemWithScore.id || 'unbekannt'} konnten nicht geladen werden.`;
                }
                applicantsContentElement.appendChild(errorMsg);
            }
        });
    }

    console.log(`DEBUG: Job ${jobId}, Seite ${pageNumber}: ${validApplicantsRenderedOnThisPage} Bewerber gerendert aus ${pageItems.length} Items für diese Seite. Gesamt gefiltert: ${totalItems}`);

    if (validApplicantsRenderedOnThisPage === 0 && totalItems > 0 && pageItems.length > 0) {
        // This case implies all items on the current page had errors, but there are other items.
        const noDataMsg = document.createElement("p");
        noDataMsg.classList.add("applicants-message");
        noDataMsg.textContent = "Keine gültigen Bewerberdaten für diese Seite gefunden (möglicherweise Ladefehler).";
        applicantsContentElement.appendChild(noDataMsg);
    } else if (totalItems === 0 && jobCache.allItems && jobCache.allItems.length > 0) {
        // No items match current filters, but there were applicants initially
        const noMatchMsg = document.createElement("p");
        noMatchMsg.classList.add("applicants-message");
        noMatchMsg.textContent = "Keine Bewerber entsprechen den aktuellen Filterkriterien.";
        applicantsContentElement.appendChild(noMatchMsg);
        if (paginationWrapper) paginationWrapper.style.display = "none";
    } else if (totalItems === 0) {
        // No applicants at all for this job (or all had errors during initial fetchAllApplicants)
        const noApplicantsMsg = document.createElement("p");
        noApplicantsMsg.classList.add("applicants-message");
        noApplicantsMsg.textContent = "Für diesen Job liegen keine Bewerbungen vor oder es konnten keine geladen werden.";
        applicantsContentElement.appendChild(noApplicantsMsg);
        if (paginationWrapper) paginationWrapper.style.display = "none";
    }
    
    // Render pagination controls
    if (paginationWrapper) {
        renderPaginationControls(jobId, paginationWrapper, pageNumber, totalPages, handlePageNavigation);
    }

    if (mainToggleButton) mainToggleButton.style.pointerEvents = 'auto'; // Re-enable toggle
    applicantsListContainer.dataset.allApplicantsLoaded = 'true'; // Mark that this job's applicants view has been initialized
}


/**
 * Handles page navigation for applicants list.
 * @param {string} jobId - The ID of the job.
 * @param {number} pageNumber - The target page number.
 */
async function handlePageNavigation(jobId, pageNumber) {
    const applicantsListContainer = document.querySelector(`.applicants-list-container[data-job-id="${jobId}"]`);
    const jobWrapper = applicantsListContainer ? applicantsListContainer.closest('.my-job-item') : null;
    const paginationWrapper = jobWrapper ? jobWrapper.querySelector(".db-table-pagination") : null;

    if (applicantsListContainer && paginationWrapper) {
        await loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, pageNumber);
    } else {
        console.error("handlePageNavigation: Could not find applicant list or pagination wrapper for job", jobId);
    }
}

/**
 * Handles the toggling (show/hide) of an applicant list for a job.
 * @param {object} jobItem - The job item object.
 * @param {HTMLElement} applicantsListContainer - The container for the applicants.
 * @param {HTMLElement} paginationWrapper - The container for pagination.
 * @param {HTMLElement} toggleTextSpan - The text span of the toggle button.
 * @param {HTMLElement} toggleIconImg - The icon image of the toggle button.
 * @param {boolean} isOpening - True if the list is being opened, false if closing.
 */
async function handleToggleApplicants(jobItem, applicantsListContainer, paginationWrapper, toggleTextSpan, toggleIconImg, isOpening) {
    const jobId = jobItem.id;
    const jobFieldData = jobItem.fieldData;
    const toggleDivElement = toggleTextSpan.parentElement; // The main clickable toggle area

    if (isOpening) {
        applicantsListContainer.style.display = "block";
        toggleTextSpan.textContent = "Bewerberliste ausblenden";
        toggleIconImg.classList.add("icon-up");
        toggleDivElement.style.pointerEvents = 'none'; // Disable toggle during load

        // Ensure jobDetails are in cache (needed for scoring)
        if (!state.getJobData(jobId) || !state.getJobData(jobId).jobDetails) {
            state.updateJobDataCache(jobId, { jobDetails: jobFieldData });
        }
        
        const applicantIdsForThisJob = jobFieldData["bewerber"] || [];
        const jobCache = state.getJobData(jobId);

        // Fetch all applicant items only if not already fetched or if count mismatch
        if (!jobCache || !jobCache.allItems || jobCache.allItems.length !== applicantIdsForThisJob.length) {
            applicantsListContainer.innerHTML = ''; // Clear previous content if any
            const loadingAllMsg = document.createElement("p");
            loadingAllMsg.classList.add("applicants-message");
            loadingAllMsg.textContent = "Lade alle Bewerberdaten für Sortierung und Filterung...";
            applicantsListContainer.appendChild(loadingAllMsg);
            
            const fetchedItems = await fetchAllApplicantsForJob(jobId, applicantIdsForThisJob);
            loadingAllMsg.remove();
            state.updateJobDataCache(jobId, { allItems: fetchedItems });
        }
        
        // Sort and filter based on current (or default) filters
        const currentFilters = jobCache?.activeFilters || { follower: [] };
        let itemsToProcess = state.getJobData(jobId).allItems;

        if (currentFilters.follower && currentFilters.follower.length > 0) {
            itemsToProcess = itemsToProcess.filter(item => {
                if (item.error || !item.fieldData) return false;
                const applicantFollowerId = item.fieldData["creator-follower"];
                return currentFilters.follower.includes(applicantFollowerId);
            });
        }
        
        const sortedAndFilteredItems = sortApplicantsGlobally(itemsToProcess, jobFieldData, MAPPINGS);
        state.updateJobDataCache(jobId, { sortedAndFilteredItems: sortedAndFilteredItems });
        
        applicantsListContainer.dataset.allApplicantsLoaded = 'true'; // Mark as initialized
        await loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, 1); // Load page 1
        
        toggleDivElement.style.pointerEvents = 'auto'; // Re-enable toggle

    } else { // Closing
        applicantsListContainer.style.display = "none";
        if (paginationWrapper) paginationWrapper.style.display = "none";
        toggleTextSpan.textContent = "Bewerberliste anzeigen";
        toggleIconImg.classList.remove("icon-up");
    }
}


/**
 * Main function to display "My Jobs" and their applicants.
 * Fetches user data, then their jobs, then renders them.
 */
async function displayMyJobsAndApplicants() {
    if (!jobsListContainerElement) {
        console.error("❌ Container 'jobs-list' für displayMyJobsAndApplicants nicht initialisiert.");
        return;
    }
    renderMyJobsSkeletonLoader(jobsListContainerElement, SKELETON_JOBS_COUNT_MJ);

    try {
        // Ensure Memberstack is loaded
        if (typeof window.$memberstackDom === 'undefined') {
            await new Promise(resolve => {
                const interval = setInterval(() => {
                    if (typeof window.$memberstackDom !== 'undefined') { clearInterval(interval); resolve(); }
                }, 100);
            });
        }
        const member = await window.$memberstackDom.getCurrentMember();
        const webflowMemberId = member?.data?.customFields?.['webflow-member-id'];
        state.setCurrentWebflowMemberId(webflowMemberId);

        if (!state.currentWebflowMemberId_MJ) {
            console.error("❌ Kein 'webflow-member-id' im Memberstack-Profil gefunden.");
            jobsListContainerElement.innerHTML = "<p class='error-message job-entry visible'>Benutzerdaten konnten nicht geladen werden (Keine Webflow Member ID).</p>";
            return;
        }
        console.log(`✅ MyJobs: Webflow Member ID: ${state.currentWebflowMemberId_MJ}`);
        
        await delay(API_CALL_DELAY_MS); // Small delay before first fetch
        const currentUserItem = await fetchWebflowItem(state.USER_COLLECTION_ID_MJ, state.currentWebflowMemberId_MJ);

        if (!currentUserItem || (currentUserItem.error && currentUserItem.status !== 429 && currentUserItem.status !== 404)) {
            console.error("❌ Benutzerdaten des aktuellen Users nicht gefunden oder kritischer Fehler beim Abruf.", currentUserItem);
            jobsListContainerElement.innerHTML = `<p class='error-message job-entry visible'>Benutzerdaten des aktuellen Users konnten nicht geladen werden.</p>`;
            return;
        }
        if (currentUserItem.error && currentUserItem.status === 429) {
            console.warn("Rate limit beim Abrufen des aktuellen Benutzers. Breche ab.");
            jobsListContainerElement.innerHTML = `<p class='error-message job-entry visible'>Zu viele Anfragen beim Laden der initialen Benutzerdaten. Bitte versuche es später erneut.</p>`;
            return;
        }
         if (currentUserItem.error && currentUserItem.status === 404) {
            console.error("❌ Aktueller Benutzer nicht in Webflow Collection gefunden (404).", currentUserItem);
            jobsListContainerElement.innerHTML = `<p class='error-message job-entry visible'>Benutzerprofil nicht in der Datenbank gefunden.</p>`;
            return;
        }
        if (!currentUserItem.fieldData) { // This implies an error not caught above, or an empty item
            console.error("❌ Benutzerdaten des aktuellen Users (fieldData) nicht gefunden.", currentUserItem);
            renderMyJobsUI([], jobsListContainerElement, handleToggleApplicants); // Render empty job list
            return;
        }

        const postedJobIds = currentUserItem.fieldData["posted-jobs"] || [];
        console.log(`User hat ${postedJobIds.length} Jobs im Feld 'posted-jobs'.`);
        if (postedJobIds.length === 0) {
            renderMyJobsUI([], jobsListContainerElement, handleToggleApplicants); // Render with "no jobs" message
            return;
        }

        let myJobItemsData = [];
        for (const jobId of postedJobIds) {
            console.log(`Fetching job item: ${jobId}`);
            await delay(API_CALL_DELAY_MS); // Stagger calls
            const jobItem = await fetchWebflowItem(JOB_COLLECTION_ID_MJ, jobId);
            if (jobItem) {
                myJobItemsData.push(jobItem);
            } else {
                // Should not happen if fetchWebflowItem always returns an object
                console.warn(`Job ${jobId} führte zu einer unerwarteten null-Antwort von fetchWebflowItem.`);
                myJobItemsData.push({ id: jobId, error: true, status: 'fetch_null_error', message: `Unerwartete null-Antwort für Job ${jobId}.` });
            }
        }
        
        console.log("--- Überprüfung der geladenen Job-Daten (myJobItemsData) ---");
        myJobItemsData.forEach(job => {
            if (job.error) {
                console.log(`Job ID: ${job.id}, Fehler: ${job.message}, Status: ${job.status}`);
            } else if (job.fieldData) {
                console.log(`Job ID: ${job.id}, Name: ${job.fieldData.name}, Bewerber IDs im Job-Objekt: ${JSON.stringify(job.fieldData["bewerber"] || [])}`);
            } else {
                console.log(`Job ID: ${job.id}, Unerwarteter Zustand (weder fieldData noch error-Property). Item:`, job);
            }
        });
        console.log("-----------------------------------------------------");

        if (myJobItemsData.length === 0 && postedJobIds.length > 0) {
            // This means all job fetches failed for some reason (e.g. all 404 or all rate limited)
            jobsListContainerElement.innerHTML = `<p class='info-message job-entry visible'>Keine Jobdaten konnten geladen oder verarbeitet werden.</p>`;
            return;
        }
        state.setAllMyJobsData(myJobItemsData); // Store fetched jobs in state
        renderMyJobsUI(state.allMyJobsData_MJ, jobsListContainerElement, handleToggleApplicants);

    } catch (error) {
        console.error("❌ Schwerwiegender Fehler in displayMyJobsAndApplicants:", error);
        if (jobsListContainerElement) {
            jobsListContainerElement.innerHTML = `<p class='error-message job-entry visible'>Ein allgemeiner Fehler ist aufgetreten: ${error.message}. Bitte versuche es später erneut.</p>`;
        }
    }
}

/**
 * Initializes the application.
 * This function is called once the DOM is ready.
 */
export function initializeApp() {
    jobsListContainerElement = document.getElementById("jobs-list");
    if (!jobsListContainerElement) {
        console.error("❌ Fatal: Container 'jobs-list' nicht im DOM gefunden. App kann nicht starten.");
        // Optionally, display a message to the user in a fallback element
        const body = document.querySelector('body');
        if (body) {
            const errorMsg = document.createElement('p');
            errorMsg.textContent = "Ein kritisches Element der Seite fehlt. Die Jobliste kann nicht angezeigt werden.";
            errorMsg.style.color = "red";
            errorMsg.style.textAlign = "center";
            errorMsg.style.padding = "20px";
            body.prepend(errorMsg);
        }
        return;
    }

    initializePageSizeSelector();
    displayMyJobsAndApplicants();
    // Note: Dynamically added CSS from original script was removed. Styling should be handled via Webflow or a separate CSS file.
}
