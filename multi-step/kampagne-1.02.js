// form-submission-handler.js
// VERSION 20.4 (Reconciled): Vollfunktionale Original-Features + Bugfixes
// - Bewahrt ALLE Funktionen aus deinem v20.4 (UI-Popups, Error-Mapping, Test-API, Wrapper, Logs, Admin-Test-Default etc.)
// - Fix A: Keine doppelten Slashes mehr bei Worker-URLs, Endpunkte robust zusammengesetzt
// - Fix B: Uploadcare-UUID-Erkennung stabil (Blocks, Provider, Hidden-Input Fallback) – ohne Behavior-Change
// - Fix C: Deterministische ID-Kette: Airtable -> Webflow -> Airtable (job-id = Airtable-ID, Webflow-ID zurück nach Airtable)
// - Fix D: Abwärtskompatibel zu deinem bisherigen Worker-Schema (root-POST {jobDetails}) und /create {fields}
// - Fix E: Bessere Fehlertexte + Cleanup (löscht Airtable, wenn Webflow scheitert)

(function() {
    'use strict';

    // --- Konfiguration ---
    const WEBFLOW_CMS_POST_WORKER_URL = 'https://late-meadow-00bc.oliver-258.workers.dev'; // POST create, PATCH /:id update
    const AIRTABLE_WORKER_BASE_URL = 'https://airtable-job-post.oliver-258.workers.dev'; // OHNE trailing slash
    const MEMBERSTACK_CREDIT_WORKER_URL = 'https://post-job-credit-update.oliver-258.workers.dev/'; // belassen wie im Original

    const MAIN_FORM_ID = 'wf-form-post-job-form';
    const DATA_FIELD_ATTRIBUTE = 'data-preview-field';
    const SUPPORT_EMAIL = 'support@yourcompany.com';

    // Uploadcare IDs wie im Original
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

    // --- Hilfsfunktionen ---
    const find = (selector, element = document) => element.querySelector(selector);
    const findAll = (selector, element = document) => element.querySelectorAll(selector);

    // URLs sicher zusammensetzen
    const withBase = (base) => (path = '') => String(base).replace(/\/+$/, '') + (path ? '/' + String(path).replace(/^\/+/, '') : '');
    const airtable = withBase(AIRTABLE_WORKER_BASE_URL);
    const ENDPOINT = {
        airtable: {
            root: airtable(''),
            create: airtable('create'),
            update: airtable('update'),
            del: airtable('delete'),
            searchMember: airtable('search-member'),
        },
        webflow: WEBFLOW_CMS_POST_WORKER_URL
    };

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
        const lowerErrorMessage = (errorMessage || '').toLowerCase();

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

    // --- Uploadcare: stabil & abwärtskompatibel ---
    function getUploadcareUUID() {
        try {
            if (window.UPLOADCARE_BLOCKS && typeof window.UPLOADCARE_BLOCKS.get === 'function') {
                const ctx = window.UPLOADCARE_BLOCKS.get(UPLOADCARE_CTX_NAME);
                if (ctx && typeof ctx.getOutputCollectionState === 'function') {
                    const st = ctx.getOutputCollectionState();
                    const first = (st?.successEntries?.[0]) || (st?.allEntries || []).find(e => e && (e.isSuccess || e.fileInfo));
                    const uuid = first?.uuid || first?.fileInfo?.uuid;
                    if (uuid) return uuid;
                }
            }
        } catch(e) { console.warn('Uploadcare Blocks read failed:', e); }
        try {
            const provider = document.getElementById(UPLOADCARE_PROVIDER_ID);
            if (provider && typeof provider.getAPI === 'function') {
                const api = provider.getAPI();
                if (api) {
                    if (typeof api.value === 'function') {
                        const v = api.value();
                        if (v && v.cdnUrl) {
                            const m = String(v.cdnUrl).match(/ucarecdn\.com\/(.*?)\//);
                            if (m && m[1]) return m[1];
                        }
                    }
                    if (typeof api.getOutputCollectionState === 'function') {
                        const st = api.getOutputCollectionState();
                        const first = (st?.successEntries?.[0]) || (st?.allEntries || []).find(e => e && (e.isSuccess || e.fileInfo));
                        const uuid = first?.uuid || first?.fileInfo?.uuid;
                        if (uuid) return uuid;
                    }
                }
            }
        } catch(e) { console.warn('Uploadcare Provider read failed:', e); }
        const hidden = document.querySelector('input[name="jobImageUpload"], input[name="job-image"], input[data-uploadcare-hidden]');
        if (hidden && hidden.value) {
            const val = String(hidden.value).trim();
            const m1 = val.match(/[0-9a-fA-F-]{36}/);
            if (m1) return m1[0];
            const m2 = val.match(/ucarecdn\.com\/(.*?)\//);
            if (m2 && m2[1]) return m2[1];
        }
        return null;
    }
    function buildUploadcarePreview(uuid) {
        return uuid ? `https://ucarecdn.com/${uuid}/-/preview/320x320/-/format/auto/-/quality/smart/` : '';
    }

    // --- Formular-Daten sammeln (Original + Uploadcare robust) ---
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

        // Uploadcare robust, aber ohne Zwang
        try {
            const uuid = getUploadcareUUID();
            if (uuid) {
                formData['jobImageUpload'] = buildUploadcarePreview(uuid);
            } else {
                console.warn('Uploadcare API: Konnte keine UUID aus dem API-Status extrahieren.');
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

    // --- Fetch Helper ---
    async function safeFetchJSON(url, options = {}) {
        try {
            const res = await fetch(url, {
                method: options.method || 'POST',
                headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
                body: options.body ? JSON.stringify(options.body) : undefined,
                mode: 'cors',
                credentials: 'omit'
            });
            const ct = res.headers.get('content-type') || '';
            const isJSON = ct.includes('application/json');
            const payload = isJSON ? await res.json().catch(() => ({})) : await res.text().catch(() => '');
            if (!res.ok) {
                const details = typeof payload === 'string' ? payload : (payload.error || JSON.stringify(payload));
                const err = new Error(`HTTP ${res.status} @ ${url}: ${details || 'Unknown error'}`);
                err.status = res.status; err.payload = payload; err.url = url; throw err;
            }
            return payload;
        } catch (e) {
            throw new Error(`Request fehlgeschlagen: ${e?.message || e}`);
        }
    }

    // --- Airtable Löschfunktion (Original + fixes) ---
    async function deleteAirtableRecord(airtableRecordId, reason = 'Unknown error') {
        if (!airtableRecordId) {
            console.warn('Keine Airtable Record ID zum Löschen vorhanden.');
            return;
        }
        console.log(`Versuche Airtable Record ${airtableRecordId} zu löschen wegen: ${reason}`);
        try {
            const response = await safeFetchJSON(ENDPOINT.airtable.del, { body: { recordId: airtableRecordId, reason } });
            console.log(`Airtable Record ${airtableRecordId} erfolgreich gelöscht.`);
        } catch (error) {
            console.error(`Fehler beim Löschen von Airtable Record ${airtableRecordId}:`, error.message);
        }
    }

    // --- Hauptlogik für Formularübermittlung (Originalfluss + deterministische ID-Kette) ---
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
        showCustomPopup('Dein Benutzerkonto wird überprüft...', 'loading', 'Benutzerprüfung');

        let airtableMemberRecordId = null;
        try {
            // Primär so wie im Original (webflowMemberId), aber erweitert um fallback keys
            const memberSearchBody = { webflowMemberId: webflowMemberIdOfTheSubmitter, memberstackId: rawFormData['memberstackId'] || null, email: rawFormData['memberEmail'] || null };
            const memberSearchData = await safeFetchJSON(ENDPOINT.airtable.searchMember, { body: memberSearchBody });
            if (!memberSearchData || !memberSearchData.memberRecordId) {
                throw new Error(memberSearchData?.error || 'Mitglied nicht gefunden.');
            }
            airtableMemberRecordId = memberSearchData.memberRecordId;
            console.log('Mitglied gefunden. Airtable Record ID des Mitglieds:', airtableMemberRecordId);
        } catch (error) {
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
            // ===== 1) Airtable CREATE =====
            showCustomPopup('Deine Job-Details werden gespeichert...', 'loading', 'Speichervorgang');

            // a) Payload im Original-Stil (jobDetails)
            for (const keyInRawForm in rawFormData) {
                if (rawFormData.hasOwnProperty(keyInRawForm)) {
                    const airtableKey = AIRTABLE_FIELD_MAPPINGS[keyInRawForm] || keyInRawForm;
                    airtableJobDetails[airtableKey] = rawFormData[keyInRawForm];
                }
            }
            // Relation zum Member
            airtableJobDetails['job-posted-by'] = [airtableMemberRecordId];
            // admin-test default wie im Original (false, außer explizit true)
            const adminTestAirtableKey = AIRTABLE_FIELD_MAPPINGS['admin-test'] || 'admin-test';
            airtableJobDetails[adminTestAirtableKey] = rawFormData['admin-test'] === true;

            // b) Versuche zuerst den modernen /create-Endpunkt (fields)
            const createFieldsPayload = { fields: {} };
            createFieldsPayload.fields[AIRTABLE_FIELD_MAPPINGS['projectName']] = rawFormData['projectName'] || rawFormData['job-title'];
            if (rawFormData['jobOnline']) createFieldsPayload.fields[AIRTABLE_FIELD_MAPPINGS['jobOnline']] = rawFormData['jobOnline'];
            if (typeof rawFormData['budget'] !== 'undefined') createFieldsPayload.fields[AIRTABLE_FIELD_MAPPINGS['budget']] = rawFormData['budget'];
            if (rawFormData['jobImageUpload']) createFieldsPayload.fields[AIRTABLE_FIELD_MAPPINGS['jobImageUpload']] = rawFormData['jobImageUpload'];
            if (rawFormData['memberstackId']) createFieldsPayload.fields[AIRTABLE_FIELD_MAPPINGS['memberstackId']] = rawFormData['memberstackId'];
            if (rawFormData['memberEmail']) createFieldsPayload.fields[AIRTABLE_FIELD_MAPPINGS['memberEmail']] = rawFormData['memberEmail'];
            createFieldsPayload.fields[AIRTABLE_FIELD_MAPPINGS['webflowId']] = [airtableMemberRecordId];

            let created;
            try {
                created = await safeFetchJSON(ENDPOINT.airtable.create, { body: createFieldsPayload });
                airtableRecordId = created?.recordId || created?.records?.[0]?.id || null;
            } catch (e) {
                // Fallback: Original root-POST mit {jobDetails}
                const fallback = await safeFetchJSON(ENDPOINT.airtable.root, { body: { jobDetails: airtableJobDetails } });
                airtableRecordId = fallback?.recordId || fallback?.records?.[0]?.id || null;
            }
            if (!airtableRecordId) throw new Error('Airtable Record ID nicht erhalten nach Erstellung.');
            console.log('Airtable Job Record erstellt mit ID:', airtableRecordId);

            // ===== 2) Webflow CREATE (job-id = Airtable-ID) =====
            showCustomPopup('Job-Details gespeichert. Dein Job wird jetzt veröffentlicht...', 'loading', 'Veröffentlichung');

            webflowFieldData['name'] = rawFormData['job-title'] || rawFormData['projectName'] || 'Unbenannter Job';
            webflowFieldData['slug'] = airtableRecordId; // kollisionsfrei

            const jobPostedBySlug = WEBFLOW_FIELD_SLUG_MAPPINGS['webflowId'];
            if (jobPostedBySlug && webflowMemberIdOfTheSubmitter) {
                webflowFieldData[jobPostedBySlug] = webflowMemberIdOfTheSubmitter;
            }
            // Alle weiteren Mappings (wie im Original)
            for (const formDataKey in WEBFLOW_FIELD_SLUG_MAPPINGS) {
                const webflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS[formDataKey];
                if (!webflowSlug || ['name', 'slug', 'webflowId', 'airtableJobIdForWebflow'].includes(formDataKey)) continue;

                let formValue = rawFormData[formDataKey];
                if (formDataKey === 'webflowIdForTextField' && webflowSlug === 'webflow-member-id') {
                    if (rawFormData['webflowId']) webflowFieldData[webflowSlug] = rawFormData['webflowId'];
                    continue;
                }
                if (formDataKey === 'jobImageUpload' && webflowSlug === 'job-image') {
                    if (rawFormData[formDataKey]) webflowFieldData[webflowSlug] = rawFormData[formDataKey];
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
            // admin-test default
            const adminTestWebflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS['admin-test'];
            if (adminTestWebflowSlug) webflowFieldData[adminTestWebflowSlug] = rawFormData['admin-test'] === true;

            // WICHTIG: job-id = Airtable-ID direkt beim Create setzen
            const jobSlugInWebflow = WEBFLOW_FIELD_SLUG_MAPPINGS['airtableJobIdForWebflow'];
            if (jobSlugInWebflow) webflowFieldData[jobSlugInWebflow] = airtableRecordId;

            console.log('Sende an Webflow Worker (Create):', JSON.stringify({ fields: webflowFieldData }));
            const webflowCreateResponse = await safeFetchJSON(WEBFLOW_CMS_POST_WORKER_URL + '/', { body: { fields: webflowFieldData } });
            webflowItemId = webflowCreateResponse?.id || webflowCreateResponse?.item?.id;
            if (!webflowItemId) throw new Error('Webflow Item ID nicht erhalten nach Erstellung.');
            console.log('Webflow Item erstellt mit ID:', webflowItemId);

            // ===== 3) Airtable UPDATE: Webflow-ID zurückschreiben =====
            showCustomPopup('Die Veröffentlichung wird abgeschlossen...', 'loading', 'Finalisierung');
            const airtableUpdatePayload = {
                recordId: airtableRecordId,
                fieldsToUpdate: { [AIRTABLE_FIELD_MAPPINGS['webflowItemIdFieldAirtable']]: webflowItemId }
            };
            // Unterstütze sowohl /update {recordId, fieldsToUpdate} als auch /update {recordId, fields}
            try {
                await safeFetchJSON(ENDPOINT.airtable.update, { body: airtableUpdatePayload });
            } catch(e) {
                await safeFetchJSON(ENDPOINT.airtable.update, { body: { recordId: airtableRecordId, fields: { [AIRTABLE_FIELD_MAPPINGS['webflowItemIdFieldAirtable']]: webflowItemId } } });
            }
            console.log('Airtable Record aktualisiert mit Webflow Item ID.');

            // ===== 4) Credits abziehen (Original-Verhalten) =====
            const memberstackId = rawFormData['memberstackId'];
            if (memberstackId) {
                try {
                    const creditResponse = await safeFetchJSON(MEMBERSTACK_CREDIT_WORKER_URL, { body: { memberId: memberstackId } });
                    console.log('Credit-Worker Antwort:', creditResponse);
                } catch (creditError) {
                    console.error('Fehler beim Abziehen des Credits:', creditError.message);
                }
            } else {
                console.warn('Keine Memberstack ID gefunden, es konnte kein Credit abgezogen werden.');
            }

            // Erfolg
            showCustomPopup('Dein Job wurde erfolgreich veröffentlicht!', 'success', 'Fertig!');
            if (submitButton) {
                const finalSuccessText = 'Erfolgreich gesendet!';
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = finalSuccessText;
                else submitButton.value = finalSuccessText;
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

            // Cleanup: wenn Airtable angelegt, aber Webflow scheitert → wieder löschen
            try {
                if (airtableRecordId && !webflowItemId) await deleteAirtableRecord(airtableRecordId, `Fehler im Webflow-Prozess: ${error.message}`);
            } catch(_){}

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                else submitButton.value = initialSubmitButtonText;
            }
        }
    }

    // --- Test-Trigger (Original) ---
    function testSubmissionWithData(testData) {
        console.log('Starte Test-Übermittlung mit Daten:', testData);
        const mainForm = find(`#${MAIN_FORM_ID}`);
        if (!mainForm) {
            showCustomPopup(`Test-Übermittlung: Hauptformular "${MAIN_FORM_ID}" nicht gefunden.`, 'error', 'Test Fehler');
            return;
        }
        handleFormSubmit({ preventDefault: () => {}, target: mainForm }, testData);
    }
    window.testSubmissionWithData = testSubmissionWithData;

    // --- Init (Original-Wrapper) ---
    document.addEventListener('DOMContentLoaded', () => {
        const mainForm = find(`#${MAIN_FORM_ID}`);
        if (mainForm) {
            const submitButton = mainForm.querySelector('button[type="submit"], input[type="submit"]');
            if (submitButton) {
                mainForm.setAttribute('data-initial-text', submitButton.tagName === 'BUTTON' ? submitButton.textContent : submitButton.value);
            }
            mainForm.removeEventListener('submit', handleFormSubmitWrapper);
            mainForm.addEventListener('submit', handleFormSubmitWrapper);
            console.log(`Form Submission Handler v20.4 (Reconciled) initialisiert für: #${MAIN_FORM_ID}`);
        } else {
            console.warn(`Hauptformular "${MAIN_FORM_ID}" nicht gefunden. Handler nicht aktiv.`);
        }
    });

    function handleFormSubmitWrapper(event) {
        handleFormSubmit(event, null);
    }

})();
