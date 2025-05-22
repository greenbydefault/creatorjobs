// src/ui/applicantRenderer.js
// This module is responsible for creating HTML elements related to applicants.

import { MAPPINGS } from '../config.js'; // Assuming MAPPINGS is needed here
import { normalizeUrl } from '../utils.js';

/**
 * Creates an HTML element for a single applicant row.
 * @param {object} applicantItemWithScoreInfo - The applicant item object, including `fieldData` and `matchInfo`.
 * @param {object} allMappings - The MAPPINGS object from config.js.
 * @returns {HTMLElement} The created applicant row div element.
 */
export function createApplicantRowElement(applicantItemWithScoreInfo, allMappings) {
    const applicantFieldData = applicantItemWithScoreInfo.fieldData;
    const matchInfo = applicantItemWithScoreInfo.matchInfo;

    const applicantDiv = document.createElement("div");
    applicantDiv.classList.add("db-table-row", "db-table-applicant", "job-entry");

    // Click listener to open profile, avoiding clicks on specific interactive elements
    applicantDiv.addEventListener('click', (event) => {
        if (event.target.closest('a.db-application-option') || event.target.closest('.score-circle-indicator')) {
            return; // Don't open profile if a social link or score indicator itself was clicked
        }
        const slug = applicantFieldData.slug;
        if (slug) {
            const profileUrl = `https://www.creatorjobs.com/members/${slug}`;
            window.open(profileUrl, '_blank');
        } else {
            console.warn("Kein Slug für Bewerber gefunden, kann Profil nicht öffnen:", applicantFieldData.name);
        }
    });

    if (typeof allMappings === 'undefined') {
        console.error("❌ MAPPINGS-Objekt ist nicht definiert in createApplicantRowElement.");
        const errorDiv = document.createElement("div");
        errorDiv.textContent = "Fehler: Mapping-Daten nicht verfügbar.";
        applicantDiv.appendChild(errorDiv);
        return applicantDiv;
    }

    // --- Match Score Cell ---
    const scoreCellContainer = document.createElement("div");
    scoreCellContainer.classList.add("db-table-row-item"); // For layout consistency
    scoreCellContainer.style.display = "flex";
    scoreCellContainer.style.justifyContent = "center";
    scoreCellContainer.style.alignItems = "center";

    const scoreValue = matchInfo ? matchInfo.score : 0;
    const scoreCircle = document.createElement("div");
    scoreCircle.classList.add("score-circle-indicator"); // Webflow styling target

    let progressColor = "#e0e0e0"; // Default for 0 or error
    if (scoreValue >= 80) progressColor = "#4CAF50"; // Green
    else if (scoreValue >= 60) progressColor = "#FFC107"; // Orange
    else if (scoreValue > 0) progressColor = "#FF9800"; // Darker Orange

    scoreCircle.style.width = "40px";
    scoreCircle.style.height = "40px";
    scoreCircle.style.borderRadius = "50%";
    scoreCircle.style.position = "relative";
    scoreCircle.style.display = "flex";
    scoreCircle.style.justifyContent = "center";
    scoreCircle.style.alignItems = "center";
    scoreCircle.style.cursor = "default"; // No specific action on click for now

    const degree = (scoreValue / 100) * 360;
    scoreCircle.style.background = `conic-gradient(${progressColor} ${degree}deg, #efefef ${degree}deg 360deg)`;

    const scoreText = document.createElement("span");
    scoreText.textContent = `${scoreValue}`;
    scoreText.style.color = "#333";
    scoreText.style.fontWeight = "bold";
    scoreText.style.fontSize = "14px";
    scoreText.style.position = "absolute";

    scoreCircle.appendChild(scoreText);
    scoreCellContainer.appendChild(scoreCircle);
    applicantDiv.appendChild(scoreCellContainer);

    // --- Profile Info (Image, Name, Status) ---
    const profileInfoDiv = document.createElement("div");
    profileInfoDiv.classList.add("db-table-row-item", "justify-left");
    const profileImageField = applicantFieldData["image-thumbnail-small-92px"] || applicantFieldData["user-profile-img"];
    if (profileImageField) {
        const applicantImg = document.createElement("img");
        applicantImg.classList.add("db-table-img", "is-margin-right-12");
        applicantImg.src = typeof profileImageField === 'string' ? profileImageField : profileImageField?.url;
        applicantImg.alt = applicantFieldData.name || "Bewerberbild";
        applicantImg.onerror = () => { // Basic image error handling
            applicantImg.style.display = 'none'; // Hide broken image
            // Optionally, show a placeholder
        };
        profileInfoDiv.appendChild(applicantImg);
    }

    const namePlusStatusDiv = document.createElement("div");
    namePlusStatusDiv.classList.add("is-flexbox-vertical");
    const nameSpan = document.createElement("span");
    nameSpan.textContent = applicantFieldData.name || "Unbekannter Bewerber";
    nameSpan.classList.add("truncate");
    namePlusStatusDiv.appendChild(nameSpan);

    const plusStatusSpan = document.createElement("span");
    plusStatusSpan.classList.add("is-txt-tiny");
    plusStatusSpan.textContent = applicantFieldData["plus-mitglied"] ? "Plus Mitglied" : "Standard";
    namePlusStatusDiv.appendChild(plusStatusSpan);
    profileInfoDiv.appendChild(namePlusStatusDiv);
    applicantDiv.appendChild(profileInfoDiv);

    // --- Location ---
    const locationDiv = document.createElement("div");
    locationDiv.classList.add("db-table-row-item");
    const city = applicantFieldData["user-city-2"] || "K.A.";
    const bundeslandId = applicantFieldData["bundesland-option"];
    const bundeslandName = allMappings.bundeslaender[bundeslandId] || (bundeslandId ? bundeslandId.substring(0, 10) + '...' : "K.A.");
    locationDiv.textContent = `${city}${bundeslandName !== "K.A." ? `, ${bundeslandName}` : ""}`;
    applicantDiv.appendChild(locationDiv);

    // --- Category ---
    const categoryCell = document.createElement("div");
    categoryCell.classList.add("db-table-row-item");
    const categoryTag = document.createElement("span");
    categoryTag.classList.add("job-tag", "customer"); // Assuming 'customer' is a generic style
    categoryTag.textContent = applicantFieldData["creator-main-categorie"] || "K.A.";
    categoryCell.appendChild(categoryTag);
    applicantDiv.appendChild(categoryCell);

    // --- Creator Type ---
    const creatorTypeCell = document.createElement("div");
    creatorTypeCell.classList.add("db-table-row-item");
    const creatorTypeTag = document.createElement("span");
    creatorTypeTag.classList.add("job-tag", "customer");
    const creatorTypeId = applicantFieldData["creator-type"];
    creatorTypeTag.textContent = allMappings.creatorTypen[creatorTypeId] || (creatorTypeId ? creatorTypeId.substring(0, 10) + '...' : "K.A.");
    creatorTypeCell.appendChild(creatorTypeTag);
    applicantDiv.appendChild(creatorTypeCell);

    // --- Social Media Icons ---
    const socialCell = document.createElement("div");
    socialCell.classList.add("db-table-row-item");
    const socialPlatforms = [
        { key: "instagram", name: "Instagram", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e8d979b71d2a7e5db3_Instagram.svg" },
        { key: "tiktok", name: "TikTok", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e99dce86c2b6ba83fe_Tiktok.svg" },
        { key: "youtube", name: "YouTube", iconUrl: "https://cdn.prod.website-files.com/63db7d558cd2e4be56cd7e2f/640219e9b00d0480ffe289dc_YouTube.svg" }
    ];
    socialPlatforms.forEach(platform => {
        const platformUrlValue = applicantFieldData[platform.key];
        const normalizedPlatformUrl = normalizeUrl(platformUrlValue);
        if (normalizedPlatformUrl) {
            const socialLink = document.createElement("a");
            socialLink.href = normalizedPlatformUrl;
            socialLink.classList.add("db-application-option", "no-icon", "w-inline-block"); // Assuming these are Webflow classes
            socialLink.target = "_blank";
            socialLink.rel = "noopener noreferrer"; // Security best practice
            const iconImg = document.createElement("img");
            iconImg.src = platform.iconUrl;
            iconImg.alt = `${platform.name} Profil`;
            iconImg.classList.add("db-icon-18"); // Assuming this is a Webflow class
            socialLink.appendChild(iconImg);
            socialCell.appendChild(socialLink);
        }
    });
    applicantDiv.appendChild(socialCell);

    // --- Follower Count ---
    const followerCell = document.createElement("div");
    followerCell.classList.add("db-table-row-item");
    const followerTag = document.createElement("span");
    followerTag.classList.add("job-tag", "customer");
    const followerId = applicantFieldData["creator-follower"];
    followerTag.textContent = allMappings.followerRanges[followerId] || (followerId ? followerId.substring(0, 10) + '...' : "K.A.");
    followerCell.appendChild(followerTag);
    applicantDiv.appendChild(followerCell);

    // --- Age Group ---
    const ageCell = document.createElement("div");
    ageCell.classList.add("db-table-row-item");
    const ageTag = document.createElement("span");
    ageTag.classList.add("job-tag", "customer");
    const ageId = applicantFieldData["creator-age"];
    ageTag.textContent = allMappings.altersgruppen[ageId] || (ageId ? ageId.substring(0, 10) + '...' : "K.A.");
    ageCell.appendChild(ageTag);
    applicantDiv.appendChild(ageCell);

    return applicantDiv;
}

/**
 * Creates the header row element for the applicants table.
 * @returns {HTMLElement} The created header div element.
 */
export function createApplicantTableHeaderElement() {
    const headerDiv = document.createElement("div");
    headerDiv.classList.add("db-table-header", "db-table-applicant");

    const columns = ["Match", "Creator", "Location", "Kategorie", "Creator Type", "Social Media", "Follower", "Alter"];
    columns.forEach((colText, index) => {
        const colDiv = document.createElement("div");
        colDiv.classList.add("db-table-row-item");
        if (index === 0) { // Match column
            colDiv.style.textAlign = "center";
        }
        if (index === 1) { // Creator column (usually wider)
             colDiv.style.flexGrow = "1.5"; // Allow Creator column to take more space
        }
        const textSpan = document.createElement("span");
        textSpan.classList.add("is-txt-16", "is-txt-bold");
        textSpan.textContent = colText;
        colDiv.appendChild(textSpan);
        headerDiv.appendChild(colDiv);
    });
    return headerDiv;
}
