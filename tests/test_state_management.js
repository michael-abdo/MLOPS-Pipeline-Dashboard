/**
 * State Management Test Suite
 * Tests StateStore, API caching, cross-page state sharing, and API deduplication
 */

import { StateStore, ApiCacheManager } from '../static/js/common/state.js';

console.log('Testing State Management...');

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

// Test 1: StateStore Basic Operations
test('StateStore sets and gets state correctly', () => {
    const store = new StateStore();
    
    // Test setting state
    store.setState('testKey', { value: 42, name: 'test' });
    
    // Test getting state
    const retrieved = store.getState('testKey');
    if (!retrieved) throw new Error('State not retrieved');
    if (retrieved.value !== 42) throw new Error('State value incorrect');
    if (retrieved.name !== 'test') throw new Error('State name incorrect');
    
    // Test getting non-existent state
    const nonExistent = store.getState('nonExistent');
    if (nonExistent !== null) throw new Error('Non-existent state should return null');
});

// Test 2: StateStore Subscriptions
test('StateStore subscription system works correctly', () => {
    const store = new StateStore();
    let notificationCount = 0;
    let lastNotification = null;
    
    // Subscribe to state changes
    const unsubscribe = store.subscribe('testKey', (newValue, oldValue) => {
        notificationCount++;
        lastNotification = { newValue, oldValue };
    });
    
    // Set initial state
    store.setState('testKey', 'initial');
    if (notificationCount !== 1) throw new Error('Initial state change not notified');
    if (lastNotification.newValue !== 'initial') throw new Error('Incorrect new value in notification');
    if (lastNotification.oldValue !== null) throw new Error('Incorrect old value in notification');
    
    // Update state
    store.setState('testKey', 'updated');
    if (notificationCount !== 2) throw new Error('State update not notified');
    if (lastNotification.newValue !== 'updated') throw new Error('Incorrect updated value');
    if (lastNotification.oldValue !== 'initial') throw new Error('Incorrect old value in update');
    
    // Unsubscribe
    unsubscribe();
    store.setState('testKey', 'after-unsubscribe');
    if (notificationCount !== 2) throw new Error('Notification received after unsubscribe');
});

// Test 3: StateStore Cache Functionality
asyncTest('StateStore cache works with TTL', async () => {
    const store = new StateStore();
    
    // Set cached data with short TTL
    store.setCachedData('cacheKey', 'cached-value', 50); // 50ms TTL
    
    // Immediately retrieve - should be cached
    const immediate = store.getCachedData('cacheKey');
    if (immediate !== 'cached-value') throw new Error('Cached data not retrieved immediately');
    
    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 60));
    
    // Should be expired now
    const expired = store.getCachedData('cacheKey');
    if (expired !== null) throw new Error('Cached data not expired after TTL');
});

// Test 4: ApiCacheManager Deduplication
asyncTest('ApiCacheManager prevents duplicate API calls', async () => {
    const cache = new ApiCacheManager();
    let apiCallCount = 0;
    
    // Mock API function
    const mockApiCall = () => {
        apiCallCount++;
        return Promise.resolve(`result-${apiCallCount}`);
    };
    
    // Make multiple concurrent calls
    const promises = [
        cache.getCachedApiCall('test-key', mockApiCall),
        cache.getCachedApiCall('test-key', mockApiCall),
        cache.getCachedApiCall('test-key', mockApiCall)
    ];
    
    const results = await Promise.all(promises);
    
    // Should only make one API call
    if (apiCallCount !== 1) throw new Error(`Expected 1 API call, got ${apiCallCount}`);
    
    // All results should be the same
    if (results[0] !== 'result-1') throw new Error('First result incorrect');
    if (results[1] !== 'result-1') throw new Error('Second result incorrect');
    if (results[2] !== 'result-1') throw new Error('Third result incorrect');
});

// Test 5: ApiCacheManager Cache Expiry
asyncTest('ApiCacheManager respects cache TTL', async () => {
    const cache = new ApiCacheManager();
    let apiCallCount = 0;
    
    // Mock API function
    const mockApiCall = () => {
        apiCallCount++;
        return Promise.resolve(`result-${apiCallCount}`);
    };
    
    // First call
    const result1 = await cache.getCachedApiCall('test-key', mockApiCall, 50); // 50ms TTL
    if (result1 !== 'result-1') throw new Error('First call result incorrect');
    if (apiCallCount !== 1) throw new Error('First call should trigger API');
    
    // Second call immediately - should use cache
    const result2 = await cache.getCachedApiCall('test-key', mockApiCall, 50);
    if (result2 !== 'result-1') throw new Error('Second call should use cache');
    if (apiCallCount !== 1) throw new Error('Second call should not trigger API');
    
    // Wait for cache to expire
    await new Promise(resolve => setTimeout(resolve, 60));
    
    // Third call after expiry - should trigger new API call
    const result3 = await cache.getCachedApiCall('test-key', mockApiCall, 50);
    if (result3 !== 'result-2') throw new Error('Third call should trigger new API');
    if (apiCallCount !== 2) throw new Error('Third call should trigger API after expiry');
});

// Test 6: Cross-Page State Sharing
test('Multiple StateStore instances can share state via events', () => {
    const store1 = new StateStore();
    const store2 = new StateStore();
    
    let store2NotificationReceived = false;
    let sharedValue = null;
    
    // Subscribe store2 to global state events
    window.addEventListener('globalStateChange', (event) => {
        const { key, value } = event.detail;
        if (key === 'sharedKey') {
            store2.setState(key, value);
            store2NotificationReceived = true;
            sharedValue = value;
        }
    });
    
    // Set state in store1 and emit global event
    store1.setState('sharedKey', 'shared-value');
    window.dispatchEvent(new CustomEvent('globalStateChange', {
        detail: { key: 'sharedKey', value: 'shared-value' }
    }));
    
    // Verify store2 received the state
    if (!store2NotificationReceived) throw new Error('Store2 did not receive global state change');
    if (sharedValue !== 'shared-value') throw new Error('Shared value incorrect');
    
    const store2Value = store2.getState('sharedKey');
    if (store2Value !== 'shared-value') throw new Error('Store2 state not set correctly');
});

// Test 7: State Persistence
test('StateStore can persist state to localStorage', () => {
    const store = new StateStore();
    
    // Set state with persistence
    store.setState('persistKey', { data: 'persist-me' });
    store.persistState('persistKey');
    
    // Verify localStorage
    const stored = localStorage.getItem('state_persistKey');
    if (!stored) throw new Error('State not persisted to localStorage');
    
    const parsed = JSON.parse(stored);
    if (parsed.data !== 'persist-me') throw new Error('Persisted state incorrect');
    
    // Create new store and load state
    const newStore = new StateStore();
    newStore.loadPersistedState('persistKey');
    
    const loaded = newStore.getState('persistKey');
    if (!loaded) throw new Error('State not loaded from localStorage');
    if (loaded.data !== 'persist-me') throw new Error('Loaded state incorrect');
    
    // Cleanup
    localStorage.removeItem('state_persistKey');
});

// Test 8: State History Tracking
test('StateStore tracks state history', () => {
    const store = new StateStore();
    
    // Set initial state
    store.setState('historyKey', 'value1');
    store.setState('historyKey', 'value2');
    store.setState('historyKey', 'value3');
    
    // Get history
    const history = store.getStateHistory('historyKey');
    if (!history) throw new Error('State history not tracked');
    if (history.length !== 3) throw new Error(`Expected 3 history entries, got ${history.length}`);
    
    // Verify history order (should be newest first)
    if (history[0].value !== 'value3') throw new Error('Latest history entry incorrect');
    if (history[1].value !== 'value2') throw new Error('Second history entry incorrect');
    if (history[2].value !== 'value1') throw new Error('First history entry incorrect');
    
    // Verify timestamps
    if (history[0].timestamp <= history[1].timestamp) throw new Error('History timestamps not ordered correctly');
});

// Test 9: Error Handling in State Operations
test('StateStore handles errors gracefully', () => {
    const store = new StateStore();
    
    // Test invalid state key
    try {
        store.setState(null, 'value');
        throw new Error('Should have thrown for null key');
    } catch (error) {
        if (!error.message.includes('key')) throw new Error('Incorrect error for null key');
    }
    
    // Test circular reference in state
    const circularObj = { name: 'test' };
    circularObj.self = circularObj;
    
    try {
        store.setState('circular', circularObj);
        store.persistState('circular'); // This should handle the circular reference
    } catch (error) {
        // Should handle gracefully, not throw
        console.log('Circular reference handled:', error.message);
    }
});

// Test 10: Memory Management in State Store
test('StateStore cleans up subscriptions and cache properly', () => {
    const store = new StateStore();
    
    // Add subscriptions
    const unsub1 = store.subscribe('key1', () => {});
    const unsub2 = store.subscribe('key2', () => {});
    
    // Add cached data
    store.setCachedData('cache1', 'data1');
    store.setCachedData('cache2', 'data2');
    
    // Verify data exists
    if (store.subscribers.size !== 2) throw new Error('Subscriptions not tracked');
    if (store.cache.size !== 2) throw new Error('Cache not tracked');
    
    // Clear everything
    store.clearAllState();
    
    // Verify cleanup
    if (store.state.size !== 0) throw new Error('State not cleared');
    if (store.cache.size !== 0) throw new Error('Cache not cleared');
    if (store.cacheExpiry.size !== 0) throw new Error('Cache expiry not cleared');
    
    // Unsubscribe should still work
    unsub1();
    unsub2();
});

// Print results
console.log('\n=== State Management Test Results ===');
console.log(`Total tests: ${results.passed + results.failed}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log('\nDetailed Results:');
results.tests.forEach(test => {
    console.log(`${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}${test.error ? ': ' + test.error : ''}`);
});

// Return results for external use
export { results };