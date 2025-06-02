// src/index.js

// Konfigurationen zuerst, da andere Module davon abhängen könnten
import './config/apiConfig.js';
import './config/mappings.js';

// Hilfsfunktionen und Cache als nächstes
import './utils/helpers.js';
import './core/cache-1.1.js';
import './core/planStatusChecker-1.01.js';

// Services, die Konfiguration und Utils verwenden
import './services/webflowService.js';
import './services/chatService-1.2.js'; 
// Kernlogik (Scoring, Datenverarbeitung)
// import './core/matchScoring.js';
// dataProcessing hängt von loadAndDisplayApplicantsForJob ab, das in appLogic ist.
// Die Funktionen in dataProcessing werden aber erst später durch UI-Events aufgerufen.
// Es ist wichtig, dass zur Definitionszeit alle Abhängigkeiten für die Funktionskörper vorhanden sind,
// oder dass sie zur Laufzeit über window.WEBFLOW_API geholt werden.

// UI Elemente
import './ui/skeleton.js';
import './ui/applicantElements-1.5.js';
import './ui/pagination.js';
import './ui/jobElements-1.5.js';
import './ui/sidebar-3.4.js';
import './ui/notesSidebar.js';
// Kernlogik, die UI-Elemente und Services verwendet
// dataProcessing hier, da es ui.applicantElements (für Filter-Callback-Setup) und appLogic (für Reload) referenziert
import './core/dataProcessing-1.9.js';


// Hauptanwendungslogik, die viele der obigen Module orchestriert
import './appLogic-1.6.js';

// Initialisierungsskript, das die appLogic startet
import './main-1.2.js';

// Nach dem Import aller Module sind die Funktionen und Variablen
// unter window.WEBFLOW_API verfügbar.
// Die Initialisierung erfolgt durch main.js via DOMContentLoaded.

// Hinweis: Die Reihenfolge der Imports ist wichtig, wenn ein Modul
// beim direkten Ausführen (also nicht nur bei Funktionsdefinitionen)
// von Variablen/Funktionen eines anderen Moduls abhängt, die über window.WEBFLOW_API
// bereitgestellt werden. In diesem Fall werden die meisten Abhängigkeiten
// erst zur Laufzeit innerhalb der Funktionen aufgelöst, was die strikte Reihenfolge
// etwas weniger kritisch macht, aber eine logische Reihenfolge ist dennoch gut.
