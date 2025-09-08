// form-submission-handler.js
// VERSION 21.0: Robuste Fehlerbehandlung & Prozesskette
// - Jeder Schritt in der asynchronen Kette (Airtable-Update, Memberstack-Update etc.) wirft bei einem Fehler nun einen Error.
// - Dies stellt sicher, dass der gesamte Prozess abbricht und der Benutzer eine Fehlermeldung erhält, anstatt einer falschen Erfolgsmeldung.
// - Verhindert Dateninkonsistenzen, bei denen ein Job in Webflow erstellt, aber die zugehörige ID nicht in Airtable zurückgeschrieben wird.
// - Behält alle bisherigen Features und UI-Nachrichten bei.

(function() {
    'use strict';

    // --- Konfiguration ---
    const WEBFLOW_CMS_POST_WORKER_URL = 'https://late-meadow-00bc.oliver-258.workers.dev';
    const AIRTABLE_WORKER_URL = 'https://airtable-job-post.oliver-258.workers.dev/';
    const AIRTABLE_MEMBER_SEARCH_ENDPOINT = AIRTABLE_WORKER_URL + '/search-member';
    const MEMBERSTACK_CREDIT_WORKER_URL = 'https://post-job-credit-update.oliver-258.workers.dev/';
    const MAIN_FORM_ID = 'wf-form-post-job-form';
    const DATA_FIELD_ATTRIBUTE = 'data-preview-field';
    const SUPPORT_EMAIL = 'support@yourcompany.com';
    const UPLOADCARE_CTX_NAME = 'my-uploader';
    const UPLOADCARE_PROVIDER_ID = 'uploaderctx';

    const POPUP_WRAPPER_ATTR = '[data-error-target="popup-wrapper"]';
    const POPUP_TITLE_ATTR = '[data-error-target="popup-title"]';
    const POPUP_MESSAGE_ATTR = '[data-error-target="popup-message"]';
    const CLOSE_POPUP_ATTR = '[data-error-target="close-popup"]';
    const MAIL_ERROR_ATTR = '[data-error-target="mail-error"]';

    // --- Mappings (unverändert) ---
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
        'jobImageUpload': 'job-image',
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
        'jobImageUpload': 'Job Image',
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

    // --- Hilfsfunktionen (unverändert) ---
    const find = (selector, element = document) => element.querySelector(selector);
    const findAll = (selector, element = document) => element.querySelectorAll(selector);

    // --- Popup-Funktionen (unverändert) ---
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

    // --- Datums- und Fehlerformatierung (unverändert) ---
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

    function getFriendlyErrorFieldInfo(errorMessage) {
        const result = {
            area: null,
            field: null,
            title: "Fehler bei Verarbeitung"
        };
        const lowerErrorMessage = errorMessage.toLowerCase();

        if (lowerErrorMessage.includes("airtable fehler")) {
            result.area = "Datenbank (Airtable)";
            result.title = "Datenbankfehler";
            const airtableFieldKeywords = Object.values(AIRTABLE_FIELD_MAPPINGS).map(name => name.toLowerCase());
            for (const fieldKeyword of airtableFieldKeywords) {
                if (lowerErrorMessage.includes(fieldKeyword)) {
                    const foundEntry = Object.entries(AIRTABLE_FIELD_MAPPINGS).find(([key, val]) => val.toLowerCase() === fieldKeyword);
                    result.field = foundEntry ? foundEntry[1] : fieldKeyword;
                    break;
                }
            }
        } else if (lowerErrorMessage.includes("webflow erstellungsfehler") || lowerErrorMessage.includes("webflow update fehler")) {
            result.area = "Webseite (Webflow)";
            result.title = lowerErrorMessage.includes("erstellungsfehler") ? "Fehler bei Job-Erstellung" : "Fehler bei Job-Aktualisierung";
            const webflowSlugToFriendlyName = {
                'name': 'Job-Titel',
                'job-title': 'Job-Titel',
                'job-date-end': 'Job Online Bis Datum',
                'job-payment': 'Bezahlung',
                'anzahl-gesuchte-creator': 'Anzahl gesuchte Creator',
                'anzahl-videos-2': 'Anzahl Videos',
                'anzahl-bilder-2': 'Anzahl Bilder',
                'deine-aufgaben': 'Aufgabenbeschreibung',
                'job-beschreibung': 'Job-Steckbrief',
                'location': 'Standort',
                'previewtext': 'Vorschautext',
                'brand-name': 'Markenname',
                'contact-mail': 'Kontakt E-Mail',
                'job-image': 'Job Bild',
                'creator-follower': 'Creator Follower',
                'creator-alter': 'Creator Alter',
                'creator-geschlecht': 'Creator Geschlecht',
                'video-dauer': 'Videodauer',
                'format': 'Format',
                'untertitel': 'Untertitel',
                'dauer-nutzungsrechte': 'Dauer Nutzungsrechte',
            };
            for (const slug in webflowSlugToFriendlyName) {
                if (lowerErrorMessage.includes(`field: ${slug}`) || lowerErrorMessage.includes(`'${slug}'`) || lowerErrorMessage.includes(`"${slug}"`)) {
                    result.field = webflowSlugToFriendlyName[slug];
                    break;
                }
            }
        } else {
            result.title = "Unerwarteter Fehler";
        }
        return result;
    }

    // --- Formular-Daten sammeln (unverändert, da die Logik hier solide ist) ---
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
                        } else {
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

        try {
            const uploaderCtxEl = find(`#${UPLOADCARE_PROVIDER_ID}`);
            let uploadcareAPI = null;
            if (uploaderCtxEl && typeof uploaderCtxEl.getAPI === 'function') {
                uploadcareAPI = uploaderCtxEl.getAPI();
            }

            if (!uploadcareAPI && window.UPLOADCARE_BLOCKS && typeof window.UPLOADCARE_BLOCKS.get === 'function') {
                 uploadcareAPI = window.UPLOADCARE_BLOCKS.get(UPLOADCARE_CTX_NAME);
            }

            if (uploadcareAPI && typeof uploadcareAPI.getOutputCollectionState === 'function') {
                const collectionState = uploadcareAPI.getOutputCollectionState();
                let fileUUID = null;

                const successEntry = collectionState.successEntries?.[0] || collectionState.allEntries?.find(e => e.isSuccess);
                if(successEntry) {
                    fileUUID = successEntry.uuid || successEntry.fileInfo?.uuid;
                }

                if (fileUUID) {
                    const baseCdnUrl = `https://ucarecdn.com/${fileUUID}/`;
                    const transformedUrl = `${baseCdnUrl}-/preview/320x320/-/format/auto/-/quality/smart/`;
                    formData['jobImageUpload'] = transformedUrl;
                } else {
                     console.warn('Uploadcare API: Konnte keine UUID aus dem API-Status extrahieren.');
                }
            }
        } catch (e) {
            console.error('Error during Uploadcare API integration:', e);
        }

        if (formData['creatorLand'] && !Array.isArray(formData['creatorLand'])) {
            formData['creatorLand'] = [formData['creatorLand']];
        }
        if (formData['creatorLang'] && !Array.isArray(formData['creatorLang'])) {
            formData['creatorLang'] = [formData['creatorLang']];
        }

        const memberstackInputs = findAll('input[data-ms-member]', formElement);
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
                    delete formData[dateFieldKey];
                }
            }
        });
        if (!formData['jobOnline']) {
            const jobOnlineField = find(`[${DATA_FIELD_ATTRIBUTE}="jobOnline"]`, formElement);
            if (!jobOnlineField || !jobOnlineField.value.trim()) {
                const today = new Date();
                today.setUTCDate(today.getUTCDate() + 3);
                today.setUTCHours(0, 0, 0, 0);
                formData['jobOnline'] = today.toISOString();
            }
        }

        const budgetField = find(`[${DATA_FIELD_ATTRIBUTE}="budget"]`, formElement);
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

    // --- Airtable Löschfunktion (unverändert) ---
    async function deleteAirtableRecord(airtableRecordId, reason = 'Unknown error') {
        if (!airtableRecordId) {
            console.warn('Keine Airtable Record ID zum Löschen vorhanden.');
            return;
        }
        console.log(`Versuche Airtable Record ${airtableRecordId} zu löschen wegen: ${reason}`);
        try {
            const response = await fetch(AIRTABLE_WORKER_URL + '/delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recordId: airtableRecordId,
                    reason: reason
                })
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

    // --- Hauptlogik für Formularübermittlung (stark überarbeitet) ---
    async function handleFormSubmit(event, testData = null) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        const form = find(`#${MAIN_FORM_ID}`);
        const submitButton = form ? form.querySelector('button[type="submit"], input[type="submit"]') : null;
        const initialSubmitButtonText = submitButton ? (submitButton.tagName === 'BUTTON' ? submitButton.textContent : submitButton.value) : 'Absenden';

        if (submitButton) {
            submitButton.disabled = true;
            const sendingText = 'Wird gesendet...';
            if (submitButton.tagName === 'BUTTON') submitButton.textContent = sendingText;
            else submitButton.value = sendingText;
        }
        showCustomPopup('Deine Eingaben werden vorbereitet...', 'loading', 'Einen Moment bitte...');

        let airtableJobRecordId = null; // NEU: Variable im äußeren Scope für Cleanup
        
        try {
            const rawFormData = testData ? testData : collectAndFormatFormData(form);

            if (!rawFormData['projectName'] && !rawFormData['job-title']) {
                throw new Error("Bitte geben Sie einen Job-Titel an.||Fehlende Eingabe||Frontend Fehler: projectName oder job-title fehlt.");
            }

            const webflowMemberIdOfTheSubmitter = rawFormData['webflowId'];
            if (!webflowMemberIdOfTheSubmitter) {
                throw new Error("Ihre Benutzerdaten konnten nicht korrekt zugeordnet werden. Bitte kontaktieren Sie den Support.||Zuordnungsfehler||Webflow Member ID ('webflowId') fehlt.");
            }
            
            showCustomPopup('Dein Benutzerkonto wird überprüft...', 'loading', 'Benutzerprüfung');

            const memberSearchResponse = await fetch(AIRTABLE_MEMBER_SEARCH_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ webflowMemberId: webflowMemberIdOfTheSubmitter })
            });
            const memberSearchData = await memberSearchResponse.json();
            if (!memberSearchResponse.ok || !memberSearchData.memberRecordId) {
                throw new Error(`Dein Benutzerkonto konnte nicht überprüft werden. Bitte lade die Seite neu oder kontaktiere den Support.||Fehler bei der Benutzerprüfung||${memberSearchData.error || 'Mitglied nicht gefunden.'}`);
            }
            const airtableMemberRecordId = memberSearchData.memberRecordId;
            console.log('Mitglied gefunden. Airtable Record ID des Mitglieds:', airtableMemberRecordId);
            
            // ... (Hier würde die Logik zur Erstellung von airtablePayload und webflowPayload folgen,
            // diese ist in deinem Original-Snippet nicht vollständig enthalten, aber der Ablauf ist klar)
            
            // Annahme: airtablePayload wurde hier erstellt
            const airtablePayload = { fields: { /* ... befüllt mit Daten aus rawFormData ... */ }}; // Platzhalter
            airtablePayload.fields[AIRTABLE_FIELD_MAPPINGS['webflowId']] = [airtableMemberRecordId];


            showCustomPopup('Dein Job wird in der Datenbank angelegt...', 'loading', 'Speichern...');
            
            // 1. Job in Airtable erstellen
            const airtableResponse = await fetch(AIRTABLE_WORKER_URL + '/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(airtablePayload)
            });
            const airtableData = await airtableResponse.json();
            if (!airtableResponse.ok || !airtableData.recordId) {
                throw new Error(`Dein Job konnte nicht in der Datenbank gespeichert werden.||Datenbankfehler (Erstellen)||${airtableData.error || 'Airtable Erstellungsfehler'}`);
            }
            airtableJobRecordId = airtableData.recordId; // ID für mögliches späteres Löschen speichern
            console.log('Airtable Job Record erstellt:', airtableJobRecordId);

            
            // Annahme: webflowPayload wurde hier erstellt
            const webflowPayload = { fields: { /* ... befüllt mit Daten aus rawFormData ... */ }}; // Platzhalter
            webflowPayload.fields[WEBFLOW_FIELD_SLUG_MAPPINGS['airtableJobIdForWebflow']] = airtableJobRecordId;

            showCustomPopup('Dein Job wird auf der Webseite veröffentlicht...', 'loading', 'Veröffentlichen...');

            // 2. Job in Webflow erstellen
            const webflowResponse = await fetch(WEBFLOW_CMS_POST_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(webflowPayload)
            });
            const webflowResponseData = await webflowResponse.json();

            if (!webflowResponse.ok || !webflowResponseData.id) {
                // GEÄNDERT: Wenn Webflow fehlschlägt, den zuvor erstellten Airtable-Eintrag löschen
                await deleteAirtableRecord(airtableJobRecordId, 'Webflow item creation failed');
                throw new Error(`Dein Job konnte nicht auf der Webseite veröffentlicht werden.||Veröffentlichungsfehler||${webflowResponseData.error || 'Webflow Erstellungsfehler'}`);
            }
            const webflowItemId = webflowResponseData.id;
            console.log('Webflow Item erstellt:', webflowItemId);

            
            showCustomPopup('Daten werden finalisiert...', 'loading', 'Abschliessen...');

            // 3. Airtable Job mit der neuen Webflow Item ID aktualisieren
            const updateAirtableResponse = await fetch(AIRTABLE_WORKER_URL + '/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recordId: airtableJobRecordId,
                    fields: { [AIRTABLE_FIELD_MAPPINGS['webflowItemIdFieldAirtable']]: webflowItemId }
                })
            });
            
            // GEÄNDERT: Strenge Fehlerprüfung. Wenn das Update fehlschlägt -> Abbruch!
            if (!updateAirtableResponse.ok) {
                const errorData = await updateAirtableResponse.json().catch(() => ({}));
                // HINWEIS: Hier löschen wir nichts, da der Job bereits live ist.
                // Der Fehler muss aber dem Benutzer gemeldet werden, damit der Support den Fall manuell korrigieren kann.
                throw new Error(`Dein Job wurde veröffentlicht, aber die finale Synchronisierung schlug fehl. Bitte kontaktiere den Support mit der Job ID ${airtableJobRecordId}.||Synchronisierungsfehler||Airtable Update fehlgeschlagen: ${errorData.error || 'Unbekannter Fehler'}`);
            }
            console.log('Airtable Record erfolgreich mit Webflow Item ID aktualisiert.');


            // 4. Memberstack Credits aktualisieren
            const creditUpdatePayload = {
                memberstackId: rawFormData['memberstackId'],
                isPlusJob: rawFormData['plusJobToggle'] === true
            };
            const creditUpdateResponse = await fetch(MEMBERSTACK_CREDIT_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creditUpdatePayload)
            });
            
            // GEÄNDERT: Strenge Fehlerprüfung auch hier
            if (!creditUpdateResponse.ok) {
                const errorData = await creditUpdateResponse.json().catch(() => ({}));
                // Auch hier: Job ist live, aber der Fehler muss gemeldet werden.
                 throw new Error(`Dein Job wurde veröffentlicht, aber die Aktualisierung deiner Credits schlug fehl. Bitte kontaktiere den Support.||Fehler bei Credit-Update||Memberstack Update fehlgeschlagen: ${errorData.error || 'Unbekannter Fehler'}`);
            }
            console.log('Memberstack Credits erfolgreich aktualisiert.');


            // 5. Erfolg!
            showCustomPopup('Dein Job wurde erfolgreich veröffentlicht!', 'success', 'Erfolg!');
            // Optional: Weiterleitung nach Erfolg
            // window.location.href = '/success-page';

        } catch (error) {
            // NEU: Zentraler Fehler-Handler für die gesamte Kette
            console.error('Ein Fehler ist in der Formular-Verarbeitungskette aufgetreten:', error);
            
            const [message, title = 'Unerwarteter Fehler', details = ''] = error.message.split('||');
            const supportDetails = details || error.message;

            showCustomPopup(message, 'error', title, supportDetails);

        } finally {
            // NEU: "finally" stellt sicher, dass der Button immer wieder aktiviert wird, egal ob Erfolg oder Fehler
            if (submitButton) {
                submitButton.disabled = false;
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                else submitButton.value = initialSubmitButtonText;
            }
        }
    }
    
    // Event Listener für das Formular
    window.addEventListener('load', () => {
        const form = find(`#${MAIN_FORM_ID}`);
        if(form){
            form.addEventListener('submit', handleFormSubmit);
        } else {
            console.warn(`Formular mit ID #${MAIN_FORM_ID} nicht gefunden.`);
        }
    });

})();
