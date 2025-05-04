// 🌐 Optimierte Webflow API Integration für GitHub-Hosting mit "Load More"

// 🔧 Konfiguration
const API_BASE_URL = "https://api.webflow.com/v2/collections";
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url="; // Dein Worker-Endpunkt
const VIDEO_COLLECTION_ID = "680b45a22b15fa4643ebdca9"; // Video Collection
const CUSTOMER_COLLECTION_ID = "6448faf9c5a8a15f6cc05526"; // Kunden/Member Collection
const API_LIMIT = 100; // Max Items pro API-Aufruf
const VIDEOS_PER_LOAD = 8; // Anzahl der Videos, die pro Klick geladen werden

// Globale Variablen
let allVideoItems = []; // Speichert *alle* jemals geladenen Video-Items von der API
let allCustomerData = {}; // Speicher für *relevante* Kundendaten (ID -> {name, logoUrl})
let currentFilteredItems = []; // Speichert die aktuell gefilterte Liste *aller* Videos
let displayedVideoCount = 0; // Zählt, wie viele Videos der gefilterten Liste aktuell angezeigt werden

// Element IDs
const videoContainerId = "video-container"; // ID des Hauptcontainers für Videos
const filterTagWrapperId = "filter-tag-wrapper"; // ID des Wrappers für aktive Filter-Tags
const searchInputId = "filter-search"; // ID des Such-Eingabefelds
const filterResetButtonId = "filter-reset"; // ID des "Alle Filter löschen"-Buttons
const loadMoreButtonId = "load-more-button"; // ID für den "Mehr laden"-Button (MUSS im HTML existieren)

let searchDebounceTimer = null; // Timer für Such-Debouncing
const DEBOUNCE_DELAY = 300; // Verzögerung für Such-Debouncing (in ms)

// --- Filterkonfiguration (Checkboxes) ---
const filterConfig = [
    {
        field: 'creatortype', // Feldname in Webflow
        filters: [
            { id: "influencer", value: "6feb96f95ec4037985d5b65bc97ac482", display: "Creator: Influencer" },
            { id: "ugc", value: "601abdcb4984b44f9188caec03e2ed59", display: "Creator: UGC" },
            { id: "model", value: "dc4a8f7ad6191674745dcecbf763c827", display: "Creator: Model" }
        ]
    }, {
        field: 'produktion', // Feldname in Webflow
        filters: [
            { id: "vorort", value: "096401b55fe1fc511bd2f7b4d8c6a26b", display: "Ort: Vor Ort" },
            { id: "creatorproduktion", value: "a82d800f50eaa6671a2361428ee5a7d7", display: "Ort: Creatorproduktion" }
        ]
    }, {
        field: 'anzeige', // Feldname in Webflow
        filters: [
            { id: "paid", value: "f2cdad102ae28465ff7eebfb496570d0", display: "Typ: Paid" },
            { id: "werbung", value: "93704cc37eb0d87a732cf645309c9710", display: "Typ: Werbeanzeige" },
            { id: "organisch", value: "a7e457d2518c7a2f617a2777ce897f93", display: "Typ: Organisch" }
        ]
    },
    {
        field: 'kunden', // Multi-Referenz-Feldname in Webflow
        filters: [
            // Bestehende Kunden
            { id: "autoscout", value: "678f5b698973dba7df78f644", display: "Kunde: Autoscout" },
            { id: "B-B", value: "64808c8079995e878fda4f67", display: "Kunde: B&B Hotels" },
            { id: "chefkoch", value: "679213a19cc8609f08cc4565", display: "Kunde: Chefkoch" },
            { id: "telekom", value: "659d5ef1dd74610abc7f44c6", display: "Kunde: Telekom" },
            { id: "db-regio", value: "662fb3e88b60f28bb988a53a", display: "Kunde: DB Regio" },
            { id: "longhi", value: "67b3556684d18546111157be", display: "Kunde: Longhi" },
            { id: "ergo", value: "6448faf9c5a8a18d60c0560a", display: "Kunde: Ergo" },
            { id: "ernstings", value: "66e0598b4020e3128a9faae8", display: "Kunde: Ernsting's family" },
            { id: "ferrero", value: "671b5d82a4c065998cbb9b12", display: "Kunde: Ferrero" },
            { id: "fitness", value: "66570cf8eb2dcf329fa802e4", display: "Kunde: Fitness" },
            { id: "flaconi", value: "65043631a18ce904e98d3711", display: "Kunde: Flaconi" },
            { id: "glossy", value: "6448faf9c5a8a1c22bc05c2d", display: "Kunde: Glossybox" },
            { id: "kfc", value: "6451010e96cc6f08cc6c2ae9", display: "Kunde: KFC" },
            { id: "liebherr", value: "6540d6bdd3236739321232a9", display: "Kunde: Liebherr" },
            { id: "mainz05", value: "6448faf9c5a8a16f3cc05606", display: "Kunde: Mainz 05" },
            { id: "meggle", value: "65524df86c5f776f41dce75a", display: "Kunde: Meggle" },
            { id: "mezzo", value: "672256fcfe4471c902ab3f81", display: "Kunde: Mezzo Mix" }, // Annahme: Mezzo Mix
            { id: "ninja", value: "67add369f3351b0978213be2", display: "Kunde: Ninja" },
            { id: "nutribullet", value: "67f7a99771b7233f2651d732", display: "Kunde: Nutribullet" },
            { id: "valentine", value: "6697bf815c39b80cf3a85e6c", display: "Kunde: Veltins" }, // Annahme: Veltins (statt Valentine)
            { id: "shark", value: "647f039715031d91efbb5911", display: "Kunde: Shark" },
            { id: "o2", value: "667c15ac8883530952e83903", display: "Kunde: o2" }
        ]
    }
];

// --- Konfiguration für Suchfelder ---
const searchableFields = ['name', 'creator', 'beschreibung', 'video-name', 'produktionsort'];

// 🛠️ Hilfsfunktionen (fetchWebflowData, buildWorkerUrl, fetchAllCollectionItems, fetchSingleItem, fetchRelevantCustomerData bleiben gleich)
/**
 * Baut die URL für den Worker, der als Proxy für die Webflow API dient.
 * @param {string} apiUrl - Die ursprüngliche Webflow API URL.
 * @returns {string} Die vollständige Worker URL.
 */
function buildWorkerUrl(apiUrl) {
    return `${WORKER_BASE_URL}${encodeURIComponent(apiUrl)}`;
}

/**
 * Ruft Daten von der Webflow API über den Worker ab.
 * @param {string} apiUrl - Die ursprüngliche Webflow API URL.
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
        console.error(`❌ Fehler beim Abrufen von ${apiUrl} über ${workerUrl}: ${error.message}`);
        return null;
    }
}

/**
 * Ruft *alle* Items einer Webflow Collection ab, auch wenn Paginierung nötig ist.
 * @param {string} collectionId - Die ID der Webflow Collection.
 * @returns {Promise<Array|null>} Ein Promise, das ein Array aller Items oder null bei Fehler zurückgibt.
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
                console.log(`✅ Alle ${data.pagination.total} Items für ${collectionId} geladen.`);
            } else if (data.items.length < API_LIMIT) {
                 hasMore = false;
                 console.log(`✅ Weniger als ${API_LIMIT} Items zurückgegeben für ${collectionId}, Annahme: Alle Items geladen (Gesamt: ${totalFetched}).`);
            } else {
                 offset += API_LIMIT;
            }
        } else {
            console.error(`❌ Fehler beim Abrufen von Items für ${collectionId} bei Offset ${offset}. Breche Abruf ab.`);
            return null;
        }
    }
    return allItems;
}

/**
 * Ruft ein einzelnes Item aus einer Webflow Collection ab.
 * @param {string} collectionId - Die ID der Webflow Collection.
 * @param {string} itemId - Die ID des spezifischen Items.
 * @returns {Promise<object|null>} Ein Promise, das das Item-Objekt oder null bei Fehler zurückgibt.
 */
async function fetchSingleItem(collectionId, itemId) {
    const apiUrl = `${API_BASE_URL}/${collectionId}/items/${itemId}/live`;
    return await fetchWebflowData(apiUrl);
}

/**
 * Lädt die Daten (Name, Logo) für eine Liste von Kunden-IDs und speichert sie in `allCustomerData`.
 * @param {Array<string>} customerIds - Ein Array mit den zu ladenden Kunden-IDs.
 * @returns {Promise<boolean>} Ein Promise, das true bei Erfolg oder false bei schwerwiegenden Fehlern zurückgibt.
 */
async function fetchRelevantCustomerData(customerIds) {
    if (!customerIds || customerIds.length === 0) {
        console.log("Keine relevanten Kunden-IDs gefunden, überspringe Datenabruf.");
        allCustomerData = {};
        return true;
    }
    console.log(`🤵‍♂️ Lade Daten für ${customerIds.length} relevante(n) Kunden...`);
    const customerPromises = customerIds.map(id => fetchSingleItem(CUSTOMER_COLLECTION_ID, id));
    try {
        const customerItems = await Promise.all(customerPromises);
        allCustomerData = customerItems.reduce((map, customer) => {
            if (customer && customer.id && customer.fieldData) {
                map[customer.id] = {
                    name: customer.fieldData.name || 'Unbekannter Kunde',
                    logoUrl: customer.fieldData['user-profile-img'] || null
                };
            } else if (customer === null) {
                console.warn("    -> Ein Kunde konnte nicht geladen werden (siehe vorherige Fehlermeldung).");
            }
            return map;
        }, {});
        console.log(`👍 ${Object.keys(allCustomerData).length} von ${customerIds.length} relevanten Kundendaten erfolgreich geladen und verarbeitet.`);
        return true;
    } catch (error) {
        console.error("❌ Schwerwiegender Fehler beim parallelen Abrufen der Kundendaten:", error);
        allCustomerData = {};
        return false;
    }
}

// --- NEUE Rendering-Funktionen ---

/**
 * Rendert einen *Teil* der Video-Items im Container. Fügt die neuen Videos hinzu.
 * @param {Array<object>} videoSlice - Das Array der Video-Items, die *diesmal* hinzugefügt werden sollen.
 * @param {string} containerId - Die ID des HTML-Containers.
 */
function renderVideosSlice(videoSlice, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Video-Container mit ID '${containerId}' nicht gefunden.`);
        return;
    }
    // Kein container.innerHTML = "" hier! Wir fügen hinzu.

    const fragment = document.createDocumentFragment(); // Effizienteres DOM-Update

    // Fall: Keine Videos in diesem Slice (sollte nicht vorkommen, aber sicher ist sicher)
    if (!videoSlice || videoSlice.length === 0) {
        return;
    }

    videoSlice.forEach((item, index) => {
        // Sicherheitsprüfung für ungültige Items
        if (!item || !item.fieldData) {
            console.warn("Ungültiges Video-Item übersprungen:", item);
            return;
        }
        const fieldData = item.fieldData;
        let videoLink = fieldData['video-link'];
        const kundenIds = fieldData['kunden'];

        if (videoLink) {
            const feedContainer = document.createElement("div");
            feedContainer.classList.add("video-feed-container");

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
                    logoImg.onerror = () => {
                        logoImg.style.display = 'none';
                        console.warn(`Kundenlogo für ${customerInfo.name} konnte nicht geladen werden: ${customerInfo.logoUrl}`);
                        const placeholder = document.createElement('div');
                        placeholder.classList.add('video-feed-logo-placeholder');
                        const customerNameSpan = customerRow.querySelector('.video-feed-customer');
                        if (customerNameSpan) {
                            customerRow.insertBefore(placeholder, customerNameSpan);
                        } else {
                            customerRow.appendChild(placeholder);
                        }
                    };
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
            videoElement.preload = "metadata";
            videoElement.controls = true;
            videoElement.classList.add('db-video-player');
            // Eindeutige ID basierend auf Webflow Item ID und Index im Slice (falls ID fehlt)
            videoElement.id = `db-user-video--${item.id || `slice-${index}`}`;

            const sourceElement = document.createElement('source');
            sourceElement.src = videoLink;
            sourceElement.type = 'video/mp4';

            videoElement.appendChild(sourceElement);
            videoElement.appendChild(document.createTextNode('Dein Browser unterstützt das Video-Tag nicht.'));

            videoElement.addEventListener('error', (e) => {
                console.error(`Fehler beim Laden von Video ${videoElement.id} von ${videoLink}:`, e);
                const errorP = document.createElement('p');
                errorP.style.color = 'red';
                errorP.style.padding = '10px';
                errorP.style.border = '1px solid red';
                errorP.textContent = 'Video konnte nicht geladen werden.';
                videoInnerContainer.innerHTML = '';
                videoInnerContainer.appendChild(errorP);
            }, { once: true });

            videoInnerContainer.appendChild(videoElement);
            feedContainer.appendChild(videoInnerContainer);
            fragment.appendChild(feedContainer);
        } else {
            console.warn(`⚠️ Video-Item ${item.id || `slice-${index}`} hat keinen 'video-link'.`);
        }
    });

    // Füge das Fragment mit den neuen Elementen zum Container hinzu
    container.appendChild(fragment);
}

/**
 * Leert den Video-Container und rendert die *erste* Ladung Videos.
 */
function renderInitialVideoBatch() {
    const container = document.getElementById(videoContainerId);
    if (!container) return;

    // Container leeren, bevor die erste Charge gerendert wird
    container.innerHTML = '';

    // Bestimme, wie viele Videos initial angezeigt werden sollen
    const initialCount = Math.min(VIDEOS_PER_LOAD, currentFilteredItems.length);
    displayedVideoCount = initialCount; // Setze den Zähler

    if (initialCount === 0) {
        container.innerHTML = "<p>Keine Videos entsprechen den aktuellen Filtern oder der Suche.</p>";
        console.log("Keine Videos zum initialen Rendern.");
    } else {
        const initialSlice = currentFilteredItems.slice(0, initialCount);
        console.log(`Rendere initiale ${initialSlice.length} Videos.`);
        renderVideosSlice(initialSlice, videoContainerId);
    }
    // Sichtbarkeit des "Mehr laden"-Buttons aktualisieren
    updateLoadMoreButtonVisibility();
}


/**
 * Aktualisiert die Sichtbarkeit des "Mehr laden"-Buttons.
 */
function updateLoadMoreButtonVisibility() {
    const loadMoreButton = document.getElementById(loadMoreButtonId);
    if (!loadMoreButton) {
        // Button noch nicht im DOM oder falsche ID
        // console.warn(`"Mehr laden"-Button mit ID '${loadMoreButtonId}' nicht gefunden.`);
        return;
    }

    // Zeige Button nur, wenn noch nicht alle gefilterten Videos angezeigt werden
    if (displayedVideoCount < currentFilteredItems.length) {
        loadMoreButton.style.display = 'block'; // Oder 'inline-block', je nach Layout
    } else {
        loadMoreButton.style.display = 'none';
    }
}

/**
 * Behandelt den Klick auf den "Mehr laden"-Button.
 */
function handleLoadMore() {
    const startIndex = displayedVideoCount; // Startet nach dem letzten angezeigten Video
    const endIndex = Math.min(startIndex + VIDEOS_PER_LOAD, currentFilteredItems.length); // Bis zum nächsten Limit oder Ende

    if (startIndex >= endIndex) {
        // Sollte nicht passieren, wenn der Button korrekt angezeigt wird, aber sicher ist sicher
        console.log("Keine weiteren Videos zum Laden.");
        updateLoadMoreButtonVisibility(); // Button sicherheitshalber ausblenden
        return;
    }

    const nextSlice = currentFilteredItems.slice(startIndex, endIndex);
    console.log(`Lade ${nextSlice.length} weitere Videos (Index ${startIndex} bis ${endIndex-1}).`);

    renderVideosSlice(nextSlice, videoContainerId); // Nächsten Teil rendern (anhängen)

    displayedVideoCount = endIndex; // Zähler aktualisieren

    updateLoadMoreButtonVisibility(); // Sichtbarkeit des Buttons neu prüfen
}


// --- Angepasste Filter- und Rendering-Logik ---

/**
 * Rendert die Tags für die aktuell aktiven Filter. (Unverändert)
 * @param {Array<object>} activeFiltersFlat - Ein flaches Array aller aktiven Filter-Objekte ({id, value, display, field}).
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
                 const event = new Event('change', { bubbles: true });
                 correspondingCheckbox.dispatchEvent(event);
                // applyFiltersAndRender wird durch das 'change' Event auf der Checkbox getriggert
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

    const resetButton = document.getElementById(filterResetButtonId);
    if (resetButton) {
        const searchInput = document.getElementById(searchInputId);
        const isSearchActive = searchInput && searchInput.value.trim() !== "";
        resetButton.style.display = (activeFiltersFlat.length > 0 || isSearchActive) ? 'inline-block' : 'none';
    }
}

/**
 * Wendet die aktuellen Filter an, speichert das Ergebnis und triggert das initiale Rendering der ersten Charge.
 */
function applyFiltersAndRender() {
    if (Object.keys(allCustomerData).length === 0 && allVideoItems.length > 0) {
         console.warn("Kundendaten noch nicht geladen, Filterung könnte unvollständig sein (betrifft Kundenfilter).");
    }

    console.time("Filterung");

    // 1. Aktive Checkbox-Filter identifizieren
    const activeFiltersByGroup = {};
    let allActiveCheckboxFiltersFlat = [];
    filterConfig.forEach(group => {
        const groupField = group.field;
        activeFiltersByGroup[groupField] = [];
        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id);
            if (checkbox && checkbox.checked) {
                activeFiltersByGroup[groupField].push(filter.value);
                allActiveCheckboxFiltersFlat.push({ ...filter, field: groupField });
            }
        });
    });

    // 2. Suchbegriff holen
    const searchInput = document.getElementById(searchInputId);
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

    // 3. Video-Items filtern (Logik bleibt gleich, speichert aber in `currentFilteredItems`)
    currentFilteredItems = allVideoItems.filter(item => {
        let matchesCheckboxFilters = true;
        for (const groupField in activeFiltersByGroup) {
            const activeValuesInGroup = activeFiltersByGroup[groupField];
            if (activeValuesInGroup.length > 0) {
                const itemFieldValue = item?.fieldData?.[groupField];
                if (groupField === 'kunden') {
                    if (!itemFieldValue || !Array.isArray(itemFieldValue) || !activeValuesInGroup.some(id => itemFieldValue.includes(id))) {
                        matchesCheckboxFilters = false; break;
                    }
                } else if (groupField === 'creatortype' || groupField === 'produktion' || groupField === 'anzeige') {
                     if (itemFieldValue === undefined || itemFieldValue === null || !activeValuesInGroup.includes(itemFieldValue)) {
                         matchesCheckboxFilters = false; break;
                     }
                } else {
                    const itemValueLower = String(itemFieldValue || '').toLowerCase();
                    const normalizedActiveValues = activeValuesInGroup.map(v => String(v || '').toLowerCase());
                    if (!itemValueLower || !normalizedActiveValues.includes(itemValueLower)) {
                        matchesCheckboxFilters = false; break;
                    }
                }
            }
        }
        if (!matchesCheckboxFilters) return false;

        let matchesSearchTerm = true;
        if (searchTerm) {
            matchesSearchTerm = false;
            for (const field of searchableFields) {
                const fieldValue = item?.fieldData?.[field];
                if (fieldValue && typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(searchTerm)) {
                    matchesSearchTerm = true; break;
                }
                 if (field === 'kunden' && Array.isArray(item?.fieldData?.kunden) && Object.keys(allCustomerData).length > 0) {
                     const customerNames = item.fieldData.kunden
                         .map(id => allCustomerData[id]?.name)
                         .filter(name => name)
                         .join(' ').toLowerCase();
                     if (customerNames.includes(searchTerm)) {
                         matchesSearchTerm = true; break;
                     }
                 }
            }
        }
        return matchesSearchTerm;
    });

    console.timeEnd("Filterung");
    console.log(`📊 ${currentFilteredItems.length} Videos entsprechen den Filtern.`);

    // 4. Filter-Tags rendern
    renderFilterTags(allActiveCheckboxFiltersFlat);

    // 5. Erste Charge der gefilterten Videos rendern (leert Container, setzt Zähler)
    renderInitialVideoBatch(); // Diese Funktion kümmert sich auch um den Load-More-Button
}

/**
 * Setzt alle Filter zurück und rendert die erste Charge neu. (Unverändert)
 */
function clearAllFilters() {
    console.log("🧹 Setze alle Filter zurück...");
    let changed = false;

    filterConfig.forEach(group => {
        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id);
            if (checkbox) {
                if (checkbox.checked) {
                    checkbox.checked = false;
                    changed = true;
                    console.log(`[Debug] Resetting Checkbox ${filter.id} checked state set to: false`);
                    const event = new Event('change', { bubbles: true });
                    checkbox.dispatchEvent(event); // Löst applyFiltersAndRender aus
                }
            } else {
                 console.warn(`[Debug] Checkbox ${filter.id} beim Reset nicht gefunden.`);
            }
        });
    });

    const searchInput = document.getElementById(searchInputId);
    if (searchInput && searchInput.value !== "") {
        searchInput.value = "";
        changed = true;
         const event = new Event('input', { bubbles: true });
         searchInput.dispatchEvent(event); // Löst applyFiltersAndRender über Debounce aus
         console.log(`[Debug] Search input cleared.`);
    }

    // Wichtig: applyFiltersAndRender wird jetzt durch die 'change'/'input' Events ausgelöst.
    // Ein direkter Aufruf hier ist nicht mehr nötig, es sei denn, KEIN Event wurde ausgelöst.
    if (!changed) {
         console.log("[Debug] Keine Änderungen an Filtern oder Suche, kein erneutes Rendern nötig.");
    }
}


// 🚀 Initialisierung und Hauptfunktionen

/**
 * Hauptfunktion: Lädt Videos, Kundendaten, richtet Event Listener ein und startet das initiale Rendering.
 */
async function displayVideoCollection() {
    try {
        // --- SCHRITT 1: Videos laden ---
        console.log("Schritt 1: Starte Laden der Videos.");
        allVideoItems = await fetchAllCollectionItems(VIDEO_COLLECTION_ID);
        console.log(`Schritt 2: Videos geladen? ${allVideoItems !== null ? 'Ja' : 'Nein'}. Anzahl: ${allVideoItems?.length ?? 0}`);

        if (allVideoItems === null) {
             console.error("Fehler beim Laden der Video-Items. Breche ab.");
             const container = document.getElementById(videoContainerId);
             if (container) container.innerHTML = "<p>Fehler beim Laden der Videos.</p>";
             renderFilterTags([]);
             updateLoadMoreButtonVisibility(); // Button ausblenden
             return;
        }
        if (allVideoItems.length === 0) {
             console.log("Keine Video-Items gefunden.");
             const container = document.getElementById(videoContainerId);
              if (container) container.innerHTML = "<p>Keine Videos in dieser Sammlung gefunden.</p>";
             renderFilterTags([]);
             updateLoadMoreButtonVisibility(); // Button ausblenden
             return;
        }
        console.log(`📹 ${allVideoItems.length} Video(s) insgesamt erfolgreich geladen.`);

        // --- SCHRITT 2: Relevante Kunden-IDs sammeln ---
        const relevantCustomerIds = new Set();
        allVideoItems.forEach(item => {
            const kunden = item?.fieldData?.kunden;
            if (Array.isArray(kunden)) {
                kunden.forEach(id => relevantCustomerIds.add(id));
            }
        });
        const uniqueCustomerIds = Array.from(relevantCustomerIds);
        console.log(`Schritt 3: ${uniqueCustomerIds.length} einzigartige Kunden-IDs in Videos gefunden.`);

        // --- SCHRITT 3: Relevante Kundendaten laden ---
        const customerDataLoaded = await fetchRelevantCustomerData(uniqueCustomerIds);
        console.log(`Schritt 4: Relevante Kundendaten Lade-Status: ${customerDataLoaded}`);
        if (!customerDataLoaded) {
             console.warn("Fehler beim Laden der relevanten Kundendaten. Videos werden ohne vollständige Kundeninformationen angezeigt.");
             allCustomerData = {};
        }

        // --- SCHRITT 4: Event Listener einrichten ---
        console.log("Schritt 5: Richte Event Listener ein.");

        // Event Listener für Filter-Checkboxes (löst applyFiltersAndRender aus)
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

        // Event Listener für das Suchfeld (löst applyFiltersAndRender über Debounce aus)
        const searchInput = document.getElementById(searchInputId);
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(applyFiltersAndRender, DEBOUNCE_DELAY);
            });
            console.log(`✅ Event Listener (debounced) für Suchfeld '${searchInputId}' eingerichtet.`);
        } else {
            console.warn(`⚠️ Such-Eingabefeld mit ID '${searchInputId}' nicht im DOM gefunden.`);
        }

        // Event Listener für den Reset-Button (löst clearAllFilters aus)
        const resetButton = document.getElementById(filterResetButtonId);
        if (resetButton) {
            resetButton.addEventListener('click', clearAllFilters);
            resetButton.style.display = 'none';
            console.log(`✅ Event Listener für Reset-Button '${filterResetButtonId}' eingerichtet.`);
        } else {
            console.warn(`⚠️ Reset-Button mit ID '${filterResetButtonId}' nicht im DOM gefunden.`);
        }

        // Event Listener für den "Mehr laden"-Button
        const loadMoreButton = document.getElementById(loadMoreButtonId);
        if (loadMoreButton) {
            loadMoreButton.addEventListener('click', handleLoadMore);
            loadMoreButton.style.display = 'none'; // Initial ausblenden
            console.log(`✅ Event Listener für "Mehr laden"-Button '${loadMoreButtonId}' eingerichtet.`);
        } else {
             // Wichtige Warnung, da die Funktion sonst nicht geht!
             console.error(`❌ "Mehr laden"-Button mit ID '${loadMoreButtonId}' NICHT im DOM gefunden. Die Funktion wird nicht verfügbar sein.`);
        }

        // --- SCHRITT 5: Initiales Rendern (erste Charge) ---
        console.log("Schritt 6: Rufe initial applyFiltersAndRender auf.");
        applyFiltersAndRender(); // Wendet Filter an (falls welche voreingestellt sind) und rendert die erste Charge

    } catch (error) {
        console.error("❌ Schwerwiegender Fehler beim Anzeigen der Video-Collection:", error);
        const container = document.getElementById(videoContainerId);
        if (container) container.innerHTML = "<p>Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.</p>";
        renderFilterTags([]);
        updateLoadMoreButtonVisibility(); // Button sicherheitshalber ausblenden
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
        console.error("Video-Feed kann nicht initialisiert werden, da wichtige HTML-Elemente fehlen.");
        const body = document.querySelector('body');
        if (body) {
            const errorMsg = document.createElement('p');
            errorMsg.textContent = "Fehler: Notwendige Elemente zum Anzeigen der Videos fehlen auf der Seite.";
            errorMsg.style.color = "red";
            errorMsg.style.fontWeight = "bold";
            body.prepend(errorMsg);
        }
    }
});

/*
 WICHTIG: Du musst einen Button wie den folgenden in dein HTML einfügen,
 damit der "Mehr laden"-Mechanismus funktioniert:

 <button id="load-more-button" style="display: none;">Mehr Videos laden</button>

 Platziere ihn unterhalb des video-container Elements.
 Das Styling (style="display: none;") ist wichtig, damit er initial versteckt ist.
 Das Skript steuert dann die Sichtbarkeit.
*/
