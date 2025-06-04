// brands/campaign/src/ui/sidebar-3.9.js
(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};
  window.WEBFLOW_API.utils = window.WEBFLOW_API.utils || {};

  let currentSidebarJobId = null;
  let currentSidebarApplicantId = null;
  let currentSidebarApplicants = [];
  let currentSidebarIndex = -1;
  let sidebarWrapperElement = null;
  let favoritButtonElement = null;
  let zusagenButtonElement = null;

  // HTML-Code für den CSS-Spinner (CSS wird jetzt extern erwartet)
  const SPINNER_ICON_HTML = '<span class="button-css-spinner"></span>';
  const SUCCESS_ICON_HTML = '<span class="button-icon-success" style="margin-right: 5px;">✓</span>';
  const ERROR_ICON_HTML = '<span class="button-icon-error" style="margin-right: 5px;">X</span>';

  if (!window.WEBFLOW_API.utils.normalizeUrl) {
    window.WEBFLOW_API.utils.normalizeUrl = function(url) {
      if (!url) return '';
      let trimmedUrl = String(url).trim();
      if (!trimmedUrl) return '';
      if (trimmedUrl.startsWith('//')) return `https:${trimmedUrl}`;
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) return `https://${trimmedUrl}`;
      return trimmedUrl;
    };
  }

  function closeSidebar() {
    if (sidebarWrapperElement && sidebarWrapperElement.classList.contains('is-open')) {
      sidebarWrapperElement.classList.remove('is-open');
      document.body.style.overflow = '';
      if (favoritButtonElement) {
        const newFavoritButton = favoritButtonElement.cloneNode(true);
        favoritButtonElement.parentNode.replaceChild(newFavoritButton, favoritButtonElement);
        favoritButtonElement = null;
      }
      if (zusagenButtonElement) {
        const newZusagenButton = zusagenButtonElement.cloneNode(true);
        zusagenButtonElement.parentNode.replaceChild(newZusagenButton, zusagenButtonElement);
        zusagenButtonElement = null;
      }
    }
  }

  function formatFollowerCount(numStr) {
    const num = parseInt(String(numStr).replace(/[,.]/g, ''), 10);
    if (isNaN(num)) return numStr;
    if (num < 1000) return String(num);
    if (num < 1000000) {
      const thousands = num / 1000;
      return (num < 10000 && thousands % 1 !== 0 ? thousands.toFixed(1) : Math.floor(thousands)) + 'K';
    }
    const millions = num / 1000000;
    return (millions % 1 !== 0 ? millions.toFixed(1) : millions.toFixed(0)) + 'M';
  }

  function setButtonState(button, text, isLoading = false, isSuccess = false, isError = false, isDisabled = false) {
    if (!button) return;
    const buttonTextSpan = button.querySelector('.db-button-text');
    if (!buttonTextSpan) return;
    let prefix = '';
    if (isLoading) {
        // Die Funktion ensureSpinnerStyles() wird nicht mehr hier aufgerufen
        prefix = SPINNER_ICON_HTML;
    }
    else if (isSuccess) prefix = SUCCESS_ICON_HTML;
    else if (isError) prefix = ERROR_ICON_HTML;
    buttonTextSpan.innerHTML = `${prefix}${text}`;
    button.disabled = isDisabled;
    button.classList.toggle('is-disabled-processing', isDisabled);
  }

  function updateFavoriteButtonUI(isFavorite, finalState = true) {
    if (favoritButtonElement) {
      const text = isFavorite ? 'Entfernen' : 'Favorit';
      if (finalState) {
        setButtonState(favoritButtonElement, text, false, false, false, false);
      }
      favoritButtonElement.classList.toggle('is-favorite', isFavorite);
    }
  }

  function updateBookingButtonUI(isBooked, finalState = true) {
    if (zusagenButtonElement) {
      const text = isBooked ? 'Gebucht' : 'Zusagen';
      if (finalState) {
        setButtonState(zusagenButtonElement, text, false, false, false, false);
      }
      zusagenButtonElement.classList.toggle('is-booked', isBooked);
      const buttonTextSpan = zusagenButtonElement.querySelector('.db-button-text');
      if (isBooked) {
        zusagenButtonElement.classList.remove('db-button-medium-gradient-pink');
        zusagenButtonElement.classList.add('db-button-medium-white-border');
        if (buttonTextSpan) buttonTextSpan.classList.remove('white');
      } else {
        zusagenButtonElement.classList.add('db-button-medium-gradient-pink');
        zusagenButtonElement.classList.remove('db-button-medium-white-border');
        if (buttonTextSpan) buttonTextSpan.classList.add('white');
      }
    }
  }

  async function handleFavoriteToggle() {
    if (!currentSidebarJobId || !currentSidebarApplicantId || !favoritButtonElement) return;
    if (!window.WEBFLOW_API.core || !window.WEBFLOW_API.core.favoriteService) return;

    const favoriteService = window.WEBFLOW_API.core.favoriteService;
    const isCurrentlyFavorite = favoriteService.isFavorite(currentSidebarJobId, currentSidebarApplicantId);
    const actionText = isCurrentlyFavorite ? "Wird entfernt..." : "Wird hinzugefügt...";
    setButtonState(favoritButtonElement, actionText, true, false, false, true);

    const newFavoriteStatus = await favoriteService.toggleFavorite(currentSidebarJobId, currentSidebarApplicantId);

    if (newFavoriteStatus !== null) {
      const successText = newFavoriteStatus ? "Gespeichert!" : "Entfernt!";
      setButtonState(favoritButtonElement, successText, false, true, false, true);
      setTimeout(() => {
        updateFavoriteButtonUI(newFavoriteStatus, true);
      }, 1500);
    } else {
      setButtonState(favoritButtonElement, "Fehler!", false, false, true, true);
      setTimeout(() => {
        updateFavoriteButtonUI(isCurrentlyFavorite, true);
      }, 1500);
    }
  }

  async function handleBookingToggle() {
    if (!currentSidebarJobId || !currentSidebarApplicantId || !zusagenButtonElement) return;
    if (!window.WEBFLOW_API.core || !window.WEBFLOW_API.core.bookingService) return;

    const bookingService = window.WEBFLOW_API.core.bookingService;
    const isCurrentlyBooked = bookingService.isBooked(currentSidebarJobId, currentSidebarApplicantId);
    const actionText = isCurrentlyBooked ? "Buchung storniert..." : "Wird gebucht...";
    setButtonState(zusagenButtonElement, actionText, true, false, false, true);

    const newBookingStatus = await bookingService.toggleBooking(currentSidebarJobId, currentSidebarApplicantId);

    if (newBookingStatus !== null) {
      const successText = newBookingStatus ? "Gebucht!" : "Storniert!";
      setButtonState(zusagenButtonElement, successText, false, true, false, true);
      setTimeout(() => {
        updateBookingButtonUI(newBookingStatus, true);
      }, 1500);
    } else {
      setButtonState(zusagenButtonElement, "Fehler!", false, false, true, true);
      setTimeout(() => {
        updateBookingButtonUI(isCurrentlyBooked, true);
      }, 1500);
    }
  }

  async function showCreatorSidebar(applicantItem, allJobApplicants, applicantIndex, jobId) {
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS || {};
    const creatorTypesMapping = MAPPINGS.creatorTypen || {};
    const creatorKategorienMapping = MAPPINGS.creatorKategorien || {};
    const cache = window.WEBFLOW_API.cache;
    const webflowService = window.WEBFLOW_API.services;
    const config = window.WEBFLOW_API.config;

    currentSidebarJobId = jobId;
    currentSidebarApplicants = allJobApplicants;
    currentSidebarIndex = applicantIndex;
    const applicantFieldData = applicantItem.fieldData;
    currentSidebarApplicantId = applicantFieldData['webflow-member-id'];

    if (!currentSidebarApplicantId) {
        console.error("showCreatorSidebar: Konnte 'webflow-member-id' des Bewerbers nicht finden.");
    }

    if (cache && webflowService && config) {
        let jobCacheEntry = cache.getJobDataFromCache(jobId);
        if (!jobCacheEntry.jobDetails || !jobCacheEntry.jobDetails.fieldData) {
            console.log(`showCreatorSidebar: Job-Details für Job ${jobId} nicht vollständig im Cache. Lade nach...`);
            const fetchedJob = await webflowService.fetchWebflowItem(config.JOB_COLLECTION_ID_MJ, jobId);
            if (fetchedJob && !fetchedJob.error && fetchedJob.fieldData) {
                cache.updateJobCacheWithJobDetails(jobId, fetchedJob);
                console.log(`showCreatorSidebar: Job-Details für Job ${jobId} nachgeladen und im Cache aktualisiert.`);
            } else {
                console.error(`showCreatorSidebar: Konnte Job-Details für Job ${jobId} nicht nachladen.`);
            }
        }
    }

    sidebarWrapperElement = document.getElementById('db-modal-creator-wrapper-dynamic');
    if (!sidebarWrapperElement) {
      sidebarWrapperElement = document.createElement('div');
      sidebarWrapperElement.id = 'db-modal-creator-wrapper-dynamic';
      sidebarWrapperElement.classList.add('db-modal-creator-wrapper');
      document.body.appendChild(sidebarWrapperElement);
    }
    sidebarWrapperElement.innerHTML = '';

    const creatorHeadlineOverallDiv = document.createElement('div');
    creatorHeadlineOverallDiv.classList.add('db-modal-creator-headline');
    const imgNameTypeWrapper = document.createElement('div');
    imgNameTypeWrapper.classList.add('db-modal-creator-img-name-type-wrapper');
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
    imgNameTypeWrapper.appendChild(imgWrapperDiv);
    const creatorInfoFlexDiv = document.createElement('div');
    creatorInfoFlexDiv.classList.add('is-flexbox-vertical');
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('db-modal-headline');
    nameSpan.textContent = applicantFieldData.name || 'Unbekannter Creator';
    creatorInfoFlexDiv.appendChild(nameSpan);
    const creatorTypeId = applicantFieldData['creator-type'];
    const creatorKategorieId = applicantFieldData['creator-kategorie'];
    const creatorTypeName = creatorTypesMapping[creatorTypeId] || creatorTypeId || 'N/A';
    const creatorKategorieName = creatorKategorienMapping[creatorKategorieId] || creatorKategorieId || 'N/A';
    let typeAndCategoryText = '';
    if (creatorTypeName !== 'N/A' && creatorKategorieName !== 'N/A' && creatorTypeName !== creatorKategorieName) {
      typeAndCategoryText = `${creatorTypeName} - ${creatorKategorieName}`;
    } else if (creatorTypeName !== 'N/A') {
      typeAndCategoryText = creatorTypeName;
    } else if (creatorKategorieName !== 'N/A') {
      typeAndCategoryText = creatorKategorieName;
    }
    if (typeAndCategoryText) {
      const kategorieP = document.createElement('p');
      kategorieP.classList.add('is-txt-16');
      kategorieP.textContent = typeAndCategoryText;
      creatorInfoFlexDiv.appendChild(kategorieP);
    }
    imgNameTypeWrapper.appendChild(creatorInfoFlexDiv);
    creatorHeadlineOverallDiv.appendChild(imgNameTypeWrapper);

    const headlineActionsWrapper = document.createElement('div');
    headlineActionsWrapper.classList.add('db-modal-creator-headline-actions');

    zusagenButtonElement = document.createElement('a');
    zusagenButtonElement.href = '#';
    zusagenButtonElement.id = 'sidebar-zusagen-button';
    zusagenButtonElement.classList.add('db-button-medium-gradient-pink', 'size-auto');
    const zusagenButtonTextSpan = document.createElement('span');
    zusagenButtonTextSpan.classList.add('db-button-text', 'white');
    zusagenButtonElement.appendChild(zusagenButtonTextSpan);
    headlineActionsWrapper.appendChild(zusagenButtonElement);
    zusagenButtonElement.addEventListener('click', (e) => { e.preventDefault(); handleBookingToggle(); });
    if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.bookingService && currentSidebarJobId && currentSidebarApplicantId) {
      const isCurrentlyBooked = window.WEBFLOW_API.core.bookingService.isBooked(currentSidebarJobId, currentSidebarApplicantId);
      updateBookingButtonUI(isCurrentlyBooked, true);
    } else {
      updateBookingButtonUI(false, true);
    }

    favoritButtonElement = document.createElement('a');
    favoritButtonElement.href = '#';
    favoritButtonElement.id = 'sidebar-favorit-button';
    favoritButtonElement.classList.add('db-button-medium-white-border', 'size-auto');
    const favoritButtonTextSpan = document.createElement('span');
    favoritButtonTextSpan.classList.add('db-button-text');
    favoritButtonElement.appendChild(favoritButtonTextSpan);
    headlineActionsWrapper.appendChild(favoritButtonElement);
    favoritButtonElement.addEventListener('click', (e) => { e.preventDefault(); handleFavoriteToggle(); });
    if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.favoriteService && currentSidebarJobId && currentSidebarApplicantId) {
      const isCurrentlyFavorite = window.WEBFLOW_API.core.favoriteService.isFavorite(currentSidebarJobId, currentSidebarApplicantId);
      updateFavoriteButtonUI(isCurrentlyFavorite, true);
    } else {
      updateFavoriteButtonUI(false, true);
    }
    
    creatorHeadlineOverallDiv.appendChild(headlineActionsWrapper);
    const closeButtonElement = document.createElement('div');
    closeButtonElement.classList.add('db-modal-close-button');
    closeButtonElement.innerHTML = '&times;';
    closeButtonElement.title = 'Schließen';
    closeButtonElement.addEventListener('click', closeSidebar);
    creatorHeadlineOverallDiv.appendChild(closeButtonElement);
    sidebarWrapperElement.appendChild(creatorHeadlineOverallDiv);

    const contentArea = document.createElement('div');
    contentArea.classList.add('db-modal-creator-content');
    contentArea.id = 'sidebar-creator-content-dynamic';
    sidebarWrapperElement.appendChild(contentArea);
    const socialMediaDetailsWrapper = document.createElement('div');
    socialMediaDetailsWrapper.classList.add('db-modal-creator-details');
    const socialMediaHeadline = document.createElement('div');
    socialMediaHeadline.classList.add('is-txt-16', 'is-txt-medium', 'text-color-dark');
    socialMediaHeadline.textContent = 'Social Media';
    socialMediaDetailsWrapper.appendChild(socialMediaHeadline);
    const socialMediaOuterWrapper = document.createElement('div');
    socialMediaOuterWrapper.classList.add('db-profile-social');
    const socialPlatforms = [
        { name: 'Instagram', id: 'instagram', followersKey: 'creator-follower-instagram', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e8d979b71d2a7e5db3_Instagram.svg', linkKey: 'instagram' },
        { name: 'TikTok', id: 'tiktok', followersKey: 'creator-follower-tiktok', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e99dce86c2b6ba83fe_Tiktok.svg', linkKey: 'tiktok' },
        { name: 'YouTube', id: 'youtube', followersKey: 'creator-follower-youtube', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e9b00d0480ffe289dc_YouTube.svg', linkKey: 'youtube' }
    ];
    let hasSocialContent = false;
    socialPlatforms.forEach(platform => {
        const followersRaw = applicantFieldData[platform.followersKey];
        const link = applicantFieldData[platform.linkKey];
        const followersFormatted = formatFollowerCount(followersRaw);
        if (link || (followersRaw && followersFormatted !== 'N/A' && String(followersRaw).trim() !== '')) {
            hasSocialContent = true;
            let platformElement;
            const innerPlatformDiv = document.createElement('div');
            innerPlatformDiv.classList.add('social-platform-item-content');
            const iconWrapper = document.createElement('div');
            iconWrapper.classList.add('db-card-icon-wrapper', 'round');
            const platformIcon = document.createElement('img');
            platformIcon.src = platform.icon;
            platformIcon.alt = platform.name;
            platformIcon.classList.add('db-icon-24');
            iconWrapper.appendChild(platformIcon);
            innerPlatformDiv.appendChild(iconWrapper);
            if (followersRaw && followersFormatted !== 'N/A' && String(followersRaw).trim() !== '') {
                const followersSpan = document.createElement('span');
                followersSpan.textContent = followersFormatted;
                followersSpan.classList.add('is-txt-16', 'is-txt-medium', 'social-followers');
                innerPlatformDiv.appendChild(followersSpan);
            }
            if (link) {
                platformElement = document.createElement('a');
                platformElement.href = window.WEBFLOW_API.utils.normalizeUrl(link);
                platformElement.target = '_blank';
                platformElement.rel = 'noopener noreferrer';
                platformElement.appendChild(innerPlatformDiv);
            } else {
                platformElement = innerPlatformDiv;
            }
            platformElement.classList.add('social-platform-item', `social-platform-${platform.id}`);
            socialMediaOuterWrapper.appendChild(platformElement);
        }
    });
    if (hasSocialContent) {
        socialMediaDetailsWrapper.appendChild(socialMediaOuterWrapper);
        contentArea.appendChild(socialMediaDetailsWrapper);
    }

    const mainVideoPlayerWrapper = document.createElement('div');
    mainVideoPlayerWrapper.classList.add('db-modal-video-wrapper');
    contentArea.appendChild(mainVideoPlayerWrapper);
    const mainVideoElement = document.createElement('video');
    mainVideoElement.id = 'main-creator-video-player';
    mainVideoElement.controls = true;
    mainVideoElement.preload = 'metadata';
    mainVideoElement.classList.add('db-modal-video-item');
    mainVideoPlayerWrapper.appendChild(mainVideoElement);
    const thumbnailGridContainer = document.createElement('div');
    thumbnailGridContainer.classList.add('db-modal-creator-video-grid-thumbnail');
    contentArea.appendChild(thumbnailGridContainer);
    const noVideosMessageP = document.createElement('p');
    noVideosMessageP.textContent = 'Keine Videos vorhanden.';
    noVideosMessageP.classList.add('no-videos-message');
    noVideosMessageP.style.display = 'none';
    contentArea.appendChild(noVideosMessageP);
    const numberOfPotentialVideos = 5;
    let videoUrls = [];
    for (let i = 1; i <= numberOfPotentialVideos; i++) {
        const videoLinkField = `creator-video-link-${i}`;
        const videoUrl = applicantFieldData[videoLinkField];
        if (videoUrl && typeof videoUrl === 'string' && videoUrl.trim() !== '') {
            videoUrls.push(window.WEBFLOW_API.utils.normalizeUrl(videoUrl));
        }
    }
    thumbnailGridContainer.innerHTML = '';
    if (videoUrls.length > 0) {
        mainVideoPlayerWrapper.style.display = '';
        thumbnailGridContainer.style.display = '';
        noVideosMessageP.style.display = 'none';
        mainVideoElement.innerHTML = '';
        const mainSourceElement = document.createElement('source');
        mainSourceElement.src = videoUrls[0];
        if (videoUrls[0].endsWith('.mp4')) mainSourceElement.type = 'video/mp4';
        mainVideoElement.appendChild(mainSourceElement);
        mainVideoElement.appendChild(document.createTextNode('Ihr Browser unterstützt das Video-Tag nicht.'));
        mainVideoElement.load();
        videoUrls.forEach(url => {
            const thumbnailWrapper = document.createElement('div');
            thumbnailWrapper.classList.add('db-modal-video-thumbnail');
            thumbnailWrapper.dataset.videoSrc = url;
            const thumbnailVideoElement = document.createElement('video');
            thumbnailVideoElement.classList.add('db-modal-video-thumbnail-visual');
            thumbnailVideoElement.src = url;
            thumbnailVideoElement.preload = "metadata";
            thumbnailVideoElement.muted = true;
            thumbnailVideoElement.playsInline = true;
            thumbnailWrapper.appendChild(thumbnailVideoElement);
            thumbnailGridContainer.appendChild(thumbnailWrapper);
            thumbnailWrapper.addEventListener('click', function() {
                const newSrc = this.dataset.videoSrc;
                mainVideoElement.innerHTML = '';
                const newMainSourceElement = document.createElement('source');
                newMainSourceElement.src = newSrc;
                if (newSrc.endsWith('.mp4')) newMainSourceElement.type = 'video/mp4';
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
    
    const bottomNavControlsWrapper = document.createElement('div');
    bottomNavControlsWrapper.classList.add('db-modal-creator-controls');
    const navButtonsWrapperBottom = document.createElement('div');
    navButtonsWrapperBottom.classList.add('db-modal-control-buttons', 'bottom-nav');
    const prevButtonBottom = document.createElement('div');
    prevButtonBottom.classList.add('db-modal-prev');
    prevButtonBottom.id = 'sidebar-prev-applicant-bottom';
    prevButtonBottom.textContent = 'Zurück';
    prevButtonBottom.title = "Vorheriger Creator";
    navButtonsWrapperBottom.appendChild(prevButtonBottom);
    const nextButtonBottom = document.createElement('div');
    nextButtonBottom.classList.add('db-modal-next');
    nextButtonBottom.id = 'sidebar-next-applicant-bottom';
    nextButtonBottom.textContent = 'Weiter';
    nextButtonBottom.title = "Nächster Creator";
    navButtonsWrapperBottom.appendChild(nextButtonBottom);
    bottomNavControlsWrapper.appendChild(navButtonsWrapperBottom);
    sidebarWrapperElement.appendChild(bottomNavControlsWrapper);
    prevButtonBottom.addEventListener('click', navigatePrev);
    nextButtonBottom.addEventListener('click', navigateNext);
    prevButtonBottom.classList.toggle('disabled', currentSidebarIndex === 0);
    nextButtonBottom.classList.toggle('disabled', currentSidebarIndex === currentSidebarApplicants.length - 1);
    
    sidebarWrapperElement.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  async function navigatePrev() {
    if (currentSidebarIndex > 0) {
      await showCreatorSidebar(currentSidebarApplicants[currentSidebarIndex - 1], currentSidebarApplicants, currentSidebarIndex - 1, currentSidebarJobId);
    }
  }

  async function navigateNext() {
    if (currentSidebarIndex < currentSidebarApplicants.length - 1) {
      await showCreatorSidebar(currentSidebarApplicants[currentSidebarIndex + 1], currentSidebarApplicants, currentSidebarIndex + 1, currentSidebarJobId);
    }
  }

  document.addEventListener('keydown', function(event) {
    if (sidebarWrapperElement && sidebarWrapperElement.classList.contains('is-open')) {
      if (event.key === 'ArrowLeft') { event.preventDefault(); navigatePrev(); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); navigateNext(); }
      else if (event.key === 'Escape') { event.preventDefault(); closeSidebar(); }
    }
  });
  
  if (!window.WEBFLOW_API.ui.createVideoSkeletonElement) {
    window.WEBFLOW_API.ui.createVideoSkeletonElement = function () {
      const skeletonWrapper = document.createElement('div');
      skeletonWrapper.classList.add('video-skeleton-placeholder'); 
      skeletonWrapper.style.width = '100px'; 
      skeletonWrapper.style.height = '70px'; 
      skeletonWrapper.style.backgroundColor = '#e0e0e0';
      skeletonWrapper.style.margin = '5px'; 
      return skeletonWrapper;
    };
  }
  
  document.addEventListener('bookingUpdated', function(event) {
    const { jobId, applicantId, isBooked } = event.detail;
    if (sidebarWrapperElement && sidebarWrapperElement.classList.contains('is-open') &&
        currentSidebarJobId === jobId && currentSidebarApplicantId === applicantId) {
      updateBookingButtonUI(isBooked, true);
    }
  });

  document.addEventListener('favoritesUpdated', function(event) {
    const { jobId, applicantId, isFavorite } = event.detail;
     if (sidebarWrapperElement && sidebarWrapperElement.classList.contains('is-open') &&
        currentSidebarJobId === jobId && currentSidebarApplicantId === applicantId) {
      updateFavoriteButtonUI(isFavorite, true);
    }
  });

  window.WEBFLOW_API.ui.showCreatorSidebar = showCreatorSidebar;
  console.log("Sidebar UI (sidebar-3.9.js) wurde aktualisiert (CSS-Spinner entfernt).");
})();
