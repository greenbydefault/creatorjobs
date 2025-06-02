(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};
  window.WEBFLOW_API.utils = window.WEBFLOW_API.utils || {};

  let currentSidebarJobId = null;
  let currentSidebarApplicants = [];
  let currentSidebarIndex = -1;
  let overlayElement = null;
  let sidebarWrapperElement = null; // Globale Referenz zur Sidebar

  function ensureOverlay() {
    if (!overlayElement) {
      overlayElement = document.createElement('div');
      overlayElement.id = 'db-modal-overlay-dynamic';
      overlayElement.classList.add('db-modal-overlay');
      document.body.appendChild(overlayElement);

      overlayElement.addEventListener('click', () => {
        if (sidebarWrapperElement && sidebarWrapperElement.classList.contains('is-open')) {
          sidebarWrapperElement.classList.remove('is-open');
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
        if (!sidebarWrapperElement || !sidebarWrapperElement.classList.contains('is-open')) {
          overlayElement.classList.remove('is-visible');
        }
      }
    }
  }
  window.WEBFLOW_API.ui.toggleOverlay = toggleOverlay;

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

  function showCreatorSidebar(applicantItem, allJobApplicants, applicantIndex, jobId) {
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS || {};
    const creatorTypesMapping = MAPPINGS.creatorTypen || {};
    const creatorKategorienMapping = MAPPINGS.creatorKategorien || {};

    currentSidebarJobId = jobId;
    currentSidebarApplicants = allJobApplicants;
    currentSidebarIndex = applicantIndex;
    const applicantFieldData = applicantItem.fieldData;

    sidebarWrapperElement = document.getElementById('db-modal-creator-wrapper-dynamic');
    if (!sidebarWrapperElement) {
      sidebarWrapperElement = document.createElement('div');
      sidebarWrapperElement.id = 'db-modal-creator-wrapper-dynamic';
      sidebarWrapperElement.classList.add('db-modal-creator-wrapper');
      document.body.appendChild(sidebarWrapperElement);
    }
    sidebarWrapperElement.innerHTML = '';

    // --- 1. Headline Area (Image, Name, Type/Category, Zusagen, Favorit) ---
    const creatorHeadlineOverallDiv = document.createElement('div');
    creatorHeadlineOverallDiv.classList.add('db-modal-creator-headline');

    const imgNameTypeWrapper = document.createElement('div'); // Wrapper für Bild, Name, Typ
    imgNameTypeWrapper.classList.add('db-modal-creator-img-name-type-wrapper'); // Eigene Klasse für Styling

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

    // Action Buttons (Zusagen, Favorit) - moved into the headline div
    const dbModalCreatorControls = document.createElement('div');
    dbModalCreatorControls.classList.add('db-modal-creator-controls', 'headline-actions'); // Zusätzliche Klasse für Styling
    const zusagenLink = document.createElement('a');
    zusagenLink.classList.add('db-button-medium-gradient-pink', 'size-auto');
    zusagenLink.href = '#';
    const zusagenButtonText = document.createElement('span');
    zusagenButtonText.classList.add('db-button-text', 'white');
    zusagenButtonText.textContent = 'Zusagen';
    zusagenLink.appendChild(zusagenButtonText);
    dbModalCreatorControls.appendChild(zusagenLink);
    const favoritButton = document.createElement('a');
    favoritButton.classList.add('db-button-medium-white-border', 'size-auto');
    favoritButton.href = '#';
    const favoritButtonText = document.createElement('span');
    favoritButtonText.classList.add('db-button-text');
    favoritButtonText.textContent = 'Favorit';
    favoritButton.appendChild(favoritButtonText);
    dbModalCreatorControls.appendChild(favoritButton);
    creatorHeadlineOverallDiv.appendChild(dbModalCreatorControls); // Add to headline

    sidebarWrapperElement.appendChild(creatorHeadlineOverallDiv);


    // --- 2. Navigation Buttons (Prev/Next) - Positioned below headline and action buttons ---
    const navButtonsWrapperTop = document.createElement('div');
    navButtonsWrapperTop.classList.add('db-modal-control-buttons', 'top-nav'); // Eigene Klasse für Styling

    const prevButtonTop = document.createElement('div');
    prevButtonTop.classList.add('db-modal-prev');
    prevButtonTop.id = 'sidebar-prev-applicant-top';
    prevButtonTop.textContent = 'Zurück';
    prevButtonTop.title = "Vorheriger Creator";
    navButtonsWrapperTop.appendChild(prevButtonTop);

    const nextButtonTop = document.createElement('div');
    nextButtonTop.classList.add('db-modal-next');
    nextButtonTop.id = 'sidebar-next-applicant-top';
    nextButtonTop.textContent = 'Weiter';
    nextButtonTop.title = "Nächster Creator";
    navButtonsWrapperTop.appendChild(nextButtonTop);
    sidebarWrapperElement.appendChild(navButtonsWrapperTop); // Add below headline


    // --- 3. Main Content Area (Social Media, Videos) ---
    const contentArea = document.createElement('div');
    contentArea.classList.add('db-modal-creator-content');
    contentArea.id = 'sidebar-creator-content-dynamic';
    sidebarWrapperElement.appendChild(contentArea);

    // Social Media Section
    const socialMediaDetailsWrapper = document.createElement('div');
    socialMediaDetailsWrapper.classList.add('db-modal-creator-details'); // Parent div as requested

    const socialMediaHeadline = document.createElement('div');
    socialMediaHeadline.classList.add('is-txt-16', 'is-txt-medium', 'text-color-dark');
    socialMediaHeadline.textContent = 'Social Media';
    socialMediaDetailsWrapper.appendChild(socialMediaHeadline); // Add headline to the new parent

    const socialMediaOuterWrapper = document.createElement('div');
    socialMediaOuterWrapper.classList.add('db-profile-social');
    // ... (Rest der Social Media Logik bleibt gleich) ...
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
        socialMediaDetailsWrapper.appendChild(socialMediaOuterWrapper); // Add social icons to the new parent
        contentArea.appendChild(socialMediaDetailsWrapper); // Add the whole details section to contentArea
    }


    // Video Section
    const mainVideoPlayerWrapper = document.createElement('div');
    mainVideoPlayerWrapper.classList.add('db-modal-video-wrapper');
    contentArea.appendChild(mainVideoPlayerWrapper);
    // ... (Rest der Video Logik bleibt gleich) ...
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
    

    // Event Listeners for Top Prev/Next buttons
    prevButtonTop.addEventListener('click', navigatePrev);
    nextButtonTop.addEventListener('click', navigateNext);

    // Update disabled state for Top Prev/Next buttons
    prevButtonTop.classList.toggle('disabled', currentSidebarIndex === 0);
    nextButtonTop.classList.toggle('disabled', currentSidebarIndex === currentSidebarApplicants.length - 1);
    
    sidebarWrapperElement.classList.add('is-open');
    toggleOverlay(true);
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
        sidebarWrapperElement.classList.remove('is-open');
        toggleOverlay(false);
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
  
  window.WEBFLOW_API.ui.showCreatorSidebar = showCreatorSidebar;

})();
