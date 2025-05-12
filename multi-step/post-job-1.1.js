// form-submission-handler.js
// Dieses Skript ist verantwortlich für das Sammeln der Formulardaten
// und das Senden an den Webflow CMS Worker.

(function() {
    'use strict';

    // --- Konfiguration ---
    const WEBFLOW_CMS_POST_WORKER_URL = 'https://late-meadow-00bc.oliver-258.workers.dev/';
    // Die ID deines Haupt-Formular-Elements (das alle Schritte umschließt)
    // Dieses Attribut muss an deinem <form>-Tag im Webflow Designer gesetzt sein.
    const MAIN_FORM_ID = 'wf-form-post-job-form'; // Bitte anpassen, falls deine Form-ID anders lautet!

    // Data-Attribut, das wir verwenden, um die Werte aus den Formularfeldern zu lesen
    // (identisch zum Attribut im multistep_form_js für die Vorschau)
    const DATA_FIELD_ATTRIBUTE = 'data-preview-field';
    const CLASS_HIDE = 'hide'; // CSS-Klasse zum Ausblenden

    // --- Hilfsfunktionen ---
    const find = (selector, element = document) => element.querySelector(selector);
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

        messageElement.style.display = 'block';
        messageElement.style.padding = '10px 15px';
        messageElement.style.marginTop = '15px';
        messageElement.style.marginBottom = '15px';
        messageElement.style.borderRadius = '5px';
        messageElement.style.textAlign = 'center';
        messageElement.style.border = '1px solid transparent';

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
     * @param {string} dateString - Das Datum als String (z.B. "DD.MM.YYYY" oder "YYYY-MM-DD").
     * @returns {string|null} - Das Datum als ISO-String oder null bei ungültiger Eingabe.
     */
    function formatToISODate(dateString) {
        if (!dateString) return null;
        let dateObj;
        const deParts = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (deParts) {
            dateObj = new Date(parseInt(deParts[3]), parseInt(deParts[2]) - 1, parseInt(deParts[1]));
        } else {
            dateObj = new Date(dateString); // Versucht, YYYY-MM-DD oder andere Formate zu parsen
        }
        if (isNaN(dateObj.getTime())) {
            console.warn('Ungültiges Datumsformat für ISO-Konvertierung:', dateString);
            return null;
        }
        return dateObj.toISOString();
    }

    /**
     * Sammelt und formatiert die Formulardaten für die Webflow API.
     * @param {HTMLFormElement} formElement - Das Formular-Element.
     * @returns {Object} - Die aufbereiteten Daten für Webflow.
     */
    function collectAndFormatWebflowData(formElement) {
        const webflowPayload = {}; // Dieses Objekt wird die `fieldData` für Webflow enthalten
        const fields = findAll(`[${DATA_FIELD_ATTRIBUTE}]`, formElement);

        fields.forEach(field => {
            const fieldNameKey = field.getAttribute(DATA_FIELD_ATTRIBUTE); // Das ist der Schlüssel aus deinem Formular (z.B. "projectName")
            let value;
            let webflowSlug = null; // Der tatsächliche Slug in Webflow

            // --- Mapping von data-preview-field zu Webflow CMS Slugs ---
            // !!! DU MUSST DIESES MAPPING AN DEINE WEBFLOW COLLECTION ANPASSEN !!!
            switch (fieldNameKey) {
                case 'projectName':         webflowSlug = 'name'; break; // Oder 'job-title', je nachdem was dein Haupttitel-Feld ist
                case 'job-adress-optional': webflowSlug = 'job-adress-optional'; break;
                case 'budget':              webflowSlug = 'job-payment'; break;
                case 'startDate':           webflowSlug = 'job-date-start'; break; // Annahme: Du hast dieses Feld
                case 'endDate':             webflowSlug = 'job-date-end'; break;
                case 'contentDeadline':     webflowSlug = 'fertigstellung-content'; break;
                case 'scriptDeadline':      webflowSlug = 'job-scriptdeadline'; break;
                case 'creatorCount':        webflowSlug = 'anzahl-gesuchte-creator'; break;
                case 'creatorCategorie':    webflowSlug = 'art-des-contents'; break;
                case 'aufgabe':             webflowSlug = 'deine-aufgaben'; break;
                case 'steckbrief':          webflowSlug = 'job-beschreibung'; break;
                case 'genderOptional':      webflowSlug = 'creator-geschlecht'; break;
                case 'videoCountOptional':  webflowSlug = 'anzahl-videos-2'; break;
                case 'imgCountOptional':    webflowSlug = 'anzahl-bilder-2'; break;
                case 'videoDurationOptional': webflowSlug = 'video-dauer'; break;
                case 'reviewsOptional':     webflowSlug = 'anzahl-der-reviews'; break;
                case 'durationOptional':    webflowSlug = 'nutzungsrechte-dauer'; break;
                case 'scriptOptional':      webflowSlug = 'script'; break;
                case 'jobPostingChannel':   webflowSlug = 'job-posting'; break;
                case 'contentChannels':     webflowSlug = 'fur-welchen-kanale-wird-der-content-produziert'; break;
                case 'previewText':         webflowSlug = 'previewtext'; break;
                case 'brandName':           webflowSlug = 'brand-name'; break;
                case 'contactMail':         webflowSlug = 'contact-mail'; break;
                case 'barterDealToggle':    webflowSlug = 'barter-deal'; break;
                case 'plusJobToggle':       webflowSlug = 'plus-job'; break;
                case 'jobImageUpload':      webflowSlug = 'job-image'; break; // Erwartet eine Bild-URL oder ein Asset-Objekt
                case 'industryCategory':    webflowSlug = 'industrie-kategorie'; break;
                case 'followerRange':       webflowSlug = 'creator-follower'; break;
                case 'creatorAge':          webflowSlug = 'creator-alter'; break;
                case 'videoFormat':         webflowSlug = 'format'; break;
                case 'hookCount':           webflowSlug = 'anzahl-der-hooks'; break;
                case 'subtitles':           webflowSlug = 'untertitel'; break;
                case 'webflowMemberId':     webflowSlug = 'webflow-member-id'; break;
                case 'msMemberId':          webflowSlug = 'ms-member-id'; break;
                // Für Sprachen und Länder werden die Werte unten speziell behandelt
                case 'creatorLang':         webflowSlug = 'sprache'; break;
                case 'creatorLand':         webflowSlug = 'land'; break;
                case 'jobOnline':           webflowSlug = 'job-online-bis'; break; // Annahme für das Feld "jobOnline"
                default:
                    // console.log(`Unbekanntes Feld für Webflow-Mapping: ${fieldNameKey}`);
                    return; // Nächstes Feld bearbeiten
            }

            // Werte sammeln und formatieren
            if (field.type === 'checkbox') {
                // Für Checkbox-Gruppen (Sprachen, Länder)
                if (fieldNameKey === 'creatorLang' || fieldNameKey === 'creatorLand') {
                    if (!webflowPayload[webflowSlug]) {
                        webflowPayload[webflowSlug] = [];
                    }
                    if (field.checked) {
                        webflowPayload[webflowSlug].push(field.value);
                    }
                } else { // Für einzelne Boolean-Checkboxes
                    value = field.checked;
                    webflowPayload[webflowSlug] = value;
                }
            } else if (field.tagName === 'SELECT') {
                value = field.options[field.selectedIndex]?.value || field.value;
                // Wenn es ein Referenzfeld ist und du die ID sendest, ist das oft korrekt.
                // Wenn du den Text senden musst und der Wert die ID ist, brauchst du eine Mapping-Logik.
                webflowPayload[webflowSlug] = value;
            } else if (field.hasAttribute('data-datepicker') || fieldNameKey === 'jobOnline') { // jobOnline ist auch ein Datum
                const isoDate = formatToISODate(field.value.trim());
                if (isoDate) { // Nur setzen, wenn Datum gültig ist
                    webflowPayload[webflowSlug] = isoDate;
                } else if (fieldNameKey === 'jobOnline') { // Spezialfall für jobOnline
                    // Wenn jobOnline leer ist, nicht an Webflow senden, damit es dort ggf. leer bleibt
                    // oder dein Worker eine Standardlogik anwendet.
                    // Die "3 Tage" Logik ist für die *Anzeige* in der Preview, nicht unbedingt für das Senden.
                }
            } else if (field.type === 'number') {
                const numVal = field.value.trim();
                webflowPayload[webflowSlug] = numVal ? parseFloat(numVal) : null; // Sende null, wenn leer
            } else {
                value = field.value.trim();
                if (value) { // Nur nicht-leere Strings senden
                    webflowPayload[webflowSlug] = value;
                }
            }
        });

        // Checkbox-Gruppen zu kommaseparierten Strings machen (oder anpassen, falls Webflow Arrays/Multi-Ref erwartet)
        if (webflowPayload['sprache'] && Array.isArray(webflowPayload['sprache'])) {
            webflowPayload['sprache'] = webflowPayload['sprache'].join(', ');
        }
        if (webflowPayload['land'] && Array.isArray(webflowPayload['land'])) {
            webflowPayload['land'] = webflowPayload['land'].join(', ');
        }

        // Immer setzen:
        webflowPayload['admin-test'] = true;
        // Webflow setzt _archived und _draft standardmäßig auf false, wenn ein Item live erstellt wird.

        console.log('Daten für Webflow Worker (fieldData):', webflowPayload);
        return webflowPayload;
    }

    /**
     * Hauptfunktion zum Absenden des Formulars.
     * @param {Event} event - Das Submit-Event.
     */
    async function handleFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const submitButton = form.querySelector('button[type="submit"]'); // Geht davon aus, dass der Haupt-Submit-Button gemeint ist

        if (submitButton) {
            submitButton.disabled = true;
            // submitButton.value = 'Wird gesendet...'; // Für <input type="submit">
            submitButton.textContent = 'Wird gesendet...'; // Für <button>
        }
        showStatusMessage('Daten werden an Webflow übermittelt...', 'loading', form);

        const fieldDataForWebflow = collectAndFormatWebflowData(form);

        try {
            console.log('Sende an Webflow Worker:', WEBFLOW_CMS_POST_WORKER_URL, JSON.stringify({ fields: fieldDataForWebflow }));
            const response = await fetch(WEBFLOW_CMS_POST_WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    // Der Worker erwartet ein Objekt mit einem 'fields'-Schlüssel
                    fields: fieldDataForWebflow
                    // Die Collection ID ist im Worker fest codiert: '6448faf9c5a8a17455c05525'
                })
            });

            const responseData = await response.json();

            if (!response.ok) {
                console.error('Fehler vom Webflow Worker:', response.status, responseData);
                let errorMessage = `Fehler beim Erstellen des Jobs in Webflow (${response.status}).`;
                if (responseData && (responseData.error || responseData.msg || responseData.message)) {
                    errorMessage += ` Details: ${responseData.error || responseData.msg || responseData.message}`;
                    if(responseData.problems) errorMessage += ` Probleme: ${responseData.problems.join(', ')}`;
                }
                throw new Error(errorMessage);
            }

            console.log('Antwort vom Webflow Worker:', responseData);
            const webflowItemId = responseData.id; // Webflow API gibt das Item-Objekt zurück, 'id' ist die Item-ID

            if (!webflowItemId) {
                throw new Error('Webflow Item ID nicht in der Antwort des Workers gefunden.');
            }

            showStatusMessage('Job erfolgreich in Webflow erstellt! ID: ' + webflowItemId, 'success', form);
            // Hier könnte der Aufruf zum Airtable-Worker folgen, sobald Webflow erfolgreich war.
            // form.reset(); // Optional

            if (submitButton) {
                // submitButton.disabled = false; // Deaktiviert lassen nach Erfolg oder weiterleiten
                submitButton.textContent = 'Erfolgreich gesendet!';
            }

        } catch (error) {
            console.error('Fehler beim Absenden an Webflow:', error);
            showStatusMessage(`Fehler: ${error.message}. Bitte versuche es später erneut oder kontaktiere den Support.`, 'error', form);
            if (submitButton) {
                submitButton.disabled = false;
                // submitButton.value = 'Absenden';
                submitButton.textContent = 'Absenden fehlgeschlagen';
            }
        }
    }

    /**
     * Initialisierung, wenn das DOM geladen ist.
     */
    document.addEventListener('DOMContentLoaded', () => {
        const mainForm = document.getElementById(MAIN_FORM_ID);
        if (mainForm) {
            // Stelle sicher, dass der Event-Listener nur einmal hinzugefügt wird.
            // Falls dieses Skript mehrmals geladen wird (unwahrscheinlich bei korrekter Einbindung),
            // könnte man hier eine Prüfung einbauen.
            mainForm.removeEventListener('submit', handleFormSubmit); // Vorsichtshalber entfernen
            mainForm.addEventListener('submit', handleFormSubmit);
            console.log(`Form Submission Handler initialisiert für Formular: #${MAIN_FORM_ID}`);
        } else {
            console.warn(`Hauptformular mit ID "${MAIN_FORM_ID}" nicht gefunden. Der Submission Handler ist nicht aktiv.`);
        }
    });

})();
