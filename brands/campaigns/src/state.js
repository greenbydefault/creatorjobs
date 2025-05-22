// src/state.js
(function() {
    'use strict';

    window.WEBFLOW_API = window.WEBFLOW_API || {};

    const state = {
        currentApplicantPageSize: 15,
        currentWebflowMemberId_MJ: null,
        allMyJobsData_MJ: [],
        jobDataCache: {}, // { jobId: { allItems: [], sortedAndFilteredItems: [], activeFilters: { follower: [] }, jobDetails: {} } }

        // Getter und Setter, falls direkter Zugriff vermieden werden soll oder Logik beim Setzen nötig ist
        setCurrentApplicantPageSize: function(size) {
            this.currentApplicantPageSize = size;
        },
        getCurrentApplicantPageSize: function() {
            return this.currentApplicantPageSize;
        },
        setCurrentWebflowMemberId: function(id) {
            this.currentWebflowMemberId_MJ = id;
        },
        getCurrentWebflowMemberId: function() {
            return this.currentWebflowMemberId_MJ;
        },
        setAllMyJobsData: function(jobs) {
            this.allMyJobsData_MJ = jobs;
        },
        getAllMyJobsData: function() {
            return this.allMyJobsData_MJ;
        },
        getJobDataCacheEntry: function(jobId) {
            return this.jobDataCache[jobId];
        },
        ensureJobDataCacheEntry: function(jobId) {
            if (!this.jobDataCache[jobId]) {
                this.jobDataCache[jobId] = {
                    allItems: [],
                    sortedAndFilteredItems: [],
                    activeFilters: { follower: [] },
                    jobDetails: {}
                };
            }
            return this.jobDataCache[jobId];
        },
        updateJobCacheAllItems: function(jobId, items) {
            this.ensureJobDataCacheEntry(jobId).allItems = items;
        },
        updateJobCacheSortedAndFilteredItems: function(jobId, items) {
            this.ensureJobDataCacheEntry(jobId).sortedAndFilteredItems = items;
        },
        updateJobCacheActiveFilters: function(jobId, filters) {
            this.ensureJobDataCacheEntry(jobId).activeFilters = filters;
        },
        updateJobCacheJobDetails: function(jobId, details) {
            this.ensureJobDataCacheEntry(jobId).jobDetails = details;
        },
        // Direkten Zugriff auf jobDataCache erlauben, wie im Originalskript
        // Alternativ könnte man spezifischere Getter/Setter für jobDataCache Teile anbieten
        getJobDataCache: function() {
            return this.jobDataCache;
        }
    };

    window.WEBFLOW_API.state = state;

})();
