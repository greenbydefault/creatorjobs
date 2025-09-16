// form-submission-handler.js
// VERSION 22.0: Production-Ready mit EmailJS, Request Isolation, Verification & Recovery
// KRITISCHE FIXES: Race Conditions, Verification, Production Monitoring

(function() {
    'use strict';

    // === CONFIGURATION ===
    const CONFIG = {
        // Debug & Monitoring
        DEBUG_MODE: true,  // Entwickler-Debug (verbose)
        PRODUCTION_LOGGING: true,  // WICHTIG: Immer true in Production für Fehler-Tracking
        SEND_ERROR_EMAILS: true,  // Email bei Fehlern senden
        SEND_SUCCESS_EMAILS: true,  // Email bei erfolgreichen Jobs
        
        // EmailJS Configuration
        EMAILJS: {
            SERVICE_ID: 'service_5yxp4ke',  // HIER EINTRAGEN
            TEMPLATE_ID_SUCCESS: 'template_fzetysg',  // HIER EINTRAGEN
            TEMPLATE_ID_ERROR: 'template_xu94ioh',  // HIER EINTRAGEN
            PUBLIC_KEY: 'Jwa4q9MN-NfwAgQPB',  // HIER EINTRAGEN
            ADMIN_EMAIL: 'oliver@creatorjobs.com'  // HIER DEINE EMAIL
        },
        
        // API Endpoints
        WEBFLOW_CMS_POST_WORKER_URL: 'https://late-meadow-00bc.oliver-258.workers.dev',
        AIRTABLE_WORKER_URL: 'https://airtable-job-post.oliver-258.workers.dev/',
        MEMBERSTACK_CREDIT_WORKER_URL: 'https://post-job-credit-update.oliver-258.workers.dev/',
        
        // Retry Configuration
        MAX_RETRIES: 5,
        INITIAL_RETRY_DELAY: 1000,
        MAX_RETRY_DELAY: 10000,
        
        // Verification Timeouts
        VERIFICATION_TIMEOUT: 30000,  // 30 Sekunden
        LOCK_TIMEOUT: 10000,  // 10 Sekunden für Member-Lock
        
        // Form Configuration
        MAIN_FORM_ID: 'wf-form-post-job-form',
        DATA_FIELD_ATTRIBUTE: 'data-preview-field',
        SUPPORT_EMAIL: 'support@yourcompany.com',
        UPLOADCARE_CTX_NAME: 'my-uploader',
        UPLOADCARE_PROVIDER_ID: 'uploaderctx'
    };

    // === LOGGING SYSTEM ===
    const Logger = {
        requestId: null,
        
        init(requestId) {
            this.requestId = requestId;
        },
        
        log(level, message, data = null) {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                requestId: this.requestId,
                level,
                message,
                data,
                url: window.location.href,
                userAgent: navigator.userAgent
            };
            
            // Console output basierend auf Mode
            if (CONFIG.DEBUG_MODE || (CONFIG.PRODUCTION_LOGGING && level !== 'DEBUG')) {
                const consoleMethod = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log';
                console[consoleMethod](`[${timestamp}] [${this.requestId}] ${message}`, data || '');
            }
            
            // Production Logging in localStorage
            if (CONFIG.PRODUCTION_LOGGING) {
                this.saveToLocalStorage(logEntry);
            }
            
            return logEntry;
        },
        
        debug(message, data) { return this.log('DEBUG', message, data); },
        info(message, data) { return this.log('INFO', message, data); },
        warn(message, data) { return this.log('WARN', message, data); },
        error(message, data) { return this.log('ERROR', message, data); },
        
        saveToLocalStorage(entry) {
            try {
                const logs = JSON.parse(localStorage.getItem('job_submission_logs') || '[]');
                logs.push(entry);
                // Nur die letzten 50 Logs behalten
                if (logs.length > 50) logs.splice(0, logs.length - 50);
                localStorage.setItem('job_submission_logs', JSON.stringify(logs));
            } catch (e) {
                console.error('Failed to save log:', e);
            }
        },
        
        getRecentLogs() {
            try {
                return JSON.parse(localStorage.getItem('job_submission_logs') || '[]');
            } catch (e) {
                return [];
            }
        }
    };

    // === EMAILJS INTEGRATION ===
    const EmailService = {
        initialized: false,
        
        async init() {
            if (this.initialized) return true;
            
            try {
                // EmailJS Library laden falls noch nicht vorhanden
                if (typeof emailjs === 'undefined') {
                    await this.loadEmailJS();
                }
                
                emailjs.init(CONFIG.EMAILJS.PUBLIC_KEY);
                this.initialized = true;
                Logger.debug('EmailJS initialisiert');
                return true;
            } catch (error) {
                Logger.error('EmailJS Initialisierung fehlgeschlagen', error);
                return false;
            }
        },
        
        async loadEmailJS() {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        },
        
        async sendSuccessNotification(jobData, transactionState) {
            if (!CONFIG.SEND_SUCCESS_EMAILS) return;
            
            try {
                await this.init();
                
                const templateParams = {
                    to_email: CONFIG.EMAILJS.ADMIN_EMAIL,
                    request_id: Logger.requestId,
                    job_title: jobData['job-title'] || jobData['projectName'],
                    user_name: jobData['userName'],
                    user_email: jobData['memberEmail'],
                    budget: jobData['budget'],
                    webflow_id: transactionState.webflowItemId,
                    airtable_id: transactionState.airtableRecordId,
                    member_id: jobData['webflowId'],
                    timestamp: new Date().toISOString(),
                    status: 'SUCCESS',
                    admin_test: jobData['admin-test'] ? 'JA' : 'NEIN'
                };
                
                await emailjs.send(
                    CONFIG.EMAILJS.SERVICE_ID,
                    CONFIG.EMAILJS.TEMPLATE_ID_SUCCESS,
                    templateParams
                );
                
                Logger.info('Success Email gesendet', templateParams);
            } catch (error) {
                Logger.error('Fehler beim Senden der Success Email', error);
            }
        },
        
        async sendErrorNotification(error, jobData, transactionState) {
            if (!CONFIG.SEND_ERROR_EMAILS) return;
            
            try {
                await this.init();
                
                const recentLogs = Logger.getRecentLogs().filter(log => 
                    log.requestId === Logger.requestId
                );
                
                const templateParams = {
                    to_email: CONFIG.EMAILJS.ADMIN_EMAIL,
                    request_id: Logger.requestId,
                    error_message: error.message,
                    error_stack: error.stack,
                    job_title: jobData?.['job-title'] || jobData?.['projectName'] || 'Unbekannt',
                    user_email: jobData?.['memberEmail'] || 'Unbekannt',
                    transaction_state: JSON.stringify(transactionState, null, 2),
                    recent_logs: JSON.stringify(recentLogs, null, 2),
                    timestamp: new Date().toISOString(),
                    status: 'ERROR',
                    rollback_needed: transactionState.airtableRecordId ? 'JA' : 'NEIN'
                };
                
                await emailjs.send(
                    CONFIG.EMAILJS.SERVICE_ID,
                    CONFIG.EMAILJS.TEMPLATE_ID_ERROR,
                    templateParams
                );
                
                Logger.info('Error Email gesendet', { error: error.message });
            } catch (emailError) {
                Logger.error('Fehler beim Senden der Error Email', emailError);
            }
        }
    };

    // === TRANSACTION MANAGER ===
    const TransactionManager = {
        transactions: new Map(),
        
        create(requestId) {
            const transaction = {
                requestId,
                startTime: Date.now(),
                state: {
                    airtableRecordId: null,
                    webflowItemId: null,
                    memberRecordId: null,
                    memberUpdated: false,
                    creditDeducted: false,
                    completed: false,
                    verificationPassed: false
                },
                checkpoints: [],
                formData: null
            };
            
            this.transactions.set(requestId, transaction);
            this.saveToStorage(requestId, transaction);
            return transaction;
        },
        
        update(requestId, updates) {
            const transaction = this.transactions.get(requestId);
            if (!transaction) return null;
            
            Object.assign(transaction.state, updates);
            transaction.checkpoints.push({
                timestamp: Date.now(),
                update: updates
            });
            
            this.saveToStorage(requestId, transaction);
            Logger.debug('Transaction updated', updates);
            return transaction;
        },
        
        saveToStorage(requestId, transaction) {
            try {
                const key = `transaction_${requestId}`;
                sessionStorage.setItem(key, JSON.stringify(transaction));
            } catch (e) {
                Logger.warn('Failed to save transaction to storage', e);
            }
        },
        
        async cleanup(requestId) {
            this.transactions.delete(requestId);
            try {
                sessionStorage.removeItem(`transaction_${requestId}`);
            } catch (e) {
                // Ignore
            }
        }
    };

    // === LOCK MANAGER (Verhindert Race Conditions) ===
    const LockManager = {
        locks: new Map(),
        
        async acquire(resource, timeout = CONFIG.LOCK_TIMEOUT) {
            const lockKey = `lock_${resource}`;
            const startTime = Date.now();
            
            while (this.locks.get(lockKey) || localStorage.getItem(lockKey)) {
                if (Date.now() - startTime > timeout) {
                    throw new Error(`Lock timeout for resource: ${resource}`);
                }
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const lockId = `${Logger.requestId}_${Date.now()}`;
            this.locks.set(lockKey, lockId);
            localStorage.setItem(lockKey, lockId);
            
            Logger.debug(`Lock acquired for ${resource}`);
            return lockId;
        },
        
        release(resource, lockId) {
            const lockKey = `lock_${resource}`;
            const currentLock = this.locks.get(lockKey);
            
            if (currentLock === lockId) {
                this.locks.delete(lockKey);
                localStorage.removeItem(lockKey);
                Logger.debug(`Lock released for ${resource}`);
            }
        },
        
        async withLock(resource, operation) {
            const lockId = await this.acquire(resource);
            try {
                return await operation();
            } finally {
                this.release(resource, lockId);
            }
        }
    };

    // === VERIFICATION SERVICE ===
    const VerificationService = {
        async verifyAirtableRecord(recordId, expectedWebflowId) {
            try {
                Logger.info(`Verifiziere Airtable Record ${recordId}`);
                
                const response = await fetch(CONFIG.AIRTABLE_WORKER_URL + '/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        recordId, 
                        expectedWebflowId 
                    })
                });
                
                if (!response.ok) return false;
                
                const data = await response.json();
                const verified = data.webflowItemId === expectedWebflowId;
                
                Logger.info(`Airtable Verification: ${verified ? 'PASSED' : 'FAILED'}`);
                return verified;
            } catch (error) {
                Logger.error('Airtable Verification Error', error);
                return false;
            }
        },
        
        async verifyWebflowItem(itemId, expectedFields) {
            try {
                Logger.info(`Verifiziere Webflow Item ${itemId}`);
                
                const response = await fetch(`${CONFIG.WEBFLOW_CMS_POST_WORKER_URL}/${itemId}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (!response.ok) return false;
                
                const data = await response.json();
                
                // Prüfe ob job-id korrekt gesetzt ist
                const jobIdField = data.fieldData?.['job-id'] || data.fields?.['job-id'];
                const verified = jobIdField === itemId;
                
                Logger.info(`Webflow Verification: ${verified ? 'PASSED' : 'FAILED'}`);
                return verified;
            } catch (error) {
                Logger.error('Webflow Verification Error', error);
                return false;
            }
        },
        
        async verifyMemberUpdate(memberId, expectedJobId) {
            try {
                Logger.info(`Verifiziere Member ${memberId} Update`);
                
                const response = await fetch(`${CONFIG.WEBFLOW_CMS_POST_WORKER_URL}/members/${memberId}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                if (!response.ok) return false;
                
                const data = await response.json();
                const postedJobs = data.fieldData?.['posted-jobs'] || 
                                   data.fields?.['posted-jobs'] || 
                                   data['posted-jobs'] || 
                                   [];
                
                const verified = Array.isArray(postedJobs) && postedJobs.includes(expectedJobId);
                
                Logger.info(`Member Verification: ${verified ? 'PASSED' : 'FAILED'}`);
                return verified;
            } catch (error) {
                Logger.error('Member Verification Error', error);
                return false;
            }
        },
        
        async verifyAllUpdates(transactionState, webflowMemberId) {
            Logger.info('Starte vollständige Verification...');
            
            const verifications = await Promise.all([
                this.verifyAirtableRecord(
                    transactionState.airtableRecordId, 
                    transactionState.webflowItemId
                ),
                this.verifyWebflowItem(
                    transactionState.webflowItemId,
                    { 'job-id': transactionState.webflowItemId }
                ),
                this.verifyMemberUpdate(
                    webflowMemberId,
                    transactionState.webflowItemId
                )
            ]);
            
            const allPassed = verifications.every(v => v === true);
            
            Logger.info(`Verification Ergebnis: ${allPassed ? 'ALLE PASSED' : 'FEHLER GEFUNDEN'}`, {
                airtable: verifications[0],
                webflow: verifications[1],
                member: verifications[2]
            });
            
            return allPassed;
        }
    };

    // === ENHANCED RETRY WITH EXPONENTIAL BACKOFF ===
    async function retryOperationWithBackoff(operation, maxRetries = CONFIG.MAX_RETRIES) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                const delay = Math.min(
                    CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1), 
                    CONFIG.MAX_RETRY_DELAY
                );
                
                Logger.warn(`Attempt ${attempt}/${maxRetries} failed. Retrying in ${delay}ms`, {
                    error: error.message
                });
                
                if (attempt === maxRetries) {
                    Logger.error(`All ${maxRetries} attempts failed`, error);
                    throw error;
                }
                
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // === REFERENCE MAPPINGS (wie vorher) ===
    const REFERENCE_MAPPINGS = {
        'creatorFollower': {
            '0 - 2.500': '3d869451e837ddf527fc54d0fb477ab4',
            '2.500 - 5.000': 'e2d86c9f8febf4fecd674f01beb05bf5',
            '5.000 - 10.000': '27420dd46db02b53abb3a50d4859df84',
            '10.000 - 25.000': 'd61d9c5625c03e86d87ef854aa702265',
            '25.000 - 50.000': '78672a41f18d13b57c84e24ae8f9edb9',
            '50.00 - 100.000': '4ed1bbe4e792cfae473584da597445a8',
            '100.000 - 250.000': 'afb6fa102d3defaad347edae3fc8452a',
            '250.000 - 500.000': '6a1072f2e2a7058fba98f58fb45ab7fe',
            '500.000 - 1.000.000': '18efe7a8d618cf2c2344329254f5ee0b',
            '1.000.000+': '205b22b080e9f3bc2bb6869d12cbe298',
            'Keine Angabe': '5e33b6550adcb786fafd43d422c63de1'
        },
        'creatorAge': {
            '18-24': '4bf57b0debb3abf9dc11de2ddd50eac7',
            '25-35': '07fae9d66db85489dc77dd3594fba822',
            '36-50': 'a0745052dec634f59654ab2578d5db06',
            '50+': '44b95760d7ac99ecf71b2cbf8f610fdd',
            'Keine Angabe': '5660c84f647c97a3aee75cce5da8493b'
        },
        'genderOptional': {
            'Männlich': '6c84301c22d5e827d05308a33d6ef510',
            'Weiblich': 'bcb50387552afc123405ae7fa7640d0d',
            'Diverse': '870da58473ebc5d7db4c78e7363ca417',
            'Couple': '8bab076ffc2e114b52620f965aa046fb',
            'Alle': 'ec933c35230bc628da6029deee4159e',
            'Keine Angabe': 'd157525b18b53e62638884fd58368cfa8'
        },
        'videoDurationOptional': {
            '0 - 15 Sekunden': 'a58ac00b365993a9dbc6e7084c6fda10',
            '15 - 30 Sekunden': '49914418e6b0fc02e4eb742f46658400',
            '30 - 45 Sekunden': '6ef12194838992fb1584150b97d246f3',
            '45 - 60 Sekunden': '37b2d32959e6be1bfaa5a60427229be3',
            '60 - 90 Sekunden': '070c836b61cdb5d3bf49900ea9d11d1f'
        },
        'scriptOptional': {
            'Brand': '3b95cafa5a06a54e025d38ba71b7b475',
            'Creator': 'f907b4b8d30d0b55cc831eb054094dad'
        },
        'hookCount': {
            '1': 'b776e9ef4e9ab8b165019c1a2a04e8a9',
            '2': '1667c831d9cba5adc9416401031796f3',
            '3': '355ef3ceb930ddbdd28458265b0a4cf0',
            '4': 'be2c319b5dccd012016df2e33408c39'
        },
        'videoFormat': {
            '16:9': 'webflow_item_id_fuer_16_9',
            '4:5': 'webflow_item_id_fuer_4_5',
            '9:16': 'webflow_item_id_fuer_9_16',
        },
        'subtitelOptional': {
            'Ja': '587b210d6015c519f05e0aeea6abf1fa',
            'Nein': 'ac9e02ffc119b7bd0e05403e096f89b3'
        },
        'durationOptional': {
            '24 Monate': 'dd24b0de3f7a906d9619c8f56d9c2484',
            'unbegrenzt': 'dcbb14e9f4c1ee9aaeeddd62b4d8b625',
            '18 Monate': 'c97680a1c8a5214809b7885b00e7c1d8',
            '12 Monate': 'e544d894fe78aaeaf83d8d5a35be5f3f',
            '6 Monate': 'b8353db272656593b627e67fb4730bd6',
            '3 Monate': '9dab07affd09299a345cf4f2322ece34'
        },
        'nutzungOptional': {},
        'channels': {}
    };

    // === FIELD MAPPINGS (wie vorher) ===
    const WEBFLOW_FIELD_SLUG_MAPPINGS = {
        'projectName': 'name',
        'job-title': 'job-title',
        'jobOnline': 'job-date-end',
        'budget': 'job-payment',
        'creatorCount': 'anzahl-gesuchte-creator',
        'videoCountOptional': 'anzahl-videos-2',
        'imgCountOptional': 'anzahl-bilder-2',
        'aufgabe': 'deine-aufgaben',
        'steckbrief': 'job-beschreibung',
        'job-adress': 'location',
        'previewText': 'previewtext',
        'userName': 'brand-name',
        'memberEmail': 'contact-mail',
        'webflowId': 'job-posted-by',
        'webflowIdForTextField': 'webflow-member-id',
        'memberstackId': 'ms-member-id',
        'jobImageUpload': 'job-image',
        'creatorCountOptional': 'creator-follower',
        'creatorAge': 'creator-alter',
        'genderOptional': 'creator-geschlecht',
        'videoDurationOptional': 'video-dauer',
        'scriptOptional': 'script',
        'hookCount': 'anzahl-der-hooks',
        'videoFormat': 'format',
        'subtitelOptional': 'untertitel',
        'durationOptional': 'dauer-nutzungsrechte',
        'creatorCategorie': 'art-des-contents',
        'industryCategory': 'industrie-kategorie',
        'creatorLand': 'land',
        'creatorLang': 'sprache',
        'barterDealToggle': 'barter-deal',
        'plusJobToggle': 'plus-job',
        'admin-test': 'admin-test',
        'nutzungOptional': 'job-posting',
        'channels': 'fur-welchen-kanale-wird-der-content-produziert',
        'airtableJobIdForWebflow': 'job-id',
        'reviewsOptional': 'anzahl-der-reviews'
    };

    const AIRTABLE_FIELD_MAPPINGS = {
        'plusJobToggle': 'Plus Job',
        'barterDealToggle': 'Barter Deal',
        'admin-test': 'Admin Test',
        'projectName': 'Project Name',
        'jobOnline': 'Job Online Date',
        'job-title': 'Job Title',
        'budget': 'Budget',
        'creatorCount': 'Creator Count',
        'videoCountOptional': 'Video Count Optional',
        'imgCountOptional': 'Image Count Optional',
        'aufgabe': 'Aufgabe',
        'steckbrief': 'Steckbrief',
        'job-adress': 'Location',
        'job-adress-optional': 'Location',
        'previewText': 'Preview Text',
        'userName': 'User Name',
        'memberEmail': 'Contact Mail',
        'webflowId': 'Webflow Member ID',
        'memberstackId': 'Member ID',
        'jobImageUpload': 'Job Image',
        'creatorFollower': 'Creator Follower',
        'creatorCountOptional': 'Creator Follower',
        'creatorAge': 'Creator Age',
        'genderOptional': 'Gender Optional',
        'videoDurationOptional': 'Video Duration Optional',
        'scriptOptional': 'Script Optional',
        'hookCount': 'Hook Count',
        'videoFormat': 'Video Format',
        'subtitelOptional': 'Subtitel Optional',
        'durationOptional': 'Duration Optional',
        'creatorCategorie': 'Creator Categorie',
        'industryCategory': 'Industry Category',
        'creatorLand': 'Land',
        'creatorLang': 'Sprache',
        'nutzungOptional': 'Nutzungsrechte',
        'channels': 'Channels',
        'reviewsOptional': 'Reviews Optional',
        'user-creatorname': 'User Creatorname',
        'startDate': 'Start Date',
        'endDate': 'End Date',
        'webflowItemIdFieldAirtable': 'Webflow Item ID'
    };

    // === POPUP MANAGEMENT ===
    const POPUP_WRAPPER_ATTR = '[data-error-target="popup-wrapper"]';
    const POPUP_TITLE_ATTR = '[data-error-target="popup-title"]';
    const POPUP_MESSAGE_ATTR = '[data-error-target="popup-message"]';
    const CLOSE_POPUP_ATTR = '[data-error-target="close-popup"]';
    const MAIL_ERROR_ATTR = '[data-error-target="mail-error"]';

    // Utility functions
    const find = (selector, element = document) => element.querySelector(selector);
    const findAll = (selector, element = document) => element.querySelectorAll(selector);

    function showCustomPopup(message, type, title, supportDetails = '') {
        const popup = find(POPUP_WRAPPER_ATTR);
        const popupTitle = find(POPUP_TITLE_ATTR);
        const popupMessage = find(POPUP_MESSAGE_ATTR);
        const mailIconLink = find(MAIL_ERROR_ATTR);

        if (!popup || !popupTitle || !popupMessage || !mailIconLink) {
            Logger.error("Popup-Elemente nicht gefunden!");
            console.log(`Status: ${type.toUpperCase()} - Titel: ${title} - Nachricht: ${message}`);
            if (supportDetails) console.log('Support Details:', supportDetails);
            return;
        }
        
        popup.setAttribute('data-popup-type', type);
        popupTitle.textContent = title;
        popupMessage.textContent = message;

        if (type === 'error') {
            mailIconLink.style.display = 'inline-block';
            const subject = encodeURIComponent(`Fehlerbericht Formularübermittlung (${title})`);
            const body = encodeURIComponent(
                `RequestID: ${Logger.requestId}\n\n` +
                `Fehlernachricht:\n${message}\n\n` +
                `Support Details:\n${supportDetails}\n\n` +
                `Zeitstempel: ${new Date().toISOString()}\n` +
                `Browser: ${navigator.userAgent}\n` +
                `Seite: ${window.location.href}`
            );
            mailIconLink.href = `mailto:${CONFIG.SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
            mailIconLink.target = '_blank';
        } else {
            mailIconLink.style.display = 'none';
            mailIconLink.href = '#';
        }
        
        popup.style.display = 'flex';
        
        if (type !== 'error' && type !== 'loading') {
            setTimeout(closeCustomPopup, 7000);
        }
    }

    function closeCustomPopup() {
        const popup = find(POPUP_WRAPPER_ATTR);
        if (popup) {
            popup.style.display = 'none';
        }
    }

    // === HELPER FUNCTIONS (wie vorher) ===
    function formatToISODate(dateString) {
        if (!dateString) return null;
        if (/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(dateString)) {
            return dateString;
        }
        
        const ymdParts = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (ymdParts) {
            const dateObj = new Date(Date.UTC(parseInt(ymdParts[1]), parseInt(ymdParts[2]) - 1, parseInt(ymdParts[3])));
            if (!isNaN(dateObj.getTime())) return dateObj.toISOString();
        }
        
        let dateObj;
        const deParts = dateString.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
        if (deParts) {
            dateObj = new Date(Date.UTC(parseInt(deParts[3]), parseInt(deParts[2]) - 1, parseInt(deParts[1])));
        } else {
            dateObj = new Date(dateString);
            if (isNaN(dateObj.getTime())) {
                const now = new Date(dateString);
                if (!isNaN(now.getTime())) {
                    dateObj = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()));
                }
            }
        }
        
        if (isNaN(dateObj.getTime())) {
            Logger.warn('Ungültiges Datumsformat für ISO-Konvertierung:', dateString);
            return null;
        }
        
        return dateObj.toISOString();
    }

    function getFriendlyErrorFieldInfo(errorMessage) {
        const result = {
            area: null,
            field: null,
            title: "Fehler bei Verarbeitung"
        };
        
        const lowerErrorMessage = errorMessage.toLowerCase();

        if (lowerErrorMessage.includes("airtable fehler") || lowerErrorMessage.includes("airtable error")) {
            result.area = "Datenbank (Airtable)";
            result.title = "Datenbankfehler";
        } else if (lowerErrorMessage.includes("webflow") || lowerErrorMessage.includes("cms")) {
            result.area = "Webseite (Webflow)";
            result.title = lowerErrorMessage.includes("erstellungsfehler") ? "Fehler bei Job-Erstellung" : "Fehler bei Job-Aktualisierung";
        } else if (lowerErrorMessage.includes("verification")) {
            result.area = "Verifikation";
            result.title = "Verifikationsfehler";
        } else if (lowerErrorMessage.includes("lock") || lowerErrorMessage.includes("timeout")) {
            result.area = "System";
            result.title = "System-Timeout";
        } else {
            result.title = "Unerwarteter Fehler";
        }
        
        return result;
    }

    // === FORM DATA COLLECTION (wie vorher, aber mit Logger) ===
    function collectAndFormatFormData(formElement) {
        const formData = {};
        const regularFields = findAll(`[${CONFIG.DATA_FIELD_ATTRIBUTE}]`, formElement);
        let projectNameValue = '';

        const multiSelectFields = {
            'creatorLang': [],
            'creatorLand': [],
            'nutzungOptional': [],
            'channels': []
        };

        regularFields.forEach(field => {
            const fieldNameKey = field.getAttribute(CONFIG.DATA_FIELD_ATTRIBUTE);
            let value;

            if (multiSelectFields.hasOwnProperty(fieldNameKey)) {
                if ((field.type === 'checkbox' || field.type === 'radio') && field.checked) {
                    multiSelectFields[fieldNameKey].push(field.value.trim());
                } else if (field.tagName === 'SELECT' && field.multiple) {
                    for (const option of field.options) {
                        if (option.selected) {
                            multiSelectFields[fieldNameKey].push(option.value.trim());
                        }
                    }
                } else if (field.tagName === 'SELECT' && field.value) {
                    multiSelectFields[fieldNameKey].push(field.value.trim());
                }
            } else {
                switch (fieldNameKey) {
                    case 'projectName':
                        projectNameValue = field.value.trim();
                        formData[fieldNameKey] = projectNameValue;
                        break;
                    case 'jobSlug':
                        break;
                    default:
                        if (field.type === 'checkbox') {
                            formData[fieldNameKey] = field.checked;
                        } else if (field.type === 'radio') {
                            if (field.checked) {
                                formData[fieldNameKey] = field.value.trim();
                            }
                        } else if (field.tagName === 'SELECT') {
                            value = field.options[field.selectedIndex]?.value.trim();
                            if (value !== undefined && value !== null && value !== '') formData[fieldNameKey] = value;
                        } else if (field.type === 'number') {
                            const numVal = field.value.trim();
                            if (numVal !== '') formData[fieldNameKey] = parseFloat(numVal);
                        } else if (field.type === 'date') {
                            value = field.value;
                            if (value) formData[fieldNameKey] = value;
                        } else {
                            value = field.value.trim();
                            if (value !== '' || fieldNameKey === 'job-adress' || fieldNameKey === 'job-adress-optional') {
                                formData[fieldNameKey] = value;
                            }
                        }
                }
            }
        });

        for (const key in multiSelectFields) {
            if (multiSelectFields[key].length > 0) {
                formData[key] = multiSelectFields[key];
            }
        }

        // Uploadcare handling
        let uploadcareAPI = null;
        try {
            Logger.debug('Attempting to get Uploadcare API');
            const uploaderCtxEl = find(`#${CONFIG.UPLOADCARE_PROVIDER_ID}`);
            if (uploaderCtxEl && typeof uploaderCtxEl.getAPI === 'function') {
                uploadcareAPI = uploaderCtxEl.getAPI();
            }

            if (!uploadcareAPI && window.UPLOADCARE_BLOCKS && typeof window.UPLOADCARE_BLOCKS.get === 'function') {
                uploadcareAPI = window.UPLOADCARE_BLOCKS.get(CONFIG.UPLOADCARE_CTX_NAME);
            }

            if (!uploadcareAPI) {
                const uploaderEl = find(`uc-file-uploader-regular[ctx-name="${CONFIG.UPLOADCARE_CTX_NAME}"]`, formElement);
                if (uploaderEl && typeof uploaderEl.getAPI === 'function') {
                    uploadcareAPI = uploaderEl.getAPI();
                }
            }

            if (uploadcareAPI && typeof uploadcareAPI.getOutputCollectionState === 'function') {
                const collectionState = uploadcareAPI.getOutputCollectionState();
                let fileUUID = null;

                if (collectionState && collectionState.successEntries && collectionState.successEntries.length > 0) {
                    const firstSuccessEntry = collectionState.successEntries[0];
                    fileUUID = firstSuccessEntry.uuid || (firstSuccessEntry.fileInfo ? firstSuccessEntry.fileInfo.uuid : null);
                } else if (collectionState && collectionState.allEntries && collectionState.allEntries.length > 0) {
                    const firstEntry = collectionState.allEntries.find(entry => entry.isSuccess);
                    if (firstEntry) {
                        fileUUID = firstEntry.uuid || (firstEntry.fileInfo ? firstEntry.fileInfo.uuid : null);
                    }
                }

                if (fileUUID) {
                    const baseCdnUrl = `https://ucarecdn.com/${fileUUID}/`;
                    const transformedUrl = `${baseCdnUrl}-/preview/320x320/-/format/auto/-/quality/smart/`;
                    formData['jobImageUpload'] = transformedUrl;
                    Logger.debug('Uploadcare Image URL prepared', transformedUrl);
                }
            }
        } catch (e) {
            Logger.error('Error during Uploadcare API integration', e);
        }

        // Data normalization
        if (formData['creatorLand'] && !Array.isArray(formData['creatorLand'])) {
            formData['creatorLand'] = [formData['creatorLand']];
        }
        if (formData['creatorLang'] && !Array.isArray(formData['creatorLang'])) {
            formData['creatorLang'] = [formData['creatorLang']];
        }

        // Memberstack inputs handling
        const memberstackInputs = findAll('input[data-ms-member]', formElement);
        memberstackInputs.forEach(field => {
            const fieldNameKey = field.name;
            const value = field.value.trim();
            if (fieldNameKey && value !== '') {
                formData[fieldNameKey] = value;
            }
        });

        // Date formatting
        ['jobOnline', 'startDate', 'endDate'].forEach(dateFieldKey => {
            if (formData[dateFieldKey]) {
                const isoDate = formatToISODate(formData[dateFieldKey]);
                if (isoDate) {
                    formData[dateFieldKey] = isoDate;
                } else {
                    delete formData[dateFieldKey];
                }
            }
        });

        // Default jobOnline date if not provided
        if (!formData['jobOnline']) {
            const jobOnlineField = find(`[${CONFIG.DATA_FIELD_ATTRIBUTE}="jobOnline"]`, formElement);
            if (!jobOnlineField || !jobOnlineField.value.trim()) {
                const today = new Date();
                today.setUTCDate(today.getUTCDate() + 3);
                today.setUTCHours(0, 0, 0, 0);
                formData['jobOnline'] = today.toISOString();
            }
        }

        // Budget handling
        const budgetField = find(`[${CONFIG.DATA_FIELD_ATTRIBUTE}="budget"]`, formElement);
        formData['budget'] = budgetField && budgetField.value.trim() !== '' ? parseFloat(budgetField.value.trim()) : 0;

        // Job title consistency
        if (projectNameValue) {
            formData['job-title'] = projectNameValue;
        }

        // Data consistency fixes
        if (!formData['webflowId'] && formData['Webflow Member ID']) {
            formData['webflowId'] = formData['Webflow Member ID'];
        }
        if (formData['job-adress-optional'] && !formData['job-adress']) {
            formData['job-adress'] = formData['job-adress-optional'];
        }
        if (!formData['creatorCountOptional'] && formData['creatorFollower'] && typeof formData['creatorFollower'] === 'string') {
            formData['creatorCountOptional'] = formData['creatorFollower'];
        }

        Logger.debug('Gesammelte Formulardaten', formData);
        return formData;
    }

    // === API OPERATIONS WITH ENHANCED ERROR HANDLING ===
    async function deleteAirtableRecord(airtableRecordId, reason = 'Unknown error') {
        if (!airtableRecordId) {
            Logger.warn('Keine Airtable Record ID zum Löschen vorhanden.');
            return false;
        }
        
        Logger.info(`Versuche Airtable Record ${airtableRecordId} zu löschen`, { reason });
        
        try {
            const response = await retryOperationWithBackoff(async () => {
                const deleteResponse = await fetch(CONFIG.AIRTABLE_WORKER_URL + '/delete', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        recordId: airtableRecordId,
                        reason: reason,
                        requestId: Logger.requestId
                    })
                });
                
                if (!deleteResponse.ok) {
                    const responseData = await deleteResponse.json().catch(() => ({}));
                    throw new Error(`Delete failed with status ${deleteResponse.status}: ${JSON.stringify(responseData)}`);
                }
                
                return deleteResponse;
            });
            
            Logger.info(`Airtable Record ${airtableRecordId} erfolgreich gelöscht.`);
            return true;
        } catch (error) {
            Logger.error(`Fehler beim Löschen von Airtable Record ${airtableRecordId}`, error);
            return false;
        }
    }

    async function createAirtableRecord(jobDetails) {
        return await retryOperationWithBackoff(async () => {
            Logger.info('Erstelle Airtable Record');
            
            const response = await fetch(CONFIG.AIRTABLE_WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    jobDetails: jobDetails,
                    requestId: Logger.requestId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Airtable Fehler (${response.status}): ${errorData.error?.message || JSON.stringify(errorData)}`);
            }
            
            const responseData = await response.json();
            const recordId = responseData.records?.[0]?.id;
            
            if (!recordId) {
                throw new Error('Airtable Record ID nicht erhalten nach Erstellung.');
            }
            
            Logger.info('Airtable Job Record erfolgreich erstellt', { recordId });
            return { recordId, responseData };
        });
    }

    async function createWebflowItem(fieldData) {
        return await retryOperationWithBackoff(async () => {
            Logger.info('Erstelle Webflow Item');
            
            const response = await fetch(CONFIG.WEBFLOW_CMS_POST_WORKER_URL + '/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: fieldData,
                    requestId: Logger.requestId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Webflow Erstellungsfehler (${response.status}): ${JSON.stringify(errorData.error || errorData.errors || errorData)}`);
            }
            
            const responseData = await response.json();
            const itemId = responseData.id || responseData.item?.id;
            
            if (!itemId) {
                throw new Error('Webflow Item ID nicht erhalten nach Erstellung.');
            }
            
            Logger.info('Webflow Item erfolgreich erstellt', { itemId });
            return { itemId, responseData };
        });
    }

    async function updateWebflowItem(itemId, updateFields) {
        return await retryOperationWithBackoff(async () => {
            Logger.info(`Aktualisiere Webflow Item ${itemId}`);
            
            const response = await fetch(`${CONFIG.WEBFLOW_CMS_POST_WORKER_URL}/${itemId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: updateFields,
                    requestId: Logger.requestId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Webflow Update Fehler (${response.status}): ${JSON.stringify(errorData.error || errorData.errors || errorData)}`);
            }
            
            const responseData = await response.json();
            Logger.info(`Webflow Item ${itemId} erfolgreich aktualisiert`);
            return responseData;
        });
    }

    async function updateAirtableRecord(recordId, webflowItemId, additionalFields = {}) {
        return await retryOperationWithBackoff(async () => {
            Logger.info(`Aktualisiere Airtable Record ${recordId} mit Webflow ID ${webflowItemId}`);
            
            const fieldsToUpdate = { ...additionalFields };
            const airtableWebflowIdField = AIRTABLE_FIELD_MAPPINGS['webflowItemIdFieldAirtable'];
            
            if (airtableWebflowIdField) {
                fieldsToUpdate[airtableWebflowIdField] = webflowItemId;
            }
            
            const payload = {
                recordId: recordId,
                webflowId: webflowItemId,
                fieldsToUpdate: fieldsToUpdate,
                requestId: Logger.requestId
            };
            
            const response = await fetch(CONFIG.AIRTABLE_WORKER_URL + '/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Airtable Update Fehler (${response.status}): ${JSON.stringify(errorData)}`);
            }
            
            const responseData = await response.json();
            Logger.info('Airtable Record erfolgreich mit Webflow Item ID aktualisiert');
            return responseData;
        });
    }

    async function updateWebflowMemberPostedJobs(webflowMemberId, newWebflowJobId) {
        return await LockManager.withLock(`member_${webflowMemberId}`, async () => {
            return await retryOperationWithBackoff(async () => {
                Logger.info(`Aktualisiere Webflow Member ${webflowMemberId} - füge Job ${newWebflowJobId} hinzu`);
                
                // 1. Aktuelles Member Item laden
                const getMemberResponse = await fetch(`${CONFIG.WEBFLOW_CMS_POST_WORKER_URL}/members/${webflowMemberId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!getMemberResponse.ok) {
                    const errorData = await getMemberResponse.json().catch(() => ({}));
                    throw new Error(`Fehler beim Laden des Webflow Members (${getMemberResponse.status}): ${JSON.stringify(errorData)}`);
                }
                
                const memberData = await getMemberResponse.json();
                Logger.debug('Member Daten erhalten', memberData);
                
                // Verschiedene mögliche Strukturen der Webflow API prüfen
                let currentPostedJobs = [];
                
                if (memberData.fieldData && memberData.fieldData['posted-jobs']) {
                    currentPostedJobs = memberData.fieldData['posted-jobs'];
                } else if (memberData.fields && memberData.fields['posted-jobs']) {
                    currentPostedJobs = memberData.fields['posted-jobs'];
                } else if (memberData['posted-jobs']) {
                    currentPostedJobs = memberData['posted-jobs'];
                }
                
                // Sicherstellen, dass es ein Array ist
                if (!Array.isArray(currentPostedJobs)) {
                    currentPostedJobs = currentPostedJobs ? [currentPostedJobs] : [];
                }
                
                Logger.debug('Aktuelle posted-jobs vor Update', currentPostedJobs);
                
                // 2. Neue Job-ID hinzufügen (falls nicht schon vorhanden)
                if (!currentPostedJobs.includes(newWebflowJobId)) {
                    currentPostedJobs.push(newWebflowJobId);
                    
                    // 3. Member aktualisieren
                    const updatePayload = {
                        fields: {
                            'posted-jobs': currentPostedJobs
                        }
                    };
                    
                    Logger.debug('Update Payload', updatePayload);
                    
                    const updateMemberResponse = await fetch(`${CONFIG.WEBFLOW_CMS_POST_WORKER_URL}/members/${webflowMemberId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updatePayload)
                    });
                    
                    if (!updateMemberResponse.ok) {
                        const errorData = await updateMemberResponse.json().catch(() => ({}));
                        throw new Error(`Webflow Member Update Fehler (${updateMemberResponse.status}): ${JSON.stringify(errorData.error || errorData.errors || errorData)}`);
                    }
                    
                    const updateResponseData = await updateMemberResponse.json();
                    Logger.info(`Webflow Member ${webflowMemberId} erfolgreich aktualisiert - Job hinzugefügt`, {
                        jobId: newWebflowJobId,
                        totalJobs: currentPostedJobs.length
                    });
                    
                    return updateResponseData;
                } else {
                    Logger.info(`Job ${newWebflowJobId} ist bereits in posted-jobs vorhanden`);
                    return { alreadyExists: true };
                }
            });
        });
    }

    async function deductMemberstackCredit(memberstackId) {
        if (!memberstackId) {
            Logger.warn('Keine Memberstack ID für Credit-Abzug vorhanden.');
            return false;
        }
        
        Logger.info(`Versuche Credit für Memberstack ID ${memberstackId} abzuziehen`);
        
        try {
            const response = await retryOperationWithBackoff(async () => {
                const creditResponse = await fetch(CONFIG.MEMBERSTACK_CREDIT_WORKER_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        memberId: memberstackId,
                        requestId: Logger.requestId
                    })
                });
                
                if (!creditResponse.ok) {
                    const errorData = await creditResponse.json().catch(() => ({}));
                    throw new Error(`Credit-Abzug fehlgeschlagen (${creditResponse.status}): ${errorData.error || 'Unbekannter Fehler'}`);
                }
                
                return creditResponse;
            });
            
            const creditData = await response.json();
            Logger.info('Credit-Abzug erfolgreich', {
                oldCredits: creditData.oldCredits,
                newCredits: creditData.newCredits
            });
            return true;
        } catch (error) {
            Logger.error('Fehler beim Credit-Abzug', error);
            return false;
        }
    }

    // === MAIN FORM SUBMISSION HANDLER ===
    async function handleFormSubmit(event, testData = null) {
        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
        
        // Generate unique request ID
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        Logger.init(requestId);
        Logger.info('=== FORM SUBMISSION STARTED ===');
        
        const form = find(`#${CONFIG.MAIN_FORM_ID}`);
        const submitButton = form ? form.querySelector('button[type="submit"], input[type="submit"]') : null;
        const initialSubmitButtonText = submitButton ? (submitButton.tagName === 'BUTTON' ? submitButton.textContent : submitButton.value) : 'Absenden';

        // Disable submit button
        if (submitButton) {
            submitButton.disabled = true;
            const sendingText = 'Wird gesendet...';
            if (submitButton.tagName === 'BUTTON') submitButton.textContent = sendingText;
            else submitButton.value = sendingText;
        }

        // Initialize transaction
        const transaction = TransactionManager.create(requestId);
        let rawFormData = null;

        try {
            showCustomPopup('Deine Eingaben werden vorbereitet...', 'loading', 'Einen Moment bitte...');

            // Step 1: Collect and validate form data
            rawFormData = testData ? testData : collectAndFormatFormData(form);
            transaction.formData = rawFormData;

            if (!rawFormData['projectName'] && !rawFormData['job-title']) {
                throw new Error('VALIDATION_ERROR: Bitte geben Sie einen Job-Titel an.');
            }

            const webflowMemberIdOfTheSubmitter = rawFormData['webflowId'];
            if (!webflowMemberIdOfTheSubmitter) {
                throw new Error('VALIDATION_ERROR: Ihre Benutzerdaten konnten nicht korrekt zugeordnet werden.');
            }

            showCustomPopup('Dein Benutzerkonto wird überprüft...', 'loading', 'Benutzerprüfung');

            // Step 2: Verify member exists
            let airtableMemberRecordId = null;
            try {
                const memberSearchResponse = await retryOperationWithBackoff(async () => {
                    const response = await fetch(CONFIG.AIRTABLE_WORKER_URL + 'search-member', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            webflowMemberId: webflowMemberIdOfTheSubmitter
                        })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.error || 'Member search failed');
                    }
                    
                    return response;
                });
                
                const memberSearchData = await memberSearchResponse.json();
                if (!memberSearchData.memberRecordId) {
                    throw new Error('Mitglied nicht gefunden.');
                }
                
                airtableMemberRecordId = memberSearchData.memberRecordId;
                TransactionManager.update(requestId, { memberRecordId: airtableMemberRecordId });
                Logger.info('Mitglied gefunden', { airtableMemberRecordId });
            } catch (error) {
                throw new Error(`MEMBER_SEARCH_ERROR: ${error.message}`);
            }

            showCustomPopup('Deine Job-Details werden gespeichert...', 'loading', 'Speichervorgang');

            // Step 3: Prepare Airtable data
            const airtableJobDetails = {};
            for (const keyInRawForm in rawFormData) {
                if (rawFormData.hasOwnProperty(keyInRawForm)) {
                    const airtableKey = AIRTABLE_FIELD_MAPPINGS[keyInRawForm] || keyInRawForm;
                    airtableJobDetails[airtableKey] = rawFormData[keyInRawForm];
                }
            }
            airtableJobDetails['job-posted-by'] = [airtableMemberRecordId];

            // Set admin-test explicitly
            const adminTestAirtableKey = AIRTABLE_FIELD_MAPPINGS['admin-test'] || 'admin-test';
            airtableJobDetails[adminTestAirtableKey] = rawFormData['admin-test'] === true;

            // Step 4: Create Airtable record
            const airtableResult = await createAirtableRecord(airtableJobDetails);
            TransactionManager.update(requestId, { airtableRecordId: airtableResult.recordId });

            showCustomPopup('Job-Details gespeichert. Dein Job wird jetzt veröffentlicht...', 'loading', 'Veröffentlichung');

            // Step 5: Prepare Webflow data
            const webflowFieldData = {};
            webflowFieldData['name'] = rawFormData['job-title'] || rawFormData['projectName'] || 'Unbenannter Job';
            webflowFieldData['slug'] = transaction.state.airtableRecordId;

            // Set job posted by field
            const jobPostedBySlug = WEBFLOW_FIELD_SLUG_MAPPINGS['webflowId'];
            if (jobPostedBySlug && webflowMemberIdOfTheSubmitter) {
                webflowFieldData[jobPostedBySlug] = webflowMemberIdOfTheSubmitter;
            }

            // Map all form fields to Webflow (gleiche Logik wie vorher)
            for (const formDataKey in WEBFLOW_FIELD_SLUG_MAPPINGS) {
                const webflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS[formDataKey];
                if (!webflowSlug || ['name', 'slug', 'webflowId', 'airtableJobIdForWebflow'].includes(formDataKey)) {
                    continue;
                }

                let formValue = rawFormData[formDataKey];

                if (formDataKey === 'webflowIdForTextField' && webflowSlug === 'webflow-member-id') {
                    if (rawFormData['webflowId']) webflowFieldData[webflowSlug] = rawFormData['webflowId'];
                    continue;
                }

                if (formDataKey === 'jobImageUpload' && webflowSlug === 'job-image') {
                    if (rawFormData[formDataKey]) {
                        webflowFieldData[webflowSlug] = rawFormData[formDataKey];
                    }
                    continue;
                }

                if (formValue === undefined || formValue === null || (typeof formValue === 'string' && formValue.trim() === '')) {
                    if (typeof formValue === 'boolean') webflowFieldData[webflowSlug] = formValue;
                    else if (webflowSlug === 'job-payment' && rawFormData['budget'] === 0) webflowFieldData[webflowSlug] = 0;
                    else if (formDataKey !== 'admin-test') continue;
                }

                // Handle multi-select fields
                if ((formDataKey === 'creatorLand' || formDataKey === 'creatorLang' || formDataKey === 'channels' || formDataKey === 'nutzungOptional') && Array.isArray(formValue)) {
                    if (formValue.length > 0) webflowFieldData[webflowSlug] = formValue.join(', ');
                    continue;
                }

                // Handle creator follower mapping
                if (formDataKey === 'creatorCountOptional' && webflowSlug === 'creator-follower') {
                    const followerValueString = rawFormData['creatorCountOptional'];
                    if (followerValueString && REFERENCE_MAPPINGS['creatorFollower']?.[followerValueString]) {
                        webflowFieldData[webflowSlug] = REFERENCE_MAPPINGS['creatorFollower'][followerValueString];
                    } else if (followerValueString) {
                        Logger.warn(`Webflow: Kein Mapping für creatorFollower: '${followerValueString}'`);
                    }
                    continue;
                }

                // Handle reference mappings
                if (REFERENCE_MAPPINGS[formDataKey]?.[formValue] && !Array.isArray(formValue)) {
                    const mappedId = REFERENCE_MAPPINGS[formDataKey][formValue];
                    if (mappedId && !mappedId.startsWith('BITTE_WEBFLOW_ITEM_ID_') && !mappedId.startsWith('webflow_item_id_')) {
                        webflowFieldData[webflowSlug] = mappedId;
                    } else {
                        webflowFieldData[webflowSlug] = formValue;
                    }
                } else if (['startDate', 'endDate', 'jobOnline'].includes(formDataKey)) {
                    if (formValue) webflowFieldData[webflowSlug] = formValue;
                } else if (typeof formValue === 'boolean' || typeof formValue === 'number') {
                    webflowFieldData[webflowSlug] = formValue;
                } else if (formValue !== undefined && formValue !== null && String(formValue).trim() !== '') {
                    webflowFieldData[webflowSlug] = String(formValue);
                }
            }

            // Set admin-test explicitly for Webflow
            const adminTestWebflowSlug = WEBFLOW_FIELD_SLUG_MAPPINGS['admin-test'];
            if (adminTestWebflowSlug) {
                webflowFieldData[adminTestWebflowSlug] = rawFormData['admin-test'] === true;
            }

            // Step 6: Create Webflow item
            const webflowResult = await createWebflowItem(webflowFieldData);
            TransactionManager.update(requestId, { webflowItemId: webflowResult.itemId });

            showCustomPopup('Letzte Anpassungen werden vorgenommen...', 'loading', 'Abschluss');

            // Step 7: Update Webflow item with its own ID (if mapping exists)
            const jobSlugInWebflowToUpdate = WEBFLOW_FIELD_SLUG_MAPPINGS['airtableJobIdForWebflow'];
            if (jobSlugInWebflowToUpdate) {
                await updateWebflowItem(transaction.state.webflowItemId, {
                    [jobSlugInWebflowToUpdate]: transaction.state.webflowItemId
                });
            }

            showCustomPopup('Die Veröffentlichung wird abgeschlossen...', 'loading', 'Finalisierung');

            // Step 8: Update Airtable with Webflow ID
            await updateAirtableRecord(
                transaction.state.airtableRecordId, 
                transaction.state.webflowItemId
            );

            // Step 9: Update member's posted-jobs field in Webflow
            showCustomPopup('Verknüpfung mit deinem Profil wird erstellt...', 'loading', 'Profil-Update');
            try {
                await updateWebflowMemberPostedJobs(
                    webflowMemberIdOfTheSubmitter, 
                    transaction.state.webflowItemId
                );
                TransactionManager.update(requestId, { memberUpdated: true });
                Logger.info('Webflow Member posted-jobs Feld erfolgreich aktualisiert.');
            } catch (memberUpdateError) {
                Logger.error('Fehler beim Aktualisieren der Webflow Member posted-jobs', memberUpdateError);
                // Non-critical, continue
            }

            // Step 10: CRITICAL - Verify all updates
            showCustomPopup('Überprüfung der Veröffentlichung...', 'loading', 'Verifizierung');
            
            const verificationPassed = await VerificationService.verifyAllUpdates(
                transaction.state,
                webflowMemberIdOfTheSubmitter
            );
            
            if (!verificationPassed) {
                throw new Error('VERIFICATION_FAILED: Die Job-Daten wurden nicht korrekt gespeichert. Bitte kontaktieren Sie den Support.');
            }
            
            TransactionManager.update(requestId, { verificationPassed: true });

            // Step 11: Deduct credit (non-critical - don't fail if this fails)
            const memberstackId = rawFormData['memberstackId'];
            if (memberstackId) {
                const creditDeducted = await deductMemberstackCredit(memberstackId);
                TransactionManager.update(requestId, { creditDeducted });
            }

            // Success!
            TransactionManager.update(requestId, { completed: true });
            
            // Send success notification email
            await EmailService.sendSuccessNotification(rawFormData, transaction.state);
            
            showCustomPopup('Dein Job wurde erfolgreich veröffentlicht!', 'success', 'Fertig!');
            
            if (submitButton) {
                const finalSuccessText = 'Erfolgreich gesendet!';
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = finalSuccessText;
                else submitButton.value = finalSuccessText;
            }
            
            Logger.info('=== FORM SUBMISSION COMPLETED SUCCESSFULLY ===', transaction.state);

        } catch (error) {
            Logger.error('Fehler im Hauptprozess', error);
            
            // Send error notification email
            await EmailService.sendErrorNotification(error, rawFormData, transaction.state);
            
            // Handle validation errors differently
            if (error.message.startsWith('VALIDATION_ERROR:')) {
                const userMessage = error.message.replace('VALIDATION_ERROR: ', '');
                showCustomPopup(userMessage, 'error', 'Fehlende Eingabe', `Frontend Validation Error: ${error.message}`);
            } else if (error.message.startsWith('MEMBER_SEARCH_ERROR:')) {
                const userMessage = error.message.replace('MEMBER_SEARCH_ERROR: ', '');
                showCustomPopup("Dein Benutzerkonto konnte nicht überprüft werden. Bitte lade die Seite neu oder kontaktiere den Support.", 'error', 'Fehler bei der Benutzerprüfung', `Member Search Error: ${userMessage}`);
            } else if (error.message.includes('VERIFICATION_FAILED')) {
                showCustomPopup(
                    "Die Veröffentlichung konnte nicht vollständig abgeschlossen werden. Unser Support-Team wurde informiert und wird sich darum kümmern.", 
                    'error', 
                    'Verifikationsfehler',
                    `RequestID: ${requestId} - ${error.message}`
                );
            } else {
                // Handle other errors
                const technicalSupportDetails = `RequestID: ${requestId}\nFehler: ${error.message}\nStack: ${error.stack}\nTransactionState: ${JSON.stringify(transaction.state)}`;
                const friendlyInfo = getFriendlyErrorFieldInfo(error.message);
                
                let userDisplayMessage;
                if (friendlyInfo.area) {
                    userDisplayMessage = `Es tut uns leid, ein Fehler ist aufgetreten.`;
                    if (friendlyInfo.field) {
                        userDisplayMessage += ` Möglicherweise betrifft es das Feld "${friendlyInfo.field}".`;
                    }
                    userDisplayMessage += " Bitte überprüfen Sie Ihre Eingaben oder kontaktieren Sie den Support, falls der Fehler weiterhin besteht.";
                } else {
                    userDisplayMessage = "Es tut uns leid, leider ist ein unerwarteter Fehler bei der Verarbeitung Ihrer Anfrage aufgetreten. Unser Support-Team wurde informiert. Bitte kontaktieren Sie uns für weitere Hilfe.";
                }
                
                showCustomPopup(userDisplayMessage, 'error', friendlyInfo.title, technicalSupportDetails);
            }

            // Rollback: Clean up created records if transaction failed
            if (!transaction.state.completed && !transaction.state.verificationPassed && transaction.state.airtableRecordId) {
                Logger.info('Starte Rollback-Prozess...');
                await deleteAirtableRecord(transaction.state.airtableRecordId, `Fehler im Prozess: ${error.message}`);
            }

            // Reset submit button
            if (submitButton) {
                submitButton.disabled = false;
                if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                else submitButton.value = initialSubmitButtonText;
            }
        } finally {
            // Cleanup
            await TransactionManager.cleanup(requestId);
            
            // Final cleanup of submit button state
            if (submitButton && submitButton.disabled) {
                const currentButtonText = submitButton.tagName === 'BUTTON' ? submitButton.textContent : submitButton.value;
                if (currentButtonText === 'Wird gesendet...') {
                    if (submitButton.tagName === 'BUTTON') submitButton.textContent = initialSubmitButtonText;
                    else submitButton.value = initialSubmitButtonText;
                    submitButton.disabled = false;
                }
            }
        }
    }

    // Test function
    function testSubmissionWithData(testData) {
        Logger.init(`test_${Date.now()}`);
        Logger.info('Starte Test-Übermittlung mit Daten', testData);
        const mainForm = find(`#${CONFIG.MAIN_FORM_ID}`);
        if (!mainForm) {
            showCustomPopup(`Test-Übermittlung: Hauptformular "${CONFIG.MAIN_FORM_ID}" nicht gefunden.`, 'error', 'Test Fehler');
            return;
        }
        handleFormSubmit({
            preventDefault: () => {},
            target: mainForm
        }, testData);
    }
    window.testSubmissionWithData = testSubmissionWithData;

    // Debug function to get recent logs
    window.getJobSubmissionLogs = function() {
        return Logger.getRecentLogs();
    };

    // Form wrapper function
    function handleFormSubmitWrapper(event) {
        handleFormSubmit(event, null);
    }

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize close button
        const closeBtn = find(CLOSE_POPUP_ATTR);
        if (closeBtn) {
            closeBtn.addEventListener('click', closeCustomPopup);
        }
        
        // Initialize form handler
        const mainForm = find(`#${CONFIG.MAIN_FORM_ID}`);
        if (mainForm) {
            const submitButton = mainForm.querySelector('button[type="submit"], input[type="submit"]');
            if (submitButton) {
                mainForm.setAttribute('data-initial-text', submitButton.tagName === 'BUTTON' ? submitButton.textContent : submitButton.value);
            }
            mainForm.removeEventListener('submit', handleFormSubmitWrapper);
            mainForm.addEventListener('submit', handleFormSubmitWrapper);
            
            console.log(`Form Submission Handler v22.0 initialisiert für: #${CONFIG.MAIN_FORM_ID}`);
            console.log('Production Logging ist:', CONFIG.PRODUCTION_LOGGING ? 'AKTIV' : 'INAKTIV');
            console.log('Email Notifications sind:', CONFIG.SEND_ERROR_EMAILS ? 'AKTIV' : 'INAKTIV');
            
            if (!CONFIG.EMAILJS.SERVICE_ID || CONFIG.EMAILJS.SERVICE_ID === 'YOUR_SERVICE_ID') {
                console.warn('⚠️ WARNUNG: EmailJS ist noch nicht konfiguriert! Bitte CONFIG.EMAILJS Einstellungen ergänzen.');
            }
        } else {
            console.warn(`Hauptformular "${CONFIG.MAIN_FORM_ID}" nicht gefunden. Handler nicht aktiv.`);
        }
    });

})();
