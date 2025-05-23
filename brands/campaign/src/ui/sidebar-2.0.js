(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  let currentSidebarJobId = null;
  let currentSidebarApplicants = [];
  let currentSidebarIndex = -1;
  let overlayElement = null; 

  function ensureOverlay() {
    if (!overlayElement) {
      overlayElement = document.createElement('div');
      overlayElement.id = 'db-modal-overlay-dynamic'; 
      overlayElement.classList.add('db-modal-overlay'); 
      document.body.appendChild(overlayElement);

      overlayElement.addEventListener('click', () => {
        const creatorSidebarToClose = document.getElementById('db-modal-creator-wrapper-dynamic');
        const notesSidebarToClose = document.getElementById('db-modal-note-wrapper-dynamic');
        let anySidebarIsOpen = false;

        if (creatorSidebarToClose && creatorSidebarToClose.classList.contains('is-open')) {
          creatorSidebarToClose.classList.remove('is-open');
          creatorSidebarToClose.classList.remove('creator-sidebar-shifted');
        }
        if (notesSidebarToClose && notesSidebarToClose.classList.contains('is-open')) {
            notesSidebarToClose.classList.remove('is-open');
            if(creatorSidebarToClose) creatorSidebarToClose.classList.remove('creator-sidebar-shifted');
        }
        
        if (creatorSidebarToClose && creatorSidebarToClose.classList.contains('is-open')) anySidebarIsOpen = true;
        if (notesSidebarToClose && notesSidebarToClose.classList.contains('is-open')) anySidebarIsOpen = true;

        if (!anySidebarIsOpen) {
            toggleOverlay(false); 
        }
      });
    }
  }

  function toggleOverlay(show) {
    ensureOverlay(); 
    if (overlayElement) {
      if (show) {
        overlayElement.classList.add('is-visible'); 
      } else {
        const creatorSidebar = document.getElementById('db-modal-creator-wrapper-dynamic');
        const notesSidebar = document.getElementById('db-modal-note-wrapper-dynamic');
        const isCreatorOpen = creatorSidebar && creatorSidebar.classList.contains('is-open');
        const isNotesOpen = notesSidebar && notesSidebar.classList.contains('is-open');
        
        if (!isCreatorOpen && !isNotesOpen) {
             overlayElement.classList.remove('is-visible'); 
        }
      }
    }
  }
  window.WEBFLOW_API.ui.toggleOverlay = toggleOverlay;


  function showCreatorSidebar(applicantItem, allJobApplicants, applicantIndex, jobId) {
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS; 

    currentSidebarJobId = jobId;
    currentSidebarApplicants = allJobApplicants;
    currentSidebarIndex = applicantIndex;
    const applicantFieldData = applicantItem.fieldData; 

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

      closeButton.addEventListener('click', () => {
        const wrapperToClose = document.getElementById('db-modal-creator-wrapper-dynamic');
        if (wrapperToClose) {
            wrapperToClose.classList.remove('is-open'); 
            wrapperToClose.classList.remove('creator-sidebar-shifted'); 
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

    const contentArea = document.getElementById('sidebar-creator-content-dynamic');
    contentArea.innerHTML = ''; 

    if (!applicantFieldData) { 
        contentArea.textContent = 'Bewerberdaten nicht verfügbar.';
        const wrapperToShow = document.getElementById('db-modal-creator-wrapper-dynamic');
        if (wrapperToShow) {
            wrapperToShow.classList.add('is-open');
            const notesSidebar = document.getElementById('db-modal-note-wrapper-dynamic');
            if (notesSidebar && notesSidebar.classList.contains('is-open')) {
                wrapperToShow.classList.add('creator-sidebar-shifted');
            } else {
                wrapperToShow.classList.remove('creator-sidebar-shifted');
            }
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

    // Notiz-Button hinzufügen
    const noteButton = document.createElement('div'); 
    noteButton.classList.add('db-button-medium-white-border', 'db-note-button'); 
    noteButton.title = 'Notiz hinzufügen/ansehen';

    const noteIcon = document.createElement('img');
    noteIcon.src = 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/68303f3386647aef733e5d39_note.svg';
    noteIcon.classList.add('db-icon-24');
    noteIcon.alt = 'Notiz';
    noteButton.appendChild(noteIcon);
    actionsWrapper.appendChild(noteButton);

    noteButton.addEventListener('click', (e) => {
        e.stopPropagation(); 
        if (window.WEBFLOW_API.ui.showNotesSidebar) {
            const applicantId = applicantItem.id; // Annahme: applicantItem hat eine 'id'
            const applicantName = applicantFieldData.name || 'Bewerber';
            window.WEBFLOW_API.ui.showNotesSidebar(applicantId, applicantName);
        } else {
            console.error('showNotesSidebar function not found.');
        }
    });

    headlineDiv.appendChild(actionsWrapper); 
    contentArea.appendChild(headlineDiv);

    const additionalDetailsDiv = document.createElement('div');
    additionalDetailsDiv.classList.add('db-modal-additional-details');
    contentArea.appendChild(additionalDetailsDiv); 

    const videoGridContainer = document.createElement('div'); 
    videoGridContainer.classList.add('db-modal-creator-video-grid');
    contentArea.appendChild(videoGridContainer); 

    const numberOfPotentialVideos = 5; 
    for (let i = 0; i < numberOfPotentialVideos; i++) {
        if (window.WEBFLOW_API.ui.createVideoSkeletonElement) { 
            videoGridContainer.appendChild(window.WEBFLOW_API.ui.createVideoSkeletonElement());
        } else if (window.createVideoSkeletonElement) { 
             videoGridContainer.appendChild(window.createVideoSkeletonElement());
        }
    }
    
    setTimeout(() => {
        videoGridContainer.innerHTML = ''; 

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
    }, 0); 


    const prevBtn = document.getElementById('sidebar-prev-applicant');
    const nextBtn = document.getElementById('sidebar-next-applicant');
    if (prevBtn) {
        prevBtn.classList.toggle('disabled', currentSidebarIndex === 0);
    }
    if (nextBtn) {
        nextBtn.classList.toggle('disabled', currentSidebarIndex === currentSidebarApplicants.length - 1);
    }

    const finalCreatorSidebarWrapper = document.getElementById('db-modal-creator-wrapper-dynamic');
    if (finalCreatorSidebarWrapper) {
        finalCreatorSidebarWrapper.classList.add('is-open'); 
        const notesSidebar = document.getElementById('db-modal-note-wrapper-dynamic');
        if (notesSidebar && notesSidebar.classList.contains('is-open')) {
            finalCreatorSidebarWrapper.classList.add('creator-sidebar-shifted');
        } else {
            finalCreatorSidebarWrapper.classList.remove('creator-sidebar-shifted');
        }
        toggleOverlay(true); 
    }
  }
  
  if (!window.WEBFLOW_API.ui.createVideoSkeletonElement) {
    window.WEBFLOW_API.ui.createVideoSkeletonElement = function() {
        const skeletonWrapper = document.createElement('div');
        skeletonWrapper.classList.add('db-modal-video-wrapper', 'skeleton-video-wrapper');
        const skeletonVideo = document.createElement('div');
        skeletonVideo.classList.add('db-modal-video-item', 'skeleton-video-item');
        skeletonWrapper.appendChild(skeletonVideo);
        return skeletonWrapper;
    };
  }

  window.WEBFLOW_API.ui.showCreatorSidebar = showCreatorSidebar; 

})();
