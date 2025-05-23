(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  const MAPPINGS = window.WEBFLOW_API.MAPPINGS;
  const { normalizeUrl } = window.WEBFLOW_API.utils;
  
  function createApplicantRowElement(applicantItemWithScoreInfo, jobFieldDataForTooltip, allJobApplicantsForThisJob, currentIndexInList, jobId) {
    const applicantFieldData = applicantItemWithScoreInfo.fieldData;
    const applicantDiv = document.createElement("div");
    applicantDiv.classList.add("db-table-row", "db-table-applicant", "job-entry");
    applicantDiv.style.cursor = 'pointer'; 

    applicantDiv.addEventListener('click', (event) => {
      if (event.target.closest('a') || event.target.closest('button') || event.target.closest('input')) {
        return; 
      }
      if (window.WEBFLOW_API.ui && window.WEBFLOW_API.ui.showCreatorSidebar) {
        window.WEBFLOW_API.ui.showCreatorSidebar(applicantItemWithScoreInfo, allJobApplicantsForThisJob, currentIndexInList, jobId);
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
    const profileImageField = applicantFieldData["image-thumbnail-small-92px"] || applicantFieldData["user-profile-img"];
    if (profileImageField) {
      const applicantImg = document.createElement("img");
      applicantImg.classList.add("db-table-img", "is-margin-right-12");
      applicantImg.src = typeof profileImageField === 'string' ? profileImageField : (profileImageField?.url || 'https://placehold.co/92x92/E0E0E0/BDBDBD?text=Bild');
      applicantImg.alt = applicantFieldData.name || "Bewerberbild";
      applicantImg.onerror = () => { applicantImg.src = 'https://placehold.co/92x92/E0E0E0/BDBDBD?text=Fehler'; };
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
    const socialPlatforms = [
      { key: "instagram", name: "Instagram", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e8d979b71d2a7e5db3_Instagram.svg" },
      { key: "tiktok", name: "TikTok", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e99dce86c2b6ba83fe_Tiktok.svg" },
      { key: "youtube", name: "YouTube", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e9b00d0480ffe289dc_YouTube.svg" }
    ];
    socialPlatforms.forEach(platform => {
      const platformUrlValue = applicantFieldData[platform.key];
      const normalizedPlatformUrl = normalizeUrl(platformUrlValue); 
      if (normalizedPlatformUrl) {
        const socialLink = document.createElement("a");
        socialLink.href = normalizedPlatformUrl;
        socialLink.classList.add("db-application-option", "no-icon", "w-inline-block"); 
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
         colDiv.style.flexGrow = "1.5"; 
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
    // Jedes Badge bekommt die Klasse "db-table-filter-wrapper" und "active-filter-badge"
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
        const checkboxId = `filter-${jobId}-${filterType}-${filterValue.replace(/\s+/g, '-')}`;
        const checkbox = document.getElementById(checkboxId);
        if (checkbox && checkbox.checked) {
            checkbox.checked = false;
            const changeEvent = new Event('change', { bubbles: true });
            checkbox.dispatchEvent(changeEvent);
        } else {
            console.warn(`Checkbox für Filter ${filterType}: ${filterValue} nicht gefunden oder nicht aktiv.`);
            const jobCache = window.WEBFLOW_API.cache.jobDataCache[jobId];
            if (jobCache && jobCache.activeFilters && jobCache.activeFilters[filterType]) {
                const index = jobCache.activeFilters[filterType].indexOf(filterValue);
                if (index > -1) {
                    jobCache.activeFilters[filterType].splice(index, 1);
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
        // Für den "Nur Relevante" Toggle wird ein Badge mit der Klasse "db-table-filter-wrapper" erstellt
        const relevantBadgeWrapper = document.createElement("div");
        relevantBadgeWrapper.classList.add("db-table-filter-wrapper", "active-filter-badge");
        const relevantTextSpan = document.createElement("span");
        relevantTextSpan.classList.add("is-txt-16");
        relevantTextSpan.textContent = "Nur Relevante";
        relevantBadgeWrapper.appendChild(relevantTextSpan);
        
        // X-Icon zum Entfernen des "Nur Relevante" Filters
        const removeRelevantIcon = document.createElement("img");
        removeRelevantIcon.src = "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/68304c51fb2c1a32a1f2ef77_xmark.svg";
        removeRelevantIcon.classList.add("db-icon-18", "remove-filter-icon");
        removeRelevantIcon.alt = "Filter 'Nur Relevante' entfernen";
        removeRelevantIcon.style.cursor = "pointer";
        removeRelevantIcon.style.marginLeft = "5px";

        removeRelevantIcon.addEventListener('click', async () => {
            const relevantToggleCheckbox = document.getElementById(`filter-${jobId}-relevantOnly`);
            if (relevantToggleCheckbox && relevantToggleCheckbox.checked) {
                relevantToggleCheckbox.checked = false;
                const changeEvent = new Event('change', { bubbles: true });
                relevantToggleCheckbox.dispatchEvent(changeEvent);
            }
        });
        relevantBadgeWrapper.appendChild(removeRelevantIcon);
        badgesContainer.appendChild(relevantBadgeWrapper);
    }
  }
  window.WEBFLOW_API.ui.renderActiveFilterBadgesUI = renderActiveFilterBadgesUI;


  function createFilterDropdown(jobId, filterType, filterLabel, optionsSource, applicantsListContainer, paginationWrapper, isDynamicOptions = false) {
    const filterParentDiv = document.createElement("div"); 
    filterParentDiv.classList.add("db-table-filter"); // Dies ist das Parent-Element für jeden einzelnen Filter-Dropdown

    const filterTriggerWrapper = document.createElement("div"); 
    filterTriggerWrapper.classList.add("db-table-filter-wrapper"); // Wrapper für Text und Icon des Triggers

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

      // Schließe alle anderen Dropdowns, die Geschwister des aktuellen .db-table-filter sind
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

  /**
   * Erstellt das DOM-Element für die gesamte Filterzeile.
   */
  function createFilterRowElement(jobId, applicantsListContainer, paginationWrapper) {
    const filterRowElement = document.createElement("div"); // Das äußerste Element der gesamten Filterzeile
    filterRowElement.classList.add("db-table-filter-row"); 

    // Wrapper für die Filter-Dropdowns und den Toggle-Switch
    const controlsWrapper = document.createElement("div"); 
    controlsWrapper.classList.add("db-table-filter-row-wrapper"); // Dein gewünschter Parent für die Filter-Controls
    filterRowElement.appendChild(controlsWrapper);

    // Container für aktive Filter-Badges (als Geschwister zum controlsWrapper)
    const activeFiltersDisplayContainer = document.createElement("div");
    activeFiltersDisplayContainer.classList.add("db-active-filters-display"); 
    filterRowElement.appendChild(activeFiltersDisplayContainer); 


    // Erstelle und füge die Filter-Dropdowns zum controlsWrapper hinzu
    if (MAPPINGS && MAPPINGS.followerRanges) {
        const followerFilterElement = createFilterDropdown(jobId, "follower", "Follower", MAPPINGS.followerRanges, applicantsListContainer, paginationWrapper);
        controlsWrapper.appendChild(followerFilterElement); // Zum controlsWrapper hinzufügen
    }

    const categoryFilterElement = createFilterDropdown(jobId, "category", "Kategorie", "creator-main-categorie", applicantsListContainer, paginationWrapper, true);
    controlsWrapper.appendChild(categoryFilterElement); // Zum controlsWrapper hinzufügen
    
    if (MAPPINGS && MAPPINGS.creatorTypen) {
        const creatorTypeFilterElement = createFilterDropdown(jobId, "creatorType", "Creator Typ", MAPPINGS.creatorTypen, applicantsListContainer, paginationWrapper);
        controlsWrapper.appendChild(creatorTypeFilterElement); // Zum controlsWrapper hinzufügen
    }

    // Erstelle und füge den "Nur relevante Bewerber"-Toggle zum controlsWrapper hinzu
    const relevantToggleWrapper = document.createElement('div');
    relevantToggleWrapper.classList.add('db-filter-toggle-wrapper'); 

    const relevantToggleCheckbox = document.createElement('input');
    relevantToggleCheckbox.type = 'checkbox';
    relevantToggleCheckbox.id = `filter-${jobId}-relevantOnly`;
    relevantToggleCheckbox.dataset.filterType = 'relevantOnly'; 
    relevantToggleCheckbox.classList.add('db-filter-checkbox'); 

    const relevantToggleLabel = document.createElement('label');
    relevantToggleLabel.htmlFor = relevantToggleCheckbox.id; 
    relevantToggleLabel.classList.add('is-txt-16');
    relevantToggleLabel.textContent = 'Nur relevante Bewerber'; 

    const jobCache = window.WEBFLOW_API.cache.jobDataCache[jobId];
    if (jobCache?.activeFilters?.relevantOnly === true) {
        relevantToggleCheckbox.checked = true;
    }
    
    relevantToggleCheckbox.addEventListener('change', async () => {
        if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.applyAndReloadApplicants) {
            await window.WEBFLOW_API.core.applyAndReloadApplicants(jobId, applicantsListContainer, paginationWrapper);
        } else {
            console.error("applyAndReloadApplicants Funktion nicht gefunden.");
        }
    });

    relevantToggleWrapper.appendChild(relevantToggleCheckbox);
    relevantToggleWrapper.appendChild(relevantToggleLabel); 
    controlsWrapper.appendChild(relevantToggleWrapper); // Toggle zum controlsWrapper hinzufügen


    // Schließen der Dropdowns, wenn außerhalb geklickt wird
    document.addEventListener("click", (e) => {
        // Prüft, ob der Klick außerhalb *jedes* .db-table-filter Elements (Dropdown-Trigger + Liste) war
        // UND auch außerhalb des Toggle-Wrappers
        if (!e.target.closest('.db-table-filter') && !e.target.closest('.db-filter-toggle-wrapper')) {
            const allDropdownLists = controlsWrapper.querySelectorAll('.db-filter-dropdown-list');
            allDropdownLists.forEach(dd => {
                dd.style.display = 'none';
            });
        }
    });
    return filterRowElement;
  }


  window.WEBFLOW_API.ui.createApplicantRowElement = createApplicantRowElement;
  window.WEBFLOW_API.ui.createApplicantTableHeaderElement = createApplicantTableHeaderElement;
  window.WEBFLOW_API.ui.createFilterRowElement = createFilterRowElement;

})();
