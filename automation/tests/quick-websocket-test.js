const puppeteer = require('puppeteer');

async function quickWebSocketTest() {
    console.log('\n🚀 Quick WebSocket Streaming Test\n');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('WebSocket') || text.includes('Real-time') || text.includes('training')) {
            consoleLogs.push(text);
            console.log(`📝 Console: ${text}`);
        }
    });
    
    try {
        // Navigate to dashboard
        await page.goto('http://localhost:8000', { waitUntil: 'networkidle0' });
        console.log('✅ Dashboard loaded\n');
        
        // Wait for WebSocket connection
        await page.waitForTimeout(3000);
        
        // Check WebSocket status
        const wsConnected = await page.evaluate(() => {
            return window.websocket && window.websocket.readyState === 1;
        });
        console.log(`🔌 WebSocket Connected: ${wsConnected}\n`);
        
        // Upload CSV
        console.log('📤 Uploading CSV file...');
        const fileInput = await page.$('#fileInput');
        await fileInput.uploadFile('./uploads/simple_test_data.csv');
        await page.waitForTimeout(2000);
        
        // Check activity feed
        const activityCount = await page.evaluate(() => {
            return document.querySelectorAll('.activity-item').length;
        });
        console.log(`📋 Activity items: ${activityCount}\n`);
        
        // Start training
        console.log('🏋️ Starting training...');
        await page.click('#trainButton');
        
        // Monitor for 10 seconds
        console.log('📊 Monitoring real-time updates for 10 seconds...\n');
        
        for (let i = 0; i < 5; i++) {
            await page.waitForTimeout(2000);
            
            const status = await page.evaluate(() => {
                const progress = document.querySelector('.training-progress-fill');
                const stage = document.querySelector('.training-stage');
                const activity = document.querySelectorAll('.activity-item');
                
                return {
                    progress: progress ? progress.style.width : '0%',
                    stage: stage ? stage.textContent : 'Not started',
                    activities: activity.length
                };
            });
            
            console.log(`Update ${i + 1}: Progress: ${status.progress}, Stage: ${status.stage}, Activities: ${status.activities}`);
        }
        
        console.log('\n📝 WebSocket Console Logs:');
        consoleLogs.forEach(log => console.log(`   - ${log}`));
        
        console.log('\n✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    } finally {
        await browser.close();
    }
}

quickWebSocketTest();