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

    const CLASS_ACTIVE_STEP = 'active'; // CSS-Klasse für den aktiven Schritt
    const CLASS_ACTIVE_INDICATOR = 'active'; // CSS-Klasse für den aktiven Indikator
    const CLASS_HIDDEN = 'hidden'; // CSS-Klasse zum Ausblenden von Elementen (z.B. Buttons)

    /**
     * ------------------------------------------------------------------------
     * Helper Functions (Potenzielles Modul: domUtils.js)
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
     * Core Logic (Potenzielles Modul: MultiStepForm.js)
     * ------------------------------------------------------------------------
     */
    class MultiStepForm {
        constructor(formElement) {
            this.form = formElement;
            this.steps = Array.from(findAll(`[${DATA_ATTR_STEP}]`, this.form)); // Schritte als Array
            this.indicatorContainer = find(`[${DATA_ATTR_INDICATOR_CONTAINER}]`, this.form);
            this.indicators = this.indicatorContainer ? Array.from(findAll(`[${DATA_ATTR_INDICATOR}]`, this.indicatorContainer)) : [];
            this.nextButton = find(`[${DATA_ATTR_NEXT_BTN}]`, this.form);
            this.prevButton = find(`[${DATA_ATTR_PREV_BTN}]`, this.form);
            this.submitButton = find(`[${DATA_ATTR_SUBMIT_BTN}]`, this.form);

            this.currentStepIndex = 0; // Startet beim ersten Schritt (Index 0)
            this.totalSteps = this.steps.length;

            if (this.totalSteps === 0) {
                console.warn('MultiStepForm: No steps found in form:', this.form.id || this.form);
                return; // Keine Schritte, nichts zu tun
            }

            // Validierung: Prüfen, ob Indikatorenanzahl mit Schrittanzahl übereinstimmt (optional)
            if (this.indicators.length > 0 && this.indicators.length !== this.totalSteps) {
                console.warn(`MultiStepForm (${this.form.id || 'form'}): Number of steps (${this.totalSteps}) does not match number of indicators (${this.indicators.length}).`);
            }
        }

        // Initialisiert das Formular
        init() {
            this.addEventListeners();
            this.goToStep(0); // Gehe zum ersten Schritt
        }

        // Fügt Event Listener zu den Buttons hinzu
        addEventListeners() {
            this.nextButton?.addEventListener('click', () => this.goToNextStep());
            this.prevButton?.addEventListener('click', () => this.goToPreviousStep());
            // Optional: Submit-Handler (Standard-Formular-Submit wird verwendet, wenn type="submit")
            // this.submitButton?.addEventListener('click', (e) => this.handleSubmit(e));
        }

        // Geht zum nächsten Schritt
        goToNextStep() {
            if (this.currentStepIndex < this.totalSteps - 1) {
                // Optional: Validierung des aktuellen Schritts vor dem Weitergehen
                // if (!this.validateStep(this.currentStepIndex)) {
                //     console.log("Validation failed for step", this.currentStepIndex + 1);
                //     return; // Bleibe beim aktuellen Schritt, wenn Validierung fehlschlägt
                // }
                this.goToStep(this.currentStepIndex + 1);
            }
        }

        // Geht zum vorherigen Schritt
        goToPreviousStep() {
            if (this.currentStepIndex > 0) {
                this.goToStep(this.currentStepIndex - 1);
            }
        }

        // Wechselt zu einem bestimmten Schritt (Index basiert)
        goToStep(stepIndex) {
            if (stepIndex < 0 || stepIndex >= this.totalSteps) {
                console.error('MultiStepForm: Invalid step index:', stepIndex);
                return;
            }

            this.currentStepIndex = stepIndex;

            // Alle Schritte ausblenden und aktiven Schritt anzeigen
            this.steps.forEach((step, index) => {
                if (index === this.currentStepIndex) {
                    addClass(step, CLASS_ACTIVE_STEP);
                } else {
                    removeClass(step, CLASS_ACTIVE_STEP);
                }
            });

            // Indikatoren aktualisieren
            this.updateIndicators();

            // Button-Sichtbarkeit aktualisieren
            this.updateButtonStates();
        }

        // Aktualisiert die visuellen Zustände der Indikatoren
        updateIndicators() {
            this.indicators.forEach((indicator, index) => {
                // Prüfen, ob der Indikator dem aktuellen Schritt entspricht
                // (Verwendet data-step-indicator Wert, falls vorhanden und numerisch, sonst Index)
                const indicatorStep = parseInt(indicator.getAttribute(DATA_ATTR_INDICATOR), 10);
                const targetStepNumber = this.currentStepIndex + 1; // Schrittnummer ist Index + 1

                if (!isNaN(indicatorStep) && indicatorStep === targetStepNumber || isNaN(indicatorStep) && index === this.currentStepIndex) {
                     addClass(indicator, CLASS_ACTIVE_INDICATOR);
                } else {
                     removeClass(indicator, CLASS_ACTIVE_INDICATOR);
                }
            });
        }

        // Aktualisiert die Sichtbarkeit und den Zustand der Navigationsbuttons
        updateButtonStates() {
            // Zurück-Button: Ausblenden auf dem ersten Schritt
            if (this.prevButton) {
                this.currentStepIndex === 0 ? hideElement(this.prevButton) : showElement(this.prevButton);
            }

            // Weiter-Button: Ausblenden auf dem letzten Schritt
            if (this.nextButton) {
                this.currentStepIndex === this.totalSteps - 1 ? hideElement(this.nextButton) : showElement(this.nextButton);
            }

            // Senden-Button: Nur auf dem letzten Schritt anzeigen
            if (this.submitButton) {
                 this.currentStepIndex === this.totalSteps - 1 ? showElement(this.submitButton) : hideElement(this.submitButton);
            }
        }

        // Optional: Validierungslogik für einen Schritt
        // validateStep(stepIndex) {
        //     const stepElement = this.steps[stepIndex];
        //     const inputs = findAll('input[required], select[required], textarea[required]', stepElement);
        //     let isValid = true;
        //     inputs.forEach(input => {
        //         if (!input.checkValidity()) {
        //             isValid = false;
        //             // Optional: Fehlermeldung anzeigen oder Feld hervorheben
        //             input.reportValidity(); // Zeigt die Standard-Browser-Validierungsmeldung
        //         }
        //     });
        //     return isValid;
        // }

        // Optional: Eigene Logik beim Absenden
        // handleSubmit(event) {
        //     console.log('Form submitted!', this.form.id);
        //     // Verhindern des Standard-Submits, wenn AJAX oder ähnliches verwendet wird
        //     // event.preventDefault();
        // }
    }

    /**
     * ------------------------------------------------------------------------
     * Initialization (Hauptteil des IIFE)
     * ------------------------------------------------------------------------
     */
    // Warten, bis das DOM vollständig geladen ist
    document.addEventListener('DOMContentLoaded', () => {
        // Alle Formulare finden, die das Haupt-Attribut haben
        const multiStepForms = findAll(`[${DATA_ATTR_FORM}]`);

        if (multiStepForms.length === 0) {
            console.info('MultiStepForm: No forms with attribute ' + DATA_ATTR_FORM + ' found.');
            return;
        }

        // Für jedes gefundene Formular eine Instanz der Klasse erstellen und initialisieren
        multiStepForms.forEach(formElement => {
            try {
                new MultiStepForm(formElement).init();
                console.log(`MultiStepForm initialized for: #${formElement.id || 'form without id'}`);
            } catch (error) {
                 console.error(`Failed to initialize MultiStepForm for: #${formElement.id || 'form without id'}`, error);
            }
        });
    });

})(); // Ende der IIFE
