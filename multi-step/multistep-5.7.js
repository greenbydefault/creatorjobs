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
    const CLASS_MSG_CONTAINER = 'msg-container'; // *** NEU: Klasse für den Nachrichten-Container

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
    const DATA_ATTR_SELECTION_DISPLAY = 'data-selection-display'; // Added for grouping selection inputs

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

    // Cloudflare Worker URL for Job Title Check
    const JOB_TITLE_CHECK_WORKER_URL = 'https://airtable-name-check.oliver-258.workers.dev/';


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

    /**
     * *** NEU: Funktion zur Anzeige von Validierungsnachrichten ***
     * Zeigt eine Nachricht im dafür vorgesehenen Container an.
     * @param {string} message - Die anzuzeigende Nachricht.
     * @param {'success' | 'error' | 'clear'} type - Der Typ der Nachricht (für die Farbgebung).
     */
    const displayValidationMessage = (message, type) => {
        const msgContainer = find(`.${CLASS_MSG_CONTAINER}`);
        if (!msgContainer) {
            console.warn('Message container (.msg-container) not found.');
            return;
        }

        msgContainer.textContent = message;
        if (type === 'success') {
            msgContainer.style.color = 'green';
        } else if (type === 'error') {
            msgContainer.style.color = 'red';
        } else { // 'clear' or any other value
            msgContainer.style.color = '';
        }
    };


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
                const targetStepNumber = 1; // Initial step is 1
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
            this.goToStep(0, true); // Initialize on the first step
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
                    // Allow jumping to any step up to the max reached step + 1 (the next step)
                    if (targetIndex >= 0 && targetIndex < this.totalSteps && targetIndex <= this.maxReachedStepIndex + 1) {
                        if (targetIndex > this.currentStepIndex) {
                            // If jumping forward, validate all intermediate steps
                            let canProceed = true;
                            for (let i = this.currentStepIndex; i < targetIndex; i++) {
                                if (!await this.validateStep(i)) {
                                    console.log(`Validation failed for intermediate step ${i + 1}, cannot jump.`);
                                    // Find the first invalid element in the failed step and focus it
                                    const firstInvalidInStep = find(':invalid, .input-error, .job-title-error-border', this.steps[i]);
                                    firstInvalidInStep?.focus();
                                    canProceed = false;
                                    break;
                                }
                            }
                            if (!canProceed) return; // Stop if any intermediate step validation failed
                        }
                        // If jumping backward or to the next valid step, proceed
                        this.goToStep(targetIndex);
                    }
                });
            });
            // Add keyboard navigation for Enter key
            this.form.addEventListener('keydown', async (event) => {
                // Prevent default form submission on Enter key unless it's a textarea or the submit button is focused and visible
                if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
                    const isSubmitVisible = this.submitButton && !this.submitButton.classList.contains(CLASS_HIDE);
                    if (document.activeElement !== this.submitButton || !isSubmitVisible) {
                        event.preventDefault();
                        // Trigger next step if next button is visible
                        if (this.nextButton && !this.nextButton.classList.contains(CLASS_HIDE)) {
                            await handleNext();
                        }
                    }
                }
            });
        }

        async goToNextStep() {
            // Validate the current step before proceeding
            if (!await this.validateStep(this.currentStepIndex)) {
                console.log("[DEBUG MultiStepForm] goToNextStep: Validation FAILED for step", this.currentStepIndex + 1);
                // Find the first invalid element and trigger native validation message
                const firstInvalid = find(':invalid, .input-error, .job-title-error-border', this.steps[this.currentStepIndex]);
                firstInvalid?.reportValidity();
                firstInvalid?.focus(); // Focus the first invalid element
                return; // Stop if validation fails
            }
            console.log("[DEBUG MultiStepForm] goToNextStep: Validation PASSED for step", this.currentStepIndex + 1);
            // Move to the next step if not on the last step
            if (this.currentStepIndex < this.totalSteps - 1) {
                this.goToStep(this.currentStepIndex + 1);
            }
        }

        goToPreviousStep() {
            // Move to the previous step if not on the first step
            if (this.currentStepIndex > 0) {
                this.goToStep(this.currentStepIndex - 1);
            }
        }

        goToStep(stepIndex, isInitialLoad = false) {
            // Prevent transition if already transitioning, index is out of bounds, or already on the target step
            if (this.isTransitioning || stepIndex < 0 || stepIndex >= this.totalSteps || stepIndex === this.currentStepIndex) {
                return;
            }

            this.isTransitioning = true;
            const previousStepIndex = this.currentStepIndex;
            this.currentStepIndex = stepIndex;
            const targetStepNumber = this.currentStepIndex + 1;

            // Update max reached step if moving forward
            if (this.currentStepIndex > this.maxReachedStepIndex) {
                this.maxReachedStepIndex = this.currentStepIndex;
            }

            const outgoingStep = this.steps[previousStepIndex];
            const incomingStep = this.steps[this.currentStepIndex];

            // Find guides based on step number attribute
            const outgoingGuide = this.guides.find(g => parseInt(g.getAttribute(DATA_ATTR_GUIDE), 10) === (previousStepIndex + 1));
            const incomingGuide = this.guides.find(g => parseInt(g.getAttribute(DATA_ATTR_GUIDE), 10) === targetStepNumber);

            // Update UI elements
            this.updateIndicators();
            this.updateButtonStates();

            // Update preview on the last step
            if (this.currentStepIndex === this.totalSteps - 1) {
                this.updatePreview();
            }

            // Handle initial load without transitions
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

            // Handle step transitions with fade effect
            const fadeInNewElements = () => {
                if (incomingStep) {
                    fadeInElement(incomingStep);
                    addClass(incomingStep, CLASS_ACTIVE_STEP);
                }
                if (incomingGuide) {
                    fadeInElement(incomingGuide);
                }
                // Allow next transition after fade-in completes
                setTimeout(() => {
                    this.isTransitioning = false;
                }, TRANSITION_DURATION);
            };

            // Fade out outgoing elements, then fade in incoming elements
            if (outgoingGuide) fadeOutElement(outgoingGuide);
            if (outgoingStep) {
                removeClass(outgoingStep, CLASS_ACTIVE_STEP);
                fadeOutElement(outgoingStep, fadeInNewElements);
            } else {
                // If no outgoing step (shouldn't happen after first step), just fade in
                fadeInNewElements();
            }
        }

        updateIndicators() {
            const targetStepNumber = this.currentStepIndex + 1;
            this.indicators.forEach((indicator) => {
                const indicatorStepNumber = parseInt(indicator.getAttribute(DATA_ATTR_INDICATOR), 10);
                const indicatorIndex = indicatorStepNumber - 1;

                // Remove active and reachable classes first
                removeClass(indicator, CLASS_ACTIVE_INDICATOR);
                removeClass(indicator, CLASS_INDICATOR_REACHABLE);

                // Add active class to the current step indicator
                if (!isNaN(indicatorStepNumber) && indicatorStepNumber === targetStepNumber) {
                    addClass(indicator, CLASS_ACTIVE_INDICATOR);
                }
                // Add reachable class to indicators for steps that have been reached or passed
                else if (indicatorIndex <= this.maxReachedStepIndex) {
                    addClass(indicator, CLASS_INDICATOR_REACHABLE);
                }
            });
        }

        updateButtonStates() {
            // Show/hide previous button
            if (this.prevButton) {
                this.currentStepIndex === 0 ? hideElement(this.prevButton) : showElement(this.prevButton);
            }
            // Show/hide next button
            if (this.nextButton) {
                this.currentStepIndex === this.totalSteps - 1 ? hideElement(this.nextButton) : showElement(this.nextButton);
            }
            // Show/hide submit button
            if (this.submitButton) {
                this.currentStepIndex === this.totalSteps - 1 ? showElement(this.submitButton) : hideElement(this.submitButton);
            }
        }

        async validateStep(stepIndex) {
            const currentStepElement = this.steps[stepIndex];
            if (!currentStepElement) return false;

            let isStepValid = true;

            // Validate standard required inputs
            const requiredInputs = findAll('input[required], select[required], textarea[required]', currentStepElement);
            requiredInputs.forEach(input => {
                removeClass(input, CLASS_INPUT_ERROR); // Clear previous error state
                // Check validity only if the input is not disabled by a toggle
                if (!input.checkValidity() && !input.disabled) {
                    isStepValid = false;
                    addClass(input, CLASS_INPUT_ERROR); // Add error class for styling
                }
            });

            // If standard validation failed, stop here
            if (!isStepValid) {
                console.log('[DEBUG MultiStepForm] Standard validation failed for step', stepIndex + 1);
                return false;
            }

            // --- Custom Validation for Job Title ---
            const jobTitleInput = find('#jobname', currentStepElement);

            if (jobTitleInput) {
                console.log('[DEBUG MultiStepForm] Found jobTitleInput in step', stepIndex + 1);
                const jobTitle = jobTitleInput.value.trim();

                // Reset border and message before validation
                jobTitleInput.style.border = '';
                removeClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                removeClass(jobTitleInput, CLASS_JOB_TITLE_SUCCESS);
                displayValidationMessage('', 'clear'); // *** GEÄNDERT: Nachricht löschen

                // If job title is required but empty
                if (!jobTitle && jobTitleInput.hasAttribute('required')) {
                    jobTitleInput.style.border = '1px solid #D92415';
                    addClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                    displayValidationMessage('Jobtitel ist ein Pflichtfeld.', 'error'); // *** GEÄNDERT: Nachricht anzeigen
                    console.log('[DEBUG MultiStepForm] Job title is required but empty');
                    return false;
                }

                // If job title is not empty, perform format and existence checks
                if (jobTitle) {
                    // Check for invalid characters
                    if (!isValidJobTitle(jobTitle)) {
                        jobTitleInput.style.border = '1px solid #D92415';
                        addClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                        displayValidationMessage('Der Jobtitel enthält ungültige Zeichen.', 'error'); // *** GEÄNDERT: Nachricht anzeigen
                        console.log('[DEBUG MultiStepForm] Job title invalid characters');
                        return false;
                    }

                    // Check if job title already exists via Cloudflare Worker
                    try {
                        console.log('[DEBUG MultiStepForm] Checking if job title exists via Worker:', jobTitle);
                        const exists = await checkJobTitleExists(jobTitle);
                        console.log('[DEBUG MultiStepForm] Job title exists result from Worker:', exists);

                        if (exists) {
                            jobTitleInput.style.border = '1px solid #D92415';
                            addClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                            displayValidationMessage('Dieser Jobtitel existiert bereits.', 'error'); // *** GEÄNDERT: Nachricht anzeigen
                            console.log('[DEBUG MultiStepForm] Job title already exists');
                            return false; // Validation fails if title exists
                        } else {
                            jobTitleInput.style.border = '1px solid #3DB927';
                            addClass(jobTitleInput, CLASS_JOB_TITLE_SUCCESS);
                            displayValidationMessage('Dieser Jobtitel ist verfügbar.', 'success'); // *** GEÄNDERT: Nachricht anzeigen
                            console.log('[DEBUG MultiStepForm] Job title available');
                            // Validation passes if title is available (and format is valid)
                        }
                    } catch (error) {
                        // Handle errors during the worker fetch
                        jobTitleInput.style.border = '1px solid #D92415';
                        addClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                        displayValidationMessage('Fehler bei der Überprüfung des Jobtitels.', 'error'); // *** GEÄNDERT: Nachricht anzeigen
                        console.error('[DEBUG MultiStepForm] Error in checkJobTitleExists (Worker) during step validation:', error);
                        return false; // Validation fails on worker error
                    }
                }
            }

            // If all checks pass for this step
            console.log('[DEBUG MultiStepForm] Step validation passed for step', stepIndex + 1);
            return true;
        }

        updatePreview() {
            const lastStepContainer = this.steps[this.totalSteps - 1];
            if (!lastStepContainer) return;

            const optionalPlaceholder = 'Keine Angabe';
            const requiredPlaceholder = '<i>Keine Angabe</i>'; // Use italic for required but empty

            // Helper to get field value(s)
            const getFieldValue = (fieldName, isCheckboxGroup = false) => {
                // Handle the specific case for the optional job address field
                const field = find(`[${DATA_ATTR_PREVIEW_FIELD}="${fieldName}"]`, this.form);

                if (!field && !isCheckboxGroup) return null; // Return null for single fields not found

                if (isCheckboxGroup) {
                    // Find all checked inputs with the given data-preview-field name
                    const fields = findAll(`[${DATA_ATTR_PREVIEW_FIELD}="${fieldName}"]:checked`, this.form);
                    if (!fields || fields.length === 0) return null; // Return null if no checkboxes are checked
                    // Map checked checkboxes to the text content of the next sibling label,
                    // falling back to the value if label text is empty.
                    return Array.from(fields).map(cb => cb.nextElementSibling?.textContent?.trim() || cb.value.trim() || '');
                } else {
                    // Handle single input fields (text, select, textarea, etc.)
                    let value = '';
                    if (field.tagName === 'SELECT') {
                        value = field.options[field.selectedIndex]?.text.trim() || field.value.trim();
                    } else {
                        value = field.value.trim();
                    }
                    return value ? value : null; // Return value or null if empty
                }
            };

            // Helper to format the value for display
            const formatValue = (value, type = 'text') => {
                if (value === null) return null; // Return null if the input value was null

                if (Array.isArray(value)) {
                    if (value.length === 0) return null; // Return null for empty checkbox groups
                    return value.join(', '); // Join checkbox values with comma and space
                }

                switch (type) {
                    case 'currency':
                        return `${value} €`;
                    case 'textarea':
                        return value.replace(/\n/g, '<br>'); // Replace newlines with <br> for HTML display
                    case 'period':
                        const formattedStart = formatDateDDMMYYYY(value.start);
                        const formattedEnd = formatDateDDMMYYYY(value.end);
                        if (formattedStart && formattedEnd) return `${formattedStart} bis ${formattedEnd}`;
                        if (formattedStart) return `Ab ${formattedStart}`;
                        if (formattedEnd) return `Bis ${formattedEnd}`;
                        return null; // Return null if neither start nor end date is valid
                    case 'date':
                        return formatDateDDMMYYYY(value);
                    default:
                        return value; // Default to raw value for other types
                }
            };

            // Helper to update the placeholder element's content
            const updatePlaceholder = (fieldName, displayValue) => {
                const placeholderElement = find(`[${DATA_ATTR_PREVIEW_PLACEHOLDER}="${fieldName}"]`, lastStepContainer);
                if (placeholderElement) {
                    // Use innerHTML if the displayValue contains HTML tags (like <br> from textarea)
                    if (typeof displayValue === 'string' && (displayValue.includes('<') || displayValue.includes('&'))) {
                        placeholderElement.innerHTML = displayValue;
                    } else {
                        // Use textContent for plain text to prevent XSS
                        placeholderElement.textContent = displayValue;
                    }
                }
            };

            // --- Update Preview Fields ---

            // Project Name (Required)
            let projectNameVal = getFieldValue('projectName');
            updatePlaceholder('projectName', formatValue(projectNameVal) || requiredPlaceholder);

            // Job Address (Optional, depends on toggle)
            const addressFieldElement = find(`[${DATA_ATTR_PREVIEW_FIELD}="job-adress-optional"]`, this.form);
            let jobAddressDisplayVal = 'Remote'; // Default value if the optional field is disabled or empty
            if (addressFieldElement && !addressFieldElement.disabled) {
                let jobAddressContent = getFieldValue('job-adress-optional');
                jobAddressDisplayVal = jobAddressContent === null ? 'Remote' : formatValue(jobAddressContent, 'textarea');
            }
            updatePlaceholder('job-adress-optional', jobAddressDisplayVal);

            // Budget (Required)
            let budgetVal = getFieldValue('budget');
            updatePlaceholder('budget', budgetVal === null ? 'tba' : (formatValue(budgetVal, 'currency') || requiredPlaceholder));

            // Production Period (Start/End Dates - Required)
            let startDateVal = getFieldValue('startDate');
            let endDateVal = getFieldValue('endDate');
            let periodFormattedVal = formatValue({
                start: startDateVal,
                end: endDateVal
            }, 'period');
            updatePlaceholder('productionPeriod', periodFormattedVal || requiredPlaceholder);

            // Creator Category (Required)
            let creatorCategorieVal = getFieldValue('creatorCategorie');
            updatePlaceholder('creatorCategorie', formatValue(creatorCategorieVal) || requiredPlaceholder);

            // Creator Count (Required)
            let creatorCountVal = getFieldValue('creatorCount');
            updatePlaceholder('creatorCount', formatValue(creatorCountVal) || requiredPlaceholder);

            // Creator Language (Checkbox Group - Required)
            let langVal = getFieldValue('creatorLang', true); // Pass true for checkbox group
            updatePlaceholder('creatorLang', formatValue(langVal) || requiredPlaceholder);

            // Creator Country (Checkbox Group - Required)
            let landVal = getFieldValue('creatorLand', true); // Pass true for checkbox group
            updatePlaceholder('creatorLand', formatValue(landVal) || requiredPlaceholder);

            // Task Description (Required, Textarea)
            let aufgabeVal = getFieldValue('aufgabe');
            updatePlaceholder('aufgabe', formatValue(aufgabeVal, 'textarea') || requiredPlaceholder);

            // Profile Description (Required, Textarea)
            let steckbriefVal = getFieldValue('steckbrief');
            updatePlaceholder('steckbrief', formatValue(steckbriefVal, 'textarea') || requiredPlaceholder);

            // Job Online Until Date (Required)
            let jobOnlineVal = getFieldValue('jobOnline');
            let jobOnlineDisplay = requiredPlaceholder; // Default to required placeholder
            if (jobOnlineVal !== null) {
                const formattedDate = formatValue(jobOnlineVal, 'date');
                if (formattedDate) {
                    jobOnlineDisplay = formattedDate;
                }
            }
            updatePlaceholder('jobOnline', jobOnlineDisplay);


            // --- Optional Preview Fields (using optionalPlaceholder) ---

            // Creator Count (Optional)
            updatePlaceholder('creatorCountOptional', formatValue(getFieldValue('creatorCountOptional')) || optionalPlaceholder);

            // Gender (Optional)
            updatePlaceholder('genderOptional', formatValue(getFieldValue('genderOptional')) || optionalPlaceholder);

            // Video Count (Optional)
            updatePlaceholder('videoCountOptional', formatValue(getFieldValue('videoCountOptional')) || optionalPlaceholder);

            // Image Count (Optional)
            updatePlaceholder('imgCountOptional', formatValue(getFieldValue('imgCountOptional')) || optionalPlaceholder);

            // Video Duration (Optional)
            updatePlaceholder('videoDurationOptional', formatValue(getFieldValue('videoDurationOptional')) || optionalPlaceholder);

            // Reviews (Optional)
            updatePlaceholder('reviewsOptional', formatValue(getFieldValue('reviewsOptional')) || optionalPlaceholder);

            // Duration (Optional)
            updatePlaceholder('durationOptional', formatValue(getFieldValue('durationOptional')) || optionalPlaceholder);

            // Script (Optional)
            updatePlaceholder('scriptOptional', formatValue(getFieldValue('scriptOptional')) || optionalPlaceholder);

            // --- NEW Optional Preview Fields for Checkbox Groups ---

            // Nutzung (Optional Checkbox Group) - Added based on user request
            let nutzungOptionalVal = getFieldValue('nutzungOptional', true); // Pass true for checkbox group
            updatePlaceholder('nutzungOptional', formatValue(nutzungOptionalVal) || optionalPlaceholder);

            // Channels (Optional Checkbox Group) - Added based on user request
            let channelsVal = getFieldValue('channels', true); // Pass true for checkbox group
            updatePlaceholder('channels', formatValue(channelsVal) || optionalPlaceholder);
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
            if (!controlName) {
                return;
            }

            // Find related elements using the controlName
            const showHideTarget = find(`[${DATA_ATTR_TOGGLE_TARGET}="${controlName}"]`);
            const disableTargetInput = find(`[${DATA_ATTR_DISABLE_TARGET}="${controlName}"]`);
            const disableValue = control.getAttribute(DATA_ATTR_DISABLE_VALUE); // Value to set when disabled
            const clearTargets = findAll(`[${DATA_ATTR_TOGGLE_CLEAR}="${controlName}"]`); // Fields to clear when toggle is off

            // If no targets are found, this control doesn't need initialization
            if (!showHideTarget && !disableTargetInput && clearTargets.length === 0) {
                return;
            }

            // Function to update the state of the targets based on the control's state
            const updateTargetsState = () => {
                const isControlActive = control.checked; // Assuming toggle control is a checkbox

                // Handle show/hide target
                if (showHideTarget) {
                    isControlActive ? fadeInElement(showHideTarget) : fadeOutElement(showHideTarget);
                }

                // Handle disable target input
                if (disableTargetInput) {
                    if (isControlActive) {
                        disableTargetInput.disabled = true;
                        addClass(disableTargetInput, CLASS_DISABLED_BY_TOGGLE);
                        // Set a specific value if disableValue is provided
                        if (disableValue !== null) {
                            disableTargetInput.value = disableValue;
                            // Trigger change event so other listeners (like preview) are updated
                            disableTargetInput.dispatchEvent(new Event('change', {
                                bubbles: true
                            }));
                        }
                    } else {
                        disableTargetInput.disabled = false;
                        removeClass(disableTargetInput, CLASS_DISABLED_BY_TOGGLE);
                        // Clear the specific value if it was set by the toggle
                        if (disableValue !== null && disableTargetInput.value === disableValue) {
                            disableTargetInput.value = '';
                            // Trigger change event
                            disableTargetInput.dispatchEvent(new Event('change', {
                                bubbles: true
                            }));
                        }
                    }
                }

                // Handle clear targets when the control is NOT active
                if (!isControlActive && clearTargets.length > 0) {
                    clearTargets.forEach(fieldToClear => {
                        // Clear different input types
                        if (fieldToClear.type === 'checkbox' || fieldToClear.type === 'radio') {
                            fieldToClear.checked = false;
                        } else if (fieldToClear.tagName === 'SELECT') {
                            fieldToClear.selectedIndex = 0; // Reset select to first option
                        } else {
                            fieldToClear.value = ''; // Clear text, number, textarea, etc.
                        }
                        // Trigger change event after clearing
                        fieldToClear.dispatchEvent(new Event('change', {
                            bubbles: true
                        }));
                    });
                }
            };

            // Set initial state and add event listener
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

            // Ensure both attributes are present
            if (!counterId || maxLengthAttr === null) {
                return;
            }

            const maxLength = parseInt(maxLengthAttr, 10);
            if (isNaN(maxLength)) {
                return;
            } // Ensure maxLength is a valid number

            // Find the display element for this counter
            const displayElement = find(`[${DATA_ATTR_CHAR_COUNT_DISPLAY}="${counterId}"]`);
            if (!displayElement) {
                return;
            } // Ensure display element exists

            // Function to update the counter display
            const updateCounter = () => {
                let currentLength = inputField.value.length;

                // Truncate the input if it exceeds max length
                if (currentLength > maxLength) {
                    inputField.value = inputField.value.substring(0, maxLength);
                    currentLength = maxLength; // Update currentLength after truncation
                    displayElement.style.color = 'red'; // Indicate exceeded limit (shouldn't happen after truncation)
                } else {
                    displayElement.style.color = ''; // Reset color
                }

                // Update the display text
                displayElement.textContent = `${currentLength}/${maxLength}`;
            };

            // Add event listener and trigger initial update
            inputField.addEventListener('input', updateCounter);
            updateCounter(); // Initial call to set the counter on load
        });
    };

    /**
     * ========================================================================
     * Real-time Selection Display Logic
     * ========================================================================
     */
    const initializeSelectionDisplays = () => {
        // Find all elements that should display selections
        const displayElements = findAll(`[${DATA_ATTR_SELECTION_DISPLAY}]`);
        const defaultText = "Bitte auswählen"; // Default text when nothing is selected

        displayElements.forEach(displayElement => {
            // Get the group name from the display element
            const groupName = displayElement.getAttribute(DATA_ATTR_SELECTION_DISPLAY);
            if (!groupName) {
                return;
            } // Skip if group name is not set

            // Find all checkbox inputs belonging to this group
            const inputCheckboxes = findAll(`input[type="checkbox"][${DATA_ATTR_SELECTION_INPUT}="${groupName}"]`);

            if (inputCheckboxes.length === 0) {
                console.warn(`SelectionDisplay: No checkboxes found for group "${groupName}"`);
                return; // Skip if no checkboxes are found for this display
            }

            // Function to update the display text based on selected checkboxes
            const updateDisplay = () => {
                const selectedValues = Array.from(inputCheckboxes)
                    .filter(checkbox => checkbox.checked) // Filter for checked checkboxes
                    // Map to value or the text of the next sibling label
                    .map(checkbox => checkbox.value.trim() || checkbox.nextElementSibling?.textContent?.trim() || '');

                // Update the display element's text content
                displayElement.textContent = selectedValues.length > 0 ? selectedValues.join(', ') : defaultText;
            };

            // Add event listener to each checkbox in the group
            inputCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', updateDisplay);
            });

            // Initial call to set the display on load
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
    let currentDisplayDate = new Date(); // Date object for the currently displayed month/year

    // Creates the main datepicker UI element (singleton)
    const createDatePickerUI = () => {
        if (datePickerWrapper) return datePickerWrapper; // Return existing if already created

        datePickerWrapper = document.createElement('div');
        datePickerWrapper.className = DATEPICKER_WRAPPER_CLASS;
        datePickerWrapper.style.display = 'none'; // Initially hidden
        datePickerWrapper.style.position = 'absolute';
        datePickerWrapper.style.zIndex = '1000'; // Ensure it's on top

        // Header (Month/Year display and navigation buttons)
        const header = document.createElement('div');
        header.className = DATEPICKER_HEADER_CLASS;

        const controlsDiv = document.createElement('div');
        controlsDiv.className = DATEPICKER_CONTROLS_CLASS;

        const prevMonthButton = document.createElement('button');
        prevMonthButton.type = 'button';
        prevMonthButton.innerHTML = '&lt;'; // Left arrow
        prevMonthButton.setAttribute('aria-label', 'Vorheriger Monat');

        const monthYearDisplay = document.createElement('span'); // To display current month and year

        const nextMonthButton = document.createElement('button');
        nextMonthButton.type = 'button';
        nextMonthButton.innerHTML = '&gt;'; // Right arrow
        nextMonthButton.setAttribute('aria-label', 'Nächster Monat');

        controlsDiv.appendChild(prevMonthButton);
        controlsDiv.appendChild(monthYearDisplay);
        controlsDiv.appendChild(nextMonthButton);

        // "Today" button
        const todayButton = document.createElement('button');
        todayButton.type = 'button';
        todayButton.textContent = 'Heute';
        todayButton.className = DATEPICKER_TODAY_BTN_CLASS;
        todayButton.setAttribute('aria-label', 'Heute auswählen');


        header.appendChild(controlsDiv);
        header.appendChild(todayButton);
        datePickerWrapper.appendChild(header);

        // Event listeners for month navigation and "Today"
        prevMonthButton.addEventListener('click', () => {
            currentDisplayDate.setMonth(currentDisplayDate.getMonth() - 1);
            renderCalendarDays(currentDisplayDate); // Re-render calendar for the new month
        });

        nextMonthButton.addEventListener('click', () => {
            currentDisplayDate.setMonth(currentDisplayDate.getMonth() + 1);
            renderCalendarDays(currentDisplayDate); // Re-render calendar for the new month
        });

        todayButton.addEventListener('click', () => {
            const today = new Date();
            // Set the input value to today's date in the correct format
            if (currentDatePickerInput) {
                currentDatePickerInput.value = (currentDatePickerInput.type === 'date') ?
                    formatDateYYYYMMDD(today) :
                    formatDateDDMMYYYY(today);
                // Trigger change event on the input
                currentDatePickerInput.dispatchEvent(new Event('change', {
                    bubbles: true
                }));
            }
            hideCustomDatePicker(); // Hide the datepicker
        });

        // Grid for days of the week and month days
        const daysGrid = document.createElement('div');
        daysGrid.className = DATEPICKER_GRID_CLASS;
        datePickerWrapper.appendChild(daysGrid);

        // Append the datepicker to the body
        document.body.appendChild(datePickerWrapper);

        // Add basic styling for the datepicker
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

    // Renders the days for the given month and year in the datepicker grid
    const renderCalendarDays = (date) => {
        if (!datePickerWrapper) createDatePickerUI(); // Create UI if it doesn't exist

        const monthYearDisplay = datePickerWrapper.querySelector(`.${DATEPICKER_CONTROLS_CLASS} span`);
        const daysGrid = datePickerWrapper.querySelector(`.${DATEPICKER_GRID_CLASS}`);
        daysGrid.innerHTML = ''; // Clear previous days

        const month = date.getMonth();
        const year = date.getFullYear();
        const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
        const dayNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]; // German day names

        // Update month/year display
        monthYearDisplay.textContent = `${monthNames[month]} ${year}`;

        // Add day headers (Mon, Tue, etc.)
        dayNames.forEach(dayName => {
            const dayHeaderEl = document.createElement('div');
            dayHeaderEl.className = DATEPICKER_DAY_HEADER_CLASS;
            dayHeaderEl.textContent = dayName;
            daysGrid.appendChild(dayHeaderEl);
        });

        // Calculate the day of the week for the 1st of the month (0 = Sunday, 6 = Saturday)
        let firstDayOfMonth = new Date(year, month, 1).getDay();
        // Adjust for Monday being the first day (0 = Monday, ..., 6 = Sunday)
        firstDayOfMonth = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1;

        const daysInMonth = new Date(year, month + 1, 0).getDate(); // Get number of days in the current month

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time for comparison

        let selectedDate = null;
        // Parse the currently selected date from the input if available
        if (currentDatePickerInput && currentDatePickerInput.value) {
            // Try parsing both YYYY-MM-DD (for type="date") and DD.MM.YYYY
            selectedDate = parseDateDDMMYYYY(currentDatePickerInput.value) || new Date(currentDatePickerInput.value);
            if (selectedDate && !isNaN(selectedDate.getTime())) {
                selectedDate.setHours(0, 0, 0, 0); // Reset time for comparison
            } else {
                selectedDate = null; // Invalid date in input
            }
        }

        // Add empty divs for days before the 1st of the month
        for (let i = 0; i < firstDayOfMonth; i++) {
            daysGrid.appendChild(document.createElement('div')); // Empty placeholder
        }

        // Add day elements for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayEl = document.createElement('div');
            dayEl.className = DATEPICKER_DAY_CLASS;
            dayEl.textContent = day;

            const currentDate = new Date(year, month, day);
            currentDate.setHours(0, 0, 0, 0); // Reset time for comparison

            // Add classes for today and selected date
            if (currentDate.getTime() === today.getTime()) {
                addClass(dayEl, DATEPICKER_DAY_TODAY_CLASS);
            }
            if (selectedDate && currentDate.getTime() === selectedDate.getTime()) {
                addClass(dayEl, DATEPICKER_DAY_SELECTED_CLASS);
            }

            // Add click listener to select the date
            dayEl.addEventListener('click', () => {
                if (currentDatePickerInput) {
                    // Format the date correctly based on input type
                    if (currentDatePickerInput.type === 'date') {
                        currentDatePickerInput.value = formatDateYYYYMMDD(currentDate);
                    } else {
                        currentDatePickerInput.value = formatDateDDMMYYYY(currentDate);
                    }
                    // Trigger change event on the input
                    currentDatePickerInput.dispatchEvent(new Event('change', {
                        bubbles: true
                    }));
                }
                hideCustomDatePicker(); // Hide the datepicker after selection
            });

            daysGrid.appendChild(dayEl);
        }
    };

    // Shows the datepicker positioned below the given input element
    const showCustomDatePicker = (inputElement) => {
        if (!datePickerWrapper) createDatePickerUI(); // Create UI if it doesn't exist

        currentDatePickerInput = inputElement; // Store the input element

        // Determine the initial date to display based on the input value or today's date
        const initialDateStr = inputElement.value;
        let parsedDate = null;

        // Attempt to parse the date based on input type or expected format
        if (inputElement.type === 'date' && initialDateStr) {
            const parts = initialDateStr.split('-');
            if (parts.length === 3) {
                parsedDate = new Date(parts[0], parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            }
        } else {
            parsedDate = parseDateDDMMYYYY(initialDateStr);
        }

        // Set the display date to the parsed date or today's date if parsing fails
        currentDisplayDate = (parsedDate && !isNaN(parsedDate.getTime())) ? parsedDate : new Date();

        // Render the calendar days for the determined month
        renderCalendarDays(currentDisplayDate);

        // Position the datepicker below the input field
        const inputRect = inputElement.getBoundingClientRect();
        datePickerWrapper.style.top = `${inputRect.bottom + window.scrollY + 5}px`; // 5px buffer
        datePickerWrapper.style.left = `${inputRect.left + window.scrollX}px`;
        datePickerWrapper.style.display = 'block'; // Show the datepicker
    };

    // Hides the datepicker
    const hideCustomDatePicker = () => {
        if (datePickerWrapper) {
            datePickerWrapper.style.display = 'none';
        }
        currentDatePickerInput = null; // Clear the stored input element
    };

    // Hide datepicker when clicking outside of it or the input field
    document.addEventListener('click', (event) => {
        if (datePickerWrapper && datePickerWrapper.style.display === 'block') {
            // Check if the click target is outside the input and outside the datepicker itself
            if (currentDatePickerInput && !currentDatePickerInput.contains(event.target) && !datePickerWrapper.contains(event.target)) {
                hideCustomDatePicker();
            }
        }
    });

    // Initialize custom datepickers for all relevant input fields
    const initializeCustomDatepickers = () => {
        const datepickerInputs = findAll(`[${DATA_ATTR_DATEPICKER}]`);
        datepickerInputs.forEach(input => {
            // Prevent default behavior for focus and click to use custom datepicker
            input.addEventListener('focus', (event) => {
                event.preventDefault(); // Prevent default focus behavior
                showCustomDatePicker(input); // Show custom datepicker
            });
            input.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent default click behavior
                showCustomDatePicker(input); // Show custom datepicker
            });
            // Optional: Add keydown listener to close on Escape
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    hideCustomDatePicker();
                }
            });
        });
    };


    /**
     * ========================================================================
     * Job Title Validation Logic
     * ========================================================================
     */
    // Simple debounce function to limit API calls
    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // Basic validation for allowed characters in job title
    function isValidJobTitle(title) {
        // Allows letters (a-z, A-Z, äöüÄÖÜß), numbers (0-9), spaces, and hyphens (-)
        const regex = /^[a-zA-Z0-9äöüÄÖÜß\s\-]+$/;
        return regex.test(title);
    }

    // Checks if a job title already exists by calling a Cloudflare Worker
    async function checkJobTitleExists(title) {
        // console.log('[DEBUG JobTitle] Checking existence via Worker for:', title); // Keep for debugging if needed
        try {
            const response = await fetch(JOB_TITLE_CHECK_WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jobTitle: title.trim()
                }), // Send trimmed title
            });

            // Check if the response status indicates an error (e.g., 400, 500)
            if (!response.ok) {
                let errorDetails = `Worker responded with status: ${response.status}`;
                try {
                    // Try to get more details if the response is JSON
                    const errorData = await response.json();
                    errorDetails += ` - ${JSON.stringify(errorData)}`;
                } catch (e) {
                    // Ignore if response is not JSON
                }
                console.error('[DEBUG JobTitle] Error from Worker:', errorDetails);
                throw new Error(errorDetails); // Throw an error to be caught by the caller
            }

            const data = await response.json();
            // console.log('[DEBUG JobTitle] Worker response data:', data); // Keep for debugging if needed

            // Return true if data.exists is explicitly true, false otherwise
            return data.exists === true;

        } catch (error) {
            console.error('[DEBUG JobTitle] Error fetching from Worker or parsing JSON:', error);
            throw error; // Re-throw the error so the caller can handle it (e.g., show error message)
        }
    }

    // Initializes real-time validation for the job title input
    const initializeJobTitleValidation = () => {
        const jobTitleInput = document.getElementById('jobname');

        if (!jobTitleInput) return; // Exit if the job title input is not found

        // Add an input event listener with debounce
        jobTitleInput.addEventListener('input', debounce(async function(e) {
            const jobTitle = e.target.value;

            // Clear previous validation states
            jobTitleInput.style.border = '';
            removeClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
            removeClass(jobTitleInput, CLASS_JOB_TITLE_SUCCESS);
            displayValidationMessage('', 'clear'); // *** GEÄNDERT: Nachricht löschen

            // Don't validate if the input is empty after trimming
            if (!jobTitle.trim()) return;

            // Perform local character validation first
            if (!isValidJobTitle(jobTitle)) {
                jobTitleInput.style.border = '1px solid #D92415';
                addClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                displayValidationMessage('Der Jobtitel enthält ungültige Zeichen.', 'error'); // *** GEÄNDERT: Nachricht anzeigen
                return; // Stop validation if characters are invalid
            }

            // If characters are valid, check for existence via the worker
            try {
                const exists = await checkJobTitleExists(jobTitle);

                if (exists) {
                    jobTitleInput.style.border = '1px solid #D92415';
                    addClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                    displayValidationMessage('Dieser Jobtitel existiert bereits.', 'error'); // *** GEÄNDERT: Nachricht anzeigen
                } else {
                    jobTitleInput.style.border = '1px solid #3DB927';
                    addClass(jobTitleInput, CLASS_JOB_TITLE_SUCCESS);
                    displayValidationMessage('Dieser Jobtitel ist verfügbar.', 'success'); // *** GEÄNDERT: Nachricht anzeigen
                }
            } catch (error) {
                // Handle errors during the worker fetch
                jobTitleInput.style.border = '1px solid #D92415';
                addClass(jobTitleInput, CLASS_JOB_TITLE_ERROR);
                displayValidationMessage('Fehler bei der Überprüfung des Jobtitels.', 'error'); // *** GEÄNDERT: Nachricht anzeigen
                console.error('[DEBUG JobTitle] Error during real-time job title check:', error);
            }
        }, 500)); // Debounce time: 500ms
    };


    /**
     * ========================================================================
     * Initialization
     * ========================================================================
     */
    // Wait for the DOM to be fully loaded before initializing
    document.addEventListener('DOMContentLoaded', () => {

        // Initialize all Multi-Step Forms found on the page
        const multiStepForms = findAll(`[${DATA_ATTR_FORM}]`);
        if (multiStepForms.length > 0) {
            multiStepForms.forEach(formElement => {
                try {
                    // Create and initialize a new MultiStepForm instance for each form
                    new MultiStepForm(formElement).init();
                } catch (error) {
                    console.error(`Failed to initialize MultiStepForm for: #${formElement.id || 'form without id'}`, error);
                }
            });
        } else {
            console.info('MultiStepForm: No forms with attribute ' + DATA_ATTR_FORM + ' found.');
        }

        // Initialize Toggle Fields functionality
        initializeToggles();

        // Initialize Character Counters for text inputs
        initializeCharCounters();

        // Initialize Real-time Selection Displays for checkbox groups
        initializeSelectionDisplays();

        // Initialize Custom Datepickers
        initializeCustomDatepickers();

        // Initialize Job Title Validation (real-time check)
        initializeJobTitleValidation();

    }); // End DOMContentLoaded

})(); // End of the Immediately Invoked Function Expression (IIFE)
