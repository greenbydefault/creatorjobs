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
    const DATA_ATTR_PREVIEW_PLACEHOLDER = 'data-preview-placeholder';
    const CLASS_ACTIVE_STEP = 'active';
    const CLASS_ACTIVE_INDICATOR = 'active';
    const CLASS_HIDE = 'hide';
    const CLASS_INPUT_ERROR = 'input-error'; // For general input errors
    const CLASS_JOB_TITLE_ERROR = 'job-title-error-border'; // Specific for job title error
    const CLASS_JOB_TITLE_SUCCESS = 'job-title-success-border'; // Specific for job title success
    const CLASS_INDICATOR_REACHABLE = 'reachable';

    // Toggle Attributes
    const DATA_ATTR_TOGGLE_CONTROL = 'data-toggle-control';
    const DATA_ATTR_TOGGLE_TARGET = 'data-toggle-target';
    const DATA_ATTR_DISABLE_TARGET = 'data-disable-target';
    const DATA_ATTR_DISABLE_VALUE = 'data-disable-value';
    const CLASS_DISABLED_BY_TOGGLE = 'disabled-by-toggle';
    const DATA_ATTR_TOGGLE_CLEAR = 'data-toggle-clear';

    // Character Counter Attributes
    const DATA_ATTR_CHAR_COUNT_INPUT = 'data-char-count-input';
    const DATA_ATTR_CHAR_COUNT_MAX = 'data-char-count-max';
    const DATA_ATTR_CHAR_COUNT_DISPLAY = 'data-char-count-display';

    // Selection Display Attributes
    const DATA_ATTR_SELECTION_INPUT = 'data-selection-input';
    const DATA_ATTR_SELECTION_DISPLAY = 'data-selection-display';

    // Custom Datepicker Attribute
    const DATA_ATTR_DATEPICKER = 'data-datepicker';
    const DATEPICKER_WRAPPER_CLASS = 'custom-datepicker-wrapper';
    const DATEPICKER_HEADER_CLASS = 'custom-datepicker-header';
    const DATEPICKER_CONTROLS_CLASS = 'custom-datepicker-controls';
    const DATEPICKER_TODAY_BTN_CLASS = 'custom-datepicker-today-btn';
    const DATEPICKER_GRID_CLASS = 'custom-datepicker-grid';
    const DATEPICKER_DAY_CLASS = 'custom-datepicker-day';
    const DATEPICKER_DAY_HEADER_CLASS = 'custom-datepicker-day-header';
    const DATEPICKER_DAY_OTHER_MONTH_CLASS = 'other-month';
    const DATEPICKER_DAY_SELECTED_CLASS = 'selected';
    const DATEPICKER_DAY_TODAY_CLASS = 'today';

    // Transition duration
    const TRANSITION_DURATION = 400; // ms
    const DATEPICKER_PRIMARY_COLOR = '#fd5392';

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

    const fadeInElement = (element) => {
         if (!element || element.style.opacity === '1') return;
         if (getComputedStyle(element).display === 'none') {
             element.style.display = '';
         }
         requestAnimationFrame(() => {
             setTimeout(() => {
                 element.style.opacity = '1';
             }, 10);
         });
    };

    const formatDateDDMMYYYY = (dateStringOrDate) => {
        if (!dateStringOrDate) return null;
        let d;
        if (dateStringOrDate instanceof Date) {
            d = dateStringOrDate;
        } else if (typeof dateStringOrDate === 'string') {
            if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStringOrDate)) {
                return dateStringOrDate;
            }
            const parts = dateStringOrDate.split('-');
            if (parts.length === 3) {
                d = new Date(parts[0], parseInt(parts[1], 10) - 1, parts[2]);
            } else {
                d = new Date(dateStringOrDate);
            }
        } else {
            return null;
        }
        if (isNaN(d.getTime())) return null;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    };

    const formatDateYYYYMMDD = (date) => {
        if (!date) return null;
        let d = (date instanceof Date) ? date : new Date(date);
        if (isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const parseDateDDMMYYYY = (dateString) => {
        if (!dateString || typeof dateString !== 'string') return null;
        const parts = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (parts) {
            const day = parseInt(parts[1], 10);
            const month = parseInt(parts[2], 10) - 1;
            const year = parseInt(parts[3], 10);
            const date = new Date(year, month, day);
            if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                return date;
            }
        }
        return null;
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

             if (this.prevButton) hideElement(this.prevButton);
             if (this.submitButton) hideElement(this.submitButton);

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
            this.goToStep(0, true);
        }

        addEventListeners() {
            const handleNext = async () => {
                 if (this.isTransitioning) return;
                 await this.goToNextStep();
            };
            const handlePrev = () => {
                 if (this.isTransitioning) return;
                 this.goToPreviousStep();
            };
            this.nextButton?.addEventListener('click', handleNext);
            this.prevButton?.addEventListener('click', handlePrev);
            this.indicators.forEach(indicator => {
                indicator.addEventListener('click', async (event) => {
                    event.preventDefault();
                    if (this.isTransitioning) return;
                    const targetStepNumber = parseInt(indicator.getAttribute(DATA_ATTR_INDICATOR), 10);
                    if (isNaN(targetStepNumber)) return;
                    const targetIndex = targetStepNumber - 1;
                    if (targetIndex >= 0 && targetIndex < this.totalSteps && targetIndex <= this.maxReachedStepIndex + 1) {
                         if (targetIndex > this.currentStepIndex) {
                            let canProceed = true;
                            for (let i = this.currentStepIndex; i < targetIndex; i++) {
                                if (!await this.validateStep(i)) {
                                    console.log(`Validation failed for intermediate step ${i + 1}, cannot jump.`);
                                    const firstInvalidInStep = find(':invalid, .input-error, .job-title-error-border', this.steps[i]);
                                    firstInvalidInStep?.focus();
                                    canProceed = false;
                                    break;
                                }
                            }
                            if (!canProceed) return;
                         }
                         this.goToStep(targetIndex);
                    }
                });
            });
            this.form.addEventListener('keydown', async (event) => {
                if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
                    const isSubmitVisible = this.submitButton && !this.submitButton.classList.contains(CLASS_HIDE);
                    if (document.activeElement !== this.submitButton || !isSubmitVisible) {
                        event.preventDefault();
                        if (this.nextButton && !this.nextButton.classList.contains(CLASS_HIDE)) {
                           await handleNext();
                        }
                    }
                }
            });
        }

        async goToNextStep() {
             if (!await this.validateStep(this.currentStepIndex)) {
                 console.log("Validation failed for step", this.currentStepIndex + 1);
                 const firstInvalid = find(':invalid, .input-error, .job-title-error-border', this.steps[this.currentStepIndex]);
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
            this.updateIndicators();
            this.updateButtonStates();
            if (this.currentStepIndex === this.totalSteps - 1) {
                this.updatePreview();
            }
            if (isInitialLoad) {
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

        async validateStep(stepIndex) {
            const currentStepElement = this.steps[stepIndex];
            if (!currentStepElement) return false;

            let isStepValid = true;

            const requiredInputs = findAll('input[required], select[required], textarea[required]', currentStepElement);
            requiredInputs.forEach(input => {
                removeClass(input, CLASS_INPUT_ERROR);
                if (!input.checkValidity() && !input.disabled) {
                    isStepValid = false;
                    addClass(input, CLASS_INPUT_ERROR);
                }
            });

            if (!isStepValid) {
                console.log('[DEBUG MultiStepForm] Standard validation failed for step', stepIndex + 1);
                return false;
            }

            const jobTitleInput = find('#jobname', currentStepElement);
            const messageElement = find('#message', currentStepElement.closest('form') || document);

            if (jobTitleInput) {
                console.log('[DEBUG MultiStepForm] Found jobTitleInput in step', stepIndex + 1);
                const jobTitle = jobTitleInput.value.trim();
                jobTitleInput.style.border = '';
                removeClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                removeClass(jobTitleInput, CLASS_JOB_TITLE_SUCCESS);
                if (messageElement) messageElement.textContent = '';

                if (jobTitle) {
                    if (!isValidJobTitle(jobTitle)) {
                        jobTitleInput.style.border = '2px solid #D92415';
                        addClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                        if (messageElement) {
                            messageElement.textContent = 'Der Jobtitel enthält ungültige Zeichen.';
                            messageElement.style.color = 'red';
                        }
                        console.log('[DEBUG MultiStepForm] Job title invalid characters');
                        return false;
                    }

                    try {
                        console.log('[DEBUG MultiStepForm] Checking if job title exists:', jobTitle);
                        const exists = await checkJobTitleExists(jobTitle);
                        console.log('[DEBUG MultiStepForm] Job title exists result:', exists);
                        if (exists) {
                            jobTitleInput.style.border = '2px solid #D92415';
                            addClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                            if (messageElement) {
                                messageElement.textContent = 'Dieser Jobtitel existiert bereits.';
                                messageElement.style.color = 'red';
                            }
                            console.log('[DEBUG MultiStepForm] Job title already exists');
                            return false;
                        } else {
                            jobTitleInput.style.border = '2px solid #3DB927';
                            addClass(jobTitleInput, CLASS_JOB_TITLE_SUCCESS);
                            if (messageElement) {
                                messageElement.textContent = 'Dieser Jobtitel ist verfügbar.';
                                messageElement.style.color = 'green';
                            }
                            console.log('[DEBUG MultiStepForm] Job title available');
                        }
                    } catch (error) {
                        if (messageElement) {
                            messageElement.textContent = 'Fehler bei der Überprüfung des Jobtitels.';
                            messageElement.style.color = 'red';
                        }
                        console.error('[DEBUG MultiStepForm] Error in checkJobTitleExists:', error);
                        return false;
                    }
                } else if (jobTitleInput.hasAttribute('required')) {
                    addClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                    if (messageElement) {
                        messageElement.textContent = 'Jobtitel ist ein Pflichtfeld.';
                        messageElement.style.color = 'red';
                    }
                     console.log('[DEBUG MultiStepForm] Job title is required but empty');
                    return false;
                }
            }
            console.log('[DEBUG MultiStepForm] Step validation passed for step', stepIndex + 1);
            return true;
        }

        updatePreview() {
            const lastStepContainer = this.steps[this.totalSteps - 1];
            if (!lastStepContainer) return;
            const optionalPlaceholder = 'Keine Angabe';
            const requiredPlaceholder = '<i>Keine Angabe</i>';
            const addressFieldElement = find(`[${DATA_ATTR_PREVIEW_FIELD}="job-adress-optional"]`, this.form);
            const getFieldValue = (fieldName, isCheckboxGroup = false) => {
                const field = (fieldName === 'job-adress-optional' && addressFieldElement)
                                ? addressFieldElement
                                : find(`[${DATA_ATTR_PREVIEW_FIELD}="${fieldName}"]`, this.form);
                if (!field) return null;
                if (isCheckboxGroup) {
                    const fields = findAll(`[${DATA_ATTR_PREVIEW_FIELD}="${fieldName}"]:checked`, this.form);
                    if (!fields || fields.length === 0) return null;
                    return Array.from(fields).map(cb => cb.value || cb.nextElementSibling?.textContent || '');
                } else {
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
                    return value.join(', ');
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
                    case 'date': return formatDateDDMMYYYY(value);
                    default: return value;
                }
            };
            const updatePlaceholder = (fieldName, displayValue) => {
                 const placeholderElement = find(`[${DATA_ATTR_PREVIEW_PLACEHOLDER}="${fieldName}"]`, lastStepContainer);
                 if (placeholderElement) {
                     if (typeof displayValue === 'string' && (displayValue.includes('<') || displayValue.includes('&'))) {
                         placeholderElement.innerHTML = displayValue;
                     } else {
                         placeholderElement.textContent = displayValue;
                     }
                 }
            };
            let projectNameVal = getFieldValue('projectName');
            updatePlaceholder('projectName', formatValue(projectNameVal) || requiredPlaceholder);
            let jobAddressDisplayVal = 'Remote';
             if (addressFieldElement && !addressFieldElement.disabled) {
                 let jobAddressContent = getFieldValue('job-adress-optional');
                 jobAddressDisplayVal = jobAddressContent === null ? 'Remote' : formatValue(jobAddressContent, 'textarea');
             }
            updatePlaceholder('job-adress-optional', jobAddressDisplayVal);
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
            let jobOnlineVal = getFieldValue('jobOnline');
            let jobOnlineDisplay = '3 Tage';
            if (jobOnlineVal !== null) {
                const formattedDate = formatValue(jobOnlineVal, 'date');
                if (formattedDate) {
                    jobOnlineDisplay = formattedDate;
                }
            }
            updatePlaceholder('jobOnline', jobOnlineDisplay);
            updatePlaceholder('creatorCountOptional', formatValue(getFieldValue('creatorCountOptional')) || optionalPlaceholder);
            updatePlaceholder('genderOptional', formatValue(getFieldValue('genderOptional')) || optionalPlaceholder);
            updatePlaceholder('videoCountOptional', formatValue(getFieldValue('videoCountOptional')) || optionalPlaceholder);
            updatePlaceholder('imgCountOptional', formatValue(getFieldValue('imgCountOptional')) || optionalPlaceholder);
            updatePlaceholder('videoDurationOptional', formatValue(getFieldValue('videoDurationOptional')) || optionalPlaceholder);
            updatePlaceholder('reviewsOptional', formatValue(getFieldValue('reviewsOptional')) || optionalPlaceholder);
            updatePlaceholder('durationOptional', formatValue(getFieldValue('durationOptional')) || optionalPlaceholder);
            updatePlaceholder('scriptOptional', formatValue(getFieldValue('scriptOptional')) || optionalPlaceholder);
        }
    } // End MultiStepForm Class

    /**
     * ========================================================================
     * Toggle Field Logic
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
            const clearTargets = findAll(`[${DATA_ATTR_TOGGLE_CLEAR}="${controlName}"]`);
            if (!showHideTarget && !disableTargetInput && clearTargets.length === 0) { return; }
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
                if (!isControlActive && clearTargets.length > 0) {
                     clearTargets.forEach(fieldToClear => {
                         if (fieldToClear.type === 'checkbox' || fieldToClear.type === 'radio') {
                             fieldToClear.checked = false;
                         } else if (fieldToClear.tagName === 'SELECT') {
                             fieldToClear.selectedIndex = 0;
                         } else {
                             fieldToClear.value = '';
                         }
                         fieldToClear.dispatchEvent(new Event('change', { bubbles: true }));
                     });
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
                let currentLength = inputField.value.length;
                if (currentLength > maxLength) {
                    inputField.value = inputField.value.substring(0, maxLength);
                    currentLength = maxLength;
                    displayElement.style.color = 'red';
                } else {
                    displayElement.style.color = '';
                }
                displayElement.textContent = `${currentLength}/${maxLength}`;
            };
            inputField.addEventListener('input', updateCounter);
            updateCounter();
        });
     };

     /**
      * ========================================================================
      * Real-time Selection Display Logic
      * ========================================================================
      */
     const initializeSelectionDisplays = () => {
        const displayElements = findAll(`[${DATA_ATTR_SELECTION_DISPLAY}]`);
        const defaultText = "Bitte auswählen";
        displayElements.forEach(displayElement => {
            const groupName = displayElement.getAttribute(DATA_ATTR_SELECTION_DISPLAY);
            if (!groupName) { return; }
            const inputCheckboxes = findAll(`input[type="checkbox"][${DATA_ATTR_SELECTION_INPUT}="${groupName}"]`);
            if (inputCheckboxes.length === 0) { return; }
            const updateDisplay = () => {
                const selectedValues = Array.from(inputCheckboxes)
                                          .filter(checkbox => checkbox.checked)
                                          .map(checkbox => checkbox.value || checkbox.nextElementSibling?.textContent || '');
                displayElement.textContent = selectedValues.length > 0 ? selectedValues.join(', ') : defaultText;
            };
            inputCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', updateDisplay);
            });
            updateDisplay();
        });
     };

    /**
     * ========================================================================
     * Custom Datepicker Logic
     * ========================================================================
     */
    let currentDatePickerInput = null;
    let datePickerWrapper = null;
    let currentDisplayDate = new Date();

    const createDatePickerUI = () => {
        if (datePickerWrapper) return datePickerWrapper;
        datePickerWrapper = document.createElement('div');
        datePickerWrapper.className = DATEPICKER_WRAPPER_CLASS;
        datePickerWrapper.style.display = 'none';
        datePickerWrapper.style.position = 'absolute';
        datePickerWrapper.style.zIndex = '1000';
        const header = document.createElement('div');
        header.className = DATEPICKER_HEADER_CLASS;
        const prevMonthButton = document.createElement('button');
        prevMonthButton.type = 'button';
        prevMonthButton.innerHTML = '&lt;';
        prevMonthButton.setAttribute('aria-label', 'Vorheriger Monat');
        const monthYearDisplay = document.createElement('span');
        const nextMonthButton = document.createElement('button');
        nextMonthButton.type = 'button';
        nextMonthButton.innerHTML = '&gt;';
        nextMonthButton.setAttribute('aria-label', 'Nächster Monat');
        const controlsDiv = document.createElement('div');
        controlsDiv.className = DATEPICKER_CONTROLS_CLASS;
        controlsDiv.appendChild(prevMonthButton);
        controlsDiv.appendChild(monthYearDisplay);
        controlsDiv.appendChild(nextMonthButton);
        const todayButton = document.createElement('button');
        todayButton.type = 'button';
        todayButton.textContent = 'Heute';
        todayButton.className = DATEPICKER_TODAY_BTN_CLASS;
        todayButton.setAttribute('aria-label', 'Heute auswählen');
        header.appendChild(controlsDiv);
        header.appendChild(todayButton);
        datePickerWrapper.appendChild(header);
        prevMonthButton.addEventListener('click', () => {
            currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
            renderCalendarDays(currentDisplayDate);
        });
        nextMonthButton.addEventListener('click', () => {
            currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
            renderCalendarDays(currentDisplayDate);
        });
        todayButton.addEventListener('click', () => {
            const today = new Date();
            if (currentDatePickerInput) {
                currentDatePickerInput.value = (currentDatePickerInput.type === 'date')
                                              ? formatDateYYYYMMDD(today)
                                              : formatDateDDMMYYYY(today);
                currentDatePickerInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            hideCustomDatePicker();
        });
        const daysGrid = document.createElement('div');
        daysGrid.className = DATEPICKER_GRID_CLASS;
        datePickerWrapper.appendChild(daysGrid);
        document.body.appendChild(datePickerWrapper);
        const style = document.createElement('style');
        style.textContent = `
            .${DATEPICKER_WRAPPER_CLASS} { background: white; border: 1px solid #e0e0e0; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 15px; width: 300px; border-radius: 8px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #333; }
            .${DATEPICKER_HEADER_CLASS} { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
            .${DATEPICKER_CONTROLS_CLASS} { display: flex; align-items: center; font-weight: 600; font-size: 1.05em; }
            .${DATEPICKER_CONTROLS_CLASS} button { background: transparent; border: none; padding: 8px; cursor: pointer; font-size: 1.4em; color: #555; line-height: 1; transition: color 0.2s ease-in-out; }
            .${DATEPICKER_CONTROLS_CLASS} button:hover { color: ${DATEPICKER_PRIMARY_COLOR}; }
            .${DATEPICKER_CONTROLS_CLASS} span { margin: 0 12px; color: #333; min-width: 120px; text-align: center; }
            .${DATEPICKER_TODAY_BTN_CLASS} { background: #f5f5f5; border: 1px solid #ddd; padding: 6px 12px; cursor: pointer; border-radius: 6px; font-size: 0.9em; color: #333; font-weight: 500; transition: background-color 0.2s ease-in-out; }
            .${DATEPICKER_TODAY_BTN_CLASS}:hover { background-color: #e9e9e9; }
            .${DATEPICKER_GRID_CLASS} { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center; }
            .${DATEPICKER_DAY_HEADER_CLASS} { font-weight: 600; font-size: 0.8em; color: #888; padding: 8px 0; text-transform: uppercase; }
            .${DATEPICKER_DAY_CLASS} { padding: 0; cursor: pointer; border-radius: 50%; font-size: 0.9em; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-sizing: border-box; transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out, border-color 0.2s ease-in-out; border: 1px solid transparent; }
            .${DATEPICKER_DAY_CLASS}:hover { background-color: #f0f0f0; border-color: #e0e0e0; }
            .${DATEPICKER_DAY_OTHER_MONTH_CLASS} { color: #ccc; cursor: default; }
            .${DATEPICKER_DAY_OTHER_MONTH_CLASS}:hover { background-color: transparent; border-color: transparent; }
            .${DATEPICKER_DAY_TODAY_CLASS} { font-weight: 700; border: 1px solid ${DATEPICKER_PRIMARY_COLOR}; color: ${DATEPICKER_PRIMARY_COLOR}; }
            .${DATEPICKER_DAY_TODAY_CLASS}:hover { background-color: #fce4ec; }
            .${DATEPICKER_DAY_SELECTED_CLASS} { background-color: ${DATEPICKER_PRIMARY_COLOR}; color: white !important; border-color: ${DATEPICKER_PRIMARY_COLOR}; font-weight: 700; }
            .${DATEPICKER_DAY_SELECTED_CLASS}:hover { background-color: #e64a83; border-color: #e64a83; }
        `;
        document.head.appendChild(style);
        return datePickerWrapper;
    };

    const renderCalendarDays = (date) => {
        if (!datePickerWrapper) createDatePickerUI();
        const monthYearDisplay = datePickerWrapper.querySelector(`.${DATEPICKER_CONTROLS_CLASS} span`);
        const daysGrid = datePickerWrapper.querySelector(`.${DATEPICKER_GRID_CLASS}`);
        daysGrid.innerHTML = '';
        const month = date.getMonth();
        const year = date.getFullYear();
        const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
        const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
        monthYearDisplay.textContent = `${monthNames[month]} ${year}`;
        dayNames.forEach(dayName => {
            const dayHeaderEl = document.createElement('div');
            dayHeaderEl.className = DATEPICKER_DAY_HEADER_CLASS;
            dayHeaderEl.textContent = dayName;
            daysGrid.appendChild(dayHeaderEl);
        });
        let firstDayOfMonth = new Date(year, month, 1).getDay();
        firstDayOfMonth = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        today.setHours(0,0,0,0);
        let selectedDate = null;
        if (currentDatePickerInput && currentDatePickerInput.value) {
            selectedDate = parseDateDDMMYYYY(currentDatePickerInput.value) || new Date(currentDatePickerInput.value);
            if (selectedDate && !isNaN(selectedDate.getTime())) {
                selectedDate.setHours(0,0,0,0);
            } else {
                selectedDate = null;
            }
        }
        for (let i = 0; i < firstDayOfMonth; i++) {
            daysGrid.appendChild(document.createElement('div'));
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = DATEPICKER_DAY_CLASS;
            dayEl.textContent = day;
            const currentDate = new Date(year, month, day);
            currentDate.setHours(0,0,0,0);
            if (currentDate.getTime() === today.getTime()) {
                addClass(dayEl, DATEPICKER_DAY_TODAY_CLASS);
            }
            if (selectedDate && currentDate.getTime() === selectedDate.getTime()) {
                addClass(dayEl, DATEPICKER_DAY_SELECTED_CLASS);
            }
            dayEl.addEventListener('click', () => {
                if (currentDatePickerInput) {
                    if (currentDatePickerInput.type === 'date') {
                        currentDatePickerInput.value = formatDateYYYYMMDD(currentDate);
                    } else {
                        currentDatePickerInput.value = formatDateDDMMYYYY(currentDate);
                    }
                    currentDatePickerInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                hideCustomDatePicker();
            });
            daysGrid.appendChild(dayEl);
        }
    };

    const showCustomDatePicker = (inputElement) => {
        if (!datePickerWrapper) createDatePickerUI();
        currentDatePickerInput = inputElement;
        const initialDateStr = inputElement.value;
        let parsedDate = null;
        if (inputElement.type === 'date' && initialDateStr) {
            const parts = initialDateStr.split('-');
            if (parts.length === 3) {
                parsedDate = new Date(parts[0], parseInt(parts[1],10) - 1, parts[2]);
            }
        } else {
            parsedDate = parseDateDDMMYYYY(initialDateStr);
        }
        currentDisplayDate = (parsedDate && !isNaN(parsedDate.getTime())) ? parsedDate : new Date();

        renderCalendarDays(currentDisplayDate);
        const inputRect = inputElement.getBoundingClientRect();
        datePickerWrapper.style.top = `${inputRect.bottom + window.scrollY + 5}px`;
        datePickerWrapper.style.left = `${inputRect.left + window.scrollX}px`;
        datePickerWrapper.style.display = 'block';
    };

    const hideCustomDatePicker = () => {
        if (datePickerWrapper) {
            datePickerWrapper.style.display = 'none';
        }
        currentDatePickerInput = null;
    };

    document.addEventListener('click', (event) => {
        if (datePickerWrapper && datePickerWrapper.style.display === 'block') {
            if (currentDatePickerInput && !currentDatePickerInput.contains(event.target) && !datePickerWrapper.contains(event.target)) {
                hideCustomDatePicker();
            }
        }
    });

    const initializeCustomDatepickers = () => {
        const datepickerInputs = findAll(`[${DATA_ATTR_DATEPICKER}]`);
        datepickerInputs.forEach(input => {
            input.addEventListener('focus', (event) => {
                event.preventDefault();
                 showCustomDatePicker(input);
            });
            input.addEventListener('click', (event) => {
                event.preventDefault();
                 showCustomDatePicker(input);
            });
        });
    };


    /**
     * ========================================================================
     * Job Title Validation Logic
     * ========================================================================
     */
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    function isValidJobTitle(title) {
        const regex = /^[a-zA-Z0-9äöüÄÖÜß\s\-]+$/;
        return regex.test(title);
    }

    async function checkJobTitleExists(title) {
        console.log('[DEBUG JobTitle] Checking existence for:', title); // DEBUG
        if (typeof window.config === 'undefined' || typeof window.config.apiKey === 'undefined') {
            console.error('[DEBUG JobTitle] Airtable API Key (window.config.apiKey) not found.');
            return true;
        }
        const apiKey = window.config.apiKey;
        const baseId = 'appVQBmxIpYuapHVR';
        const tableName = 'Jobs';
        const dynamicFieldName = 'Name';

        const query = encodeURIComponent(`LOWER({${dynamicFieldName}})="${title.toLowerCase()}"`);
        const url = `https://api.airtable.com/v0/${baseId}/${tableName}?filterByFormula=${query}`;
        console.log('[DEBUG JobTitle] Airtable URL:', url); // DEBUG

        try {
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${apiKey}` }
            });
            const data = await response.json();
            console.log('[DEBUG JobTitle] Airtable response data:', data); // DEBUG
            return data.records && data.records.length > 0;
        } catch (error) {
            console.error('[DEBUG JobTitle] Error checking job title:', error);
            return true;
        }
    }

    const initializeJobTitleValidation = () => {
        const jobTitleInput = document.getElementById('jobname');
        const messageElement = document.getElementById('message');

        if (!jobTitleInput) {
            console.log('[DEBUG JobTitle] jobTitleInput not found.'); // DEBUG
            return;
        }
        if (!messageElement) {
            console.warn('[DEBUG JobTitle] messageElement not found.'); // DEBUG
        }

        console.log('[DEBUG JobTitle] Initializing validation for:', jobTitleInput); // DEBUG

        jobTitleInput.addEventListener('input', debounce(async function (e) {
            const jobTitle = e.target.value;
            console.log('[DEBUG JobTitle] Input event, title:', jobTitle); // DEBUG

            jobTitleInput.style.border = '';
            removeClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
            removeClass(jobTitleInput, CLASS_JOB_TITLE_SUCCESS);
            if (messageElement) messageElement.textContent = '';

            if (!jobTitle.trim()) {
                console.log('[DEBUG JobTitle] Title is empty, skipping validation.'); // DEBUG
                return;
            }

            if (!isValidJobTitle(jobTitle)) {
                jobTitleInput.style.border = '2px solid #D92415';
                addClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                if (messageElement) {
                    messageElement.textContent = 'Der Jobtitel enthält ungültige Zeichen.';
                    messageElement.style.color = 'red';
                }
                console.log('[DEBUG JobTitle] Invalid characters.'); // DEBUG
                return;
            }

            try {
                const exists = await checkJobTitleExists(jobTitle);
                if (exists) {
                    jobTitleInput.style.border = '1px solid #FF7983';
                    addClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                    if (messageElement) {
                        messageElement.textContent = 'Dieser Jobtitel existiert bereits.';
                        messageElement.style.color = 'red';
                    }
                     console.log('[DEBUG JobTitle] Title exists.'); // DEBUG
                } else {
                    jobTitleInput.style.border = '1px solid #9EC0B2';
                    addClass(jobTitleInput, CLASS_JOB_TITLE_SUCCESS);
                    if (messageElement) {
                        messageElement.textContent = 'Dieser Jobtitel ist verfügbar.';
                        messageElement.style.color = 'green';
                    }
                    console.log('[DEBUG JobTitle] Title available.'); // DEBUG
                }
            } catch (error) {
                if (messageElement) {
                    messageElement.textContent = 'Fehler bei der Überprüfung des Jobtitels.';
                    messageElement.style.color = 'red';
                }
                 console.error('[DEBUG JobTitle] Error during existence check in event listener:', error); // DEBUG
            }
        }, 500));
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

        // Initialize Real-time Selection Displays
        initializeSelectionDisplays();

        // Initialize Custom Datepickers
        initializeCustomDatepickers();

        // Initialize Job Title Validation
        initializeJobTitleValidation();

    }); // End DOMContentLoaded

})(); // Ende der IIFE
