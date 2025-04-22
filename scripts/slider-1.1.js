/**
 * ========================================================================
 * FsSlider: Global Slider Script for Webflow using Data Attributes
 * ========================================================================
 * Version: 1.1.0
 * Author: [Greenbydefault]
 * Date: 2025-04-22
 *
 * Finds all slider wrappers on the page and initializes them.
 * Handles horizontal sliding via CSS transform, dot navigation, and basic touch support.
 * Includes a simple debug mode.
 *
 * --- CONFIGURATION ---
 */
(function() {
    'use strict';

    // --- !! Set to true to enable detailed console logs for debugging !! ---
    const DEBUG_MODE = false;

    /**
     * Helper function for conditional logging.
     * @param {...any} args - Arguments to pass to console.log
     */
    function logDebug(...args) {
        if (DEBUG_MODE) {
            console.log('FsSlider [Debug]:', ...args);
        }
    }

    /**
     * ========================================================================
     * The main Slider Class
     * ========================================================================
     */
    class FsSlider {
        /**
         * Initializes a single slider instance.
         * @param {HTMLElement} wrapperElement - The main wrapper element with [data-slider="wrapper"].
         */
        constructor(wrapperElement) {
            this.wrapper = wrapperElement;
            logDebug('Initializing slider for wrapper:', this.wrapper);

            // Find essential elements within this specific wrapper
            this.track = this.wrapper.querySelector('[data-slider="track"]');
            this.items = Array.from(this.wrapper.querySelectorAll('[data-slider="item"]'));
            this.dotsContainer = this.wrapper.querySelector('[data-slider="dots"]');
            this.dotTemplate = this.wrapper.querySelector('[data-slider="dot-template"]');

            // State variables
            this.itemCount = this.items.length;
            this.currentIndex = 0;
            this.wrapperWidth = 0;
            this.dots = [];

            // Touch handling state
            this.isDragging = false;
            this.startX = 0;
            this.currentTranslate = 0;
            this.startTranslate = 0;

            // Abort initialization if essential parts are missing or not needed
            if (!this.track) {
                console.warn('FsSlider: Track element [data-slider="track"] not found inside wrapper. Aborting initialization.', this.wrapper);
                return; // Stop
            }
            if (this.itemCount <= 1) {
                logDebug('Only one or zero items found. Slider functionality not required.', this.wrapper);
                if (this.dotsContainer) {
                    this.dotsContainer.style.display = 'none'; // Hide dots if only one slide
                }
                // Optionally, disable touch interactions if only one slide
                // this.track.style.touchAction = 'auto'; // Allow normal scrolling
                return; // Stop initialization
            }

            // If checks pass, proceed with initialization
            logDebug(`Found ${this.itemCount} items.`);
            this.init();
        }

        /**
         * Runs the main setup sequence for the slider.
         */
        init() {
            logDebug('Running init sequence...');
            this.calculateDimensions(); // Calculate initial dimensions
            this.createDots();          // Generate navigation dots
            this.addEventListeners();   // Set up event listeners (touch, resize)
            this.goToSlide(0, false);   // Position the slider initially
            this.observeResize();       // Monitor wrapper size changes
            this.wrapper.classList.add('fs-slider-initialized'); // Add marker class
            logDebug('Initialization complete.');
        }

        /**
         * Calculate and store the width of the slider wrapper.
         */
        calculateDimensions() {
            this.wrapperWidth = this.wrapper.offsetWidth;
            logDebug(`Calculated wrapper width: ${this.wrapperWidth}px`);
            // Ensure track is ready for transform, reset just in case
            this.track.style.transform = `translateX(0px)`;
        }

        /**
         * Generates the navigation dots based on the number of items.
         */
        createDots() {
            if (!this.dotsContainer) {
                logDebug('Dots container [data-slider="dots"] not found. Skipping dot creation.');
                return;
            }

            this.dotsContainer.innerHTML = ''; // Clear previous dots
            this.dots = [];                   // Reset dots array

            logDebug(`Creating ${this.itemCount} dots...`);

            for (let i = 0; i < this.itemCount; i++) {
                let dot;
                if (this.dotTemplate) {
                    dot = this.dotTemplate.cloneNode(true);
                    dot.removeAttribute('data-slider'); // Use 'data-slider-dot-template' instead?
                    dot.style.display = '';
                    logDebug(`Cloned dot from template for index ${i}`);
                } else {
                    dot = document.createElement('button');
                    dot.setAttribute('type', 'button');
                    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
                    dot.classList.add('fs-slider-dot-default'); // Default class for styling
                    logDebug(`Created default button dot for index ${i}`);
                }

                dot.addEventListener('click', () => {
                    logDebug(`Dot ${i} clicked.`);
                    this.goToSlide(i);
                });

                this.dotsContainer.appendChild(dot);
                this.dots.push(dot);
            }
            this.updateActiveDot(); // Activate the first dot
        }

        /**
         * Updates the visual state (active class) of the navigation dots.
         */
        updateActiveDot() {
            if (!this.dotsContainer || this.dots.length === 0) return;

            logDebug(`Updating active dot to index ${this.currentIndex}`);
            this.dots.forEach((dot, index) => {
                const isActive = index === this.currentIndex;
                dot.classList.toggle('is-active', isActive); // Use 'is-active' class (style in Webflow)
                dot.setAttribute('aria-current', isActive ? 'step' : 'false');
            });
        }

        /**
         * Moves the slider track to the specified slide index.
         * @param {number} index - The zero-based index of the target slide.
         * @param {boolean} [animate=true] - Whether to use CSS transition for the movement.
         */
        goToSlide(index, animate = true) {
             // Clamp index to valid range (no looping by default)
             const newIndex = Math.max(0, Math.min(index, this.itemCount - 1));

             if (newIndex !== this.currentIndex) {
                 logDebug(`Going to slide ${newIndex} ${animate ? 'with' : 'without'} animation.`);
             } else if (index !== newIndex) {
                 logDebug(`Attempted to go to index ${index}, but snapped back to ${newIndex}.`);
             } else {
                 // If index hasn't changed (e.g., on resize recalculation or swipe snap back)
                 logDebug(`Refreshing position for slide ${newIndex} ${animate ? 'with' : 'without'} animation.`);
             }


            // Calculate the required translation
            // Ensure wrapperWidth is up-to-date, especially if called without prior resize calculation
             if (this.wrapperWidth <= 0) this.calculateDimensions();
             if (this.wrapperWidth <= 0) {
                 console.warn("FsSlider: Wrapper width is zero, cannot calculate slide position.");
                 return;
             }

            this.currentTranslate = -newIndex * this.wrapperWidth;

            // Apply or remove transition based on 'animate' flag
            this.track.style.transition = animate ? 'transform 0.3s ease' : 'none'; // Match CSS transition

            // Apply the transformation
            this.track.style.transform = `translateX(${this.currentTranslate}px)`;

            // Update the current index state only if it actually changes
            if (newIndex !== this.currentIndex) {
                this.currentIndex = newIndex;
                this.updateActiveDot(); // Update dots only when index changes
            } else if (this.dots.length > 0 && !this.dots[this.currentIndex]?.classList.contains('is-active')) {
                 // Ensure dot is active even if index didn't change (e.g., on init)
                 this.updateActiveDot();
            }


            // Optional: Dispatch a custom event when the slide changes
            // this.wrapper.dispatchEvent(new CustomEvent('fsslider:slidechanged', { detail: { currentIndex: this.currentIndex } }));
        }

        // --- Touch Event Handling ---
        handleTouchStart(event) {
            if (this.isDragging || event.touches.length > 1) return;
            this.isDragging = true;
            this.startX = event.touches[0].pageX;
            this.startTranslate = this.currentTranslate;
            this.track.style.transition = 'none'; // Disable animation during drag
            // Improve UX: Prevent accidental text selection during swipe
            this.track.style.userSelect = 'none';
            logDebug(`Touch start at X: ${this.startX}, current translate: ${this.startTranslate}`);
        }

        handleTouchMove(event) {
            if (!this.isDragging || event.touches.length > 1) return;

            const currentX = event.touches[0].pageX;
            const diffX = currentX - this.startX;

            // Calculate immediate translation based on drag distance
            let dragTranslate = this.startTranslate + diffX;

            // Optional: Add boundary resistance
            const minTranslate = -(this.itemCount - 1) * this.wrapperWidth;
            const maxTranslate = 0;
            if (dragTranslate > maxTranslate) {
                dragTranslate = maxTranslate + (dragTranslate - maxTranslate) / 3; // Resistance past start
            } else if (dragTranslate < minTranslate) {
                dragTranslate = minTranslate + (dragTranslate - minTranslate) / 3; // Resistance past end
            }

            this.track.style.transform = `translateX(${dragTranslate}px)`;
            this.currentTranslate = dragTranslate; // Keep track of the dragged position

            logDebug(`Touch move, diffX: ${diffX}, new translate: ${dragTranslate}`);
            // Consider preventDefault only if vertical scroll interference is a major issue
            // event.preventDefault();
        }

        handleTouchEnd(event) {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.track.style.userSelect = ''; // Re-enable text selection

            const movedBy = this.currentTranslate - this.startTranslate;
            const threshold = this.wrapperWidth / 4; // Swipe threshold (e.g., 25% of width)

            let newIndex = this.currentIndex;

            logDebug(`Touch end, moved by: ${movedBy}, threshold: ${threshold}`);

            // Determine target slide based on swipe distance and direction
            if (movedBy < -threshold && this.currentIndex < this.itemCount - 1) {
                // Swiped left enough, go to next
                newIndex = this.currentIndex + 1;
                logDebug('Swipe detected: Next slide');
            } else if (movedBy > threshold && this.currentIndex > 0) {
                // Swiped right enough, go to previous
                newIndex = this.currentIndex - 1;
                logDebug('Swipe detected: Previous slide');
            } else {
                logDebug('Swipe threshold not met or at boundary, snapping back.');
            }

            // Snap to the determined slide (either new or current) with animation
            this.goToSlide(newIndex, true);
        }

        /**
         * Sets up all necessary event listeners.
         */
        addEventListeners() {
            logDebug('Adding event listeners...');
            // Touch Events
            this.track.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
            this.track.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: true }); // passive: true assumes no preventDefault
            this.track.addEventListener('touchend', this.handleTouchEnd.bind(this));
            this.track.addEventListener('touchcancel', this.handleTouchEnd.bind(this)); // Handle cancellation

            // Prevent native image dragging on desktop which can interfere
            this.track.addEventListener('dragstart', (e) => e.preventDefault());

            // Note: Resize is handled by ResizeObserver below
        }

        /**
         * Sets up a ResizeObserver to react to changes in the wrapper's size.
         */
        observeResize() {
            logDebug('Setting up ResizeObserver.');
            let resizeTimeout; // Simple debounce mechanism

            const resizeObserver = new ResizeObserver(entries => {
                 // Use requestAnimationFrame for smoother rendering and debounce
                 window.requestAnimationFrame(() => {
                    let widthChanged = false;
                    for (let entry of entries) {
                        // Ensure we are observing the wrapper and have contentRect
                        if (entry.target === this.wrapper && entry.contentRect) {
                            const newWidth = entry.contentRect.width;
                            // Check if width actually changed significantly
                            if (newWidth > 0 && Math.abs(newWidth - this.wrapperWidth) > 1) {
                                logDebug(`Resize detected. Old width: ${this.wrapperWidth}, New width: ${newWidth}`);
                                this.wrapperWidth = newWidth;
                                widthChanged = true;
                            }
                        }
                    }
                    // If width changed, recalculate and snap to the correct position without animation
                    if (widthChanged) {
                        this.goToSlide(this.currentIndex, false);
                    }
                 });
            });
            resizeObserver.observe(this.wrapper);

            // Store observer reference if cleanup is needed later (e.g., in SPAs)
            // this.resizeObserver = resizeObserver;
        }

        /**
         * Optional: Method to destroy the slider instance and clean up listeners.
         * Useful in Single Page Applications or dynamic environments.
         */
        destroy() {
            logDebug('Destroying slider instance for:', this.wrapper);
            // Remove event listeners (example for touch, add others as needed)
            this.track.removeEventListener('touchstart', this.handleTouchStart);
            this.track.removeEventListener('touchmove', this.handleTouchMove);
            this.track.removeEventListener('touchend', this.handleTouchEnd);
            this.track.removeEventListener('touchcancel', this.handleTouchEnd);
            this.track.removeEventListener('dragstart', (e) => e.preventDefault());

            // Disconnect ResizeObserver
            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
                this.resizeObserver = null; // Clear reference
                 logDebug('ResizeObserver disconnected.');
            }

             // Remove dots event listeners
             this.dots.forEach(dot => {
                 // Need to store the bound function reference to remove it correctly,
                 // or re-query and remove all listeners if not stored.
                 // For simplicity here, we assume direct listeners or need refactoring if complex.
             });
             if (this.dotsContainer) {
                 this.dotsContainer.innerHTML = ''; // Clear dots
             }


            // Remove marker class
            this.wrapper.classList.remove('fs-slider-initialized');

            // Reset styles? Maybe not necessary if element is removed.
            // this.track.style.transform = '';
            // this.track.style.transition = '';

            logDebug('Slider instance destroyed.');
        }
    }

    /**
     * ========================================================================
     * Auto-Initialization Script
     * ========================================================================
     * Waits for the DOM to be ready, then finds and initializes all sliders.
     */
    function initializeAllSliders() {
        const sliderWrappers = document.querySelectorAll('[data-slider="wrapper"]');
        logDebug(`Found ${sliderWrappers.length} slider wrapper(s) on the page.`);

        if (sliderWrappers.length > 0) {
            // Initialize each slider found
            sliderWrappers.forEach((wrapper, index) => {
                logDebug(`Initializing slider #${index + 1}`);
                // Store the instance on the element maybe? Optional.
                // wrapper.fsSliderInstance = new FsSlider(wrapper);
                new FsSlider(wrapper); // Create instance
            });
        } else {
            logDebug("No slider wrappers found with [data-slider='wrapper'].");
        }
    }

    // --- Run Initialization ---
    // Check if the DOM is already loaded
    if (document.readyState === 'loading') {
        // Loading hasn't finished yet
        document.addEventListener('DOMContentLoaded', initializeAllSliders);
        logDebug('DOM not ready, waiting for DOMContentLoaded event.');
    } else {
        // DOM is already ready
        logDebug('DOM already ready, initializing sliders immediately.');
        initializeAllSliders();
    }

})(); // End of IIFE
