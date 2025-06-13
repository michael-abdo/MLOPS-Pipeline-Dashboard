/**
 * Browser Console Monitor
 * Inject this script directly into browser console for real-time monitoring
 * Run this in Chrome DevTools Console while testing upload manually
 */

(function() {
    console.log('🔍 FRONTEND VISIBILITY MONITOR ACTIVATED');
    console.log('=' .repeat(50));
    
    // Store original console methods
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Enhanced logging with timestamps
    function timestampLog(level, ...args) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const levelIcon = {
            'log': '📝',
            'error': '❌', 
            'warn': '⚠️'
        }[level] || '📝';
        originalLog(`[${timestamp}] ${levelIcon}`, ...args);
    }
    
    console.log = (...args) => timestampLog('log', ...args);
    console.error = (...args) => timestampLog('error', ...args);
    console.warn = (...args) => timestampLog('warn', ...args);
    
    // Elements to monitor
    const MONITORED_ELEMENTS = {
        uploadArea: '.upload-area',
        uploadIcon: '.upload-area .upload-icon',
        uploadTitle: '.upload-area h3', 
        uploadInstructions: '.upload-area p',
        fileInput: '#fileInput',
        trainButton: '#trainButton',
        connectionStatus: '#connectionStatus',
        liveAccuracy: '#liveAccuracy',
        livePredictions: '#livePredictions',
        systemHealth: '#systemHealth',
        modelAccuracy: '#modelAccuracy',
        predictionCount: '#predictionCount',
        responseTime: '#responseTime',
        activityFeed: '#activityFeed'
    };
    
    // State tracking
    let elementStates = {};
    let changeLog = [];
    
    // Capture element state
    function captureElementState(name, selector) {
        const element = document.querySelector(selector);
        if (!element) return { exists: false, selector };
        
        return {
            exists: true,
            selector,
            tagName: element.tagName,
            textContent: element.textContent?.trim(),
            innerHTML: element.innerHTML?.substring(0, 100),
            value: element.value || null,
            disabled: element.disabled || false,
            className: element.className,
            display: window.getComputedStyle(element).display,
            visibility: window.getComputedStyle(element).visibility,
            id: element.id,
            role: element.getAttribute('role'),
            ariaLabel: element.getAttribute('aria-label')
        };
    }
    
    // Monitor all elements
    function monitorAllElements(label = 'monitor') {
        console.log(`\n📸 Monitoring Elements: ${label}`);
        
        Object.entries(MONITORED_ELEMENTS).forEach(([name, selector]) => {
            const currentState = captureElementState(name, selector);
            const previousState = elementStates[name];
            
            if (previousState && currentState.exists && previousState.exists) {
                // Check for changes
                const changes = [];
                if (previousState.textContent !== currentState.textContent) {
                    changes.push(`text: "${previousState.textContent}" → "${currentState.textContent}"`);
                }
                if (previousState.disabled !== currentState.disabled) {
                    changes.push(`disabled: ${previousState.disabled} → ${currentState.disabled}`);
                }
                if (previousState.value !== currentState.value) {
                    changes.push(`value: "${previousState.value}" → "${currentState.value}"`);
                }
                if (previousState.className !== currentState.className) {
                    changes.push(`class: "${previousState.className}" → "${currentState.className}"`);
                }
                if (previousState.innerHTML !== currentState.innerHTML) {
                    changes.push(`html: changed`);
                }
                
                if (changes.length > 0) {
                    console.log(`🔄 ${name.toUpperCase()} CHANGED:`);
                    changes.forEach(change => console.log(`   ${change}`));
                    
                    changeLog.push({
                        timestamp: Date.now(),
                        element: name,
                        changes,
                        state: currentState
                    });
                }
            } else if (!currentState.exists) {
                console.warn(`❌ ${name} NOT FOUND (${selector})`);
            } else if (!previousState) {
                console.log(`✅ ${name} initial state captured`);
            }
            
            elementStates[name] = currentState;
        });
    }
    
    // Monitor API calls
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0];
        console.log(`🌐 API CALL: ${url}`);
        
        return originalFetch.apply(this, args)
            .then(response => {
                console.log(`📡 API RESPONSE: ${response.status} ${url}`);
                if (url.includes('/upload')) {
                    response.clone().json().then(data => {
                        console.log('📤 UPLOAD RESPONSE:', data);
                    }).catch(err => {
                        console.error('📤 UPLOAD RESPONSE ERROR:', err);
                    });
                }
                return response;
            })
            .catch(error => {
                console.error(`📡 API ERROR: ${url}`, error);
                throw error;
            });
    };
    
    // Monitor file input changes
    function setupFileInputMonitor() {
        const fileInput = document.querySelector('#fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                console.log('📁 FILE INPUT CHANGED:', {
                    files: e.target.files.length,
                    fileName: e.target.files[0]?.name,
                    fileSize: e.target.files[0]?.size
                });
                setTimeout(() => monitorAllElements('AFTER_FILE_CHANGE'), 100);
                setTimeout(() => monitorAllElements('AFTER_FILE_CHANGE_1S'), 1000);
                setTimeout(() => monitorAllElements('AFTER_FILE_CHANGE_3S'), 3000);
            });
            console.log('✅ File input monitor setup');
        } else {
            console.warn('❌ File input not found for monitoring');
        }
    }
    
    // Monitor upload area clicks
    function setupUploadAreaMonitor() {
        const uploadArea = document.querySelector('.upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('click', function(e) {
                console.log('🖱️ UPLOAD AREA CLICKED:', {
                    target: e.target.tagName,
                    className: e.target.className
                });
                setTimeout(() => monitorAllElements('AFTER_UPLOAD_CLICK'), 100);
            });
            console.log('✅ Upload area monitor setup');
        } else {
            console.warn('❌ Upload area not found for monitoring');
        }
    }
    
    // Monitor WebSocket messages
    function setupWebSocketMonitor() {
        // Try to access the WebSocket manager
        if (window.wsManager) {
            console.log('✅ WebSocket manager found');
            // Add message listener if possible
        } else {
            console.warn('❌ WebSocket manager not found');
        }
    }
    
    // Global error monitoring
    window.addEventListener('error', function(e) {
        console.error('🚨 JAVASCRIPT ERROR:', {
            message: e.message,
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno,
            error: e.error
        });
    });
    
    // Unhandled promise rejection monitoring
    window.addEventListener('unhandledrejection', function(e) {
        console.error('🚨 UNHANDLED PROMISE REJECTION:', e.reason);
    });
    
    // Initialize monitoring
    function initializeMonitoring() {
        console.log('🚀 Initializing comprehensive monitoring...');
        
        // Capture initial state
        monitorAllElements('INITIAL_STATE');
        
        // Setup event monitors
        setupFileInputMonitor();
        setupUploadAreaMonitor();
        setupWebSocketMonitor();
        
        // Periodic monitoring
        setInterval(() => {
            monitorAllElements('PERIODIC_CHECK');
        }, 5000);
        
        console.log('✅ Monitoring initialized');
        console.log('📋 Use window.monitorReport() to get full report');
        console.log('📋 Use window.testUpload() to test file upload');
    }
    
    // Expose utility functions globally
    window.monitorReport = function() {
        console.log('📊 MONITORING REPORT:');
        console.log('Total changes detected:', changeLog.length);
        console.log('Change log:', changeLog);
        console.log('Current element states:', elementStates);
        return { changeLog, elementStates };
    };
    
    window.testUpload = function() {
        console.log('🧪 Testing upload manually...');
        const fileInput = document.querySelector('#fileInput');
        if (fileInput) {
            fileInput.click();
            console.log('✅ File input clicked - select a file');
        } else {
            console.error('❌ File input not found');
        }
    };
    
    window.captureState = function(label) {
        monitorAllElements(label || 'MANUAL_CAPTURE');
    };
    
    // Check if Dashboard and API are loaded
    setTimeout(() => {
        console.log('🔧 Checking JavaScript context...');
        console.log('Dashboard loaded:', typeof Dashboard !== 'undefined');
        console.log('API loaded:', typeof API !== 'undefined');
        console.log('CONFIG loaded:', typeof CONFIG !== 'undefined');
        console.log('errorHandler loaded:', typeof errorHandler !== 'undefined');
        console.log('Window API:', window.API !== undefined);
        
        if (typeof Dashboard === 'undefined') {
            console.warn('❌ Dashboard class not loaded - this could be the issue!');
        }
        if (typeof API === 'undefined') {
            console.warn('❌ API class not loaded - this could be the issue!');
        }
        
        initializeMonitoring();
    }, 1000);
    
    console.log('🎯 MONITOR READY - Try uploading a file now!');
    console.log('Use browser DevTools Network tab to see API calls');
    console.log('All element changes will be logged here');
    
})();