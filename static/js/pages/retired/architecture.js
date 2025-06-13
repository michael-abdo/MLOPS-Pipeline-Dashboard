import { wsManager } from '../common/websocket.js';
import { API } from '../common/api.js';
import { Card, Metric, ProgressBar, Grid, ButtonGroup, UploadArea, ChartContainer, initializeUIComponents } from '../components/ui-components.js';
import { BasePageController } from '../common/lifecycle.js';
import { demoData } from '../common/demo-data.js';
import { CONFIG } from '../common/config.js';
import { ErrorHandler, ErrorSeverity, ErrorCategory, RecoveryStrategy } from '../common/error-handler.js';
import { withErrorHandling } from '../common/error-utils.js';

/**
 * Architecture Page Controller
 * Handles system architecture visualization and component health monitoring
 */
class Architecture extends BasePageController {
    constructor() {
        super(); // Initialize lifecycle management
        
        this.components = {};
        this.metrics = {};
        
        this.init();
    }
    
    async init() {
        // Initialize components
        this.initializeComponents();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup WebSocket listeners
        this.setupWebSocketListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Start real-time updates
        this.startRealTimeUpdates();
    }
    
    initializeComponents() {
        // Initialize UI components
        initializeUIComponents();
        
        // Replace static cards with dynamic components
        this.renderDynamicCards();
    }
    
    setupEventListeners() {
        // Component interaction handlers - using managed event listeners
        const componentClickHandler = (e) => {
            if (e.target.matches('.arch-component')) {
                this.handleComponentClick(e.target);
            }
        };
        this.addEventListener(document, 'click', componentClickHandler);
        
        // Integration point interaction handlers - using managed event listeners
        const integrationClickHandler = (e) => {
            if (e.target.matches('.integration-item')) {
                this.handleIntegrationClick(e.target);
            }
        };
        this.addEventListener(document, 'click', integrationClickHandler);
    }
    
    setupWebSocketListeners() {
        // Component health updates - using managed WebSocket handlers
        this.addWebSocketHandler('component_health', (data) => {
            this.updateComponentHealth(data);
        });
        
        // System metrics updates - using managed WebSocket handlers
        this.addWebSocketHandler('system_metrics', (data) => {
            this.updateSystemMetrics(data);
        });
        
        // Integration status updates - using managed WebSocket handlers
        this.addWebSocketHandler('integration_status', (data) => {
            this.updateIntegrationStatus(data);
        });
    }
    
    async loadInitialData() {
        try {
            // Load component health
            await this.loadComponentHealth();
            
            // Load system metrics
            await this.loadSystemMetrics();
            
            // Load integration status
            await this.loadIntegrationStatus();
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.HIGH,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.RETRY,
                userMessage: 'Failed to load architecture data. Please check your connection and try again.',
                context: { component: 'Architecture', action: 'loadInitialData' }
            });
            this.showNotification('Failed to load architecture data', 'error');
        }
    }
    
    async loadComponentHealth() {
        try {
            // Load real component health from backend API
            const healthData = await API.getComponentsHealth();
            const components = healthData.components || [];
            
            // Transform backend data to frontend format
            const componentsByType = {
                frontend: {
                    dashboard: 'active',
                    websocketClient: wsManager.isConnected() ? 'connected' : 'disconnected',
                    apiClient: 'healthy'
                },
                backend: {}
            };
            
            // Map backend components
            components.forEach(component => {
                switch (component.name) {
                    case 'model_service':
                        componentsByType.backend.mlEngine = component.status;
                        break;
                    case 'websocket_server':
                        componentsByType.backend.websocketServer = component.status;
                        break;
                    case 'data_processor':
                        componentsByType.backend.dataProcessor = component.status;
                        break;
                    default:
                        componentsByType.backend[component.name] = component.status;
                }
            });
            
            // Add FastAPI server status (assume healthy if we got a response)
            componentsByType.backend.fastapiServer = 'healthy';
            
            this.components = componentsByType;
            this.updateComponentHealthDisplay(componentsByType);
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                userMessage: 'Unable to load component health status. Showing error state.',
                context: { component: 'Architecture', action: 'loadComponentHealth' }
            });
            // Fallback to default status
            this.components = {
                frontend: { dashboard: 'error', websocketClient: 'error', apiClient: 'error' },
                backend: { fastapiServer: 'error', websocketServer: 'error', mlEngine: 'error' }
            };
            this.updateComponentHealthDisplay(this.components);
        }
    }
    
    async loadSystemMetrics() {
        try {
            // Load real system metrics from backend API
            const metricsData = await API.getMonitoringMetrics();
            
            // Transform backend metrics to frontend format
            const metrics = {
                apiLatency: this.calculateAverageResponseTime(),
                wsLatency: wsManager.getConnectionQuality().latency || 0,
                throughput: CONFIG.DEMO.ENABLED ? 150 : 0, // Use demo value in demo mode
                cpuUsage: metricsData.cpu_usage || 0,
                memoryUsage: metricsData.memory_usage || 0,
                diskUsage: metricsData.disk_usage || 0
            };
            
            this.metrics = metrics;
            this.updateSystemMetricsDisplay(metrics);
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                userMessage: 'Unable to load system metrics. Showing default values.',
                context: { component: 'Architecture', action: 'loadSystemMetrics' }
            });
            // Fallback to default metrics
            const metrics = {
                apiLatency: 0,
                wsLatency: 0,
                throughput: 0,
                cpuUsage: 0,
                memoryUsage: 0,
                diskUsage: 0
            };
            this.metrics = metrics;
            this.updateSystemMetricsDisplay(metrics);
        }
    }
    
    calculateAverageResponseTime() {
        if (CONFIG.DEMO.ENABLED) {
            // Use demo data with some variation
            return Math.floor(Math.random() * 50) + 10; // 10-60ms
        } else {
            // Return 0 for production mode when no real data available
            return 0;
        }
    }
    
    async loadIntegrationStatus() {
        // Integration status is already rendered in HTML
        // In a real implementation, this would load status from backend
        this.showNotification('Integration status loaded', 'info');
    }
    
    updateComponentHealthDisplay(components) {
        // Component health is already rendered in HTML as static status
        // In a real implementation, this would update component status indicators
        this.showNotification('Component health updated', 'info');
    }
    
    updateSystemMetricsDisplay(metrics) {
        // Update system performance metrics
        const elements = {
            apiLatency: `${metrics.apiLatency}ms`,
            wsLatency: `${metrics.wsLatency}ms`,
            throughput: `${metrics.throughput}/s`
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    startRealTimeUpdates() {
        // Start periodic updates for real-time metrics using managed timer
        this.addTimer(() => {
            this.simulateMetricUpdates();
        }, 3000); // Update every 3 seconds
    }
    
    simulateMetricUpdates() {
        // Simulate real-time metric updates
        if (this.metrics) {
            // Simulate API latency fluctuation
            const currentLatency = this.metrics.apiLatency;
            const newLatency = Math.max(5, Math.min(100, currentLatency + (Math.random() - 0.5) * 10));
            this.metrics.apiLatency = Math.round(newLatency);
            
            // Simulate WebSocket latency fluctuation
            const currentWsLatency = this.metrics.wsLatency;
            const newWsLatency = Math.max(1, Math.min(50, currentWsLatency + (Math.random() - 0.5) * 5));
            this.metrics.wsLatency = Math.round(newWsLatency);
            
            // Simulate throughput fluctuation
            const currentThroughput = this.metrics.throughput;
            const newThroughput = Math.max(50, Math.min(300, currentThroughput + (Math.random() - 0.5) * 20));
            this.metrics.throughput = Math.round(newThroughput);
            
            // Update display
            this.updateSystemMetricsDisplay(this.metrics);
        }
    }
    
    handleComponentClick(component) {
        const componentName = component.querySelector('.component-name').textContent;
        this.showNotification(`Viewing details for ${componentName}`, 'info');
        
        // Add visual feedback
        component.style.transform = 'scale(0.95)';
        setTimeout(() => {
            component.style.transform = 'translateY(-2px)';
        }, 150);
        
        // Future: Open component details modal or navigate to component page
    }
    
    handleIntegrationClick(integration) {
        const integrationName = integration.querySelector('h4').textContent;
        this.showNotification(`Viewing details for ${integrationName}`, 'info');
        
        // Add visual feedback
        integration.style.transform = 'scale(0.98)';
        setTimeout(() => {
            integration.style.transform = 'none';
        }, 150);
        
        // Future: Open integration details modal or navigate to integration page
    }
    
    updateComponentHealth(data) {
        // Update component health based on WebSocket data
        if (data.layer && data.component && this.components[data.layer]) {
            this.components[data.layer][data.component] = data.status;
            this.updateComponentHealthDisplay(this.components);
            
            this.showNotification(
                `${data.component} status: ${data.status}`, 
                data.status === 'healthy' || data.status === 'active' ? 'success' : 'warning'
            );
        }
    }
    
    updateSystemMetrics(data) {
        // Update system metrics based on WebSocket data
        this.metrics = { ...this.metrics, ...data };
        this.updateSystemMetricsDisplay(this.metrics);
    }
    
    updateIntegrationStatus(data) {
        // Update integration status based on WebSocket data
        this.showNotification(`Integration status updated: ${data.integration}`, 'info');
        
        // In a real implementation, this would update integration status indicators
        // in the integration points section
    }
    
    showNotification(message, type = 'info') {
        // Dispatch custom notification event
        const event = new CustomEvent('notification', {
            detail: { message, type, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
        
        // Simple console logging for development
        const emoji = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };
        
        console.log(`${emoji[type] || 'ℹ️'} Architecture: ${message}`);
    }
    
    renderDynamicCards() {
        // Replace all static cards with dynamic components
        this.replaceSystemArchitectureCard();
        this.replaceComponentHealthCard();
        this.replaceIntegrationPointsCard();
        this.replaceSystemPerformanceCard();
    }
    
    replaceSystemArchitectureCard() {
        // The architecture diagram is complex visual content
        // Keep as static HTML for now, but could be enhanced with interactive SVG
        // in future iterations
    }
    
    replaceComponentHealthCard() {
        const cards = document.querySelectorAll('.card');
        let healthCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Component Health')) {
                healthCard = card;
            }
        });
        
        if (!healthCard) return;
        
        const healthContent = document.createElement('div');
        healthContent.className = 'component-health-grid';
        
        // Copy existing component status grid
        const existingGrid = healthCard.querySelector('.grid');
        if (existingGrid) {
            healthContent.innerHTML = existingGrid.innerHTML;
        }
        
        const newCard = Card.create({
            title: 'Component Health',
            icon: '📊',
            content: healthContent,
            id: 'componentHealthCard'
        });
        
        healthCard.parentNode.replaceChild(newCard, healthCard);
    }
    
    replaceIntegrationPointsCard() {
        const cards = document.querySelectorAll('.card');
        let integrationCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Integration Points')) {
                integrationCard = card;
            }
        });
        
        if (!integrationCard) return;
        
        const integrationContent = document.createElement('div');
        integrationContent.className = 'integration-list';
        
        // Copy existing integration list
        const existingList = integrationCard.querySelector('.integration-list');
        if (existingList) {
            integrationContent.innerHTML = existingList.innerHTML;
        }
        
        const newCard = Card.create({
            title: 'Integration Points',
            icon: '🔗',
            content: integrationContent,
            id: 'integrationPointsCard'
        });
        
        integrationCard.parentNode.replaceChild(newCard, integrationCard);
    }
    
    replaceSystemPerformanceCard() {
        const cards = document.querySelectorAll('.card');
        let performanceCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('System Performance')) {
                performanceCard = card;
            }
        });
        
        if (!performanceCard) return;
        
        const performanceContent = document.createElement('div');
        
        // Create metrics grid using UI components
        const metricsGrid = Grid.createMetricGrid([
            {
                value: this.metrics.apiLatency || 0,
                label: 'API Response Time',
                format: 'custom',
                id: 'apiLatency',
                suffix: 'ms'
            },
            {
                value: this.metrics.wsLatency || 0,
                label: 'WebSocket Latency',
                format: 'custom',
                id: 'wsLatency',
                suffix: 'ms'
            },
            {
                value: this.metrics.throughput || 0,
                label: 'Request Throughput',
                format: 'custom',
                id: 'throughput',
                suffix: '/s'
            }
        ], {
            columns: 3,
            gap: 'lg',
            responsive: { sm: 1, md: 3 }
        });
        
        performanceContent.appendChild(metricsGrid);
        
        const newCard = Card.create({
            title: 'System Performance',
            icon: '📈',
            content: performanceContent,
            id: 'systemPerformanceCard'
        });
        
        performanceCard.parentNode.replaceChild(newCard, performanceCard);
    }

    /**
     * Custom cleanup logic for architecture page
     */
    customCleanup() {
        // Clear components and metrics
        this.components = {};
        this.metrics = {};
        
        console.log('Architecture: Custom cleanup completed');
    }
}

// Initialize architecture page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Architecture();
});

export { Architecture };