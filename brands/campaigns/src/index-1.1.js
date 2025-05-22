// src/index.js
// Diese Datei stellt sicher, dass alle Module in der korrekten Reihenfolge
// ausgeführt werden, wenn das Bundle geladen wird.
// Jedes Modul hängt sich selbst an window.WEBFLOW_API an.

// Wichtige Reihenfolge für Abhängigkeiten:
// 1. config: Stellt globale Konstanten bereit.
// 2. state: Initialisiert den globalen Zustand.
// 3. utils: Stellt Hilfsfunktionen bereit.
// 4. apiService: Benötigt config und utils.
// 5. memberService: Benötigt state.
// 6. scoringService: Benötigt config (MAPPINGS).
// 7. uiElements: Benötigt config (MAPPINGS), utils, state.
// 8. uiManager: Benötigt config, state, apiService, scoringService, uiElements.
// 9. app: Benötigt alle vorherigen Module, um die Anwendung zu initialisieren und zu starten.

// Der Bundler (Rollup/Vite) wird diese Importe verarbeiten und den Code
// der jeweiligen Dateien ausführen, wodurch die IIFEs getriggert werden.

import './config.js';
import './state.js';
import './utils.js';
import './apiService-1.0.js';
import './memberService.js';
import './scoringService.js';
import './uiElements.js';
import './uiManager.js'; // Stellt sicher, dass uiManager.js (aus dem Kontext) ausgeführt wird
import './app.js';

// Da sich alle Module an window.WEBFLOW_API anhängen, muss diese Datei nichts explizit exportieren.
// Der output.name: 'WEBFLOW_API' in der Bundler-Konfiguration ist weniger kritisch,
// aber es schadet nicht, ihn beizubehalten.
// Man könnte hier optional window.WEBFLOW_API zurückgeben, wenn der Bundler einen Export erwartet:
// export default window.WEBFLOW_API;
// Aber für reine Seiteneffekte (Ausführung der IIFEs) ist kein Export nötig.
