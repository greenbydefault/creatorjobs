// src/ui/jobRenderer.js
// This module is responsible for rendering the list of jobs and individual job items.

/**
 * Renders the list of "My Jobs" and sets up applicant list toggling.
 * @param {object[]} jobItems - Array of job items to render. Each item can be a job data object or an error object.
 * @param {HTMLElement} container - The HTML element where jobs will be rendered.
 * @param {function} onToggleApplicantsCallback - Callback function executed when "Bewerberliste anzeigen/ausblenden" is clicked.
 * Receives (jobItem, applicantsListContainer, paginationWrapper, toggleTextSpan, toggleIconImg, isOpening)
 */
export function renderMyJobsAndApplicants(jobItems, container, onToggleApplicantsCallback) {
    if (!container) {
        console.error("❌ Container 'jobs-list' nicht gefunden in renderMyJobsAndApplicants.");
        return;
    }
    container.innerHTML = ""; // Clear previous content (e.g., skeleton loader)

    if (jobItems.length === 0) {
        const noJobsMsg = document.createElement("p");
        noJobsMsg.textContent = "Du hast noch keine Jobs erstellt oder es wurden keine Jobs gefunden.";
        noJobsMsg.classList.add("job-entry", "visible"); // Ensure it's visible
        container.appendChild(noJobsMsg);
        return;
    }

    const fragment = document.createDocumentFragment();
    let globalRateLimitMessageShown = false;

    jobItems.forEach(jobItem => {
        // Handle job items that couldn't be fetched due to rate limits
        if (jobItem.error && jobItem.status === 429) {
            console.warn(`Job (ID: ${jobItem.id || 'unbekannt'}) konnte wegen Rate Limit nicht geladen werden und wird nicht gerendert.`);
            if (!globalRateLimitMessageShown && !document.getElementById('global-rate-limit-message')) {
                const globalRateLimitInfo = document.createElement("p");
                globalRateLimitInfo.id = 'global-rate-limit-message';
                globalRateLimitInfo.textContent = "Hinweis: Einige Jobdaten konnten aufgrund von API-Anfragelimits nicht geladen werden. Bitte versuche es später erneut.";
                globalRateLimitInfo.classList.add("job-entry", "visible", "error-message"); // Make it stand out
                if (container.firstChild) container.insertBefore(globalRateLimitInfo, container.firstChild);
                else container.appendChild(globalRateLimitInfo);
                globalRateLimitMessageShown = true;
            }
            return; // Skip rendering this job item
        }

        // Handle other errors for job items
        if (jobItem.error) {
            console.warn(`Job (ID: ${jobItem.id || 'unbekannt'}) konnte nicht geladen werden: ${jobItem.message}. Er wird nicht gerendert.`);
            // Optionally, render a placeholder for this failed job item
            const errorJobDiv = document.createElement("div");
            errorJobDiv.classList.add("my-job-item", "job-entry", "job-error", "visible");
            errorJobDiv.textContent = `Job (ID: ${jobItem.id || 'unbekannt'}) konnte nicht geladen werden. Grund: ${jobItem.message}`;
            fragment.appendChild(errorJobDiv);
            return; // Skip rendering normal details for this job item
        }
        
        const jobFieldData = jobItem.fieldData;
        if (!jobFieldData) {
            console.warn("Job-Item ohne fieldData übersprungen:", jobItem);
            // Optionally, render a placeholder for this malformed job item
            const malformedJobDiv = document.createElement("div");
            malformedJobDiv.classList.add("my-job-item", "job-entry", "job-error", "visible");
            malformedJobDiv.textContent = `Job (ID: ${jobItem.id}) hat fehlerhafte Daten.`;
            fragment.appendChild(malformedJobDiv);
            return;
        }

        // --- Create Job Wrapper ---
        const jobWrapper = document.createElement("div");
        jobWrapper.classList.add("my-job-item", "job-entry");
        jobWrapper.dataset.jobId = jobItem.id;

        // --- Create Job Header ---
        const jobHeaderDiv = document.createElement("div");
        jobHeaderDiv.classList.add("db-table-row", "db-table-my-job");

        // Job Info (Image & Name)
        const jobInfoDataCell = document.createElement("div");
        jobInfoDataCell.classList.add("db-table-row-item", "justify-left");
        if (jobFieldData["job-image"]?.url || jobFieldData["job-image"]) {
            const jobImg = document.createElement("img");
            jobImg.classList.add("db-table-img", "is-margin-right-12");
            jobImg.src = jobFieldData["job-image"].url || jobFieldData["job-image"];
            jobImg.alt = jobFieldData.name || "Job Bild";
            jobImg.onerror = () => { jobImg.style.display = 'none'; }; // Basic error handling
            jobInfoDataCell.appendChild(jobImg);
        }
        const jobNameSpan = document.createElement("span");
        jobNameSpan.classList.add("truncate");
        jobNameSpan.textContent = jobFieldData.name || "Unbenannter Job";
        jobInfoDataCell.appendChild(jobNameSpan);
        jobHeaderDiv.appendChild(jobInfoDataCell);

        // Payment
        const paymentCell = document.createElement("div");
        paymentCell.classList.add("db-table-row-item");
        paymentCell.textContent = jobFieldData["job-payment"] ? `${jobFieldData["job-payment"]} €` : "K.A.";
        jobHeaderDiv.appendChild(paymentCell);

        // Category
        const categoryCell = document.createElement("div");
        categoryCell.classList.add("db-table-row-item");
        categoryCell.textContent = jobFieldData["industrie-kategorie"] || "K.A.";
        jobHeaderDiv.appendChild(categoryCell);

        // Status
        const statusCell = document.createElement("div");
        statusCell.classList.add("db-table-row-item");
        const statusTag = document.createElement("div");
        statusTag.classList.add("job-tag"); // Base class
        statusTag.textContent = jobFieldData["job-status"] || "Unbekannt";
        if (jobFieldData["job-status"] === "Aktiv") statusTag.classList.add("is-bg-light-green");
        if (jobFieldData["job-status"] === "Beendet") statusTag.classList.add("is-bg-light-red");
        // Add more status classes as needed
        statusCell.appendChild(statusTag);
        jobHeaderDiv.appendChild(statusCell);

        // Applicants Count
        const applicantIdsForThisSpecificJob = jobFieldData["bewerber"] || [];
        const applicantsCountCell = document.createElement("div");
        applicantsCountCell.classList.add("db-table-row-item");
        applicantsCountCell.textContent = `Bewerber: ${applicantIdsForThisSpecificJob.length}`;
        jobHeaderDiv.appendChild(applicantsCountCell);

        jobWrapper.appendChild(jobHeaderDiv);

        // --- Toggle Button for Applicants ---
        const toggleButtonRow = document.createElement("div");
        toggleButtonRow.classList.add("applicants-toggle-row");

        const toggleDivElement = document.createElement("div");
        toggleDivElement.classList.add("db-table-applicants"); // Main clickable toggle area

        const toggleTextSpan = document.createElement("span");
        toggleTextSpan.classList.add("is-txt-16");
        toggleTextSpan.textContent = "Bewerberliste anzeigen";

        const toggleIconImg = document.createElement("img");
        toggleIconImg.src = "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/682c5e5b84cac09c56cdbebe_angle-down-small.svg";
        toggleIconImg.alt = "Toggle Icon";
        toggleIconImg.classList.add("db-icon-24", "toggle-icon"); // Base icon class

        toggleDivElement.appendChild(toggleTextSpan);
        toggleDivElement.appendChild(toggleIconImg);
        toggleButtonRow.appendChild(toggleDivElement);
        jobWrapper.appendChild(toggleButtonRow);

        // --- Applicants List Container (initially hidden) ---
        const applicantsListContainer = document.createElement("div");
        applicantsListContainer.classList.add("applicants-list-container");
        applicantsListContainer.style.display = "none";
        applicantsListContainer.dataset.jobId = jobItem.id; // Store job ID for reference
        applicantsListContainer.dataset.allApplicantsLoaded = 'false'; // Flag for initial load
        jobWrapper.appendChild(applicantsListContainer);

        // --- Pagination Wrapper (initially hidden) ---
        let paginationWrapper = jobWrapper.querySelector(".db-table-pagination"); // Check if it exists from a previous render
        if (!paginationWrapper) {
            paginationWrapper = document.createElement("div");
            paginationWrapper.classList.add("db-table-pagination");
            jobWrapper.appendChild(paginationWrapper);
        }
        paginationWrapper.style.display = "none";


        // Attach event listener for toggling applicants
        toggleDivElement.addEventListener("click", () => {
            const isOpening = applicantsListContainer.style.display === "none";
            onToggleApplicantsCallback(jobItem, applicantsListContainer, paginationWrapper, toggleTextSpan, toggleIconImg, isOpening);
        });

        fragment.appendChild(jobWrapper);
    });

    container.appendChild(fragment);

    // Make rendered job items visible with a slight delay for potential animation
    requestAnimationFrame(() => {
        container.querySelectorAll(".my-job-item.job-entry:not(.job-error)").forEach(entry => entry.classList.add("visible"));
    });
}
