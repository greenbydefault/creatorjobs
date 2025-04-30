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

    // CSS classes remain useful for indicators and potentially other styling
    const CLASS_ACTIVE_STEP = 'active'; // CSS-Klasse für den aktiven Schritt (optional für Styling)
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

             // Ensure initial state hides all steps except the first one (if JS is enabled)
             this.steps.forEach((step, index) => {
                step.style.display = index === 0 ? 'block' : 'none';
                if (index === 0) {
                    addClass(step, CLASS_ACTIVE_STEP); // Add active class to the first step initially
                } else {
                    removeClass(step, CLASS_ACTIVE_STEP);
                }
            });
        }

        // Initialisiert das Formular
        init() {
            this.addEventListeners();
            this.goToStep(0); // Gehe zum ersten Schritt (stellt sicher, dass Indikatoren/Buttons korrekt sind)
        }

        // Fügt Event Listener zu den Buttons hinzu
        addEventListeners() {
            this.nextButton?.addEventListener('click', () => this.goToNextStep());
            this.prevButton?.addEventListener('click', () => this.goToPreviousStep());
        }

        // Geht zum nächsten Schritt
        goToNextStep() {
            if (this.currentStepIndex < this.totalSteps - 1) {
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

            // Alle Schritte durchlaufen: Aktiven anzeigen, andere ausblenden (direkt über style.display)
            // Die active-Klasse wird trotzdem gesetzt/entfernt für Indikatoren/Styling.
            this.steps.forEach((step, index) => {
                if (index === this.currentStepIndex) {
                    step.style.display = 'block'; // Aktiven Schritt direkt anzeigen
                    addClass(step, CLASS_ACTIVE_STEP); // Klasse für optionales Styling/Indikatoren hinzufügen
                } else {
                    step.style.display = 'none'; // Inaktive Schritte direkt ausblenden
                    removeClass(step, CLASS_ACTIVE_STEP); // Klasse entfernen
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
                const indicatorStep = parseInt(indicator.getAttribute(DATA_ATTR_INDICATOR), 10);
                const targetStepNumber = this.currentStepIndex + 1;

                if (!isNaN(indicatorStep) && indicatorStep === targetStepNumber || isNaN(indicatorStep) && index === this.currentStepIndex) {
                     addClass(indicator, CLASS_ACTIVE_INDICATOR);
                } else {
                     removeClass(indicator, CLASS_ACTIVE_INDICATOR);
                }
            });
        }

        // Aktualisiert die Sichtbarkeit und den Zustand der Navigationsbuttons
        updateButtonStates() {
            if (this.prevButton) {
                this.currentStepIndex === 0 ? hideElement(this.prevButton) : showElement(this.prevButton);
            }
            if (this.nextButton) {
                this.currentStepIndex === this.totalSteps - 1 ? hideElement(this.nextButton) : showElement(this.nextButton);
            }
            if (this.submitButton) {
                 this.currentStepIndex === this.totalSteps - 1 ? showElement(this.submitButton) : hideElement(this.submitButton);
            }
        }
    }

    /**
     * ------------------------------------------------------------------------
     * Initialization
     * ------------------------------------------------------------------------
     */
    document.addEventListener('DOMContentLoaded', () => {
        const multiStepForms = findAll(`[${DATA_ATTR_FORM}]`);
        if (multiStepForms.length === 0) {
            console.info('MultiStepForm: No forms with attribute ' + DATA_ATTR_FORM + ' found.');
            return;
        }
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
