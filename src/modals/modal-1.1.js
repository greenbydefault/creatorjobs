/**
 * Responsives Modal-System mit Auto-Show-Funktion basierend auf Zeit und Memberstack-Rolle
 * - Unterstützt mehrere Modals auf einer Seite
 * - Desktop: Modal gleitet von rechts herein
 * - Mobil: Modal gleitet von unten herein
 * - Steuerung über Data-Attribute (inkl. Auto-Show)
 * - **NEU: Memberstack-Abfrage direkt integriert**
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

  // Z-Index für Modal und Overlay
  zIndex: 1000,

  // Schließen mit Escape-Taste
  closeOnEscape: true,

  // Schließen mit Klick auf Overlay
  closeOnOverlayClick: true,

  // Schlüssel-Präfix für localStorage
  localStorageKeyPrefix: 'autoModalLastShow_',

  // Verzögerung für Memberstack-Check (in ms)
  // Wichtig, da Memberstack initialisiert sein muss
  memberstackCheckDelay: 1000
};

class ModalManager {
  constructor(config = {}) {
    this.config = { ...ModalConfig, ...config };
    this.activeModal = null;
    this.overlay = null;
    this.isMobile = window.innerWidth < this.config.mobileBreakpoint;
    // this.memberstackHelper = window.memberstackHelper; // Entfernt, da Logik integriert wird

    // Initialisieren
    this.init();
  }

  // --- Memberstack Helper Funktionen (jetzt Teil der Klasse) ---

  /**
   * Ruft die Daten des aktuell eingeloggten Mitglieds ab.
   * @returns {Promise<object|null>} Ein Promise, das das Member-Objekt oder null zurückgibt.
   * @private // Kennzeichnung als interne Methode
   */
  async _getCurrentMember() {
    try {
      // Prüfe, ob die Memberstack-Instanz verfügbar ist
      if (!window.$memberstackDom) {
        console.error("Memberstack DOM API ($memberstackDom) ist nicht verfügbar.");
        return null;
      }

      // Rufe die Mitgliedsdaten ab
      // Optional: Warte auf Memberstack, falls eine onReady-Methode existiert
      // await window.$memberstackDom.onReady(); // Beispiel

      const member = await window.$memberstackDom.getCurrentMember();

      if (member && member.data) {
        return member.data; // Das Objekt mit den Mitgliedsdaten
      } else {
        // Benutzer ist nicht eingeloggt oder Daten nicht verfügbar
        console.log("Kein eingeloggter Memberstack-Benutzer gefunden.");
        return null;
      }
    } catch (error) {
      console.error("Fehler beim Abrufen der Memberstack-Daten:", error);
      return null;
    }
  }

  /**
   * Prüft, ob der aktuelle Benutzer ein "brand" ist.
   * @returns {Promise<boolean|null>} Ein Promise, das true (brand), false (creator/nicht brand) oder null (Fehler/nicht eingeloggt) zurückgibt.
   * @private // Kennzeichnung als interne Methode
   */
  async _isUserBrand() {
    const member = await this._getCurrentMember(); // Ruft interne Methode auf
    if (!member) {
      return null; // Nicht eingeloggt oder Fehler
    }

    // Zugriff auf das benutzerdefinierte Feld
    // Passe 'is-user-a-brand' an die tatsächliche ID deines Feldes an.
    const customFields = member.customFields || {};
    const isBrand = customFields['is-user-a-brand']; // Annahme: Feld-ID

    // Memberstack speichert es evtl. als String 'true'/'false' oder boolean
    if (typeof isBrand === 'string') {
      return isBrand.toLowerCase() === 'true';
    }
    return !!isBrand; // Konvertiere zu Boolean (true/false)
  }

  /**
   * Ruft die Credits des aktuellen Benutzers aus den Metadaten ab.
   * @returns {Promise<number|null>} Ein Promise, das die Anzahl der Credits oder null zurückgibt (wenn nicht eingeloggt oder Fehler). Gibt 0 zurück, wenn Credits nicht gefunden/gesetzt wurden.
   * @private // Kennzeichnung als interne Methode
   */
  async _getUserCredits() {
    const member = await this._getCurrentMember(); // Ruft interne Methode auf
    if (!member) {
      return null; // Nicht eingeloggt oder Fehler
    }

    // Zugriff auf die Metadaten
    // Passe 'credits' an den tatsächlichen Schlüssel in deinen Metadaten an.
    const metadata = member.metaData || {};
    const credits = metadata['credits']; // Annahme: Metadaten-Schlüssel

    if (typeof credits !== 'undefined' && credits !== null && !isNaN(parseInt(credits))) {
        return parseInt(credits); // Stelle sicher, dass es eine Zahl ist
    } else {
        console.warn("Credits konnten nicht aus den Metadaten gelesen werden oder sind keine Zahl. Standardwert 0 wird angenommen.");
        return 0; // Standardwert, wenn Credits nicht gesetzt oder ungültig sind
    }
  }

  // --- Ende Memberstack Helper Funktionen ---


  init() {
    // Event-Listener für Fenstergrößenänderungen
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth < this.config.mobileBreakpoint;
      this.updateModalPositions();
    });

    // Overlay erstellen
    this.createOverlay();

    // Modals initialisieren (Styling etc.)
    this.initModalsStyling();

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

    // Auto-Show Modals initialisieren (nach kurzer Verzögerung)
    this.initAutoShowModals();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    // ... (Rest des Overlay-Codes wie zuvor) ...
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
        if (this.activeModal) {
          this.closeModal(this.activeModal);
        }
      });
    }
    document.body.appendChild(this.overlay);
  }

  initModalsStyling() {
    const modals = document.querySelectorAll(`[${this.config.modalIdAttribute}]`);
    modals.forEach(modal => {
      // ... (Rest des Styling-Codes wie zuvor) ...
      modal.style.position = 'fixed';
      modal.style.zIndex = this.config.zIndex.toString();
      modal.style.transition = `transform ${this.config.animationDuration}ms ease`;
      modal.style.display = 'none';
      this.setModalPosition(modal, false);
    });
  }

  initToggleButtons() {
    const toggleButtons = document.querySelectorAll(`[${this.config.toggleAttribute}]`);
    toggleButtons.forEach(button => {
      // ... (Rest des Toggle-Button-Codes wie zuvor) ...
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
    const closeButtons = document.querySelectorAll(`[${this.config.closeAttribute}]`);
    closeButtons.forEach(button => {
      // ... (Rest des Close-Button-Codes wie zuvor) ...
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
     // Kurze Verzögerung, um Memberstack Zeit zur Initialisierung zu geben
     // Es ist wichtig, dass $memberstackDom verfügbar ist, wenn _getCurrentMember aufgerufen wird.
     setTimeout(() => {
        // Die Prüfung auf window.memberstackHelper wird entfernt
        const modals = document.querySelectorAll(`[${this.config.autoShowIntervalAttribute}]`);
        console.log(`Found ${modals.length} modals with auto-show interval.`);

        modals.forEach(modal => {
            const modalId = modal.getAttribute(this.config.modalIdAttribute);
            if (!modalId) {
                console.warn("Modal mit Auto-Show-Attribut hat keine ID.", modal);
                return;
            }
            // Ruft checkAndShowAutoModal für jedes gefundene Modal auf
            this.checkAndShowAutoModal(modal, modalId);
        });
     }, this.config.memberstackCheckDelay);
  }

  async checkAndShowAutoModal(modal, modalId) {
    console.log(`Prüfe Auto-Show für Modal: ${modalId}`);

    const intervalMinutes = parseInt(modal.getAttribute(this.config.autoShowIntervalAttribute), 10);
    const requiredRole = modal.getAttribute(this.config.autoShowRoleAttribute)?.toLowerCase() || 'all';
    const minCreditsAttr = modal.getAttribute(this.config.autoShowCreditsAttribute);
    const minCredits = minCreditsAttr ? parseInt(minCreditsAttr, 10) : 0;

    if (isNaN(intervalMinutes) || intervalMinutes <= 0) {
        console.warn(`Ungültiges oder fehlendes Intervall für Modal ${modalId}.`);
        return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    const localStorageKey = `${this.config.localStorageKeyPrefix}${modalId}`;

    // 1. Zeitprüfung (unverändert)
    const lastShownTimestamp = localStorage.getItem(localStorageKey);
    const now = Date.now();
    if (lastShownTimestamp && (now - parseInt(lastShownTimestamp)) < intervalMs) {
        console.log(`Modal ${modalId}: Zeitintervall (${intervalMinutes} Min) noch nicht erreicht.`);
        return;
    }
    console.log(`Modal ${modalId}: Zeitintervall erreicht oder noch nie gezeigt.`);

    // 2. Memberstack-Bedingungen prüfen (jetzt mit internen Methoden)
    try {
        // Ruft die internen Methoden auf
        const isBrand = await this._isUserBrand();
        const credits = await this._getUserCredits();
        // Prüfung, ob Nutzer eingeloggt ist (wenn isBrand nicht null ist)
        const isLoggedIn = isBrand !== null;

        console.log(`Modal ${modalId}: Memberstack-Status: isLoggedIn=${isLoggedIn}, isBrand=${isBrand}, credits=${credits}`);

        // Rollenprüfung (Logik unverändert)
        let roleMatch = false;
        if (requiredRole === 'all') {
            roleMatch = true;
        } else if (isLoggedIn) {
            if (requiredRole === 'brand' && isBrand === true) roleMatch = true;
            else if (requiredRole === 'creator' && isBrand === false) roleMatch = true;
        } else if (requiredRole !== 'all') {
             roleMatch = false; // Nicht eingeloggt, aber spezifische Rolle gefordert
        }

        // Kreditprüfung (Logik unverändert)
        let creditsMatch = false;
        if (isLoggedIn) {
            // Credits können nur geprüft werden, wenn der Nutzer eingeloggt ist
            // und _getUserCredits nicht null zurückgegeben hat (was es nur bei Fehlern tut)
             creditsMatch = credits !== null && credits >= minCredits;
        } else {
            // Wenn nicht eingeloggt, ist die Bedingung nur erfüllt, wenn keine Credits nötig sind
            creditsMatch = minCredits <= 0;
        }

        console.log(`Modal ${modalId}: Bedingungen: roleMatch=${roleMatch}, creditsMatch=${creditsMatch}`);

        // 3. Bedingungen auswerten und Modal anzeigen (Logik unverändert)
        if (roleMatch && creditsMatch) {
            console.log(`Modal ${modalId}: Bedingungen erfüllt. Öffne Modal.`);
            if (!this.activeModal) {
                 this.openModal(modal);
                 localStorage.setItem(localStorageKey, now.toString());
            } else {
                console.log(`Modal ${modalId}: Auto-Show verhindert, da bereits ein Modal (${this.activeModal.getAttribute(this.config.modalIdAttribute)}) aktiv ist.`);
            }
        } else {
            console.log(`Modal ${modalId}: Bedingungen für Auto-Show nicht erfüllt.`);
            // Zeitstempel *nicht* aktualisieren
        }

    } catch (error) {
        // Fehlerbehandlung für die gesamte Prüfung
        console.error(`Fehler bei der Prüfung der Memberstack-Bedingungen für Modal ${modalId}:`, error);
    }
  }


  toggleModal(modal) {
    // ... (Code wie zuvor) ...
    if (!modal) return;
    if (modal === this.activeModal) this.closeModal(modal);
    else this.openModal(modal);
  }

  openModal(modal) {
    // ... (Code wie zuvor, stellt sicher, dass Overlay/Body Class korrekt behandelt wird) ...
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
    // ... (Code wie zuvor, stellt sicher, dass Overlay/Body Class korrekt behandelt wird) ...
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
    // ... (Code wie zuvor) ...
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
    // ... (Code wie zuvor) ...
    const modals = document.querySelectorAll(`[${this.config.modalIdAttribute}]`);
    modals.forEach(modal => {
      this.setModalPosition(modal, modal === this.activeModal);
    });
  }
}

// Basis-CSS für Modals (unverändert)
const injectModalStyles = () => {
  const style = document.createElement('style');
  // ... (CSS-Code wie zuvor) ...
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
  // Wichtig: Stelle sicher, dass Memberstack ($memberstackDom) verfügbar ist,
  // bevor die ModalManager-Instanz erstellt wird oder bevor initAutoShowModals läuft.
  // Die Verzögerung in initAutoShowModals hilft, aber eine robustere Prüfung wäre besser,
  // z.B. wenn Memberstack ein eigenes 'ready'-Event oder Promise bereitstellt.
  if (!window.$memberstackDom) {
       console.warn("Memberstack ($memberstackDom) ist beim DOMContentLoaded noch nicht verfügbar. Die Auto-Show-Prüfung könnte fehlschlagen, wenn Memberstack zu langsam lädt.");
       // Hier könnte man auf ein Memberstack-Ready-Event warten, falls verfügbar.
  }

  injectModalStyles();
  window.modalManager = new ModalManager();
});
