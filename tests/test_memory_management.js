/**
 * Memory Management Test Suite
 * Tests BasePageController lifecycle management, memory cleanup, and leak prevention
 */

import { BasePageController } from '../static/js/common/lifecycle.js';

console.log('Testing Memory Management...');

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

// Test 1: BasePageController Instantiation
test('BasePageController instantiates with lifecycle manager', () => {
    class TestController extends BasePageController {
        constructor() {
            super();
        }
    }
    
    const controller = new TestController();
    if (!controller.lifecycleManager) throw new Error('LifecycleManager not initialized');
    if (typeof controller.addEventListener !== 'function') throw new Error('addEventListener method missing');
    if (typeof controller.addTimer !== 'function') throw new Error('addTimer method missing');
    if (typeof controller.addWebSocketHandler !== 'function') throw new Error('addWebSocketHandler method missing');
});

// Test 2: Event Listener Management
test('Event listeners are properly tracked and cleaned up', () => {
    class TestController extends BasePageController {
        constructor() {
            super();
            this.testElement = document.createElement('div');
            document.body.appendChild(this.testElement);
        }
    }
    
    const controller = new TestController();
    let callbackExecuted = false;
    
    // Add event listener
    controller.addEventListener(controller.testElement, 'click', () => {
        callbackExecuted = true;
    });
    
    // Verify listener is tracked
    if (controller.lifecycleManager.eventListeners.size === 0) {
        throw new Error('Event listener not tracked');
    }
    
    // Trigger event to verify it works
    controller.testElement.click();
    if (!callbackExecuted) throw new Error('Event listener not working');
    
    // Cleanup and verify removal
    controller.destroy();
    if (controller.lifecycleManager.eventListeners.size !== 0) {
        throw new Error('Event listeners not cleaned up');
    }
    
    // Cleanup test element
    document.body.removeChild(controller.testElement);
});

// Test 3: Timer Management
asyncTest('Timers are properly tracked and cleaned up', async () => {
    class TestController extends BasePageController {
        constructor() {
            super();
        }
    }
    
    const controller = new TestController();
    let timerExecuted = false;
    
    // Add timer
    const timerId = controller.addTimer(() => {
        timerExecuted = true;
    }, 10);
    
    // Verify timer is tracked
    if (controller.lifecycleManager.timers.size === 0) {
        throw new Error('Timer not tracked');
    }
    
    // Wait for timer to execute
    await new Promise(resolve => setTimeout(resolve, 20));
    if (!timerExecuted) throw new Error('Timer did not execute');
    
    // Add another timer and cleanup before execution
    let secondTimerExecuted = false;
    controller.addTimer(() => {
        secondTimerExecuted = true;
    }, 100);
    
    // Cleanup and verify removal
    controller.destroy();
    if (controller.lifecycleManager.timers.size !== 0) {
        throw new Error('Timers not cleaned up');
    }
    
    // Wait to ensure second timer was canceled
    await new Promise(resolve => setTimeout(resolve, 150));
    if (secondTimerExecuted) throw new Error('Timer not properly canceled during cleanup');
});

// Test 4: WebSocket Handler Management
test('WebSocket handlers are properly tracked and cleaned up', () => {
    class TestController extends BasePageController {
        constructor() {
            super();
        }
    }
    
    const controller = new TestController();
    let handlerExecuted = false;
    
    // Add WebSocket handler
    controller.addWebSocketHandler('test_event', (data) => {
        handlerExecuted = true;
    });
    
    // Verify handler is tracked
    if (controller.lifecycleManager.webSocketHandlers.size === 0) {
        throw new Error('WebSocket handler not tracked');
    }
    
    // Cleanup and verify removal
    controller.destroy();
    if (controller.lifecycleManager.webSocketHandlers.size !== 0) {
        throw new Error('WebSocket handlers not cleaned up');
    }
});

// Test 5: Custom Cleanup Functionality
test('Custom cleanup methods are called during destroy', () => {
    let customCleanupCalled = false;
    
    class TestController extends BasePageController {
        constructor() {
            super();
        }
        
        customCleanup() {
            customCleanupCalled = true;
        }
    }
    
    const controller = new TestController();
    controller.destroy();
    
    if (!customCleanupCalled) throw new Error('Custom cleanup method not called');
});

// Test 6: Memory Leak Prevention with Multiple Controllers
asyncTest('Multiple controllers clean up independently', async () => {
    class TestController extends BasePageController {
        constructor(id) {
            super();
            this.id = id;
            this.timersAdded = 0;
            this.listenersAdded = 0;
        }
        
        addTestTimer() {
            this.addTimer(() => {}, 1000);
            this.timersAdded++;
        }
        
        addTestListener() {
            const element = document.createElement('div');
            this.addEventListener(element, 'click', () => {});
            this.listenersAdded++;
        }
    }
    
    const controller1 = new TestController('c1');
    const controller2 = new TestController('c2');
    
    // Add resources to both controllers
    controller1.addTestTimer();
    controller1.addTestListener();
    controller2.addTestTimer();
    controller2.addTestListener();
    
    // Verify both have resources
    if (controller1.lifecycleManager.timers.size !== 1) throw new Error('Controller 1 timer not tracked');
    if (controller1.lifecycleManager.eventListeners.size !== 1) throw new Error('Controller 1 listener not tracked');
    if (controller2.lifecycleManager.timers.size !== 1) throw new Error('Controller 2 timer not tracked');
    if (controller2.lifecycleManager.eventListeners.size !== 1) throw new Error('Controller 2 listener not tracked');
    
    // Destroy only controller1
    controller1.destroy();
    
    // Verify controller1 is cleaned up but controller2 is not
    if (controller1.lifecycleManager.timers.size !== 0) throw new Error('Controller 1 not cleaned up');
    if (controller1.lifecycleManager.eventListeners.size !== 0) throw new Error('Controller 1 not cleaned up');
    if (controller2.lifecycleManager.timers.size !== 1) throw new Error('Controller 2 affected by controller 1 cleanup');
    if (controller2.lifecycleManager.eventListeners.size !== 1) throw new Error('Controller 2 affected by controller 1 cleanup');
    
    // Cleanup controller2
    controller2.destroy();
    if (controller2.lifecycleManager.timers.size !== 0) throw new Error('Controller 2 not cleaned up');
    if (controller2.lifecycleManager.eventListeners.size !== 0) throw new Error('Controller 2 not cleaned up');
});

// Test 7: Cleanup Callback Registration
test('Cleanup callbacks are properly registered and executed', () => {
    class TestController extends BasePageController {
        constructor() {
            super();
        }
    }
    
    const controller = new TestController();
    let callback1Called = false;
    let callback2Called = false;
    
    // Register cleanup callbacks
    controller.lifecycleManager.addCleanupCallback(() => {
        callback1Called = true;
    });
    
    controller.lifecycleManager.addCleanupCallback(() => {
        callback2Called = true;
    });
    
    // Verify callbacks are tracked
    if (controller.lifecycleManager.cleanupCallbacks.size !== 2) {
        throw new Error('Cleanup callbacks not tracked');
    }
    
    // Cleanup and verify callbacks were executed
    controller.destroy();
    if (!callback1Called) throw new Error('Cleanup callback 1 not executed');
    if (!callback2Called) throw new Error('Cleanup callback 2 not executed');
});

// Test 8: Error Handling in Cleanup
test('Cleanup continues even if individual cleanup fails', () => {
    class TestController extends BasePageController {
        constructor() {
            super();
        }
        
        customCleanup() {
            throw new Error('Custom cleanup error');
        }
    }
    
    const controller = new TestController();
    
    // Add timer that should still be cleaned up despite custom cleanup error
    controller.addTimer(() => {}, 1000);
    
    // This should not throw despite custom cleanup error
    controller.destroy();
    
    // Verify timer was still cleaned up
    if (controller.lifecycleManager.timers.size !== 0) {
        throw new Error('Timer not cleaned up despite custom cleanup error');
    }
});

// Print results
console.log('\n=== Memory Management Test Results ===');
console.log(`Total tests: ${results.passed + results.failed}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log('\nDetailed Results:');
results.tests.forEach(test => {
    console.log(`${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}${test.error ? ': ' + test.error : ''}`);
});

// Return results for external use
export { results };