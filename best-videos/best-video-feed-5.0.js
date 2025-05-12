// 🌐 Optimierte Webflow API Integration für GitHub-Hosting mit "Load More", Chunks & Timer

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
const loadingSpinnerId = "loading-spinner"; // ID für den Preloader
const loadingTimeDisplayId = "loading-time-display"; // ID für die Zeitanzeige (MUSS im HTML existieren)


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
    const loadMoreBtn = document.getElementById(loadMoreButtonId);
    if (loadMoreBtn) loadMoreBtn.disabled = true;
}

function hideSpinner() {
    const spinner = document.getElementById(loadingSpinnerId);
    if (spinner) spinner.style.display = 'none';
    const loadMoreBtn = document.getElementById(loadMoreButtonId);
    if (loadMoreBtn) loadMoreBtn.disabled = false;
}

// 🛠️ Hilfsfunktionen
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

async function fetchAndMergeRelevantCustomerData(customerIds) {
    if (!customerIds || customerIds.length === 0) return true;
    const newCustomerIdsToFetch = customerIds.filter(id => !allCustomerData[id]);
    if (newCustomerIdsToFetch.length === 0) return true;

    console.log(`🤵‍♂️ Lade Daten für ${newCustomerIdsToFetch.length} neue relevante(n) Kunden...`);
    const customerPromises = newCustomerIdsToFetch.map(id => fetchSingleItem(CUSTOMER_COLLECTION_ID, id));
    try {
        const customerItems = await Promise.all(customerPromises);
        let newCustomersFetchedCount = 0;
        customerItems.forEach(customer => {
            if (customer && customer.id && customer.fieldData) {
                allCustomerData[customer.id] = {
                    name: customer.fieldData.name || 'Unbekannter Kunde',
                    logoUrl: customer.fieldData['user-profile-img'] || null
                };
                newCustomersFetchedCount++;
            } else if (customer === null) {
                console.warn("    -> Ein Kunde konnte nicht geladen werden.");
            }
        });
        console.log(`👍 ${newCustomersFetchedCount} neue Kundendaten erfolgreich geladen.`);
        return true;
    } catch (error) {
        console.error("❌ Schwerwiegender Fehler beim parallelen Abrufen der Kundendaten:", error);
        return false;
    }
}

// --- Rendering-Funktionen ---
function renderVideosSlice(videoSlice, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const fragment = document.createDocumentFragment();
    if (!videoSlice || videoSlice.length === 0) return;

    videoSlice.forEach((item, index) => {
        if (!item || !item.fieldData) { console.warn("Ungültiges Video-Item übersprungen:", item); return; }
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
                        const placeholder = document.createElement('div');
                        placeholder.classList.add('video-feed-logo-placeholder');
                        const cNameSpan = customerRow.querySelector('.video-feed-customer');
                        if (cNameSpan) customerRow.insertBefore(placeholder, cNameSpan); else customerRow.appendChild(placeholder);
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
            }

            const videoInnerContainer = document.createElement('div');
            videoInnerContainer.classList.add('feed-video-container');
            const videoElement = document.createElement('video');
            videoElement.playsInline = true; videoElement.preload = "metadata"; videoElement.controls = true;
            videoElement.classList.add('db-video-player');
            videoElement.id = `db-user-video--${item.id || `slice-${Date.now()}-${index}`}`;
            const sourceElement = document.createElement('source');
            sourceElement.src = videoLink; sourceElement.type = 'video/mp4';
            videoElement.appendChild(sourceElement);
            videoElement.appendChild(document.createTextNode('Dein Browser unterstützt das Video-Tag nicht.'));
            videoElement.addEventListener('error', (e) => {
                console.error(`Fehler beim Laden von Video ${videoElement.id} von ${videoLink}:`, e);
                const errorP = document.createElement('p');
                errorP.style.cssText = 'color:red; padding:10px; border:1px solid red;';
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
    container.innerHTML = '';
    const initialCount = Math.min(VIDEOS_PER_LOAD_DISPLAY, currentFilteredItems.length);
    displayedVideoCount = initialCount;

    if (initialCount === 0 && allVideoItems.length > 0) {
        container.innerHTML = "<p>Keine Videos entsprechen den aktuellen Filtern oder der Suche.</p>";
    } else if (initialCount === 0 && allVideoItems.length === 0 && currentAPIOffset === 0) {
        // Initial load, API might not have returned yet, or returned 0. Spinner handles this.
    } else if (initialCount === 0 && allVideoItems.length === 0 && totalVideosAvailableFromAPI === 0 && currentAPIOffset > 0) {
        container.innerHTML = "<p>Keine Videos in dieser Sammlung gefunden.</p>";
    } else {
        const initialSlice = currentFilteredItems.slice(0, initialCount);
        renderVideosSlice(initialSlice, videoContainerId);
    }
    updateLoadMoreButtonVisibility();
}

function updateLoadMoreButtonVisibility() {
    const loadMoreButton = document.getElementById(loadMoreButtonId);
    if (!loadMoreButton) return;
    const moreFilteredVideosToDisplay = displayedVideoCount < currentFilteredItems.length;
    const moreVideosOnAPI = allVideoItems.length < totalVideosAvailableFromAPI;

    if (moreFilteredVideosToDisplay || moreVideosOnAPI) {
        loadMoreButton.style.display = 'block';
        loadMoreButton.disabled = isLoadingFromAPI;
        if (isLoadingFromAPI) {
            loadMoreButton.textContent = "Lade mehr...";
        } else if (moreFilteredVideosToDisplay) {
            loadMoreButton.textContent = "Mehr Videos laden";
        } else {
            loadMoreButton.textContent = "Mehr von Server laden";
        }
    } else {
        loadMoreButton.style.display = 'none';
    }
}

async function handleLoadMore(event) {
    if (event) {
        event.preventDefault(); // Verhindert Standardverhalten und mögliches Springen
    }

    if (displayedVideoCount < currentFilteredItems.length) {
        const startIndex = displayedVideoCount;
        const endIndex = Math.min(startIndex + VIDEOS_PER_LOAD_DISPLAY, currentFilteredItems.length);
        const nextSlice = currentFilteredItems.slice(startIndex, endIndex);
        renderVideosSlice(nextSlice, videoContainerId);
        displayedVideoCount = endIndex;
    } else if (allVideoItems.length < totalVideosAvailableFromAPI && !isLoadingFromAPI) {
        isLoadingFromAPI = true;
        showSpinner();
        updateLoadMoreButtonVisibility();
        const chunkData = await fetchVideoItemsChunk(currentAPIOffset, ITEMS_PER_API_CHUNK);
        if (chunkData && chunkData.items.length > 0) {
            allVideoItems = allVideoItems.concat(chunkData.items);
            currentAPIOffset += chunkData.items.length;
            const newCustomerIds = new Set();
            chunkData.items.forEach(item => {
                const kunden = item?.fieldData?.kunden;
                if (Array.isArray(kunden)) kunden.forEach(id => newCustomerIds.add(id));
            });
            await fetchAndMergeRelevantCustomerData(Array.from(newCustomerIds));
            applyFilters(); // Nur filtern, nicht initial rendern
            const startIndex = displayedVideoCount;
            const endIndex = Math.min(startIndex + VIDEOS_PER_LOAD_DISPLAY, currentFilteredItems.length);
            if (endIndex > startIndex) {
                const nextSliceToDisplay = currentFilteredItems.slice(startIndex, endIndex);
                renderVideosSlice(nextSliceToDisplay, videoContainerId);
                displayedVideoCount = endIndex;
            }
        } else if (chunkData && chunkData.items.length === 0) {
            totalVideosAvailableFromAPI = allVideoItems.length; // Keine weiteren Videos auf API
        }
        isLoadingFromAPI = false;
        hideSpinner();
    }
    updateLoadMoreButtonVisibility();
}

// --- Filterlogik ---
function renderFilterTags(activeFiltersFlat) {
    const wrapper = document.getElementById(filterTagWrapperId);
    if (!wrapper) return;
    const fragment = document.createDocumentFragment();
    activeFiltersFlat.forEach(filter => {
        const tagElement = document.createElement('div');
        tagElement.classList.add('search-filter-tag');
        const tagName = document.createElement('span');
        tagName.classList.add('tag-text'); tagName.textContent = filter.display;
        const removeButton = document.createElement('button');
        removeButton.classList.add('filter-close-button'); removeButton.textContent = '×';
        removeButton.setAttribute('aria-label', `Filter ${filter.display} entfernen`);
        removeButton.dataset.checkboxId = filter.id;
        removeButton.addEventListener('click', (e) => {
            const cbId = e.currentTarget.dataset.checkboxId;
            const cb = document.getElementById(cbId);
            if (cb) {
                cb.checked = false;
                const event = new Event('change', { bubbles: true });
                cb.dispatchEvent(event);
            }
        });
        tagElement.appendChild(tagName); tagElement.appendChild(removeButton);
        fragment.appendChild(tagElement);
    });
    wrapper.innerHTML = ''; wrapper.appendChild(fragment);
    const resetButton = document.getElementById(filterResetButtonId);
    if (resetButton) {
        const searchInput = document.getElementById(searchInputId);
        const isSearchActive = searchInput && searchInput.value.trim() !== "";
        resetButton.style.display = (activeFiltersFlat.length > 0 || isSearchActive) ? 'inline-block' : 'none';
    }
}

function applyFilters() {
    console.time("Nur Filterung");
    const activeFiltersByGroup = {};
    let allActiveCheckboxFiltersFlat = [];
    filterConfig.forEach(group => {
        activeFiltersByGroup[group.field] = [];
        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id);
            if (checkbox && checkbox.checked) {
                activeFiltersByGroup[group.field].push(filter.value);
                allActiveCheckboxFiltersFlat.push({ ...filter, field: group.field });
            }
        });
    });
    const searchInput = document.getElementById(searchInputId);
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

    currentFilteredItems = allVideoItems.filter(item => {
        let matchesCheckbox = true;
        for (const groupField in activeFiltersByGroup) {
            const activeVals = activeFiltersByGroup[groupField];
            if (activeVals.length > 0) {
                const itemVal = item?.fieldData?.[groupField];
                if (groupField === 'kunden') {
                    if (!itemVal || !Array.isArray(itemVal) || !activeVals.some(id => itemVal.includes(id))) {
                        matchesCheckbox = false; break;
                    }
                } else if (['creatortype', 'produktion', 'anzeige'].includes(groupField)) {
                    if (itemVal === undefined || itemVal === null || !activeVals.includes(itemVal)) {
                        matchesCheckbox = false; break;
                    }
                } else {
                    const itemStr = String(itemVal || '').toLowerCase();
                    const normVals = activeVals.map(v => String(v || '').toLowerCase());
                    if (!itemStr || !normVals.includes(itemStr)) {
                        matchesCheckbox = false; break;
                    }
                }
            }
        }
        if (!matchesCheckbox) return false;
        let matchesSearch = true;
        if (searchTerm) {
            matchesSearch = false;
            for (const field of searchableFields) {
                const fieldVal = item?.fieldData?.[field];
                if (fieldVal && typeof fieldVal === 'string' && fieldVal.toLowerCase().includes(searchTerm)) {
                    matchesSearch = true; break;
                }
                if (field === 'kunden' && Array.isArray(item?.fieldData?.kunden) && Object.keys(allCustomerData).length > 0) {
                    const names = item.fieldData.kunden.map(id => allCustomerData[id]?.name).filter(n => n).join(' ').toLowerCase();
                    if (names.includes(searchTerm)) { matchesSearch = true; break; }
                }
            }
        }
        return matchesSearch;
    });
    console.timeEnd("Nur Filterung");
    console.log(`📊 ${currentFilteredItems.length} von ${allVideoItems.length} Videos entsprechen Filtern.`);
    renderFilterTags(allActiveCheckboxFiltersFlat);
}

function applyFiltersAndRender() {
    applyFilters();
    renderInitialVideoBatch();
}

function clearAllFilters() {
    console.log("🧹 Setze alle Filter zurück...");
    let changed = false;
    filterConfig.forEach(group => {
        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id);
            if (checkbox && checkbox.checked) {
                checkbox.checked = false; changed = true;
                const event = new Event('change', { bubbles: true });
                checkbox.dispatchEvent(event);
            }
        });
    });
    const searchInput = document.getElementById(searchInputId);
    if (searchInput && searchInput.value !== "") {
        searchInput.value = ""; changed = true;
        const event = new Event('input', { bubbles: true });
        searchInput.dispatchEvent(event);
    }
    if (!changed) applyFiltersAndRender(); // Reset view even if no filters were active
}

// 🚀 Initialisierung und Hauptfunktionen
async function displayVideoCollection() {
    const startTime = performance.now();
    const loadingTimeElem = document.getElementById(loadingTimeDisplayId);
    if (loadingTimeElem) loadingTimeElem.textContent = '';

    showSpinner();

    try {
        const initialChunk = await fetchVideoItemsChunk(currentAPIOffset, ITEMS_PER_API_CHUNK);
        if (initialChunk && initialChunk.items) {
            allVideoItems = initialChunk.items;
            currentAPIOffset += initialChunk.items.length;
            totalVideosAvailableFromAPI = initialChunk.pagination?.total ?? (initialChunk.items.length < ITEMS_PER_API_CHUNK ? initialChunk.items.length : currentAPIOffset +1);
            console.log(`📹 Erster Chunk: ${allVideoItems.length}. Gesamt API: ${totalVideosAvailableFromAPI}`);
            const initialCustIds = new Set();
            allVideoItems.forEach(item => {
                const kunden = item?.fieldData?.kunden;
                if (Array.isArray(kunden)) kunden.forEach(id => initialCustIds.add(id));
            });
            await fetchAndMergeRelevantCustomerData(Array.from(initialCustIds));
        } else {
            console.error("Fehler beim Laden des initialen Chunks.");
            if (loadingTimeElem) loadingTimeElem.textContent = 'Fehler beim Laden.';
            hideSpinner(); return;
        }

        if (allVideoItems.length === 0) {
            console.log("Keine Videos gefunden.");
            const container = document.getElementById(videoContainerId);
            if(container) container.innerHTML = "<p>Keine Videos in dieser Sammlung gefunden.</p>";
            if (loadingTimeElem) loadingTimeElem.textContent = 'Keine Videos gefunden.';
            renderFilterTags([]); updateLoadMoreButtonVisibility(); hideSpinner(); return;
        }

        console.log("Schritt 3: Event Listener einrichten.");
        filterConfig.forEach(group => group.filters.forEach(filter => {
            const cb = document.getElementById(filter.id);
            if (cb) cb.addEventListener('change', applyFiltersAndRender);
        }));
        const search = document.getElementById(searchInputId);
        if (search) search.addEventListener('input', () => {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(applyFiltersAndRender, DEBOUNCE_DELAY);
        });
        const resetBtn = document.getElementById(filterResetButtonId);
        if (resetBtn) { resetBtn.addEventListener('click', clearAllFilters); resetBtn.style.display = 'none';}
        const loadMoreBtn = document.getElementById(loadMoreButtonId);
        // Event wird direkt an handleLoadMore übergeben
        if (loadMoreBtn) { loadMoreBtn.addEventListener('click', handleLoadMore); loadMoreBtn.style.display = 'none';}
        else { console.error(`❌ "Mehr laden"-Button mit ID '${loadMoreButtonId}' NICHT im DOM gefunden.`);}


        console.log("Schritt 4: Initiales Rendern.");
        applyFiltersAndRender();

        const endTime = performance.now();
        const loadTime = ((endTime - startTime) / 1000).toFixed(2);
        if (loadingTimeElem) loadingTimeElem.textContent = `Initiale Ladezeit: ${loadTime} Sek.`;
        console.log(`Initiale Ladezeit: ${loadTime} Sek.`);
        hideSpinner();
    } catch (error) {
        console.error("❌ Schwerwiegender Fehler:", error);
        if (loadingTimeElem) loadingTimeElem.textContent = 'Ein Fehler ist aufgetreten.';
        hideSpinner();
    }
}

// --- Start der Anwendung ---
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM geladen.");
    const videoContainerExists = !!document.getElementById(videoContainerId);
    const tagWrapperExists = !!document.getElementById(filterTagWrapperId);
    const spinnerExists = !!document.getElementById(loadingSpinnerId);
    const timeDisplayExists = !!document.getElementById(loadingTimeDisplayId);

    if (!spinnerExists) console.error(`FEHLER: Lade-Spinner ('${loadingSpinnerId}') fehlt!`);
    if (!timeDisplayExists) console.error(`FEHLER: Zeitanzeige ('${loadingTimeDisplayId}') fehlt!`);

    if (videoContainerExists && tagWrapperExists) {
         displayVideoCollection();
    } else {
        if (!videoContainerExists) console.error(`FEHLER: Video-Container ('${videoContainerId}') fehlt!`);
        if (!tagWrapperExists) console.error(`FEHLER: Filter-Tag-Wrapper ('${filterTagWrapperId}') fehlt!`);
        hideSpinner();
    }
});
