(function() {
    'use strict';

    /**
     * ========================================================================
     * Constants
     * ========================================================================
     */
    // Multi-Step Form Attributes & Classes
    const DATA_ATTR_FORM = 'data-multistep-form';
    const DATA_ATTR_STEP = 'data-step';
    const DATA_ATTR_INDICATOR_CONTAINER = 'data-step-indicator-container';
    const DATA_ATTR_INDICATOR = 'data-step-indicator';
    const DATA_ATTR_NEXT_BTN = 'data-multistep-next';
    const DATA_ATTR_PREV_BTN = 'data-multistep-prev';
    const DATA_ATTR_SUBMIT_BTN = 'data-multistep-submit';
    const DATA_ATTR_GUIDE_CONTAINER = 'data-step-guide-container';
    const DATA_ATTR_GUIDE = 'data-step-guide';
    const DATA_ATTR_PREVIEW_FIELD = 'data-preview-field';
    const CLASS_ACTIVE_STEP = 'active';
    const CLASS_ACTIVE_INDICATOR = 'active';
    const CLASS_HIDE = 'hide'; // For buttons
    const CLASS_INPUT_ERROR = 'input-error';
    const CLASS_INDICATOR_REACHABLE = 'reachable';
    const CLASS_PREVIEW_WRAPPER = 'form-campaign-preview-wrapper';

    // *** NEW: Toggle Attributes ***
    const DATA_ATTR_TOGGLE_CONTROL = 'data-toggle-control';
    const DATA_ATTR_TOGGLE_TARGET = 'data-toggle-target';

    // Transition duration (should match CSS for steps/guides/toggles)
    const TRANSITION_DURATION = 400; // ms

    /**
     * ========================================================================
     * Helper Functions
     * ========================================================================
     */
    const find = (selector, element = document) => element.querySelector(selector);
    const findAll = (selector, element = document) => element.querySelectorAll(selector);
    const addClass = (element, className) => element?.classList.add(className);
    const removeClass = (element, className) => element?.classList.remove(className);
    const showElement = (element) => removeClass(element, CLASS_HIDE);
    const hideElement = (element) => addClass(element, CLASS_HIDE);

    // Fade Out Helper
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

    // Fade In Helper
    const fadeInElement = (element) => {
         if (!element || (element.style.opacity === '1' && element.style.display === 'block')) return;
         // Use 'block' as default, adjust if specific display needed (e.g., 'flex')
         const defaultDisplay = 'block';
         element.style.display = defaultDisplay;
         requestAnimationFrame(() => {
             setTimeout(() => {
                 element.style.opacity = '1';
             }, 10);
         });
    };

    /**
     * ========================================================================
     * Core Logic: MultiStepForm Class
     * ========================================================================
     */
    class MultiStepForm {
        // --- Constructor and Methods for Multi-Step Logic ---
        // (Constructor and methods like init, addEventListeners, goToStep,
        // updateIndicators, updateButtonStates, validateStep, updatePreview
        // remain the same as the previous version)
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
            this.previewWrapper = find(`.${CLASS_PREVIEW_WRAPPER}`, this.form);


            this.currentStepIndex = 0;
            this.totalSteps = this.steps.length;
            this.maxReachedStepIndex = 0;
            this.isTransitioning = false;

            if (this.totalSteps === 0) {
                console.warn(`MultiStepForm (${formId}): No steps found.`);
                return;
            }
            // Warnings...

             // Explicitly hide prev and submit buttons initially
             if (this.prevButton) hideElement(this.prevButton);
             if (this.submitButton) hideElement(this.submitButton);

             // Initial state for steps and guides
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

            // Indicator listeners...
            this.indicators.forEach(indicator => {
                indicator.addEventListener('click', (event) => {
                    event.preventDefault();
                    if (this.isTransitioning) return;
                    const targetStepNumber = parseInt(indicator.getAttribute(DATA_ATTR_INDICATOR), 10);
                    if (isNaN(targetStepNumber)) return;
                    const targetIndex = targetStepNumber - 1;

                    if (targetIndex >= 0 && targetIndex < this.totalSteps && targetIndex <= this.maxReachedStepIndex + 1) {
                         if (targetIndex > this.currentStepIndex) {
                            let canProceed = true;
                            for (let i = this.currentStepIndex; i < targetIndex; i++) {
                                if (!this.validateStep(i)) {
                                    console.log(`Validation failed for intermediate step ${i + 1}, cannot jump.`);
                                    const firstInvalid = find(':invalid', this.steps[i]);
                                    firstInvalid?.focus();
                                    canProceed = false;
                                    break;
                                }
                            }
                            if (!canProceed) return;
                         }
                         this.goToStep(targetIndex);
                    } else {
                        console.log(`Cannot jump to step ${targetStepNumber}.`);
                    }
                });
            });

            // Keydown listener...
            this.form.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
                    const isSubmitVisible = this.submitButton && !this.submitButton.classList.contains(CLASS_HIDE);
                    if (document.activeElement !== this.submitButton || !isSubmitVisible) {
                        event.preventDefault();
                        if (this.nextButton && !this.nextButton.classList.contains(CLASS_HIDE)) {
                           handleNext();
                        }
                    }
                }
            });
        }

        goToNextStep() {
             if (!this.validateStep(this.currentStepIndex)) {
                 console.log("Validation failed for step", this.currentStepIndex + 1);
                 const firstInvalid = find(':invalid', this.steps[this.currentStepIndex]);
                 firstInvalid?.reportValidity();
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

        goToStep(stepIndex, isInitialLoad = false) {
            if (this.isTransitioning || stepIndex < 0 || stepIndex >= this.totalSteps || stepIndex === this.currentStepIndex) {
                return;
            }

            this.isTransitioning = true;

            const previousStepIndex = this.currentStepIndex;
            this.currentStepIndex = stepIndex;
            const targetStepNumber = this.currentStepIndex + 1;

            if (this.currentStepIndex > this.maxReachedStepIndex) {
                this.maxReachedStepIndex = this.currentStepIndex;
            }

            const outgoingStep = this.steps[previousStepIndex];
            const incomingStep = this.steps[this.currentStepIndex];
            const outgoingGuide = this.guides.find(g => parseInt(g.getAttribute(DATA_ATTR_GUIDE), 10) === (previousStepIndex + 1));
            const incomingGuide = this.guides.find(g => parseInt(g.getAttribute(DATA_ATTR_GUIDE), 10) === targetStepNumber);

            // Update indicators and button states immediately
            this.updateIndicators();
            this.updateButtonStates();

            // Update preview if navigating TO the last step
            if (this.currentStepIndex === this.totalSteps - 1) {
                this.updatePreview();
            }

            if (isInitialLoad) {
                 // Set initial styles...
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
                 fadeInNewElements();
            }
        }


        updateIndicators() {
            const targetStepNumber = this.currentStepIndex + 1;
            this.indicators.forEach((indicator, index) => {
                const indicatorStepNumber = parseInt(indicator.getAttribute(DATA_ATTR_INDICATOR), 10);
                const indicatorIndex = indicatorStepNumber - 1;

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
            return isStepValid;
        }

        updatePreview() {
            if (!this.previewWrapper) {
                // console.warn('Preview wrapper not found.'); // Optional warning
                return;
            }
            const getFieldValue = (fieldName) => {
                const field = find(`[${DATA_ATTR_PREVIEW_FIELD}="${fieldName}"]`, this.form);
                if (!field) return 'N/A';
                if (field.type === 'checkbox' || field.type === 'radio') {
                    return field.checked ? field.value || 'Ja' : 'Nein';
                } else if (field.tagName === 'SELECT') {
                    return field.options[field.selectedIndex]?.text || field.value || 'N/A';
                } else {
                    return field.value || '';
                }
            };
            let previewHTML = '';
            // --- Preview HTML Generation (using getFieldValue) ---
            // (Code from previous version to generate HTML based on field values)
            const projectName = getFieldValue('projectName');
            previewHTML += `<div class="preview-item"><div class="preview-label">Wie heißt dein Projekt?</div><div class="preview-value">${projectName || '<i>Keine Angabe</i>'}</div></div>`;
            const budget = getFieldValue('budget');
             previewHTML += `<div class="preview-item"><div class="preview-label">Budget</div><div class="preview-value">${budget ? budget + ' €' : '<i>Keine Angabe</i>'}</div></div>`;
             const startDate = getFieldValue('startDate');
             const endDate = getFieldValue('endDate');
             let productionPeriod = '<i>Keine Angabe</i>';
             if (startDate && endDate) productionPeriod = `${startDate} - ${endDate}`;
             else if (startDate) productionPeriod = `Ab ${startDate}`;
             else if (endDate) productionPeriod = `Bis ${endDate}`;
             previewHTML += `<div class="preview-item"><div class="preview-label">Produktionszeitraum</div><div class="preview-value">${productionPeriod}</div></div>`;
             const creatorCount = getFieldValue('creatorCount');
             const targetGroup = getFieldValue('targetGroup');
             const followerRange = getFieldValue('followerRange');
             previewHTML += `<div class="preview-grid"><div><div class="preview-label">Anzahl der Creator:</div><div class="preview-value">${creatorCount || '<i>-</i>'}</div></div><div><div class="preview-label">Zielgruppe:</div><div class="preview-value">${targetGroup || '<i>-</i>'}</div></div><div><div class="preview-label">Followerbereich:</div><div class="preview-value">${followerRange || '<i>-</i>'}</div></div></div>`;
            const profile = getFieldValue('creatorProfile').replace(/\n/g, '<br>');
             previewHTML += `<div class="preview-item"><div class="preview-label">Creator-Profil (Steckbrief)</div><div class="preview-value">${profile || '<i>Keine Angabe</i>'}</div></div>`;
             const taskDesc = getFieldValue('taskDescription').replace(/\n/g, '<br>');
             previewHTML += `<div class="preview-item"><div class="preview-label">Aufgabenbeschreibung</div><div class="preview-value">${taskDesc || '<i>Keine Angabe</i>'}</div></div>`;
             const scriptCreator = getFieldValue('scriptCreator');
             const videoCount = getFieldValue('videoCount');
             previewHTML += `<div class="preview-item optional-section"><div class="preview-label">Optionale Angaben</div><div class="preview-grid"><div><div class="preview-label">Wer erstellt das Script:</div><div class="preview-value">${scriptCreator || '<i>-</i>'}</div></div><div><div class="preview-label">Anzahl der Videos:</div><div class="preview-value">${videoCount || '<i>-</i>'}</div></div></div></div>`;
            // --- End Preview HTML Generation ---
            this.previewWrapper.innerHTML = previewHTML;
        }

    } // End MultiStepForm Class

    /**
     * ========================================================================
     * NEW: Toggle Field Logic
     * ========================================================================
     */
    const initializeToggles = () => {
        const toggleControls = findAll(`[${DATA_ATTR_TOGGLE_CONTROL}]`);

        toggleControls.forEach(control => {
            const targetName = control.getAttribute(DATA_ATTR_TOGGLE_CONTROL);
            if (!targetName) {
                console.warn('Toggle control found without a target name:', control);
                return;
            }

            // Find the corresponding target element(s) within the whole document
            // Adjust selector if targets are constrained (e.g., within the same parent)
            const targetElement = find(`[${DATA_ATTR_TOGGLE_TARGET}="${targetName}"]`);

            if (!targetElement) {
                console.warn(`No toggle target found for control value: ${targetName}`);
                return;
            }

            // Function to update visibility based on control state
            const updateTargetVisibility = () => {
                // Checkbox/Radio use 'checked', other inputs might need different checks
                const isControlActive = control.checked;

                if (isControlActive) {
                    fadeInElement(targetElement);
                } else {
                    fadeOutElement(targetElement);
                    // Optional: Clear values of inputs within the target when hidden
                    // const inputsInTarget = findAll('input, select, textarea', targetElement);
                    // inputsInTarget.forEach(input => {
                    //     if (input.type === 'checkbox' || input.type === 'radio') {
                    //         input.checked = false;
                    //     } else {
                    //         input.value = '';
                    //     }
                    //     // Trigger change event if needed for other scripts
                    //     input.dispatchEvent(new Event('change', { bubbles: true }));
                    // });
                }
            };

            // Set initial state when the page loads
            updateTargetVisibility();

            // Add event listener for changes
            control.addEventListener('change', updateTargetVisibility);
        });
    };


    /**
     * ========================================================================
     * Initialization
     * ========================================================================
     */
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize Multi-Step Forms
        const multiStepForms = findAll(`[${DATA_ATTR_FORM}]`);
        if (multiStepForms.length > 0) {
            multiStepForms.forEach(formElement => {
                try {
                    new MultiStepForm(formElement).init();
                } catch (error) {
                     console.error(`Failed to initialize MultiStepForm for: #${formElement.id || 'form without id'}`, error);
                }
            });
        } else {
             console.info('MultiStepForm: No forms with attribute ' + DATA_ATTR_FORM + ' found.');
        }

        // Initialize Toggle Fields (runs independently)
        initializeToggles();

    }); // End DOMContentLoaded

})(); // Ende der IIFE
