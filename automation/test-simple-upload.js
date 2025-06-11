const puppeteer = require('puppeteer');
const path = require('path');

async function testSimpleUpload() {
    console.log('🚀 Testing simple file upload...\n');
    
    const browser = await puppeteer.launch({
        headless: false,
        slowMo: 100
    });
    
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        
        // Navigate to dashboard
        console.log('📍 Navigating to dashboard...');
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle2' });
        
        // Wait for file input
        await page.waitForSelector('#fileInput', { timeout: 5000 });
        console.log('✅ Found file input');
        
        // Upload file
        const csvPath = path.join(__dirname, '..', 'uploads', 'simple_test_data.csv');
        console.log(`📁 Uploading file: ${csvPath}`);
        
        const fileInput = await page.$('#fileInput');
        await fileInput.uploadFile(csvPath);
        
        // Wait a bit
        await page.waitForTimeout(3000);
        
        // Take screenshot
        await page.screenshot({ 
            path: path.join(__dirname, 'screenshots', 'simple-upload-result.png'),
            fullPage: true 
        });
        console.log('📸 Screenshot saved');
        
        // Check what's visible
        const uploadAreaText = await page.$eval('.upload-area', el => el.textContent);
        console.log('📋 Upload area text:', uploadAreaText.trim());
        
        // Check if train button is enabled
        const trainButton = await page.$('#trainButton');
        if (trainButton) {
            const isDisabled = await page.$eval('#trainButton', el => el.disabled);
            console.log('🎯 Train button enabled:', !isDisabled);
        }
        
        console.log('\n✅ Test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

testSimpleUpload();