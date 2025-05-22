// src/utils.js
// This module contains general utility functions used across the application.

/**
 * Creates a promise that resolves after a specified number of milliseconds.
 * @param {number} ms - The number of milliseconds to delay.
 * @returns {Promise<void>}
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normalizes a URL string. If the URL doesn't start with http:// or https://,
 * it prepends https://.
 * @param {string | null | undefined} url - The URL to normalize.
 * @returns {string | null} The normalized URL, or null if the input was invalid.
 */
export function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `https://${url}`;
}
