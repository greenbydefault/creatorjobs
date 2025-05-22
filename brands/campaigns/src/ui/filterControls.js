// src/ui/filterControls.js
// This module is responsible for creating and managing filter UI elements.

import { MAPPINGS } from '../config.js';
// jobDataCache will be accessed via state module or passed if needed for initial state
// onFilterChangeCallback will be passed from app.js

/**
 * Creates the filter row element for applicants.
 * @param {string} jobId - The ID of the current job.
 * @param {object} initialActiveFilters - Object containing initial active filters (e.g., { follower: ['id1'] }).
 * @param {function} onFilterChangeCallback - Callback function to execute when a filter changes.
 * It receives (jobId, activeFilters).
 * @returns {HTMLElement} The created filter row div element.
 */
export function createFilterRowElement(jobId, initialActiveFilters, onFilterChangeCallback) {
    const filterRow = document.createElement("div");
    filterRow.classList.add("db-table-filter-row");

    const filterWrapper = document.createElement("div");
    filterWrapper.classList.add("db-table-filter-row-wrapper");
    filterRow.appendChild(filterWrapper);

    // --- Follower Filter ---
    const followerFilterDiv = document.createElement("div");
    followerFilterDiv.classList.add("db-individual-filter-trigger");

    const followerFilterText = document.createElement("span");
    followerFilterText.classList.add("is-txt-16");
    followerFilterText.textContent = "Follower";
    followerFilterDiv.appendChild(followerFilterText);

    const followerFilterIcon = document.createElement("img");
    followerFilterIcon.src = "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/682c5e5b84cac09c56cdbebe_angle-down-small.svg";
    followerFilterIcon.classList.add("db-icon-18"); // Assuming Webflow class
    followerFilterDiv.appendChild(followerFilterIcon);

    const followerDropdownList = document.createElement("div");
    followerDropdownList.classList.add("db-filter-dropdown-list");
    followerDropdownList.style.display = "none"; // Initially hidden

    Object.entries(MAPPINGS.followerRanges).forEach(([id, rangeText]) => {
        if (rangeText === "0") return; // Skip the "0" follower range as per original logic

        const optionDiv = document.createElement("div");
        optionDiv.classList.add("db-filter-option");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("db-filter-checkbox");
        checkbox.id = `filter-${jobId}-follower-${id}`;
        checkbox.dataset.filterValue = id;
        checkbox.dataset.filterType = "follower"; // To identify this filter type

        if (initialActiveFilters?.follower?.includes(id)) {
            checkbox.checked = true;
        }

        const label = document.createElement("label");
        label.htmlFor = checkbox.id;
        label.classList.add("is-txt-16");
        label.textContent = rangeText;

        checkbox.addEventListener("change", () => {
            const activeFollowerFilters = [];
            const followerCheckboxes = followerDropdownList.querySelectorAll(`.db-filter-checkbox[data-filter-type="follower"]:checked`);
            followerCheckboxes.forEach(cb => activeFollowerFilters.push(cb.dataset.filterValue));
            onFilterChangeCallback(jobId, { follower: activeFollowerFilters });
        });

        optionDiv.appendChild(checkbox);
        optionDiv.appendChild(label);
        followerDropdownList.appendChild(optionDiv);
    });

    followerFilterDiv.appendChild(followerDropdownList);
    filterWrapper.appendChild(followerFilterDiv);

    // Event listener for toggling the follower dropdown
    followerFilterDiv.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent click from bubbling to document listener immediately
        // Close other dropdowns if any (not implemented here, but good practice for multiple filters)
        const allDropdowns = filterRow.querySelectorAll('.db-filter-dropdown-list');
        allDropdowns.forEach(dd => {
            if (dd !== followerDropdownList) dd.style.display = 'none';
        });
        followerDropdownList.style.display = followerDropdownList.style.display === "none" ? "block" : "none";
    });

    // Global click listener to close dropdown when clicking outside
    // Ensure this is added only once or managed carefully if createFilterRowElement is called multiple times
    // A more robust solution might involve a global event manager in app.js
    document.addEventListener("click", (e) => {
        if (!followerFilterDiv.contains(e.target)) {
            followerDropdownList.style.display = "none";
        }
    });
    // To prevent multiple document event listeners if this function is called for multiple jobs,
    // consider attaching this listener once in app.js and delegating, or using a flag.
    // For this example, it's kept simple.

    // TODO: Add other filters (Location, Creator Type, etc.) similarly if needed

    return filterRow;
}
