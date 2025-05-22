(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  // Abhängigkeiten
  const MAPPINGS = window.WEBFLOW_API.MAPPINGS;
  const { normalizeUrl } = window.WEBFLOW_API.utils;
  // Die Funktion showCreatorSidebar wird jetzt über window.WEBFLOW_API.ui.showCreatorSidebar aufgerufen
  
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
    applicantDiv.style.cursor = 'pointer'; // Zeigt an, dass die Zeile klickbar ist

    applicantDiv.addEventListener('click', (event) => {
      // Verhindert, dass der Klick auf ein Social Media Icon oder andere interaktive Elemente in der Zeile die Sidebar öffnet.
      if (event.target.closest('a') || event.target.closest('button') || event.target.closest('input')) {
        return; 
      }
      
      // Rufe die Sidebar-Funktion aus dem globalen Namespace auf
      if (window.WEBFLOW_API.ui && window.WEBFLOW_API.ui.showCreatorSidebar) {
        window.WEBFLOW_API.ui.showCreatorSidebar(applicantItemWithScoreInfo, allJobApplicantsForThisJob, currentIndexInList, jobId);
      } else {
        console.error("showCreatorSidebar function not found on window.WEBFLOW_API.ui");
        // Fallback, falls die Sidebar-Funktion aus irgendeinem Grund nicht da ist (sollte nicht passieren)
        // const slug = applicantFieldData.slug;
        // if (slug) {
        //   const profileUrl = `https://www.creatorjobs.com/members/${slug}`;
        //   window.open(profileUrl, '_blank');
        // } else {
        //   console.warn("Kein Slug für Bewerber gefunden, kann Profil nicht öffnen:", applicantFieldData.name);
        // }
      }
    });

    if (typeof MAPPINGS === 'undefined') {
      console.error("❌ MAPPINGS-Objekt ist nicht definiert in createApplicantRowElement.");
      const errorDiv = document.createElement("div");
      errorDiv.textContent = "Fehler: Mapping-Daten nicht verfügbar.";
      errorDiv.style.gridColumn = "span 7"; // Anzahl der Spalten anpassen, falls sich das Layout ändert
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
        // WICHTIG: Stoppt die Event-Propagation, damit der Klick auf das Icon nicht die Sidebar öffnet.
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
   * Erstellt das DOM-Element für die Filterzeile (z.B. Follower-Filter).
   * @param {string} jobId - Die ID des aktuellen Jobs.
   * @param {HTMLElement} applicantsListContainer - Der Container der Bewerberliste.
   * @param {HTMLElement} paginationWrapper - Der Wrapper für die Paginierung.
   * @returns {HTMLElement} Das Filterzeilen-DOM-Element.
   */
  function createFilterRowElement(jobId, applicantsListContainer, paginationWrapper) {
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

    if (MAPPINGS && MAPPINGS.followerRanges) {
        Object.entries(MAPPINGS.followerRanges).forEach(([id, rangeText]) => {
            if (rangeText === "0") return; 

            const optionDiv = document.createElement("div");
            optionDiv.classList.add("db-filter-option"); 

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.classList.add("db-filter-checkbox"); 
            checkbox.id = `filter-${jobId}-follower-${id}`;
            checkbox.dataset.filterValue = id;
            checkbox.dataset.filterType = "follower";

            const jobCache = window.WEBFLOW_API.cache.jobDataCache[jobId];
            if (jobCache?.activeFilters?.follower?.includes(id)) {
                checkbox.checked = true;
            }

            const label = document.createElement("label");
            label.htmlFor = checkbox.id;
            label.classList.add("is-txt-16"); 
            label.textContent = rangeText;

            checkbox.addEventListener("change", async () => {
                if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.applyAndReloadApplicants) {
                   await window.WEBFLOW_API.core.applyAndReloadApplicants(jobId, applicantsListContainer, paginationWrapper);
                } else {
                    console.error("applyAndReloadApplicants Funktion nicht gefunden.");
                }
            });

            optionDiv.appendChild(checkbox);
            optionDiv.appendChild(label);
            followerDropdownList.appendChild(optionDiv);
        });
    }

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

  // Exponieren der UI-Funktionen
  window.WEBFLOW_API.ui.createApplicantRowElement = createApplicantRowElement;
  window.WEBFLOW_API.ui.createApplicantTableHeaderElement = createApplicantTableHeaderElement;
  window.WEBFLOW_API.ui.createFilterRowElement = createFilterRowElement;

})();
