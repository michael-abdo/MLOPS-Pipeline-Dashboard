/**
 * Dashboard Component Integration
 * Shows how to use the new UI components in the dashboard
 */

import { Card, Metric, ProgressBar, Grid, initializeUIComponents } from './ui-components.js';

class DashboardComponents {
    constructor() {
        this.initializeComponents();
    }

    initializeComponents() {
        // Initialize component styles
        initializeUIComponents();
    }

    /**
     * Creates the Live System Status card using the new Card component
     */
    createSystemStatusCard() {
        const statusContent = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-lg);">
                <div>
                    <strong>Customer Prediction Model v2.1</strong>
                    <p style="color: var(--text-secondary); margin-top: var(--spacing-sm);">
                        Last trained <span id="lastTrained">2 hours ago</span> • 
                        <span id="totalPredictions">1,247</span> predictions made
                    </p>
                </div>
                <div class="status-indicator status-good">
                    <div class="status-dot"></div>
                    <span id="statusText">Live & Healthy</span>
                </div>
            </div>
            <div id="trainingProgressContainer"></div>
            <div id="systemMetricsGrid"></div>
        `;

        const card = Card.create({
            title: 'Live System Status',
            icon: '🔧',
            content: statusContent,
            className: 'system-status-card',
            id: 'systemStatusCard'
        });

        // Add training progress bar
        const progressContainer = card.querySelector('#trainingProgressContainer');
        const progressBar = ProgressBar.create({
            progress: 100,
            label: '🚀 Ready for New Training',
            showPercentage: true,
            style: 'success',
            id: 'mainProgressBar'
        });
        progressContainer.appendChild(progressBar);

        // Add system metrics grid
        const metricsContainer = card.querySelector('#systemMetricsGrid');
        const metricsGrid = Grid.createMetricGrid([
            {
                value: 94.2,
                label: 'Current Accuracy',
                format: 'percent',
                id: 'liveAccuracy',
                trend: 'up',
                trendValue: 2.3
            },
            {
                value: 23,
                label: 'Predictions/Min',
                format: 'custom',
                id: 'livePredictions',
                trend: 'neutral',
                trendValue: 0
            },
            {
                value: '✅',
                label: 'System Health',
                format: 'custom',
                id: 'systemHealth',
                tooltip: 'All systems operational'
            }
        ], {
            columns: 3,
            gap: 'lg',
            responsive: { sm: 1, md: 3 }
        });
        metricsContainer.appendChild(metricsGrid);

        return card;
    }

    /**
     * Creates the Model Performance card
     */
    createModelPerformanceCard() {
        const performanceMetrics = Grid.createMetricGrid([
            {
                value: '--',
                label: 'Accuracy',
                format: 'percent',
                id: 'modelAccuracy',
                tooltip: 'Model accuracy on test set'
            },
            {
                value: '--',
                label: 'Predictions Made',
                format: 'number',
                id: 'predictionCount'
            },
            {
                value: '--',
                label: 'Response Time',
                format: 'custom',
                id: 'responseTime'
            }
        ], {
            columns: 3,
            gap: 'lg',
            responsive: { sm: 1, md: 3 }
        });

        const actionButton = document.createElement('button');
        actionButton.className = 'btn btn-primary';
        actionButton.textContent = 'View Details';
        actionButton.onclick = () => this.showModelDetails();

        const card = Card.create({
            title: 'Current Model Performance',
            content: performanceMetrics,
            headerActions: actionButton,
            id: 'modelPerformanceCard'
        });

        // Add action button section
        const buttonSection = document.createElement('div');
        buttonSection.style.textAlign = 'center';
        buttonSection.style.marginTop = 'var(--spacing-lg)';
        card.querySelector('.card-content').appendChild(buttonSection);

        return card;
    }

    /**
     * Creates system resources monitoring card
     */
    createResourcesCard() {
        const resourcesContent = document.createElement('div');
        
        // CPU Usage
        const cpuSection = document.createElement('div');
        cpuSection.innerHTML = '<h4>CPU Usage</h4>';
        const cpuProgress = ProgressBar.create({
            progress: 45,
            label: 'CPU',
            showPercentage: true,
            style: 'default',
            height: 8,
            id: 'cpuProgress'
        });
        cpuSection.appendChild(cpuProgress);
        resourcesContent.appendChild(cpuSection);

        // Memory Usage
        const memorySection = document.createElement('div');
        memorySection.innerHTML = '<h4>Memory Usage</h4>';
        const memoryProgress = ProgressBar.create({
            progress: 62,
            label: 'Memory',
            showPercentage: true,
            style: 'warning',
            height: 8,
            id: 'memoryProgress'
        });
        memorySection.appendChild(memoryProgress);
        resourcesContent.appendChild(memorySection);

        // Disk Usage
        const diskSection = document.createElement('div');
        diskSection.innerHTML = '<h4>Disk Usage</h4>';
        const diskProgress = ProgressBar.create({
            progress: 78,
            label: 'Disk',
            showPercentage: true,
            style: 'danger',
            height: 8,
            id: 'diskProgress'
        });
        diskSection.appendChild(diskProgress);
        resourcesContent.appendChild(diskSection);

        const card = Card.create({
            title: 'System Resources',
            icon: '💻',
            content: resourcesContent,
            collapsible: true,
            id: 'resourcesCard'
        });

        return card;
    }

    /**
     * Creates the activity feed card
     */
    createActivityCard() {
        const activityContent = `
            <div id="activityLog" class="activity-log">
                <div class="activity-item">
                    <span class="activity-time">2 min ago</span>
                    <span class="activity-text">Model training completed successfully</span>
                    <span class="activity-status success">✓</span>
                </div>
                <div class="activity-item">
                    <span class="activity-time">15 min ago</span>
                    <span class="activity-text">New dataset uploaded: customer_data_2024.csv</span>
                    <span class="activity-status info">ℹ</span>
                </div>
                <div class="activity-item">
                    <span class="activity-time">1 hour ago</span>
                    <span class="activity-text">System health check passed</span>
                    <span class="activity-status success">✓</span>
                </div>
            </div>
        `;

        const card = Card.create({
            title: 'Recent Activity',
            icon: '📊',
            content: activityContent,
            className: 'activity-card',
            id: 'activityCard'
        });

        return card;
    }

    /**
     * Updates metrics dynamically
     */
    updateMetrics(data) {
        // Update accuracy with animation
        if (data.accuracy !== undefined) {
            Metric.update('liveAccuracy', data.accuracy, { format: 'percent' });
        }

        // Update predictions per minute
        if (data.predictionsPerMinute !== undefined) {
            Metric.update('livePredictions', `${data.predictionsPerMinute}/min`, { format: 'custom' });
        }

        // Update system health
        if (data.systemHealth !== undefined) {
            const healthIcon = data.systemHealth === 'healthy' ? '✅' : 
                              data.systemHealth === 'warning' ? '⚠️' : '❌';
            Metric.update('systemHealth', healthIcon, { format: 'custom' });
        }
    }

    /**
     * Updates progress bars
     */
    updateProgress(type, value, options = {}) {
        switch (type) {
            case 'training':
                ProgressBar.update('mainProgressBar', value, {
                    label: options.label || 'Training in progress...',
                    style: value < 100 ? 'default' : 'success'
                });
                break;
            case 'cpu':
                ProgressBar.update('cpuProgress', value, {
                    style: value > 80 ? 'danger' : value > 60 ? 'warning' : 'default'
                });
                break;
            case 'memory':
                ProgressBar.update('memoryProgress', value, {
                    style: value > 80 ? 'danger' : value > 60 ? 'warning' : 'default'
                });
                break;
            case 'disk':
                ProgressBar.update('diskProgress', value, {
                    style: value > 90 ? 'danger' : value > 70 ? 'warning' : 'default'
                });
                break;
        }
    }

    /**
     * Creates a complete dashboard layout
     */
    createDashboardLayout() {
        const dashboard = document.createElement('div');
        dashboard.className = 'dashboard-container';

        // Main content area
        const mainContent = document.createElement('div');
        mainContent.className = 'main-content';

        // Create 2-column grid for main cards
        const mainGrid = Grid.create({
            columns: 2,
            gap: 'lg',
            responsive: { sm: 1, lg: 2 },
            children: [
                this.createSystemStatusCard(),
                this.createModelPerformanceCard()
            ]
        });
        mainContent.appendChild(mainGrid);

        // Create secondary grid for resources and activity
        const secondaryGrid = Grid.create({
            columns: 2,
            gap: 'lg',
            responsive: { sm: 1, lg: 2 },
            children: [
                this.createResourcesCard(),
                this.createActivityCard()
            ]
        });
        mainContent.appendChild(secondaryGrid);

        dashboard.appendChild(mainContent);
        return dashboard;
    }

    /**
     * Show model details (example method)
     */
    showModelDetails() {
        console.log('Showing model details...');
        // Implementation for showing model details
    }
}

// Export for use in other modules
export default DashboardComponents;