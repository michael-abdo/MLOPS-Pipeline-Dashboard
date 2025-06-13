/**
 * Frontend Visibility Monitor
 * Comprehensive tracking of ALL frontend elements and their states
 * Provides complete observability into what's happening (or not happening) during upload
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

class FrontendMonitor {
    constructor() {
        this.browser = null;
        this.page = null;
        this.monitoringData = {
            elements: {},
            changes: [],
            errors: [],
            timeline: []
        };
    }

    async initialize() {
        console.log('🔍 Initializing Frontend Visibility Monitor...\n');
        
        this.browser = await puppeteer.launch({
            headless: false,  // Keep visible for debugging
            devtools: true,   // Open DevTools
            slowMo: 100
        });
        
        this.page = await this.browser.newPage();
        
        // Capture console messages
        this.page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            this.logEvent('console', { type, text });
            console.log(`[CONSOLE ${type.toUpperCase()}]`, text);
        });
        
        // Capture JavaScript errors
        this.page.on('pageerror', err => {
            this.logEvent('error', { message: err.message, stack: err.stack });
            console.error('[PAGE ERROR]', err.message);
        });
        
        // Capture network requests
        this.page.on('request', request => {
            if (request.url().includes('/api/')) {
                this.logEvent('request', { 
                    url: request.url(), 
                    method: request.method(),
                    timestamp: Date.now()
                });
                console.log(`[REQUEST] ${request.method()} ${request.url()}`);
            }
        });
        
        this.page.on('response', response => {
            if (response.url().includes('/api/')) {
                this.logEvent('response', { 
                    url: response.url(), 
                    status: response.status(),
                    timestamp: Date.now()
                });
                console.log(`[RESPONSE] ${response.status()} ${response.url()}`);
            }
        });
        
        await this.page.goto('http://localhost:8000');
        await this.page.waitForTimeout(2000);
    }

    /**
     * Define all elements we want to monitor
     */
    getElementsToMonitor() {
        return {
            // Upload Flow Elements
            uploadArea: '.upload-area',
            uploadIcon: '.upload-area .upload-icon',
            uploadTitle: '.upload-area h3',
            uploadInstructions: '.upload-area p',
            fileInput: '#fileInput',
            trainButton: '#trainButton',
            
            // Connection Status
            connectionStatus: '#connectionStatus',
            srAnnouncer: '#sr-announcer',
            
            // Live System Status
            liveAccuracy: '#liveAccuracy',
            livePredictions: '#livePredictions',
            systemHealth: '#systemHealth',
            
            // Progress Bars
            mainProgressBar: '#mainProgressBar',
            cpuProgressBar: '#cpuProgressBar',
            memoryProgressBar: '#memoryProgressBar',
            diskProgressBar: '#diskProgressBar',
            
            // System Metrics
            cpuPercent: '#cpuPercent',
            memoryPercent: '#memoryPercent',
            diskPercent: '#diskPercent',
            
            // Model Performance
            modelAccuracy: '#modelAccuracy',
            predictionCount: '#predictionCount',
            responseTime: '#responseTime',
            
            // Buttons
            useModelButton: '#useModelButton',
            viewDetailsButton: '#viewDetailsButton',
            advancedToggle: '#advancedToggle',
            
            // Activity Feed
            activityFeed: '#activityFeed',
            
            // Navigation
            mainNav: '#main-nav',
            
            // Training Details (if visible)
            detailedTrainingCard: '#detailedTrainingCard',
            trainingStage: '#trainingStage',
            trainingPercent: '#trainingPercent',
            
            // Advanced Options
            modelTypeSelect: '#modelTypeSelect'
        };
    }

    /**
     * Capture current state of all monitored elements
     */
    async captureElementStates(label = 'capture') {
        console.log(`\n📸 Capturing element states: ${label}`);
        
        const elements = this.getElementsToMonitor();
        const states = {};
        const timestamp = Date.now();
        
        for (const [name, selector] of Object.entries(elements)) {
            try {
                const elementState = await this.page.evaluate((sel) => {
                    const element = document.querySelector(sel);
                    if (!element) return { exists: false };
                    
                    return {
                        exists: true,
                        tagName: element.tagName,
                        textContent: element.textContent?.trim(),
                        innerHTML: element.innerHTML?.substring(0, 200), // Truncate for readability
                        value: element.value || null,
                        disabled: element.disabled || false,
                        className: element.className,
                        style: {
                            display: window.getComputedStyle(element).display,
                            visibility: window.getComputedStyle(element).visibility,
                            width: window.getComputedStyle(element).width,
                            height: window.getComputedStyle(element).height
                        },
                        attributes: {
                            id: element.id,
                            role: element.getAttribute('role'),
                            ariaLabel: element.getAttribute('aria-label'),
                            ariaLive: element.getAttribute('aria-live')
                        },
                        boundingRect: element.getBoundingClientRect()
                    };
                }, selector);
                
                states[name] = elementState;
                
                // Log significant changes
                if (this.monitoringData.elements[name]) {
                    const prev = this.monitoringData.elements[name];
                    const curr = elementState;
                    
                    if (prev.textContent !== curr.textContent ||
                        prev.disabled !== curr.disabled ||
                        prev.innerHTML !== curr.innerHTML ||
                        prev.value !== curr.value) {
                        
                        console.log(`🔄 [${name}] CHANGED:`);
                        console.log(`   Text: "${prev.textContent}" → "${curr.textContent}"`);
                        console.log(`   Disabled: ${prev.disabled} → ${curr.disabled}`);
                        console.log(`   Value: "${prev.value}" → "${curr.value}"`);
                        
                        this.logEvent('element_change', {
                            element: name,
                            selector,
                            previous: { textContent: prev.textContent, disabled: prev.disabled, value: prev.value },
                            current: { textContent: curr.textContent, disabled: curr.disabled, value: curr.value },
                            timestamp
                        });
                    }
                }
                
            } catch (error) {
                states[name] = { error: error.message };
                console.error(`❌ Error capturing ${name}:`, error.message);
            }
        }
        
        this.monitoringData.elements = states;
        this.logEvent('capture', { label, timestamp, elementCount: Object.keys(states).length });
        
        return states;
    }

    /**
     * Log events with timestamp
     */
    logEvent(type, data) {
        const event = {
            timestamp: Date.now(),
            type,
            data
        };
        this.monitoringData.timeline.push(event);
    }

    /**
     * Monitor upload process with detailed tracking
     */
    async monitorUploadProcess(filePath) {
        console.log('\n🚀 Starting Upload Process Monitoring...\n');
        console.log('=' .repeat(60));
        
        // Capture initial state
        await this.captureElementStates('INITIAL_STATE');
        
        // Wait a moment and capture again to see any dynamic loading
        await this.page.waitForTimeout(1000);
        await this.captureElementStates('AFTER_LOAD');
        
        console.log('\n📤 Initiating File Upload...');
        
        // Upload file and monitor every step
        const fileInput = await this.page.$('#fileInput');
        if (!fileInput) {
            console.error('❌ File input not found!');
            return;
        }
        
        await this.captureElementStates('BEFORE_FILE_SELECT');
        
        // Upload the file
        await fileInput.uploadFile(filePath);
        console.log('✅ File selected via input element');
        
        await this.captureElementStates('AFTER_FILE_SELECT');
        
        // Monitor for changes over time
        const monitoringIntervals = [100, 500, 1000, 2000, 3000, 5000, 10000];
        
        for (const interval of monitoringIntervals) {
            await this.page.waitForTimeout(interval);
            await this.captureElementStates(`AFTER_${interval}MS`);
        }
        
        console.log('\n📊 Upload Process Monitoring Complete');
        console.log('=' .repeat(60));
    }

    /**
     * Test manual click interaction
     */
    async testManualUploadClick(filePath) {
        console.log('\n🖱️ Testing Manual Upload Click...\n');
        
        await this.captureElementStates('BEFORE_CLICK');
        
        // Try to click the upload area
        try {
            await this.page.click('.upload-area');
            console.log('✅ Clicked upload area');
            await this.captureElementStates('AFTER_UPLOAD_AREA_CLICK');
            
            // Wait for file dialog and upload
            await this.page.waitForTimeout(100);
            const fileInput = await this.page.$('#fileInput');
            if (fileInput) {
                await fileInput.uploadFile(filePath);
                console.log('✅ File uploaded via click interaction');
                await this.captureElementStates('AFTER_CLICK_UPLOAD');
                
                // Monitor for several seconds
                for (let i = 1; i <= 10; i++) {
                    await this.page.waitForTimeout(1000);
                    await this.captureElementStates(`CLICK_MONITOR_${i}S`);
                }
            }
        } catch (error) {
            console.error('❌ Error during click test:', error.message);
        }
    }

    /**
     * Test JavaScript execution context
     */
    async testJavaScriptContext() {
        console.log('\n🔧 Testing JavaScript Context...\n');
        
        const jsTest = await this.page.evaluate(() => {
            const results = {
                dashboardLoaded: typeof Dashboard !== 'undefined',
                apiLoaded: typeof API !== 'undefined',
                configLoaded: typeof CONFIG !== 'undefined',
                errorHandlerLoaded: typeof errorHandler !== 'undefined',
                windowAPI: window.API !== undefined,
                moduleSupport: 'noModule' in HTMLScriptElement.prototype,
                errors: []
            };
            
            // Test if upload area has event listeners
            const uploadArea = document.querySelector('.upload-area');
            if (uploadArea) {
                results.uploadAreaExists = true;
                results.uploadAreaEvents = getEventListeners ? Object.keys(getEventListeners(uploadArea)) : 'unknown';
            }
            
            // Test if file input has event listeners
            const fileInput = document.querySelector('#fileInput');
            if (fileInput) {
                results.fileInputExists = true;
                results.fileInputEvents = getEventListeners ? Object.keys(getEventListeners(fileInput)) : 'unknown';
            }
            
            return results;
        });
        
        console.log('JavaScript Context Results:');
        Object.entries(jsTest).forEach(([key, value]) => {
            console.log(`  ${key}: ${JSON.stringify(value)}`);
        });
        
        this.logEvent('js_context', jsTest);
        return jsTest;
    }

    /**
     * Generate comprehensive report
     */
    generateReport() {
        const reportPath = path.join(__dirname, `frontend-monitor-report-${Date.now()}.json`);
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalEvents: this.monitoringData.timeline.length,
                elementStates: Object.keys(this.monitoringData.elements).length,
                errors: this.monitoringData.errors.length
            },
            monitoringData: this.monitoringData
        };
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📋 Report saved to: ${reportPath}`);
        
        return report;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

/**
 * Main monitoring function
 */
async function runFrontendMonitoring() {
    const monitor = new FrontendMonitor();
    const testFilePath = path.join(__dirname, '../uploads/simple_test_data.csv');
    
    try {
        await monitor.initialize();
        
        // Test JavaScript context first
        await monitor.testJavaScriptContext();
        
        // Monitor programmatic upload (like automation tests)
        await monitor.monitorUploadProcess(testFilePath);
        
        // Test manual click interaction
        await monitor.testManualUploadClick(testFilePath);
        
        // Generate final report
        const report = monitor.generateReport();
        
        // Print summary
        console.log('\n🎯 MONITORING SUMMARY:');
        console.log('=' .repeat(50));
        console.log(`Total Timeline Events: ${report.summary.totalEvents}`);
        console.log(`Elements Monitored: ${report.summary.elementStates}`);
        console.log(`Errors Detected: ${report.summary.errors}`);
        console.log('=' .repeat(50));
        
        // Show critical findings
        const elementChanges = monitor.monitoringData.timeline.filter(e => e.type === 'element_change');
        console.log(`\n🔄 Element Changes Detected: ${elementChanges.length}`);
        elementChanges.forEach(change => {
            console.log(`  - ${change.data.element}: ${JSON.stringify(change.data.previous)} → ${JSON.stringify(change.data.current)}`);
        });
        
        // Keep browser open for manual inspection
        console.log('\n🔍 Browser left open for manual inspection...');
        console.log('Press Ctrl+C when done inspecting');
        
        // Keep process alive
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Monitoring failed:', error);
    } finally {
        // Note: Not calling cleanup() to keep browser open for inspection
    }
}

// Export for use as module
if (require.main === module) {
    runFrontendMonitoring();
}

module.exports = { FrontendMonitor, runFrontendMonitoring };