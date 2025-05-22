// src/uiElements.js
(function() {
    'use strict';

    window.WEBFLOW_API = window.WEBFLOW_API || {};

    // Abhängigkeiten
    const MAPPINGS = window.WEBFLOW_API.config?.MAPPINGS;
    const UTILS = window.WEBFLOW_API.utils;
    const State = window.WEBFLOW_API.state; // Für jobDataCache Zugriff in createFilterRowElement

    const uiElements = {
        renderMyJobsSkeletonLoader: function(container, count) {
            if (!container) return;
            container.innerHTML = "";
            for (let i = 0; i < count; i++) {
                const jobWrapper = document.createElement("div");
                jobWrapper.classList.add("my-job-item-skeleton", "skeleton-row", "job-entry");
                const jobHeader = document.createElement("div");
                jobHeader.classList.add("db-table-row", "db-table-my-job");
                const jobNameDiv = document.createElement("div");
                jobNameDiv.classList.add("db-table-row-item", "justify-left");
                const skeletonJobImage = document.createElement("div");
                skeletonJobImage.classList.add("db-table-img", "is-margin-right-12", "skeleton-element", "skeleton-image");
                jobNameDiv.appendChild(skeletonJobImage);
                const skeletonJobName = document.createElement("div");
                skeletonJobName.classList.add("truncate", "skeleton-element", "skeleton-text", "skeleton-text-title");
                jobNameDiv.appendChild(skeletonJobName);
                jobHeader.appendChild(jobNameDiv);
                const paymentDiv = document.createElement("div");
                paymentDiv.classList.add("db-table-row-item");
                const skeletonPayment = document.createElement("div");
                skeletonPayment.classList.add("skeleton-element", "skeleton-text", "skeleton-text-short");
                paymentDiv.appendChild(skeletonPayment);
                jobHeader.appendChild(paymentDiv);
                const placeholder1 = document.createElement("div");
                placeholder1.classList.add("db-table-row-item");
                const skeletonText1 = document.createElement("div");
                skeletonText1.classList.add("skeleton-element", "skeleton-text", "skeleton-text-medium");
                placeholder1.appendChild(skeletonText1);
                jobHeader.appendChild(placeholder1);
                const placeholder2 = document.createElement("div");
                placeholder2.classList.add("db-table-row-item");
                jobHeader.appendChild(placeholder2);
                const categoryDiv = document.createElement("div");
                categoryDiv.classList.add("db-table-row-item");
                const skeletonCategory = document.createElement("div");
                skeletonCategory.classList.add("skeleton-element", "skeleton-text", "skeleton-text-medium");
                categoryDiv.appendChild(skeletonCategory);
                jobHeader.appendChild(categoryDiv);
                const statusDiv = document.createElement("div");
                statusDiv.classList.add("db-table-row-item");
                const skeletonStatusTag = document.createElement("div");
                skeletonStatusTag.classList.add("job-tag", "skeleton-element", "skeleton-tag-box");
                statusDiv.appendChild(skeletonStatusTag);
                jobHeader.appendChild(statusDiv);
                const applicantsCountDiv = document.createElement("div");
                applicantsCountDiv.classList.add("db-table-row-item");
                const skeletonApplicantsCount = document.createElement("div");
                skeletonApplicantsCount.classList.add("skeleton-element", "skeleton-text", "skeleton-text-short");
                applicantsCountDiv.appendChild(skeletonApplicantsCount);
                jobHeader.appendChild(applicantsCountDiv);
                jobWrapper.appendChild(jobHeader);
                const skeletonPaginationRow = document.createElement("div");
                skeletonPaginationRow.classList.add("applicants-toggle-row-skeleton", "skeleton-element");
                skeletonPaginationRow.style.height = "30px";
                skeletonPaginationRow.style.width = "200px";
                skeletonPaginationRow.style.margin = "10px auto";
                jobWrapper.appendChild(skeletonPaginationRow);
                container.appendChild(jobWrapper);
            }
        },

        createApplicantRowElement: function(applicantItemWithScoreInfo, jobFieldDataForTooltip /* allMappings wird jetzt von MAPPINGS oben bezogen */) {
            const allMappings = MAPPINGS; // Verwende die globale Abhängigkeit
            if (!allMappings || Object.keys(allMappings).length === 0) {
                 console.error("❌ MAPPINGS-Objekt ist nicht verfügbar in createApplicantRowElement.");
                 // Fallback oder Fehleranzeige
                const errorDiv = document.createElement("div");
                errorDiv.textContent = "Fehler: Mapping-Daten nicht verfügbar.";
                return errorDiv;
            }

            const applicantFieldData = applicantItemWithScoreInfo.fieldData;
            const matchInfo = applicantItemWithScoreInfo.matchInfo;

            const applicantDiv = document.createElement("div");
            applicantDiv.classList.add("db-table-row", "db-table-applicant", "job-entry");

            applicantDiv.addEventListener('click', (event) => {
                if (event.target.closest('a.db-application-option') || event.target.closest('.score-circle-indicator')) {
                    return;
                }
                const slug = applicantFieldData.slug;
                if (slug) {
                    const profileUrl = `https://www.creatorjobs.com/members/${slug}`;
                    window.open(profileUrl, '_blank');
                } else {
                    console.warn("Kein Slug für Bewerber gefunden, kann Profil nicht öffnen:", applicantFieldData.name);
                }
            });

            const scoreCellContainer = document.createElement("div");
            scoreCellContainer.classList.add("db-table-row-item");
            scoreCellContainer.style.display = "flex";
            scoreCellContainer.style.justifyContent = "center";
            scoreCellContainer.style.alignItems = "center";

            const scoreValue = matchInfo ? matchInfo.score : 0;
            const scoreCircle = document.createElement("div");
            scoreCircle.classList.add("score-circle-indicator");
            let progressColor = "#e0e0e0";
            if (scoreValue >= 80) progressColor = "#4CAF50";
            else if (scoreValue >= 60) progressColor = "#FFC107";
            else if (scoreValue > 0) progressColor = "#FF9800";
            scoreCircle.style.width = "40px";
            scoreCircle.style.height = "40px";
            scoreCircle.style.borderRadius = "50%";
            scoreCircle.style.position = "relative";
            scoreCircle.style.display = "flex";
            scoreCircle.style.justifyContent = "center";
            scoreCircle.style.alignItems = "center";
            scoreCircle.style.cursor = "default";
            const degree = (scoreValue / 100) * 360;
            scoreCircle.style.background = `conic-gradient(${progressColor} ${degree}deg, #efefef ${degree}deg 360deg)`;
            const scoreText = document.createElement("span");
            scoreText.textContent = `${scoreValue}`;
            scoreText.style.color = "#333";
            scoreText.style.fontWeight = "bold";
            scoreText.style.fontSize = "14px";
            scoreText.style.position = "absolute";
            scoreCircle.appendChild(scoreText);
            scoreCellContainer.appendChild(scoreCircle);
            applicantDiv.appendChild(scoreCellContainer);

            const profileInfoDiv = document.createElement("div");
            profileInfoDiv.classList.add("db-table-row-item", "justify-left");
            const profileImageField = applicantFieldData["image-thumbnail-small-92px"] || applicantFieldData["user-profile-img"];
            if (profileImageField) {
                const applicantImg = document.createElement("img");
                applicantImg.classList.add("db-table-img", "is-margin-right-12");
                applicantImg.src = typeof profileImageField === 'string' ? profileImageField : profileImageField?.url;
                applicantImg.alt = applicantFieldData.name || "Bewerberbild";
                profileInfoDiv.appendChild(applicantImg);
            }
            const namePlusStatusDiv = document.createElement("div");
            namePlusStatusDiv.classList.add("is-flexbox-vertical");
            const nameSpan = document.createElement("span");
            nameSpan.textContent = applicantFieldData.name || "Unbekannter Bewerber";
            nameSpan.classList.add("truncate");
            namePlusStatusDiv.appendChild(nameSpan);
            const plusStatusSpan = document.createElement("span");
            plusStatusSpan.classList.add("is-txt-tiny");
            plusStatusSpan.textContent = applicantFieldData["plus-mitglied"] ? "Plus Mitglied" : "Standard";
            namePlusStatusDiv.appendChild(plusStatusSpan);
            profileInfoDiv.appendChild(namePlusStatusDiv);
            applicantDiv.appendChild(profileInfoDiv);

            const locationDiv = document.createElement("div");
            locationDiv.classList.add("db-table-row-item");
            const city = applicantFieldData["user-city-2"] || "K.A.";
            const bundeslandId = applicantFieldData["bundesland-option"];
            const bundeslandName = allMappings.bundeslaender[bundeslandId] || (bundeslandId ? bundeslandId.substring(0,10)+'...' : "K.A.");
            locationDiv.textContent = `${city}${bundeslandName !== "K.A." ? `, ${bundeslandName}` : ""}`;
            applicantDiv.appendChild(locationDiv);

            const categoryCell = document.createElement("div");
            categoryCell.classList.add("db-table-row-item");
            const categoryTag = document.createElement("span");
            categoryTag.classList.add("job-tag", "customer");
            categoryTag.textContent = applicantFieldData["creator-main-categorie"] || "K.A.";
            categoryCell.appendChild(categoryTag);
            applicantDiv.appendChild(categoryCell);

            const creatorTypeCell = document.createElement("div");
            creatorTypeCell.classList.add("db-table-row-item");
            const creatorTypeTag = document.createElement("span");
            creatorTypeTag.classList.add("job-tag", "customer");
            const creatorTypeId = applicantFieldData["creator-type"];
            creatorTypeTag.textContent = allMappings.creatorTypen[creatorTypeId] || (creatorTypeId ? creatorTypeId.substring(0,10)+'...' : "K.A.");
            creatorTypeCell.appendChild(creatorTypeTag);
            applicantDiv.appendChild(creatorTypeCell);

            const socialCell = document.createElement("div");
            socialCell.classList.add("db-table-row-item");
            const socialPlatforms = [
                { key: "instagram", name: "Instagram", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e8d979b71d2a7e5db3_Instagram.svg" },
                { key: "tiktok", name: "TikTok", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e99dce86c2b6ba83fe_Tiktok.svg" },
                { key: "youtube", name: "YouTube", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e9b00d0480ffe289dc_YouTube.svg" }
            ];
            socialPlatforms.forEach(platform => {
                const platformUrlValue = applicantFieldData[platform.key];
                const normalizedPlatformUrl = UTILS?.normalizeUrl ? UTILS.normalizeUrl(platformUrlValue) : `https://${platformUrlValue}`; // Fallback
                if (normalizedPlatformUrl) {
                    const socialLink = document.createElement("a");
                    socialLink.href = normalizedPlatformUrl;
                    socialLink.classList.add("db-application-option", "no-icon", "w-inline-block");
                    socialLink.target = "_blank";
                    socialLink.rel = "noopener noreferrer";
                    const iconImg = document.createElement("img");
                    iconImg.src = platform.iconUrl;
                    iconImg.alt = `${platform.name} Profil`;
                    iconImg.classList.add("db-icon-18");
                    socialLink.appendChild(iconImg);
                    socialCell.appendChild(socialLink);
                }
            });
            applicantDiv.appendChild(socialCell);

            const followerCell = document.createElement("div");
            followerCell.classList.add("db-table-row-item");
            const followerTag = document.createElement("span");
            followerTag.classList.add("job-tag", "customer");
            const followerId = applicantFieldData["creator-follower"];
            followerTag.textContent = allMappings.followerRanges[followerId] || (followerId ? followerId.substring(0,10)+'...' : "K.A.");
            followerCell.appendChild(followerTag);
            applicantDiv.appendChild(followerCell);

            const ageCell = document.createElement("div");
            ageCell.classList.add("db-table-row-item");
            const ageTag = document.createElement("span");
            ageTag.classList.add("job-tag", "customer");
            const ageId = applicantFieldData["creator-age"];
            ageTag.textContent = allMappings.altersgruppen[ageId] || (ageId ? ageId.substring(0,10)+'...' : "K.A.");
            ageCell.appendChild(ageTag);
            applicantDiv.appendChild(ageCell);

            return applicantDiv;
        },

        createApplicantTableHeaderElement: function() {
            const headerDiv = document.createElement("div");
            headerDiv.classList.add("db-table-header", "db-table-applicant");
            const columns = ["Match", "Creator", "Location", "Kategorie", "Creator Type", "Social Media", "Follower", "Alter"];
            columns.forEach((colText, index) => {
                const colDiv = document.createElement("div");
                colDiv.classList.add("db-table-row-item");
                if (index === 0) colDiv.style.textAlign = "center";
                if (index === 1) colDiv.style.flexGrow = "1.5";
                const textSpan = document.createElement("span");
                textSpan.classList.add("is-txt-16", "is-txt-bold");
                textSpan.textContent = colText;
                colDiv.appendChild(textSpan);
                headerDiv.appendChild(colDiv);
            });
            return headerDiv;
        },

        createFilterRowElement: function(jobId, onFilterChangeCallback /* applicantsListContainer, paginationWrapper werden von uiManager übergeben */) {
            const allMappings = MAPPINGS; // Verwende die globale Abhängigkeit
             if (!allMappings || !allMappings.followerRanges) {
                 console.error("❌ MAPPINGS.followerRanges ist nicht verfügbar in createFilterRowElement.");
                 return document.createElement("div"); // Leeres Div als Fallback
            }

            const filterRow = document.createElement("div");
            filterRow.classList.add("db-table-filter-row");
            const filterWrapper = document.createElement("div");
            filterWrapper.classList.add("db-table-filter-row-wrapper");
            filterRow.appendChild(filterWrapper);

            const followerFilterDiv = document.createElement("div");
            followerFilterDiv.classList.add("db-individual-filter-trigger");
            const followerFilterText = document.createElement("span");
            followerFilterText.classList.add("is-txt-16");
            followerFilterText.textContent = "Follower";
            followerFilterDiv.appendChild(followerFilterText);
            const followerFilterIcon = document.createElement("img");
            followerFilterIcon.src = "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/682c5e5b84cac09c56cdbebe_angle-down-small.svg";
            followerFilterIcon.classList.add("db-icon-18");
            followerFilterDiv.appendChild(followerFilterIcon);

            const followerDropdownList = document.createElement("div");
            followerDropdownList.classList.add("db-filter-dropdown-list");
            followerDropdownList.style.display = "none";

            const jobCache = State?.getJobDataCache ? State.getJobDataCache()[jobId] : null; // Zugriff auf jobDataCache über State-Modul

            Object.entries(allMappings.followerRanges).forEach(([id, rangeText]) => {
                if (rangeText === "0") return;
                const optionDiv = document.createElement("div");
                optionDiv.classList.add("db-filter-option");
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.classList.add("db-filter-checkbox");
                checkbox.id = `filter-${jobId}-follower-${id}`;
                checkbox.dataset.filterValue = id;
                checkbox.dataset.filterType = "follower";
                if (jobCache?.activeFilters?.follower?.includes(id)) {
                    checkbox.checked = true;
                }
                const label = document.createElement("label");
                label.htmlFor = checkbox.id;
                label.classList.add("is-txt-16");
                label.textContent = rangeText;
                checkbox.addEventListener("change", async () => {
                    // Rufe die Callback-Funktion auf, die von uiManager bereitgestellt wird
                    if (typeof onFilterChangeCallback === 'function') {
                        await onFilterChangeCallback();
                    }
                });
                optionDiv.appendChild(checkbox);
                optionDiv.appendChild(label);
                followerDropdownList.appendChild(optionDiv);
            });
            followerFilterDiv.appendChild(followerDropdownList);
            filterWrapper.appendChild(followerFilterDiv);

            followerFilterDiv.addEventListener("click", (e) => {
                e.stopPropagation();
                const allDropdowns = filterRow.querySelectorAll('.db-filter-dropdown-list');
                allDropdowns.forEach(dd => {
                    if (dd !== followerDropdownList) dd.style.display = 'none';
                });
                followerDropdownList.style.display = followerDropdownList.style.display === "none" ? "block" : "none";
            });
            document.addEventListener("click", (e) => {
                if (!followerFilterDiv.contains(e.target)) {
                    followerDropdownList.style.display = "none";
                }
            });
            return filterRow;
        }
    };

    window.WEBFLOW_API.uiElements = uiElements;

})();
