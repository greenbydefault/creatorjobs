// form-submission-handler.js
// Dieses Skript ist verantwortlich für das Sammeln der Formulardaten
// und das Senden an den Webflow CMS Worker.
// AKTUELLE VERSION: Verbesserte Fehlerbehandlung und Erfolgsmeldungen mit kategorisiertem Popup,
// interagiert mit benutzerdefiniertem HTML über Data-Attribute.

(function() {
    'use strict';

    // --- Konfiguration ---
    // URL des Webflow CMS Workers
    const WEBFLOW_CMS_POST_WORKER_URL = 'https://late-meadow-00bc.oliver-258.workers.dev/';
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
     * Sammelt und formatiert die Formulardaten für die Webflow API.
     * Diese Funktion wird NICHT verwendet, wenn testSubmissionWithData aufgerufen wird.
     * @param {HTMLFormElement} formElement - Das Formular-Element.
     * @returns {Object} - Die aufbereiteten Daten für Webflow im 'fieldData' Format.
     */
    function collectAndFormatWebflowData(formElement) {
        const webflowPayload = {}; // Dieses Objekt wird die `fieldData` für Webflow enthalten
        const fields = findAll(`[${DATA_FIELD_ATTRIBUTE}]`, formElement);
        let projectNameValue = ''; // Speichere den Projektnamen für die Slug-Generierung

        // Temporäre Arrays für Checkbox-Gruppen
        const creatorLangValues = [];
        const creatorLandValues = [];
        const nutzungOptionalValues = []; // NEU: Für job-posting
        const channelsValues = []; // NEU: Für fur-welchen-kanale-wird-der-content-produziert


        fields.forEach(field => {
            const fieldNameKey = field.getAttribute(DATA_FIELD_ATTRIBUTE); // Das ist der Schlüssel aus deinem Formular
            let value;
            let webflowSlug = null; // Der tatsächliche Slug in Webflow CMS

             // --- Mapping von data-preview-field zu Webflow CMS Slugs ---
            // Füge hier die Mappings für alle Felder hinzu
            switch (fieldNameKey) {
                case 'projectName':           webflowSlug = 'name'; projectNameValue = field.value.trim(); break;
                case 'jobSlug':               webflowSlug = 'slug'; break; // Optional: Falls ein explizites Slug-Feld existiert
                case 'job-adress-optional':   webflowSlug = 'location'; break;
                case 'budget':                webflowSlug = 'job-payment'; break; // Spezialbehandlung für 0 bei Leere
                // case 'startDate':          webflowSlug = 'job-date-start'; break; // ENTFERNT
                case 'jobOnline':             webflowSlug = 'job-date-end'; break; // jobOnline -> job-date-end (Spezialbehandlung für Auto-Datum)
                case 'contentDeadline':       webflowSlug = 'fertigstellung-content'; break; // Hinzugefügt
                case 'scriptDeadline':        webflowSlug = 'job-scriptdeadline'; break; // Hinzugefügt
                case 'creatorCount':          webflowSlug = 'anzahl-gesuchte-creator'; break;
                case 'creatorCategorie':      webflowSlug = 'art-des-contents'; break;
                case 'creatorCountOptional':  webflowSlug = 'creator-follower'; break; // Referenzfeld
                case 'creatorLand':           // Checkbox-Gruppe, sammle Werte separat
                    if (field.checked) creatorLandValues.push(field.value.trim());
                    return; // Weiter zum nächsten Feld
                case 'creatorLang':           // Checkbox-Gruppe, sammle Werte separat
                    if (field.checked) creatorLangValues.push(field.value.trim());
                    return; // Weiter zum nächsten Feld
                case 'aufgabe':               webflowSlug = 'job-beschreibung'; break;
                case 'steckbrief':            webflowSlug = 'deine-aufgaben'; break;
                case 'genderOptional':        webflowSlug = 'creator-geschlecht'; break; // Referenzfeld
                case 'videoCountOptional':    webflowSlug = 'anzahl-videos-2'; break; // Hinzugefügt (Zahl)
                case 'imgCountOptional':      webflowSlug = 'anzahl-bilder-2'; break; // Hinzugefügt (Zahl)
                case 'videoDurationOptional': webflowSlug = 'video-dauer'; break; // Referenzfeld
                case 'reviewsOptional':       webflowSlug = 'anzahl-der-reviews'; break; // Hinzugefügt (Text)
                case 'durationOptional':      webflowSlug = 'dauer-nutzungsrechte'; break; // NEU: durationOptional -> dauer-nutzungsrechte (Referenzfeld)
                case 'scriptOptional':        webflowSlug = 'script'; break; // Referenzfeld
                case 'nutzungOptional':       // NEU: Checkbox-Gruppe für job-posting
                    if (field.checked) nutzungOptionalValues.push(field.value.trim());
                    return; // Weiter zum nächsten Feld
                case 'channels':              // NEU: Checkbox-Gruppe für fur-welchen-kanale-wird-der-content-produziert
                    if (field.checked) channelsValues.push(field.value.trim());
                    return; // Weiter zum nächsten Feld
                case 'previewText':           webflowSlug = 'previewtext'; break; // Hinzugefügt (Text)
                case 'brandName':             webflowSlug = 'brand-name'; break; // Hinzugefügt (Text)
                case 'contactMail':           webflowSlug = 'contact-mail'; break; // Hinzugefügt (Text)
                case 'barterDealToggle':      webflowSlug = 'barter-deal'; break; // Hinzugefügt (Boolean)
                case 'plusJobToggle':         webflowSlug = 'plus-job'; break; break; // Hinzugefügt (Boolean)
                case 'jobImageUpload':        webflowSlug = 'job-image'; break; // Hinzugefügt (Text/URL)
                case 'industryCategory':      webflowSlug = 'industrie-kategorie'; break; // Referenzfeld
                case 'creatorAge':            webflowSlug = 'creator-alter'; break; // Referenzfeld
                case 'videoFormat':           webflowSlug = 'format'; break; // Referenzfeld
                case 'hookCount':             webflowSlug = 'anzahl-der-hooks'; break; // Referenzfeld
                case 'subtitelOptional':      webflowSlug = 'untertitel'; break; // NEU: subtitelOptional -> untertitel (Referenzfeld)
                // Memberstack Felder
                case 'userName':              webflowSlug = 'brand-name'; break; // userName -> brand-name
                case 'webflowId':             webflowSlug = 'webflow-member-id'; break; // webflowId -> webflow-member-id
                case 'memberEmail':           webflowSlug = 'contact-mail'; break; // memberEmail -> contact-mail
                case 'memberstackId':         webflowSlug = 'ms-member-id'; break; // memberstackId -> ms-member-id
                 // job-id wird im Worker gesetzt, nicht vom Frontend gesammelt

                default:
                    // console.log(`Unbekanntes Feld für Webflow-Mapping: ${fieldNameKey}`);
                    return; // Weiter zum nächsten Feld, wenn kein Mapping gefunden wurde
            }

            // Nur wenn ein webflowSlug gefunden wurde (und es keine separat behandelte Checkbox-Gruppe ist), den Wert sammeln
            if (webflowSlug) {
                // Werte sammeln und formatieren basierend auf dem Feldtyp
                if (field.type === 'checkbox') {
                     // Für einzelne Boolean-Checkboxes
                    value = field.checked;
                    webflowPayload[webflowSlug] = value; // Immer senden (true oder false)
                } else if (field.tagName === 'SELECT') {
                    // Für Select-Felder
                    value = field.options[field.selectedIndex]?.value || field.value;

                    // Spezielle Behandlung für Referenzfelder, die ein Mapping benötigen
                    if (REFERENCE_MAPPINGS[fieldNameKey]) {
                        // Wenn ein Mapping existiert und der Wert im Mapping gefunden wird
                        if (REFERENCE_MAPPINGS[fieldNameKey][value]) {
                             webflowPayload[webflowSlug] = REFERENCE_MAPPINGS[fieldNameKey][value]; // Sende die gemappte ID
                        } else if (value) {
                            // Wenn ein Wert vorhanden ist, aber kein Mapping gefunden wurde (z.B. "Keine Angabe" hat keine ID im Mapping)
                            // Logge eine Warnung und sende den Originalwert (könnte die ID sein, wenn im Value-Attribut)
                            console.warn(`Kein Mapping für "${value}" im REFERENCE_MAPPINGS für Feld "${fieldNameKey}". Sende Originalwert.`);
                             webflowPayload[webflowSlug] = value;
                        }
                        // Wenn value leer ist und kein Mapping gefunden wurde, wird das Feld nicht hinzugefügt (korrekt für optionale Referenzen)
                    } else {
                        // Standardverhalten für Selects ohne spezielles Mapping: Sende den gesammelten Wert
                        // Füge nur hinzu, wenn der Wert nicht leer ist
                         if (value) {
                             webflowPayload[webflowSlug] = value;
                         }
                    }

                } else if (field.hasAttribute('data-datepicker') || ['endDate', 'contentDeadline', 'scriptDeadline'].includes(fieldNameKey)) { // Datumsfelder (außer jobOnline)
                    const isoDate = formatToISODate(field.value.trim());
                     // Füge das Datum nur hinzu, wenn es gültig formatiert wurde UND nicht leer ist
                    if (isoDate) {
                         webflowPayload[webflowSlug] = isoDate;
                    } else if (field.value.trim() !== '') {
                        // Logge eine Warnung, wenn ein Datumswert vorhanden ist, aber ungültig formatiert war
                        console.warn(`Datumswert für ${fieldNameKey} konnte nicht als ISO-Datum formatiert werden: "${field.value.trim()}"`);
                        // Das Feld wird in diesem Fall nicht gesendet.
                    }
                     // Wenn field.value.trim() === '', wird das Feld ebenfalls nicht gesendet.

                } else if (fieldNameKey === 'jobOnline') { // Spezialbehandlung für jobOnline (job-date-end)
                     const jobOnlineValue = field.value.trim();
                     let isoDate;
                     if (jobOnlineValue === '') {
                         // Wenn leer, berechne heute + 3 Tage
                         const today = new Date();
                         today.setDate(today.getDate() + 3);
                         // Setze die Zeit auf 00:00:00.000Z, um Konsistenz zu gewährleisten
                         today.setHours(0, 0, 0, 0);
                         isoDate = today.toISOString();
                         console.log(`jobOnline Feld war leer, setze job-date-end auf heute + 3 Tage: ${isoDate}`);
                     } else {
                         // Wenn nicht leer, formatiere den eingegebenen Wert
                         isoDate = formatToISODate(jobOnlineValue);
                         if (!isoDate) {
                              console.warn(`Ungültiges Datum im jobOnline Feld: "${jobOnlineValue}". job-date-end wird nicht gesendet.`);
                              // Das Feld wird in diesem Fall nicht gesendet.
                         }
                     }
                     // Füge das Datum nur hinzu, wenn es gültig ist (egal ob berechnet oder vom User eingegeben)
                     if (isoDate) {
                         webflowPayload[webflowSlug] = isoDate;
                     }


                } else if (fieldNameKey === 'budget') { // Spezialbehandlung für Budget
                     const budgetValue = field.value.trim();
                     // Wenn budgetValue leer ist, sende 0, sonst parse als Float
                     webflowPayload[webflowSlug] = budgetValue === '' ? 0 : parseFloat(budgetValue);

                } else if (field.type === 'number') { // Felder für Zahlen (außer Budget)
                    const numVal = field.value.trim();
                    // Füge die Zahl nur hinzu, wenn sie nicht leer ist
                    if (numVal !== '') {
                         webflowPayload[webflowSlug] = parseFloat(numVal);
                    }
                    // Wenn numVal === '', wird das Feld nicht gesendet.

                } else { // Standard Textfelder
                    value = field.value.trim();
                    // Füge den Text nur hinzu, wenn er nicht leer ist
                    if (value !== '') {
                        webflowPayload[webflowSlug] = value;
                    }
                    // Wenn value === '', wird das Feld nicht gesendet.
                }
            }
        });

        // Checkbox-Gruppen Arrays zu kommaseparierten Strings machen und zur Payload hinzufügen
        if (creatorLangValues.length > 0) {
            webflowPayload['sprache'] = creatorLangValues.join(', ');
        }
         if (creatorLandValues.length > 0) {
            webflowPayload['land'] = creatorLandValues.join(', ');
        }
         // NEU: nutzungOptional (job-posting)
         if (nutzungOptionalValues.length > 0) {
             webflowPayload['job-posting'] = nutzungOptionalValues.join(', ');
         }
         // NEU: channels (fur-welchen-kanale-wird-der-content-produziert)
         if (channelsValues.length > 0) {
              webflowPayload['fur-welchen-kanale-wird-der-content-produziert'] = channelsValues.join(', ');
         }


        // Füge den Slug hinzu, generiert aus dem Projektnamen, falls noch nicht vorhanden
        // und stelle sicher, dass der Projektname nicht leer ist
        if (!webflowPayload['slug'] && projectNameValue) {
             webflowPayload['slug'] = slugify(projectNameValue);
        } else if (!webflowPayload['slug'] && !projectNameValue) {
             // Logge eine Warnung, wenn kein Projektname da ist und kein Slug gesammelt wurde
             console.warn('Projektname fehlt, kann keinen Slug generieren.');
             // Das Slug-Feld wird in diesem Fall nicht gesendet. Wenn Slug ein Pflichtfeld ist, wird der Worker einen Fehler zurückgeben.
        }

        // Füge job-title hinzu (gleicher Wert wie name)
        if (projectNameValue) {
             webflowPayload['job-title'] = projectNameValue;
        }


        // Immer setzen: admin-test Feld (wird vom Worker erwartet)
        webflowPayload['admin-test'] = true;
        // Webflow setzt _archived und _draft standardmäßig auf false, wenn ein Item live erstellt wird.

        console.log('Daten für Webflow Worker (fieldData):', webflowPayload);
        return webflowPayload;
    }

    /**
     * Hauptfunktion zum Absenden des Formulars.
     * Wird aufgerufen, wenn das Formular abgeschickt wird, oder simuliert durch testSubmissionWithData.
     * @param {Event} event - Das Submit-Event (oder simuliertes Event).
     * @param {Object} [testData] - Optionale Testdaten, wenn die Funktion direkt aufgerufen wird.
     */
    async function handleFormSubmit(event, testData = null) {
        event.preventDefault(); // Verhindert das Standard-Formular-Absenden
        const form = event.target;
        // Finde den Submit-Button, um ihn während des Sendens zu deaktivieren
        const submitButton = form.querySelector('button[type="submit"]');

        if (submitButton) {
            submitButton.disabled = true; // Deaktiviere den Button
            submitButton.textContent = 'Wird gesendet...'; // Ändere den Text des Buttons
        }
        // Zeige eine Lade-Nachricht im Popup an
        showCustomPopup('Daten werden an Webflow übermittelt...', 'loading', 'Übermittlung läuft');


        // Verwende Testdaten, falls provided, sonst sammle aus dem Formular
        const fieldDataForWebflow = testData ? testData : collectAndFormatWebflowData(form);

        // Prüfe, ob der Slug generiert wurde (falls erforderlich) und der Name vorhanden ist
        // Diese Prüfungen sind kritisch, da Name und Slug Pflichtfelder in Webflow sind
        if (!fieldDataForWebflow['slug']) {
             const errorMessage = 'Fehler: Slug konnte nicht generiert werden. Bitte stelle sicher, dass der Job-Titel ausgefüllt ist.';
             console.error(errorMessage);
             showCustomPopup(errorMessage, 'error', 'Fehler: Fehlende Daten', `Frontend Fehler: Slug fehlt. Gesendete Daten: ${JSON.stringify(fieldDataForWebflow)}`);
             if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Absenden fehlgeschlagen';
            }
            return; // Beende die Funktion, wenn der Slug fehlt
        }
         if (!fieldDataForWebflow['name']) {
             const errorMessage = 'Fehler: Job-Titel (name) fehlt.';
             console.error(errorMessage);
             showCustomPopup(errorMessage, 'error', 'Fehler: Fehlende Daten', `Frontend Fehler: Name fehlt. Gesendete Daten: ${JSON.stringify(fieldDataForWebflow)}`);
             if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Absenden fehlgeschlagen';
            }
            return; // Beende die Funktion, wenn der Name fehlt
        }

        // HINWEIS ZUR FEHLERSUCHE BEI DATUMSFELDERN:
        // Wenn beim Senden von Datumsfeldern Fehler auftreten, überprüfe bitte die Cloudflare Worker Logs.
        // Der Worker sollte die spezifische Fehlermeldung von der Webflow API protokollieren,
        // die genau angibt, welches Datumsproblem vorliegt (z. B. falsches Format, fehlendes Pflichtfeld).
        console.log("Prüfe Worker-Logs für spezifische Webflow API Fehler, besonders bei Datumsfeldern.");


        try {
            // Logge die gesendeten Daten zur Fehlersuche
            console.log('Sende an Webflow Worker:', WEBFLOW_CMS_POST_WORKER_URL, JSON.stringify({ fields: fieldDataForWebflow }));
            // Sende die Daten an den Worker per POST-Request
            const response = await fetch(WEBFLOW_CMS_POST_WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Wichtig: Datenformat ist JSON
                },
                body: JSON.stringify({
                    // Der Worker erwartet ein Objekt mit einem 'fields'-Schlüssel
                    fields: fieldDataForWebflow
                    // Die Collection ID ist im Worker fest codiert: '6448faf9c5a8a17455c05525'
                })
            });

            const responseData = await response.json();

            // --- Verbesserte Fehlerbehandlung ---
            if (!response.ok) {
                console.error('Fehler vom Webflow Worker:', response.status, responseData);
                let userMessage = `Es ist ein Fehler beim Erstellen des Jobs aufgetreten (${response.status}).`;
                let supportDetails = `Status: ${response.status}.`;

                if (responseData) {
                    supportDetails += ` Worker Response: ${JSON.stringify(responseData)}`;

                    if (response.status === 400) {
                        userMessage = 'Fehler bei der Datenübermittlung. Einige Felder sind ungültig oder fehlen.';
                        if (responseData.problems && Array.isArray(responseData.problems)) {
                            userMessage += ' Probleme: ' + responseData.problems.map(p => p.message || p.path).join(', ');
                        } else if (responseData.details && Array.isArray(responseData.details)) {
                             userMessage += ' Details: ' + responseData.details.map(d => `Feld '${(d.path && Array.isArray(d.path) ? d.path.join('.') : 'unbekannt')}' - ${d.message}`).join('; ');
                        } else if (responseData.message) {
                             userMessage += ' Details: ' + responseData.message;
                        }
                         userMessage += ' Bitte überprüfe deine Eingaben und versuche es erneut.';

                    } else if (response.status === 401) {
                        userMessage = 'Authentifizierungsfehler. Bitte kontaktiere den Support.';
                    } else if (response.status === 404) {
                         userMessage = 'Ziel nicht gefunden. Bitte kontaktiere den Support.';
                    } else if (response.status === 429) {
                        userMessage = 'Zu viele Anfragen. Bitte versuche es später erneut.';
                    } else if (response.status >= 500) {
                        userMessage = 'Ein Problem auf dem Server ist aufgetreten. Bitte versuche es später erneut.';
                         if (responseData.details) {
                             supportDetails += ` Details: ${responseData.details}`;
                         }
                    } else if (responseData.error) {
                         userMessage += ` Details: ${responseData.error}`;
                    } else if (responseData.msg) {
                         userMessage += ` Details: ${responseData.msg}`;
                    } else if (responseData.message) {
                         userMessage += ` Details: ${responseData.message}`;
                    }
                }

                console.error('Support Details:', supportDetails);
                showCustomPopup(userMessage, 'error', 'Übermittlungsfehler', supportDetails);

                // Wirf hier keinen Fehler mehr, da das Popup die Fehlermeldung anzeigt
                // throw new Error(`Webflow API Error (${response.status}): ${supportDetails}`);

            } else { // Erfolgreiche Antwort (Status-Code 2xx)

                // Logge die erfolgreiche Antwort
                console.log('Antwort vom Webflow Worker:', responseData);
                // Extrahiere die Webflow Item ID aus der Antwort
                const webflowItemId = responseData.id; // Webflow API gibt das Item-Objekt zurück, 'id' ist die Item-ID

                let successMessage = 'Job erfolgreich erstellt!';
                if (webflowItemId) {
                    successMessage += ' ID: ' + webflowItemId;
                     showCustomPopup(successMessage, 'success', 'Erfolgreich');
                } else {
                    // Dieser Fall sollte jetzt seltener auftreten, da der Worker spezifischere Fehler zurückgeben sollte
                    console.error('Webflow Item ID nicht in der Antwort des Workers gefunden.', responseData);
                     showCustomPopup('Job erstellt, aber ID nicht erhalten. Bitte kontaktiere den Support, falls nötig.', 'success', 'Erfolg mit Hinweis'); // Zeige trotzdem Erfolg, aber mit Hinweis
                }


                // Hier könnte der Aufruf zum Airtable-Worker folgen, sobald Webflow erfolgreich war.
                // form.reset(); // Optional: Formular zurücksetzen nach Erfolg

                if (submitButton) {
                    // submitButton.disabled = false; // Deaktiviert lassen nach Erfolg oder weiterleiten
                    submitButton.textContent = 'Erfolgreich gesendet!'; // Ändere den Button-Text
                }
            }


        } catch (error) {
            // Behandelt Netzwerkfehler oder Fehler, die im Frontend-Skript selbst auftreten (z.B. ReferenceError)
            console.error('Unerwarteter Fehler beim Absenden an Webflow:', error);
            // Zeige eine allgemeine Fehlermeldung für den Benutzer
            const userMessage = `Ein unerwarteter Fehler ist aufgetreten: ${error.message}. Bitte versuche es später erneut oder kontaktiere den Support.`;
            const supportDetails = `Unerwarteter Frontend Fehler: ${error.message}. Stack: ${error.stack}.`;
            showCustomPopup(userMessage, 'error', 'Unerwarteter Fehler', supportDetails);
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
        const mainForm = document.getElementById(MAIN_FORM_ID);
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
        const mainForm = document.getElementById(MAIN_FORM_ID);
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
