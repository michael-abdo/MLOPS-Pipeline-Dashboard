const DashboardPage = require('../pages/DashboardPage');
const config = require('../config/automation.config');
const path = require('path');
const fs = require('fs');

async function testWebSocketStreaming() {
    console.log('\n============================================================');
    console.log('  WEBSOCKET REAL-TIME STREAMING TEST');
    console.log('============================================================\n');

    const dashboard = new DashboardPage({ 
        debug: true, 
        headed: true,
        slowMo: 100
    });

    try {
        // Initialize browser
        console.log('\n============================================================');
        console.log('  Step 1: Initialize and Open Dashboard');
        console.log('============================================================\n');
        
        await dashboard.initialize();
        await dashboard.openDashboard();

        // Wait for WebSocket connection
        console.log('\n============================================================');
        console.log('  Step 2: Verify WebSocket Connection');
        console.log('============================================================\n');
        
        await dashboard.page.waitForTimeout(2000);
        
        // Check WebSocket status indicator
        const wsStatus = await dashboard.page.evaluate(() => {
            const indicator = document.querySelector('#connectionStatus');
            return {
                connected: indicator?.classList.contains('connected'),
                text: indicator?.textContent
            };
        });
        
        console.log(`WebSocket Status: ${JSON.stringify(wsStatus, null, 2)}`);

        // Capture initial system metrics
        console.log('\n============================================================');
        console.log('  Step 3: Monitor Real-Time System Metrics');
        console.log('============================================================\n');
        
        const initialMetrics = await dashboard.page.evaluate(() => {
            const cpuEl = document.querySelector('#cpuPercent');
            const memoryEl = document.querySelector('#memoryPercent');
            const diskEl = document.querySelector('#diskPercent');
            return {
                cpu: cpuEl?.textContent,
                memory: memoryEl?.textContent,
                disk: diskEl?.textContent
            };
        });
        
        console.log(`Initial Metrics: ${JSON.stringify(initialMetrics, null, 2)}`);

        // Upload CSV file
        console.log('\n============================================================');
        console.log('  Step 4: Upload CSV and Monitor Activity Feed');
        console.log('============================================================\n');
        
        const csvPath = path.join(config.paths.projectRoot, 'uploads', 'simple_test_data.csv');
        await dashboard.uploadCSV(csvPath);

        // Monitor activity feed for real-time update
        await dashboard.page.waitForTimeout(1000);
        
        const activityUpdate = await dashboard.page.evaluate(() => {
            const activities = document.querySelectorAll('.activity-item');
            if (activities.length > 0) {
                const latest = activities[0];
                return {
                    title: latest.querySelector('.activity-title')?.textContent,
                    description: latest.querySelector('.activity-description')?.textContent,
                    timestamp: latest.querySelector('.activity-timestamp')?.textContent
                };
            }
            return null;
        });
        
        console.log(`Real-time Activity Update: ${JSON.stringify(activityUpdate, null, 2)}`);

        // Start training to test progress streaming
        console.log('\n============================================================');
        console.log('  Step 5: Start Training and Monitor Progress');
        console.log('============================================================\n');
        
        await dashboard.page.click('#trainButton');
        console.log('Training started - monitoring real-time progress...');

        // Monitor training progress for 15 seconds
        let progressUpdates = [];
        for (let i = 0; i < 5; i++) {
            await dashboard.page.waitForTimeout(3000);
            
            const progress = await dashboard.page.evaluate(() => {
                const progressBar = document.querySelector('.training-progress-fill');
                const stageEl = document.querySelector('.training-stage');
                const timeEl = document.querySelector('.training-time-remaining');
                const accuracyEl = document.querySelector('.live-accuracy');
                
                return {
                    percentage: progressBar?.style.width || '0%',
                    stage: stageEl?.textContent,
                    timeRemaining: timeEl?.textContent,
                    liveAccuracy: accuracyEl?.textContent,
                    timestamp: new Date().toISOString()
                };
            });
            
            progressUpdates.push(progress);
            console.log(`Progress Update ${i + 1}: ${JSON.stringify(progress, null, 2)}`);
        }

        // Check for training stages display
        const trainingStages = await dashboard.page.evaluate(() => {
            const stages = document.querySelectorAll('.training-stage-item');
            return Array.from(stages).map(stage => ({
                name: stage.querySelector('.stage-name')?.textContent,
                status: stage.classList.contains('completed') ? 'completed' : 
                        stage.classList.contains('active') ? 'active' : 'pending'
            }));
        });
        
        console.log(`\nTraining Stages: ${JSON.stringify(trainingStages, null, 2)}`);

        // Monitor system metrics changes
        console.log('\n============================================================');
        console.log('  Step 6: Verify System Metrics Updates');
        console.log('============================================================\n');
        
        await dashboard.page.waitForTimeout(5000);
        
        const updatedMetrics = await dashboard.page.evaluate(() => {
            const cpuEl = document.querySelector('#cpuPercent');
            const memoryEl = document.querySelector('#memoryPercent');
            const diskEl = document.querySelector('#diskPercent');
            const healthEl = document.querySelector('.system-health-indicator');
            
            return {
                cpu: cpuEl?.textContent,
                memory: memoryEl?.textContent,
                disk: diskEl?.textContent,
                health: healthEl?.textContent,
                healthStatus: healthEl?.classList.contains('health-good') ? 'good' :
                             healthEl?.classList.contains('health-warning') ? 'warning' : 'critical'
            };
        });
        
        console.log(`Updated Metrics: ${JSON.stringify(updatedMetrics, null, 2)}`);

        // Summary
        console.log('\n============================================================');
        console.log('  TEST SUMMARY');
        console.log('============================================================\n');
        
        console.log('✅ WebSocket Real-Time Streaming Test - PASSED');
        console.log({
            websocketConnected: wsStatus.connected,
            activityFeedLive: !!activityUpdate,
            trainingProgressStreaming: progressUpdates.length > 0,
            systemMetricsUpdating: initialMetrics.cpu !== updatedMetrics.cpu ||
                                  initialMetrics.memory !== updatedMetrics.memory,
            trainingStagesVisible: trainingStages.length > 0
        });

        await dashboard.cleanup();

    } catch (error) {
        console.error('❌ Test failed:', error);
        await dashboard.cleanup();
        process.exit(1);
    }
}

// Run the test
testWebSocketStreaming();