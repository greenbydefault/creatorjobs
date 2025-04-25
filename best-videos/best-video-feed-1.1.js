// 🌐 Optimierte Webflow API Integration für GitHub-Hosting

// 🔧 Konfiguration
const API_BASE_URL = "https://api.webflow.com/v2/collections";
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url="; // Dein Worker URL
const JOB_COLLECTION_ID = "6448faf9c5a8a17455c05525"; // Beibehalten für bestehende Funktionalität
const USER_COLLECTION_ID = "6448faf9c5a8a15f6cc05526"; // Beibehalten für bestehende Funktionalität
const VIDEO_COLLECTION_ID = "680b45a22b15fa4643ebdca9"; // Deine Video Collection ID

let currentWebflowMemberId = null; // 💡 Hier wird die eingeloggte Member-ID gespeichert (falls benötigt)
let allVideoItems = []; // <-- NEU: Speicher für alle geladenen Video-Items
const videoContainerId = "video-container"; // <-- NEU: ID des Video-Containers
const filterCheckboxId = "kategorie-influencer"; // <-- NEU: ID der Filter-Checkbox

// 🛠️ Hilfsfunktionen
function buildWorkerUrl(apiUrl) {
    return `${WORKER_BASE_URL}${encodeURIComponent(apiUrl)}`;
}

// -- Bestehende Countdown-Funktion (unverändert) --
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

// -- Generische Funktion zum Abrufen von Webflow-Daten --
async function fetchWebflowData(apiUrl) {
    const workerUrl = buildWorkerUrl(apiUrl);
    try {
        const response = await fetch(workerUrl);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API-Fehler: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`❌ Fehler beim Abrufen von ${apiUrl}: ${error.message}`);
        return null;
    }
}

// -- Funktion zum Abrufen eines einzelnen Items (angepasst) --
async function fetchSingleItem(collectionId, itemId) {
    const apiUrl = `${API_BASE_URL}/${collectionId}/items/${itemId}/live`;
    const item = await fetchWebflowData(apiUrl);
    return item;
}

// -- Funktion zum Abrufen mehrerer Items einer Collection (angepasst) --
async function fetchCollectionItems(collectionId) {
    const apiUrl = `${API_BASE_URL}/${collectionId}/items/live?limit=100`; // Limit erhöht, ggf. Paginierung hinzufügen
    const data = await fetchWebflowData(apiUrl);
    // TODO: Implementiere Paginierung, falls mehr als 100 Items erwartet werden
    return data?.items || [];
}

// -- Bestehende Funktion zum Abrufen von Job-Daten (nutzt jetzt fetchSingleItem) --
async function fetchJobData(jobId) {
    const jobItem = await fetchSingleItem(JOB_COLLECTION_ID, jobId);
    return jobItem?.fieldData || {};
}

// -- Bestehende Funktion zum Rendern von Jobs (unverändert) --
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

        // Job Info (Bild + Name)
        const jobInfoDiv = document.createElement("div");
        jobInfoDiv.classList.add("db-table-row-item", "justify-left");

        const jobImage = document.createElement("img");
        jobImage.classList.add("db-table-img", "is-margin-right-12");
        // Sicherer Zugriff auf verschachtelte URL, falls vorhanden
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


// ---- Funktion zum Rendern der VIDEOS (unverändert) ----
function renderVideos(videoItems, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Video-Container mit ID '${containerId}' nicht gefunden.`);
        return;
    }
    container.innerHTML = ""; // Vorherigen Inhalt leeren

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
                <video playsinline preload="metadata" autobuffer controls class="db-video-player" id="db-user-video--${item.id || index}"> <source src="${videoLink}" type="video/mp4">
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

// ---- NEUE FUNKTION: Filter anwenden und Videos neu rendern ----
function applyFiltersAndRender() {
    const filterCheckbox = document.getElementById(filterCheckboxId);
    if (!filterCheckbox) {
        console.error(`❌ Filter-Checkbox mit ID '${filterCheckboxId}' nicht gefunden.`);
        renderVideos(allVideoItems, videoContainerId); // Zeige alle Videos, wenn Checkbox fehlt
        return;
    }

    const isInfluencerFilterActive = filterCheckbox.checked;
    console.log(`🔄 Filter angewendet: Influencer = ${isInfluencerFilterActive}`);

    let filteredItems = allVideoItems;

    if (isInfluencerFilterActive) {
        filteredItems = allVideoItems.filter(item => {
            // Stelle sicher, dass fieldData und kategorie existieren und prüfe den Wert
            return item.fieldData && item.fieldData.kategorie && item.fieldData.kategorie.toLowerCase() === 'influencer';
            // Achte auf Groß-/Kleinschreibung: .toLowerCase() hinzugefügt für Robustheit
        });
    }
    // Hier könnten weitere Filter hinzugefügt werden (z.B. else if, oder kombiniert)

    renderVideos(filteredItems, videoContainerId);
}


// ---- Hauptfunktion zum Laden und Anzeigen der VIDEOS (angepasst) ----
async function displayVideoCollection() {
    try {
        console.log(`🚀 Lade Videos von Collection ID: ${VIDEO_COLLECTION_ID}`);
        // Lade *alle* Videos und speichere sie
        allVideoItems = await fetchCollectionItems(VIDEO_COLLECTION_ID);

        if (allVideoItems && allVideoItems.length > 0) {
            console.log(`📹 ${allVideoItems.length} Video(s) insgesamt geladen.`);
            // Richte den Event Listener für die Checkbox ein
            const filterCheckbox = document.getElementById(filterCheckboxId);
            if (filterCheckbox) {
                filterCheckbox.addEventListener('change', applyFiltersAndRender);
                console.log(`✅ Event Listener für Checkbox '${filterCheckboxId}' eingerichtet.`);
            } else {
                console.warn(`⚠️ Filter-Checkbox mit ID '${filterCheckboxId}' nicht im DOM gefunden. Filterung funktioniert nicht.`);
            }
            // Wende Filter initial an (basierend auf dem Standardzustand der Checkbox)
            applyFiltersAndRender();
        } else {
            console.log("Keine Video-Items zum Rendern vorhanden.");
            renderVideos([], videoContainerId); // Leeren Container anzeigen
        }

    } catch (error) {
        console.error("❌ Fehler beim Laden der Video-Collection:", error);
        const container = document.getElementById(videoContainerId);
        if (container) {
            container.innerHTML = "<p>Fehler beim Laden der Videos. Bitte versuche es später erneut.</p>";
        }
    }
}


// -- Bestehende Hauptfunktion für Jobs (unverändert) --
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

// Start der Anwendung
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM geladen. Starte Ladevorgänge...");
    // Stelle sicher, dass das HTML für Filter und Container existiert, bevor du startest
    if (document.getElementById(videoContainerId) && document.getElementById(filterCheckboxId)) {
         displayVideoCollection(); // Starte das Laden der Videos und richte Filter ein
    } else {
        console.error(`FEHLER: Container (${videoContainerId}) oder Filter-Checkbox (${filterCheckboxId}) nicht gefunden! Videos können nicht geladen/gefiltert werden.`);
    }
    // Optional: Lade Jobs nur, wenn der Container dafür existiert
    if (document.getElementById("booked-jobs-list")) {
        displayUserJobs();
    } else {
        console.log("Container 'booked-jobs-list' nicht gefunden, Job-Ladevorgang übersprungen.");
    }
});
