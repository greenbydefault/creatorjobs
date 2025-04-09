/**
 * Navigations-Modul - Verwaltet die Navigation zwischen den Formularschritten
 */
(function() {
  'use strict';
  
  // Zugriff auf globale Objekte
  const ContractGenerator = window.ContractGenerator || {};
  const Debug = ContractGenerator.Debug || console;
  const Validation = ContractGenerator.Validation || {};
  
  // Private Variablen
  var currentStep = 1;
  var navigationInProgress = false;
  var initialized = false;
  
  // Private Methoden
  function init() {
    if (initialized) {
      Debug.warn('Navigation-Modul bereits initialisiert');
      return;
    }
    
    Debug.info('Navigation-Modul initialisiert');
    
    setupProgressStepListeners();
    setupNavigationButtons();
    updateProgress();
    
    initialized = true;
  }
  
  function setupProgressStepListeners() {
    var progressSteps = document.querySelectorAll('.progress-step');
    
    progressSteps.forEach(step => {
      step.addEventListener('click', function() {
        if (navigationInProgress) return;
        navigationInProgress = true;
        
        var stepNum = parseInt(this.getAttribute('data-step'));
        
        if (stepNum === currentStep) {
          navigationInProgress = false;
          return;
        }
        
        if (stepNum < currentStep) {
          if (Validation && typeof Validation.resetErrorsInCurrentStep === 'function') {
            Validation.resetErrorsInCurrentStep();
          }
          goToStep(stepNum);
          navigationInProgress = false;
          return;
        }
        
        if (Validation && typeof Validation.validateCurrentStep === 'function') {
          if (Validation.validateCurrentStep()) {
            if (typeof Validation.resetErrorsInCurrentStep === 'function') {
              Validation.resetErrorsInCurrentStep();
            }
            goToStep(stepNum);
          } else {
            if (typeof Validation.markInvalidFieldsInCurrentStep === 'function') {
              Validation.markInvalidFieldsInCurrentStep();
            }
            if (typeof Validation.showValidationError === 'function') {
              Validation.showValidationError();
            }
          }
        } else {
          // Wenn kein Validierungs-Modul verfügbar ist, einfach zum nächsten Schritt gehen
          goToStep(stepNum);
        }
        
        navigationInProgress = false;
      });
    });
  }
  
  function setupNavigationButtons() {
    var nextButtons = document.querySelectorAll('.next-step');
    var prevButtons = document.querySelectorAll('.prev-step');
    
    nextButtons.forEach(button => {
      button.addEventListener('click', function() {
        if (navigationInProgress) return;
        navigationInProgress = true;
        
        var nextStep = parseInt(this.getAttribute('data-next'));
        
        if (Validation && typeof Validation.validateCurrentStep === 'function') {
          if (!Validation.validateCurrentStep()) {
            if (typeof Validation.markInvalidFieldsInCurrentStep === 'function') {
              Validation.markInvalidFieldsInCurrentStep();
            }
            if (typeof Validation.showValidationError === 'function') {
              Validation.showValidationError();
            }
            navigationInProgress = false;
            return;
          }
        }
        
        if (Validation && typeof Validation.resetErrorsInCurrentStep === 'function') {
          Validation.resetErrorsInCurrentStep();
        }
        
        goToStep(nextStep);
        navigationInProgress = false;
      });
    });
    
    prevButtons.forEach(button => {
      button.addEventListener('click', function() {
        if (navigationInProgress) return;
        navigationInProgress = true;
        
        var prevStep = parseInt(this.getAttribute('data-prev'));
        
        if (Validation && typeof Validation.resetErrorsInCurrentStep === 'function') {
          Validation.resetErrorsInCurrentStep();
        }
        
        goToStep(prevStep);
        navigationInProgress = false;
      });
    });
  }
  
  function goToStep(stepNumber) {
    Debug.info(`Navigation zu Schritt ${stepNumber}`);
    currentStep = stepNumber;
    
    var formSections = document.querySelectorAll('.form-section');
    formSections.forEach(section => {
      section.classList.add('hidden');
    });
    
    var progressSteps = document.querySelectorAll('.progress-step');
    progressSteps.forEach(step => {
      var stepNum = parseInt(step.getAttribute('data-step'));
      step.classList.toggle('active', stepNum <= stepNumber);
      step.classList.toggle('completed', stepNum < stepNumber);
    });
    
    var targetSection = document.getElementById(`step-${stepNumber}`);
    if (targetSection) {
      targetSection.classList.remove('hidden');
    }
    
    updateProgress();
    
    if (Validation && typeof Validation.validateCurrentStep === 'function') {
      Validation.validateCurrentStep();
    }
    
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
  
  function updateProgress() {
    // Den aktiven Vertragstyp abrufen
    if (ContractGenerator.ContractTypeFactory && 
        typeof ContractGenerator.ContractTypeFactory.getActiveContractType === 'function') {
      
      var activeContractType = ContractGenerator.ContractTypeFactory.getActiveContractType();
      
      if (activeContractType && typeof activeContractType.updateProgress === 'function') {
        activeContractType.updateProgress(currentStep);
      }
    } else {
      // Fallback: Einfache Fortschrittsanzeige
      updateProgressBar(currentStep);
    }
  }
  
  function updateProgressBar(stepNumber) {
    // Einfaches Update der Fortschrittsleiste
    const config = ContractGenerator.config || { INFLUENCER_STEPS: 9 };
    const totalSteps = config.INFLUENCER_STEPS;
    
    // Prozentwert basierend auf aktuellem Schritt berechnen
    const percentage = Math.min(Math.floor((stepNumber / totalSteps) * 100), 100);
    
    // Fortschrittsbalken aktualisieren
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
      progressFill.style.width = `${percentage}%`;
    }
    
    const progressText = document.getElementById('progress-text');
    if (progressText) {
      progressText.textContent = `${percentage}% ausgefüllt`;
    }
  }
  
  // Navigations-Modul definieren
  var Navigation = {
    init: init,
    goToStep: goToStep,
    getCurrentStep: function() {
      return currentStep;
    },
    updateProgress: updateProgress
  };
  
  // Navigations-Modul global verfügbar machen
  window.ContractGenerator = window.ContractGenerator || {};
  window.ContractGenerator.Navigation = Navigation;
})();
