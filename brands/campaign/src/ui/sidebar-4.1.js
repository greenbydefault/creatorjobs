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
  let zusagenButtonElement = null; // Referenz zum Zusagen-Button

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
      // Event-Listener vom Zusagen-Button entfernen
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

  function updateFavoriteButtonUI(isFavorite) {
    if (favoritButtonElement) {
      const favoritButtonText = favoritButtonElement.querySelector('.db-button-text');
      if (favoritButtonText) {
        favoritButtonText.textContent = isFavorite ? 'Entfernen' : 'Favorit';
      }
      favoritButtonElement.classList.toggle('is-favorite', isFavorite);
    }
  }

  /**
   * Aktualisiert den Zusagen-Button in der Sidebar.
   * @param {boolean} isBooked - True, wenn der Creator gebucht ist.
   */
  function updateBookingButtonUI(isBooked) {
    if (zusagenButtonElement) {
      const zusagenButtonText = zusagenButtonElement.querySelector('.db-button-text');
      if (zusagenButtonText) {
        zusagenButtonText.textContent = isBooked ? 'Gebucht' : 'Zusagen';
      }
      // Optional: Klassen für unterschiedliches Styling
      zusagenButtonElement.classList.toggle('is-booked', isBooked);
      // Wenn gebucht, vielleicht andere Farbe oder Icon
      if (isBooked) {
        zusagenButtonElement.classList.remove('db-button-medium-gradient-pink');
        zusagenButtonElement.classList.add('db-button-medium-white-border'); // Beispiel für gebuchten Zustand
        if(zusagenButtonText) zusagenButtonText.classList.remove('white');
      } else {
        zusagenButtonElement.classList.add('db-button-medium-gradient-pink');
        zusagenButtonElement.classList.remove('db-button-medium-white-border');
        if(zusagenButtonText) zusagenButtonText.classList.add('white');
      }
    }
  }

  async function handleFavoriteToggle() {
    if (!currentSidebarJobId || !currentSidebarApplicantId) return;
    if (!window.WEBFLOW_API.core || !window.WEBFLOW_API.core.favoriteService) return;
    if (favoritButtonElement) favoritButtonElement.disabled = true;
    const newFavoriteStatus = await window.WEBFLOW_API.core.favoriteService.toggleFavorite(currentSidebarJobId, currentSidebarApplicantId);
    if (newFavoriteStatus !== null) updateFavoriteButtonUI(newFavoriteStatus);
    else alert('Fehler beim Aktualisieren des Favoritenstatus.');
    if (favoritButtonElement) favoritButtonElement.disabled = false;
  }

  /**
   * Behandelt den Klick auf den Zusagen-Button.
   */
  async function handleBookingToggle() {
    if (!currentSidebarJobId || !currentSidebarApplicantId) {
      console.warn('handleBookingToggle: JobID oder ApplicantID nicht gesetzt.');
      return;
    }
    if (!window.WEBFLOW_API.core || !window.WEBFLOW_API.core.bookingService) {
      console.error('handleBookingToggle: bookingService nicht verfügbar.');
      return;
    }

    if (zusagenButtonElement) zusagenButtonElement.disabled = true;

    const newBookingStatus = await window.WEBFLOW_API.core.bookingService.toggleBooking(currentSidebarJobId, currentSidebarApplicantId);

    if (newBookingStatus !== null) {
      updateBookingButtonUI(newBookingStatus);
    } else {
      alert('Fehler beim Aktualisieren des Buchungsstatus.');
    }
    if (zusagenButtonElement) zusagenButtonElement.disabled = false;
  }


  function showCreatorSidebar(applicantItem, allJobApplicants, applicantIndex, jobId) {
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS || {};
    const creatorTypesMapping = MAPPINGS.creatorTypen || {};
    const creatorKategorienMapping = MAPPINGS.creatorKategorien || {};

    currentSidebarJobId = jobId;
    currentSidebarApplicants = allJobApplicants;
    currentSidebarIndex = applicantIndex;
    const applicantFieldData = applicantItem.fieldData;
    currentSidebarApplicantId = applicantFieldData['webflow-member-id'];

    if (!currentSidebarApplicantId) {
        console.error("showCreatorSidebar: Konnte 'webflow-member-id' des Bewerbers nicht finden.");
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

    // Zusagen-Button erstellen und Event-Listener hinzufügen
    zusagenButtonElement = document.createElement('a'); // Globale Referenz setzen
    zusagenButtonElement.classList.add('db-button-medium-gradient-pink', 'size-auto'); // Start-Styling
    zusagenButtonElement.href = '#';
    zusagenButtonElement.id = 'sidebar-zusagen-button';
    const zusagenButtonText = document.createElement('span');
    zusagenButtonText.classList.add('db-button-text', 'white'); // Start-Styling
    // Text wird durch updateBookingButtonUI gesetzt
    zusagenButtonElement.appendChild(zusagenButtonText);
    headlineActionsWrapper.appendChild(zusagenButtonElement);
    zusagenButtonElement.addEventListener('click', (e) => {
        e.preventDefault();
        handleBookingToggle();
    });

    // Initialen Zustand des Zusagen-Buttons setzen
    if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.bookingService && currentSidebarJobId && currentSidebarApplicantId) {
      const isCurrentlyBooked = window.WEBFLOW_API.core.bookingService.isBooked(currentSidebarJobId, currentSidebarApplicantId);
      updateBookingButtonUI(isCurrentlyBooked);
    } else {
      updateBookingButtonUI(false); // Fallback
      if (!(window.WEBFLOW_API.core && window.WEBFLOW_API.core.bookingService)) {
        console.warn("showCreatorSidebar: bookingService nicht verfügbar für initialen Button-Status (Zusagen).");
      }
    }

    favoritButtonElement = document.createElement('a');
    favoritButtonElement.classList.add('db-button-medium-white-border', 'size-auto');
    favoritButtonElement.href = '#';
    favoritButtonElement.id = 'sidebar-favorit-button';
    const favoritButtonText = document.createElement('span');
    favoritButtonText.classList.add('db-button-text');
    favoritButtonElement.appendChild(favoritButtonText);
    headlineActionsWrapper.appendChild(favoritButtonElement);
    favoritButtonElement.addEventListener('click', (e) => {
        e.preventDefault();
        handleFavoriteToggle();
    });
    if (window.WEBFLOW_API.core && window.WEBFLOW_API.core.favoriteService && currentSidebarJobId && currentSidebarApplicantId) {
      const isCurrentlyFavorite = window.WEBFLOW_API.core.favoriteService.isFavorite(currentSidebarJobId, currentSidebarApplicantId);
      updateFavoriteButtonUI(isCurrentlyFavorite);
    } else {
      updateFavoriteButtonUI(false);
      if (!(window.WEBFLOW_API.core && window.WEBFLOW_API.core.favoriteService)) {
        console.warn("showCreatorSidebar: favoriteService nicht verfügbar für initialen Button-Status (Favorit).");
      }
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

  function navigatePrev() {
    if (currentSidebarIndex > 0) {
      showCreatorSidebar(currentSidebarApplicants[currentSidebarIndex - 1], currentSidebarApplicants, currentSidebarIndex - 1, currentSidebarJobId);
    }
  }

  function navigateNext() {
    if (currentSidebarIndex < currentSidebarApplicants.length - 1) {
      showCreatorSidebar(currentSidebarApplicants[currentSidebarIndex + 1], currentSidebarApplicants, currentSidebarIndex + 1, currentSidebarJobId);
    }
  }

  document.addEventListener('keydown', function(event) {
    if (sidebarWrapperElement && sidebarWrapperElement.classList.contains('is-open')) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigatePrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateNext();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeSidebar();
      }
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
  
  // Event-Listener für das globale 'bookingUpdated' Event (aus bookingService)
  document.addEventListener('bookingUpdated', function(event) {
    const { jobId, applicantId, isBooked } = event.detail;
    // Nur aktualisieren, wenn die Sidebar für diesen Job und Applicant offen ist
    if (sidebarWrapperElement && sidebarWrapperElement.classList.contains('is-open') &&
        currentSidebarJobId === jobId && currentSidebarApplicantId === applicantId) {
      updateBookingButtonUI(isBooked);
    }
  });


  window.WEBFLOW_API.ui.showCreatorSidebar = showCreatorSidebar;
  console.log("Sidebar UI (sidebar-3.9.js) wurde aktualisiert für Booking-Funktion.");

})();
