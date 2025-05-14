// form-submission-handler.js
// Dieses Skript ist verantwortlich für das Sammeln der Formulardaten
// und die Orchestrierung der Speicherung in Airtable und Webflow.
// AKTUELLE VERSION: Verbessertes Mapping für Webflow-Felder.

(function() {
    'use strict';

    // --- Konfiguration ---
    const WEBFLOW_CMS_POST_WORKER_URL = 'https://late-meadow-00bc.oliver-258.workers.dev/';
    const AIRTABLE_WORKER_URL = 'https://airtable-job-post.oliver-258.workers.dev/';
    const MAIN_FORM_ID = 'wf-form-post-job-form';
    const DATA_FIELD_ATTRIBUTE = 'data-preview-field';
    const SUPPORT_EMAIL = 'support@yourcompany.com'; // BITTE ERSETZEN!

    const POPUP_WRAPPER_ATTR = '[data-error-target="popup-wrapper"]';
    const POPUP_TITLE_ATTR = '[data-error-target="popup-title"]';
    const POPUP_MESSAGE_ATTR = '[data-error-target="popup-message"]';
    const CLOSE_POPUP_ATTR = '[data-error-target="close-popup"]';
    const MAIL_ERROR_ATTR = '[data-error-target="mail-error"]';

    // --- Mapping für Referenzfelder (Textwert zu Webflow Item ID) ---
    // WICHTIG:
    // 1. Die Schlüssel hier (z.B. 'creatorAge') müssen den Werten von DATA_FIELD_ATTRIBUTE in deinem Formular entsprechen.
    // 2. Die Werte der inneren Objekte (z.B. '4bf57b0debb3abf9dc11de2ddd50eac7') müssen die ECHTEN Webflow Item IDs sein.
    // 3. Alle 'deine_id_hier_...' sind PLATZHALTER und MÜSSEN ersetzt werden.
    const REFERENCE_MAPPINGS = {
        'creatorFollower': { // data-preview-field="creatorFollower"
            '0 - 2.500': '3d869451e837ddf527fc54d0fb477ab4',
            '2.500 - 5.000': 'e2d86c9f8febf4fecd674f01beb05bf5',
            // ... (restliche Optionen wie zuvor)
            '1.000.000+': '205b22b080e9f3bc2bb6869d12cbe298',
            'Keine Angabe': '5e33b6550adcb786fafd43d22c63de1'
        },
        'creatorAge': { // data-preview-field="creatorAge"
            '18-24': '4bf57b0debb3abf9dc11de2ddd50eac7',
            '25-35': '07fae9d66db85489dc77dd3594fba822',
            '36-50': 'a0745052dec634f59654ab2578d5db06',
            '50+': '44b95760d7ac99ecf71b2cbf8f610fdd',
            'Keine Angabe': '5660c84f647c97a3aee75cce5da8493b'
        },
        'genderOptional': { // data-preview-field="genderOptional"
            'Männlich': '6c84301c22d5e827d05308a33d6ef510',
            'Weiblich': 'bcb50387552afc123405ae7fa7640d0d',
            'Diverse': '870da58473ebc5d7db4c78e7363ca417',
            'Couple': '8bab076ffc2e114b52620f965aa046fb',
            'Alle': 'ec933c35230bc628da6029deee4159e',
            'Keine Angabe': 'd157525b18b53e62638884fd58368cfa8'
        },
        'videoDurationOptional': { // data-preview-field="videoDurationOptional"
            '0 - 15 Sekunden': 'a58ac00b365993a9dbc6e7084c6fda10',
            '15 - 30 Sekunden': '49914418e6b0fc02e4eb742f46658400',
            // ... (restliche Optionen wie zuvor)
            '60 - 90 Sekunden': '070c836b61cdb5d3bf49900ea9d11d1f'
        },
        'scriptOptional': { // data-preview-field="scriptOptional"
            'Brand': '3b95cafa5a06a54e025d38ba71b7b475',
            'Creator': 'f907b4b8d30d0b55cc831eb054094dad'
        },
        'hookCount': { // data-preview-field="hookCount"
            '1': 'b776e9ef4e9ab8b165019c1a2a04e8a',
            '2': '1667c831d9cba5adc9416401031796f3',
            '3': '355ef3ceb930ddbdd28458265b0a4cf0',
            '4': 'be2c319b5dccd012016df2e33408c39'
        },
        'videoFormat': {  // data-preview-field="videoFormat" - BITTE PLATZHALTER ERSETZEN!
            '16:9': 'deine_id_hier_16_9',
            '4:5': 'deine_id_hier_4_5',
            '9:16': 'deine_id_hier_9_16'
        },
        'industryCategory': { // data-preview-field="industryCategory" (für Multi-Select) - BITTE PLATZHALTER ERSETZEN!
            'Beauty': 'deine_id_hier_beauty_industrie',
            // Füge hier weitere Industrie-Kategorien hinzu: 'Text im Formular': 'Webflow_Item_ID_fuer_Industrie'
        },
        'subtitelOptional': { // data-preview-field="subtitelOptional" (vorher subtitlesOptional)
            'Ja': '587b210d6015c519f05e0aeea6abf1fa',
            'Nein': 'ac9e02ffc119b7bd0e05403e096f89b3'
        },
        'durationOptional': { // data-preview-field="durationOptional"
            '24 Monate': 'dd24b0de3f7a906d9619c8f56d9c2484',
            'unbegrenzt': 'dcbb14e9f4c1ee9aaeeddd62b4d8b625',
            // ... (restliche Optionen wie zuvor)
            '3 Monate': '9dab07affd09299a345cf4f2322ece34'
        },
        'creatorCategorie': { // data-preview-field="creatorCategorie" - Annahme: Referenz oder Option
            'UGC Creator': 'deine_id_hier_ugc_creator_kategorie',
            'Influencer': 'deine_id_hier_influencer_kategorie',
            // ... weitere Kategorien
        },
        // Wenn creatorLang und creatorLand Referenzfelder sind, füge sie hier hinzu:
        // 'creatorLang': { 'Deutsch': 'webflow_id_fuer_deutsch', 'Englisch': 'webflow_id_fuer_englisch', ... },
        // 'creatorLand': { 'Deutschland': 'webflow_id_fuer_de', 'Österreich': 'webflow_id_fuer_at', ... }
    };

    // --- Zuordnung von formData-Schlüsseln zu Webflow Feld-Slugs ---
    // Dies ist SEHR WICHTIG. Die Schlüssel hier sind die `data-preview-field` Werte.
    // Die Werte sind die exakten Feld-Slugs in deiner Webflow Collection.
    const WEBFLOW_FIELD_SLUG_MAPPINGS = {
        'projectName': 'project-name', // Beispiel: data-preview-field="projectName" -> Webflow Slug "project-name"
        'job-title': 'job-title-slug',   // Wenn du ein separates Feld für den Jobtitel neben 'name' hast
        'budget': 'budget',
        'startDate': 'start-date',
        'endDate': 'end-date',
        'jobOnline': 'job-online-deadline', // Bewerbungsfrist
        'creatorCount': 'creator-count', // Kann eine Zahl sein oder muss gemappt werden, wenn Referenz/Option
        'creatorCategorie': 'creator-kategorie', // Wird über REFERENCE_MAPPINGS gehandhabt, wenn dort definiert
        'aufgabe': 'job-beschreibung-aufgabe',
        'steckbrief': 'job-beschreibung-steckbrief',
        'creatorLang': 'sprachen', // Für Multi-Referenz oder Multi-Option
        'creatorLand': 'laender',  // Für Multi-Referenz oder Multi-Option
        'job-adress-optional': 'job-adresse',
        'videoCountOptional': 'anzahl-videos',
        'imgCountOptional': 'anzahl-bilder',
        'videoDurationOptional': 'video-laenge', // Wird über REFERENCE_MAPPINGS gehandhabt
        'reviewsOptional': 'anzahl-reviews',
        'durationOptional': 'nutzungsdauer-rechte', // Wird über REFERENCE_MAPPINGS gehandhabt
        'scriptOptional': 'script-verantwortung', // Wird über REFERENCE_MAPPINGS gehandhabt
        'jobImageUpload': 'job-image', // Webflow Bildfeld erwartet spezielle Struktur! { "fileId": "...", "url": "..." } oder nur URL wenn Plain Text
        'industryCategory': 'industrie-kategorie', // Wird über REFERENCE_MAPPINGS gehandhabt (Multi)
        'creatorAge': 'gesuchtes-alter', // Wird über REFERENCE_MAPPINGS gehandhabt
        'videoFormat': 'video-format',   // Wird über REFERENCE_MAPPINGS gehandhabt
        'hookCount': 'anzahl-hooks',     // Wird über REFERENCE_MAPPINGS gehandhabt
        'subtitelOptional': 'untertitel-erforderlich', // Wird über REFERENCE_MAPPINGS gehandhabt
        'barterDealToggle': 'barter-deal', // Switch-Feld
        'plusJobToggle': 'plus-job',       // Switch-Feld
        'nutzungOptional': 'nutzungszwecke', // Multi-Referenz oder Textfeld, das ein Array von Strings als kommaseparierten String erwartet?
        'channels': 'kanaele',               // dito
        'previewText': 'preview-text',
        'userName': 'ansprechpartner-name', // Oder was auch immer das Memberstack Feld repräsentiert
        'webflowId': 'memberstack-webflow-id', // (von Memberstack)
        'memberEmail': 'ansprechpartner-email',
        'memberstackId': 'memberstack-id',
        // Spezifische Felder, die nicht direkt aus dem Formular kommen, aber für Webflow benötigt werden:
        'airtable-record-id': 'airtable-record-id', // Slug für das Feld, das die Airtable ID speichert
        'admin-test': 'admin-freigabe'          // Slug für das Admin-Test Switch-Feld
    };


    // --- Hilfsfunktionen (showCustomPopup, closeCustomPopup, formatToISODate, slugify, find, findAll) ---
    // ... (Diese Funktionen bleiben wie in der vorherigen Version)
    const find = (selector, element = document) => element.querySelector(selector);
    const findAll = (selector, element = document) => element.querySelectorAll(selector);

    function showCustomPopup(message, type, title, supportDetails = '') {
        const popup = find(POPUP_WRAPPER_ATTR);
        const popupTitle = find(POPUP_TITLE_ATTR);
        const popupMessage = find(POPUP_MESSAGE_ATTR);
        const mailIconLink = find(MAIL_ERROR_ATTR);

        if (!popup || !popupTitle || !popupMessage || !mailIconLink) {
            console.error("Popup-Elemente nicht gefunden!");
            console.log(`Status: ${type.toUpperCase()} - Titel: ${title} - Nachricht: ${message}`);
            if (supportDetails) console.log('Support Details:', supportDetails);
            return;
        }
        popup.setAttribute('data-popup-type', type);
        popupTitle.textContent = title;
        popupMessage.textContent = message;

        if (type === 'error') {
            mailIconLink.style.display = 'inline-block';
            const subject = encodeURIComponent(`Fehlerbericht Formularübermittlung (${title})`);
            const body = encodeURIComponent(`Es ist ein Fehler im Formular aufgetreten:\n\nNachricht für den Benutzer:\n${message}\n\nSupport Details:\n${supportDetails}\n\nZeitstempel: ${new Date().toISOString()}\nBrowser: ${navigator.userAgent}\nSeite: ${window.location.href}`);
            mailIconLink.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
            mailIconLink.target = '_blank';
        } else {
            mailIconLink.style.display = 'none';
            mailIconLink.href = '#';
        }
        popup.style.display = 'flex';
        if (type !== 'error') {
            setTimeout(closeCustomPopup, 7000); // Länger bei Erfolg
        }
    }

    function closeCustomPopup() {
        const popup = find(POPUP_WRAPPER_ATTR);
        if (popup) {
            popup.style.display = 'none';
        }
    }

     document.addEventListener('DOMContentLoaded', () => {
        const closeBtn = find(CLOSE_POPUP_ATTR);
        if (closeBtn) {
            closeBtn.addEventListener('click', closeCustomPopup);
        }
    });

    function formatToISODate(dateString) {
        if (!dateString) return null;
        // Prüfe, ob es bereits ein ISO-Datum mit Zeit ist
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(dateString)) {
            return dateString;
        }
        let dateObj;
        const deParts = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (deParts) {
            dateObj = new Date(Date.UTC(parseInt(deParts[3]), parseInt(deParts[2]) - 1, parseInt(deParts[1])));
        } else {
            // Versuche YYYY-MM-DD oder andere von Date.parse unterstützte Formate
            // Wichtig: Date.parse kann lokale Zeitzone interpretieren, Date.UTC verwenden für Konsistenz
            const parts = dateString.split('-');
            if (parts.length === 3) { // YYYY-MM-DD
                 dateObj = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
            } else {
                dateObj = new Date(dateString); // Fallback, könnte lokale Zeitzone verwenden
            }
        }
        if (isNaN(dateObj.getTime())) {
            console.warn('Ungültiges Datumsformat für ISO-Konvertierung:', dateString);
            return null;
        }
        return dateObj.toISOString(); // Gibt immer UTC zurück
    }


    // --- Datensammlung (collectAndFormatFormData) ---
    // ... (Diese Funktion bleibt weitgehend wie zuvor, sammelt Rohdaten)
    function collectAndFormatFormData(formElement) {
        const formData = {};
        const fields = findAll(`[${DATA_FIELD_ATTRIBUTE}]`, formElement);
        let projectNameValue = '';

        const creatorLangValues = [];
        const creatorLandValues = [];
        const nutzungOptionalValues = [];
        const channelsValues = [];

        fields.forEach(field => {
            const fieldNameKey = field.getAttribute(DATA_FIELD_ATTRIBUTE);
            let value;

            switch (fieldNameKey) {
                case 'projectName':
                    projectNameValue = field.value.trim();
                    formData[fieldNameKey] = projectNameValue;
                    break;
                case 'jobSlug':
                    break;
                case 'creatorLand':
                    if (field.checked) creatorLandValues.push(field.value.trim());
                    break;
                case 'creatorLang':
                    if (field.checked) creatorLangValues.push(field.value.trim());
                    break;
                case 'nutzungOptional':
                    if (field.checked) nutzungOptionalValues.push(field.value.trim());
                    break;
                case 'channels':
                    if (field.checked) channelsValues.push(field.value.trim());
                    break;
                default:
                    if (field.type === 'checkbox') {
                        value = field.checked; // Boolean für einzelne Checkboxen (Toggles)
                        formData[fieldNameKey] = value;
                    } else if (field.type === 'radio') {
                        if (field.checked) {
                           formData[fieldNameKey] = field.value.trim();
                        }
                    } else if (field.tagName === 'SELECT') {
                        value = field.options[field.selectedIndex]?.value || field.value;
                        if (value !== undefined && value !== null && value !== '') formData[fieldNameKey] = value;
                    } else if (field.type === 'number') {
                        const numVal = field.value.trim();
                        if (numVal !== '') formData[fieldNameKey] = parseFloat(numVal);
                        // else formData[fieldNameKey] = null; // oder 0, je nach Anforderung
                    } else {
                        value = field.value.trim();
                        if (value !== '') formData[fieldNameKey] = value;
                    }
            }
        });

        if (creatorLangValues.length > 0) formData['creatorLang'] = creatorLangValues;
        if (creatorLandValues.length > 0) formData['creatorLand'] = creatorLandValues; // In der Regel nur ein Land, wenn Radiobuttons
        if (nutzungOptionalValues.length > 0) formData['nutzungOptional'] = nutzungOptionalValues;
        if (channelsValues.length > 0) formData['channels'] = channelsValues;

        const jobOnlineField = find(`[${DATA_FIELD_ATTRIBUTE}="jobOnline"]`);
        if (jobOnlineField) {
            const jobOnlineValue = jobOnlineField.value.trim();
            let isoDate;
            if (jobOnlineValue === '') {
                const today = new Date();
                today.setUTCDate(today.getUTCDate() + 3); // Add 3 days in UTC
                today.setUTCHours(0, 0, 0, 0);       // Set to midnight UTC
                isoDate = today.toISOString();
            } else {
                isoDate = formatToISODate(jobOnlineValue);
            }
            if (isoDate) formData['jobOnline'] = isoDate;
        }

        const budgetField = find(`[${DATA_FIELD_ATTRIBUTE}="budget"]`);
        if (budgetField) {
            const budgetValue = budgetField.value.trim();
            formData['budget'] = budgetValue === '' ? 0 : parseFloat(budgetValue);
        } else {
            formData['budget'] = 0; // Default budget to 0 if field not found or empty
        }


        if (projectNameValue) {
            formData['job-title'] = projectNameValue;
        }

        const memberstackFields = findAll('[data-ms-member][data-preview-field]');
        memberstackFields.forEach(field => {
            const fieldNameKey = field.getAttribute(DATA_FIELD_ATTRIBUTE);
            const value = field.value.trim();
            if (value !== '') formData[fieldNameKey] = value;
        });

        console.log('Gesammelte Formulardaten (roh):', JSON.parse(JSON.stringify(formData)));
        return formData;
    }


    // --- Airtable Löschfunktion (deleteAirtableRecord) ---
    // ... (Diese Funktion bleibt wie zuvor)
    async function deleteAirtableRecord(airtableRecordId, reason = 'Unknown error') {
        if (!airtableRecordId) {
            console.warn('Keine Airtable Record ID zum Löschen vorhanden.');
            return;
        }
        console.log(`Versuche Airtable Record ${airtableRecordId} zu löschen wegen: ${reason}`);
        try {
            const response = await fetch(AIRTABLE_WORKER_URL + '/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recordId: airtableRecordId, reason: reason })
            });
            if (response.ok) {
                console.log(`Airtable Record ${airtableRecordId} erfolgreich gelöscht.`);
            } else {
                const responseData = await response.json().catch(() => ({})); // Handle empty/invalid JSON
                console.error(`Fehler beim Löschen von Airtable Record ${airtableRecordId}:`, response.status, responseData);
            }
        } catch (error) {
            console.error(`Unerwarteter Fehler beim Aufruf des Airtable Lösch-Endpunkts für ${airtableRecordId}:`, error);
        }
    }


    async function handleFormSubmit(event, testData = null) {
        event.preventDefault();
        const form = find(`#${MAIN_FORM_ID}`);
        const submitButton = form ? form.querySelector('button[type="submit"], input[type="submit"]') : null;


        if (submitButton) {
            submitButton.disabled = true;
            submitButton.value = 'Wird gesendet...'; // Für input type="submit"
            if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Wird gesendet...';
        }
        showCustomPopup('Daten werden gesammelt...', 'loading', 'Vorbereitung');

        const rawFormData = testData ? testData : collectAndFormatFormData(form);

        if (!rawFormData['projectName'] && !rawFormData['job-title']) {
            const errorMessage = 'Fehler: Job-Titel (projectName) fehlt.';
            console.error(errorMessage);
            showCustomPopup(errorMessage, 'error', 'Fehler: Fehlende Daten', `Frontend Fehler: projectName oder job-title fehlt. Gesammelte Daten: ${JSON.stringify(rawFormData)}`);
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.value = 'Absenden fehlgeschlagen';
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Absenden fehlgeschlagen';
            }
            return;
        }

        let airtableRecordId = null;
        let webflowItemId = null;

        try {
            // --- Schritt 1: Daten an Airtable Worker senden (Erstellen) ---
            // Airtable ist flexibler, wir senden die rawFormData (nachdem sie von collectAndFormatFormData aufbereitet wurde)
            showCustomPopup('Daten werden in Airtable gespeichert...', 'loading', 'Airtable Speicherung');
            console.log('Sende an Airtable Worker (Create):', AIRTABLE_WORKER_URL, JSON.stringify({ jobDetails: rawFormData }));
            const airtableCreateResponse = await fetch(AIRTABLE_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobDetails: rawFormData })
            });
            const airtableCreateResponseData = await airtableCreateResponse.json();

            if (!airtableCreateResponse.ok) {
                console.error('Fehler vom Airtable Worker (Create):', airtableCreateResponse.status, airtableCreateResponseData);
                let userMessage = `Es ist ein Fehler beim Speichern des Jobs in Airtable aufgetreten (${airtableCreateResponse.status}).`;
                let supportDetails = `Airtable Create Worker Status: ${airtableCreateResponse.status}.`;
                if (airtableCreateResponseData) supportDetails += ` Worker Response: ${JSON.stringify(airtableCreateResponseData)}`;
                showCustomPopup(userMessage, 'error', 'Airtable Fehler', supportDetails);
                if (submitButton) { submitButton.disabled = false; submitButton.value = 'Erneut versuchen'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Erneut versuchen';}
                return;
            }

            console.log('Antwort vom Airtable Worker (Create):', airtableCreateResponseData);
            airtableRecordId = airtableCreateResponseData.records && airtableCreateResponseData.records.length > 0 ? airtableCreateResponseData.records[0].id : null;

            if (!airtableRecordId) {
                console.error('Airtable Record ID nicht in der Antwort des Create Workers gefunden.', airtableCreateResponseData);
                showCustomPopup('Job in Airtable erstellt, aber Record ID nicht erhalten. Prozess abgebrochen.', 'error', 'Airtable Fehler', `Airtable Create Worker Erfolg, aber keine Record ID. Response: ${JSON.stringify(airtableCreateResponseData)}`);
                if (submitButton) { submitButton.disabled = false; submitButton.value = 'Erneut versuchen'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Erneut versuchen';}
                return;
            }
            console.log('Airtable Record erfolgreich erstellt mit ID:', airtableRecordId);
            showCustomPopup('Job erfolgreich in Airtable gespeichert. Erstelle Item in Webflow...', 'loading', 'Webflow Erstellung');


            // --- Schritt 2: Daten für Webflow aufbereiten und senden ---
            const webflowFieldData = {};

            // Standardfelder Name und Slug
            webflowFieldData['name'] = rawFormData['job-title'] || rawFormData['projectName'] || 'Unbenannter Job';
            webflowFieldData['slug'] = airtableRecordId;

            // Iteriere durch die WEBFLOW_FIELD_SLUG_MAPPINGS, um die Payload für Webflow zu erstellen
            for (const formDataKey in WEBFLOW_FIELD_SLUG_MAPPINGS) {
                const webflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS[formDataKey];
                let formValue = rawFormData[formDataKey];

                if (formValue === undefined || formValue === null || formValue === '') {
                    // Überspringe leere oder nicht definierte Werte, außer Booleans
                    if (typeof formValue === 'boolean') {
                         webflowFieldData[webflowSlug] = formValue;
                    }
                    continue;
                }

                // A. Referenz-Mapping anwenden (für Single-Select und Multi-Select Referenzen/Optionen)
                if (REFERENCE_MAPPINGS[formDataKey]) {
                    if (Array.isArray(formValue)) { // Multi-Select
                        const mappedIds = formValue
                            .map(itemText => REFERENCE_MAPPINGS[formDataKey][itemText])
                            .filter(id => id); // Entferne undefined, falls ein Text nicht gemappt werden konnte
                        if (mappedIds.length > 0) {
                            webflowFieldData[webflowSlug] = mappedIds;
                        } else {
                             console.warn(`Keine gültigen Webflow IDs für Multi-Select Feld '${formDataKey}' gefunden. Formularwerte: ${formValue.join(', ')}`);
                        }
                    } else { // Single-Select
                        const mappedId = REFERENCE_MAPPINGS[formDataKey][formValue];
                        if (mappedId) {
                            webflowFieldData[webflowSlug] = mappedId;
                        } else {
                             console.warn(`Keine gültige Webflow ID für Single-Select Feld '${formDataKey}' gefunden. Formularwert: ${formValue}`);
                        }
                    }
                }
                // B. Spezielle Behandlung für Felder, die nicht in REFERENCE_MAPPINGS sind, aber Arrays sein könnten
                else if ( (formDataKey === 'creatorLang' || formDataKey === 'creatorLand' || formDataKey === 'nutzungOptional' || formDataKey === 'channels') && Array.isArray(formValue) ) {
                     // Annahme: Diese sind Multi-Option Felder in Webflow, die ein Array von Strings erwarten
                     // ODER sie hätten in REFERENCE_MAPPINGS sein sollen, wenn sie Multi-Referenz sind.
                    webflowFieldData[webflowSlug] = formValue;
                }
                // C. Datumsfelder
                else if (['startDate', 'endDate', 'jobOnline'].includes(formDataKey)) {
                    const isoDate = formatToISODate(formValue);
                    if (isoDate) webflowFieldData[webflowSlug] = isoDate;
                }
                // D. Boolean-Felder (Toggles)
                else if (typeof formValue === 'boolean') {
                    webflowFieldData[webflowSlug] = formValue;
                }
                // E. Zahlenfelder
                else if (formDataKey === 'budget' || formDataKey === 'creatorCount' || formDataKey === 'videoCountOptional' || formDataKey === 'imgCountOptional') {
                    const num = parseFloat(formValue);
                    if (!isNaN(num)) webflowFieldData[webflowSlug] = num;
                }
                // F. Alle anderen Felder als Text übernehmen (wenn der Slug definiert ist)
                else if (webflowSlug) {
                    webflowFieldData[webflowSlug] = String(formValue);
                }
            }

            // Füge spezifische Felder hinzu, die nicht direkt aus dem Formular-Mapping kommen
            webflowFieldData[WEBFLOW_FIELD_SLUG_MAPPINGS['airtable-record-id'] || 'airtable-record-id'] = airtableRecordId;
            webflowFieldData[WEBFLOW_FIELD_SLUG_MAPPINGS['admin-test'] || 'admin-test'] = true; // Oder wie auch immer der Slug für dein Admin-Test-Feld lautet

            // Entferne Felder, die nicht an Webflow gesendet werden sollen (z.B. wenn sie nur für Airtable waren)
            // delete webflowFieldData['someAirtableOnlyField'];

            console.log('Sende an Webflow Worker (Create) - Aufbereitete Daten:', WEBFLOW_CMS_POST_WORKER_URL, JSON.stringify({ fields: webflowFieldData }));
            const webflowCreateResponse = await fetch(WEBFLOW_CMS_POST_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: webflowFieldData })
            });
            const webflowCreateResponseData = await webflowCreateResponse.json().catch(() => ({})); // Handle empty/invalid JSON

            if (!webflowCreateResponse.ok) {
                console.error('Fehler vom Webflow Worker (Create):', webflowCreateResponse.status, JSON.stringify(webflowCreateResponseData));
                let userMessage = `Es ist ein Fehler beim Erstellen des Jobs in Webflow aufgetreten (${webflowCreateResponse.status}).`;
                let errorDetails = webflowCreateResponseData.error?.message || webflowCreateResponseData.message || (typeof webflowCreateResponseData.details === 'string' ? webflowCreateResponseData.details : '');

                if (webflowCreateResponseData.details && Array.isArray(webflowCreateResponseData.details)) {
                    errorDetails = webflowCreateResponseData.details.map(d => `Feld '${d.path && d.path.length ? d.path.join('.') : (d.field || 'unbekannt')}' - ${d.message || d.reason}`).join('; ');
                } else if (typeof webflowCreateResponseData.error === 'object' && webflowCreateResponseData.error.details) {
                     errorDetails = JSON.stringify(webflowCreateResponseData.error.details);
                }

                if (errorDetails) userMessage += ` Details: ${errorDetails}`;

                const supportDetails = `Webflow Create Worker Status: ${webflowCreateResponse.status}. Worker Response: ${JSON.stringify(webflowCreateResponseData)}. Payload Sent: ${JSON.stringify({ fields: webflowFieldData })}`;
                showCustomPopup(userMessage, 'error', 'Webflow Fehler', supportDetails);
                deleteAirtableRecord(airtableRecordId, `Webflow creation failed: ${userMessage}`);
                if (submitButton) { submitButton.disabled = false; submitButton.value = 'Erneut versuchen'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Erneut versuchen';}
                return;
            }

            console.log('Antwort vom Webflow Worker (Create):', webflowCreateResponseData);
            webflowItemId = webflowCreateResponseData.id || (webflowCreateResponseData.item && webflowCreateResponseData.item.id); // Webflow V2 API gibt {id: ...} zurück

            if (!webflowItemId) {
                console.error('Webflow Item ID nicht in der Antwort des Create Workers gefunden.', webflowCreateResponseData);
                showCustomPopup('Job in Webflow erstellt, aber ID nicht erhalten. Airtable-Aktualisierung nicht möglich.', 'success', 'Webflow Erfolg mit Hinweis', `Webflow Create Worker Erfolg, aber keine Item ID. Response: ${JSON.stringify(webflowCreateResponseData)}`);
                if (submitButton) { submitButton.disabled = false; submitButton.value = 'Teilweise erfolgreich'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Teilweise erfolgreich';}
                return;
            }
            console.log('Webflow Item erfolgreich erstellt mit ID:', webflowItemId);
            showCustomPopup('Job erfolgreich in Webflow erstellt. Aktualisiere Airtable mit Webflow ID...', 'loading', 'Airtable Aktualisierung');

            // --- Schritt 3: Airtable Worker aufrufen (Aktualisieren) ---
            console.log('Sende an Airtable Worker (Update):', AIRTABLE_WORKER_URL + '/update', JSON.stringify({ recordId: airtableRecordId, webflowId: webflowItemId }));
            const airtableUpdateResponse = await fetch(AIRTABLE_WORKER_URL + '/update', {
                method: 'POST', // Oder PATCH
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recordId: airtableRecordId, webflowId: webflowItemId })
            });
            const airtableUpdateResponseData = await airtableUpdateResponse.json();

            if (!airtableUpdateResponse.ok) {
                console.error('Fehler vom Airtable Worker (Update):', airtableUpdateResponse.status, airtableUpdateResponseData);
                let userMessage = `Es ist ein Fehler beim Aktualisieren des Jobs in Airtable aufgetreten (${airtableUpdateResponse.status}).`;
                let supportDetails = `Airtable Update Worker Status: ${airtableUpdateResponse.status}.`;
                if (airtableUpdateResponseData) supportDetails += ` Worker Response: ${JSON.stringify(airtableUpdateResponseData)}`;
                showCustomPopup(userMessage, 'error', 'Airtable Fehler', supportDetails);
                if (submitButton) { submitButton.disabled = false; submitButton.value = 'Teilweise erfolgreich'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Teilweise erfolgreich';}
                return;
            }

            console.log('Antwort vom Airtable Worker (Update):', airtableUpdateResponseData);
            showCustomPopup('Job erfolgreich in Webflow und Airtable gespeichert!', 'success', 'Erfolgreich');
            if (submitButton) {
                submitButton.value = 'Erfolgreich gesendet!';
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Erfolgreich gesendet!';
                 // Optional: form.reset();
                 // Optional: window.location.href = '/success-page';
            }

        } catch (error) {
            console.error('Unerwarteter Fehler beim Absenden:', error);
            const userMessage = `Ein unerwarteter Fehler ist aufgetreten: ${error.message}.`;
            const supportDetails = `Unerwarteter Frontend Fehler: ${error.message}. Stack: ${error.stack}. Raw Form Data: ${JSON.stringify(rawFormData)}`;
            showCustomPopup(userMessage, 'error', 'Unerwarteter Fehler', supportDetails);
            if (airtableRecordId && !webflowItemId) {
                deleteAirtableRecord(airtableRecordId, `Unexpected frontend error: ${error.message}`);
            }
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.value = 'Fehler, erneut versuchen';
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Fehler, erneut versuchen';
            }
        } finally {
            if (submitButton && (submitButton.value === 'Wird gesendet...' || (submitButton.tagName === 'BUTTON' && submitButton.textContent === 'Wird gesendet...'))) {
                submitButton.disabled = false;
                submitButton.value = 'Absenden';
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Absenden';
            }
        }
    }

    // --- Initialisierung und Testfunktion ---
    function testSubmissionWithData(testData) {
        console.log('Starte Test-Übermittlung mit Daten:', testData);
        const mainForm = find(`#${MAIN_FORM_ID}`);
        if (!mainForm) {
            console.error(`Hauptformular mit ID "${MAIN_FORM_ID}" nicht gefunden.`);
            return;
        }
        const simulatedEvent = { preventDefault: () => {}, target: mainForm };
        handleFormSubmit(simulatedEvent, testData);
    }
    window.testSubmissionWithData = testSubmissionWithData;
    console.log('Testfunktion testSubmissionWithData ist verfügbar. Rufe z.B. testSubmissionWithData({"projectName":"Test Job", "budget":100}) auf.');

    document.addEventListener('DOMContentLoaded', () => {
        const mainForm = find(`#${MAIN_FORM_ID}`);
        if (mainForm) {
            mainForm.removeEventListener('submit', handleFormSubmit);
            mainForm.addEventListener('submit', (event) => handleFormSubmit(event, null));
            console.log(`Form Submission Handler initialisiert für Formular: #${MAIN_FORM_ID}`);
        } else {
            console.warn(`Hauptformular mit ID "${MAIN_FORM_ID}" nicht gefunden.`);
        }
    });

})();
