/**
 * ========================================================================
 * Memberstack Auth Manager
 * ========================================================================
 * Version: 1.0.0
 * Author: [Greenbydefault]
 * Date: 2025-04-22
 *
 * Description:
 * Fetches Memberstack member data once and controls element visibility
 * based on custom data attributes (data-auth-*) like user type (creator/brand)
 * and credits. Designed to work alongside other scripts (like sliders, modals)
 * without duplicating Memberstack API calls.
 *
 * Requirements:
 * - Memberstack Frontend API ($memberstackDom) must be available globally.
 * - Place this script after the Memberstack script, ideally before other
 * scripts that interact with the controlled elements (e.g., modal triggers).
 *
 * Data Attributes:
 * - data-auth-show="creator|brand": Shows element based on custom field 'is-user-a-brand'.
 * - data-auth-credits="require-positive|require-zero": Shows based on metaData 'credits'.
 * - data-auth-loggedin="true|false": Shows based on login status.
 * - data-auth-display="block|flex|grid|inline-block|etc.": (Optional) Sets the display style
 * when shown. Defaults to '' (browser default).
 *
 * --- CONFIGURATION ---
 */
(function() {
    'use strict';

    // --- !! Set to true to enable detailed console logs for debugging !! ---
    const AUTH_DEBUG_MODE = false;

    // --- Configuration ---
    const config = {
        customFieldBrandFlag: 'is-user-a-brand', // The EXACT name of your custom field
        metaDataCreditsField: 'credits',        // The EXACT name of your metadata field
        // --- Data Attributes (Match these in your HTML) ---
        attrShow: 'data-auth-show',             // Values: "creator", "brand"
        attrCredits: 'data-auth-credits',       // Values: "require-positive", "require-zero"
        attrLoggedIn: 'data-auth-loggedin',     // Values: "true", "false"
        attrDisplay: 'data-auth-display',       // Optional: "block", "flex", etc.
        // --- Internal ---
        hideStyle: 'none', // How elements are hidden
    };

    /**
     * Helper function for conditional logging.
     */
    function logAuthDebug(...args) {
        if (AUTH_DEBUG_MODE) {
            console.log('AuthManager [Debug]:', ...args);
        }
    }

    /**
     * Stores the fetched and processed member data.
     * Accessible via window.memberAuthData after initialization.
     */
    window.memberAuthData = {
        isLoggedIn: null, // true | false | null (before check)
        isBrand: null,    // true | false | null
        isCreator: null,  // true | false | null
        credits: 0,       // number
        hasPositiveCredits: null, // true | false | null
        hasZeroCredits: null,     // true | false | null
        memberRaw: null,  // Stores the raw member object
        isReady: false    // Flag to indicate if data is processed
    };

    /**
     * Processes the raw member data from Memberstack.
     * @param {object | null} member - The member object from Memberstack, or null if not logged in.
     */
    function processMemberData(member) {
        logAuthDebug('Processing member data:', member);
        const data = window.memberAuthData; // Shortcut

        data.memberRaw = member;
        data.isLoggedIn = !!member; // True if member object exists

        if (member) {
            // --- User Type ---
            // Access custom field safely
            const brandFlag = member.customFields ? member.customFields[config.customFieldBrandFlag] : undefined;
            // Determine type (assuming boolean true/false)
            data.isBrand = brandFlag === true;
            data.isCreator = brandFlag === false;
            logAuthDebug(`Brand Flag ('${config.customFieldBrandFlag}') value:`, brandFlag, `-> isBrand: ${data.isBrand}, isCreator: ${data.isCreator}`);

            // --- Credits ---
            // Access metadata safely and default to 0 if missing or not a number
            const rawCredits = member.metaData ? member.metaData[config.metaDataCreditsField] : 0;
            data.credits = typeof rawCredits === 'number' ? rawCredits : 0;
            data.hasPositiveCredits = data.credits > 0;
            data.hasZeroCredits = data.credits <= 0;
            logAuthDebug(`Credits ('${config.metaDataCreditsField}') value:`, rawCredits, `-> credits: ${data.credits}, hasPositive: ${data.hasPositiveCredits}, hasZero: ${data.hasZeroCredits}`);

        } else {
            // Not logged in - set defaults
            data.isBrand = false;
            data.isCreator = false;
            data.credits = 0;
            data.hasPositiveCredits = false;
            data.hasZeroCredits = true;
            logAuthDebug('User is not logged in. Setting defaults.');
        }

        data.isReady = true;
        logAuthDebug('Processed auth data:', data);

        // Apply visibility rules now that data is ready
        applyAuthenticationVisibility();

        // Optional: Dispatch a custom event to notify other scripts
        document.dispatchEvent(new CustomEvent('authdataready', { detail: data }));
        logAuthDebug('Dispatched authdataready event.');
    }

    /**
     * Finds all elements with data-auth-* attributes and applies visibility rules.
     */
    function applyAuthenticationVisibility() {
        if (!window.memberAuthData.isReady) {
            console.warn('AuthManager: Tried to apply visibility before auth data was ready.');
            return;
        }
        logAuthDebug('Applying authentication visibility rules...');

        const data = window.memberAuthData; // Shortcut to processed data
        // Combine all possible attributes into a single selector for efficiency
        const selector = `[${config.attrShow}], [${config.attrCredits}], [${config.attrLoggedIn}]`;
        const elements = document.querySelectorAll(selector);

        logAuthDebug(`Found ${elements.length} elements with auth attributes.`);

        elements.forEach((element, index) => {
            logAuthDebug(`Processing element #${index + 1}:`, element);
            let shouldShow = true; // Assume visible by default unless a rule hides it

            // --- Rule 1: Logged In Status ---
            const loggedInRule = element.getAttribute(config.attrLoggedIn); // "true" or "false"
            if (loggedInRule) {
                const requiresLogin = loggedInRule === 'true';
                if (requiresLogin !== data.isLoggedIn) {
                    shouldShow = false;
                    logAuthDebug(`-> Failed loggedIn rule: requires ${loggedInRule}, user is ${data.isLoggedIn ? 'logged in' : 'logged out'}`);
                } else {
                     logAuthDebug(`-> Passed loggedIn rule: requires ${loggedInRule}`);
                }
            }

            // --- Rule 2: User Type (only if Rule 1 passed) ---
            const showRule = element.getAttribute(config.attrShow); // "creator" or "brand"
            if (shouldShow && showRule) {
                if (showRule === 'creator' && !data.isCreator) {
                    shouldShow = false;
                    logAuthDebug(`-> Failed show rule: requires creator, user is ${data.isBrand ? 'brand' : 'not creator'}`);
                } else if (showRule === 'brand' && !data.isBrand) {
                    shouldShow = false;
                    logAuthDebug(`-> Failed show rule: requires brand, user is ${data.isCreator ? 'creator' : 'not brand'}`);
                } else {
                     logAuthDebug(`-> Passed show rule: requires ${showRule}`);
                }
            }

            // --- Rule 3: Credits Status (only if previous rules passed) ---
            const creditsRule = element.getAttribute(config.attrCredits); // "require-positive" or "require-zero"
            if (shouldShow && creditsRule) {
                if (creditsRule === 'require-positive' && !data.hasPositiveCredits) {
                    shouldShow = false;
                    logAuthDebug(`-> Failed credits rule: requires positive, user has ${data.credits}`);
                } else if (creditsRule === 'require-zero' && !data.hasZeroCredits) {
                    shouldShow = false;
                    logAuthDebug(`-> Failed credits rule: requires zero, user has ${data.credits}`);
                } else {
                     logAuthDebug(`-> Passed credits rule: requires ${creditsRule}`);
                }
            }

            // --- Apply Visibility ---
            const displayStyle = element.getAttribute(config.attrDisplay) || ''; // Get custom display or default
            element.style.display = shouldShow ? displayStyle : config.hideStyle;
            logAuthDebug(`-> Final decision: ${shouldShow ? 'SHOW' : 'HIDE'} (display: '${element.style.display}')`);
        });

        logAuthDebug('Finished applying visibility rules.');
    }

    /**
     * Initializes the Auth Manager. Waits for Memberstack and fetches data.
     */
    function initializeAuthManager() {
        logAuthDebug('Initializing Auth Manager...');

        // Check if Memberstack's DOM object is available
        if (window.$memberstackDom && typeof window.$memberstackDom.getCurrentMember === 'function') {
            logAuthDebug('Memberstack DOM object found. Fetching current member...');

            window.$memberstackDom.getCurrentMember()
                .then(({ data: member }) => {
                    // Member data received (could be null if not logged in)
                    processMemberData(member);
                })
                .catch(error => {
                    console.error('AuthManager: Error fetching Memberstack member data:', error);
                    // Process with null data to potentially show "logged out" elements
                    processMemberData(null);
                });
        } else {
            console.warn('AuthManager: $memberstackDom is not available. Cannot fetch member data. Visibility rules based on login status may not work correctly.');
            // Still process with null data to handle 'data-auth-loggedin="false"' correctly
             processMemberData(null);
             // Maybe retry after a short delay? Or rely on Memberstack's own timing?
             // For simplicity, we'll just process as logged-out for now.
        }
    }

    // --- Run Initialization ---
    // We need to wait for the DOM *and* potentially for Memberstack to be ready.
    // Running on DOMContentLoaded is a good starting point. If Memberstack loads
    // later, the $memberstackDom check inside initializeAuthManager will handle it.
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAuthManager);
        logAuthDebug('DOM not ready, waiting for DOMContentLoaded event.');
    } else {
        logAuthDebug('DOM already ready, initializing Auth Manager immediately.');
        initializeAuthManager();
    }

})();
