// form-submission-handler.js
// Dieses Skript ist verantwortlich für das Sammeln der Formulardaten
// und die Orchestrierung der Speicherung in Airtable und Webflow.
// AKTUELLE VERSION: Fehlerbehebung für Schema-Validierung (job-start-datum, job-end-datum)
// und String/Array-Konflikt für land/sprache.

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
            'Keine Angabe': '5e33b6550adcb786fafd43d422c63de1'
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
            '1': 'b776e9ef4e9ab8b165019c1a2a04e8a9',
            '2': '1667c831d9cba5adc9416401031796f3',
            '3': '355ef3ceb930ddbdd28458265b0a4cf0',
            '4': 'be2c319b5dccd012016df2e33408c39'
        },
        'videoFormat': {
            // Beispiel: 'Dein Format Text im Formular': 'webflow_item_id_fuer_format',
             '16:9': 'deine_id_hier_16_9', // Ersetze mit echter ID, wenn "16:9" der Formularwert ist
             '4:5': 'deine_id_hier_4_5',
             '9:16': 'deine_id_hier_9_16',
             // Im Beispiel war 'format': '44346d8910fb2fbca05bedebde78aad3'. Du musst herausfinden,
             // welcher Text im Formular zu dieser ID gehört, oder ob dein Formular direkt IDs sendet.
        },
        'subtitelOptional': {
            'Ja': '587b210d6015c519f05e0aeea6abf1fa',
            'Nein': 'ac9e02ffc119b7bd0e05403e096f89b3'
        },
        'durationOptional': {
            '24 Monate': 'dd24b0de3f7a906d9619c8f56d9c2484', // Beispiel hat "3 Monate" als Text.
            'unbegrenzt': 'dcbb14e9f4c1ee9aaeeddd62b4d8b625', // Wenn 'nutzungsrechte-dauer' ein Textfeld in Webflow ist,
            '18 Monate': 'c97680a1c8a5214809b7885b00e7c1d8', // dann ist dieses Mapping hier nicht nötig für 'durationOptional'.
            '12 Monate': 'e544d894fe78aaeaf83d8d5a35be5f3f', // Das Skript würde den Text direkt senden.
            '6 Monate': 'b8353db272656593b627e67fb4730bd6',  // Wenn es ein Referenzfeld ist, sind die IDs hier korrekt.
            '3 Monate': '9dab07affd09299a345cf4f2322ece34'
        },
    };

    const WEBFLOW_FIELD_SLUG_MAPPINGS = {
        'projectName': 'name',
        'job-title': 'job-title', // Bleibt, da im Webflow Beispiel vorhanden
        'jobOnline': 'job-date-end',
        'budget': 'job-payment',
        'creatorCount': 'anzahl-gesuchte-creator',
        'videoCountOptional': 'anzahl-videos-2',
        'imgCountOptional': 'anzahl-bilder-2',
        'aufgabe': 'deine-aufgaben',
        'steckbrief': 'job-beschreibung',
        'job-adress': 'location', // Annahme, dass dies der korrekte Slug ist
        'previewText': 'previewtext',
        'userName': 'brand-name',
        'memberEmail': 'contact-mail',
        'webflowId': 'webflow-member-id',
        'memberstackId': 'ms-member-id',
        'jobImageUpload': 'job-image',
        'creatorFollower': 'creator-follower',
        'creatorAge': 'creator-alter',
        'genderOptional': 'creator-geschlecht',
        'videoDurationOptional': 'video-dauer',
        'scriptOptional': 'script',
        'hookCount': 'anzahl-der-hooks',
        'videoFormat': 'format',
        'subtitelOptional': 'untertitel',
        'durationOptional': 'nutzungsrechte-dauer',
        'creatorCategorie': 'art-des-contents',
        'industryCategory': 'industrie-kategorie',
        'creatorLand': 'land', // Webflow Feldname für das Land
        'creatorLang': 'sprache', // Webflow Feldname für die Sprache
        'barterDealToggle': 'barter-deal',
        'plusJobToggle': 'plus-job',
        'admin-test': 'true',

        // Auskommentiert, da "Field not described in schema" Fehler
        // Wenn du diese Felder in Webflow hast, stelle sicher, dass die Slugs exakt stimmen.
        // 'startDate': 'job-start-datum',
        // 'endDate': 'job-end-datum',

        // Beispiel-Mappings für andere Datumsfelder aus dem Webflow-Beispiel,
        // falls deine Formularfelder diesen entsprechen:
        // 'formKeyForScriptdeadline': 'job-scriptdeadline',
        // 'formKeyForContentFertig': 'fertigstellung-content',
    };

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
            setTimeout(closeCustomPopup, 7000);
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
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(dateString)) {
            return dateString;
        }
        let dateObj;
        const deParts = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (deParts) {
            dateObj = new Date(Date.UTC(parseInt(deParts[3]), parseInt(deParts[2]) - 1, parseInt(deParts[1])));
        } else {
            const parts = dateString.split('-');
            if (parts.length === 3) {
                 dateObj = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
            } else {
                dateObj = new Date(dateString); // Fallback
                if (isNaN(dateObj.getTime())) { // Wenn Fallback ungültig, versuche es als UTC zu parsen
                     const now = new Date(dateString);
                     if (!isNaN(now.getTime())) {
                        dateObj = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()));
                     }
                }
            }
        }
        if (isNaN(dateObj.getTime())) {
            console.warn('Ungültiges Datumsformat für ISO-Konvertierung:', dateString);
            return null;
        }
        return dateObj.toISOString();
    }

    function collectAndFormatFormData(formElement) {
        const formData = {};
        const fields = findAll(`[${DATA_FIELD_ATTRIBUTE}]`, formElement);
        let projectNameValue = '';

        const creatorLangValues = [];
        const creatorLandValues = []; // Wird als Array gesammelt, auch wenn nur ein Wert erwartet wird
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
                case 'creatorLand': // Sammle immer als Array
                    if (field.type === 'radio' && field.checked) {
                        creatorLandValues.push(field.value.trim());
                    } else if (field.tagName === 'SELECT') {
                        value = field.options[field.selectedIndex]?.value.trim();
                        if (value) creatorLandValues.push(value);
                    } else if (field.type === 'checkbox' && field.checked) { // Falls es doch Checkboxen sind
                        creatorLandValues.push(field.value.trim());
                    }
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
                        formData[fieldNameKey] = field.checked;
                    } else if (field.type === 'radio') {
                        if (field.checked) {
                           formData[fieldNameKey] = field.value.trim();
                        }
                    } else if (field.tagName === 'SELECT') {
                        value = field.options[field.selectedIndex]?.value.trim();
                        if (value !== undefined && value !== null && value !== '') formData[fieldNameKey] = value;
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
        if (creatorLandValues.length > 0) formData['creatorLand'] = creatorLandValues; // Bleibt Array für konsistente Behandlung

        if (nutzungOptionalValues.length > 0) formData['nutzungOptional'] = nutzungOptionalValues;
        if (channelsValues.length > 0) formData['channels'] = channelsValues;

        const jobOnlineField = find(`[${DATA_FIELD_ATTRIBUTE}="jobOnline"]`);
        if (jobOnlineField) {
            const jobOnlineValue = jobOnlineField.value.trim();
            if (jobOnlineValue) {
                const isoDate = formatToISODate(jobOnlineValue);
                if (isoDate) formData['jobOnline'] = isoDate;
            } else {
                const today = new Date();
                today.setUTCDate(today.getUTCDate() + 3);
                today.setUTCHours(0, 0, 0, 0);
                formData['jobOnline'] = today.toISOString();
            }
        }

        const budgetField = find(`[${DATA_FIELD_ATTRIBUTE}="budget"]`);
        formData['budget'] = budgetField && budgetField.value.trim() !== '' ? parseFloat(budgetField.value.trim()) : 0;


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
                const responseData = await response.json().catch(() => ({}));
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
            submitButton.value = 'Wird gesendet...';
            if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Wird gesendet...';
        }
        showCustomPopup('Daten werden gesammelt...', 'loading', 'Vorbereitung');

        const rawFormData = testData ? testData : collectAndFormatFormData(form);

        if (!rawFormData['projectName'] && !rawFormData['job-title']) {
            const errorMessage = 'Fehler: Job-Titel (projectName) fehlt.';
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
                showCustomPopup('Job in Airtable erstellt, aber Record ID nicht erhalten. Prozess abgebrochen.', 'error', 'Airtable Fehler', `Airtable Create Worker Erfolg, aber keine Record ID. Response: ${JSON.stringify(airtableCreateResponseData)}`);
                if (submitButton) { submitButton.disabled = false; submitButton.value = 'Erneut versuchen'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Erneut versuchen';}
                return;
            }
            console.log('Airtable Record erfolgreich erstellt mit ID:', airtableRecordId);
            showCustomPopup('Job erfolgreich in Airtable gespeichert. Erstelle Item in Webflow...', 'loading', 'Webflow Erstellung');

            const webflowFieldData = {};
            webflowFieldData['name'] = rawFormData['job-title'] || rawFormData['projectName'] || 'Unbenannter Job';
            webflowFieldData['slug'] = airtableRecordId;

            for (const formDataKey in WEBFLOW_FIELD_SLUG_MAPPINGS) {
                const webflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS[formDataKey];
                if (!webflowSlug) continue; // Überspringe, wenn kein Webflow-Slug definiert ist

                let formValue = rawFormData[formDataKey];

                // Überspringe leere/null/undefined Werte, außer Booleans und explizit erlaubte Nullen (z.B. Budget)
                if (formValue === undefined || formValue === null || (typeof formValue === 'string' && formValue.trim() === '')) {
                    if (typeof formValue === 'boolean') {
                         webflowFieldData[webflowSlug] = formValue;
                    } else if (webflowSlug === 'job-payment' && rawFormData['budget'] === 0) {
                        webflowFieldData[webflowSlug] = 0;
                    }
                    continue;
                }

                // Spezifische Behandlung für 'land' und 'sprache' (erwarten String, nicht Array)
                if ((webflowSlug === 'land' || webflowSlug === 'sprache') && Array.isArray(formValue)) {
                    if (formValue.length > 0) {
                        webflowFieldData[webflowSlug] = String(formValue[0]); // Nimm das erste Element als String
                    }
                    continue; // Gehe zum nächsten formDataKey
                }


                if (REFERENCE_MAPPINGS[formDataKey]) {
                    if (Array.isArray(formValue)) {
                        const mappedIds = formValue
                            .map(itemText => REFERENCE_MAPPINGS[formDataKey][itemText])
                            .filter(id => id);
                        if (mappedIds.length > 0) webflowFieldData[webflowSlug] = mappedIds;
                        else console.warn(`Keine gültigen Webflow IDs für Multi-Select '${formDataKey}' (Slug: ${webflowSlug}). Werte: ${formValue.join(', ')}`);
                    } else {
                        const mappedId = REFERENCE_MAPPINGS[formDataKey][formValue];
                        if (mappedId) webflowFieldData[webflowSlug] = mappedId;
                        else {
                            // Wenn kein Mapping für Referenzfeld, aber Wert vorhanden, sende den Wert direkt (für Option-Felder)
                            console.warn(`Keine gültige Webflow ID für Single-Select '${formDataKey}' (Slug: ${webflowSlug}). Wert: ${formValue}. Sende Rohwert.`);
                            webflowFieldData[webflowSlug] = formValue;
                        }
                    }
                } else if ( (formDataKey === 'creatorLang' || formDataKey === 'creatorLand' || formDataKey === 'nutzungOptional' || formDataKey === 'channels') && Array.isArray(formValue) ) {
                    if (formValue.length > 0) webflowFieldData[webflowSlug] = formValue; // Für Multi-Option Textfelder
                } else if (['startDate', 'endDate', 'jobOnline'].includes(formDataKey)) { // Beachte, dass startDate/endDate oben auskommentiert sind
                    const isoDate = formatToISODate(formValue);
                    if (isoDate) webflowFieldData[webflowSlug] = isoDate;
                } else if (typeof formValue === 'boolean') {
                    webflowFieldData[webflowSlug] = formValue;
                } else if (typeof formValue === 'number') {
                     webflowFieldData[webflowSlug] = formValue;
                } else {
                    webflowFieldData[webflowSlug] = String(formValue);
                }
            }

            if (WEBFLOW_FIELD_SLUG_MAPPINGS['admin-test']) {
                 webflowFieldData[WEBFLOW_FIELD_SLUG_MAPPINGS['admin-test']] = false;
            }

            console.log('Sende an Webflow Worker (Create) - Aufbereitete Daten:', WEBFLOW_CMS_POST_WORKER_URL, JSON.stringify({ fields: webflowFieldData }));
            const webflowCreateResponse = await fetch(WEBFLOW_CMS_POST_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: webflowFieldData })
            });
            const webflowCreateResponseData = await webflowCreateResponse.json().catch(() => ({}));

            if (!webflowCreateResponse.ok) {
                console.error('Fehler vom Webflow Worker (Create):', webflowCreateResponse.status, JSON.stringify(webflowCreateResponseData));
                let userMessage = `Es ist ein Fehler beim Erstellen des Jobs in Webflow aufgetreten (${webflowCreateResponse.status}).`;
                let errorDetails = webflowCreateResponseData.message || (webflowCreateResponseData.error && webflowCreateResponseData.error.message) || '';
                 if (webflowCreateResponseData.details && Array.isArray(webflowCreateResponseData.details)) {
                    errorDetails = webflowCreateResponseData.details.map(d => `Feld '${d.param || (d.path && d.path.join('.')) || d.field || 'unbekannt'}': ${d.description || d.message || d.reason}`).join('; ');
                } else if (webflowCreateResponseData.problems && Array.isArray(webflowCreateResponseData.problems)) {
                    errorDetails = webflowCreateResponseData.problems.join('; ');
                }

                if (errorDetails) userMessage += ` Details: ${errorDetails}`;
                const supportDetails = `Webflow Create Worker Status: ${webflowCreateResponse.status}. Worker Response: ${JSON.stringify(webflowCreateResponseData)}. Payload Sent: ${JSON.stringify({ fields: webflowFieldData })}`;
                showCustomPopup(userMessage, 'error', 'Webflow Fehler', supportDetails);
                deleteAirtableRecord(airtableRecordId, `Webflow creation failed: ${userMessage}`);
                if (submitButton) { submitButton.disabled = false; submitButton.value = 'Erneut versuchen'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Erneut versuchen';}
                return;
            }

            console.log('Antwort vom Webflow Worker (Create):', webflowCreateResponseData);
            webflowItemId = webflowCreateResponseData.id || (webflowCreateResponseData.item && webflowCreateResponseData.item.id);

            if (!webflowItemId) {
                showCustomPopup('Job in Webflow erstellt, aber ID nicht erhalten. Airtable-Aktualisierung nicht möglich.', 'success', 'Webflow Erfolg mit Hinweis', `Webflow Create Worker Erfolg, aber keine Item ID. Response: ${JSON.stringify(webflowCreateResponseData)}`);
                if (submitButton) { submitButton.disabled = false; submitButton.value = 'Teilweise erfolgreich'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Teilweise erfolgreich';}
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
                if (submitButton) { submitButton.disabled = false; submitButton.value = 'Teilweise erfolgreich'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Teilweise erfolgreich';}
                return;
            }

            console.log('Antwort vom Airtable Worker (Update):', airtableUpdateResponseData);
            showCustomPopup('Job erfolgreich in Webflow und Airtable gespeichert!', 'success', 'Erfolgreich');
            if (submitButton) {
                submitButton.value = 'Erfolgreich gesendet!';
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Erfolgreich gesendet!';
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
