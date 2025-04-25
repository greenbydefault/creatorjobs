// 🌐 Optimierte Webflow API Integration für GitHub-Hosting

// 🔧 Konfiguration
const API_BASE_URL = "https://api.webflow.com/v2/collections";
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url=";
const VIDEO_COLLECTION_ID = "680b45a22b15fa4643ebdca9";
const API_LIMIT = 100; // Max items per Webflow API request

// Globale Variablen
let allVideoItems = [];
const videoContainerId = "video-container";
const filterTagWrapperId = "filter-tag-wrapper";
const searchInputId = "filter-search";
let searchDebounceTimer = null; // Timer für Debouncing
const DEBOUNCE_DELAY = 300; // Millisekunden Verzögerung für Suche

// --- Filterkonfiguration (Checkboxes) ---
const filterConfig = [
    {
        field: 'kategorie', filters: [
            { id: "influencer", value: "influencer", display: "Kategorie: Influencer" },
            { id: "ugc", value: "ugc", display: "Kategorie: UGC" }
        ]
    }, {
        field: 'produktionsort', filters: [
            { id: "vorort", value: "vor ort", display: "Ort: Vor Ort" },
            { id: "creatorproduktion", value: "creatorproduktion", display: "Ort: Creatorproduktion" }
        ]
    }, {
        field: 'anzeigentype', filters: [
            { id: "paid", value: "paid", display: "Typ: Paid" },
            { id: "werbung", value: "werbeanzeige", display: "Typ: Werbeanzeige" }
        ]
    }
];

// --- Konfiguration für Suchfelder ---
const searchableFields = ['name', 'creator', 'beschreibung', 'anzeigentype', 'video-name', 'kategorie', 'produktionsort'];

// 🛠️ Hilfsfunktionen

/**
 * Baut die URL für den CORS-Worker zusammen.
 */
function buildWorkerUrl(apiUrl) {
    return `${WORKER_BASE_URL}${encodeURIComponent(apiUrl)}`;
}

/**
 * Ruft Daten von einer Webflow API URL über den Worker ab.
 */
async function fetchWebflowData(apiUrl) {
    const workerUrl = buildWorkerUrl(apiUrl);
    try {
        const response = await fetch(workerUrl);
        if (!response.ok) {
            let errorText = `Status: ${response.status}`;
            try {
                const errorData = await response.json();
                errorText = `${errorText} - ${errorData.message || JSON.stringify(errorData)}`;
            } catch (e) { errorText = `${errorText} - ${await response.text()}`; }
            throw new Error(`API-Fehler: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`❌ Fehler beim Abrufen von ${apiUrl}: ${error.message}`);
        return null;
    }
}

/**
 * Ruft ALLE Live-Items aus einer Webflow Collection ab, inkl. Paginierung.
 * @param {string} collectionId - Die ID der Collection.
 * @returns {Promise<Array|null>} Ein Array aller Items oder null bei Fehler.
 */
async function fetchAllCollectionItems(collectionId) {
    let allItems = [];
    let offset = 0;
    let hasMore = true;
    let totalFetched = 0; // Zähler für Debugging

    console.log(`🚀 Starte Abruf aller Items für Collection ${collectionId} (Limit pro Abruf: ${API_LIMIT})`);

    while (hasMore) {
        const apiUrl = `${API_BASE_URL}/${collectionId}/items/live?limit=${API_LIMIT}&offset=${offset}`;
        const data = await fetchWebflowData(apiUrl);

        if (data && data.items) {
            allItems = allItems.concat(data.items);
            totalFetched += data.items.length;
            console.log(`   - ${data.items.length} Items bei Offset ${offset} geladen (Gesamt bisher: ${totalFetched})`);

            // Prüfen, ob mehr Items vorhanden sind basierend auf 'total' und 'count'/'limit'
            // Webflow v2 API: 'pagination.total' und aktuelle Anzahl prüfen
            if (data.pagination && totalFetched >= data.pagination.total) {
                hasMore = false;
                console.log(`✅ Alle ${data.pagination.total} Items geladen.`);
            } else if (data.items.length < API_LIMIT) {
                 // Sicherheitscheck: Wenn weniger als Limit zurückkam, sind wir fertig
                 hasMore = false;
                 console.log(`✅ Weniger als ${API_LIMIT} Items zurückgegeben, Annahme: Alle Items geladen (Gesamt: ${totalFetched}).`);
            } else {
                // Es gibt wahrscheinlich mehr, erhöhe den Offset für den nächsten Abruf
                offset += API_LIMIT;
            }
        } else {
            // Fehler beim Abrufen dieses Chunks
            console.error(`❌ Fehler beim Abrufen von Items bei Offset ${offset}. Breche Abruf ab.`);
            return null; // Fehler signalisieren
        }
    }
    return allItems;
}


// 🎨 Rendering-Funktionen

/**
 * Rendert die Video-Items im angegebenen Container.
 */
function renderVideos(videoItems, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Video-Container mit ID '${containerId}' nicht gefunden.`);
        return;
    }
    // Performance: Verwende DocumentFragment, um DOM-Manipulationen zu bündeln
    const fragment = document.createDocumentFragment();

    if (!videoItems || videoItems.length === 0) {
        container.innerHTML = "<p>Keine Videos entsprechen den aktuellen Filtern oder der Suche.</p>";
        return;
    }

    videoItems.forEach((item, index) => {
        if (!item || !item.fieldData) {
            console.warn("Ungültiges Video-Item übersprungen:", item);
            return;
        }
        const fieldData = item.fieldData;
        const videoName = fieldData['video-name'];
        const videoLink = fieldData['video-link'];

        if (videoLink) {
            const videoWrapper = document.createElement("div");
            videoWrapper.classList.add("video-item-wrapper");
            videoWrapper.style.marginBottom = "20px";

            if (videoName) {
                const nameHeading = document.createElement("h3");
                nameHeading.textContent = videoName;
                nameHeading.style.marginBottom = "8px";
                videoWrapper.appendChild(nameHeading);
            }

            // Erstelle Video-Element dynamisch statt mit innerHTML/insertAdjacentHTML
            // Das ist oft etwas performanter bei vielen Elementen, obwohl der Unterschied gering sein kann.
            const videoElement = document.createElement('video');
            videoElement.playsInline = true;
            videoElement.preload = "metadata";
            videoElement.toggleAttribute('autobuffer', true); // Für ältere Browser evtl. relevant
            videoElement.controls = true;
            videoElement.classList.add('db-video-player');
            videoElement.id = `db-user-video--${item.id || index}`;

            const sourceElement = document.createElement('source');
            sourceElement.src = videoLink;
            sourceElement.type = 'video/mp4';

            videoElement.appendChild(sourceElement);
            // Fallback-Text für Browser ohne Video-Unterstützung
            videoElement.appendChild(document.createTextNode('Dein Browser unterstützt das Video-Tag nicht.'));

            videoWrapper.appendChild(videoElement);
            fragment.appendChild(videoWrapper); // Füge zum Fragment hinzu
        } else {
            console.warn(`⚠️ Video-Item ${item.id || index} hat keinen 'video-link'.`);
        }
    });

    // Leere den Container und füge alle neuen Elemente auf einmal hinzu
    container.innerHTML = "";
    container.appendChild(fragment);
}

/**
 * Rendert die aktiven Checkbox-Filter als klickbare Tags.
 */
function renderFilterTags(activeFiltersFlat) {
    const wrapper = document.getElementById(filterTagWrapperId);
    if (!wrapper) {
        console.warn(`⚠️ Filter-Tag-Wrapper mit ID '${filterTagWrapperId}' nicht gefunden.`);
        return;
    }
    const fragment = document.createDocumentFragment(); // DocumentFragment für Performance

    activeFiltersFlat.forEach(filter => {
        const tagElement = document.createElement('div');
        tagElement.classList.add('search-filter-tag'); // Styling via CSS

        const tagName = document.createElement('span');
        tagName.textContent = filter.display;
        tagName.style.marginRight = '6px';

        const removeButton = document.createElement('button');
        removeButton.textContent = '×';
        removeButton.style.cssText = `border:none; background:none; padding:0 4px; margin-left: 4px; cursor:pointer; font-weight:bold; font-size: 1.1em; line-height: 1; color: #555;`;
        removeButton.setAttribute('aria-label', `Filter ${filter.display} entfernen`);
        removeButton.dataset.checkboxId = filter.id;

        removeButton.addEventListener('click', (e) => {
            const checkboxIdToRemove = e.currentTarget.dataset.checkboxId;
            const correspondingCheckbox = document.getElementById(checkboxIdToRemove);
            if (correspondingCheckbox) {
                correspondingCheckbox.checked = false;
                applyFiltersAndRender();
            } else {
                console.error(`Konnte Checkbox mit ID ${checkboxIdToRemove} zum Entfernen nicht finden.`);
            }
        });

        tagElement.appendChild(tagName);
        tagElement.appendChild(removeButton);
        fragment.appendChild(tagElement); // Zum Fragment hinzufügen
    });

    // Leere den Wrapper und füge alle Tags auf einmal hinzu
    wrapper.innerHTML = '';
    wrapper.appendChild(fragment);
}


// 🔄 Filterlogik und Aktualisierung

/**
 * Wendet Checkbox-Filter UND Suchfilter an und rendert alles neu.
 */
function applyFiltersAndRender() {
    console.time("Filterung und Rendering"); // Starte Zeitmessung

    // 1. Aktive Checkbox-Filter identifizieren
    const activeFiltersByGroup = {};
    let allActiveCheckboxFiltersFlat = [];
    filterConfig.forEach(group => {
        const groupField = group.field;
        activeFiltersByGroup[groupField] = [];
        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id);
            if (checkbox && checkbox.checked) {
                activeFiltersByGroup[groupField].push(filter.value.toLowerCase());
                allActiveCheckboxFiltersFlat.push({ ...filter, field: groupField });
            }
        });
    });

    // 2. Suchbegriff holen
    const searchInput = document.getElementById(searchInputId);
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

    // 3. Video-Items filtern
    const filteredItems = allVideoItems.filter(item => {
        // a) Checkbox-Filter
        let matchesCheckboxFilters = true;
        for (const groupField in activeFiltersByGroup) {
            const activeValuesInGroup = activeFiltersByGroup[groupField];
            if (activeValuesInGroup.length > 0) {
                const itemValue = item?.fieldData?.[groupField]?.toLowerCase();
                if (itemValue === undefined || itemValue === null || !activeValuesInGroup.includes(itemValue)) {
                    matchesCheckboxFilters = false;
                    break;
                }
            }
        }
        if (!matchesCheckboxFilters) return false;

        // b) Suchfilter
        let matchesSearchTerm = true;
        if (searchTerm) {
            matchesSearchTerm = false;
            for (const field of searchableFields) {
                const fieldValue = item?.fieldData?.[field];
                if (fieldValue && typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(searchTerm)) {
                    matchesSearchTerm = true;
                    break;
                }
            }
        }
        return matchesSearchTerm;
    });

    // 4. Aktive Checkbox-Filter-Tags rendern
    renderFilterTags(allActiveCheckboxFiltersFlat);

    // 5. Gefilterte Videos rendern
    renderVideos(filteredItems, videoContainerId);

    console.timeEnd("Filterung und Rendering"); // Beende Zeitmessung
    console.log(`📊 ${filteredItems.length} von ${allVideoItems.length} Videos angezeigt.`);
}


// 🚀 Initialisierung und Hauptfunktionen

/**
 * Lädt die Video-Collection, richtet Filter-Events ein und rendert den initialen Zustand.
 */
async function displayVideoCollection() {
    try {
        console.log(`🚀 Lade ALLE Videos von Collection ID: ${VIDEO_COLLECTION_ID}`);
        // Nutzt die neue Funktion mit Paginierung
        allVideoItems = await fetchAllCollectionItems(VIDEO_COLLECTION_ID);

        if (allVideoItems && allVideoItems.length > 0) {
            console.log(`📹 ${allVideoItems.length} Video(s) insgesamt erfolgreich geladen.`);

            // Event Listener für Checkbox-Filter einrichten
            filterConfig.forEach(group => {
                group.filters.forEach(filter => {
                    const checkbox = document.getElementById(filter.id);
                    if (checkbox) {
                        checkbox.addEventListener('change', applyFiltersAndRender);
                    } else {
                        console.warn(`⚠️ Filter-Checkbox mit ID '${filter.id}' nicht im DOM gefunden.`);
                    }
                });
            });

            // Event Listener für Suchfeld mit Debouncing einrichten
            const searchInput = document.getElementById(searchInputId);
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    // Lösche den vorherigen Timer, falls vorhanden
                    clearTimeout(searchDebounceTimer);
                    // Starte einen neuen Timer
                    searchDebounceTimer = setTimeout(() => {
                        console.log(`⏳ Debounced Search Triggered`);
                        applyFiltersAndRender(); // Führe Filterung erst nach Verzögerung aus
                    }, DEBOUNCE_DELAY);
                });
                console.log(`✅ Event Listener (debounced) für Suchfeld '${searchInputId}' eingerichtet.`);
            } else {
                console.warn(`⚠️ Such-Eingabefeld mit ID '${searchInputId}' nicht im DOM gefunden. Suche nicht möglich.`);
            }

            // Initialen Zustand rendern
            applyFiltersAndRender();

        } else if (allVideoItems === null) {
             console.error("Fehler beim Laden der Video-Items. API-Aufruf(e) fehlgeschlagen.");
             const container = document.getElementById(videoContainerId);
             if (container) container.innerHTML = "<p>Fehler beim Laden der Videos. Bitte versuche es später erneut.</p>";
             renderFilterTags([]);
        } else {
            console.log("Keine Video-Items in der Collection gefunden oder Ladevorgang fehlgeschlagen.");
            renderVideos([], videoContainerId);
            renderFilterTags([]);
        }

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
