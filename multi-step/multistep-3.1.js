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
    const DATA_ATTR_PREVIEW_FIELD = 'data-preview-field'; // On input fields for final preview
    const DATA_ATTR_PREVIEW_PLACEHOLDER = 'data-preview-placeholder'; // On display elements in final preview step
    const CLASS_ACTIVE_STEP = 'active';
    const CLASS_ACTIVE_INDICATOR = 'active';
    const CLASS_HIDE = 'hide'; // For buttons
    const CLASS_INPUT_ERROR = 'input-error';
    const CLASS_INDICATOR_REACHABLE = 'reachable';

    // Toggle Attributes
    const DATA_ATTR_TOGGLE_CONTROL = 'data-toggle-control';
    const DATA_ATTR_TOGGLE_TARGET = 'data-toggle-target';
    const DATA_ATTR_DISABLE_TARGET = 'data-disable-target'; // On the input field
    const DATA_ATTR_DISABLE_VALUE = 'data-disable-value'; // On the control element
    const CLASS_DISABLED_BY_TOGGLE = 'disabled-by-toggle'; // Optional CSS class

    // Character Counter Attributes
    const DATA_ATTR_CHAR_COUNT_INPUT = 'data-char-count-input';
    const DATA_ATTR_CHAR_COUNT_MAX = 'data-char-count-max';
    const DATA_ATTR_CHAR_COUNT_DISPLAY = 'data-char-count-display';

    // *** NEW: Selection Display Attributes ***
    const DATA_ATTR_SELECTION_INPUT = 'data-selection-input'; // On checkboxes for real-time display
    const DATA_ATTR_SELECTION_DISPLAY = 'data-selection-display'; // On the text block showing selection

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
         if (!element || element.style.opacity === '1') return;
         if (getComputedStyle(element).display === 'none') {
             element.style.display = ''; // Revert to CSS default display
         }
         requestAnimationFrame(() => {
             setTimeout(() => {
                 element.style.opacity = '1';
             }, 10);
         });
    };

    // Date Formatting Helper
    const formatDateDDMMYYYY = (dateString) => {
        if (!dateString || typeof dateString !== 'string') return null;
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            if (year.length === 4 && month.length === 2 && day.length === 2) {
                return `${day}.${month}.${year}`;
            }
        }
        return dateString; // Return original if format is wrong
    };


    /**
     * ========================================================================
     * Core Logic: MultiStepForm Class
     * ========================================================================
     */
    class MultiStepForm {
        // --- Constructor and Methods for Multi-Step Logic ---
        // (No changes needed in the MultiStepForm class itself for this feature)
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
                    step.style.display = '';
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
                     guide.style.display = '';
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
                 // Set initial styles - rely on CSS for display type
                 this.steps.forEach((s, i) => {
                    s.style.display = i === this.currentStepIndex ? '' : 'none';
                    s.style.opacity = i === this.currentStepIndex ? '1' : '0';
                    i === this.currentStepIndex ? addClass(s, CLASS_ACTIVE_STEP) : removeClass(s, CLASS_ACTIVE_STEP);
                });
                 this.guides.forEach((g) => {
                     const guideStep = parseInt(g.getAttribute(DATA_ATTR_GUIDE), 10);
                     g.style.display = guideStep === targetStepNumber ? '' : 'none';
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
                if (!input.checkValidity() && !input.disabled) {
                    isStepValid = false;
                    addClass(input, CLASS_INPUT_ERROR);
                }
            });
            return isStepValid;
        }

        updatePreview() {
            const lastStepContainer = this.steps[this.totalSteps - 1];
            if (!lastStepContainer) return;

            const optionalPlaceholder = 'Keine Angabe';
            const requiredPlaceholder = '<i>Keine Angabe</i>';

            const getFieldValue = (fieldName, isCheckboxGroup = false) => {
                if (isCheckboxGroup) {
                    const fields = findAll(`[${DATA_ATTR_PREVIEW_FIELD}="${fieldName}"]:checked`, this.form);
                    if (!fields || fields.length === 0) return null;
                    return Array.from(fields).map(field => field.value || field.nextElementSibling?.textContent || '');
                } else {
                    const field = find(`[${DATA_ATTR_PREVIEW_FIELD}="${fieldName}"]`, this.form);
                    if (!field) return null;
                    let value = '';
                    if (field.tagName === 'SELECT') {
                        value = field.options[field.selectedIndex]?.text || field.value;
                    } else {
                        value = field.value.trim();
                    }
                    return value ? value : null;
                }
            };

            const formatValue = (value, type = 'text') => {
                if (value === null) return null;
                if (Array.isArray(value)) {
                    if (value.length === 0) return null;
                    return value.map(tagValue => `<span class="preview-tag">${tagValue}</span>`).join('');
                }
                switch (type) {
                    case 'currency': return `${value} €`;
                    case 'textarea': return value.replace(/\n/g, '<br>');
                    case 'period':
                        const formattedStart = formatDateDDMMYYYY(value.start);
                        const formattedEnd = formatDateDDMMYYYY(value.end);
                        if (formattedStart && formattedEnd) return `${formattedStart} bis ${formattedEnd}`;
                        if (formattedStart) return `Ab ${formattedStart}`;
                        if (formattedEnd) return `Bis ${formattedEnd}`;
                        return null;
                    case 'date':
                        return formatDateDDMMYYYY(value);
                    default: return value;
                }
            };

            const updatePlaceholder = (fieldName, displayValue) => {
                 const placeholderElement = find(`[${DATA_ATTR_PREVIEW_PLACEHOLDER}="${fieldName}"]`, lastStepContainer);
                 if (placeholderElement) {
                     placeholderElement.innerHTML = displayValue;
                 }
            };

            // --- Update placeholders ---
            let projectNameVal = getFieldValue('projectName');
            updatePlaceholder('projectName', formatValue(projectNameVal) || requiredPlaceholder);

            let jobAddressVal = getFieldValue('job-adress-optional');
            updatePlaceholder('job-adress-optional', jobAddressVal === null ? 'Remote' : formatValue(jobAddressVal, 'textarea'));

            let budgetVal = getFieldValue('budget');
            updatePlaceholder('budget', budgetVal === null ? 'tba' : (formatValue(budgetVal, 'currency') || requiredPlaceholder));

            let startDateVal = getFieldValue('startDate');
            let endDateVal = getFieldValue('endDate');
            let periodFormattedVal = formatValue({ start: startDateVal, end: endDateVal }, 'period');
            updatePlaceholder('productionPeriod', periodFormattedVal || requiredPlaceholder);

            let creatorCategorieVal = getFieldValue('creatorCategorie');
            updatePlaceholder('creatorCategorie', formatValue(creatorCategorieVal) || requiredPlaceholder);

             let creatorCountVal = getFieldValue('creatorCount');
             updatePlaceholder('creatorCount', formatValue(creatorCountVal) || requiredPlaceholder);

            let langVal = getFieldValue('creatorLang', true);
            updatePlaceholder('creatorLang', formatValue(langVal) || requiredPlaceholder);

            let landVal = getFieldValue('creatorLand', true);
            updatePlaceholder('creatorLand', formatValue(landVal) || requiredPlaceholder);


            let aufgabeVal = getFieldValue('aufgabe');
            updatePlaceholder('aufgabe', formatValue(aufgabeVal, 'textarea') || requiredPlaceholder);

            let steckbriefVal = getFieldValue('steckbrief');
            updatePlaceholder('steckbrief', formatValue(steckbriefVal, 'textarea') || requiredPlaceholder);

            // Optional Fields
            updatePlaceholder('creatorCountOptional', formatValue(getFieldValue('creatorCountOptional')) || optionalPlaceholder);
            updatePlaceholder('genderOptional', formatValue(getFieldValue('genderOptional')) || optionalPlaceholder);
            updatePlaceholder('videoCountOptional', formatValue(getFieldValue('videoCountOptional')) || optionalPlaceholder);
            updatePlaceholder('imgCountOptional', formatValue(getFieldValue('imgCountOptional')) || optionalPlaceholder);
            updatePlaceholder('videoDurationOptional', formatValue(getFieldValue('videoDurationOptional')) || optionalPlaceholder);
            updatePlaceholder('reviewsOptional', formatValue(getFieldValue('reviewsOptional')) || optionalPlaceholder);
            updatePlaceholder('durationOptional', formatValue(getFieldValue('durationOptional')) || optionalPlaceholder);
            updatePlaceholder('scriptOptional', formatValue(getFieldValue('scriptOptional')) || optionalPlaceholder);
            // --- End Placeholder Updates ---
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
            if (!controlName) { return; }

            const showHideTarget = find(`[${DATA_ATTR_TOGGLE_TARGET}="${controlName}"]`);
            const disableTargetInput = find(`[${DATA_ATTR_DISABLE_TARGET}="${controlName}"]`);
            const disableValue = control.getAttribute(DATA_ATTR_DISABLE_VALUE);

            if (!showHideTarget && !disableTargetInput) { return; }

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
                        if (disableValue !== null && disableTargetInput.value === disableValue) {
                             disableTargetInput.value = '';
                             disableTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                }
            };
            updateTargetsState();
            control.addEventListener('change', updateTargetsState);
        });
    };

    /**
     * ========================================================================
     * Character Counter Logic
     * ========================================================================
     */
     const initializeCharCounters = () => {
        const counterInputs = findAll(`[${DATA_ATTR_CHAR_COUNT_INPUT}]`);

        counterInputs.forEach(inputField => {
            const counterId = inputField.getAttribute(DATA_ATTR_CHAR_COUNT_INPUT);
            const maxLengthAttr = inputField.getAttribute(DATA_ATTR_CHAR_COUNT_MAX);
            if (!counterId || maxLengthAttr === null) { return; }
            const maxLength = parseInt(maxLengthAttr, 10);
            if (isNaN(maxLength)) { return; }
            const displayElement = find(`[${DATA_ATTR_CHAR_COUNT_DISPLAY}="${counterId}"]`);
            if (!displayElement) { return; }

            const updateCounter = () => {
                const currentLength = inputField.value.length;
                displayElement.style.color = currentLength > maxLength ? 'red' : '';
                displayElement.textContent = `${currentLength}/${maxLength}`;
            };
            inputField.addEventListener('input', updateCounter);
            updateCounter();
        });
     };

     /**
      * ========================================================================
      * NEW: Real-time Selection Display Logic
      * ========================================================================
      */
     const initializeSelectionDisplays = () => {
        const displayElements = findAll(`[${DATA_ATTR_SELECTION_DISPLAY}]`);
        const defaultText = "Bitte auswählen"; // Default text if nothing selected

        displayElements.forEach(displayElement => {
            const groupName = displayElement.getAttribute(DATA_ATTR_SELECTION_DISPLAY);
            if (!groupName) {
                console.warn('Selection display element missing group name:', displayElement);
                return;
            }

            // Find all input checkboxes for this specific group
            // Important: Search within the whole document or a relevant container if forms are isolated
            const inputCheckboxes = findAll(`input[type="checkbox"][${DATA_ATTR_SELECTION_INPUT}="${groupName}"]`);

            if (inputCheckboxes.length === 0) {
                console.warn(`No input checkboxes found for selection group "${groupName}"`);
                return;
            }

            // Function to update the display text
            const updateDisplay = () => {
                const selectedValues = Array.from(inputCheckboxes)
                                          .filter(checkbox => checkbox.checked) // Filter only checked boxes
                                          .map(checkbox => checkbox.value || checkbox.nextElementSibling?.textContent || ''); // Get value or label

                if (selectedValues.length > 0) {
                    displayElement.textContent = selectedValues.join(', '); // Join values with comma and space
                } else {
                    displayElement.textContent = defaultText; // Show default text if none selected
                }
            };

            // Add event listener to each checkbox in the group
            inputCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', updateDisplay);
            });

            // Initial update on page load
            updateDisplay();
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

        // Initialize Character Counters
        initializeCharCounters();

        // *** NEW: Initialize Real-time Selection Displays ***
        initializeSelectionDisplays();

    }); // End DOMContentLoaded

})(); // Ende der IIFE
