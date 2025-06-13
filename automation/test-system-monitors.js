/**
 * System Monitors Test
 * Specifically tests if CPU/Memory/Disk usage monitors update during file upload
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function testSystemMonitors() {
    console.log('📊 Testing System Monitor Updates During Upload');
    console.log('=' .repeat(60));
    
    let browser;
    
    try {
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 200,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        
        // Enable console logging from page
        page.on('console', msg => {
            if (msg.text().includes('✅ Modules exposed globally') || 
                msg.text().includes('WebSocket') || 
                msg.text().includes('CPU') ||
                msg.text().includes('Memory')) {
                console.log(`[PAGE] ${msg.text()}`);
            }
        });
        
        // Navigate to dashboard
        console.log('📍 Opening MLOps dashboard...');
        await page.goto('http://localhost:8000', { 
            waitUntil: 'networkidle0', 
            timeout: 30000 
        });
        
        await page.waitForTimeout(3000);
        
        // Function to capture monitor states
        const captureMonitorState = async (label) => {
            const state = await page.evaluate(() => {
                const getText = (selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.textContent.trim() : 'NOT_FOUND';
                };
                
                return {
                    timestamp: new Date().toISOString(),
                    // System resource monitors
                    cpuUsage: getText('#cpuPercent'),
                    memoryUsage: getText('#memoryPercent'), 
                    diskUsage: getText('#diskPercent'),
                    
                    // Live metrics
                    liveAccuracy: getText('#liveAccuracy'),
                    livePredictions: getText('#livePredictions'),
                    systemHealth: getText('#systemHealth'),
                    
                    // Model info
                    modelAccuracy: getText('#modelAccuracy'),
                    predictionCount: getText('#predictionCount'),
                    responseTime: getText('#responseTime'),
                    
                    // Connection and upload status
                    connectionStatus: getText('#connectionStatus'),
                    uploadAreaText: getText('.upload-area'),
                    trainButtonDisabled: document.querySelector('#trainButton')?.disabled
                };
            });
            
            console.log(`\n📸 ${label}:`);
            console.log(`   CPU: ${state.cpuUsage}`);
            console.log(`   Memory: ${state.memoryUsage}`);
            console.log(`   Disk: ${state.diskUsage}`);
            console.log(`   Live Accuracy: ${state.liveAccuracy}`);
            console.log(`   Live Predictions: ${state.livePredictions}`);
            console.log(`   System Health: ${state.systemHealth}`);
            console.log(`   Connection: ${state.connectionStatus}`);
            console.log(`   Train Button Disabled: ${state.trainButtonDisabled}`);
            
            return state;
        };
        
        // Capture initial state
        const initialState = await captureMonitorState('INITIAL STATE');
        
        // Upload a CSV file
        console.log('\n📁 Uploading CSV file...');
        const csvPath = path.join(__dirname, '..', 'uploads', 'simple_test_data.csv');
        
        const fileInput = await page.$('#fileInput');
        if (!fileInput) {
            throw new Error('File input not found');
        }
        
        await fileInput.uploadFile(csvPath);
        console.log('✅ File upload triggered');
        
        // Monitor changes every 2 seconds for 20 seconds
        const monitoringDuration = 20000;
        const interval = 2000;
        const iterations = monitoringDuration / interval;
        
        console.log(`\n⏱️  Monitoring for ${monitoringDuration/1000} seconds...`);
        
        const states = [initialState];
        
        for (let i = 0; i < iterations; i++) {
            await page.waitForTimeout(interval);
            const state = await captureMonitorState(`AFTER ${(i + 1) * interval / 1000}s`);
            states.push(state);
        }
        
        // Analysis
        console.log('\n📈 CHANGE ANALYSIS');
        console.log('=' .repeat(60));
        
        const metrics = ['cpuUsage', 'memoryUsage', 'diskUsage', 'liveAccuracy', 'livePredictions', 'systemHealth'];
        
        metrics.forEach(metric => {
            const values = [...new Set(states.map(s => s[metric]))];
            const hasChanged = values.length > 1;
            
            console.log(`\n${metric.toUpperCase()}:`);
            console.log(`   Changed: ${hasChanged ? '✅ YES' : '❌ NO'}`);
            if (hasChanged) {
                console.log(`   Values: ${values.join(' → ')}`);
            } else {
                console.log(`   Constant: "${values[0]}"`);
            }
        });
        
        // Check if upload was processed
        const finalUploadText = states[states.length - 1].uploadAreaText;
        const uploadProcessed = finalUploadText.includes('successfully') || finalUploadText.includes('✅');
        
        console.log(`\n📋 UPLOAD PROCESSING:`);
        console.log(`   Upload processed: ${uploadProcessed ? '✅ YES' : '❌ NO'}`);
        console.log(`   Final upload text: "${finalUploadText.substring(0, 100)}..."`);
        
        // Check WebSocket activity
        const wsCheck = await page.evaluate(() => {
            return {
                wsManagerExists: typeof window.wsManager !== 'undefined',
                connectionStatus: window.wsManager ? 'Manager available' : 'No manager'
            };
        });
        
        console.log(`\n🌐 WEBSOCKET STATUS:`);
        console.log(`   Manager available: ${wsCheck.wsManagerExists ? '✅' : '❌'}`);
        console.log(`   Status: ${wsCheck.connectionStatus}`);
        
        // Expected behavior analysis
        console.log(`\n🎯 EXPECTED vs ACTUAL BEHAVIOR:`);
        console.log('=' .repeat(60));
        
        console.log(`Expected after CSV upload:`);
        console.log(`   ✓ CPU usage should increase (processing file)`);
        console.log(`   ✓ Memory usage should increase (loading data)`);
        console.log(`   ✓ Upload area should show success message`);
        console.log(`   ✓ Train button should become enabled`);
        console.log(`   ✓ System health should remain good`);
        console.log(`   ? Live predictions might update`);
        console.log(`   ? Live accuracy might change`);
        
        const cpuChanged = [...new Set(states.map(s => s.cpuUsage))].length > 1;
        const memoryChanged = [...new Set(states.map(s => s.memoryUsage))].length > 1;
        const trainButtonChanged = states[0].trainButtonDisabled !== states[states.length - 1].trainButtonDisabled;
        
        console.log(`\nActual results:`);
        console.log(`   CPU usage changed: ${cpuChanged ? '✅' : '❌'}`);
        console.log(`   Memory usage changed: ${memoryChanged ? '✅' : '❌'}`);
        console.log(`   Upload processed: ${uploadProcessed ? '✅' : '❌'}`);
        console.log(`   Train button state changed: ${trainButtonChanged ? '✅' : '❌'}`);
        
        // Conclusion
        console.log(`\n🏁 CONCLUSION:`);
        if (!cpuChanged && !memoryChanged) {
            console.log(`❌ System monitors (CPU/Memory/Disk) are NOT updating during upload`);
            console.log(`⚠️  This suggests either:`);
            console.log(`   1. Backend is not sending WebSocket updates for system metrics`);
            console.log(`   2. Frontend is not listening to system metric events`);
            console.log(`   3. System monitoring is disabled or not implemented`);
            console.log(`   4. File upload doesn't trigger system metric updates`);
        } else {
            console.log(`✅ System monitors are updating during upload process`);
        }
        
        if (uploadProcessed) {
            console.log(`✅ Upload functionality is working correctly`);
        } else {
            console.log(`❌ Upload processing may not be working`);
        }
        
        // Take final screenshot
        await page.screenshot({
            path: path.join(__dirname, 'screenshots', `system-monitors-${Date.now()}.png`),
            fullPage: true
        });
        console.log(`\n📸 Final screenshot saved`);
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    } finally {
        if (browser) {
            console.log('\n👋 Closing browser...');
            await browser.close();
        }
    }
}

testSystemMonitors().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});