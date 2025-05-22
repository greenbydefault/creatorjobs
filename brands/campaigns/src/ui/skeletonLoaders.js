// src/ui/skeletonLoaders.js
// This module provides functions to render skeleton loader UI elements.

/**
 * Renders skeleton loader elements for "My Jobs" list.
 * @param {HTMLElement} container - The HTML element where the skeleton loaders will be appended.
 * @param {number} count - The number of skeleton job items to render.
 */
export function renderMyJobsSkeletonLoader(container, count) {
    if (!container) {
        console.error("renderMyJobsSkeletonLoader: Container element not provided.");
        return;
    }
    container.innerHTML = ""; // Clear previous content

    for (let i = 0; i < count; i++) {
        const jobWrapper = document.createElement("div");
        jobWrapper.classList.add("my-job-item-skeleton", "skeleton-row", "job-entry");

        const jobHeader = document.createElement("div");
        jobHeader.classList.add("db-table-row", "db-table-my-job");

        // Job Name/Image part
        const jobNameDiv = document.createElement("div");
        jobNameDiv.classList.add("db-table-row-item", "justify-left");
        const skeletonJobImage = document.createElement("div");
        skeletonJobImage.classList.add("db-table-img", "is-margin-right-12", "skeleton-element", "skeleton-image");
        jobNameDiv.appendChild(skeletonJobImage);
        const skeletonJobName = document.createElement("div");
        skeletonJobName.classList.add("truncate", "skeleton-element", "skeleton-text", "skeleton-text-title");
        jobNameDiv.appendChild(skeletonJobName);
        jobHeader.appendChild(jobNameDiv);

        // Payment
        const paymentDiv = document.createElement("div");
        paymentDiv.classList.add("db-table-row-item");
        const skeletonPayment = document.createElement("div");
        skeletonPayment.classList.add("skeleton-element", "skeleton-text", "skeleton-text-short");
        paymentDiv.appendChild(skeletonPayment);
        jobHeader.appendChild(paymentDiv);

        // Placeholder for a column (e.g., "Erstellt am" or similar)
        const placeholder1 = document.createElement("div");
        placeholder1.classList.add("db-table-row-item");
        const skeletonText1 = document.createElement("div");
        skeletonText1.classList.add("skeleton-element", "skeleton-text", "skeleton-text-medium");
        placeholder1.appendChild(skeletonText1);
        jobHeader.appendChild(placeholder1);
        
        // Placeholder for another column (e.g. "Aktion")
        const placeholder2 = document.createElement("div");
        placeholder2.classList.add("db-table-row-item");
        // No specific text element, might be buttons or icons
        jobHeader.appendChild(placeholder2);


        // Category
        const categoryDiv = document.createElement("div");
        categoryDiv.classList.add("db-table-row-item");
        const skeletonCategory = document.createElement("div");
        skeletonCategory.classList.add("skeleton-element", "skeleton-text", "skeleton-text-medium");
        categoryDiv.appendChild(skeletonCategory);
        jobHeader.appendChild(categoryDiv);

        // Status
        const statusDiv = document.createElement("div");
        statusDiv.classList.add("db-table-row-item");
        const skeletonStatusTag = document.createElement("div");
        skeletonStatusTag.classList.add("job-tag", "skeleton-element", "skeleton-tag-box");
        statusDiv.appendChild(skeletonStatusTag);
        jobHeader.appendChild(statusDiv);

        // Applicants Count
        const applicantsCountDiv = document.createElement("div");
        applicantsCountDiv.classList.add("db-table-row-item");
        const skeletonApplicantsCount = document.createElement("div");
        skeletonApplicantsCount.classList.add("skeleton-element", "skeleton-text", "skeleton-text-short");
        applicantsCountDiv.appendChild(skeletonApplicantsCount);
        jobHeader.appendChild(applicantsCountDiv);

        jobWrapper.appendChild(jobHeader);

        // Skeleton for the "Toggle Applicants" button area
        const skeletonPaginationRow = document.createElement("div");
        skeletonPaginationRow.classList.add("applicants-toggle-row-skeleton", "skeleton-element");
        skeletonPaginationRow.style.height = "30px"; // Approximate height of the toggle button
        skeletonPaginationRow.style.width = "200px"; // Approximate width
        skeletonPaginationRow.style.margin = "10px auto"; // Centered
        jobWrapper.appendChild(skeletonPaginationRow);

        container.appendChild(jobWrapper);
    }
}
