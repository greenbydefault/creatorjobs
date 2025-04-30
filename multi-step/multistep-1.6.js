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
    const CLASS_ACTIVE_STEP = 'active';
    const CLASS_ACTIVE_INDICATOR = 'active';
    const CLASS_HIDDEN = 'hidden';
    const CLASS_INPUT_ERROR = 'input-error';

    // Transition duration (should match CSS)
    const TRANSITION_DURATION = 400; // ms


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

    // *** Updated fadeOutElement to accept a callback ***
    // Helper to handle fade out and set display none after transition
    const fadeOutElement = (element, callback) => {
        // Check if element is valid and actually visible
        if (!element || element.style.opacity === '0' || element.style.display === 'none') {
             // If already hidden or invalid, execute callback immediately if provided
             if (typeof callback === 'function') {
                 callback();
             }
            return;
        }

        element.style.opacity = '0'; // Start fade-out
        let transitionEnded = false; // Flag to prevent multiple callback calls

        const onFadeOutComplete = (event) => {
            // Ensure the event is for the opacity property and the target is the element itself
            if (event.target === element && event.propertyName === 'opacity' && !transitionEnded) {
                 transitionEnded = true; // Set flag
                element.style.display = 'none'; // Hide after fade
                element.removeEventListener('transitionend', onFadeOutComplete); // Clean up listener
                // Execute the callback function if provided
                if (typeof callback === 'function') {
                    callback();
                }
            }
        };

        // Remove previous listener before adding a new one
        element.removeEventListener('transitionend', onFadeOutComplete);
        // Add listener for transition end
        element.addEventListener('transitionend', onFadeOutComplete);

        // Fallback timeout in case transitionend doesn't fire reliably
        setTimeout(() => {
            // If transition hasn't ended yet (flag is false)
            if (!transitionEnded) {
                 transitionEnded = true; // Set flag
                element.style.display = 'none'; // Force hide
                element.removeEventListener('transitionend', onFadeOutComplete); // Clean up listener
                 // Execute the callback function if provided
                 if (typeof callback === 'function') {
                     callback();
                 }
            }
        }, TRANSITION_DURATION + 50); // Add a small buffer
    };

    // Helper to handle fade in (remains mostly the same)
    const fadeInElement = (element) => {
         if (!element || (element.style.opacity === '1' && element.style.display === 'block')) return; // Already visible or invalid

         // Make element block first, then change opacity for transition
         element.style.display = 'block';
         // Use rAF and setTimeout to ensure 'display' is rendered before opacity change
         requestAnimationFrame(() => {
             setTimeout(() => {
                 element.style.opacity = '1'; // Trigger fade-in
             }, 10); // Small delay helps ensure display:block is rendered
         });
    };


    /**
     * ------------------------------------------------------------------------
     * Core Logic: MultiStepForm Class
     * ------------------------------------------------------------------------
     */
    class MultiStepForm {
        constructor(formElement) {
            this.form = formElement;
            const formId = this.form.id || 'form without id';

            // Find elements
            this.steps = Array.from(findAll(`[${DATA_ATTR_STEP}]`, this.form));
            this.indicatorContainer = find(`[${DATA_ATTR_INDICATOR_CONTAINER}]`, this.form);
            this.indicators = this.indicatorContainer ? Array.from(findAll(`[${DATA_ATTR_INDICATOR}]`, this.indicatorContainer)) : [];
            this.nextButton = find(`[${DATA_ATTR_NEXT_BTN}]`, this.form);
            this.prevButton = find(`[${DATA_ATTR_PREV_BTN}]`, this.form);
            this.submitButton = find(`[${DATA_ATTR_SUBMIT_BTN}]`, this.form);
            this.guideContainer = find(`[${DATA_ATTR_GUIDE_CONTAINER}]`);
            this.guides = this.guideContainer ? Array.from(findAll(`[${DATA_ATTR_GUIDE}]`, this.guideContainer)) : [];

            this.currentStepIndex = 0;
            this.totalSteps = this.steps.length;
            this.isTransitioning = false; // Flag to prevent rapid clicks during transition

            if (this.totalSteps === 0) {
                console.warn(`MultiStepForm (${formId}): No steps found.`);
                return;
            }

            // Warnings
            if (this.guides.length > 0 && this.guides.length !== this.totalSteps) {
                 console.warn(`MultiStepForm (${formId}): Mismatch steps (${this.totalSteps}) and guides (${this.guides.length}).`);
            }
            if (this.indicators.length > 0 && this.indicators.length !== this.totalSteps) {
                console.warn(`MultiStepForm (${formId}): Mismatch steps (${this.totalSteps}) and indicators (${this.indicators.length}).`);
            }

             // Initial state
             this.steps.forEach((step, index) => {
                if (index === 0) {
                    step.style.display = 'block';
                    step.style.opacity = '1';
                    addClass(step, CLASS_ACTIVE_STEP);
                } else {
                    step.style.display = 'none';
                    step.style.opacity = '0';
                    removeClass(step, CLASS_ACTIVE_STEP);
                }
            });
            this.guides.forEach((guide, index) => {
                 const guideStepNumber = parseInt(guide.getAttribute(DATA_ATTR_GUIDE), 10);
                 const targetStepNumber = 1;
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
            this.goToStep(0, true); // Pass true for initial load (no transition needed)
        }

        addEventListeners() {
            // Prevent multiple clicks during transition
            const handleNext = () => {
                 if (this.isTransitioning) return;
                 this.goToNextStep();
            };
            const handlePrev = () => {
                 if (this.isTransitioning) return;
                 this.goToPreviousStep();
            };

            this.nextButton?.addEventListener('click', handleNext);
            this.prevButton?.addEventListener('click', handlePrev);

            this.form.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
                    if (document.activeElement !== this.submitButton || this.submitButton?.classList.contains(CLASS_HIDDEN)) {
                        event.preventDefault();
                        if (this.nextButton && !this.nextButton.classList.contains(CLASS_HIDDEN)) {
                           handleNext(); // Use guarded handler
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

        // *** Updated goToStep function for Sequential Fade ***
        goToStep(stepIndex, isInitialLoad = false) {
             // Prevent action if already transitioning or invalid/same step
            if (this.isTransitioning || stepIndex < 0 || stepIndex >= this.totalSteps || stepIndex === this.currentStepIndex) {
                return;
            }

            this.isTransitioning = true; // Set transition lock

            const previousStepIndex = this.currentStepIndex;
            this.currentStepIndex = stepIndex;
            const targetStepNumber = this.currentStepIndex + 1; // 1-based index

            // Get outgoing and incoming elements
            const outgoingStep = this.steps[previousStepIndex];
            const incomingStep = this.steps[this.currentStepIndex];
            const outgoingGuide = this.guides.find(g => parseInt(g.getAttribute(DATA_ATTR_GUIDE), 10) === (previousStepIndex + 1));
            const incomingGuide = this.guides.find(g => parseInt(g.getAttribute(DATA_ATTR_GUIDE), 10) === targetStepNumber);

            // Update indicators and button states immediately
            this.updateIndicators();
            this.updateButtonStates();

            // If it's the initial load, just set styles directly without transition
            if (isInitialLoad) {
                this.steps.forEach((s, i) => {
                    s.style.display = i === this.currentStepIndex ? 'block' : 'none';
                    s.style.opacity = i === this.currentStepIndex ? '1' : '0';
                    i === this.currentStepIndex ? addClass(s, CLASS_ACTIVE_STEP) : removeClass(s, CLASS_ACTIVE_STEP);
                });
                 this.guides.forEach((g) => {
                     const guideStep = parseInt(g.getAttribute(DATA_ATTR_GUIDE), 10);
                     g.style.display = guideStep === targetStepNumber ? 'block' : 'none';
                     g.style.opacity = guideStep === targetStepNumber ? '1' : '0';
                 });
                this.isTransitioning = false; // Release lock
                return;
            }


            // Define the function to fade in the new elements
            const fadeInNewElements = () => {
                if (incomingStep) {
                    fadeInElement(incomingStep);
                    addClass(incomingStep, CLASS_ACTIVE_STEP);
                }
                if (incomingGuide) {
                    fadeInElement(incomingGuide);
                }
                 // Release the transition lock slightly after fade-in starts
                 // or after the transition duration to be safe
                 setTimeout(() => {
                     this.isTransitioning = false;
                 }, TRANSITION_DURATION);
            };

            // 1. Fade out the outgoing guide first (if it exists)
            if (outgoingGuide) {
                fadeOutElement(outgoingGuide);
            }

            // 2. Fade out the outgoing step. When it's done, fade in the new elements.
            // We use the step's fade-out completion as the trigger for fading in both new elements.
            if (outgoingStep) {
                 removeClass(outgoingStep, CLASS_ACTIVE_STEP);
                 // Pass fadeInNewElements as the callback to fadeOutElement
                 fadeOutElement(outgoingStep, fadeInNewElements);
            } else {
                 // If there was no outgoing step (shouldn't happen after initial load), fade in directly
                 fadeInNewElements();
            }
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
            } catch (error) {
                 console.error(`Failed to initialize MultiStepForm for: #${formElement.id || 'form without id'}`, error);
            }
        });
    });

})(); // Ende der IIFE
