/**
 * Responsives Modal-System mit Auto-Show-Funktion basierend auf Zeit, Memberstack-Rolle, Plan-Status und Credits
 * - Unterstützt mehrere Modals auf einer Seite
 * - Desktop: Modal gleitet von rechts herein
 * - Mobil: Modal gleitet von unten herein
 * - Steuerung über Data-Attribute (inkl. Auto-Show)
 * - Memberstack-Abfrage direkt integriert (Rolle, Credits, Aktiver Plan)
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
  autoShowIntervalAttribute: 'data-modal-auto-show-interval-minutes',
  autoShowRoleAttribute: 'data-modal-auto-show-role', // 'brand', 'creator', 'all'
  autoShowCreditsAttribute: 'data-modal-auto-show-min-credits',
  autoShowActivePlanAttribute: 'data-modal-auto-show-active-plan', // "true" / "false" (oder weglassen)
  // NEU: Attribut für Prüfung auf genau 0 Credits
  autoShowZeroCreditsAttribute: 'data-modal-auto-show-zero-credits', // "true" / "false" (oder weglassen)


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

  /**
   * Ruft die Daten des aktuell eingeloggten Mitglieds ab.
   * @returns {Promise<object|null>} Ein Promise, das das Member-Objekt oder null zurückgibt.
   * @private
   */
  async _getCurrentMember() {
    try {
      if (!window.$memberstackDom) {
        console.error("Memberstack DOM API ($memberstackDom) ist nicht verfügbar.");
        return null;
      }
      const member = await window.$memberstackDom.getCurrentMember();
      if (member && member.data) {
        return member.data;
      } else {
        // console.log("Kein eingeloggter Memberstack-Benutzer gefunden."); // Weniger verbose im Normalbetrieb
        return null;
      }
    } catch (error) {
      console.error("Fehler beim Abrufen der Memberstack-Daten:", error);
      return null;
    }
  }

  /**
   * Prüft, ob der aktuelle Benutzer ein "brand" ist.
   * @param {object} member - Das Memberstack Member-Datenobjekt.
   * @returns {boolean|null} true (brand), false (creator/nicht brand) oder null (Fehler/nicht eingeloggt).
   * @private
   */
  _isUserBrand(member) {
    if (!member) return null;
    const customFields = member.customFields || {};
    const isBrand = customFields['is-user-a-brand']; // Passe Feld-ID an
    if (typeof isBrand === 'string') {
      return isBrand.toLowerCase() === 'true';
    }
    return !!isBrand;
  }

  /**
   * Ruft die Credits des aktuellen Benutzers aus den Metadaten ab.
   * @param {object} member - Das Memberstack Member-Datenobjekt.
   * @returns {number|null} Die Anzahl der Credits oder null (wenn nicht eingeloggt). Gibt 0 zurück, wenn Credits nicht gefunden/gesetzt wurden.
   * @private
   */
  _getUserCredits(member) {
    if (!member) return null;
    const metadata = member.metaData || {};
    const credits = metadata['credits']; // Passe Metadaten-Schlüssel an
    if (typeof credits !== 'undefined' && credits !== null && !isNaN(parseInt(credits))) {
        return parseInt(credits);
    } else {
        return 0; // Standardwert 0, wenn Credits nicht vorhanden oder ungültig
    }
  }

  /**
   * Prüft, ob der Benutzer mindestens einen aktiven Plan hat.
   * @param {object} member - Das Memberstack Member-Datenobjekt.
   * @returns {boolean} true, wenn mindestens ein Plan aktiv ist, sonst false.
   * @private
   */
  _hasActivePlan(member) {
      if (!member || !Array.isArray(member.planConnections)) {
          return false;
      }
      return member.planConnections.some(connection => connection && connection.status && connection.status.toUpperCase() === 'ACTIVE');
  }

  // --- Ende Memberstack Helper Funktionen ---


  init() {
    // Event Listener etc. (unverändert)
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
        if (e.key === 'Escape' && this.activeModal) {
          this.closeModal(this.activeModal);
        }
      });
    }
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

  initAutoShowModals() {
     // (unverändert)
     setTimeout(() => {
        const modals = document.querySelectorAll(`[${this.config.autoShowIntervalAttribute}]`);
        // console.log(`Found ${modals.length} modals with auto-show interval.`); // Weniger verbose
        modals.forEach(modal => {
            const modalId = modal.getAttribute(this.config.modalIdAttribute);
            if (!modalId) {
                console.warn("Modal mit Auto-Show-Attribut hat keine ID.", modal);
                return;
            }
            this.checkAndShowAutoModal(modal, modalId);
        });
     }, this.config.memberstackCheckDelay);
  }

  async checkAndShowAutoModal(modal, modalId) {
    // console.log(`Prüfe Auto-Show für Modal: ${modalId}`); // Weniger verbose

    // Attribute auslesen
    const intervalMinutes = parseInt(modal.getAttribute(this.config.autoShowIntervalAttribute), 10);
    const requiredRole = modal.getAttribute(this.config.autoShowRoleAttribute)?.toLowerCase() || 'all';
    const minCreditsAttr = modal.getAttribute(this.config.autoShowCreditsAttribute);
    const minCredits = minCreditsAttr ? parseInt(minCreditsAttr, 10) : 0;
    const requiresActivePlan = modal.getAttribute(this.config.autoShowActivePlanAttribute)?.toLowerCase() === 'true';
    // NEU: Attribut für Zero-Credits lesen
    const requiresZeroCredits = modal.getAttribute(this.config.autoShowZeroCreditsAttribute)?.toLowerCase() === 'true';


    if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
        // console.warn(`Ungültiges oder fehlendes Intervall für Modal ${modalId}.`);
        return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    const localStorageKey = `${this.config.localStorageKeyPrefix}${modalId}`;

    // 1. Zeitprüfung (unverändert)
    const lastShownTimestamp = localStorage.getItem(localStorageKey);
    const now = Date.now();
    if (lastShownTimestamp && (now - parseInt(lastShownTimestamp)) < intervalMs) {
        // console.log(`Modal ${modalId}: Zeitintervall (${intervalMinutes} Min) noch nicht erreicht.`);
        return;
    }
    // console.log(`Modal ${modalId}: Zeitintervall erreicht oder noch nie gezeigt.`);

    // 2. Memberstack-Bedingungen prüfen
    try {
        const member = await this._getCurrentMember();
        const isLoggedIn = !!member;

        const isBrand = isLoggedIn ? this._isUserBrand(member) : null;
        const credits = isLoggedIn ? this._getUserCredits(member) : null; // Gibt 0 zurück, wenn nicht gesetzt
        const hasActivePlan = isLoggedIn ? this._hasActivePlan(member) : false;

        // console.log(`Modal ${modalId}: Memberstack-Status: isLoggedIn=${isLoggedIn}, isBrand=${isBrand}, credits=${credits}, hasActivePlan=${hasActivePlan}, requiresZeroCredits=${requiresZeroCredits}`);

        // Rollenprüfung (unverändert)
        let roleMatch = false;
        if (requiredRole === 'all') {
            roleMatch = true;
        } else if (isLoggedIn) {
            if (requiredRole === 'brand' && isBrand === true) roleMatch = true;
            else if (requiredRole === 'creator' && isBrand === false) roleMatch = true;
        } else if (requiredRole !== 'all') {
             roleMatch = false;
        }

        // NEU: Angepasste Kreditprüfung
        let creditsMatch = false;
        if (requiresZeroCredits) {
            // Spezialfall: Nur anzeigen, wenn eingeloggt und Credits genau 0 sind
            creditsMatch = isLoggedIn && credits === 0;
        } else {
            // Standardfall: Prüfe gegen minCredits
            if (isLoggedIn) {
                 // Eingeloggte Benutzer müssen minCredits erfüllen (credits ist nie null hier)
                 creditsMatch = credits >= minCredits;
            } else {
                 // Nicht eingeloggte Benutzer: Nur anzeigen, wenn minCredits 0 oder weniger ist
                 creditsMatch = minCredits <= 0;
            }
        }


        // Aktiver Plan Prüfung (unverändert)
        let activePlanMatch = true;
        if (requiresActivePlan) {
            activePlanMatch = isLoggedIn && hasActivePlan;
        }

        // console.log(`Modal ${modalId}: Bedingungen: roleMatch=${roleMatch}, creditsMatch=${creditsMatch}, activePlanMatch=${activePlanMatch}`);

        // 3. Bedingungen auswerten und Modal anzeigen
        if (roleMatch && creditsMatch && activePlanMatch) {
            console.log(`Modal ${modalId}: Bedingungen erfüllt. Öffne Modal.`);
            if (!this.activeModal) {
                 this.openModal(modal);
                 localStorage.setItem(localStorageKey, now.toString());
            } else {
                // console.log(`Modal ${modalId}: Auto-Show verhindert, da bereits ein Modal (${this.activeModal.getAttribute(this.config.modalIdAttribute)}) aktiv ist.`);
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
