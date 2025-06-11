import { wsManager } from '../common/websocket.js';
import { API } from '../common/api.js';

/**
 * Architecture Page Controller
 * Handles system architecture visualization and component health monitoring
 */
class Architecture {
    constructor() {
        this.components = {};
        this.metrics = {};
        
        this.init();
    }
    
    async init() {
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup WebSocket listeners
        this.setupWebSocketListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Start real-time updates
        this.startRealTimeUpdates();
    }
    
    setupEventListeners() {
        // Component interaction handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('.arch-component')) {
                this.handleComponentClick(e.target);
            }
        });
        
        // Integration point interaction handlers
        document.addEventListener('click', (e) => {
            if (e.target.matches('.integration-item')) {
                this.handleIntegrationClick(e.target);
            }
        });
    }
    
    setupWebSocketListeners() {
        // Component health updates
        wsManager.on('component_health', (data) => {
            this.updateComponentHealth(data);
        });
        
        // System metrics updates
        wsManager.on('system_metrics', (data) => {
            this.updateSystemMetrics(data);
        });
        
        // Integration status updates
        wsManager.on('integration_status', (data) => {
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
            console.error('Failed to load architecture data:', error);
            this.showNotification('Failed to load architecture data', 'error');
        }
    }
    
    async loadComponentHealth() {
        // Simulate loading component health data
        const components = {
            frontend: {
                dashboard: 'active',
                websocketClient: 'connected',
                apiClient: 'healthy'
            },
            backend: {
                fastapiServer: 'running',
                websocketServer: 'active',
                mlEngine: 'ready'
            }
        };
        
        this.components = components;
        this.updateComponentHealthDisplay(components);
    }
    
    async loadSystemMetrics() {
        // Simulate loading system performance metrics
        const metrics = {
            apiLatency: 23,
            wsLatency: 12,
            throughput: 150
        };
        
        this.metrics = metrics;
        this.updateSystemMetricsDisplay(metrics);
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
        // Start periodic updates for real-time metrics
        setInterval(() => {
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
}

// Initialize architecture page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Architecture();
});

export { Architecture };