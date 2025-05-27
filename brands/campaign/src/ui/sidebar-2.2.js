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
          // Die Klasse 'creator-sidebar-shifted' wird nicht mehr benötigt, da es keine zweite Sidebar gibt
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

        if (!isCreatorOpen) { // Nur prüfen, ob die Creator-Sidebar geschlossen ist
          overlayElement.classList.remove('is-visible');
        }
      }
    }
  }
  window.WEBFLOW_API.ui.toggleOverlay = toggleOverlay;

  // Hilfsfunktion zum Normalisieren von URLs (wichtig für Videos)
  if (!window.WEBFLOW_API.utils.normalizeUrl) {
    window.WEBFLOW_API.utils.normalizeUrl = function(url) {
      if (!url) return '';
      // Stellt sicher, dass die URL mit https beginnt, wenn sie mit // startet oder kein Protokoll hat
      if (url.startsWith('//')) {
        return `https:${url}`;
      }
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Standardmäßig https verwenden, wenn kein Protokoll angegeben ist
        return `https://${url}`;
      }
      return url;
    };
  }


  function showCreatorSidebar(applicantItem, allJobApplicants, applicantIndex, jobId) {
    const MAPPINGS = window.WEBFLOW_API.MAPPINGS || {}; // Stellen Sie sicher, dass MAPPINGS existiert

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
    sidebarWrapper.innerHTML = ''; // Inhalt bei jedem Aufruf leeren


    // --- NEUE STRUKTUR FÜR DEN HEADER ---
    const creatorHeadlineOverallDiv = document.createElement('div');
    creatorHeadlineOverallDiv.classList.add('db-modal-creator-headline');

    const imgWrapperDiv = document.createElement('div');
    imgWrapperDiv.classList.add('db-modal-creator-img-wrapper');

    // Bild des Creators
    const profileImageField = applicantFieldData["image-thumbnail-small-92px"] || applicantFieldData["user-profile-img"];
    if (profileImageField) {
      const profileImg = document.createElement('img');
      profileImg.classList.add('db-table-img', 'medium');
      profileImg.src = typeof profileImageField === 'string' ? profileImageField : (profileImageField?.url || 'https://placehold.co/80x80/E0E0E0/BDBDBD?text=Bild');
      profileImg.alt = applicantFieldData.name || "Creator Bild";
      profileImg.onerror = () => { profileImg.src = 'https://placehold.co/80x80/E0E0E0/BDBDBD?text=Fehler'; };
      imgWrapperDiv.appendChild(profileImg);
    }

    // Creator Name und Typ/Kategorie
    const creatorInfoDiv = document.createElement('div');
    creatorInfoDiv.classList.add('db-modal-headline'); // Dieses Div enthält Name und Typ/Kategorie

    const nameSpan = document.createElement('span');
    nameSpan.textContent = applicantFieldData.name || 'Unbekannter Creator';
    // Optional: Fügen Sie hier spezifische Klassen für den Namen hinzu, falls 'db-modal-headline' nicht ausreicht
    // nameSpan.classList.add('creator-name-class');
    creatorInfoDiv.appendChild(nameSpan);

    // Annahme: Felder für Creator-Typ und Kategorie sind in applicantFieldData vorhanden
    const creatorType = applicantFieldData['creator-type'] || 'N/A'; // Passen Sie 'creator-type' an Ihr Feld an
    const creatorKategorie = applicantFieldData['creator-kategorie'] || 'N/A'; // Passen Sie 'creator-kategorie' an Ihr Feld an
    const typeCategoryP = document.createElement('p');
    typeCategoryP.classList.add('is-txt-16');
    typeCategoryP.textContent = `${creatorType} - ${creatorKategorie}`;
    creatorInfoDiv.appendChild(typeCategoryP);

    imgWrapperDiv.appendChild(creatorInfoDiv);
    creatorHeadlineOverallDiv.appendChild(imgWrapperDiv);

    // "Zusagen"-Button
    const zusagenButton = document.createElement('button'); // Als Button-Element für bessere Semantik
    zusagenButton.classList.add('db-button-medium-gradient-pink', 'size-auto');
    zusagenButton.textContent = '+ Zusagen'; // Text wie im Bild
    // zusagenButton.addEventListener('click', () => { /* Ihre Logik für "Zusagen" */ });
    creatorHeadlineOverallDiv.appendChild(zusagenButton);

    sidebarWrapper.appendChild(creatorHeadlineOverallDiv);
    // --- ENDE NEUE STRUKTUR FÜR DEN HEADER ---


    // --- SIDEBAR CONTROLS (Schließen, Vor, Zurück) ---
    // Diese werden nun unter dem neuen Header platziert.
    const sidebarControls = document.createElement('div');
    sidebarControls.classList.add('db-modal-creator-controls');
    // Im Bild sind die Controls ("Hilfe", "Zurück", "Weiter") ganz unten.
    // Wir erstellen sie hier und fügen sie später am Ende des sidebarWrapper hinzu oder an einer spezifischen Stelle im Content.
    // Für dieses Beispiel fügen wir sie unter dem Hauptinhalt (Videos etc.) ein.

    const navButtonsWrapper = document.createElement('div');
    navButtonsWrapper.classList.add('db-modal-control-buttons'); // Für Zurück/Weiter

    const prevButton = document.createElement('div'); // Oder 'button'
    prevButton.classList.add('db-modal-prev'); // Ihre CSS-Klasse für den Zurück-Button
    prevButton.id = 'sidebar-prev-applicant';
    prevButton.textContent = 'Zurück'; // Text wie im Bild
    prevButton.title = "Vorheriger Creator";
    navButtonsWrapper.appendChild(prevButton);

    const nextButton = document.createElement('div'); // Oder 'button'
    nextButton.classList.add('db-modal-next'); // Ihre CSS-Klasse für den Weiter-Button
    nextButton.id = 'sidebar-next-applicant';
    nextButton.textContent = 'Weiter'; // Text wie im Bild
    nextButton.title = "Nächster Creator";
    navButtonsWrapper.appendChild(nextButton);

    // "Hilfe"-Button (links neben Zurück/Weiter im Bild)
    const helpButton = document.createElement('div'); // Oder 'button'
    helpButton.classList.add('db-modal-help'); // Ihre CSS-Klasse für den Hilfe-Button
    helpButton.textContent = 'Hilfe'; // Mit Icon, falls vorhanden, z.B. per ::before oder als <img>
    // helpButton.addEventListener('click', () => { /* Ihre Logik für Hilfe */ });
    // Um die Reihenfolge wie im Bild zu erhalten (Hilfe, Zurück, Weiter), fügen wir Hilfe zuerst ein:
    sidebarControls.appendChild(helpButton); // Hilfe-Button
    sidebarControls.appendChild(navButtonsWrapper); // Wrapper für Zurück/Weiter

    // Schließen-Button (oben rechts, falls noch benötigt, oder entfernen, wenn nicht im Design)
    // Im Bild ist kein expliziter Schließen-Button oben rechts zu sehen.
    // Das Schließen erfolgt vermutlich über Klick auf das Overlay oder eine andere Interaktion.
    // Falls doch ein X-Button gewünscht ist:
    const closeButtonWrapper = document.createElement('div');
    closeButtonWrapper.classList.add('db-modal-nav-close-wrapper');
    closeButtonWrapper.style.position = 'absolute'; // Beispiel für Positionierung
    closeButtonWrapper.style.top = '15px';
    closeButtonWrapper.style.right = '15px';


    const closeButton = document.createElement('div');
    closeButton.id = 'sidebar-close-button';
    closeButton.classList.add('db-modal-close-button');
    closeButton.innerHTML = '&#x2715;'; // HTML entity für X
    closeButton.title = "Schließen";
    closeButtonWrapper.appendChild(closeButton);
    // Den closeButtonWrapper dem creatorHeadlineOverallDiv hinzufügen, wenn er oben rechts sein soll
    // creatorHeadlineOverallDiv.appendChild(closeButtonWrapper); // ODER dem sidebarWrapper direkt.
    // Da im Bild kein X ist, lasse ich es auskommentiert oder füge es den Controls unten hinzu, falls es dort sein soll.
    // Für dieses Beispiel: Fügen wir es den Controls oben hinzu, aber es ist im Bild nicht sichtbar.
    // sidebarControls.appendChild(closeButtonWrapper); // Wenn es Teil der oberen Controls sein soll.
    // Da das Bild keinen expliziten X-Button im Hauptbereich zeigt, lassen wir ihn hier weg
    // und verlassen uns auf das Overlay zum Schließen.
    // Wenn ein Schließen-Button benötigt wird, muss er positioniert werden.

    // Event Listener für die Controls
    closeButton.addEventListener('click', () => { // Dieser Listener wird nur aktiv, wenn der closeButton hinzugefügt wird.
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
    // --- ENDE SIDEBAR CONTROLS ---


    // --- SIDEBAR CONTENT AREA ---
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

    // "Über Laila" Sektion
    // Annahme: Feld 'ueber-mich-text' oder ähnlich in applicantFieldData
    const ueberMichText = applicantFieldData['ueber-mich'] || "Keine Beschreibung vorhanden."; // Passen Sie 'ueber-mich' an
    const ueberMichHeadline = document.createElement('h2'); // Oder h3, je nach Hierarchie
    ueberMichHeadline.textContent = `Über ${applicantFieldData.name || 'den Creator'}`;
    ueberMichHeadline.classList.add('ueber-creator-headline'); // Fügen Sie eine CSS-Klasse für Styling hinzu
    contentArea.appendChild(ueberMichHeadline);

    const ueberMichPara = document.createElement('p');
    ueberMichPara.textContent = ueberMichText;
    ueberMichPara.classList.add('ueber-creator-text'); // Fügen Sie eine CSS-Klasse für Styling hinzu
    contentArea.appendChild(ueberMichPara);

    // Social Media Icons und Follower-Zahlen
    const socialMediaWrapper = document.createElement('div');
    socialMediaWrapper.classList.add('social-media-wrapper'); // CSS-Klasse für das Layout der Icons

    // Beispielhafte Daten - ersetzen Sie dies mit Ihren tatsächlichen Feldnamen
    const socialPlatforms = [
        { name: 'Instagram', followers: applicantFieldData['instagram-followers'] || '25K', icon: 'URL_ZUM_INSTAGRAM_ICON.svg', link: applicantFieldData['instagram-link'] },
        { name: 'TikTok', followers: applicantFieldData['tiktok-followers'] || '17K', icon: 'URL_ZUM_TIKTOK_ICON.svg', link: applicantFieldData['tiktok-link'] },
        { name: 'YouTube', followers: applicantFieldData['youtube-followers'] || '1K', icon: 'URL_ZUM_YOUTUBE_ICON.svg', link: applicantFieldData['youtube-link'] }
    ];

    socialPlatforms.forEach(platform => {
        if (platform.link || platform.followers !== 'N/A') { // Nur anzeigen, wenn Link oder Follower vorhanden
            const platformDiv = document.createElement('div');
            platformDiv.classList.add('social-platform');

            const platformIcon = document.createElement('img');
            platformIcon.src = platform.icon; // Ersetzen Sie dies mit tatsächlichen Icon-Pfaden
            platformIcon.alt = platform.name;
            platformIcon.classList.add('social-icon');
            platformDiv.appendChild(platformIcon);

            const followersSpan = document.createElement('span');
            followersSpan.textContent = platform.followers;
            followersSpan.classList.add('social-followers');
            platformDiv.appendChild(followersSpan);

            // Optional: Machen Sie das Ganze klickbar, wenn ein Link vorhanden ist
            if (platform.link) {
                const platformLink = document.createElement('a');
                platformLink.href = window.WEBFLOW_API.utils.normalizeUrl(platform.link);
                platformLink.target = '_blank';
                platformLink.rel = 'noopener noreferrer';
                platformLink.appendChild(platformDiv); // Wickeln Sie das platformDiv in einen Link ein
                socialMediaWrapper.appendChild(platformLink);
            } else {
                socialMediaWrapper.appendChild(platformDiv);
            }
        }
    });
    contentArea.appendChild(socialMediaWrapper);


    // Video Grid Container
    const videoGridContainer = document.createElement('div');
    videoGridContainer.classList.add('db-modal-creator-video-grid');
    contentArea.appendChild(videoGridContainer);

    const numberOfPotentialVideos = 5; // Wie viele Video-Felder geprüft werden sollen
    for (let i = 0; i < numberOfPotentialVideos; i++) {
      if (window.WEBFLOW_API.ui.createVideoSkeletonElement) {
        videoGridContainer.appendChild(window.WEBFLOW_API.ui.createVideoSkeletonElement());
      } else if (window.createVideoSkeletonElement) { // Fallback, falls es global definiert ist
        videoGridContainer.appendChild(window.createVideoSkeletonElement());
      }
    }

    setTimeout(() => {
      videoGridContainer.innerHTML = ''; // Skeletons entfernen

      let videosFound = false;
      for (let i = 1; i <= numberOfPotentialVideos; i++) {
        const videoLinkField = `creator-video-link-${i}`; // Passen Sie dies an Ihre Feldnamen an
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
          // Typ basierend auf Dateiendung setzen (vereinfacht)
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
    }, 0); // Kurze Verzögerung, um das Rendern der Skeletons zu ermöglichen

    // Füge die Controls (Hilfe, Zurück, Weiter) am Ende des Haupt-Wrappers oder des Content-Bereichs hinzu
    sidebarWrapper.appendChild(sidebarControls); // Platziert die Controls ganz unten in der Sidebar

    // Update Prev/Next Button States
    const prevBtn = document.getElementById('sidebar-prev-applicant');
    const nextBtn = document.getElementById('sidebar-next-applicant');
    if (prevBtn) {
      prevBtn.classList.toggle('disabled', currentSidebarIndex === 0);
    }
    if (nextBtn) {
      nextBtn.classList.toggle('disabled', currentSidebarIndex === currentSidebarApplicants.length - 1);
    }

    // Show Sidebar and Overlay
    const finalCreatorSidebarWrapper = document.getElementById('db-modal-creator-wrapper-dynamic');
    if (finalCreatorSidebarWrapper) {
      finalCreatorSidebarWrapper.classList.add('is-open');
      // Die Logik für 'creator-sidebar-shifted' ist nicht mehr nötig, da es keine zweite Sidebar gibt
      toggleOverlay(true);
    }
  }

  // Funktion zum Erstellen von Video-Skeletons, falls nicht vorhanden
  if (!window.WEBFLOW_API.ui.createVideoSkeletonElement) {
    window.WEBFLOW_API.ui.createVideoSkeletonElement = function () {
      const skeletonWrapper = document.createElement('div');
      skeletonWrapper.classList.add('db-modal-video-wrapper', 'skeleton-video-wrapper');
      const skeletonVideo = document.createElement('div');
      skeletonVideo.classList.add('db-modal-video-item', 'skeleton-video-item'); // Dies ist das Placeholder-Element
      skeletonWrapper.appendChild(skeletonVideo);
      return skeletonWrapper;
    };
  }
  
  window.WEBFLOW_API.ui.showCreatorSidebar = showCreatorSidebar;

})();
