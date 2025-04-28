// 🌐 Optimierte Webflow API Integration für GitHub-Hosting

// 🔧 Konfiguration
const API_BASE_URL = "https://api.webflow.com/v2/collections";
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url=";
const VIDEO_COLLECTION_ID = "680b45a22b15fa4643ebdca9";
const CUSTOMER_COLLECTION_ID = "6448faf9c5a8a15f6cc05526";
const API_LIMIT = 100;

// Globale Variablen
let allVideoItems = [];
let allCustomerData = {};
const videoContainerId = "video-container";
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
        field: 'kunden', filters: [
            { id: "autoscout", value: "678f5b698973dba7df78f644", display: "Kunde: Autoscout" },
            { id: "B-B", value: "64808c8079995e878fda4f67", display: "Kunde: B&B Hotels" },
            { id: "chefkoch", value: "679213a19cc8609f08cc4565", display: "Kunde: Chefkoch" }
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

    console.log(`🚀 Starte Abruf aller Items für Collection ${collectionId} (Limit pro Abruf: ${API_LIMIT})`); // Log bleibt

    while (hasMore) {
        const apiUrl = `${API_BASE_URL}/${collectionId}/items/live?limit=${API_LIMIT}&offset=${offset}`;
        const data = await fetchWebflowData(apiUrl);

        if (data && data.items) {
            allItems = allItems.concat(data.items);
            totalFetched += data.items.length;

            if (data.pagination && totalFetched >= data.pagination.total) {
                hasMore = false;
                console.log(`✅ Alle ${data.pagination.total} Items für ${collectionId} geladen.`); // Log bleibt
            } else if (data.items.length < API_LIMIT) {
                 hasMore = false;
                 console.log(`✅ Weniger als ${API_LIMIT} Items zurückgegeben für ${collectionId}, Annahme: Alle Items geladen (Gesamt: ${totalFetched}).`); // Log bleibt
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

async function fetchAllCustomerData() {
    console.log("🤵‍♂️ Lade Kundendaten..."); // Log bleibt
    const customerItems = await fetchAllCollectionItems(CUSTOMER_COLLECTION_ID);

    if (customerItems === null) {
        console.error("❌ Fehler beim Laden der Kundendaten.");
        allCustomerData = {};
        return false;
    }

    allCustomerData = customerItems.reduce((map, customer) => {
        if (customer && customer.id && customer.fieldData) {
            map[customer.id] = {
                name: customer.fieldData.name || 'Unbekannter Kunde',
                logoUrl: customer.fieldData['user-profile-img']?.url || null
            };
        }
        return map;
    }, {});

    // --- NEUES LOG ---
    console.log(`👍 ${Object.keys(allCustomerData).length} Kundendaten erfolgreich geladen und verarbeitet.`);
    // console.log("Verarbeitete Kundendaten:", allCustomerData); // Optional: Entkommentieren für detaillierte Prüfung
    return true;
}


// 🎨 Rendering-Funktionen

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

            const feedContainer = document.createElement("div");
            feedContainer.classList.add("video-feed-container");

            const firstCustomerId = (Array.isArray(kundenIds) && kundenIds.length > 0) ? kundenIds[0] : null;
            const customerInfo = firstCustomerId ? allCustomerData[firstCustomerId] : null;

            if (customerInfo) {
                const customerRow = document.createElement('div');
                customerRow.classList.add('video-feed-row');
                customerRow.style.display = 'flex';
                customerRow.style.alignItems = 'center';
                customerRow.style.marginBottom = '10px';

                if (customerInfo.logoUrl) {
                    const logoImg = document.createElement('img');
                    logoImg.classList.add('video-feed-logo');
                    logoImg.src = customerInfo.logoUrl;
                    logoImg.alt = `${customerInfo.name} Logo`;
                    logoImg.style.width = '32px';
                    logoImg.style.height = '32px';
                    logoImg.style.borderRadius = '50%';
                    logoImg.style.marginRight = '8px';
                    logoImg.onerror = () => { logoImg.style.display='none'; console.warn(`Kundenlogo für ${customerInfo.name} konnte nicht geladen werden: ${customerInfo.logoUrl}`); };
                    customerRow.appendChild(logoImg);
                } else {
                    const logoPlaceholder = document.createElement('div');
                    logoPlaceholder.style.width = '32px'; logoPlaceholder.style.height = '32px'; logoPlaceholder.style.borderRadius = '50%';
                    logoPlaceholder.style.backgroundColor = '#ccc'; logoPlaceholder.style.marginRight = '8px';
                    customerRow.appendChild(logoPlaceholder);
                }

                const customerNameSpan = document.createElement('span');
                customerNameSpan.classList.add('video-feed-customer');
                customerNameSpan.textContent = customerInfo.name;
                customerNameSpan.style.fontWeight = 'bold';
                customerRow.appendChild(customerNameSpan);
                feedContainer.appendChild(customerRow);
            }

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
                const errorP = document.createElement('p');
                errorP.style.color = 'red'; errorP.style.padding = '10px'; errorP.style.border = '1px solid red';
                errorP.textContent = 'Video konnte nicht geladen werden.';
                if(videoElement.parentNode === feedContainer) {
                     feedContainer.replaceChild(errorP, videoElement);
                }
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
    // --- NEUES LOG ---
    console.log("🏁 applyFiltersAndRender aufgerufen.");

    // Stelle sicher, dass Kundendaten geladen sind, bevor gefiltert wird
    // Diese Prüfung ist eher relevant für Event-Handler, weniger für den Initialaufruf
    if (Object.keys(allCustomerData).length === 0 && allVideoItems.length > 0) { // Prüfe nur, wenn Videos schon geladen sein sollten
         console.warn("Kundendaten noch nicht geladen, obwohl Videos vorhanden sind. Filterung könnte unvollständig sein.");
         // Nicht abbrechen, damit zumindest Videos ohne Kundeninfo angezeigt werden könnten
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
        // --- NEU: Zuerst Kundendaten laden ---
        console.log("Schritt 1: Starte Laden der Kundendaten.");
        const customerDataLoaded = await fetchAllCustomerData();
        // --- NEUES LOG ---
        console.log(`Schritt 2: Kundendaten Lade-Status: ${customerDataLoaded}`);

        if (!customerDataLoaded) {
             const container = document.getElementById(videoContainerId);
             if (container) container.innerHTML = "<p>Fehler beim Laden der Kundendaten. Videos können nicht angezeigt werden.</p>";
             renderFilterTags([]);
             return;
        }

        // --- NEUES LOG ---
        console.log(`Schritt 3: Starte Laden der Videos.`);
        allVideoItems = await fetchAllCollectionItems(VIDEO_COLLECTION_ID);
        // --- NEUES LOG ---
        console.log(`Schritt 4: Videos geladen? ${allVideoItems !== null ? 'Ja' : 'Nein'}. Anzahl: ${allVideoItems?.length ?? 0}`);


        if (allVideoItems && allVideoItems.length > 0) {
            console.log(`📹 ${allVideoItems.length} Video(s) insgesamt erfolgreich geladen.`);

            // Event Listener einrichten (wie zuvor)
            filterConfig.forEach(group => { /* ... */ });
            const searchInput = document.getElementById(searchInputId);
            if (searchInput) { /* ... */ }
            else { console.warn(`⚠️ Such-Eingabefeld mit ID '${searchInputId}' nicht im DOM gefunden.`); }

             // --- NEUES LOG ---
            console.log("Schritt 5: Rufe initial applyFiltersAndRender auf.");
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
    console.log("🚀 DOM geladen. Starte Ladevorgänge..."); // Log bleibt

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
