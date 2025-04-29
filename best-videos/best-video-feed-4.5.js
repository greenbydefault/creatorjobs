// 🌐 Optimierte Webflow API Integration für GitHub-Hosting

// 🔧 Konfiguration
const API_BASE_URL = "https://api.webflow.com/v2/collections";
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url="; // Dein Worker-Endpunkt
const VIDEO_COLLECTION_ID = "680b45a22b15fa4643ebdca9"; // Video Collection
const CUSTOMER_COLLECTION_ID = "6448faf9c5a8a15f6cc05526"; // Kunden/Member Collection
const API_LIMIT = 100; // Max Items pro API-Aufruf

// Globale Variablen
let allVideoItems = []; // Speichert alle geladenen Video-Items
let allCustomerData = {}; // Speicher für *relevante* Kundendaten (ID -> {name, logoUrl})
const videoContainerId = "video-container"; // ID des Hauptcontainers für Videos
const filterTagWrapperId = "filter-tag-wrapper"; // ID des Wrappers für aktive Filter-Tags
const searchInputId = "filter-search"; // ID des Such-Eingabefelds
const filterResetButtonId = "filter-reset"; // ID des "Alle Filter löschen"-Buttons
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
            // NEUER Kunde (29.04.2025 - Teil 3)
            { id: "o2", value: "667c15ac8883530952e83903", display: "Kunde: o2" }
        ]
    }
];

// --- Konfiguration für Suchfelder ---
// Feldnamen in Webflow, die durchsucht werden sollen
const searchableFields = ['name', 'creator', 'beschreibung', 'video-name', 'produktionsort'];

// 🛠️ Hilfsfunktionen

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
                // Versuche, eine detailliertere Fehlermeldung aus dem JSON-Body zu extrahieren
                const errorData = await response.json();
                errorText = `${errorText} - ${errorData.message || JSON.stringify(errorData)}`;
            } catch (e) {
                // Fallback, falls der Body kein JSON ist
                errorText = `${errorText} - ${await response.text()}`;
            }
            throw new Error(`API-Fehler: ${errorText}`);
        }
        return await response.json(); // Gibt die geparsten JSON-Daten zurück
    } catch (error) {
        console.error(`❌ Fehler beim Abrufen von ${apiUrl} über ${workerUrl}: ${error.message}`);
        return null; // Gibt null zurück, um den Fehler anzuzeigen
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

            // Prüfe, ob die Paginierung abgeschlossen ist
            if (data.pagination && totalFetched >= data.pagination.total) {
                hasMore = false; // Alle erwarteten Items laut 'total' wurden geladen
                console.log(`✅ Alle ${data.pagination.total} Items für ${collectionId} geladen.`);
            } else if (data.items.length < API_LIMIT) {
                 hasMore = false; // Weniger Items als das Limit zurückgegeben, Annahme: Ende erreicht
                 console.log(`✅ Weniger als ${API_LIMIT} Items zurückgegeben für ${collectionId}, Annahme: Alle Items geladen (Gesamt: ${totalFetched}).`);
            } else {
                 offset += API_LIMIT; // Es gibt wahrscheinlich mehr Items, erhöhe den Offset
            }
        } else {
            console.error(`❌ Fehler beim Abrufen von Items für ${collectionId} bei Offset ${offset}. Breche Abruf ab.`);
            return null; // Fehler beim Abrufen, gib null zurück
        }
    }
    return allItems; // Gibt das Array mit allen gesammelten Items zurück
}

/**
 * Ruft ein einzelnes Item aus einer Webflow Collection ab.
 * @param {string} collectionId - Die ID der Webflow Collection.
 * @param {string} itemId - Die ID des spezifischen Items.
 * @returns {Promise<object|null>} Ein Promise, das das Item-Objekt oder null bei Fehler zurückgibt.
 */
async function fetchSingleItem(collectionId, itemId) {
    const apiUrl = `${API_BASE_URL}/${collectionId}/items/${itemId}/live`;
    return await fetchWebflowData(apiUrl); // Nutzt die zentrale Abruffunktion
}

/**
 * Lädt die Daten (Name, Logo) für eine Liste von Kunden-IDs und speichert sie in `allCustomerData`.
 * @param {Array<string>} customerIds - Ein Array mit den zu ladenden Kunden-IDs.
 * @returns {Promise<boolean>} Ein Promise, das true bei Erfolg oder false bei schwerwiegenden Fehlern zurückgibt.
 */
async function fetchRelevantCustomerData(customerIds) {
    // Wenn keine IDs vorhanden sind, ist nichts zu tun.
    if (!customerIds || customerIds.length === 0) {
        console.log("Keine relevanten Kunden-IDs gefunden, überspringe Datenabruf.");
        allCustomerData = {}; // Stelle sicher, dass der Speicher leer ist
        return true; // Kein Fehler, aber auch keine Daten geladen
    }

    console.log(`🤵‍♂️ Lade Daten für ${customerIds.length} relevante(n) Kunden...`);
    // Erstelle ein Array von Promises, um alle Kunden parallel abzurufen
    const customerPromises = customerIds.map(id => fetchSingleItem(CUSTOMER_COLLECTION_ID, id));

    try {
        // Warte, bis alle Promises abgeschlossen sind
        const customerItems = await Promise.all(customerPromises);

        // Verarbeite die Ergebnisse und fülle das `allCustomerData`-Objekt
        allCustomerData = customerItems.reduce((map, customer) => {
            // Prüfe, ob der Abruf erfolgreich war und das Item Daten enthält
            if (customer && customer.id && customer.fieldData) {
                map[customer.id] = {
                    name: customer.fieldData.name || 'Unbekannter Kunde', // Fallback-Name
                    logoUrl: customer.fieldData['user-profile-img'] || null // Direkt die URL, falls vorhanden
                };
            } else if (customer === null) {
                // Ein einzelner Abruf ist fehlgeschlagen (Fehler wurde bereits geloggt)
                console.warn("   -> Ein Kunde konnte nicht geladen werden (siehe vorherige Fehlermeldung).");
            }
            return map;
        }, {}); // Starte mit einem leeren Objekt

        console.log(`👍 ${Object.keys(allCustomerData).length} von ${customerIds.length} relevanten Kundendaten erfolgreich geladen und verarbeitet.`);
        return true; // Erfolg
    } catch (error) {
        // Fängt Fehler ab, die von Promise.all geworfen werden könnten (sollte selten sein)
        console.error("❌ Schwerwiegender Fehler beim parallelen Abrufen der Kundendaten:", error);
        allCustomerData = {}; // Setze den Speicher bei Fehlern zurück
        return false; // Schwerwiegender Fehler
    }
}


// 🎨 Rendering-Funktionen

/**
 * Rendert die Video-Items im angegebenen Container mit angepasster HTML-Struktur.
 * @param {Array<object>} videoItems - Das Array der zu rendernden Video-Items.
 * @param {string} containerId - Die ID des HTML-Containers, in den gerendert werden soll.
 */
function renderVideos(videoItems, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Video-Container mit ID '${containerId}' nicht gefunden.`);
        return;
    }
    const fragment = document.createDocumentFragment(); // Effizienteres DOM-Update

    // Fall: Keine Videos zum Anzeigen
    if (!videoItems || videoItems.length === 0) {
        container.innerHTML = "<p>Keine Videos entsprechen den aktuellen Filtern oder der Suche.</p>";
        return;
    }

    videoItems.forEach((item, index) => {
        // Sicherheitsprüfung für ungültige Items
        if (!item || !item.fieldData) {
            console.warn("Ungültiges Video-Item übersprungen:", item);
            return;
        }
        const fieldData = item.fieldData;
        let videoLink = fieldData['video-link']; // Hole den Video-Link
        const kundenIds = fieldData['kunden']; // Hole die verknüpften Kunden-IDs (Array)

        // Prüfe, ob ein Video-Link vorhanden ist
        if (videoLink) {
            // Füge ?download=1 oder &download=1 hinzu, falls nicht vorhanden (Workaround für bestimmte Hoster?)
            if (!videoLink.includes('&download=1') && !videoLink.includes('?download=1')) {
                videoLink += (videoLink.includes('?') ? '&' : '?') + 'download=1';
            }

            // --- Äußerer Container für den gesamten Eintrag ---
            const feedContainer = document.createElement("div");
            feedContainer.classList.add("video-feed-container"); // Behält die äußere Klasse

            // Hole Kundeninformationen für den *ersten* verknüpften Kunden
            const firstCustomerId = (Array.isArray(kundenIds) && kundenIds.length > 0) ? kundenIds[0] : null;
            const customerInfo = firstCustomerId ? allCustomerData[firstCustomerId] : null;

            // --- Kundeninfo-Zeile (nur wenn Kundendaten vorhanden sind) ---
            if (customerInfo) {
                const customerRow = document.createElement('div');
                customerRow.classList.add('video-feed-row'); // Klasse für die Kundenzeile

                // Kundenlogo (mit Fallback/Fehlerbehandlung)
                if (customerInfo.logoUrl) {
                    const logoImg = document.createElement('img');
                    logoImg.classList.add('video-feed-logo');
                    logoImg.src = customerInfo.logoUrl;
                    logoImg.alt = `${customerInfo.name} Logo`;
                    logoImg.loading = 'lazy'; // Lazy Loading für Bilder
                    // Fehlerbehandlung, falls das Logo nicht geladen werden kann
                    logoImg.onerror = () => {
                        logoImg.style.display = 'none'; // Verstecke das defekte Bild-Element
                        console.warn(`Kundenlogo für ${customerInfo.name} konnte nicht geladen werden: ${customerInfo.logoUrl}`);
                        // Optional: Platzhalter anzeigen
                        const placeholder = document.createElement('div');
                        placeholder.classList.add('video-feed-logo-placeholder'); // Eigene Klasse für Platzhalter-Styling
                        // Sicherstellen, dass customerNameSpan existiert, bevor insertBefore aufgerufen wird
                        const customerNameSpan = customerRow.querySelector('.video-feed-customer');
                        if (customerNameSpan) {
                            customerRow.insertBefore(placeholder, customerNameSpan); // Füge Platzhalter vor dem Namen ein
                        } else {
                            customerRow.appendChild(placeholder); // Füge am Ende hinzu, falls Name nicht da ist
                        }
                    };
                    customerRow.appendChild(logoImg);
                } else {
                    // Optional: Platzhalter anzeigen, wenn kein Logo vorhanden ist
                    const logoPlaceholder = document.createElement('div');
                    logoPlaceholder.classList.add('video-feed-logo-placeholder');
                    customerRow.appendChild(logoPlaceholder);
                }

                // Kundenname
                const customerNameSpan = document.createElement('span');
                customerNameSpan.classList.add('video-feed-customer');
                customerNameSpan.textContent = customerInfo.name;
                customerRow.appendChild(customerNameSpan);

                feedContainer.appendChild(customerRow); // Füge Kundenzeile zum äußeren Container hinzu
            } else if (firstCustomerId) {
                // Warnung, wenn eine Kunden-ID vorhanden ist, aber keine Daten gefunden wurden
                console.warn(`Kundendaten für ID ${firstCustomerId} nicht in allCustomerData gefunden.`);
                // Optional: Leere Zeile oder Platzhalter einfügen
            }

            // --- Innerer Container für das Video ---
            const videoInnerContainer = document.createElement('div');
            videoInnerContainer.classList.add('feed-video-container'); // Wrapper für das Video-Element

            // --- Video-Element ---
            const videoElement = document.createElement('video');
            videoElement.playsInline = true; // Wichtig für mobile Browser
            videoElement.preload = "metadata"; // Lädt nur Metadaten initial
            videoElement.controls = true; // Zeigt Standard-Videosteuerung an
            videoElement.classList.add('db-video-player'); // Klasse für das Video selbst
            videoElement.id = `db-user-video--${item.id || index}`; // Eindeutige ID

            const sourceElement = document.createElement('source');
            sourceElement.src = videoLink;
            sourceElement.type = 'video/mp4'; // Annahme: MP4 Format

            videoElement.appendChild(sourceElement);
            videoElement.appendChild(document.createTextNode('Dein Browser unterstützt das Video-Tag nicht.')); // Fallback-Text

            // Fehlerbehandlung für das Video-Element
            videoElement.addEventListener('error', (e) => {
                console.error(`Fehler beim Laden von Video ${videoElement.id} von ${videoLink}:`, e);
                const errorP = document.createElement('p');
                // Style die Fehlermeldung direkt oder über CSS-Klassen
                errorP.style.color = 'red';
                errorP.style.padding = '10px';
                errorP.style.border = '1px solid red';
                errorP.textContent = 'Video konnte nicht geladen werden.';
                // Ersetze den *Inhalt* des inneren Video-Containers durch die Fehlermeldung
                videoInnerContainer.innerHTML = ''; // Entferne das fehlerhafte Video-Element
                videoInnerContainer.appendChild(errorP);
            }, { once: true }); // Listener nur einmal ausführen

            // Füge Video zum *inneren* Container hinzu
            videoInnerContainer.appendChild(videoElement);
            // Füge den *inneren* Container zum *äußeren* Container hinzu
            feedContainer.appendChild(videoInnerContainer);

            // Füge den gesamten äußeren Container zum Fragment hinzu
            fragment.appendChild(feedContainer);

        } else {
            // Warnung, wenn ein Video-Item keinen Link hat
            console.warn(`⚠️ Video-Item ${item.id || index} hat keinen 'video-link'.`);
        }
    });

    // Leere den Container und füge das Fragment mit allen neuen Elementen hinzu
    container.innerHTML = "";
    container.appendChild(fragment);
}

/**
 * Rendert die Tags für die aktuell aktiven Filter.
 * @param {Array<object>} activeFiltersFlat - Ein flaches Array aller aktiven Filter-Objekte ({id, value, display, field}).
 */
function renderFilterTags(activeFiltersFlat) {
    const wrapper = document.getElementById(filterTagWrapperId);
    if (!wrapper) {
        console.warn(`⚠️ Filter-Tag-Wrapper mit ID '${filterTagWrapperId}' nicht gefunden.`);
        return;
    }
    const fragment = document.createDocumentFragment(); // Effizientes DOM-Update

    activeFiltersFlat.forEach(filter => {
        const tagElement = document.createElement('div');
        tagElement.classList.add('search-filter-tag'); // Klasse für das Tag-Styling

        const tagName = document.createElement('span');
        tagName.classList.add('tag-text');
        tagName.textContent = filter.display; // Angezeigter Name des Filters

        const removeButton = document.createElement('button');
        removeButton.classList.add('filter-close-button'); // Klasse für den Schließen-Button
        removeButton.textContent = '×'; // Standard-Schließen-Symbol
        removeButton.setAttribute('aria-label', `Filter ${filter.display} entfernen`);
        removeButton.dataset.checkboxId = filter.id; // Speichere die ID der zugehörigen Checkbox

        // Event Listener zum Entfernen des Filters beim Klick auf den Button
        removeButton.addEventListener('click', (e) => {
            const checkboxIdToRemove = e.currentTarget.dataset.checkboxId;
            const correspondingCheckbox = document.getElementById(checkboxIdToRemove);
            if (correspondingCheckbox) {
                correspondingCheckbox.checked = false; // Deaktiviere die Checkbox
                applyFiltersAndRender(); // Wende Filter neu an und rendere neu
            } else {
                // Sollte nicht passieren, wenn die IDs übereinstimmen
                console.error(`FEHLER: Konnte Checkbox mit ID ${checkboxIdToRemove} zum Entfernen nicht finden!`);
            }
        });

        tagElement.appendChild(tagName);
        tagElement.appendChild(removeButton);
        fragment.appendChild(tagElement);
    });

    // Leere den Wrapper und füge das Fragment mit den neuen Tags hinzu
    wrapper.innerHTML = '';
    wrapper.appendChild(fragment);

    // Zeige/Verstecke den Reset-Button basierend darauf, ob Filter aktiv sind
    const resetButton = document.getElementById(filterResetButtonId);
    if (resetButton) {
        // Zeige Button nur, wenn Filter aktiv sind ODER Text im Suchfeld steht
        const searchInput = document.getElementById(searchInputId);
        const isSearchActive = searchInput && searchInput.value.trim() !== "";
        resetButton.style.display = (activeFiltersFlat.length > 0 || isSearchActive) ? 'inline-block' : 'none'; // Oder 'block', je nach Layout
    }
}


// 🔄 Filterlogik und Aktualisierung

/**
 * Wendet die aktuellen Filter (Checkboxes und Suche) auf `allVideoItems` an und rendert das Ergebnis.
 */
function applyFiltersAndRender() {
     // Warnung, falls Kundendaten noch fehlen, aber Videos schon da sind
    if (Object.keys(allCustomerData).length === 0 && allVideoItems.length > 0) {
         console.warn("Kundendaten noch nicht geladen, Filterung könnte unvollständig sein (betrifft Kundenfilter).");
    }

    console.time("Filterung und Rendering"); // Zeitmessung starten

    // 1. Aktive Checkbox-Filter identifizieren
    const activeFiltersByGroup = {}; // Speichert aktive Filterwerte pro Feld { field: [value1, value2], ... }
    let allActiveCheckboxFiltersFlat = []; // Flache Liste aller aktiven Filter für Tag-Rendering
    filterConfig.forEach(group => {
        const groupField = group.field;
        activeFiltersByGroup[groupField] = []; // Initialisiere Array für jede Gruppe
        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id);
            if (checkbox && checkbox.checked) {
                activeFiltersByGroup[groupField].push(filter.value); // Füge Wert zur Gruppe hinzu
                allActiveCheckboxFiltersFlat.push({ ...filter, field: groupField }); // Füge zur flachen Liste hinzu
            }
        });
    });

    // 2. Suchbegriff holen und normalisieren
    const searchInput = document.getElementById(searchInputId);
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

    // 3. Video-Items filtern
    const filteredItems = allVideoItems.filter(item => {
        // --- Checkbox-Filter-Prüfung ---
        let matchesCheckboxFilters = true;
        for (const groupField in activeFiltersByGroup) {
            const activeValuesInGroup = activeFiltersByGroup[groupField];
            // Nur prüfen, wenn in dieser Gruppe Filter aktiv sind
            if (activeValuesInGroup.length > 0) {
                const itemFieldValue = item?.fieldData?.[groupField]; // Wert des Feldes im aktuellen Item

                // Spezialbehandlung für Multi-Referenz-Feld 'kunden'
                if (groupField === 'kunden') {
                    // Item muss ein Array von Kunden-IDs haben und mindestens eine davon muss im aktiven Filterset sein
                    if (!itemFieldValue || !Array.isArray(itemFieldValue) || !activeValuesInGroup.some(id => itemFieldValue.includes(id))) {
                        matchesCheckboxFilters = false;
                        break; // Item passt nicht, nächste Gruppe muss nicht geprüft werden
                    }
                // Spezialbehandlung für Einfachauswahlfelder (Options/Select)
                } else if (groupField === 'creatortype' || groupField === 'produktion' || groupField === 'anzeige') {
                    // Item muss einen Wert haben und dieser muss im aktiven Filterset sein
                     if (itemFieldValue === undefined || itemFieldValue === null || !activeValuesInGroup.includes(itemFieldValue)) {
                        matchesCheckboxFilters = false;
                        break;
                    }
                // Standardbehandlung für andere Felder (angenommen Text oder ähnliches)
                } else {
                    // Normalisiere Item-Wert und vergleiche mit normalisierten Filterwerten
                    const itemValueLower = String(itemFieldValue || '').toLowerCase(); // Sicherstellen, dass es ein String ist
                    const normalizedActiveValues = activeValuesInGroup.map(v => String(v || '').toLowerCase());
                    if (!itemValueLower || !normalizedActiveValues.includes(itemValueLower)) {
                        matchesCheckboxFilters = false;
                        break;
                    }
                }
            }
        }
        // Wenn Checkbox-Filter nicht passen, schließe das Item aus
        if (!matchesCheckboxFilters) return false;

        // --- Suchbegriff-Prüfung ---
        let matchesSearchTerm = true;
        if (searchTerm) { // Nur prüfen, wenn ein Suchbegriff eingegeben wurde
            matchesSearchTerm = false; // Annahme: passt nicht, bis Übereinstimmung gefunden wird
            for (const field of searchableFields) {
                const fieldValue = item?.fieldData?.[field];
                // Prüfe, ob das Feld existiert, ein String ist und den Suchbegriff enthält
                if (fieldValue && typeof fieldValue === 'string' && fieldValue.toLowerCase().includes(searchTerm)) {
                    matchesSearchTerm = true;
                    break; // Übereinstimmung gefunden, keine weiteren Felder prüfen
                }
                 // Suche auch in Kundenamen (wenn Kundendaten geladen sind) - Korrigierte Logik
                 if (field === 'kunden' && Array.isArray(item?.fieldData?.kunden) && Object.keys(allCustomerData).length > 0) {
                    const customerNames = item.fieldData.kunden
                        .map(id => allCustomerData[id]?.name) // Hole Namen aus geladenen Daten
                        .filter(name => name) // Entferne undefinierte Namen
                        .join(' ') // Füge Namen zu einem String zusammen
                        .toLowerCase();
                    if (customerNames.includes(searchTerm)) {
                        matchesSearchTerm = true;
                        break; // Übereinstimmung im Kundennamen gefunden
                    }
                }
            }
        }
        // Item passt nur, wenn es sowohl Checkbox-Filtern als auch dem Suchbegriff entspricht
        return matchesSearchTerm;
    });

    // 4. Aktive Checkbox-Filter-Tags rendern (und Reset-Button steuern)
    renderFilterTags(allActiveCheckboxFiltersFlat);

    // 5. Gefilterte Videos rendern
    renderVideos(filteredItems, videoContainerId);

    console.timeEnd("Filterung und Rendering"); // Zeitmessung beenden
    console.log(`📊 ${filteredItems.length} von ${allVideoItems.length} Videos angezeigt.`);
}

/**
 * Setzt alle Filter (Checkboxes und Suche) zurück und rendert neu.
 */
function clearAllFilters() {
    console.log("🧹 Setze alle Filter zurück...");

    // 1. Alle Checkboxen deaktivieren
    filterConfig.forEach(group => {
        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id);
            if (checkbox) {
                checkbox.checked = false;
            }
        });
    });

    // 2. Suchfeld leeren
    const searchInput = document.getElementById(searchInputId);
    if (searchInput) {
        searchInput.value = "";
    }

    // 3. Filter anwenden und neu rendern (dies aktualisiert auch die Tags und den Reset-Button)
    applyFiltersAndRender();
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

        // Fehlerbehandlung: Abbruch, wenn Videos nicht geladen werden konnten
        if (allVideoItems === null) {
             console.error("Fehler beim Laden der Video-Items. Breche ab.");
             const container = document.getElementById(videoContainerId);
             if (container) container.innerHTML = "<p>Fehler beim Laden der Videos.</p>";
             renderFilterTags([]); // Leere Filter-Tags anzeigen
             return; // Funktion beenden
        }
        // Fall: Keine Videos in der Collection gefunden
        if (allVideoItems.length === 0) {
             console.log("Keine Video-Items gefunden.");
             renderVideos([], videoContainerId); // Leeren Container rendern
             renderFilterTags([]); // Leere Filter-Tags
             return; // Funktion beenden
        }
        console.log(`📹 ${allVideoItems.length} Video(s) insgesamt erfolgreich geladen.`);

        // --- SCHRITT 2: Relevante Kunden-IDs sammeln ---
        const relevantCustomerIds = new Set(); // Set vermeidet Duplikate automatisch
        allVideoItems.forEach(item => {
            const kunden = item?.fieldData?.kunden;
            if (Array.isArray(kunden)) {
                kunden.forEach(id => relevantCustomerIds.add(id));
            }
        });
        const uniqueCustomerIds = Array.from(relevantCustomerIds); // Umwandlung in Array für den Abruf
        console.log(`Schritt 3: ${uniqueCustomerIds.length} einzigartige Kunden-IDs in Videos gefunden.`);

        // --- SCHRITT 3: Relevante Kundendaten laden ---
        const customerDataLoaded = await fetchRelevantCustomerData(uniqueCustomerIds);
        console.log(`Schritt 4: Relevante Kundendaten Lade-Status: ${customerDataLoaded}`);

        // Warnung, wenn Kundendaten nicht geladen werden konnten, aber fahre fort
        if (!customerDataLoaded) {
             console.warn("Fehler beim Laden der relevanten Kundendaten. Videos werden ohne vollständige Kundeninformationen angezeigt.");
             allCustomerData = {}; // Stelle sicher, dass es ein leeres Objekt ist
        }

        // --- SCHRITT 4: Event Listener einrichten ---
        console.log("Schritt 5: Richte Event Listener ein.");

        // Event Listener für Filter-Checkboxes
        filterConfig.forEach(group => {
            group.filters.forEach(filter => {
                const checkbox = document.getElementById(filter.id);
                if (checkbox) {
                    checkbox.addEventListener('change', applyFiltersAndRender); // Bei Änderung Filter anwenden
                } else {
                    console.warn(`⚠️ Filter-Checkbox mit ID '${filter.id}' nicht im DOM gefunden.`);
                }
            });
        });

        // Event Listener für das Suchfeld (mit Debouncing)
        const searchInput = document.getElementById(searchInputId);
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                clearTimeout(searchDebounceTimer); // Bestehenden Timer löschen
                // Neuen Timer starten, der applyFiltersAndRender nach kurzer Pause aufruft
                searchDebounceTimer = setTimeout(() => {
                    applyFiltersAndRender();
                }, DEBOUNCE_DELAY);
            });
            console.log(`✅ Event Listener (debounced) für Suchfeld '${searchInputId}' eingerichtet.`);
        } else {
            console.warn(`⚠️ Such-Eingabefeld mit ID '${searchInputId}' nicht im DOM gefunden.`);
        }

        // Event Listener für den Reset-Button
        const resetButton = document.getElementById(filterResetButtonId);
        if (resetButton) {
            resetButton.addEventListener('click', clearAllFilters); // Bei Klick alle Filter löschen
            resetButton.style.display = 'none'; // Initial ausblenden
            console.log(`✅ Event Listener für Reset-Button '${filterResetButtonId}' eingerichtet.`);
        } else {
            console.warn(`⚠️ Reset-Button mit ID '${filterResetButtonId}' nicht im DOM gefunden.`);
        }

        // --- SCHRITT 5: Initiales Rendern ---
        console.log("Schritt 6: Rufe initial applyFiltersAndRender auf.");
        applyFiltersAndRender(); // Zeige alle Videos initial an (oder gefiltert, falls Checkboxen voreingestellt sind)

    } catch (error) {
        // Fängt unerwartete Fehler in der Hauptlogik ab
        console.error("❌ Schwerwiegender Fehler beim Anzeigen der Video-Collection:", error);
        const container = document.getElementById(videoContainerId);
        if (container) container.innerHTML = "<p>Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.</p>";
        renderFilterTags([]); // Leere Filter-Tags
    }
}

// --- Start der Anwendung ---
// Warte, bis das gesamte HTML-Dokument geladen und geparst ist
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM geladen. Starte Ladevorgänge...");

    // Prüfe, ob die notwendigen Container-Elemente vorhanden sind
    const videoContainerExists = !!document.getElementById(videoContainerId);
    const tagWrapperExists = !!document.getElementById(filterTagWrapperId);
    // Optional: Prüfe auch, ob Filter-Elemente und Suchfeld existieren, falls kritisch

    if (videoContainerExists && tagWrapperExists) {
         displayVideoCollection(); // Starte die Hauptfunktion
    } else {
        // Logge detaillierte Fehler, wenn Elemente fehlen
        if (!videoContainerExists) console.error(`FEHLER: Video-Container ('${videoContainerId}') nicht gefunden!`);
        if (!tagWrapperExists) console.error(`FEHLER: Filter-Tag-Wrapper ('${filterTagWrapperId}') nicht gefunden!`);
        console.error("Video-Feed kann nicht initialisiert werden, da wichtige HTML-Elemente fehlen.");
        // Optional: Fehlermeldung im UI anzeigen
        const body = document.querySelector('body');
        if (body) {
            const errorMsg = document.createElement('p');
            errorMsg.textContent = "Fehler: Notwendige Elemente zum Anzeigen der Videos fehlen auf der Seite.";
            errorMsg.style.color = "red";
            errorMsg.style.fontWeight = "bold";
            body.prepend(errorMsg); // Füge die Meldung am Anfang des Body ein
        }
    }
});
