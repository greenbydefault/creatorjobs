// Frontend Script using Server-Side Filtering via Cloudflare Worker
// (Worker handles Caching and Customer Data Enrichment)
// (Virtual Scrolling with direct children in container)

// 🔧 Konfiguration
const FILTER_WORKER_URL = "https://video-filter-worker.oliver-258.workers.dev/";
const CUSTOMER_COLLECTION_ID = "6448faf9c5a8a15f6cc05526";
const API_BASE_URL = "https://api.webflow.com/v2/collections";
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url=";

// --- Virtual Scrolling Konfiguration ---
const estimatedItemHeight = 450; // Höhe anpassen!
const overscanCount = 5;
const SCROLL_THROTTLE_DELAY = 100;

// Globale Variablen
let filteredVideoItems = [];
let allCustomerData = {};
const videoContainerId = "video-container"; // Hauptcontainer für alle Videos
const filterTagWrapperId = "filter-tag-wrapper";
const searchInputId = "filter-search";
const loadingIndicatorId = "loading-indicator";
const virtualScrollSpacerId = "virtual-scroll-spacer"; // --- NEU: ID für das Spacer-Element ---
let searchDebounceTimer = null;
const DEBOUNCE_DELAY = 300;
let scrollThrottleTimer = null;
// virtualScrollWrapper wird nicht mehr benötigt
let lastRenderedScrollTop = -1;
let isLoading = false;

// --- Filterkonfiguration (Checkboxes) ---
const filterConfig = [
    { field: 'creatortype', filters: [ { id: "influencer", value: "6feb96f95ec4037985d5b65bc97ac482", display: "Creator: Influencer" }, { id: "ugc", value: "601abdcb4984b44f9188caec03e2ed59", display: "Creator: UGC" }, { id: "model", value: "dc4a8f7ad6191674745dcecbf763c827", display: "Creator: Model" } ] },
    { field: 'produktion', filters: [ { id: "vorort", value: "096401b55fe1fc511bd2f7b4d8c6a26b", display: "Ort: Vor Ort" }, { id: "creatorproduktion", value: "a82d800f50eaa6671a2361428ee5a7d7", display: "Ort: Creatorproduktion" } ] },
    { field: 'anzeige', filters: [ { id: "paid", value: "f2cdad102ae28465ff7eebfb496570d0", display: "Typ: Paid" }, { id: "werbung", value: "93704cc37eb0d87a732cf645309c9710", display: "Typ: Werbeanzeige" }, { id: "organisch", value: "a7e457d2518c7a2f617a2777ce897f93", display: "Typ: Organisch" } ] },
    { field: 'kunden', filters: [ { id: "autoscout", value: "678f5b698973dba7df78f644", display: "Kunde: Autoscout" }, { id: "B-B", value: "64808c8079995e878fda4f67", display: "Kunde: B&B Hotels" }, { id: "chefkoch", value: "679213a19cc8609f08cc4565", display: "Kunde: Chefkoch" }, { id: "telekom", value: "659d5ef1dd74610abc7f44c6", display: "Kunde: Telekom" } ] }
];

// --- Konfiguration für Suchfelder ---
const searchableFields = ['name', 'creator', 'beschreibung', 'video-name', 'produktionsort'];

// 🛠️ Hilfsfunktionen (buildCustomerWorkerUrl, fetchWebflowCustomerData, fetchSingleCustomerItem, throttle, fetchFilteredVideos, fetchRelevantCustomerData - unverändert)
function buildCustomerWorkerUrl(apiUrl) { /* ... */ }
async function fetchWebflowCustomerData(apiUrl) { /* ... */ }
async function fetchSingleCustomerItem(customerId) { /* ... */ }
function throttle(func, delay) { /* ... */ }
async function fetchFilteredVideos(queryParams) { /* ... */ }
async function fetchRelevantCustomerData(customerIds) { /* ... */ }


// 🎨 Rendering-Funktionen

/**
 * --- GEÄNDERT: Rendert sichtbare Videos direkt in den Hauptcontainer. ---
 */
function renderVisibleVideos() {
    const container = document.getElementById(videoContainerId);
    // Spacer wird jetzt benötigt, um die Höhe zu halten
    const spacer = document.getElementById(virtualScrollSpacerId);
    if (!container || !spacer) {
        // console.error("Container oder Virtual Scroll Spacer nicht gefunden.");
        return;
    }

    const scrollTop = container.scrollTop;
    const containerHeight = container.offsetHeight;
    let startIndex = Math.floor(scrollTop / estimatedItemHeight);
    let endIndex = Math.ceil((scrollTop + containerHeight) / estimatedItemHeight);
    startIndex = Math.max(0, startIndex - overscanCount);
    endIndex = Math.min(filteredVideoItems.length, endIndex + overscanCount);

     if (Math.abs(scrollTop - lastRenderedScrollTop) < estimatedItemHeight / 2 && endIndex - startIndex < filteredVideoItems.length) {
         // return; // Optional: Performance-Optimierung
     }
     lastRenderedScrollTop = scrollTop;

    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
        const item = filteredVideoItems[i];
        if (!item || !item.fieldData) continue;
        const fieldData = item.fieldData;
        let videoLink = fieldData['video-link'];
        const kundenIds = fieldData['kunden'];

        if (videoLink) {
            if (!videoLink.includes('&download=1')) {
                 if (videoLink.includes('?')) { videoLink += '&download=1'; } else { videoLink += '?download=1'; }
            }
            const feedContainer = document.createElement("div");
            feedContainer.classList.add("video-feed-container");
            // --- Positionierung relativ zum Hauptcontainer ---
            feedContainer.style.position = 'absolute';
            feedContainer.style.top = `${i * estimatedItemHeight}px`;
            feedContainer.style.left = '0';
            feedContainer.style.right = '0';
            // Wichtig: Eindeutiges Attribut setzen, um alte Elemente zu finden
            feedContainer.dataset.virtualIndex = i;

            const firstCustomerId = (Array.isArray(kundenIds) && kundenIds.length > 0) ? kundenIds[0] : null;
            const customerInfo = firstCustomerId ? allCustomerData[firstCustomerId] : null;
            if (customerInfo) { /* ... (Kundeninfo rendern wie zuvor) ... */ }
            else if (firstCustomerId) { console.warn(`Kundendaten für ID ${firstCustomerId} nicht gefunden.`); }

            const videoInnerContainer = document.createElement('div');
            videoInnerContainer.classList.add('feed-video-container');
            const videoElement = document.createElement('video');
            videoElement.playsInline = true; videoElement.preload = "metadata"; videoElement.controls = true;
            videoElement.classList.add('db-video-player'); videoElement.id = `db-user-video--${item.id || i}`;
            const sourceElement = document.createElement('source');
            sourceElement.src = videoLink; sourceElement.type = 'video/mp4';
            videoElement.appendChild(sourceElement);
            videoElement.appendChild(document.createTextNode('Dein Browser unterstützt das Video-Tag nicht.'));
            videoElement.addEventListener('error', (e) => { /* ... (Fehlerbehandlung wie zuvor) ... */ }, { once: true });
            videoInnerContainer.appendChild(videoElement);
            feedContainer.appendChild(videoInnerContainer);
            fragment.appendChild(feedContainer); // Zum Fragment hinzufügen
        } else { console.warn(`⚠️ Video-Item ${item.id || i} hat keinen 'video-link'.`); }
    }

    // --- GEÄNDERT: Alte Video-Elemente entfernen, Spacer behalten, neue hinzufügen ---
    // Entferne nur die Elemente, die wir für Videos hinzugefügt haben
    const existingVideoElements = container.querySelectorAll('.video-feed-container');
    existingVideoElements.forEach(el => el.remove());

    // Füge die neuen sichtbaren Elemente hinzu (nach dem Spacer)
    container.appendChild(fragment);
}

// renderFilterTags - unverändert
function renderFilterTags(activeFiltersFlat) { /* ... */ }


// 🔄 Filterlogik und Aktualisierung

/**
 * --- GEÄNDERT: Setzt die Höhe des Spacers statt des Wrappers. ---
 */
async function applyFiltersAndRender() {
    if (isLoading) { console.log("🔄 Filter ignoriert, Ladevorgang läuft."); return; }
    isLoading = true;
    console.log("🏁 Starte Filteranwendung und Datenabruf vom Worker...");
    const loadingIndicator = document.getElementById(loadingIndicatorId);
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    console.time("Gesamte Filter/Render-Zeit");

    // 1. Aktive Filter und Suchbegriff sammeln -> Query-Parameter bauen
    let allActiveCheckboxFiltersFlat = [];
    const queryParams = new URLSearchParams();
    filterConfig.forEach(group => { /* ... (unverändert) ... */ });
    const searchInput = document.getElementById(searchInputId);
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
    if (searchTerm) { queryParams.set("search", searchTerm); }

    // 2. Gefilterte Videos vom Worker abrufen
    console.time("Worker Abrufzeit");
    filteredVideoItems = await fetchFilteredVideos(`?${queryParams.toString()}`);
    console.timeEnd("Worker Abrufzeit");

    const cleanupAndFinish = () => {
        isLoading = false;
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        console.timeEnd("Gesamte Filter/Render-Zeit");
    };

    if (filteredVideoItems === null) {
         const container = document.getElementById(videoContainerId);
         if (container) container.innerHTML = "<p>Fehler beim Laden der gefilterten Videos.</p>"; // Leert auch Spacer
         renderFilterTags([]); cleanupAndFinish(); return;
    }

    // 3. Relevante Kunden-IDs sammeln und *fehlende* Daten laden
    const relevantCustomerIds = new Set();
    filteredVideoItems.forEach(item => { /* ... (unverändert) ... */ });
    const uniqueCustomerIds = Array.from(relevantCustomerIds);
    console.log(`   -> ${uniqueCustomerIds.length} Kunden-IDs in gefilterten Videos.`);
    console.time("Kunden Caching/Abrufzeit");
    const customerDataLoaded = await fetchRelevantCustomerData(uniqueCustomerIds);
    console.timeEnd("Kunden Caching/Abrufzeit");
    if (!customerDataLoaded) {
        console.warn("Fehler beim Laden der relevanten Kundendaten."); allCustomerData = allCustomerData || {};
    }

    // 4. Virtual Scrolling Setup (mit Spacer)
    const container = document.getElementById(videoContainerId);
    if (!container) { cleanupAndFinish(); return; }

    // Finde oder erstelle den Spacer
    let spacer = document.getElementById(virtualScrollSpacerId);
    if (!spacer) {
        console.log("Erstelle Virtual Scroll Spacer.");
        spacer = document.createElement('div');
        spacer.id = virtualScrollSpacerId;
        spacer.style.position = 'relative'; // Wichtig, damit er im Fluss bleibt
        spacer.style.width = '1px'; // Minimale Breite
        spacer.style.opacity = '0'; // Unsichtbar
        // Füge als *erstes* Element ein, falls noch nicht vorhanden
        if (container.firstChild) {
            container.insertBefore(spacer, container.firstChild);
        } else {
            container.appendChild(spacer);
        }
        // Stelle sicher, dass der Hauptcontainer relativ positioniert ist (wichtig für absolute Kinder)
        container.style.position = 'relative';
        container.style.overflowY = 'scroll'; // Sicherstellen, dass Scrollen aktiviert ist
        // container.style.height = '80vh'; // Beispiel: Höhe via CSS setzen!
    }

    // Setze die Höhe des Spacers
    const totalHeight = filteredVideoItems.length * estimatedItemHeight;
    spacer.style.height = `${totalHeight}px`;
    console.log(`Spacer Höhe gesetzt auf: ${totalHeight}px`);

    // 5. Filter-Tags rendern
    renderFilterTags(allActiveCheckboxFiltersFlat);

    // 6. Sichtbare Videos rendern
    console.time("Sichtbares Rendering nach Filter");
    lastRenderedScrollTop = -1;
    // container.scrollTop = 0; // Optional: Scroll zurücksetzen
    renderVisibleVideos(); // Rendert jetzt direkt in den Container
    console.timeEnd("Sichtbares Rendering nach Filter");

    console.log(`📊 ${filteredVideoItems.length} Videos angezeigt.`);
    cleanupAndFinish();
}


// 🚀 Initialisierung und Hauptfunktionen

const handleScroll = throttle(() => { renderVisibleVideos(); }, SCROLL_THROTTLE_DELAY);

async function displayVideoCollection() {
    try {
        console.log("Schritt 1: Richte Event Listener ein.");
        filterConfig.forEach(group => { /* ... (unverändert) ... */ });
        const searchInput = document.getElementById(searchInputId);
        if (searchInput) { /* ... (unverändert) ... */ } else { /* ... */ }
        const container = document.getElementById(videoContainerId);
        if(container) { /* ... (unverändert) ... */ }

        console.log("Schritt 2: Rufe initial applyFiltersAndRender auf.");
        await applyFiltersAndRender();

    } catch (error) {
        console.error("❌ Schwerwiegender Fehler beim Initialisieren:", error);
        const container = document.getElementById(videoContainerId);
        if (container) container.innerHTML = "<p>Ein unerwarteter Fehler ist aufgetreten.</p>";
        renderFilterTags([]);
        const loadingIndicator = document.getElementById(loadingIndicatorId);
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

// --- Start der Anwendung ---
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM geladen. Starte Initialisierung...");
    const videoContainerExists = !!document.getElementById(videoContainerId);
    const tagWrapperExists = !!document.getElementById(filterTagWrapperId);
    if (videoContainerExists && tagWrapperExists) { displayVideoCollection(); }
    else { console.error("FEHLER: Video-Container oder Tag-Wrapper nicht gefunden!"); }
});

