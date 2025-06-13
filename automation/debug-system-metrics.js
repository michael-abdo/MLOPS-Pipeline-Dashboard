/**
 * Debug System Metrics - Visual Test
 * Opens browser in headed mode to see console logs and debug system metrics
 */

const puppeteer = require('puppeteer');

async function debugSystemMetrics() {
    console.log('🔧 Debug System Metrics - Opening Headed Browser');
    console.log('This will open a browser window so you can see console logs');
    console.log('Watch the browser console for debug messages');
    console.log('Press Ctrl+C in terminal when done');
    
    const browser = await puppeteer.launch({
        headless: false,
        devtools: true,  // Open DevTools automatically
        slowMo: 100,
        args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Log all console messages from the page
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('🔧') || text.includes('updateSystemMetrics') || text.includes('Metric.update')) {
            console.log(`[BROWSER] ${text}`);
        }
    });
    
    console.log('📍 Opening http://localhost:8000...');
    await page.goto('http://localhost:8000', { waitUntil: 'networkidle0' });
    
    console.log('✅ Page loaded');
    console.log('🔍 Check the browser DevTools console for debug messages');
    console.log('💡 You should see WebSocket system_metrics updates every 5 seconds');
    console.log('');
    console.log('Looking for messages like:');
    console.log('  🔧 updateSystemMetrics called with data: {...}');
    console.log('  🔧 Metric.update called: cpuPercent = XX');
    console.log('');
    console.log('⏱️  Will wait 60 seconds to capture metrics...');
    
    // Wait for 60 seconds to capture multiple metric updates
    await page.waitForTimeout(60000);
    
    console.log('✅ Debug session complete');
    console.log('💡 If you saw debug messages, the WebSocket is working');
    console.log('💡 If no debug messages, there\'s still an issue with WebSocket handlers');
    
    await browser.close();
}

debugSystemMetrics().catch(error => {
    console.error('Debug failed:', error);
    process.exit(1);
});