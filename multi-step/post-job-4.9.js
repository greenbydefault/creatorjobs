// form-submission-handler.js
// VERSION 21: Verwendet direkt die von Webflow bereitgestellte Bild-URL.
// - Entfernt die clientseitige Bild-Upload-Logik zum Airtable-Worker.
// - Geht davon aus, dass das Feld 'jobImageUpload' die von Webflow generierte Bild-URL als Text enthält.
// - Fügt detaillierteres Logging für das 'jobImageUpload'-Feld hinzu.
// - Behält die erweiterte Fehlerbehandlung bei (Löschen von Webflow/Airtable-Einträgen im Fehlerfall).

(function() {
    'use strict';

    // --- Konfiguration ---
    const WEBFLOW_CMS_POST_WORKER_URL = 'https://late-meadow-00bc.oliver-258.workers.dev';
    const AIRTABLE_WORKER_URL = 'https://airtable-job-post.oliver-258.workers.dev/';
    const AIRTABLE_MEMBER_SEARCH_ENDPOINT = AIRTABLE_WORKER_URL + '/search-member';
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
            '16:9': 'webflow_item_id_fuer_16_9',
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
        'nutzungOptional': {},
        'channels': {}
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
        'webflowId': 'job-posted-by',
        'webflowIdForTextField': 'webflow-member-id',
        'memberstackId': 'ms-member-id',
        'jobImageUpload': 'job-image', // Webflow Image Field (erwartet URL)
        'creatorCountOptional': 'creator-follower',
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
        'nutzungOptional': 'job-posting',
        'channels': 'fur-welchen-kanale-wird-der-content-produziert',
        'airtableJobIdForWebflow': 'job-id',
        'reviewsOptional': 'anzahl-der-reviews'
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
        'webflowId': 'Webflow Member ID',
        'memberstackId': 'Member ID',
        'jobImageUpload': 'Job Image', // Airtable Attachment Field ID: fldbYK80nBVspv5Gw
        'creatorFollower': 'Creator Follower',
        'creatorCountOptional': 'Creator Follower',
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
        'endDate': 'End Date',
        'webflowItemIdFieldAirtable': 'Webflow Item ID'
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
        if (type !== 'error' && type !== 'loading') {
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
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(dateString)) {
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
            if (!isNaN(dateObj.getTime()) && dateString.indexOf('T') === -1 && dateString.indexOf(':') === -1) {
                const tempDate = new Date(dateString);
                if(!isNaN(tempDate.getTime())) {
                    dateObj = new Date(Date.UTC(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate()));
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

        console.log("Starte Sammlung der Formulardaten...");

        regularFields.forEach(field => {
            const fieldNameKey = field.getAttribute(DATA_FIELD_ATTRIBUTE);
            let value;

            // Spezifische Behandlung für jobImageUpload: Erwartet eine URL
            if (fieldNameKey === 'jobImageUpload') {
                value = field.value ? field.value.trim() : '';
                if (value) {
                    formData[fieldNameKey] = value;
                    console.log(`[DEBUG] jobImageUpload: Element gefunden. Typ: ${field.type}, Wert (URL): '${value}'`);
                } else {
                    console.log(`[DEBUG] jobImageUpload: Element gefunden, aber kein Wert (URL) vorhanden. Typ: ${field.type}`);
                }
                return; // Nächstes Feld
            }

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
                    case 'jobSlug': // jobSlug wird nicht direkt gesendet
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
                            if (numVal !== '' && fieldNameKey !== 'budget') formData[fieldNameKey] = parseFloat(numVal);
                            else if (numVal !== '') formData[fieldNameKey] = parseFloat(numVal);
                        } else if (field.type === 'date') {
                            value = field.value;
                            if (value) formData[fieldNameKey] = value;
                        } else { // Standard Textfelder
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
            }
        });
        ['jobOnline', 'startDate', 'endDate'].forEach(dateFieldKey => {
            if (formData[dateFieldKey]) {
                const isoDate = formatToISODate(formData[dateFieldKey]);
                if (isoDate) {
                    formData[dateFieldKey] = isoDate;
                } else {
                    console.warn(`Ungültiges Datum für '${dateFieldKey}', wird entfernt:`, formData[dateFieldKey]);
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
        if (!formData['creatorCountOptional'] && formData['creatorFollower'] && typeof formData['creatorFollower'] === 'string') {
             formData['creatorCountOptional'] = formData['creatorFollower'];
        }
        console.log('Gesammelte Formulardaten (rawFormData):', JSON.parse(JSON.stringify(formData)));
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

    async function deleteWebflowItem(itemId, reason = 'Unknown error during cleanup') {
        if (!itemId) {
            console.warn('Keine Webflow Item ID zum Löschen vorhanden.');
            return;
        }
        console.log(`Versuche Webflow Item ${itemId} zu löschen wegen: ${reason}`);
        try {
            const response = await fetch(`${WEBFLOW_CMS_POST_WORKER_URL}/${itemId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                console.log(`Webflow Item ${itemId} erfolgreich gelöscht.`);
            } else {
                const responseData = await response.json().catch(() => ({ error: { message: 'Antwort nicht lesbar oder kein JSON.'}}));
                console.error(`Fehler beim Löschen von Webflow Item ${itemId}:`, response.status, responseData);
            }
        } catch (error) {
            console.error(`Unerwarteter Netzwerk- oder Verarbeitungsfehler beim Löschen des Webflow Items ${itemId}:`, error);
        }
    }

    async function handleFormSubmit(event, testData = null) {
        if (event && typeof event.preventDefault === 'function') {
             event.preventDefault();
        }
        const form = find(`#${MAIN_FORM_ID}`);
        const submitButton = form ? form.querySelector('button[type="submit"], input[type="submit"]') : null;
        const initialSubmitButtonText = submitButton ? (submitButton.dataset.initialText || (submitButton.tagName === 'BUTTON' ? submitButton.textContent : submitButton.value)) : 'Absenden';

        if (submitButton) {
            submitButton.disabled = true;
            const sendingText = 'Wird gesendet...';
            if (submitButton.tagName === 'BUTTON') submitButton.textContent = sendingText;
            else submitButton.value = sendingText;
        }
        showCustomPopup('Daten werden gesammelt...', 'loading', 'Vorbereitung');

        const rawFormData = testData ? testData : collectAndFormatFormData(form);

        if (!rawFormData['projectName'] && !rawFormData['job-title']) {
            const errorMessage = 'Fehler: Job-Titel (aus Projektname) fehlt.';
            showCustomPopup(errorMessage, 'error', 'Fehler: Fehlende Daten', `Frontend Fehler: projectName oder job-title fehlt.`);
            if (submitButton) {
                submitButton.disabled = false;
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                else submitButton.value = initialSubmitButtonText;
            }
            return;
        }

        const webflowMemberIdOfTheSubmitter = rawFormData['webflowId'];
        if (!webflowMemberIdOfTheSubmitter) {
            const errorMsg = 'Webflow Member ID des Job-Erstellers nicht im Formular gefunden. Bitte stelle sicher, dass du eingeloggt bist.';
            showCustomPopup(errorMsg, 'error', 'Fehler: Fehlende Zuordnung', `Webflow Member ID ('webflowId' oder 'Webflow Member ID' aus data-ms-member) fehlt.`);
            if (submitButton) {
                submitButton.disabled = false;
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                else submitButton.value = initialSubmitButtonText;
            }
            return;
        }
        showCustomPopup('Suche zugehöriges Mitglied...', 'loading', 'Mitgliedersuche');

        let airtableMemberRecordId = null;
        try {
            const memberSearchResponse = await fetch(AIRTABLE_MEMBER_SEARCH_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ webflowMemberId: webflowMemberIdOfTheSubmitter })
            });
            const memberSearchData = await memberSearchResponse.json();
            if (!memberSearchResponse.ok || !memberSearchData.memberRecordId) {
                throw new Error(memberSearchData.error || 'Mitglied nicht in Airtable gefunden oder Fehler bei der Suche.');
            }
            airtableMemberRecordId = memberSearchData.memberRecordId;
            console.log('Mitglied gefunden. Airtable Record ID des Mitglieds:', airtableMemberRecordId);
        } catch (error) {
            showCustomPopup(`Fehler bei Mitgliedersuche: ${error.message}`, 'error', 'Fehler: Mitgliedersuche', `Details: ${error.stack}`);
            if (submitButton) {
                submitButton.disabled = false;
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                else submitButton.value = initialSubmitButtonText;
            }
            return;
        }
        
        // Bild-URL aus rawFormData holen (sollte von Webflow bereitgestellt und in collectAndFormatFormData gesammelt worden sein)
        const airtableImageUrl = rawFormData['jobImageUpload'] || null;
        if (airtableImageUrl) {
            console.log(`[DEBUG] Bild-URL für Airtable/Webflow verwenden: ${airtableImageUrl}`);
        } else {
            console.log("[DEBUG] Keine Bild-URL im Feld 'jobImageUpload' gefunden.");
        }

        let airtableRecordId = null;
        let webflowItemId = null;
        let airtableJobDetails = {};
        let webflowFieldData = {};

        try {
            // Airtable Daten vorbereiten
            for (const keyInRawForm in rawFormData) {
                if (rawFormData.hasOwnProperty(keyInRawForm)) {
                    // 'jobImageUpload' wird jetzt direkt aus rawFormData für die URL verwendet,
                    // aber der Airtable-Schlüssel ist AIRTABLE_FIELD_MAPPINGS['jobImageUpload']
                    if (keyInRawForm === 'jobImageUpload') continue; // Überspringen, da es unten speziell behandelt wird

                    const airtableKey = AIRTABLE_FIELD_MAPPINGS[keyInRawForm] || keyInRawForm;
                    airtableJobDetails[airtableKey] = rawFormData[keyInRawForm];
                }
            }
            airtableJobDetails['job-posted-by'] = [airtableMemberRecordId];

            if (airtableImageUrl) {
                const airtableImageFieldName = AIRTABLE_FIELD_MAPPINGS['jobImageUpload']; // Sollte 'Job Image' sein
                if (airtableImageFieldName) {
                    // Struktur für Airtable Attachment Field
                    airtableJobDetails[airtableImageFieldName] = [{ url: airtableImageUrl }];
                     console.log(`[DEBUG] Airtable Payload für ${airtableImageFieldName}:`, airtableJobDetails[airtableImageFieldName]);
                } else {
                    console.warn("[DEBUG] Kein Airtable Mapping für 'jobImageUpload' gefunden.");
                }
            }
            
            const adminTestAirtableKey = AIRTABLE_FIELD_MAPPINGS['admin-test'] || 'admin-test';
            if (rawFormData.hasOwnProperty('admin-test') || AIRTABLE_FIELD_MAPPINGS.hasOwnProperty('admin-test')) {
                 airtableJobDetails[adminTestAirtableKey] = rawFormData['admin-test'] === undefined ? true : rawFormData['admin-test'];
            }

            showCustomPopup('Daten werden in Airtable gespeichert...', 'loading', 'Airtable Speicherung');
            console.log('[DEBUG] Sende an Airtable (Create):', JSON.stringify({ jobDetails: airtableJobDetails }) );
            const airtableCreateResponse = await fetch(AIRTABLE_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobDetails: airtableJobDetails })
            });
            const airtableCreateResponseData = await airtableCreateResponse.json();
            if (!airtableCreateResponse.ok) {
                console.error('[DEBUG] Airtable Create Fehler Response Data:', airtableCreateResponseData);
                throw new Error(`Airtable Fehler (${airtableCreateResponse.status}): ${airtableCreateResponseData.error?.message || JSON.stringify(airtableCreateResponseData)}`);
            }
            airtableRecordId = airtableCreateResponseData.records?.[0]?.id;
            if (!airtableRecordId) {
                throw new Error('Airtable Record ID nicht erhalten nach Erstellung.');
            }
            console.log('Airtable Job Record erstellt mit ID:', airtableRecordId);
            showCustomPopup('In Airtable gespeichert. Erstelle Item in Webflow...', 'loading', 'Webflow Erstellung');

            // Webflow Daten vorbereiten
            webflowFieldData['name'] = rawFormData['job-title'] || rawFormData['projectName'] || 'Unbenannter Job';
            webflowFieldData['slug'] = airtableRecordId;
            const jobPostedBySlug = WEBFLOW_FIELD_SLUG_MAPPINGS['webflowId'];
            if (jobPostedBySlug && webflowMemberIdOfTheSubmitter) {
                webflowFieldData[jobPostedBySlug] = webflowMemberIdOfTheSubmitter;
            }

            if (airtableImageUrl) { // Dieselbe URL von Webflow
                const webflowImageFieldName = WEBFLOW_FIELD_SLUG_MAPPINGS['jobImageUpload']; // Sollte 'job-image' sein
                if (webflowImageFieldName) {
                    webflowFieldData[webflowImageFieldName] = airtableImageUrl;
                    console.log(`[DEBUG] Webflow Payload für ${webflowImageFieldName}: '${airtableImageUrl}'`);
                } else {
                     console.warn("[DEBUG] Kein Webflow Mapping für 'jobImageUpload' gefunden.");
                }
            }

            for (const formDataKey in WEBFLOW_FIELD_SLUG_MAPPINGS) {
                const webflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS[formDataKey];
                if (!webflowSlug || ['name', 'slug', 'webflowId', 'airtableJobIdForWebflow', 'jobImageUpload'].includes(formDataKey)) {
                    continue;
                }
                let formValue = rawFormData[formDataKey];
                if (formDataKey === 'webflowIdForTextField' && webflowSlug === 'webflow-member-id') {
                    if (rawFormData['webflowId']) webflowFieldData[webflowSlug] = rawFormData['webflowId'];
                    continue;
                }
                if (formValue === undefined || formValue === null || (typeof formValue === 'string' && formValue.trim() === '')) {
                    if (typeof formValue === 'boolean') webflowFieldData[webflowSlug] = formValue;
                    else if (webflowSlug === 'job-payment' && rawFormData['budget'] === 0) webflowFieldData[webflowSlug] = 0;
                    else if (formDataKey !== 'admin-test') continue;
                }
                if ((formDataKey === 'creatorLand' || formDataKey === 'creatorLang' || formDataKey === 'channels' || formDataKey === 'nutzungOptional') && Array.isArray(formValue)) {
                    if (formValue.length > 0) webflowFieldData[webflowSlug] = formValue.join(', ');
                    continue;
                }
                if (formDataKey === 'creatorCountOptional' && webflowSlug === 'creator-follower') {
                    const followerValueString = rawFormData['creatorCountOptional'];
                    if (followerValueString && REFERENCE_MAPPINGS['creatorFollower']?.[followerValueString]) {
                        webflowFieldData[webflowSlug] = REFERENCE_MAPPINGS['creatorFollower'][followerValueString];
                    } else if (followerValueString) {
                        console.warn(`Webflow: Kein Mapping für creatorFollower (aus creatorCountOptional): '${followerValueString}'.`);
                    }
                    continue;
                }
                if (REFERENCE_MAPPINGS[formDataKey]?.[formValue] && !Array.isArray(formValue)) {
                    const mappedId = REFERENCE_MAPPINGS[formDataKey][formValue];
                    if (mappedId && !mappedId.startsWith('BITTE_WEBFLOW_ITEM_ID_') && !mappedId.startsWith('webflow_item_id_')) {
                        webflowFieldData[webflowSlug] = mappedId;
                    } else {
                         console.warn(`Webflow: Mapping für '${formDataKey}' mit Wert '${formValue}' ergab ungültige ID '${mappedId}'. Sende Rohwert.`);
                        webflowFieldData[webflowSlug] = formValue;
                    }
                } else if (['startDate', 'endDate', 'jobOnline'].includes(formDataKey)) {
                    if (formValue) webflowFieldData[webflowSlug] = formValue;
                } else if (typeof formValue === 'boolean' || typeof formValue === 'number') {
                    webflowFieldData[webflowSlug] = formValue;
                } else if (formValue !== undefined && formValue !== null && String(formValue).trim() !== '') {
                    webflowFieldData[webflowSlug] = String(formValue);
                }
            }
            const adminTestWebflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS['admin-test'];
            if (adminTestWebflowSlug) {
                webflowFieldData[adminTestWebflowSlug] = rawFormData['admin-test'] === undefined ? true : rawFormData['admin-test'];
            }

            console.log('Sende an Webflow Worker (Create):', JSON.stringify({ fields: webflowFieldData }));
            const webflowCreateResponse = await fetch(WEBFLOW_CMS_POST_WORKER_URL + '/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: webflowFieldData })
            });
            const webflowCreateResponseData = await webflowCreateResponse.json().catch(() => ({}));
            if (!webflowCreateResponse.ok) {
                const errorDetails = webflowCreateResponseData.details?.map(d => `${d.param || d.field || d.name || 'unbekanntes Feld'}: ${d.description || d.message || 'unbekannte Beschreibung'}`).join('; ') || JSON.stringify(webflowCreateResponseData.error || webflowCreateResponseData);
                throw new Error(`Webflow Erstellungsfehler (${webflowCreateResponse.status}): ${errorDetails}`);
            }
            webflowItemId = webflowCreateResponseData.id || webflowCreateResponseData.item?.id;
            if (!webflowItemId) {
                console.error('Webflow Item ID nicht in Antwort gefunden:', webflowCreateResponseData);
                throw new Error('Webflow Item ID nicht erhalten nach Erstellung. Antwort: ' + JSON.stringify(webflowCreateResponseData));
            }
            console.log('Webflow Item erstellt mit ID:', webflowItemId);
            
            const jobSlugInWebflowToUpdate = WEBFLOW_FIELD_SLUG_MAPPINGS['airtableJobIdForWebflow'];
            let webflowItemUpdateSuccess = false;
            if (jobSlugInWebflowToUpdate) {
                showCustomPopup('Aktualisiere Webflow Item mit Job ID...', 'loading', 'Webflow Update');
                console.log(`Versuche Webflow Item ${webflowItemId} zu aktualisieren: Feld '${jobSlugInWebflowToUpdate}' = ${webflowItemId}`);
                const updatePayload = { fields: { [jobSlugInWebflowToUpdate]: webflowItemId } };
                try {
                    const webflowItemUpdateResponse = await fetch(`${WEBFLOW_CMS_POST_WORKER_URL}/${webflowItemId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatePayload)
                    });
                    const webflowItemUpdateResponseData = await webflowItemUpdateResponse.json().catch(() => ({}));
                    if (!webflowItemUpdateResponse.ok) {
                        console.error(`Fehler beim Aktualisieren des Feldes '${jobSlugInWebflowToUpdate}' im Webflow Item ${webflowItemId}:`, webflowItemUpdateResponse.status, webflowItemUpdateResponseData);
                        throw new Error(`Webflow Update Fehler für '${jobSlugInWebflowToUpdate}' (${webflowItemUpdateResponse.status}): ${JSON.stringify(webflowItemUpdateResponseData.error || webflowItemUpdateResponseData)}`);
                    } else {
                        console.log(`Webflow Item ${webflowItemId} erfolgreich aktualisiert: Feld '${jobSlugInWebflowToUpdate}' gesetzt.`);
                        webflowItemUpdateSuccess = true;
                    }
                } catch (updateError) {
                     console.error(`Netzwerkfehler/Exception beim Aktualisieren des Feldes '${jobSlugInWebflowToUpdate}' im Webflow Item ${webflowItemId}:`, updateError);
                    throw new Error(`Webflow Update Exception für '${jobSlugInWebflowToUpdate}': ${updateError.message}`);
                }
            } else {
                console.warn("Kein Mapping für 'airtableJobIdForWebflow' gefunden, 'job-id' kann nicht in Webflow aktualisiert werden. Prozess wird fortgesetzt.");
                webflowItemUpdateSuccess = true;
            }

            if (webflowItemUpdateSuccess) {
                showCustomPopup('Aktualisiere Airtable mit Webflow ID...', 'loading', 'Airtable Aktualisierung');
                const airtableUpdatePayload = { recordId: airtableRecordId };
                const airtableWebflowIdField = AIRTABLE_FIELD_MAPPINGS['webflowItemIdFieldAirtable'];
                if (airtableWebflowIdField && webflowItemId) {
                    airtableUpdatePayload.fieldsToUpdate = { [airtableWebflowIdField]: webflowItemId };
                } else {
                    console.warn("Kein 'webflowItemIdFieldAirtable' in AIRTABLE_FIELD_MAPPINGS definiert oder Webflow Item ID fehlt.");
                }
                const airtableUpdateResponse = await fetch(AIRTABLE_WORKER_URL + '/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(airtableUpdatePayload)
                });
                const airtableUpdateResponseData = await airtableUpdateResponse.json();
                if (!airtableUpdateResponse.ok) {
                     throw new Error(`Airtable Update Fehler (${airtableUpdateResponse.status}): ${JSON.stringify(airtableUpdateResponseData.error || airtableUpdateResponseData)}`);
                }
                console.log('Airtable Record aktualisiert mit Webflow Item ID.');
                showCustomPopup('Job erfolgreich in Webflow und Airtable gespeichert!', 'success', 'Erfolgreich');
                if (form) form.reset();
                if (submitButton) {
                    const finalSuccessText = 'Erfolgreich gesendet!';
                    if (submitButton.tagName === 'BUTTON') submitButton.textContent = finalSuccessText;
                    else submitButton.value = finalSuccessText;
                    setTimeout(() => {
                        submitButton.disabled = false;
                        if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                        else submitButton.value = initialSubmitButtonText;
                    }, 3000);
                }
            } else {
                throw new Error("Webflow Item Update war nicht erfolgreich, Airtable wurde nicht aktualisiert.");
            }

        } catch (error) {
            console.error('Fehler im Hauptprozess:', error);
            let userMessage = `Ein Fehler ist aufgetreten: ${error.message}.`;
            const supportDetails = `Fehler: ${error.message}. Stack: ${error.stack}. RawData: ${JSON.stringify(rawFormData)}. AirtablePayload: ${JSON.stringify(airtableJobDetails)}. WebflowPayload: ${JSON.stringify(webflowFieldData)}.`;
            showCustomPopup(userMessage, 'error', 'Fehler', supportDetails);

            if (airtableRecordId) {
                await deleteAirtableRecord(airtableRecordId, `Fehler im Prozess: ${error.message}`);
            }
            if (webflowItemId) {
                await deleteWebflowItem(webflowItemId, `Fehler im Prozess nach Webflow Item Erstellung: ${error.message}`);
            }

            if (submitButton) {
                submitButton.disabled = false;
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                else submitButton.value = initialSubmitButtonText;
            }
        } finally {
             if (submitButton && submitButton.disabled) {
                const currentButtonText = submitButton.tagName === 'BUTTON' ? submitButton.textContent : submitButton.value;
                if (currentButtonText === 'Wird gesendet...' || currentButtonText.toLowerCase().includes('speichern') || currentButtonText.toLowerCase().includes('aktualisieren')) {
                    if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                    else submitButton.value = initialSubmitButtonText;
                    submitButton.disabled = false;
                }
            }
        }
    }
    
    function testSubmissionWithData(testData) {
        console.log('Starte Test-Übermittlung mit Daten:', testData);
        const mainForm = find(`#${MAIN_FORM_ID}`);
        if (!mainForm) {
            showCustomPopup(`Test-Übermittlung: Hauptformular "${MAIN_FORM_ID}" nicht gefunden.`, 'error', 'Test Fehler');
            return;
        }
        handleFormSubmit({ preventDefault: () => { console.log("Test: preventDefault called"); }, target: mainForm }, testData);
    }
    window.testSubmissionWithData = testSubmissionWithData;

    document.addEventListener('DOMContentLoaded', () => {
        const mainForm = find(`#${MAIN_FORM_ID}`);
        if (mainForm) {
            const submitButton = mainForm.querySelector('button[type="submit"], input[type="submit"]');
            if (submitButton) {
                submitButton.dataset.initialText = submitButton.tagName === 'BUTTON' ? submitButton.textContent : submitButton.value;
            }
            mainForm.removeEventListener('submit', handleFormSubmitWrapper);
            mainForm.addEventListener('submit', handleFormSubmitWrapper);
            console.log(`Form Submission Handler v21 initialisiert für: #${MAIN_FORM_ID}`);
        } else {
            console.warn(`Hauptformular "${MAIN_FORM_ID}" nicht gefunden. Handler nicht aktiv.`);
        }
    });

    function handleFormSubmitWrapper(event) {
        handleFormSubmit(event, null);
    }

})();
