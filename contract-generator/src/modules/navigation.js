/**
 * Navigations-Modul - Verwaltet die Navigation zwischen den Formularschritten
 */
var Navigation = (function() {
    // Private Variablen
    var currentStep = 1;
    var navigationInProgress = false;
    
    // Private Methoden
    function init() {
        console.log('Navigation-Modul initialisiert');
        
        setupProgressStepListeners();
        setupNavigationButtons();
        updateProgress();
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
                    Validation.resetErrorsInCurrentStep();
                    goToStep(stepNum);
                    navigationInProgress = false;
                    return;
                }
                
                if (Validation.validateCurrentStep()) {
                    Validation.resetErrorsInCurrentStep();
                    goToStep(stepNum);
                } else {
                    Validation.markInvalidFieldsInCurrentStep();
                    Validation.showValidationError();
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
                
                if (!Validation.validateCurrentStep()) {
                    Validation.markInvalidFieldsInCurrentStep();
                    Validation.showValidationError();
                    navigationInProgress = false;
                    return;
                }
                
                Validation.resetErrorsInCurrentStep();
                goToStep(nextStep);
                navigationInProgress = false;
            });
        });
        
        prevButtons.forEach(button => {
            button.addEventListener('click', function() {
                if (navigationInProgress) return;
                navigationInProgress = true;
                
                var prevStep = parseInt(this.getAttribute('data-prev'));
                Validation.resetErrorsInCurrentStep();
                goToStep(prevStep);
                navigationInProgress = false;
            });
        });
    }
    
    function goToStep(stepNumber) {
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
        Validation.validateCurrentStep();
        
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    function updateProgress() {
        var activeContract = ContractGenerator.getActiveContractType();
        if (activeContract) {
            activeContract.updateProgress(currentStep);
        }
    }
    
    // Öffentliche API
    return {
        init: init,
        goToStep: goToStep,
        getCurrentStep: function() {
            return currentStep;
        },
        updateProgress: updateProgress
    };
})();
