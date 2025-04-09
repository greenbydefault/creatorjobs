/**
 * PDF-Generator-Modul - Stellt Funktionen zur PDF-Generierung bereit
 */
var PDFGenerator = (function() {
    // Private Variablen
    var config = {
        margins: {
            top: 30,
            bottom: 30,
            left: 30,
            right: 30
        },
        watermark: 'Created with creatorjobs.com',
        defaultFontSize: 12
    };
    
    // Private Methoden
    function init() {
        Debug.info('PDF-Generator-Modul initialisiert');
        
        // Prüfen, ob jsPDF verfügbar ist
        if (typeof jsPDF === 'undefined') {
            Debug.error('jsPDF ist nicht verfügbar. PDF-Funktionalität deaktiviert.');
        }
    }
    
    function createDocument(options) {
        var timer = Debug.startPerformanceTimer('createPDFDocument');
        
        try {
            Debug.info('Erstelle PDF-Dokument');
            
            // Optionen mit Standard-Werten zusammenführen
            options = options || {};
            
            // Neues PDF-Dokument erstellen
            var doc = new jsPDF(options);
            
            // Standardeinstellungen
            doc.setFont('helvetica');
            doc.setFontSize(config.defaultFontSize);
            
            timer.stop();
            return doc;
        } catch (error) {
            Debug.error('Fehler beim Erstellen des PDF-Dokuments:', error);
            timer.stop();
            throw error;
        }
    }
    
    function addWatermark(doc) {
        if (!doc) {
            Debug.error('Kein PDF-Dokument zum Hinzufügen des Wasserzeichens übergeben');
            return;
        }
        
        try {
            Debug.info('Füge Wasserzeichen hinzu');
            
            var totalPages = doc.internal.getNumberOfPages();
            
            // Setze Schriftart und Größe für das Wasserzeichen
            doc.setFont('helvetica');
            doc.setFontSize(7);
            doc.setTextColor(130); // Graue Farbe für das Wasserzeichen
            
            for (var i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                // Berechne die X- und Y-Position für das Wasserzeichen
                var pageSize = doc.internal.pageSize;
                var pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
                var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                
                // Wasserzeichen in die untere rechte Ecke
                var watermarkTextWidth = doc.getTextWidth(config.watermark);
                doc.text(config.watermark, pageWidth - watermarkTextWidth - 10, pageHeight - 10);
            }
        } catch (error) {
            Debug.error('Fehler beim Hinzufügen des Wasserzeichens:', error);
            throw error;
        }
    }
    
    function addParagraphTitle(doc, title, y) {
        if (!doc || !title) {
            Debug.error('Ungültige Parameter für Paragraphen-Titel:', { doc: !!doc, title: title });
            return y;
        }
        
        try {
            doc.setFont("helvetica", "bold");
            doc.text(title, config.margins.left, y);
            doc.setFont("helvetica", "normal");
            return y + 8; // Einheitlicher Abstand nach jeder Überschrift
        } catch (error) {
            Debug.error('Fehler beim Hinzufügen des Paragraphen-Titels:', error);
            return y;
        }
    }
    
    function renderCheckbox(doc, isChecked, text, x, y) {
        if (!doc) {
            Debug.error('Kein PDF-Dokument zum Rendern der Checkbox übergeben');
            return y;
        }
        
        try {
            // Boxgröße
            var boxSize = 4;
            
            if (isChecked) {
                // Zeichne ein Kästchen mit Kreuz (X)
                doc.rect(x, y - 3.5, boxSize, boxSize);
                doc.setLineWidth(0.2); // Dünnere Linie für das Kreuz
                doc.line(x, y - 3.5, x + boxSize, y + 0.5); // Diagonal von links oben nach rechts unten
                doc.line(x, y + 0.5, x + boxSize, y - 3.5); // Diagonal von links unten nach rechts oben
                doc.setLineWidth(0.3); // Zurück zur Standard-Liniendicke
            } else {
                // Zeichne ein leeres Kästchen
                doc.rect(x, y - 3.5, boxSize, boxSize);
            }
            
            // Setze Text daneben mit weniger Abstand
            if (text) {
                doc.text(text, x + boxSize + 3, y);
            }
            
            return y;
        } catch (error) {
            Debug.error('Fehler beim Rendern der Checkbox:', error);
            return y;
        }
    }
    
    function addSignatureFields(doc, city) {
        if (!doc) {
            Debug.error('Kein PDF-Dokument zum Hinzufügen der Unterschriftsfelder übergeben');
            return;
        }
        
        try {
            Debug.info('Füge Unterschriftsfelder hinzu');
            
            // Stellen Sie sicher, dass wir am Ende des Dokuments arbeiten
            var y = doc.internal.pageSize.height - 70;
            
            // Aktuelles Datum im deutschen Format (TT.MM.JJJJ)
            var today = new Date();
            var formattedDate = today.getDate() + "." + (today.getMonth() + 1) + "." + today.getFullYear();
            
            // Linke Spalte (Unternehmen) - mit vorausgefüllten Werten
            var leftColumnX = config.margins.left;
            var rightColumnX = 120;
            
            // Ort - NUR für Unternehmen vorausgefüllt
            doc.text("Ort:", leftColumnX, y);
            doc.setFont("helvetica", "bold");
            doc.text(city, leftColumnX + 20, y - 3); // Leicht über der Linie
            doc.setFont("helvetica", "normal");
            doc.line(leftColumnX + 20, y, leftColumnX + 80, y); // Linie für Ort
            
            // Ort für Influencer - NICHT vorausgefüllt
            doc.text("Ort:", rightColumnX, y);
            doc.line(rightColumnX + 20, y, rightColumnX + 80, y); // Nur Linie ohne Text
            
            y += 15;
            
            // Datum - NUR für Unternehmen vorausgefüllt
            doc.text("Datum:", leftColumnX, y);
            doc.setFont("helvetica", "bold");
            doc.text(formattedDate, leftColumnX + 30, y - 3); // Leicht über der Linie
            doc.setFont("helvetica", "normal");
            doc.line(leftColumnX + 30, y, leftColumnX + 80, y); // Linie für Datum
            
            // Datum für Influencer - NICHT vorausgefüllt
            doc.text("Datum:", rightColumnX, y);
            doc.line(rightColumnX + 30, y, rightColumnX + 80, y); // Nur Linie ohne Text
            
            y += 15;
            
            // Unterschriftslinien - dickere Linien
            doc.setLineWidth(0.5); // Erhöhe die Liniendicke
            doc.line(leftColumnX, y, leftColumnX + 80, y); // Linie für Unternehmen
            doc.line(rightColumnX, y, rightColumnX + 80, y); // Linie für Influencer
            doc.setLineWidth(0.3); // Zurück zur Standard-Liniendicke
            
            y += 10;
            
            doc.text("[Unterschrift Unternehmen]", leftColumnX, y);
            doc.text("[Unterschrift Influencer]", rightColumnX, y);
        } catch (error) {
            Debug.error('Fehler beim Hinzufügen der Unterschriftsfelder:', error);
            throw error;
        }
    }
    
    function formatDate(dateString) {
        if (!dateString) return '';
        
        try {
            var date = new Date(dateString);
            return date.toLocaleDateString('de-DE');
        } catch (error) {
            Debug.warn('Fehler beim Formatieren des Datums:', error);
            return dateString;
        }
    }
    
    // Öffentliche API
    return {
        init: init,
        createDocument: createDocument,
        addWatermark: addWatermark,
        addParagraphTitle: addParagraphTitle,
        renderCheckbox: renderCheckbox,
        addSignatureFields: addSignatureFields,
        formatDate: formatDate,
        
        // Konfiguration
        setWatermark: function(text) {
            config.watermark = text;
        },
        setMargins: function(margins) {
            config.margins = Object.assign(config.margins, margins);
        }
    };
})();

// Direkt initialisieren
PDFGenerator.init();
