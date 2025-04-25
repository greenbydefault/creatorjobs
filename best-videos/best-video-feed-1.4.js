// --- Angepasste Filterkonfiguration mit NEUEN Checkbox-IDs ---
const filterConfig = [
    {
        field: 'kategorie', // Webflow Feld-ID (Slug)
        filters: [
            // ID von 'kategorie-influencer' zu 'influencer' geändert
            { id: "influencer", value: "influencer", display: "Kategorie: Influencer" },
            // ID von 'kategorie-ugc' zu 'ugc' geändert
            { id: "ugc", value: "ugc", display: "Kategorie: UGC" }
        ]
    },
    {
        field: 'produktionsort', // Webflow Feld-ID (Slug)
        filters: [
             // ID von 'kategorie-vorort' zu 'vorort' geändert
            { id: "vorort", value: "vor ort", display: "Ort: Vor Ort" },
             // ID von 'kategorie-creatorproduktion' zu 'creatorproduktion' geändert
            { id: "creatorproduktion", value: "creatorproduktion", display: "Ort: Creatorproduktion" }
        ]
    },
    {
        field: 'anzeigentype', // Webflow Feld-ID (Slug)
        filters: [
             // ID von 'kategorie-paid' zu 'paid' geändert
            { id: "paid", value: "paid", display: "Typ: Paid" },
             // ID von 'kategorie-werbeanzeige' zu 'werbung' geändert
            { id: "werbung", value: "werbeanzeige", display: "Typ: Werbeanzeige" }
        ]
    }
    // Füge hier bei Bedarf weitere Filtergruppen hinzu
];

// ... (Der Rest des JavaScript-Codes bleibt unverändert) ...

// Beispielhaft, wie der gesamte Code jetzt aussieht (nur der geänderte Teil ist relevant):

// 🌐 Optimierte Webflow API Integration für GitHub-Hosting
// ... (Konstanten wie API_BASE_URL etc.) ...
let currentWebflowMemberId = null;
let allVideoItems = [];
const videoContainerId = "video-container";
const filterTagWrapperId = "filter-tag-wrapper";

// --- Angepasste Filterkonfiguration mit NEUEN Checkbox-IDs ---
const filterConfig = [
    { /* ... Kategorie ... */
        field: 'kategorie',
        filters: [ { id: "influencer", value: "influencer", display: "Kategorie: Influencer" }, { id: "ugc", value: "ugc", display: "Kategorie: UGC" } ]
    }, { /* ... Produktionsort ... */
        field: 'produktionsort',
        filters: [ { id: "vorort", value: "vor ort", display: "Ort: Vor Ort" }, { id: "creatorproduktion", value: "creatorproduktion", display: "Ort: Creatorproduktion" } ]
    }, { /* ... Anzeigentype ... */
        field: 'anzeigentype',
        filters: [ { id: "paid", value: "paid", display: "Typ: Paid" }, { id: "werbung", value: "werbeanzeige", display: "Typ: Werbeanzeige" } ]
    }
];

// ... (Restliche Funktionen: buildWorkerUrl, calculateCountdown, fetch..., renderJobs, renderVideos, renderFilterTags, applyFiltersAndRender, displayVideoCollection, displayUserJobs) ...

// ... (DOMContentLoaded Event Listener) ...
