// form-submission-handler.js
// Dieses Skript ist verantwortlich für das Sammeln der Formulardaten
// und das Senden an den Webflow CMS Worker.

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
     * Ordnet die data-preview-field Attribute den Webflow CMS Slugs zu.
     * @param {HTMLFormElement} formElement - Das Formular-Element.
     * @returns {Object} - Die aufbereiteten Daten für Webflow im 'fieldData' Format.
     */
    function collectAndFormatWebflowData(formElement) {
        const webflowPayload = {}; // Dieses Objekt wird die `fieldData` für Webflow enthalten
        const fields = findAll(`[${DATA_FIELD_ATTRIBUTE}]`, formElement);
        let projectNameValue = ''; // Speichere den Projektnamen für die Slug-Generierung

        fields.forEach(field => {
            const fieldNameKey = field.getAttribute(DATA_FIELD_ATTRIBUTE); // Das ist der Schlüssel aus deinem Formular (z.B. "projectName")
            let value;
            let webflowSlug = null; // Der tatsächliche Slug in Webflow CMS

            // --- Mapping von data-preview-field zu Webflow CMS Slugs ---
            // !!! DU MUSST DIESES MAPPING AN DEINE WEBFLOW COLLECTION ANPASSEN !!!
            // Stelle sicher, dass die Slugs (die Strings nach webflowSlug =) exakt
            // mit den Slugs in deiner Webflow CMS Collection übereinstimmen.
            switch (fieldNameKey) {
                case 'projectName':
                    webflowSlug = 'name';
                    projectNameValue = field.value.trim(); // Speichere den Projektnamen
                    break;
                case 'job-adress-optional': webflowSlug = 'job-adress-optional'; break;
                case 'budget':                webflowSlug = 'job-payment'; break;
                case 'startDate':             webflowSlug = 'job-date-start'; break; // Annahme: Du hast dieses Feld
                case 'endDate':               webflowSlug = 'job-date-end'; break;
                case 'contentDeadline':       webflowSlug = 'fertigstellung-content'; break;
                case 'scriptDeadline':        webflowSlug = 'job-scriptdeadline'; break;
                case 'creatorCount':          webflowSlug = 'anzahl-gesuchte-creator'; break;
                case 'creatorCategorie':      webflowSlug = 'art-des-contents'; break;
                case 'aufgabe':               webflowSlug = 'deine-aufgaben'; break;
                case 'steckbrief':            webflowSlug = 'job-beschreibung'; break;
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
                case 'followerRange':         webflowSlug = 'creator-follower'; break;
                case 'creatorAge':            webflowSlug = 'creator-alter'; break;
                case 'videoFormat':           webflowSlug = 'format'; break;
                case 'hookCount':             webflowSlug = 'anzahl-der-hooks'; break;
                case 'subtitles':             webflowSlug = 'untertitel'; break;
                case 'webflowMemberId':       webflowSlug = 'webflow-member-id'; break;
                case 'msMemberId':            webflowSlug = 'ms-member-id'; break;
                // Füge hier ein Mapping für den Slug hinzu, falls du ein Feld dafür hast
                case 'jobSlug':               webflowSlug = 'slug'; break; // Beispiel, falls du ein Slug-Feld im Formular hast
                // Für Sprachen und Länder werden die Werte unten speziell behandelt
                case 'creatorLang':           webflowSlug = 'sprache'; break;
                case 'creatorLand':           webflowSlug = 'land'; break;
                case 'jobOnline':             webflowSlug = 'job-online-bis'; break; // Annahme für das Feld "jobOnline"
                default:
                    // console.log(`Unbekanntes Feld für Webflow-Mapping: ${fieldNameKey}`);
                    return; // Nächstes Feld bearbeiten, wenn kein Mapping gefunden wurde
            }

            // Nur wenn ein webflowSlug gefunden wurde, den Wert sammeln
            if (webflowSlug) {
                // Werte sammeln und formatieren basierend auf dem Feldtyp
                if (field.type === 'checkbox') {
                     // Für Checkbox-Gruppen (Sprachen, Länder), die als kommaseparierter String gesendet werden
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
                    // Wenn es ein Referenzfeld ist und du die ID sendest, ist das oft korrekt.
                    // Wenn du den Text senden musst und der Wert die ID ist, brauchst du eine Mapping-Logik.
                    webflowPayload[webflowSlug] = value;
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


        // Immer setzen: admin-test Feld
        webflowPayload['admin-test'] = true;
        // Webflow setzt _archived und _draft standardmäßig auf false, wenn ein Item live erstellt wird.

        console.log('Daten für Webflow Worker (fieldData):', webflowPayload);
        return webflowPayload;
    }

    /**
     * Hauptfunktion zum Absenden des Formulars.
     * Wird aufgerufen, wenn das Formular abgeschickt wird.
     * @param {Event} event - Das Submit-Event.
     */
    async function handleFormSubmit(event) {
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

        const fieldDataForWebflow = collectAndFormatWebflowData(form);

        // Prüfe, ob der Slug generiert wurde (falls erforderlich)
        if (!fieldDataForWebflow['slug']) {
             const errorMessage = 'Fehler: Slug konnte nicht generiert werden. Bitte stelle sicher, dass der Job-Titel ausgefüllt ist.';
             console.error(errorMessage);
             showStatusMessage(errorMessage, 'error', form);
             if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Absenden fehlgeschlagen';
            }
            return; // Beende die Funktion, wenn der Slug fehlt
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

            // Verarbeite die Antwort vom Worker
            const responseData = await response.json();

            // Überprüfe, ob die Antwort erfolgreich war (Status-Code 2xx)
            if (!response.ok) {
                // Logge die Fehlermeldung vom Worker
                console.error('Fehler vom Webflow Worker:', response.status, responseData);
                let errorMessage = `Fehler beim Erstellen des Jobs in Webflow (${response.status}).`;
                // Füge Details aus der Worker-Antwort hinzu, falls vorhanden
                if (responseData && (responseData.error || responseData.msg || responseData.message)) {
                    errorMessage += ` Details: ${responseData.error || responseData.msg || responseData.message}`;
                    // Hier war der Fehlerpunkt im Worker, der jetzt behoben sein sollte
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
        }
    }

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
            mainForm.addEventListener('submit', handleFormSubmit);
            console.log(`Form Submission Handler initialisiert für Formular: #${MAIN_FORM_ID}`);
        } else {
            // Warnung, wenn das Formular nicht gefunden wurde
            console.warn(`Hauptformular mit ID "${MAIN_FORM_ID}" nicht gefunden. Der Submission Handler ist nicht aktiv.`);
        }
    });

})();
