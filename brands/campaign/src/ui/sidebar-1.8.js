(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  let currentSidebarJobId = null;
  let currentSidebarApplicants = [];
  let currentSidebarIndex = -1;
  let overlayElement = null; // Variable für das Overlay-Element

  /**
   * Erstellt das Overlay-Element, falls es nicht existiert.
   */
  function ensureOverlay() {
    if (!overlayElement) {
      overlayElement = document.createElement('div');
      overlayElement.id = 'db-modal-overlay-dynamic'; // Eindeutige ID für das Overlay
      // Die Klasse 'db-modal-overlay' wird für das Styling in Webflow verwendet.
      // Diese Klasse sollte z.B. position: fixed, top:0, left:0, width:100%, height:100%, background-color: rgba(0,0,0,0.15), z-index, und display:none initial setzen.
      overlayElement.classList.add('db-modal-overlay'); 
      document.body.appendChild(overlayElement);

      // Klick auf Overlay schließt die Sidebar und das Overlay
      overlayElement.addEventListener('click', () => {
        const sidebarToClose = document.getElementById('db-modal-creator-wrapper-dynamic');
        if (sidebarToClose && sidebarToClose.classList.contains('is-open')) {
          sidebarToClose.classList.remove('is-open');
          toggleOverlay(false); // Overlay ausblenden
        }
      });
    }
  }

  /**
   * Zeigt oder versteckt das Overlay.
   * @param {boolean} show - True, um das Overlay anzuzeigen, false, um es zu verstecken.
   */
  function toggleOverlay(show) {
    ensureOverlay(); // Stellt sicher, dass das Overlay-Element existiert
    if (overlayElement) {
      if (show) {
        overlayElement.classList.add('is-visible'); // Klasse zum Anzeigen (z.B. display: block oder display: flex)
      } else {
        overlayElement.classList.remove('is-visible'); // Klasse zum Verstecken (z.B. display: none)
      }
    }
  }


  /**
   * Erstellt und zeigt die Creator-Detail-Sidebar an oder aktualisiert sie.
   * @param {object} applicantItem - Das anzuzeigende Bewerberobjekt.
   * @param {Array} allJobApplicants - Die vollständige (gefilterte/sortierte) Liste der Bewerber für den aktuellen Job.
   * @param {number} applicantIndex - Der Index des aktuellen Bewerbers in allJobApplicants.
   * @param {string} jobId - Die ID des aktuellen Jobs.
   */
  function showCreatorSidebar(applicantItem, allJobApplicants, applicantIndex, jobId) {
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS; 

    currentSidebarJobId = jobId;
    currentSidebarApplicants = allJobApplicants;
    currentSidebarIndex = applicantIndex;

    let sidebarWrapper = document.getElementById('db-modal-creator-wrapper-dynamic');
    if (!sidebarWrapper) {
      sidebarWrapper = document.createElement('div');
      sidebarWrapper.id = 'db-modal-creator-wrapper-dynamic';
      sidebarWrapper.classList.add('db-modal-creator-wrapper'); 


      const sidebarControls = document.createElement('div');
      sidebarControls.classList.add('db-modal-creator-controls');


      const title = document.createElement('span');
      title.classList.add('is-txt-16', 'is-txt-medium');
      title.textContent = 'Bewerber Details';
      sidebarControls.appendChild(title);

      const navButtonsWrapper = document.createElement('div');
      navButtonsWrapper.classList.add('db-modal-control-buttons'); 

      const prevButton = document.createElement('div');
      prevButton.classList.add('db-modal-prev'); 
      prevButton.id = 'sidebar-prev-applicant';
      prevButton.textContent = '< Zurück'; 
      prevButton.title = "Vorheriger Bewerber";
      navButtonsWrapper.appendChild(prevButton);

      const nextButton = document.createElement('div');
      nextButton.classList.add('db-modal-next'); 
      nextButton.id = 'sidebar-next-applicant';
      nextButton.textContent = 'Weiter >'; 
      nextButton.title = "Nächster Bewerber";
      navButtonsWrapper.appendChild(nextButton);
      
      sidebarControls.appendChild(navButtonsWrapper); 

      const closeButtonWrapper = document.createElement('div'); 
      closeButtonWrapper.classList.add('db-modal-nav-close-wrapper'); 
      
      const closeButton = document.createElement('div');
      closeButton.id = 'sidebar-close-button'; 
      closeButton.classList.add('db-modal-close-button'); 
      closeButton.textContent = '✕';
      closeButton.title = "Schließen";
      closeButtonWrapper.appendChild(closeButton); 

      sidebarControls.appendChild(closeButtonWrapper); 

      sidebarWrapper.appendChild(sidebarControls);

      const sidebarContent = document.createElement('div');
      sidebarContent.classList.add('db-modal-creator-content');
      sidebarContent.id = 'sidebar-creator-content-dynamic';
      sidebarWrapper.appendChild(sidebarContent);
      document.body.appendChild(sidebarWrapper);

      // Event Listener
      closeButton.addEventListener('click', () => {
        const wrapperToClose = document.getElementById('db-modal-creator-wrapper-dynamic');
        if (wrapperToClose) {
            wrapperToClose.classList.remove('is-open'); 
            toggleOverlay(false); // Overlay ausblenden
        }
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
        const wrapperToShow = document.getElementById('db-modal-creator-wrapper-dynamic');
        if (wrapperToShow) {
            wrapperToShow.classList.add('is-open');
            toggleOverlay(true); // Overlay einblenden
        }
        return;
    }

    const headlineDiv = document.createElement('div');
    headlineDiv.classList.add('db-modal-creator-headline'); 

    const imgDetailsWrapper = document.createElement('div');
    imgDetailsWrapper.classList.add('db-modal-creator-img-wrapper');

    const profileImageField = applicantFieldData["image-thumbnail-small-92px"] || applicantFieldData["user-profile-img"];
    if (profileImageField) {
      const img = document.createElement('img');
      img.classList.add('db-table-img', 'big'); 
      img.src = typeof profileImageField === 'string' ? profileImageField : (profileImageField?.url || 'https://placehold.co/80x80/E0E0E0/BDBDBD?text=Bild');
      img.alt = applicantFieldData.name || "Bewerberbild";
      img.onerror = () => { img.src = 'https://placehold.co/80x80/E0E0E0/BDBDBD?text=Fehler'; };
      imgDetailsWrapper.appendChild(img); 
    }

    const detailsDiv = document.createElement('div');
    detailsDiv.classList.add('db-modal-creator-details');

    const nameSpan = document.createElement('span'); 
    nameSpan.classList.add('db-modal-headline'); 
    nameSpan.textContent = applicantFieldData.name || 'Unbekannter Bewerber';
    detailsDiv.appendChild(nameSpan);
    
    const city = applicantFieldData["user-city-2"] || "K.A.";
    const bundeslandId = applicantFieldData["bundesland-option"];
    const bundeslandName = (MAPPINGS && MAPPINGS.bundeslaender && MAPPINGS.bundeslaender[bundeslandId]) || "";
    const locationInHeadlineP = document.createElement('p');
    locationInHeadlineP.classList.add('is-txt-16'); 
    locationInHeadlineP.textContent = `${city}${bundeslandName ? `, ${bundeslandName}` : ""}`;
    if (locationInHeadlineP.textContent === "K.A." || locationInHeadlineP.textContent === "") { 
        locationInHeadlineP.textContent = "Kein Standort angegeben";
    }
    detailsDiv.appendChild(locationInHeadlineP);
    imgDetailsWrapper.appendChild(detailsDiv); 
    headlineDiv.appendChild(imgDetailsWrapper); 

    const actionsWrapper = document.createElement('div');
    actionsWrapper.classList.add('db-modal-creator-actions'); 

    // "Profil ansehen" Button mit Icon
    if (applicantFieldData.slug) {
        const profileLink = document.createElement('a');
        profileLink.classList.add('db-button-medium-white-border'); // Geänderte Klasse
        profileLink.href = `https://www.creatorjobs.com/members/${applicantFieldData.slug}`; 
        profileLink.target = '_blank'; 
        profileLink.rel = 'noopener noreferrer';
        profileLink.title = 'Profil ansehen'; // Tooltip für Barrierefreiheit

        const profileIcon = document.createElement('img');
        profileIcon.src = 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/66bdffde5a17773ef460244c_edit-profile.svg';
        profileIcon.classList.add('db-icon-24');
        profileIcon.alt = 'Profil ansehen'; // Wichtig für Barrierefreiheit
        profileLink.appendChild(profileIcon);
        actionsWrapper.appendChild(profileLink);
    }

    // "Chat starten" Button mit Icon
    const memberstackId = applicantFieldData['memberstack-id'] || applicantFieldData['webflow-member-id']; 
    if (memberstackId) {
        const chatButton = document.createElement('div'); 
        chatButton.id = 'user-chat'; 
        chatButton.classList.add('db-button-medium-white-border', 'dont-shrink'); 
        chatButton.setAttribute('data-creatorjobs-action', 'create-chat');
        chatButton.setAttribute('data-creatorjobs-target', memberstackId);
        chatButton.title = 'Chat starten'; // Tooltip für Barrierefreiheit

        const chatIcon = document.createElement('img');
        chatIcon.src = 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/6645b3de7fe3addd5b0b2bcb_messages.svg';
        chatIcon.classList.add('db-icon-24');
        chatIcon.alt = 'Chat starten'; // Wichtig für Barrierefreiheit
        chatButton.appendChild(chatIcon);
        actionsWrapper.appendChild(chatButton);
    }
    headlineDiv.appendChild(actionsWrapper); 


    contentArea.appendChild(headlineDiv);

    const additionalDetailsDiv = document.createElement('div');
    additionalDetailsDiv.classList.add('db-modal-additional-details');

    // Social Media Links wurden entfernt

    contentArea.appendChild(additionalDetailsDiv); 

    // Video Grid
    const videoGridContainer = document.createElement('div'); 
    videoGridContainer.classList.add('db-modal-creator-video-grid');

    let videosFound = false;
    for (let i = 1; i <= 5; i++) {
        const videoLinkField = `creator-video-link-${i}`;
        const videoUrl = applicantFieldData[videoLinkField];
        if (videoUrl && typeof videoUrl === 'string' && videoUrl.trim() !== '') {
            videosFound = true;

            const videoWrapper = document.createElement('div'); 
            videoWrapper.classList.add('db-modal-video-wrapper');

            const videoElement = document.createElement('video');
            videoElement.src = window.WEBFLOW_API.utils.normalizeUrl(videoUrl); 
            videoElement.controls = true;
            videoElement.preload = "metadata"; 
            videoElement.classList.add('db-modal-video-item'); 
            
            const sourceElement = document.createElement('source');
            sourceElement.src = window.WEBFLOW_API.utils.normalizeUrl(videoUrl);
            if (videoUrl.endsWith('.mp4')) {
                sourceElement.type = 'video/mp4';
            } else if (videoUrl.endsWith('.webm')) {
                sourceElement.type = 'video/webm';
            } else if (videoUrl.endsWith('.ogg')) {
                sourceElement.type = 'video/ogg';
            } 
            videoElement.appendChild(sourceElement);
            videoElement.appendChild(document.createTextNode('Ihr Browser unterstützt das Video-Tag nicht.'));

            videoWrapper.appendChild(videoElement); 
            videoGridContainer.appendChild(videoWrapper); 
        }
    }
    if (!videosFound) {
        const noVideosP = document.createElement('p');
        noVideosP.textContent = 'Keine Videos vorhanden.';
        videoGridContainer.appendChild(noVideosP);
    }
    contentArea.appendChild(videoGridContainer);


    const prevBtn = document.getElementById('sidebar-prev-applicant');
    const nextBtn = document.getElementById('sidebar-next-applicant');
    if (prevBtn) {
        prevBtn.classList.toggle('disabled', currentSidebarIndex === 0);
    }
    if (nextBtn) {
        nextBtn.classList.toggle('disabled', currentSidebarIndex === currentSidebarApplicants.length - 1);
    }

    const finalSidebarWrapper = document.getElementById('db-modal-creator-wrapper-dynamic');
    if (finalSidebarWrapper) {
        finalSidebarWrapper.classList.add('is-open'); 
        toggleOverlay(true); // Overlay einblenden, wenn Sidebar geöffnet wird
    }
  }

  window.WEBFLOW_API.ui.showCreatorSidebar = showCreatorSidebar;

})();
