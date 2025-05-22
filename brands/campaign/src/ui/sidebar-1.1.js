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
      // navAndCloseWrapper Klasse für Flexbox oder Grid Layout in CSS hinzufügen, falls benötigt
      navAndCloseWrapper.classList.add('db-modal-nav-close-wrapper');


      const navButtonsWrapper = document.createElement('div');
      navButtonsWrapper.classList.add('db-modal-control-buttons'); // Neue Klasse hier


      const prevButton = document.createElement('div');
      prevButton.classList.add('db-modal-prev'); 
      prevButton.id = 'sidebar-prev-applicant';
      prevButton.textContent = '< Zurück'; // Angepasster Text
      prevButton.title = "Vorheriger Bewerber";
      navButtonsWrapper.appendChild(prevButton);

      const nextButton = document.createElement('div');
      nextButton.classList.add('db-modal-next'); 
      nextButton.id = 'sidebar-next-applicant';
      nextButton.textContent = 'Weiter >'; // Angepasster Text
      nextButton.title = "Nächster Bewerber";
      navButtonsWrapper.appendChild(nextButton);
      navAndCloseWrapper.appendChild(navButtonsWrapper);
      
      const closeButton = document.createElement('div');
      closeButton.id = 'sidebar-close-button';
      closeButton.classList.add('db-modal-close-button'); 
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
        sidebarWrapper.classList.remove('is-open'); 
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
        sidebarWrapper.classList.add('is-open'); 
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
    
    // Ersetzt db-modal-plus-status durch Location
    const city = applicantFieldData["user-city-2"] || "K.A.";
    const bundeslandId = applicantFieldData["bundesland-option"];
    const bundeslandName = (MAPPINGS && MAPPINGS.bundeslaender && MAPPINGS.bundeslaender[bundeslandId]) || "";
    const locationInHeadlineP = document.createElement('p');
    locationInHeadlineP.classList.add('is-txt-16'); // Neue Klasse für Location in Headline
    locationInHeadlineP.textContent = `${city}${bundeslandName ? `, ${bundeslandName}` : ""}`;
    if (locationInHeadlineP.textContent === "K.A.") { // Verstecke, wenn keine Info
        locationInHeadlineP.textContent = "Kein Standort angegeben";
    }
    detailsDiv.appendChild(locationInHeadlineP);


    headlineDiv.appendChild(detailsDiv);
    contentArea.appendChild(headlineDiv);

    const additionalDetailsDiv = document.createElement('div');
    additionalDetailsDiv.classList.add('db-modal-additional-details');

    // Standort hier wurde entfernt, da er jetzt in der Headline ist.

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
    socialDiv.classList.add('db-modal-social-links'); 
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
        iconImg.classList.add('db-modal-social-icon'); 
        
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

    // Video Grid
    const videoGridDiv = document.createElement('div');
    videoGridDiv.classList.add('db-modal-creator-video-grid');
    const videoTitle = document.createElement('h4');
    videoTitle.textContent = 'Videos:';
    videoGridDiv.appendChild(videoTitle);

    let videosFound = false;
    for (let i = 1; i <= 5; i++) {
        const videoLinkField = `creator-video-link-${i}`;
        const videoUrl = applicantFieldData[videoLinkField];
        if (videoUrl && typeof videoUrl === 'string' && videoUrl.trim() !== '') {
            videosFound = true;
            const videoElement = document.createElement('video');
            videoElement.src = window.WEBFLOW_API.utils.normalizeUrl(videoUrl); // Normalize URL
            videoElement.controls = true;
            videoElement.width = 200; // Beispielbreite, per CSS anpassen
            videoElement.classList.add('db-modal-video-item'); // Klasse für Styling
            
            // Fallback-Text für Browser, die das Video-Tag nicht unterstützen
            const sourceElement = document.createElement('source');
            sourceElement.src = window.WEBFLOW_API.utils.normalizeUrl(videoUrl);
            // Den Typ dynamisch zu bestimmen ist schwierig ohne Server-Info oder Dateiendung.
            // Für eine robuste Lösung wäre es besser, den Mime-Type im CMS zu speichern.
            // Hier ein einfacher Versuch basierend auf gängigen Endungen (ggf. erweitern)
            if (videoUrl.endsWith('.mp4')) {
                sourceElement.type = 'video/mp4';
            } else if (videoUrl.endsWith('.webm')) {
                sourceElement.type = 'video/webm';
            } else if (videoUrl.endsWith('.ogg')) {
                sourceElement.type = 'video/ogg';
            } // Weitere Typen hinzufügen...
            videoElement.appendChild(sourceElement);
            videoElement.appendChild(document.createTextNode('Ihr Browser unterstützt das Video-Tag nicht.'));

            videoGridDiv.appendChild(videoElement);
        }
    }
    if (!videosFound) {
        const noVideosP = document.createElement('p');
        noVideosP.textContent = 'Keine Videos vorhanden.';
        videoGridDiv.appendChild(noVideosP);
    }
    contentArea.appendChild(videoGridDiv);


    const prevBtn = document.getElementById('sidebar-prev-applicant');
    const nextBtn = document.getElementById('sidebar-next-applicant');
    if (prevBtn) {
        prevBtn.classList.toggle('disabled', currentSidebarIndex === 0);
    }
    if (nextBtn) {
        nextBtn.classList.toggle('disabled', currentSidebarIndex === currentSidebarApplicants.length - 1);
    }

    sidebarWrapper.classList.add('is-open'); 
  }

  window.WEBFLOW_API.ui.showCreatorSidebar = showCreatorSidebar;

})();
