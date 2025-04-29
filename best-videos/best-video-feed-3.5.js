// Frontend Script using Server-Side Filtering via Cloudflare Worker

// 🔧 Konfiguration
// --- NEU: URL des *neuen* Workers für die Filterung ---
// !!! AKTUALISIERT mit deiner URL !!!
const FILTER_WORKER_URL = "https://video-filter-worker.oliver-258.workers.dev/"; // <-- HIER AKTUALISIERT

const CUSTOMER_COLLECTION_ID = "6448faf9c5a8a15f6cc05526"; // Kunden/Member Collection ID
const API_BASE_URL = "https://api.webflow.com/v2/collections"; // Wird nur noch für Kunden-Einzelabruf benötigt
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url="; // Alter Worker für Kunden-Einzelabruf (falls noch benötigt)

// --- Virtual Scrolling Konfiguration ---
const estimatedItemHeight = 450; // Höhe anpassen!
const overscanCount = 5;
const SCROLL_THROTTLE_DELAY = 100;

// Globale Variablen
let filteredVideoItems = []; // Speichert die vom Worker gefilterten Videos
let allCustomerData = {}; // Speicher für relevante Kundendaten
const videoContainerId = "video-container";
const filterTagWrapperId = "filter-tag-wrapper";
const searchInputId = "filter-search";
let searchDebounceTimer = null;
const DEBOUNCE_DELAY = 300;
let scrollThrottleTimer = null;
let virtualScrollWrapper = null;
let lastRenderedScrollTop = -1;
let isLoading = false; // Flag, um parallele Ladevorgänge zu verhindern

// --- Filterkonfiguration (Checkboxes) ---
const filterConfig = [
    { field: 'creatortype', filters: [ { id: "influencer", value: "6feb96f95ec4037985d5b65bc97ac482", display: "Creator: Influencer" }, { id: "ugc", value: "601abdcb4984b44f9188caec03e2ed59", display: "Creator: UGC" }, { id: "model", value: "dc4a8f7ad6191674745dcecbf763c827", display: "Creator: Model" } ] },
    { field: 'produktion', filters: [ { id: "vorort", value: "096401b55fe1fc511bd2f7b4d8c6a26b", display: "Ort: Vor Ort" }, { id: "creatorproduktion", value: "a82d800f50eaa6671a2361428ee5a7d7", display: "Ort: Creatorproduktion" } ] },
    { field: 'anzeige', filters: [ { id: "paid", value: "f2cdad102ae28465ff7eebfb496570d0", display: "Typ: Paid" }, { id: "werbung", value: "93704cc37eb0d87a732cf645309c9710", display: "Typ: Werbeanzeige" }, { id: "organisch", value: "a7e457d2518c7a2f617a2777ce897f93", display: "Typ: Organisch" } ] },
    { field: 'kunden', filters: [ { id: "autoscout", value: "678f5b698973dba7df78f644", display: "Kunde: Autoscout" }, { id: "B-B", value: "64808c8079995e878fda4f67", display: "Kunde: B&B Hotels" }, { id: "chefkoch", value: "679213a19cc8609f08cc4565", display: "Kunde: Chefkoch" }, { id: "telekom", value: "659d5ef1dd74610abc7f44c6", display: "Kunde: Telekom" } ] }
];

// --- Konfiguration für Suchfelder ---
const searchableFields = ['name', 'creator', 'beschreibung', 'video-name', 'produktionsort'];

// 🛠️ Hilfsfunktionen

// Worker für Kunden-Einzelabruf
function buildCustomerWorkerUrl(apiUrl) {
    return `${WORKER_BASE_URL}${encodeURIComponent(apiUrl)}`;
}
async function fetchWebflowCustomerData(apiUrl) {
    const workerUrl = buildCustomerWorkerUrl(apiUrl);
    try {
        const response = await fetch(workerUrl);
        if (!response.ok) {
            let errorText = `Status: ${response.status}`;
            try { const errorData = await response.json(); errorText = `${errorText} - ${errorData.message || JSON.stringify(errorData)}`; }
            catch (e) { errorText = `${errorText} - ${await response.text()}`; }
            throw new Error(`API-Fehler (Kunde): ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`❌ Fehler beim Abrufen von Kundendaten über Worker ${workerUrl}: ${error.message}`);
        return null;
    }
}
async function fetchSingleCustomerItem(customerId) {
    // Baut die spezifische URL für ein einzelnes Live-Item
    const apiUrl = `${API_BASE_URL}/${CUSTOMER_COLLECTION_ID}/items/${customerId}/live`;
    // Nutzt den *alten* Worker (oder direkten Fetch, wenn CORS erlaubt)
    return await fetchWebflowCustomerData(apiUrl);
}

// Throttle Funktion
function throttle(func, delay) {
  let inProgress = false;
  return (...args) => {
    if (inProgress) return;
    inProgress = true;
    setTimeout(() => {
      func.apply(this, args);
      inProgress = false;
    }, delay);
  };
}

/**
 * Ruft gefilterte Videos vom *neuen* Worker ab.
 */
async function fetchFilteredVideos(queryParams) {
    // Stelle sicher, dass die URL mit einem / endet, falls nicht vorhanden
    const baseUrl = FILTER_WORKER_URL.endsWith('/') ? FILTER_WORKER_URL : `${FILTER_WORKER_URL}/`;
    const fullWorkerUrl = `${baseUrl}${queryParams}`; // Füge Query-Parameter hinzu
    console.log(`🚀 Anfrage an Filter-Worker: ${fullWorkerUrl}`);
    try {
        const response = await fetch(fullWorkerUrl); // Direkter Fetch zum neuen Worker
        if (!response.ok) {
            let errorMsg = `Fehler vom Filter-Worker: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg += ` - ${errorData.error || JSON.stringify(errorData)}`;
            } catch(e) { /* ignore */ }
            throw new Error(errorMsg);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
            console.log(`✅ ${data.length} gefilterte Videos vom Worker erhalten.`);
            return data;
        } else {
             console.error("Unerwartete Antwort vom Filter-Worker:", data);
             throw new Error("Ungültige Antwort vom Filter-Worker.");
        }
    } catch (error) {
        console.error(`❌ Fehler beim Abrufen gefilterter Videos: ${error.message}`);
        return null;
    }
}

/**
 * Lädt nur die Daten für die tatsächlich benötigten Kunden-IDs.
 */
async function fetchRelevantCustomerData(customerIds) {
    if (!customerIds || customerIds.length === 0) {
        console.log("Keine relevanten Kunden-IDs gefunden, überspringe Datenabruf.");
        allCustomerData = {};
        return true;
    }
    console.log(`🤵‍♂️ Lade Daten für ${customerIds.length} relevante(n) Kunden...`);
    const customerPromises = customerIds.map(id => fetchSingleCustomerItem(id)); // Nutzt alten Worker via Hilfsfunktion
    try {
        const customerItems = await Promise.all(customerPromises);
        allCustomerData = customerItems.reduce((map, customer) => {
            if (customer && customer.id && customer.fieldData) {
                map[customer.id] = {
                    name: customer.fieldData.name || 'Unbekannter Kunde',
                    logoUrl: customer.fieldData['user-profile-img'] || null
                };
            } else if (customer === null) {
                console.warn("   -> Ein Kunde konnte nicht geladen werden.");
            }
            return map;
        }, {});
        console.log(`👍 ${Object.keys(allCustomerData).length} von ${customerIds.length} Kundendaten geladen.`);
        return true;
    } catch (error) {
        console.error("❌ Fehler beim parallelen Abrufen der Kundendaten:", error);
        allCustomerData = {};
        return false;
    }
}


// 🎨 Rendering-Funktionen (renderVisibleVideos, renderFilterTags - keine Änderungen nötig)
function renderVisibleVideos() {
    const container = document.getElementById(videoContainerId);
    if (!container || !virtualScrollWrapper) return;
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
            feedContainer.style.position = 'absolute';
            feedContainer.style.top = `${i * estimatedItemHeight}px`;
            feedContainer.style.left = '0'; feedContainer.style.right = '0';

            const firstCustomerId = (Array.isArray(kundenIds) && kundenIds.length > 0) ? kundenIds[0] : null;
            const customerInfo = firstCustomerId ? allCustomerData[firstCustomerId] : null;
            if (customerInfo) {
                const customerRow = document.createElement('div');
                customerRow.classList.add('video-feed-row');
                if (customerInfo.logoUrl) {
                    const logoImg = document.createElement('img');
                    logoImg.classList.add('video-feed-logo');
                    logoImg.src = customerInfo.logoUrl;
                    logoImg.alt = `${customerInfo.name} Logo`;
                    logoImg.loading = 'lazy';
                    logoImg.onerror = () => { logoImg.style.display='none'; console.warn(`Kundenlogo für ${customerInfo.name} konnte nicht geladen werden: ${customerInfo.logoUrl}`); };
                    customerRow.appendChild(logoImg);
                } else {
                    const logoPlaceholder = document.createElement('div');
                    logoPlaceholder.classList.add('video-feed-logo-placeholder');
                    customerRow.appendChild(logoPlaceholder);
                }
                const customerNameSpan = document.createElement('span');
                customerNameSpan.classList.add('video-feed-customer');
                customerNameSpan.textContent = customerInfo.name;
                customerRow.appendChild(customerNameSpan);
                feedContainer.appendChild(customerRow);
            } else if (firstCustomerId) { console.warn(`Kundendaten für ID ${firstCustomerId} nicht gefunden.`); }

            const videoInnerContainer = document.createElement('div');
            videoInnerContainer.classList.add('feed-video-container');
            const videoElement = document.createElement('video');
            videoElement.playsInline = true; videoElement.preload = "metadata"; videoElement.controls = true;
            videoElement.classList.add('db-video-player'); videoElement.id = `db-user-video--${item.id || i}`;
            const sourceElement = document.createElement('source');
            sourceElement.src = videoLink; sourceElement.type = 'video/mp4';
            videoElement.appendChild(sourceElement);
            videoElement.appendChild(document.createTextNode('Dein Browser unterstützt das Video-Tag nicht.'));
            videoElement.addEventListener('error', (e) => {
                const errorP = document.createElement('p'); errorP.style.color = 'red'; errorP.style.padding = '10px'; errorP.style.border = '1px solid red';
                errorP.textContent = 'Video konnte nicht geladen werden.';
                if(videoElement.parentNode === videoInnerContainer) { videoInnerContainer.replaceChild(errorP, videoElement); }
            }, { once: true });
            videoInnerContainer.appendChild(videoElement);
            feedContainer.appendChild(videoInnerContainer);
            fragment.appendChild(feedContainer);
        } else { console.warn(`⚠️ Video-Item ${item.id || i} hat keinen 'video-link'.`); }
    }
    virtualScrollWrapper.innerHTML = "";
    virtualScrollWrapper.appendChild(fragment);
}

function renderFilterTags(activeFiltersFlat) {
    const wrapper = document.getElementById(filterTagWrapperId);
    if (!wrapper) return;
    const fragment = document.createDocumentFragment();
    activeFiltersFlat.forEach(filter => {
        const tagElement = document.createElement('div');
        tagElement.classList.add('search-filter-tag');
        const tagName = document.createElement('span');
        tagName.classList.add('tag-text');
        tagName.textContent = filter.display;
        const removeButton = document.createElement('button');
        removeButton.classList.add('filter-close-button');
        removeButton.textContent = '×';
        removeButton.setAttribute('aria-label', `Filter ${filter.display} entfernen`);
        removeButton.dataset.checkboxId = filter.id;
        removeButton.addEventListener('click', (e) => {
            const checkboxIdToRemove = e.currentTarget.dataset.checkboxId;
            const correspondingCheckbox = document.getElementById(checkboxIdToRemove);
            if (correspondingCheckbox) { correspondingCheckbox.checked = false; applyFiltersAndRender(); }
            else { console.error(`FEHLER: Checkbox mit ID ${checkboxIdToRemove} nicht gefunden!`); }
        });
        tagElement.appendChild(tagName);
        tagElement.appendChild(removeButton);
        fragment.appendChild(tagElement);
    });
    wrapper.innerHTML = '';
    wrapper.appendChild(fragment);
}


// 🔄 Filterlogik und Aktualisierung

async function applyFiltersAndRender() {
    if (isLoading) { console.log("🔄 Filter ignoriert, Ladevorgang läuft."); return; }
    isLoading = true;
    console.log("🏁 Starte Filteranwendung und Datenabruf...");
    // Optional: Ladeanzeige
    console.time("Gesamte Filter/Render-Zeit");

    // 1. Aktive Filter und Suchbegriff sammeln -> Query-Parameter bauen
    let allActiveCheckboxFiltersFlat = [];
    const queryParams = new URLSearchParams();
    filterConfig.forEach(group => {
        const groupField = group.field;
        const activeValues = [];
        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id);
            if (checkbox && checkbox.checked) {
                activeValues.push(filter.value);
                allActiveCheckboxFiltersFlat.push({ ...filter, field: groupField });
            }
        });
        if (activeValues.length > 0) { queryParams.set(groupField, activeValues.join(',')); }
    });
    const searchInput = document.getElementById(searchInputId);
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
    if (searchTerm) { queryParams.set("search", searchTerm); }

    // 2. Gefilterte Videos vom Worker abrufen
    filteredVideoItems = await fetchFilteredVideos(`?${queryParams.toString()}`);

    if (filteredVideoItems === null) {
         const container = document.getElementById(videoContainerId);
         if (container) container.innerHTML = "<p>Fehler beim Laden der gefilterten Videos.</p>";
         renderFilterTags([]); isLoading = false; console.timeEnd("Gesamte Filter/Render-Zeit"); return;
    }

    // 3. Relevante Kunden-IDs sammeln und Daten laden
    const relevantCustomerIds = new Set();
    filteredVideoItems.forEach(item => {
        const kunden = item?.fieldData?.kunden;
        if (Array.isArray(kunden)) { kunden.forEach(id => relevantCustomerIds.add(id)); }
    });
    const uniqueCustomerIds = Array.from(relevantCustomerIds);
    console.log(`   -> ${uniqueCustomerIds.length} Kunden-IDs in gefilterten Videos.`);
    const customerDataLoaded = await fetchRelevantCustomerData(uniqueCustomerIds);
    if (!customerDataLoaded) {
        console.warn("Fehler beim Laden der Kundendaten nach Filterung."); allCustomerData = {};
    }

    // 4. Virtual Scrolling Setup
    const container = document.getElementById(videoContainerId);
    if (!container) { isLoading = false; return; }
    if (!virtualScrollWrapper) {
        virtualScrollWrapper = document.createElement('div');
        virtualScrollWrapper.style.position = 'relative'; virtualScrollWrapper.style.overflow = 'hidden';
        container.innerHTML = ''; container.appendChild(virtualScrollWrapper);
        container.style.overflowY = 'scroll'; container.style.position = 'relative';
    }
    const totalHeight = filteredVideoItems.length * estimatedItemHeight;
    virtualScrollWrapper.style.height = `${totalHeight}px`;

    // 5. Filter-Tags rendern
    renderFilterTags(allActiveCheckboxFiltersFlat);

    // 6. Sichtbare Videos rendern
    console.time("Sichtbares Rendering nach Filter");
    lastRenderedScrollTop = -1;
    // container.scrollTop = 0; // Optional: Scroll zurücksetzen
    renderVisibleVideos();
    console.timeEnd("Sichtbares Rendering nach Filter");

    console.log(`📊 ${filteredVideoItems.length} Videos angezeigt.`);
    console.timeEnd("Gesamte Filter/Render-Zeit");
    isLoading = false;
    // Optional: Ladeanzeige ausblenden
}


// 🚀 Initialisierung und Hauptfunktionen

const handleScroll = throttle(() => { renderVisibleVideos(); }, SCROLL_THROTTLE_DELAY);

async function displayVideoCollection() {
    try {
        console.log("Schritt 1: Richte Event Listener ein.");
        filterConfig.forEach(group => {
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
        await applyFiltersAndRender(); // Lädt initial gefilterte Daten

    } catch (error) {
        console.error("❌ Schwerwiegender Fehler beim Initialisieren:", error);
        const container = document.getElementById(videoContainerId);
        if (container) container.innerHTML = "<p>Ein unerwarteter Fehler ist aufgetreten.</p>";
        renderFilterTags([]);
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
