// 🌐 Optimierte Webflow API Integration für GitHub-Hosting mit "Load More" & Chunks

// 🔧 Konfiguration
const API_BASE_URL = "https://api.webflow.com/v2/collections";
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url="; // Dein Worker-Endpunkt
const VIDEO_COLLECTION_ID = "680b45a22b15fa4643ebdca9"; // Video Collection
const CUSTOMER_COLLECTION_ID = "6448faf9c5a8a15f6cc05526"; // Kunden/Member Collection
const ITEMS_PER_API_CHUNK = 12; // Anzahl der Items, die pro API-Aufruf geladen werden
const VIDEOS_PER_LOAD_DISPLAY = 8; // Anzahl der Videos, die pro Klick auf "Mehr laden" angezeigt werden

// Globale Variablen
let allVideoItems = []; // Speichert *alle* von der API geladenen Video-Items
let allCustomerData = {}; // Speicher für *relevante* Kundendaten (ID -> {name, logoUrl})
let currentFilteredItems = []; // Speichert die aktuell gefilterte Liste *aller geladenen* Videos
let displayedVideoCount = 0; // Zählt, wie viele Videos der gefilterten Liste aktuell angezeigt werden

let totalVideosAvailableFromAPI = 0; // Gesamtanzahl der Videos in der Webflow Collection
let currentAPIOffset = 0; // Aktueller Offset für API-Abrufe
let isLoadingFromAPI = false; // Flag, um parallele API-Ladeanfragen zu verhindern

// Element IDs
const videoContainerId = "video-container";
const filterTagWrapperId = "filter-tag-wrapper";
const searchInputId = "filter-search";
const filterResetButtonId = "filter-reset";
const loadMoreButtonId = "load-more-button";
const loadingSpinnerId = "loading-spinner"; // ID für den Preloader (MUSS im HTML existieren)

let searchDebounceTimer = null;
const DEBOUNCE_DELAY = 300;

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
            { id: "mezzo", value: "672256fcfe4471c902ab3f81", display: "Kunde: Mezzo Mix" },
            { id: "ninja", value: "67add369f3351b0978213be2", display: "Kunde: Ninja" },
            { id: "nutribullet", value: "67f7a99771b7233f2651d732", display: "Kunde: Nutribullet" },
            { id: "valentine", value: "6697bf815c39b80cf3a85e6c", display: "Kunde: Veltins" },
            { id: "shark", value: "647f039715031d91efbb5911", display: "Kunde: Shark" },
            { id: "o2", value: "667c15ac8883530952e83903", display: "Kunde: o2" }
        ]
    }
];
const searchableFields = ['name', 'creator', 'beschreibung', 'video-name', 'produktionsort'];

// --- Ladeindikator Funktionen ---
function showSpinner() {
    const spinner = document.getElementById(loadingSpinnerId);
    if (spinner) spinner.style.display = 'block';
    // Optional: "Mehr laden"-Button während des API-Ladens deaktivieren/Text ändern
    const loadMoreBtn = document.getElementById(loadMoreButtonId);
    if (loadMoreBtn) loadMoreBtn.disabled = true;
}

function hideSpinner() {
    const spinner = document.getElementById(loadingSpinnerId);
    if (spinner) spinner.style.display = 'none';
    const loadMoreBtn = document.getElementById(loadMoreButtonId);
    if (loadMoreBtn) loadMoreBtn.disabled = false;
}

// 🛠️ Hilfsfunktionen (fetchWebflowData, buildWorkerUrl, fetchSingleItem bleiben gleich)
function buildWorkerUrl(apiUrl) {
    return `${WORKER_BASE_URL}${encodeURIComponent(apiUrl)}`;
}

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

async function fetchSingleItem(collectionId, itemId) {
    const apiUrl = `${API_BASE_URL}/${collectionId}/items/${itemId}/live`;
    return await fetchWebflowData(apiUrl);
}


/**
 * Ruft einen *Chunk* von Video-Items von der Webflow API ab.
 * @param {number} offset - Der Startindex für den API-Abruf.
 * @param {number} limit - Die maximale Anzahl der abzurufenden Items.
 * @returns {Promise<{items: Array, pagination: object}|null>} Ein Promise, das die Items und Paginierungsinfos oder null bei Fehler zurückgibt.
 */
async function fetchVideoItemsChunk(offset, limit) {
    console.log(`🚀 Lade Video-Chunk von API: Offset ${offset}, Limit ${limit}`);
    const apiUrl = `${API_BASE_URL}/${VIDEO_COLLECTION_ID}/items/live?limit=${limit}&offset=${offset}`;
    const data = await fetchWebflowData(apiUrl);

    if (data && data.items) {
        console.log(`✅ ${data.items.length} Video-Items im Chunk geladen. Gesamt laut API (falls vorhanden): ${data.pagination?.total}`);
        return { items: data.items, pagination: data.pagination };
    } else {
        console.error(`❌ Fehler beim Abrufen des Video-Chunks bei Offset ${offset}.`);
        return null;
    }
}


/**
 * Lädt die Daten (Name, Logo) für eine Liste von Kunden-IDs und fügt sie zu `allCustomerData` hinzu.
 * @param {Array<string>} customerIds - Ein Array mit den zu ladenden Kunden-IDs.
 * @returns {Promise<boolean>} Ein Promise, das true bei Erfolg oder false bei schwerwiegenden Fehlern zurückgibt.
 */
async function fetchAndMergeRelevantCustomerData(customerIds) {
    if (!customerIds || customerIds.length === 0) {
        // console.log("Keine neuen Kunden-IDs zum Laden.");
        return true;
    }

    // Filtere IDs heraus, die bereits in allCustomerData vorhanden sind, um unnötige Abrufe zu vermeiden
    const newCustomerIdsToFetch = customerIds.filter(id => !allCustomerData[id]);
    if (newCustomerIdsToFetch.length === 0) {
        // console.log("Alle relevanten Kundendaten bereits vorhanden.");
        return true;
    }

    console.log(`🤵‍♂️ Lade Daten für ${newCustomerIdsToFetch.length} neue relevante(n) Kunden...`);
    const customerPromises = newCustomerIdsToFetch.map(id => fetchSingleItem(CUSTOMER_COLLECTION_ID, id));

    try {
        const customerItems = await Promise.all(customerPromises);
        let newCustomersFetchedCount = 0;
        customerItems.forEach(customer => {
            if (customer && customer.id && customer.fieldData) {
                allCustomerData[customer.id] = { // Füge hinzu oder überschreibe in allCustomerData
                    name: customer.fieldData.name || 'Unbekannter Kunde',
                    logoUrl: customer.fieldData['user-profile-img'] || null
                };
                newCustomersFetchedCount++;
            } else if (customer === null) {
                console.warn("    -> Ein Kunde konnte nicht geladen werden (siehe vorherige Fehlermeldung).");
            }
        });
        console.log(`👍 ${newCustomersFetchedCount} neue Kundendaten erfolgreich geladen und zusammengeführt.`);
        return true;
    } catch (error) {
        console.error("❌ Schwerwiegender Fehler beim parallelen Abrufen der Kundendaten:", error);
        return false;
    }
}

// --- Rendering-Funktionen (renderVideosSlice, renderInitialVideoBatch, updateLoadMoreButtonVisibility bleiben ähnlich) ---
function renderVideosSlice(videoSlice, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Video-Container mit ID '${containerId}' nicht gefunden.`);
        return;
    }
    const fragment = document.createDocumentFragment();
    if (!videoSlice || videoSlice.length === 0) return;

    videoSlice.forEach((item, index) => {
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
                        if (customerNameSpan) customerRow.insertBefore(placeholder, customerNameSpan);
                        else customerRow.appendChild(placeholder);
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
                // console.warn(`Kundendaten für ID ${firstCustomerId} nicht in allCustomerData gefunden. Wird evtl. später geladen.`);
            }

            const videoInnerContainer = document.createElement('div');
            videoInnerContainer.classList.add('feed-video-container');
            const videoElement = document.createElement('video');
            videoElement.playsInline = true;
            videoElement.preload = "metadata";
            videoElement.controls = true;
            videoElement.classList.add('db-video-player');
            videoElement.id = `db-user-video--${item.id || `slice-${Date.now()}-${index}`}`;
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
                videoInnerContainer.innerHTML = ''; videoInnerContainer.appendChild(errorP);
            }, { once: true });
            videoInnerContainer.appendChild(videoElement);
            feedContainer.appendChild(videoInnerContainer);
            fragment.appendChild(feedContainer);
        } else {
            console.warn(`⚠️ Video-Item ${item.id || `slice-${index}`} hat keinen 'video-link'.`);
        }
    });
    container.appendChild(fragment);
}

function renderInitialVideoBatch() {
    const container = document.getElementById(videoContainerId);
    if (!container) return;
    container.innerHTML = ''; // Container leeren

    const initialCount = Math.min(VIDEOS_PER_LOAD_DISPLAY, currentFilteredItems.length);
    displayedVideoCount = initialCount;

    if (initialCount === 0 && allVideoItems.length > 0) { // Es gibt Videos, aber keine passen zum Filter
        container.innerHTML = "<p>Keine Videos entsprechen den aktuellen Filtern oder der Suche.</p>";
    } else if (initialCount === 0 && allVideoItems.length === 0 && currentAPIOffset === 0) {
        // Dies ist der Fall, bevor überhaupt etwas von der API geladen wurde, oder die API gab 0 Items zurück
        // Der Spinner sollte noch sichtbar sein oder eine Meldung "Lade Videos..."
    } else if (initialCount === 0 && allVideoItems.length === 0 && totalVideosAvailableFromAPI === 0 && currentAPIOffset > 0) {
        // API hat initial 0 Videos gemeldet
        container.innerHTML = "<p>Keine Videos in dieser Sammlung gefunden.</p>";
    }
    else {
        const initialSlice = currentFilteredItems.slice(0, initialCount);
        renderVideosSlice(initialSlice, videoContainerId);
    }
    updateLoadMoreButtonVisibility();
}

function updateLoadMoreButtonVisibility() {
    const loadMoreButton = document.getElementById(loadMoreButtonId);
    if (!loadMoreButton) return;

    // Bedingung 1: Gibt es mehr *gefilterte und bereits von der API geladene* Videos anzuzeigen?
    const moreFilteredVideosToDisplay = displayedVideoCount < currentFilteredItems.length;
    // Bedingung 2: Gibt es *potenziell mehr Videos auf der API*, die noch nicht geladen wurden?
    const moreVideosOnAPI = allVideoItems.length < totalVideosAvailableFromAPI;

    if (moreFilteredVideosToDisplay || moreVideosOnAPI) {
        loadMoreButton.style.display = 'block';
        loadMoreButton.disabled = isLoadingFromAPI; // Deaktiviere, während API lädt
        if (isLoadingFromAPI) {
            loadMoreButton.textContent = "Lade mehr...";
        } else if (moreFilteredVideosToDisplay) {
            loadMoreButton.textContent = "Mehr Videos laden";
        } else { // moreVideosOnAPI muss true sein
            loadMoreButton.textContent = "Mehr von Server laden";
        }
    } else {
        loadMoreButton.style.display = 'none';
    }
}

/**
 * Behandelt den Klick auf den "Mehr laden"-Button.
 * Lädt entweder mehr von der API oder zeigt mehr bereits geladene an.
 */
async function handleLoadMore() {
    // Fall 1: Es gibt noch mehr gefilterte Videos, die bereits geladen (allVideoItems), aber noch nicht angezeigt wurden.
    if (displayedVideoCount < currentFilteredItems.length) {
        const startIndex = displayedVideoCount;
        const endIndex = Math.min(startIndex + VIDEOS_PER_LOAD_DISPLAY, currentFilteredItems.length);
        const nextSlice = currentFilteredItems.slice(startIndex, endIndex);
        
        renderVideosSlice(nextSlice, videoContainerId);
        displayedVideoCount = endIndex;
        updateLoadMoreButtonVisibility();
    }
    // Fall 2: Alle aktuell geladenen und gefilterten Videos sind angezeigt, ABER es gibt potenziell mehr auf der API.
    else if (allVideoItems.length < totalVideosAvailableFromAPI && !isLoadingFromAPI) {
        console.log("Alle geladenen Videos angezeigt, versuche mehr von API zu laden...");
        isLoadingFromAPI = true;
        showSpinner(); // Zeige Spinner für API-Ladevorgang
        updateLoadMoreButtonVisibility(); // Aktualisiert Button-Text/Status

        const chunkData = await fetchVideoItemsChunk(currentAPIOffset, ITEMS_PER_API_CHUNK);
        if (chunkData && chunkData.items.length > 0) {
            allVideoItems = allVideoItems.concat(chunkData.items);
            currentAPIOffset += chunkData.items.length;

            // Kundendaten für die neu geladenen Items abrufen
            const newCustomerIds = new Set();
            chunkData.items.forEach(item => {
                const kunden = item?.fieldData?.kunden;
                if (Array.isArray(kunden)) {
                    kunden.forEach(id => newCustomerIds.add(id));
                }
            });
            await fetchAndMergeRelevantCustomerData(Array.from(newCustomerIds));

            // Filter neu anwenden, da sich allVideoItems geändert hat
            // applyFiltersAndRender wird dann renderInitialVideoBatch aufrufen,
            // was aber den Container leert. Wir wollen hier eigentlich nur anhängen.
            // Daher filtern wir manuell und rufen dann die Logik zum Anzeigen des nächsten Chunks auf.
            
            // Filter erneut anwenden, um currentFilteredItems zu aktualisieren
            applyFilters(); // Nur filtern, nicht rendern!
            
            // Jetzt den nächsten Satz von (neu gefilterten) Videos anzeigen
            const startIndex = displayedVideoCount; // Sollte gleich bleiben, da wir vorher am Ende waren
            const endIndex = Math.min(startIndex + VIDEOS_PER_LOAD_DISPLAY, currentFilteredItems.length);
            
            if (endIndex > startIndex) { // Nur rendern, wenn es tatsächlich neue gefilterte Videos gibt
                 const nextSlice = currentFilteredItems.slice(startIndex, endIndex);
                 renderVideosSlice(nextSlice, videoContainerId);
                 displayedVideoCount = endIndex;
            }

        } else if (chunkData && chunkData.items.length === 0) {
            console.log("API hat keine weiteren Videos zurückgegeben.");
            // Setze totalVideosAvailableFromAPI auf die aktuelle Länge, da die API nichts mehr liefert.
            totalVideosAvailableFromAPI = allVideoItems.length;
        } else {
            console.error("Fehler beim Nachladen von der API.");
            // Fehlerbehandlung, evtl. totalVideosAvailableFromAPI anpassen, damit nicht endlos versucht wird.
        }
        isLoadingFromAPI = false;
        hideSpinner();
        updateLoadMoreButtonVisibility();
    } else {
        console.log("Keine weiteren Videos zum Laden (weder lokal noch von API).");
        updateLoadMoreButtonVisibility(); // Button sicherheitshalber ausblenden
    }
}

// --- Filterlogik ---
function renderFilterTags(activeFiltersFlat) { // Unverändert von V2
    const wrapper = document.getElementById(filterTagWrapperId);
    if (!wrapper) { console.warn(`⚠️ Filter-Tag-Wrapper mit ID '${filterTagWrapperId}' nicht gefunden.`); return; }
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
                correspondingCheckbox.dispatchEvent(event); // Triggers applyFiltersAndRender
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
 * Wendet nur die Filter an und aktualisiert `currentFilteredItems`. Rendert nicht.
 */
function applyFilters() {
    console.time("Nur Filterung");
    const activeFiltersByGroup = {};
    let allActiveCheckboxFiltersFlat = []; // Für renderFilterTags
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
    const searchInput = document.getElementById(searchInputId);
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

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
                        .map(id => allCustomerData[id]?.name).filter(name => name).join(' ').toLowerCase();
                    if (customerNames.includes(searchTerm)) {
                        matchesSearchTerm = true; break;
                    }
                }
            }
        }
        return matchesSearchTerm;
    });
    console.timeEnd("Nur Filterung");
    console.log(`📊 ${currentFilteredItems.length} von ${allVideoItems.length} (geladenen) Videos entsprechen den Filtern.`);
    renderFilterTags(allActiveCheckboxFiltersFlat); // Tags immer aktualisieren
}


/**
 * Wendet Filter an und rendert die erste Charge der Videos.
 */
function applyFiltersAndRender() {
    applyFilters(); // Filtert und aktualisiert currentFilteredItems & Tags
    renderInitialVideoBatch(); // Rendert die erste Charge basierend auf den neuen currentFilteredItems
}

function clearAllFilters() { // Unverändert von V2
    console.log("🧹 Setze alle Filter zurück...");
    let changed = false;
    filterConfig.forEach(group => {
        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id);
            if (checkbox) {
                if (checkbox.checked) {
                    checkbox.checked = false;
                    changed = true;
                    const event = new Event('change', { bubbles: true });
                    checkbox.dispatchEvent(event); // Triggers applyFiltersAndRender
                }
            }
        });
    });
    const searchInput = document.getElementById(searchInputId);
    if (searchInput && searchInput.value !== "") {
        searchInput.value = "";
        changed = true;
        const event = new Event('input', { bubbles: true });
        searchInput.dispatchEvent(event); // Triggers applyFiltersAndRender via debounce
    }
    if (!changed) {
        // Wenn nichts geändert wurde, aber der Reset-Button geklickt wurde,
        // wollen wir vielleicht trotzdem die Ansicht auf den Anfang zurücksetzen.
        applyFiltersAndRender();
    }
}

// 🚀 Initialisierung und Hauptfunktionen
async function displayVideoCollection() {
    showSpinner(); // Zeige Spinner beim Start

    // --- SCHRITT 1: Ersten Chunk von Videos laden ---
    const initialChunkData = await fetchVideoItemsChunk(currentAPIOffset, ITEMS_PER_API_CHUNK);

    if (initialChunkData && initialChunkData.items) {
        allVideoItems = initialChunkData.items;
        currentAPIOffset += initialChunkData.items.length;
        if (initialChunkData.pagination && initialChunkData.pagination.total) {
            totalVideosAvailableFromAPI = initialChunkData.pagination.total;
        } else {
            // Fallback, falls pagination.total nicht verfügbar ist (sollte es aber sein)
            totalVideosAvailableFromAPI = initialChunkData.items.length;
            if (initialChunkData.items.length < ITEMS_PER_API_CHUNK) {
                // Wahrscheinlich alle Items geladen
            } else {
                console.warn("Konnte totalVideosAvailableFromAPI nicht sicher bestimmen, 'Mehr laden von API' könnte unzuverlässig sein.");
                // Setze es auf einen Wert, der zumindest weiteres Laden ermöglicht, wenn ITEMS_PER_API_CHUNK erreicht wurde
                totalVideosAvailableFromAPI = currentAPIOffset + 1; // Annahme: es gibt mind. noch eins
            }
        }
        console.log(`📹 Erster Chunk: ${allVideoItems.length} Videos geladen. Gesamt auf API: ${totalVideosAvailableFromAPI}`);

        // --- SCHRITT 2: Relevante Kunden-IDs für ersten Chunk sammeln & laden ---
        const initialCustomerIds = new Set();
        allVideoItems.forEach(item => {
            const kunden = item?.fieldData?.kunden;
            if (Array.isArray(kunden)) {
                kunden.forEach(id => initialCustomerIds.add(id));
            }
        });
        await fetchAndMergeRelevantCustomerData(Array.from(initialCustomerIds));

    } else {
        console.error("Fehler beim Laden des initialen Video-Chunks. Breche ab.");
        const container = document.getElementById(videoContainerId);
        if (container) container.innerHTML = "<p>Fehler beim Laden der Videos.</p>";
        hideSpinner();
        updateLoadMoreButtonVisibility();
        return;
    }
    
    if (allVideoItems.length === 0) {
        console.log("Keine Video-Items in der Collection gefunden.");
        const container = document.getElementById(videoContainerId);
        if (container) container.innerHTML = "<p>Keine Videos in dieser Sammlung gefunden.</p>";
        // Filter-Tags und Load-More-Button trotzdem initialisieren/verstecken
        renderFilterTags([]);
        updateLoadMoreButtonVisibility();
        hideSpinner();
        return;
    }


    // --- SCHRITT 3: Event Listener einrichten ---
    console.log("Schritt 3: Richte Event Listener ein.");
    filterConfig.forEach(group => {
        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id);
            if (checkbox) checkbox.addEventListener('change', applyFiltersAndRender);
            else console.warn(`⚠️ Filter-Checkbox mit ID '${filter.id}' nicht im DOM gefunden.`);
        });
    });
    const searchInput = document.getElementById(searchInputId);
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(applyFiltersAndRender, DEBOUNCE_DELAY);
        });
    } else console.warn(`⚠️ Such-Eingabefeld mit ID '${searchInputId}' nicht im DOM gefunden.`);
    const resetButton = document.getElementById(filterResetButtonId);
    if (resetButton) {
        resetButton.addEventListener('click', clearAllFilters);
        resetButton.style.display = 'none';
    } else console.warn(`⚠️ Reset-Button mit ID '${filterResetButtonId}' nicht im DOM gefunden.`);
    const loadMoreButton = document.getElementById(loadMoreButtonId);
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', handleLoadMore);
        loadMoreButton.style.display = 'none';
    } else console.error(`❌ "Mehr laden"-Button mit ID '${loadMoreButtonId}' NICHT im DOM gefunden.`);

    // --- SCHRITT 4: Initiales Rendern (erste Charge) ---
    console.log("Schritt 4: Rufe initial applyFiltersAndRender auf.");
    applyFiltersAndRender(); // Wendet Filter an und rendert die erste Charge

    hideSpinner(); // Verstecke Spinner nach dem ersten Rendern
}

// --- Start der Anwendung ---
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM geladen. Starte Ladevorgänge...");
    const videoContainerExists = !!document.getElementById(videoContainerId);
    const tagWrapperExists = !!document.getElementById(filterTagWrapperId);
    const spinnerExists = !!document.getElementById(loadingSpinnerId);

    if (!spinnerExists) {
        console.error(`FEHLER: Lade-Spinner ('${loadingSpinnerId}') nicht gefunden! Bitte füge ihn zum HTML hinzu.`);
        // Optional: Fehlermeldung im UI anzeigen, wenn Spinner fehlt
        const body = document.querySelector('body');
        if (body) {
            const errorMsg = document.createElement('p');
            errorMsg.textContent = "Fehler: Lade-Spinner Element fehlt auf der Seite.";
            errorMsg.style.color = "red"; errorMsg.style.fontWeight = "bold";
            body.prepend(errorMsg);
        }
        // Man könnte hier abbrechen, aber versuchen wir es trotzdem, falls der Nutzer ihn später hinzufügt
    }

    if (videoContainerExists && tagWrapperExists) {
         displayVideoCollection();
    } else {
        if (!videoContainerExists) console.error(`FEHLER: Video-Container ('${videoContainerId}') nicht gefunden!`);
        if (!tagWrapperExists) console.error(`FEHLER: Filter-Tag-Wrapper ('${filterTagWrapperId}') nicht gefunden!`);
        console.error("Video-Feed kann nicht initialisiert werden, da wichtige HTML-Elemente fehlen.");
        // Hier könnte man den Spinner ausblenden, falls er angezeigt wurde und nichts geladen werden kann
        hideSpinner();
    }
});
