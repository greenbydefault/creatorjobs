// 🌐 Optimierte Webflow API Integration für GitHub-Hosting

// 🔧 Konfiguration
const API_BASE_URL = "https://api.webflow.com/v2/collections";
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url=";
const VIDEO_COLLECTION_ID = "680b45a22b15fa4643ebdca9";
const CUSTOMER_COLLECTION_ID = "6448faf9c5a8a15f6cc05526"; // Kunden/Member Collection
const API_LIMIT = 100;

// Globale Variablen
let allVideoItems = [];
let allCustomerData = {}; // Speicher für *relevante* Kundendaten
const videoContainerId = "video-container"; // Hauptcontainer für alle Videos
const filterTagWrapperId = "filter-tag-wrapper";
const searchInputId = "filter-search";
let searchDebounceTimer = null;
const DEBOUNCE_DELAY = 300;

// --- Filterkonfiguration (Checkboxes) ---
const filterConfig = [
    {
        field: 'creatortype', filters: [
            { id: "influencer", value: "6feb96f95ec4037985d5b65bc97ac482", display: "Creator: Influencer" },
            { id: "ugc", value: "601abdcb4984b44f9188caec03e2ed59", display: "Creator: UGC" },
            { id: "model", value: "dc4a8f7ad6191674745dcecbf763c827", display: "Creator: Model" }
        ]
    }, {
        field: 'produktion', filters: [
            { id: "vorort", value: "096401b55fe1fc511bd2f7b4d8c6a26b", display: "Ort: Vor Ort" },
            { id: "creatorproduktion", value: "a82d800f50eaa6671a2361428ee5a7d7", display: "Ort: Creatorproduktion" }
        ]
    }, {
        field: 'anzeige', filters: [
            { id: "paid", value: "f2cdad102ae28465ff7eebfb496570d0", display: "Typ: Paid" },
            { id: "werbung", value: "93704cc37eb0d87a732cf645309c9710", display: "Typ: Werbeanzeige" },
            { id: "organisch", value: "a7e457d2518c7a2f617a2777ce897f93", display: "Typ: Organisch" }
        ]
    },
    {
        field: 'kunden', filters: [ // Multi-Referenz-Feld
            { id: "autoscout", value: "678f5b698973dba7df78f644", display: "Kunde: Autoscout" },
            { id: "B-B", value: "64808c8079995e878fda4f67", display: "Kunde: B&B Hotels" },
            { id: "chefkoch", value: "679213a19cc8609f08cc4565", display: "Kunde: Chefkoch" },
            { id: "telekom", value: "659d5ef1dd74610abc7f44c6", display: "Kunde: Telekom" }
        ]
    }
];

// --- Konfiguration für Suchfelder ---
const searchableFields = ['name', 'creator', 'beschreibung', 'video-name', 'produktionsort'];

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
            } catch (e) { errorText = `${errorText} - ${await response.text()}`; }
            throw new Error(`API-Fehler: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`❌ Fehler beim Abrufen von ${apiUrl}: ${error.message}`);
        return null;
    }
}

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

async function fetchSingleItem(collectionId, itemId) {
    const apiUrl = `${API_BASE_URL}/${collectionId}/items/${itemId}/live`;
    return await fetchWebflowData(apiUrl);
}

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
                    logoUrl: customer.fieldData['user-profile-img'] || null // Direkt die URL
                };
            } else if (customer === null) {
                console.warn("   -> Ein Kunde konnte nicht geladen werden (siehe vorherige Fehlermeldung).");
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


// 🎨 Rendering-Funktionen

/**
 * Rendert die Video-Items im angegebenen Container mit angepasster HTML-Struktur.
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
        const kundenIds = fieldData['kunden'];

        if (videoLink) {
            if (!videoLink.includes('&download=1')) {
                 if (videoLink.includes('?')) { videoLink += '&download=1'; }
                 else { videoLink += '?download=1'; }
            }

            // --- Äußerer Container für den gesamten Eintrag ---
            const feedContainer = document.createElement("div");
            feedContainer.classList.add("video-feed-container"); // Behält die äußere Klasse

            const firstCustomerId = (Array.isArray(kundenIds) && kundenIds.length > 0) ? kundenIds[0] : null;
            const customerInfo = firstCustomerId ? allCustomerData[firstCustomerId] : null;

            // --- Kundeninfo-Zeile ---
            if (customerInfo) {
                const customerRow = document.createElement('div');
                customerRow.classList.add('video-feed-row'); // Klasse für die Kundenzeile

                if (customerInfo.logoUrl) {
                    const logoImg = document.createElement('img');
                    logoImg.classList.add('video-feed-logo');
                    logoImg.src = customerInfo.logoUrl;
                    logoImg.alt = `${customerInfo.name} Logo`;
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
                feedContainer.appendChild(customerRow); // Füge Kundenzeile zum äußeren Container hinzu
            } else if (firstCustomerId) {
                console.warn(`Kundendaten für ID ${firstCustomerId} nicht in allCustomerData gefunden.`);
                // Optional: Leere Zeile einfügen
            }

            // --- NEU: Innerer Container für das Video ---
            const videoInnerContainer = document.createElement('div');
            videoInnerContainer.classList.add('feed-video-container'); // Neue Klasse für den Video-Wrapper

            // --- Video-Element ---
            const videoElement = document.createElement('video');
            videoElement.playsInline = true;
            videoElement.preload = "metadata";
            videoElement.controls = true;
            videoElement.classList.add('db-video-player'); // Klasse für das Video selbst
            videoElement.id = `db-user-video--${item.id || index}`;

            const sourceElement = document.createElement('source');
            sourceElement.src = videoLink;
            sourceElement.type = 'video/mp4';

            videoElement.appendChild(sourceElement);
            videoElement.appendChild(document.createTextNode('Dein Browser unterstützt das Video-Tag nicht.'));

            // Fehlerbehandlung: Ersetzt Inhalt im *inneren* Video-Container
            videoElement.addEventListener('error', (e) => {
                console.error(`Fehler beim Laden von Video ${videoElement.id} von ${videoLink}:`, e);
                const errorP = document.createElement('p');
                errorP.style.color = 'red';
                errorP.style.padding = '10px';
                errorP.style.border = '1px solid red';
                errorP.textContent = 'Video konnte nicht geladen werden.';
                // Ersetze das Video im inneren Container durch die Fehlermeldung
                videoInnerContainer.innerHTML = ''; // Entferne ggf. das fehlerhafte Video-Element zuerst
                videoInnerContainer.appendChild(errorP);
            }, { once: true });

            // Füge Video zum *inneren* Container hinzu
            videoInnerContainer.appendChild(videoElement);
            // Füge den *inneren* Container zum *äußeren* Container hinzu
            feedContainer.appendChild(videoInnerContainer);

            // Füge den gesamten äußeren Container zum Fragment hinzu
            fragment.appendChild(feedContainer);

        } else {
            console.warn(`⚠️ Video-Item ${item.id || index} hat keinen 'video-link'.`);
        }
    });

    container.innerHTML = "";
    container.appendChild(fragment);
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

function applyFiltersAndRender() {
    if (Object.keys(allCustomerData).length === 0 && allVideoItems.length > 0) {
         console.warn("Kundendaten noch nicht geladen, Filterung könnte unvollständig sein.");
    }

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
                activeFiltersByGroup[groupField].push(filter.value);
                allActiveCheckboxFiltersFlat.push({ ...filter, field: groupField });
            }
        });
    });

    // 2. Suchbegriff holen
    const searchInput = document.getElementById(searchInputId);
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

    // 3. Video-Items filtern
    const filteredItems = allVideoItems.filter(item => {
        let matchesCheckboxFilters = true;
        for (const groupField in activeFiltersByGroup) {
            const activeValuesInGroup = activeFiltersByGroup[groupField];
            if (activeValuesInGroup.length > 0) {
                const itemFieldValue = item?.fieldData?.[groupField];
                if (groupField === 'kunden') {
                    if (!itemFieldValue || !Array.isArray(itemFieldValue)) { matchesCheckboxFilters = false; break; }
                    const hasMatchingKunde = activeValuesInGroup.some(id => itemFieldValue.includes(id));
                    if (!hasMatchingKunde) { matchesCheckboxFilters = false; break; }
                } else if (groupField === 'creatortype' || groupField === 'produktion' || groupField === 'anzeige') {
                    if (itemFieldValue === undefined || itemFieldValue === null || !activeValuesInGroup.includes(itemFieldValue)) { matchesCheckboxFilters = false; break; }
                } else {
                    const itemValueLower = itemFieldValue?.toLowerCase();
                    const normalizedActiveValues = activeValuesInGroup.map(v => v.toLowerCase());
                    if (itemValueLower === undefined || itemValueLower === null || !normalizedActiveValues.includes(itemValueLower)) { matchesCheckboxFilters = false; break; }
                }
            }
        }
        if (!matchesCheckboxFilters) return false;

        let matchesSearchTerm = true;
        if (searchTerm) {
            matchesSearchTerm = false;
            for (const field of searchableFields) {
                const fieldValue = item?.fieldData?.[field];
                if (fieldValue && typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(searchTerm)) { matchesSearchTerm = true; break; }
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
             renderFilterTags([]); return;
        }
        if (allVideoItems.length === 0) {
             console.log("Keine Video-Items gefunden.");
             renderVideos([], videoContainerId); renderFilterTags([]); return;
        }
         console.log(`📹 ${allVideoItems.length} Video(s) insgesamt erfolgreich geladen.`);

        // --- SCHRITT 2: Relevante Kunden-IDs sammeln ---
        const relevantCustomerIds = new Set();
        allVideoItems.forEach(item => {
            const kunden = item?.fieldData?.kunden;
            if (Array.isArray(kunden)) { kunden.forEach(id => relevantCustomerIds.add(id)); }
        });
        const uniqueCustomerIds = Array.from(relevantCustomerIds);
        console.log(`Schritt 3: ${uniqueCustomerIds.length} einzigartige Kunden-IDs in Videos gefunden.`);

        // --- SCHRITT 3: Relevante Kundendaten laden ---
        const customerDataLoaded = await fetchRelevantCustomerData(uniqueCustomerIds);
        console.log(`Schritt 4: Relevante Kundendaten Lade-Status: ${customerDataLoaded}`);

        if (!customerDataLoaded) {
             console.warn("Fehler beim Laden der relevanten Kundendaten. Videos werden ohne Kundeninformationen angezeigt.");
             allCustomerData = {};
        }

        // --- SCHRITT 4: Event Listener einrichten ---
        console.log("Schritt 5: Richte Event Listener ein.");
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

        // --- SCHRITT 5: Initiales Rendern ---
        console.log("Schritt 6: Rufe initial applyFiltersAndRender auf.");
        applyFiltersAndRender();

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
