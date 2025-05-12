// form-submission-handler.js
// Dieses Skript ist verantwortlich für das Sammeln der Formulardaten
// und das Senden an den Webflow CMS Worker.
// AKTUELLE VERSION: Enthält erweiterte Felder und eine Funktion zum Testen mit vordefinierten Daten.

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

    // --- Mapping für Referenzfelder (Textwert zu Webflow Item ID) ---
    // DIESES MAPPING MUSS GENAU MIT DEINEN WEBFLOW COLLECTION ITEMS ÜBEREINSTIMMEN!
    const REFERENCE_MAPPINGS = {
        'creatorFollower': {
            '0 - 2.500': '3d869451e837ddf527fc54d0fb477ab4', // Beispiel ID, bitte mit deinen echten IDs abgleichen!
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
        // Füge hier weitere Mappings für Referenzfelder hinzu, falls nötig
        // 'creatorAlter': { '18-24': 'deine_id_hier', ... },
        // 'creatorGeschlecht': { 'Männlich': 'deine_id_hier', ... },
        // etc.
    };


    // --- Hilfsfunktionen ---
    // Findet das erste Element, das dem Selektor entspricht
    const find = (selector, element = document) => element.querySelector(selector);
    // Findet alle Elemente, die dem Selektor entsprechen
    const findAll = (selector, element = document) => element.querySelectorAll(selector);

    /**
     * Zeigt eine Statusmeldung für den Benutzer an.
     * @param {string} message - Die anzuzeigende Nachricht.
     * @param {string} type - 'success', 'error', oder 'loading'.
     * @param {HTMLElement} formElement - Das Formular-Element, um die Nachricht zu platzieren.
     */
    function showStatusMessage(message, type, formElement) {
        let messageElement = find('.form-submission-status', formElement);
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.className = 'form-submission-status';
            // Füge die Nachricht vor dem ersten Button-Container oder am Ende des Formulars ein
            const buttonWrapper = find('.form-navigation', formElement) || formElement.lastElementChild;
            if (buttonWrapper) {
                formElement.insertBefore(messageElement, buttonWrapper);
            } else {
                formElement.appendChild(messageElement);
            }
        }

        messageElement.textContent = message;
        messageElement.className = `form-submission-status status-${type}`;

        // Grundlegendes Styling für die Nachricht
        messageElement.style.display = 'block';
        messageElement.style.padding = '10px 15px';
        messageElement.style.marginTop = '15px';
        messageElement.style.marginBottom = '15px';
        messageElement.style.borderRadius = '5px';
        messageElement.style.textAlign = 'center';
        messageElement.style.border = '1px solid transparent';

        // Spezifisches Styling basierend auf dem Typ
        if (type === 'success') {
            messageElement.style.backgroundColor = '#d4edda';
            messageElement.style.color = '#155724';
            messageElement.style.borderColor = '#c3e6cb';
        } else if (type === 'error') {
            messageElement.style.backgroundColor = '#f8d7da';
            messageElement.style.color = '#721c24';
            messageElement.style.borderColor = '#f5c6cb';
        } else if (type === 'loading') {
            messageElement.style.backgroundColor = '#e2e3e5';
            messageElement.style.color = '#383d41';
            messageElement.style.borderColor = '#d6d8db';
        }
    }

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

        fields.forEach(field => {
            const fieldNameKey = field.getAttribute(DATA_FIELD_ATTRIBUTE); // Das ist der Schlüssel aus deinem Formular
            let value;
            let webflowSlug = null; // Der tatsächliche Slug in Webflow CMS

             // --- Mapping von data-preview-field zu Webflow CMS Slugs ---
            // Füge hier die Mappings für die neuen Felder hinzu
            switch (fieldNameKey) {
                case 'projectName':           webflowSlug = 'name'; projectNameValue = field.value.trim(); break;
                case 'jobSlug':               webflowSlug = 'slug'; break; // Optional: Falls ein explizites Slug-Feld existiert
                case 'job-adress-optional':   webflowSlug = 'job-adress-optional'; break; // location
                case 'budget':                webflowSlug = 'job-payment'; break; // job-payment
                // case 'startDate':          webflowSlug = 'job-date-start'; break; // Nicht in der neuen Liste, aber im alten Skript
                case 'jobOnline':             webflowSlug = 'job-date-end'; break; // job-date-end
                case 'creatorCount':          webflowSlug = 'anzahl-gesuchte-creator'; break; // anzahl-gesuchte-creator
                case 'creatorCategorie':      webflowSlug = 'art-des-contents'; break; // art-des-contents
                case 'creatorCountOptional':  webflowSlug = 'creator-follower'; break; // creator-follower (Referenzfeld)
                case 'creatorLand':           webflowSlug = 'land'; break; // land (Checkbox-Gruppe)
                case 'creatorLang':           webflowSlug = 'sprache'; break; // sprache (Checkbox-Gruppe)
                case 'aufgabe':               webflowSlug = 'job-beschreibung'; break; // job-beschreibung
                case 'steckbrief':            webflowSlug = 'deine-aufgaben'; break; // deine-aufgaben
                // Füge hier weitere Mappings hinzu, wenn du weitere Felder testen möchtest
                 case 'genderOptional':        webflowSlug = 'creator-geschlecht'; break;
                 case 'videoCountOptional':    webflowSlug = 'anzahl-videos-2'; break;
                 case 'imgCountOptional':      webflowSlug = 'anzahl-bilder-2'; break;
                 case 'videoDurationOptional': webflowSlug = 'video-dauer'; break;
                 case 'reviewsOptional':       webflowSlug = 'anzahl-der-reviews'; break;
                 case 'durationOptional':      webflowSlug = 'nutzungsrechte-dauer'; break;
                 case 'scriptOptional':        webflowSlug = 'script'; break;
                 case 'jobPostingChannel':     webflowSlug = 'job-posting'; break;
                 case 'contentChannels':       webflowSlug = 'fur-welchen-kanale-wird-der-content-produziert'; break;
                 case 'previewText':           webflowSlug = 'previewtext'; break;
                 case 'brandName':             webflowSlug = 'brand-name'; break;
                 case 'contactMail':           webflowSlug = 'contact-mail'; break;
                 case 'barterDealToggle':      webflowSlug = 'barter-deal'; break;
                 case 'plusJobToggle':         webflowSlug = 'plus-job'; break;
                 case 'jobImageUpload':        webflowSlug = 'job-image'; break; // Erwartet eine Bild-URL oder ein Asset-Objekt
                 case 'industryCategory':      webflowSlug = 'industrie-kategorie'; break;
                 case 'creatorAge':            webflowSlug = 'creator-alter'; break;
                 case 'videoFormat':           webflowSlug = 'format'; break;
                 case 'hookCount':             webflowSlug = 'anzahl-der-hooks'; break;
                 case 'subtitles':             webflowSlug = 'untertitel'; break;
                 case 'webflowMemberId':       webflowSlug = 'webflow-member-id'; break;
                 case 'msMemberId':            webflowSlug = 'ms-member-id'; break;

                default:
                    // console.log(`Unbekanntes Feld für Webflow-Mapping: ${fieldNameKey}`);
                    return; // Nächstes Feld bearbeiten, wenn kein Mapping gefunden wurde
            }

            // Nur wenn ein webflowSlug gefunden wurde, den Wert sammeln
            if (webflowSlug) {
                // Werte sammeln und formatieren basierend auf dem Feldtyp
                if (field.type === 'checkbox') {
                     // Für Checkbox-Gruppen (Sprachen, Länder)
                    if (fieldNameKey === 'creatorLang' || fieldNameKey === 'creatorLand') {
                        // Initialisiere das Array, falls es noch nicht existiert
                        if (!webflowPayload[webflowSlug]) {
                            webflowPayload[webflowSlug] = [];
                        }
                        // Füge den Wert hinzu, wenn die Checkbox ausgewählt ist
                        if (field.checked) {
                            webflowPayload[webflowSlug].push(field.value);
                        }
                    } else { // Für einzelne Boolean-Checkboxes
                        value = field.checked;
                        webflowPayload[webflowSlug] = value;
                    }
                } else if (field.tagName === 'SELECT') {
                    // Für Select-Felder
                    value = field.options[field.selectedIndex]?.value || field.value;

                    // Spezielle Behandlung für Referenzfelder, die ein Mapping benötigen
                    if (REFERENCE_MAPPINGS[fieldNameKey] && REFERENCE_MAPPINGS[fieldNameKey][value]) {
                         webflowPayload[webflowSlug] = REFERENCE_MAPPINGS[fieldNameKey][value]; // Sende die gemappte ID
                    } else {
                        // Standardverhalten: Sende den gesammelten Wert (kann die ID sein, wenn im Value-Attribut)
                         webflowPayload[webflowSlug] = value;
                    }

                } else if (field.hasAttribute('data-datepicker') || fieldNameKey === 'jobOnline') { // Felder für Datum
                    const isoDate = formatToISODate(field.value.trim());
                    if (isoDate) { // Nur setzen, wenn Datum gültig ist
                        webflowPayload[webflowSlug] = isoDate;
                    } else if (fieldNameKey === 'jobOnline') { // Spezialfall für jobOnline
                        // Wenn jobOnline leer ist, nicht an Webflow senden, damit es dort ggf. leer bleibt
                        // oder dein Worker eine Standardlogik anwendet.
                        // Die "3 Tage" Logik ist für die *Anzeige* in der Preview, nicht unbedingt für das Senden.
                    }
                } else if (field.type === 'number') { // Felder für Zahlen
                    const numVal = field.value.trim();
                    webflowPayload[webflowSlug] = numVal ? parseFloat(numVal) : null; // Sende null, wenn leer
                } else { // Standard Textfelder
                    value = field.value.trim();
                    if (value) { // Nur nicht-leere Strings senden
                        webflowPayload[webflowSlug] = value;
                    }
                }
            }
        });

        // Checkbox-Gruppen Arrays zu kommaseparierten Strings machen
        // Passe dies an, falls Webflow Arrays oder Multi-Reference IDs erwartet
        if (webflowPayload['sprache'] && Array.isArray(webflowPayload['sprache'])) {
            webflowPayload['sprache'] = webflowPayload['sprache'].join(', ');
        }
        if (webflowPayload['land'] && Array.isArray(webflowPayload['land'])) {
            webflowPayload['land'] = webflowPayload['land'].join(', ');
        }

        // Füge den Slug hinzu, generiert aus dem Projektnamen, falls noch nicht vorhanden
        if (!webflowPayload['slug'] && projectNameValue) {
             webflowPayload['slug'] = slugify(projectNameValue);
        } else if (!webflowPayload['slug'] && !projectNameValue) {
             // Optional: Handle den Fall, dass kein Projektname da ist, wenn Slug benötigt wird
             console.warn('Projektname fehlt, kann keinen Slug generieren.');
             // Du könntest hier auch einen Fehler werfen oder einen Standard-Slug setzen
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
        // Zeige eine Lade-Nachricht an
        showStatusMessage('Daten werden an Webflow übermittelt...', 'loading', form);

        // Verwende Testdaten, falls provided, sonst sammle aus dem Formular
        const fieldDataForWebflow = testData ? testData : collectAndFormatWebflowData(form);

        // Prüfe, ob der Slug generiert wurde (falls erforderlich) und der Name vorhanden ist
        if (!fieldDataForWebflow['slug']) {
             const errorMessage = 'Fehler: Slug fehlt.';
             console.error(errorMessage);
             showStatusMessage(errorMessage, 'error', form);
             if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Absenden fehlgeschlagen';
            }
            return; // Beende die Funktion, wenn der Slug fehlt
        }
         if (!fieldDataForWebflow['name']) {
             const errorMessage = 'Fehler: Job-Titel (name) fehlt.';
             console.error(errorMessage);
             showStatusMessage(errorMessage, 'error', form);
             if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Absenden fehlgeschlagen';
            }
            return; // Beende die Funktion, wenn der Name fehlt
        }


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

            // Überprüfe, ob die Antwort erfolgreich war (Status-Code 2xx)
            if (!response.ok) {
                // Logge die Fehlermeldung vom Worker
                console.error('Fehler vom Webflow Worker:', response.status, responseData);
                let errorMessage = `Fehler beim Erstellen des Jobs in Webflow (${response.status}).`;
                // Füge Details aus der Worker-Antwort hinzu, falls vorhanden (Worker sollte jetzt spezifischere Fehler liefern)
                if (responseData && (responseData.error || responseData.msg || responseData.message)) {
                    errorMessage += ` Details: ${responseData.error || responseData.msg || responseData.message}`;
                     if(responseData.problems && Array.isArray(responseData.problems)) {
                         errorMessage += ` Probleme: ${responseData.problems.join(', ')}`;
                    }
                     if(responseData.details && Array.isArray(responseData.details)) {
                        const detailMessages = responseData.details.map(d => {
                            const path = (d.path && Array.isArray(d.path)) ? d.path.join('.') : 'unknown field';
                            return ` Field '${path}' - ${d.message}`;
                        });
                        errorMessage += ` Details: ${detailMessages.join('; ')}`;
                    } else if (responseData.details) {
                        errorMessage += ` Details: ${JSON.stringify(responseData.details)}`;
                    }
                }
                // Wirf einen Fehler, der im catch-block behandelt wird
                throw new Error(errorMessage);
            }

            // Logge die erfolgreiche Antwort
            console.log('Antwort vom Webflow Worker:', responseData);
            // Extrahiere die Webflow Item ID aus der Antwort
            const webflowItemId = responseData.id; // Webflow API gibt das Item-Objekt zurück, 'id' ist die Item-ID

            if (!webflowItemId) {
                // Fehler, wenn keine Item ID zurückgegeben wurde
                throw new Error('Webflow Item ID nicht in der Antwort des Workers gefunden.');
            }

            // Zeige eine Erfolgsmeldung an
            showStatusMessage('Job erfolgreich in Webflow erstellt! ID: ' + webflowItemId, 'success', form);
            // Hier könnte der Aufruf zum Airtable-Worker folgen, sobald Webflow erfolgreich war.
            // form.reset(); // Optional: Formular zurücksetzen nach Erfolg

            if (submitButton) {
                // submitButton.disabled = false; // Deaktiviert lassen nach Erfolg oder weiterleiten
                submitButton.textContent = 'Erfolgreich gesendet!'; // Ändere den Button-Text
            }

        } catch (error) {
            // Behandle Fehler beim Senden oder Verarbeiten der Antwort
            console.error('Fehler beim Absenden an Webflow:', error);
            // Zeige eine Fehlermeldung an
            showStatusMessage(`Fehler: ${error.message}. Bitte versuche es später erneut oder kontaktiere den Support.`, 'error', form);
            if (submitButton) {
                submitButton.disabled = false; // Aktiviere den Button wieder
                submitButton.textContent = 'Absenden fehlgeschlagen'; // Ändere den Button-Text
            }
        } finally {
             // Setze den Button-Zustand zurück, auch bei Erfolg oder Fehler
             if (submitButton && submitButton.textContent.includes('Wird gesendet')) {
                 submitButton.disabled = false;
                 submitButton.textContent = 'Absenden'; // Oder den ursprünglichen Text
             }
        }
    }

    /**
     * Funktion zum Testen der Formularübermittlung mit vordefinierten Daten.
     * Kann über die Browser-Konsole aufgerufen werden.
     * @param {Object} testData - Die Testdaten im fieldData-Format.
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
    });

})();
