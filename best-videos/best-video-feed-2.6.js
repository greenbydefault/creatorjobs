// 🌐 Optimierte Webflow API Integration für GitHub-Hosting

// 🔧 Konfiguration
const API_BASE_URL = "https://api.webflow.com/v2/collections";
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url=";
const VIDEO_COLLECTION_ID = "680b45a22b15fa4643ebdca9";
// --- NEU: Kunden Collection ID ---
const CUSTOMER_COLLECTION_ID = "6448faf9c5a8a15f6cc05526"; // Die "Member" Collection für Kundendaten
const API_LIMIT = 100; // Max items per Webflow API request

// Globale Variablen
let allVideoItems = [];
let allCustomerData = {}; // --- NEU: Speicher für Kundendaten (ID -> {name, logoUrl}) ---
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
            // --- NEU: Chefkoch hinzugefügt ---
            // Annahme: Checkbox ID ist 'chefkoch'
            { id: "chefkoch", value: "679213a19cc8609f08cc4565", display: "Kunde: Chefkoch" }
            // Füge hier weitere Kundenfilter hinzu...
        ]
    }
];

// --- Konfiguration für Suchfelder ---
const searchableFields = ['name', 'creator', 'beschreibung', 'video-name', 'produktionsort']; // Felder ohne Option-IDs

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
            return null; // Fehler signalisieren
        }
    }
    return allItems;
}

/**
 * --- NEU: Lädt alle Kundendaten und speichert sie in einer Map. ---
 * @returns {Promise<boolean>} True bei Erfolg, False bei Fehler.
 */
async function fetchAllCustomerData() {
    console.log("🤵‍♂️ Lade Kundendaten...");
    const customerItems = await fetchAllCollectionItems(CUSTOMER_COLLECTION_ID);

    if (customerItems === null) {
        console.error("❌ Fehler beim Laden der Kundendaten.");
        allCustomerData = {}; // Leeres Objekt im Fehlerfall
        return false;
    }

    // Konvertiere das Array in ein Objekt/Map für schnellen Zugriff über die Kunden-ID
    allCustomerData = customerItems.reduce((map, customer) => {
        if (customer && customer.id && customer.fieldData) {
            map[customer.id] = {
                // Feldname für Kundenname ist 'name'
                name: customer.fieldData.name || 'Unbekannter Kunde',
                // Feldname für Logo ist 'user-profile-img'
                // Sicherer Zugriff auf verschachtelte URL
                logoUrl: customer.fieldData['user-profile-img']?.url || null
            };
        }
        return map;
    }, {});

    console.log(`👍 ${Object.keys(allCustomerData).length} Kundendaten erfolgreich geladen und verarbeitet.`);
    // console.log("Kundendaten:", allCustomerData); // Optional: Zur Überprüfung ausgeben
    return true;
}


// 🎨 Rendering-Funktionen

/**
 * Rendert die Video-Items im angegebenen Container, inkl. Kundeninfo.
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
        const kundenIds = fieldData['kunden']; // Array der Kunden-IDs

        if (videoLink) {
            // Link-Anpassung
            if (!videoLink.includes('&download=1')) {
                 if (videoLink.includes('?')) { videoLink += '&download=1'; }
                 else { videoLink += '?download=1'; }
            }

            const feedContainer = document.createElement("div");
            feedContainer.classList.add("video-feed-container");

            // --- NEU: Kundeninfo hinzufügen ---
            // Nimm den ersten Kunden aus der Liste, falls vorhanden
            const firstCustomerId = (Array.isArray(kundenIds) && kundenIds.length > 0) ? kundenIds[0] : null;
            const customerInfo = firstCustomerId ? allCustomerData[firstCustomerId] : null;

            if (customerInfo) {
                const customerRow = document.createElement('div');
                customerRow.classList.add('video-feed-row'); // Klasse für die Zeile
                customerRow.style.display = 'flex'; // Flexbox für Anordnung
                customerRow.style.alignItems = 'center'; // Vertikal zentrieren
                customerRow.style.marginBottom = '10px'; // Abstand zum Video

                // Kundenlogo
                if (customerInfo.logoUrl) {
                    const logoImg = document.createElement('img');
                    logoImg.classList.add('video-feed-logo'); // Klasse für das Logo
                    logoImg.src = customerInfo.logoUrl;
                    logoImg.alt = `${customerInfo.name} Logo`;
                    logoImg.style.width = '32px'; // Beispielgröße
                    logoImg.style.height = '32px'; // Beispielgröße
                    logoImg.style.borderRadius = '50%'; // Rundes Logo
                    logoImg.style.marginRight = '8px'; // Abstand zum Namen
                    logoImg.onerror = () => { logoImg.style.display='none'; console.warn(`Kundenlogo für ${customerInfo.name} konnte nicht geladen werden: ${customerInfo.logoUrl}`); }; // Verstecke bei Ladefehler
                    customerRow.appendChild(logoImg);
                } else {
                    // Optional: Platzhalter, wenn kein Logo vorhanden
                    const logoPlaceholder = document.createElement('div');
                    logoPlaceholder.style.width = '32px'; logoPlaceholder.style.height = '32px'; logoPlaceholder.style.borderRadius = '50%';
                    logoPlaceholder.style.backgroundColor = '#ccc'; logoPlaceholder.style.marginRight = '8px';
                    customerRow.appendChild(logoPlaceholder);
                }

                // Kundenname
                const customerNameSpan = document.createElement('span');
                customerNameSpan.classList.add('video-feed-customer'); // Klasse für den Namen
                customerNameSpan.textContent = customerInfo.name;
                customerNameSpan.style.fontWeight = 'bold'; // Beispiel-Styling
                customerRow.appendChild(customerNameSpan);

                // Füge die Kundeninfo-Zeile *vor* dem Video ein
                feedContainer.appendChild(customerRow);
            }
            // --- Ende Kundeninfo ---


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
                // Zeige Fehler nur im Video-Bereich an, lasse Kundeninfo stehen
                const errorP = document.createElement('p');
                errorP.style.color = 'red'; errorP.style.padding = '10px'; errorP.style.border = '1px solid red';
                errorP.textContent = 'Video konnte nicht geladen werden.';
                // Ersetze Video durch Fehlermeldung
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
    // Stelle sicher, dass Kundendaten geladen sind, bevor gefiltert wird
    if (Object.keys(allCustomerData).length === 0) {
         console.warn("Kundendaten noch nicht geladen, Filterung übersprungen.");
         // Optional: Zeige eine Ladeanzeige oder warte.
         // Fürs Erste wird einfach nichts gefiltert, bis die Daten da sind (passiert beim Initialaufruf).
         return;
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
        // a) Checkbox-Filter
        let matchesCheckboxFilters = true;
        for (const groupField in activeFiltersByGroup) {
            const activeValuesInGroup = activeFiltersByGroup[groupField];

            if (activeValuesInGroup.length > 0) {
                const itemFieldValue = item?.fieldData?.[groupField];

                if (groupField === 'kunden') {
                    if (!itemFieldValue || !Array.isArray(itemFieldValue)) {
                        matchesCheckboxFilters = false; break;
                    }
                    const hasMatchingKunde = activeValuesInGroup.some(activeKundenId =>
                        itemFieldValue.includes(activeKundenId)
                    );
                    if (!hasMatchingKunde) { matchesCheckboxFilters = false; break; }
                }
                else if (groupField === 'creatortype' || groupField === 'produktion' || groupField === 'anzeige') {
                    if (itemFieldValue === undefined || itemFieldValue === null || !activeValuesInGroup.includes(itemFieldValue)) {
                        matchesCheckboxFilters = false; break;
                    }
                }
                else { // Sollte nicht mehr vorkommen, da alle Felder Option oder Ref sind
                    const itemValueLower = itemFieldValue?.toLowerCase();
                    const normalizedActiveValues = activeValuesInGroup.map(v => v.toLowerCase());
                    if (itemValueLower === undefined || itemValueLower === null || !normalizedActiveValues.includes(itemValueLower)) {
                        matchesCheckboxFilters = false; break;
                    }
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

    console.timeEnd("Filterung und Rendering");
    console.log(`📊 ${filteredItems.length} von ${allVideoItems.length} Videos angezeigt.`);
}


// 🚀 Initialisierung und Hauptfunktionen

/**
 * Lädt die Video-Collection und Kundendaten, richtet Filter-Events ein und rendert den initialen Zustand.
 */
async function displayVideoCollection() {
    try {
        // --- NEU: Zuerst Kundendaten laden ---
        const customerDataLoaded = await fetchAllCustomerData();
        if (!customerDataLoaded) {
             // Fehler beim Laden der Kundendaten, Abbruch oder Fallback
             const container = document.getElementById(videoContainerId);
             if (container) container.innerHTML = "<p>Fehler beim Laden der Kundendaten. Videos können nicht angezeigt werden.</p>";
             renderFilterTags([]);
             return; // Abbruch
        }

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

            // Initialen Zustand rendern (jetzt nachdem Kundendaten geladen sind)
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
