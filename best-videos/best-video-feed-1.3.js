// 🌐 Optimierte Webflow API Integration für GitHub-Hosting

// 🔧 Konfiguration
const API_BASE_URL = "https://api.webflow.com/v2/collections";
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url="; // Dein Worker URL
const JOB_COLLECTION_ID = "6448faf9c5a8a17455c05525";
const USER_COLLECTION_ID = "6448faf9c5a8a15f6cc05526";
const VIDEO_COLLECTION_ID = "680b45a22b15fa4643ebdca9"; // Deine Video Collection ID

let currentWebflowMemberId = null;
let allVideoItems = []; // Speicher für alle geladenen Video-Items
const videoContainerId = "video-container";
const filterTagWrapperId = "filter-tag-wrapper";

// --- NEU: Erweiterte Filterkonfiguration für mehrere Felder ---
const filterConfig = [
    {
        field: 'kategorie', // Webflow Feld-ID (Slug)
        filters: [
            { id: "kategorie-influencer", value: "influencer", display: "Kategorie: Influencer" }, // Display-Name angepasst für Klarheit
            { id: "kategorie-ugc", value: "ugc", display: "Kategorie: UGC" }
        ]
    },
    {
        field: 'produktionsort', // Webflow Feld-ID (Slug)
        filters: [
            // Werte auf Kleinschreibung normalisiert für robusten Vergleich
            { id: "kategorie-vorort", value: "vor ort", display: "Ort: Vor Ort" },
            { id: "kategorie-creatorproduktion", value: "creatorproduktion", display: "Ort: Creatorproduktion" }
        ]
    },
    {
        field: 'anzeigentype', // Webflow Feld-ID (Slug)
        filters: [
            { id: "kategorie-paid", value: "paid", display: "Typ: Paid" },
            { id: "kategorie-werbeanzeige", value: "werbeanzeige", display: "Typ: Werbeanzeige" }
        ]
    }
    // Füge hier bei Bedarf weitere Filtergruppen hinzu
];

// 🛠️ Hilfsfunktionen (buildWorkerUrl, calculateCountdown, fetchWebflowData, fetchSingleItem, fetchCollectionItems, fetchJobData - unverändert)
function buildWorkerUrl(apiUrl) {
    return `${WORKER_BASE_URL}${encodeURIComponent(apiUrl)}`;
}
function calculateCountdown(endDate) {
    if (!endDate) return { text: "K.A.", class: "job-tag" };
    const now = new Date();
    const deadline = new Date(endDate);
    const diff = deadline - now;
    if (diff <= 0) return { text: "Abgelaufen", class: "job-tag is-bg-light-red" };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 10) return { text: `${days} Tag(e)`, class: "job-tag" };
    if (days > 4) return { text: `${days} Tag(e)`, class: "job-tag is-bg-light-yellow" };
    return { text: `${days} Tag(e)`, class: "job-tag is-bg-light-red" };
}
async function fetchWebflowData(apiUrl) {
    const workerUrl = buildWorkerUrl(apiUrl);
    try {
        const response = await fetch(workerUrl);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API-Fehler: ${response.status} - ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`❌ Fehler beim Abrufen von ${apiUrl}: ${error.message}`);
        return null;
    }
}
async function fetchSingleItem(collectionId, itemId) {
    const apiUrl = `${API_BASE_URL}/${collectionId}/items/${itemId}/live`;
    return await fetchWebflowData(apiUrl);
}
async function fetchCollectionItems(collectionId) {
    const apiUrl = `${API_BASE_URL}/${collectionId}/items/live?limit=100`; // Ggf. Paginierung einbauen
    const data = await fetchWebflowData(apiUrl);
    return data?.items || [];
}
async function fetchJobData(jobId) {
    const jobItem = await fetchSingleItem(JOB_COLLECTION_ID, jobId);
    return jobItem?.fieldData || {};
}


// 🖨️ Jobs rendern (renderJobs - unverändert)
function renderJobs(jobs, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    if (jobs.length === 0) {
        container.innerHTML = "<p class='no-jobs-message'>Es sieht so aus, als wäre aktuell noch kein Auftrag für dich bestätigt worden.</p>";
        return;
    }
    jobs.forEach(jobData => {
        if (!jobData) return;
        const jobLink = document.createElement("a");
        jobLink.href = `https://www.creatorjobs.com/creator-job/${jobData.slug || '#'}`;
        jobLink.target = "_blank";
        jobLink.style.textDecoration = "none";
        jobLink.style.color = "inherit"; // Farbe erben
        const jobDiv = document.createElement("div");
        jobDiv.classList.add("db-table-row", "db-table-booked");
        // ... (Restlicher Code zum Erstellen der Job-Zeile) ...
         // Job Info (Bild + Name)
        const jobInfoDiv = document.createElement("div");
        jobInfoDiv.classList.add("db-table-row-item", "justify-left");
        const jobImage = document.createElement("img");
        jobImage.classList.add("db-table-img", "is-margin-right-12");
        jobImage.src = jobData["job-image"]?.url || "https://via.placeholder.com/48";
        jobImage.alt = jobData["name"] || "Job Bild";
        jobImage.style.width = "48px"; jobImage.style.height = "48px"; jobImage.style.objectFit = "cover";
        jobInfoDiv.appendChild(jobImage);
        const jobName = document.createElement("span");
        jobName.classList.add("truncate");
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
        // Deadlines
        const createDeadlineTag = (dateString) => { /* ... unverändert ... */
            const deadlineInfo = calculateCountdown(dateString);
            const deadlineDiv = document.createElement("div");
            deadlineDiv.classList.add("db-table-row-item");
            const tag = document.createElement("div");
            tag.classList.add(...deadlineInfo.class.split(" "));
            const text = document.createElement("span");
            text.classList.add("db-job-tag-txt");
            text.textContent = deadlineInfo.text;
            tag.appendChild(text);
            deadlineDiv.appendChild(tag);
            return deadlineDiv;
        };
        jobDiv.appendChild(createDeadlineTag(jobData["fertigstellung-content"]));
        jobDiv.appendChild(createDeadlineTag(jobData["job-scriptdeadline"]));

        jobLink.appendChild(jobDiv);
        container.appendChild(jobLink);
    });
}

// 🎬 Videos rendern (renderVideos - unverändert)
function renderVideos(videoItems, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    if (!videoItems || videoItems.length === 0) {
        container.innerHTML = "<p>Keine Videos entsprechen den aktuellen Filtern.</p>";
        return;
    }
    videoItems.forEach((item, index) => {
        const fieldData = item.fieldData;
        const videoName = fieldData['video-name'];
        const videoLink = fieldData['video-link'];
        if (videoLink) {
            const videoWrapper = document.createElement("div");
            videoWrapper.classList.add("video-item-wrapper");
            videoWrapper.style.marginBottom = "20px";
            if (videoName) {
                const nameHeading = document.createElement("h3");
                nameHeading.textContent = videoName; nameHeading.style.marginBottom = "8px";
                videoWrapper.appendChild(nameHeading);
            }
            const videoElementHTML = `
                <video playsinline preload="metadata" autobuffer controls class="db-video-player" id="db-user-video--${item.id || index}">
                    <source src="${videoLink}" type="video/mp4">
                    Dein Browser unterstützt das Video-Tag nicht.
                </video>`;
            videoWrapper.insertAdjacentHTML('beforeend', videoElementHTML);
            container.appendChild(videoWrapper);
        } else {
            console.warn(`⚠️ Video-Item ${item.id} hat keinen 'video-link'.`);
        }
    });
}

// ✨ Aktive Filter-Tags rendern (renderFilterTags - leicht angepasst für Klarheit)
function renderFilterTags(activeFiltersFlat) { // Nimmt eine flache Liste aller aktiven Filter
    const wrapper = document.getElementById(filterTagWrapperId);
    if (!wrapper) return;
    wrapper.innerHTML = '';

    activeFiltersFlat.forEach(filter => { // filter ist jetzt {id, value, display, field}
        const tagElement = document.createElement('div');
        tagElement.classList.add('search-filter-tag');
        // Styling (Beispiele, anpassen via CSS)
        tagElement.style.cssText = `display: inline-flex; align-items: center; margin: 0 8px 8px 0; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; background-color: #f0f0f0;`;

        const tagName = document.createElement('span');
        tagName.textContent = filter.display; // Der definierte Anzeigename
        tagName.style.marginRight = '6px';

        const removeButton = document.createElement('button');
        removeButton.textContent = 'x';
        removeButton.style.cssText = 'border:none; background:none; padding:0 4px; margin-left: 4px; cursor:pointer; font-weight:bold; line-height: 1;';
        removeButton.setAttribute('aria-label', `Filter ${filter.display} entfernen`);
        removeButton.dataset.checkboxId = filter.id; // Speichert die ID der zugehörigen Checkbox

        removeButton.addEventListener('click', (e) => {
            const checkboxIdToRemove = e.currentTarget.dataset.checkboxId;
            const correspondingCheckbox = document.getElementById(checkboxIdToRemove);
            if (correspondingCheckbox) {
                correspondingCheckbox.checked = false;
                applyFiltersAndRender(); // Filter neu anwenden
            } else {
                 console.error(`Konnte Checkbox mit ID ${checkboxIdToRemove} zum Entfernen nicht finden.`);
            }
        });

        tagElement.appendChild(tagName);
        tagElement.appendChild(removeButton);
        wrapper.appendChild(tagElement);
    });
}

// 🔄 Filter anwenden und Videos/Tags neu rendern (STARK überarbeitet)
function applyFiltersAndRender() {
    // 1. Aktive Filter pro Gruppe identifizieren
    const activeFiltersByGroup = {};
    let allActiveFiltersFlat = []; // Für die Tag-Anzeige

    filterConfig.forEach(group => {
        const groupField = group.field;
        activeFiltersByGroup[groupField] = []; // Initialisiere Array für jede Gruppe

        group.filters.forEach(filter => {
            const checkbox = document.getElementById(filter.id);
            if (checkbox && checkbox.checked) {
                // Füge den aktiven Filter zur Liste für diese Gruppe hinzu
                activeFiltersByGroup[groupField].push(filter.value.toLowerCase());
                // Füge den Filter auch zur flachen Liste für die Tag-Anzeige hinzu
                allActiveFiltersFlat.push({ ...filter, field: groupField }); // Füge Feldinfo hinzu, falls benötigt
            }
        });
    });

    console.log('🔄 Aktive Filter (gruppiert):', activeFiltersByGroup);

    // 2. Video-Items filtern (AND zwischen Gruppen, OR innerhalb einer Gruppe)
    const filteredItems = allVideoItems.filter(item => {
        // Überprüfe jede Filtergruppe
        for (const groupField in activeFiltersByGroup) {
            const activeValuesInGroup = activeFiltersByGroup[groupField];

            // Wenn in dieser Gruppe Filter aktiv sind, muss das Item passen
            if (activeValuesInGroup.length > 0) {
                const itemValue = item.fieldData?.[groupField]?.toLowerCase();

                // Wenn das Item keinen Wert für dieses Feld hat, passt es nicht
                if (!itemValue) {
                    return false;
                }

                // Prüfe, ob der Item-Wert mit *einem* der aktiven Werte in der Gruppe übereinstimmt (OR)
                const matchInGroup = activeValuesInGroup.includes(itemValue);

                // Wenn es in dieser Gruppe keine Übereinstimmung gibt, schließe das Item aus (AND zwischen Gruppen)
                if (!matchInGroup) {
                    return false;
                }
            }
        }
        // Wenn das Item alle aktiven Gruppenbedingungen erfüllt hat, behalte es
        return true;
    });

    // 3. Aktive Filter-Tags rendern (mit der flachen Liste)
    renderFilterTags(allActiveFiltersFlat);

    // 4. Gefilterte Videos rendern
    renderVideos(filteredItems, videoContainerId);
}


// 🌟 Hauptfunktion zum Laden der Videos (angepasst für neue filterConfig)
async function displayVideoCollection() {
    try {
        console.log(`🚀 Lade Videos von Collection ID: ${VIDEO_COLLECTION_ID}`);
        allVideoItems = await fetchCollectionItems(VIDEO_COLLECTION_ID);

        if (allVideoItems && allVideoItems.length > 0) {
            console.log(`📹 ${allVideoItems.length} Video(s) insgesamt geladen.`);

            // Event Listener für alle konfigurierten Filter-Checkboxes einrichten
            let filterCheckboxesFound = false;
            filterConfig.forEach(group => {
                group.filters.forEach(filter => {
                    const checkbox = document.getElementById(filter.id);
                    if (checkbox) {
                        checkbox.addEventListener('change', applyFiltersAndRender);
                        filterCheckboxesFound = true;
                    } else {
                        console.warn(`⚠️ Filter-Checkbox mit ID '${filter.id}' nicht im DOM gefunden.`);
                    }
                });
            });

            if (filterCheckboxesFound) {
                 console.log(`✅ Event Listeners für Filter-Checkboxes eingerichtet.`);
            } else {
                 console.warn(`Keine der konfigurierten Filter-Checkboxes gefunden. Filterung wird nicht interaktiv sein.`);
            }

            // Initialen Zustand rendern
            applyFiltersAndRender();

        } else {
            console.log("Keine Video-Items zum Rendern vorhanden.");
            renderVideos([], videoContainerId);
            renderFilterTags([]); // Auch keine Tags anzeigen
        }

    } catch (error) {
        console.error("❌ Fehler beim Laden der Video-Collection:", error);
        const container = document.getElementById(videoContainerId);
        if (container) container.innerHTML = "<p>Fehler beim Laden der Videos.</p>";
        renderFilterTags([]); // Keine Tags bei Fehler
    }
}


// 👤 Hauptfunktion für Jobs (displayUserJobs - unverändert)
async function displayUserJobs() {
    const containerId = "booked-jobs-list";
    try {
        const member = await window.$memberstackDom.getCurrentMember();
        currentWebflowMemberId = member?.data?.customFields?.['webflow-member-id'];
        if (!currentWebflowMemberId) {
            console.error("❌ Kein 'webflow-member-id' gefunden.");
            renderJobs([], containerId); return;
        }
        console.log(`👤 Lade User für Member ID: ${currentWebflowMemberId}`);
        const userDataItem = await fetchSingleItem(USER_COLLECTION_ID, currentWebflowMemberId);
        const bookedJobIds = userDataItem?.fieldData?.["booked-jobs"] || [];
        console.log(`📚 ${bookedJobIds.length} gebuchte Job IDs gefunden.`);
        const bookedJobs = await Promise.all(bookedJobIds.map(fetchJobData));
        const validBookedJobs = bookedJobs.filter(job => job && Object.keys(job).length > 0);
        console.log(`✅ ${validBookedJobs.length} gültige Jobdaten geladen.`);
        renderJobs(validBookedJobs, containerId);
    } catch (error) {
        console.error("❌ Fehler beim Laden der User-Jobs:", error);
        renderJobs([], containerId);
    }
}

// 🚀 Start der Anwendung
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM geladen. Starte Ladevorgänge...");
    if (document.getElementById(videoContainerId) && document.getElementById(filterTagWrapperId)) {
         displayVideoCollection();
    } else {
        console.error(`FEHLER: Container (${videoContainerId}) oder Tag-Wrapper (${filterTagWrapperId}) nicht gefunden!`);
    }
    if (document.getElementById("booked-jobs-list")) {
        displayUserJobs();
    } else {
        console.log("Container 'booked-jobs-list' nicht gefunden, Job-Ladevorgang übersprungen.");
    }
});
