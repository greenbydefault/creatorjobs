// src/config.js
// This module contains all static configuration values for the application.

// API Configuration
export const API_BASE_URL_MJ = "https://api.webflow.com/v2/collections";
export const WORKER_BASE_URL_MJ = "https://meine-kampagnen.oliver-258.workers.dev/"; // Ensure trailing slash if needed by buildWorkerUrl_MJ logic
export const JOB_COLLECTION_ID_MJ = "6448faf9c5a8a17455c05525";
export const USER_COLLECTION_ID_MJ = "6448faf9c5a8a15f6cc05526";

// UI Configuration
export const SKELETON_JOBS_COUNT_MJ = 3;
export const API_CALL_DELAY_MS = 5; // Delay between individual API calls in a batch

// Data Mappings
export const MAPPINGS = {
    followerRanges: {
        "4b742e0670e6172d81112005c1be62c0": "0 - 2.500",
        "b07d2c7b0cdc43e2c496bb3aa798f672": "2.500 - 5.000",
        "f3ecc03ef887ee305600d3c0342836d7": "5.000 - 10.000",
        "251f07f2aa5a2c7ab22bf1ad6dd29688": "10.000 - 25.000",
        "92f7d061cb8be70f6ffe29992e313f30": "25.000 - 50.000",
        "ce3977740d475283d1e1fc1410ffef3c": "50.000 - 100.000",
        "d279846f40353aa3cffc22ee2d8ea564": "100.000 - 250.000",
        "cc74dfe0b4fe308ac66e11ba55419501": "250.000 - 500.000",
        "24bdb369f9cdb37e28678b8d1fba0308": "500.000 - 1.000.000",
        "0f579a02ba3055cf32347301e34ce262": "1.000.000+",
        "126e325d19f997cd4158ebd2f6bc43c8": "0" // Wird nicht als Filteroption angezeigt
    },
    bundeslaender: {
        "ad69af181ec0a76ead7ca0808f9322d5": "Baden-Württemberg",
        "4ed09f2799f39cd4458f3e590563b0a7": "Bayern",
        "8c1ff8264b84de6bbffd30ff9e315c44": "Berlin",
        "76951a563940804aa945c925a4eaa52c": "Brandenburg",
        "e2dd8f0b080138d125c58421c45e9060": "Bremen",
        "e1eb8fe3d24f911f99395fad2d0c84f9": "Hamburg",
        "17f378f66aeb54c4f513f3e1d94a8885": "Hessen",
        "e5f9b206a121c4d3ded9fd18258fb76a": "Mecklenburg-Vorpommern",
        "5069427f38715209276132e26184ee1d": "Niedersachsen",
        "54f3ea7a90d2bc63ec97195e2de1a3a3": "Nordrhein-Westfalen",
        "b3801d7ef0176c308a5115b0a9307a5f": "Rheinland-Pfalz",
        "42b8ac1c54146db14db5f11c20af1d23": "Saarland",
        "ab6c9a1c2a60464b33d02c3097d648ca": "Sachsen",
        "ab852edb71d3280bfe41083c793a4961": "Sachsen-Anhalt",
        "d44e3e9bad2c19f3502da1c8d5832311": "Schleswig-Holstein",
        "070d97b7c9dd6ee1e87625e64029b1f2": "Thüringen"
    },
    laender: {
        "ff0fb336a4f4329e373519e2f4f146d0": "Deutschland",
        "f6cdc4f895b295eda5035ecde8a638bc": "Schweiz",
        "4e353955e21323d2805e89a1b5d2f0ed": "Österreich"
    },
    altersgruppen: {
        "c9ae1533c4edb215bc978af50ead8e11": "18 - 24",
        "f4bd16f836e299f51469985cffb7bebc": "25 - 35",
        "d20369fd239006b5f3eda9dbb532cb60": "36 - 50",
        "5744f42d22c8da504632912511a80667": "50+",
        "d8e4582c524ded37c12c2bd414ac4287": "Keine Angabe"
    },
    creatorTypen: {
        "ad1b8266d488daebad7c20c21ffa75c9": "UGC Creator",
        "126c5ed961ae4a5a100ec61f98bb0413": "Content Creator",
        "e2e05ef792fcc0e7e889945a53108133": "Influencer",
        "ee3384b6b32fb943768222af908ed2c3": "Model",
        "04dcb25068e192ec3ae1571d8bab7def": "Fotograf",
        "48e29cee99112e44c5d7cd505e9f2442": "Videograf",
        "29ad386dd5d90248db0ff689bbbbf68d": "Keine Angabe"
    },
    sprachen: {
        "1c8e60afd27397cecf0172584d642461": "Deutsch",
        "c80924ee660d3514aae61540d9b3d114": "Englisch"
    }
};
