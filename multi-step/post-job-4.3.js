// form-submission-handler.js
// Dieses Skript ist verantwortlich für das Sammeln der Formulardaten
// und die Orchestrierung der Speicherung in Airtable und Webflow.
// VERSION 13: Anpassungen für Webflow:
// - job-posted-by wird mit webflowId (Webflow Member ID des Erstellers) befüllt.
// - creator-follower verwendet den korrekten Schlüssel aus rawFormData und REFERENCE_MAPPINGS.
// - Channels/Nutzungsrechte werden als Multi-Referenzfelder behandelt (benötigen korrekte REFERENCE_MAPPINGS).
// - Land/Sprache senden weiterhin den ersten Wert als String (gemäß Webflow-Fehlermeldung).

(function() {
    'use strict';

    // --- Konfiguration ---
    const WEBFLOW_CMS_POST_WORKER_URL = 'https://late-meadow-00bc.oliver-258.workers.dev/';
    const AIRTABLE_WORKER_URL = 'https://airtable-job-post.oliver-258.workers.dev/';
    const AIRTABLE_MEMBER_SEARCH_ENDPOINT = AIRTABLE_WORKER_URL + '/search-member';
    const MAIN_FORM_ID = 'wf-form-post-job-form';
    const DATA_FIELD_ATTRIBUTE = 'data-preview-field';
    const SUPPORT_EMAIL = 'support@yourcompany.com'; // BITTE ERSETZEN!

    const AIRTABLE_MEMBERS_TABLE_ID = 'tblMBt42TIKloNAKB';
    const AIRTABLE_MEMBERS_WEBFLOW_ID_FIELD_NAME = 'Webflow Member ID';

    const POPUP_WRAPPER_ATTR = '[data-error-target="popup-wrapper"]';
    const POPUP_TITLE_ATTR = '[data-error-target="popup-title"]';
    const POPUP_MESSAGE_ATTR = '[data-error-target="popup-message"]';
    const CLOSE_POPUP_ATTR = '[data-error-target="close-popup"]';
    const MAIL_ERROR_ATTR = '[data-error-target="mail-error"]';

    // REFERENCE_MAPPINGS:
    // Schlüssel: Der `data-preview-field` Wert aus dem Formular (oder der entsprechende Schlüssel in rawFormData).
    // Wert: Ein Objekt, das Formular-Textwerte auf Webflow Item IDs mappt.
    // WICHTIG: Für 'nutzungOptional' und 'channels' bitte die Platzhalter-IDs durch echte Webflow Item IDs ersetzen!
    const REFERENCE_MAPPINGS = {
        'creatorFollower': { // Wird verwendet, um den Wert aus rawFormData['creatorCountOptional'] zu mappen
            '0 - 2.500': '3d869451e837ddf527fc54d0fb477ab4',
            '2.500 - 5.000': 'e2d86c9f8febf4fecd674f01beb05bf5',
            '5.000 - 10.000': '27420dd46db02b53abb3a50d4859df84',
            '10.000 - 25.000': 'd61d9c5625c03e86d87ef854aa702265', // Beispiel: Dieser Wert kommt aus rawFormData.creatorCountOptional
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
        'videoFormat': { // Falls dies ein Referenzfeld in Webflow ist
            '16:9': 'webflow_item_id_fuer_16_9', // Ersetze mit echten IDs
            '4:5': 'webflow_item_id_fuer_4_5',
            '9:16': 'webflow_item_id_fuer_9_16',
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
        // WICHTIG: Diese Mappings für nutzungOptional und channels sind nötig,
        // wenn die entsprechenden Felder in Webflow Multi-Referenzfelder sind.
        // Ersetze die Platzhalter-IDs mit echten Webflow Item IDs.
        'nutzungOptional': {
            'Werbeanzeigen': 'BITTE_WEBFLOW_ITEM_ID_FUER_WERBEANZEIGEN_EINTRAGEN',
            'Social Media Kanäle (Instagram, TikTok, Youtube)': 'BITTE_WEBFLOW_ITEM_ID_FUER_SOCIAL_MEDIA_EINTRAGEN',
            // ... weitere Optionen ...
        },
        'channels': {
            'Instagram': 'BITTE_WEBFLOW_ITEM_ID_FUER_INSTAGRAM_EINTRAGEN',
            'Facebook': 'BITTE_WEBFLOW_ITEM_ID_FUER_FACEBOOK_EINTRAGEN',
            'TikTok': 'BITTE_WEBFLOW_ITEM_ID_FUER_TIKTOK_EINTRAGEN',
            // ... weitere Kanäle ...
        }
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
        'memberEmail': 'contact-mail', // Webflow Slug für die E-Mail des Erstellers
        'webflowId': 'job-posted-by', // NEU: Webflow Slug für die Webflow Member ID des Erstellers
        'memberstackId': 'ms-member-id',
        'jobImageUpload': 'job-image',
        'creatorCountOptional': 'creator-follower', // KORRIGIERT: rawFormData.creatorCountOptional -> Webflow-Slug 'creator-follower'
        'creatorAge': 'creator-alter',
        'genderOptional': 'creator-geschlecht',
        'videoDurationOptional': 'video-dauer',
        'scriptOptional': 'script',
        'hookCount': 'anzahl-der-hooks',
        'videoFormat': 'format',
        'subtitelOptional': 'untertitel',
        'durationOptional': 'dauer-nutzungsrechte',
        'creatorCategorie': 'art-des-contents',
        'industryCategory': 'industrie-kategorie',
        'creatorLand': 'land',
        'creatorLang': 'sprache',
        'barterDealToggle': 'barter-deal',
        'plusJobToggle': 'plus-job',
        'admin-test': 'admin-test',
        'nutzungOptional': 'job-posting', // KORRIGIERT: Slug für Nutzungsrechte
        'channels': 'fur-welchen-kanale-wird-der-content-produziert', // KORRIGIERT: Slug für Channels
        'airtableJobIdForWebflow': 'job-id'
    };

    const AIRTABLE_FIELD_MAPPINGS = {
        'plusJobToggle': 'Plus Job',
        'barterDealToggle': 'Barter Deal',
        'admin-test': 'Admin Test',
        'projectName': 'Project Name',
        'jobOnline': 'Job Online Date',
        'job-title': 'Job Title',
        'budget': 'Budget',
        'creatorCount': 'Creator Count',
        'videoCountOptional': 'Video Count Optional',
        'imgCountOptional': 'Image Count Optional',
        'aufgabe': 'Aufgabe',
        'steckbrief': 'Steckbrief',
        'job-adress': 'Location',
        'job-adress-optional': 'Location',
        'previewText': 'Preview Text',
        'userName': 'User Name',
        'memberEmail': 'Contact Mail',
        'webflowId': 'Webflow Member ID', // Für Airtable
        'memberstackId': 'Member ID',
        'jobImageUpload': 'Job Image',
        'creatorFollower': 'Creator Follower', // Falls das Formularfeld 'creatorFollower' heißt
        'creatorCountOptional': 'Creator Follower', // Falls das Formularfeld 'creatorCountOptional' die Follower-Daten enthält
        'creatorAge': 'Creator Age',
        'genderOptional': 'Gender Optional',
        'videoDurationOptional': 'Video Duration Optional',
        'scriptOptional': 'Script Optional',
        'hookCount': 'Hook Count',
        'videoFormat': 'Video Format',
        'subtitelOptional': 'Subtitel Optional',
        'durationOptional': 'Duration Optional',
        'creatorCategorie': 'Creator Categorie',
        'industryCategory': 'Industry Category',
        'creatorLand': 'Land',
        'creatorLang': 'Sprache',
        'nutzungOptional': 'Nutzungsrechte',
        'channels': 'Channels',
        'reviewsOptional': 'Reviews Optional',
        'user-creatorname': 'User Creatorname',
        'startDate': 'Start Date',
        'endDate': 'End Date'
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
        const ymdParts = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (ymdParts) {
            const dateObj = new Date(Date.UTC(parseInt(ymdParts[1]), parseInt(ymdParts[2]) - 1, parseInt(ymdParts[3])));
            if (!isNaN(dateObj.getTime())) return dateObj.toISOString();
        }
        let dateObj;
        const deParts = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (deParts) {
            dateObj = new Date(Date.UTC(parseInt(deParts[3]), parseInt(deParts[2]) - 1, parseInt(deParts[1])));
        } else {
            dateObj = new Date(dateString); 
            if (isNaN(dateObj.getTime())) { 
                const now = new Date(dateString);
                if (!isNaN(now.getTime())) {
                    dateObj = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()));
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
        const regularFields = findAll(`[${DATA_FIELD_ATTRIBUTE}]`, formElement);
        let projectNameValue = '';

        const multiSelectFields = {
            'creatorLang': [],
            'creatorLand': [],
            'nutzungOptional': [],
            'channels': []
        };

        regularFields.forEach(field => {
            const fieldNameKey = field.getAttribute(DATA_FIELD_ATTRIBUTE);
            let value;

            if (multiSelectFields.hasOwnProperty(fieldNameKey)) {
                if ((field.type === 'checkbox' || field.type === 'radio') && field.checked) {
                    multiSelectFields[fieldNameKey].push(field.value.trim());
                } else if (field.tagName === 'SELECT' && field.multiple) {
                    for (const option of field.options) {
                        if (option.selected) {
                            multiSelectFields[fieldNameKey].push(option.value.trim());
                        }
                    }
                } else if (field.tagName === 'SELECT' && field.value) {
                     multiSelectFields[fieldNameKey].push(field.value.trim());
                }
            } else { 
                switch (fieldNameKey) {
                    case 'projectName':
                        projectNameValue = field.value.trim();
                        formData[fieldNameKey] = projectNameValue;
                        break;
                    case 'jobSlug': 
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
                        } else if (field.type === 'date') {
                            value = field.value; 
                            if (value) formData[fieldNameKey] = value;
                        }
                        else {
                            value = field.value.trim();
                            if (value !== '' || fieldNameKey === 'job-adress' || fieldNameKey === 'job-adress-optional') {
                                formData[fieldNameKey] = value;
                            }
                        }
                }
            }
        });

        for (const key in multiSelectFields) {
            if (multiSelectFields[key].length > 0) {
                formData[key] = multiSelectFields[key];
            }
        }
        
        if (formData['creatorLand'] && !Array.isArray(formData['creatorLand'])) {
            formData['creatorLand'] = [formData['creatorLand']];
        }
        if (formData['creatorLang'] && !Array.isArray(formData['creatorLang'])) {
             formData['creatorLang'] = [formData['creatorLang']];
        }

        const memberstackInputs = findAll('input[data-ms-member]');
        memberstackInputs.forEach(field => {
            const fieldNameKey = field.name; 
            const value = field.value.trim();
            if (fieldNameKey && value !== '') {
                formData[fieldNameKey] = value;
                console.log(`Collected Memberstack field (using name attribute): ${fieldNameKey} = ${value}`);
            } else if (!fieldNameKey) {
                console.warn('Found a data-ms-member field without a name attribute:', field);
            }
        });

        ['jobOnline', 'startDate', 'endDate'].forEach(dateFieldKey => {
            if (formData[dateFieldKey]) {
                const isoDate = formatToISODate(formData[dateFieldKey]);
                if (isoDate) {
                    formData[dateFieldKey] = isoDate;
                } else {
                    console.warn(`Could not convert ${dateFieldKey} value '${formData[dateFieldKey]}' to ISO date. Removing from form data.`);
                    delete formData[dateFieldKey];
                }
            }
        });
        if (!formData['jobOnline']) {
            const jobOnlineField = find(`[${DATA_FIELD_ATTRIBUTE}="jobOnline"]`);
            if (!jobOnlineField || !jobOnlineField.value.trim()) {
                const today = new Date();
                today.setUTCDate(today.getUTCDate() + 3);
                today.setUTCHours(0, 0, 0, 0);
                formData['jobOnline'] = today.toISOString();
                console.log("jobOnline was empty, set to default:", formData['jobOnline']);
            }
        }

        const budgetField = find(`[${DATA_FIELD_ATTRIBUTE}="budget"]`);
        formData['budget'] = budgetField && budgetField.value.trim() !== '' ? parseFloat(budgetField.value.trim()) : 0;

        if (projectNameValue) {
            formData['job-title'] = projectNameValue;
        }
        
        if (!formData['webflowId'] && formData['Webflow Member ID']) {
            formData['webflowId'] = formData['Webflow Member ID'];
        }
        if (formData['job-adress-optional'] && !formData['job-adress']) {
            formData['job-adress'] = formData['job-adress-optional'];
        }

        console.log('Gesammelte Formulardaten (rawFormData, vor Airtable-Mapping):', JSON.parse(JSON.stringify(formData)));
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
        
        const webflowMemberIdToSearch = rawFormData['webflowId']; // Dies ist die Webflow Member ID des Erstellers
        if (!webflowMemberIdToSearch) {
            const errorMsg = 'Webflow Member ID nicht im Formular gefunden. Job kann nicht zugeordnet werden.';
            console.error(errorMsg, rawFormData);
            showCustomPopup(errorMsg, 'error', 'Fehler: Fehlende Zuordnung', `Webflow Member ID (Schlüssel 'webflowId') fehlt in rawFormData. Daten: ${JSON.stringify(rawFormData)}`);
            if (submitButton) { submitButton.disabled = false; submitButton.value = 'Fehler'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Fehler';}
            return;
        }
        console.log('Suche nach Member mit Webflow Member ID:', webflowMemberIdToSearch);
        showCustomPopup('Suche zugehöriges Mitglied...', 'loading', 'Mitgliedersuche');

        let airtableMemberRecordId = null;
        try {
            const memberSearchResponse = await fetch(AIRTABLE_MEMBER_SEARCH_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ webflowMemberId: webflowMemberIdToSearch })
            });
            const memberSearchData = await memberSearchResponse.json();

            if (!memberSearchResponse.ok || !memberSearchData.memberRecordId) {
                let errorMsg = 'Das zugehörige Mitglied konnte nicht in Airtable gefunden werden.';
                if (memberSearchData.error) {
                    errorMsg += ` Fehlerdetails: ${memberSearchData.error}`;
                }
                console.error('Fehler bei der Mitgliedersuche oder Mitglied nicht gefunden:', memberSearchData);
                showCustomPopup(errorMsg, 'error', 'Fehler: Mitglied nicht gefunden', `Mitglied mit Webflow Member ID '${webflowMemberIdToSearch}' nicht gefunden oder Fehler bei der Suche. Worker Response: ${JSON.stringify(memberSearchData)}`);
                if (submitButton) { submitButton.disabled = false; submitButton.value = 'Zuordnung fehlgeschlagen'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Zuordnung fehlgeschlagen';}
                return; 
            }
            airtableMemberRecordId = memberSearchData.memberRecordId;
            console.log('Mitglied gefunden. Airtable Record ID des Mitglieds:', airtableMemberRecordId);

        } catch (error) {
            console.error('Netzwerkfehler oder anderer Fehler bei der Mitgliedersuche:', error);
            showCustomPopup(`Ein Fehler ist bei der Suche des Mitglieds aufgetreten: ${error.message}`, 'error', 'Fehler: Mitgliedersuche', `Exception bei Mitgliedersuche: ${error.stack}`);
            if (submitButton) { submitButton.disabled = false; submitButton.value = 'Fehler'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = 'Fehler';}
            return;
        }


        let airtableRecordId = null; 
        let webflowItemId = null;
        let airtableJobDetails = {};

        try {
            for (const keyInRawForm in rawFormData) {
                if (rawFormData.hasOwnProperty(keyInRawForm)) {
                    const airtableKey = AIRTABLE_FIELD_MAPPINGS[keyInRawForm] || keyInRawForm;
                    airtableJobDetails[airtableKey] = rawFormData[keyInRawForm];
                }
            }
            airtableJobDetails['job-posted-by'] = [airtableMemberRecordId];
            console.log("Airtable 'job-posted-by' wird gesetzt mit Member ID:", airtableMemberRecordId);

            const adminTestAirtableKey = AIRTABLE_FIELD_MAPPINGS['admin-test'] || 'admin-test';
            if (airtableJobDetails.hasOwnProperty(adminTestAirtableKey) || AIRTABLE_FIELD_MAPPINGS.hasOwnProperty('admin-test')) {
                 airtableJobDetails[adminTestAirtableKey] = true; 
                 console.log(`Hinweis: Das Airtable-Feld '${adminTestAirtableKey}' wird auf 'true' gesetzt.`);
            }

            showCustomPopup('Daten werden in Airtable gespeichert...', 'loading', 'Airtable Speicherung');
            console.log('Sende an Airtable Worker (Create Job) - Transformierte Daten (airtableJobDetails):', AIRTABLE_WORKER_URL, JSON.stringify({ jobDetails: airtableJobDetails }));

            const airtableCreateResponse = await fetch(AIRTABLE_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobDetails: airtableJobDetails }) 
            });
            const airtableCreateResponseData = await airtableCreateResponse.json();

            if (!airtableCreateResponse.ok) {
                console.error('Fehler vom Airtable Worker (Create Job):', airtableCreateResponse.status, airtableCreateResponseData);
                let userMessage = `Es ist ein Fehler beim Speichern des Jobs in Airtable aufgetreten (${airtableCreateResponse.status}).`;
                let errorDetails = airtableCreateResponseData.error || (airtableCreateResponseData.message ? airtableCreateResponseData.message : JSON.stringify(airtableCreateResponseData));
                if (airtableCreateResponseData.airtable_response && airtableCreateResponseData.airtable_response.error) {
                     errorDetails = `Airtable Error: ${airtableCreateResponseData.airtable_response.error.type} - ${airtableCreateResponseData.airtable_response.error.message}`;
                }
                userMessage += ` Details: ${errorDetails}`;
                let supportDetails = `Airtable Create Job Worker Status: ${airtableCreateResponse.status}. Worker Response: ${JSON.stringify(airtableCreateResponseData)}. Payload Sent: ${JSON.stringify({ jobDetails: airtableJobDetails })}`;
                showCustomPopup(userMessage, 'error', 'Airtable Fehler', supportDetails);
                if (submitButton) { submitButton.disabled = false; const retryText = 'Erneut versuchen'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = retryText; else submitButton.value = retryText;}
                return;
            }

            console.log('Antwort vom Airtable Worker (Create Job):', airtableCreateResponseData);
            airtableRecordId = airtableCreateResponseData.records && airtableCreateResponseData.records.length > 0 ? airtableCreateResponseData.records[0].id : null;

            if (!airtableRecordId) {
                showCustomPopup('Job in Airtable erstellt, aber Record ID nicht erhalten. Prozess abgebrochen.', 'error', 'Airtable Fehler', `Airtable Create Job Worker Erfolg, aber keine Record ID. Response: ${JSON.stringify(airtableCreateResponseData)}`);
                if (submitButton) { submitButton.disabled = false; const retryText = 'Erneut versuchen'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = retryText; else submitButton.value = retryText;}
                return;
            }
            console.log('Airtable Job Record erfolgreich erstellt mit ID:', airtableRecordId);
            showCustomPopup('Job erfolgreich in Airtable gespeichert. Erstelle Item in Webflow...', 'loading', 'Webflow Erstellung');

            const webflowFieldData = {};
            webflowFieldData['name'] = rawFormData['job-title'] || rawFormData['projectName'] || 'Unbenannter Job';
            webflowFieldData['slug'] = airtableRecordId; 
            
            const airtableJobIdForWebflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS['airtableJobIdForWebflow'];
            if (airtableJobIdForWebflowSlug) {
                webflowFieldData[airtableJobIdForWebflowSlug] = airtableRecordId; // Airtable Job ID für das Feld 'job-id' in Webflow
            }

            for (const formDataKey in WEBFLOW_FIELD_SLUG_MAPPINGS) {
                const webflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS[formDataKey];
                if (!webflowSlug || ['name', 'slug', 'airtableJobIdForWebflow'].includes(formDataKey) || (webflowSlug.startsWith('dein_webflow_slug_') && !rawFormData.hasOwnProperty(formDataKey))) {
                    continue;
                }

                let formValue = rawFormData[formDataKey];

                if (formValue === undefined || formValue === null || (typeof formValue === 'string' && formValue.trim() === '')) {
                    if (typeof formValue === 'boolean') {
                        webflowFieldData[webflowSlug] = formValue;
                    } else if (webflowSlug === 'job-payment' && rawFormData['budget'] === 0) {
                        webflowFieldData[webflowSlug] = 0;
                    } else if (formDataKey !== 'admin-test') { 
                        continue;
                    }
                }
                
                // KORREKTUR für Webflow land/sprache: Sende kommaseparierten String
                if ((formDataKey === 'creatorLand' || formDataKey === 'creatorLang') && Array.isArray(formValue)) {
                    if (formValue.length > 0 && (webflowSlug === 'land' || webflowSlug === 'sprache')) {
                         webflowFieldData[webflowSlug] = formValue.join(', '); 
                         console.log(`Webflow: Sende kommaseparierten String für ${webflowSlug}:`, webflowFieldData[webflowSlug]);
                    } else {
                        console.log(`Webflow: Array für ${webflowSlug} ist leer, wird nicht gesendet.`);
                    }
                    continue; 
                }

                // KORREKTUR für Webflow Channels/Nutzungsrechte:
                // Wenn es Multi-Referenzfelder sind, müssen die Werte gemappt werden.
                // Wenn es Textfelder sind, die kommaseparierte Strings erwarten:
                if ((formDataKey === 'channels' || formDataKey === 'nutzungOptional') && Array.isArray(formValue)) {
                     if (REFERENCE_MAPPINGS[formDataKey]) { // Prüfen, ob es Mappings für Multi-Referenz gibt
                        const mappedIds = formValue
                            .map(itemText => REFERENCE_MAPPINGS[formDataKey][itemText])
                            .filter(id => id && !id.startsWith('BITTE_WEBFLOW_ITEM_ID_')); // Filtere Platzhalter
                        if (mappedIds.length > 0) {
                            webflowFieldData[webflowSlug] = mappedIds; // Sende Array von IDs
                            console.log(`Webflow: Sende Array von gemappten IDs für ${webflowSlug}:`, mappedIds);
                        } else {
                             console.warn(`Webflow: Keine gültigen IDs für Multi-Referenzfeld ${webflowSlug} gefunden nach Mapping. Werte: ${formValue.join(', ')}`);
                        }
                    } else { // Fallback: Sende als kommaseparierten String (für Text- oder Multi-Option-Textfelder)
                        if (formValue.length > 0) {
                            webflowFieldData[webflowSlug] = formValue.join(', ');
                            console.log(`Webflow: Sende kommaseparierten String für ${webflowSlug} (keine REFERENCE_MAPPINGS):`, webflowFieldData[webflowSlug]);
                        } else {
                             console.log(`Webflow: Array für ${webflowSlug} ist leer, wird nicht gesendet.`);
                        }
                    }
                    continue;
                }

                // Spezifische Behandlung für creator-follower (formDataKey ist 'creatorCountOptional')
                if (formDataKey === 'creatorCountOptional' && webflowSlug === 'creator-follower') {
                    const followerValue = rawFormData['creatorCountOptional']; // Der String, z.B. "10.000 - 25.000"
                    if (followerValue && REFERENCE_MAPPINGS['creatorFollower'] && REFERENCE_MAPPINGS['creatorFollower'][followerValue]) {
                        webflowFieldData[webflowSlug] = REFERENCE_MAPPINGS['creatorFollower'][followerValue];
                        console.log(`Webflow: Setze '${webflowSlug}' mit gemappter ID: ${webflowFieldData[webflowSlug]} für Wert '${followerValue}'`);
                    } else if (followerValue) {
                        console.warn(`Webflow: Kein Mapping in REFERENCE_MAPPINGS['creatorFollower'] für Wert '${followerValue}' gefunden. Feld '${webflowSlug}' wird nicht gesetzt oder als Rohwert gesendet.`);
                        // Optional: Sende Rohwert, wenn Webflow das akzeptiert und es kein Referenzfeld ist
                        // webflowFieldData[webflowSlug] = followerValue;
                    }
                    continue;
                }


                if (REFERENCE_MAPPINGS[formDataKey] && REFERENCE_MAPPINGS[formDataKey].hasOwnProperty(formValue) && !Array.isArray(formValue)) {
                    const mappedId = REFERENCE_MAPPINGS[formDataKey][formValue];
                    if (mappedId && !mappedId.startsWith('webflow_id_') && !mappedId.startsWith('deine_id_hier_') && !mappedId.startsWith('BITTE_WEBFLOW_ITEM_ID_')) {
                        webflowFieldData[webflowSlug] = mappedId;
                    } else if (mappedId) { 
                        console.warn(`Platzhalter-ID für Webflow Single-Select '${formDataKey}' (Slug: ${webflowSlug}) gefunden: ${formValue}.`);
                    } else { 
                        console.warn(`Keine gültige Webflow ID für Single-Select '${formDataKey}' (Slug: ${webflowSlug}). Wert: ${formValue}. Sende Rohwert.`);
                        webflowFieldData[webflowSlug] = formValue; 
                    }
                } else if (Array.isArray(formValue)) { 
                    // Sollte bereits oben für Land/Sprache/Channels/Nutzungsrechte behandelt worden sein.
                    // Dieser Block ist ein Fallback für andere unerwartete Array-Felder.
                    console.warn(`Webflow: Unerwartetes Array für Feld '${formDataKey}' (Slug: ${webflowSlug}) gefunden. Sende Roh-Array.`, formValue);
                    webflowFieldData[webflowSlug] = formValue;
                } else if (['startDate', 'endDate', 'jobOnline'].includes(formDataKey)) {
                    if (formValue) webflowFieldData[webflowSlug] = formValue;
                } else if (typeof formValue === 'boolean') {
                    webflowFieldData[webflowSlug] = formValue;
                } else if (typeof formValue === 'number') {
                    webflowFieldData[webflowSlug] = formValue;
                } else { 
                    if (formValue !== undefined && formValue !== null && String(formValue).trim() !== '') {
                         webflowFieldData[webflowSlug] = String(formValue);
                    }
                }
            }

            const adminTestWebflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS['admin-test'];
            if (adminTestWebflowSlug && rawFormData.hasOwnProperty('admin-test')) {
                webflowFieldData[adminTestWebflowSlug] = rawFormData['admin-test'];
            } else if (adminTestWebflowSlug) {
                 webflowFieldData[adminTestWebflowSlug] = true; 
                 console.log(`Hinweis: Das Webflow-Feld '${adminTestWebflowSlug}' wird fest auf '${webflowFieldData[adminTestWebflowSlug]}' gesetzt, da nicht im Formular.`);
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

            console.log('Sende an Airtable Worker (Update Job mit Webflow ID):', AIRTABLE_WORKER_URL + '/update', JSON.stringify({ recordId: airtableRecordId, webflowId: webflowItemId }));
            const airtableUpdateResponse = await fetch(AIRTABLE_WORKER_URL + '/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recordId: airtableRecordId, webflowId: webflowItemId })
            });
            const airtableUpdateResponseData = await airtableUpdateResponse.json();

            if (!airtableUpdateResponse.ok) {
                console.error('Fehler vom Airtable Worker (Update Job):', airtableUpdateResponse.status, airtableUpdateResponseData);
                let userMessage = `Es ist ein Fehler beim Aktualisieren des Jobs in Airtable aufgetreten (${airtableUpdateResponse.status}).`;
                let supportDetails = `Airtable Update Job Worker Status: ${airtableUpdateResponse.status}.`;
                if (airtableUpdateResponseData) supportDetails += ` Worker Response: ${JSON.stringify(airtableUpdateResponseData)}`;
                showCustomPopup(userMessage, 'error', 'Airtable Fehler', supportDetails);
                if (submitButton) { submitButton.disabled = false; const partialSuccessText = 'Teilweise erfolgreich'; if (submitButton.tagName === 'BUTTON') submitButton.textContent = partialSuccessText; else submitButton.value = partialSuccessText;}
                return;
            }

            console.log('Antwort vom Airtable Worker (Update Job):', airtableUpdateResponseData);
            showCustomPopup('Job erfolgreich in Webflow und Airtable gespeichert!', 'success', 'Erfolgreich');
            if (submitButton) {
                const successText = 'Erfolgreich gesendet!';
                if (submitButton.tagName === 'BUTTON') {
                    submitButton.textContent = successText;
                } else {
                    submitButton.value = successText;
                }
            }

        } catch (error) {
            console.error('Unerwarteter Fehler beim Absenden:', error);
            const userMessage = `Ein unerwarteter Fehler ist aufgetreten: ${error.message}.`;
            const supportDetails = `Unerwarteter Frontend Fehler: ${error.message}. Stack: ${error.stack}. Raw Form Data: ${JSON.stringify(rawFormData)}. Transformed Airtable Data: ${JSON.stringify(airtableJobDetails || {})}`;
            showCustomPopup(userMessage, 'error', 'Unerwarteter Fehler', supportDetails);
            if (airtableRecordId && !webflowItemId) {
                deleteAirtableRecord(airtableRecordId, `Unexpected frontend error or Webflow failure: ${error.message}`);
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
