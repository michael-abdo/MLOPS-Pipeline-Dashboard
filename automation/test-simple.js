/**
 * Simple test to verify upload functionality
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function testSimpleUpload() {
    console.log('🚀 Starting simple upload test...\n');
    
    let browser;
    try {
        // Launch browser
        browser = await puppeteer.launch({
            headless: false, // Show browser
            slowMo: 100, // Slow down for visibility
            devtools: true
        });
        
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => console.log('Browser:', msg.text()));
        page.on('pageerror', error => console.error('Page error:', error));
        
        // Navigate to dashboard
        console.log('📍 Navigating to dashboard...');
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle2' });
        
        // Wait for upload area
        console.log('⏳ Waiting for upload area...');
        await page.waitForSelector('.upload-area', { timeout: 10000 });
        
        // Check initial state
        const uploadIcon = await page.$eval('.upload-icon', el => el.textContent);
        const uploadTitle = await page.$eval('.upload-area h4', el => el.textContent);
        console.log(`Initial state - Icon: ${uploadIcon}, Title: ${uploadTitle}`);
        
        // Find file input
        const fileInput = await page.$('#fileInput');
        if (!fileInput) {
            throw new Error('File input not found!');
        }
        
        // Upload file
        console.log('\n📤 Uploading CSV file...');
        const csvPath = path.join(__dirname, '..', 'uploads', 'simple_test_data.csv');
        await fileInput.uploadFile(csvPath);
        
        // Wait for changes
        console.log('⏳ Waiting for upload to process...');
        
        // Wait for either success icon or error
        try {
            await page.waitForFunction(
                () => {
                    const icon = document.querySelector('.upload-icon');
                    const title = document.querySelector('.upload-area h4');
                    console.log('Checking:', icon?.textContent, title?.textContent);
                    return (icon && (icon.textContent.includes('✅') || icon.textContent.includes('❌'))) ||
                           (title && (title.textContent !== 'Upload Your Data'));
                },
                { timeout: 15000 }
            );
        } catch (err) {
            console.log('❌ Timeout waiting for upload response');
            
            // Get current state
            const currentIcon = await page.$eval('.upload-icon', el => el.textContent);
            const currentTitle = await page.$eval('.upload-area h4', el => el.textContent);
            console.log(`Current state - Icon: ${currentIcon}, Title: ${currentTitle}`);
        }
        
        // Check final state
        const finalIcon = await page.$eval('.upload-icon', el => el.textContent);
        const finalTitle = await page.$eval('.upload-area h4', el => el.textContent);
        const trainButton = await page.$('#trainButton');
        const isTrainEnabled = await trainButton.evaluate(el => !el.disabled);
        
        console.log('\n📊 Final State:');
        console.log(`Icon: ${finalIcon}`);
        console.log(`Title: ${finalTitle}`);
        console.log(`Train button enabled: ${isTrainEnabled}`);
        
        // Take screenshot
        await page.screenshot({ 
            path: path.join(__dirname, 'screenshots', 'simple-upload-test.png'),
            fullPage: true 
        });
        console.log('\n📸 Screenshot saved');
        
        // Check if successful
        if (finalIcon.includes('✅') && isTrainEnabled) {
            console.log('\n✅ Upload test PASSED!');
        } else {
            console.log('\n❌ Upload test FAILED!');
        }
        
    } catch (error) {
        console.error('\n❌ Test error:', error.message);
        console.error(error.stack);
    } finally {
        if (browser) {
            console.log('\n🔚 Closing browser...');
            await browser.close();
        }
    }
}

// Run the test
testSimpleUpload().catch(console.error);