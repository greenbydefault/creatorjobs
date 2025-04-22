/**
 * Responsives Modal-System mit Auto-Show-Funktion
 * - Auto-Show basierend auf Zeit (optional), Memberstack-Rolle, Plan-Status (aktiv/inaktiv), Credits.
 * - Unterstützt mehrere Modals auf einer Seite
 * - Desktop: Modal gleitet von rechts herein
 * - Mobil: Modal gleitet von unten herein
 * - Steuerung über Data-Attribute
 * - Memberstack-Abfrage direkt integriert
 */

// Konfigurationsparameter
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
  // Auto-Show Attribute
  autoShowIntervalAttribute: 'data-modal-auto-show-interval-minutes', // Optional
  autoShowRoleAttribute: 'data-modal-auto-show-role',
  autoShowCreditsAttribute: 'data-modal-auto-show-min-credits',
  autoShowActivePlanAttribute: 'data-modal-auto-show-active-plan', // NEU: Akzeptiert "true" oder "false"
  autoShowZeroCreditsAttribute: 'data-modal-auto-show-zero-credits',

  // Z-Index für Modal und Overlay
  zIndex: 1000,

  // Schließen mit Escape-Taste
  closeOnEscape: true,

  // Schließen mit Klick auf Overlay
  closeOnOverlayClick: true,

  // Schlüssel-Präfix für localStorage
  localStorageKeyPrefix: 'autoModalLastShow_',

  // Verzögerung für Memberstack-Check (in ms)
  memberstackCheckDelay: 1000
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

  // --- Memberstack Helper Funktionen (unverändert) ---
  async _getCurrentMember() {
    try {
      if (!window.$memberstackDom) {
        console.error("Memberstack DOM API ($memberstackDom) ist nicht verfügbar.");
        return null;
      }
      const member = await window.$memberstackDom.getCurrentMember();
      return (member && member.data) ? member.data : null;
    } catch (error) {
      console.error("Fehler beim Abrufen der Memberstack-Daten:", error);
      return null;
    }
  }
  _isUserBrand(member) {
    if (!member) return null;
    const customFields = member.customFields || {};
    const isBrand = customFields['is-user-a-brand']; // Passe Feld-ID an
    if (typeof isBrand === 'string') return isBrand.toLowerCase() === 'true';
    return !!isBrand;
  }
  _getUserCredits(member) {
    if (!member) return null;
    const metadata = member.metaData || {};
    const credits = metadata['credits']; // Passe Metadaten-Schlüssel an
    if (typeof credits !== 'undefined' && credits !== null && !isNaN(parseInt(credits))) return parseInt(credits);
    return 0; // Standardwert 0
  }
  _hasActivePlan(member) {
      if (!member || !Array.isArray(member.planConnections)) return false;
      return member.planConnections.some(conn => conn && conn.status && conn.status.toUpperCase() === 'ACTIVE');
  }
  // --- Ende Memberstack Helper Funktionen ---


  init() {
    // Event Listener etc.
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < this.config.mobileBreakpoint;
      this.updateModalPositions();
    });
    this.createOverlay();
    this.initModalsStyling();
    this.initToggleButtons();
    this.initCloseButtons();
    if (this.config.closeOnEscape) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.activeModal) this.closeModal(this.activeModal);
      });
    }
    // Auto-Show Modals initialisieren
    this.initAutoShowModals();
  }

  createOverlay() {
    // (unverändert)
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
    this.overlay.style.display = 'none';
    this.overlay.style.transition = `opacity ${this.config.animationDuration}ms ease`;
    if (this.config.closeOnOverlayClick) {
      this.overlay.addEventListener('click', () => {
        if (this.activeModal) this.closeModal(this.activeModal);
      });
    }
    document.body.appendChild(this.overlay);
  }

  initModalsStyling() {
    // (unverändert)
    const modals = document.querySelectorAll(`[${this.config.modalIdAttribute}]`);
    modals.forEach(modal => {
      modal.style.position = 'fixed';
      modal.style.zIndex = this.config.zIndex.toString();
      modal.style.transition = `transform ${this.config.animationDuration}ms ease`;
      modal.style.display = 'none';
      this.setModalPosition(modal, false);
    });
  }

  initToggleButtons() {
    // (unverändert)
    const toggleButtons = document.querySelectorAll(`[${this.config.toggleAttribute}]`);
    toggleButtons.forEach(button => {
      const modalId = button.getAttribute(this.config.toggleAttribute);
      const targetModal = document.querySelector(`[${this.config.modalIdAttribute}="${modalId}"]`);
      if (targetModal) {
        button.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleModal(targetModal);
        });
      } else {
        console.warn(`Modal-Toggle-Button verweist auf nicht existierendes Modal: ${modalId}`);
      }
    });
  }

  initCloseButtons() {
    // (unverändert)
    const closeButtons = document.querySelectorAll(`[${this.config.closeAttribute}]`);
    closeButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const modalId = button.getAttribute(this.config.closeAttribute);
        if (modalId) {
          const targetModal = document.querySelector(`[${this.config.modalIdAttribute}="${modalId}"]`);
          if (targetModal) this.closeModal(targetModal);
          else console.warn(`Modal-Close-Button verweist auf nicht existierendes Modal: ${modalId}`);
        } else {
          const parentModal = button.closest(`[${this.config.modalIdAttribute}]`);
          if (parentModal) this.closeModal(parentModal);
          else if (this.activeModal) this.closeModal(this.activeModal);
        }
      });
    });
  }

  // --- Angepasste Auto-Show Initialisierung ---
  initAutoShowModals() {
     setTimeout(() => {
        // Wähle alle Modals aus, die *mindestens ein* Auto-Show-Attribut haben
        const selector = [
            `[${this.config.autoShowIntervalAttribute}]`,
            `[${this.config.autoShowRoleAttribute}]`,
            `[${this.config.autoShowCreditsAttribute}]`,
            `[${this.config.autoShowZeroCreditsAttribute}]`,
            `[${this.config.autoShowActivePlanAttribute}]` // Prüft jetzt auf Existenz, nicht nur 'true'
        ].join(',');

        const modals = document.querySelectorAll(selector);
        console.log(`Found ${modals.length} modals with any auto-show attribute.`);

        modals.forEach(modal => {
            const modalId = modal.getAttribute(this.config.modalIdAttribute);
            if (!modalId) {
                console.warn("Modal mit Auto-Show-Attribut hat keine data-modal-id. Überspringe.", modal);
                return;
            }
            this.checkAndShowAutoModal(modal, modalId);
        });
     }, this.config.memberstackCheckDelay);
  }

  // --- Angepasste Auto-Show Prüfung ---
  async checkAndShowAutoModal(modal, modalId) {
    // console.log(`Prüfe Auto-Show für Modal: ${modalId}`);

    // Attribute auslesen
    const intervalAttr = modal.getAttribute(this.config.autoShowIntervalAttribute);
    const intervalMinutes = intervalAttr ? parseInt(intervalAttr, 10) : null;
    const hasInterval = intervalMinutes !== null && !isNaN(intervalMinutes) && intervalMinutes > 0;

    const requiredRole = modal.getAttribute(this.config.autoShowRoleAttribute)?.toLowerCase() || null;
    const minCreditsAttr = modal.getAttribute(this.config.autoShowCreditsAttribute);
    const minCredits = minCreditsAttr ? parseInt(minCreditsAttr, 10) : null;
    // NEU: Lese den Wert von active-plan (kann "true", "false" oder null sein)
    const requiredPlanStatusAttr = modal.getAttribute(this.config.autoShowActivePlanAttribute)?.toLowerCase();
    const requiresZeroCredits = modal.getAttribute(this.config.autoShowZeroCreditsAttribute)?.toLowerCase() === 'true';

    // 1. Zeitprüfung (NUR wenn Intervall angegeben ist)
    if (hasInterval) {
        const intervalMs = intervalMinutes * 60 * 1000;
        const localStorageKey = `${this.config.localStorageKeyPrefix}${modalId}`;
        const lastShownTimestamp = localStorage.getItem(localStorageKey);
        const now = Date.now();

        if (lastShownTimestamp && (now - parseInt(lastShownTimestamp)) < intervalMs) {
            return; // Zu früh
        }
    }

    // 2. Memberstack-Bedingungen prüfen
    try {
        const member = await this._getCurrentMember();
        const isLoggedIn = !!member;

        const isBrand = isLoggedIn ? this._isUserBrand(member) : null;
        const credits = isLoggedIn ? this._getUserCredits(member) : null;
        const hasActivePlan = isLoggedIn ? this._hasActivePlan(member) : false;

        // --- Bedingungsprüfungen ---

        // Rollenprüfung (nur wenn Attribut gesetzt)
        let roleMatch = true;
        if (requiredRole) {
            roleMatch = false;
            if (requiredRole === 'all') roleMatch = true;
            else if (isLoggedIn) {
                if (requiredRole === 'brand' && isBrand === true) roleMatch = true;
                else if (requiredRole === 'creator' && isBrand === false) roleMatch = true;
            }
        }

        // Kreditprüfung (berücksichtigt ZeroCredits und MinCredits)
        let creditsMatch = true;
        const checkCredits = requiresZeroCredits || (minCredits !== null && !isNaN(minCredits));
        if (checkCredits) {
            creditsMatch = false;
            if (requiresZeroCredits) {
                creditsMatch = isLoggedIn && credits === 0;
            } else if (minCredits !== null && !isNaN(minCredits)) {
                if (isLoggedIn) creditsMatch = credits >= minCredits;
                else creditsMatch = minCredits <= 0;
            }
        }

        // NEU: Aktiver Plan Prüfung (berücksichtigt "true" und "false")
        let activePlanMatch = true; // Standard: true (keine Einschränkung)
        if (requiredPlanStatusAttr === 'true') {
            // Muss eingeloggt sein UND aktiven Plan haben
            activePlanMatch = isLoggedIn && hasActivePlan;
        } else if (requiredPlanStatusAttr === 'false') {
            // Muss eingeloggt sein UND KEINEN aktiven Plan haben
            activePlanMatch = isLoggedIn && !hasActivePlan;
            // Alternative: Auch für nicht eingeloggte anzeigen? Dann: activePlanMatch = !hasActivePlan;
        }
        // Wenn Attribut fehlt oder anderen Wert hat, bleibt activePlanMatch true

        // console.log(`Modal ${modalId}: Bedingungen: roleMatch=${roleMatch}, creditsMatch=${creditsMatch}, activePlanMatch=${activePlanMatch}`);

        // 3. Bedingungen auswerten und Modal anzeigen
        if (roleMatch && creditsMatch && activePlanMatch) {
            console.log(`Modal ${modalId}: Bedingungen erfüllt. Öffne Modal.`);
            if (!this.activeModal) {
                 this.openModal(modal);
                 if (hasInterval) {
                     const now = Date.now();
                     const localStorageKey = `${this.config.localStorageKeyPrefix}${modalId}`;
                     localStorage.setItem(localStorageKey, now.toString());
                 }
            } else {
                // console.log(`Modal ${modalId}: Auto-Show verhindert, da bereits ein Modal aktiv ist.`);
            }
        } else {
            // console.log(`Modal ${modalId}: Bedingungen für Auto-Show nicht erfüllt.`);
        }

    } catch (error) {
        console.error(`Fehler bei der Prüfung der Memberstack-Bedingungen für Modal ${modalId}:`, error);
    }
  }


  toggleModal(modal) {
    // (unverändert)
    if (!modal) return;
    if (modal === this.activeModal) this.closeModal(modal);
    else this.openModal(modal);
  }

  openModal(modal) {
    // (unverändert)
    if (!modal) return;
    if (this.activeModal && this.activeModal !== modal) {
      this.closeModal(this.activeModal, true);
    }
    if (this.overlay.style.opacity !== '1') {
        this.overlay.style.display = 'block';
        setTimeout(() => { this.overlay.style.opacity = '1'; }, 10);
    }
    modal.style.display = 'flex'; // Oder 'block'
    setTimeout(() => { this.setModalPosition(modal, true); }, 10);
    if (!document.body.classList.contains(this.config.openClass)) {
        document.body.classList.add(this.config.openClass);
    }
    modal.classList.add(this.config.activeClass);
    this.activeModal = modal;
    modal.dispatchEvent(new CustomEvent('modal:open'));
  }

  closeModal(modal, skipOverlay = false) {
    // (unverändert)
     if (!modal) return;
    this.setModalPosition(modal, false);
    setTimeout(() => {
      modal.style.display = 'none';
      modal.classList.remove(this.config.activeClass);
      if (this.activeModal === modal) {
        this.activeModal = null;
        if (!skipOverlay) {
          this.overlay.style.opacity = '0';
          setTimeout(() => {
            if (!this.activeModal) this.overlay.style.display = 'none';
          }, this.config.animationDuration);
          document.body.classList.remove(this.config.openClass);
        }
      }
       modal.dispatchEvent(new CustomEvent('modal:close'));
    }, this.config.animationDuration);
  }

  setModalPosition(modal, isOpen) {
    // (unverändert)
    if (!this.isMobile) {
      modal.style.top = '0';
      modal.style.right = '0';
      modal.style.bottom = '0';
      modal.style.left = 'auto';
      modal.style.transform = isOpen ? 'translateX(0)' : 'translateX(100%)';
    } else {
      modal.style.top = 'auto';
      modal.style.right = '0';
      modal.style.bottom = '0';
      modal.style.left = '0';
      modal.style.transform = isOpen ? 'translateY(0)' : 'translateY(100%)';
    }
  }

  updateModalPositions() {
    // (unverändert)
    const modals = document.querySelectorAll(`[${this.config.modalIdAttribute}]`);
    modals.forEach(modal => {
      this.setModalPosition(modal, modal === this.activeModal);
    });
  }
}

// Basis-CSS für Modals (unverändert)
const injectModalStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    .modal-overlay { -webkit-backdrop-filter: blur(2px); backdrop-filter: blur(2px); }
    body.modal-open { overflow: hidden; }
    [data-modal-id] {
      max-height: 100vh; overflow-y: auto; box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
      background-color: white; padding: 20px; display: flex; flex-direction: column;
    }
    @media (max-width: ${ModalConfig.mobileBreakpoint}px) {
      [data-modal-id] {
        box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2); width: 100%; max-height: 90vh;
      }
    }
  `;
  document.head.appendChild(style);
};

// Modal-System initialisieren, wenn DOM geladen ist
document.addEventListener('DOMContentLoaded', () => {
  // (unverändert)
  if (!window.$memberstackDom) {
       console.warn("Memberstack ($memberstackDom) ist beim DOMContentLoaded noch nicht verfügbar. Die Auto-Show-Prüfung könnte fehlschlagen, wenn Memberstack zu langsam lädt.");
  }
  injectModalStyles();
  window.modalManager = new ModalManager();
});
