// brands/campaign/src/ui/applicantElements-2.0.js
(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  const MAPPINGS = window.WEBFLOW_API.MAPPINGS;
  const { normalizeUrl } = (window.WEBFLOW_API.utils || {}); // Sicherstellen, dass utils existiert

  /**
   * Aktualisiert das Favoriten-Icon für einen bestimmten Bewerber in der Liste.
   * @param {string} jobId - Die ID des Jobs.
   * @param {string} applicantId - Die Webflow Member ID des Bewerbers.
   * @param {boolean} isFavorite - Der neue Favoritenstatus.
   */
  function updateApplicantFavoriteIcon(jobId, applicantId, isFavorite) {
    const applicantRow = document.querySelector(`.my-job-item[data-job-id="${jobId}"] .db-table-applicant[data-applicant-id="${applicantId}"]`);

    if (applicantRow) {
      const profileInfoDiv = applicantRow.querySelector(".db-table-row-item.justify-left");
      if (!profileInfoDiv) return;

      const existingFavoriteTag = profileInfoDiv.querySelector(".db-plus-tag.favorite-star-tag");
      if (existingFavoriteTag) {
        existingFavoriteTag.remove();
      }

      if (isFavorite) {
        const favoriteTagDiv = document.createElement("div");
        favoriteTagDiv.classList.add("db-plus-tag", "favorite-star-tag");

        const favoriteStarIcon = document.createElement("img");
        favoriteStarIcon.src = "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/662246de06d5827a9de8850f_star-Filled.svg";
        favoriteStarIcon.classList.add("db-icon-18");
        favoriteStarIcon.alt = "Favorit";
        favoriteStarIcon.style.marginLeft = "4px";

        favoriteTagDiv.appendChild(favoriteStarIcon);
        
        const nameWrapper = profileInfoDiv.querySelector(".is-flexbox-vertical");
        if (nameWrapper && nameWrapper.nextSibling) {
            profileInfoDiv.insertBefore(favoriteTagDiv, nameWrapper.nextSibling);
        } else if (nameWrapper) {
            profileInfoDiv.appendChild(favoriteTagDiv);
        } else { 
            profileInfoDiv.appendChild(favoriteTagDiv);
        }
      }
    }
  }


  function createApplicantRowElement(applicantItemWithScoreInfo, jobFieldDataForTooltip, allJobApplicantsForThisJob, currentIndexInList, jobId) {
    const applicantFieldData = applicantItemWithScoreInfo.fieldData;
    const applicantId = applicantFieldData["webflow-member-id"]; 

    const applicantDiv = document.createElement("div");
    applicantDiv.classList.add("db-table-row", "db-table-applicant", "job-entry");
    applicantDiv.style.cursor = 'pointer';
    applicantDiv.dataset.applicantId = applicantId;

    applicantDiv.addEventListener('click', (event) => {
      if (event.target.closest('a') || event.target.closest('button') || event.target.closest('input')) {
        return;
      }
      if (window.WEBFLOW_API.ui && window.WEBFLOW_API.ui.showCreatorSidebar) {
        // Wichtig: showCreatorSidebar ist jetzt async
        window.WEBFLOW_API.ui.showCreatorSidebar(applicantItemWithScoreInfo, allJobApplicantsForThisJob, currentIndexInList, jobId)
          .catch(err => console.error("Fehler beim Öffnen der Creator Sidebar:", err));
      } else {
        console.error("showCreatorSidebar function not found on window.WEBFLOW_API.ui");
      }
    });

    if (typeof MAPPINGS === 'undefined') {
      console.error("❌ MAPPINGS-Objekt ist nicht definiert in createApplicantRowElement.");
      const errorDiv = document.createElement("div");
      errorDiv.textContent = "Fehler: Mapping-Daten nicht verfügbar.";
      errorDiv.style.gridColumn = "span 7";
      applicantDiv.appendChild(errorDiv);
      return applicantDiv;
    }

    const profileInfoDiv = document.createElement("div");
    profileInfoDiv.classList.add("db-table-row-item", "justify-left");
    profileInfoDiv.style.display = "flex";
    profileInfoDiv.style.alignItems = "center";

    const imgWrapper = document.createElement("div");
    imgWrapper.classList.add("db-table-img-wrapper");

    const profileImageField = applicantFieldData["image-thumbnail-small-92px"] || applicantFieldData["user-profile-img"];
    if (profileImageField) {
      const applicantImg = document.createElement("img");
      applicantImg.classList.add("db-table-img");
      applicantImg.src = typeof profileImageField === 'string' ? profileImageField : (profileImageField?.url || 'https://placehold.co/92x92/E0E0E0/BDBDBD?text=Bild');
      applicantImg.alt = applicantFieldData.name || "Bewerberbild";
      applicantImg.onerror = () => { applicantImg.src = 'https://placehold.co/92x92/E0E0E0/BDBDBD?text=Fehler'; };
      imgWrapper.appendChild(applicantImg);
    }

    if (applicantFieldData["plus-mitglied"]) {
      const plusTagDivOnImage = document.createElement("div");
      plusTagDivOnImage.classList.add("db-plus-tag");
      const plusIcon = document.createElement("img");
      plusIcon.src = "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/678a291ddc6029abd5904169_bolt-filled.svg";
      plusIcon.classList.add("db-icon-18");
      plusIcon.alt = "Plus Mitglied Icon";
      plusTagDivOnImage.appendChild(plusIcon);
      imgWrapper.appendChild(plusTagDivOnImage);
    }
    profileInfoDiv.appendChild(imgWrapper);

    const namePlusStatusDiv = document.createElement("div");
    namePlusStatusDiv.classList.add("is-flexbox-vertical");
    const nameSpan = document.createElement("span");
    nameSpan.textContent = applicantFieldData.name || "Unbekannter Bewerber";
    nameSpan.classList.add("truncate");
    namePlusStatusDiv.appendChild(nameSpan);
    profileInfoDiv.appendChild(namePlusStatusDiv);

    // --- Debug-Logging für Favoritenstatus ---
    const favService = window.WEBFLOW_API.core?.favoriteService;
    let serviceAvailable = false;
    let serviceSaysFavorite = false;

    if (favService && typeof favService.isFavorite === 'function') {
        serviceAvailable = true;
        // Wichtig: Stelle sicher, dass der Cache für diesen Job bereits die jobDetails enthält,
        // bevor isFavorite hier zuverlässig funktioniert.
        // favoriteService.isFavorite prüft intern den Cache: this.cache.jobDataCache[jobId].jobDetails
        serviceSaysFavorite = favService.isFavorite(jobId, applicantId);
    }

    const tooltipHasFavorite = jobFieldDataForTooltip && Array.isArray(jobFieldDataForTooltip["job-favoriten"]) && applicantId && jobFieldDataForTooltip["job-favoriten"].includes(applicantId);

    // console.log(`DEBUG createApplicantRowElement - Applicant: ${applicantFieldData.name} (ID: ${applicantId}), Job: ${jobId}`);
    // console.log(`  DEBUG FavoriteService available: ${serviceAvailable}`);
    // console.log(`  DEBUG FavoriteService says isFavorite: ${serviceSaysFavorite}`);
    // console.log(`  DEBUG jobFieldDataForTooltip['job-favoriten'] raw:`, jobFieldDataForTooltip ? jobFieldDataForTooltip["job-favoriten"] : 'jobFieldDataForTooltip is undefined');
    // console.log(`  DEBUG Tooltip check says isFavorite: ${tooltipHasFavorite}`);

    const isInitiallyFavorite = serviceAvailable ? serviceSaysFavorite : tooltipHasFavorite;
    // console.log(`  DEBUG Final isInitiallyFavorite for ${applicantFieldData.name}: ${isInitiallyFavorite}`);
    // --- Ende Debug-Logging ---

    if (isInitiallyFavorite) {
      const favoriteTagDiv = document.createElement("div");
      favoriteTagDiv.classList.add("db-plus-tag", "favorite-star-tag");
      const favoriteStarIcon = document.createElement("img");
      favoriteStarIcon.src = "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/662246de06d5827a9de8850f_star-Filled.svg";
      favoriteStarIcon.classList.add("db-icon-18");
      favoriteStarIcon.alt = "Favorit";
      favoriteStarIcon.style.marginLeft = "4px";
      favoriteTagDiv.appendChild(favoriteStarIcon);
      if (namePlusStatusDiv.nextSibling) {
          profileInfoDiv.insertBefore(favoriteTagDiv, namePlusStatusDiv.nextSibling);
      } else {
          profileInfoDiv.appendChild(favoriteTagDiv);
      }
    }
    applicantDiv.appendChild(profileInfoDiv);

    const locationDiv = document.createElement("div");
    locationDiv.classList.add("db-table-row-item");
    const city = applicantFieldData["user-city-2"] || "K.A.";
    const bundeslandId = applicantFieldData["bundesland-option"];
    const bundeslandName = (MAPPINGS.bundeslaender && MAPPINGS.bundeslaender[bundeslandId]) || (bundeslandId ? bundeslandId.substring(0,10)+'...' : "K.A.");
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
    creatorTypeTag.textContent = (MAPPINGS.creatorTypen && MAPPINGS.creatorTypen[creatorTypeId]) || (creatorTypeId ? creatorTypeId.substring(0,10)+'...' : "K.A.");
    creatorTypeCell.appendChild(creatorTypeTag);
    applicantDiv.appendChild(creatorTypeCell);

    const socialCell = document.createElement("div");
    socialCell.classList.add("db-table-row-item");
    socialCell.style.display = "flex";
    socialCell.style.alignItems = "center";
    const socialPlatforms = [
      { key: "instagram", name: "Instagram", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e8d979b71d2a7e5db3_Instagram.svg" },
      { key: "tiktok", name: "TikTok", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e99dce86c2b6ba83fe_Tiktok.svg" },
      { key: "youtube", name: "YouTube", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e9b00d0480ffe289dc_YouTube.svg" }
    ];
    const normalizeUrlFn = typeof normalizeUrl === 'function' ? normalizeUrl : (url) => url;
    socialPlatforms.forEach(platform => {
      const platformUrlValue = applicantFieldData[platform.key];
      const normalizedPlatformUrl = normalizeUrlFn(platformUrlValue);
      if (normalizedPlatformUrl) {
        const socialLink = document.createElement("a");
        socialLink.href = normalizedPlatformUrl;
        socialLink.classList.add("db-application-option", "no-icon", "w-inline-block");
        socialLink.style.marginRight = "4px";
        socialLink.target = "_blank";
        socialLink.rel = "noopener noreferrer";
        socialLink.addEventListener('click', (e) => e.stopPropagation());
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
    followerTag.textContent = (MAPPINGS.followerRanges && MAPPINGS.followerRanges[followerId]) || (followerId ? followerId.substring(0,10)+'...' : "K.A.");
    followerCell.appendChild(followerTag);
    applicantDiv.appendChild(followerCell);

    const ageCell = document.createElement("div");
    ageCell.classList.add("db-table-row-item");
    const ageTag = document.createElement("span");
    ageTag.classList.add("job-tag", "customer");
    const ageId = applicantFieldData["creator-age"];
    ageTag.textContent = (MAPPINGS.altersgruppen && MAPPINGS.altersgruppen[ageId]) || (ageId ? ageId.substring(0,10)+'...' : "K.A.");
    ageCell.appendChild(ageTag);
    applicantDiv.appendChild(ageCell);

    return applicantDiv;
  }

  function createApplicantTableHeaderElement() {
    const headerDiv = document.createElement("div");
    headerDiv.classList.add("db-table-header", "db-table-applicant");
    const columns = ["Creator", "Location", "Kategorie", "Creator Type", "Social Media", "Follower", "Alter"];
    columns.forEach((colText, index) => {
      const colDiv = document.createElement("div");
      colDiv.classList.add("db-table-row-item");
      if (index === 0) {
          colDiv.style.flex = "1.8";
      }
      const textSpan = document.createElement("span");
      textSpan.classList.add("is-txt-16", "is-txt-bold");
      textSpan.textContent = colText;
      colDiv.appendChild(textSpan);
      headerDiv.appendChild(colDiv);
    });
    return headerDiv;
  }

  function createActiveFilterBadgeUI(jobId, filterType, filterValue, filterText, applicantsListContainer, paginationWrapper) {
    const badgeWrapper = document.createElement("div");
    badgeWrapper.classList.add("db-table-filter-wrapper", "active-filter-badge");
    const filterNameSpan = document.createElement("span");
    filterNameSpan.classList.add("is-txt-16");
    filterNameSpan.textContent = filterText;
    badgeWrapper.appendChild(filterNameSpan);
    const removeIcon = document.createElement("img");
    removeIcon.src = "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/68304c51fb2c1a32a1f2ef77_xmark.svg";
    removeIcon.classList.add("db-icon-18", "remove-filter-icon");
    removeIcon.alt = "Filter entfernen";
    removeIcon.style.cursor = "pointer";
    removeIcon.style.marginLeft = "5px";
    removeIcon.addEventListener('click', async () => {
        let checkboxId;
        if (filterType === 'relevantOnly' || filterType === 'plusOnly') {
            checkboxId = `filter-${jobId}-${filterType}`;
        } else {
            checkboxId = `filter-${jobId}-${filterType}-${filterValue.replace(/\s+/g, '-')}`;
        }
        const checkbox = document.getElementById(checkboxId);
        if (checkbox && checkbox.checked) {
            checkbox.checked = false;
            const changeEvent = new Event('change', { bubbles: true });
            checkbox.dispatchEvent(changeEvent);
        } else {
            console.warn(`Checkbox für Filter ${filterType}: ${filterValue || ''} nicht gefunden oder nicht aktiv.`);
            const jobCache = window.WEBFLOW_API.cache.jobDataCache[jobId];
            if (jobCache && jobCache.activeFilters) {
                if (filterType === 'relevantOnly' || filterType === 'plusOnly') {
                    delete jobCache.activeFilters[filterType];
                } else if (jobCache.activeFilters[filterType]) {
                    const index = jobCache.activeFilters[filterType].indexOf(filterValue);
                    if (index > -1) {
                        jobCache.activeFilters[filterType].splice(index, 1);
                        if(jobCache.activeFilters[filterType].length === 0) {
                            delete jobCache.activeFilters[filterType];
                        }
                    }
                }
                if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.applyAndReloadApplicants) {
                    await window.WEBFLOW_API.core.applyAndReloadApplicants(jobId, applicantsListContainer, paginationWrapper);
                }
            }
        }
    });
    badgeWrapper.appendChild(removeIcon);
    return badgeWrapper;
  }

  function renderActiveFilterBadgesUI(jobId, badgesContainer, applicantsListContainer, paginationWrapper) {
    badgesContainer.innerHTML = '';
    const jobCache = window.WEBFLOW_API.cache.jobDataCache[jobId];
    if (!jobCache || !jobCache.activeFilters) return;
    const activeFilters = jobCache.activeFilters;
    activeFilters.follower?.forEach(value => {
        const text = MAPPINGS.followerRanges?.[value] || value;
        const badge = createActiveFilterBadgeUI(jobId, 'follower', value, text, applicantsListContainer, paginationWrapper);
        badgesContainer.appendChild(badge);
    });
    activeFilters.category?.forEach(value => {
        const badge = createActiveFilterBadgeUI(jobId, 'category', value, value, applicantsListContainer, paginationWrapper);
        badgesContainer.appendChild(badge);
    });
    activeFilters.creatorType?.forEach(value => {
        const text = MAPPINGS.creatorTypen?.[value] || value;
        const badge = createActiveFilterBadgeUI(jobId, 'creatorType', value, text, applicantsListContainer, paginationWrapper);
        badgesContainer.appendChild(badge);
    });
    if (activeFilters.relevantOnly) {
        const badge = createActiveFilterBadgeUI(jobId, 'relevantOnly', true, "Nur Relevante", applicantsListContainer, paginationWrapper);
        badgesContainer.appendChild(badge);
    }
    if (activeFilters.plusOnly) {
        const badge = createActiveFilterBadgeUI(jobId, 'plusOnly', true, "Nur Plus Mitglieder", applicantsListContainer, paginationWrapper);
        badgesContainer.appendChild(badge);
    }
  }
  window.WEBFLOW_API.ui.renderActiveFilterBadgesUI = renderActiveFilterBadgesUI;

  function createFilterDropdown(jobId, filterType, filterLabel, optionsSource, applicantsListContainer, paginationWrapper, isDynamicOptions = false) {
    const filterParentDiv = document.createElement("div");
    filterParentDiv.classList.add("db-table-filter");
    const filterTriggerWrapper = document.createElement("div");
    filterTriggerWrapper.classList.add("db-table-filter-wrapper");
    const filterTextSpan = document.createElement("span");
    filterTextSpan.classList.add("is-txt-16");
    filterTextSpan.textContent = filterLabel;
    filterTriggerWrapper.appendChild(filterTextSpan);
    const filterIcon = document.createElement("img");
    filterIcon.src = "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/682c5e5b84cac09c56cdbebe_angle-down-small.svg";
    filterIcon.classList.add("db-icon-18");
    filterTriggerWrapper.appendChild(filterIcon);
    filterParentDiv.appendChild(filterTriggerWrapper);
    const dropdownList = document.createElement("div");
    dropdownList.classList.add("db-filter-dropdown-list");
    dropdownList.style.display = "none";
    let options = {};
    if (isDynamicOptions) {
        const jobCache = window.WEBFLOW_API.cache.jobDataCache[jobId];
        if (jobCache && jobCache.allItems) {
            const uniqueValues = new Set();
            jobCache.allItems.forEach(item => {
                if (item.fieldData && item.fieldData[optionsSource] && !item.error) {
                    uniqueValues.add(item.fieldData[optionsSource]);
                }
            });
            uniqueValues.forEach(value => {
                options[value] = value;
            });
        }
    } else {
        options = optionsSource;
    }
    Object.entries(options).forEach(([id, text]) => {
        if (filterType === "follower" && text === "0") return;
        const optionDiv = document.createElement("div");
        optionDiv.classList.add("db-filter-option");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("db-filter-checkbox");
        checkbox.id = `filter-${jobId}-${filterType}-${id.replace(/\s+/g, '-')}`;
        checkbox.dataset.filterValue = id;
        checkbox.dataset.filterType = filterType;
        const jobCache = window.WEBFLOW_API.cache.jobDataCache[jobId];
        if (jobCache?.activeFilters?.[filterType]?.includes(id)) {
            checkbox.checked = true;
        }
        const optionTextSpan = document.createElement("span");
        optionTextSpan.classList.add("is-txt-16");
        optionTextSpan.textContent = text;
        optionDiv.addEventListener('click', (e) => {
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                const changeEvent = new Event('change', { bubbles: true });
                checkbox.dispatchEvent(changeEvent);
            }
        });
        checkbox.addEventListener("change", async () => {
            if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.applyAndReloadApplicants) {
                await window.WEBFLOW_API.core.applyAndReloadApplicants(jobId, applicantsListContainer, paginationWrapper);
            } else {
                console.error("applyAndReloadApplicants Funktion nicht gefunden.");
            }
        });
        optionDiv.appendChild(checkbox);
        optionDiv.appendChild(optionTextSpan);
        dropdownList.appendChild(optionDiv);
    });
    filterParentDiv.appendChild(dropdownList);
    filterTriggerWrapper.addEventListener("click", (e) => {
      e.stopPropagation();
      const parentFilterElement = e.currentTarget.closest('.db-table-filter');
      const currentDropdownList = parentFilterElement ? parentFilterElement.querySelector('.db-filter-dropdown-list') : null;
      if (!currentDropdownList) return;
      const allFilterDropdownTriggers = filterParentDiv.parentElement.querySelectorAll('.db-table-filter .db-filter-dropdown-list');
      allFilterDropdownTriggers.forEach(otherDropdown => {
          if (otherDropdown !== currentDropdownList) {
              otherDropdown.style.display = 'none';
          }
      });
      currentDropdownList.style.display = currentDropdownList.style.display === "none" ? "block" : "none";
    });
    return filterParentDiv;
  }

  function createToggleSwitch(jobId, filterType, labelText, applicantsListContainer, paginationWrapper) {
    const toggleWrapper = document.createElement('div');
    toggleWrapper.classList.add('db-filter-toggle-wrapper');
    const labelElement = document.createElement('label');
    labelElement.classList.add('toggle-show-list');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('checkbox-toggle');
    checkbox.id = `filter-${jobId}-${filterType}`;
    checkbox.dataset.filterType = filterType;
    const sliderSpan = document.createElement('span');
    sliderSpan.classList.add('toggle-slider-show-list');
    labelElement.appendChild(checkbox);
    labelElement.appendChild(sliderSpan);
    toggleWrapper.appendChild(labelElement);
    const textElement = document.createElement('span');
    textElement.classList.add('is-txt-16');
    textElement.textContent = labelText;
    textElement.style.marginLeft = '8px';
    toggleWrapper.appendChild(textElement);
    const jobCache = window.WEBFLOW_API.cache.jobDataCache[jobId];
    if (jobCache?.activeFilters?.[filterType] === true) {
        checkbox.checked = true;
    }
    checkbox.addEventListener('change', async () => {
        if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.applyAndReloadApplicants) {
            await window.WEBFLOW_API.core.applyAndReloadApplicants(jobId, applicantsListContainer, paginationWrapper);
        } else {
            console.error("applyAndReloadApplicants Funktion nicht gefunden.");
        }
    });
    return toggleWrapper;
  }

  function createFilterRowElement(jobId, applicantsListContainer, paginationWrapper) {
    const filterRowElement = document.createElement("div");
    filterRowElement.classList.add("db-table-filter-row");
    const controlsWrapper = document.createElement("div");
    controlsWrapper.classList.add("db-table-filter-row-wrapper");
    filterRowElement.appendChild(controlsWrapper);
    const activeFiltersDisplayContainer = document.createElement("div");
    activeFiltersDisplayContainer.classList.add("db-active-filters-display");
    filterRowElement.appendChild(activeFiltersDisplayContainer);
    if (MAPPINGS && MAPPINGS.followerRanges) {
        const followerFilterElement = createFilterDropdown(jobId, "follower", "Follower", MAPPINGS.followerRanges, applicantsListContainer, paginationWrapper);
        controlsWrapper.appendChild(followerFilterElement);
    }
    const categoryFilterElement = createFilterDropdown(jobId, "category", "Kategorie", "creator-main-categorie", applicantsListContainer, paginationWrapper, true);
    controlsWrapper.appendChild(categoryFilterElement);
    if (MAPPINGS && MAPPINGS.creatorTypen) {
        const creatorTypeFilterElement = createFilterDropdown(jobId, "creatorType", "Creator Typ", MAPPINGS.creatorTypen, applicantsListContainer, paginationWrapper);
        controlsWrapper.appendChild(creatorTypeFilterElement);
    }
    const relevantToggle = createToggleSwitch(jobId, "relevantOnly", "Nur relevante Bewerber", applicantsListContainer, paginationWrapper);
    controlsWrapper.appendChild(relevantToggle);
    const plusOnlyToggle = createToggleSwitch(jobId, "plusOnly", "Nur Plus Mitglieder", applicantsListContainer, paginationWrapper);
    controlsWrapper.appendChild(plusOnlyToggle);
    document.addEventListener("click", (e) => {
        if (!e.target.closest('.db-table-filter') && !e.target.closest('.db-filter-toggle-wrapper')) {
            const allDropdownLists = controlsWrapper.querySelectorAll('.db-filter-dropdown-list');
            allDropdownLists.forEach(dd => {
                dd.style.display = 'none';
            });
        }
    });
    return filterRowElement;
  }

  document.addEventListener('favoritesUpdated', function(event) {
    const { jobId, applicantId, isFavorite } = event.detail;
    updateApplicantFavoriteIcon(jobId, applicantId, isFavorite);
  });

  window.WEBFLOW_API.ui.createApplicantRowElement = createApplicantRowElement;
  window.WEBFLOW_API.ui.createApplicantTableHeaderElement = createApplicantTableHeaderElement;
  window.WEBFLOW_API.ui.createFilterRowElement = createFilterRowElement;
  window.WEBFLOW_API.ui.updateApplicantFavoriteIcon = updateApplicantFavoriteIcon;

  console.log("Applicant Elements UI (applicantElements-2.0.js) wurde aktualisiert für Favoriten-Icon Updates.");
})();
