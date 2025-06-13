/**
 * Monitor System Metrics During Upload
 * Uses the proven quick-element-check approach to monitor frontend metrics during upload
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function monitorSystemMetricsDuringUpload() {
    console.log('📊 Monitoring System Metrics During File Upload');
    console.log('=' .repeat(60));
    
    let browser;
    
    try {
        browser = await puppeteer.launch({
            headless: true,
            timeout: 10000
        });
        
        const page = await browser.newPage();
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle0', timeout: 10000 });
        
        // Function to capture all system monitor states
        const captureSystemState = async (label) => {
            const state = await page.evaluate(() => {
                const getTextContent = (selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.textContent.trim() : 'NOT_FOUND';
                };
                
                return {
                    timestamp: new Date().toISOString(),
                    // System resource monitors (the ones you asked about)
                    cpuUsage: getTextContent('#cpuPercent'),
                    memoryUsage: getTextContent('#memoryPercent'),
                    diskUsage: getTextContent('#diskPercent'),
                    
                    // Live & Model metrics
                    liveAccuracy: getTextContent('#liveAccuracy'),
                    livePredictions: getTextContent('#livePredictions'),
                    systemHealth: getTextContent('#systemHealth'),
                    
                    // Model information  
                    modelAccuracy: getTextContent('#modelAccuracy'),
                    predictionCount: getTextContent('#predictionCount'),
                    responseTime: getTextContent('#responseTime'),
                    
                    // Upload state
                    uploadAreaText: getTextContent('.upload-area'),
                    trainButtonDisabled: document.querySelector('#trainButton')?.disabled || true,
                    
                    // Connection
                    connectionStatus: getTextContent('#connectionStatus')
                };
            });
            
            console.log(`\n📸 ${label}:`);
            console.log(`   ⚡ CPU Usage: "${state.cpuUsage}"`);
            console.log(`   💾 Memory Usage: "${state.memoryUsage}"`);
            console.log(`   💽 Disk Usage: "${state.diskUsage}"`);
            console.log(`   📈 Live Accuracy: "${state.liveAccuracy}"`);
            console.log(`   🔮 Live Predictions: "${state.livePredictions}"`);
            console.log(`   ✅ System Health: "${state.systemHealth}"`);
            console.log(`   🎯 Model Accuracy: "${state.modelAccuracy}"`);
            console.log(`   📊 Prediction Count: "${state.predictionCount}"`);
            console.log(`   ⏱️  Response Time: "${state.responseTime}"`);
            console.log(`   🔗 Connection: "${state.connectionStatus}"`);
            console.log(`   🚂 Train Button Disabled: ${state.trainButtonDisabled}`);
            
            return state;
        };
        
        // Capture initial state
        console.log('\n🏁 INITIAL STATE (Before Upload)');
        const initialState = await captureSystemState('BASELINE');
        
        // Upload a CSV file
        console.log('\n📁 UPLOADING FILE...');
        const csvPath = path.join(__dirname, '..', 'uploads', 'simple_test_data.csv');
        
        const fileInput = await page.$('#fileInput');
        if (!fileInput) {
            throw new Error('File input not found');
        }
        
        await fileInput.uploadFile(csvPath);
        console.log('✅ File upload triggered');
        
        // Monitor for changes every 3 seconds for 30 seconds
        console.log('\n⏱️  MONITORING CHANGES FOR 30 SECONDS...');
        const states = [initialState];
        const monitoringPeriod = 30000; // 30 seconds
        const checkInterval = 3000;     // Every 3 seconds
        const checksToPerform = monitoringPeriod / checkInterval;
        
        for (let i = 0; i < checksToPerform; i++) {
            await page.waitForTimeout(checkInterval);
            const timeElapsed = (i + 1) * checkInterval / 1000;
            const state = await captureSystemState(`T+${timeElapsed}s`);
            states.push(state);
        }
        
        // Analysis
        console.log('\n📈 CHANGE ANALYSIS');
        console.log('=' .repeat(60));
        
        const analyzeMetric = (metricName, displayName) => {
            const values = states.map(s => s[metricName]);
            const uniqueValues = [...new Set(values)];
            const hasChanged = uniqueValues.length > 1;
            
            console.log(`\n${displayName}:`);
            console.log(`   Changed during upload: ${hasChanged ? '✅ YES' : '❌ NO'}`);
            console.log(`   Values seen: ${uniqueValues.join(' → ')}`);
            
            if (hasChanged) {
                console.log(`   🔄 DYNAMIC - Updates during session`);
            } else {
                console.log(`   ⚪ STATIC - No changes detected`);
            }
            
            return hasChanged;
        };
        
        // Analyze each metric you asked about
        const cpuChanged = analyzeMetric('cpuUsage', '⚡ CPU Usage');
        const memoryChanged = analyzeMetric('memoryUsage', '💾 Memory Usage');
        const diskChanged = analyzeMetric('diskUsage', '💽 Disk Usage');
        const accuracyChanged = analyzeMetric('liveAccuracy', '📈 Live Accuracy');
        const predictionsChanged = analyzeMetric('livePredictions', '🔮 Live Predictions');
        const healthChanged = analyzeMetric('systemHealth', '✅ System Health');
        const modelAccuracyChanged = analyzeMetric('modelAccuracy', '🎯 Model Accuracy');
        const predictionCountChanged = analyzeMetric('predictionCount', '📊 Prediction Count');
        const responseTimeChanged = analyzeMetric('responseTime', '⏱️  Response Time');
        
        // Upload success analysis
        const uploadStates = states.map(s => s.uploadAreaText);
        const uploadSuccess = uploadStates.some(text => 
            text.includes('successfully') || text.includes('✅')
        );
        
        const trainButtonStates = states.map(s => s.trainButtonDisabled);
        const trainButtonEnabled = trainButtonStates.some(disabled => !disabled);
        
        console.log('\n🎯 UPLOAD SUCCESS ANALYSIS:');
        console.log(`   Upload processed successfully: ${uploadSuccess ? '✅ YES' : '❌ NO'}`);
        console.log(`   Train button became enabled: ${trainButtonEnabled ? '✅ YES' : '❌ NO'}`);
        
        // Summary
        console.log('\n🏁 FINAL SUMMARY');
        console.log('=' .repeat(60));
        
        const systemMetricsChanged = cpuChanged || memoryChanged || diskChanged;
        const liveMetricsChanged = accuracyChanged || predictionsChanged || healthChanged;
        const modelMetricsChanged = modelAccuracyChanged || predictionCountChanged || responseTimeChanged;
        
        console.log(`📊 SYSTEM METRICS (CPU/Memory/Disk): ${systemMetricsChanged ? '🔄 CHANGING' : '⚪ STATIC'}`);
        console.log(`🔮 LIVE METRICS: ${liveMetricsChanged ? '🔄 CHANGING' : '⚪ STATIC'}`);
        console.log(`🎯 MODEL METRICS: ${modelMetricsChanged ? '🔄 CHANGING' : '⚪ STATIC'}`);
        console.log(`📁 UPLOAD FUNCTIONALITY: ${uploadSuccess ? '✅ WORKING' : '❌ BROKEN'}`);
        
        // Answer your original question
        console.log('\n🔍 ANSWERING YOUR QUESTION:');
        console.log('"Should frontend monitors update during upload?"');
        console.log('');
        
        if (systemMetricsChanged) {
            console.log('✅ YES - System monitors (CPU/Memory/Disk) ARE updating during upload');
            console.log('✅ Your expectation is correct - they should react to processing');
        } else {
            console.log('❌ NO - System monitors (CPU/Memory/Disk) are NOT updating during upload');
            console.log('⚠️  This suggests either:');
            console.log('   1. File upload is not triggering backend processing');
            console.log('   2. Backend is not sending metric updates via WebSocket');
            console.log('   3. Frontend is not receiving/displaying WebSocket updates');
            console.log('   4. Metrics update on timer (every 5s) but processing is too fast');
        }
        
        if (liveMetricsChanged) {
            console.log('✅ Live metrics (accuracy/predictions) are updating');
        } else {
            console.log('⚪ Live metrics remain constant during upload');
        }
        
        console.log('\n💡 RECOMMENDATIONS:');
        if (!systemMetricsChanged && uploadSuccess) {
            console.log('1. Upload works but system metrics are static');
            console.log('2. Check if WebSocket is sending system_metrics events');
            console.log('3. Backend may need to trigger metrics update on upload');
            console.log('4. Consider adding immediate metric refresh after upload');
        } else if (systemMetricsChanged) {
            console.log('1. System is working as expected');
            console.log('2. Real-time monitoring is functional');
            console.log('3. Upload triggers appropriate system responses');
        }
        
    } catch (error) {
        console.error('\n❌ Monitoring failed:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

monitorSystemMetricsDuringUpload().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});