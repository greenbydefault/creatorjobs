// 🌐 Optimierte Webflow API Integration für GitHub-Hosting

// 🔧 Konfiguration
const API_BASE_URL = "https://api.webflow.com/v2/collections";
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url=";
const VIDEO_COLLECTION_ID = "680b45a22b15fa4643ebdca9";
const CUSTOMER_COLLECTION_ID = "6448faf9c5a8a15f6cc05526";
const API_LIMIT = 100;

// --- NEU: Konfiguration für Virtual Scrolling ---
const estimatedItemHeight = 450; // !!! WICHTIG: Passe diese Höhe an die tatsächliche Höhe eines Video-Eintrags (inkl. Kundeninfo, Padding etc.) in Pixeln an !!!
const overscanCount = 5; // Wie viele Items über/unter dem sichtbaren Bereich zusätzlich gerendert werden sollen (Puffer)
const SCROLL_THROTTLE_DELAY = 100; // Millisekunden für Scroll-Event-Throttling

// Globale Variablen
let allVideoItems = [];
let filteredVideoItems = []; // Aktuell gefilterte Items
let allCustomerData = {};
const videoContainerId = "video-container"; // Hauptcontainer für alle Videos
const filterTagWrapperId = "filter-tag-wrapper";
const searchInputId = "filter-search";
let searchDebounceTimer = null;
const DEBOUNCE_DELAY = 300;
let scrollThrottleTimer = null; // Timer für Scroll-Throttling
let virtualScrollWrapper = null; // Wrapper für die Gesamthöhe
let lastRenderedScrollTop = -1; // Um unnötiges Rendern zu vermeiden

// --- Filterkonfiguration (Checkboxes) ---
const filterConfig = [
    { field: 'creatortype', filters: [ { id: "influencer", value: "6feb96f95ec4037985d5b65bc97ac482", display: "Creator: Influencer" }, { id: "ugc", value: "601abdcb4984b44f9188caec03e2ed59", display: "Creator: UGC" }, { id: "model", value: "dc4a8f7ad6191674745dcecbf763c827", display: "Creator: Model" } ] },
    { field: 'produktion', filters: [ { id: "vorort", value: "096401b55fe1fc511bd2f7b4d8c6a26b", display: "Ort: Vor Ort" }, { id: "creatorproduktion", value: "a82d800f50eaa6671a2361428ee5a7d7", display: "Ort: Creatorproduktion" } ] },
    { field: 'anzeige', filters: [ { id: "paid", value: "f2cdad102ae28465ff7eebfb496570d0", display: "Typ: Paid" }, { id: "werbung", value: "93704cc37eb0d87a732cf645309c9710", display: "Typ: Werbeanzeige" }, { id: "organisch", value: "a7e457d2518c7a2f617a2777ce897f93", display: "Typ: Organisch" } ] },
    { field: 'kunden', filters: [ { id: "autoscout", value: "678f5b698973dba7df78f644", display: "Kunde: Autoscout" }, { id: "B-B", value: "64808c8079995e878fda4f67", display: "Kunde: B&B Hotels" }, { id: "chefkoch", value: "679213a19cc8609f08cc4565", display: "Kunde: Chefkoch" }, { id: "telekom", value: "659d5ef1dd74610abc7f44c6", display: "Kunde: Telekom" } ] }
];

// --- Konfiguration für Suchfelder ---
const searchableFields = ['name', 'creator', 'beschreibung', 'video-name', 'produktionsort'];

// 🛠️ Hilfsfunktionen (buildWorkerUrl, fetchWebflowData, fetchAllCollectionItems, fetchSingleItem, fetchRelevantCustomerData - unverändert)
function buildWorkerUrl(apiUrl) { /* ... */ }
async function fetchWebflowData(apiUrl) { /* ... */ }
async function fetchAllCollectionItems(collectionId) { /* ... */ }
async function fetchSingleItem(collectionId, itemId) { /* ... */ }
async function fetchRelevantCustomerData(customerIds) { /* ... */ }

// --- NEU: Throttle Funktion ---
/**
 * Erstellt eine gedrosselte Version einer Funktion, die höchstens einmal
 * pro `delay` Millisekunden aufgerufen wird.
 * @param {Function} func Die zu drosselnde Funktion.
 * @param {number} delay Die Verzögerung in Millisekunden.
 * @returns {Function} Die gedrosselte Funktion.
 */
function throttle(func, delay) {
  let inProgress = false;
  return (...args) => {
    if (inProgress) {
      return; // Ignoriere Aufruf, wenn einer bereits läuft
    }
    inProgress = true;
    setTimeout(() => {
      func.apply(this, args); // Führe Funktion aus
      inProgress = false; // Erlaube nächsten Aufruf
    }, delay);
  };
}


// 🎨 Rendering-Funktionen

/**
 * --- NEU: Rendert nur die sichtbaren Video-Items basierend auf Scroll-Position. ---
 */
function renderVisibleVideos() {
    const container = document.getElementById(videoContainerId);
    if (!container || !virtualScrollWrapper) {
        // console.error("Container oder Virtual Scroll Wrapper nicht gefunden.");
        return;
    }

    const scrollTop = container.scrollTop; // Aktuelle Scroll-Position
    const containerHeight = container.offsetHeight; // Sichtbare Höhe des Containers

    // Berechne den Index des ersten sichtbaren Elements
    let startIndex = Math.floor(scrollTop / estimatedItemHeight);
    // Berechne den Index des letzten sichtbaren Elements
    let endIndex = Math.ceil((scrollTop + containerHeight) / estimatedItemHeight);

    // Wende den Overscan an (Puffer über/unter dem sichtbaren Bereich)
    startIndex = Math.max(0, startIndex - overscanCount);
    endIndex = Math.min(filteredVideoItems.length, endIndex + overscanCount); // Stelle sicher, dass endIndex nicht über die Array-Grenzen hinausgeht

    // --- Performance-Optimierung: Nur neu rendern, wenn sich der sichtbare Bereich *wirklich* ändert ---
    // (Diese einfache Prüfung hilft, ist aber nicht perfekt bei variabler Höhe)
    // if (startIndex === lastRenderedStartIndex && endIndex === lastRenderedEndIndex) {
    //     return; // Nichts hat sich geändert
    // }
    // lastRenderedStartIndex = startIndex;
    // lastRenderedEndIndex = endIndex;
    // --- Einfachere Prüfung basierend auf ScrollTop (weniger genau, aber oft ausreichend) ---
     if (Math.abs(scrollTop - lastRenderedScrollTop) < estimatedItemHeight / 2 && endIndex - startIndex < filteredVideoItems.length) {
         // Scrolle weniger als eine halbe Item-Höhe ODER es sind nicht alle Items sichtbar -> nicht neu rendern
         // return; // Deaktiviert für Testzwecke, kann aber Performance verbessern
     }
     lastRenderedScrollTop = scrollTop;


    // console.log(`Rendering items from ${startIndex} to ${endIndex-1} (ScrollTop: ${scrollTop})`); // Debugging

    const fragment = document.createDocumentFragment();

    // Iteriere nur über die sichtbaren Elemente
    for (let i = startIndex; i < endIndex; i++) {
        const item = filteredVideoItems[i];
        if (!item || !item.fieldData) continue; // Sicherheitshalber prüfen

        const fieldData = item.fieldData;
        let videoLink = fieldData['video-link'];
        const kundenIds = fieldData['kunden'];

        if (videoLink) {
            if (!videoLink.includes('&download=1')) {
                 if (videoLink.includes('?')) { videoLink += '&download=1'; }
                 else { videoLink += '?download=1'; }
            }

            const feedContainer = document.createElement("div");
            feedContainer.classList.add("video-feed-container");
            // --- NEU: Absolute Positionierung für Virtual Scrolling ---
            feedContainer.style.position = 'absolute';
            feedContainer.style.top = `${i * estimatedItemHeight}px`; // Position basierend auf Index und Höhe
            feedContainer.style.left = '0';
            feedContainer.style.right = '0';
            // feedContainer.style.height = `${estimatedItemHeight}px`; // Optional: Feste Höhe setzen?

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
                    logoImg.loading = 'lazy'; // Lazy Loading für Bilder
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
            } else if (firstCustomerId) {
                console.warn(`Kundendaten für ID ${firstCustomerId} nicht in allCustomerData gefunden.`);
            }

            const videoInnerContainer = document.createElement('div');
            videoInnerContainer.classList.add('feed-video-container');

            const videoElement = document.createElement('video');
            videoElement.playsInline = true;
            videoElement.preload = "metadata"; // Wichtig!
            videoElement.controls = true;
            videoElement.classList.add('db-video-player');
            videoElement.id = `db-user-video--${item.id || i}`; // Index i verwenden für Eindeutigkeit im sichtbaren Bereich

            const sourceElement = document.createElement('source');
            sourceElement.src = videoLink;
            sourceElement.type = 'video/mp4';

            videoElement.appendChild(sourceElement);
            videoElement.appendChild(document.createTextNode('Dein Browser unterstützt das Video-Tag nicht.'));

            videoElement.addEventListener('error', (e) => {
                console.error(`Fehler beim Laden von Video ${videoElement.id} von ${videoLink}:`, e);
                const errorP = document.createElement('p');
                errorP.style.color = 'red'; errorP.style.padding = '10px'; errorP.style.border = '1px solid red';
                errorP.textContent = 'Video konnte nicht geladen werden.';
                if(videoElement.parentNode === videoInnerContainer) {
                     videoInnerContainer.replaceChild(errorP, videoElement);
                }
            }, { once: true });

            videoInnerContainer.appendChild(videoElement);
            feedContainer.appendChild(videoInnerContainer);
            fragment.appendChild(feedContainer);
        } else {
            console.warn(`⚠️ Video-Item ${item.id || i} hat keinen 'video-link'.`);
        }
    }

    // Ersetze den Inhalt des Wrappers (nicht des Hauptcontainers!)
    virtualScrollWrapper.innerHTML = ""; // Alte sichtbare Elemente entfernen
    virtualScrollWrapper.appendChild(fragment); // Neue sichtbare Elemente hinzufügen
}


function renderFilterTags(activeFiltersFlat) {
    const wrapper = document.getElementById(filterTagWrapperId);
    if (!wrapper) {
        console.warn(`⚠️ Filter-Tag-Wrapper mit ID '${filterTagWrapperId}' nicht gefunden.`);
        return;
    }
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
            if (correspondingCheckbox) {
                correspondingCheckbox.checked = false;
                applyFiltersAndRender(); // Filter neu anwenden
            } else {
                console.error(`FEHLER: Konnte Checkbox mit ID ${checkboxIdToRemove} zum Entfernen nicht finden!`);
            }
        });

        tagElement.appendChild(tagName);
        tagElement.appendChild(removeButton);
        fragment.appendChild(tagElement);
    });

    wrapper.innerHTML = '';
    wrapper.appendChild(fragment);
}


// 🔄 Filterlogik und Aktualisierung

function applyFiltersAndRender() {
    if (Object.keys(allCustomerData).length === 0 && allVideoItems.length > 0) {
         console.warn("Kundendaten noch nicht geladen, Filterung könnte unvollständig sein.");
    }

    console.time("Nur Filterung"); // Zeitmessung für reine Filterlogik

    // 1. Aktive Checkbox-Filter identifizieren
    const activeFiltersByGroup = {};
    let allActiveCheckboxFiltersFlat = [];
    filterConfig.forEach(group => { /* ... (unverändert) ... */ });
    const searchInput = document.getElementById(searchInputId);
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

    // 3. Video-Items filtern (speichert Ergebnis in globaler Variable)
    filteredVideoItems = allVideoItems.filter(item => {
        let matchesCheckboxFilters = true;
        for (const groupField in activeFiltersByGroup) { /* ... (Filterlogik unverändert) ... */ }
        if (!matchesCheckboxFilters) return false;

        let matchesSearchTerm = true;
        if (searchTerm) { /* ... (Suchlogik unverändert) ... */ }
        return matchesSearchTerm;
    });

    console.timeEnd("Nur Filterung");
    console.log(`📊 ${filteredVideoItems.length} von ${allVideoItems.length} Videos entsprechen den Filtern.`);

    // --- NEU: Virtual Scrolling Setup ---
    const container = document.getElementById(videoContainerId);
    if (!container) return;

    // Erstelle den inneren Wrapper, falls nicht vorhanden
    if (!virtualScrollWrapper) {
        virtualScrollWrapper = document.createElement('div');
        virtualScrollWrapper.style.position = 'relative'; // Wichtig für absolute Positionierung der Items
        virtualScrollWrapper.style.overflow = 'hidden'; // Verhindert versehentliches Überlaufen
        container.innerHTML = ''; // Leere den Hauptcontainer einmalig
        container.appendChild(virtualScrollWrapper);
        // Stelle sicher, dass der Hauptcontainer scrollbar ist und eine Höhe hat!
        container.style.overflowY = 'scroll'; // Scrollbar machen
        // container.style.height = '80vh'; // Beispiel: Höhe setzen (oder max-height) -> WICHTIG via CSS!
        container.style.position = 'relative'; // Notwendig für absolute Positionierung innen
    }

    // Setze die Gesamthöhe des Wrappers basierend auf der Anzahl gefilterter Items
    const totalHeight = filteredVideoItems.length * estimatedItemHeight;
    virtualScrollWrapper.style.height = `${totalHeight}px`;

    // --- Ende Virtual Scrolling Setup ---

    // 4. Aktive Checkbox-Filter-Tags rendern
    renderFilterTags(allActiveCheckboxFiltersFlat);

    // 5. Sichtbare Videos rendern (initial und bei Filteränderung)
    console.time("Initiales sichtbares Rendering");
    lastRenderedScrollTop = -1; // Reset, um erstes Rendern zu erzwingen
    renderVisibleVideos();
    console.timeEnd("Initiales sichtbares Rendering");

}


// 🚀 Initialisierung und Hauptfunktionen

// --- NEU: Gedrosselte Scroll-Handler Funktion ---
const handleScroll = throttle(() => {
    // console.log("Scroll Event (throttled)"); // Debugging
    renderVisibleVideos();
}, SCROLL_THROTTLE_DELAY);


async function displayVideoCollection() {
    try {
        console.log("Schritt 1: Starte Laden der Videos.");
        allVideoItems = await fetchAllCollectionItems(VIDEO_COLLECTION_ID);
        console.log(`Schritt 2: Videos geladen? ${allVideoItems !== null ? 'Ja' : 'Nein'}. Anzahl: ${allVideoItems?.length ?? 0}`);

        if (allVideoItems === null || allVideoItems.length === 0) {
             console.log("Keine Videos gefunden oder Fehler beim Laden. Breche ab.");
             renderVideos([], videoContainerId); renderFilterTags([]); return;
        }
        console.log(`📹 ${allVideoItems.length} Video(s) insgesamt erfolgreich geladen.`);

        const relevantCustomerIds = new Set();
        allVideoItems.forEach(item => { /* ... (Kunden-IDs sammeln unverändert) ... */ });
        const uniqueCustomerIds = Array.from(relevantCustomerIds);
        console.log(`Schritt 3: ${uniqueCustomerIds.length} einzigartige Kunden-IDs in Videos gefunden.`);

        const customerDataLoaded = await fetchRelevantCustomerData(uniqueCustomerIds);
        console.log(`Schritt 4: Relevante Kundendaten Lade-Status: ${customerDataLoaded}`);
        if (!customerDataLoaded) {
             console.warn("Fehler beim Laden der relevanten Kundendaten. Videos werden ohne Kundeninformationen angezeigt.");
             allCustomerData = {};
        }

        console.log("Schritt 5: Richte Event Listener ein.");
        // Checkbox Listener
        filterConfig.forEach(group => {
            group.filters.forEach(filter => {
                const checkbox = document.getElementById(filter.id);
                if (checkbox) { checkbox.addEventListener('change', applyFiltersAndRender); } // Ruft jetzt die Filterung + Virtual Scroll Setup auf
                else { console.warn(`⚠️ Filter-Checkbox mit ID '${filter.id}' nicht im DOM gefunden.`); }
            });
        });
        // Suchfeld Listener
        const searchInput = document.getElementById(searchInputId);
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => { applyFiltersAndRender(); }, DEBOUNCE_DELAY); // Ruft Filterung + Virtual Scroll Setup auf
            });
            console.log(`✅ Event Listener (debounced) für Suchfeld '${searchInputId}' eingerichtet.`);
        } else { console.warn(`⚠️ Such-Eingabefeld mit ID '${searchInputId}' nicht im DOM gefunden.`); }

        // --- NEU: Scroll Listener für Virtual Scrolling ---
        const container = document.getElementById(videoContainerId);
        if(container) {
            container.addEventListener('scroll', handleScroll);
            console.log(`✅ Scroll Listener für Container '${videoContainerId}' eingerichtet.`);
        }
        // Optional: Resize Listener hinzufügen, um bei Größenänderung neu zu rendern
        // window.addEventListener('resize', throttle(renderVisibleVideos, 150));


        console.log("Schritt 6: Rufe initial applyFiltersAndRender auf.");
        applyFiltersAndRender(); // Führt die erste Filterung durch und rendert die initial sichtbaren Videos

    } catch (error) {
        console.error("❌ Schwerwiegender Fehler beim Anzeigen der Video-Collection:", error);
        const container = document.getElementById(videoContainerId);
        if (container) container.innerHTML = "<p>Ein unerwarteter Fehler ist aufgetreten.</p>";
        renderFilterTags([]);
    }
}

// --- Start der Anwendung ---
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM geladen. Starte Ladevorgänge...");

    const videoContainerExists = !!document.getElementById(videoContainerId);
    const tagWrapperExists = !!document.getElementById(filterTagWrapperId);

    if (videoContainerExists && tagWrapperExists) {
         displayVideoCollection();
    } else {
        if (!videoContainerExists) console.error(`FEHLER: Video-Container ('${videoContainerId}') nicht gefunden!`);
        if (!tagWrapperExists) console.error(`FEHLER: Filter-Tag-Wrapper ('${filterTagWrapperId}') nicht gefunden!`);
        console.error("Video-Feed kann nicht initialisiert werden.");
    }
});
