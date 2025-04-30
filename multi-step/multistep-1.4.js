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
    // Guide Attributes
    const DATA_ATTR_GUIDE_CONTAINER = 'data-step-guide-container';
    const DATA_ATTR_GUIDE = 'data-step-guide';


    // CSS classes
    const CLASS_ACTIVE_STEP = 'active'; // Optional für Step-Styling
    const CLASS_ACTIVE_INDICATOR = 'active';
    const CLASS_HIDDEN = 'hidden'; // Für Buttons
    const CLASS_INPUT_ERROR = 'input-error'; // Für Validierungsfehler


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
            const formId = this.form.id || 'form without id'; // Get form ID for logging
            // console.log(`[DEBUG MultiStepForm ${formId}] Initializing...`); // Debugging entfernt

            // Find form elements
            this.steps = Array.from(findAll(`[${DATA_ATTR_STEP}]`, this.form));
            this.indicatorContainer = find(`[${DATA_ATTR_INDICATOR_CONTAINER}]`, this.form);
            this.indicators = this.indicatorContainer ? Array.from(findAll(`[${DATA_ATTR_INDICATOR}]`, this.indicatorContainer)) : [];
            this.nextButton = find(`[${DATA_ATTR_NEXT_BTN}]`, this.form);
            this.prevButton = find(`[${DATA_ATTR_PREV_BTN}]`, this.form);
            this.submitButton = find(`[${DATA_ATTR_SUBMIT_BTN}]`, this.form);

            // console.log(`[DEBUG MultiStepForm ${formId}] Found Step Elements (${this.steps.length}):`, this.steps); // Debugging entfernt

            // Find guide elements (globally)
            this.guideContainer = find(`[${DATA_ATTR_GUIDE_CONTAINER}]`);
            this.guides = this.guideContainer ? Array.from(findAll(`[${DATA_ATTR_GUIDE}]`, this.guideContainer)) : [];

            // console.log(`[DEBUG MultiStepForm ${formId}] Found Guide Container:`, this.guideContainer); // Debugging entfernt
            // console.log(`[DEBUG MultiStepForm ${formId}] Found Guide Elements (${this.guides.length}):`, this.guides); // Debugging entfernt


            this.currentStepIndex = 0;
            this.totalSteps = this.steps.length;

            if (this.totalSteps === 0) {
                console.warn(`MultiStepForm (${formId}): No steps found.`);
                return;
            }

            // Warnings for inconsistent counts
            if (this.guides.length > 0 && this.guides.length !== this.totalSteps) {
                 console.warn(`MultiStepForm (${formId}): Number of steps (${this.totalSteps}) does not match number of guides (${this.guides.length}). Ensure each step has a corresponding guide element with [${DATA_ATTR_GUIDE}].`);
            }
            if (this.indicators.length > 0 && this.indicators.length !== this.totalSteps) {
                console.warn(`MultiStepForm (${formId}): Number of steps (${this.totalSteps}) does not match number of indicators (${this.indicators.length}).`);
            }

             // Initial state: Set styles directly for first step/guide, hide others
             this.steps.forEach((step, index) => {
                if (index === 0) {
                    step.style.display = 'block';
                    step.style.opacity = '1'; // Start fully visible
                    addClass(step, CLASS_ACTIVE_STEP);
                } else {
                    step.style.display = 'none';
                    step.style.opacity = '0'; // Start hidden and transparent
                    removeClass(step, CLASS_ACTIVE_STEP);
                }
            });
            this.guides.forEach((guide, index) => {
                 const guideStepNumber = parseInt(guide.getAttribute(DATA_ATTR_GUIDE), 10);
                 const targetStepNumber = 1; // First step

                 if (!isNaN(guideStepNumber) && guideStepNumber === targetStepNumber || isNaN(guideStepNumber) && index === 0) {
                     guide.style.display = 'block';
                     guide.style.opacity = '1';
                 } else {
                     guide.style.display = 'none';
                     guide.style.opacity = '0';
                 }
            });
        }

        init() {
            this.addEventListeners();
            this.goToStep(0); // Ensure initial button states are correct
        }

        addEventListeners() {
            this.nextButton?.addEventListener('click', () => this.goToNextStep());
            this.prevButton?.addEventListener('click', () => this.goToPreviousStep());
            this.form.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
                    if (document.activeElement !== this.submitButton || this.submitButton?.classList.contains(CLASS_HIDDEN)) {
                        event.preventDefault();
                        if (this.nextButton && !this.nextButton.classList.contains(CLASS_HIDDEN)) {
                           this.goToNextStep();
                        }
                    }
                }
            });
        }

        goToNextStep() {
             if (!this.validateStep(this.currentStepIndex)) {
                 console.log("Validation failed for step", this.currentStepIndex + 1);
                 const firstInvalid = find(':invalid', this.steps[this.currentStepIndex]);
                 firstInvalid?.focus();
                 return;
             }
            if (this.currentStepIndex < this.totalSteps - 1) {
                this.goToStep(this.currentStepIndex + 1);
            }
        }

        goToPreviousStep() {
            if (this.currentStepIndex > 0) {
                this.goToStep(this.currentStepIndex - 1);
            }
        }

        // *** Updated goToStep function for Step Fade Effect ***
        goToStep(stepIndex) {
            if (stepIndex < 0 || stepIndex >= this.totalSteps) {
                console.error('MultiStepForm: Invalid step index:', stepIndex);
                return;
            }

            const previousStepIndex = this.currentStepIndex;
            this.currentStepIndex = stepIndex;
            const targetStepNumber = this.currentStepIndex + 1; // 1-based index for guides/indicators

            // Update steps with fade effect
            this.steps.forEach((step, index) => {
                const isTargetStep = index === this.currentStepIndex;

                if (isTargetStep) {
                    // Target Step: Fade In
                    if (step.style.opacity === '1' && step.style.display === 'block') return; // Already visible

                    step.style.display = 'block'; // Make it block first
                    addClass(step, CLASS_ACTIVE_STEP); // Add active class (optional)
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            step.style.opacity = '1'; // Trigger fade-in
                        }, 10);
                    });
                } else {
                    // Non-Target Step: Fade Out
                    if (step.style.opacity === '0' && step.style.display === 'none') return; // Already hidden

                    step.style.opacity = '0'; // Trigger fade-out
                    removeClass(step, CLASS_ACTIVE_STEP); // Remove active class

                    const onFadeOutComplete = (event) => {
                        if (event.propertyName === 'opacity' && step.style.opacity === '0') {
                            step.style.display = 'none'; // Hide after fade
                            step.removeEventListener('transitionend', onFadeOutComplete);
                        }
                    };
                    step.removeEventListener('transitionend', onFadeOutComplete); // Remove old listener first
                    step.addEventListener('transitionend', onFadeOutComplete);

                    // Fallback timeout
                    const transitionDuration = 400; // Match CSS
                    setTimeout(() => {
                        if (step.style.opacity === '0') {
                            step.style.display = 'none';
                            step.removeEventListener('transitionend', onFadeOutComplete);
                        }
                    }, transitionDuration + 50);
                }
            });

            // Update guides (fade effect using style properties)
            this.updateGuides(targetStepNumber);

            // Update indicators
            this.updateIndicators();

            // Update button states
            this.updateButtonStates();
        }

        // Method to handle guide fading via style properties
        updateGuides(targetStepNumber) {
             this.guides.forEach((guide) => {
                const guideStep = parseInt(guide.getAttribute(DATA_ATTR_GUIDE), 10);
                const isTargetGuide = !isNaN(guideStep) && guideStep === targetStepNumber;

                // Target Guide: Fade In
                if (isTargetGuide) {
                    if (guide.style.opacity === '1' && guide.style.display === 'block') return;
                    guide.style.display = 'block';
                    requestAnimationFrame(() => {
                        setTimeout(() => {
                            guide.style.opacity = '1';
                        }, 10);
                    });
                }
                // Non-Target Guide: Fade Out
                else {
                    if (guide.style.opacity === '0' && guide.style.display === 'none') return;
                    guide.style.opacity = '0';

                     const onFadeOutComplete = (event) => {
                        if (event.propertyName === 'opacity' && guide.style.opacity === '0') {
                             guide.style.display = 'none';
                             guide.removeEventListener('transitionend', onFadeOutComplete);
                        }
                     };
                    guide.removeEventListener('transitionend', onFadeOutComplete);
                    guide.addEventListener('transitionend', onFadeOutComplete);

                     const transitionDuration = 400;
                     setTimeout(() => {
                         if (guide.style.opacity === '0') {
                             guide.style.display = 'none';
                             guide.removeEventListener('transitionend', onFadeOutComplete);
                         }
                     }, transitionDuration + 50);
                }
            });
        }


        updateIndicators() {
            const targetStepNumber = this.currentStepIndex + 1;
            this.indicators.forEach((indicator, index) => {
                const indicatorStep = parseInt(indicator.getAttribute(DATA_ATTR_INDICATOR), 10);
                if (!isNaN(indicatorStep) && indicatorStep === targetStepNumber || isNaN(indicatorStep) && index === this.currentStepIndex) {
                     addClass(indicator, CLASS_ACTIVE_INDICATOR);
                } else {
                     removeClass(indicator, CLASS_ACTIVE_INDICATOR);
                }
            });
        }

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

        validateStep(stepIndex) {
            const currentStepElement = this.steps[stepIndex];
            if (!currentStepElement) return false;
            const requiredInputs = findAll('input[required], select[required], textarea[required]', currentStepElement);
            let isStepValid = true;

            requiredInputs.forEach(input => {
                removeClass(input, CLASS_INPUT_ERROR);
                if (!input.checkValidity()) {
                    isStepValid = false;
                    addClass(input, CLASS_INPUT_ERROR);
                }
            });

             if (!isStepValid) {
                 const firstInvalid = find(':invalid', currentStepElement);
                 firstInvalid?.reportValidity();
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
        const multiStepForms = findAll(`[${DATA_ATTR_FORM}]`);
        if (multiStepForms.length === 0) {
            console.info('MultiStepForm: No forms with attribute ' + DATA_ATTR_FORM + ' found.');
            return;
        }
        multiStepForms.forEach(formElement => {
            try {
                new MultiStepForm(formElement).init();
                // console.log(`MultiStepForm initialized for: #${formElement.id || 'form without id'}`); // Debugging entfernt
            } catch (error) {
                 console.error(`Failed to initialize MultiStepForm for: #${formElement.id || 'form without id'}`, error);
            }
        });
    });

})(); // Ende der IIFE
