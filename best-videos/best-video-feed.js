// 🌐 Optimierte Webflow API Integration für GitHub-Hosting

// 🔧 Konfiguration
const API_BASE_URL = "https://api.webflow.com/v2/collections";
const WORKER_BASE_URL = "https://bewerbungen.oliver-258.workers.dev/?url="; // Dein Worker URL
const JOB_COLLECTION_ID = "6448faf9c5a8a17455c05525"; // Beibehalten für bestehende Funktionalität
const USER_COLLECTION_ID = "6448faf9c5a8a15f6cc05526"; // Beibehalten für bestehende Funktionalität
const VIDEO_COLLECTION_ID = "680b45a22b15fa4643ebdca9"; // <-- NEU: Deine Video Collection ID

let currentWebflowMemberId = null; // 💡 Hier wird die eingeloggte Member-ID gespeichert (falls benötigt)

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
    // Die API für ein einzelnes Item gibt das Item direkt zurück, nicht unter 'items'
    return item;
}

// -- Funktion zum Abrufen mehrerer Items einer Collection (NEU) --
async function fetchCollectionItems(collectionId) {
    // Füge ggf. Parameter wie limit und offset hinzu, falls nötig: ?limit=100&offset=0
    const apiUrl = `${API_BASE_URL}/${collectionId}/items/live`;
    const data = await fetchWebflowData(apiUrl);
    // Die API für mehrere Items gibt ein Objekt mit einem 'items' Array zurück
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
        noJobsMessage.classList.add("no-jobs-message"); // Optional: Klasse für Styling hinzufügen
        container.appendChild(noJobsMessage);
        return;
    }

    jobs.forEach(jobData => {
        if (!jobData) return; // Überspringe, falls Jobdaten null sind

        const jobLink = document.createElement("a");
        jobLink.href = `https://www.creatorjobs.com/creator-job/${jobData.slug || '#'}`; // Fallback für fehlenden Slug
        jobLink.target = "_blank";
        jobLink.style.textDecoration = "none";
        jobLink.style.color = "#040e1a"; // Standardtextfarbe

        const jobDiv = document.createElement("div");
        jobDiv.classList.add("db-table-row", "db-table-booked");

        // Job Info (Bild + Name)
        const jobInfoDiv = document.createElement("div");
        jobInfoDiv.classList.add("db-table-row-item", "justify-left");

        const jobImage = document.createElement("img");
        jobImage.classList.add("db-table-img", "is-margin-right-12");
        jobImage.src = jobData["job-image"]?.url || "https://via.placeholder.com/48"; // Sicherer Zugriff auf Bild-URL
        jobImage.alt = jobData["name"] || "Job Bild";
        jobImage.style.width = "48px"; // Feste Breite für Konsistenz
        jobImage.style.height = "48px"; // Feste Höhe für Konsistenz
        jobImage.style.objectFit = "cover"; // Bild-Anpassung
        jobInfoDiv.appendChild(jobImage);

        const jobName = document.createElement("span");
        jobName.classList.add("truncate"); // Klasse für Textabschneidung (falls vorhanden)
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
        // Versuche, eine Zahl zu formatieren, falls vorhanden, sonst Text anzeigen
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
            tag.classList.add(...deadlineInfo.class.split(" ")); // Klassen sicher hinzufügen
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


// ---- NEUE FUNKTION ZUM RENDERN DER VIDEOS ----
function renderVideos(videoItems, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ Video-Container mit ID '${containerId}' nicht gefunden.`);
        return;
    }
    container.innerHTML = ""; // Vorherigen Inhalt leeren

    if (!videoItems || videoItems.length === 0) {
        const noVideosMessage = document.createElement("p");
        noVideosMessage.textContent = "Keine Videos in dieser Collection gefunden.";
        container.appendChild(noVideosMessage);
        return;
    }

    videoItems.forEach((item, index) => {
        const fieldData = item.fieldData;
        const videoName = fieldData['video-name'];
        const videoLink = fieldData['video-link'];

        if (videoLink) {
            const videoWrapper = document.createElement("div");
            videoWrapper.classList.add("video-item-wrapper"); // Für optionales Styling
            videoWrapper.style.marginBottom = "20px"; // Etwas Abstand zwischen Videos

            // Optional: Video-Namen als Überschrift hinzufügen
            if (videoName) {
                const nameHeading = document.createElement("h3");
                nameHeading.textContent = videoName;
                nameHeading.style.marginBottom = "8px";
                videoWrapper.appendChild(nameHeading);
            }

            // Das Video-Element erstellen
            // ACHTUNG: Direkte String-Konstruktion ist anfällig, wenn 'videoLink' unsicher ist.
            // Da es von deiner eigenen Webflow-Collection kommt, ist das Risiko geringer.
            const videoElementHTML = `
                <video playsinline preload="metadata" autobuffer controls class="db-video-player" id="db-user-video--${index + 1}">
                    <source src="${videoLink}" type="video/mp4">
                    Dein Browser unterstützt das Video-Tag nicht.
                </video>
            `;
            // Füge das HTML sicher zum Wrapper hinzu
            videoWrapper.insertAdjacentHTML('beforeend', videoElementHTML);

            container.appendChild(videoWrapper);
        } else {
            console.warn(`⚠️ Video-Item ${item.id} hat keinen 'video-link'.`);
        }
    });
}

// ---- NEUE HAUPTFUNKTION ZUM ANZEIGEN DER VIDEOS ----
async function displayVideoCollection() {
    const containerId = "video-container"; // Stelle sicher, dass dieses Element im HTML existiert

    try {
        // Optional: Hole Memberstack-Daten, falls für Authentifizierung/Worker benötigt
        // const member = await window.$memberstackDom.getCurrentMember();
        // currentWebflowMemberId = member?.data?.customFields?.['webflow-member-id'];
        // if (!currentWebflowMemberId) {
        //     console.warn("⚠️ Kein 'webflow-member-id' im Memberstack-Profil gefunden, fahre aber fort.");
        //     // Je nach Worker-Konfiguration könnte der API-Call fehlschlagen
        // }

        console.log(`🚀 Lade Videos von Collection ID: ${VIDEO_COLLECTION_ID}`);
        const videoItems = await fetchCollectionItems(VIDEO_COLLECTION_ID);

        if (videoItems) {
            console.log(`📹 ${videoItems.length} Video(s) gefunden.`);
            renderVideos(videoItems, containerId);
        } else {
            console.log("Keine Video-Items zum Rendern vorhanden.");
            renderVideos([], containerId); // Leere den Container oder zeige Meldung an
        }

    } catch (error) {
        console.error("❌ Fehler beim Laden der Video-Collection:", error);
        // Optional: Fehlermeldung im UI anzeigen
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = "<p>Fehler beim Laden der Videos. Bitte versuche es später erneut.</p>";
        }
    }
}


// -- Bestehende Hauptfunktion für Jobs (unverändert) --
async function displayUserJobs() {
    const containerId = "booked-jobs-list"; // Stelle sicher, dass dieses Element im HTML existiert

    try {
        const member = await window.$memberstackDom.getCurrentMember();
        currentWebflowMemberId = member?.data?.customFields?.['webflow-member-id'];

        if (!currentWebflowMemberId) {
            console.error("❌ Kein 'webflow-member-id' im Memberstack-Profil gefunden.");
            renderJobs([], containerId); // Zeige leere Liste/Nachricht an
            return;
        }

        console.log(`👤 Lade Benutzerdaten für Member ID: ${currentWebflowMemberId}`);
        const userDataItem = await fetchSingleItem(USER_COLLECTION_ID, currentWebflowMemberId);
        // Die API für ein einzelnes Item gibt das Item direkt zurück
        const bookedJobIds = userDataItem?.fieldData?.["booked-jobs"] || [];
        console.log(`📚 Gefundene gebuchte Job IDs: ${bookedJobIds.length}`);

        const bookedJobsPromises = bookedJobIds.map(fetchJobData);
        const bookedJobs = await Promise.all(bookedJobsPromises);

        // Filtere null Ergebnisse heraus, falls fetchJobData fehlschlägt
        const validBookedJobs = bookedJobs.filter(job => job && Object.keys(job).length > 0);
        console.log(`✅ ${validBookedJobs.length} gültige Jobdaten geladen.`);

        renderJobs(validBookedJobs, containerId);

    } catch (error) {
        console.error("❌ Fehler beim Laden der Benutzer-Jobs:", error);
        renderJobs([], containerId); // Zeige leere Liste/Nachricht im Fehlerfall an
    }
}

// Start der Anwendung
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 DOM geladen. Starte Ladevorgänge...");
    displayUserJobs();        // Starte das Laden der Jobs
    displayVideoCollection(); // Starte das Laden der Videos
});
