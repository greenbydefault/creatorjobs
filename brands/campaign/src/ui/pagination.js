(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  // loadAndDisplayApplicantsForJob wird später von appLogic geholt
  // const { loadAndDisplayApplicantsForJob } = window.WEBFLOW_API.appLogic; (Beispiel)

  /**
   * Rendert die Paginierungs-Steuerelemente für eine Bewerberliste.
   * @param {string} jobId - Die ID des aktuellen Jobs.
   * @param {Array} displayedItemsArray - Das gesamte Array der (gefilterten und sortierten) anzuzeigenden Items.
   * @param {HTMLElement} applicantsContentElement - Das DOM-Element, das die Bewerberzeilen enthält (für Kontext).
   * @param {HTMLElement} paginationWrapper - Das DOM-Element, in das die Paginierung eingefügt wird.
   * @param {number} currentPage - Die aktuell angezeigte Seite.
   * @param {number} totalPages - Die Gesamtanzahl der Seiten.
   */
  async function renderPaginationControls(jobId, displayedItemsArray, applicantsContentElement, paginationWrapper, currentPage, totalPages) {
    if (!paginationWrapper) {
        console.warn("Pagination Wrapper nicht gefunden für Job ID:", jobId);
        return;
    }
    paginationWrapper.innerHTML = ''; // Bestehende Controls leeren
    paginationWrapper.style.display = totalPages <= 1 ? "none" : "flex";

    if (totalPages <= 1) return;

    const applicantsListContainer = applicantsContentElement.parentElement; // Der Container, der auch Filter etc. hält

    // Hilfsfunktion, um Ladezustand zu setzen und Aktion auszuführen
    const handlePageClick = async (pageNumber, clickedElement) => {
        if (clickedElement && (clickedElement.classList.contains("disabled-loading") || clickedElement.classList.contains("current") || clickedElement.classList.contains("disabled"))) {
            return;
        }

        // Alle Paginierungslinks im Ladezustand (visuell)
        paginationWrapper.querySelectorAll('.db-pagination-count:not(.ellipsis)').forEach(el => {
            el.classList.add("disabled-loading");
            if (el !== clickedElement && !el.classList.contains("button-prev") && !el.classList.contains("button-next")) {
               // el.textContent = "..."; // Nicht unbedingt für alle, nur für den geklickten
            }
        });
        if (clickedElement && (clickedElement.classList.contains("button-prev") || clickedElement.classList.contains("button-next"))) {
            clickedElement.textContent = "Lade...";
        } else if (clickedElement) {
             clickedElement.textContent = "...";
        }


        // Die eigentliche Funktion zum Laden der Seite aufrufen
        // Diese muss aus window.WEBFLOW_API.appLogic geholt werden, wenn appLogic.js definiert ist
        if (window.WEBFLOW_API.appLogic && window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob) {
            await window.WEBFLOW_API.appLogic.loadAndDisplayApplicantsForJob(jobId, applicantsListContainer, paginationWrapper, pageNumber);
        } else {
            console.error("loadAndDisplayApplicantsForJob Funktion nicht im appLogic Modul gefunden.");
            // Fallback: Paginierung wiederherstellen, falls Funktion fehlt
            renderPaginationControls(jobId, displayedItemsArray, applicantsContentElement, paginationWrapper, currentPage, totalPages);
        }
    };

    // "Zurück"-Button
    const prevButton = document.createElement("a");
    prevButton.href = "#";
    prevButton.classList.add("db-pagination-count", "button-prev"); // Webflow Klassen
    prevButton.textContent = "Zurück";
    if (currentPage === 1) {
      prevButton.classList.add("disabled");
    } else {
      prevButton.addEventListener("click", async (e) => {
        e.preventDefault();
        await handlePageClick(currentPage - 1, prevButton);
      });
    }
    paginationWrapper.appendChild(prevButton);

    const MAX_VISIBLE_PAGES = 5; // Maximale Anzahl sichtbarer Seitenzahlen (z.B. 1 ... 4 5 6 ... 10)
    let startPage, endPage;

    if (totalPages <= MAX_VISIBLE_PAGES) {
      startPage = 1;
      endPage = totalPages;
    } else {
      const maxPagesBeforeCurrentPage = Math.floor(MAX_VISIBLE_PAGES / 2);
      const maxPagesAfterCurrentPage = Math.ceil(MAX_VISIBLE_PAGES / 2) - 1;
      if (currentPage <= maxPagesBeforeCurrentPage) {
        startPage = 1;
        endPage = MAX_VISIBLE_PAGES;
      } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
        startPage = totalPages - MAX_VISIBLE_PAGES + 1;
        endPage = totalPages;
      } else {
        startPage = currentPage - maxPagesBeforeCurrentPage;
        endPage = currentPage + maxPagesAfterCurrentPage;
      }
    }

    // Erste Seite und Ellipsis (falls nötig)
    if (startPage > 1) {
      const firstPageLink = document.createElement("a");
      firstPageLink.href = "#";
      firstPageLink.classList.add("db-pagination-count");
      firstPageLink.textContent = "1";
      firstPageLink.addEventListener("click", async (e) => {
        e.preventDefault();
        await handlePageClick(1, firstPageLink);
      });
      paginationWrapper.appendChild(firstPageLink);
      if (startPage > 2) {
        const ellipsisSpan = document.createElement("span");
        ellipsisSpan.classList.add("db-pagination-count", "ellipsis");
        ellipsisSpan.textContent = "...";
        paginationWrapper.appendChild(ellipsisSpan);
      }
    }

    // Seitenzahlen
    for (let i = startPage; i <= endPage; i++) {
      const pageLink = document.createElement("a");
      pageLink.href = "#";
      pageLink.classList.add("db-pagination-count");
      pageLink.textContent = i;
      if (i === currentPage) {
        pageLink.classList.add("current"); // Webflow Klasse für aktuelle Seite
      } else {
        pageLink.addEventListener("click", async (e) => {
          e.preventDefault();
          await handlePageClick(i, pageLink);
        });
      }
      paginationWrapper.appendChild(pageLink);
    }

    // Letzte Seite und Ellipsis (falls nötig)
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsisSpan = document.createElement("span");
        ellipsisSpan.classList.add("db-pagination-count", "ellipsis");
        ellipsisSpan.textContent = "...";
        paginationWrapper.appendChild(ellipsisSpan);
      }
      const lastPageLink = document.createElement("a");
      lastPageLink.href = "#";
      lastPageLink.classList.add("db-pagination-count");
      lastPageLink.textContent = totalPages;
      lastPageLink.addEventListener("click", async (e) => {
        e.preventDefault();
        await handlePageClick(totalPages, lastPageLink);
      });
      paginationWrapper.appendChild(lastPageLink);
    }

    // "Weiter"-Button
    const nextButton = document.createElement("a");
    nextButton.href = "#";
    nextButton.classList.add("db-pagination-count", "button-next"); // Webflow Klassen
    nextButton.textContent = "Weiter";
    if (currentPage === totalPages) {
      nextButton.classList.add("disabled");
    } else {
      nextButton.addEventListener("click", async (e) => {
        e.preventDefault();
        await handlePageClick(currentPage + 1, nextButton);
      });
    }
    paginationWrapper.appendChild(nextButton);
  }

  window.WEBFLOW_API.ui.renderPaginationControls = renderPaginationControls;

})();
