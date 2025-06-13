const puppeteer = require('puppeteer');
const path = require('path');

// Test the new WebSocket event handlers
async function testNewWebSocketEvents() {
    console.log('🧪 Testing new WebSocket event handlers...\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Enable console logging
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('🔧') || text.includes('WebSocket') || text.includes('model_') || 
                text.includes('file_validated') || text.includes('connection_count') ||
                text.includes('performance_metrics') || text.includes('resource_status')) {
                console.log(`Browser: ${text}`);
            }
        });
        
        // Navigate to dashboard
        console.log('📄 Loading dashboard page...');
        await page.goto('http://localhost:5001/', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        // Wait for WebSocket to connect
        console.log('⏳ Waiting for WebSocket connection...');
        await page.waitForTimeout(3000);
        
        // Test model_status_change event
        console.log('\n📡 Testing model_status_change event...');
        await page.evaluate(() => {
            if (window.wsManager && window.wsManager._ws) {
                // Simulate model status change
                const event = new MessageEvent('message', {
                    data: JSON.stringify({
                        type: 'model_status_change',
                        status: 'training',
                        model_id: 'test-model-123',
                        deployment_timestamp: new Date().toISOString()
                    })
                });
                window.wsManager._ws.dispatchEvent(event);
            }
        });
        await page.waitForTimeout(500);
        
        // Test file_validated event
        console.log('\n📡 Testing file_validated event...');
        await page.evaluate(() => {
            if (window.wsManager && window.wsManager._ws) {
                // Simulate successful file validation
                const event = new MessageEvent('message', {
                    data: JSON.stringify({
                        type: 'file_validated',
                        status: 'success',
                        filename: 'test_data.csv',
                        rows: 1000,
                        columns: 5,
                        file_path: '/tmp/test_data.csv',
                        summary: 'Dataset contains customer purchase history'
                    })
                });
                window.wsManager._ws.dispatchEvent(event);
            }
        });
        await page.waitForTimeout(500);
        
        // Test model_metrics_update event
        console.log('\n📡 Testing model_metrics_update event...');
        await page.evaluate(() => {
            if (window.wsManager && window.wsManager._ws) {
                // Simulate model metrics update
                const event = new MessageEvent('message', {
                    data: JSON.stringify({
                        type: 'model_metrics_update',
                        accuracy: 0.956,
                        accuracy_trend: 0.02,
                        predictions_made: 5847,
                        avg_response_time: 42,
                        p95_response_time: 95,
                        predictions_per_minute: 31
                    })
                });
                window.wsManager._ws.dispatchEvent(event);
            }
        });
        await page.waitForTimeout(500);
        
        // Test connection_count event
        console.log('\n📡 Testing connection_count event...');
        await page.evaluate(() => {
            if (window.wsManager && window.wsManager._ws) {
                // Simulate connection count update
                const event = new MessageEvent('message', {
                    data: JSON.stringify({
                        type: 'connection_count',
                        count: 15,
                        breakdown: {
                            websocket: 8,
                            api: 7
                        }
                    })
                });
                window.wsManager._ws.dispatchEvent(event);
            }
        });
        await page.waitForTimeout(500);
        
        // Test performance_metrics event
        console.log('\n📡 Testing performance_metrics event...');
        await page.evaluate(() => {
            if (window.wsManager && window.wsManager._ws) {
                // Simulate performance metrics
                const event = new MessageEvent('message', {
                    data: JSON.stringify({
                        type: 'performance_metrics',
                        api_response_time: 145,
                        ws_latency: 18,
                        ping_time: 5
                    })
                });
                window.wsManager._ws.dispatchEvent(event);
            }
        });
        await page.waitForTimeout(500);
        
        // Test resource_status event
        console.log('\n📡 Testing resource_status event...');
        await page.evaluate(() => {
            if (window.wsManager && window.wsManager._ws) {
                // Simulate resource status update
                const event = new MessageEvent('message', {
                    data: JSON.stringify({
                        type: 'resource_status',
                        models: {
                            active: 3,
                            total: 5,
                            list: ['CustomerChurn_v2.1', 'SalesPredictor_v1.3', 'InventoryOptimizer_v1.0']
                        },
                        queue: {
                            pending: 12,
                            processing: 2
                        }
                    })
                });
                window.wsManager._ws.dispatchEvent(event);
            }
        });
        await page.waitForTimeout(500);
        
        // Check UI updates
        console.log('\n🔍 Checking UI updates...');
        const uiState = await page.evaluate(() => {
            const state = {};
            
            // Check status indicator
            const statusEl = document.querySelector('.status-indicator');
            state.statusClass = statusEl ? statusEl.className : 'not found';
            state.statusText = statusEl ? statusEl.textContent.trim() : 'not found';
            
            // Check model accuracy
            const accuracyEl = document.getElementById('modelAccuracy');
            state.modelAccuracy = accuracyEl ? accuracyEl.textContent : 'not found';
            
            // Check prediction count
            const predCountEl = document.getElementById('predictionCount');
            state.predictionCount = predCountEl ? predCountEl.textContent : 'not found';
            
            // Check response time
            const responseEl = document.getElementById('responseTime');
            state.responseTime = responseEl ? responseEl.textContent : 'not found';
            state.responseTimeColor = responseEl ? window.getComputedStyle(responseEl).color : 'not found';
            
            // Check connection count
            const connEl = document.getElementById('activeConnections');
            state.activeConnections = connEl ? connEl.textContent : 'not found';
            
            // Check API response time
            const apiEl = document.getElementById('apiResponseTime');
            state.apiResponseTime = apiEl ? apiEl.textContent : 'not found';
            
            // Check resource status
            const modelsEl = document.getElementById('totalModels');
            state.totalModels = modelsEl ? modelsEl.textContent : 'not found';
            
            const jobsEl = document.getElementById('queueJobs');
            state.queueJobs = jobsEl ? jobsEl.textContent : 'not found';
            
            // Check upload area
            const uploadArea = document.querySelector('.upload-area');
            state.uploadAreaContent = uploadArea ? uploadArea.textContent.trim() : 'not found';
            
            // Check train button
            const trainBtn = document.getElementById('trainButton');
            state.trainButtonDisabled = trainBtn ? trainBtn.disabled : 'not found';
            
            return state;
        });
        
        console.log('\n📊 UI State after events:');
        console.log('  Status:', uiState.statusText, `(${uiState.statusClass})`);
        console.log('  Model Accuracy:', uiState.modelAccuracy);
        console.log('  Predictions:', uiState.predictionCount);
        console.log('  Response Time:', uiState.responseTime, `(color: ${uiState.responseTimeColor})`);
        console.log('  Active Connections:', uiState.activeConnections);
        console.log('  API Response Time:', uiState.apiResponseTime);
        console.log('  Total Models:', uiState.totalModels);
        console.log('  Queue Jobs:', uiState.queueJobs);
        console.log('  Upload Area:', uiState.uploadAreaContent.substring(0, 50) + '...');
        console.log('  Train Button Disabled:', uiState.trainButtonDisabled);
        
        // Test auto-refresh in disconnected state
        console.log('\n📡 Testing auto-refresh fallback...');
        await page.evaluate(() => {
            // Simulate WebSocket disconnection
            if (window.wsManager && window.wsManager._ws) {
                window.wsManager._ws.close();
            }
        });
        
        await page.waitForTimeout(2000);
        
        const disconnectedState = await page.evaluate(() => {
            const connInfo = window.wsManager ? window.wsManager.getConnectionInfo() : null;
            return {
                isConnected: connInfo ? connInfo.isConnected : 'unknown',
                status: connInfo ? connInfo.status : 'unknown'
            };
        });
        
        console.log('\n🔌 WebSocket State:');
        console.log('  Connected:', disconnectedState.isConnected);
        console.log('  Status:', disconnectedState.status);
        
        console.log('\n✅ New WebSocket event handlers test completed!');
        
    } catch (error) {
        console.error('❌ Error during test:', error.message);
    } finally {
        await browser.close();
    }
}

// Run the test
testNewWebSocketEvents().catch(console.error);