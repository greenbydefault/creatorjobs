(function() {
    'use strict';

    // Stelle sicher, dass WEBFLOW_API existiert
    window.WEBFLOW_API = window.WEBFLOW_API || {};
    window.WEBFLOW_API.config = window.WEBFLOW_API.config || {};

    // Globale Objekte
    const CONFIG = window.WEBFLOW_API.config;
    const DEBUG = window.WEBFLOW_API.debug || {
        log: function(message, data = null, level = 'info') {
            console.log(`[${level}] ${message}`, data || '');
        }
    };

    class DiagnosticsService {
        constructor() {
            this.diagnosticsResults = {};
        }

        /**
         * Führt eine vollständige Diagnose durch
         */
        async runFullDiagnosis() {
            console.group("🔍 WEBFLOW API DIAGNOSE");
            try {
                console.log("Startet umfassende Diagnose...");
                
                // 1. Umgebungsinformationen sammeln
                this.collectEnvironmentInfo();
                
                // 2. Konfiguration überprüfen
                this.checkConfiguration();
                
                // 3. Memberstack-Benutzer prüfen
                await this.checkMemberstackUser();
                
                // 4. Webflow-Benutzer prüfen
                await this.checkWebflowUser();
                
                // 5. API-Verbindung überprüfen
                await this.checkApiConnection();
                
                // 6. Ergebnisse anzeigen
                this.displayResults();
            } catch (error) {
                console.error("Fehler während der Diagnose:", error);
            } finally {
                console.groupEnd();
            }
        }

        /**
         * Sammelt Umgebungsinformationen
         */
        collectEnvironmentInfo() {
            console.log("📊 Umgebungsinformationen werden gesammelt...");
            
            this.diagnosticsResults.environment = {
                url: window.location.href,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                screenSize: `${window.innerWidth}x${window.innerHeight}`
            };
            
            console.log("Umgebungsinformationen:", this.diagnosticsResults.environment);
        }

        /**
         * Überprüft die Konfiguration
         */
        checkConfiguration() {
            console.log("⚙️ Konfiguration wird überprüft...");
            
            // Überprüfen der wichtigsten Konfigurationseinstellungen
            const configCheck = {
                baseUrl: CONFIG.BASE_URL || 'nicht gesetzt',
                membersCollectionId: CONFIG.MEMBERS_COLLECTION_ID || 'nicht gesetzt',
                videosCollectionId: CONFIG.COLLECTION_ID || 'nicht gesetzt',
                cacheExpiration: CONFIG.CACHE_EXPIRATION || 'nicht gesetzt',
                moduleStatus: {
                    debug: !!window.WEBFLOW_API.debug,
                    memberstack: !!window.WEBFLOW_API.MEMBERSTACK,
                    memberApi: !!window.WEBFLOW_API.MEMBER_API,
                    videoApi: !!window.WEBFLOW_API.VIDEO_API,
                    uploadcare: !!window.WEBFLOW_API.UPLOADCARE,
                    ui: !!window.WEBFLOW_API.UI
                }
            };
            
            this.diagnosticsResults.configuration = configCheck;
            console.log("Konfigurationsstatus:", configCheck);
        }

        /**
         * Überprüft den Memberstack-Benutzer
         */
        async checkMemberstackUser() {
            console.log("👤 Memberstack-Benutzer wird überprüft...");
            
            try {
                const memberstackCheck = { status: 'nicht initiert' };
                
                // Prüfen, ob Memberstack verfügbar ist
                if (!window.$memberstackDom) {
                    memberstackCheck.status = 'fehler';
                    memberstackCheck.error = '$memberstackDom nicht gefunden';
                    memberstackCheck.suggestion = 'Memberstack-Skript möglicherweise nicht geladen';
                } else {
                    memberstackCheck.status = 'verfügbar';
                    
                    // Aktuellen Benutzer abrufen
                    try {
                        const member = await window.$memberstackDom.getCurrentMember();
                        
                        if (!member || !member.data) {
                            memberstackCheck.status = 'kein_benutzer';
                            memberstackCheck.error = 'Kein eingeloggter Benutzer gefunden';
                        } else {
                            memberstackCheck.status = 'benutzer_gefunden';
                            memberstackCheck.memberId = member.data.id;
                            memberstackCheck.memberDetails = {
                                email: member.data.email || 'nicht verfügbar',
                                name: member.data.name || 'nicht verfügbar',
                                planStatus: member.data.status || 'nicht verfügbar'
                            };
                            
                            // Nach WebflowId in Custom Fields suchen
                            if (member.data.customFields) {
                                const customFields = member.data.customFields;
                                memberstackCheck.customFields = {};
                                
                                // Alle Custom Fields durchsuchen, die mit "webflow" zu tun haben könnten
                                Object.keys(customFields).forEach(key => {
                                    if (key.toLowerCase().includes('webflow')) {
                                        memberstackCheck.customFields[key] = customFields[key];
                                    }
                                });
                                
                                // Spezifisch nach bekannten Feldern suchen
                                const webflowIdFields = [
                                    'webflow-member-id', 
                                    'webflowId', 
                                    'webflow_id', 
                                    'webflow-id'
                                ];
                                
                                webflowIdFields.forEach(field => {
                                    if (customFields[field]) {
                                        memberstackCheck.webflowId = customFields[field];
                                        memberstackCheck.webflowIdField = field;
                                    }
                                });
                            }
                            
                            // Nach WebflowId in MetaData suchen
                            if (member.data.metaData) {
                                const metaData = member.data.metaData;
                                memberstackCheck.metaData = {};
                                
                                // Alle Meta Data durchsuchen, die mit "webflow" zu tun haben könnten
                                Object.keys(metaData).forEach(key => {
                                    if (key.toLowerCase().includes('webflow')) {
                                        memberstackCheck.metaData[key] = metaData[key];
                                    }
                                });
                                
                                // Spezifisch nach bekannten Feldern suchen
                                const webflowIdFields = [
                                    'webflow-member-id', 
                                    'webflowId', 
                                    'webflow_id', 
                                    'webflow-id'
                                ];
                                
                                webflowIdFields.forEach(field => {
                                    if (metaData[field] && !memberstackCheck.webflowId) {
                                        memberstackCheck.webflowId = metaData[field];
                                        memberstackCheck.webflowIdField = field;
                                    }
                                });
                            }
                        }
                    } catch (memberError) {
                        memberstackCheck.status = 'fehler';
                        memberstackCheck.error = memberError.message;
                        memberstackCheck.stack = memberError.stack;
                    }
                }
                
                this.diagnosticsResults.memberstack = memberstackCheck;
                console.log("Memberstack-Status:", memberstackCheck);
                
            } catch (error) {
                console.error("Fehler bei der Memberstack-Überprüfung:", error);
                this.diagnosticsResults.memberstack = {
                    status: 'kritischer_fehler',
                    error: error.message,
                    stack: error.stack
                };
            }
        }

        /**
         * Überprüft den Webflow-Benutzer
         */
        async checkWebflowUser() {
            console.log("🌊 Webflow-Benutzer wird überprüft...");
            
            try {
                const webflowCheck = { status: 'nicht initiiert' };
                
                // Prüfen, ob Member-API verfügbar ist
                if (!window.WEBFLOW_API.MEMBER_API) {
                    webflowCheck.status = 'fehler';
                    webflowCheck.error = 'MEMBER_API nicht gefunden';
                    webflowCheck.suggestion = 'MEMBER_API-Modul möglicherweise nicht geladen';
                } else {
                    webflowCheck.status = 'api_verfügbar';
                    
                    // WebflowId aus der vorherigen Memberstack-Überprüfung holen
                    const webflowId = this.diagnosticsResults.memberstack && 
                                     this.diagnosticsResults.memberstack.webflowId;
                    
                    if (!webflowId) {
                        webflowCheck.status = 'keine_id';
                        webflowCheck.error = 'Keine Webflow-ID in Memberstack-Daten gefunden';
                        webflowCheck.suggestion = 'Überprüfe die Memberstack-Integration oder Custom Fields';
                    } else {
                        webflowCheck.webflowId = webflowId;
                        
                        // Versuche, den Benutzer mit der WebflowId zu finden
                        try {
                            // Kleine Verzögerung für API-Stabilität
                            await new Promise(resolve => setTimeout(resolve, 500));
                            
                            // API-URL direkt erstellen für mehr Transparenz
                            const memberCollectionId = CONFIG.MEMBERS_COLLECTION_ID;
                            const apiUrl = `${CONFIG.BASE_URL}/${memberCollectionId}/items/${webflowId}/live`;
                            
                            webflowCheck.apiUrl = apiUrl;
                            
                            // Worker-URL erstellen
                            const workerUrl = this.buildWorkerUrl(apiUrl);
                            webflowCheck.workerUrl = workerUrl;
                            
                            // Direkter API-Aufruf mit Fetch, um möglichst nahe an der Quelle zu sein
                            const response = await fetch(workerUrl);
                            
                            if (!response.ok) {
                                webflowCheck.status = 'api_fehler';
                                webflowCheck.httpStatus = response.status;
                                webflowCheck.statusText = response.statusText;
                                
                                try {
                                    const errorText = await response.text();
                                    webflowCheck.errorResponse = errorText;
                                } catch (readError) {
                                    webflowCheck.errorResponse = 'Fehler beim Lesen der Antwort';
                                }
                                
                                // Spezifische Diagnose basierend auf Statuscode
                                if (response.status === 404) {
                                    webflowCheck.detailedDiagnosis = 'Benutzer nicht gefunden. Die Webflow-ID existiert nicht in der Collection.';
                                    webflowCheck.suggestion = 'Überprüfe die Webflow-ID und die Members-Collection-ID.';
                                } else if (response.status === 401 || response.status === 403) {
                                    webflowCheck.detailedDiagnosis = 'Keine Berechtigung. API-Zugriff könnte eingeschränkt sein.';
                                    webflowCheck.suggestion = 'Überprüfe die API-Zugriffstoken und Berechtigungen.';
                                } else {
                                    webflowCheck.detailedDiagnosis = 'Unbekannter API-Fehler.';
                                }
                            } else {
                                const userData = await response.json();
                                
                                if (!userData || !userData.id) {
                                    webflowCheck.status = 'ungültige_antwort';
                                    webflowCheck.apiResponse = userData;
                                    webflowCheck.detailedDiagnosis = 'Die API-Antwort enthält keine gültige Benutzer-ID.';
                                } else {
                                    webflowCheck.status = 'benutzer_gefunden';
                                    webflowCheck.userId = userData.id;
                                    
                                    // Minimal benutzerdaten speichern
                                    webflowCheck.userDetails = {
                                        id: userData.id,
                                        slug: userData.slug || 'nicht verfügbar'
                                    };
                                    
                                    // Überprüfen des video-feed Feldes
                                    if (userData.fieldData && userData.fieldData["video-feed"]) {
                                        webflowCheck.videoFeed = {
                                            exists: true,
                                            type: Array.isArray(userData.fieldData["video-feed"]) ? 'array' : typeof userData.fieldData["video-feed"],
                                            count: Array.isArray(userData.fieldData["video-feed"]) ? userData.fieldData["video-feed"].length : 0
                                        };
                                        
                                        if (Array.isArray(userData.fieldData["video-feed"]) && userData.fieldData["video-feed"].length > 0) {
                                            webflowCheck.videoFeed.sample = userData.fieldData["video-feed"].slice(0, 3);
                                        }
                                    } else {
                                        webflowCheck.videoFeed = {
                                            exists: false,
                                            suggestion: 'video-feed Feld fehlt in den Benutzerdaten. Überprüfe das Feldschema in Webflow.'
                                        };
                                    }
                                }
                            }
                        } catch (apiError) {
                            webflowCheck.status = 'netzwerk_fehler';
                            webflowCheck.error = apiError.message;
                            webflowCheck.stack = apiError.stack;
                            webflowCheck.suggestion = 'Möglicherweise ein Problem mit der Netzwerkverbindung oder dem CORS-Setup.';
                        }
                    }
                }
                
                this.diagnosticsResults.webflow = webflowCheck;
                console.log("Webflow-Status:", webflowCheck);
                
            } catch (error) {
                console.error("Fehler bei der Webflow-Überprüfung:", error);
                this.diagnosticsResults.webflow = {
                    status: 'kritischer_fehler',
                    error: error.message,
                    stack: error.stack
                };
            }
        }

        /**
         * Überprüft die API-Verbindung
         */
        async checkApiConnection() {
            console.log("🔌 API-Verbindung wird überprüft...");
            
            try {
                const apiCheck = { status: 'nicht initiiert' };
                
                // Prüfen, ob API-Service verfügbar ist
                if (!window.WEBFLOW_API.apiService) {
                    apiCheck.status = 'fehler';
                    apiCheck.error = 'API-Service nicht gefunden';
                    apiCheck.suggestion = 'API-Service-Modul möglicherweise nicht geladen';
                } else {
                    apiCheck.status = 'api_verfügbar';
                    
                    // Einfachen Testaufruf zur Members-Collection machen
                    try {
                        const memberCollectionId = CONFIG.MEMBERS_COLLECTION_ID;
                        const apiUrl = `${CONFIG.BASE_URL}/${memberCollectionId}`;
                        const workerUrl = this.buildWorkerUrl(apiUrl);
                        
                        apiCheck.testUrl = apiUrl;
                        apiCheck.workerUrl = workerUrl;
                        
                        const response = await fetch(workerUrl);
                        
                        if (!response.ok) {
                            apiCheck.status = 'api_fehler';
                            apiCheck.httpStatus = response.status;
                            apiCheck.statusText = response.statusText;
                            
                            try {
                                const errorText = await response.text();
                                apiCheck.errorResponse = errorText;
                            } catch (readError) {
                                apiCheck.errorResponse = 'Fehler beim Lesen der Antwort';
                            }
                        } else {
                            const collectionData = await response.json();
                            
                            apiCheck.status = 'verbindung_erfolgreich';
                            apiCheck.collectionId = collectionData.id || 'nicht verfügbar';
                            apiCheck.collectionName = collectionData.displayName || 'nicht verfügbar';
                        }
                    } catch (apiError) {
                        apiCheck.status = 'netzwerk_fehler';
                        apiCheck.error = apiError.message;
                        apiCheck.stack = apiError.stack;
                        apiCheck.suggestion = 'Möglicherweise ein Problem mit der Netzwerkverbindung oder dem CORS-Setup.';
                    }
                }
                
                this.diagnosticsResults.api = apiCheck;
                console.log("API-Status:", apiCheck);
                
            } catch (error) {
                console.error("Fehler bei der API-Überprüfung:", error);
                this.diagnosticsResults.api = {
                    status: 'kritischer_fehler',
                    error: error.message,
                    stack: error.stack
                };
            }
        }

        /**
         * Zeigt die Diagnose-Ergebnisse an
         */
        displayResults() {
            console.log("📋 Diagnose-Ergebnisse werden angezeigt...");
            
            // Ergebnisse zusammenfassen
            const summary = {
                timestamp: new Date().toISOString(),
                overallStatus: 'ok',
                findings: [],
                recommendations: []
            };
            
            // Memberstack-Status analysieren
            if (this.diagnosticsResults.memberstack) {
                const ms = this.diagnosticsResults.memberstack;
                
                if (ms.status === 'fehler' || ms.status === 'kritischer_fehler') {
                    summary.overallStatus = 'fehler';
                    summary.findings.push(`Memberstack-Fehler: ${ms.error}`);
                    summary.recommendations.push('Überprüfe die Memberstack-Integration und die JavaScript-Konsole auf Fehler.');
                } else if (ms.status === 'kein_benutzer') {
                    summary.overallStatus = 'warnung';
                    summary.findings.push('Kein eingeloggter Memberstack-Benutzer gefunden.');
                    summary.recommendations.push('Der Benutzer muss eingeloggt sein, um die Funktionalität zu nutzen.');
                } else if (ms.status === 'benutzer_gefunden' && !ms.webflowId) {
                    summary.overallStatus = 'fehler';
                    summary.findings.push('Memberstack-Benutzer gefunden, aber keine Webflow-ID in den Benutzerdaten.');
                    summary.recommendations.push('Überprüfe die Memberstack-Integration und stelle sicher, dass die Webflow-ID als Custom Field oder Meta Data gespeichert ist.');
                }
            }
            
            // Webflow-Status analysieren
            if (this.diagnosticsResults.webflow) {
                const wf = this.diagnosticsResults.webflow;
                
                if (wf.status === 'fehler' || wf.status === 'kritischer_fehler' || wf.status === 'api_fehler' || wf.status === 'netzwerk_fehler') {
                    summary.overallStatus = 'fehler';
                    summary.findings.push(`Webflow-API-Fehler: ${wf.error || wf.detailedDiagnosis || 'Unbekannter Fehler'}`);
                    if (wf.suggestion) {
                        summary.recommendations.push(wf.suggestion);
                    }
                } else if (wf.status === 'keine_id') {
                    summary.overallStatus = 'fehler';
                    summary.findings.push('Keine Webflow-ID verfügbar, um den Benutzer zu finden.');
                    summary.recommendations.push('Überprüfe die Memberstack-Integration und stelle sicher, dass die Webflow-ID korrekt gespeichert ist.');
                } else if (wf.status === 'ungültige_antwort') {
                    summary.overallStatus = 'fehler';
                    summary.findings.push('Die Webflow-API-Antwort enthält keine gültigen Benutzerdaten.');
                    summary.recommendations.push('Überprüfe die API-Zugriffsrechte und die Members-Collection in Webflow.');
                }
            }
            
            // API-Status analysieren
            if (this.diagnosticsResults.api) {
                const api = this.diagnosticsResults.api;
                
                if (api.status === 'fehler' || api.status === 'kritischer_fehler' || api.status === 'api_fehler' || api.status === 'netzwerk_fehler') {
                    summary.overallStatus = 'fehler';
                    summary.findings.push(`API-Verbindungsfehler: ${api.error || api.statusText || 'Unbekannter Fehler'}`);
                    if (api.suggestion) {
                        summary.recommendations.push(api.suggestion);
                    }
                }
            }
            
            // Gesamtergebnis anzeigen
            console.log("%c📊 DIAGNOSE-ZUSAMMENFASSUNG", "font-size: 14px; font-weight: bold; color: #4CAF50;");
            console.log(`Status: ${summary.overallStatus.toUpperCase()}`);
            
            if (summary.findings.length > 0) {
                console.log("%c🔍 Erkenntnisse:", "font-weight: bold;");
                summary.findings.forEach((finding, index) => {
                    console.log(`${index + 1}. ${finding}`);
                });
            }
            
            if (summary.recommendations.length > 0) {
                console.log("%c💡 Empfehlungen:", "font-weight: bold;");
                summary.recommendations.forEach((rec, index) => {
                    console.log(`${index + 1}. ${rec}`);
                });
            }
            
            // Alle Details ausgeben
            console.log("%c🧩 ALLE DETAILS:", "font-size: 14px; font-weight: bold;");
            console.log(this.diagnosticsResults);
            
            // Global speichern für spätere Analyse
            window.WEBFLOW_API.diagnosticsResults = this.diagnosticsResults;
            window.WEBFLOW_API.diagnosticsSummary = summary;
        }

        /**
         * Erstellt eine Worker-URL für Cross-Origin-Anfragen
         */
        buildWorkerUrl(apiUrl) {
            return `${CONFIG.WORKER_BASE_URL}${encodeURIComponent(apiUrl)}`;
        }
    }

    // Service registrieren
    window.WEBFLOW_API.diagnostics = new DiagnosticsService();
    
    // Globale Diagnose-Funktion exportieren
    window.runWebflowDiagnosis = function() {
        if (window.WEBFLOW_API && window.WEBFLOW_API.diagnostics) {
            return window.WEBFLOW_API.diagnostics.runFullDiagnosis();
        } else {
            console.error("Diagnose-Service nicht verfügbar");
            return false;
        }
    };

    console.log("🔍 Diagnose-Service initialisiert. Rufe window.runWebflowDiagnosis() auf, um eine umfassende Diagnose durchzuführen.");
})();
