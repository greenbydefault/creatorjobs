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
      overlayElement.classList.add('db-modal-overlay'); 
      document.body.appendChild(overlayElement);

      overlayElement.addEventListener('click', () => {
        const sidebarToClose = document.getElementById('db-modal-creator-wrapper-dynamic');
        if (sidebarToClose && sidebarToClose.classList.contains('is-open')) {
          sidebarToClose.classList.remove('is-open');
          toggleOverlay(false); 
        }
      });
    }
  }

  /**
   * Zeigt oder versteckt das Overlay.
   * @param {boolean} show - True, um das Overlay anzuzeigen, false, um es zu verstecken.
   */
  function toggleOverlay(show) {
    ensureOverlay(); 
    if (overlayElement) {
      if (show) {
        overlayElement.classList.add('is-visible'); 
      } else {
        overlayElement.classList.remove('is-visible'); 
      }
    }
  }

  /**
   * Erstellt ein einzelnes Video-Skeleton-Element.
   * @returns {HTMLElement} Das Skeleton-Element für ein Video.
   */
  function createVideoSkeletonElement() {
    const skeletonWrapper = document.createElement('div');
    skeletonWrapper.classList.add('db-modal-video-wrapper', 'skeleton-video-wrapper'); // Zusätzliche Klasse für Skeleton-Styling

    const skeletonVideo = document.createElement('div');
    skeletonVideo.classList.add('db-modal-video-item', 'skeleton-video-item'); // Klasse für Skeleton-Styling
    // Du kannst hier per CSS eine feste Höhe oder ein Seitenverhältnis und einen Ladeeffekt definieren
    skeletonWrapper.appendChild(skeletonVideo);
    return skeletonWrapper;
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
            toggleOverlay(false); 
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
            toggleOverlay(true); 
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

    if (applicantFieldData.slug) {
        const profileLink = document.createElement('a');
        profileLink.classList.add('db-button-medium-white-border'); 
        profileLink.href = `https://www.creatorjobs.com/members/${applicantFieldData.slug}`; 
        profileLink.target = '_blank'; 
        profileLink.rel = 'noopener noreferrer';
        profileLink.title = 'Profil ansehen'; 

        const profileIcon = document.createElement('img');
        profileIcon.src = 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/66bdffde5a17773ef460244c_edit-profile.svg';
        profileIcon.classList.add('db-icon-24');
        profileIcon.alt = 'Profil ansehen'; 
        profileLink.appendChild(profileIcon);
        actionsWrapper.appendChild(profileLink);
    }

    const memberstackId = applicantFieldData['memberstack-id'] || applicantFieldData['webflow-member-id']; 
    if (memberstackId) {
        const chatButton = document.createElement('div'); 
        chatButton.id = 'user-chat'; 
        chatButton.classList.add('db-button-medium-white-border', 'dont-shrink'); 
        chatButton.setAttribute('data-creatorjobs-action', 'create-chat');
        chatButton.setAttribute('data-creatorjobs-target', memberstackId);
        chatButton.title = 'Chat starten'; 

        const chatIcon = document.createElement('img');
        chatIcon.src = 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/6645b3de7fe3addd5b0b2bcb_messages.svg';
        chatIcon.classList.add('db-icon-24');
        chatIcon.alt = 'Chat starten'; 
        chatButton.appendChild(chatIcon);
        actionsWrapper.appendChild(chatButton);
    }
    headlineDiv.appendChild(actionsWrapper); 


    contentArea.appendChild(headlineDiv);

    const additionalDetailsDiv = document.createElement('div');
    additionalDetailsDiv.classList.add('db-modal-additional-details');
    contentArea.appendChild(additionalDetailsDiv); 

    // Video Grid
    const videoGridContainer = document.createElement('div'); 
    videoGridContainer.classList.add('db-modal-creator-video-grid');
    contentArea.appendChild(videoGridContainer); // Video-Grid zum Content-Bereich hinzufügen

    // Skeleton Loader für Videos anzeigen
    const numberOfPotentialVideos = 5; // Da wir bis zu 5 Video-Links prüfen
    for (let i = 0; i < numberOfPotentialVideos; i++) {
        videoGridContainer.appendChild(createVideoSkeletonElement());
    }

    // Verzögere das eigentliche Laden der Videos leicht, um dem Skeleton-Rendering Zeit zu geben (optional)
    // Und um den Hauptthread nicht sofort zu blockieren, falls viele Videos geladen werden.
    // In einer echten Anwendung könnte man hier auf 'requestIdleCallback' warten oder die Videos
    // erst laden, wenn sie in den Viewport kommen (Lazy Loading).
    // Fürs Erste reicht ein kleiner Timeout oder das direkte Laden.

    // Hier werden die Skeletons entfernt und durch Videos oder "Keine Videos" ersetzt.
    // Es ist wichtig, dies nach dem Anzeigen der Skeletons zu tun.
    // Um das "Springen" zu minimieren, sollten die Skeletons ähnliche Dimensionen haben wie die Videos.
    
    // Um sicherzustellen, dass die Skeletons zuerst gerendert werden, bevor sie entfernt werden,
    // kann ein kleiner Timeout helfen, oder man arbeitet mit Promises, falls das Video-Laden asynchron ist.
    // Da wir die Video-Elemente direkt erstellen, ist ein Timeout hier eine einfache Lösung.
    
    setTimeout(() => {
        videoGridContainer.innerHTML = ''; // Entferne die Skeleton-Loader

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
    }, 0); // Ein Timeout von 0ms reicht oft, um dem Browser Zeit für ein Reflow/Repaint zu geben.


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
        toggleOverlay(true); 
    }
  }

  window.WEBFLOW_API.ui.showCreatorSidebar = showCreatorSidebar;

})();
