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

      // Event listener for the overlay click
      overlayElement.addEventListener('click', () => {
        const creatorSidebarToClose = document.getElementById('db-modal-creator-wrapper-dynamic');
        
        if (creatorSidebarToClose && creatorSidebarToClose.classList.contains('is-open')) {
          creatorSidebarToClose.classList.remove('is-open');
        }
        // Let toggleOverlay handle the visibility based on the current state of sidebars
        toggleOverlay(false); 
      });
    }
  }

  function toggleOverlay(show) {
    ensureOverlay(); // Make sure overlay is created
    if (overlayElement) {
      if (show) {
        overlayElement.classList.add('is-visible');
      } else {
        // Only hide overlay if no sidebars that rely on it are open.
        // For now, we assume only this creator sidebar uses this specific overlay.
        const creatorSidebar = document.getElementById('db-modal-creator-wrapper-dynamic');
        const isCreatorOpen = creatorSidebar && creatorSidebar.classList.contains('is-open');

        if (!isCreatorOpen) { // If the creator sidebar is NOT open (or was just closed)
            overlayElement.classList.remove('is-visible');
        }
      }
    }
  }
  window.WEBFLOW_API.ui.toggleOverlay = toggleOverlay;

  // Ensure normalizeUrl is defined if not already present
  if (!window.WEBFLOW_API.utils.normalizeUrl) {
    window.WEBFLOW_API.utils.normalizeUrl = function(url) {
      if (!url) return '';
      let trimmedUrl = String(url).trim(); // Ensure it's a string and trim whitespace
      if (!trimmedUrl) return ''; // Return empty if afrer trim it's empty
      if (trimmedUrl.startsWith('//')) {
        return `https:${trimmedUrl}`;
      }
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        return `https://${trimmedUrl}`;
      }
      return trimmedUrl;
    };
  }

  function formatFollowerCount(numStr) {
    const num = parseInt(String(numStr).replace(/[,.]/g, ''), 10);
    if (isNaN(num)) {
        return numStr; 
    }
    if (num < 1000) return String(num);
    if (num < 1000000) {
        const thousands = num / 1000;
        return (num < 10000 && thousands % 1 !== 0 ? thousands.toFixed(1) : Math.floor(thousands)) + 'K';
    }
    const millions = num / 1000000;
    return (millions % 1 !== 0 ? millions.toFixed(1) : millions.toFixed(0)) + 'M';
  }

  function showCreatorSidebar(applicantItem, allJobApplicants, applicantIndex, jobId) {
    // console.log("showCreatorSidebar called. MAPPINGS:", JSON.parse(JSON.stringify(window.WEBFLOW_API.MAPPINGS || {})));
    
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS || {};
    const creatorTypesMapping = MAPPINGS.creatorTypen || {}; 
    const creatorKategorienMapping = MAPPINGS.creatorKategorien || {}; // Assuming this is the correct mapping key

    currentSidebarJobId = jobId;
    currentSidebarApplicants = allJobApplicants;
    currentSidebarIndex = applicantIndex;
    const applicantFieldData = applicantItem.fieldData;

    // console.log("Applicant Field Data:", JSON.parse(JSON.stringify(applicantFieldData || {})));

    let sidebarWrapper = document.getElementById('db-modal-creator-wrapper-dynamic');
    if (!sidebarWrapper) {
      sidebarWrapper = document.createElement('div');
      sidebarWrapper.id = 'db-modal-creator-wrapper-dynamic';
      sidebarWrapper.classList.add('db-modal-creator-wrapper');
      document.body.appendChild(sidebarWrapper);
    }
    sidebarWrapper.innerHTML = ''; // Clear previous content

    // --- 1. Headline Area (Image, Name, Type/Category, Prev/Next Nav) ---
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

    const creatorInfoFlexDiv = document.createElement('div');
    creatorInfoFlexDiv.classList.add('is-flexbox-vertical'); 

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('db-modal-headline'); 
    nameSpan.textContent = applicantFieldData.name || 'Unbekannter Creator';
    creatorInfoFlexDiv.appendChild(nameSpan);

    const creatorTypeId = applicantFieldData['creator-type']; 
    const creatorKategorieId = applicantFieldData['creator-kategorie']; // Assuming this is the field key
    
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

    imgWrapperDiv.appendChild(creatorInfoFlexDiv); 
    creatorHeadlineOverallDiv.appendChild(imgWrapperDiv);

    // Navigation Buttons (Prev/Next) - moved to headline area
    const navButtonsWrapper = document.createElement('div');
    navButtonsWrapper.classList.add('db-modal-control-buttons'); // This is the div for prev/next

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
    
    creatorHeadlineOverallDiv.appendChild(navButtonsWrapper); // Add nav buttons to headline div

    sidebarWrapper.appendChild(creatorHeadlineOverallDiv); // Add headline area to sidebar

    // --- 2. Action Buttons Area (Zusagen, Favorit) ---
    const dbModalCreatorControls = document.createElement('div');
    dbModalCreatorControls.classList.add('db-modal-creator-controls');

    const zusagenLink = document.createElement('a');
    zusagenLink.classList.add('db-button-medium-gradient-pink', 'size-auto');
    zusagenLink.href = '#'; // Placeholder
    // zusagenLink.addEventListener('click', (e) => { e.preventDefault(); /* Aktion */ });

    const zusagenButtonText = document.createElement('span');
    zusagenButtonText.classList.add('db-button-text', 'white');
    zusagenButtonText.textContent = 'Zusagen';
    zusagenLink.appendChild(zusagenButtonText);
    dbModalCreatorControls.appendChild(zusagenLink);

    // New "Favorit" button
    const favoritButton = document.createElement('a'); // Using <a> for consistency
    favoritButton.classList.add('db-button-medium-white-border', 'size-auto');
    favoritButton.href = '#'; // Placeholder
    // favoritButton.addEventListener('click', (e) => { e.preventDefault(); /* Favorit Aktion */ });

    const favoritButtonText = document.createElement('span');
    favoritButtonText.classList.add('db-button-text'); // As per request
    favoritButtonText.textContent = 'Favorit';
    favoritButton.appendChild(favoritButtonText);
    dbModalCreatorControls.appendChild(favoritButton);

    sidebarWrapper.appendChild(dbModalCreatorControls); // Add action buttons area to sidebar

    // --- 3. Main Content Area (Social Media, Videos) ---
    const contentArea = document.createElement('div');
    contentArea.classList.add('db-modal-creator-content');
    contentArea.id = 'sidebar-creator-content-dynamic';
    sidebarWrapper.appendChild(contentArea); 

    // Social Media Icons - moved to contentArea (was previously in creatorHeadlineOverallDiv)
    const socialMediaOuterWrapper = document.createElement('div'); 
    socialMediaOuterWrapper.classList.add('db-profile-social');   
    
    const socialPlatforms = [
        { name: 'Instagram', id: 'instagram', followersKey: 'creator-follower-instagram', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e8d979b71d2a7e5db3_Instagram.svg', linkKey: 'instagram' },
        { name: 'TikTok', id: 'tiktok', followersKey: 'creator-follower-tiktok', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e99dce86c2b6ba83fe_Tiktok.svg', linkKey: 'tiktok' },
        { name: 'YouTube', id: 'youtube', followersKey: 'creator-follower-youtube', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e9b00d0480ffe289dc_YouTube.svg', linkKey: 'youtube' }
    ];
    
    let hasSocialContent = false; 
    // console.log("Checking social media data for applicant:", applicantFieldData.name);

    socialPlatforms.forEach(platform => {
        const followersRaw = applicantFieldData[platform.followersKey]; 
        const link = applicantFieldData[platform.linkKey];
        // console.log(`Platform: ${platform.name}, Followers data from key '${platform.followersKey}': ${followersRaw}, Link data from key '${platform.linkKey}': ${link}`);
        
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
        } else {
            // console.log(`Skipping ${platform.name} due to no link and no valid followers.`);
        }
    });
    
    if (hasSocialContent) {
        // console.log("Social media content found, appending db-profile-social wrapper to contentArea.");
        contentArea.appendChild(socialMediaOuterWrapper); // Add social media to contentArea
    } else {
        // console.log("No social media content to display for this applicant.");
    }

    // Bio / "Über Mich" section is REMOVED as per request.
    // const creatorDetailsDiv = document.createElement('div'); ... (and its children)

    // Video Section
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

    // Event Listeners for Prev/Next buttons
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

    // Update disabled state for Prev/Next buttons
    prevButton.classList.toggle('disabled', currentSidebarIndex === 0);
    nextButton.classList.toggle('disabled', currentSidebarIndex === currentSidebarApplicants.length - 1);
    
    // Show sidebar and overlay
    const finalCreatorSidebarWrapper = document.getElementById('db-modal-creator-wrapper-dynamic');
    if (finalCreatorSidebarWrapper) {
      finalCreatorSidebarWrapper.classList.add('is-open');
      toggleOverlay(true);
    }
  }

  // Skeleton for video (if needed elsewhere, this is a simple placeholder)
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
