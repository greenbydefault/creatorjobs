/**
 * Debug-Modul - Unterstützt Logging und Fehleranalyse
 */
(function() {
  'use strict';
  
  // Zugriff auf die Konfiguration
  const config = window.ContractGenerator && window.ContractGenerator.config || { DEBUG_MODE: true };
  
  // Konfiguration
  var debugConfig = {
    // Ob Debug-Modus aktiv ist
    enabled: config.DEBUG_MODE,
    // Minimales Log-Level (0=ALL, 1=INFO, 2=WARN, 3=ERROR)
    logLevel: 0,
    // Ob Logs auch in der Konsole angezeigt werden sollen
    logToConsole: true
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
        if (options.hasOwnProperty(key) && debugConfig.hasOwnProperty(key)) {
          debugConfig[key] = options[key];
        }
      }
    }
    
    // Globalen Error-Handler hinzufügen
    window.addEventListener('error', function(event) {
      error('Unbehandelte Ausnahme:', event.error);
    });
    
    info('Debug-Modul initialisiert mit Log-Level:', getLogLevelName(debugConfig.logLevel));
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
    if (!debugConfig.enabled || level < debugConfig.logLevel) {
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
    if (debugConfig.logToConsole) {
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
  
  function inspectObject(obj, label) {
    if (!debugConfig.enabled || debugConfig.logLevel > LOG_LEVELS.INFO) {
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
    if (!debugConfig.enabled) return null;
    
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
    if (!debugConfig.enabled) return 0;
    
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
  
  // Debug-Modul definieren
  var Debug = {
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
      debugConfig.enabled = true;
      info('Debug-Modus aktiviert');
    },
    disableDebug: function() {
      info('Debug-Modus wird deaktiviert');
      debugConfig.enabled = false;
    },
    setLogLevel: function(level) {
      debugConfig.logLevel = level;
      if (debugConfig.enabled) {
        info('Log-Level geändert auf:', getLogLevelName(level));
      }
    }
  };
  
  // Debug-Modul global verfügbar machen
  window.ContractGenerator = window.ContractGenerator || {};
  window.ContractGenerator.Debug = Debug;
  
  // Modul automatisch initialisieren
  init();
})();
