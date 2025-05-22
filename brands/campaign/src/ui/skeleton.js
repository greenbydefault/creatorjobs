(function () {
  'use strict';
  window.WEBFLOW_API = window.WEBFLOW_API || {};
  window.WEBFLOW_API.ui = window.WEBFLOW_API.ui || {};

  /**
   * Rendert einen Skeleton Loader für die "Meine Jobs"-Liste.
   * @param {HTMLElement} container - Das DOM-Element, in das der Loader eingefügt wird.
   * @param {number} count - Die Anzahl der Skeleton-Einträge, die generiert werden sollen.
   */
  function renderMyJobsSkeletonLoader(container, count) {
    if (!container) return;
    container.innerHTML = ""; // Bestehenden Inhalt leeren

    for (let i = 0; i < count; i++) {
      const jobWrapper = document.createElement("div");
      jobWrapper.classList.add("my-job-item-skeleton", "skeleton-row", "job-entry");

      const jobHeader = document.createElement("div");
      jobHeader.classList.add("db-table-row", "db-table-my-job");

      // Job Name mit Bild
      const jobNameDiv = document.createElement("div");
      jobNameDiv.classList.add("db-table-row-item", "justify-left");
      const skeletonJobImage = document.createElement("div");
      skeletonJobImage.classList.add("db-table-img", "is-margin-right-12", "skeleton-element", "skeleton-image");
      jobNameDiv.appendChild(skeletonJobImage);
      const skeletonJobName = document.createElement("div");
      skeletonJobName.classList.add("truncate", "skeleton-element", "skeleton-text", "skeleton-text-title");
      jobNameDiv.appendChild(skeletonJobName);
      jobHeader.appendChild(jobNameDiv);

      // Payment
      const paymentDiv = document.createElement("div");
      paymentDiv.classList.add("db-table-row-item");
      const skeletonPayment = document.createElement("div");
      skeletonPayment.classList.add("skeleton-element", "skeleton-text", "skeleton-text-short");
      paymentDiv.appendChild(skeletonPayment);
      jobHeader.appendChild(paymentDiv);

      // Placeholder (ursprünglich leer) - jetzt für Kategorie
      const categoryDiv = document.createElement("div");
      categoryDiv.classList.add("db-table-row-item");
      const skeletonCategory = document.createElement("div");
      skeletonCategory.classList.add("skeleton-element", "skeleton-text", "skeleton-text-medium");
      categoryDiv.appendChild(skeletonCategory);
      jobHeader.appendChild(categoryDiv);
      
      // Status
      const statusDiv = document.createElement("div");
      statusDiv.classList.add("db-table-row-item");
      const skeletonStatusTag = document.createElement("div");
      skeletonStatusTag.classList.add("job-tag", "skeleton-element", "skeleton-tag-box");
      statusDiv.appendChild(skeletonStatusTag);
      jobHeader.appendChild(statusDiv);

      // Applicants Count
      const applicantsCountDiv = document.createElement("div");
      applicantsCountDiv.classList.add("db-table-row-item");
      const skeletonApplicantsCount = document.createElement("div");
      skeletonApplicantsCount.classList.add("skeleton-element", "skeleton-text", "skeleton-text-short");
      applicantsCountDiv.appendChild(skeletonApplicantsCount);
      jobHeader.appendChild(applicantsCountDiv);
      
      // Placeholder für Edit/View Icons (ursprünglich leer)
      const actionsDiv = document.createElement("div");
      actionsDiv.classList.add("db-table-row-item");
      // Hier könnten Skeleton-Icons platziert werden, falls gewünscht
      jobHeader.appendChild(actionsDiv);


      jobWrapper.appendChild(jobHeader);

      // Skeleton für den "Bewerber anzeigen" Toggle-Bereich
      const skeletonPaginationRow = document.createElement("div");
      skeletonPaginationRow.classList.add("applicants-toggle-row-skeleton", "skeleton-element");
      skeletonPaginationRow.style.height = "30px"; // Höhe anpassen
      skeletonPaginationRow.style.width = "200px"; // Breite anpassen
      skeletonPaginationRow.style.margin = "10px auto"; // Zentrieren und Abstand
      jobWrapper.appendChild(skeletonPaginationRow);

      container.appendChild(jobWrapper);
    }
  }

  window.WEBFLOW_API.ui.renderMyJobsSkeletonLoader = renderMyJobsSkeletonLoader;

})();
