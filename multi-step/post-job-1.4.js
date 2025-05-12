// form-submission-handler.js
// Dieses Skript ist verantwortlich für das Sammeln der Formulardaten
// und das Senden an den Webflow CMS Worker.
// AKTUELLE VERSION: Sendet nur 'name', 'slug' und 'admin-test' zum Testen.

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
     * Sammelt und formatiert die minimalen Formulardaten (name, slug) für die Webflow API.
     * @param {HTMLFormElement} formElement - Das Formular-Element.
     * @returns {Object} - Die aufbereiteten Daten für Webflow im 'fieldData' Format.
     */
    function collectAndFormatWebflowData(formElement) {
        const webflowPayload = {}; // Dieses Objekt wird die `fieldData` für Webflow enthalten
        const fields = findAll(`[${DATA_FIELD_ATTRIBUTE}]`, formElement);
        let projectNameValue = ''; // Speichere den Projektnamen für die Slug-Generierung
        let jobSlugValue = ''; // Speichere einen explizit gesetzten Slug, falls vorhanden

        fields.forEach(field => {
            const fieldNameKey = field.getAttribute(DATA_FIELD_ATTRIBUTE); // Das ist der Schlüssel aus deinem Formular

            // Sammle nur die relevanten Felder für diesen Test
            if (fieldNameKey === 'projectName') {
                projectNameValue = field.value.trim();
                webflowPayload['name'] = projectNameValue;
            } else if (fieldNameKey === 'jobSlug') { // Falls ein explizites Slug-Feld existiert
                 jobSlugValue = field.value.trim();
                 webflowPayload['slug'] = jobSlugValue;
            }
            // Alle anderen Felder werden ignoriert
        });

        // Füge den Slug hinzu, generiert aus dem Projektnamen, falls noch kein expliziter Slug gesammelt wurde
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

        // Prüfe, ob der Slug generiert wurde (falls erforderlich) und der Name vorhanden ist
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
            const response = await fetch(WEBFLOW_CMS_POST_WORKER_URL, { // <-- Hier wurde der Tippfehler korrigiert
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
            console.warn(`Hauptformular mit ID "${MAIN_FORM_ID}" nicht gefunden. Der Submission Handler ist nicht aktiv.`);
        }
    });

})();
