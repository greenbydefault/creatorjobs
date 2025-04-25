// 🌐 Optimierte Webflow API Integration für GitHub-Hosting

// 🔧 Konfiguration
const API_BASE_URL = "https://api.webflow.com/v2/collections";
// WICHTIG: Ersetze dies mit deiner tatsächlichen Worker-URL, falls anders
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url=";
// Collection ID für Videos
const VIDEO_COLLECTION_ID = "680b45a22b15fa4643ebdca9"; // Deine Video Collection ID

// Globale Variablen
let allVideoItems = []; // Speicher für alle geladenen Video-Items
const videoContainerId = "video-container"; // ID des HTML-Containers für Videos
const filterTagWrapperId = "filter-tag-wrapper"; // ID des HTML-Containers für Filter-Tags
const searchInputId = "filter-search"; // <-- NEU: ID des Such-Eingabefelds

// --- Filterkonfiguration (Checkboxes) ---
const filterConfig = [
    {
        field: 'kategorie', // Webflow Feld-ID (Slug)
        filters: [
            { id: "influencer", value: "influencer", display: "Kategorie: Influencer" },
            { id: "ugc", value: "ugc", display: "Kategorie: UGC" }
        ]
    },
    {
        field: 'produktionsort', // Webflow Feld-ID (Slug)
        filters: [
            { id: "vorort", value: "vor ort", display: "Ort: Vor Ort" },
            { id: "creatorproduktion", value: "creatorproduktion", display: "Ort: Creatorproduktion" }
        ]
    },
    {
        field: 'anzeigentype', // Webflow Feld-ID (Slug)
        filters: [
            { id: "paid", value: "paid", display: "Typ: Paid" },
            { id: "werbung", value: "werbeanzeige", display: "Typ: Werbeanzeige" }
        ]
    }
];

// --- NEU: Konfiguration für Suchfelder ---
// Liste der Webflow Feld-IDs (Slugs), die durchsucht werden sollen
const searchableFields = [
    'name',             // Standard Name Feld
    'creator',
    'beschreibung',
    'anzeigentype',
    'video-name',
    'kategorie',
    'produktionsort'
];

// 🛠️ Hilfsfunktionen

/**
 * Baut die URL für den CORS-Worker zusammen.
 * @param {string} apiUrl - Die Ziel-API-URL.
 * @returns {string} Die vollständige Worker-URL.
 */
function buildWorkerUrl(apiUrl) {
    return `${WORKER_BASE_URL}${encodeURIComponent(apiUrl)}`;
}

/**
 * Ruft Daten von einer Webflow API URL über den Worker ab.
 * @param {string} apiUrl - Die Webflow API URL.
 * @returns {Promise<object|null>} Ein Promise, das die JSON-Daten oder null bei Fehler zurückgibt.
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
            } catch (e) {
                 errorText = `${errorText} - ${await response.text()}`;
            }
            throw new Error(`API-Fehler: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`❌ Fehler beim Abrufen von ${apiUrl}: ${error.message}`);
        return null;
    }
}

/**
 * Ruft mehrere Live-Items aus einer Webflow Collection ab (bis zu 100).
 * @param {string} collectionId - Die ID der Collection.
 * @returns {Promise<Array|null>} Ein Array der Items oder null bei Fehler.
 */
async function fetchCollectionItems(collectionId) {
    // Für mehr als 100 Items wäre Paginierung mit 'offset' nötig.
    const apiUrl = `${API_BASE_URL}/${collectionId}/items/live?limit=100`;
    const data = await fetchWebflowData(apiUrl);
    return data?.items || null;
}


// 🎨 Rendering-Funktionen

/**
 * Rendert die Video-Items im angegebenen Container.
 * @param {Array<object>} videoItems - Ein Array von Video-Item-Objekten.
 * @param {string} containerId - Die ID des HTML-Containers.
 */
function renderVideos(videoItems, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Video-Container mit ID '${containerId}' nicht gefunden.`);
        return;
    }
    container.innerHTML = ""; // Leert den Container

    if (!videoItems || videoItems.length === 0) {
        // Nachricht angepasst, um auch Suche zu berücksichtigen
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
            videoWrapper.style.marginBottom = "20px"; // Minimaler Abstand

            if (videoName) {
                const nameHeading = document.createElement("h3");
                nameHeading.textContent = videoName;
                nameHeading.style.marginBottom = "8px";
                videoWrapper.appendChild(nameHeading);
            }

            const videoElementHTML = `
                <video playsinline preload="metadata" autobuffer controls
                       class="db-video-player" id="db-user-video--${item.id || index}">
                    <source src="${videoLink}" type="video/mp4">
                    Dein Browser unterstützt das Video-Tag nicht.
                </video>`;
            videoWrapper.insertAdjacentHTML('beforeend', videoElementHTML);
            container.appendChild(videoWrapper);
        } else {
            console.warn(`⚠️ Video-Item ${item.id || index} hat keinen 'video-link'.`);
        }
    });
}

/**
 * Rendert die aktiven Checkbox-Filter als klickbare Tags.
 * @param {Array<object>} activeFiltersFlat - Flache Liste aktiver Checkbox-Filter.
 */
function renderFilterTags(activeFiltersFlat) {
    const wrapper = document.getElementById(filterTagWrapperId);
    if (!wrapper) {
        console.warn(`⚠️ Filter-Tag-Wrapper mit ID '${filterTagWrapperId}' nicht gefunden.`);
        return;
    }
    wrapper.innerHTML = ''; // Leert den Wrapper

    activeFiltersFlat.forEach(filter => {
        const tagElement = document.createElement('div');
        // WICHTIG: Styling erfolgt jetzt über diese CSS-Klasse!
        tagElement.classList.add('search-filter-tag');

        const tagName = document.createElement('span');
        tagName.textContent = filter.display;
        tagName.style.marginRight = '6px'; // Kleiner Abstand zum 'x'

        const removeButton = document.createElement('button');
        removeButton.textContent = '×';
        // Minimales Button-Styling (kann auch via CSS erfolgen)
        removeButton.style.cssText = `border:none; background:none; padding:0 4px; margin-left: 4px; cursor:pointer; font-weight:bold; font-size: 1.1em; line-height: 1; color: #555;`;
        removeButton.setAttribute('aria-label', `Filter ${filter.display} entfernen`);
        removeButton.dataset.checkboxId = filter.id;

        removeButton.addEventListener('click', (e) => {
            const checkboxIdToRemove = e.currentTarget.dataset.checkboxId;
            const correspondingCheckbox = document.getElementById(checkboxIdToRemove);
            if (correspondingCheckbox) {
                correspondingCheckbox.checked = false;
                applyFiltersAndRender(); // Filter neu anwenden
            } else {
                 console.error(`Konnte Checkbox mit ID ${checkboxIdToRemove} zum Entfernen nicht finden.`);
            }
        });

        tagElement.appendChild(tagName);
        tagElement.appendChild(removeButton);
        wrapper.appendChild(tagElement);
    });
}


// 🔄 Filterlogik und Aktualisierung

/**
 * Wendet Checkbox-Filter UND Suchfilter an und rendert alles neu.
 */
function applyFiltersAndRender() {
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
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : ""; // Suchbegriff holen und normalisieren

    console.log('🔄 Aktive Checkbox-Filter:', activeFiltersByGroup);
    console.log('🔄 Suchbegriff:', searchTerm);

    // 3. Video-Items filtern (Checkbox-Filter UND Suchfilter)
    const filteredItems = allVideoItems.filter(item => {
        // a) Checkbox-Filter prüfen (AND zwischen Gruppen, OR innerhalb)
        let matchesCheckboxFilters = true; // Annahme: passt, bis Gegenteil bewiesen
        for (const groupField in activeFiltersByGroup) {
            const activeValuesInGroup = activeFiltersByGroup[groupField];
            if (activeValuesInGroup.length > 0) {
                const itemValue = item?.fieldData?.[groupField]?.toLowerCase();
                if (itemValue === undefined || itemValue === null || !activeValuesInGroup.includes(itemValue)) {
                    matchesCheckboxFilters = false; // Passt nicht zu dieser Gruppe
                    break; // Weitere Gruppenprüfung unnötig
                }
            }
        }

        // Wenn Checkbox-Filter nicht passen, Item ausschließen
        if (!matchesCheckboxFilters) {
            return false;
        }

        // b) Suchfilter prüfen (wenn Suchbegriff vorhanden)
        let matchesSearchTerm = true; // Annahme: passt, wenn keine Suche oder wenn Treffer
        if (searchTerm) {
            matchesSearchTerm = false; // Jetzt muss ein Treffer gefunden werden
            // Durchsuche alle definierten Felder
            for (const field of searchableFields) {
                const fieldValue = item?.fieldData?.[field];
                // Prüfe, ob Feldwert existiert, ein String ist und den Suchbegriff enthält
                if (fieldValue && typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(searchTerm)) {
                    matchesSearchTerm = true; // Treffer gefunden!
                    break; // Weitere Feldprüfung für dieses Item unnötig
                }
            }
        }

        // Item nur behalten, wenn es BEIDEN Filtertypen entspricht
        return matchesSearchTerm; // `matchesCheckboxFilters` war bereits true hier
    });

    // 4. Aktive Checkbox-Filter-Tags rendern
    renderFilterTags(allActiveCheckboxFiltersFlat); // Nur Checkbox-Filter werden als Tags angezeigt

    // 5. Gefilterte Videos rendern
    renderVideos(filteredItems, videoContainerId);
}


// 🚀 Initialisierung und Hauptfunktionen

/**
 * Lädt die Video-Collection, richtet Filter-Events ein und rendert den initialen Zustand.
 */
async function displayVideoCollection() {
    try {
        console.log(`🚀 Lade Videos von Collection ID: ${VIDEO_COLLECTION_ID}`);
        allVideoItems = await fetchCollectionItems(VIDEO_COLLECTION_ID);

        if (allVideoItems && allVideoItems.length > 0) {
            console.log(`📹 ${allVideoItems.length} Video(s) insgesamt geladen.`);

            // Event Listener für Checkbox-Filter einrichten
            let filterCheckboxesFound = false;
            filterConfig.forEach(group => {
                group.filters.forEach(filter => {
                    const checkbox = document.getElementById(filter.id);
                    if (checkbox) {
                        checkbox.addEventListener('change', applyFiltersAndRender);
                        filterCheckboxesFound = true;
                    } else {
                        console.warn(`⚠️ Filter-Checkbox mit ID '${filter.id}' nicht im DOM gefunden.`);
                    }
                });
            });

            // NEU: Event Listener für Suchfeld einrichten
            const searchInput = document.getElementById(searchInputId);
            if (searchInput) {
                // 'input'-Event reagiert sofort auf jede Änderung (auch Einfügen)
                searchInput.addEventListener('input', applyFiltersAndRender);
                console.log(`✅ Event Listener für Suchfeld '${searchInputId}' eingerichtet.`);
            } else {
                console.warn(`⚠️ Such-Eingabefeld mit ID '${searchInputId}' nicht im DOM gefunden. Suche nicht möglich.`);
            }

            if (filterCheckboxesFound) {
                 console.log(`✅ Event Listeners für Filter-Checkboxes eingerichtet.`);
            }

            // Initialen Zustand rendern
            applyFiltersAndRender();

        } else if (allVideoItems === null) {
             console.error("Fehler beim Laden der Video-Items. API-Aufruf fehlgeschlagen.");
             const container = document.getElementById(videoContainerId);
             if (container) container.innerHTML = "<p>Fehler beim Laden der Videos. Bitte versuche es später erneut.</p>";
             renderFilterTags([]);
        } else {
            console.log("Keine Video-Items in der Collection gefunden.");
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

    // Prüft nur noch die für Videos notwendigen Elemente
    if (videoContainerExists && tagWrapperExists) {
         displayVideoCollection(); // Startet nur noch die Video-Anzeige und Filterung
    } else {
        if (!videoContainerExists) console.error(`FEHLER: Video-Container ('${videoContainerId}') nicht gefunden!`);
        if (!tagWrapperExists) console.error(`FEHLER: Filter-Tag-Wrapper ('${filterTagWrapperId}') nicht gefunden!`);
        console.error("Video-Feed kann nicht initialisiert werden.");
    }
    // Die Funktion displayUserJobs() wird nicht mehr aufgerufen.
});
