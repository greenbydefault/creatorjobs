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
const virtualScrollSpacerId = "virtual-scroll-spacer";
let searchDebounceTimer = null;
const DEBOUNCE_DELAY = 300;
let scrollThrottleTimer = null;
let lastRenderedScrollTop = -1;
let isLoading = false;

// --- Filterkonfiguration (Checkboxes) ---
const filterConfig = [
    {
        field: 'creatortype',
        filters: [
            { id: "influencer", value: "6feb96f95ec4037985d5b65bc97ac482", display: "Creator: Influencer" },
            { id: "ugc", value: "601abdcb4984b44f9188caec03e2ed59", display: "Creator: UGC" },
            { id: "model", value: "dc4a8f7ad6191674745dcecbf763c827", display: "Creator: Model" }
        ]
    }, {
        field: 'produktion',
        filters: [
            { id: "vorort", value: "096401b55fe1fc511bd2f7b4d8c6a26b", display: "Ort: Vor Ort" },
            { id: "creatorproduktion", value: "a82d800f50eaa6671a2361428ee5a7d7", display: "Ort: Creatorproduktion" }
        ]
    }, {
        field: 'anzeige',
        filters: [
            { id: "paid", value: "f2cdad102ae28465ff7eebfb496570d0", display: "Typ: Paid" },
            { id: "werbung", value: "93704cc37eb0d87a732cf645309c9710", display: "Typ: Werbeanzeige" },
            { id: "organisch", value: "a7e457d2518c7a2f617a2777ce897f93", display: "Typ: Organisch" }
        ]
    },
    {
        field: 'kunden',
        filters: [
            { id: "autoscout", value: "678f5b698973dba7df78f644", display: "Kunde: Autoscout" },
            { id: "B-B", value: "64808c8079995e878fda4f67", display: "Kunde: B&B Hotels" },
            { id: "chefkoch", value: "679213a19cc8609f08cc4565", display: "Kunde: Chefkoch" },
            { id: "telekom", value: "659d5ef1dd74610abc7f44c6", display: "Kunde: Telekom" }
        ]
    }
];

// --- Konfiguration für Suchfelder ---
const searchableFields = ['name', 'creator', 'beschreibung', 'video-name', 'produktionsort'];

// 🛠️ Hilfsfunktionen (unverändert)
function buildCustomerWorkerUrl(apiUrl) { /* ... */ }
async function fetchWebflowCustomerData(apiUrl) { /* ... */ }
async function fetchSingleCustomerItem(customerId) { /* ... */ }
function throttle(func, delay) { /* ... */ }
async function fetchFilteredVideos(queryParams) { /* ... */ }
async function fetchRelevantCustomerData(customerIds) { /* ... */ }


// 🎨 Rendering-Funktionen (unverändert)
function renderVisibleVideos() { /* ... */ }
function renderFilterTags(activeFiltersFlat) { /* ... */ }


// 🔄 Filterlogik und Aktualisierung

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
    // --- KORREKTUR HIER: Deklaration innerhalb der Funktion, vor der Schleife ---
    const activeFiltersByGroup = {};

    if (!Array.isArray(filterConfig)) {
        console.error("FEHLER: filterConfig ist kein Array!", filterConfig);
        isLoading = false;
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        return;
    }

    filterConfig.forEach(group => {
        if (!group || !Array.isArray(group.filters)) {
             console.error("FEHLER: Ungültiges Objekt in filterConfig gefunden:", group);
             return;
        }
        const groupField = group.field;
        activeFiltersByGroup[groupField] = []; // Initialisiere Array für diese Gruppe
        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id);
            if (checkbox && checkbox.checked) {
                activeFiltersByGroup[groupField].push(filter.value);
                allActiveCheckboxFiltersFlat.push({ ...filter, field: groupField });
            }
        });
        // Füge Parameter nur hinzu, wenn Werte vorhanden sind
        if (activeFiltersByGroup[groupField] && activeFiltersByGroup[groupField].length > 0) {
             queryParams.set(groupField, activeFiltersByGroup[groupField].join(','));
        }
    });
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
         if (container) container.innerHTML = "<p>Fehler beim Laden der gefilterten Videos.</p>";
         renderFilterTags([]); cleanupAndFinish(); return;
    }

    // 3. Relevante Kunden-IDs sammeln und *fehlende* Daten laden
    const relevantCustomerIds = new Set();
    filteredVideoItems.forEach(item => {
        const kunden = item?.fieldData?.kunden;
        if (Array.isArray(kunden)) { kunden.forEach(id => relevantCustomerIds.add(id)); }
    });
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
    let spacer = document.getElementById(virtualScrollSpacerId);
    if (!spacer) {
        console.log("Erstelle Virtual Scroll Spacer.");
        spacer = document.createElement('div');
        spacer.id = virtualScrollSpacerId;
        spacer.style.position = 'relative'; spacer.style.width = '1px'; spacer.style.opacity = '0';
        if (container.firstChild) { container.insertBefore(spacer, container.firstChild); }
        else { container.appendChild(spacer); }
        container.style.position = 'relative'; container.style.overflowY = 'scroll';
    }
    const totalHeight = filteredVideoItems.length * estimatedItemHeight;
    spacer.style.height = `${totalHeight}px`;
    console.log(`Spacer Höhe gesetzt auf: ${totalHeight}px`);

    // 5. Filter-Tags rendern
    renderFilterTags(allActiveCheckboxFiltersFlat);

    // 6. Sichtbare Videos rendern
    console.time("Sichtbares Rendering nach Filter");
    lastRenderedScrollTop = -1;
    renderVisibleVideos();
    console.timeEnd("Sichtbares Rendering nach Filter");

    console.log(`📊 ${filteredVideoItems.length} Videos angezeigt.`);
    cleanupAndFinish();
}


// 🚀 Initialisierung und Hauptfunktionen

const handleScroll = throttle(() => { renderVisibleVideos(); }, SCROLL_THROTTLE_DELAY);

async function displayVideoCollection() {
    try {
        console.log("Schritt 1: Richte Event Listener ein.");
        // --- KORREKTUR: Entferne die überflüssige Deklaration von hier ---
        // const activeFiltersByGroup = {}; // <--- DIESE ZEILE ENTFERNEN

        filterConfig.forEach(group => {
            if (!group || !Array.isArray(group.filters)) {
                console.error("FEHLER: Ungültiges Objekt in filterConfig bei Initialisierung:", group);
                return;
            }
            group.filters.forEach(filter => {
                const checkbox = document.getElementById(filter.id);
                if (checkbox) { checkbox.addEventListener('change', applyFiltersAndRender); }
                else { console.warn(`⚠️ Filter-Checkbox mit ID '${filter.id}' nicht im DOM gefunden.`); }
            });
        });
        const searchInput = document.getElementById(searchInputId);
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => { applyFiltersAndRender(); }, DEBOUNCE_DELAY);
            });
            console.log(`✅ Event Listener (debounced) für Suchfeld '${searchInputId}' eingerichtet.`);
        } else { console.warn(`⚠️ Such-Eingabefeld mit ID '${searchInputId}' nicht im DOM gefunden.`); }
        const container = document.getElementById(videoContainerId);
        if(container) {
            container.addEventListener('scroll', handleScroll);
            console.log(`✅ Scroll Listener für Container '${videoContainerId}' eingerichtet.`);
        }

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
