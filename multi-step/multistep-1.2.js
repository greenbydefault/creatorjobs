(function() {
    'use strict';

    /**
     * ------------------------------------------------------------------------
     * Constants
     * ------------------------------------------------------------------------
     */
    const DATA_ATTR_FORM = 'data-multistep-form';
    const DATA_ATTR_STEP = 'data-step';
    const DATA_ATTR_INDICATOR_CONTAINER = 'data-step-indicator-container';
    const DATA_ATTR_INDICATOR = 'data-step-indicator';
    const DATA_ATTR_NEXT_BTN = 'data-multistep-next';
    const DATA_ATTR_PREV_BTN = 'data-multistep-prev';
    const DATA_ATTR_SUBMIT_BTN = 'data-multistep-submit';
    // Neu für Guide
    const DATA_ATTR_GUIDE_CONTAINER = 'data-step-guide-container';
    const DATA_ATTR_GUIDE = 'data-step-guide';


    // CSS classes
    const CLASS_ACTIVE_STEP = 'active'; // Optional für Step-Styling
    const CLASS_ACTIVE_INDICATOR = 'active';
    const CLASS_HIDDEN = 'hidden'; // Für Buttons
    const CLASS_INPUT_ERROR = 'input-error'; // Für Validierungsfehler
    // Neu für Guide Fade Effekt
    const CLASS_GUIDE_VISIBLE = 'visible'; // Macht Guide sichtbar und löst Fade-In aus


    /**
     * ------------------------------------------------------------------------
     * Helper Functions
     * ------------------------------------------------------------------------
     */
    const find = (selector, element = document) => element.querySelector(selector);
    const findAll = (selector, element = document) => element.querySelectorAll(selector);
    const addClass = (element, className) => element?.classList.add(className);
    const removeClass = (element, className) => element?.classList.remove(className);
    const showElement = (element) => removeClass(element, CLASS_HIDDEN);
    const hideElement = (element) => addClass(element, CLASS_HIDDEN);

    /**
     * ------------------------------------------------------------------------
     * Core Logic: MultiStepForm Class
     * ------------------------------------------------------------------------
     */
    class MultiStepForm {
        constructor(formElement) {
            this.form = formElement;
            // Finde Elemente innerhalb des Formulars
            this.steps = Array.from(findAll(`[${DATA_ATTR_STEP}]`, this.form));
            this.indicatorContainer = find(`[${DATA_ATTR_INDICATOR_CONTAINER}]`, this.form);
            this.indicators = this.indicatorContainer ? Array.from(findAll(`[${DATA_ATTR_INDICATOR}]`, this.indicatorContainer)) : [];
            this.nextButton = find(`[${DATA_ATTR_NEXT_BTN}]`, this.form);
            this.prevButton = find(`[${DATA_ATTR_PREV_BTN}]`, this.form);
            this.submitButton = find(`[${DATA_ATTR_SUBMIT_BTN}]`, this.form);

            // Finde Guide-Elemente (können außerhalb des <form> Tags sein, suchen im document)
            // Wichtig: Geht davon aus, dass der Guide-Container relativ zum Formular gefunden werden kann
            // oder eindeutig im Dokument ist. Hier wird im ganzen Dokument gesucht.
            // Besser: Guide-Container eine ID geben und gezielt suchen oder relativ zum Formular finden.
            this.guideContainer = find(`[${DATA_ATTR_GUIDE_CONTAINER}]`); // Sucht global
            this.guides = this.guideContainer ? Array.from(findAll(`[${DATA_ATTR_GUIDE}]`, this.guideContainer)) : [];


            this.currentStepIndex = 0;
            this.totalSteps = this.steps.length;

            if (this.totalSteps === 0) {
                console.warn('MultiStepForm: No steps found in form:', this.form.id || this.form);
                return;
            }
            // Warnungen für inkonsistente Anzahlen
            if (this.guides.length > 0 && this.guides.length !== this.totalSteps) {
                 console.warn(`MultiStepForm (${this.form.id || 'form'}): Number of steps (${this.totalSteps}) does not match number of guides (${this.guides.length}). Ensure each step has a corresponding guide element with [${DATA_ATTR_GUIDE}].`);
            }
            if (this.indicators.length > 0 && this.indicators.length !== this.totalSteps) {
                console.warn(`MultiStepForm (${this.form.id || 'form'}): Number of steps (${this.totalSteps}) does not match number of indicators (${this.indicators.length}).`);
            }

             // Initialer Zustand: Nur erster Schritt und erster Guide sichtbar
             this.steps.forEach((step, index) => {
                step.style.display = index === 0 ? 'block' : 'none';
                index === 0 ? addClass(step, CLASS_ACTIVE_STEP) : removeClass(step, CLASS_ACTIVE_STEP);
            });
            this.guides.forEach((guide, index) => {
                 // Verwende die data-step-guide Nummer zum Abgleich
                 const guideStepNumber = parseInt(guide.getAttribute(DATA_ATTR_GUIDE), 10);
                 const targetStepNumber = 1; // Erster Schritt

                 // Prüfe ob die Guide-Nummer mit dem ersten Schritt übereinstimmt ODER
                 // (als Fallback) ob der Index 0 ist, falls keine Nummer angegeben wurde.
                 if (!isNaN(guideStepNumber) && guideStepNumber === targetStepNumber || isNaN(guideStepNumber) && index === 0) {
                     // Mache den ersten Guide direkt sichtbar (ohne Fade-In beim Laden)
                     guide.style.display = 'block';
                     guide.style.opacity = '1'; // Direkt sichtbar machen
                     addClass(guide, CLASS_GUIDE_VISIBLE); // Klasse für Konsistenz setzen
                 } else {
                     // Andere Guides initial verstecken
                     removeClass(guide, CLASS_GUIDE_VISIBLE);
                     guide.style.display = 'none';
                     guide.style.opacity = '0'; // Sicherstellen, dass Opacity 0 ist
                 }
            });
        }

        init() {
            this.addEventListeners();
            // Rufe goToStep(0) auf, um sicherzustellen, dass Buttons initial korrekt sind
            this.goToStep(0);
        }

        addEventListeners() {
            this.nextButton?.addEventListener('click', () => this.goToNextStep());
            this.prevButton?.addEventListener('click', () => this.goToPreviousStep());
            this.form.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
                    // Verhindern, wenn Enter gedrückt wird und es nicht der Submit-Button ist oder dieser versteckt ist
                    if (document.activeElement !== this.submitButton || this.submitButton?.classList.contains(CLASS_HIDDEN)) {
                        event.preventDefault();
                        // Wenn der Weiter-Button sichtbar ist, löse dessen Aktion aus
                        if (this.nextButton && !this.nextButton.classList.contains(CLASS_HIDDEN)) {
                           this.goToNextStep();
                        }
                    }
                    // Wenn Enter auf dem Submit-Button gedrückt wird, wird das Formular normal abgeschickt (kein preventDefault)
                }
            });
        }

        goToNextStep() {
             // 1. Validieren
             if (!this.validateStep(this.currentStepIndex)) {
                 console.log("Validation failed for step", this.currentStepIndex + 1);
                 const firstInvalid = find(':invalid', this.steps[this.currentStepIndex]);
                 firstInvalid?.focus(); // Fokus auf erstes ungültiges Feld
                 return; // Abbrechen
             }
             // 2. Zum nächsten Schritt gehen, wenn nicht der letzte
            if (this.currentStepIndex < this.totalSteps - 1) {
                this.goToStep(this.currentStepIndex + 1);
            }
        }

        goToPreviousStep() {
            // Zum vorherigen Schritt gehen, wenn nicht der erste
            if (this.currentStepIndex > 0) {
                this.goToStep(this.currentStepIndex - 1);
            }
        }

        goToStep(stepIndex) {
            if (stepIndex < 0 || stepIndex >= this.totalSteps) {
                console.error('MultiStepForm: Invalid step index:', stepIndex);
                return;
            }

            // Alten Index speichern für Guide-Handling
            const previousStepIndex = this.currentStepIndex;
            this.currentStepIndex = stepIndex;
            const targetStepNumber = this.currentStepIndex + 1; // Schrittnummer (1-basiert)

            // Schritte aktualisieren (Sichtbarkeit & Klasse)
            this.steps.forEach((step, index) => {
                if (index === this.currentStepIndex) {
                    step.style.display = 'block'; // Aktiven anzeigen
                    addClass(step, CLASS_ACTIVE_STEP);
                } else {
                    step.style.display = 'none'; // Andere verstecken
                    removeClass(step, CLASS_ACTIVE_STEP);
                }
            });

            // Guides aktualisieren (Fade-Effekt)
            this.updateGuides(targetStepNumber);

            // Indikatoren aktualisieren
            this.updateIndicators();

            // Button-Sichtbarkeit aktualisieren
            this.updateButtonStates();
        }

        // Methode zum Aktualisieren der Guides mit Fade
        updateGuides(targetStepNumber) {
             this.guides.forEach((guide) => {
                const guideStep = parseInt(guide.getAttribute(DATA_ATTR_GUIDE), 10);
                const isTargetGuide = !isNaN(guideStep) && guideStep === targetStepNumber;

                // Ziel-Guide: Sichtbar machen und Fade-In
                if (isTargetGuide) {
                    // Falls es schon sichtbar ist (z.B. durch zurück/vor), nichts tun
                    if (guide.classList.contains(CLASS_GUIDE_VISIBLE)) return;

                    // Erst display ändern, dann opacity für den Fade-In
                    guide.style.display = 'block';
                    // requestAnimationFrame stellt sicher, dass Browser 'display: block' gerendert hat
                    requestAnimationFrame(() => {
                        // Kurze Verzögerung kann manchmal helfen, falls rAF nicht reicht
                        setTimeout(() => {
                            addClass(guide, CLASS_GUIDE_VISIBLE); // Löst Transition aus (opacity 0 -> 1)
                        }, 10); // Kleine Verzögerung
                    });
                }
                // Nicht-Ziel-Guide: Fade-Out und dann verstecken
                else {
                     // Wenn es schon versteckt ist, nichts tun
                    if (!guide.classList.contains(CLASS_GUIDE_VISIBLE) && guide.style.display === 'none') return;

                    // Fade-Out auslösen
                    removeClass(guide, CLASS_GUIDE_VISIBLE); // Löst Transition aus (opacity 1 -> 0)

                     // Callback definieren, der nach der Transition aufgerufen wird
                     const onFadeOutComplete = () => {
                        // Nur verstecken, wenn es immer noch nicht der sichtbare Guide sein soll
                        if (!guide.classList.contains(CLASS_GUIDE_VISIBLE)) {
                             guide.style.display = 'none';
                        }
                        // Event Listener entfernen, um Memory Leaks zu vermeiden
                        guide.removeEventListener('transitionend', onFadeOutComplete);
                     };

                     // Event Listener hinzufügen
                     guide.addEventListener('transitionend', onFadeOutComplete);

                     // Sicherheitsnetz: Falls keine Transition stattfindet (z.B. Element war schon opacity 0),
                     // verstecke es nach der erwarteten Transitionsdauer manuell.
                     // Hole die Dauer aus dem CSS (vereinfacht hier: nehme den Wert aus dem CSS an)
                     const transitionDuration = 400; // Muss mit CSS übereinstimmen (0.4s)
                     setTimeout(() => {
                        // Prüfe erneut, ob es immer noch versteckt sein soll
                         if (!guide.classList.contains(CLASS_GUIDE_VISIBLE)) {
                             guide.style.display = 'none';
                         }
                         // Entferne den Listener auch hier, falls transitionend nie gefeuert hat
                         guide.removeEventListener('transitionend', onFadeOutComplete);
                     }, transitionDuration);
                }
            });
        }


        updateIndicators() {
            const targetStepNumber = this.currentStepIndex + 1;
            this.indicators.forEach((indicator, index) => {
                const indicatorStep = parseInt(indicator.getAttribute(DATA_ATTR_INDICATOR), 10);
                // Prüfe Nummer ODER Index als Fallback
                if (!isNaN(indicatorStep) && indicatorStep === targetStepNumber || isNaN(indicatorStep) && index === this.currentStepIndex) {
                     addClass(indicator, CLASS_ACTIVE_INDICATOR);
                } else {
                     removeClass(indicator, CLASS_ACTIVE_INDICATOR);
                }
            });
        }

        updateButtonStates() {
            // Zurück-Button: Sichtbar ab Schritt 2 (Index 1)
            if (this.prevButton) {
                this.currentStepIndex === 0 ? hideElement(this.prevButton) : showElement(this.prevButton);
            }
            // Weiter-Button: Sichtbar bis zum vorletzten Schritt
            if (this.nextButton) {
                this.currentStepIndex === this.totalSteps - 1 ? hideElement(this.nextButton) : showElement(this.nextButton);
            }
            // Senden-Button: Nur im letzten Schritt sichtbar
            if (this.submitButton) {
                 this.currentStepIndex === this.totalSteps - 1 ? showElement(this.submitButton) : hideElement(this.submitButton);
            }
        }

        validateStep(stepIndex) {
            const currentStepElement = this.steps[stepIndex];
            if (!currentStepElement) return false; // Schritt nicht gefunden
            // Finde alle erforderlichen Inputs, Selects, Textareas im aktuellen Schritt
            const requiredInputs = findAll('input[required], select[required], textarea[required]', currentStepElement);
            let isStepValid = true;

            requiredInputs.forEach(input => {
                removeClass(input, CLASS_INPUT_ERROR); // Fehlerklasse entfernen
                // HTML5 Validierung nutzen
                if (!input.checkValidity()) {
                    isStepValid = false;
                    addClass(input, CLASS_INPUT_ERROR); // Fehlerklasse hinzufügen
                }
            });

             // Wenn ungültig, zeige die Browser-Meldung für das *erste* ungültige Feld
             if (!isStepValid) {
                 const firstInvalid = find(':invalid', currentStepElement);
                 firstInvalid?.reportValidity(); // Zeigt die native Browser-Validierungs-Bubble
             }
            return isStepValid;
        }
    }

    /**
     * ------------------------------------------------------------------------
     * Initialization
     * ------------------------------------------------------------------------
     */
    document.addEventListener('DOMContentLoaded', () => {
        // Finde alle Formulare, die als Multi-Step markiert sind
        const multiStepForms = findAll(`[${DATA_ATTR_FORM}]`);
        if (multiStepForms.length === 0) {
            console.info('MultiStepForm: No forms with attribute ' + DATA_ATTR_FORM + ' found.');
            return;
        }
        // Initialisiere jedes gefundene Formular
        multiStepForms.forEach(formElement => {
            try {
                // Prüfe, ob ein Guide-Container existiert, bevor initialisiert wird
                // (Geht davon aus, dass ein Formular einen Guide haben *könnte*)
                // Wenn kein Guide-Container da ist, wird das Formular trotzdem initialisiert.
                new MultiStepForm(formElement).init();
                console.log(`MultiStepForm initialized for: #${formElement.id || 'form without id'}`);

            } catch (error) {
                 console.error(`Failed to initialize MultiStepForm for: #${formElement.id || 'form without id'}`, error);
            }
        });
    });

})(); // Ende der IIFE
