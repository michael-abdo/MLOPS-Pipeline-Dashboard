/**
 * Simple Element Monitor
 * Simplified version for monitoring frontend elements
 */

const puppeteer = require('puppeteer');

async function simpleMonitor() {
    console.log('🔍 Starting Simple Frontend Monitor...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        devtools: false,
        slowMo: 250
    });
    
    const page = await browser.newPage();
    
    // Monitor console
    page.on('console', msg => {
        console.log(`[CONSOLE] ${msg.text()}`);
    });
    
    page.on('pageerror', err => {
        console.error(`[ERROR] ${err.message}`);
    });
    
    await page.goto('http://localhost:8000');
    await page.waitForTimeout(3000);
    
    console.log('📸 Capturing initial element states...');
    
    // Check key elements
    const elementStates = await page.evaluate(() => {
        const elements = {
            uploadArea: document.querySelector('.upload-area'),
            fileInput: document.querySelector('#fileInput'),
            trainButton: document.querySelector('#trainButton'),
            connectionStatus: document.querySelector('#connectionStatus')
        };
        
        const states = {};
        Object.entries(elements).forEach(([name, el]) => {
            if (el) {
                states[name] = {
                    exists: true,
                    text: el.textContent?.trim(),
                    disabled: el.disabled || false,
                    className: el.className,
                    display: window.getComputedStyle(el).display
                };
            } else {
                states[name] = { exists: false };
            }
        });
        
        return states;
    });
    
    console.log('Initial Element States:');
    Object.entries(elementStates).forEach(([name, state]) => {
        console.log(`  ${name}:`, state);
    });
    
    console.log('\n🧪 Testing file upload...');
    
    // Upload test file
    const fileInput = await page.$('#fileInput');
    if (fileInput) {
        await fileInput.uploadFile('/Users/Mike/Desktop/programming/2_proposals/upwork/communication/mlops_021929016736789551311/mlops/development/uploads/simple_test_data.csv');
        console.log('✅ File uploaded');
        
        // Wait and check states again
        await page.waitForTimeout(5000);
        
        const afterUploadStates = await page.evaluate(() => {
            const elements = {
                uploadArea: document.querySelector('.upload-area'),
                trainButton: document.querySelector('#trainButton')
            };
            
            const states = {};
            Object.entries(elements).forEach(([name, el]) => {
                if (el) {
                    states[name] = {
                        text: el.textContent?.trim(),
                        disabled: el.disabled || false,
                        innerHTML: el.innerHTML?.substring(0, 200)
                    };
                }
            });
            
            return states;
        });
        
        console.log('\nAfter Upload States:');
        Object.entries(afterUploadStates).forEach(([name, state]) => {
            console.log(`  ${name}:`, state);
        });
    }
    
    console.log('\n🔍 Browser left open for manual inspection...');
    console.log('Press Ctrl+C when done');
    
    // Keep alive
    await new Promise(() => {});
}

simpleMonitor().catch(console.error);