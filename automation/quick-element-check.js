/**
 * Quick Element Check
 * Instant snapshot of all frontend elements without browser automation
 * Use this to quickly check element states
 */

const puppeteer = require('puppeteer');

async function quickElementCheck() {
    console.log('⚡ Quick Element State Check');
    console.log('=' .repeat(40));
    
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            timeout: 10000
        });
        
        const page = await browser.newPage();
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle0', timeout: 10000 });
        
        const elementData = await page.evaluate(() => {
            const elements = {
                // Upload elements
                uploadArea: '.upload-area',
                uploadIcon: '.upload-area .upload-icon',
                uploadTitle: '.upload-area h3',
                uploadInstructions: '.upload-area p',
                fileInput: '#fileInput',
                trainButton: '#trainButton',
                
                // Status elements  
                connectionStatus: '#connectionStatus',
                
                // Live metrics
                liveAccuracy: '#liveAccuracy',
                livePredictions: '#livePredictions', 
                systemHealth: '#systemHealth',
                
                // Model performance
                modelAccuracy: '#modelAccuracy',
                predictionCount: '#predictionCount',
                responseTime: '#responseTime',
                
                // System metrics
                cpuPercent: '#cpuPercent',
                memoryPercent: '#memoryPercent',
                diskPercent: '#diskPercent'
            };
            
            const results = {};
            
            Object.entries(elements).forEach(([name, selector]) => {
                const element = document.querySelector(selector);
                if (element) {
                    results[name] = {
                        exists: true,
                        tagName: element.tagName,
                        text: element.textContent?.trim() || '',
                        value: element.value || null,
                        disabled: element.disabled || false,
                        className: element.className || '',
                        display: window.getComputedStyle(element).display,
                        visibility: window.getComputedStyle(element).visibility,
                        id: element.id || '',
                        role: element.getAttribute('role') || null,
                        ariaLabel: element.getAttribute('aria-label') || null
                    };
                } else {
                    results[name] = {
                        exists: false,
                        selector: selector
                    };
                }
            });
            
            // Also check JavaScript context
            results._jsContext = {
                Dashboard: typeof Dashboard !== 'undefined',
                API: typeof API !== 'undefined',
                CONFIG: typeof CONFIG !== 'undefined',
                errorHandler: typeof errorHandler !== 'undefined',
                windowAPI: window.API !== undefined
            };
            
            return results;
        });
        
        // Print results
        console.log('\n📋 ELEMENT STATUS REPORT:');
        console.log('-' .repeat(40));
        
        Object.entries(elementData).forEach(([name, data]) => {
            if (name === '_jsContext') {
                console.log(`\n🔧 JavaScript Context:`);
                Object.entries(data).forEach(([key, loaded]) => {
                    console.log(`   ${key}: ${loaded ? '✅' : '❌'}`);
                });
                return;
            }
            
            if (data.exists) {
                console.log(`\n✅ ${name.toUpperCase()}:`);
                console.log(`   Text: "${data.text}"`);
                console.log(`   Tag: ${data.tagName}`);
                console.log(`   Disabled: ${data.disabled}`);
                console.log(`   Display: ${data.display}`);
                console.log(`   Visibility: ${data.visibility}`);
                if (data.value) console.log(`   Value: "${data.value}"`);
                if (data.className) console.log(`   Class: "${data.className}"`);
                if (data.role) console.log(`   Role: "${data.role}"`);
                if (data.ariaLabel) console.log(`   ARIA Label: "${data.ariaLabel}"`);
            } else {
                console.log(`\n❌ ${name.toUpperCase()}: NOT FOUND (${data.selector})`);
            }
        });
        
        // Critical checks
        console.log('\n🎯 CRITICAL CHECKS:');
        console.log('-' .repeat(40));
        
        const uploadArea = elementData.uploadArea;
        const trainButton = elementData.trainButton;
        const fileInput = elementData.fileInput;
        
        if (!uploadArea.exists) {
            console.log('❌ CRITICAL: Upload area not found!');
        } else if (uploadArea.display === 'none' || uploadArea.visibility === 'hidden') {
            console.log('❌ CRITICAL: Upload area is hidden!');
        } else {
            console.log('✅ Upload area is visible and accessible');
        }
        
        if (!trainButton.exists) {
            console.log('❌ CRITICAL: Train button not found!');
        } else {
            console.log(`✅ Train button exists (disabled: ${trainButton.disabled})`);
        }
        
        if (!fileInput.exists) {
            console.log('❌ CRITICAL: File input not found!');
        } else {
            console.log('✅ File input exists');
        }
        
        // JavaScript context check
        const jsContext = elementData._jsContext;
        if (!jsContext.Dashboard) {
            console.log('❌ CRITICAL: Dashboard class not loaded!');
        }
        if (!jsContext.API) {
            console.log('❌ CRITICAL: API object not loaded!');
        }
        if (jsContext.Dashboard && jsContext.API) {
            console.log('✅ JavaScript context looks good');
        }
        
        console.log('\n📊 SUMMARY:');
        console.log('-' .repeat(40));
        const existingElements = Object.entries(elementData).filter(([name, data]) => 
            name !== '_jsContext' && data.exists
        ).length;
        const totalElements = Object.keys(elementData).length - 1; // -1 for _jsContext
        console.log(`Elements found: ${existingElements}/${totalElements}`);
        
        const jsIssues = Object.values(jsContext).filter(loaded => !loaded).length;
        console.log(`JavaScript context issues: ${jsIssues}`);
        
    } catch (error) {
        console.error('❌ Error during check:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

if (require.main === module) {
    quickElementCheck();
}

module.exports = { quickElementCheck };