// src/index.js
// This is the main entry point for your application.
// It imports the core application logic and initializes it.

import { initializeApp } from './app.js';

/**
 * Waits for the DOM to be fully loaded and then initializes the application.
 */
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});
