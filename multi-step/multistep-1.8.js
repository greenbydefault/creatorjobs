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
    const DATA_ATTR_GUIDE_CONTAINER = 'data-step-guide-container';
    const DATA_ATTR_GUIDE = 'data-step-guide';

    // CSS classes
    const CLASS_ACTIVE_STEP = 'active';
    const CLASS_ACTIVE_INDICATOR = 'active';
    const CLASS_HIDE = 'hide'; // Geändert von CLASS_HIDDEN
    const CLASS_INPUT_ERROR = 'input-error';
    const CLASS_INDICATOR_REACHABLE = 'reachable'; // Für klickbare Indikatoren

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
    // Helper zum Anzeigen/Verstecken von Elementen über die .hide Klasse
    const showElement = (element) => removeClass(element, CLASS_HIDE); // Verwendet jetzt CLASS_HIDE
    const hideElement = (element) => addClass(element, CLASS_HIDE); // Verwendet jetzt CLASS_HIDE


    // Helper to handle fade out and set display none after transition
    const fadeOutElement = (element, callback) => {
        if (!element || element.style.opacity === '0' || element.style.display === 'none') {
             if (typeof callback === 'function') callback();
            return;
        }
        element.style.opacity = '0';
        let transitionEnded = false;
        const onFadeOutComplete = (event) => {
            if (event.target === element && event.propertyName === 'opacity' && !transitionEnded) {
                 transitionEnded = true;
                element.style.display = 'none';
                element.removeEventListener('transitionend', onFadeOutComplete);
                if (typeof callback === 'function') callback();
            }
        };
        element.removeEventListener('transitionend', onFadeOutComplete);
        element.addEventListener('transitionend', onFadeOutComplete);
        setTimeout(() => {
            if (!transitionEnded) {
                 transitionEnded = true;
                element.style.display = 'none';
                element.removeEventListener('transitionend', onFadeOutComplete);
                 if (typeof callback === 'function') callback();
            }
        }, TRANSITION_DURATION + 50);
    };

    // Helper to handle fade in
    const fadeInElement = (element) => {
         if (!element || (element.style.opacity === '1' && element.style.display === 'block')) return;
         element.style.display = 'block'; // Or specific display type if needed
         requestAnimationFrame(() => {
             setTimeout(() => {
                 element.style.opacity = '1';
             }, 10);
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
            this.maxReachedStepIndex = 0; // Track highest step reached successfully
            this.isTransitioning = false;

            if (this.totalSteps === 0) {
                console.warn(`MultiStepForm (${formId}): No steps found.`);
                return;
            }
            // Warnings... (kept as before)

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
            this.goToStep(0, true); // Initial load
        }

        addEventListeners() {
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

            // Add listeners for indicators
            this.indicators.forEach(indicator => {
                indicator.addEventListener('click', (event) => {
                    event.preventDefault(); // Prevent default link behavior if indicators are <a> tags
                    if (this.isTransitioning) return;

                    const targetStepNumber = parseInt(indicator.getAttribute(DATA_ATTR_INDICATOR), 10);
                    if (isNaN(targetStepNumber)) return; // Ignore if attribute is invalid

                    const targetIndex = targetStepNumber - 1; // Convert to 0-based index

                    // Check if the target step is reachable
                    if (targetIndex >= 0 && targetIndex < this.totalSteps && targetIndex <= this.maxReachedStepIndex + 1) {
                         // If moving forward, validate intermediate steps
                         if (targetIndex > this.currentStepIndex) {
                            let canProceed = true;
                            for (let i = this.currentStepIndex; i < targetIndex; i++) {
                                if (!this.validateStep(i)) {
                                    console.log(`Validation failed for intermediate step ${i + 1}, cannot jump to step ${targetStepNumber}.`);
                                    // Optionally focus the first invalid field in the blocking step
                                    const firstInvalid = find(':invalid', this.steps[i]);
                                    firstInvalid?.focus();
                                    canProceed = false;
                                    break; // Stop checking further steps
                                }
                            }
                            if (!canProceed) return; // Stop if any intermediate validation failed
                         }
                         // Navigate if valid or moving backward
                         this.goToStep(targetIndex);
                    } else {
                        console.log(`Cannot jump to step ${targetStepNumber}. Previous steps might not be validated yet.`);
                        // Optional: Visual feedback like shaking the indicator
                    }
                });
            });


            this.form.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
                    // Check if submit button exists and is NOT hidden by the class
                    const isSubmitVisible = this.submitButton && !this.submitButton.classList.contains(CLASS_HIDE);
                    if (document.activeElement !== this.submitButton || !isSubmitVisible) {
                        event.preventDefault();
                         // Check if next button exists and is NOT hidden by the class
                        if (this.nextButton && !this.nextButton.classList.contains(CLASS_HIDE)) {
                           handleNext();
                        }
                    }
                }
            });
        }

        goToNextStep() {
             // Validate current step BEFORE proceeding
             if (!this.validateStep(this.currentStepIndex)) {
                 console.log("Validation failed for step", this.currentStepIndex + 1);
                 const firstInvalid = find(':invalid', this.steps[this.currentStepIndex]);
                 firstInvalid?.focus();
                 return;
             }
             // Proceed if valid and not the last step
            if (this.currentStepIndex < this.totalSteps - 1) {
                this.goToStep(this.currentStepIndex + 1);
            }
        }

        goToPreviousStep() {
            // No validation needed for going back
            if (this.currentStepIndex > 0) {
                this.goToStep(this.currentStepIndex - 1);
            }
        }

        goToStep(stepIndex, isInitialLoad = false) {
            if (this.isTransitioning || stepIndex < 0 || stepIndex >= this.totalSteps || stepIndex === this.currentStepIndex) {
                return;
            }

            this.isTransitioning = true;

            const previousStepIndex = this.currentStepIndex;
            this.currentStepIndex = stepIndex;
            const targetStepNumber = this.currentStepIndex + 1;

            // Update max reached step index if moving forward successfully
            if (this.currentStepIndex > this.maxReachedStepIndex) {
                this.maxReachedStepIndex = this.currentStepIndex;
            }

            const outgoingStep = this.steps[previousStepIndex];
            const incomingStep = this.steps[this.currentStepIndex];
            const outgoingGuide = this.guides.find(g => parseInt(g.getAttribute(DATA_ATTR_GUIDE), 10) === (previousStepIndex + 1));
            const incomingGuide = this.guides.find(g => parseInt(g.getAttribute(DATA_ATTR_GUIDE), 10) === targetStepNumber);

            // Update indicators and button states immediately
            this.updateIndicators(); // Update indicators based on new current and maxReached index
            this.updateButtonStates();

            if (isInitialLoad) {
                // Set initial styles without transition
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
                this.isTransitioning = false;
                return;
            }

            const fadeInNewElements = () => {
                if (incomingStep) {
                    fadeInElement(incomingStep);
                    addClass(incomingStep, CLASS_ACTIVE_STEP);
                }
                if (incomingGuide) {
                    fadeInElement(incomingGuide);
                }
                 setTimeout(() => {
                     this.isTransitioning = false;
                 }, TRANSITION_DURATION);
            };

            if (outgoingGuide) fadeOutElement(outgoingGuide);

            if (outgoingStep) {
                 removeClass(outgoingStep, CLASS_ACTIVE_STEP);
                 fadeOutElement(outgoingStep, fadeInNewElements);
            } else {
                 fadeInNewElements(); // Should only happen if previousStepIndex was invalid
            }
        }

        updateIndicators() {
            const targetStepNumber = this.currentStepIndex + 1;
            this.indicators.forEach((indicator, index) => {
                const indicatorStepNumber = parseInt(indicator.getAttribute(DATA_ATTR_INDICATOR), 10);
                const indicatorIndex = indicatorStepNumber - 1; // 0-based index

                removeClass(indicator, CLASS_ACTIVE_INDICATOR);
                removeClass(indicator, CLASS_INDICATOR_REACHABLE);

                if (!isNaN(indicatorStepNumber) && indicatorStepNumber === targetStepNumber) {
                     addClass(indicator, CLASS_ACTIVE_INDICATOR);
                }
                else if (indicatorIndex <= this.maxReachedStepIndex) {
                     addClass(indicator, CLASS_INDICATOR_REACHABLE);
                }
            });
        }

        // Uses helper functions with CLASS_HIDE now
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
                 // Optional: Only report validity when user explicitly tries to proceed
                 // const firstInvalid = find(':invalid', currentStepElement);
                 // firstInvalid?.reportValidity();
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
