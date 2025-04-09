/**
 * Validierungs-Modul - Kümmert sich um Formularvalidierung
 */
(function() {
  'use strict';
  
  // Zugriff auf globale Objekte
  const ContractGenerator = window.ContractGenerator || {};
  const Debug = ContractGenerator.Debug || console;
  
  // Private Variablen
  var initialized = false;
  
  // Private Methoden
  function init() {
    if (initialized) {
      Debug.warn('Validation-Modul bereits initialisiert');
      return;
    }
    
    Debug.info('Validation-Modul initialisiert');
    setupFieldListeners();
    initialized = true;
  }
  
  function setupFieldListeners() {
    document.querySelectorAll('[required]').forEach(field => {
      field.addEventListener('input', function() {
        if (this.value.trim()) {
          this.classList.remove('error');
          this.style.borderColor = '';
        }
        
        validateCurrentStep();
        
        // Navigation-Update, falls verfügbar
        if (ContractGenerator.Navigation && typeof ContractGenerator.Navigation.updateProgress === 'function') {
          ContractGenerator.Navigation.updateProgress();
        }
      });
    });
  }
  
  function validateCurrentStep() {
    // Aktuellen Schritt von Navigation holen, falls verfügbar
    var currentStep = 1;
    if (ContractGenerator.Navigation && typeof ContractGenerator.Navigation.getCurrentStep === 'function') {
      currentStep = ContractGenerator.Navigation.getCurrentStep();
    }
    
    const currentSection = document.getElementById(`step-${currentStep}`);
    if (!currentSection) return true;
    
    const nextButton = document.querySelector(`.next-step[data-next="${currentStep + 1}"]`);
    const requiredFields = currentSection.querySelectorAll('[required]');
    let allValid = true;
    
    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        allValid = false;
      }
    });
    
    if (nextButton) {
      updateButtonState(nextButton, allValid);
    }
    
    return allValid;
  }
  
  function updateButtonState(button, isValid) {
    if (isValid) {
      button.disabled = false;
      button.classList.remove('btn-disabled');
    } else {
      button.disabled = true;
      button.classList.add('btn-disabled');
    }
  }
  
  function resetErrorsInCurrentStep() {
    // Aktuellen Schritt von Navigation holen, falls verfügbar
    var currentStep = 1;
    if (ContractGenerator.Navigation && typeof ContractGenerator.Navigation.getCurrentStep === 'function') {
      currentStep = ContractGenerator.Navigation.getCurrentStep();
    }
    
    const currentSection = document.getElementById(`step-${currentStep}`);
    if (!currentSection) return;
    
    const fields = currentSection.querySelectorAll('.form-input-field');
    fields.forEach(field => {
      field.classList.remove('error');
      field.style.borderColor = '';
      field.classList.remove('shake');
    });
  }
  
  function markInvalidFieldsInCurrentStep() {
    // Aktuellen Schritt von Navigation holen, falls verfügbar
    var currentStep = 1;
    if (ContractGenerator.Navigation && typeof ContractGenerator.Navigation.getCurrentStep === 'function') {
      currentStep = ContractGenerator.Navigation.getCurrentStep();
    }
    
    const currentSection = document.getElementById(`step-${currentStep}`);
    if (!currentSection) return;
    
    const requiredFields = currentSection.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        field.classList.add('error');
        field.classList.add('shake');
        field.style.borderColor = 'red';
        
        setTimeout(() => {
          field.classList.remove('shake');
        }, 500);
      } else {
        field.classList.remove('error');
        field.style.borderColor = '';
      }
    });
  }
  
  function showValidationError() {
    alert('Bitte fülle alle markierten Pflichtfelder aus.');
  }
  
  // Validierungs-Modul definieren
  var Validation = {
    init: init,
    validateCurrentStep: validateCurrentStep,
    resetErrorsInCurrentStep: resetErrorsInCurrentStep,
    markInvalidFieldsInCurrentStep: markInvalidFieldsInCurrentStep,
    showValidationError: showValidationError
  };
  
  // Validierungs-Modul global verfügbar machen
  window.ContractGenerator = window.ContractGenerator || {};
  window.ContractGenerator.Validation = Validation;
})();
