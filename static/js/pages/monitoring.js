import { wsManager } from '../common/websocket.js';
import { API } from '../common/api.js';
import { ActivityFeed } from '../components/activity-feed.js';

/**
 * System Monitoring Page Controller
 * Handles real-time system monitoring, performance metrics, and alerts
 */
class SystemMonitor {
    constructor() {
        this.metrics = {};
        this.alerts = [];
        this.charts = {};
        this.activityFeed = null;
        
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
        // Initialize activity feed
        const activityContainer = document.getElementById('activityFeed');
        if (activityContainer) {
            this.activityFeed = new ActivityFeed('activityFeed');
        }
        
        // Initialize charts (placeholder for future chart library integration)
        this.initializeCharts();
    }
    
    initializeCharts() {
        // Initialize resource usage chart
        const resourceChart = document.getElementById('resourceChart');
        if (resourceChart) {
            // Placeholder for chart initialization
            // In a real implementation, this would use Chart.js or similar
            resourceChart.style.background = 'var(--background-color)';
            resourceChart.style.display = 'flex';
            resourceChart.style.alignItems = 'center';
            resourceChart.style.justifyContent = 'center';
            resourceChart.innerHTML = '<div style="color: var(--text-secondary);">Real-time CPU & Memory Chart</div>';
        }
        
        // Initialize network chart
        const networkChart = document.getElementById('networkChart');
        if (networkChart) {
            // Placeholder for chart initialization
            networkChart.style.background = 'var(--background-color)';
            networkChart.style.display = 'flex';
            networkChart.style.alignItems = 'center';
            networkChart.style.justifyContent = 'center';
            networkChart.innerHTML = '<div style="color: var(--text-secondary);">Real-time Network Chart</div>';
        }
    }
    
    setupEventListeners() {
        // Clear alerts button
        const clearAlertsBtn = document.getElementById('clearAlertsBtn');
        if (clearAlertsBtn) {
            clearAlertsBtn.addEventListener('click', () => {
                this.clearAllAlerts();
            });
        }
        
        // Configure alerts button
        const configureAlertsBtn = document.getElementById('configureAlertsBtn');
        if (configureAlertsBtn) {
            configureAlertsBtn.addEventListener('click', () => {
                this.configureAlerts();
            });
        }
        
        // Alert action buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.alert-actions .btn')) {
                const action = e.target.textContent.toLowerCase();
                const alertItem = e.target.closest('.alert-item');
                if (alertItem) {
                    this.handleAlertAction(action, alertItem);
                }
            }
        });
    }
    
    setupWebSocketListeners() {
        // System metrics updates
        wsManager.on('system_metrics', (data) => {
            this.updateSystemMetrics(data);
        });
        
        // Service health updates
        wsManager.on('service_health', (data) => {
            this.updateServiceHealth(data);
        });
        
        // Performance metrics updates
        wsManager.on('performance_metrics', (data) => {
            this.updatePerformanceMetrics(data);
        });
        
        // New alerts
        wsManager.on('system_alert', (data) => {
            this.handleNewAlert(data);
        });
        
        // Chart data updates
        wsManager.on('chart_data', (data) => {
            this.updateChartData(data);
        });
    }
    
    async loadInitialData() {
        try {
            // Load system metrics
            await this.loadSystemMetrics();
            
            // Load service health
            await this.loadServiceHealth();
            
            // Load performance metrics
            await this.loadPerformanceMetrics();
            
            // Load alerts
            await this.loadAlerts();
            
        } catch (error) {
            console.error('Failed to load monitoring data:', error);
            this.showNotification('Failed to load monitoring data', 'error');
        }
    }
    
    async loadSystemMetrics() {
        // Simulate loading system metrics
        const metrics = {
            uptime: '99.8%',
            cpuUsage: 34,
            memoryUsage: '2.1GB',
            diskUsage: 45
        };
        
        this.metrics.system = metrics;
        this.updateSystemMetricsDisplay(metrics);
    }
    
    async loadServiceHealth() {
        // Simulate loading service health data
        const services = {
            fastapi: {
                status: 'healthy',
                responseTime: 23,
                requestsPerMin: 142,
                errorRate: 0.1
            },
            websocket: {
                status: 'connected',
                activeConnections: 3,
                messagesPerSec: 8,
                latency: 12
            },
            mlEngine: {
                status: 'ready',
                modelsLoaded: 2,
                queueSize: 0,
                avgProcessing: 1.2
            },
            storage: {
                status: 'warning',
                freeSpace: '156GB',
                readSpeed: '450MB/s',
                writeSpeed: '320MB/s'
            }
        };
        
        this.metrics.services = services;
        this.updateServiceHealthDisplay(services);
    }
    
    async loadPerformanceMetrics() {
        // Simulate loading performance metrics
        const performance = {
            training: {
                avgTrainingTime: '14.2 seconds',
                modelAccuracy: '94.7%',
                inferenceSpeed: '45ms'
            },
            pipeline: {
                successRate: '97.3%',
                avgDuration: '8m 42s',
                queueWaitTime: '23s'
            }
        };
        
        this.metrics.performance = performance;
        this.updatePerformanceMetricsDisplay(performance);
    }
    
    async loadAlerts() {
        // Alerts are already rendered in HTML as static examples
        // In a real implementation, this would load alerts from backend
        this.showNotification('System alerts loaded', 'info');
    }
    
    updateSystemMetricsDisplay(metrics) {
        // Update system overview metrics
        const elements = {
            systemUptime: metrics.uptime,
            cpuUsage: `${metrics.cpuUsage}%`,
            memoryUsage: metrics.memoryUsage,
            diskUsage: `${metrics.diskUsage}%`
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }
    
    updateServiceHealthDisplay(services) {
        // Service health is already rendered in HTML
        // In a real implementation, this would update service status indicators
        this.showNotification('Service health updated', 'info');
    }
    
    updatePerformanceMetricsDisplay(performance) {
        // Performance metrics are already rendered in HTML
        // In a real implementation, this would update performance indicators
        this.showNotification('Performance metrics updated', 'info');
    }
    
    startRealTimeUpdates() {
        // Start periodic updates for real-time monitoring
        setInterval(() => {
            this.simulateMetricUpdates();
        }, 5000); // Update every 5 seconds
        
        // Start chart updates
        setInterval(() => {
            this.simulateChartUpdates();
        }, 2000); // Update charts every 2 seconds
    }
    
    simulateMetricUpdates() {
        // Simulate real-time metric updates
        if (this.metrics.system) {
            // Simulate CPU usage fluctuation
            const currentCpu = this.metrics.system.cpuUsage;
            const newCpu = Math.max(10, Math.min(90, currentCpu + (Math.random() - 0.5) * 10));
            this.metrics.system.cpuUsage = Math.round(newCpu);
            
            // Update display
            const cpuElement = document.getElementById('cpuUsage');
            if (cpuElement) {
                cpuElement.textContent = `${this.metrics.system.cpuUsage}%`;
            }
        }
    }
    
    simulateChartUpdates() {
        // Simulate chart data updates
        // In a real implementation, this would update actual chart data
        const timestamp = new Date().toLocaleTimeString();
        console.log(`📊 Chart update at ${timestamp}`);
    }
    
    updateSystemMetrics(data) {
        // Update system metrics based on WebSocket data
        this.metrics.system = { ...this.metrics.system, ...data };
        this.updateSystemMetricsDisplay(this.metrics.system);
    }
    
    updateServiceHealth(data) {
        // Update service health based on WebSocket data
        if (this.metrics.services && data.serviceName) {
            this.metrics.services[data.serviceName] = { 
                ...this.metrics.services[data.serviceName], 
                ...data.metrics 
            };
            this.updateServiceHealthDisplay(this.metrics.services);
        }
    }
    
    updatePerformanceMetrics(data) {
        // Update performance metrics based on WebSocket data
        this.metrics.performance = { ...this.metrics.performance, ...data };
        this.updatePerformanceMetricsDisplay(this.metrics.performance);
    }
    
    updateChartData(data) {
        // Update chart data based on WebSocket data
        if (data.chartType === 'resource' && this.charts.resource) {
            // Update resource chart
            // In a real implementation, this would update the actual chart
        } else if (data.chartType === 'network' && this.charts.network) {
            // Update network chart
            // In a real implementation, this would update the actual chart
        }
    }
    
    handleNewAlert(data) {
        this.showNotification(`New system alert: ${data.title}`, data.priority || 'info');
        
        // In a real implementation, this would add the alert to the alerts list
        // and update the UI to show the new alert
        this.loadAlerts();
    }
    
    clearAllAlerts() {
        if (confirm('Are you sure you want to clear all alerts?')) {
            this.showNotification('Clearing all system alerts...', 'info');
            
            // In a real implementation, this would call the backend API
            // to clear all alerts and update the UI
            setTimeout(() => {
                this.showNotification('All alerts cleared', 'success');
            }, 1000);
        }
    }
    
    configureAlerts() {
        this.showNotification('Opening alert configuration...', 'info');
        // Future: Open alert configuration modal or navigate to settings page
    }
    
    handleAlertAction(action, alertItem) {
        const alertTitle = alertItem.querySelector('h4').textContent;
        
        switch (action) {
            case 'acknowledge':
                this.acknowledgeAlert(alertTitle, alertItem);
                break;
            case 'dismiss':
                this.dismissAlert(alertTitle, alertItem);
                break;
            case 'view details':
                this.viewAlertDetails(alertTitle);
                break;
            case 'view model':
                this.viewModel(alertTitle);
                break;
            default:
                this.showNotification(`Unknown alert action: ${action}`, 'error');
        }
    }
    
    acknowledgeAlert(title, alertItem) {
        this.showNotification(`Acknowledging alert: ${title}`, 'info');
        
        // Fade out the alert
        alertItem.style.opacity = '0.5';
        alertItem.style.pointerEvents = 'none';
        
        // In a real implementation, this would call the backend API
        setTimeout(() => {
            this.showNotification(`Alert acknowledged: ${title}`, 'success');
        }, 500);
    }
    
    dismissAlert(title, alertItem) {
        this.showNotification(`Dismissing alert: ${title}`, 'info');
        
        // Remove the alert from view
        alertItem.style.transition = 'all 0.3s ease';
        alertItem.style.transform = 'translateX(100%)';
        alertItem.style.opacity = '0';
        
        setTimeout(() => {
            alertItem.remove();
            this.showNotification(`Alert dismissed: ${title}`, 'success');
        }, 300);
    }
    
    viewAlertDetails(title) {
        this.showNotification(`Opening details for alert: ${title}`, 'info');
        // Future: Open alert details modal with full information
    }
    
    viewModel(title) {
        this.showNotification(`Opening model view for: ${title}`, 'info');
        // Future: Navigate to model details page
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
        
        console.log(`${emoji[type] || 'ℹ️'} Monitor: ${message}`);
    }
}

// Initialize monitoring page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SystemMonitor();
});

export { SystemMonitor };