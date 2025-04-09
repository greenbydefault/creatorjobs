/**
 * Debug-Modul - Unterstützt Logging und Fehleranalyse
 */
var Debug = (function() {
    // Konfiguration
    var config = {
        // Ob Debug-Modus aktiv ist (kann später in Produktion deaktiviert werden)
        enabled: true,
        // Minimales Log-Level (0=ALL, 1=INFO, 2=WARN, 3=ERROR)
        logLevel: 0,
        // Ob Logs auch in der Konsole angezeigt werden sollen
        logToConsole: true,
        // Ob Fehler an einen Server gemeldet werden sollen
        reportErrors: false,
        // URL für Fehlerberichte (falls aktiviert)
        errorReportUrl: ''
    };
    
    // Log-Level-Konstanten
    var LOG_LEVELS = {
        ALL: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        NONE: 999
    };
    
    // Log-Speicher für Debugging
    var logHistory = [];
    
    // Private Methoden
    function init(options) {
        // Konfiguration mit übergebenen Optionen überschreiben
        if (options) {
            for (var key in options) {
                if (options.hasOwnProperty(key) && config.hasOwnProperty(key)) {
                    config[key] = options[key];
                }
            }
        }
        
        // Globalen Error-Handler hinzufügen
        window.addEventListener('error', function(event) {
            error('Unbehandelte Ausnahme:', event.error);
            if (config.reportErrors) {
                reportError(event.error);
            }
        });
        
        info('Debug-Modul initialisiert mit Log-Level:', getLogLevelName(config.logLevel));
    }
    
    function getLogLevelName(level) {
        for (var name in LOG_LEVELS) {
            if (LOG_LEVELS[name] === level) {
                return name;
            }
        }
        return 'UNKNOWN';
    }
    
    function log(level, message, ...args) {
        if (!config.enabled || level < config.logLevel) {
            return;
        }
        
        var timestamp = new Date().toISOString();
        var levelName = getLogLevelName(level);
        var formattedMessage = `[${timestamp}] [${levelName}] ${message}`;
        
        // Log-Eintrag speichern
        logHistory.push({
            timestamp: timestamp,
            level: level,
            levelName: levelName,
            message: message,
            args: args
        });
        
        // In Konsole ausgeben, wenn aktiviert
        if (config.logToConsole) {
            switch (level) {
                case LOG_LEVELS.ERROR:
                    console.error(formattedMessage, ...args);
                    break;
                case LOG_LEVELS.WARN:
                    console.warn(formattedMessage, ...args);
                    break;
                default:
                    console.log(formattedMessage, ...args);
            }
        }
    }
    
    function info(message, ...args) {
        log(LOG_LEVELS.INFO, message, ...args);
    }
    
    function warn(message, ...args) {
        log(LOG_LEVELS.WARN, message, ...args);
    }
    
    function error(message, ...args) {
        log(LOG_LEVELS.ERROR, message, ...args);
    }
    
    function reportError(error) {
        if (!config.reportErrors || !config.errorReportUrl) {
            return;
        }
        
        var errorData = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // Fehler an Server melden
        fetch(config.errorReportUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(errorData)
        }).catch(function(err) {
            // Stille Verarbeitung, um endlose Fehler-Loops zu vermeiden
            console.error('Fehler beim Melden des Fehlers:', err);
        });
    }
    
    function inspectObject(obj, label) {
        if (!config.enabled || config.logLevel > LOG_LEVELS.INFO) {
            return;
        }
        
        label = label || 'Objekt-Inspektion';
        
        try {
            info(`${label}:`, JSON.stringify(obj, null, 2));
        } catch (err) {
            warn(`${label} (nicht serialisierbar):`, obj);
        }
    }
    
    function getLogHistory() {
        return logHistory.slice(); // Kopie zurückgeben
    }
    
    function clearLogHistory() {
        logHistory = [];
        info('Log-Historie gelöscht');
    }
    
    function startPerformanceTimer(label) {
        if (!config.enabled) return null;
        
        var timerId = `timer_${label}_${Date.now()}`;
        performance.mark(timerId + '_start');
        
        return {
            id: timerId,
            stop: function() {
                return stopPerformanceTimer(this.id);
            }
        };
    }
    
    function stopPerformanceTimer(timerId) {
        if (!config.enabled) return 0;
        
        performance.mark(timerId + '_end');
        performance.measure(timerId, timerId + '_start', timerId + '_end');
        
        var measures = performance.getEntriesByName(timerId);
        var duration = measures.length > 0 ? measures[0].duration : 0;
        
        info(`Performance [${timerId}]: ${duration.toFixed(2)}ms`);
        
        // Aufräumen
        performance.clearMarks(timerId + '_start');
        performance.clearMarks(timerId + '_end');
        performance.clearMeasures(timerId);
        
        return duration;
    }
    
    // Öffentliche API
    return {
        init: init,
        LOG_LEVELS: LOG_LEVELS,
        info: info,
        warn: warn,
        error: error,
        inspectObject: inspectObject,
        getLogHistory: getLogHistory,
        clearLogHistory: clearLogHistory,
        startPerformanceTimer: startPerformanceTimer,
        stopPerformanceTimer: stopPerformanceTimer,
        
        // Konfigurationshilfen
        enableDebug: function() {
            config.enabled = true;
            info('Debug-Modus aktiviert');
        },
        disableDebug: function() {
            info('Debug-Modus wird deaktiviert');
            config.enabled = false;
        },
        setLogLevel: function(level) {
            config.logLevel = level;
            if (config.enabled) {
                info('Log-Level geändert auf:', getLogLevelName(level));
            }
        }
    };
})();

// Direkt initialisieren
Debug.init();
