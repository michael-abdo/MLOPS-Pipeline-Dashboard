/**
 * Frontend Monitors Test
 * Tests if frontend monitors update after CSV upload:
 * - CPU/Memory/Disk Usage
 * - Model information
 * - Live metrics
 * - Activity feed
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function testFrontendMonitors() {
    console.log('🔍 Testing Frontend Monitor Updates After Upload');
    console.log('=' .repeat(60));
    
    let browser;
    
    try {
        browser = await puppeteer.launch({
            headless: false,
            slowMo: 500,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        
        // Navigate to dashboard
        console.log('📍 Opening dashboard...');
        await page.goto('http://localhost:8000', { 
            waitUntil: 'networkidle0', 
            timeout: 30000 
        });
        
        // Wait for page to fully load
        await page.waitForTimeout(3000);
        
        // Step 1: Capture initial state of monitors
        console.log('\n📊 STEP 1: Capturing Initial Monitor States');
        console.log('-' .repeat(50));
        
        const initialState = await page.evaluate(() => {
            const getTextContent = (selector) => {
                const el = document.querySelector(selector);
                return el ? el.textContent.trim() : 'NOT_FOUND';
            };
            
            return {
                // System metrics
                cpuUsage: getTextContent('#cpuPercent'),
                memoryUsage: getTextContent('#memoryPercent'),
                diskUsage: getTextContent('#diskPercent'),
                
                // Live metrics
                liveAccuracy: getTextContent('#liveAccuracy'),
                livePredictions: getTextContent('#livePredictions'),
                systemHealth: getTextContent('#systemHealth'),
                
                // Model information
                modelAccuracy: getTextContent('#modelAccuracy'),
                predictionCount: getTextContent('#predictionCount'),
                responseTime: getTextContent('#responseTime'),
                
                // Connection status
                connectionStatus: getTextContent('#connectionStatus'),
                
                // Upload area
                uploadAreaText: getTextContent('.upload-area'),
                
                // Train button state
                trainButtonDisabled: document.querySelector('#trainButton')?.disabled || true
            };
        });
        
        console.log('📋 Initial State:');
        console.log(`   CPU Usage: "${initialState.cpuUsage}"`);
        console.log(`   Memory Usage: "${initialState.memoryUsage}"`);
        console.log(`   Disk Usage: "${initialState.diskUsage}"`);
        console.log(`   Live Accuracy: "${initialState.liveAccuracy}"`);
        console.log(`   Live Predictions: "${initialState.livePredictions}"`);
        console.log(`   System Health: "${initialState.systemHealth}"`);
        console.log(`   Model Accuracy: "${initialState.modelAccuracy}"`);
        console.log(`   Connection Status: "${initialState.connectionStatus}"`);
        console.log(`   Train Button Disabled: ${initialState.trainButtonDisabled}`);
        
        // Step 2: Upload CSV file
        console.log('\n📁 STEP 2: Uploading CSV File');
        console.log('-' .repeat(50));
        
        const csvPath = path.join(__dirname, '..', 'uploads', 'simple_test_data.csv');
        console.log(`   File: ${csvPath}`);
        
        const fileInput = await page.$('#fileInput');
        if (fileInput) {
            await fileInput.uploadFile(csvPath);
            console.log('✅ File upload triggered');
        } else {
            throw new Error('File input not found');
        }
        
        // Step 3: Monitor changes over time
        console.log('\n⏱️  STEP 3: Monitoring Changes (30 seconds)');
        console.log('-' .repeat(50));
        
        const monitoringResults = [];
        const monitoringDuration = 30000; // 30 seconds
        const checkInterval = 2000; // Check every 2 seconds
        const checksToPerform = monitoringDuration / checkInterval;
        
        for (let i = 0; i < checksToPerform; i++) {
            await page.waitForTimeout(checkInterval);
            
            const currentState = await page.evaluate(() => {
                const getTextContent = (selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.textContent.trim() : 'NOT_FOUND';
                };
                
                return {
                    timestamp: new Date().toISOString(),
                    cpuUsage: getTextContent('#cpuPercent'),
                    memoryUsage: getTextContent('#memoryPercent'),
                    diskUsage: getTextContent('#diskPercent'),
                    liveAccuracy: getTextContent('#liveAccuracy'),
                    livePredictions: getTextContent('#livePredictions'),
                    systemHealth: getTextContent('#systemHealth'),
                    modelAccuracy: getTextContent('#modelAccuracy'),
                    predictionCount: getTextContent('#predictionCount'),
                    responseTime: getTextContent('#responseTime'),
                    connectionStatus: getTextContent('#connectionStatus'),
                    uploadAreaText: getTextContent('.upload-area'),
                    trainButtonDisabled: document.querySelector('#trainButton')?.disabled || true
                };
            });
            
            monitoringResults.push(currentState);
            
            const timeElapsed = (i + 1) * checkInterval / 1000;
            console.log(`   ⏰ ${timeElapsed}s - CPU: ${currentState.cpuUsage} | Memory: ${currentState.memoryUsage} | Predictions: ${currentState.livePredictions}`);
        }
        
        // Step 4: Analyze changes
        console.log('\n📈 STEP 4: Analyzing Changes');
        console.log('-' .repeat(50));
        
        const changes = {
            cpuUsage: [],
            memoryUsage: [],
            diskUsage: [],
            liveAccuracy: [],
            livePredictions: [],
            systemHealth: [],
            modelAccuracy: [],
            predictionCount: [],
            responseTime: [],
            connectionStatus: [],
            uploadAreaText: [],
            trainButtonDisabled: []
        };
        
        // Track unique values for each metric
        monitoringResults.forEach(result => {
            Object.keys(changes).forEach(key => {
                if (!changes[key].includes(result[key])) {
                    changes[key].push(result[key]);
                }
            });
        });
        
        // Report changes
        console.log('📊 Change Analysis:');
        Object.entries(changes).forEach(([metric, values]) => {
            const hasChanged = values.length > 1;
            const changeIndicator = hasChanged ? '🔄 CHANGED' : '⚪ STATIC';
            console.log(`   ${metric}: ${changeIndicator}`);
            if (hasChanged) {
                console.log(`      Values seen: ${values.join(' → ')}`);
            } else {
                console.log(`      Constant value: "${values[0]}"`);
            }
        });
        
        // Step 5: Check WebSocket activity
        console.log('\n🌐 STEP 5: WebSocket Activity Check');
        console.log('-' .repeat(50));
        
        const wsActivity = await page.evaluate(() => {
            // Check if WebSocket is connected and active
            return {
                wsConnected: typeof window.wsManager !== 'undefined',
                wsStatus: window.wsManager ? 'Available' : 'Not Available',
                hasReceivedMessages: window.wsMessageCount || 0
            };
        });
        
        console.log('📡 WebSocket Status:');
        console.log(`   Manager Available: ${wsActivity.wsConnected ? '✅' : '❌'}`);
        console.log(`   Status: ${wsActivity.wsStatus}`);
        console.log(`   Messages Received: ${wsActivity.hasReceivedMessages}`);
        
        // Step 6: Final screenshot and summary
        console.log('\n📸 STEP 6: Final State Capture');
        console.log('-' .repeat(50));
        
        await page.screenshot({ 
            path: path.join(__dirname, 'screenshots', `frontend-monitors-${Date.now()}.png`),
            fullPage: true 
        });
        console.log('✅ Screenshot captured');
        
        // Summary
        console.log('\n🎯 SUMMARY: Expected vs Actual Behavior');
        console.log('=' .repeat(60));
        
        const expectedChanges = [
            'cpuUsage should increase during processing',
            'memoryUsage should increase during file processing',
            'uploadAreaText should change to show success message',
            'trainButtonDisabled should become false',
            'connectionStatus should remain "Connected"',
            'livePredictions might update',
            'systemHealth should remain healthy'
        ];
        
        expectedChanges.forEach((expectation, i) => {
            console.log(`   ${i + 1}. ${expectation}`);
        });
        
        const actualChanges = Object.entries(changes)
            .filter(([_, values]) => values.length > 1)
            .map(([metric, _]) => metric);
        
        console.log('\n📋 Actual Changes Detected:');
        if (actualChanges.length === 0) {
            console.log('   ❌ No changes detected in any monitors');
            console.log('   ⚠️  This suggests the upload may not be triggering backend processing');
        } else {
            actualChanges.forEach(metric => {
                console.log(`   ✅ ${metric} changed during monitoring`);
            });
        }
        
        // Recommendations
        console.log('\n💡 RECOMMENDATIONS:');
        if (actualChanges.length === 0) {
            console.log('   1. Check if backend is processing uploads correctly');
            console.log('   2. Verify WebSocket events are being sent from backend');
            console.log('   3. Check if frontend is listening to the right WebSocket events');
            console.log('   4. Verify API endpoints are being called after upload');
        } else {
            console.log('   ✅ Frontend monitors are responsive to changes');
            console.log('   ✅ Real-time updates appear to be working');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
    } finally {
        if (browser) {
            console.log('\n👋 Closing browser...');
            await browser.close();
        }
    }
}

// Run the test
testFrontendMonitors().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});