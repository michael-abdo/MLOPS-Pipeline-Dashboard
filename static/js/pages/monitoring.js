import { wsManager } from '../common/websocket.js';
import { API } from '../common/api.js';
import { ActivityFeed } from '../components/activity-feed.js';
// Import only needed UI components (split modules for better performance)
import { Card, Metric, ProgressBar, Grid, initializeCoreUIStyles } from '../components/ui-core.js';
import { ChartContainer, initializeChartUIStyles } from '../components/ui-charts.js';
import { BasePageController } from '../common/lifecycle.js';
import { demoData } from '../common/demo-data.js';
import { CONFIG } from '../common/config.js';
import { ErrorHandler, ErrorSeverity, ErrorCategory, RecoveryStrategy } from '../common/error-handler.js';
import { withErrorHandling } from '../common/error-utils.js';

/**
 * System Monitoring Page Controller
 * Handles real-time system monitoring, performance metrics, and alerts
 */
class SystemMonitor extends BasePageController {
    constructor() {
        super(); // Initialize lifecycle management
        
        this.metrics = {};
        this.alerts = [];
        this.charts = {};
        this.activityFeed = null;
        this.updateTimers = {
            metrics: null,
            charts: null
        };
        
        this.init();
    }
    
    async init() {
        // Initialize components
        await this.initializeComponents();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup WebSocket listeners
        this.setupWebSocketListeners();
        
        // Load initial data
        await this.loadInitialData();
        
        // Start real-time updates
        this.startRealTimeUpdates();
    }
    
    async initializeComponents() {
        // Initialize UI components (split modules for better performance)
        initializeCoreUIStyles();
        initializeChartUIStyles();
        
        // Initialize activity feed
        const activityContainer = document.getElementById('activityFeed');
        if (activityContainer) {
            this.activityFeed = new ActivityFeed('activityFeed');
        }
        
        // Initialize charts (placeholder for future chart library integration)
        this.initializeCharts();
        
        // Replace static cards with dynamic components
        await this.renderDynamicCards();
    }
    
    initializeCharts() {
        // Charts are now handled by ChartContainer components in replaceChartCards()
        // This method is kept for any future chart-specific initialization
    }
    
    setupEventListeners() {
        // Clear alerts button
        const clearAlertsBtn = document.getElementById('clearAlertsBtn');
        if (clearAlertsBtn) {
            this.addEventListener(clearAlertsBtn, 'click', () => {
                this.clearAllAlerts();
            });
        }
        
        // Configure alerts button
        const configureAlertsBtn = document.getElementById('configureAlertsBtn');
        if (configureAlertsBtn) {
            this.addEventListener(configureAlertsBtn, 'click', () => {
                this.configureAlerts();
            });
        }
        
        // Alert action buttons - using managed event listener
        const alertActionHandler = (e) => {
            if (e.target.matches('.alert-actions .btn')) {
                const action = e.target.textContent.toLowerCase();
                const alertItem = e.target.closest('.alert-item');
                if (alertItem) {
                    this.handleAlertAction(action, alertItem);
                }
            }
        };
        this.addEventListener(document, 'click', alertActionHandler);
    }
    
    setupWebSocketListeners() {
        // System metrics updates
        this.addWebSocketHandler('system_metrics', (data) => {
            this.updateSystemMetrics(data);
        });
        
        // Service health updates
        this.addWebSocketHandler('service_health', (data) => {
            this.updateServiceHealth(data);
        });
        
        // Performance metrics updates
        this.addWebSocketHandler('performance_metrics', (data) => {
            this.updatePerformanceMetrics(data);
        });
        
        // New alerts
        this.addWebSocketHandler('system_alert', (data) => {
            this.handleNewAlert(data);
        });
        
        // Chart data updates
        this.addWebSocketHandler('chart_data', (data) => {
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
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.HIGH,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.RETRY,
                userMessage: 'Failed to load monitoring data. Please check your connection and try again.',
                context: { component: 'SystemMonitor', action: 'loadInitialData' }
            });
            this.showNotification('Failed to load monitoring data', 'error');
        }
    }
    
    async loadSystemMetrics() {
        try {
            // Load real system metrics from backend API
            const metricsData = await API.getMonitoringMetrics();
            
            // Transform backend data to frontend format
            const metrics = {
                uptime: metricsData.uptime || '0%',
                cpuUsage: metricsData.cpu_usage || 0,
                memoryUsage: metricsData.memory_usage ? `${metricsData.memory_usage}GB` : '0GB',
                diskUsage: metricsData.disk_usage || 0
            };
            
            this.metrics.system = metrics;
            this.updateSystemMetricsDisplay(metrics);
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                userMessage: 'Unable to load real-time system metrics. Showing default values.',
                context: { component: 'SystemMonitor', action: 'loadSystemMetrics' }
            });
            // Fallback to default metrics on error
            const metrics = {
                uptime: '0%',
                cpuUsage: 0,
                memoryUsage: '0GB',
                diskUsage: 0
            };
            
            this.metrics.system = metrics;
            this.updateSystemMetricsDisplay(metrics);
        }
    }
    
    async loadServiceHealth() {
        try {
            // Load real service health from backend API
            const serviceData = await API.getServices();
            const backendServices = serviceData.services || [];
            
            // Transform backend data to frontend format
            const services = {};
            
            backendServices.forEach(service => {
                switch (service.name) {
                    case 'API Server':
                        services.fastapi = {
                            status: service.status === 'running' ? 'healthy' : 'unhealthy',
                            responseTime: parseInt(service.response_time) || 0,
                            requestsPerMin: service.requests_per_minute || 0,
                            errorRate: 0.1 // TODO: Get from real metrics
                        };
                        break;
                    case 'Model Service':
                        services.mlEngine = {
                            status: service.status === 'running' ? 'ready' : 'error',
                            modelsLoaded: 1, // TODO: Get from real data
                            predictionsPerMin: service.predictions_per_minute || 0,
                            accuracy: CONFIG.DEMO.ENABLED ? 89.2 : 0 // Use demo value in demo mode
                        };
                        break;
                    case 'Data Processor':
                        services.dataProcessor = {
                            status: service.status === 'running' ? 'active' : 'error',
                            queueSize: service.queue_size || 0,
                            processingRate: parseInt(service.processing_rate) || 0
                        };
                        break;
                }
            });
            
            // Add WebSocket status from connection manager
            services.websocket = {
                status: wsManager.isConnected() ? 'connected' : 'disconnected',
                activeConnections: wsManager.getConnectionCount ? wsManager.getConnectionCount() : 1,
                messagesPerSec: CONFIG.DEMO.ENABLED ? 8 : 0, // Use demo value in demo mode
                latency: wsManager.getConnectionQuality().latency || 0
            };
            
            this.metrics.services = services;
            this.updateServiceHealthDisplay(services);
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                userMessage: 'Unable to load service health information. Showing error state.',
                context: { component: 'SystemMonitor', action: 'loadServiceHealth' }
            });
            // Fallback to error state
            const services = {
                fastapi: { status: 'error', responseTime: 0, requestsPerMin: 0, errorRate: 100 },
                websocket: { status: 'disconnected', activeConnections: 0, messagesPerSec: 0, latency: 0 },
                mlEngine: { 
                    status: 'error',
                    modelsLoaded: 0,
                    predictionsPerMin: 0,
                    accuracy: 0
                },
                dataProcessor: {
                    status: 'error',
                    queueSize: 0,
                    processingRate: 0
                }
            };
        
        this.metrics.services = services;
        this.updateServiceHealthDisplay(services);
    }
    
    async loadPerformanceMetrics() {
        try {
            // Load real performance metrics from backend API
            const metricsData = await API.getMonitoringMetrics();
            
            // Transform backend data to frontend format
            const performance = {
                training: {
                    avgTrainingTime: metricsData.avg_training_time || '0 seconds',
                    modelAccuracy: metricsData.model_accuracy ? `${metricsData.model_accuracy}%` : '0%',
                    inferenceSpeed: metricsData.inference_speed || '0ms'
                },
                pipeline: {
                    successRate: metricsData.pipeline_success_rate ? `${metricsData.pipeline_success_rate}%` : '0%',
                    avgDuration: metricsData.avg_pipeline_duration || '0m 0s',
                    queueWaitTime: metricsData.queue_wait_time || '0s'
                }
            };
            
            this.metrics.performance = performance;
            this.updatePerformanceMetricsDisplay(performance);
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                userMessage: 'Unable to load performance metrics. Showing default values.',
                context: { component: 'SystemMonitor', action: 'loadPerformanceMetrics' }
            });
            // Fallback to default metrics on error
            const performance = {
                training: {
                    avgTrainingTime: '0 seconds',
                    modelAccuracy: '0%',
                    inferenceSpeed: '0ms'
                },
                pipeline: {
                    successRate: '0%',
                    avgDuration: '0m 0s',
                    queueWaitTime: '0s'
                }
            };
            
            this.metrics.performance = performance;
            this.updatePerformanceMetricsDisplay(performance);
        }
    }
    
    async loadAlerts() {
        try {
            // Load real alerts from backend API
            const alertsData = await API.getAlerts();
            const alerts = alertsData.alerts || [];
            
            // Store alerts for future use
            this.alerts = alerts;
            
            // Update alerts display
            this.updateAlertsDisplay(alerts);
            
            this.showNotification(`Loaded ${alerts.length} system alerts`, 'info');
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                userMessage: 'Unable to load system alerts. Alert list is empty.',
                context: { component: 'SystemMonitor', action: 'loadAlerts' }
            });
            // Fallback to empty alerts list
            this.alerts = [];
            this.updateAlertsDisplay([]);
            this.showNotification('Failed to load alerts', 'error');
        }
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
    
    updateAlertsDisplay(alerts) {
        // Alerts are already rendered in HTML as static examples
        // In a real implementation, this would dynamically render alert items
        this.showNotification('System alerts updated', 'info');
    }
    
    startRealTimeUpdates() {
        // Start periodic updates for real-time monitoring with automatic cleanup
        this.updateTimers.metrics = this.addTimer(() => {
            this.simulateMetricUpdates();
        }, 5000); // Update every 5 seconds
        
        // Start chart updates with automatic cleanup
        this.updateTimers.charts = this.addTimer(() => {
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
        // Chart updates are handled by ChartContainer components
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
            ChartContainer.updateData(this.charts.resource, data.data, { type: 'resource' });
        } else if (data.chartType === 'network' && this.charts.network) {
            ChartContainer.updateData(this.charts.network, data.data, { type: 'network' });
        }
    }
    
    updateResourceChart(data) {
        // Handle resource chart updates
        // Implementation would update Chart.js instance here
    }
    
    updateNetworkChart(data) {
        // Handle network chart updates
        // Implementation would update Chart.js instance here
    }
    
    handleNewAlert(data) {
        this.showNotification(`New system alert: ${data.title}`, data.priority || 'info');
        
        // In a real implementation, this would add the alert to the alerts list
        // and update the UI to show the new alert
        this.loadAlerts();
    }
    
    async clearAllAlerts() {
        if (confirm('Are you sure you want to clear all alerts?')) {
            this.showNotification('Clearing all system alerts...', 'info');
            
            try {
                // Clear all alerts by acknowledging each one
                const clearPromises = this.alerts.map(alert => 
                    API.acknowledgeAlert(alert.id, 'system_admin')
                );
                
                await Promise.all(clearPromises);
                
                // Reload alerts to show updated state
                await this.loadAlerts();
                
                this.showNotification('All alerts cleared', 'success');
                
            } catch (error) {
                ErrorHandler.handleError(error, {
                    severity: ErrorSeverity.MEDIUM,
                    category: ErrorCategory.NETWORK,
                    recovery: RecoveryStrategy.RETRY,
                    userMessage: 'Failed to clear alerts. Please try again.',
                    context: { component: 'SystemMonitor', action: 'clearAllAlerts' }
                });
                this.showNotification('Failed to clear alerts', 'error');
            }
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
    
    async acknowledgeAlert(title, alertItem) {
        this.showNotification(`Acknowledging alert: ${title}`, 'info');
        
        // Fade out the alert
        alertItem.style.opacity = '0.5';
        alertItem.style.pointerEvents = 'none';
        
        try {
            // Find the alert ID from the stored alerts
            const alert = this.alerts.find(a => a.title === title || a.message === title);
            if (alert) {
                await API.acknowledgeAlert(alert.id, 'user');
                this.showNotification(`Alert acknowledged: ${title}`, 'success');
                
                // Reload alerts to show updated state
                await this.loadAlerts();
            } else {
                this.showNotification(`Alert acknowledged: ${title}`, 'success');
            }
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.LOW,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.RETRY,
                userMessage: `Failed to acknowledge alert: ${title}. Please try again.`,
                context: { component: 'SystemMonitor', action: 'acknowledgeAlert', alertTitle: title }
            });
            this.showNotification(`Failed to acknowledge alert: ${title}`, 'error');
            
            // Restore alert state on error
            alertItem.style.opacity = '1';
            alertItem.style.pointerEvents = 'auto';
        }
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
        
        // Visual notification implementation removed for production
        // Notifications are now handled by the notification event system
    }
    
    async renderDynamicCards() {
        // Replace all static cards with dynamic components
        await this.replaceSystemOverviewCard();
        this.replaceChartCards();
        this.replaceServiceHealthCard();
        this.replacePerformanceMetricsCard();
        this.replaceSystemAlertsCard();
        this.replaceActivityCard();
    }
    
    async replaceSystemOverviewCard() {
        const overviewCard = document.querySelector('.card:first-of-type');
        if (!overviewCard) return;
        
        let metricsData = [];
        
        if (CONFIG.DEMO.ENABLED) {
            // Use demo data in demo mode
            const demoMetrics = await demoData.getSystemMetrics();
            metricsData = [
                {
                    value: demoMetrics.uptime.replace('%', ''),
                    label: 'System Uptime',
                    format: 'percent',
                    id: 'systemUptime',
                    trend: 'up',
                    trendValue: 0.2
                },
                {
                    value: demoMetrics.cpu_usage,
                    label: 'CPU Usage',
                    format: 'percent',
                    id: 'cpuUsage',
                    trend: 'up',
                    trendValue: 5
                },
                {
                    value: demoMetrics.memory_usage,
                    label: 'Memory Usage',
                    format: 'custom',
                    id: 'memoryUsage',
                    trend: 'down',
                    trendValue: 0.3
                },
                {
                    value: demoMetrics.disk_usage,
                    label: 'Disk Usage',
                    format: 'percent',
                    id: 'diskUsage',
                    trend: 'down',
                    trendValue: 2
                }
            ];
        } else {
            // Use placeholder values in production mode
            metricsData = [
                {
                    value: '0',
                    label: 'System Uptime',
                    format: 'percent',
                    id: 'systemUptime',
                    trend: 'neutral',
                    trendValue: 0
                },
                {
                    value: 0,
                    label: 'CPU Usage',
                    format: 'percent',
                    id: 'cpuUsage',
                    trend: 'neutral',
                    trendValue: 0
                },
                {
                    value: '0GB',
                    label: 'Memory Usage',
                    format: 'custom',
                    id: 'memoryUsage',
                    trend: 'neutral',
                    trendValue: 0
                },
                {
                    value: 0,
                    label: 'Disk Usage',
                    format: 'percent',
                    id: 'diskUsage',
                    trend: 'neutral',
                    trendValue: 0
                }
            ];
        }
        
        const metricsGrid = Grid.createMetricGrid(metricsData, {
            columns: 4,
            gap: 'lg',
            responsive: { sm: 2, md: 4 }
        });
        
        const newCard = Card.create({
            title: 'System Overview',
            icon: '🖥️',
            content: metricsGrid,
            id: 'systemOverviewCard'
        });
        
        overviewCard.parentNode.replaceChild(newCard, overviewCard);
    }
    
    replaceChartCards() {
        // Replace CPU & Memory Usage chart card
        const cards = document.querySelectorAll('.card');
        let cpuMemoryCard = null;
        let networkCard = null;
        
        cards.forEach(card => {
            const h4 = card.querySelector('h4');
            if (h4) {
                if (h4.textContent.includes('CPU & Memory Usage')) {
                    cpuMemoryCard = card;
                } else if (h4.textContent.includes('Network Activity')) {
                    networkCard = card;
                }
            }
        });
        
        // Replace CPU & Memory card with ChartContainer
        if (cpuMemoryCard) {
            const cpuMemoryChart = ChartContainer.create({
                title: 'CPU & Memory Usage',
                type: 'line',
                height: '250px',
                loading: false,
                onUpdate: (data) => this.updateResourceChart(data),
                id: 'resourceChartContainer'
            });
            
            cpuMemoryCard.parentNode.replaceChild(cpuMemoryChart, cpuMemoryCard);
            
            // Store chart reference for updates
            this.charts.resource = cpuMemoryChart;
        }
        
        // Replace Network card with ChartContainer
        if (networkCard) {
            const networkChart = ChartContainer.create({
                title: 'Network Activity',
                type: 'area',
                height: '250px',
                loading: false,
                onUpdate: (data) => this.updateNetworkChart(data),
                id: 'networkChartContainer'
            });
            
            networkCard.parentNode.replaceChild(networkChart, networkCard);
            
            // Store chart reference for updates
            this.charts.network = networkChart;
        }
    }
    
    replaceServiceHealthCard() {
        const cards = document.querySelectorAll('.card');
        let serviceCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Service Health')) {
                serviceCard = card;
            }
        });
        
        if (!serviceCard) return;
        
        const serviceContent = document.createElement('div');
        serviceContent.className = 'service-grid';
        
        // Copy existing service grid content
        const existingGrid = serviceCard.querySelector('.service-grid');
        if (existingGrid) {
            serviceContent.innerHTML = existingGrid.innerHTML;
        }
        
        const newCard = Card.create({
            title: 'Service Health',
            icon: '🔧',
            content: serviceContent,
            id: 'serviceHealthCard'
        });
        
        serviceCard.parentNode.replaceChild(newCard, serviceCard);
    }
    
    replacePerformanceMetricsCard() {
        const cards = document.querySelectorAll('.card');
        let performanceCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Performance Metrics')) {
                performanceCard = card;
            }
        });
        
        if (!performanceCard) return;
        
        const performanceContent = document.createElement('div');
        performanceContent.className = 'performance-grid';
        
        // Copy existing performance grid content
        const existingGrid = performanceCard.querySelector('.performance-grid');
        if (existingGrid) {
            performanceContent.innerHTML = existingGrid.innerHTML;
        }
        
        const newCard = Card.create({
            title: 'Performance Metrics',
            icon: '⚡',
            content: performanceContent,
            id: 'performanceMetricsCard'
        });
        
        performanceCard.parentNode.replaceChild(newCard, performanceCard);
    }
    
    replaceSystemAlertsCard() {
        const cards = document.querySelectorAll('.card');
        let alertsCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('System Alerts')) {
                alertsCard = card;
            }
        });
        
        if (!alertsCard) return;
        
        // Create header actions with ButtonGroup
        const headerActions = ButtonGroup.create({
            buttons: [
                {
                    text: 'Clear All',
                    icon: '🗑️',
                    variant: 'secondary',
                    onClick: () => this.clearAllAlerts()
                },
                {
                    text: 'Configure',
                    icon: '⚙️',
                    variant: 'primary',
                    onClick: () => this.configureAlerts()
                }
            ],
            id: 'alertsButtonGroup'
        });
        
        const alertsContent = document.createElement('div');
        alertsContent.className = 'alerts-list';
        
        // Copy existing alerts content
        const existingAlerts = alertsCard.querySelector('.alerts-list');
        if (existingAlerts) {
            alertsContent.innerHTML = existingAlerts.innerHTML;
        }
        
        const newCard = Card.create({
            title: 'System Alerts',
            icon: '🚨',
            content: alertsContent,
            headerActions: headerActions,
            id: 'systemAlertsCard'
        });
        
        alertsCard.parentNode.replaceChild(newCard, alertsCard);
        
        // Event listeners are now handled by ButtonGroup component
    }
    
    replaceActivityCard() {
        const cards = document.querySelectorAll('.card');
        let activityCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('System Activity')) {
                activityCard = card;
            }
        });
        
        if (!activityCard) return;
        
        const activityContent = `
            <div id="activityFeed" style="max-height: 300px; overflow-y: auto;">
                <!-- Activities will be loaded from backend -->
            </div>
        `;
        
        const newCard = Card.create({
            title: 'System Activity',
            icon: '🔍',
            content: activityContent,
            id: 'systemActivityCard'
        });
        
        activityCard.parentNode.replaceChild(newCard, activityCard);
        
        // Re-initialize activity feed
        const activityContainer = newCard.querySelector('#activityFeed');
        if (activityContainer && this.activityFeed) {
            this.activityFeed = new ActivityFeed('activityFeed');
        }
    }
    
    updateSystemMetricsDisplay(metrics) {
        // Update system overview metrics using new Metric component
        Metric.update('systemUptime', metrics.uptime.replace('%', ''), { format: 'percent' });
        Metric.update('cpuUsage', metrics.cpuUsage, { format: 'percent' });
        Metric.update('memoryUsage', metrics.memoryUsage, { format: 'custom' });
        Metric.update('diskUsage', metrics.diskUsage, { format: 'percent' });
    }

    /**
     * Custom cleanup logic for monitoring page
     */
    customCleanup() {
        // Clean up activity feed
        if (this.activityFeed && this.activityFeed.destroy) {
            this.activityFeed.destroy();
        }
        
        // Clear chart references
        this.charts = {};
        
        // Clear metrics
        this.metrics = {};
        
        // Clear alerts
        this.alerts = [];
        
        console.log('SystemMonitor: Custom cleanup completed');
    }
}

// Initialize monitoring page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SystemMonitor();
});

export { SystemMonitor };