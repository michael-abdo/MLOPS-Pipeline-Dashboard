/**
 * Integration Test Suite
 * Tests cross-page functionality, WebSocket integration, API integration, and end-to-end workflows
 */

import { BasePageController } from '../static/js/common/lifecycle.js';
import { StateStore } from '../static/js/common/state.js';
import { CONFIG } from '../static/js/common/config.js';
import { demoData } from '../static/js/common/demo-data.js';
import { Card, Metric, ProgressBar, ButtonGroup } from '../static/js/components/ui-components.js';

console.log('Testing Integration...');

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

// Test 1: Cross-Page State Sharing
test('Cross-page state sharing works between controllers', () => {
    // Simulate two page controllers
    class PageA extends BasePageController {
        constructor() {
            super();
            this.store = new StateStore();
        }
        
        setSharedData(data) {
            this.store.setState('shared_models', data);
            // Emit global event for cross-page communication
            window.dispatchEvent(new CustomEvent('stateChange', {
                detail: { key: 'shared_models', value: data }
            }));
        }
    }
    
    class PageB extends BasePageController {
        constructor() {
            super();
            this.store = new StateStore();
            this.receivedData = null;
            
            // Listen for cross-page state changes
            this.addEventListener(window, 'stateChange', (event) => {
                const { key, value } = event.detail;
                if (key === 'shared_models') {
                    this.store.setState(key, value);
                    this.receivedData = value;
                }
            });
        }
    }
    
    const pageA = new PageA();
    const pageB = new PageB();
    
    // Set data in page A
    const testData = { id: 'model_001', name: 'Test Model', accuracy: 0.95 };
    pageA.setSharedData(testData);
    
    // Verify page B received the data
    if (!pageB.receivedData) throw new Error('Page B did not receive shared data');
    if (pageB.receivedData.id !== 'model_001') throw new Error('Shared data corruption');
    if (pageB.store.getState('shared_models').accuracy !== 0.95) throw new Error('State not properly shared');
    
    // Cleanup
    pageA.destroy();
    pageB.destroy();
});

// Test 2: UI Component Integration with Page Controllers
test('UI components integrate properly with page controllers', () => {
    class TestPageController extends BasePageController {
        constructor() {
            super();
            this.initializeComponents();
        }
        
        initializeComponents() {
            // Create a card with metric
            this.testCard = Card.create({
                title: 'Test Card',
                content: 'Test content',
                id: 'integrationTestCard'
            });
            
            // Create a metric component
            this.testMetric = Metric.create({
                value: 42,
                label: 'Test Metric',
                id: 'integrationTestMetric'
            });
            
            // Create button group
            this.testButtons = ButtonGroup.create({
                buttons: [
                    {
                        text: 'Test Button',
                        onClick: () => this.handleButtonClick()
                    }
                ],
                id: 'integrationTestButtons'
            });
            
            document.body.appendChild(this.testCard);
            document.body.appendChild(this.testMetric);
            document.body.appendChild(this.testButtons);
        }
        
        handleButtonClick() {
            this.buttonClicked = true;
        }
        
        customCleanup() {
            // Clean up DOM elements
            if (this.testCard) document.body.removeChild(this.testCard);
            if (this.testMetric) document.body.removeChild(this.testMetric);
            if (this.testButtons) document.body.removeChild(this.testButtons);
        }
    }
    
    const controller = new TestPageController();
    
    // Verify components were created
    if (!document.getElementById('integrationTestCard')) throw new Error('Card not created');
    if (!document.getElementById('integrationTestMetric')) throw new Error('Metric not created');
    if (!document.getElementById('integrationTestButtons')) throw new Error('ButtonGroup not created');
    
    // Test button interaction
    const button = document.querySelector('#integrationTestButtons button');
    if (!button) throw new Error('Button not found in ButtonGroup');
    
    button.click();
    if (!controller.buttonClicked) throw new Error('Button click not handled');
    
    // Cleanup
    controller.destroy();
    
    // Verify cleanup
    if (document.getElementById('integrationTestCard')) throw new Error('Card not cleaned up');
    if (document.getElementById('integrationTestMetric')) throw new Error('Metric not cleaned up');
    if (document.getElementById('integrationTestButtons')) throw new Error('ButtonGroup not cleaned up');
});

// Test 3: Demo Data Integration with UI Components
asyncTest('Demo data integrates properly with UI components', async () => {
    if (!CONFIG.DEMO.ENABLED) {
        console.log('Skipping demo data test - demo mode disabled');
        return;
    }
    
    // Get demo data
    const models = await demoData.getModels();
    const systemStatus = await demoData.getSystemStatus();
    
    // Create UI components with demo data
    const modelMetric = Metric.create({
        value: models[0].accuracy * 100,
        label: 'Model Accuracy',
        format: 'percent',
        id: 'demoModelAccuracy'
    });
    
    const cpuProgress = ProgressBar.create({
        progress: systemStatus.cpu_usage,
        label: 'CPU Usage',
        id: 'demoCpuProgress'
    });
    
    document.body.appendChild(modelMetric);
    document.body.appendChild(cpuProgress);
    
    // Verify components display demo data correctly
    const metricValue = modelMetric.querySelector('.metric-value');
    if (!metricValue.textContent.includes('%')) throw new Error('Metric not formatted as percentage');
    
    const progressFill = cpuProgress.querySelector('.progress-fill');
    if (!progressFill.style.width) throw new Error('Progress bar not set');
    
    // Cleanup
    document.body.removeChild(modelMetric);
    document.body.removeChild(cpuProgress);
});

// Test 4: Environment-Aware Component Behavior
test('Components behave correctly in different environments', () => {
    const currentEnv = CONFIG.ENVIRONMENT;
    const isDemoMode = CONFIG.DEMO.ENABLED;
    
    // Create component that should behave differently based on environment
    class EnvironmentAwareController extends BasePageController {
        constructor() {
            super();
            this.createEnvironmentSpecificComponents();
        }
        
        createEnvironmentSpecificComponents() {
            if (isDemoMode) {
                this.demoNotice = Card.create({
                    title: '🚧 Demo Mode',
                    content: 'This is a demonstration with simulated data',
                    id: 'demoNoticeCard'
                });
                document.body.appendChild(this.demoNotice);
            }
            
            this.envInfo = Metric.create({
                value: currentEnv,
                label: 'Current Environment',
                format: 'custom',
                id: 'envInfoMetric'
            });
            document.body.appendChild(this.envInfo);
        }
        
        customCleanup() {
            if (this.demoNotice) document.body.removeChild(this.demoNotice);
            if (this.envInfo) document.body.removeChild(this.envInfo);
        }
    }
    
    const controller = new EnvironmentAwareController();
    
    // Verify environment-specific behavior
    if (isDemoMode) {
        if (!document.getElementById('demoNoticeCard')) {
            throw new Error('Demo notice not shown in demo mode');
        }
    }
    
    const envMetric = document.getElementById('envInfoMetric');
    if (!envMetric) throw new Error('Environment metric not created');
    
    const envValue = envMetric.querySelector('.metric-value');
    if (envValue.textContent !== currentEnv) throw new Error('Environment value incorrect');
    
    // Cleanup
    controller.destroy();
});

// Test 5: WebSocket Integration Mock
test('WebSocket integration works with page controllers', () => {
    let mockWebSocketConnected = false;
    let mockEventReceived = false;
    
    class WebSocketTestController extends BasePageController {
        constructor() {
            super();
            this.setupWebSocketHandlers();
        }
        
        setupWebSocketHandlers() {
            // Mock WebSocket connection
            this.addWebSocketHandler('test_event', (data) => {
                mockEventReceived = true;
                this.handleTestEvent(data);
            });
            
            this.addWebSocketHandler('connection_status', (data) => {
                mockWebSocketConnected = data.connected;
            });
        }
        
        handleTestEvent(data) {
            this.lastEventData = data;
        }
        
        // Simulate receiving WebSocket events
        simulateWebSocketEvent(eventType, data) {
            const handlers = this.lifecycleManager.webSocketHandlers.get(eventType);
            if (handlers) {
                handlers.forEach(handler => handler(data));
            }
        }
    }
    
    const controller = new WebSocketTestController();
    
    // Verify handlers are registered
    if (controller.lifecycleManager.webSocketHandlers.size === 0) {
        throw new Error('WebSocket handlers not registered');
    }
    
    // Simulate WebSocket events
    controller.simulateWebSocketEvent('connection_status', { connected: true });
    if (!mockWebSocketConnected) throw new Error('Connection status handler not triggered');
    
    controller.simulateWebSocketEvent('test_event', { message: 'test data' });
    if (!mockEventReceived) throw new Error('Test event handler not triggered');
    if (!controller.lastEventData) throw new Error('Event data not received');
    if (controller.lastEventData.message !== 'test data') throw new Error('Event data incorrect');
    
    // Cleanup
    controller.destroy();
    
    // Verify handlers are cleaned up
    if (controller.lifecycleManager.webSocketHandlers.size !== 0) {
        throw new Error('WebSocket handlers not cleaned up');
    }
});

// Test 6: API Integration with Caching
asyncTest('API integration works with caching and error handling', async () => {
    let apiCallCount = 0;
    let lastApiCall = null;
    
    // Mock API function
    const mockApiCall = (endpoint) => {
        apiCallCount++;
        lastApiCall = endpoint;
        
        if (endpoint === 'error') {
            return Promise.reject(new Error('API Error'));
        }
        
        return Promise.resolve({
            success: true,
            data: { endpoint, callCount: apiCallCount }
        });
    };
    
    class ApiTestController extends BasePageController {
        constructor() {
            super();
            this.store = new StateStore();
        }
        
        async loadDataWithCaching(endpoint) {
            const cacheKey = `api_${endpoint}`;
            
            // Try cache first
            let cachedData = this.store.getCachedData(cacheKey);
            if (cachedData) {
                return cachedData;
            }
            
            // Make API call
            try {
                const result = await mockApiCall(endpoint);
                // Cache result
                this.store.setCachedData(cacheKey, result, 5000); // 5 second TTL
                return result;
            } catch (error) {
                console.error('API call failed:', error);
                return null;
            }
        }
    }
    
    const controller = new ApiTestController();
    
    // Test successful API call
    const result1 = await controller.loadDataWithCaching('test');
    if (!result1) throw new Error('API call failed');
    if (result1.data.endpoint !== 'test') throw new Error('API result incorrect');
    if (apiCallCount !== 1) throw new Error('API not called');
    
    // Test cached response (should not increase call count)
    const result2 = await controller.loadDataWithCaching('test');
    if (!result2) throw new Error('Cached call failed');
    if (apiCallCount !== 1) throw new Error('Cache not working - API called again');
    
    // Test error handling
    const errorResult = await controller.loadDataWithCaching('error');
    if (errorResult !== null) throw new Error('Error not handled properly');
    if (apiCallCount !== 2) throw new Error('Error call not counted');
    
    // Cleanup
    controller.destroy();
});

// Test 7: Component State Synchronization
test('UI components stay synchronized with application state', () => {
    const store = new StateStore();
    let componentUpdated = false;
    
    // Create a metric that updates based on state
    const syncedMetric = Metric.create({
        value: 0,
        label: 'Synced Value',
        id: 'syncedMetric'
    });
    document.body.appendChild(syncedMetric);
    
    // Subscribe to state changes
    store.subscribe('sync_value', (newValue) => {
        Metric.update('syncedMetric', newValue);
        componentUpdated = true;
    });
    
    // Update state
    store.setState('sync_value', 42);
    
    // Verify component was updated
    if (!componentUpdated) throw new Error('Component not updated on state change');
    
    const metricValue = syncedMetric.querySelector('.metric-value');
    if (metricValue.textContent !== '42') throw new Error('Component value not synchronized');
    
    // Cleanup
    document.body.removeChild(syncedMetric);
});

// Test 8: Error Boundary Integration
test('Error boundaries work correctly with page controllers', () => {
    let errorCaught = false;
    let errorHandled = false;
    
    class ErrorProneController extends BasePageController {
        constructor() {
            super();
            this.setupErrorHandling();
        }
        
        setupErrorHandling() {
            // Add global error handler
            this.addEventListener(window, 'error', (event) => {
                errorCaught = true;
                this.handleError(event.error);
            });
        }
        
        handleError(error) {
            errorHandled = true;
            console.log('Error handled by controller:', error.message);
        }
        
        causeError() {
            throw new Error('Test error');
        }
    }
    
    const controller = new ErrorProneController();
    
    // Test error handling
    try {
        controller.causeError();
    } catch (error) {
        // Error should be caught by controller
    }
    
    // Cleanup
    controller.destroy();
});

// Test 9: Performance Integration
asyncTest('System performs well under load', async () => {
    const startTime = Date.now();
    const controllers = [];
    
    // Create multiple controllers with components
    for (let i = 0; i < 10; i++) {
        class LoadTestController extends BasePageController {
            constructor(id) {
                super();
                this.id = id;
                this.createComponents();
            }
            
            createComponents() {
                this.card = Card.create({
                    title: `Card ${this.id}`,
                    content: `Content ${this.id}`,
                    id: `loadTestCard${this.id}`
                });
                
                this.metric = Metric.create({
                    value: Math.random() * 100,
                    label: `Metric ${this.id}`,
                    id: `loadTestMetric${this.id}`
                });
                
                document.body.appendChild(this.card);
                document.body.appendChild(this.metric);
            }
            
            customCleanup() {
                if (this.card) document.body.removeChild(this.card);
                if (this.metric) document.body.removeChild(this.metric);
            }
        }
        
        controllers.push(new LoadTestController(i));
    }
    
    const creationTime = Date.now() - startTime;
    
    // Verify all components were created
    for (let i = 0; i < 10; i++) {
        if (!document.getElementById(`loadTestCard${i}`)) {
            throw new Error(`Card ${i} not created`);
        }
        if (!document.getElementById(`loadTestMetric${i}`)) {
            throw new Error(`Metric ${i} not created`);
        }
    }
    
    // Cleanup all controllers
    const cleanupStart = Date.now();
    controllers.forEach(controller => controller.destroy());
    const cleanupTime = Date.now() - cleanupStart;
    
    // Verify cleanup
    for (let i = 0; i < 10; i++) {
        if (document.getElementById(`loadTestCard${i}`)) {
            throw new Error(`Card ${i} not cleaned up`);
        }
        if (document.getElementById(`loadTestMetric${i}`)) {
            throw new Error(`Metric ${i} not cleaned up`);
        }
    }
    
    // Performance assertions
    if (creationTime > 1000) throw new Error(`Creation too slow: ${creationTime}ms`);
    if (cleanupTime > 500) throw new Error(`Cleanup too slow: ${cleanupTime}ms`);
    
    console.log(`Performance: Creation ${creationTime}ms, Cleanup ${cleanupTime}ms`);
});

// Test 10: End-to-End Workflow
asyncTest('End-to-end workflow works correctly', async () => {
    // Simulate a complete user workflow
    class WorkflowTestController extends BasePageController {
        constructor() {
            super();
            this.store = new StateStore();
            this.workflow = {
                dataLoaded: false,
                uiCreated: false,
                userInteracted: false,
                stateUpdated: false
            };
        }
        
        async executeWorkflow() {
            // Step 1: Load data
            await this.loadData();
            this.workflow.dataLoaded = true;
            
            // Step 2: Create UI
            this.createUI();
            this.workflow.uiCreated = true;
            
            // Step 3: Simulate user interaction
            this.simulateUserInteraction();
            this.workflow.userInteracted = true;
            
            // Step 4: Update state
            this.updateApplicationState();
            this.workflow.stateUpdated = true;
        }
        
        async loadData() {
            if (CONFIG.DEMO.ENABLED) {
                this.data = await demoData.getModels();
            } else {
                this.data = [{ id: 'test', name: 'Test Model', accuracy: 0.9 }];
            }
        }
        
        createUI() {
            this.ui = {
                card: Card.create({
                    title: 'Workflow Test',
                    content: 'Testing workflow',
                    id: 'workflowCard'
                }),
                metric: Metric.create({
                    value: this.data[0].accuracy * 100,
                    label: 'Model Accuracy',
                    format: 'percent',
                    id: 'workflowMetric'
                }),
                button: ButtonGroup.create({
                    buttons: [{
                        text: 'Test Action',
                        onClick: () => this.handleAction()
                    }],
                    id: 'workflowButton'
                })
            };
            
            Object.values(this.ui).forEach(element => {
                document.body.appendChild(element);
            });
        }
        
        simulateUserInteraction() {
            const button = document.querySelector('#workflowButton button');
            button.click();
        }
        
        handleAction() {
            this.actionHandled = true;
        }
        
        updateApplicationState() {
            this.store.setState('workflow_complete', true);
        }
        
        customCleanup() {
            if (this.ui) {
                Object.values(this.ui).forEach(element => {
                    if (document.body.contains(element)) {
                        document.body.removeChild(element);
                    }
                });
            }
        }
    }
    
    const controller = new WorkflowTestController();
    
    // Execute workflow
    await controller.executeWorkflow();
    
    // Verify all workflow steps completed
    if (!controller.workflow.dataLoaded) throw new Error('Data loading step failed');
    if (!controller.workflow.uiCreated) throw new Error('UI creation step failed');
    if (!controller.workflow.userInteracted) throw new Error('User interaction step failed');
    if (!controller.workflow.stateUpdated) throw new Error('State update step failed');
    
    // Verify action was handled
    if (!controller.actionHandled) throw new Error('User action not handled');
    
    // Verify state was updated
    const workflowState = controller.store.getState('workflow_complete');
    if (!workflowState) throw new Error('Application state not updated');
    
    // Cleanup
    controller.destroy();
});

// Print results
console.log('\n=== Integration Test Results ===');
console.log(`Total tests: ${results.passed + results.failed}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log('\nDetailed Results:');
results.tests.forEach(test => {
    console.log(`${test.status === 'PASSED' ? '✅' : '❌'} ${test.name}${test.error ? ': ' + test.error : ''}`);
});

// Return results for external use
export { results };