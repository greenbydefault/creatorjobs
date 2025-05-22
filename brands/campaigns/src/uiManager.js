// src/uiManager.js
(function() {
    'use strict';

    window.WEBFLOW_API = window.WEBFLOW_API || {};

    // Abhängigkeiten werden hier oben deklariert und später geprüft,
    // da sie für fast alle Funktionen dieses Moduls benötigt werden.
    // Eine Prüfung auf Verfügbarkeit erfolgt vor der ersten Nutzung.
    let MAPPINGS, State, apiService, scoringService, uiElements, UTILS;

    function _getDependencies() {
        MAPPINGS = window.WEBFLOW_API.config?.MAPPINGS;
        State = window.WEBFLOW_API.state;
        apiService = window.WEBFLOW_API.apiService;
        scoringService = window.WEBFLOW_API.scoringService;
        uiElements = window.WEBFLOW_API.uiElements;
        UTILS = window.WEBFLOW_API.utils; // Für delay, falls uiManager es direkt bräuchte

        if (!MAPPINGS || !State || !apiService || !scoringService || !uiElements || !UTILS) {
            console.error("[uiManager.js] FEHLER: Nicht alle Abhängigkeiten konnten geladen werden!", { MAPPINGS, State, apiService, scoringService, uiElements, UTILS });
            return false;
        }
        return true;
    }

    /**
     * Sortiert Bewerber (interne Funktion)
     */
    function sortApplicantsGlobally(applicantItems, jobFieldData) {
        if (!_getDependencies()) return applicantItems; // Fallback, wenn Abhängigkeiten fehlen

        const allMappings = MAPPINGS;
        if (!allMappings) {
            console.error("[uiManager.js] MAPPINGS nicht verfügbar für Sortierung.");
            return applicantItems.sort((a,b) => (a.fieldData?.name || "").localeCompare(b.fieldData?.name || ""));
        }

        const itemsWithScore = applicantItems.map(applicant => {
            let matchInfo = { score: -1, details: {}, rawScore: 0, maxScore: 0 };
            if (jobFieldData && applicant && applicant.fieldData && !applicant.error) {
                matchInfo = scoringService.calculateMatchScore(applicant.fieldData, jobFieldData);
            } else if (applicant && applicant.fieldData && !applicant.error && !jobFieldData) {
                matchInfo = { score: 0, details: {note: "Job data missing for scoring"}, rawScore: 0, maxScore: 0 };
            }
            return { ...applicant, matchInfo };
        });

        return itemsWithScore.sort((a, b) => {
            const aIsValid = a && a.fieldData && !a.error;
            const bIsValid = b && b.fieldData && !b.error;
            if (aIsValid && !bIsValid) return -1;
            if (!aIsValid && bIsValid) return 1;
            if (!aIsValid && !bIsValid) return 0;
            if (b.matchInfo.score !== a.matchInfo.score) {
                return b.matchInfo.score - a.matchInfo.score;
            }
            const aIsPlus = a.fieldData["plus-mitglied"] === true;
            const bIsPlus = b.fieldData["plus-mitglied"] === true;
            if (aIsPlus && !bIsPlus) return -1;
            if (!aIsPlus && bIsPlus) return 1;
            const nameA = a.fieldData.name || "";
            const nameB = b.fieldData.name || "";
            return nameA.localeCompare(nameB);
        });
    }

    /**
     * Rendert Paginierung (interne Funktion)
     */
    async function renderPaginationControls(jobId, applicantsListContainer, paginationWrapper, currentPage, totalPages) {
        if (!_getDependencies()) return;
        if (!paginationWrapper) return;

        paginationWrapper.innerHTML = '';
        paginationWrapper.style.display = totalPages <= 1 ? "none" : "flex";

        if (totalPages <= 1) return;

        const prevButton = document.createElement("a");
        prevButton.href = "#";
        prevButton.classList.add("db-pagination-count", "button-prev");
        prevButton.textContent = "Zurück";
        if (currentPage === 1) {
            prevButton.classList.add("disabled");
        } else {
            prevButton.addEventListener("click", async (e) => {
                e.preventDefault();
                if (prevButton.classList.contains("disabled-loading")) return;
                prevButton.classList.add("disabled-loading");
                prevButton.textContent = "Lade...";
                await window.WEBFLOW_API.uiManager.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, currentPage - 1);
            });
        }
        paginationWrapper.appendChild(prevButton);

        const MAX_VISIBLE_PAGES = 5;
        let startPage, endPage;
        if (totalPages <= MAX_VISIBLE_PAGES) {
            startPage = 1; endPage = totalPages;
        } else {
            const maxPagesBeforeCurrentPage = Math.floor(MAX_VISIBLE_PAGES / 2);
            const maxPagesAfterCurrentPage = Math.ceil(MAX_VISIBLE_PAGES / 2) - 1;
            if (currentPage <= maxPagesBeforeCurrentPage) {
                startPage = 1; endPage = MAX_VISIBLE_PAGES;
            } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
                startPage = totalPages - MAX_VISIBLE_PAGES + 1; endPage = totalPages;
            } else {
                startPage = currentPage - maxPagesBeforeCurrentPage; endPage = currentPage + maxPagesAfterCurrentPage;
            }
        }

        if (startPage > 1) {
            const firstPageLink = document.createElement("a");
            firstPageLink.href = "#"; firstPageLink.classList.add("db-pagination-count"); firstPageLink.textContent = "1";
            firstPageLink.addEventListener("click", async (e) => {
                e.preventDefault(); if (firstPageLink.classList.contains("disabled-loading") || firstPageLink.classList.contains("current")) return;
                paginationWrapper.querySelectorAll('.db-pagination-count:not(.ellipsis)').forEach(el => el.classList.add("disabled-loading"));
                firstPageLink.textContent = "...";
                await window.WEBFLOW_API.uiManager.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, 1);
            });
            paginationWrapper.appendChild(firstPageLink);
            if (startPage > 2) {
                const ellipsisSpan = document.createElement("span");
                ellipsisSpan.classList.add("db-pagination-count", "ellipsis"); ellipsisSpan.textContent = "...";
                paginationWrapper.appendChild(ellipsisSpan);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const pageLink = document.createElement("a");
            pageLink.href = "#"; pageLink.classList.add("db-pagination-count"); pageLink.textContent = i;
            if (i === currentPage) {
                pageLink.classList.add("current");
            } else {
                pageLink.addEventListener("click", async (e) => {
                    e.preventDefault(); if (pageLink.classList.contains("disabled-loading")) return;
                    paginationWrapper.querySelectorAll('.db-pagination-count:not(.ellipsis)').forEach(el => el.classList.add("disabled-loading"));
                    pageLink.textContent = "...";
                    await window.WEBFLOW_API.uiManager.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, i);
                });
            }
            paginationWrapper.appendChild(pageLink);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsisSpan = document.createElement("span");
                ellipsisSpan.classList.add("db-pagination-count", "ellipsis"); ellipsisSpan.textContent = "...";
                paginationWrapper.appendChild(ellipsisSpan);
            }
            const lastPageLink = document.createElement("a");
            lastPageLink.href = "#"; lastPageLink.classList.add("db-pagination-count"); lastPageLink.textContent = totalPages;
            lastPageLink.addEventListener("click", async (e) => {
                e.preventDefault(); if (lastPageLink.classList.contains("disabled-loading") || lastPageLink.classList.contains("current")) return;
                paginationWrapper.querySelectorAll('.db-pagination-count:not(.ellipsis)').forEach(el => el.classList.add("disabled-loading"));
                lastPageLink.textContent = "...";
                await window.WEBFLOW_API.uiManager.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, totalPages);
            });
            paginationWrapper.appendChild(lastPageLink);
        }

        const nextButton = document.createElement("a");
        nextButton.href = "#"; nextButton.classList.add("db-pagination-count", "button-next"); nextButton.textContent = "Weiter";
        if (currentPage === totalPages) {
            nextButton.classList.add("disabled");
        } else {
            nextButton.addEventListener("click", async (e) => {
                e.preventDefault(); if (nextButton.classList.contains("disabled-loading")) return;
                nextButton.classList.add("disabled-loading"); nextButton.textContent = "Lade...";
                await window.WEBFLOW_API.uiManager.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, currentPage + 1);
            });
        }
        paginationWrapper.appendChild(nextButton);
    }

    // Interne Hilfsfunktion für Filter-Callbacks
    const uiManagerInternal = {
        _applyAndReloadApplicantsForFilter: async function(jobId, applicantsListContainer, paginationWrapper) {
            if (!_getDependencies()) return;

            const jobCache = State.getJobDataCache()[jobId];
            if (!jobCache || !jobCache.allItems) {
                console.warn("[uiManager.js] DEBUG: _applyAndReloadApplicantsForFilter - Keine Rohdaten im Cache für Job", jobId);
                return;
            }

            const activeFollowerFilters = [];
            const followerCheckboxes = applicantsListContainer.querySelectorAll(`.db-filter-checkbox[data-filter-type="follower"]:checked`);
            followerCheckboxes.forEach(cb => activeFollowerFilters.push(cb.dataset.filterValue));

            State.updateJobCacheActiveFilters(jobId, { follower: activeFollowerFilters });
            console.log(`[uiManager.js] DEBUG: Job ${jobId} - Aktive Follower-Filter:`, activeFollowerFilters);

            let filteredItems = jobCache.allItems;
            if (activeFollowerFilters.length > 0) {
                filteredItems = filteredItems.filter(item => {
                    if (item.error || !item.fieldData) return false;
                    const applicantFollowerId = item.fieldData["creator-follower"];
                    return activeFollowerFilters.includes(applicantFollowerId);
                });
            }
            console.log(`[uiManager.js] DEBUG: Job ${jobId} - Anzahl Items nach Filterung: ${filteredItems.length}`);

            const jobDetails = jobCache.jobDetails;
            const sortedItems = sortApplicantsGlobally(filteredItems, jobDetails);

            State.updateJobCacheSortedAndFilteredItems(jobId, sortedItems);
            await window.WEBFLOW_API.uiManager.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, 1);
        }
    };

    // Öffentliche API dieses Moduls
    const publicApi = {
        loadAndDisplayApplicantsForJob: async function(jobId, applicantsListContainer, paginationWrapper, pageNumber = 1) {
            if (!_getDependencies()) {
                 console.error("[uiManager.js] loadAndDisplayApplicantsForJob: Abhängigkeiten nicht geladen.");
                 const loadingMessageEl = applicantsListContainer.querySelector(".applicants-message");
                 if(loadingMessageEl) loadingMessageEl.textContent = 'Fehler: Initialisierung fehlgeschlagen.';
                 return;
            }
            console.log(`[uiManager.js] DEBUG: loadAndDisplayApplicantsForJob START - Job ID: ${jobId}, Page: ${pageNumber}`);

            const jobWrapper = applicantsListContainer.closest('.my-job-item');
            const mainToggleButton = jobWrapper ? jobWrapper.querySelector('.db-table-applicants') : null;
            if (mainToggleButton) mainToggleButton.style.pointerEvents = 'none';

            if (!applicantsListContainer.querySelector(".db-table-filter-row")) {
                const filterRowElement = uiElements.createFilterRowElement(jobId, () => uiManagerInternal._applyAndReloadApplicantsForFilter(jobId, applicantsListContainer, paginationWrapper));
                applicantsListContainer.insertBefore(filterRowElement, applicantsListContainer.firstChild);
            }
            if (!applicantsListContainer.querySelector(".db-table-header.db-table-applicant")) {
                const headerElement = uiElements.createApplicantTableHeaderElement();
                const filterRow = applicantsListContainer.querySelector(".db-table-filter-row");
                if (filterRow && filterRow.nextSibling) {
                    applicantsListContainer.insertBefore(headerElement, filterRow.nextSibling);
                } else if (filterRow) {
                    applicantsListContainer.appendChild(headerElement);
                } else {
                    applicantsListContainer.insertBefore(headerElement, applicantsListContainer.firstChild);
                }
            }

            let applicantsContentElement = applicantsListContainer.querySelector(".actual-applicants-content");
            if (!applicantsContentElement) {
                applicantsContentElement = document.createElement("div");
                applicantsContentElement.classList.add("actual-applicants-content");
                const header = applicantsListContainer.querySelector(".db-table-header.db-table-applicant");
                if (header && header.nextSibling) {
                    applicantsListContainer.insertBefore(applicantsContentElement, header.nextSibling);
                } else if (header) {
                    applicantsListContainer.appendChild(applicantsContentElement);
                } else {
                    applicantsListContainer.appendChild(applicantsContentElement);
                }
            }

            applicantsContentElement.innerHTML = '';
            applicantsListContainer.dataset.currentPage = pageNumber;

            const loadingMessage = document.createElement("p");
            loadingMessage.classList.add("applicants-message");
            loadingMessage.textContent = `Lade Bewerber (Seite ${pageNumber})...`;
            applicantsContentElement.appendChild(loadingMessage);

            const jobCache = State.getJobDataCache()[jobId];
            if (!jobCache || !jobCache.sortedAndFilteredItems) {
                console.error(`[uiManager.js] DEBUG: Keine sortierten/gefilterten Daten im Cache für Job ${jobId}.`);
                loadingMessage.textContent = 'Fehler: Bewerberdaten konnten nicht geladen werden (Cache-Problem).';
                if (mainToggleButton) mainToggleButton.style.pointerEvents = 'auto';
                return;
            }

            const jobDetailsForRows = jobCache.jobDetails;
             if (!jobDetailsForRows || Object.keys(jobDetailsForRows).length === 0) {
                console.warn(`[uiManager.js] DEBUG: Job-Details für Job ${jobId} nicht im Cache beim Rendern der Bewerberzeilen.`);
            }


            const allSortedAndFilteredItems = jobCache.sortedAndFilteredItems;
            const pageSize = State.currentApplicantPageSize || 15;
            const totalPages = Math.ceil(allSortedAndFilteredItems.length / pageSize);
            const offset = (pageNumber - 1) * pageSize;
            const pageItems = allSortedAndFilteredItems.slice(offset, offset + pageSize);

            loadingMessage.remove();

            let validApplicantsRenderedOnThisPage = 0;
            if (pageItems.length > 0) {
                pageItems.forEach(applicantItemWithScore => {
                    if (applicantItemWithScore && applicantItemWithScore.fieldData && !applicantItemWithScore.error) {
                        const applicantRow = uiElements.createApplicantRowElement(applicantItemWithScore, jobDetailsForRows);
                        applicantsContentElement.appendChild(applicantRow);
                        requestAnimationFrame(() => {
                            applicantRow.style.opacity = "0";
                            requestAnimationFrame(() => {
                                applicantRow.style.transition = "opacity 0.3s ease-in-out";
                                applicantRow.style.opacity = "1";
                            });
                        });
                        validApplicantsRenderedOnThisPage++;
                    } else if (applicantItemWithScore && applicantItemWithScore.error) {
                        const errorMsg = document.createElement("p");
                        errorMsg.classList.add("applicants-message", "error-message-item");
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

            console.log(`[uiManager.js] DEBUG: Job ${jobId}, Seite ${pageNumber}: ${validApplicantsRenderedOnThisPage} Bewerber gerendert aus ${pageItems.length} Items für diese Seite.`);

            if (validApplicantsRenderedOnThisPage === 0 && allSortedAndFilteredItems.length > 0 && pageItems.length > 0) {
                const noDataMsg = document.createElement("p");
                noDataMsg.classList.add("applicants-message");
                noDataMsg.textContent = "Keine gültigen Bewerberdaten für diese Seite gefunden.";
                applicantsContentElement.appendChild(noDataMsg);
            } else if (allSortedAndFilteredItems.length === 0 && jobCache.allItems && jobCache.allItems.length > 0) {
                const noMatchMsg = document.createElement("p");
                noMatchMsg.classList.add("applicants-message");
                noMatchMsg.textContent = "Keine Bewerber entsprechen den aktuellen Kriterien oder konnten geladen werden.";
                applicantsContentElement.appendChild(noMatchMsg);
                if (paginationWrapper) paginationWrapper.style.display = "none";
            } else if (allSortedAndFilteredItems.length === 0) {
                const noApplicantsMsg = document.createElement("p");
                noApplicantsMsg.classList.add("applicants-message");
                noApplicantsMsg.textContent = "Für diesen Job liegen keine Bewerbungen vor oder es konnten keine geladen werden.";
                applicantsContentElement.appendChild(noApplicantsMsg);
                if (paginationWrapper) paginationWrapper.style.display = "none";
            }

            await renderPaginationControls(jobId, applicantsListContainer, paginationWrapper, pageNumber, totalPages);

            if (mainToggleButton) mainToggleButton.style.pointerEvents = 'auto';
            applicantsListContainer.dataset.allApplicantsLoaded = 'true';
        },

        renderMyJobsAndApplicants: function(jobItems) {
            if (!_getDependencies()) {
                console.error("[uiManager.js] renderMyJobsAndApplicants: Abhängigkeiten nicht geladen.");
                const container = document.getElementById("jobs-list");
                if(container) container.innerHTML = "<p class='error-message job-entry visible'>Fehler: UI-Komponenten konnten nicht initialisiert werden.</p>";
                return;
            }
            const container = document.getElementById("jobs-list");
            if (!container) {
                console.error("[uiManager.js] ❌ Container 'jobs-list' nicht gefunden.");
                return;
            }
            container.innerHTML = "";

            if (!jobItems || jobItems.length === 0) {
                const noJobsMsg = document.createElement("p");
                noJobsMsg.textContent = "Du hast noch keine Jobs erstellt oder es wurden keine Jobs gefunden.";
                noJobsMsg.classList.add("job-entry", "visible");
                container.appendChild(noJobsMsg);
                return;
            }

            const fragment = document.createDocumentFragment();
            let globalRateLimitMessageShown = false;

            jobItems.forEach(jobItem => {
                if (jobItem.error && jobItem.status === 429) {
                    console.warn(`[uiManager.js] Job (ID: ${jobItem.id || 'unbekannt'}) konnte wegen Rate Limit nicht geladen werden und wird nicht gerendert.`);
                    if (!globalRateLimitMessageShown && !document.getElementById('global-rate-limit-message')) {
                        const globalRateLimitInfo = document.createElement("p");
                        globalRateLimitInfo.id = 'global-rate-limit-message';
                        globalRateLimitInfo.textContent = "Hinweis: Einige Jobdaten konnten aufgrund von API-Anfragelimits nicht geladen werden.";
                        globalRateLimitInfo.classList.add("job-entry", "visible", "error-message");
                        if (container.firstChild) container.insertBefore(globalRateLimitInfo, container.firstChild);
                        else container.appendChild(globalRateLimitInfo);
                        globalRateLimitMessageShown = true;
                    }
                    return;
                }
                if (jobItem.error) {
                    console.warn(`[uiManager.js] Job (ID: ${jobItem.id || 'unbekannt'}) konnte nicht geladen werden: ${jobItem.message}. Er wird nicht gerendert.`);
                    const errorJobDiv = document.createElement("div");
                    errorJobDiv.classList.add("my-job-item", "job-entry", "job-error", "visible");
                    errorJobDiv.textContent = `Job ${jobItem.id || 'unbekannt'} konnte nicht geladen werden. Grund: ${jobItem.message}`;
                    fragment.appendChild(errorJobDiv);
                    return;
                }

                const jobFieldData = jobItem.fieldData;
                if (!jobFieldData) {
                    console.warn("[uiManager.js] Job-Item ohne fieldData übersprungen:", jobItem);
                    return;
                }

                const jobWrapper = document.createElement("div");
                jobWrapper.classList.add("my-job-item", "job-entry");
                jobWrapper.dataset.jobId = jobItem.id;

                const jobHeaderDiv = document.createElement("div");
                jobHeaderDiv.classList.add("db-table-row", "db-table-my-job");

                const jobInfoDataCell = document.createElement("div");
                jobInfoDataCell.classList.add("db-table-row-item", "justify-left");
                if (jobFieldData["job-image"]?.url || jobFieldData["job-image"]) {
                    const jobImg = document.createElement("img");
                    jobImg.classList.add("db-table-img", "is-margin-right-12");
                    jobImg.src = jobFieldData["job-image"].url || jobFieldData["job-image"];
                    jobImg.alt = jobFieldData.name || "Job Bild";
                    jobInfoDataCell.appendChild(jobImg);
                }
                const jobNameSpan = document.createElement("span");
                jobNameSpan.classList.add("truncate");
                jobNameSpan.textContent = jobFieldData.name || "Unbenannter Job";
                jobInfoDataCell.appendChild(jobNameSpan);
                jobHeaderDiv.appendChild(jobInfoDataCell);

                const paymentCell = document.createElement("div");
                paymentCell.classList.add("db-table-row-item");
                paymentCell.textContent = jobFieldData["job-payment"] ? `${jobFieldData["job-payment"]} €` : "K.A.";
                jobHeaderDiv.appendChild(paymentCell);

                const categoryCell = document.createElement("div");
                categoryCell.classList.add("db-table-row-item");
                categoryCell.textContent = jobFieldData["industrie-kategorie"] || "K.A.";
                jobHeaderDiv.appendChild(categoryCell);

                const statusCell = document.createElement("div");
                statusCell.classList.add("db-table-row-item");
                const statusTag = document.createElement("div");
                statusTag.classList.add("job-tag");
                statusTag.textContent = jobFieldData["job-status"] || "Unbekannt";
                if (jobFieldData["job-status"] === "Aktiv") statusTag.classList.add("is-bg-light-green");
                if (jobFieldData["job-status"] === "Beendet") statusTag.classList.add("is-bg-light-red");
                statusCell.appendChild(statusTag);
                jobHeaderDiv.appendChild(statusCell);

                const applicantIdsForThisSpecificJob = jobFieldData["bewerber"] || [];
                const applicantsCountCell = document.createElement("div");
                applicantsCountCell.classList.add("db-table-row-item");
                applicantsCountCell.textContent = `Bewerber: ${applicantIdsForThisSpecificJob.length}`;
                jobHeaderDiv.appendChild(applicantsCountCell);
                jobWrapper.appendChild(jobHeaderDiv);

                const toggleButtonRow = document.createElement("div");
                toggleButtonRow.classList.add("applicants-toggle-row");
                const toggleDivElement = document.createElement("div");
                toggleDivElement.classList.add("db-table-applicants");
                const toggleTextSpan = document.createElement("span");
                toggleTextSpan.classList.add("is-txt-16");
                toggleTextSpan.textContent = "Bewerberliste anzeigen";
                const toggleIconImg = document.createElement("img");
                toggleIconImg.src = "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/682c5e5b84cac09c56cdbebe_angle-down-small.svg";
                toggleIconImg.alt = "Toggle Icon";
                toggleIconImg.classList.add("db-icon-24", "toggle-icon");
                toggleDivElement.appendChild(toggleTextSpan);
                toggleDivElement.appendChild(toggleIconImg);
                toggleButtonRow.appendChild(toggleDivElement);
                jobWrapper.appendChild(toggleButtonRow);

                const applicantsListContainer = document.createElement("div");
                applicantsListContainer.classList.add("applicants-list-container");
                applicantsListContainer.style.display = "none";
                applicantsListContainer.dataset.jobId = jobItem.id;
                applicantsListContainer.dataset.allApplicantsLoaded = 'false';
                jobWrapper.appendChild(applicantsListContainer);

                let paginationWrapper = jobWrapper.querySelector(".db-table-pagination");
                if (!paginationWrapper) {
                    paginationWrapper = document.createElement("div");
                    paginationWrapper.classList.add("db-table-pagination");
                    jobWrapper.appendChild(paginationWrapper);
                }
                paginationWrapper.style.display = "none";

                toggleDivElement.addEventListener("click", async () => {
                    if (!_getDependencies()) {
                        console.error("[uiManager.js] Toggle Click: Abhängigkeiten nicht geladen.");
                        return;
                    }
                    const isHidden = applicantsListContainer.style.display === "none";
                    if (isHidden) {
                        applicantsListContainer.style.display = "block";
                        toggleTextSpan.textContent = "Bewerberliste ausblenden";
                        toggleIconImg.classList.add("icon-up");

                        const jobCacheEntry = State.ensureJobDataCacheEntry(jobItem.id);
                        if (!jobCacheEntry.jobDetails || Object.keys(jobCacheEntry.jobDetails).length === 0) {
                            State.updateJobCacheJobDetails(jobItem.id, jobFieldData);
                        }

                        if (!jobCacheEntry.allItems || jobCacheEntry.allItems.length !== applicantIdsForThisSpecificJob.length) {
                            toggleDivElement.style.pointerEvents = 'none';
                            applicantsListContainer.innerHTML = '';
                            const loadingAllMsg = document.createElement("p");
                            loadingAllMsg.classList.add("applicants-message");
                            loadingAllMsg.textContent = "Lade alle Bewerberdaten für Sortierung...";
                            applicantsListContainer.appendChild(loadingAllMsg);

                            const fetchedItems = await apiService.fetchAllApplicantsForJob(jobItem.id, applicantIdsForThisSpecificJob);
                            loadingAllMsg.remove();
                            State.updateJobCacheAllItems(jobItem.id, fetchedItems);
                        }

                        const itemsToFilter = Array.isArray(jobCacheEntry.allItems) ? jobCacheEntry.allItems : [];
                        const itemsToSort = (jobCacheEntry.activeFilters?.follower && jobCacheEntry.activeFilters.follower.length > 0)
                            ? itemsToFilter.filter(item => {
                                if (item.error || !item.fieldData) return false;
                                const applicantFollowerId = item.fieldData["creator-follower"];
                                return jobCacheEntry.activeFilters.follower.includes(applicantFollowerId);
                              })
                            : itemsToFilter;

                        const sortedItems = sortApplicantsGlobally(itemsToSort, jobCacheEntry.jobDetails);
                        State.updateJobCacheSortedAndFilteredItems(jobItem.id, sortedItems);
                        applicantsListContainer.dataset.allApplicantsLoaded = 'true';

                        await publicApi.loadAndDisplayApplicantsForJob(jobItem.id, applicantsListContainer, paginationWrapper, 1);
                        toggleDivElement.style.pointerEvents = 'auto';
                    } else {
                        applicantsListContainer.style.display = "none";
                        paginationWrapper.style.display = "none";
                        toggleTextSpan.textContent = "Bewerberliste anzeigen";
                        toggleIconImg.classList.remove("icon-up");
                    }
                });
                fragment.appendChild(jobWrapper);
            });
            container.appendChild(fragment);
            requestAnimationFrame(() => {
                container.querySelectorAll(".my-job-item.job-entry:not(.job-error)").forEach(entry => entry.classList.add("visible"));
            });
        },

        initializePageSizeSelector: function() {
            if (!_getDependencies()) {
                console.error("[uiManager.js] initializePageSizeSelector: Abhängigkeiten nicht geladen.");
                return;
            }
            const pageSizeSelector = document.getElementById('job-applicants-page-size-selector');
            if (pageSizeSelector) {
                pageSizeSelector.value = State.currentApplicantPageSize || 15;
                pageSizeSelector.addEventListener('change', async (event) => {
                    const newSize = parseInt(event.target.value, 10);
                    if (newSize === 15 || newSize === 25) {
                        const oldSize = State.currentApplicantPageSize || 15;
                        State.setCurrentApplicantPageSize(newSize);
                        console.log(`[uiManager.js] DEBUG: Seitengröße geändert von ${oldSize} auf ${State.currentApplicantPageSize}`);

                        const openApplicantContainer = document.querySelector('.applicants-list-container[style*="display: block"]');
                        if (openApplicantContainer) {
                            const jobId = openApplicantContainer.dataset.jobId;
                            const jobCacheEntry = State.getJobDataCache()[jobId];
                            const jobWrapper = openApplicantContainer.closest('.my-job-item');
                            const paginationWrapper = jobWrapper ? jobWrapper.querySelector(".db-table-pagination") : null;
                            const toggleDivElement = jobWrapper ? jobWrapper.querySelector(".db-table-applicants") : null;

                            if (jobCacheEntry && jobCacheEntry.allItems && paginationWrapper && toggleDivElement && jobCacheEntry.jobDetails) {
                                console.log(`[uiManager.js] DEBUG: Lade Job ${jobId} mit neuer Seitengröße ${State.currentApplicantPageSize} neu (Seite 1).`);
                                if (toggleDivElement) toggleDivElement.style.pointerEvents = 'none';
                                if (paginationWrapper) paginationWrapper.querySelectorAll('.db-pagination-count').forEach(el => el.classList.add("disabled-loading"));

                                const itemsToFilter = Array.isArray(jobCacheEntry.allItems) ? jobCacheEntry.allItems : [];
                                let itemsToDisplay = itemsToFilter;
                                if (jobCacheEntry.activeFilters?.follower && jobCacheEntry.activeFilters.follower.length > 0) {
                                    itemsToDisplay = itemsToFilter.filter(item => {
                                        if (item.error || !item.fieldData) return false;
                                        const applicantFollowerId = item.fieldData["creator-follower"];
                                        return jobCacheEntry.activeFilters.follower.includes(applicantFollowerId);
                                    });
                                }
                                const sortedItems = sortApplicantsGlobally(itemsToDisplay, jobCacheEntry.jobDetails);
                                State.updateJobCacheSortedAndFilteredItems(jobId, sortedItems);

                                publicApi.loadAndDisplayApplicantsForJob(jobId, openApplicantContainer, paginationWrapper, 1)
                                    .finally(() => {
                                        if (toggleDivElement) toggleDivElement.style.pointerEvents = 'auto';
                                    });
                            } else {
                                console.log("[uiManager.js] DEBUG: Konnte Job nicht neu laden nach Seitengrößenänderung - Cache oder Elemente fehlen.");
                            }
                        }
                    }
                });
            } else {
                console.warn("[uiManager.js] DEBUG: Element für Seitengrößenauswahl ('job-applicants-page-size-selector') nicht gefunden. Nutze Standard: " + (State.currentApplicantPageSize || 15));
            }
        },
        renderMyJobsSkeletonLoader: function(container, count) {
            if (!_getDependencies() || !uiElements?.renderMyJobsSkeletonLoader) {
                console.warn("[uiManager.js] renderMyJobsSkeletonLoader: uiElements.renderMyJobsSkeletonLoader nicht verfügbar.");
                if (container) container.innerHTML = "<p>Lade Job-Layout...</p>";
                return;
            }
            uiElements.renderMyJobsSkeletonLoader(container, count);
        }
    };

    // Hänge die öffentliche API dieses Moduls an das globale Namespace-Objekt an
    // Erst nachdem alle internen Funktionen definiert wurden.
    window.WEBFLOW_API.uiManager = publicApi;
    console.log("[uiManager.js] Initialisiert und an window.WEBFLOW_API angehängt.");

})();
