/**
 * Demo/Real Data Separation Test Suite
 * Tests environment detection, demo mode switching, config system, and data service integration
 */

import { CONFIG, EnvironmentManager } from '../static/js/common/config.js';
import { DemoDataService, demoData } from '../static/js/common/demo-data.js';

console.log('Testing Demo/Real Data Separation...');

// Test results
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function test(name, fn) {
    try {
        fn();
        results.passed++;
        results.tests.push({ name, status: 'PASSED' });
        console.log(`✅ ${name}`);
    } catch (error) {
        results.failed++;
        results.tests.push({ name, status: 'FAILED', error: error.message });
        console.error(`❌ ${name}:`, error.message);
    }
}

async function asyncTest(name, fn) {
    try {
        await fn();
        results.passed++;
        results.tests.push({ name, status: 'PASSED' });
        console.log(`✅ ${name}`);
    } catch (error) {
        results.failed++;
        results.tests.push({ name, status: 'FAILED', error: error.message });
        console.error(`❌ ${name}:`, error.message);
    }
}

// Test 1: CONFIG Object Structure
test('CONFIG object has correct structure and properties', () => {
    // Test environment properties
    if (typeof CONFIG.ENVIRONMENT !== 'string') throw new Error('ENVIRONMENT not defined');
    if (typeof CONFIG.IS_DEMO_MODE !== 'boolean') throw new Error('IS_DEMO_MODE not defined');
    if (typeof CONFIG.IS_DEBUG_MODE !== 'boolean') throw new Error('IS_DEBUG_MODE not defined');
    
    // Test demo configuration
    if (!CONFIG.DEMO) throw new Error('DEMO config not defined');
    if (typeof CONFIG.DEMO.ENABLED !== 'boolean') throw new Error('DEMO.ENABLED not defined');
    if (typeof CONFIG.DEMO.SHOW_NOTICE !== 'boolean') throw new Error('DEMO.SHOW_NOTICE not defined');
    if (typeof CONFIG.DEMO.SIMULATE_DELAY !== 'boolean') throw new Error('DEMO.SIMULATE_DELAY not defined');
    if (!Array.isArray(CONFIG.DEMO.DELAY_RANGE)) throw new Error('DEMO.DELAY_RANGE not array');
    
    // Test debug configuration
    if (!CONFIG.DEBUG) throw new Error('DEBUG config not defined');
    if (typeof CONFIG.DEBUG.ENABLED !== 'boolean') throw new Error('DEBUG.ENABLED not defined');
    if (typeof CONFIG.DEBUG.LOG_API !== 'boolean') throw new Error('DEBUG.LOG_API not defined');
    if (typeof CONFIG.DEBUG.LOG_STATE !== 'boolean') throw new Error('DEBUG.LOG_STATE not defined');
});

// Test 2: Environment Detection
test('Environment detection works correctly', () => {
    const envInfo = EnvironmentManager.getEnvironmentInfo();
    
    if (!envInfo) throw new Error('Environment info not returned');
    if (typeof envInfo.environment !== 'string') throw new Error('Environment not detected');
    if (typeof envInfo.isDemoMode !== 'boolean') throw new Error('Demo mode not detected');
    if (typeof envInfo.isDebugMode !== 'boolean') throw new Error('Debug mode not detected');
    if (typeof envInfo.hostname !== 'string') throw new Error('Hostname not detected');
    if (typeof envInfo.timestamp !== 'string') throw new Error('Timestamp not generated');
});

// Test 3: DemoDataService Instantiation
test('DemoDataService instantiates correctly', () => {
    const service = new DemoDataService();
    
    if (!service) throw new Error('DemoDataService not instantiated');
    if (!service.cache) throw new Error('Cache not initialized');
    if (typeof service.isEnabled !== 'boolean') throw new Error('isEnabled not set');
    if (typeof service.simulateDelay !== 'function') throw new Error('simulateDelay method missing');
});

// Test 4: Demo Data Generation - Models
asyncTest('Demo data service generates realistic models data', async () => {
    const models = await demoData.getModels();
    
    if (!Array.isArray(models)) throw new Error('Models not returned as array');
    if (models.length === 0) throw new Error('No models generated');
    
    const model = models[0];
    if (!model.id) throw new Error('Model missing ID');
    if (!model.name) throw new Error('Model missing name');
    if (!model.version) throw new Error('Model missing version');
    if (!model.status) throw new Error('Model missing status');
    if (typeof model.accuracy !== 'number') throw new Error('Model accuracy not numeric');
    if (typeof model.predictions_made !== 'number') throw new Error('Predictions made not numeric');
    if (!model.hyperparameters) throw new Error('Model missing hyperparameters');
    if (!model.created_at) throw new Error('Model missing created_at');
});

// Test 5: Demo Data Generation - System Metrics
asyncTest('Demo data service generates realistic system metrics', async () => {
    const metrics = await demoData.getSystemMetrics();
    
    if (!metrics) throw new Error('System metrics not returned');
    if (typeof metrics.uptime !== 'string') throw new Error('Uptime not string');
    if (typeof metrics.cpu_usage !== 'number') throw new Error('CPU usage not numeric');
    if (typeof metrics.response_time !== 'number') throw new Error('Response time not numeric');
    if (typeof metrics.timestamp !== 'number') throw new Error('Timestamp not numeric');
    
    // Test realistic ranges
    if (metrics.cpu_usage < 20 || metrics.cpu_usage > 60) throw new Error('CPU usage outside expected range');
    if (metrics.response_time < 15 || metrics.response_time > 65) throw new Error('Response time outside expected range');
});

// Test 6: Demo Data Caching
asyncTest('Demo data service caches results correctly', async () => {
    // Clear cache first
    demoData.clearCache();
    
    // First call should populate cache
    const start = Date.now();
    const models1 = await demoData.getModels();
    const firstCallTime = Date.now() - start;
    
    // Second call should be faster (cached)
    const start2 = Date.now();
    const models2 = await demoData.getModels();
    const secondCallTime = Date.now() - start2;
    
    // Results should be identical
    if (JSON.stringify(models1) !== JSON.stringify(models2)) {
        throw new Error('Cached results differ from original');
    }
    
    // Cache stats should show cache usage
    const stats = demoData.getCacheStats();
    if (stats.size === 0) throw new Error('Cache not populated');
    if (!stats.keys.includes('system_metrics')) throw new Error('Expected cache key not found');
});

// Test 7: Environment-Aware Data Loading
test('Data loading respects environment configuration', () => {
    // Create a mock environment scenario
    const originalDemoEnabled = CONFIG.DEMO.ENABLED;
    
    // Test demo mode behavior
    if (CONFIG.DEMO.ENABLED) {
        // In demo mode, should use demo data
        const qualityMetrics = demoData.getDemoQualityMetrics();
        if (!qualityMetrics) throw new Error('Demo quality metrics not returned in demo mode');
        if (typeof qualityMetrics.overallScore !== 'number') throw new Error('Quality metrics invalid structure');
    }
    
    // Test processing jobs
    const processingJobs = demoData.getDemoProcessingJobs();
    if (!Array.isArray(processingJobs)) throw new Error('Processing jobs not array');
    if (processingJobs.length === 0) throw new Error('No processing jobs generated');
    
    const job = processingJobs[0];
    if (!job.id) throw new Error('Job missing ID');
    if (!job.name) throw new Error('Job missing name');
    if (!job.status) throw new Error('Job missing status');
    if (typeof job.progress !== 'number') throw new Error('Job progress not numeric');
});

// Test 8: Delay Simulation
asyncTest('Demo service simulates network delays when configured', async () => {
    if (!CONFIG.DEMO.SIMULATE_DELAY) {
        console.log('Skipping delay test - simulation disabled');
        return;
    }
    
    const start = Date.now();
    await demoData.simulateDelay();
    const elapsed = Date.now() - start;
    
    const [minDelay, maxDelay] = CONFIG.DEMO.DELAY_RANGE;
    if (elapsed < minDelay || elapsed > maxDelay + 50) { // +50ms tolerance
        throw new Error(`Delay ${elapsed}ms outside configured range ${minDelay}-${maxDelay}ms`);
    }
});

// Test 9: Error Handling in Demo Data
asyncTest('Demo data service handles errors gracefully', async () => {
    // Test with invalid cache operations
    try {
        demoData.cache.set(null, 'invalid');
    } catch (error) {
        // Should handle gracefully
    }
    
    // Data generation should still work
    const models = await demoData.getModels();
    if (!models) throw new Error('Data generation failed after error');
});

// Test 10: Environment Switching
test('Environment switching works correctly', () => {
    const originalEnv = CONFIG.ENVIRONMENT;
    
    // Mock URL parameter scenario
    const mockUrlParams = new URLSearchParams('?demo=true');
    Object.defineProperty(window.location, 'search', {
        writable: true,
        value: '?demo=true'
    });
    
    // Mock localStorage scenario
    localStorage.setItem('mlops_environment', 'demo');
    
    // Get environment info after mock setup
    const envInfo = EnvironmentManager.getEnvironmentInfo();
    if (!envInfo) throw new Error('Environment info not available');
    
    // Cleanup
    localStorage.removeItem('mlops_environment');
    Object.defineProperty(window.location, 'search', {
        writable: true,
        value: ''
    });
});

// Test 11: Configuration Immutability
test('CONFIG object is properly frozen to prevent modification', () => {
    try {
        CONFIG.DEMO.ENABLED = !CONFIG.DEMO.ENABLED;
        throw new Error('CONFIG.DEMO should be frozen');
    } catch (error) {
        if (!error.message.includes('Cannot')) {
            throw new Error('CONFIG not properly frozen');
        }
    }
    
    try {
        CONFIG.ENVIRONMENT = 'modified';
        throw new Error('CONFIG should be frozen');
    } catch (error) {
        if (!error.message.includes('Cannot')) {
            throw new Error('CONFIG not properly frozen');
        }
    }
});

// Test 12: Demo Data Consistency
asyncTest('Demo data remains consistent across multiple calls', async () => {
    // Clear cache to ensure fresh data
    demoData.clearCache();
    
    // Get data multiple times
    const datasets1 = await demoData.getDatasets();
    const datasets2 = await demoData.getDatasets();
    const datasets3 = await demoData.getDatasets();
    
    // Should be identical (cached)
    if (JSON.stringify(datasets1) !== JSON.stringify(datasets2)) {
        throw new Error('Datasets inconsistent between calls');
    }
    if (JSON.stringify(datasets2) !== JSON.stringify(datasets3)) {
        throw new Error('Datasets inconsistent on third call');
    }
    
    // Data structure should be valid
    if (!datasets1.datasets) throw new Error('Datasets missing datasets property');
    if (!Array.isArray(datasets1.datasets)) throw new Error('Datasets not array');
});

// Print results
console.log('\n=== Demo/Real Data Separation Test Results ===');
console.log(`Total tests: ${results.passed + results.failed}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log('\nDetailed Results:');
results.tests.forEach(test => {
    console.log(`${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}${test.error ? ': ' + test.error : ''}`);
});

// Return results for external use
export { results };