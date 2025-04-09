/**
 * Contract Generator - Main Bundle Entry Point
 * Dieses Skript initialisiert alle Module und startet die Anwendung
 */

(function() {
    // Beim Laden des DOM die Anwendung initialisieren
    document.addEventListener('DOMContentLoaded', function() {
        // Debug-Modul wird automatisch initialisiert beim Laden
        Debug.info('Contract Generator wird initialisiert');
        Debug.info('Version: 1.0.0');
        
        try {
            // Performance-Timer starten
            var initTimer = Debug.startPerformanceTimer('appInitialization');
            
            // Module in der richtigen Reihenfolge initialisieren
            
            // 1. Kern-Module initialisieren
            Debug.info('Initialisiere Kern-Module...');
            
            PDFGenerator.init();
            UIController.init();
            Validation.init();
            Navigation.init();
            
            // 2. Vertragstyp-Factory initialisieren
            Debug.info('Initialisiere Vertragstyp-Factory...');
            ContractTypeFactory.init();
            
            // 3. Verfügbare Vertragstypen registrieren
            Debug.info('Registriere verfügbare Vertragstypen...');
            
            // Influencer-Vertragstyp registrieren (wird im Modul bereits registriert)
            // Weitere Vertragstypen hier registrieren, falls nötig
            
            // 4. Hauptmodul initialisieren und ersten Vertragstyp laden
            Debug.info('Initialisiere Hauptmodul und lade Standard-Vertragstyp...');
            ContractGenerator.init();
            
            // Performance-Timer stoppen
            initTimer.stop();
            
            // Log erfolgreiche Initialisierung
            Debug.info('Contract Generator erfolgreich initialisiert!');
            
            // In Konsole anzeigen, wie man den Debug-Modus verwenden kann
            if (Debug.LOG_LEVELS) {
                console.log('%cContract Generator Debug', 'color: #4CAF50; font-size: 14px; font-weight: bold;');
                console.log('Verfügbare Debug-Befehle:');
                console.log('- Debug.enableDebug() / Debug.disableDebug()');
                console.log('- Debug.setLogLevel(Debug.LOG_LEVELS.INFO/WARN/ERROR)');
                console.log('- Debug.getLogHistory()');
                console.log('- Debug.inspectObject(obj, "Label")');
            }
            
        } catch (error) {
            console.error('Fehler bei der Initialisierung der Anwendung:', error);
            
            // Versuche Debug zu verwenden, falls verfügbar
            if (typeof Debug !== 'undefined' && Debug.error) {
                Debug.error('Kritischer Fehler bei der Initialisierung:', error);
            }
            
            // Benutzer informieren
            alert('Bei der Initialisierung der Anwendung ist ein Fehler aufgetreten. Bitte laden Sie die Seite neu oder kontaktieren Sie den Support.');
        }
    });
})();/**
 * Contract Generator - Main Bundle Entry Point
 * Dieses Skript initialisiert alle Module und startet die Anwendung
 */

(function() {
    // Beim Laden des DOM die Anwendung initialisieren
    document.addEventListener('DOMContentLoaded', function() {
        // Debug-Modul wird automatisch initialisiert beim Laden
        Debug.info('Contract Generator wird initialisiert');
        Debug.info('Version: 1.0.0');
        
        try {
            // Performance-Timer starten
            var initTimer = Debug.startPerformanceTimer('appInitialization');
            
            // Module in der richtigen Reihenfolge initialisieren
            
            // 1. Kern-Module initialisieren
            Debug.info('Initialisiere Kern-Module...');
            
            PDFGenerator.init();
            UIController.init();
            Validation.init();
            Navigation.init();
            
            // 2. Vertragstyp-Factory initialisieren
            Debug.info('Initialisiere Vertragstyp-Factory...');
            ContractTypeFactory.init();
            
            // 3. Verfügbare Vertragstypen registrieren
            Debug.info('Registriere verfügbare Vertragstypen...');
            
            // Influencer-Vertragstyp registrieren (wird im Modul bereits registriert)
            // Weitere Vertragstypen hier registrieren, falls nötig
            
            // 4. Hauptmodul initialisieren und ersten Vertragstyp laden
            Debug.info('Initialisiere Hauptmodul und lade Standard-Vertragstyp...');
            ContractGenerator.init();
            
            // Performance-Timer stoppen
            initTimer.stop();
            
            // Log erfolgreiche Initialisierung
            Debug.info('Contract Generator erfolgreich initialisiert!');
            
            // In Konsole anzeigen, wie man den Debug-Modus verwenden kann
            if (Debug.LOG_LEVELS) {
                console.log('%cContract Generator Debug', 'color: #4CAF50; font-size: 14px; font-weight: bold;');
                console.log('Verfügbare Debug-Befehle:');
                console.log('- Debug.enableDebug() / Debug.disableDebug()');
                console.log('- Debug.setLogLevel(Debug.LOG_LEVELS.INFO/WARN/ERROR)');
                console.log('- Debug.getLogHistory()');
                console.log('- Debug.inspectObject(obj, "Label")');
            }
            
        } catch (error) {
            console.error('Fehler bei der Initialisierung der Anwendung:', error);
            
            // Versuche Debug zu verwenden, falls verfügbar
            if (typeof Debug !== 'undefined' && Debug.error) {
                Debug.error('Kritischer Fehler bei der Initialisierung:', error);
            }
            
            // Benutzer informieren
            alert('Bei der Initialisierung der Anwendung ist ein Fehler aufgetreten. Bitte laden Sie die Seite neu oder kontaktieren Sie den Support.');
        }
    });
})();
