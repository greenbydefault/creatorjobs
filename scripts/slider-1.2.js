/**
 * ========================================================================
 * FsSlider: Global Slider Script for Webflow using Data Attributes
 * ========================================================================
 * Version: 1.1.2
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

            // Find essential elements
            this.track = this.wrapper.querySelector('[data-slider="track"]');
            this.items = Array.from(this.wrapper.querySelectorAll('[data-slider="item"]'));
            this.dotsContainer = this.wrapper.querySelector('[data-slider="dots"]');
            this.dotTemplate = this.wrapper.querySelector('[data-slider="dot-template"]');

            // State variables
            this.itemCount = this.items.length;
            this.currentIndex = 0;
            this.wrapperWidth = 0;
            this.dots = [];

            // Interaction states
            this.isDragging = false;      // For touch events
            this.isMouseDragging = false; // For mouse events
            this.startX = 0;              // Start X for touch/mouse
            this.currentTranslate = 0;    // Current translateX value
            this.startTranslate = 0;      // TranslateX value at drag start

            // Bound event handlers for removal
            this.boundHandleMouseMove = null;
            this.boundHandleMouseUp = null;
            this.boundHandleTouchStart = null;
            this.boundHandleTouchMove = null;
            this.boundHandleTouchEnd = null;
            this.boundPreventDragStart = null;
            this.boundHandleMouseDown = null;

            // Abort initialization if essential parts are missing or not needed
            if (!this.track) {
                console.warn('FsSlider: Track element [data-slider="track"] not found inside wrapper. Aborting initialization.', this.wrapper);
                return;
            }
            if (this.itemCount <= 1) {
                logDebug('Only one or zero items found. Slider functionality not required.', this.wrapper);
                if (this.dotsContainer) {
                    this.dotsContainer.style.display = 'none';
                }
                return; // Stop initialization
            }

            logDebug(`Found ${this.itemCount} items.`);
            this.init();
        }

        /**
         * Runs the main setup sequence for the slider.
         */
        init() {
            logDebug('Running init sequence...');
            this.calculateDimensions();
            this.createDots();
            this.addEventListeners();
            this.goToSlide(0, false);
            this.observeResize();
            this.wrapper.classList.add('fs-slider-initialized');
            logDebug('Initialization complete.');
        }

        /**
         * Calculate and store the width of the slider wrapper.
         */
        calculateDimensions() {
            this.wrapperWidth = this.wrapper.offsetWidth;
            logDebug(`Calculated wrapper width: ${this.wrapperWidth}px`);
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
            this.dotsContainer.innerHTML = '';
            this.dots = [];
            logDebug(`Creating ${this.itemCount} dots...`);

            for (let i = 0; i < this.itemCount; i++) {
                let dot;
                if (this.dotTemplate) {
                    dot = this.dotTemplate.cloneNode(true);
                    dot.removeAttribute('data-slider');
                    dot.style.display = '';
                } else {
                    dot = document.createElement('button');
                    dot.setAttribute('type', 'button');
                    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
                    dot.classList.add('fs-slider-dot-default');
                }

                // Store reference to the click handler for potential removal
                const dotClickHandler = () => {
                    logDebug(`Dot ${i} clicked.`);
                    // If currently dragging, stop the drag before navigating
                    if (this.isDragging || this.isMouseDragging) {
                         this.stopDragging();
                    }
                    this.goToSlide(i);
                };
                dot.addEventListener('click', dotClickHandler);
                dot.clickHandler = dotClickHandler; // Store reference on the element

                this.dotsContainer.appendChild(dot);
                this.dots.push(dot);
            }
            this.updateActiveDot();
        }

        /**
         * Updates the visual state (active class) of the navigation dots.
         */
        updateActiveDot() {
            if (!this.dotsContainer || this.dots.length === 0) return;
            logDebug(`Updating active dot to index ${this.currentIndex}`);
            this.dots.forEach((dot, index) => {
                const isActive = index === this.currentIndex;
                dot.classList.toggle('dot-active', isActive); // Use 'dot-active'
                dot.setAttribute('aria-current', isActive ? 'step' : 'false');
            });
        }

        /**
         * Moves the slider track to the specified slide index.
         * @param {number} index - The zero-based index of the target slide.
         * @param {boolean} [animate=true] - Whether to use CSS transition for the movement.
         */
        goToSlide(index, animate = true) {
            const newIndex = Math.max(0, Math.min(index, this.itemCount - 1));

            if (newIndex !== this.currentIndex) {
                logDebug(`Going to slide ${newIndex} ${animate ? 'with' : 'without'} animation.`);
            } else if (index !== newIndex) {
                logDebug(`Attempted to go to index ${index}, but snapped back to ${newIndex}.`);
            } else {
                logDebug(`Refreshing position for slide ${newIndex} ${animate ? 'with' : 'without'} animation.`);
            }

            if (this.wrapperWidth <= 0) this.calculateDimensions();
            if (this.wrapperWidth <= 0) {
                console.warn("FsSlider: Wrapper width is zero, cannot calculate slide position.");
                return;
            }

            this.currentTranslate = -newIndex * this.wrapperWidth;
            this.track.style.transition = animate ? 'transform 0.3s ease' : 'none';
            this.track.style.transform = `translateX(${this.currentTranslate}px)`;

            if (newIndex !== this.currentIndex) {
                this.currentIndex = newIndex;
                this.updateActiveDot();
            } else if (this.dots.length > 0 && !this.dots[this.currentIndex]?.classList.contains('dot-active')) {
                this.updateActiveDot();
            }
        }

        // --- Shared Drag Logic ---

        /** Starts the dragging process (touch or mouse) */
        startDragging(pageX) {
             this.startX = pageX;
             this.startTranslate = this.currentTranslate;
             this.track.style.transition = 'none'; // Disable animation during drag
             this.track.style.cursor = 'grabbing'; // Indicate dragging visually
             this.wrapper.classList.add('is-dragging'); // Add dragging class
             logDebug(`Drag start at X: ${this.startX}, current translate: ${this.startTranslate}`);
        }

        /** Handles movement during drag (touch or mouse) */
        handleDragMove(pageX) {
            const currentX = pageX;
            const diffX = currentX - this.startX;
            let dragTranslate = this.startTranslate + diffX;

            // Optional: Boundary resistance
            const minTranslate = -(this.itemCount - 1) * this.wrapperWidth;
            const maxTranslate = 0;
            if (dragTranslate > maxTranslate) {
                dragTranslate = maxTranslate + (dragTranslate - maxTranslate) / 3;
            } else if (dragTranslate < minTranslate) {
                dragTranslate = minTranslate + (dragTranslate - minTranslate) / 3;
            }

            this.track.style.transform = `translateX(${dragTranslate}px)`;
            this.currentTranslate = dragTranslate;
            logDebug(`Drag move, diffX: ${diffX}, new translate: ${dragTranslate}`);
        }

        /** Ends the dragging process (touch or mouse) */
        handleDragEnd() {
            this.track.style.cursor = 'grab'; // Reset cursor
            this.wrapper.classList.remove('is-dragging'); // Remove dragging class

            const movedBy = this.currentTranslate - this.startTranslate;
            const threshold = this.wrapperWidth / 4;
            let newIndex = this.currentIndex;

            logDebug(`Drag end, moved by: ${movedBy}, threshold: ${threshold}`);

            if (movedBy < -threshold && this.currentIndex < this.itemCount - 1) {
                newIndex = this.currentIndex + 1;
                logDebug('Swipe/Drag detected: Next slide');
            } else if (movedBy > threshold && this.currentIndex > 0) {
                newIndex = this.currentIndex - 1;
                logDebug('Swipe/Drag detected: Previous slide');
            } else {
                logDebug('Swipe/Drag threshold not met or at boundary, snapping back.');
            }

            this.goToSlide(newIndex, true); // Snap to the determined slide
        }

        /** Forcefully stops any dragging state */
        stopDragging() {
            if (this.isDragging) {
                 this.isDragging = false;
                 this.handleDragEnd(); // Trigger snap logic if needed
                 logDebug("Touch dragging stopped forcefully.");
            }
            if (this.isMouseDragging) {
                this.isMouseDragging = false;
                 // Remove document listeners immediately
                 document.removeEventListener('mousemove', this.boundHandleMouseMove);
                 document.removeEventListener('mouseup', this.boundHandleMouseUp);
                 this.handleDragEnd(); // Trigger snap logic
                 logDebug("Mouse dragging stopped forcefully.");
            }
             this.track.style.cursor = 'grab'; // Ensure cursor reset
             this.wrapper.classList.remove('is-dragging');
        }


        // --- Touch Event Handling ---
        handleTouchStart(event) {
            if (this.isDragging || event.touches.length > 1) return;
            this.isDragging = true;
            // Prevent text selection during touch drag
            this.track.style.userSelect = 'none';
            this.startDragging(event.touches[0].pageX);
        }

        handleTouchMove(event) {
            if (!this.isDragging || event.touches.length > 1) return;
            this.handleDragMove(event.touches[0].pageX);
            // Optional: Prevent vertical scroll if horizontal swipe is significant
            // event.preventDefault();
        }

        handleTouchEnd(event) {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.track.style.userSelect = ''; // Re-enable text selection
            this.handleDragEnd();
        }

        // --- Mouse Event Handling ---
        handleMouseDown(event) {
            // Ignore if not left mouse button or if already dragging
            if (event.button !== 0 || this.isMouseDragging || this.isDragging) return;
            event.preventDefault(); // Prevent text selection/image dragging
            this.isMouseDragging = true;
            this.startDragging(event.pageX);

            // Add listeners to the document to capture mouse move/up outside the track
            this.boundHandleMouseMove = this.handleMouseMove.bind(this);
            this.boundHandleMouseUp = this.handleMouseUp.bind(this);
            document.addEventListener('mousemove', this.boundHandleMouseMove);
            document.addEventListener('mouseup', this.boundHandleMouseUp);
        }

        handleMouseMove(event) {
            if (!this.isMouseDragging) return;
            event.preventDefault(); // Prevent other interactions during drag
            this.handleDragMove(event.pageX);
        }

        handleMouseUp(event) {
            if (!this.isMouseDragging) return;
            this.isMouseDragging = false;

            // Remove document listeners
            document.removeEventListener('mousemove', this.boundHandleMouseMove);
            document.removeEventListener('mouseup', this.boundHandleMouseUp);

            this.handleDragEnd();
        }

        /**
         * Sets up all necessary event listeners.
         */
        addEventListeners() {
            logDebug('Adding event listeners (Touch & Mouse)...');

            // Store bound functions for removal later
            this.boundHandleTouchStart = this.handleTouchStart.bind(this);
            this.boundHandleTouchMove = this.handleTouchMove.bind(this);
            this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
            this.boundPreventDragStart = (e) => e.preventDefault();
            this.boundHandleMouseDown = this.handleMouseDown.bind(this);

            // Touch Events
            this.track.addEventListener('touchstart', this.boundHandleTouchStart, { passive: true });
            this.track.addEventListener('touchmove', this.boundHandleTouchMove, { passive: true });
            this.track.addEventListener('touchend', this.boundHandleTouchEnd);
            this.track.addEventListener('touchcancel', this.boundHandleTouchEnd); // Treat cancel like end

            // Mouse Events
            this.track.addEventListener('mousedown', this.boundHandleMouseDown);
            // Prevent native image/link dragging which interferes
            this.track.addEventListener('dragstart', this.boundPreventDragStart);

            // Initial cursor style
            this.track.style.cursor = 'grab';
        }

        /**
         * Sets up a ResizeObserver to react to changes in the wrapper's size.
         */
        observeResize() {
            logDebug('Setting up ResizeObserver.');
            this.resizeObserverInstance = new ResizeObserver(this.handleResize.bind(this));
            this.resizeObserverInstance.observe(this.wrapper);
        }

        /** Callback for ResizeObserver */
        handleResize(entries) {
            window.requestAnimationFrame(() => {
                let widthChanged = false;
                for (let entry of entries) {
                    if (entry.target === this.wrapper && entry.contentRect) {
                        const newWidth = entry.contentRect.width;
                        if (newWidth > 0 && Math.abs(newWidth - this.wrapperWidth) > 1) {
                            logDebug(`Resize detected. Old width: ${this.wrapperWidth}, New width: ${newWidth}`);
                            this.wrapperWidth = newWidth;
                            widthChanged = true;
                        }
                    }
                }
                if (widthChanged) {
                    // Stop any active drag and snap to position
                    this.stopDragging();
                    this.goToSlide(this.currentIndex, false);
                }
            });
        }

        /**
         * Cleans up event listeners and observers.
         */
        destroy() {
            logDebug('Destroying slider instance for:', this.wrapper);

            // Remove Touch Listeners
            this.track.removeEventListener('touchstart', this.boundHandleTouchStart);
            this.track.removeEventListener('touchmove', this.boundHandleTouchMove);
            this.track.removeEventListener('touchend', this.boundHandleTouchEnd);
            this.track.removeEventListener('touchcancel', this.boundHandleTouchEnd);

            // Remove Mouse Listeners
            this.track.removeEventListener('mousedown', this.boundHandleMouseDown);
            this.track.removeEventListener('dragstart', this.boundPreventDragStart);
            // Ensure document listeners are removed if destroy is called mid-drag
            if (this.isMouseDragging) {
                 document.removeEventListener('mousemove', this.boundHandleMouseMove);
                 document.removeEventListener('mouseup', this.boundHandleMouseUp);
            }


            // Disconnect ResizeObserver
            if (this.resizeObserverInstance) {
                this.resizeObserverInstance.disconnect();
                this.resizeObserverInstance = null;
                logDebug('ResizeObserver disconnected.');
            }

            // Remove dot listeners
            this.dots.forEach(dot => {
                 if (dot.clickHandler) {
                     dot.removeEventListener('click', dot.clickHandler);
                 }
            });
            if (this.dotsContainer) {
                this.dotsContainer.innerHTML = '';
                this.dots = [];
            }

            // Reset styles and classes
            this.wrapper.classList.remove('fs-slider-initialized', 'is-dragging');
            this.track.style.cursor = '';
            this.track.style.userSelect = '';
            // Optionally reset transform and transition
            // this.track.style.transform = '';
            // this.track.style.transition = '';

            logDebug('Slider instance destroyed.');
        }
    }

    /**
     * ========================================================================
     * Auto-Initialization Script
     * ========================================================================
     */
    function initializeAllSliders() {
        const sliderWrappers = document.querySelectorAll('[data-slider="wrapper"]');
        logDebug(`Found ${sliderWrappers.length} slider wrapper(s) on the page.`);

        if (sliderWrappers.length > 0) {
            sliderWrappers.forEach((wrapper, index) => {
                if (wrapper.classList.contains('fs-slider-initialized')) {
                    logDebug(`Slider #${index + 1} already initialized. Skipping.`);
                    return;
                }
                logDebug(`Initializing slider #${index + 1}`);
                new FsSlider(wrapper);
            });
        } else {
            logDebug("No slider wrappers found with [data-slider='wrapper'].");
        }
    }

    // --- Run Initialization ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAllSliders);
        logDebug('DOM not ready, waiting for DOMContentLoaded event.');
    } else {
        logDebug('DOM already ready, initializing sliders immediately.');
        initializeAllSliders();
    }

})(); // End of IIFE
