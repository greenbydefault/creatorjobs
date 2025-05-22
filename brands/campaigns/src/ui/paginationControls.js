// src/ui/paginationControls.js
// This module is responsible for rendering pagination controls.

/**
 * Renders pagination controls for a list of items.
 * @param {string} jobId - The ID of the current job.
 * @param {HTMLElement} paginationWrapper - The HTML element to append pagination controls to.
 * @param {number} currentPage - The current active page number.
 * @param {number} totalPages - The total number of pages.
 * @param {function} onPageChangeCallback - Callback function executed when a page link is clicked.
 * It receives (jobId, pageNumber).
 */
export function renderPaginationControls(jobId, paginationWrapper, currentPage, totalPages, onPageChangeCallback) {
    if (!paginationWrapper) {
        console.error("renderPaginationControls: Pagination wrapper element not provided.");
        return;
    }
    paginationWrapper.innerHTML = ''; // Clear previous controls
    paginationWrapper.style.display = totalPages <= 1 ? "none" : "flex"; // Show only if multiple pages

    if (totalPages <= 1) return;

    // --- Previous Button ---
    const prevButton = document.createElement("a");
    prevButton.href = "#"; // Prevent page jump
    prevButton.classList.add("db-pagination-count", "button-prev"); // Assuming Webflow classes
    prevButton.textContent = "Zurück";
    if (currentPage === 1) {
        prevButton.classList.add("disabled");
    } else {
        prevButton.addEventListener("click", async (e) => {
            e.preventDefault();
            if (prevButton.classList.contains("disabled-loading")) return;
            prevButton.classList.add("disabled-loading");
            prevButton.textContent = "Lade...";
            await onPageChangeCallback(jobId, currentPage - 1);
            // Button text/state will be reset when renderPaginationControls is called again
        });
    }
    paginationWrapper.appendChild(prevButton);

    // --- Page Number Links ---
    const MAX_VISIBLE_PAGES = 5; // Max number of page links to show (e.g., 1 ... 3 4 5 ... 10)
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

    // "1" and "..." if needed at the beginning
    if (startPage > 1) {
        const firstPageLink = createPageLink(jobId, 1, currentPage, onPageChangeCallback, paginationWrapper);
        paginationWrapper.appendChild(firstPageLink);
        if (startPage > 2) {
            const ellipsisSpan = createEllipsis();
            paginationWrapper.appendChild(ellipsisSpan);
        }
    }

    // Visible page numbers
    for (let i = startPage; i <= endPage; i++) {
        const pageLink = createPageLink(jobId, i, currentPage, onPageChangeCallback, paginationWrapper);
        paginationWrapper.appendChild(pageLink);
    }

    // "..." and last page if needed at the end
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsisSpan = createEllipsis();
            paginationWrapper.appendChild(ellipsisSpan);
        }
        const lastPageLink = createPageLink(jobId, totalPages, currentPage, onPageChangeCallback, paginationWrapper);
        paginationWrapper.appendChild(lastPageLink);
    }

    // --- Next Button ---
    const nextButton = document.createElement("a");
    nextButton.href = "#";
    nextButton.classList.add("db-pagination-count", "button-next");
    nextButton.textContent = "Weiter";
    if (currentPage === totalPages) {
        nextButton.classList.add("disabled");
    } else {
        nextButton.addEventListener("click", async (e) => {
            e.preventDefault();
            if (nextButton.classList.contains("disabled-loading")) return;
            nextButton.classList.add("disabled-loading");
            nextButton.textContent = "Lade...";
            await onPageChangeCallback(jobId, currentPage + 1);
        });
    }
    paginationWrapper.appendChild(nextButton);
}

/**
 * Helper to create a single page link.
 */
function createPageLink(jobId, pageNum, currentPage, callback, paginationWrapper) {
    const pageLink = document.createElement("a");
    pageLink.href = "#";
    pageLink.classList.add("db-pagination-count");
    pageLink.textContent = pageNum;
    if (pageNum === currentPage) {
        pageLink.classList.add("current");
    } else {
        pageLink.addEventListener("click", async (e) => {
            e.preventDefault();
            if (pageLink.classList.contains("disabled-loading")) return;
            
            // Visually indicate loading on all page links
            paginationWrapper.querySelectorAll('.db-pagination-count:not(.ellipsis):not(.button-prev):not(.button-next)').forEach(el => {
                if (el !== pageLink) el.classList.add("disabled-loading"); // Dim others
            });
            pageLink.classList.add("disabled-loading"); // Mark current clicked as loading
            pageLink.textContent = "..."; // Show loading indicator on the clicked link

            await callback(jobId, pageNum);
        });
    }
    return pageLink;
}

/**
 * Helper to create an ellipsis span.
 */
function createEllipsis() {
    const ellipsisSpan = document.createElement("span");
    ellipsisSpan.classList.add("db-pagination-count", "ellipsis");
    ellipsisSpan.textContent = "...";
    return ellipsisSpan;
}
