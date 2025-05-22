(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  // Abhängigkeiten aus dem globalen Namespace holen
  // Stellen Sie sicher, dass mappings.js und helpers.js (für normalizeUrl) vorher geladen wurden
  // und ihre Exporte unter window.WEBFLOW_API verfügbar sind.

  let currentSidebarJobId = null;
  let currentSidebarApplicants = [];
  let currentSidebarIndex = -1;

  /**
   * Erstellt und zeigt die Creator-Detail-Sidebar an oder aktualisiert sie.
   * @param {object} applicantItem - Das anzuzeigende Bewerberobjekt.
   * @param {Array} allJobApplicants - Die vollständige (gefilterte/sortierte) Liste der Bewerber für den aktuellen Job.
   * @param {number} applicantIndex - Der Index des aktuellen Bewerbers in allJobApplicants.
   * @param {string} jobId - Die ID des aktuellen Jobs.
   */
  function showCreatorSidebar(applicantItem, allJobApplicants, applicantIndex, jobId) {
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS; // Zugriff auf Mappings sicherstellen

    currentSidebarJobId = jobId;
    currentSidebarApplicants = allJobApplicants;
    currentSidebarIndex = applicantIndex;

    let sidebarWrapper = document.getElementById('db-modal-creator-wrapper-dynamic');
    if (!sidebarWrapper) {
      sidebarWrapper = document.createElement('div');
      sidebarWrapper.id = 'db-modal-creator-wrapper-dynamic';
      sidebarWrapper.classList.add('db-modal-creator-wrapper'); // Ihre Webflow-Klasse für das Styling


      const sidebarControls = document.createElement('div');
      sidebarControls.classList.add('db-modal-creator-controls');


      const title = document.createElement('span');
      title.classList.add('is-txt-16', 'is-txt-medium');
      title.textContent = 'Bewerber Details';
      sidebarControls.appendChild(title);

      const navAndCloseWrapper = document.createElement('div');


      const navButtonsWrapper = document.createElement('div');


      const prevButton = document.createElement('div');
      prevButton.classList.add('db-modal-prev'); // Ihre Webflow-Klasse
      prevButton.id = 'sidebar-prev-applicant';
      prevButton.textContent = '‹'; 
      prevButton.title = "Vorheriger Bewerber";
      navButtonsWrapper.appendChild(prevButton);

      const nextButton = document.createElement('div');
      nextButton.classList.add('db-modal-next'); // Ihre Webflow-Klasse
      nextButton.id = 'sidebar-next-applicant';
      nextButton.textContent = '›'; 
      nextButton.title = "Nächster Bewerber";
      navButtonsWrapper.appendChild(nextButton);
      navAndCloseWrapper.appendChild(navButtonsWrapper);
      
      const closeButton = document.createElement('div');
      closeButton.id = 'sidebar-close-button';
      closeButton.classList.add('db-modal-close-button'); // Eigene Klasse für Styling
      closeButton.textContent = '✕';
      closeButton.title = "Schließen";
      navAndCloseWrapper.appendChild(closeButton);

      sidebarControls.appendChild(navAndCloseWrapper);
      sidebarWrapper.appendChild(sidebarControls);

      const sidebarContent = document.createElement('div');
      sidebarContent.classList.add('db-modal-creator-content');
      sidebarContent.id = 'sidebar-creator-content-dynamic';
      sidebarWrapper.appendChild(sidebarContent);
      document.body.appendChild(sidebarWrapper);

      // Event Listener
      closeButton.addEventListener('click', () => {
        sidebarWrapper.classList.remove('is-open'); // Klasse zum Anzeigen/Verstecken
      });

      prevButton.addEventListener('click', () => {
        if (currentSidebarIndex > 0) {
          showCreatorSidebar(currentSidebarApplicants[currentSidebarIndex - 1], currentSidebarApplicants, currentSidebarIndex - 1, currentSidebarJobId);
        }
      });

      nextButton.addEventListener('click', () => {
        if (currentSidebarIndex < currentSidebarApplicants.length - 1) {
          showCreatorSidebar(currentSidebarApplicants[currentSidebarIndex + 1], currentSidebarApplicants, currentSidebarIndex + 1, currentSidebarJobId);
        }
      });
    }

    // Inhalt der Sidebar aktualisieren
    const contentArea = document.getElementById('sidebar-creator-content-dynamic');
    contentArea.innerHTML = ''; 

    const applicantFieldData = applicantItem.fieldData;
    if (!applicantFieldData) {
        contentArea.textContent = 'Bewerberdaten nicht verfügbar.';
        sidebarWrapper.classList.add('is-open'); // Klasse zum Anzeigen
        return;
    }

    const headlineDiv = document.createElement('div');
    headlineDiv.classList.add('db-modal-creator-headline'); 


    const profileImageField = applicantFieldData["image-thumbnail-small-92px"] || applicantFieldData["user-profile-img"];
    if (profileImageField) {
      const img = document.createElement('img');
      img.classList.add('db-table-img'); // Ggf. anpassen: 'db-sidebar-creator-img'
      img.src = typeof profileImageField === 'string' ? profileImageField : (profileImageField?.url || 'https://placehold.co/80x80/E0E0E0/BDBDBD?text=Bild');
      img.alt = applicantFieldData.name || "Bewerberbild";
      img.onerror = () => { img.src = 'https://placehold.co/80x80/E0E0E0/BDBDBD?text=Fehler'; };
      headlineDiv.appendChild(img);
    }

    const detailsDiv = document.createElement('div');
    detailsDiv.classList.add('db-modal-creator-details');

    const nameH = document.createElement('h3'); 
    nameH.classList.add('db-modal-headline'); 
    nameH.textContent = applicantFieldData.name || 'Unbekannter Bewerber';
    detailsDiv.appendChild(nameH);
    
    const plusStatusP = document.createElement('p');
    plusStatusP.classList.add('db-modal-plus-status'); // Eigene Klasse für Styling
    plusStatusP.textContent = applicantFieldData["plus-mitglied"] ? "Plus Mitglied" : "Standard Mitglied";
    detailsDiv.appendChild(plusStatusP);


    headlineDiv.appendChild(detailsDiv);
    contentArea.appendChild(headlineDiv);

    const additionalDetailsDiv = document.createElement('div');
    additionalDetailsDiv.classList.add('db-modal-additional-details');

    const city = applicantFieldData["user-city-2"] || "K.A.";
    const bundeslandId = applicantFieldData["bundesland-option"];
    const bundeslandName = (MAPPINGS && MAPPINGS.bundeslaender && MAPPINGS.bundeslaender[bundeslandId]) || "";
    const locationP = document.createElement('p');
    locationP.innerHTML = `<strong>Standort:</strong> ${city}${bundeslandName ? `, ${bundeslandName}` : ""}`;
    additionalDetailsDiv.appendChild(locationP);

    const creatorTypeId = applicantFieldData["creator-type"];
    const creatorTypeName = (MAPPINGS && MAPPINGS.creatorTypen && MAPPINGS.creatorTypen[creatorTypeId]) || "K.A.";
    const typeP = document.createElement('p');
    typeP.innerHTML = `<strong>Creator Typ:</strong> ${creatorTypeName}`;
    additionalDetailsDiv.appendChild(typeP);

    const followerId = applicantFieldData["creator-follower"];
    const followerRange = (MAPPINGS && MAPPINGS.followerRanges && MAPPINGS.followerRanges[followerId]) || "K.A.";
    if (followerRange !== "0") { 
        const followerP = document.createElement('p');
        followerP.innerHTML = `<strong>Follower:</strong> ${followerRange}`;
        additionalDetailsDiv.appendChild(followerP);
    }
    
    const ageId = applicantFieldData["creator-age"];
    const ageRange = (MAPPINGS && MAPPINGS.altersgruppen && MAPPINGS.altersgruppen[ageId]) || "K.A.";
    const ageP = document.createElement('p');
    ageP.innerHTML = `<strong>Alter:</strong> ${ageRange}`;
    additionalDetailsDiv.appendChild(ageP);

    const socialDiv = document.createElement('div');
    socialDiv.classList.add('db-modal-social-links'); // Eigene Klasse für Styling
    const socialTitle = document.createElement('h4');
    socialTitle.textContent = 'Social Media:';
    socialDiv.appendChild(socialTitle);

    const socialPlatforms = [
      { key: "instagram", name: "Instagram", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e8d979b71d2a7e5db3_Instagram.svg" },
      { key: "tiktok", name: "TikTok", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e99dce86c2b6ba83fe_Tiktok.svg" },
      { key: "youtube", name: "YouTube", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e9b00d0480ffe289dc_YouTube.svg" }
    ];
    let socialLinksFound = false;
    socialPlatforms.forEach(platform => {
      const platformUrlValue = applicantFieldData[platform.key];
      const normalizedPlatformUrl = window.WEBFLOW_API.utils.normalizeUrl(platformUrlValue); 
      if (normalizedPlatformUrl) {
        socialLinksFound = true;
        const socialLink = document.createElement("a");
        socialLink.href = normalizedPlatformUrl;
        socialLink.target = "_blank";
        socialLink.rel = "noopener noreferrer";

        const iconImg = document.createElement("img");
        iconImg.src = platform.iconUrl;
        iconImg.alt = `${platform.name} Profil`;
        iconImg.classList.add('db-modal-social-icon'); // Eigene Klasse für Styling
        
        socialLink.appendChild(iconImg);
        socialDiv.appendChild(socialLink);
      }
    });
     if (!socialLinksFound) {
        const noSocialP = document.createElement('p');
        noSocialP.textContent = 'Keine Social Media Profile angegeben.';
        socialDiv.appendChild(noSocialP);
    }
    additionalDetailsDiv.appendChild(socialDiv);
    contentArea.appendChild(additionalDetailsDiv);

    const prevBtn = document.getElementById('sidebar-prev-applicant');
    const nextBtn = document.getElementById('sidebar-next-applicant');
    if (prevBtn) {
        prevBtn.classList.toggle('disabled', currentSidebarIndex === 0);
    }
    if (nextBtn) {
        nextBtn.classList.toggle('disabled', currentSidebarIndex === currentSidebarApplicants.length - 1);
    }

    sidebarWrapper.classList.add('is-open'); // Klasse zum Anzeigen
  }

  window.WEBFLOW_API.ui.showCreatorSidebar = showCreatorSidebar;

})();
