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
    },
    // --- NEU: Kunden-Filtergruppe ---
    {
        field: 'kunden', // Das Multi-Referenz-Feld in der Video-Collection
        filters: [
            // Checkbox-ID 'autoscout', Wert ist die Webflow Item ID des Kunden
            { id: "autoscout", value: "678f5b698973dba7df78f644", display: "Kunde: Autoscout" },
            // Checkbox-ID 'B-B', Wert ist die Webflow Item ID des Kunden
            // WICHTIG: Ersetze 'PLACEHOLDER_BB_HOTELS_ID' mit der echten ID!
            { id: "B-B", value: "64808c8079995e878fda4f67", display: "Kunde: B&B Hotels" }
            // Füge hier weitere Kundenfilter hinzu...
        ]
    }
];

// --- Konfiguration für Suchfelder ---
const searchableFields = ['name', 'creator', 'beschreibung', 'anzeigentype', 'video-name', 'kategorie', 'produktionsort'];
// Das 'kunden'-Feld wird hier *nicht* durchsucht, da es IDs enthält, kein Text.

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
 */
async function fetchAllCollectionItems(collectionId) {
    let allItems = [];
    let offset = 0;
    let hasMore = true;
    let totalFetched = 0;

    console.log(`🚀 Starte Abruf aller Items für Collection ${collectionId} (Limit pro Abruf: ${API_LIMIT})`);

    while (hasMore) {
        const apiUrl = `${API_BASE_URL}/${collectionId}/items/live?limit=${API_LIMIT}&offset=${offset}`;
        const data = await fetchWebflowData(apiUrl);

        if (data && data.items) {
            allItems = allItems.concat(data.items);
            totalFetched += data.items.length;
            // console.log(`   - ${data.items.length} Items bei Offset ${offset} geladen (Gesamt bisher: ${totalFetched})`); // Weniger detailliertes Logging

            if (data.pagination && totalFetched >= data.pagination.total) {
                hasMore = false;
                console.log(`✅ Alle ${data.pagination.total} Items geladen.`);
            } else if (data.items.length < API_LIMIT) {
                 hasMore = false;
                 console.log(`✅ Weniger als ${API_LIMIT} Items zurückgegeben, Annahme: Alle Items geladen (Gesamt: ${totalFetched}).`);
            } else {
                offset += API_LIMIT;
            }
        } else {
            console.error(`❌ Fehler beim Abrufen von Items bei Offset ${offset}. Breche Abruf ab.`);
            return null;
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
        let videoLink = fieldData['video-link'];

        if (videoLink) {
            // Link-Anpassung
            if (!videoLink.includes('&download=1')) {
                 if (videoLink.includes('?')) { videoLink += '&download=1'; }
                 else { videoLink += '?download=1'; }
            }

            const feedContainer = document.createElement("div");
            feedContainer.classList.add("video-feed-container");

            const videoElement = document.createElement('video');
            videoElement.playsInline = true;
            videoElement.preload = "metadata";
            videoElement.controls = true;
            videoElement.classList.add('db-video-player');
            videoElement.id = `db-user-video--${item.id || index}`;

            const sourceElement = document.createElement('source');
            sourceElement.src = videoLink;
            sourceElement.type = 'video/mp4';

            videoElement.appendChild(sourceElement);
            videoElement.appendChild(document.createTextNode('Dein Browser unterstützt das Video-Tag nicht.'));

            videoElement.addEventListener('error', (e) => {
                console.error(`Fehler beim Laden von Video ${videoElement.id} von ${videoLink}:`, e);
                feedContainer.innerHTML = '<p style="color: red; padding: 10px; border: 1px solid red;">Video konnte nicht geladen werden.</p>';
            }, { once: true });

            feedContainer.appendChild(videoElement);
            fragment.appendChild(feedContainer);

        } else {
            console.warn(`⚠️ Video-Item ${item.id || index} hat keinen 'video-link'.`);
        }
    });

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
        removeButton.dataset.checkboxId = filter.id; // Speichert die ID der Checkbox

        // Event Listener zum Entfernen des Tags und Deaktivieren der Checkbox
        removeButton.addEventListener('click', (e) => {
            const checkboxIdToRemove = e.currentTarget.dataset.checkboxId;
            console.log(`Attempting to remove filter for checkbox ID: ${checkboxIdToRemove}`); // Zusätzliches Logging
            const correspondingCheckbox = document.getElementById(checkboxIdToRemove);
            if (correspondingCheckbox) {
                console.log(`   Checkbox found:`, correspondingCheckbox);
                correspondingCheckbox.checked = false; // Checkbox deaktivieren
                console.log(`   Checkbox deselected.`);
                applyFiltersAndRender(); // Filter neu anwenden
            } else {
                // Dieser Fehler sollte nicht auftreten, wenn die IDs übereinstimmen
                console.error(`   FEHLER: Konnte Checkbox mit ID ${checkboxIdToRemove} zum Entfernen nicht finden!`);
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

/**
 * Wendet Checkbox-Filter UND Suchfilter an und rendert alles neu.
 */
function applyFiltersAndRender() {
    console.time("Filterung und Rendering");

    // 1. Aktive Checkbox-Filter identifizieren
    const activeFiltersByGroup = {};
    let allActiveCheckboxFiltersFlat = [];
    filterConfig.forEach(group => {
        const groupField = group.field;
        activeFiltersByGroup[groupField] = [];
        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id);
            if (checkbox && checkbox.checked) {
                // Für normale Felder: Wert direkt hinzufügen
                // Für 'kunden' (Multi-Ref): Wert (Kunden-ID) hinzufügen
                activeFiltersByGroup[groupField].push(filter.value.toLowerCase()); // Wert ist die Kunden-ID (oder Text für andere Felder)
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
            const activeValuesInGroup = activeFiltersByGroup[groupField]; // Array der aktiven Werte (z.B. ['influencer'] oder ['kundenId1', 'kundenId2'])

            if (activeValuesInGroup.length > 0) {
                // --- NEUE Logik für Multi-Referenz 'kunden' ---
                if (groupField === 'kunden') {
                    const itemKundenIds = item?.fieldData?.[groupField]; // Das Array der Kunden-IDs im Video-Item
                    // Prüfen, ob das Feld existiert und ein Array ist
                    if (!itemKundenIds || !Array.isArray(itemKundenIds)) {
                        matchesCheckboxFilters = false; // Video hat keine Kunden-Referenzen
                        break;
                    }
                    // Prüfen, ob *mindestens eine* der aktiven Kunden-IDs im Array des Items vorkommt (OR-Logik innerhalb der Gruppe)
                    const hasMatchingKunde = activeValuesInGroup.some(activeKundenId =>
                        itemKundenIds.includes(activeKundenId) // Prüft, ob die aktive ID im Array des Items ist (Groß/Klein ist bei IDs egal)
                    );
                    if (!hasMatchingKunde) {
                        matchesCheckboxFilters = false; // Keine der ausgewählten Kunden passt
                        break;
                    }
                }
                // --- Alte Logik für normale Felder ---
                else {
                    const itemValue = item?.fieldData?.[groupField]?.toLowerCase(); // Wert des Feldes im Video-Item
                    if (itemValue === undefined || itemValue === null || !activeValuesInGroup.includes(itemValue)) {
                        matchesCheckboxFilters = false; // Wert passt nicht zu den aktiven Filtern dieser Gruppe
                        break;
                    }
                }
            }
        }
        if (!matchesCheckboxFilters) return false; // Wenn Checkbox-Filter nicht passen, raus

        // b) Suchfilter (unverändert)
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
        return matchesSearchTerm; // Nur zurückgeben, wenn Checkbox UND Suche passen
    });

    // 4. Aktive Checkbox-Filter-Tags rendern
    renderFilterTags(allActiveCheckboxFiltersFlat);

    // 5. Gefilterte Videos rendern
    renderVideos(filteredItems, videoContainerId);

    console.timeEnd("Filterung und Rendering");
    console.log(`📊 ${filteredItems.length} von ${allVideoItems.length} Videos angezeigt.`);
}


// 🚀 Initialisierung und Hauptfunktionen

/**
 * Lädt die Video-Collection, richtet Filter-Events ein und rendert den initialen Zustand.
 */
async function displayVideoCollection() {
    try {
        console.log(`🚀 Lade ALLE Videos von Collection ID: ${VIDEO_COLLECTION_ID}`);
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
                    clearTimeout(searchDebounceTimer);
                    searchDebounceTimer = setTimeout(() => {
                        console.log(`⏳ Debounced Search Triggered`);
                        applyFiltersAndRender();
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
