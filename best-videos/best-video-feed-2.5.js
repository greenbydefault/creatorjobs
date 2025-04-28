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
        // --- GEÄNDERT: Feldname und Werte für Creator-Art (Option-Feld) ---
        field: 'creatortype', // Webflow Feld-ID (Slug) - Name geändert
        filters: [
             // Wert ist jetzt die Option-ID
            { id: "influencer", value: "6feb96f95ec4037985d5b65bc97ac482", display: "Creator: Influencer" },
             // Wert ist jetzt die Option-ID
            { id: "ugc", value: "601abdcb4984b44f9188caec03e2ed59", display: "Creator: UGC" },
             // --- NEU: Model hinzugefügt ---
             // Wert ist die Option-ID
            { id: "model", value: "dc4a8f7ad6191674745dcecbf763c827", display: "Creator: Model" }
        ]
    }, {
        field: 'produktion', filters: [ // Option-Feld
            { id: "vorort", value: "096401b55fe1fc511bd2f7b4d8c6a26b", display: "Ort: Vor Ort" },
            { id: "creatorproduktion", value: "a82d800f50eaa6671a2361428ee5a7d7", display: "Ort: Creatorproduktion" }
        ]
    }, {
        field: 'anzeige', filters: [ // Option-Feld
            { id: "paid", value: "f2cdad102ae28465ff7eebfb496570d0", display: "Typ: Paid" },
            { id: "werbung", value: "93704cc37eb0d87a732cf645309c9710", display: "Typ: Werbeanzeige" },
            { id: "organisch", value: "a7e457d2518c7a2f617a2777ce897f93", display: "Typ: Organisch" }
        ]
    },
    {
        field: 'kunden', filters: [ // Multi-Referenz-Feld
            { id: "autoscout", value: "678f5b698973dba7df78f644", display: "Kunde: Autoscout" },
            { id: "B-B", value: "64808c8079995e878fda4f67", display: "Kunde: B&B Hotels" }
            // Füge hier weitere Kundenfilter hinzu...
        ]
    }
];

// --- Konfiguration für Suchfelder ---
// 'creatortype', 'produktion', 'anzeige' entfernt, da Suche nach Option-IDs nicht sinnvoll ist.
const searchableFields = ['name', 'creator', 'beschreibung', /*'anzeigentype',*/ 'video-name', /*'kategorie',*/ 'produktionsort']; // 'produktionsort' ggf. entfernen, falls es nicht mehr existiert

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
        removeButton.dataset.checkboxId = filter.id;

        removeButton.addEventListener('click', (e) => {
            const checkboxIdToRemove = e.currentTarget.dataset.checkboxId;
            const correspondingCheckbox = document.getElementById(checkboxIdToRemove);
            if (correspondingCheckbox) {
                correspondingCheckbox.checked = false;
                applyFiltersAndRender();
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
                activeFiltersByGroup[groupField].push(filter.value); // Speichert Wert (Text oder ID)
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
            const activeValuesInGroup = activeFiltersByGroup[groupField]; // Aktive Werte/IDs für diese Gruppe

            if (activeValuesInGroup.length > 0) {
                const itemFieldValue = item?.fieldData?.[groupField]; // Wert/ID/Array aus dem Item

                // --- Logik für Multi-Referenz 'kunden' ---
                if (groupField === 'kunden') {
                    if (!itemFieldValue || !Array.isArray(itemFieldValue)) {
                        matchesCheckboxFilters = false; break;
                    }
                    const hasMatchingKunde = activeValuesInGroup.some(activeKundenId =>
                        itemFieldValue.includes(activeKundenId)
                    );
                    if (!hasMatchingKunde) { matchesCheckboxFilters = false; break; }
                }
                // --- Logik für Option-Felder ('creatortype', 'produktion', 'anzeige') ---
                else if (groupField === 'creatortype' || groupField === 'produktion' || groupField === 'anzeige') {
                    if (itemFieldValue === undefined || itemFieldValue === null || !activeValuesInGroup.includes(itemFieldValue)) {
                        matchesCheckboxFilters = false; break;
                    }
                }
                // --- Logik für normale Text-Felder (falls noch vorhanden) ---
                else {
                    // Diese Logik wird aktuell nicht verwendet, da 'kategorie' entfernt wurde.
                    // Falls wieder Textfelder hinzukommen, muss hier ggf. angepasst werden.
                    const itemValueLower = itemFieldValue?.toLowerCase();
                    const normalizedActiveValues = activeValuesInGroup.map(v => v.toLowerCase());
                    if (itemValueLower === undefined || itemValueLower === null || !normalizedActiveValues.includes(itemValueLower)) {
                        matchesCheckboxFilters = false; break;
                    }
                }
            }
        }
        if (!matchesCheckboxFilters) return false;

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
        return matchesSearchTerm;
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

/* --- Benötigtes CSS (Beispiele) --- */
// CSS bleibt unverändert
