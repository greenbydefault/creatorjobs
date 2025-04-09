/**
 * Responsives Modal-System
 * - Unterstützt mehrere Modals auf einer Seite
 * - Desktop: Modal gleitet von rechts herein
 * - Mobil: Modal gleitet von unten herein
 * - Steuerung über Data-Attribute
 */

// Konfigurationsparameter (leicht anpassbar)
const ModalConfig = {
  // CSS-Klassen
  openClass: 'modal-open',
  activeClass: 'modal-active',
  
  // Animation
  animationDuration: 300, // ms
  
  // Mobile Breakpoint
  mobileBreakpoint: 768, // px
  
  // Data-Attribute
  toggleAttribute: 'data-modal-toggle',
  closeAttribute: 'data-modal-close',
  modalIdAttribute: 'data-modal-id',
  
  // Z-Index für Modal und Overlay
  zIndex: 1000,
  
  // Schließen mit Escape-Taste
  closeOnEscape: true,
  
  // Schließen mit Klick auf Overlay
  closeOnOverlayClick: true
};

class ModalManager {
  constructor(config = {}) {
    this.config = { ...ModalConfig, ...config };
    this.activeModal = null;
    this.overlay = null;
    this.isMobile = window.innerWidth < this.config.mobileBreakpoint;
    
    // Initialisieren
    this.init();
  }
  
  init() {
    // Event-Listener für Fenstergrößenänderungen
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < this.config.mobileBreakpoint;
      this.updateModalPositions();
    });
    
    // Overlay erstellen
    this.createOverlay();
    
    // Modals initialisieren
    this.initModals();
    
    // Event-Listener für Toggle-Buttons
    this.initToggleButtons();
    
    // Event-Listener für Close-Buttons
    this.initCloseButtons();
    
    // Escape-Taste zum Schließen
    if (this.config.closeOnEscape) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.activeModal) {
          this.closeModal(this.activeModal);
        }
      });
    }
  }
  
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.width = '100%';
    this.overlay.style.height = '100%';
    this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.overlay.style.zIndex = (this.config.zIndex - 1).toString();
    this.overlay.style.opacity = '0';
    this.overlay.style.display = 'none'; // Geändert von visibility: hidden zu display: none
    this.overlay.style.transition = `opacity ${this.config.animationDuration}ms ease`;
    
    if (this.config.closeOnOverlayClick) {
      this.overlay.addEventListener('click', () => {
        if (this.activeModal) {
          this.closeModal(this.activeModal);
        }
      });
    }
    
    document.body.appendChild(this.overlay);
  }
  
  initModals() {
    const modals = document.querySelectorAll(`[${this.config.modalIdAttribute}]`);
    
    modals.forEach(modal => {
      // Styling für Modals
      modal.style.position = 'fixed';
      modal.style.zIndex = this.config.zIndex.toString();
      modal.style.transition = `transform ${this.config.animationDuration}ms ease`;
      
      // Display auf none setzen, unabhängig von visibility
      modal.style.display = 'none';
      
      // Initial ausblenden (durch Transformation)
      this.setModalPosition(modal, false);
    });
  }
  
  initToggleButtons() {
    const toggleButtons = document.querySelectorAll(`[${this.config.toggleAttribute}]`);
    
    toggleButtons.forEach(button => {
      const modalId = button.getAttribute(this.config.toggleAttribute);
      const targetModal = document.querySelector(`[${this.config.modalIdAttribute}="${modalId}"]`);
      
      if (targetModal) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleModal(targetModal);
        });
      }
    });
  }
  
  initCloseButtons() {
    const closeButtons = document.querySelectorAll(`[${this.config.closeAttribute}]`);
    
    closeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const modalId = button.getAttribute(this.config.closeAttribute);
        
        if (modalId) {
          // Bestimmtes Modal schließen
          const targetModal = document.querySelector(`[${this.config.modalIdAttribute}="${modalId}"]`);
          if (targetModal) {
            this.closeModal(targetModal);
          }
        } else {
          // Aktuelles Modal schließen
          if (this.activeModal) {
            this.closeModal(this.activeModal);
          }
        }
      });
    });
  }
  
  toggleModal(modal) {
    if (modal === this.activeModal) {
      this.closeModal(modal);
    } else {
      this.openModal(modal);
    }
  }
  
  openModal(modal) {
    // Zuerst das aktive Modal schließen (falls vorhanden)
    if (this.activeModal && this.activeModal !== modal) {
      this.closeModal(this.activeModal, true);
    }
    
    // Overlay anzeigen
    this.overlay.style.display = 'block';
    setTimeout(() => {
      this.overlay.style.opacity = '1';
    }, 10);
    
    // Modal anzeigen - explizit display:flex setzen
    modal.style.display = 'flex';
    
    setTimeout(() => {
      this.setModalPosition(modal, true);
    }, 10);
    
    // Body-Scrolling deaktivieren
    document.body.classList.add(this.config.openClass);
    
    // Modal als aktiv markieren
    modal.classList.add(this.config.activeClass);
    this.activeModal = modal;
    
    // Event auslösen
    modal.dispatchEvent(new CustomEvent('modal:open'));
  }
  
  closeModal(modal, skipOverlay = false) {
    // Modal ausblenden
    this.setModalPosition(modal, false);
    
    // Nach der Animation vollständig ausblenden
    setTimeout(() => {
      // Explizit display:none setzen
      modal.style.display = 'none';
      
      // Wenn kein anderes Modal geöffnet wird, Overlay ausblenden
      if (!skipOverlay) {
        this.overlay.style.opacity = '0';
        setTimeout(() => {
          this.overlay.style.display = 'none';
        }, this.config.animationDuration);
        
        // Body-Scrolling wieder aktivieren
        document.body.classList.remove(this.config.openClass);
      }
    }, this.config.animationDuration);
    
    // Modal als inaktiv markieren
    modal.classList.remove(this.config.activeClass);
    
    if (this.activeModal === modal) {
      this.activeModal = null;
    }
    
    // Event auslösen
    modal.dispatchEvent(new CustomEvent('modal:close'));
  }
  
  setModalPosition(modal, isOpen) {
    // Desktop (von rechts)
    if (!this.isMobile) {
      modal.style.top = '0';
      modal.style.right = '0';
      modal.style.bottom = '0';
      modal.style.left = 'auto';
      modal.style.transform = isOpen ? 'translateX(0)' : 'translateX(100%)';
    } 
    // Mobil (von unten)
    else {
      modal.style.top = 'auto';
      modal.style.right = '0';
      modal.style.bottom = '0';
      modal.style.left = '0';
      modal.style.transform = isOpen ? 'translateY(0)' : 'translateY(100%)';
    }
  }
  
  updateModalPositions() {
    const modals = document.querySelectorAll(`[${this.config.modalIdAttribute}]`);
    
    modals.forEach(modal => {
      if (modal === this.activeModal) {
        this.setModalPosition(modal, true);
      } else {
        this.setModalPosition(modal, false);
      }
    });
  }
}

// Basis-CSS für Modals
const injectModalStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    .modal-overlay {
      -webkit-backdrop-filter: blur(2px);
      backdrop-filter: blur(2px);
    }
    
    body.modal-open {
      overflow: hidden;
    }
    
    [data-modal-id] {
      max-height: 100vh;
      overflow-y: auto;
      box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
    }
    
    /* Keine hidden Klasse mehr nötig */
    
    @media (max-width: 768px) {
      [data-modal-id] {
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
      }
    }
  `;
  document.head.appendChild(style);
};

// Modal-System initialisieren, wenn DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
  injectModalStyles();
  window.modalManager = new ModalManager();
});
