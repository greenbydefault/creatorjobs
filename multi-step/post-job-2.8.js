// form-submission-handler.js
// Dieses Skript ist verantwortlich für das Sammeln der Formulardaten
// und die Orchestrierung der Speicherung in Airtable und Webflow.
// AKTUELLE VERSION: Speichert zuerst in Airtable, verwendet Airtable ID als Slug für Webflow,
// aktualisiert Airtable mit Webflow ID, und löscht Airtable-Eintrag bei Webflow-Fehler.

(function() {
    'use strict';

    // --- Konfiguration ---
    // URL des Webflow CMS Workers
    const WEBFLOW_CMS_POST_WORKER_URL = 'https://late-meadow-00bc.oliver-258.workers.dev/';
    // URL des Airtable Workers
    const AIRTABLE_WORKER_URL = 'https://airtable-job-post.oliver-258.workers.dev/'; // Airtable Worker URL

    // Die ID deines Haupt-Formular-Elements (das alle Schritte umschließt)
    // Dieses Attribut muss an deinem <form>-Tag im Webflow Designer gesetzt sein.
    const MAIN_FORM_ID = 'wf-form-post-job-form'; // Bitte anpassen, falls deine Form-ID anders lautet!

    // Data-Attribut, das wir verwenden, um die Werte aus den Formularfeldern zu lesen
    // (identisch zum Attribut im multistep_form_js für die Vorschau)
    const DATA_FIELD_ATTRIBUTE = 'data-preview-field';
    const CLASS_HIDE = 'hide'; // CSS-Klasse zum Ausblenden

     // Support E-Mail Adresse
    const SUPPORT_EMAIL = 'support@yourcompany.com'; // ERSETZE DIES DURCH DEINE EIGENE SUPPORT E-MAIL!

    // Data-Attribute für die Popup-Elemente
    const POPUP_WRAPPER_ATTR = '[data-error-target="popup-wrapper"]';
    const POPUP_TITLE_ATTR = '[data-error-target="popup-title"]';
    const POPUP_MESSAGE_ATTR = '[data-error-target="popup-message"]';
    const CLOSE_POPUP_ATTR = '[data-error-target="close-popup"]';
    const MAIL_ERROR_ATTR = '[data-error-target="mail-error"]';


    // --- Mapping für Referenzfelder (Textwert zu Webflow Item ID) ---
    // DIESES MAPPING MUSS GENAU MIT DEINEN WEBFLOW COLLECTION ITEMS ÜBEREINSTIMMEN!
    // BITTE ERSETZE DIE PLATZHALTER-IDs ('deine_id_hier_...') DURCH DIE TATSÄCHTLICHEN IDs AUS WEBFLOW!
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
        'genderOptional': { // Mapping für creator-geschlecht
            'Männlich': '6c84301c22d5e827d05308a33d6ef510',
            'Weiblich': 'bcb50387552afc123405ae7fa7640d0d',
            'Diverse': '870da58473ebc5d7db4c78e7363ca417',
            'Couple': '8bab076ffc2e114b52620f965aa046fb',
            'Alle': 'ec933c35230bc628da6029deee4159e',
            'Keine Angabe': 'd157525b18b53e62638884fd58368cfa8'
        },
         'videoDurationOptional': { // Mapping für video-dauer
            '0 - 15 Sekunden': 'a58ac00b365993a9dbc6e7084c6fda10',
            '15 - 30 Sekunden': '49914418e6b0fc02e4eb742f46658400',
            '30 - 45 Sekunden': '6ef12194838992fb1584150b97d246f3',
            '45 - 60 Sekunden': '37b2d32959e6be1bfaa5a60427229be3',
            '60 - 90 Sekunden': '070c836b61cdb5d3bf49900ea9d11d1f'
        },
        'scriptOptional': { // Mapping für script
            'Brand': '3b95cafa5a06a54e025d38ba71b7b475',
            'Creator': 'f907b4b8d30d0b55cc831eb054094dad'
        },
        'hookCount': { // Mapping für anzahl-der-hooks
             '1': 'b776e9ef4e9ab8b165019c1a2a04e8a',
             '2': '1667c831d9cba5adc9416401031796f3',
             '3': '355ef3ceb930ddbdd28458265b0a4cf0', // Korrigierte ID
             '4': 'be2c319b5dccd012016df2e33408c39'
        },
         'videoFormat': { // Mapping für format - BITTE PLATZHALTER ERSETZEN!
            '16:9': 'deine_id_hier_16_9',
            '4:5': 'deine_id_hier_4_5',
            '9:16': 'deine_id_hier_9_16'
        },
         'industryCategory': { // Mapping für industrie-kategorie - BITTE PLATZHALTER ERSETZEN!
            'Beauty': 'deine_id_hier_beauty',
            // Füge hier weitere Industrie-Kategorien hinzu
        },
         'subtitlesOptional': { // NEU: Mapping für untertitel
            'Ja': '587b210d6015c519f05e0aeea6abf1fa', // ID basierend auf neuem Mapping
            'Nein': 'ac9e02ffc119b7bd0e05403e096f89b3' // ID basierend auf neuem Mapping
        },
        'durationOptional': { // Mapping für dauer-nutzungsrechte
            '24 Monate': 'dd24b0de3f7a906d9619c8f56d9c2484',
            'unbegrenzt': 'dcbb14e9f4c1ee9aaeeddd62b4d8b625',
            '18 Monate': 'c97680a1c8a5214809b7885b00e7c1d8',
            '12 Monate': 'e544d894fe78aaeaf83d8d5a35be5f3f',
            '6 Monate': 'b8353db272656593b627e67fb4730bd6',
            '3 Monate': '9dab07affd09299a345cf4f2322ece34'
        }
        // Füge hier weitere Mappings für Referenzfelder hinzu, falls nötig
    };


    // --- Hilfsfunktionen ---
    // Findet das erste Element, das dem Selektor entspricht
    const find = (selector, element = document) => element.querySelector(selector);
    // Findet alle Elemente, die dem Selektor entsprechen
    const findAll = (selector, element = document) => element.querySelectorAll(selector);

    /**
     * Zeigt eine Statusmeldung im benutzerdefinierten Popup an.
     * @param {string} message - Die anzuzeigende Nachricht.
     * @param {string} type - 'success', 'error', oder 'loading'.
     * @param {string} title - Der Titel des Popups.
     * @param {string} [supportDetails=''] - Detaillierte Informationen für den Support (nur bei type 'error').
     */
    function showCustomPopup(message, type, title, supportDetails = '') {
        const popup = find(POPUP_WRAPPER_ATTR);
        const popupTitle = find(POPUP_TITLE_ATTR);
        const popupMessage = find(POPUP_MESSAGE_ATTR);
        const mailIconLink = find(MAIL_ERROR_ATTR); // Das Link-Element für das Mail-Icon

        if (!popup || !popupTitle || !popupMessage || !mailIconLink) {
            console.error("Popup-Elemente nicht gefunden! Bitte stelle sicher, dass die Data-Attribute korrekt gesetzt sind.");
            // Fallback zur Konsolenausgabe, falls Popup-Elemente fehlen
            console.log(`Status: ${type.toUpperCase()} - Titel: ${title} - Nachricht: ${message}`);
            if (supportDetails) console.log('Support Details:', supportDetails);
            return;
        }

        // Setze Data-Attribut für den Typ, falls du CSS so gestaltest:
        popup.setAttribute('data-popup-type', type);

        popupTitle.textContent = title;
        popupMessage.textContent = message;

        // Zeige/verstecke Mail-Icon basierend auf Typ
        if (type === 'error') {
            mailIconLink.style.display = 'inline-block'; // Oder wie du es anzeigen möchtest
            // Setze den Mailto-Link mit Details
            const subject = encodeURIComponent(`Fehlerbericht Formularübermittlung (${title})`);
            const body = encodeURIComponent(`Es ist ein Fehler im Formular aufgetreten:\n\nNachricht für den Benutzer:\n${message}\n\nSupport Details:\n${supportDetails}\n\nZeitstempel: ${new Date().toISOString()}\nBrowser: ${navigator.userAgent}\nSeite: ${window.location.href}`);
            mailIconLink.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
            mailIconLink.target = '_blank'; // Öffne in neuem Tab
        } else {
            mailIconLink.style.display = 'none'; // Oder wie du es verstecken möchtest
            mailIconLink.href = '#'; // Setze href zurück
        }

        // Zeige das Popup an (du musst das Display-Styling in deinem CSS kontrollieren)
        popup.style.display = 'flex'; // Oder 'block', je nach deinem Layout


        // Optional: Popup nach einiger Zeit automatisch schließen (außer bei Fehler, damit Support kontaktiert werden kann)
        if (type !== 'error') {
            setTimeout(() => {
                closeCustomPopup(); // Rufe die Schließen-Funktion auf
            }, 5000); // 5 Sekunden
        }
    }

     /**
     * Schließt das benutzerdefinierte Popup.
     */
    function closeCustomPopup() {
         const popup = find(POPUP_WRAPPER_ATTR);
         if (popup) {
             popup.style.display = 'none'; // Oder wie du es verstecken möchtest
         }
    }


    // --- Event Listener für das Schließen des Popups ---
    document.addEventListener('DOMContentLoaded', () => {
        const closeBtn = find(CLOSE_POPUP_ATTR);
        if (closeBtn) {
            closeBtn.addEventListener('click', closeCustomPopup);
        }
         // Der Event Listener für das Mail Icon wird nicht hier hinzugefügt,
         // da der href direkt in showCustomPopup gesetzt wird.

    });


    /**
     * Formatiert ein Datum in einen ISO-String (YYYY-MM-DDTHH:mm:ss.sssZ).
     * Versucht, deutsche (DD.MM.YYYY) und englische (YYYY-MM-DD) Formate zu parsen.
     * @param {string} dateString - Das Datum als String.
     * @returns {string|null} - Das Datum als ISO-String oder null bei ungültiger Eingabe.
     */
    function formatToISODate(dateString) {
        if (!dateString) return null;
        let dateObj;
        // Versuche, deutsches Format (DD.MM.YYYY) zu parsen
        const deParts = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (deParts) {
            // Achtung: Monate in Date sind 0-basiert (0=Januar, 11=Dezember)
            dateObj = new Date(parseInt(deParts[3]), parseInt(deParts[2]) - 1, parseInt(deParts[1]));
        } else {
            // Versuche, englisches Format (YYYY-MM-DD) oder andere Standardformate zu parsen
            dateObj = new Date(dateString);
        }
        // Überprüfe, ob das Datum gültig ist
        if (isNaN(dateObj.getTime())) {
            console.warn('Ungültiges Datumsformat für ISO-Konvertierung:', dateString);
            return null;
        }
        // Gib das Datum im ISO 8601 Format zurück
        return dateObj.toISOString();
    }

     /**
     * Generiert einen slug aus einem String.
     * Diese Funktion wird hier nicht mehr für den Haupt-Slug verwendet,
     * aber behalten, falls sie für andere Zwecke benötigt wird.
     * @param {string} text - Der Eingabetext (z.B. Job-Titel).
     * @returns {string} - Der generierte Slug.
     */
    function slugify(text) {
        if (!text) return '';
        return text
            .toString()                 // Konvertiere zu String
            .toLowerCase()              // Alles klein schreiben
            .trim()                     // Leerzeichen am Anfang/Ende entfernen
            .replace(/\s+/g, '-')       // Leerzeichen durch Bindestriche ersetzen
            .replace(/[^\w-]+/g, '')    // Alle Nicht-Wort-Zeichen (außer Bindestriche) entfernen
            .replace(/-+/g, '-');       // Mehrere Bindestriche durch einen ersetzen
    }


    /**
     * Sammelt und formatiert die Formulardaten für die Worker.
     * Sammelt alle relevanten Felder.
     * @param {HTMLFormElement} formElement - Das Formular-Element.
     * @returns {Object} - Die aufbereiteten Daten für die Worker.
     */
    function collectAndFormatFormData(formElement) {
        const formData = {}; // Dieses Objekt wird die gesammelten Daten enthalten
        const fields = findAll(`[${DATA_FIELD_ATTRIBUTE}]`, formElement);
        let projectNameValue = ''; // Speichere den Projektnamen

        // Temporäre Arrays für Checkbox-Gruppen
        const creatorLangValues = [];
        const creatorLandValues = [];
        const nutzungOptionalValues = [];
        const channelsValues = [];


        fields.forEach(field => {
            const fieldNameKey = field.getAttribute(DATA_FIELD_ATTRIBUTE); // Das ist der Schlüssel aus deinem Formular
            let value;

             // --- Datensammlung basierend auf data-preview-field ---
            switch (fieldNameKey) {
                case 'projectName':
                    projectNameValue = field.value.trim();
                    formData[fieldNameKey] = projectNameValue; // Sammle auch den Projektnamen im Hauptobjekt
                    break;
                case 'jobSlug': // Dieses Feld wird nicht mehr für den Haupt-Slug verwendet
                    // Ignoriere dieses Feld oder sammle es optional für andere Zwecke
                    break;
                case 'job-adress-optional':
                case 'budget':
                case 'startDate':
                case 'endDate':
                case 'contentDeadline':
                case 'scriptDeadline':
                case 'creatorCount':
                case 'creatorCategorie':
                case 'aufgabe':
                case 'steckbrief':
                case 'genderOptional':
                case 'videoCountOptional':
                case 'imgCountOptional':
                case 'videoDurationOptional':
                case 'reviewsOptional':
                case 'durationOptional':
                case 'scriptOptional':
                case 'previewText':
                case 'brandName':
                case 'contactMail':
                case 'barterDealToggle':
                case 'plusJobToggle':
                case 'jobImageUpload':
                case 'industryCategory':
                case 'creatorAge':
                case 'videoFormat':
                case 'hookCount':
                case 'subtitelOptional': // NEU: subtitelOptional
                case 'userName':
                case 'webflowId':
                case 'memberEmail':
                case 'memberstackId':
                    // Standard Datensammlung für die meisten Felder
                    if (field.type === 'checkbox') {
                         value = field.checked;
                         formData[fieldNameKey] = value; // Boolean Checkboxen immer senden
                    } else if (field.tagName === 'SELECT') {
                         value = field.options[field.selectedIndex]?.value || field.value;
                         if (value !== '') formData[fieldNameKey] = value; // Select Werte nur senden, wenn nicht leer
                    } else if (field.type === 'number') {
                         const numVal = field.value.trim();
                         if (numVal !== '') formData[fieldNameKey] = parseFloat(numVal); // Zahlen nur senden, wenn nicht leer
                    } else { // Textfelder, Datum, etc.
                        value = field.value.trim();
                         if (value !== '') formData[fieldNameKey] = value; // Textfelder nur senden, wenn nicht leer
                    }
                    break;

                // Checkbox-Gruppen (separat sammeln)
                case 'creatorLand':
                    if (field.checked) creatorLandValues.push(field.value.trim());
                    break;
                case 'creatorLang':
                    if (field.checked) creatorLangValues.push(field.value.trim());
                    break;
                case 'nutzungOptional': // NEU: Checkbox-Gruppe für job-posting
                    if (field.checked) nutzungOptionalValues.push(field.value.trim());
                    break;
                case 'channels': // NEU: Checkbox-Gruppe für fur-welchen-kanale-wird-der-content-produziert
                    if (field.checked) channelsValues.push(field.value.trim());
                    break;


                default:
                    // console.log(`Unbekanntes Feld für Datensammlung: ${fieldNameKey}`);
                    return; // Weiter zum nächsten Feld
            }
        });

        // Füge gesammelte Checkbox-Gruppen als Arrays hinzu (oder Strings, je nach Bedarf des Workers/Airtable)
        // Für Airtable ist oft ein Array von Strings oder IDs erforderlich.
        if (creatorLangValues.length > 0) {
            formData['creatorLang'] = creatorLangValues; // Sende als Array
        }
         if (creatorLandValues.length > 0) {
            formData['creatorLand'] = creatorLandValues; // Sende als Array
        }
         if (nutzungOptionalValues.length > 0) {
             formData['nutzungOptional'] = nutzungOptionalValues; // Sende als Array
         }
         if (channelsValues.length > 0) {
              formData['channels'] = channelsValues; // Sende als Array
         }


        // Spezialbehandlung für jobOnline (job-date-end) - Setze Auto-Datum, wenn leer
         const jobOnlineField = find(`[${DATA_FIELD_ATTRIBUTE}="jobOnline"]`);
         if (jobOnlineField) {
             const jobOnlineValue = jobOnlineField.value.trim();
             let isoDate;
             if (jobOnlineValue === '') {
                 // Wenn leer, berechne heute + 3 Tage
                 const today = new Date();
                 today.setDate(today.getDate() + 3);
                 today.setHours(0, 0, 0, 0); // Setze Zeit auf Mitternacht UTC
                 isoDate = today.toISOString();
                 console.log(`jobOnline Feld war leer, setze job-date-end auf heute + 3 Tage: ${isoDate}`);
             } else {
                 // Wenn nicht leer, formatiere den eingegebenen Wert
                 isoDate = formatToISODate(jobOnlineValue);
                 if (!isoDate) {
                      console.warn(`Ungültiges Datum im jobOnline Feld: "${jobOnlineValue}". job-date-end wird nicht gesendet.`);
                 }
             }
             // Füge das Datum nur hinzu, wenn es gültig ist (egal ob berechnet oder vom User eingegeben)
             if (isoDate) {
                 formData['jobOnline'] = isoDate; // Speichere im Hauptobjekt
             }
         }

        // Spezialbehandlung für Budget (job-payment) - Sende 0, wenn leer
        const budgetField = find(`[${DATA_FIELD_ATTRIBUTE}="budget"]`);
         if (budgetField) {
             const budgetValue = budgetField.value.trim();
             formData['budget'] = budgetValue === '' ? 0 : parseFloat(budgetValue); // Sende 0 oder Zahl
         }


        // Füge job-title hinzu (gleicher Wert wie projectName)
        if (projectNameValue) {
             formData['job-title'] = projectNameValue;
        }

        // Memberstack Felder separat sammeln, da sie data-ms-member haben, aber auch data-preview-field haben sollten
         const memberstackFields = findAll('[data-ms-member][data-preview-field]');
         memberstackFields.forEach(field => {
             const fieldNameKey = field.getAttribute(DATA_FIELD_ATTRIBUTE);
             const value = field.value.trim();
             if (value !== '') { // Sende Memberstack Felder nur, wenn nicht leer
                 formData[fieldNameKey] = value;
             }
         });


        console.log('Gesammelte Formulardaten für Worker:', formData);
        return formData;
    }


    /**
     * Sendet eine Anfrage an den Airtable Worker, um einen Record zu löschen.
     * @param {string} airtableRecordId - Die ID des zu löschenden Airtable Records.
     * @param {string} [reason='Unknown error'] - Grund für die Löschung.
     */
    async function deleteAirtableRecord(airtableRecordId, reason = 'Unknown error') {
         if (!airtableRecordId) {
             console.warn('Keine Airtable Record ID zum Löschen vorhanden.');
             return;
         }
         console.log(`Versuche Airtable Record ${airtableRecordId} zu löschen wegen: ${reason}`);

         try {
             const response = await fetch(AIRTABLE_WORKER_URL + '/delete', { // Annahme: Airtable Worker hat einen /delete Endpunkt
                 method: 'POST', // Oder DELETE, je nachdem wie dein Worker konfiguriert ist
                 headers: {
                     'Content-Type': 'application/json',
                 },
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


    /**
     * Hauptfunktion zum Absenden des Formulars.
     * Orchestriert die Speicherung in Airtable und Webflow.
     * @param {Event} event - Das Submit-Event (oder simuliertes Event).
     * @param {Object} [testData] - Optionale Testdaten, wenn die Funktion direkt aufgerufen wird.
     */
    async function handleFormSubmit(event, testData = null) {
        event.preventDefault(); // Verhindert das Standard-Formular-Absenden
        const form = find(`#${MAIN_FORM_ID}`); // Finde das Formular
        const submitButton = form ? form.querySelector('button[type="submit"]') : null; // Finde den Submit-Button

        if (submitButton) {
            submitButton.disabled = true; // Deaktiviere den Button
            submitButton.textContent = 'Wird gesendet...'; // Ändere den Text des Buttons
        }
        // Zeige eine Lade-Nachricht im Popup an
        showCustomPopup('Daten werden gesammelt...', 'loading', 'Vorbereitung');


        // Verwende Testdaten, falls provided, sonst sammle aus dem Formular
        const formData = testData ? testData : collectAndFormatFormData(form);

        // Prüfe, ob der Job-Titel vorhanden ist (Slug wird erst später gesetzt)
         if (!formData['projectName']) {
             const errorMessage = 'Fehler: Job-Titel fehlt.';
             console.error(errorMessage);
             showCustomPopup(errorMessage, 'error', 'Fehler: Fehlende Daten', `Frontend Fehler: projectName fehlt. Gesammelte Daten: ${JSON.stringify(formData)}`);
             if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Absenden fehlgeschlagen';
            }
            return; // Beende die Funktion, wenn der Name fehlt
        }


        let airtableRecordId = null; // Variable, um die Airtable Record ID zu speichern
        let webflowItemId = null; // Variable, um die Webflow Item ID zu speichern


        try {
            // --- Schritt 1: Daten an Airtable Worker senden (Erstellen) ---
            showCustomPopup('Daten werden in Airtable gespeichert...', 'loading', 'Airtable Speicherung');
            console.log('Sende an Airtable Worker (Create):', AIRTABLE_WORKER_URL, JSON.stringify({ jobDetails: formData })); // Sende die gesammelten Daten
             const airtableCreateResponse = await fetch(AIRTABLE_WORKER_URL, {
                 method: 'POST', // Annahme: POST erstellt Records
                 headers: {
                     'Content-Type': 'application/json',
                 },
                 body: JSON.stringify({
                     jobDetails: formData // Sende die gesammelten Job Details
                 })
             });

             const airtableCreateResponseData = await airtableCreateResponse.json();

            // --- Fehlerbehandlung für Airtable Create Worker ---
             if (!airtableCreateResponse.ok) {
                 console.error('Fehler vom Airtable Worker (Create):', airtableCreateResponse.status, airtableCreateResponseData);
                 let userMessage = `Es ist ein Fehler beim Speichern des Jobs in Airtable aufgetreten (${airtableCreateResponse.status}).`;
                 let supportDetails = `Airtable Create Worker Status: ${airtableCreateResponse.status}.`;
                 if (airtableCreateResponseData) supportDetails += ` Worker Response: ${JSON.stringify(airtableCreateResponseData)}`;
                 console.error('Support Details (Airtable Create):', supportDetails);
                 showCustomPopup(userMessage, 'error', 'Airtable Fehler', supportDetails);
                 return; // Beende die Funktion nach Airtable Create Fehler
             }

            // Airtable Erstellung war erfolgreich
             console.log('Antwort vom Airtable Worker (Create):', airtableCreateResponseData);
             airtableRecordId = airtableCreateResponseData.records && airtableCreateResponseData.records.length > 0 ? airtableCreateResponseData.records[0].id : null;

             if (!airtableRecordId) {
                 console.error('Airtable Record ID nicht in der Antwort des Create Workers gefunden.', airtableCreateResponseData);
                 const userMessage = 'Job in Airtable erstellt, aber Record ID nicht erhalten. Prozess abgebrochen.';
                 const supportDetails = `Airtable Create Worker Erfolg, aber keine Record ID. Response: ${JSON.stringify(airtableCreateResponseData)}`;
                 showCustomPopup(userMessage, 'error', 'Airtable Fehler', supportDetails);
                 // Hier löschen wir den Airtable Record NICHT, da wir die ID nicht haben.
                 return; // Beende die Funktion
             }

             console.log('Airtable Record erfolgreich erstellt mit ID:', airtableRecordId);
             showCustomPopup('Job erfolgreich in Airtable gespeichert. Erstelle Item in Webflow...', 'loading', 'Webflow Erstellung');


            // --- Schritt 2: Daten an Webflow Worker senden (Erstellen) ---
            // Bereite die Daten für Webflow vor (fieldData)
            const fieldDataForWebflow = { ...formData }; // Kopie der ursprünglichen Daten
            fieldDataForWebflow['slug'] = airtableRecordId; // NEU: Setze Airtable ID als Slug
            // Stelle sicher, dass Webflow die Airtable ID speichern kann, z.B. in einem Feld 'airtable-record-id'
            fieldDataForWebflow['airtable-record-id'] = airtableRecordId; // Annahme: Webflow hat ein Feld 'airtable-record-id'
            fieldDataForWebflow['admin-test'] = true; // Stelle sicher, dass admin-test gesetzt ist


            console.log('Sende an Webflow Worker (Create):', WEBFLOW_CMS_POST_WORKER_URL, JSON.stringify({ fields: fieldDataForWebflow }));
            const webflowCreateResponse = await fetch(WEBFLOW_CMS_POST_WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fields: fieldDataForWebflow
                })
            });

            const webflowCreateResponseData = await webflowCreateResponse.json();

            // --- Fehlerbehandlung für Webflow Create Worker ---
            if (!webflowCreateResponse.ok) {
                 console.error('Fehler vom Webflow Worker (Create):', webflowCreateResponse.status, webflowCreateResponseData);
                 let userMessage = `Es ist ein Fehler beim Erstellen des Jobs in Webflow aufgetreten (${webflowCreateResponse.status}).`;
                 let supportDetails = `Webflow Create Worker Status: ${webflowCreateResponse.status}.`;

                 if (webflowCreateResponseData) {
                     supportDetails += ` Worker Response: ${JSON.stringify(webflowCreateResponseData)}`;

                     if (webflowCreateResponse.status === 400) {
                         userMessage = 'Fehler bei der Datenübermittlung an Webflow. Einige Felder sind ungültig oder fehlen.';
                         if (webflowCreateResponseData.problems && Array.isArray(webflowCreateResponseData.problems)) {
                             userMessage += ' Probleme: ' + webflowCreateResponseData.problems.map(p => p.message || p.path).join(', ');
                         } else if (webflowCreateResponseData.details && Array.isArray(webflowCreateResponseData.details)) {
                              userMessage += ' Details: ' + webflowCreateResponseData.details.map(d => `Feld '${(d.path && Array.isArray(d.path) ? d.path.join('.') : 'unbekannt')}' - ${d.message}`).join('; ');
                         } else if (webflowCreateResponseData.message) {
                              userMessage += ' Details: ' + webflowCreateResponseData.message;
                         }
                          userMessage += ' Bitte überprüfe deine Eingaben und versuche es erneut.';

                     } else if (webflowCreateResponse.status === 401) {
                         userMessage = 'Authentifizierungsfehler bei Webflow. Bitte kontaktiere den Support.';
                     } else if (webflowCreateResponse.status === 404) {
                          userMessage = 'Webflow Ziel nicht gefunden. Bitte kontaktiere den Support.';
                     } else if (webflowCreateResponse.status === 429) {
                         userMessage = 'Zu viele Anfragen an Webflow. Bitte versuche es später erneut.';
                     } else if (webflowCreateResponse.status >= 500) {
                         userMessage = 'Ein Problem auf dem Webflow Server ist aufgetreten. Bitte versuche es später erneut.';
                          if (webflowCreateResponseData.details) {
                              supportDetails += ` Details: ${webflowCreateResponseData.details}`;
                          }
                     } else if (webflowCreateResponseData.error) {
                          userMessage += ` Details: ${webflowCreateResponseData.error}`;
                     } else if (webflowCreateResponseData.msg) {
                          userMessage += ` Details: ${webflowCreateResponseData.msg}`;
                     } else if (webflowCreateResponseData.message) {
                          userMessage += ` Details: ${webflowCreateResponseData.message}`;
                     }
                 }

                 console.error('Support Details (Webflow Create):', supportDetails);
                 showCustomPopup(userMessage, 'error', 'Webflow Fehler', supportDetails);

                 // Wenn Webflow-Erstellung fehlschlägt, lösche den Airtable Record
                 deleteAirtableRecord(airtableRecordId, 'Webflow creation failed');

                 return; // Beende die Funktion nach Webflow Create Fehler
            }

            // Webflow Erstellung war erfolgreich
            console.log('Antwort vom Webflow Worker (Create):', webflowCreateResponseData);
            webflowItemId = webflowCreateResponseData.id; // Webflow API gibt das Item-Objekt zurück, 'id' ist die Item-ID

            if (!webflowItemId) {
                 console.error('Webflow Item ID nicht in der Antwort des Create Workers gefunden.', webflowCreateResponseData);
                 const userMessage = 'Job in Webflow erstellt, aber ID nicht erhalten. Airtable-Aktualisierung nicht möglich.';
                 const supportDetails = `Webflow Create Worker Erfolg, aber keine Item ID. Response: ${JSON.stringify(webflowCreateResponseData)}`;
                 showCustomPopup(userMessage, 'success', 'Webflow Erfolg mit Hinweis');
                 // Wir können hier nicht mit dem Airtable Update fortfahren, wenn die Webflow ID fehlt
                 // Optional: deleteAirtableRecord(airtableRecordId, 'Webflow item ID missing after creation'); // Löschen, wenn Webflow Item ID fehlt? Je nach Logik.
                 return; // Beende die Funktion
            }

            console.log('Webflow Item erfolgreich erstellt mit ID:', webflowItemId);
            showCustomPopup('Job erfolgreich in Webflow erstellt. Aktualisiere Airtable mit Webflow ID...', 'loading', 'Airtable Aktualisierung');


            // --- Schritt 3: Airtable Worker aufrufen (Aktualisieren) ---
            // Sende Airtable Record ID und Webflow Item ID an den Airtable Worker
            // Annahme: Airtable Worker hat einen /update Endpunkt, der { recordId: '...', webflowId: '...' } erwartet
            console.log('Sende an Airtable Worker (Update):', AIRTABLE_WORKER_URL + '/update', JSON.stringify({ recordId: airtableRecordId, webflowId: webflowItemId }));
             const airtableUpdateResponse = await fetch(AIRTABLE_WORKER_URL + '/update', {
                 method: 'POST', // Oder PUT/PATCH, je nachdem wie dein Worker konfiguriert ist
                 headers: {
                     'Content-Type': 'application/json',
                 },
                 body: JSON.stringify({
                     recordId: airtableRecordId, // Die Airtable Record ID
                     webflowId: webflowItemId // Die Webflow Item ID
                 })
             });

             const airtableUpdateResponseData = await airtableUpdateResponse.json();

            // --- Fehlerbehandlung für Airtable Update Worker ---
             if (!airtableUpdateResponse.ok) {
                 console.error('Fehler vom Airtable Worker (Update):', airtableUpdateResponse.status, airtableUpdateResponseData);
                 let userMessage = `Es ist ein Fehler beim Aktualisieren des Jobs in Airtable aufgetreten (${airtableUpdateResponse.status}).`;
                 let supportDetails = `Airtable Update Worker Status: ${airtableUpdateResponse.status}.`;

                 if (airtableUpdateResponseData) {
                      supportDetails += ` Worker Response: ${JSON.stringify(airtableUpdateResponseData)}`;
                      if (airtableUpdateResponseData.error && airtableUpdateResponseData.error.message) {
                          userMessage += ' Details: ' + airtableUpdateResponseData.error.message;
                      } else if (airtableUpdateResponseData.message) {
                          userMessage += ' Details: ' + airtableUpdateResponseData.message;
                      }
                 }

                 console.error('Support Details (Airtable Update):', supportDetails);
                 showCustomPopup(userMessage, 'error', 'Airtable Fehler', supportDetails);

                 // Wenn Airtable-Aktualisierung fehlschlägt, lösche den Airtable Record (optional, je nach gewünschter Logik)
                 // Hier löschen wir den Airtable Record, da die Verknüpfung zu Webflow nicht hergestellt werden konnte.
                 deleteAirtableRecord(airtableRecordId, 'Airtable update with Webflow ID failed');

                 return; // Beende die Funktion nach Airtable Update Fehler
             }

            // Airtable Aktualisierung war erfolgreich
             console.log('Antwort vom Airtable Worker (Update):', airtableUpdateResponseData);
             console.log(`Airtable Record ${airtableRecordId} erfolgreich mit Webflow Item ID ${webflowItemId} aktualisiert.`);
             showCustomPopup('Job erfolgreich in Webflow und Airtable gespeichert!', 'success', 'Erfolgreich');


             if (submitButton) {
                 submitButton.textContent = 'Erfolgreich gesendet!'; // Ändere den Button-Text
             }


        } catch (error) {
            // Behandelt Netzwerkfehler oder Fehler, die im Frontend-Skript selbst auftreten (z.B. ReferenceError)
            // Diese Fehler könnten vor oder während der Fetch-Aufrufe auftreten.
            console.error('Unerwarteter Fehler beim Absenden:', error);
            // Zeige eine allgemeine Fehlermeldung für den Benutzer
            const userMessage = `Ein unerwarteter Fehler ist aufgetreten: ${error.message}. Bitte versuche es später erneut oder kontaktiere den Support.`;
            const supportDetails = `Unerwarteter Frontend Fehler: ${error.message}. Stack: ${error.stack}.`;
            showCustomPopup(userMessage, 'error', 'Unerwarteter Fehler', supportDetails);

            // Wenn ein unerwarteter Fehler auftritt, nachdem Airtable erstellt wurde,
            // versuchen wir, den Airtable Record zu löschen.
            if (airtableRecordId) {
                 deleteAirtableRecord(airtableRecordId, 'Unexpected frontend error after Airtable creation');
            }

        } finally {
             // Setze den Button-Zustand zurück, auch bei Erfolg oder Fehler
             if (submitButton && submitButton.textContent.includes('Wird gesendet')) {
                 // Prüfe, ob der Text noch "Wird gesendet..." ist, um nicht erfolgreiche Texte zu überschreiben
                 // Oder setze ihn immer zurück, wenn du möchtest, dass der Benutzer erneut versuchen kann
                 // Beispiel: submitButton.textContent = 'Absenden';
             }
             // Wenn der Button erfolgreich gesendet wurde, lassen wir den Text "Erfolgreich gesendet!" stehen.
             // Wenn ein Fehler aufgetreten ist, hat der Catch-Block den Text bereits geändert.
             // Daher ist hier kein allgemeiner Reset nötig, es sei denn, wir wollen immer den ursprünglichen Text wiederherstellen.
             // Lassen wir es so, dass der Fehlertext oder Erfolgstext sichtbar bleibt.
        }
    }

    /**
     * Funktion zum Testen der Formularübermittlung mit vordefinierten Daten.
     * Kann über die Browser-Konsole aufgerufen werden.
     * @param {Object} testData - Die Testdaten im fieldData-format.
     */
    function testSubmissionWithData(testData) {
        console.log('Starte Test-Übermittlung mit Daten:', testData);
        const mainForm = find(`#${MAIN_FORM_ID}`); // Finde das Formular
        if (!mainForm) {
            console.error(`Hauptformular mit ID "${MAIN_FORM_ID}" nicht gefunden. Test kann nicht durchgeführt werden.`);
            return;
        }

        // Simuliere ein Event-Objekt mit dem Formular als Target
        const simulatedEvent = {
            preventDefault: () => {}, // Dummy preventDefault Funktion
            target: mainForm
        };

        // Rufe handleFormSubmit mit dem simulierten Event und den Testdaten auf
        handleFormSubmit(simulatedEvent, testData);
    }

    // Exponiere die Testfunktion global, damit sie von der Konsole aus aufgerufen werden kann
    window.testSubmissionWithData = testSubmissionWithData;
    console.log('Testfunktion testSubmissionWithData ist verfügbar.');


    /**
     * Initialisierung, wenn das DOM geladen ist.
     * Fügt den Event-Listener zum Formular hinzu.
     */
    document.addEventListener('DOMContentLoaded', () => {
        // Finde das Hauptformular anhand seiner ID
        const mainForm = find(`#${MAIN_FORM_ID}`); // Finde das Formular
        if (mainForm) {
            // Füge den Event-Listener für das 'submit'-Event hinzu
            // Stelle sicher, dass der Event-Listener nur einmal hinzugefügt wird.
            // Falls dieses Skript mehrmals geladen wird (unwahrscheinlich bei korrekter Einbindung),
            // könnte man hier eine Prüfung einbauen.
            mainForm.removeEventListener('submit', handleFormSubmit); // Vorsichtshalber entfernen, falls schon vorhanden
            mainForm.addEventListener('submit', (event) => handleFormSubmit(event, null)); // Übergibt null für testData bei echter Übermittlung
            console.log(`Form Submission Handler initialisiert für Formular: #${MAIN_FORM_ID}`);
        } else {
            console.warn(`Hauptformular mit ID "${MAIN_FORM_ID}" nicht gefunden. Der Submission Handler ist nicht aktiv.`);
        }

         // Füge Event Listener für das Schließen des Popups hinzu
         const closeBtn = find(CLOSE_POPUP_ATTR);
         if (closeBtn) {
             closeBtn.addEventListener('click', closeCustomPopup);
         }
         // Der Event Listener für das Mail Icon wird nicht hier hinzugefügt,
         // da der href direkt in showCustomPopup gesetzt wird.
    });

})();
