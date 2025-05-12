// form-submission-handler.js

(function() {
    'use strict';

    // --- Konfiguration ---
    const WEBFLOW_WORKER_URL = 'https://bewerbungen.oliver-258.workers.dev/';
    // Die ID deines Haupt-Formular-Elements (das alle Schritte umschließt)
    // Dieses Attribut muss an deinem <form>-Tag im Webflow Designer gesetzt sein.
    const MAIN_FORM_ID = 'wf-form-post-job-form'; // Bitte anpassen, falls deine Form-ID anders lautet!

    // Data-Attribut, das wir verwenden, um die Werte aus den Formularfeldern zu lesen
    const DATA_FIELD_ATTRIBUTE = 'data-preview-field';


    // --- Hilfsfunktionen ---
    const find = (selector, element = document) => element.querySelector(selector);
    const findAll = (selector, element = document) => element.querySelectorAll(selector);
    const addClass = (element, className) => element?.classList.add(className);
    const removeClass = (element, className) => element?.classList.remove(className);
    const CLASS_HIDE = 'hide'; // Wiederverwendung der Klasse aus dem Multi-Step-Skript

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
            // Füge die Nachricht am Ende des Formulars oder an einer geeigneten Stelle ein
            formElement.appendChild(messageElement);
        }

        messageElement.textContent = message;
        messageElement.className = `form-submission-status status-${type}`; // z.B. status-success, status-error

        // Stelle sicher, dass die Nachricht sichtbar ist
        // Du könntest hier auch komplexere Logik für das Ein-/Ausblenden haben
        messageElement.style.display = 'block';
        messageElement.style.padding = '10px';
        messageElement.style.marginTop = '15px';
        messageElement.style.borderRadius = '5px';
        messageElement.style.textAlign = 'center';

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
     * Webflow erwartet oft dieses Format für Datumsfelder.
     * @param {string} dateString - Das Datum als String (z.B. "DD.MM.YYYY" oder "YYYY-MM-DD").
     * @returns {string|null} - Das Datum als ISO-String oder null bei ungültiger Eingabe.
     */
    function formatToISODate(dateString) {
        if (!dateString) return null;

        let dateObj;
        // Versuche DD.MM.YYYY zu parsen
        const deParts = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (deParts) {
            dateObj = new Date(parseInt(deParts[3]), parseInt(deParts[2]) - 1, parseInt(deParts[1]));
        } else {
            // Versuche YYYY-MM-DD oder andere von Date.parse unterstützte Formate
            dateObj = new Date(dateString);
        }

        if (isNaN(dateObj.getTime())) {
            console.warn('Ungültiges Datumsformat für ISO-Konvertierung:', dateString);
            return null; // Ungültiges Datum
        }
        return dateObj.toISOString();
    }


    /**
     * Sammelt und formatiert die Formulardaten für die Webflow API.
     * @param {HTMLFormElement} formElement - Das Formular-Element.
     * @returns {Object} - Die aufbereiteten Daten für Webflow.
     */
    function collectAndFormatWebflowData(formElement) {
        const data = {};
        const fields = findAll(`[${DATA_FIELD_ATTRIBUTE}]`, formElement);

        fields.forEach(field => {
            const fieldName = field.getAttribute(DATA_FIELD_ATTRIBUTE);
            let value;

            if (field.type === 'checkbox') {
                if (field.name.includes('Optional') || field.name.includes('Toggle')) { // Annahme für einzelne Toggles
                    value = field.checked;
                } else { // Annahme für Checkbox-Gruppen (wie Sprachen, Länder)
                    if (!data[fieldName]) {
                        data[fieldName] = []; // Initialisiere als Array, falls noch nicht geschehen
                    }
                    if (field.checked) {
                        data[fieldName].push(field.value || field.nextElementSibling?.textContent.trim());
                    }
                    return; // Verarbeitung für Checkbox-Gruppen hier beenden
                }
            } else if (field.tagName === 'SELECT') {
                value = field.options[field.selectedIndex]?.value || field.value;
                 // Für manche Referenzfelder braucht Webflow die Item-ID, nicht den Text.
                 // Dies muss ggf. hier oder im Worker angepasst werden.
            } else if (field.type === 'date' || field.hasAttribute('data-datepicker')) {
                 // Unser Custom Datepicker speichert DD.MM.YYYY, Webflow braucht ISO
                 value = formatToISODate(field.value.trim());
            } else if (field.type === 'number') {
                value = field.value.trim() ? parseFloat(field.value.trim()) : null;
            }
            else {
                value = field.value.trim();
            }

            if (value !== undefined && value !== null && value !== '') {
                 // *** WICHTIG: Hier die `fieldName` (aus data-preview-field)
                 // *** den Webflow CMS Feld-Slugs zuordnen! ***
                 // Dies ist nur ein BEISPIEL-Mapping. Du musst es anpassen!
                switch (fieldName) {
                    case 'projectName':         data['name'] = value; break; // Oder 'job-title'
                    case 'job-adress-optional': data['job-adress-optional'] = value; break; // Annahme: Rich Text oder Text
                    case 'budget':              data['job-payment'] = value; break;
                    case 'startDate':           data['job-date-start'] = value; break; // Annahme: Du hast ein Feld 'job-date-start'
                    case 'endDate':             data['job-date-end'] = value; break;
                    case 'contentDeadline':     data['fertigstellung-content'] = value; break;
                    case 'scriptDeadline':      data['job-scriptdeadline'] = value; break;
                    case 'creatorCount':        data['anzahl-gesuchte-creator'] = value; break;
                    case 'creatorCategorie':    data['art-des-contents'] = value; break; // Text oder Referenz-ID?
                    case 'lang':                data['sprache'] = value; break; // Für einzelne Sprache, wenn nicht Checkbox-Gruppe
                    case 'aufgabe':             data['deine-aufgaben'] = value; break; // Rich Text
                    case 'steckbrief':          data['job-beschreibung'] = value; break; // Rich Text
                    case 'genderOptional':      data['creator-geschlecht'] = value; break; // Referenz-ID?
                    case 'videoCountOptional':  data['anzahl-videos-2'] = value; break;
                    case 'imgCountOptional':    data['anzahl-bilder-2'] = value; break;
                    case 'videoDurationOptional': data['video-dauer'] = value; break; // Referenz-ID?
                    case 'reviewsOptional':     data['anzahl-der-reviews'] = value; break;
                    case 'durationOptional':    data['nutzungsrechte-dauer'] = value; break;
                    case 'scriptOptional':      data['script'] = value; break; // Referenz-ID?
                    case 'jobPostingChannel':   data['job-posting'] = value; break;
                    case 'contentChannels':     data['fur-welchen-kanale-wird-der-content-produziert'] = value; break;
                    case 'previewText':         data['previewtext'] = value; break;
                    case 'brandName':           data['brand-name'] = value; break;
                    case 'contactMail':         data['contact-mail'] = value; break;
                    case 'barterDealToggle':    data['barter-deal'] = value; break;
                    case 'plusJobToggle':       data['plus-job'] = value; break;
                    case 'jobImageUpload':      data['job-image'] = value; break; // URL des Bildes
                    case 'industryCategory':    data['industrie-kategorie'] = value; break;
                    case 'followerRange':       data['creator-follower'] = value; break; // Referenz-ID?
                    case 'creatorAge':          data['creator-alter'] = value; break; // Referenz-ID?
                    case 'videoFormat':         data['format'] = value; break; // Referenz-ID?
                    case 'hookCount':           data['anzahl-der-hooks'] = value; break; // Referenz-ID?
                    case 'subtitles':           data['untertitel'] = value; break; // Referenz-ID?
                    // Füge hier weitere Felder hinzu...

                    // Felder, die direkt aus Hidden Fields kommen (Beispiel)
                    case 'webflowMemberId':     data['webflow-member-id'] = value; break;
                    case 'msMemberId':          data['ms-member-id'] = value; break;
                    default:
                        // Optional: Unbekannte Felder loggen oder ignorieren
                        // console.log(`Unbekanntes Feld für Webflow-Mapping: ${fieldName}`);
                        break;
                }
            }
        });

        // Spezifische Behandlung für Checkbox-Gruppen (Sprachen, Länder)
        // Diese werden als kommaseparierte Strings oder Array von IDs gesendet, je nachdem was dein Worker erwartet.
        // Annahme hier: kommaseparierter String für Webflow Textfelder
        const creatorLangValues = data['creatorLang']; // data['creatorLang'] ist jetzt ein Array
        if (Array.isArray(creatorLangValues) && creatorLangValues.length > 0) {
            data['sprache'] = creatorLangValues.join(', '); // Webflow Feld-Slug für Sprachen
        } else if (creatorLangValues) { // Falls es nur ein Wert war (sollte nicht passieren bei Checkbox-Gruppe)
             data['sprache'] = creatorLangValues;
        }
        delete data['creatorLang']; // Entferne das temporäre Array

        const creatorLandValues = data['creatorLand'];
        if (Array.isArray(creatorLandValues) && creatorLandValues.length > 0) {
            data['land'] = creatorLandValues.join(', '); // Webflow Feld-Slug für Länder
        } else if (creatorLandValues) {
            data['land'] = creatorLandValues;
        }
        delete data['creatorLand'];

        // Immer setzen:
        data['admin-test'] = true;
        // data['_archived'] = false; // Webflow setzt dies standardmäßig
        // data['_draft'] = false;    // Webflow setzt dies standardmäßig, wenn live veröffentlicht wird

        console.log('Daten für Webflow Worker:', data); // DEBUG
        return data;
    }


    /**
     * Hauptfunktion zum Absenden des Formulars.
     * @param {Event} event - Das Submit-Event.
     */
    async function handleFormSubmit(event) {
        event.preventDefault(); // Standard-Submit verhindern
        const form = event.target;
        const submitButton = form.querySelector('input[type="submit"], button[type="submit"]'); // Finde den Submit-Button im Formular

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.value = 'Wird gesendet...'; // Für <input type="submit">
            // submitButton.textContent = 'Wird gesendet...'; // Für <button>
        }
        showStatusMessage('Daten werden an Webflow übermittelt...', 'loading', form);

        const webflowData = collectAndFormatWebflowData(form);

        try {
            console.log('Sende an Webflow Worker:', WEBFLOW_WORKER_URL, JSON.stringify({ fields: webflowData }));
            const response = await fetch(WEBFLOW_WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Füge hier ggf. weitere Header hinzu, die dein Worker erwartet (z.B. Auth-Token für den Worker selbst)
                },
                body: JSON.stringify({
                    // Die Webflow API zum Erstellen von Items erwartet ein "fields"-Objekt.
                    // Dein Worker muss dies entsprechend verarbeiten.
                    // Passe dies an, falls dein Worker eine andere Body-Struktur erwartet.
                    fields: webflowData
                    // Ggf. noch die Collection ID, falls der Worker sie nicht fest codiert hat:
                    // collectionId: 'DEINE_WEBFLOW_COLLECTION_ID'
                })
            });

            const responseData = await response.json(); // Versuche immer, JSON zu parsen

            if (!response.ok) {
                console.error('Fehler vom Webflow Worker:', response.status, responseData);
                let errorMessage = `Fehler beim Erstellen des Jobs in Webflow (${response.status}).`;
                if (responseData && responseData.error) {
                    errorMessage += ` Details: ${responseData.error}`;
                } else if (responseData && responseData.msg) { // Webflow API Fehlerformat
                    errorMessage += ` Details: ${responseData.msg}`;
                    if(responseData.problems) errorMessage += ` Probleme: ${responseData.problems.join(', ')}`;
                }
                throw new Error(errorMessage);
            }

            console.log('Antwort vom Webflow Worker:', responseData);
            const webflowItemId = responseData.id; // Annahme: Worker gibt die ID des neuen Items zurück

            if (!webflowItemId) {
                throw new Error('Webflow Item ID nicht in der Antwort des Workers gefunden.');
            }

            showStatusMessage('Job erfolgreich in Webflow erstellt! ID: ' + webflowItemId + '. Nächster Schritt: Airtable...', 'success', form);

            // HIER WÜRDE DER AUFRUF ZUM AIRTABLE-WORKER FOLGEN
            // Für jetzt beenden wir hier mit Erfolg für Webflow.
            // form.reset(); // Optional: Formular zurücksetzen
            // UI-Feedback für finalen Erfolg (wenn Airtable auch klappt)

            if (submitButton) {
                submitButton.disabled = false;
                submitButton.value = 'Absenden'; // Zurücksetzen
                // submitButton.textContent = 'Absenden';
            }


        } catch (error) {
            console.error('Fehler beim Absenden an Webflow:', error);
            showStatusMessage(`Fehler: ${error.message}. Bitte versuche es später erneut oder kontaktiere den Support.`, 'error', form);
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.value = 'Absenden'; // Zurücksetzen
                // submitButton.textContent = 'Absenden';
            }
        }
    }


    /**
     * Initialisierung, wenn das DOM geladen ist.
     */
    document.addEventListener('DOMContentLoaded', () => {
        const mainForm = document.getElementById(MAIN_FORM_ID);
        if (mainForm) {
            mainForm.addEventListener('submit', handleFormSubmit);
            console.log(`Form Submission Handler initialisiert für Formular: #${MAIN_FORM_ID}`);
        } else {
            console.warn(`Hauptformular mit ID "${MAIN_FORM_ID}" nicht gefunden. Der Submission Handler ist nicht aktiv.`);
        }
    });

})();
