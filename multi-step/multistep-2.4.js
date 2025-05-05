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
    const DATA_ATTR_PREVIEW_FIELD = 'data-preview-field'; // Attribute for preview fields
    const CLASS_ACTIVE_STEP = 'active';
    const CLASS_ACTIVE_INDICATOR = 'active';
    const CLASS_HIDE = 'hide'; // For buttons
    const CLASS_INPUT_ERROR = 'input-error';
    const CLASS_INDICATOR_REACHABLE = 'reachable';
    const CLASS_PREVIEW_WRAPPER = 'form-campaign-preview-wrapper'; // Class for the preview container

    // Toggle Attributes
    const DATA_ATTR_TOGGLE_CONTROL = 'data-toggle-control';
    const DATA_ATTR_TOGGLE_TARGET = 'data-toggle-target';
    const DATA_ATTR_DISABLE_TARGET = 'data-disable-target'; // On the input field
    const DATA_ATTR_DISABLE_VALUE = 'data-disable-value'; // On the control element
    const CLASS_DISABLED_BY_TOGGLE = 'disabled-by-toggle'; // Optional CSS class

    // Transition duration
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
                // Also check if the input is currently disabled by a toggle
                if (!input.checkValidity() && !input.disabled) {
                    isStepValid = false;
                    addClass(input, CLASS_INPUT_ERROR);
                }
            });
            return isStepValid;
        }

        // *** UPDATED: Preview function with specified fields ***
        updatePreview() {
            if (!this.previewWrapper) {
                return; // Exit if preview area not found
            }

            // Helper to get field value, returns placeholder if empty/not found
            const getFieldValue = (fieldName, placeholder = '<i>-</i>') => {
                const field = find(`[${DATA_ATTR_PREVIEW_FIELD}="${fieldName}"]`, this.form);
                if (!field) return placeholder; // Return placeholder if field doesn't exist

                let value = '';
                if (field.type === 'checkbox' || field.type === 'radio') {
                    // Needs refinement if multiple checkboxes/radios share the same name
                    value = field.checked ? field.value || 'Ja' : ''; // Return empty if not checked
                } else if (field.tagName === 'SELECT') {
                    value = field.options[field.selectedIndex]?.text || field.value; // Prefer selected text
                } else {
                    value = field.value; // Get value for text, number, textarea etc.
                }

                // Return placeholder only if the retrieved value is truly empty
                return value ? value : placeholder;
            };

            // Helper to format value (e.g., add currency, handle newlines)
            const formatValue = (value, type = 'text', placeholder = '<i>-</i>') => {
                if (value === placeholder) return placeholder; // Don't format the placeholder itself

                switch (type) {
                    case 'currency':
                        return `${value} €`;
                    case 'textarea':
                        return value.replace(/\n/g, '<br>'); // Replace newlines
                    case 'period':
                         // Assuming value is an object { start: '...', end: '...' }
                         if (value.start && value.end) return `${value.start} - ${value.end}`;
                         if (value.start) return `Ab ${value.start}`;
                         if (value.end) return `Bis ${value.end}`;
                         return placeholder;
                    default:
                        return value;
                }
            };


            let previewHTML = '';

            // --- Generate HTML for each field ---

            // projectName (Required)
            const projectName = getFieldValue('projectName', '<i>Keine Angabe</i>');
            previewHTML += `<div class="preview-item"><div class="preview-label">Projektname</div><div class="preview-value">${formatValue(projectName)}</div></div>`;

            // job-adress-optional (Optional)
            const jobAddress = getFieldValue('job-adress-optional');
            if (jobAddress !== '<i>-</i>') { // Only show if value exists
                 previewHTML += `<div class="preview-item"><div class="preview-label">Job Adresse (Optional)</div><div class="preview-value">${formatValue(jobAddress, 'textarea')}</div></div>`;
            }

            // budget (Required)
            const budget = getFieldValue('budget', '<i>Keine Angabe</i>');
            previewHTML += `<div class="preview-item"><div class="preview-label">Budget</div><div class="preview-value">${formatValue(budget, 'currency', '<i>Keine Angabe</i>')}</div></div>`;

            // startDate & endDate (Required)
            const startDate = getFieldValue('startDate', ''); // Get raw values or empty string
            const endDate = getFieldValue('endDate', '');
            const periodValue = { start: startDate, end: endDate };
            previewHTML += `<div class="preview-item"><div class="preview-label">Produktionszeitraum</div><div class="preview-value">${formatValue(periodValue, 'period', '<i>Keine Angabe</i>')}</div></div>`;

            // creatorCountOptional (Optional)
            const creatorCount = getFieldValue('creatorCountOptional');
             if (creatorCount !== '<i>-</i>') {
                 previewHTML += `<div class="preview-item"><div class="preview-label">Anzahl Creator (Optional)</div><div class="preview-value">${formatValue(creatorCount)}</div></div>`;
             }

            // lang (Required)
            const lang = getFieldValue('lang', '<i>Keine Angabe</i>');
            previewHTML += `<div class="preview-item"><div class="preview-label">Sprache</div><div class="preview-value">${formatValue(lang)}</div></div>`;

            // aufgabe (Required)
            const aufgabe = getFieldValue('aufgabe', '<i>Keine Angabe</i>');
            previewHTML += `<div class="preview-item"><div class="preview-label">Aufgabenbeschreibung</div><div class="preview-value">${formatValue(aufgabe, 'textarea', '<i>Keine Angabe</i>')}</div></div>`;

            // steckbrief (Required)
            const steckbrief = getFieldValue('steckbrief', '<i>Keine Angabe</i>');
            previewHTML += `<div class="preview-item"><div class="preview-label">Creator-Profil (Steckbrief)</div><div class="preview-value">${formatValue(steckbrief, 'textarea', '<i>Keine Angabe</i>')}</div></div>`;

            // --- Optional Fields Section ---
            let optionalHTML = '';
            const gender = getFieldValue('genderOptional');
            const videoCount = getFieldValue('videoCountOptional');
            const imgCount = getFieldValue('imgCountOptional');
            const videoDuration = getFieldValue('videoDurationOptional');
            const reviews = getFieldValue('reviewsOptional');
            const duration = getFieldValue('durationOptional');
            const script = getFieldValue('scriptOptional');

            if (gender !== '<i>-</i>') optionalHTML += `<div><div class="preview-label">Gender (Optional)</div><div class="preview-value">${formatValue(gender)}</div></div>`;
            if (videoCount !== '<i>-</i>') optionalHTML += `<div><div class="preview-label">Anzahl Videos (Optional)</div><div class="preview-value">${formatValue(videoCount)}</div></div>`;
            if (imgCount !== '<i>-</i>') optionalHTML += `<div><div class="preview-label">Anzahl Bilder (Optional)</div><div class="preview-value">${formatValue(imgCount)}</div></div>`;
            if (videoDuration !== '<i>-</i>') optionalHTML += `<div><div class="preview-label">Videolänge (Optional)</div><div class="preview-value">${formatValue(videoDuration)}</div></div>`;
            if (reviews !== '<i>-</i>') optionalHTML += `<div><div class="preview-label">Anzahl Korrekturschleifen (Optional)</div><div class="preview-value">${formatValue(reviews)}</div></div>`;
            if (duration !== '<i>-</i>') optionalHTML += `<div><div class="preview-label">Kampagnendauer (Optional)</div><div class="preview-value">${formatValue(duration)}</div></div>`;
            if (script !== '<i>-</i>') optionalHTML += `<div><div class="preview-label">Wer erstellt Script (Optional)</div><div class="preview-value">${formatValue(script)}</div></div>`;

            // Add optional section only if it contains content
            if (optionalHTML) {
                 previewHTML += `<div class="preview-item optional-section"><div class="preview-label">Optionale Angaben</div><div class="preview-grid">${optionalHTML}</div></div>`;
            }

            // --- End Field Generation ---

            this.previewWrapper.innerHTML = previewHTML;
        }

    } // End MultiStepForm Class

    /**
     * ========================================================================
     * Toggle Field Logic (Show/Hide and Disable/Enable)
     * ========================================================================
     */
    const initializeToggles = () => {
        const toggleControls = findAll(`[${DATA_ATTR_TOGGLE_CONTROL}]`);

        toggleControls.forEach(control => {
            const controlName = control.getAttribute(DATA_ATTR_TOGGLE_CONTROL);
            if (!controlName) {
                console.warn('Toggle control found without a name:', control);
                return;
            }

            const showHideTarget = find(`[${DATA_ATTR_TOGGLE_TARGET}="${controlName}"]`);
            const disableTargetInput = find(`[${DATA_ATTR_DISABLE_TARGET}="${controlName}"]`);
            const disableValue = control.getAttribute(DATA_ATTR_DISABLE_VALUE);

            if (!showHideTarget && !disableTargetInput) {
                // console.warn(`No target found for toggle control: ${controlName}`); // Less verbose
                return;
            }

            const updateTargetsState = () => {
                const isControlActive = control.checked;

                if (showHideTarget) {
                    isControlActive ? fadeInElement(showHideTarget) : fadeOutElement(showHideTarget);
                }

                if (disableTargetInput) {
                    if (isControlActive) {
                        disableTargetInput.disabled = true;
                        addClass(disableTargetInput, CLASS_DISABLED_BY_TOGGLE);
                        if (disableValue !== null) {
                            disableTargetInput.value = disableValue;
                            disableTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    } else {
                        disableTargetInput.disabled = false;
                        removeClass(disableTargetInput, CLASS_DISABLED_BY_TOGGLE);
                    }
                }
            };
            updateTargetsState(); // Initial state
            control.addEventListener('change', updateTargetsState);
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

        // Initialize Toggle Fields
        initializeToggles();

    }); // End DOMContentLoaded

})(); // Ende der IIFE
