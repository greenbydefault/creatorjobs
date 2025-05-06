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

    // Selection Display Attributes
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
        co
