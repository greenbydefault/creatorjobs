/**
 * InfluencerContract-Modul - Implementiert den Influencer-Vertragstyp
 */
(function() {
  'use strict';

  // Zugriff auf globale Objekte
  const ContractGenerator = window.ContractGenerator || {};
  const Debug = ContractGenerator.Debug || console;
  const PDFGenerator = ContractGenerator.PDFGenerator || {};
  const config = ContractGenerator.config || {
    INFLUENCER_STEPS: 9
  };

  // Private Variablen
  var formData = {};
  var maxSteps = config.INFLUENCER_STEPS || 9;
  var initialized = false;

  // Private Methoden
  function init() {
    if (initialized) {
      Debug.warn('Influencer-Vertragsmodul bereits initialisiert');
      return;
    }

    Debug.info('Influencer-Vertragsmodul initialisiert');

    // Formularelemente für diesen Vertragstyp anzeigen
    showFormElements();

    // Formularspezifische Event-Listener einrichten
    setupContractSpecificListeners();

    // Fortschrittsanzeige aktualisieren
    if (ContractGenerator.Navigation && typeof ContractGenerator.Navigation.getCurrentStep === 'function') {
      updateProgress(ContractGenerator.Navigation.getCurrentStep());
    } else {
      updateProgress(1);
    }

    initialized = true;
  }

  function showFormElements() {
    // Alle notwendigen Formularelemente einblenden
    var sections = document.querySelectorAll('.form-section');
    sections.forEach(section => {
      section.classList.remove('contract-type-hidden');
    });

    // Schrittzähler aktualisieren
    updateStepCounter();
  }

  function hideFormElements() {
    // Nicht benötigte Formularelemente ausblenden (falls nötig)
  }

  function updateStepCounter() {
    // Aktualisiere die Anzahl der Schritte in der Fortschrittsanzeige
    var progressSteps = document.querySelectorAll('.progress-step');
    progressSteps.forEach(step => {
      if (parseInt(step.getAttribute('data-step')) > maxSteps) {
        step.style.display = 'none';
      } else {
        step.style.display = '';
      }
    });
  }

  function setupContractSpecificListeners() {
    // Hier können vertragstyp-spezifische Event-Listener hinzugefügt werden
    // z.B. für Influencer-spezifische Felder
  }

  function collectFormData() {
    Debug.info('Sammle Formulardaten für Influencer-Vertrag');

    var timer = Debug.startPerformanceTimer ? Debug.startPerformanceTimer('collectFormData') : null;

    try {
      // Vertragstyp
      const contractTypeEl = document.getElementById('contract-type');
      const isClientContract = contractTypeEl ? contractTypeEl.value === 'client' : false;

      // Unternehmen (Auftraggeber)
      formData.company = {
        name: getFieldValue('company-name', '[Name des Unternehmens]'),
        contact: getFieldValue('company-contact', '[Ansprechpartner]'),
        street: getFieldValue('company-street', '[Straße]'),
        number: getFieldValue('company-number', '[Hausnummer]'),
        zip: getFieldValue('company-zip', '[PLZ]'),
        city: getFieldValue('company-city', '[Stadt]'),
        country: getFieldValue('company-country', '[Land]')
      };

      // Influencer (Creator)
      formData.influencer = {
        name: getFieldValue('influencer-name', '[Name des Influencers]'),
        street: getFieldValue('influencer-street', '[Straße Creator]'),
        number: getFieldValue('influencer-number', '[Hausnummer Creator]'),
        zip: getFieldValue('influencer-zip', '[PLZ Creator]'),
        city: getFieldValue('influencer-city', '[Stadt Creator]'),
        country: getFieldValue('influencer-country', '[Land Creator]')
      };

      // Kunde/Marke
      formData.client = {};

      if (isClientContract) {
        formData.client = {
          name: getFieldValue('client-name', '[Name des Kunden]'),
          street: getFieldValue('client-street', '[Straße Kunde]'),
          number: getFieldValue('client-number', '[Hausnummer Kunde]'),
          zip: getFieldValue('client-zip', '[PLZ Kunde]'),
          city: getFieldValue('client-city', '[Stadt Kunde]'),
          country: getFieldValue('client-country', '[Land Kunde]')
        };
      } else {
        // Bei direktem Vertrag ist der Kunde das Unternehmen selbst
        formData.client = { ...formData.company };
      }

      // Plattformen
      formData.platforms = {
        instagram: {
          selected: isChecked('platform-instagram'),
          username: getFieldValue('instagram-username', '[@nutzername]')
        },
        tiktok: {
          selected: isChecked('platform-tiktok'),
          username: getFieldValue('tiktok-username', '[@nutzername]')
        },
        youtube: {
          selected: isChecked('platform-youtube'),
          url: getFieldValue('youtube-url', '[URL]')
        },
        other: {
          selected: isChecked('platform-other'),
          platform: getFieldValue('other-platform', '[frei eintragen]')
        }
      };

      // Inhalte
      formData.content = {
        storySlides: getFieldValue('story-slides', '[Anzahl]'),
        reelsTiktok: getFieldValue('reels-tiktok', '[Anzahl]'),
        feedPosts: getFieldValue('feed-posts', '[Anzahl]'),
        youtubeVideos: getFieldValue('youtube-videos', '[Anzahl]')
      };

      // Zusätzliche Vereinbarungen
      formData.additionalAgreements = {
        collabPost: isChecked('collab-post'),
        companyPublication: isChecked('company-publication'),
        noCompanyPublication: isChecked('no-company-publication')
      };

      // Media Buyout
      formData.mediaBuyout = {
        allowed: isChecked('media-buyout-yes'),
        denied: isChecked('media-buyout-no'),
        channels: {
          instagram: isChecked('ad-instagram'),
          facebook: isChecked('ad-facebook'),
          tiktok: isChecked('ad-tiktok'),
          other: isChecked('ad-other')
        },
        options: {
          whitelisting: isChecked('whitelisting'),
          sparkAd: isChecked('spark-ad')
        },
        duration: getSelectedRadioValue([
          'duration-3',
          'duration-6',
          'duration-12',
          'duration-unlimited'
        ], '')
      };

      // Zeitplan
      formData.schedule = {
        briefingDate: formatDate(getFieldValue('briefing-date', '')),
        scriptDate: formatDate(getFieldValue('script-date', '')),
        scriptTime: getFieldValue('script-time', '12:00'),
        productionStart: formatDate(getFieldValue('production-start', '')),
        productionEnd: formatDate(getFieldValue('production-end', '')),
        productionLocation: getFieldValue('production-location', '[Adresse]'),
        deliveryDate: formatDate(getFieldValue('delivery-date', '')),
        deliveryTime: getFieldValue('delivery-time', '12:00'),
        publicationDate: formatDate(getFieldValue('publication-date', ''))
      };

      // Vergütung
      formData.compensation = {
        amount: getFieldValue('compensation', '[€ Betrag]'),
        paymentTerm: getSelectedRadioValue(['term-14', 'term-30', 'term-45'], ''),
        additional: {
          agreed: isChecked('additional-yes'),
          denied: isChecked('additional-no'),
          text: getFieldValue('additional-comp-text', '[Textfeld falls ja]')
        }
      };

      // NEU: Exklusivität
      // Holt den Wert aus dem Select-Feld mit der ID 'exklusiv'.
      // Bleibt leer (''), falls nicht ausgewählt oder nicht vorhanden.
      formData.exclusivity = getFieldValue('exklusiv', '');

      // NEU: Zusätzliche Informationen
      // Holt den Wert aus der Textarea mit der ID 'extra-information'.
      // Bleibt leer (''), falls nicht ausgefüllt oder nicht vorhanden.
      formData.extraInformation = getFieldValue('extra-information', '');
      
      if (Debug.inspectObject) {
        Debug.inspectObject(formData, 'Gesammelte Formulardaten');
      }

      if (timer && timer.stop) timer.stop();

      return formData;
    } catch (error) {
      Debug.error('Fehler beim Sammeln der Formulardaten:', error);
      if (timer && timer.stop) timer.stop();
      throw error;
    }
  }

  function getFieldValue(id, defaultValue) {
    const element = document.getElementById(id);
    // Gibt den Wert des Elements zurück oder den Standardwert, falls das Element nicht existiert.
    // Wenn das Element existiert, aber keinen Wert hat (z.B. leeres Textfeld), wird '' zurückgegeben.
    return element ? element.value : defaultValue;
  }

  function isChecked(id) {
    const element = document.getElementById(id);
    return element ? element.checked : false;
  }

  function getSelectedRadioValue(ids, defaultValue) {
    for (var i = 0; i < ids.length; i++) {
      const element = document.getElementById(ids[i]);
      if (element && element.checked) {
        // Extrahiere den Wert aus der ID (z.B. "duration-3" -> "3 Monate")
        if (ids[i].startsWith('duration-')) {
          const value = ids[i].split('-')[1];
          if (value === 'unlimited') return 'Unbegrenzt';
          return value + ' Monate';
        }
        if (ids[i].startsWith('term-')) {
          return ids[i].split('-')[1] + ' Tage';
        }
        return ids[i]; // Fallback, falls keine spezielle Logik zutrifft
      }
    }
    return defaultValue;
  }

  function formatDate(dateString) {
    if (!dateString) return '';

    if (PDFGenerator && typeof PDFGenerator.formatDate === 'function') {
      return PDFGenerator.formatDate(dateString);
    }

    try {
      var date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    } catch (error) {
      Debug.warn('Fehler beim Formatieren des Datums:', error);
      return dateString;
    }
  }

  function updateProgress(currentStep) {
    // Prozentwert basierend auf aktuellem Schritt berechnen
    const percentage = Math.min(Math.floor((currentStep / maxSteps) * 100), 100);

    // Fortschrittsbalken aktualisieren
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }

    const progressText = document.getElementById('progress-text');
    if (progressText) {
      progressText.textContent = `${percentage}% ausgefüllt`;
    }

    // Fortschrittsnachricht aktualisieren
    updateProgressMessage(currentStep);

    // Für die Vorschau im letzten Schritt
    if (currentStep === maxSteps) {
      updatePreview();
    }
  }

  function updateProgressMessage(stepNumber) {
    const progressMessage = document.getElementById('progress-message');
    if (!progressMessage) return;

    const messages = [
      "Lass uns anfangen!",
      "Gut gemacht! Weiter geht's mit den Influencer-Daten.",
      "Perfekt! Jetzt zu den Plattformen.",
      "Super! Welche Inhalte sollen erstellt werden?",
      "Prima! Gibt es zusätzliche Vereinbarungen?",
      "Sehr gut! Klären wir die Rechte und Nutzung.",
      "Fast geschafft! Jetzt zur Produktion.",
      "Letzte Details zur Vergütung.",
      "Alles klar! Überprüfe den Vertrag und generiere ihn."
    ];

    progressMessage.textContent = messages[stepNumber - 1] || "Lass uns anfangen!";
  }

  function updatePreview() {
    Debug.info('Aktualisiere Vertragsvorschau');

    try {
      // Sammeln der aktuellen Formulardaten
      collectFormData(); // Stellt sicher, dass formData aktuell ist, inkl. der neuen Felder

      // Unternehmensdaten
      updateElementText('preview-company-name', formData.company.name);
      updateElementText('preview-company-contact', formData.company.contact);
      updateElementText('preview-company-street', formData.company.street);
      updateElementText('preview-company-number', formData.company.number);
      updateElementText('preview-company-zip', formData.company.zip);
      updateElementText('preview-company-city', formData.company.city);
      updateElementText('preview-company-country', formData.company.country);

      // Influencer-Daten
      updateElementText('preview-influencer-name', formData.influencer.name);
      updateElementText('preview-influencer-street', formData.influencer.street);
      updateElementText('preview-influencer-number', formData.influencer.number);
      updateElementText('preview-influencer-zip', formData.influencer.zip);
      updateElementText('preview-influencer-city', formData.influencer.city);
      updateElementText('preview-influencer-country', formData.influencer.country);

      // Kundensektion je nach Vertragstyp anzeigen
      const contractTypeEl = document.getElementById('contract-type');
      const isClientContract = contractTypeEl ? contractTypeEl.value === 'client' : false;
      const previewClientSection = document.getElementById('preview-client-section');

      if (previewClientSection) {
        previewClientSection.classList.toggle('hidden', !isClientContract);

        if (isClientContract) {
          // Ausführliche Kundendaten darstellen
          updateElementText('preview-client-name', formData.client.name);
          updateElementText('preview-client-street', formData.client.street);
          updateElementText('preview-client-number', formData.client.number);
          updateElementText('preview-client-zip', formData.client.zip);
          updateElementText('preview-client-city', formData.client.city);
          updateElementText('preview-client-country', formData.client.country);
        }
      }

      // Plattformen anzeigen
      let platformsHtml = '';

      if (formData.platforms.instagram.selected) {
        platformsHtml += `<p>✓ Instagram (Profil: ${formData.platforms.instagram.username})</p>`;
      }

      if (formData.platforms.tiktok.selected) {
        platformsHtml += `<p>✓ TikTok (Profil: ${formData.platforms.tiktok.username})</p>`;
      }

      if (formData.platforms.youtube.selected) {
        platformsHtml += `<p>✓ YouTube (Profil: ${formData.platforms.youtube.url})</p>`;
      }

      if (formData.platforms.other.selected) {
        platformsHtml += `<p>✓ Sonstiges: ${formData.platforms.other.platform}</p>`;
      }

      updateElementHTML('preview-platforms', platformsHtml || '<p>Keine Plattformen ausgewählt</p>');

      // Inhaltstypen anzeigen
      let contentTypesHtml = '';

      if (parseInt(formData.content.storySlides) > 0) {
        contentTypesHtml += `<li>Story-Slides: ${formData.content.storySlides}</li>`;
      }

      if (parseInt(formData.content.reelsTiktok) > 0) {
        contentTypesHtml += `<li>Instagram Reels / TikTok Videos: ${formData.content.reelsTiktok}</li>`;
      }

      if (parseInt(formData.content.feedPosts) > 0) {
        contentTypesHtml += `<li>Feed-Posts (Bild/Karussell): ${formData.content.feedPosts}</li>`;
      }

      if (parseInt(formData.content.youtubeVideos) > 0) {
        contentTypesHtml += `<li>YouTube Videos: ${formData.content.youtubeVideos}</li>`;
      }

      updateElementHTML('preview-content-types', contentTypesHtml || '<li>Keine Inhalte spezifiziert</li>');
      
      // HINWEIS: Die neuen Felder 'exclusivity' und 'extraInformation' werden hier noch nicht in der Vorschau angezeigt.
      // Dies kann bei Bedarf später ergänzt werden.

      // Aktualisiere die Fortschrittsanzeige mit dem tatsächlichen Fortschritt
      const realProgress = calculateRealProgress();
      const progressFill = document.getElementById('progress-fill');

      if (progressFill) {
        progressFill.style.width = `${realProgress}%`;
      }

      const progressText = document.getElementById('progress-text');

      if (progressText) {
        progressText.textContent = `${realProgress}% ausgefüllt`;
      }
    } catch (error) {
      Debug.error('Fehler bei der Aktualisierung der Vorschau:', error);
    }
  }

  function updateElementText(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  function updateElementHTML(id, html) {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = html;
    }
  }

  function calculateRealProgress() {
    // Zähle die ausgefüllten Pflichtfelder
    const requiredFields = document.querySelectorAll('[required]');
    let filledRequiredFields = 0;

    requiredFields.forEach(field => {
      if (field.value) {
        filledRequiredFields++;
      }
    });

    // Berechne den Prozentsatz (Vermeiden von Division durch Null)
    if (requiredFields.length === 0) return 100;
    return Math.floor((filledRequiredFields / requiredFields.length) * 100);
  }

  function generatePDF() {
    Debug.info('Generiere PDF für Influencer-Vertrag');
    var timer = Debug.startPerformanceTimer ? Debug.startPerformanceTimer('generatePDF') : null;

    try {
      // Formulardaten sammeln (inklusive der neuen Felder)
      collectFormData();

      // Prüfen, ob PDFGenerator verfügbar ist
      if (!PDFGenerator || typeof PDFGenerator.createDocument !== 'function') {
        Debug.error('PDFGenerator nicht verfügbar');
        alert('Die PDF-Generierung ist momentan nicht verfügbar. Bitte versuche es später erneut.');
        if (timer && timer.stop) timer.stop();
        return false;
      }

      // PDF erstellen
      const doc = PDFGenerator.createDocument();

      // Deckblatt hinzufügen
      addCoverPage(doc);

      // Vertragsinhalt hinzufügen
      addContractContent(doc);

      // Wasserzeichen hinzufügen
      if (typeof PDFGenerator.addWatermark === 'function') {
        PDFGenerator.addWatermark(doc);
      }

      // PDF speichern
      doc.save('influencer-marketing-vertrag.pdf');
      Debug.info('PDF erfolgreich gespeichert');

      if (timer && timer.stop) timer.stop();
      return true;
    } catch (error) {
      Debug.error('Fehler bei der PDF-Generierung:', error);
      alert('Beim Generieren des PDFs ist ein Fehler aufgetreten: ' + error.message);
      if (timer && timer.stop) timer.stop();
      return false;
    }
  }

  function addCoverPage(doc) {
    Debug.info('Füge Deckblatt hinzu');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text('INFLUENCER-MARKETING-VERTRAG', 105, 80, null, null, 'center');

    doc.setFontSize(14);
    doc.text('Vertragspartner', 105, 120, null, null, 'center');

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('Unternehmen (Auftraggeber):', 30, 150);
    doc.setFont("helvetica", "normal");

    // Name mit fetter Schrift für die Variable
    doc.text('Name: ', 30, 160);
    doc.setFont("helvetica", "bold");
    doc.text(formData.company.name, 30 + doc.getTextWidth('Name: '), 160);

    // Vertreten durch mit fetter Schrift für die Variable
    doc.setFont("helvetica", "normal");
    doc.text('Vertreten durch: ', 30, 170);
    doc.setFont("helvetica", "bold");
    doc.text(formData.company.contact, 30 + doc.getTextWidth('Vertreten durch: '), 170);

    // Straße und Nummer mit fetter Schrift für die Variablen
    doc.setFont("helvetica", "normal");
    doc.text('Straße: ', 30, 180);
    doc.setFont("helvetica", "bold");
    doc.text(formData.company.street, 30 + doc.getTextWidth('Straße: '), 180);
    doc.setFont("helvetica", "normal");
    doc.text(', Nr.: ', 30 + doc.getTextWidth('Straße: ') + doc.getTextWidth(formData.company.street), 180);
    doc.setFont("helvetica", "bold");
    doc.text(formData.company.number, 30 + doc.getTextWidth('Straße: ') + doc.getTextWidth(formData.company.street) + doc.getTextWidth(', Nr.: '), 180);

    // PLZ, Stadt und Land mit fetter Schrift für die Variablen
    doc.setFont("helvetica", "normal");
    doc.text('PLZ: ', 30, 190);
    doc.setFont("helvetica", "bold");
    doc.text(formData.company.zip, 30 + doc.getTextWidth('PLZ: '), 190);
    doc.setFont("helvetica", "normal");
    doc.text(', Stadt: ', 30 + doc.getTextWidth('PLZ: ') + doc.getTextWidth(formData.company.zip), 190);
    doc.setFont("helvetica", "bold");
    doc.text(formData.company.city, 30 + doc.getTextWidth('PLZ: ') + doc.getTextWidth(formData.company.zip) + doc.getTextWidth(', Stadt: '), 190);
    doc.setFont("helvetica", "normal");
    doc.text(', Land: ', 30 + doc.getTextWidth('PLZ: ') + doc.getTextWidth(formData.company.zip) + doc.getTextWidth(', Stadt: ') + doc.getTextWidth(formData.company.city), 190);
    doc.setFont("helvetica", "bold");
    doc.text(formData.company.country, 30 + doc.getTextWidth('PLZ: ') + doc.getTextWidth(formData.company.zip) + doc.getTextWidth(', Stadt: ') + doc.getTextWidth(formData.company.city) + doc.getTextWidth(', Land: '), 190);

    doc.setFont("helvetica", "bold");
    doc.text('Influencer (Creator):', 30, 210);

    // Name mit fetter Schrift für die Variable
    doc.setFont("helvetica", "normal");
    doc.text('Name: ', 30, 220);
    doc.setFont("helvetica", "bold");
    doc.text(formData.influencer.name, 30 + doc.getTextWidth('Name: '), 220);

    // Straße und Nummer mit fetter Schrift für die Variablen
    doc.setFont("helvetica", "normal");
    doc.text('Straße: ', 30, 230);
    doc.setFont("helvetica", "bold");
    doc.text(formData.influencer.street, 30 + doc.getTextWidth('Straße: '), 230);
    doc.setFont("helvetica", "normal");
    doc.text(', Nr.: ', 30 + doc.getTextWidth('Straße: ') + doc.getTextWidth(formData.influencer.street), 230);
    doc.setFont("helvetica", "bold");
    doc.text(formData.influencer.number, 30 + doc.getTextWidth('Straße: ') + doc.getTextWidth(formData.influencer.street) + doc.getTextWidth(', Nr.: '), 230);

    // PLZ, Stadt und Land mit fetter Schrift für die Variablen
    doc.setFont("helvetica", "normal");
    doc.text('PLZ: ', 30, 240);
    doc.setFont("helvetica", "bold");
    doc.text(formData.influencer.zip, 30 + doc.getTextWidth('PLZ: '), 240);
    doc.setFont("helvetica", "normal");
    doc.text(', Stadt: ', 30 + doc.getTextWidth('PLZ: ') + doc.getTextWidth(formData.influencer.zip), 240);
    doc.setFont("helvetica", "bold");
    doc.text(formData.influencer.city, 30 + doc.getTextWidth('PLZ: ') + doc.getTextWidth(formData.influencer.zip) + doc.getTextWidth(', Stadt: '), 240);
    doc.setFont("helvetica", "normal");
    doc.text(', Land: ', 30 + doc.getTextWidth('PLZ: ') + doc.getTextWidth(formData.influencer.zip) + doc.getTextWidth(', Stadt: ') + doc.getTextWidth(formData.influencer.city), 240);
    doc.setFont("helvetica", "bold");
    doc.text(formData.influencer.country, 30 + doc.getTextWidth('PLZ: ') + doc.getTextWidth(formData.influencer.zip) + doc.getTextWidth(', Stadt: ') + doc.getTextWidth(formData.influencer.city) + doc.getTextWidth(', Land: '), 240);

    // Nächste Seite für Inhaltsverzeichnis
    doc.addPage();

    // Inhaltsverzeichnis hinzufügen
    addTableOfContents(doc);
  }

  function addTableOfContents(doc) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text('Inhaltsverzeichnis', 105, 40, null, null, 'center');

    doc.setFontSize(11);

    let y = 60;
    const paragraphs = [
      { num: "§1", title: "Vertragsgegenstand", page: 3 },
      { num: "§2", title: "Plattformen & Veröffentlichung", page: 3 },
      { num: "§3", title: "Nutzung für Werbung (Media Buyout)", page: 4 },
      { num: "§4", title: "Rechteübertragung", page: 4 },
      { num: "§5", title: "Produktion & Freigabe", page: 4 },
      { num: "§6", title: "Vergütung", page: 5 },
      { num: "§7", title: "Qualität & Upload", page: 5 },
      { num: "§8", title: "Rechte Dritter & Musik", page: 5 },
      { num: "§9", title: "Werbekennzeichnung & Exklusivität", page: 6 }, // Beachten Sie, dass Exklusivität hier erwähnt wird
      { num: "§10", title: "Verbindlichkeit Briefing & Skript", page: 6 },
      { num: "§11", title: "Datenschutz & Vertraulichkeit", page: 6 },
      { num: "§12", title: "Schlussbestimmungen", page: 6 }
    ];

    paragraphs.forEach(para => {
      doc.setFont("helvetica", "bold");
      doc.text(para.num, 30, y);
      doc.setFont("helvetica", "normal");
      doc.text(para.title, 45, y);
      doc.text(para.page.toString(), 170, y);
      y += 10;
    });

    doc.addPage();
  }

  function addContractContent(doc) {
    // Hier würde der komplette Vertragsteil implementiert
    let y = 30;

    // §1 Vertragsgegenstand
    if (PDFGenerator && typeof PDFGenerator.addParagraphTitle === 'function') {
      y = PDFGenerator.addParagraphTitle(doc, "§1 Vertragsgegenstand", y);
    } else {
      doc.setFont("helvetica", "bold");
      doc.text("§1 Vertragsgegenstand", 30, y);
      doc.setFont("helvetica", "normal");
      y += 8;
    }

    doc.text("Der Influencer verpflichtet sich zur Erstellung und Veröffentlichung werblicher Inhalte", 30, y);
    y += 5;
    doc.text("zugunsten des Unternehmens bzw. einer vom Unternehmen vertretenen Marke.", 30, y);
    y += 8;

    // Client info mit detaillierten Angaben
    const contractTypeEl = document.getElementById('contract-type');
    const isClientContract = contractTypeEl ? contractTypeEl.value === 'client' : false;

    if (isClientContract) {
      // Bei Client-Vertrag: Formulierung als Agentur mit detaillierten Kundenangaben
      doc.text("Das Unternehmen handelt dabei als bevollmächtigte Agentur des Kunden:", 30, y);
      y += 8;

      // Name mit fetter Schrift für die Variable
      doc.text("Name: ", 30, y);
      doc.setFont("helvetica", "bold");
      doc.text(formData.client.name, 30 + doc.getTextWidth("Name: "), y);
      doc.setFont("helvetica", "normal");
      y += 5;

      // Weitere Kundendetails würden hier folgen...
    } else {
      // Bei direktem Vertrag: Keine Agentur-Beziehung
      doc.text("Das Unternehmen handelt im eigenen Namen und auf eigene Rechnung.", 30, y);
    }
    y += 8; // Zusätzlicher Abstand

    // HINWEIS: Die neuen Felder 'exclusivity' und 'extraInformation' aus formData
    // müssten hier oder in einem relevanten Paragraphen (z.B. §9 für Exklusivität)
    // in den PDF-Inhalt eingefügt werden, falls sie im PDF erscheinen sollen.
    // Beispiel (muss an die richtige Stelle und formatiert werden):
    // if (formData.exclusivity) {
    //   y = PDFGenerator.addParagraphTitle(doc, "Exklusivität", y); // oder Teil von §9
    //   doc.text("Vereinbarte Exklusivität: " + formData.exclusivity, 30, y);
    //   y += 8;
    // }
    // if (formData.extraInformation) {
    //   y = PDFGenerator.addParagraphTitle(doc, "Zusätzliche Informationen", y);
    //   doc.text(formData.extraInformation, 30, y, { maxWidth: 150 }); // maxWidth anpassen
    //   y += 15; // Mehr Platz für Textarea-Inhalt
    // }


    // Der restliche Vertragstext würde hier folgen
    // Dies ist ein Beispiel, wie man weitere Teile des Vertrags einfügen würde

    // Unterschriftsfelder hinzufügen
    if (PDFGenerator && typeof PDFGenerator.addSignatureFields === 'function') {
      PDFGenerator.addSignatureFields(doc, formData.company.city);
    }
  }

  // InfluencerContract-Modul definieren
  var InfluencerContract = {
    init: init,
    getDisplayName: function() {
      return 'Influencer-Vertrag';
    },
    getDescription: function() {
      return 'Vertrag für Influencer-Marketing-Kooperationen';
    },
    updateProgress: updateProgress,
    updatePreview: updatePreview,
    generatePDF: generatePDF
  };

  // InfluencerContract-Modul global verfügbar machen und bei Factory registrieren
  window.ContractGenerator = window.ContractGenerator || {};
  window.ContractGenerator.InfluencerContract = InfluencerContract;

  // Bei der ContractTypeFactory registrieren, falls verfügbar
  if (ContractGenerator.ContractTypeFactory &&
    typeof ContractGenerator.ContractTypeFactory.registerContractType === 'function') {
    ContractGenerator.ContractTypeFactory.registerContractType('influencer', InfluencerContract);
  }
})();
