// form-submission-handler.js
// Dieses Skript ist verantwortlich für das Sammeln der Formulardaten
// und die Orchestrierung der Speicherung in Airtable und Webflow.
// AKTUELLE VERSION: Fehlerbehebung für Schema-Validierung (job-start-datum, job-end-datum)
// und String/Array-Konflikt für land/sprache.
// VERSION 4: 'admin-test' wird für Webflow immer auf true gesetzt (für Testzwecke).

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
            // HINWEIS: Ersetze 'deine_id_hier_...' mit echten Webflow Item IDs, falls dies ein Referenzfeld ist.
            '16:9': 'deine_id_hier_16_9',
            '4:5': 'deine_id_hier_4_5',
            '9:16': 'deine_id_hier_9_16',
        },
        'subtitelOptional': {
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
        },
    };

    const WEBFLOW_FIELD_SLUG_MAPPINGS = {
        'projectName': 'name',
        'job-title': 'job-title',
        'jobOnline': 'job-date-end',
        'budget': 'job-payment',
        'creatorCount': 'anzahl-gesuchte-creator',
        'videoCountOptional': 'anzahl-videos-2',
        'imgCountOptional': 'anzahl-bilder-2',
        'aufgabe': 'deine-aufgaben',
        'steckbrief': 'job-beschreibung',
        'job-adress': 'location',
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
        'creatorLand': 'land',
        'creatorLang': 'sprache',
        'barterDealToggle': 'barter-deal',
        'plusJobToggle': 'plus-job',
        'admin-test': 'admin-test',

        // 'startDate': 'job-start-datum',
        // 'endDate': 'job-end-datum',
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
                    if (field.type === 'radio' && field.checked) {
                        creatorLandValues.push(field.value.trim());
                    } else if (field.tagName === 'SELECT') {
                        value = field.options[field.selectedIndex]?.value.trim();
                        if (value) creatorLandValues.push(value);
                    } else if (field.type === 'checkbox' && field.checked) {
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
        if (creatorLandValues.length > 0) formData['creatorLand'] = creatorLandValues;
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
        if (event && typeof event.preventDefault === 'function') {
             event.preventDefault();
        }
        const form = find(`#${MAIN_FORM_ID}`);
        const submitButton = form ? form.querySelector('button[type="submit"], input[type="submit"]') : null;

        if (submitButton) {
            submitButton.disabled = true;
            const sendingText = 'Wird gesendet...';
            if (submitButton.tagName === 'BUTTON') {
                submitButton.textContent = sendingText;
            } else {
                submitButton.value = sendingText;
            }
        }
        showCustomPopup('Daten werden gesammelt...', 'loading', 'Vorbereitung');

        const rawFormData = testData ? testData : collectAndFormatFormData(form);

        if (!rawFormData['projectName'] && !rawFormData['job-title']) {
            const errorMessage = 'Fehler: Job-Titel (projectName) fehlt.';
            showCustomPopup(errorMessage, 'error', 'Fehler: Fehlende Daten', `Frontend Fehler: projectName oder job-title fehlt. Gesammelte Daten: ${JSON.stringify(rawFormData)}`);
            if (submitButton) {
                submitButton.disabled = false;
                const failedText = 'Absenden fehlgeschlagen';
                 if (submitButton.tagName === 'BUTTON') {
                    submitButton.textContent = failedText;
                } else {
                    submitButton.value = failedText;
                }
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
                if (submitButton) { submitButton.disabled = false; const retryText = 'Erneut versuchen'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = retryText; else submitButton.value = retryText;}
                return;
            }

            console.log('Antwort vom Airtable Worker (Create):', airtableCreateResponseData);
            airtableRecordId = airtableCreateResponseData.records && airtableCreateResponseData.records.length > 0 ? airtableCreateResponseData.records[0].id : null;

            if (!airtableRecordId) {
                showCustomPopup('Job in Airtable erstellt, aber Record ID nicht erhalten. Prozess abgebrochen.', 'error', 'Airtable Fehler', `Airtable Create Worker Erfolg, aber keine Record ID. Response: ${JSON.stringify(airtableCreateResponseData)}`);
                if (submitButton) { submitButton.disabled = false; const retryText = 'Erneut versuchen'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = retryText; else submitButton.value = retryText;}
                return;
            }
            console.log('Airtable Record erfolgreich erstellt mit ID:', airtableRecordId);
            showCustomPopup('Job erfolgreich in Airtable gespeichert. Erstelle Item in Webflow...', 'loading', 'Webflow Erstellung');

            const webflowFieldData = {};
            webflowFieldData['name'] = rawFormData['job-title'] || rawFormData['projectName'] || 'Unbenannter Job';
            webflowFieldData['slug'] = airtableRecordId;

            for (const formDataKey in WEBFLOW_FIELD_SLUG_MAPPINGS) {
                const webflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS[formDataKey];
                if (!webflowSlug) {
                    continue;
                }

                let formValue = rawFormData[formDataKey];

                if (formValue === undefined || formValue === null || (typeof formValue === 'string' && formValue.trim() === '')) {
                    if (typeof formValue === 'boolean') {
                        webflowFieldData[webflowSlug] = formValue;
                    } else if (webflowSlug === 'job-payment' && rawFormData['budget'] === 0) {
                        webflowFieldData[webflowSlug] = 0;
                    }
                    // Für 'admin-test' wird der Wert später explizit gesetzt, daher hier keine spezielle Behandlung für den Fall, dass es nicht im Formular ist.
                    // Für andere Felder, wenn sie leer sind und nicht boolean/budget=0, werden sie übersprungen.
                    else if (formDataKey !== 'admin-test') { // 'admin-test' wird unten speziell behandelt
                        continue;
                    }
                }


                if ((webflowSlug === 'land' || webflowSlug === 'sprache') && Array.isArray(formValue)) {
                    if (formValue.length > 0) {
                        webflowFieldData[webflowSlug] = String(formValue[0]);
                    }
                    continue;
                }

                if (REFERENCE_MAPPINGS[formDataKey]) {
                    if (Array.isArray(formValue)) {
                        const mappedIds = formValue
                            .map(itemText => REFERENCE_MAPPINGS[formDataKey][itemText])
                            .filter(id => id && id.indexOf('deine_id_hier_') === -1);
                        if (mappedIds.length > 0) webflowFieldData[webflowSlug] = mappedIds;
                        else if (formValue.some(item => REFERENCE_MAPPINGS[formDataKey][item] && REFERENCE_MAPPINGS[formDataKey][item].indexOf('deine_id_hier_') !== -1)) {
                             console.warn(`Platzhalter-IDs für Multi-Select '${formDataKey}' (Slug: ${webflowSlug}) gefunden. Bitte korrigieren. Werte: ${formValue.join(', ')}`);
                        } else {
                            console.warn(`Keine gültigen Webflow IDs für Multi-Select '${formDataKey}' (Slug: ${webflowSlug}). Werte: ${formValue.join(', ')}`);
                        }
                    } else {
                        const mappedId = REFERENCE_MAPPINGS[formDataKey][formValue];
                        if (mappedId && mappedId.indexOf('deine_id_hier_') === -1) {
                             webflowFieldData[webflowSlug] = mappedId;
                        } else if (mappedId && mappedId.indexOf('deine_id_hier_') !== -1) {
                            console.warn(`Platzhalter-ID für Single-Select '${formDataKey}' (Slug: ${webflowSlug}) gefunden: ${formValue}. Bitte korrigieren.`);
                            webflowFieldData[webflowSlug] = formValue;
                        }
                        else {
                            console.warn(`Keine gültige Webflow ID für Single-Select '${formDataKey}' (Slug: ${webflowSlug}). Wert: ${formValue}. Sende Rohwert.`);
                            webflowFieldData[webflowSlug] = formValue;
                        }
                    }
                } else if ( (formDataKey === 'creatorLang' || formDataKey === 'creatorLand' || formDataKey === 'nutzungOptional' || formDataKey === 'channels') && Array.isArray(formValue) ) {
                    if (formValue.length > 0) webflowFieldData[webflowSlug] = formValue;
                } else if (['startDate', 'endDate', 'jobOnline'].includes(formDataKey)) {
                    const isoDate = formatToISODate(formValue);
                    if (isoDate) webflowFieldData[webflowSlug] = isoDate;
                } else if (typeof formValue === 'boolean') {
                    // Dies behandelt 'barterDealToggle', 'plusJobToggle' und 'admin-test', wenn sie aus dem Formular kommen.
                    // Für 'admin-test' wird der Wert unten sowieso überschrieben.
                    webflowFieldData[webflowSlug] = formValue;
                } else if (typeof formValue === 'number') {
                    webflowFieldData[webflowSlug] = formValue;
                } else {
                    if (formValue !== undefined && formValue !== null && String(formValue).trim() !== '') {
                         webflowFieldData[webflowSlug] = String(formValue);
                    }
                }
            }

            // Spezifische Behandlung für 'admin-test': Soll für Tests immer true sein.
            const adminTestWebflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS['admin-test']; // Ist 'admin-test'
            if (adminTestWebflowSlug) { // Stellt sicher, dass das Mapping existiert
                webflowFieldData[adminTestWebflowSlug] = true; // Setzt 'admin-test' in Webflow immer auf true
                console.log(`Hinweis: Das Feld '${adminTestWebflowSlug}' wird für Webflow fest auf 'true' gesetzt.`);
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
                if (submitButton) { submitButton.disabled = false; const retryText = 'Erneut versuchen'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = retryText; else submitButton.value = retryText;}
                return;
            }

            console.log('Antwort vom Webflow Worker (Create):', webflowCreateResponseData);
            webflowItemId = webflowCreateResponseData.id || (webflowCreateResponseData.item && webflowCreateResponseData.item.id);

            if (!webflowItemId) {
                showCustomPopup('Job in Webflow erstellt, aber ID nicht erhalten. Airtable-Aktualisierung nicht möglich.', 'success', 'Webflow Erfolg mit Hinweis', `Webflow Create Worker Erfolg, aber keine Item ID. Response: ${JSON.stringify(webflowCreateResponseData)}`);
                if (submitButton) { submitButton.disabled = false; const partialSuccessText = 'Teilweise erfolgreich'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = partialSuccessText; else submitButton.value = partialSuccessText;}
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
                if (submitButton) { submitButton.disabled = false; const partialSuccessText = 'Teilweise erfolgreich'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = partialSuccessText; else submitButton.value = partialSuccessText;}
                return;
            }

            console.log('Antwort vom Airtable Worker (Update):', airtableUpdateResponseData);
            showCustomPopup('Job erfolgreich in Webflow und Airtable gespeichert!', 'success', 'Erfolgreich');
            if (submitButton) {
                const successText = 'Erfolgreich gesendet!';
                if (submitButton.tagName === 'BUTTON') {
                    submitButton.textContent = successText;
                } else {
                    submitButton.value = successText;
                }
                 // form.reset();
                 // window.location.href = '/success-page';
            }

        } catch (error) {
            console.error('Unerwarteter Fehler beim Absenden:', error);
            const userMessage = `Ein unerwarteter Fehler ist aufgetreten: ${error.message}.`;
            const supportDetails = `Unerwarteter Frontend Fehler: ${error.message}. Stack: ${error.stack}. Raw Form Data: ${JSON.stringify(rawFormData)}`;
            showCustomPopup(userMessage, 'error', 'Unerwarteter Fehler', supportDetails);
            if (airtableRecordId && !webflowItemId) {
                deleteAirtableRecord(airtableRecordId, `Unexpected frontend error during Webflow step: ${error.message}`);
            }
            if (submitButton) {
                submitButton.disabled = false;
                const errorRetryText = 'Fehler, erneut versuchen';
                if (submitButton.tagName === 'BUTTON') {
                    submitButton.textContent = errorRetryText;
                } else {
                    submitButton.value = errorRetryText;
                }
            }
        } finally {
            if (submitButton && !submitButton.disabled) {
                 const currentButtonText = submitButton.tagName === 'BUTTON' ? submitButton.textContent : submitButton.value;
                 if (currentButtonText === 'Wird gesendet...') {
                    const defaultSubmitText = form.getAttribute('data-initial-text') || 'Absenden';
                    if (submitButton.tagName === 'BUTTON') {
                        submitButton.textContent = defaultSubmitText;
                    } else {
                        submitButton.value = defaultSubmitText;
                    }
                 }
            }
        }
    }

    function testSubmissionWithData(testData) {
        console.log('Starte Test-Übermittlung mit Daten:', testData);
        const mainForm = find(`#${MAIN_FORM_ID}`);
        if (!mainForm) {
            console.error(`Hauptformular mit ID "${MAIN_FORM_ID}" nicht gefunden.`);
            showCustomPopup(`Test-Übermittlung fehlgeschlagen: Hauptformular mit ID "${MAIN_FORM_ID}" nicht gefunden.`, 'error', 'Test Fehler');
            return;
        }
        const simulatedEvent = {
            preventDefault: () => console.log('simulated event.preventDefault() called'),
            target: mainForm
        };
        handleFormSubmit(simulatedEvent, testData);
    }
    window.testSubmissionWithData = testSubmissionWithData;


    document.addEventListener('DOMContentLoaded', () => {
        const mainForm = find(`#${MAIN_FORM_ID}`);
        if (mainForm) {
            const submitButton = mainForm.querySelector('button[type="submit"], input[type="submit"]');
            if (submitButton) {
                mainForm.setAttribute('data-initial-text', submitButton.tagName === 'BUTTON' ? submitButton.textContent : submitButton.value);
            }

            mainForm.removeEventListener('submit', handleFormSubmitWrapper);
            mainForm.addEventListener('submit', handleFormSubmitWrapper);
            console.log(`Form Submission Handler initialisiert für Formular: #${MAIN_FORM_ID}`);
        } else {
            console.warn(`Hauptformular mit ID "${MAIN_FORM_ID}" nicht gefunden. Formular-Handler nicht aktiv.`);
        }
    });

    function handleFormSubmitWrapper(event) {
        handleFormSubmit(event, null);
    }

})();
