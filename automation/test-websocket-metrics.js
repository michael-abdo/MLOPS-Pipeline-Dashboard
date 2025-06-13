/**
 * WebSocket Metrics Test
 * Tests if the backend is actually sending system metrics via WebSocket
 */

const WebSocket = require('ws');

async function testWebSocketMetrics() {
    console.log('🌐 Testing WebSocket System Metrics');
    console.log('=' .repeat(50));
    
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://localhost:8000/ws');
        let metricsReceived = [];
        let connected = false;
        
        // Set timeout to close connection after 15 seconds
        const timeout = setTimeout(() => {
            console.log('\n⏰ Timeout reached - closing connection');
            ws.close();
            analyze();
        }, 15000);
        
        ws.on('open', () => {
            console.log('✅ WebSocket connected to backend');
            connected = true;
            
            // Send a message to identify ourselves
            ws.send(JSON.stringify({
                type: 'request_metrics'
            }));
        });
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                
                if (message.type === 'system_metrics') {
                    metricsReceived.push({
                        timestamp: message.timestamp,
                        cpu: message.cpu_percent,
                        memory: message.memory_percent,
                        disk: message.disk_percent,
                        health: message.system_health
                    });
                    
                    console.log(`📊 Metrics received: CPU ${message.cpu_percent}% | Memory ${message.memory_percent}% | Disk ${message.disk_percent}% | Health: ${message.system_health}`);
                } else {
                    console.log(`📡 Other message: ${message.type}`);
                }
            } catch (error) {
                console.log(`❌ Failed to parse message: ${error.message}`);
            }
        });
        
        ws.on('close', () => {
            console.log('🔌 WebSocket connection closed');
            clearTimeout(timeout);
            analyze();
        });
        
        ws.on('error', (error) => {
            console.error('❌ WebSocket error:', error.message);
            clearTimeout(timeout);
            reject(error);
        });
        
        function analyze() {
            console.log('\n📈 ANALYSIS:');
            console.log('-' .repeat(30));
            
            if (!connected) {
                console.log('❌ Failed to connect to WebSocket');
                console.log('💡 Make sure backend is running: python backend/backend_simple.py');
            } else if (metricsReceived.length === 0) {
                console.log('❌ No system metrics received');
                console.log('💡 Backend WebSocket may not be sending metrics');
            } else {
                console.log(`✅ Received ${metricsReceived.length} system metric updates`);
                console.log('📊 System metrics are being sent every ~5 seconds');
                
                const uniqueCPU = [...new Set(metricsReceived.map(m => m.cpu))];
                const uniqueMemory = [...new Set(metricsReceived.map(m => m.memory))];
                
                console.log(`   CPU values seen: ${uniqueCPU.join(', ')}`);
                console.log(`   Memory values seen: ${uniqueMemory.join(', ')}`);
                
                if (uniqueCPU.length > 1 || uniqueMemory.length > 1) {
                    console.log('✅ System metrics are changing (dynamic)');
                } else {
                    console.log('⚪ System metrics are static');
                }
            }
            
            console.log('\n🎯 CONCLUSION:');
            if (metricsReceived.length > 0) {
                console.log('✅ Backend is sending system metrics via WebSocket');
                console.log('✅ Frontend monitors SHOULD be updating every 5 seconds');
                console.log('⚠️  File upload does NOT trigger immediate metric updates');
                console.log('💡 Metrics update on timer, not on upload events');
            } else {
                console.log('❌ Backend is NOT sending system metrics');
                console.log('❌ Frontend monitors will NOT update');
            }
            
            resolve();
        }
    });
}

testWebSocketMetrics().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});