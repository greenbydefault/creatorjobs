/**
 * UI-Controller-Modul - Verwaltet UI-Interaktionen und Formular-Updates
 */
var UIController = (function() {
    // Private Methoden
    function init() {
        console.log('UI-Controller-Modul initialisiert');
        setupFormListeners();
        adjustLayout();
    }
    
    function setupFormListeners() {
        // Vertragstyp-Auswahl
        const contractTypeSelect = document.getElementById('contract-type');
        const clientInfoSection = document.getElementById('client-info-section');
        
        if (contractTypeSelect && clientInfoSection) {
            // Initial Zustand setzen
            clientInfoSection.style.display = contractTypeSelect.value === 'client' ? 'block' : 'none';
            
            // Event-Listener für Änderungen
            contractTypeSelect.addEventListener('change', function() {
                clientInfoSection.style.display = this.value === 'client' ? 'block' : 'none';
                Navigation.updateProgress();
            });
        }
        
        // Plattform-Checkboxen
        setupPlatformCheckboxes();
        
        // Media Buyout Optionen
        setupMediaBuyoutOptions();
        
        // Zusätzliche Vergütung
        setupAdditionalCompOptions();
        
        // Generate-Button
        setupGenerateButton();
    }
    
    function setupPlatformCheckboxes() {
        const platformInstagram = document.getElementById('platform-instagram');
        const instagramDetails = document.getElementById('instagram-details');
        
        const platformTikTok = document.getElementById('platform-tiktok');
        const tiktokDetails = document.getElementById('tiktok-details');
        
        const platformYoutube = document.getElementById('platform-youtube');
        const youtubeDetails = document.getElementById('youtube-details');
        
        const platformOther = document.getElementById('platform-other');
        const otherDetails = document.getElementById('other-details');
        
        // Event-Listener für Plattform-Checkboxen
        setupToggleVisibility(platformInstagram, instagramDetails);
        setupToggleVisibility(platformTikTok, tiktokDetails);
        setupToggleVisibility(platformYoutube, youtubeDetails);
        setupToggleVisibility(platformOther, otherDetails);
    }
    
    function setupMediaBuyoutOptions() {
        const mediaBuyoutYes = document.getElementById('media-buyout-yes');
        const mediaBuyoutDetails = document.getElementById('media-buyout-details');
        
        if (mediaBuyoutYes && mediaBuyoutDetails) {
            // Initialen Zustand setzen
            mediaBuyoutDetails.classList.toggle('hidden', !mediaBuyoutYes.checked);
            
            // Event-Listener für Änderungen
            mediaBuyoutYes.addEventListener('change', function() {
                mediaBuyoutDetails.classList.toggle('hidden', !this.checked);
                Navigation.updateProgress();
            });
            
            // Auch für das "Nein" Radio-Button
            const mediaBuyoutNo = document.getElementById('media-buyout-no');
            if (mediaBuyoutNo) {
                mediaBuyoutNo.addEventListener('change', function() {
                    mediaBuyoutDetails.classList.toggle('hidden', !mediaBuyoutYes.checked);
                    Navigation.updateProgress();
                });
            }
        }
    }
    
    function setupAdditionalCompOptions() {
        const additionalYes = document.getElementById('additional-yes');
        const additionalDetails = document.getElementById('additional-comp-details');
        
        if (additionalYes && additionalDetails) {
            // Initialen Zustand setzen
            additionalDetails.classList.toggle('hidden', !additionalYes.checked);
            
            // Event-Listener für Änderungen
            additionalYes.addEventListener('change', function() {
                additionalDetails.classList.toggle('hidden', !this.checked);
                Navigation.updateProgress();
            });
            
            // Auch für das "Nein" Radio-Button
            const additionalNo = document.getElementById('additional-no');
            if (additionalNo) {
                additionalNo.addEventListener('change', function() {
                    additionalDetails.classList.toggle('hidden', !additionalYes.checked);
                    Navigation.updateProgress();
                });
            }
        }
    }
    
    function setupToggleVisibility(checkbox, detailsElement) {
        if (checkbox && detailsElement) {
            checkbox.addEventListener('change', function() {
                detailsElement.classList.toggle('hidden', !this.checked);
                Navigation.updateProgress();
            });
        }
    }
    
    function setupGenerateButton() {
        const generateButton = document.getElementById('generate-contract');
        if (generateButton) {
            generateButton.addEventListener('click', function() {
                // Validierung aller Schritte vor der PDF-Generierung
                let allStepsValid = true;
                
                for (let i = 1; i <= 9; i++) {
                    const stepSection = document.getElementById(`step-${i}`);
                    if (stepSection) {
                        const requiredFields = stepSection.querySelectorAll('[required]');
                        requiredFields.forEach(field => {
                            if (!field.value.trim()) {
                                allStepsValid = false;
                                // Navigiere zum ersten Schritt mit fehlenden Pflichtfeldern
                                if (i < Navigation.getCurrentStep()) {
                                    Navigation.goToStep(i);
                                    Validation.markInvalidFieldsInCurrentStep();
                                    return;
                                }
                            }
                        });
                    }
                    
                    if (!allStepsValid) break;
                }
                
                if (allStepsValid) {
                    console.log('Vertrag wird generiert...');
                    
                    // Aktiven Vertragstyp holen und PDF generieren
                    const activeContract = ContractGenerator.getActiveContractType();
                    if (activeContract) {
                        try {
                            activeContract.generatePDF();
                            showSuccessAnimation();
                        } catch (error) {
                            console.error("Fehler bei der PDF-Generierung:", error);
                            alert('Bei der Generierung des Vertrags ist ein Fehler aufgetreten: ' + error.message);
                        }
                    }
                } else {
                    Validation.showValidationError();
                }
            });
        }
    }
    
    function adjustLayout() {
        // Layout anpassen - Container erstellen, falls nicht vorhanden
        const form = document.querySelector('.db-contact-generator-wrapper');
        if (form && !document.querySelector('.container')) {
            // Die ursprüngliche Umgebung des Formulars referenzieren
            const parentElement = form.parentElement;
    
            // Container erstellen und einfügen
            const container = document.createElement('div');
            container.className = 'container';
            parentElement.appendChild(container);
    
            // Sidebar erstellen
            const sidebar = document.createElement('div');
            sidebar.className = 'sidebar';
            container.appendChild(sidebar);
    
            // Alle Fortschrittsschritte in die Sidebar verschieben
            const progressBar = document.querySelector('.progress-bar');
            if (progressBar) {
                sidebar.appendChild(progressBar);
            }
    
            // Main-Content erstellen
            const mainContent = document.createElement('div');
            mainContent.className = 'main-content';
            container.appendChild(mainContent);
    
            // Das Formular in den Main-Content verschieben
            mainContent.appendChild(form);
        }
    }
    
    function showSuccessAnimation() {
        const successAnimation = document.getElementById('success-animation');
        if (successAnimation) {
            successAnimation.classList.remove('hidden');
        }
        
        // Download-Button in der Erfolgsanimation
        const downloadButton = document.getElementById('download-button');
        if (downloadButton) {
            downloadButton.addEventListener('click', function() {
                // Erfolgsanimation ausblenden
                successAnimation.classList.add('hidden');
            });
        }
    }
    
    function updatePreview() {
        const activeContract = ContractGenerator.getActiveContractType();
        if (activeContract) {
            activeContract.updatePreview();
        }
    }
    
    // Öffentliche API
    return {
        init: init,
        showSuccessAnimation: showSuccessAnimation,
        updatePreview: updatePreview
    };
})();
