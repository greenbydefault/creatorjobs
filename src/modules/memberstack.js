// src/modules/memberstack.js
import { CONFIG } from '../config.js';
import { DEBUG } from './debug.js';

class MemberstackService {
    /**
     * Holt den aktuellen Memberstack-User
     * @returns {Promise<Object>} - Das Memberstack-User-Objekt
     */
    async getCurrentMember() {
        try {
            if (!window.$memberstackDom) {
                DEBUG.log('$memberstackDom nicht gefunden. Memberstack möglicherweise nicht geladen.', null, 'error');
                return null;
            }
            
            const member = await window.$memberstackDom.getCurrentMember();
            
            if (!member || !member.data || !member.data.id) {
                DEBUG.log('Kein eingeloggter User gefunden', null, 'warn');
                return null;
            }
            
            DEBUG.log(`Memberstack-User gefunden: ${member.data.id}`);
            return member;
        } catch (error) {
            DEBUG.log('Fehler beim Abrufen des Memberstack-Users', error, 'error');
            return null;
        }
    }
    
    /**
     * Bestimmt das Video-Limit basierend auf dem Mitgliedsstatus
     * @param {Object} member - Das Memberstack-User-Objekt
     * @returns {Object} - Objekt mit Limit und Plan-Status
     */
    getMembershipDetails(member) {
        if (!member || !member.data) {
            DEBUG.log('Kein Member-Objekt, verwende FREE_MEMBER_LIMIT', null, 'warn');
            return {
                limit: CONFIG.FREE_MEMBER_LIMIT,
                status: 'Free'
            };
        }
        
        // Prüfen ob Paid-Member anhand verschiedener Kriterien
        let isPaid = false;
        
        // Option 1: Prüfen auf planConnections Array (neuere Memberstack-Version)
        if (member.data.planConnections && member.data.planConnections.length > 0) {
            for (const connection of member.data.planConnections) {
                if (connection.status === "ACTIVE" && connection.type !== "FREE") {
                    isPaid = true;
                    DEBUG.log('Paid-Member erkannt über planConnections');
                    break;
                }
            }
        }
        
        // Option 2: Fallback auf ältere Memberstack-Version
        if (!isPaid && member.data.acl && (
                member.data.acl.includes("paid") || 
                member.data.status === "paid"
            )) {
            isPaid = true;
            DEBUG.log('Paid-Member erkannt über acl/status');
        }
        
        const freeLimit = CONFIG.FREE_MEMBER_LIMIT;
        const paidLimit = CONFIG.PAID_MEMBER_LIMIT;
        const planStatus = isPaid ? 'Plus' : 'Free';
        
        // Verwende die Werte mit Fallbacks
        const limit = isPaid ? paidLimit : freeLimit;
        DEBUG.log(`Mitglied (${planStatus}) erhält Limit: ${limit}`);
        
        return {
            limit,
            status: planStatus
        };
    }
    
    /**
     * Extrahiert die Webflow-ID aus den Memberstack-Daten
     * @param {Object} member - Das Memberstack-User-Objekt
     * @returns {string|null} - Die Webflow-ID oder null
     */
    extractWebflowId(member) {
        if (!member || !member.data) return null;
        
        // Mögliche Orte für die Webflow-ID prüfen
        if (member.data.customFields && member.data.customFields["webflow-member-id"]) {
            const id = member.data.customFields["webflow-member-id"];
            DEBUG.log(`Webflow-Member-ID aus customFields gefunden: ${id}`);
            return id;
        } 
        
        if (member.data.metaData && member.data.metaData["webflow-member-id"]) {
            const id = member.data.metaData["webflow-member-id"];
            DEBUG.log(`Webflow-Member-ID aus metaData gefunden: ${id}`);
            return id;
        }
        
        // Weitere mögliche Felder prüfen
        const possibleFields = ["webflow-id", "webflow_id", "webflowId", "webflow_member_id"];
        
        // Prüfe customFields
        if (member.data.customFields) {
            for (const field of possibleFields) {
                if (member.data.customFields[field]) {
                    DEBUG.log(`Webflow-Member-ID aus customFields["${field}"] gefunden: ${member.data.customFields[field]}`);
                    return member.data.customFields[field];
                }
            }
        }
        
        // Prüfe metaData
        if (member.data.metaData) {
            for (const field of possibleFields) {
                if (member.data.metaData[field]) {
                    DEBUG.log(`Webflow-Member-ID aus metaData["${field}"] gefunden: ${member.data.metaData[field]}`);
                    return member.data.metaData[field];
                }
            }
        }
        
        return null;
    }
}

// Singleton-Instanz exportieren
export const MEMBERSTACK = new MemberstackService();
