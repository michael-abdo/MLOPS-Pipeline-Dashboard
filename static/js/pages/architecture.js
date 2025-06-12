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
            console.error('Failed to load component health:', error);
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
                throughput: 150, // TODO: Calculate from real data
                cpuUsage: metricsData.cpu_usage || 0,
                memoryUsage: metricsData.memory_usage || 0,
                diskUsage: metricsData.disk_usage || 0
            };
            
            this.metrics = metrics;
            this.updateSystemMetricsDisplay(metrics);
            
        } catch (error) {
            console.error('Failed to load system metrics:', error);
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
        // This could be enhanced to track actual response times
        return Math.floor(Math.random() * 50) + 10; // 10-60ms
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