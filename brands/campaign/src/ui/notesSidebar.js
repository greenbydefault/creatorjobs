(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  let currentApplicantIdForNote = null; 

  /**
   * Erstellt und zeigt die Notiz-Sidebar an oder aktualisiert sie.
   * @param {string} applicantId - Die ID des Bewerbers, für den eine Notiz hinzugefügt wird.
   * @param {string} applicantName - Der Name des Bewerbers (für die Überschrift).
   */
  function showNotesSidebar(applicantId, applicantName) {
    currentApplicantIdForNote = applicantId;
    const creatorSidebar = document.getElementById('db-modal-creator-wrapper-dynamic');

    let notesSidebarWrapper = document.getElementById('db-modal-note-wrapper-dynamic');
    if (!notesSidebarWrapper) {
      notesSidebarWrapper = document.createElement('div');
      notesSidebarWrapper.id = 'db-modal-note-wrapper-dynamic';
      notesSidebarWrapper.classList.add('db-modal-note-wrapper'); 
      // CSS steuert: position:fixed; top:0; right:0; width:35vw; height:100vh; background:white; z-index:1001; (höher als Creator-Sidebar, wenn sie sich nicht verschieben würde)
      // transform: translateX(100%); transition: transform 0.3s ease-in-out;
      // .is-open { transform: translateX(0); }


      const notesSidebarControls = document.createElement('div');
      notesSidebarControls.classList.add('db-modal-note-controls'); 

      const title = document.createElement('h3');
      title.id = 'db-modal-note-title';
      // Titel wird unten gesetzt
      notesSidebarControls.appendChild(title);

      const closeButton = document.createElement('div');
      closeButton.id = 'db-modal-note-close-button';
      closeButton.classList.add('db-modal-close-button'); 
      closeButton.textContent = '✕';
      closeButton.title = "Schließen";
      notesSidebarControls.appendChild(closeButton);
      
      notesSidebarWrapper.appendChild(notesSidebarControls);

      const notesSidebarContent = document.createElement('div');
      notesSidebarContent.classList.add('db-modal-note-content'); 

      const noteTextarea = document.createElement('textarea');
      noteTextarea.id = 'db-modal-note-textarea';
      noteTextarea.placeholder = 'Deine Notiz hier...';
      noteTextarea.rows = 8; 
      notesSidebarContent.appendChild(noteTextarea);

      const saveNoteButton = document.createElement('button');
      saveNoteButton.id = 'db-modal-note-save-button';
      saveNoteButton.textContent = 'Notiz speichern';
      saveNoteButton.classList.add('db-button-primary'); 
      notesSidebarContent.appendChild(saveNoteButton);
      
      notesSidebarWrapper.appendChild(notesSidebarContent);
      document.body.appendChild(notesSidebarWrapper);

      // Event Listener
      closeButton.addEventListener('click', () => {
        notesSidebarWrapper.classList.remove('is-open'); 
        if (creatorSidebar) {
            creatorSidebar.classList.remove('creator-sidebar-shifted'); // Creator-Sidebar zurückschieben
        }
        // Overlay-Logik wird von der Haupt-Sidebar gesteuert oder benötigt eigene Logik
        // Fürs Erste: Haupt-Overlay prüfen und ggf. ausblenden
        if (window.WEBFLOW_API.ui.toggleOverlay && (!creatorSidebar || !creatorSidebar.classList.contains('is-open'))) {
            window.WEBFLOW_API.ui.toggleOverlay(false);
        }
      });

      saveNoteButton.addEventListener('click', () => {
        const noteText = noteTextarea.value;
        console.log(`Notiz für Applicant ID ${currentApplicantIdForNote}: ${noteText}`);
        alert(`Notiz gespeichert (Platzhalter): "${noteText}" für ${applicantName}`);
        noteTextarea.value = ''; 
        notesSidebarWrapper.classList.remove('is-open'); 
        if (creatorSidebar) {
            creatorSidebar.classList.remove('creator-sidebar-shifted');
        }
        if (window.WEBFLOW_API.ui.toggleOverlay && (!creatorSidebar || !creatorSidebar.classList.contains('is-open'))) {
            window.WEBFLOW_API.ui.toggleOverlay(false);
        }
      });
    } 
    
    // Titel und Textarea aktualisieren/leeren
    const titleElement = document.getElementById('db-modal-note-title');
    if (titleElement) {
      titleElement.textContent = `Notiz für ${applicantName || 'Bewerber'} hinzufügen`;
    }
    const noteTextarea = document.getElementById('db-modal-note-textarea');
    if(noteTextarea) noteTextarea.value = ''; 

    notesSidebarWrapper.classList.add('is-open'); 
    if (creatorSidebar && creatorSidebar.classList.contains('is-open')) {
        creatorSidebar.classList.add('creator-sidebar-shifted');
    }
    // Overlay anzeigen (gesteuert durch die Haupt-Sidebar-Logik oder eigene)
    if (window.WEBFLOW_API.ui.toggleOverlay) {
        window.WEBFLOW_API.ui.toggleOverlay(true);
    }
  }

  window.WEBFLOW_API.ui.showNotesSidebar = showNotesSidebar;

})();
