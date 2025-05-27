(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};
  window.WEBFLOW_API.utils = window.WEBFLOW_API.utils || {}; // Ensure utils namespace exists

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
        let anySidebarIsOpen = false;

        if (creatorSidebarToClose && creatorSidebarToClose.classList.contains('is-open')) {
          creatorSidebarToClose.classList.remove('is-open');
        }

        const isCreatorStillOpen = creatorSidebarToClose && creatorSidebarToClose.classList.contains('is-open');
        anySidebarIsOpen = isCreatorStillOpen;

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
        const isCreatorOpen = creatorSidebar && creatorSidebar.classList.contains('is-open');

        if (!isCreatorOpen) {
          overlayElement.classList.remove('is-visible');
        }
      }
    }
  }
  window.WEBFLOW_API.ui.toggleOverlay = toggleOverlay;

  if (!window.WEBFLOW_API.utils.normalizeUrl) {
    window.WEBFLOW_API.utils.normalizeUrl = function(url) {
      if (!url) return '';
      if (url.startsWith('//')) {
        return `https:${url}`;
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
      }
      return url;
    };
  }


  function showCreatorSidebar(applicantItem, allJobApplicants, applicantIndex, jobId) {
    console.log("showCreatorSidebar called. MAPPINGS:", JSON.parse(JSON.stringify(window.WEBFLOW_API.MAPPINGS || {})));
    
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS || {};
    const creatorTypesMapping = MAPPINGS.creatorTypes || {};
    const creatorKategorienMapping = MAPPINGS.creatorKategorien || {};

    currentSidebarJobId = jobId;
    currentSidebarApplicants = allJobApplicants;
    currentSidebarIndex = applicantIndex;
    const applicantFieldData = applicantItem.fieldData;

    console.log("Applicant Field Data:", JSON.parse(JSON.stringify(applicantFieldData || {})));


    let sidebarWrapper = document.getElementById('db-modal-creator-wrapper-dynamic');
    if (!sidebarWrapper) {
      sidebarWrapper = document.createElement('div');
      sidebarWrapper.id = 'db-modal-creator-wrapper-dynamic';
      sidebarWrapper.classList.add('db-modal-creator-wrapper');
      document.body.appendChild(sidebarWrapper);
    }
    sidebarWrapper.innerHTML = '';


    const creatorHeadlineOverallDiv = document.createElement('div');
    creatorHeadlineOverallDiv.classList.add('db-modal-creator-headline');

    const imgWrapperDiv = document.createElement('div');
    imgWrapperDiv.classList.add('db-modal-creator-img-wrapper');

    const profileImageField = applicantFieldData["image-thumbnail-small-92px"] || applicantFieldData["user-profile-img"];
    if (profileImageField) {
      const profileImg = document.createElement('img');
      profileImg.classList.add('db-table-img', 'medium');
      profileImg.src = typeof profileImageField === 'string' ? profileImageField : (profileImageField?.url || 'https://placehold.co/80x80/E0E0E0/BDBDBD?text=Bild');
      profileImg.alt = applicantFieldData.name || "Creator Bild";
      profileImg.onerror = () => { profileImg.src = 'https://placehold.co/80x80/E0E0E0/BDBDBD?text=Fehler'; };
      imgWrapperDiv.appendChild(profileImg);
    }

    const creatorInfoDiv = document.createElement('div');
    creatorInfoDiv.classList.add('db-modal-headline');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = applicantFieldData.name || 'Unbekannter Creator';
    creatorInfoDiv.appendChild(nameSpan);

    const creatorTypeId = applicantFieldData['creator-type']; 
    const creatorKategorieId = applicantFieldData['creator-kategorie']; 
    
    console.log("Creator Type ID from data:", creatorTypeId);
    console.log("Creator Kategorie ID from data:", creatorKategorieId);
    console.log("Available Creator Types in MAPPINGS:", JSON.parse(JSON.stringify(creatorTypesMapping)));
    console.log("Available Creator Kategorien in MAPPINGS:", JSON.parse(JSON.stringify(creatorKategorienMapping)));


    const creatorTypeName = creatorTypesMapping[creatorTypeId] || creatorTypeId || 'N/A';
    const creatorKategorieName = creatorKategorienMapping[creatorKategorieId] || creatorKategorieId || 'N/A';
    
    console.log("Resolved Creator Type Name:", creatorTypeName);
    console.log("Resolved Creator Kategorie Name:", creatorKategorieName);

    const typeCategoryP = document.createElement('p');
    typeCategoryP.classList.add('is-txt-16');
    typeCategoryP.textContent = `${creatorTypeName} - ${creatorKategorieName}`;
    creatorInfoDiv.appendChild(typeCategoryP);

    imgWrapperDiv.appendChild(creatorInfoDiv);
    creatorHeadlineOverallDiv.appendChild(imgWrapperDiv);

    const zusagenButton = document.createElement('button');
    zusagenButton.classList.add('db-button-medium-gradient-pink', 'size-auto');
    zusagenButton.textContent = '+ Zusagen';
    creatorHeadlineOverallDiv.appendChild(zusagenButton);

    sidebarWrapper.appendChild(creatorHeadlineOverallDiv);


    const sidebarControls = document.createElement('div');
    sidebarControls.classList.add('db-modal-creator-controls');

    const navButtonsWrapper = document.createElement('div');
    navButtonsWrapper.classList.add('db-modal-control-buttons');

    const prevButton = document.createElement('div');
    prevButton.classList.add('db-modal-prev');
    prevButton.id = 'sidebar-prev-applicant';
    prevButton.textContent = 'Zurück';
    prevButton.title = "Vorheriger Creator";
    navButtonsWrapper.appendChild(prevButton);

    const nextButton = document.createElement('div');
    nextButton.classList.add('db-modal-next');
    nextButton.id = 'sidebar-next-applicant';
    nextButton.textContent = 'Weiter';
    nextButton.title = "Nächster Creator";
    navButtonsWrapper.appendChild(nextButton);

    const helpButton = document.createElement('div');
    helpButton.classList.add('db-modal-help');
    helpButton.textContent = 'Hilfe';
    sidebarControls.appendChild(helpButton);
    sidebarControls.appendChild(navButtonsWrapper);

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


    const contentArea = document.createElement('div');
    contentArea.classList.add('db-modal-creator-content');
    contentArea.id = 'sidebar-creator-content-dynamic';
    sidebarWrapper.appendChild(contentArea);

    if (!applicantFieldData) {
      contentArea.textContent = 'Creator-Daten nicht verfügbar.';
      const wrapperToShow = document.getElementById('db-modal-creator-wrapper-dynamic');
      if (wrapperToShow) {
        wrapperToShow.classList.add('is-open');
        toggleOverlay(true);
      }
      return;
    }

    const creatorDetailsDiv = document.createElement('div');
    creatorDetailsDiv.classList.add('db-modal-creator-details');

    const ueberMichHeadlineDiv = document.createElement('div'); 
    ueberMichHeadlineDiv.classList.add('is-txt-16', 'is-txt-medium', 'text-color-dark'); 
    ueberMichHeadlineDiv.textContent = `Über ${applicantFieldData.name || 'den Creator'}`;
    creatorDetailsDiv.appendChild(ueberMichHeadlineDiv); 

    const beschreibungText = applicantFieldData['beschreibung'] || "Keine Beschreibung vorhanden."; 
    const beschreibungPara = document.createElement('p');
    beschreibungPara.textContent = beschreibungText;
    beschreibungPara.classList.add('db-profile-user-bio'); 
    creatorDetailsDiv.appendChild(beschreibungPara); 

    contentArea.appendChild(creatorDetailsDiv); 


    const socialMediaWrapper = document.createElement('div');
    socialMediaWrapper.classList.add('social-media-wrapper'); 

    const socialPlatforms = [
        { name: 'Instagram', id: 'instagram', followersKey: 'instagram-followers', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e8d979b71d2a7e5db3_Instagram.svg', linkKey: 'instagram-link' },
        { name: 'TikTok', id: 'tiktok', followersKey: 'tiktok-followers', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e99dce86c2b6ba83fe_Tiktok.svg', linkKey: 'tiktok-link' },
        { name: 'YouTube', id: 'youtube', followersKey: 'youtube-followers', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e9b00d0480ffe289dc_YouTube.svg', linkKey: 'youtube-link' }
    ];
    
    let hasSocialContent = false; 

    socialPlatforms.forEach(platform => {
        const followers = applicantFieldData[platform.followersKey] || 'N/A';
        const link = applicantFieldData[platform.linkKey];

        if (link || (followers && followers !== 'N/A')) {
            hasSocialContent = true; 
            const platformDiv = document.createElement('div');
            platformDiv.classList.add('social-platform', `social-platform-${platform.id}`);

            const platformIcon = document.createElement('img');
            platformIcon.src = platform.icon;
            platformIcon.alt = platform.name;
            platformIcon.classList.add('social-icon');
            platformDiv.appendChild(platformIcon);

            if (followers && followers !== 'N/A') {
                const followersSpan = document.createElement('span');
                followersSpan.textContent = followers;
                followersSpan.classList.add('social-followers');
                platformDiv.appendChild(followersSpan);
            }

            if (link) {
                const platformLink = document.createElement('a');
                platformLink.href = window.WEBFLOW_API.utils.normalizeUrl(link);
                platformLink.target = '_blank';
                platformLink.rel = 'noopener noreferrer';
                platformLink.appendChild(platformDiv);
                socialMediaWrapper.appendChild(platformLink);
            } else {
                socialMediaWrapper.appendChild(platformDiv); 
            }
        }
    });
    
    if (hasSocialContent) {
        contentArea.appendChild(socialMediaWrapper);
    }

    // --- ANGEPASSTER VIDEOBEREICH ---
    const mainVideoPlayerWrapper = document.createElement('div');
    mainVideoPlayerWrapper.classList.add('db-modal-video-wrapper'); // Wrapper für Hauptvideo
    contentArea.appendChild(mainVideoPlayerWrapper);

    const mainVideoElement = document.createElement('video');
    mainVideoElement.id = 'main-creator-video-player'; // Eindeutige ID für den Hauptplayer
    mainVideoElement.controls = true;
    mainVideoElement.preload = 'metadata';
    mainVideoElement.classList.add('db-modal-video-item'); // Styling für das Hauptvideo-Element
    mainVideoPlayerWrapper.appendChild(mainVideoElement);

    const thumbnailGridContainer = document.createElement('div');
    thumbnailGridContainer.classList.add('db-modal-creator-video-grid-thumbnail'); // Wrapper für Thumbnails
    contentArea.appendChild(thumbnailGridContainer);

    const noVideosMessageP = document.createElement('p');
    noVideosMessageP.textContent = 'Keine Videos vorhanden.';
    noVideosMessageP.classList.add('no-videos-message'); // Für Styling, falls keine Videos da sind
    noVideosMessageP.style.display = 'none'; // Standardmäßig ausblenden
    contentArea.appendChild(noVideosMessageP); // Einmal hinzufügen, dann Sichtbarkeit steuern

    const numberOfPotentialVideos = 5; // Max. Anzahl zu prüfender Video-Links

    setTimeout(() => {
        let videoUrls = [];
        for (let i = 1; i <= numberOfPotentialVideos; i++) {
            const videoLinkField = `creator-video-link-${i}`;
            const videoUrl = applicantFieldData[videoLinkField];
            if (videoUrl && typeof videoUrl === 'string' && videoUrl.trim() !== '') {
                videoUrls.push(window.WEBFLOW_API.utils.normalizeUrl(videoUrl));
            }
        }

        thumbnailGridContainer.innerHTML = ''; // Vorherige Thumbnails löschen

        if (videoUrls.length > 0) {
            mainVideoPlayerWrapper.style.display = '';
            thumbnailGridContainer.style.display = ''; // Ggf. anpassen, falls es ein Grid-Layout ist
            noVideosMessageP.style.display = 'none';

            // Erstes Video in den Hauptplayer laden
            mainVideoElement.innerHTML = ''; // Alte Quellen entfernen
            const mainSourceElement = document.createElement('source');
            mainSourceElement.src = videoUrls[0];
            if (videoUrls[0].endsWith('.mp4')) mainSourceElement.type = 'video/mp4';
            // Weitere Typen hier hinzufügen, falls nötig
            mainVideoElement.appendChild(mainSourceElement);
            mainVideoElement.appendChild(document.createTextNode('Ihr Browser unterstützt das Video-Tag nicht.'));
            mainVideoElement.load();
            // mainVideoElement.play().catch(e => console.warn("Autoplay prevented for main video:", e)); // Optional: Autoplay versuchen

            // Thumbnails erstellen
            videoUrls.forEach(url => {
                const thumbnailWrapper = document.createElement('div');
                thumbnailWrapper.classList.add('db-modal-video-thumbnail'); // Klickbares Thumbnail-Element
                thumbnailWrapper.dataset.videoSrc = url; // Video-URL für Klick-Event speichern

                const thumbnailVideoElement = document.createElement('video');
                // Klasse für das reine Video-Element im Thumbnail (für Styling)
                thumbnailVideoElement.classList.add('db-modal-video-thumbnail-visual'); 
                thumbnailVideoElement.src = url; // Setze src direkt für das Thumbnail-Video
                thumbnailVideoElement.preload = "metadata";
                thumbnailVideoElement.muted = true;
                thumbnailVideoElement.playsInline = true; // Wichtig für mobile Browser
                // Keine Controls für Thumbnails

                // Optional: Poster für Thumbnail, falls verfügbar
                // const posterUrl = applicantFieldData[`creator-video-thumbnail-${i}`]; // Annahme
                // if(posterUrl) thumbnailVideoElement.poster = posterUrl;
                
                thumbnailWrapper.appendChild(thumbnailVideoElement);
                thumbnailGridContainer.appendChild(thumbnailWrapper);

                thumbnailWrapper.addEventListener('click', function() {
                    const newSrc = this.dataset.videoSrc;
                    mainVideoElement.innerHTML = ''; // Alte Quellen entfernen
                    const newMainSourceElement = document.createElement('source');
                    newMainSourceElement.src = newSrc;
                    if (newSrc.endsWith('.mp4')) newMainSourceElement.type = 'video/mp4';
                     // Weitere Typen hier hinzufügen, falls nötig
                    mainVideoElement.appendChild(newMainSourceElement);
                    mainVideoElement.appendChild(document.createTextNode('Ihr Browser unterstützt das Video-Tag nicht.'));
                    mainVideoElement.load();
                    mainVideoElement.play().catch(error => console.error("Error attempting to play video:", error));
                });
            });

        } else {
            mainVideoPlayerWrapper.style.display = 'none';
            thumbnailGridContainer.style.display = 'none';
            noVideosMessageP.style.display = '';
        }
    }, 0);
    // --- ENDE ANGEPASSTER VIDEOBEREICH ---


    sidebarWrapper.appendChild(sidebarControls);

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
      toggleOverlay(true);
    }
  }

  if (!window.WEBFLOW_API.ui.createVideoSkeletonElement) {
    // Diese Funktion wird in der neuen Logik nicht direkt für Thumbnails verwendet,
    // könnte aber nützlich sein, wenn man Skeletons für die Thumbnails anzeigen möchte,
    // bevor die Videos geladen werden. Fürs Erste ist sie nicht aktiv im Thumbnail-Prozess.
    window.WEBFLOW_API.ui.createVideoSkeletonElement = function () {
      const skeletonWrapper = document.createElement('div');
      // Passen Sie die Klassen an, wenn Sie es für Thumbnails verwenden
      skeletonWrapper.classList.add('db-modal-video-wrapper', 'skeleton-video-wrapper'); 
      const skeletonVideo = document.createElement('div');
      skeletonVideo.classList.add('db-modal-video-item', 'skeleton-video-item');
      skeletonWrapper.appendChild(skeletonVideo);
      return skeletonWrapper;
    };
  }
  
  window.WEBFLOW_API.ui.showCreatorSidebar = showCreatorSidebar;

})();
