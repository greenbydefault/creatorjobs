(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  // Abhängigkeiten
  const MAPPINGS = window.WEBFLOW_API.MAPPINGS;
  const { normalizeUrl } = window.WEBFLOW_API.utils;
  
  /**
   * Erstellt ein DOM-Element für eine Bewerberzeile.
   * @param {object} applicantItemWithScoreInfo - Das Bewerberobjekt mit Match-Score-Informationen.
   * @param {object} jobFieldDataForTooltip - Felddaten des Jobs (optional, für Tooltip-Details).
   * @param {Array} allJobApplicantsForThisJob - Die Liste aller Bewerber für diesen spezifischen Job (für Sidebar-Navigation).
   * @param {number} currentIndexInList - Der Index dieses Bewerbers in allJobApplicantsForThisJob.
   * @param {string} jobId - Die ID des aktuellen Jobs.
   * @returns {HTMLElement} Das DOM-Element der Bewerberzeile.
   */
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

    // Profile Info (Bild, Name, Status)
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

    // Location
    const locationDiv = document.createElement("div");
    locationDiv.classList.add("db-table-row-item");
    const city = applicantFieldData["user-city-2"] || "K.A.";
    const bundeslandId = applicantFieldData["bundesland-option"];
    const bundeslandName = (MAPPINGS.bundeslaender && MAPPINGS.bundeslaender[bundeslandId]) || (bundeslandId ? bundeslandId.substring(0,10)+'...' : "K.A.");
    locationDiv.textContent = `${city}${bundeslandName !== "K.A." ? `, ${bundeslandName}` : ""}`;
    applicantDiv.appendChild(locationDiv);

    // Category
    const categoryCell = document.createElement("div");
    categoryCell.classList.add("db-table-row-item");
    const categoryTag = document.createElement("span");
    categoryTag.classList.add("job-tag", "customer"); 
    categoryTag.textContent = applicantFieldData["creator-main-categorie"] || "K.A.";
    categoryCell.appendChild(categoryTag);
    applicantDiv.appendChild(categoryCell);

    // Creator Type
    const creatorTypeCell = document.createElement("div");
    creatorTypeCell.classList.add("db-table-row-item");
    const creatorTypeTag = document.createElement("span");
    creatorTypeTag.classList.add("job-tag", "customer"); 
    const creatorTypeId = applicantFieldData["creator-type"];
    creatorTypeTag.textContent = (MAPPINGS.creatorTypen && MAPPINGS.creatorTypen[creatorTypeId]) || (creatorTypeId ? creatorTypeId.substring(0,10)+'...' : "K.A.");
    creatorTypeCell.appendChild(creatorTypeTag);
    applicantDiv.appendChild(creatorTypeCell);

    // Social Media Icons
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

    // Follower
    const followerCell = document.createElement("div");
    followerCell.classList.add("db-table-row-item");
    const followerTag = document.createElement("span");
    followerTag.classList.add("job-tag", "customer"); 
    const followerId = applicantFieldData["creator-follower"];
    followerTag.textContent = (MAPPINGS.followerRanges && MAPPINGS.followerRanges[followerId]) || (followerId ? followerId.substring(0,10)+'...' : "K.A.");
    followerCell.appendChild(followerTag);
    applicantDiv.appendChild(followerCell);

    // Age
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

  /**
   * Erstellt das DOM-Element für den Header der Bewerbertabelle.
   * @returns {HTMLElement} Das Header-DOM-Element.
   */
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

  /**
   * Erstellt ein einzelnes Filter-Dropdown-Element gemäß der neuen Struktur.
   * @param {string} jobId - Die ID des aktuellen Jobs.
   * @param {string} filterType - Der Typ des Filters (z.B. "follower", "category", "creatorType").
   * @param {string} filterLabel - Das Label für den Filter-Trigger (z.B. "Follower").
   * @param {object} optionsSource - Das Objekt oder Array, das die Filteroptionen enthält.
   * @param {HTMLElement} applicantsListContainer - Der Container der Bewerberliste.
   * @param {HTMLElement} paginationWrapper - Der Wrapper für die Paginierung.
   * @param {boolean} isDynamicOptions - True, wenn Optionen dynamisch aus applicantData generiert werden sollen.
   * @returns {HTMLElement} Das Filter-Dropdown-DOM-Element (das Parent-Element 'db-table-filter').
   */
  function createFilterDropdown(jobId, filterType, filterLabel, optionsSource, applicantsListContainer, paginationWrapper, isDynamicOptions = false) {
    const filterParentDiv = document.createElement("div"); // NEU: Parent-Element für das gesamte Filter-Dropdown
    filterParentDiv.classList.add("db-table-filter");

    const filterTriggerWrapper = document.createElement("div"); // Wrapper für Text und Icon
    filterTriggerWrapper.classList.add("db-table-filter-wrapper");

    const filterTextSpan = document.createElement("span"); // Text als Span
    filterTextSpan.classList.add("is-txt-16");
    filterTextSpan.textContent = filterLabel;
    filterTriggerWrapper.appendChild(filterTextSpan);

    const filterIcon = document.createElement("img");
    filterIcon.src = "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/682c5e5b84cac09c56cdbebe_angle-down-small.svg"; 
    filterIcon.classList.add("db-icon-18"); // Ggf. anpassen
    filterTriggerWrapper.appendChild(filterIcon);
    
    filterParentDiv.appendChild(filterTriggerWrapper); // Trigger-Wrapper zum Parent hinzufügen

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

        const optionTextSpan = document.createElement("span"); // NEU: Text als Span
        optionTextSpan.classList.add("is-txt-16"); 
        optionTextSpan.textContent = text;
        
        // Klick auf das gesamte optionDiv soll die Checkbox togglen (verbessert UX)
        optionDiv.addEventListener('click', (e) => {
            // Verhindere, dass ein Klick auf die Checkbox selbst das Event doppelt auslöst
            if (e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                // Manuell das 'change'-Event auslösen, damit der Filter angewendet wird
                const changeEvent = new Event('change', { bubbles: true });
                checkbox.dispatchEvent(changeEvent);
            }
        });
        
        checkbox.addEventListener("change", async () => {
            // applyAndReloadApplicants wird aufgerufen, wenn sich der Zustand der Checkbox ändert
            if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.applyAndReloadApplicants) {
               await window.WEBFLOW_API.core.applyAndReloadApplicants(jobId, applicantsListContainer, paginationWrapper);
            } else {
                console.error("applyAndReloadApplicants Funktion nicht gefunden.");
            }
        });

        optionDiv.appendChild(checkbox);
        optionDiv.appendChild(optionTextSpan); // Span statt Label
        dropdownList.appendChild(optionDiv);
    });
    
    filterParentDiv.appendChild(dropdownList); // Dropdown-Liste zum Parent hinzufügen

    // Event Listener zum Öffnen/Schließen des spezifischen Dropdowns
    filterTriggerWrapper.addEventListener("click", (e) => {
      e.stopPropagation(); 
      const parentFilterElement = e.currentTarget.closest('.db-table-filter');
      const currentDropdownList = parentFilterElement ? parentFilterElement.querySelector('.db-filter-dropdown-list') : null;

      if (!currentDropdownList) return;

      // Schließe alle anderen Dropdowns in der Filterzeile
      const allFilterParents = filterParentDiv.parentElement.querySelectorAll('.db-table-filter');
      allFilterParents.forEach(otherFilterParent => {
          const otherDropdown = otherFilterParent.querySelector('.db-filter-dropdown-list');
          if (otherDropdown && otherDropdown !== currentDropdownList) {
              otherDropdown.style.display = 'none';
          }
      });
      // Toggle das aktuelle Dropdown
      currentDropdownList.style.display = currentDropdownList.style.display === "none" ? "block" : "none";
    });
    return filterParentDiv; // Das Parent-Element zurückgeben
  }


  /**
   * Erstellt das DOM-Element für die Filterzeile.
   * @param {string} jobId - Die ID des aktuellen Jobs.
   * @param {HTMLElement} applicantsListContainer - Der Container der Bewerberliste.
   * @param {HTMLElement} paginationWrapper - Der Wrapper für die Paginierung.
   * @returns {HTMLElement} Das Filterzeilen-DOM-Element.
   */
  function createFilterRowElement(jobId, applicantsListContainer, paginationWrapper) {
    const filterRow = document.createElement("div");
    filterRow.classList.add("db-table-filter-row");

    const filterWrapper = document.createElement("div"); // Dieser Wrapper enthält alle Filter-Elemente
    filterWrapper.classList.add("db-table-filter-row-wrapper"); 
    filterRow.appendChild(filterWrapper);

    // Follower Filter
    if (MAPPINGS && MAPPINGS.followerRanges) {
        const followerFilterElement = createFilterDropdown(jobId, "follower", "Follower", MAPPINGS.followerRanges, applicantsListContainer, paginationWrapper);
        filterWrapper.appendChild(followerFilterElement);
    }

    // Kategorie Filter
    const categoryFilterElement = createFilterDropdown(jobId, "category", "Kategorie", "creator-main-categorie", applicantsListContainer, paginationWrapper, true);
    filterWrapper.appendChild(categoryFilterElement);
    
    // Creator Type Filter
    if (MAPPINGS && MAPPINGS.creatorTypen) {
        const creatorTypeFilterElement = createFilterDropdown(jobId, "creatorType", "Creator Typ", MAPPINGS.creatorTypen, applicantsListContainer, paginationWrapper);
        filterWrapper.appendChild(creatorTypeFilterElement);
    }

    // Toggle für "Nur relevante Bewerber"
    const relevantToggleWrapper = document.createElement('div');
    relevantToggleWrapper.classList.add('db-filter-toggle-wrapper'); // Eigene Klasse für Styling des Toggles

    const relevantToggleCheckbox = document.createElement('input');
    relevantToggleCheckbox.type = 'checkbox';
    relevantToggleCheckbox.id = `filter-${jobId}-relevantOnly`;
    relevantToggleCheckbox.dataset.filterType = 'relevantOnly'; 
    relevantToggleCheckbox.classList.add('db-filter-checkbox'); 

    const relevantToggleLabel = document.createElement('label');
    relevantToggleLabel.htmlFor = relevantToggleCheckbox.id; // Korrekte Verknüpfung
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
    filterWrapper.appendChild(relevantToggleWrapper);


    // Schließen der Dropdowns, wenn außerhalb geklickt wird
    document.addEventListener("click", (e) => {
        // Prüft, ob der Klick außerhalb *jedes* .db-table-filter Elements war
        if (!e.target.closest('.db-table-filter') && !e.target.closest('.db-filter-toggle-wrapper')) {
            const allDropdownLists = filterWrapper.querySelectorAll('.db-filter-dropdown-list');
            allDropdownLists.forEach(dd => {
                dd.style.display = 'none';
            });
        }
    });
    return filterRow;
  }


  // Exponieren der UI-Funktionen
  window.WEBFLOW_API.ui.createApplicantRowElement = createApplicantRowElement;
  window.WEBFLOW_API.ui.createApplicantTableHeaderElement = createApplicantTableHeaderElement;
  window.WEBFLOW_API.ui.createFilterRowElement = createFilterRowElement;

})();
