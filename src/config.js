// src/config.js
export const CONFIG = {
    // API-Endpunkte
    BASE_URL: "https://api.webflow.com/v2/collections",
    WORKER_BASE_URL: "https://upload.oliver-258.workers.dev/?url=",
    VIDEO_CONVERT_WORKER_URL: "https://video-convert.oliver-258.workers.dev",
    UPLOADCARE_WORKER_URL: "https://deleteuploadcare.oliver-258.workers.dev",
    
    // Collection-IDs
    COLLECTION_ID: "67d806e65cadcadf2f41e659", // Collection ID für Videos
    MEMBERS_COLLECTION_ID: "6448faf9c5a8a15f6cc05526", // Collection ID für Members
    
    // Form-IDs
    FORM_ID: "db-upload-video",
    SUCCESS_DIV_ID: "db-upload-susscess",
    EDIT_MODAL_ID: "upload-edit",
    EDIT_FORM_ID: "video-edit-form",
    EDIT_NAME_FIELD: "Name Edit",
    EDIT_CATEGORY_FIELD: "Kategorie Edit",
    EDIT_DESCRIPTION_FIELD: "Beschreibung Edit",
    EDIT_PUBLIC_FIELD: "Open Video Edit",
    EDIT_SAVE_BUTTON: "video-edit-save",
    EDIT_DELETE_BUTTON: "video-delete-button",
    DELETE_CONFIRM_MODAL_ID: "delete-confirm-modal",
    
    // UI-Element-IDs
    VIDEO_CONTAINER_ID: 'video-feed',
    UPLOAD_LIMIT_TITLE_ID: 'upload-limit-title',
    UPLOAD_COUNTER_ID: 'uploads-counter',
    UPLOAD_PROGRESS_ID: 'uploads-progress',
    UPLOAD_LIMIT_MESSAGE_ID: 'upload-limit-message',
    PLAN_STATUS_ID: 'plan-status',
    
    // Limits
    NAME_CHAR_LIMIT: 64,
    DESCRIPTION_CHAR_LIMIT: 144,
    FREE_MEMBER_LIMIT: 1,
    PAID_MEMBER_LIMIT: 12,
    
    // Cache-Zeit in Millisekunden (5 Minuten)
    CACHE_EXPIRATION: 5 * 60 * 1000,
    
    // Debug-Einstellungen
    DEBUG_MODE: true,
    
    // Kategorie-Mapping
    CATEGORY_MAPPING: {
        "a1c318daa4a4fdc904d0ea6ae57e9eb6": "Travel",
        "a1c318": "Travel",
        "f7375698898acddde00653547c8fa793": "Entertainment",
        "0e068df04f18438e4a5b68d397782f36": "Food",
        "2f1f2fe0cd35ddd19ca98f4b85b16258": "Beauty",
        "d98ec62473786dfe4b680ffaff56df3d": "Fashion",
        "7a825bdb2886afb7afc15ace93407334": "Fitness",
        "172297c1eff716fecb37e1086835fb54": "Technology",
        "0150c802834f25c5eb9a235e5f333086": "Gaming",
        "827b3ec71e6dd2e64687ac4a2bcde003": "Art & Culture",
        "17907bdb5206dc3d81ffc984f810e58b": "Household",
        "d9e7f4c91b3e5a8022c3a6497f1d8b55": "Home & Living"
    },
    
    // Flags
    SKIP_UPLOADCARE_DELETE: false
};
