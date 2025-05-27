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

  // Hilfsfunktion zur Formatierung der Follower-Zahlen
  function formatFollowerCount(numStr) {
    const num = parseInt(String(numStr).replace(/[,.]/g, ''), 10); // Kommas und Punkte entfernen für Parsing
    if (isNaN(num)) {
        return numStr; // Originalwert zurückgeben, wenn keine gültige Zahl
    }

    if (num < 1000) {
        return String(num);
    } else if (num < 1000000) { // Bis 999.999
        const thousands = num / 1000;
        if (num < 10000) { // Für Zahlen wie 2400, 9900. Eine Dezimalstelle.
            return (thousands % 1 === 0 ? thousands.toFixed(0) : thousands.toFixed(1)) + 'K';
        } else { // Für Zahlen wie 25604. Ganze Zahl K.
            return Math.floor(thousands) + 'K';
        }
    } else { // Millionen
        const millions = num / 1000000;
        return (millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)) + 'M';
    }
  }


  function showCreatorSidebar(applicantItem, allJobApplicants, applicantIndex, jobId) {
    console.log("showCreatorSidebar called. MAPPINGS:", JSON.parse(JSON.stringify(window.WEBFLOW_API.MAPPINGS || {})));
    
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS || {};
    const creatorTypesMapping = MAPPINGS.creatorTypen || {}; 
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

    const creatorInfoFlexDiv = document.createElement('div');
    creatorInfoFlexDiv.classList.add('is-flexbox-vertical'); 

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('db-modal-headline'); 
    nameSpan.textContent = applicantFieldData.name || 'Unbekannter Creator';
    creatorInfoFlexDiv.appendChild(nameSpan);

    const creatorTypeId = applicantFieldData['creator-type']; 
    const creatorKategorieId = applicantFieldData['creator-kategorie']; 
    
    console.log("Creator Type ID from data:", creatorTypeId);
    console.log("Creator Kategorie ID from data:", creatorKategorieId); 
    console.log("Available Creator Types in MAPPINGS (using MAPPINGS.creatorTypen):", JSON.parse(JSON.stringify(creatorTypesMapping)));
    console.log("Available Creator Kategorien in MAPPINGS (using MAPPINGS.creatorKategorien):", JSON.parse(JSON.stringify(creatorKategorienMapping)));

    const creatorTypeName = creatorTypesMapping[creatorTypeId] || creatorTypeId || 'N/A';
    const creatorKategorieName = creatorKategorienMapping[creatorKategorieId] || creatorKategorieId || 'N/A';
    
    console.log("Resolved Creator Type Name:", creatorTypeName);
    console.log("Resolved Creator Kategorie Name:", creatorKategorieName); 

    let typeAndCategoryText = '';
    if (creatorTypeName !== 'N/A' && creatorKategorieName !== 'N/A' && creatorTypeName !== creatorKategorieName) { // Nur anzeigen, wenn beide unterschiedlich und nicht N/A
        typeAndCategoryText = `${creatorTypeName} - ${creatorKategorieName}`;
    } else if (creatorTypeName !== 'N/A') {
        typeAndCategoryText = creatorTypeName;
    } else if (creatorKategorieName !== 'N/A') { // Fallback, falls nur Kategorie da ist (sollte durch obige Logik eigentlich abgedeckt sein)
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

    const zusagenButton = document.createElement('button');
    zusagenButton.classList.add('db-button-medium-gradient-pink', 'size-auto');
    zusagenButton.textContent = 'Zusagen'; 
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


    const socialMediaOuterWrapper = document.createElement('div'); // Neuer äußerer Wrapper
    socialMediaOuterWrapper.classList.add('db-profile-social');  // Klasse für den äußeren Wrapper

    const socialPlatforms = [
        { name: 'Instagram', id: 'instagram', followersKey: 'creator-follower-instagram', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e8d979b71d2a7e5db3_Instagram.svg', linkKey: 'instagram' },
        { name: 'TikTok', id: 'tiktok', followersKey: 'creator-follower-tiktok', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e99dce86c2b6ba83fe_Tiktok.svg', linkKey: 'tiktok' },
        { name: 'YouTube', id: 'youtube', followersKey: 'creator-follower-youtube', icon: 'https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e9b00d0480ffe289dc_YouTube.svg', linkKey: 'youtube' }
    ];
    
    let hasSocialContent = false; 
    console.log("Checking social media data for applicant:", applicantFieldData.name);

    socialPlatforms.forEach(platform => {
        const followersRaw = applicantFieldData[platform.followersKey]; 
        const link = applicantFieldData[platform.linkKey];

        console.log(`Platform: ${platform.name}, Followers data from key '${platform.followersKey}': ${followersRaw}, Link data from key '${platform.linkKey}': ${link}`);
        
        const followersFormatted = formatFollowerCount(followersRaw);

        // Nur anzeigen, wenn ein Link vorhanden ist ODER formatierte Follower-Daten (nicht nur 'N/A' oder leer)
        if (link || (followersRaw && followersFormatted !== 'N/A' && String(followersRaw).trim() !== '')) {
            hasSocialContent = true; 
            
            // platformDiv ist jetzt das Element, das entweder ein Link oder ein einfaches Div ist
            let platformElement; 
            const innerPlatformDiv = document.createElement('div'); // Dieses Div enthält Icon und Follower
            innerPlatformDiv.classList.add('social-platform-item-content'); // Eine neue Klasse für internes Styling, falls benötigt

            const iconWrapper = document.createElement('div');
            iconWrapper.classList.add('db-card-icon-wrapper', 'round');
            
            const platformIcon = document.createElement('img');
            platformIcon.src = platform.icon;
            platformIcon.alt = platform.name;
            platformIcon.classList.add('db-icon-24'); // Klasse für das Icon
            iconWrapper.appendChild(platformIcon);
            innerPlatformDiv.appendChild(iconWrapper);

            if (followersRaw && followersFormatted !== 'N/A' && String(followersRaw).trim() !== '') {
                const followersSpan = document.createElement('span');
                followersSpan.textContent = followersFormatted; 
                followersSpan.classList.add('is-txt-16', 'is-txt-medium', 'social-followers'); // Klassen für Follower
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
            // Füge Klassen hinzu, die für das Layout im Grid/Flex von db-profile-social wichtig sind
            platformElement.classList.add('social-platform-item', `social-platform-${platform.id}`); 
            socialMediaOuterWrapper.appendChild(platformElement);

        } else {
            console.log(`Skipping ${platform.name} due to no link and no valid followers.`);
        }
    });
    
    if (hasSocialContent) {
        console.log("Social media content found, appending db-profile-social wrapper.");
        contentArea.appendChild(socialMediaOuterWrapper); // Den äußeren Wrapper hinzufügen
    } else {
        console.log("No social media content to display for this applicant.");
    }

    // --- VIDEOBEREICH OHNE THUMBNAIL SKELETONS ---
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
    // --- ENDE VIDEOBEREICH ---


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
