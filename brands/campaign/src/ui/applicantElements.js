(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  // Abhängigkeiten
  const MAPPINGS = window.WEBFLOW_API.MAPPINGS;
  const { normalizeUrl } = window.WEBFLOW_API.utils;
  // applyAndReloadApplicants wird später von dataProcessing importiert und hier als Callback verwendet
  // loadAndDisplayApplicantsForJob wird später von appLogic importiert

  /**
   * Erstellt ein DOM-Element für eine Bewerberzeile.
   * @param {object} applicantItemWithScoreInfo - Das Bewerberobjekt mit Match-Score-Informationen.
   * @param {object} jobFieldDataForTooltip - Felddaten des Jobs (optional, für Tooltip-Details).
   * @returns {HTMLElement} Das DOM-Element der Bewerberzeile.
   */
  function createApplicantRowElement(applicantItemWithScoreInfo, jobFieldDataForTooltip) {
    const applicantFieldData = applicantItemWithScoreInfo.fieldData;
    const matchInfo = applicantItemWithScoreInfo.matchInfo;

    const applicantDiv = document.createElement("div");
    applicantDiv.classList.add("db-table-row", "db-table-applicant", "job-entry");

    applicantDiv.addEventListener('click', (event) => {
      if (event.target.closest('a.db-application-option') || event.target.closest('.score-circle-indicator')) {
        return; // Klick auf Link oder Score-Indikator, nicht auf Zeile selbst
      }
      const slug = applicantFieldData.slug;
      if (slug) {
        const profileUrl = `https://www.creatorjobs.com/members/${slug}`; // Basis-URL anpassen, falls nötig
        window.open(profileUrl, '_blank');
      } else {
        console.warn("Kein Slug für Bewerber gefunden, kann Profil nicht öffnen:", applicantFieldData.name);
      }
    });

    if (typeof MAPPINGS === 'undefined') {
      console.error("❌ MAPPINGS-Objekt ist nicht definiert in createApplicantRowElement.");
      const errorDiv = document.createElement("div");
      errorDiv.textContent = "Fehler: Mapping-Daten nicht verfügbar.";
      errorDiv.style.gridColumn = "span 8"; // Damit es die ganze Breite einnimmt
      applicantDiv.appendChild(errorDiv);
      return applicantDiv;
    }

    // Match Score Cell
    const scoreCellContainer = document.createElement("div");
    scoreCellContainer.classList.add("db-table-row-item");
    scoreCellContainer.style.display = "flex";
    scoreCellContainer.style.justifyContent = "center";
    scoreCellContainer.style.alignItems = "center";

    const scoreValue = matchInfo ? matchInfo.score : 0;
    const scoreCircle = document.createElement("div");
    scoreCircle.classList.add("score-circle-indicator"); // Für Webflow-Styling

    let progressColor = "#e0e0e0"; // Standardfarbe für den Ringhintergrund oder 0 Score
    if (scoreValue >= 80) progressColor = "#4CAF50"; // Grün
    else if (scoreValue >= 60) progressColor = "#FFC107"; // Gelb/Orange
    else if (scoreValue > 0) progressColor = "#FF9800"; // Orange
    
    scoreCircle.style.width = "40px";
    scoreCircle.style.height = "40px";
    scoreCircle.style.borderRadius = "50%";
    scoreCircle.style.position = "relative";
    scoreCircle.style.display = "flex";
    scoreCircle.style.justifyContent = "center";
    scoreCircle.style.alignItems = "center";
    scoreCircle.style.cursor = "default"; // Kein Tooltip mehr, also default Cursor
    
    const degree = (scoreValue / 100) * 360;
    scoreCircle.style.background = `conic-gradient(${progressColor} ${degree}deg, #efefef ${degree}deg 360deg)`;

    const scoreText = document.createElement("span");
    scoreText.textContent = `${scoreValue}`;
    scoreText.style.color = scoreValue > 0 ? "#333" : "#757575"; // Dunkler Text, etwas heller bei 0
    scoreText.style.fontWeight = "bold";
    scoreText.style.fontSize = "14px";
    scoreText.style.position = "absolute";

    scoreCircle.appendChild(scoreText);
    scoreCellContainer.appendChild(scoreCircle);
    applicantDiv.appendChild(scoreCellContainer);

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
    categoryTag.classList.add("job-tag", "customer"); // Klasse anpassen, falls nötig
    categoryTag.textContent = applicantFieldData["creator-main-categorie"] || "K.A.";
    categoryCell.appendChild(categoryTag);
    applicantDiv.appendChild(categoryCell);

    // Creator Type
    const creatorTypeCell = document.createElement("div");
    creatorTypeCell.classList.add("db-table-row-item");
    const creatorTypeTag = document.createElement("span");
    creatorTypeTag.classList.add("job-tag", "customer"); // Klasse anpassen, falls nötig
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
      const normalizedPlatformUrl = normalizeUrl(platformUrlValue); // normalizeUrl aus WEBFLOW_API.utils
      if (normalizedPlatformUrl) {
        const socialLink = document.createElement("a");
        socialLink.href = normalizedPlatformUrl;
        socialLink.classList.add("db-application-option", "no-icon", "w-inline-block"); // Klassen prüfen/anpassen
        socialLink.target = "_blank";
        socialLink.rel = "noopener noreferrer";
        const iconImg = document.createElement("img");
        iconImg.src = platform.iconUrl;
        iconImg.alt = `${platform.name} Profil`;
        iconImg.classList.add("db-icon-18"); // Klasse prüfen/anpassen
        socialLink.appendChild(iconImg);
        socialCell.appendChild(socialLink);
      }
    });
    applicantDiv.appendChild(socialCell);

    // Follower
    const followerCell = document.createElement("div");
    followerCell.classList.add("db-table-row-item");
    const followerTag = document.createElement("span");
    followerTag.classList.add("job-tag", "customer"); // Klasse anpassen
    const followerId = applicantFieldData["creator-follower"];
    followerTag.textContent = (MAPPINGS.followerRanges && MAPPINGS.followerRanges[followerId]) || (followerId ? followerId.substring(0,10)+'...' : "K.A.");
    followerCell.appendChild(followerTag);
    applicantDiv.appendChild(followerCell);

    // Age
    const ageCell = document.createElement("div");
    ageCell.classList.add("db-table-row-item");
    const ageTag = document.createElement("span");
    ageTag.classList.add("job-tag", "customer"); // Klasse anpassen
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

    const columns = ["Match", "Creator", "Location", "Kategorie", "Creator Type", "Social Media", "Follower", "Alter"];
    columns.forEach((colText, index) => {
      const colDiv = document.createElement("div");
      colDiv.classList.add("db-table-row-item");
      if (index === 0) { // Match Score Spalte zentrieren
        colDiv.style.textAlign = "center";
      }
      if (index === 1) { // Creator Spalte etwas breiter
         colDiv.style.flexGrow = "1.5"; // Oder eine spezifischere Klasse verwenden
      }
      const textSpan = document.createElement("span");
      textSpan.classList.add("is-txt-16", "is-txt-bold"); // Klassen prüfen/anpassen
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

    // Follower Filter
    const followerFilterDiv = document.createElement("div");
    followerFilterDiv.classList.add("db-individual-filter-trigger"); // Webflow Klasse für Dropdown Trigger

    const followerFilterText = document.createElement("span");
    followerFilterText.classList.add("is-txt-16");
    followerFilterText.textContent = "Follower";
    followerFilterDiv.appendChild(followerFilterText);

    const followerFilterIcon = document.createElement("img");
    followerFilterIcon.src = "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/682c5e5b84cac09c56cdbebe_angle-down-small.svg"; // Pfad anpassen
    followerFilterIcon.classList.add("db-icon-18"); // Klasse anpassen
    followerFilterDiv.appendChild(followerFilterIcon);

    const followerDropdownList = document.createElement("div");
    followerDropdownList.classList.add("db-filter-dropdown-list"); // Webflow Klasse für Dropdown Liste
    followerDropdownList.style.display = "none"; // Standardmäßig versteckt

    if (MAPPINGS && MAPPINGS.followerRanges) {
        Object.entries(MAPPINGS.followerRanges).forEach(([id, rangeText]) => {
            if (rangeText === "0") return; // "0" Follower nicht als Filteroption

            const optionDiv = document.createElement("div");
            optionDiv.classList.add("db-filter-option"); // Webflow Klasse für Dropdown Option

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.classList.add("db-filter-checkbox"); // Webflow Klasse für Checkbox
            checkbox.id = `filter-${jobId}-follower-${id}`;
            checkbox.dataset.filterValue = id;
            checkbox.dataset.filterType = "follower";

            // Überprüfen, ob dieser Filter im Cache aktiv ist
            const jobCache = window.WEBFLOW_API.cache.jobDataCache[jobId];
            if (jobCache?.activeFilters?.follower?.includes(id)) {
                checkbox.checked = true;
            }

            const label = document.createElement("label");
            label.htmlFor = checkbox.id;
            label.classList.add("is-txt-16"); // Klasse anpassen
            label.textContent = rangeText;

            checkbox.addEventListener("change", async () => {
                // Ruft applyAndReloadApplicants aus dem dataProcessing Modul auf
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

    // Event Listener für das Öffnen/Schließen des Dropdowns
    followerFilterDiv.addEventListener("click", (e) => {
      e.stopPropagation(); // Verhindert, dass der Klick das Dokument-Event auslöst
      // Schließe andere Dropdowns (falls es mehrere gäbe)
      const allDropdowns = filterRow.querySelectorAll('.db-filter-dropdown-list');
      allDropdowns.forEach(dd => {
        if (dd !== followerDropdownList) dd.style.display = 'none';
      });
      // Toggle aktuelles Dropdown
      followerDropdownList.style.display = followerDropdownList.style.display === "none" ? "block" : "none";
    });

    // Schließen, wenn außerhalb geklickt wird
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
