// 🌐 Optimierte Webflow API Integration für GitHub-Hosting

// 🔧 Konfiguration
const API_BASE_URL = "https://api.webflow.com/v2/collections";
// WICHTIG: Ersetze dies mit deiner tatsächlichen Worker-URL, falls anders
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url=";
// Collection IDs - Überprüfe diese IDs
const JOB_COLLECTION_ID = "6448faf9c5a8a17455c05525"; // Für gebuchte Jobs (falls noch verwendet)
const USER_COLLECTION_ID = "6448faf9c5a8a15f6cc05526"; // Für Benutzerdaten (falls noch verwendet)
const VIDEO_COLLECTION_ID = "680b45a22b15fa4643ebdca9"; // Deine Video Collection ID

// Globale Variablen
let currentWebflowMemberId = null; // Für Memberstack-Integration (falls verwendet)
let allVideoItems = []; // Speicher für alle geladenen Video-Items
const videoContainerId = "video-container"; // ID des HTML-Containers für Videos
const filterTagWrapperId = "filter-tag-wrapper"; // ID des HTML-Containers für Filter-Tags

// --- Filterkonfiguration ---
// Definiert die Filteroptionen, ihre zugehörigen Checkbox-IDs im HTML,
// die Webflow-Feld-IDs (Slugs) und die Werte, nach denen gefiltert wird.
const filterConfig = [
    {
        field: 'kategorie', // Webflow Feld-ID (Slug)
        filters: [
            // Verwende die von dir angegebenen Checkbox-IDs
            { id: "influencer", value: "influencer", display: "Kategorie: Influencer" },
            { id: "ugc", value: "ugc", display: "Kategorie: UGC" }
        ]
    },
    {
        field: 'produktionsort', // Webflow Feld-ID (Slug)
        filters: [
            // Werte auf Kleinschreibung normalisiert für robusten Vergleich
            { id: "vorort", value: "vor ort", display: "Ort: Vor Ort" }, // Achte auf Kleinschreibung bei 'value'
            { id: "creatorproduktion", value: "creatorproduktion", display: "Ort: Creatorproduktion" }
        ]
    },
    {
        field: 'anzeigentype', // Webflow Feld-ID (Slug)
        filters: [
            { id: "paid", value: "paid", display: "Typ: Paid" },
            // Checkbox-ID ist 'werbung', der Wert im CMS ist 'Werbeanzeige'
            { id: "werbung", value: "werbeanzeige", display: "Typ: Werbeanzeige" }
        ]
    }
    // Füge hier bei Bedarf weitere Filtergruppen hinzu (z.B. für Suche, Datum etc.)
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
 * Berechnet die verbleibende Zeit bis zu einem Enddatum und gibt Text und CSS-Klasse zurück.
 * @param {string|Date} endDate - Das Enddatum.
 * @returns {{text: string, class: string}} Objekt mit Text und CSS-Klasse.
 */
function calculateCountdown(endDate) {
    if (!endDate) return { text: "K.A.", class: "job-tag" }; // Kein Datum angegeben
    try {
        const now = new Date();
        const deadline = new Date(endDate);
        const diff = deadline - now;

        if (isNaN(deadline.getTime())) { // Prüfen, ob das Datum gültig ist
             console.warn("Ungültiges Datum für Countdown:", endDate);
             return { text: "Ungültig", class: "job-tag" };
        }

        if (diff <= 0) return { text: "Abgelaufen", class: "job-tag is-bg-light-red" }; // Deadline vorbei

        const days = Math.floor(diff / (1000 * 60 * 60 * 24)); // Verbleibende Tage

        // Unterschiedliche Klassen basierend auf Dringlichkeit
        if (days > 10) return { text: `${days} Tag(e)`, class: "job-tag" };
        if (days > 4) return { text: `${days} Tag(e)`, class: "job-tag is-bg-light-yellow" };
        return { text: `${days} Tag(e)`, class: "job-tag is-bg-light-red" };
    } catch (error) {
        console.error("Fehler bei Countdown-Berechnung:", error);
        return { text: "Fehler", class: "job-tag" };
    }
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
            // Versucht, detailliertere Fehlermeldung von Webflow zu bekommen
            let errorText = `Status: ${response.status}`;
            try {
                 const errorData = await response.json();
                 errorText = `${errorText} - ${errorData.message || JSON.stringify(errorData)}`;
            } catch (e) {
                 errorText = `${errorText} - ${await response.text()}`;
            }
            throw new Error(`API-Fehler: ${errorText}`);
        }
        return await response.json(); // Gibt die geparsten JSON-Daten zurück
    } catch (error) {
        console.error(`❌ Fehler beim Abrufen von ${apiUrl}: ${error.message}`);
        return null; // Gibt null zurück, um den Fehler anzuzeigen
    }
}

/**
 * Ruft ein einzelnes Live-Item aus einer Webflow Collection ab.
 * @param {string} collectionId - Die ID der Collection.
 * @param {string} itemId - Die ID des Items.
 * @returns {Promise<object|null>} Das Item-Objekt oder null bei Fehler.
 */
async function fetchSingleItem(collectionId, itemId) {
    // Baut die spezifische URL für ein einzelnes Live-Item
    const apiUrl = `${API_BASE_URL}/${collectionId}/items/${itemId}/live`;
    return await fetchWebflowData(apiUrl); // Nutzt die generische Abruffunktion
}

/**
 * Ruft mehrere Live-Items aus einer Webflow Collection ab (bis zu 100).
 * @param {string} collectionId - Die ID der Collection.
 * @returns {Promise<Array|null>} Ein Array der Items oder null bei Fehler.
 */
async function fetchCollectionItems(collectionId) {
    // Fügt ?limit=100 hinzu, um das Maximum pro Anfrage zu erhalten.
    // Für mehr als 100 Items wäre Paginierung mit 'offset' nötig.
    const apiUrl = `${API_BASE_URL}/${collectionId}/items/live?limit=100`;
    const data = await fetchWebflowData(apiUrl);
    // Die API gibt ein Objekt zurück, das ein 'items'-Array enthält
    return data?.items || null; // Gibt das Array oder null zurück
}

/**
 * Ruft die Feld-Daten für einen bestimmten Job ab. (Nur relevant, falls Jobs angezeigt werden)
 * @param {string} jobId - Die ID des Job-Items.
 * @returns {Promise<object|null>} Die fieldData des Jobs oder null bei Fehler.
 */
async function fetchJobData(jobId) {
    const jobItem = await fetchSingleItem(JOB_COLLECTION_ID, jobId);
    // Gibt nur das 'fieldData'-Objekt zurück, falls das Item erfolgreich geladen wurde
    return jobItem?.fieldData || null;
}


// 🎨 Rendering-Funktionen

/**
 * Rendert die Liste der gebuchten Jobs im angegebenen Container. (Nur relevant, falls Jobs angezeigt werden)
 * @param {Array<object>} jobs - Ein Array von Job-fieldData-Objekten.
 * @param {string} containerId - Die ID des HTML-Containers.
 */
function renderJobs(jobs, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Job-Container mit ID '${containerId}' nicht gefunden.`);
        return;
    }
    container.innerHTML = ""; // Leert den Container

    // Nachricht, wenn keine Jobs vorhanden sind
    if (!jobs || jobs.length === 0) {
        container.innerHTML = "<p class='no-jobs-message'>Es sieht so aus, als wäre aktuell noch kein Auftrag für dich bestätigt worden.</p>";
        return;
    }

    // Erstellt für jeden Job eine Tabellenzeile
    jobs.forEach(jobData => {
        if (!jobData) return; // Überspringt ungültige Job-Daten

        const jobLink = document.createElement("a");
        // Baut den Link zum Job, mit Fallback falls Slug fehlt
        jobLink.href = jobData.slug ? `https://www.creatorjobs.com/creator-job/${jobData.slug}` : '#';
        jobLink.target = "_blank"; // Öffnet in neuem Tab
        jobLink.style.textDecoration = "none";
        jobLink.style.color = "inherit"; // Erbt Textfarbe

        const jobDiv = document.createElement("div");
        jobDiv.classList.add("db-table-row", "db-table-booked"); // Deine CSS-Klassen

        // --- Erstellung der einzelnen Zellen (vereinfacht) ---
        // Job Info (Bild + Name)
        const jobInfoDiv = document.createElement("div");
        jobInfoDiv.classList.add("db-table-row-item", "justify-left");
        const jobImage = document.createElement("img");
        jobImage.classList.add("db-table-img", "is-margin-right-12");
        jobImage.src = jobData["job-image"]?.url || "https://placehold.co/48x48/eeeeee/cccccc?text=Job"; // Platzhalterbild
        jobImage.alt = jobData["name"] || "Job Bild";
        jobImage.style.cssText = "width: 48px; height: 48px; object-fit: cover; border-radius: 4px;"; // Basis-Styling
        jobInfoDiv.appendChild(jobImage);
        const jobName = document.createElement("span");
        jobName.classList.add("truncate"); // Für Textabschneidung (CSS benötigt)
        jobName.textContent = jobData["name"] || "Unbekannter Job";
        jobInfoDiv.appendChild(jobName);
        jobDiv.appendChild(jobInfoDiv);

        // Brand Name
        const brandNameDiv = document.createElement("div");
        brandNameDiv.classList.add("db-table-row-item");
        brandNameDiv.textContent = jobData["brand-name"] || "N/A";
        jobDiv.appendChild(brandNameDiv);

        // Budget
        const jobBudget = document.createElement("div");
        jobBudget.classList.add("db-table-row-item");
        const payment = parseFloat(jobData["job-payment"]);
        jobBudget.textContent = !isNaN(payment) ? `${payment.toFixed(2)} €` : (jobData["job-payment"] || "N/A");
        jobDiv.appendChild(jobBudget);

        // Industrie-Kategorie
        const jobCategory = document.createElement("div");
        jobCategory.classList.add("db-table-row-item");
        jobCategory.textContent = jobData["industrie-kategorie"] || "N/A";
        jobDiv.appendChild(jobCategory);

        // Deadlines (mit Countdown-Logik)
        const createDeadlineTag = (dateString) => {
            const deadlineInfo = calculateCountdown(dateString);
            const deadlineDiv = document.createElement("div");
            deadlineDiv.classList.add("db-table-row-item");
            const tag = document.createElement("div");
            // Fügt Klassen sicher hinzu, auch wenn mehrere vorhanden sind
            tag.classList.add(...deadlineInfo.class.split(" "));
            const text = document.createElement("span");
            text.classList.add("db-job-tag-txt"); // Deine CSS-Klasse für den Text im Tag
            text.textContent = deadlineInfo.text;
            tag.appendChild(text);
            deadlineDiv.appendChild(tag);
            return deadlineDiv;
        };
        jobDiv.appendChild(createDeadlineTag(jobData["fertigstellung-content"]));
        jobDiv.appendChild(createDeadlineTag(jobData["job-scriptdeadline"]));
        // --- Ende Zellen-Erstellung ---

        jobLink.appendChild(jobDiv); // Fügt die Zeile zum Link hinzu
        container.appendChild(jobLink); // Fügt den Link zum Container hinzu
    });
}

/**
 * Rendert die Video-Items im angegebenen Container.
 * @param {Array<object>} videoItems - Ein Array von Video-Item-Objekten (aus Webflow).
 * @param {string} containerId - Die ID des HTML-Containers.
 */
function renderVideos(videoItems, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Video-Container mit ID '${containerId}' nicht gefunden.`);
        return;
    }
    container.innerHTML = ""; // Leert den Container

    // Nachricht, wenn keine Videos den Filtern entsprechen
    if (!videoItems || videoItems.length === 0) {
        container.innerHTML = "<p>Keine Videos entsprechen den aktuellen Filtern.</p>";
        return;
    }

    // Erstellt für jedes Video ein HTML-Element
    videoItems.forEach((item, index) => {
        // Prüft, ob das Item und fieldData existieren
        if (!item || !item.fieldData) {
            console.warn("Ungültiges Video-Item übersprungen:", item);
            return;
        }
        const fieldData = item.fieldData;
        const videoName = fieldData['video-name']; // Holt den Namen
        const videoLink = fieldData['video-link']; // Holt den Link

        // Nur rendern, wenn ein Video-Link vorhanden ist
        if (videoLink) {
            const videoWrapper = document.createElement("div");
            videoWrapper.classList.add("video-item-wrapper"); // CSS-Klasse für Styling
            videoWrapper.style.marginBottom = "20px"; // Etwas Abstand

            // Fügt optional den Video-Namen als Überschrift hinzu
            if (videoName) {
                const nameHeading = document.createElement("h3");
                nameHeading.textContent = videoName;
                nameHeading.style.marginBottom = "8px"; // Kleiner Abstand unter der Überschrift
                videoWrapper.appendChild(nameHeading);
            }

            // Erstellt das <video>-Element sicher als HTML-String
            // Verwendet item.id für eine stabilere ID, falls vorhanden, sonst den Index
            const videoElementHTML = `
                <video playsinline preload="metadata" autobuffer controls
                       class="db-video-player" id="db-user-video--${item.id || index}">
                    <source src="${videoLink}" type="video/mp4">
                    Dein Browser unterstützt das Video-Tag nicht. </video>`;
            // Fügt das HTML sicher in den Wrapper ein
            videoWrapper.insertAdjacentHTML('beforeend', videoElementHTML);

            container.appendChild(videoWrapper); // Fügt den Wrapper zum Container hinzu
        } else {
            // Warnung, wenn einem Item der Link fehlt
            console.warn(`⚠️ Video-Item ${item.id || index} hat keinen 'video-link'.`);
        }
    });
}

/**
 * Rendert die aktiven Filter als klickbare Tags im Tag-Wrapper.
 * @param {Array<object>} activeFiltersFlat - Eine flache Liste aller aktiven Filter-Objekte.
 * Jedes Objekt sollte {id, value, display, field} enthalten.
 */
function renderFilterTags(activeFiltersFlat) {
    const wrapper = document.getElementById(filterTagWrapperId);
    if (!wrapper) {
        console.warn(`⚠️ Filter-Tag-Wrapper mit ID '${filterTagWrapperId}' nicht gefunden.`);
        return;
    }
    wrapper.innerHTML = ''; // Leert den Wrapper von alten Tags

    // Erstellt für jeden aktiven Filter ein Tag-Element
    activeFiltersFlat.forEach(filter => {
        const tagElement = document.createElement('div');
        tagElement.classList.add('search-filter-tag'); // Deine CSS-Klasse für das Styling
        // Basis-Styling (kann/sollte durch CSS ersetzt werden)


        // Text des Filters
        const tagName = document.createElement('span');
        tagName.textContent = filter.display; // Der Anzeigename aus der Konfiguration
        tagName.style.marginRight = '6px'; // Kleiner Abstand zum 'x'

        // Button zum Entfernen des Filters ('x')
        const removeButton = document.createElement('button');
        removeButton.textContent = '×'; // Multiplikationszeichen als 'x'
        removeButton.style.cssText = `
            border: none;
            background: none;
            padding: 0 4px;
            margin-left: 4px; /* Abstand vom Text */
            cursor: pointer; /* Hand-Mauszeiger */
            font-weight: bold;
            font-size: 1.1em; /* Etwas größer */
            line-height: 1;
            color: #555; /* Dunkelgraue Farbe */
        `;
        removeButton.setAttribute('aria-label', `Filter ${filter.display} entfernen`); // Für Screenreader
        // Speichert die ID der zugehörigen Checkbox im Button, um sie später zu finden
        removeButton.dataset.checkboxId = filter.id;

        // Event Listener für den Klick auf das 'x'
        removeButton.addEventListener('click', (e) => {
            // Holt die ID der Checkbox aus dem 'data'-Attribut
            const checkboxIdToRemove = e.currentTarget.dataset.checkboxId;
            const correspondingCheckbox = document.getElementById(checkboxIdToRemove);
            if (correspondingCheckbox) {
                correspondingCheckbox.checked = false; // Deaktiviert die Checkbox
                applyFiltersAndRender(); // Wendet Filter neu an und rendert alles neu
            } else {
                 console.error(`Konnte Checkbox mit ID ${checkboxIdToRemove} zum Entfernen nicht finden.`);
            }
        });

        tagElement.appendChild(tagName); // Fügt Text hinzu
        tagElement.appendChild(removeButton); // Fügt 'x'-Button hinzu
        wrapper.appendChild(tagElement); // Fügt das Tag zum Wrapper hinzu
    });
}


// 🔄 Filterlogik und Aktualisierung

/**
 * Wendet die aktuell ausgewählten Filter an und rendert die Videos und Filter-Tags neu.
 */
function applyFiltersAndRender() {
    // 1. Aktive Filter pro Gruppe identifizieren
    const activeFiltersByGroup = {}; // Objekt zum Speichern aktiver Filter pro Feld
    let allActiveFiltersFlat = []; // Flache Liste aller aktiven Filter für die Tag-Anzeige

    // Geht durch jede definierte Filtergruppe (Kategorie, Produktionsort, etc.)
    filterConfig.forEach(group => {
        const groupField = group.field; // Das Webflow-Feld (z.B. 'kategorie')
        activeFiltersByGroup[groupField] = []; // Initialisiert ein leeres Array für diese Gruppe

        // Geht durch jeden Filter innerhalb der Gruppe (z.B. Influencer, UGC)
        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id); // Sucht die Checkbox im HTML
            // Wenn die Checkbox existiert und aktiviert ist:
            if (checkbox && checkbox.checked) {
                // Füge den *Wert* des Filters zur Liste für diese Gruppe hinzu (normalisiert auf Kleinschreibung)
                activeFiltersByGroup[groupField].push(filter.value.toLowerCase());
                // Füge das gesamte Filter-Objekt zur flachen Liste für die Tag-Anzeige hinzu
                // (fügt 'field' hinzu, falls es später benötigt wird)
                allActiveFiltersFlat.push({ ...filter, field: groupField });
            }
        });
    });

    // Konsolenausgabe zur Überprüfung der aktiven Filter
    console.log('🔄 Aktive Filter (gruppiert nach Feld):', activeFiltersByGroup);

    // 2. Video-Items filtern
    // Startet mit allen Videos und filtert dann schrittweise
    const filteredItems = allVideoItems.filter(item => {
        // Prüft für jedes Video, ob es *allen* aktiven Filtergruppen entspricht (AND-Logik)

        // Geht durch jede Filtergruppe (jedes Feld, z.B. 'kategorie', 'produktionsort')
        for (const groupField in activeFiltersByGroup) {
            const activeValuesInGroup = activeFiltersByGroup[groupField]; // Die aktiven Werte für dieses Feld (z.B. ['influencer', 'ugc'])

            // Wenn in dieser Gruppe mindestens ein Filter aktiv ist:
            if (activeValuesInGroup.length > 0) {
                // Holt den Wert des aktuellen Videos für dieses Feld (normalisiert auf Kleinschreibung)
                // Nutzt optional Chaining (?.) um Fehler zu vermeiden, falls fieldData oder das Feld fehlt
                const itemValue = item?.fieldData?.[groupField]?.toLowerCase();

                // Wenn das Video keinen Wert für dieses Feld hat, kann es nicht passen -> Item ausschließen
                if (itemValue === undefined || itemValue === null) {
                    return false;
                }

                // Prüft, ob der Wert des Videos in der Liste der aktiven Werte für diese Gruppe enthalten ist (OR-Logik innerhalb der Gruppe)
                const matchInGroup = activeValuesInGroup.includes(itemValue);

                // Wenn es in dieser Gruppe keine Übereinstimmung gibt, erfüllt das Video die Bedingung nicht -> Item ausschließen
                if (!matchInGroup) {
                    return false; // Frühzeitiger Ausstieg, da AND-Bedingung nicht erfüllt
                }
            }
            // Wenn in dieser Gruppe keine Filter aktiv sind, wird diese Gruppe ignoriert (keine Einschränkung)
        }
        // Wenn das Video alle aktiven Gruppenbedingungen erfüllt hat (oder keine Gruppen aktiv waren), wird es behalten
        return true;
    });

    // 3. Aktive Filter-Tags rendern (mit der flachen Liste aller aktiven Filter)
    renderFilterTags(allActiveFiltersFlat);

    // 4. Gefilterte Videos rendern
    renderVideos(filteredItems, videoContainerId);
}


// 🚀 Initialisierung und Hauptfunktionen

/**
 * Lädt die Video-Collection, richtet die Filter-Events ein und rendert den initialen Zustand.
 */
async function displayVideoCollection() {
    try {
        console.log(`🚀 Lade Videos von Collection ID: ${VIDEO_COLLECTION_ID}`);
        // Lädt alle Video-Items und speichert sie global
        allVideoItems = await fetchCollectionItems(VIDEO_COLLECTION_ID);

        // Prüft, ob Videos erfolgreich geladen wurden
        if (allVideoItems && allVideoItems.length > 0) {
            console.log(`📹 ${allVideoItems.length} Video(s) insgesamt geladen.`);

            // Event Listener für alle konfigurierten Filter-Checkboxes einrichten
            let filterCheckboxesFound = false;
            // Iteriert durch die verschachtelte filterConfig
            filterConfig.forEach(group => {
                group.filters.forEach(filter => {
                    const checkbox = document.getElementById(filter.id); // Sucht die Checkbox
                    if (checkbox) {
                        // Fügt den Event Listener hinzu, der bei Änderung die Filter neu anwendet
                        checkbox.addEventListener('change', applyFiltersAndRender);
                        filterCheckboxesFound = true; // Merkt sich, dass mindestens eine Checkbox gefunden wurde
                    } else {
                        // Warnung, falls eine konfigurierte Checkbox im HTML fehlt
                        console.warn(`⚠️ Filter-Checkbox mit ID '${filter.id}' nicht im DOM gefunden.`);
                    }
                });
            });

            if (filterCheckboxesFound) {
                 console.log(`✅ Event Listeners für Filter-Checkboxes eingerichtet.`);
            } else {
                 // Warnung, wenn keine der Checkboxen gefunden wurde
                 console.warn(`Keine der konfigurierten Filter-Checkboxes gefunden. Filterung wird nicht interaktiv sein.`);
            }

            // Initialen Zustand rendern (basierend auf dem Standard-Zustand der Checkboxen beim Laden)
            applyFiltersAndRender();

        } else if (allVideoItems === null) {
             // Fehler beim Laden (fetchCollectionItems gab null zurück)
             console.error("Fehler beim Laden der Video-Items. API-Aufruf fehlgeschlagen.");
             const container = document.getElementById(videoContainerId);
             if (container) container.innerHTML = "<p>Fehler beim Laden der Videos. Bitte versuche es später erneut.</p>";
             renderFilterTags([]); // Keine Tags anzeigen
        } else {
            // Keine Videos in der Collection gefunden
            console.log("Keine Video-Items in der Collection gefunden.");
            renderVideos([], videoContainerId); // Leeren Container anzeigen
            renderFilterTags([]); // Auch keine Tags anzeigen
        }

    } catch (error) {
        // Fängt unerwartete Fehler während des Prozesses ab
        console.error("❌ Schwerwiegender Fehler beim Anzeigen der Video-Collection:", error);
        const container = document.getElementById(videoContainerId);
        if (container) container.innerHTML = "<p>Ein unerwarteter Fehler ist aufgetreten. Inhalt kann nicht geladen werden.</p>";
        renderFilterTags([]); // Keine Tags bei Fehler
    }
}


/**
 * Lädt die Jobs des aktuell eingeloggten Benutzers. (Nur relevant, falls Jobs angezeigt werden)
 */
async function displayUserJobs() {
    const containerId = "booked-jobs-list"; // ID des Job-Containers
    // Prüft, ob der Job-Container überhaupt im HTML existiert
    if (!document.getElementById(containerId)) {
        console.log("Container 'booked-jobs-list' nicht gefunden, Job-Ladevorgang übersprungen.");
        return; // Bricht ab, wenn der Container fehlt
    }

    try {
        // Prüft, ob Memberstack ($memberstackDom) verfügbar ist
        if (typeof window.$memberstackDom === 'undefined') {
             console.warn("Memberstack ($memberstackDom) nicht gefunden. Kann Benutzer-Jobs nicht laden.");
             renderJobs([], containerId); // Zeigt leere Liste an
             return;
        }

        // Holt den aktuellen Memberstack-Benutzer
        const member = await window.$memberstackDom.getCurrentMember();
        // Holt die Webflow Member ID aus den Custom Fields
        currentWebflowMemberId = member?.data?.customFields?.['webflow-member-id'];

        // Wenn keine Webflow Member ID gefunden wurde
        if (!currentWebflowMemberId) {
            console.error("❌ Kein 'webflow-member-id' im Memberstack-Profil gefunden.");
            renderJobs([], containerId); // Zeigt leere Liste an
            return;
        }

        console.log(`👤 Lade Benutzerdaten für Member ID: ${currentWebflowMemberId}`);
        // Lädt die Daten des Benutzers aus der User Collection
        const userDataItem = await fetchSingleItem(USER_COLLECTION_ID, currentWebflowMemberId);
        // Holt die Liste der gebuchten Job-IDs aus den Benutzerdaten
        const bookedJobIds = userDataItem?.fieldData?.["booked-jobs"] || [];
        console.log(`📚 ${bookedJobIds.length} gebuchte Job IDs gefunden.`);

        // Wenn keine Jobs gebucht sind, direkt leere Liste rendern
        if (bookedJobIds.length === 0) {
            renderJobs([], containerId);
            return;
        }

        // Lädt die Daten für jeden gebuchten Job parallel
        const bookedJobsPromises = bookedJobIds.map(jobId => fetchJobData(jobId));
        const bookedJobsResults = await Promise.all(bookedJobsPromises);

        // Filtert eventuelle 'null'-Ergebnisse heraus (falls ein Job nicht geladen werden konnte)
        const validBookedJobs = bookedJobsResults.filter(job => job !== null);
        console.log(`✅ ${validBookedJobs.length} gültige Jobdaten geladen.`);

        // Rendert die gültigen Jobs
        renderJobs(validBookedJobs, containerId);

    } catch (error) {
        // Fängt Fehler während des Job-Ladevorgangs ab
        console.error("❌ Fehler beim Laden der Benutzer-Jobs:", error);
        renderJobs([], containerId); // Zeigt im Fehlerfall eine leere Liste an
    }
}

// --- Start der Anwendung ---
// Wird ausgeführt, sobald das HTML-Dokument vollständig geladen und geparst ist.
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM geladen. Starte Ladevorgänge...");

    // Prüft, ob die notwendigen Container für Videos und Filter-Tags vorhanden sind
    const videoContainerExists = !!document.getElementById(videoContainerId);
    const tagWrapperExists = !!document.getElementById(filterTagWrapperId);

    if (videoContainerExists && tagWrapperExists) {
         displayVideoCollection(); // Startet das Laden der Videos und das Setup der Filter
    } else {
        // Gibt eine spezifischere Fehlermeldung aus, falls Elemente fehlen
        if (!videoContainerExists) console.error(`FEHLER: Video-Container ('${videoContainerId}') nicht gefunden!`);
        if (!tagWrapperExists) console.error(`FEHLER: Filter-Tag-Wrapper ('${filterTagWrapperId}') nicht gefunden!`);
        console.error("Video-Feed kann nicht initialisiert werden.");
    }

    // Startet das Laden der Jobs (nur wenn der Container dafür existiert und Memberstack genutzt wird)
    displayUserJobs();

});
