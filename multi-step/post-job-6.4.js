// form-submission-handler.js
// VERSION 20.4: Feature Revert
// - Reverts to 'admin-test' being false by default (production-ready).
// - Removes the Airtable error logging functionality.
// - Retains user-friendly messages and syntax fixes.

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

        let uploadcareAPI = null;
        try {
            console.log(`[Uploadcare Debug] Attempting to get API via document.querySelector('#${UPLOADCARE_PROVIDER_ID}').getAPI()`);
            const uploaderCtxEl = find(`#${UPLOADCARE_PROVIDER_ID}`);
            if (uploaderCtxEl && typeof uploaderCtxEl.getAPI === 'function') {
                uploadcareAPI = uploaderCtxEl.getAPI();
                if (uploadcareAPI) {
                    console.log('[Uploadcare Debug] API instance retrieved via #uploaderctx.getAPI():', uploadcareAPI);
                } else {
                    console.warn('[Uploadcare Debug] #uploaderctx.getAPI() was callable but did not return an API instance.');
                }
            } else if (uploaderCtxEl) {
                console.warn(`[Uploadcare Debug] Element with ID #${UPLOADCARE_PROVIDER_ID} was found, but its getAPI method is NOT a function. Type is: ${typeof uploaderCtxEl.getAPI}.`);
            } else {
                console.warn(`[Uploadcare Debug] Element with ID #${UPLOADCARE_PROVIDER_ID} was NOT FOUND in the document.`);
            }

            if (!uploadcareAPI) {
                console.log('[Uploadcare Debug] Attempting to get API via window.UPLOADCARE_BLOCKS.get() as fallback 1');
                if (window.UPLOADCARE_BLOCKS && typeof window.UPLOADCARE_BLOCKS.get === 'function') {
                    uploadcareAPI = window.UPLOADCARE_BLOCKS.get(UPLOADCARE_CTX_NAME);
                    if (uploadcareAPI) {
                        console.log('[Uploadcare Debug] API instance retrieved via window.UPLOADCARE_BLOCKS.get():', uploadcareAPI);
                    } else {
                        console.warn('[Uploadcare Debug] window.UPLOADCARE_BLOCKS.get() did NOT return an API instance for ctx-name:', UPLOADCARE_CTX_NAME);
                    }
                } else {
                    console.error('[Uploadcare Debug] CRITICAL: window.UPLOADCARE_BLOCKS or window.UPLOADCARE_BLOCKS.get is not available.');
                }
            }

            if (!uploadcareAPI) {
                console.warn('[Uploadcare Debug] Falling back to DOM query for uploader element (uc-file-uploader-regular) as fallback 2.');
                const uploaderEl = find(`uc-file-uploader-regular[ctx-name="${UPLOADCARE_CTX_NAME}"]`, formElement);
                console.log('[Uploadcare Debug] Uploader element (uc-file-uploader-regular) found via DOM query:', uploaderEl);
                if (uploaderEl && typeof uploaderEl.getAPI === 'function') {
                    uploadcareAPI = uploaderEl.getAPI();
                    console.log('[Uploadcare Debug] API instance retrieved via uc-file-uploader-regular.getAPI():', uploadcareAPI);
                } else if (uploaderEl) {
                    console.error(`[Uploadcare Debug] uc-file-uploader-regular element WAS FOUND via DOM query, but its getAPI method is NOT a function. Type is: ${typeof uploaderEl.getAPI}.`);
                } else {
                    console.error(`[Uploadcare Debug] uc-file-uploader-regular element with ctx-name "${UPLOADCARE_CTX_NAME}" was NOT FOUND via DOM query.`);
                }
            }

            if (uploadcareAPI && typeof uploadcareAPI.getOutputCollectionState === 'function') {
                const collectionState = uploadcareAPI.getOutputCollectionState();
                let fileUUID = null;

                if (collectionState && collectionState.successEntries && collectionState.successEntries.length > 0) {
                    const firstSuccessEntry = collectionState.successEntries[0];
                    fileUUID = firstSuccessEntry.uuid || (firstSuccessEntry.fileInfo ? firstSuccessEntry.fileInfo.uuid : null);
                    console.log('Uploadcare API: Found UUID from successEntries:', fileUUID);
                } else if (collectionState && collectionState.allEntries && collectionState.allEntries.length > 0) {
                    const firstEntry = collectionState.allEntries.find(entry => entry.isSuccess);
                    if (firstEntry) {
                        fileUUID = firstEntry.uuid || (firstEntry.fileInfo ? firstEntry.fileInfo.uuid : null);
                        console.log('Uploadcare API: Found UUID from allEntries (isSuccess=true):', fileUUID);
                    } else {
                        console.log('Uploadcare API: No entry with isSuccess=true in allEntries.');
                    }
                } else {
                    console.log('Uploadcare API: No successful or available entries found in collection state.');
                }

                if (fileUUID) {
                    const baseCdnUrl = `https://ucarecdn.com/${fileUUID}/`;
                    const transformedUrl = `${baseCdnUrl}-/preview/320x320/-/format/auto/-/quality/smart/`;
                    formData['jobImageUpload'] = transformedUrl;
                    console.log('Uploadcare Image URL (from API) prepared for Airtable/Webflow:', transformedUrl);
                } else {
                    console.warn('Uploadcare API: Could not retrieve a valid file UUID via any API method. Attempting final fallback to hidden input.');
                    const uploadcareHiddenInput = find(`input[name="${UPLOADCARE_CTX_NAME}"]`, formElement);
                    if (uploadcareHiddenInput && uploadcareHiddenInput.value && uploadcareHiddenInput.value.trim() !== '') {
                        let cdnLink = uploadcareHiddenInput.value.trim();
                        console.warn('Uploadcare API: Falling back to hidden input value:', cdnLink);
                        if (cdnLink.startsWith('https://ucarecdn.com/') && !cdnLink.endsWith('/')) {
                            cdnLink += '/';
                        } else if (!cdnLink.startsWith('https://ucarecdn.com/')) {
                            if (cdnLink.includes('~')) {
                                const groupBaseUUID = cdnLink.split('~')[0];
                                cdnLink = `https://ucarecdn.com/${groupBaseUUID}/nth/0/`;
                                console.warn('Uploadcare API: Hidden input seems to be a group UUID, attempting to use first file:', cdnLink);
                            } else {
                                cdnLink = `https://ucarecdn.com/${cdnLink}/`;
                            }
                        }
                        const transformedUrl = `${cdnLink}-/preview/320x320/-/format/auto/-/quality/smart/`;
                        formData['jobImageUpload'] = transformedUrl;
                        console.warn('Uploadcare Image URL (from fallback input) prepared:', transformedUrl);
                    } else {
                        console.log('Uploadcare API: Final fallback to hidden input also failed (not found or no value).');
                    }
                }
            } else if (uploadcareAPI) {
                console.error(`Uploadcare API: API instance was retrieved, but its getOutputCollectionState method is missing or not a function. Type is: ${typeof uploadcareAPI.getOutputCollectionState}`);
            } else {
                console.error(`Uploadcare API: Failed to obtain API instance through all available methods. Cannot process Uploadcare file.`);
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
        // MODIFIED MESSAGE
        showCustomPopup('Deine Eingaben werden vorbereitet...', 'loading', 'Einen Moment bitte...');

        const rawFormData = testData ? testData : collectAndFormatFormData(form);

        if (!rawFormData['projectName'] && !rawFormData['job-title']) {
            showCustomPopup("Bitte geben Sie einen Job-Titel an.", 'error', 'Fehlende Eingabe', 'Frontend Fehler: projectName oder job-title fehlt.');
            if (submitButton) {
                submitButton.disabled = false;
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                else submitButton.value = initialSubmitButtonText;
            }
            return;
        }

        const webflowMemberIdOfTheSubmitter = rawFormData['webflowId'];
        if (!webflowMemberIdOfTheSubmitter) {
            showCustomPopup("Ihre Benutzerdaten konnten nicht korrekt zugeordnet werden. Bitte kontaktieren Sie den Support.", 'error', 'Zuordnungsfehler', "Webflow Member ID ('webflowId') fehlt.");
            if (submitButton) {
                submitButton.disabled = false;
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                else submitButton.value = initialSubmitButtonText;
            }
            return;
        }
        // MODIFIED MESSAGE
        showCustomPopup('Dein Benutzerkonto wird überprüft...', 'loading', 'Benutzerprüfung');

        let airtableMemberRecordId = null;
        try {
            const memberSearchResponse = await fetch(AIRTABLE_MEMBER_SEARCH_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    webflowMemberId: webflowMemberIdOfTheSubmitter
                })
            });
            const memberSearchData = await memberSearchResponse.json();
            if (!memberSearchResponse.ok || !memberSearchData.memberRecordId) {
                throw new Error(memberSearchData.error || 'Mitglied nicht gefunden.');
            }
            airtableMemberRecordId = memberSearchData.memberRecordId;
            console.log('Mitglied gefunden. Airtable Record ID des Mitglieds:', airtableMemberRecordId);
        } catch (error) {
            // MODIFIED MESSAGE
            showCustomPopup("Dein Benutzerkonto konnte nicht überprüft werden. Bitte lade die Seite neu oder kontaktiere den Support.", 'error', 'Fehler bei der Benutzerprüfung', `Fehler bei Mitgliedersuche: ${error.message}`);
            if (submitButton) {
                submitButton.disabled = false;
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                else submitButton.value = initialSubmitButtonText;
            }
            return;
        }

        let airtableRecordId = null;
        let webflowItemId = null;
        let airtableJobDetails = {};
        let webflowFieldData = {};

        try {
            for (const keyInRawForm in rawFormData) {
                if (rawFormData.hasOwnProperty(keyInRawForm)) {
                    const airtableKey = AIRTABLE_FIELD_MAPPINGS[keyInRawForm] || keyInRawForm;
                    airtableJobDetails[airtableKey] = rawFormData[keyInRawForm];
                }
            }
            airtableJobDetails['job-posted-by'] = [airtableMemberRecordId];

            // 'admin-test' wird auf false gesetzt, es sei denn, die Checkbox ist explizit aktiviert
            const adminTestAirtableKey = AIRTABLE_FIELD_MAPPINGS['admin-test'] || 'admin-test';
            airtableJobDetails[adminTestAirtableKey] = rawFormData['admin-test'] === true;


            // MODIFIED MESSAGE
            showCustomPopup('Deine Job-Details werden gespeichert...', 'loading', 'Speichervorgang');
            const airtableCreateResponse = await fetch(AIRTABLE_WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jobDetails: airtableJobDetails
                })
            });
            const airtableCreateResponseData = await airtableCreateResponse.json();
            if (!airtableCreateResponse.ok) {
                throw new Error(`Airtable Fehler (${airtableCreateResponse.status}): ${airtableCreateResponseData.error?.message || JSON.stringify(airtableCreateResponseData)}`);
            }
            airtableRecordId = airtableCreateResponseData.records?.[0]?.id;
            if (!airtableRecordId) {
                throw new Error('Airtable Record ID nicht erhalten nach Erstellung.');
            }
            console.log('Airtable Job Record erstellt mit ID:', airtableRecordId);
            // MODIFIED MESSAGE
            showCustomPopup('Job-Details gespeichert. Dein Job wird jetzt veröffentlicht...', 'loading', 'Veröffentlichung');

            webflowFieldData['name'] = rawFormData['job-title'] || rawFormData['projectName'] || 'Unbenannter Job';
            webflowFieldData['slug'] = airtableRecordId;

            const jobPostedBySlug = WEBFLOW_FIELD_SLUG_MAPPINGS['webflowId'];
            if (jobPostedBySlug && webflowMemberIdOfTheSubmitter) {
                webflowFieldData[jobPostedBySlug] = webflowMemberIdOfTheSubmitter;
            }

            for (const formDataKey in WEBFLOW_FIELD_SLUG_MAPPINGS) {
                const webflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS[formDataKey];
                if (!webflowSlug || ['name', 'slug', 'webflowId', 'airtableJobIdForWebflow'].includes(formDataKey)) {
                    continue;
                }
                let formValue = rawFormData[formDataKey];
                if (formDataKey === 'webflowIdForTextField' && webflowSlug === 'webflow-member-id') {
                    if (rawFormData['webflowId']) webflowFieldData[webflowSlug] = rawFormData['webflowId'];
                    continue;
                }
                if (formDataKey === 'jobImageUpload' && webflowSlug === 'job-image') {
                    if (rawFormData[formDataKey]) {
                        webflowFieldData[webflowSlug] = rawFormData[formDataKey];
                    }
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
                        console.warn(`Webflow: Kein Mapping für creatorFollower: '${followerValueString}'`);
                    }
                    continue;
                }
                if (REFERENCE_MAPPINGS[formDataKey]?.[formValue] && !Array.isArray(formValue)) {
                    const mappedId = REFERENCE_MAPPINGS[formDataKey][formValue];
                    if (mappedId && !mappedId.startsWith('BITTE_WEBFLOW_ITEM_ID_') && !mappedId.startsWith('webflow_item_id_')) {
                        webflowFieldData[webflowSlug] = mappedId;
                    } else {
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

            // 'admin-test' wird auf false gesetzt, es sei denn, die Checkbox ist explizit aktiviert
            const adminTestWebflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS['admin-test'];
            if (adminTestWebflowSlug) {
                webflowFieldData[adminTestWebflowSlug] = rawFormData['admin-test'] === true;
            }

            console.log('Sende an Webflow Worker (Create):', JSON.stringify({
                fields: webflowFieldData
            }));
            const webflowCreateResponse = await fetch(WEBFLOW_CMS_POST_WORKER_URL + '/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: webflowFieldData
                })
            });
            const webflowCreateResponseData = await webflowCreateResponse.json().catch(() => ({}));
            if (!webflowCreateResponse.ok) {
                throw new Error(`Webflow Erstellungsfehler (${webflowCreateResponse.status}): ${JSON.stringify(webflowCreateResponseData.error || webflowCreateResponseData.errors || webflowCreateResponseData)}`);
            }
            webflowItemId = webflowCreateResponseData.id || webflowCreateResponseData.item?.id;
            if (!webflowItemId) {
                throw new Error('Webflow Item ID nicht erhalten nach Erstellung.');
            }
            console.log('Webflow Item erstellt mit ID:', webflowItemId);

            const jobSlugInWebflowToUpdate = WEBFLOW_FIELD_SLUG_MAPPINGS['airtableJobIdForWebflow'];
            let webflowItemUpdateSuccess = false;
            if (jobSlugInWebflowToUpdate) {
                // MODIFIED MESSAGE
                showCustomPopup('Letzte Anpassungen werden vorgenommen...', 'loading', 'Abschluss');
                console.log(`Versuche Webflow Item ${webflowItemId} zu aktualisieren: Feld '${jobSlugInWebflowToUpdate}' = ${webflowItemId}`);
                const updatePayload = {
                    fields: {
                        [jobSlugInWebflowToUpdate]: webflowItemId
                    }
                };
                try {
                    const webflowItemUpdateResponse = await fetch(`${WEBFLOW_CMS_POST_WORKER_URL}/${webflowItemId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updatePayload)
                    });
                    const webflowItemUpdateResponseData = await webflowItemUpdateResponse.json().catch(() => ({}));
                    if (!webflowItemUpdateResponse.ok) {
                        console.error(`Fehler beim Aktualisieren des Feldes '${jobSlugInWebflowToUpdate}' im Webflow Item ${webflowItemId}:`, webflowItemUpdateResponse.status, webflowItemUpdateResponseData);
                        throw new Error(`Webflow Update Fehler für '${jobSlugInWebflowToUpdate}' (${webflowItemUpdateResponse.status}): ${JSON.stringify(webflowItemUpdateResponseData.error || webflowItemUpdateResponseData.errors || webflowItemUpdateResponseData)}`);
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
                // MODIFIED MESSAGE
                showCustomPopup('Die Veröffentlichung wird abgeschlossen...', 'loading', 'Finalisierung');
                const airtableUpdatePayload = {
                    recordId: airtableRecordId,
                    webflowId: webflowItemId
                };
                const airtableWebflowIdField = AIRTABLE_FIELD_MAPPINGS['webflowItemIdFieldAirtable'];
                if (airtableWebflowIdField) {
                    airtableUpdatePayload.fieldsToUpdate = {
                        [airtableWebflowIdField]: webflowItemId
                    };
                } else {
                    console.warn("Kein 'webflowItemIdFieldAirtable' in AIRTABLE_FIELD_MAPPINGS definiert. Webflow Item ID wird möglicherweise nicht in Airtable gespeichert.");
                }

                const airtableUpdateResponse = await fetch(AIRTABLE_WORKER_URL + '/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(airtableUpdatePayload)
                });
                const airtableUpdateResponseData = await airtableUpdateResponse.json();
                if (!airtableUpdateResponse.ok) {
                    throw new Error(`Airtable Update Fehler (${airtableUpdateResponse.status}): ${JSON.stringify(airtableUpdateResponseData)}`);
                }
                console.log('Airtable Record aktualisiert mit Webflow Item ID.');
                // MODIFIED MESSAGE
                showCustomPopup('Dein Job wurde erfolgreich veröffentlicht!', 'success', 'Fertig!');
                if (submitButton) {
                    const finalSuccessText = 'Erfolgreich gesendet!';
                    if (submitButton.tagName === 'BUTTON') submitButton.textContent = finalSuccessText;
                    else submitButton.value = finalSuccessText;
                }

                // --- Credit-Abzug nach erfolgreichem Post ---
                const memberstackId = rawFormData['memberstackId'];
                if (memberstackId) {
                    console.log(`Versuche Credit für Memberstack ID ${memberstackId} abzuziehen...`);
                    try {
                        const creditResponse = await fetch(MEMBERSTACK_CREDIT_WORKER_URL, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                memberId: memberstackId
                            })
                        });
                        const creditData = await creditResponse.json();
                        if (creditResponse.ok) {
                            console.log(`Antwort vom Credit-Worker: ${creditData.message} (Credits vorher: ${creditData.oldCredits}, nachher: ${creditData.newCredits})`);
                        } else {
                            console.error('Fehler beim Abziehen des Credits:', creditData.error || 'Unbekannter Fehler vom Credit-Worker.');
                        }
                    } catch (creditError) {
                        console.error('Netzwerkfehler beim Aufruf des Credit-Workers:', creditError);
                    }
                } else {
                    console.warn('Keine Memberstack ID gefunden, es konnte kein Credit abgezogen werden.');
                }
                // --- ENDE: Credit-Abzug ---

            } else {
                throw new Error("Webflow Item Update war nicht erfolgreich, Airtable wurde nicht aktualisiert.");
            }

        } catch (error) {
            console.error('Fehler im Hauptprozess:', error);
            const technicalSupportDetails = `Fehler: ${error.message}. Stack: ${error.stack}. RawData: ${JSON.stringify(rawFormData)}. AirtablePayload: ${JSON.stringify(airtableJobDetails)}. WebflowPayload: ${JSON.stringify(webflowFieldData)}.`;

            const friendlyInfo = getFriendlyErrorFieldInfo(error.message);
            let userDisplayMessage;

            if (friendlyInfo.area) {
                userDisplayMessage = `Es tut uns leid, ein Fehler ist aufgetreten.`;
                if (friendlyInfo.field) {
                    userDisplayMessage += ` Möglicherweise betrifft es das Feld "${friendlyInfo.field}".`;
                }
                userDisplayMessage += " Bitte überprüfen Sie Ihre Eingaben oder kontaktieren Sie den Support, falls der Fehler weiterhin besteht.";
            } else {
                userDisplayMessage = "Es tut uns leid, leider ist ein unerwarteter Fehler bei der Verarbeitung Ihrer Anfrage aufgetreten. Bitte kontaktieren Sie den Support für weitere Hilfe.";
            }
            showCustomPopup(userDisplayMessage, 'error', friendlyInfo.title, technicalSupportDetails);

            if (airtableRecordId) {
                deleteAirtableRecord(airtableRecordId, `Fehler im Webflow-Prozess: ${error.message}`);
            }

            if (submitButton) {
                submitButton.disabled = false;
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                else submitButton.value = initialSubmitButtonText;
            }
        } finally {
            if (submitButton && submitButton.disabled) {
                const currentButtonText = submitButton.tagName === 'BUTTON' ? submitButton.textContent : submitButton.value;
                if (currentButtonText === 'Wird gesendet...') {
                    if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                    else submitButton.value = initialSubmitButtonText;
                    submitButton.disabled = false;
                }
            } else if (submitButton && !submitButton.disabled) {
                const currentButtonText = submitButton.tagName === 'BUTTON' ? submitButton.textContent : submitButton.value;
                if (currentButtonText === 'Wird gesendet...') {
                    if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                    else submitButton.value = initialSubmitButtonText;
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
        handleFormSubmit({
            preventDefault: () => {},
            target: mainForm
        }, testData);
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
            console.log(`Form Submission Handler v20.4 initialisiert für: #${MAIN_FORM_ID}`);
        } else {
            console.warn(`Hauptformular "${MAIN_FORM_ID}" nicht gefunden. Handler nicht aktiv.`);
        }
    });

    function handleFormSubmitWrapper(event) {
        handleFormSubmit(event, null);
    }

})();
