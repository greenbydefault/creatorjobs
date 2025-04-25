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
const filterTagWrapperId = "filter-tag-wrapper"; // <-- NEU: ID für den Tag-Container

// --- NEU: Filterkonfiguration ---
// Definiert, welche Checkbox-IDs welchen Werten im Feld 'kategorie' entsprechen
// und wie sie im Tag angezeigt werden sollen.
const categoryFilters = [
    { id: "kategorie-influencer", value: "influencer", display: "Influencer" },
    { id: "kategorie-ugc", value: "ugc", display: "UGC" }
    // Füge hier bei Bedarf weitere Kategorie-Filter hinzu
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
    const apiUrl = `${API_BASE_URL}/${collectionId}/items/live?limit=100`;
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
    if (!container) {
        console.error(`❌ Container mit ID '${containerId}' nicht gefunden.`);
        return;
    }
    container.innerHTML = "";

    if (jobs.length === 0) {
        const noJobsMessage = document.createElement("p");
        noJobsMessage.textContent = "Es sieht so aus, als wäre aktuell noch kein Auftrag für dich bestätigt worden.";
        noJobsMessage.classList.add("no-jobs-message");
        container.appendChild(noJobsMessage);
        return;
    }

    jobs.forEach(jobData => {
        if (!jobData) return;

        const jobLink = document.createElement("a");
        jobLink.href = `https://www.creatorjobs.com/creator-job/${jobData.slug || '#'}`;
        jobLink.target = "_blank";
        jobLink.style.textDecoration = "none";
        jobLink.style.color = "#040e1a";

        const jobDiv = document.createElement("div");
        jobDiv.classList.add("db-table-row", "db-table-booked");

        const jobInfoDiv = document.createElement("div");
        jobInfoDiv.classList.add("db-table-row-item", "justify-left");

        const jobImage = document.createElement("img");
        jobImage.classList.add("db-table-img", "is-margin-right-12");
        jobImage.src = jobData["job-image"]?.url || "https://via.placeholder.com/48";
        jobImage.alt = jobData["name"] || "Job Bild";
        jobImage.style.width = "48px";
        jobImage.style.height = "48px";
        jobImage.style.objectFit = "cover";
        jobInfoDiv.appendChild(jobImage);

        const jobName = document.createElement("span");
        jobName.classList.add("truncate");
        jobName.textContent = jobData["name"] || "Unbekannter Job";
        jobInfoDiv.appendChild(jobName);
        jobDiv.appendChild(jobInfoDiv);

        const brandNameDiv = document.createElement("div");
        brandNameDiv.classList.add("db-table-row-item");
        brandNameDiv.textContent = jobData["brand-name"] || "N/A";
        jobDiv.appendChild(brandNameDiv);

        const jobBudget = document.createElement("div");
        jobBudget.classList.add("db-table-row-item");
        const payment = parseFloat(jobData["job-payment"]);
        jobBudget.textContent = !isNaN(payment) ? `${payment.toFixed(2)} €` : (jobData["job-payment"] || "N/A");
        jobDiv.appendChild(jobBudget);

        const jobCategory = document.createElement("div");
        jobCategory.classList.add("db-table-row-item");
        jobCategory.textContent = jobData["industrie-kategorie"] || "N/A";
        jobDiv.appendChild(jobCategory);

        const createDeadlineTag = (dateString) => {
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
    if (!container) {
        console.error(`❌ Video-Container mit ID '${containerId}' nicht gefunden.`);
        return;
    }
    container.innerHTML = "";

    if (!videoItems || videoItems.length === 0) {
        const noVideosMessage = document.createElement("p");
        noVideosMessage.textContent = "Keine Videos entsprechen den aktuellen Filtern.";
        container.appendChild(noVideosMessage);
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
                nameHeading.textContent = videoName;
                nameHeading.style.marginBottom = "8px";
                videoWrapper.appendChild(nameHeading);
            }

            const videoElementHTML = `
                <video playsinline preload="metadata" autobuffer controls class="db-video-player" id="db-user-video--${item.id || index}">
                    <source src="${videoLink}" type="video/mp4">
                    Dein Browser unterstützt das Video-Tag nicht.
                </video>
            `;
            videoWrapper.insertAdjacentHTML('beforeend', videoElementHTML);

            container.appendChild(videoWrapper);
        } else {
            console.warn(`⚠️ Video-Item ${item.id} hat keinen 'video-link'.`);
        }
    });
}

// --- NEUE FUNKTION: Aktive Filter-Tags rendern ---
function renderFilterTags(activeFilters) {
    const wrapper = document.getElementById(filterTagWrapperId);
    if (!wrapper) {
        console.warn(`⚠️ Filter-Tag-Wrapper mit ID '${filterTagWrapperId}' nicht gefunden.`);
        return;
    }
    wrapper.innerHTML = ''; // Vorherige Tags entfernen

    activeFilters.forEach(filter => {
        const tagElement = document.createElement('div');
        tagElement.classList.add('search-filter-tag'); // Deine Klasse für das Styling
        tagElement.style.display = 'inline-flex'; // Beispiel-Styling für Layout
        tagElement.style.alignItems = 'center';
        tagElement.style.marginRight = '8px';
        tagElement.style.marginBottom = '8px';
        tagElement.style.padding = '4px 8px';
        tagElement.style.border = '1px solid #ccc';
        tagElement.style.borderRadius = '4px';
        tagElement.style.backgroundColor = '#f0f0f0';

        const tagName = document.createElement('span');
        tagName.textContent = filter.display; // Angezeigter Name aus der Konfiguration
        tagName.style.marginRight = '6px';

        const removeButton = document.createElement('button');
        removeButton.textContent = 'x'; // Einfaches 'x'
        removeButton.style.border = 'none';
        removeButton.style.background = 'none';
        removeButton.style.padding = '0 4px';
        removeButton.style.cursor = 'pointer';
        removeButton.style.fontWeight = 'bold';
        removeButton.setAttribute('aria-label', `Filter ${filter.display} entfernen`); // Für Barrierefreiheit

        // Event Listener zum Entfernen des Filters
        removeButton.addEventListener('click', () => {
            const correspondingCheckbox = document.getElementById(filter.id);
            if (correspondingCheckbox) {
                correspondingCheckbox.checked = false; // Checkbox deaktivieren
                applyFiltersAndRender(); // Filter neu anwenden und alles neu rendern
            } else {
                console.error(`Konnte Checkbox mit ID ${filter.id} zum Entfernen nicht finden.`);
            }
        });

        tagElement.appendChild(tagName);
        tagElement.appendChild(removeButton);
        wrapper.appendChild(tagElement);
    });
}

// 🔄 Filter anwenden und Videos/Tags neu rendern (angepasst)
function applyFiltersAndRender() {
    // 1. Aktive Filter identifizieren
    const activeCategoryFilters = categoryFilters.filter(filter => {
        const checkbox = document.getElementById(filter.id);
        return checkbox ? checkbox.checked : false; // Ist die Checkbox vorhanden und aktiviert?
    });

    console.log('🔄 Aktive Kategorie-Filter:', activeCategoryFilters.map(f => f.display));

    // 2. Video-Items filtern
    let filteredItems = allVideoItems;
    if (activeCategoryFilters.length > 0) {
        const activeCategoryValues = activeCategoryFilters.map(filter => filter.value.toLowerCase());
        filteredItems = allVideoItems.filter(item => {
            const itemCategory = item.fieldData?.kategorie?.toLowerCase();
            // Zeige Item, wenn seine Kategorie in einer der aktiven Filterkategorien enthalten ist (OR-Logik)
            return itemCategory && activeCategoryValues.includes(itemCategory);
        });
    }
    // Hier könnten später weitere Filtertypen (z.B. Suche) hinzugefügt werden

    // 3. Aktive Filter-Tags rendern
    renderFilterTags(activeCategoryFilters);

    // 4. Gefilterte Videos rendern
    renderVideos(filteredItems, videoContainerId);
}


// 🌟 Hauptfunktion zum Laden der Videos (angepasst)
async function displayVideoCollection() {
    try {
        console.log(`🚀 Lade Videos von Collection ID: ${VIDEO_COLLECTION_ID}`);
        allVideoItems = await fetchCollectionItems(VIDEO_COLLECTION_ID);

        if (allVideoItems && allVideoItems.length > 0) {
            console.log(`📹 ${allVideoItems.length} Video(s) insgesamt geladen.`);

            // Event Listener für alle konfigurierten Filter-Checkboxes einrichten
            let filterCheckboxesFound = false;
            categoryFilters.forEach(filter => {
                const checkbox = document.getElementById(filter.id);
                if (checkbox) {
                    checkbox.addEventListener('change', applyFiltersAndRender);
                    filterCheckboxesFound = true;
                } else {
                    console.warn(`⚠️ Filter-Checkbox mit ID '${filter.id}' nicht im DOM gefunden.`);
                }
            });

            if (filterCheckboxesFound) {
                 console.log(`✅ Event Listeners für Filter-Checkboxes eingerichtet.`);
            } else {
                 console.warn(`Keine der konfigurierten Filter-Checkboxes gefunden. Filterung funktioniert nicht.`);
            }

            // Initialen Zustand rendern (basierend auf Standard-Checkbox-Status)
            applyFiltersAndRender();

        } else {
            console.log("Keine Video-Items zum Rendern vorhanden.");
            renderVideos([], videoContainerId);
            renderFilterTags([]); // Auch keine Tags anzeigen
        }

    } catch (error) {
        console.error("❌ Fehler beim Laden der Video-Collection:", error);
        const container = document.getElementById(videoContainerId);
        if (container) {
            container.innerHTML = "<p>Fehler beim Laden der Videos. Bitte versuche es später erneut.</p>";
        }
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
            console.error("❌ Kein 'webflow-member-id' im Memberstack-Profil gefunden.");
            renderJobs([], containerId);
            return;
        }

        console.log(`👤 Lade Benutzerdaten für Member ID: ${currentWebflowMemberId}`);
        const userDataItem = await fetchSingleItem(USER_COLLECTION_ID, currentWebflowMemberId);
        const bookedJobIds = userDataItem?.fieldData?.["booked-jobs"] || [];
        console.log(`📚 Gefundene gebuchte Job IDs: ${bookedJobIds.length}`);

        const bookedJobsPromises = bookedJobIds.map(fetchJobData);
        const bookedJobs = await Promise.all(bookedJobsPromises);

        const validBookedJobs = bookedJobs.filter(job => job && Object.keys(job).length > 0);
        console.log(`✅ ${validBookedJobs.length} gültige Jobdaten geladen.`);

        renderJobs(validBookedJobs, containerId);

    } catch (error) {
        console.error("❌ Fehler beim Laden der Benutzer-Jobs:", error);
        renderJobs([], containerId);
    }
}

// 🚀 Start der Anwendung
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM geladen. Starte Ladevorgänge...");

    // Prüfe, ob Video-Container und Tag-Wrapper vorhanden sind
    if (document.getElementById(videoContainerId) && document.getElementById(filterTagWrapperId)) {
         displayVideoCollection(); // Starte Laden und Filter-Setup für Videos
    } else {
        console.error(`FEHLER: Container (${videoContainerId}) oder Tag-Wrapper (${filterTagWrapperId}) nicht gefunden! Videos/Tags können nicht angezeigt werden.`);
    }

    // Optional: Lade Jobs nur, wenn der Container dafür existiert
    if (document.getElementById("booked-jobs-list")) {
        displayUserJobs();
    } else {
        console.log("Container 'booked-jobs-list' nicht gefunden, Job-Ladevorgang übersprungen.");
    }
});
