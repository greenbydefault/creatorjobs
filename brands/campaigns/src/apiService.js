// src/apiService.js
// This module handles all API interactions, including fetching data from Webflow and the worker.

import {
    API_BASE_URL_MJ,
    WORKER_BASE_URL_MJ,
    USER_COLLECTION_ID_MJ,
    API_CALL_DELAY_MS
} from './config.js';
import { delay } from './utils.js';

/**
 * Constructs the full URL to the worker, proxying the Webflow API URL.
 * @param {string} apiUrl - The Webflow API URL to be proxied.
 * @returns {string} The complete worker URL.
 */
export function buildWorkerUrl_MJ(apiUrl) {
    const baseUrl = WORKER_BASE_URL_MJ.endsWith('/') ? WORKER_BASE_URL_MJ : WORKER_BASE_URL_MJ + '/';
    return `${baseUrl}?url=${encodeURIComponent(apiUrl)}`;
}

/**
 * Fetches a single item from a Webflow collection by its ID.
 * @param {string} collectionId - The ID of the Webflow collection.
 * @param {string} itemId - The ID of the item to fetch.
 * @returns {Promise<object | null>} A promise that resolves to the fetched item data or an error object.
 */
export async function fetchWebflowItem(collectionId, itemId) {
    if (!itemId) {
        console.warn(`Ungültige Item-ID für Collection ${collectionId} übergeben.`);
        return null;
    }
    const apiUrl = `${API_BASE_URL_MJ}/${collectionId}/items/${itemId}/live`;
    const workerUrl = buildWorkerUrl_MJ(apiUrl);

    try {
        const response = await fetch(workerUrl);
        if (!response.ok) {
            if (response.status === 404) {
                return { id: itemId, error: true, status: 404, message: `Item ${itemId} not found.` };
            }
            const errorText = await response.text();
            console.error(`API-Fehler beim Abrufen von Item ${itemId} aus Collection ${collectionId}: ${response.status} - ${errorText}`);
            if (response.status === 429) {
                console.warn(`Rate limit getroffen bei Item ${itemId}.`);
                return { error: true, status: 429, message: "Too Many Requests for item " + itemId, id: itemId };
            }
            return { id: itemId, error: true, status: response.status, message: `API Error for item ${itemId}: ${errorText}` };
        }
        return await response.json();
    } catch (error) {
        console.error(`❌ Netzwerkfehler oder anderer Fehler beim Abrufen des Items (${collectionId}/${itemId}): ${error.message}`);
        return { id: itemId, error: true, status: 'network_error', message: `Network error for item ${itemId}: ${error.message}` };
    }
}

/**
 * Fetches all applicant items for a given job based on their IDs.
 * Includes a small delay between fetches to avoid rate limiting.
 * @param {string} jobId - The ID of the job (for logging purposes).
 * @param {string[]} applicantIds - An array of applicant Webflow item IDs.
 * @returns {Promise<object[]>} A promise that resolves to an array of fetched applicant items (or error objects).
 */
export async function fetchAllApplicantsForJob(jobId, applicantIds) {
    console.log(`DEBUG: fetchAllApplicantsForJob START - Job ID: ${jobId}, Anzahl IDs: ${applicantIds.length}`);
    const fetchedItems = [];
    let successfulFetches = 0;

    if (applicantIds.length > 0) {
        const promises = applicantIds.map((applicantId, index) =>
            delay(index * (API_CALL_DELAY_MS / 2)) // Stagger calls slightly more gently
            .then(() => fetchWebflowItem(USER_COLLECTION_ID_MJ, applicantId))
        );
        const results = await Promise.all(promises);
        results.forEach(item => {
            if (item) { // Ensure item is not null (though fetchWebflowItem should always return an object)
                fetchedItems.push(item);
                if (!item.error) successfulFetches++;
            } else {
                 // This case should ideally not happen if fetchWebflowItem is robust
                console.warn(`fetchAllApplicantsForJob: Received null for applicantId ${applicantIds[fetchedItems.length]} in job ${jobId}`);
                fetchedItems.push({ id: applicantIds[fetchedItems.length], error: true, status: 'fetch_null_error', message: 'Unexpected null response during fetch.'});
            }
        });
    }
    console.log(`DEBUG: fetchAllApplicantsForJob END - Job ID: ${jobId}, ${successfulFetches} von ${applicantIds.length} Items erfolgreich geladen.`);
    return fetchedItems;
}
