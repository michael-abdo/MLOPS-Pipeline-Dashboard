const puppeteer = require('puppeteer');
const path = require('path');

async function testUploadFix() {
    console.log('🔍 Testing Upload Functionality Fix');
    console.log('=' .repeat(40));
    
    let browser;
    
    try {
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 250,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        
        // Navigate to dashboard
        console.log('📍 Navigating to http://localhost:8000...');
        await page.goto('http://localhost:8000', { 
            waitUntil: 'networkidle0', 
            timeout: 30000 
        });
        
        // Wait for page to fully load
        await page.waitForTimeout(3000);
        
        // Check if modules are loaded in the browser context
        console.log('🔧 Checking JavaScript modules...');
        const moduleCheck = await page.evaluate(() => {
            return {
                Dashboard: typeof window.Dashboard !== 'undefined',
                API: typeof window.API !== 'undefined',
                CONFIG: typeof window.CONFIG !== 'undefined',
                errorHandler: typeof window.errorHandler !== 'undefined'
            };
        });
        
        console.log('📊 Module Status:');
        Object.entries(moduleCheck).forEach(([name, loaded]) => {
            console.log(`   ${name}: ${loaded ? '✅' : '❌'}`);
        });
        
        // Check if upload elements exist
        console.log('\n🔧 Checking upload elements...');
        const elementCheck = await page.evaluate(() => {
            return {
                uploadArea: !!document.querySelector('.upload-area'),
                fileInput: !!document.querySelector('#fileInput'),
                trainButton: !!document.querySelector('#trainButton')
            };
        });
        
        console.log('📊 Element Status:');
        Object.entries(elementCheck).forEach(([name, exists]) => {
            console.log(`   ${name}: ${exists ? '✅' : '❌'}`);
        });
        
        // Test file upload if all checks pass
        if (moduleCheck.Dashboard && moduleCheck.API && elementCheck.uploadArea) {
            console.log('\n🧪 Testing file upload...');
            
            // Check if test file exists
            const csvPath = path.join(__dirname, '..', 'uploads', 'simple_test_data.csv');
            const fs = require('fs');
            
            if (fs.existsSync(csvPath)) {
                console.log(`📁 Using test file: ${csvPath}`);
                
                // Upload file
                const fileInput = await page.$('#fileInput');
                if (fileInput) {
                    await fileInput.uploadFile(csvPath);
                    console.log('✅ File upload triggered');
                    
                    // Wait for processing
                    await page.waitForTimeout(5000);
                    
                    // Check if anything changed
                    const afterUpload = await page.evaluate(() => {
                        const uploadArea = document.querySelector('.upload-area');
                        const trainButton = document.querySelector('#trainButton');
                        
                        return {
                            uploadAreaText: uploadArea ? uploadArea.textContent.trim() : 'NOT_FOUND',
                            trainButtonDisabled: trainButton ? trainButton.disabled : true
                        };
                    });
                    
                    console.log('📊 After Upload:');
                    console.log(`   Upload area text: "${afterUpload.uploadAreaText.substring(0, 50)}..."`);
                    console.log(`   Train button disabled: ${afterUpload.trainButtonDisabled}`);
                    
                    // Take screenshot for verification
                    const screenshotPath = path.join(__dirname, 'screenshots', `upload-test-${Date.now()}.png`);
                    await page.screenshot({ 
                        path: screenshotPath,
                        fullPage: true 
                    });
                    console.log(`📸 Screenshot saved: ${screenshotPath}`);
                    
                } else {
                    console.log('❌ File input not found');
                }
            } else {
                console.log('❌ Test CSV file not found');
            }
        } else {
            console.log('\n❌ Prerequisites not met - skipping upload test');
        }
        
        console.log('\n✅ Test completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test with proper error handling
testUploadFix().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});