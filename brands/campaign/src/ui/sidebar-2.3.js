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
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS || { creatorTypes: {}, creatorKategorien: {} }; // Stellen Sie sicher, dass MAPPINGS und benötigte Unterobjekte existieren

    currentSidebarJobId = jobId;
    currentSidebarApplicants = allJobApplicants;
    currentSidebarIndex = applicantIndex;
    const applicantFieldData = applicantItem.fieldData;

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

    // Creator Typ und Kategorie mit Mappings auflösen
    const creatorTypeId = applicantFieldData['creator-type']; // ID des Creator-Typs aus den Daten
    const creatorKategorieId = applicantFieldData['creator-kategorie']; // ID der Kategorie aus den Daten

    // Versuche, die Namen aus MAPPINGS zu bekommen, falle zurück auf ID oder "N/A"
    const creatorTypeName = (MAPPINGS.creatorTypes && MAPPINGS.creatorTypes[creatorTypeId]) ? MAPPINGS.creatorTypes[creatorTypeId] : (creatorTypeId || 'N/A');
    const creatorKategorieName = (MAPPINGS.creatorKategorien && MAPPINGS.creatorKategorien[creatorKategorieId]) ? MAPPINGS.creatorKategorien[creatorKategorieId] : (creatorKategorieId || 'N/A');
    
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

    const ueberMichHeadlineDiv = document.createElement('div'); 
    ueberMichHeadlineDiv.classList.add('is-txt-16', 'is-txt-medium', 'text-color-dark'); 
    ueberMichHeadlineDiv.textContent = `Über ${applicantFieldData.name || 'den Creator'}`;
    contentArea.appendChild(ueberMichHeadlineDiv);

    const beschreibungText = applicantFieldData['beschreibung'] || "Keine Beschreibung vorhanden."; 
    const beschreibungPara = document.createElement('p');
    beschreibungPara.textContent = beschreibungText;
    beschreibungPara.classList.add('is-profile-txt'); 
    contentArea.appendChild(beschreibungPara);


    const socialMediaWrapper = document.createElement('div');
    socialMediaWrapper.classList.add('social-media-wrapper');

    const socialPlatforms = [
        { name: 'Instagram', followers: applicantFieldData['instagram-followers'] || 'N/A', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e8d979b71d2a7e5db3_Instagram.svg', link: applicantFieldData['instagram-link'] },
        { name: 'TikTok', followers: applicantFieldData['tiktok-followers'] || 'N/A', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e99dce86c2b6ba83fe_Tiktok.svg', link: applicantFieldData['tiktok-link'] },
        { name: 'YouTube', followers: applicantFieldData['youtube-followers'] || 'N/A', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e9b00d0480ffe289dc_YouTube.svg', link: applicantFieldData['youtube-link'] }
    ];

    socialPlatforms.forEach(platform => {
        if (platform.link || platform.followers !== 'N/A') {
            const platformDiv = document.createElement('div');
            platformDiv.classList.add('social-platform');

            const platformIcon = document.createElement('img');
            platformIcon.src = platform.icon;
            platformIcon.alt = platform.name;
            platformIcon.classList.add('social-icon');
            platformDiv.appendChild(platformIcon);

            const followersSpan = document.createElement('span');
            followersSpan.textContent = platform.followers;
            followersSpan.classList.add('social-followers');
            platformDiv.appendChild(followersSpan);

            if (platform.link) {
                const platformLink = document.createElement('a');
                platformLink.href = window.WEBFLOW_API.utils.normalizeUrl(platform.link);
                platformLink.target = '_blank';
                platformLink.rel = 'noopener noreferrer';
                platformLink.appendChild(platformDiv);
                socialMediaWrapper.appendChild(platformLink);
            } else {
                socialMediaWrapper.appendChild(platformDiv);
            }
        }
    });
    contentArea.appendChild(socialMediaWrapper);


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
      for (let i = 1; i <= numberOfPotentialVideos; i++) {
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
          if (videoUrl.endsWith('.mp4')) sourceElement.type = 'video/mp4';
          else if (videoUrl.endsWith('.webm')) sourceElement.type = 'video/webm';
          else if (videoUrl.endsWith('.ogg')) sourceElement.type = 'video/ogg';
          videoElement.appendChild(sourceElement);

          videoElement.appendChild(document.createTextNode('Ihr Browser unterstützt das Video-Tag nicht.'));
          videoWrapper.appendChild(videoElement);
          videoGridContainer.appendChild(videoWrapper);
        }
      }
      if (!videosFound) {
        const noVideosP = document.createElement('p');
        noVideosP.textContent = 'Keine Videos vorhanden.';
        noVideosP.classList.add('no-videos-message');
        videoGridContainer.appendChild(noVideosP);
      }
    }, 0);

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
    window.WEBFLOW_API.ui.createVideoSkeletonElement = function () {
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
