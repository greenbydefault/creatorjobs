// src/state.js
// This module manages the dynamic state of the application.

// Mutable state variables
export let currentWebflowMemberId_MJ = null;
export let allMyJobsData_MJ = []; // Stores the raw job items fetched for the current user
export let jobDataCache = {}; // Stores detailed data for each job, including applicants:
                              // { jobId: { allItems: [], sortedAndFilteredItems: [], activeFilters: { follower: [] }, jobDetails: {} } }
export let currentApplicantPageSize = 15; // Default page size for applicants list

// Functions to update state (optional, can also be updated directly if preferred for simplicity in smaller apps)
export function setCurrentWebflowMemberId(id) {
    currentWebflowMemberId_MJ = id;
}

export function setAllMyJobsData(jobs) {
    allMyJobsData_MJ = jobs;
}

export function updateJobDataCache(jobId, data) {
    if (!jobDataCache[jobId]) {
        jobDataCache[jobId] = { activeFilters: { follower: [] } }; // Initialize with default structure
    }
    jobDataCache[jobId] = { ...jobDataCache[jobId], ...data };
}

export function getJobData(jobId) {
    return jobDataCache[jobId];
}

export function setCurrentApplicantPageSize(size) {
    currentApplicantPageSize = size;
}
