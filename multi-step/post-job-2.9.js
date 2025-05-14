// form-submission-handler.js
// Dieses Skript ist verantwortlich für das Sammeln der Formulardaten
// und die Orchestrierung der Speicherung in Airtable und Webflow.
// AKTUELLE VERSION: Fügt das erforderliche 'name'-Feld für Webflow hinzu.

(function() {
    'use strict';

    // --- Konfiguration ---
    const WEBFLOW_CMS_POST_WORKER_URL = 'https://late-meadow-00bc.oliver-258.workers.dev/';
    const AIRTABLE_WORKER_URL = 'https://airtable-job-post.oliver-258.workers.dev/';
    const MAIN_FORM_ID = 'wf-form-post-job-form';
    const DATA_FIELD_ATTRIBUTE = 'data-preview-field';
    const CLASS_HIDE = 'hide';
    const SUPPORT_EMAIL = 'support@yourcompany.com'; // BITTE ERSETZEN!

    const POPUP_WRAPPER_ATTR = '[data-error-target="popup-wrapper"]';
    const POPUP_TITLE_ATTR = '[data-error-target="popup-title"]';
    const POPUP_MESSAGE_ATTR = '[data-error-target="popup-message"]';
    const CLOSE_POPUP_ATTR = '[data-error-target="close-popup"]';
    const MAIL_ERROR_ATTR = '[data-error-target="mail-error"]';

    // --- Mapping für Referenzfelder (Textwert zu Webflow Item ID) ---
    // HINWEIS: Bitte stelle sicher, dass alle 'deine_id_hier_...' Platzhalter
    // durch die tatsächlichen Webflow Item IDs ersetzt werden!
    const REFERENCE_MAPPINGS = {
        'creatorFollower': {
            '0 - 2.500': '3d869451e837ddf527fc54d0fb477ab4',
            '2.500 - 5.000': 'e2d86c9f8febf4fecd674f01beb05bf5',
            '5.000 - 10.000': '27420dd46db02b53abb3a50d4859df84',
            '10.000 - 25.000': 'd61d9c5625c03e86d87ef854aa702265',
            '25.000 - 50.000': '78672a41f18d13b57c84e24ae8f9edb9',
            '50.00 - 100.000': '4ed1bbe4e792cfae473584da597445a8',
            '100.000 - 250.000': 'afb6fa102d3defaad347edae3fc8452a',
            '250.000 - 500.000': '6a1072f2e2a7058fba98f58fb45ab7fe',
            '500.000 - 1.000.000': '18efe7a8d618cf2c2344329254f5ee0b',
            '1.000.000+': '205b22b080e9f3bc2bb6869d12cbe298',
            'Keine Angabe': '5e33b6550adcb786fafd43d22c63de1'
        },
        'creatorAge': {
            '18-24': '4bf57b0debb3abf9dc11de2ddd50eac7',
            '25-35': '07fae9d66db85489dc77dd3594fba822',
            '36-50': 'a0745052dec634f59654ab2578d5db06',
            '50+': '44b95760d7ac99ecf71b2cbf8f610fdd',
            'Keine Angabe': '5660c84f647c97a3aee75cce5da8493b'
        },
        'genderOptional': {
            'Männlich': '6c84301c22d5e827d05308a33d6ef510',
            'Weiblich': 'bcb50387552afc123405ae7fa7640d0d',
            'Diverse': '870da58473ebc5d7db4c78e7363ca417',
            'Couple': '8bab076ffc2e114b52620f965aa046fb',
            'Alle': 'ec933c35230bc628da6029deee4159e',
            'Keine Angabe': 'd157525b18b53e62638884fd58368cfa8'
        },
        'videoDurationOptional': {
            '0 - 15 Sekunden': 'a58ac00b365993a9dbc6e7084c6fda10',
            '15 - 30 Sekunden': '49914418e6b0fc02e4eb742f46658400',
            '30 - 45 Sekunden': '6ef12194838992fb1584150b97d246f3',
            '45 - 60 Sekunden': '37b2d32959e6be1bfaa5a60427229be3',
            '60 - 90 Sekunden': '070c836b61cdb5d3bf49900ea9d11d1f'
        },
        'scriptOptional': {
            'Brand': '3b95cafa5a06a54e025d38ba71b7b475',
            'Creator': 'f907b4b8d30d0b55cc831eb054094dad'
        },
        'hookCount': {
            '1': 'b776e9ef4e9ab8b165019c1a2a04e8a',
            '2': '1667c831d9cba5adc9416401031796f3',
            '3': '355ef3ceb930ddbdd28458265b0a4cf0',
            '4': 'be2c319b5dccd012016df2e33408c39'
        },
        'videoFormat': { // BITTE PLATZHALTER ERSETZEN!
            '16:9': 'deine_id_hier_16_9',
            '4:5': 'deine_id_hier_4_5',
            '9:16': 'deine_id_hier_9_16'
        },
        'industryCategory': { // BITTE PLATZHALTER ERSETZEN!
            'Beauty': 'deine_id_hier_beauty',
            // Füge hier weitere Industrie-Kategorien hinzu
        },
        'subtitlesOptional': {
            'Ja': '587b210d6015c519f05e0aeea6abf1fa',
            'Nein': 'ac9e02ffc119b7bd0e05403e096f89b3'
        },
        'durationOptional': {
            '24 Monate': 'dd24b0de3f7a906d9619c8f56d9c2484',
            'unbegrenzt': 'dcbb14e9f4c1ee9aaeeddd62b4d8b625',
            '18 Monate': 'c97680a1c8a5214809b7885b00e7c1d8',
            '12 Monate': 'e544d894fe78aaeaf83d8d5a35be5f3f',
            '6 Monate': 'b8353db272656593b627e67fb4730bd6',
            '3 Monate': '9dab07affd09299a345cf4f2322ece34'
        }
    };

    // --- Hilfsfunktionen ---
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
            setTimeout(closeCustomPopup, 5000);
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
        let dateObj;
        const deParts = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (deParts) {
            dateObj = new Date(parseInt(deParts[3]), parseInt(deParts[2]) - 1, parseInt(deParts[1]));
        } else {
            dateObj = new Date(dateString);
        }
        if (isNaN(dateObj.getTime())) {
            console.warn('Ungültiges Datumsformat für ISO-Konvertierung:', dateString);
            return null;
        }
        return dateObj.toISOString();
    }

    function slugify(text) {
        if (!text) return '';
        return text.toString().toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '')
            .replace(/-+/g, '-');
    }

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
                case 'jobSlug': // Wird nicht mehr für Haupt-Slug verwendet
                    break;
                // Behandle Checkbox-Gruppen separat weiter unten
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
                default: // Standard Datensammlung für die meisten Felder
                    if (field.type === 'checkbox') {
                        value = field.checked;
                        formData[fieldNameKey] = value;
                    } else if (field.tagName === 'SELECT') {
                        value = field.options[field.selectedIndex]?.value || field.value;
                        if (value !== '') formData[fieldNameKey] = value;
                    } else if (field.type === 'number') {
                        const numVal = field.value.trim();
                        if (numVal !== '') formData[fieldNameKey] = parseFloat(numVal);
                    } else {
                        value = field.value.trim();
                        if (value !== '') formData[fieldNameKey] = value;
                    }
            }
        });

        if (creatorLangValues.length > 0) formData['creatorLang'] = creatorLangValues;
        if (creatorLandValues.length > 0) formData['creatorLand'] = creatorLandValues;
        if (nutzungOptionalValues.length > 0) formData['nutzungOptional'] = nutzungOptionalValues;
        if (channelsValues.length > 0) formData['channels'] = channelsValues;

        const jobOnlineField = find(`[${DATA_FIELD_ATTRIBUTE}="jobOnline"]`);
        if (jobOnlineField) {
            const jobOnlineValue = jobOnlineField.value.trim();
            let isoDate;
            if (jobOnlineValue === '') {
                const today = new Date();
                today.setDate(today.getDate() + 3);
                today.setHours(0, 0, 0, 0);
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
        }

        if (projectNameValue) {
            formData['job-title'] = projectNameValue; // Stelle sicher, dass 'job-title' gesetzt wird
        }

        const memberstackFields = findAll('[data-ms-member][data-preview-field]');
        memberstackFields.forEach(field => {
            const fieldNameKey = field.getAttribute(DATA_FIELD_ATTRIBUTE);
            const value = field.value.trim();
            if (value !== '') formData[fieldNameKey] = value;
        });

        console.log('Gesammelte Formulardaten für Worker:', formData);
        return formData;
    }

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
                const responseData = await response.json();
                console.error(`Fehler beim Löschen von Airtable Record ${airtableRecordId}:`, response.status, responseData);
            }
        } catch (error) {
            console.error(`Unerwarteter Fehler beim Aufruf des Airtable Lösch-Endpunkts für ${airtableRecordId}:`, error);
        }
    }

    async function handleFormSubmit(event, testData = null) {
        event.preventDefault();
        const form = find(`#${MAIN_FORM_ID}`);
        const submitButton = form ? form.querySelector('button[type="submit"]') : null;

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Wird gesendet...';
        }
        showCustomPopup('Daten werden gesammelt...', 'loading', 'Vorbereitung');

        const formData = testData ? testData : collectAndFormatFormData(form);

        if (!formData['projectName'] && !formData['job-title']) { // Prüfe beides, da job-title von projectName abhängt
            const errorMessage = 'Fehler: Job-Titel (projectName) fehlt.';
            console.error(errorMessage);
            showCustomPopup(errorMessage, 'error', 'Fehler: Fehlende Daten', `Frontend Fehler: projectName oder job-title fehlt. Gesammelte Daten: ${JSON.stringify(formData)}`);
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Absenden fehlgeschlagen';
            }
            return;
        }

        let airtableRecordId = null;
        let webflowItemId = null;

        try {
            showCustomPopup('Daten werden in Airtable gespeichert...', 'loading', 'Airtable Speicherung');
            console.log('Sende an Airtable Worker (Create):', AIRTABLE_WORKER_URL, JSON.stringify({ jobDetails: formData }));
            const airtableCreateResponse = await fetch(AIRTABLE_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobDetails: formData })
            });
            const airtableCreateResponseData = await airtableCreateResponse.json();

            if (!airtableCreateResponse.ok) {
                console.error('Fehler vom Airtable Worker (Create):', airtableCreateResponse.status, airtableCreateResponseData);
                let userMessage = `Es ist ein Fehler beim Speichern des Jobs in Airtable aufgetreten (${airtableCreateResponse.status}).`;
                let supportDetails = `Airtable Create Worker Status: ${airtableCreateResponse.status}.`;
                if (airtableCreateResponseData) supportDetails += ` Worker Response: ${JSON.stringify(airtableCreateResponseData)}`;
                showCustomPopup(userMessage, 'error', 'Airtable Fehler', supportDetails);
                if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Erneut versuchen';}
                return;
            }

            console.log('Antwort vom Airtable Worker (Create):', airtableCreateResponseData);
            airtableRecordId = airtableCreateResponseData.records && airtableCreateResponseData.records.length > 0 ? airtableCreateResponseData.records[0].id : null;

            if (!airtableRecordId) {
                console.error('Airtable Record ID nicht in der Antwort des Create Workers gefunden.', airtableCreateResponseData);
                const userMessage = 'Job in Airtable erstellt, aber Record ID nicht erhalten. Prozess abgebrochen.';
                const supportDetails = `Airtable Create Worker Erfolg, aber keine Record ID. Response: ${JSON.stringify(airtableCreateResponseData)}`;
                showCustomPopup(userMessage, 'error', 'Airtable Fehler', supportDetails);
                if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Erneut versuchen';}
                return;
            }
            console.log('Airtable Record erfolgreich erstellt mit ID:', airtableRecordId);
            showCustomPopup('Job erfolgreich in Airtable gespeichert. Erstelle Item in Webflow...', 'loading', 'Webflow Erstellung');

            // --- Schritt 2: Daten an Webflow Worker senden (Erstellen) ---
            const fieldDataForWebflow = { ...formData };

            // ***** ANPASSUNG START *****
            // Stelle sicher, dass das 'name'-Feld für Webflow gesetzt wird.
            // Webflow erwartet ein Feld namens 'name' für den Titel des CMS-Items.
            if (fieldDataForWebflow['job-title']) {
                fieldDataForWebflow['name'] = fieldDataForWebflow['job-title'];
            } else if (fieldDataForWebflow['projectName']) {
                // Fallback, falls 'job-title' aus irgendeinem Grund nicht da ist
                fieldDataForWebflow['name'] = fieldDataForWebflow['projectName'];
            } else {
                // Sollte nicht passieren, da oben geprüft, aber als letzte Sicherheit
                fieldDataForWebflow['name'] = 'Unbenannter Job';
                console.warn("Weder 'job-title' noch 'projectName' für Webflow 'name'-Feld gefunden. Verwende Fallback-Namen.");
            }

            // Stelle sicher, dass das 'slug'-Feld für Webflow gesetzt wird.
            // Webflow erwartet normalerweise ein Feld namens 'slug'.
            fieldDataForWebflow['slug'] = airtableRecordId; // Verwende Airtable ID als Slug

            // Optional: Entferne die ursprünglichen Felder, wenn sie nicht direkt in Webflow benötigt werden
            // und jetzt durch 'name' und 'slug' repräsentiert werden.
            // delete fieldDataForWebflow['job-title']; // Wenn es kein separates 'job-title' Feld in Webflow gibt
            // delete fieldDataForWebflow['projectName']; // Wenn es kein separates 'projectName' Feld in Webflow gibt
            // ***** ANPASSUNG ENDE *****


            // Stelle sicher, dass Webflow die Airtable ID speichern kann, z.B. in einem Feld 'airtable-record-id'
            // Der Feldname hier muss dem Feld-Slug in deiner Webflow Collection entsprechen.
            fieldDataForWebflow['airtable-record-id'] = airtableRecordId;
            fieldDataForWebflow['admin-test'] = true;


            console.log('Sende an Webflow Worker (Create):', WEBFLOW_CMS_POST_WORKER_URL, JSON.stringify({ fields: fieldDataForWebflow }));
            const webflowCreateResponse = await fetch(WEBFLOW_CMS_POST_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: fieldDataForWebflow })
            });
            const webflowCreateResponseData = await webflowCreateResponse.json();

            if (!webflowCreateResponse.ok) {
                console.error('Fehler vom Webflow Worker (Create):', webflowCreateResponse.status, webflowCreateResponseData);
                let userMessage = `Es ist ein Fehler beim Erstellen des Jobs in Webflow aufgetreten (${webflowCreateResponse.status}).`;
                let supportDetails = `Webflow Create Worker Status: ${webflowCreateResponse.status}.`;
                if (webflowCreateResponseData) supportDetails += ` Worker Response: ${JSON.stringify(webflowCreateResponseData)}`;
                // Detailliertere Fehlermeldungen (wie vorher)
                if (webflowCreateResponse.status === 400 && webflowCreateResponseData && webflowCreateResponseData.message) {
                     userMessage = `Fehler bei Webflow Datenübermittlung: ${webflowCreateResponseData.message}. Bitte Eingaben prüfen.`;
                } else if (webflowCreateResponseData && webflowCreateResponseData.error) {
                    userMessage += ` Details: ${webflowCreateResponseData.error}`;
                }

                showCustomPopup(userMessage, 'error', 'Webflow Fehler', supportDetails);
                deleteAirtableRecord(airtableRecordId, `Webflow creation failed: ${userMessage}`);
                if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Erneut versuchen';}
                return;
            }

            console.log('Antwort vom Webflow Worker (Create):', webflowCreateResponseData);
            webflowItemId = webflowCreateResponseData.id;

            if (!webflowItemId) {
                console.error('Webflow Item ID nicht in der Antwort des Create Workers gefunden.', webflowCreateResponseData);
                const userMessage = 'Job in Webflow erstellt, aber ID nicht erhalten. Airtable-Aktualisierung nicht möglich.';
                const supportDetails = `Webflow Create Worker Erfolg, aber keine Item ID. Response: ${JSON.stringify(webflowCreateResponseData)}`;
                showCustomPopup(userMessage, 'success', 'Webflow Erfolg mit Hinweis'); // Zeige als Erfolg, aber mit Hinweis
                // Hier keinen Airtable-Eintrag löschen, da Webflow-Erstellung an sich erfolgreich war.
                if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Teilweise erfolgreich';}
                return;
            }
            console.log('Webflow Item erfolgreich erstellt mit ID:', webflowItemId);
            showCustomPopup('Job erfolgreich in Webflow erstellt. Aktualisiere Airtable mit Webflow ID...', 'loading', 'Airtable Aktualisierung');

            console.log('Sende an Airtable Worker (Update):', AIRTABLE_WORKER_URL + '/update', JSON.stringify({ recordId: airtableRecordId, webflowId: webflowItemId }));
            const airtableUpdateResponse = await fetch(AIRTABLE_WORKER_URL + '/update', {
                method: 'POST',
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
                // Optional: Hier könnte man überlegen, ob das Webflow Item gelöscht werden soll, wenn Airtable Update fehlschlägt.
                // Fürs Erste lassen wir es so, da der Hauptteil (Webflow Item Erstellung) erfolgreich war.
                if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Teilweise erfolgreich';}
                return;
            }

            console.log('Antwort vom Airtable Worker (Update):', airtableUpdateResponseData);
            console.log(`Airtable Record ${airtableRecordId} erfolgreich mit Webflow Item ID ${webflowItemId} aktualisiert.`);
            showCustomPopup('Job erfolgreich in Webflow und Airtable gespeichert!', 'success', 'Erfolgreich');
            if (submitButton) {
                submitButton.textContent = 'Erfolgreich gesendet!';
                // submitButton.disabled = false; // Optional: Button wieder aktivieren
            }
            // Optional: Formular zurücksetzen oder Benutzer weiterleiten
            // form.reset();
            // window.location.href = '/success-page';


        } catch (error) {
            console.error('Unerwarteter Fehler beim Absenden:', error);
            const userMessage = `Ein unerwarteter Fehler ist aufgetreten: ${error.message}. Bitte versuche es später erneut oder kontaktiere den Support.`;
            const supportDetails = `Unerwarteter Frontend Fehler: ${error.message}. Stack: ${error.stack}.`;
            showCustomPopup(userMessage, 'error', 'Unerwarteter Fehler', supportDetails);
            if (airtableRecordId && !webflowItemId) { // Nur löschen, wenn Airtable erstellt, aber Webflow nicht
                deleteAirtableRecord(airtableRecordId, `Unexpected frontend error after Airtable creation, before Webflow success: ${error.message}`);
            }
             if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Fehler, erneut versuchen';
            }
        } finally {
            // Genereller Reset des Submit-Buttons, falls er noch im Ladezustand ist und kein spezifischer Text gesetzt wurde
             if (submitButton && submitButton.textContent === 'Wird gesendet...') {
                 submitButton.disabled = false;
                 submitButton.textContent = 'Absenden'; // Oder dein ursprünglicher Button-Text
             }
        }
    }

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
    console.log('Testfunktion testSubmissionWithData ist verfügbar.');

    document.addEventListener('DOMContentLoaded', () => {
        const mainForm = find(`#${MAIN_FORM_ID}`);
        if (mainForm) {
            mainForm.removeEventListener('submit', handleFormSubmit); // Sicherstellen, dass nicht doppelt
            mainForm.addEventListener('submit', (event) => handleFormSubmit(event, null));
            console.log(`Form Submission Handler initialisiert für Formular: #${MAIN_FORM_ID}`);
        } else {
            console.warn(`Hauptformular mit ID "${MAIN_FORM_ID}" nicht gefunden.`);
        }
        const closeBtn = find(CLOSE_POPUP_ATTR);
        if (closeBtn) {
            closeBtn.addEventListener('click', closeCustomPopup);
        }
    });

})();
```

**Wichtige Änderungen in `handleFormSubmit`:**

```javascript
            // --- Schritt 2: Daten an Webflow Worker senden (Erstellen) ---
            const fieldDataForWebflow = { ...formData };

            // ***** ANPASSUNG START *****
            // Stelle sicher, dass das 'name'-Feld für Webflow gesetzt wird.
            // Webflow erwartet ein Feld namens 'name' für den Titel des CMS-Items.
            if (fieldDataForWebflow['job-title']) {
                fieldDataForWebflow['name'] = fieldDataForWebflow['job-title'];
            } else if (fieldDataForWebflow['projectName']) {
                // Fallback, falls 'job-title' aus irgendeinem Grund nicht da ist
                fieldDataForWebflow['name'] = fieldDataForWebflow['projectName'];
            } else {
                // Sollte nicht passieren, da oben geprüft, aber als letzte Sicherheit
                fieldDataForWebflow['name'] = 'Unbenannter Job'; // Oder einen Fehler auslösen
                console.warn("Weder 'job-title' noch 'projectName' für Webflow 'name'-Feld gefunden. Verwende Fallback-Namen.");
            }

            // Stelle sicher, dass das 'slug'-Feld für Webflow gesetzt wird.
            // Webflow erwartet normalerweise ein Feld namens 'slug'.
            fieldDataForWebflow['slug'] = airtableRecordId; // Verwende Airtable ID als Slug
            // ***** ANPASSUNG ENDE *****

            // Stelle sicher, dass Webflow die Airtable ID speichern kann, z.B. in einem Feld 'airtable-record-id'
            // Der Feldname hier muss dem Feld-Slug in deiner Webflow Collection entsprechen.
            fieldDataForWebflow['airtable-record-id'] = airtableRecordId;
            fieldDataForWebflow['admin-test'] = true; // Stelle sicher, dass admin-test gesetzt ist
```

**Zusätzliche Hinweise:**

1.  **Feldnamen in `fieldDataForWebflow`:** Die Schlüssel im `fieldDataForWebflow`-Objekt (z.B. `job-title`, `budget`, `aufgabe` und jetzt auch `name` und `slug`) müssen exakt den **Feld-Slugs** (nicht den Anzeigenamen oder IDs) in deiner Webflow "Creator Jobs" Collection entsprechen. Überprüfe diese in den Einstellungen deiner Webflow Collection.
2.  **Platzhalter in `REFERENCE_MAPPINGS`:** Denke daran, die Platzhalter-IDs (z.B. `deine_id_hier_16_9`) in `REFERENCE_MAPPINGS` durch die tatsächlichen Webflow Item IDs für deine Referenzfelder zu ersetzen. Das ist nicht die Ursache des aktuellen Fehlers, wird aber zu Problemen führen, wenn diese Felder genutzt werden.
3.  **Testen:** Nachdem du das Skript aktualisiert hast, teste den Vorgang erneut. Überprüfe die Browser-Konsole und die Logs deiner Cloudflare Worker auf Meldungen.

Mit der expliziten Zuweisung von `fieldDataForWebflow['name']` sollte der Webflow-Fehler bezüglich des fehlenden `name`-Feldes behoben sein. Die anderen Fehlermeldungen (`"Body should have required property 'items'"` etc.) waren sehr wahrscheinlich Folgefehl
