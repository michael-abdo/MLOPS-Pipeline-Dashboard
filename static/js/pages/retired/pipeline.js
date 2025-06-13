import { wsManager } from '../common/websocket.js';
import { API } from '../common/api.js';
import { ActivityFeed } from '../components/activity-feed.js';
// Import only needed UI components (split modules for better performance)
import { Card, Metric, ProgressBar, Grid, initializeCoreUIStyles } from '../components/ui-core.js';
import { ButtonGroup, UploadArea, initializeFormUIStyles } from '../components/ui-forms.js';
import { ChartContainer, initializeChartUIStyles } from '../components/ui-charts.js';
import { BasePageController } from '../common/lifecycle.js';
import { ErrorHandler, ErrorSeverity, ErrorCategory, RecoveryStrategy } from '../common/error-handler.js';
import { withErrorHandling } from '../common/error-utils.js';

/**
 * Pipeline Page Controller
 * Manages pipeline creation, monitoring, and management
 */
class Pipeline extends BasePageController {
    constructor() {
        super(); // Initialize lifecycle management
        
        this.pipelines = [];
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
    }
    
    initializeComponents() {
        // Initialize UI components (split modules for better performance)
        initializeCoreUIStyles();
        initializeFormUIStyles();
        initializeChartUIStyles();
        
        // Initialize activity feed
        const activityContainer = document.getElementById('activityFeed');
        if (activityContainer) {
            this.activityFeed = new ActivityFeed('activityFeed');
        }
        
        // Replace static cards with dynamic components
        this.renderDynamicCards();
    }
    
    setupEventListeners() {
        // Template card clicks - using managed event listeners
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            const createBtn = card.querySelector('.btn');
            if (createBtn) {
                this.addEventListener(createBtn, 'click', (e) => {
                    e.stopPropagation();
                    const template = card.dataset.template;
                    this.createPipeline(template);
                });
            }
        });
        
        // Pipeline action buttons - using managed event listener
        const pipelineActionHandler = (e) => {
            if (e.target.matches('.pipeline-actions .btn')) {
                const action = e.target.textContent.toLowerCase();
                const pipelineItem = e.target.closest('.pipeline-item');
                if (pipelineItem) {
                    this.handlePipelineAction(action, pipelineItem);
                }
            }
        };
        this.addEventListener(document, 'click', pipelineActionHandler);
    }
    
    setupWebSocketListeners() {
        // Pipeline status updates - using managed WebSocket handlers
        this.addWebSocketHandler('pipeline_status', (data) => {
            this.updatePipelineStatus(data);
        });
        
        // Pipeline progress updates - using managed WebSocket handlers
        this.addWebSocketHandler('pipeline_progress', (data) => {
            this.updatePipelineProgress(data);
        });
        
        // Pipeline completed - using managed WebSocket handlers
        this.addWebSocketHandler('pipeline_completed', (data) => {
            this.handlePipelineCompleted(data);
        });
        
        // Pipeline failed - using managed WebSocket handlers
        this.addWebSocketHandler('pipeline_failed', (data) => {
            this.handlePipelineFailed(data);
        });
    }
    
    async loadInitialData() {
        try {
            // Load pipeline statistics
            await this.loadPipelineStats();
            
            // Load active pipelines
            await this.loadActivePipelines();
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.HIGH,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.RETRY,
                userMessage: 'Failed to load pipeline data. Please check your connection and try again.',
                context: { component: 'Pipeline', action: 'loadInitialData' }
            });
            this.showNotification('Failed to load pipeline data', 'error');
        }
    }
    
    async loadPipelineStats() {
        try {
            // Load real pipeline statistics from backend
            const pipelineData = await API.getPipelines();
            const pipelines = pipelineData.pipelines || [];
            
            // Calculate real statistics
            const activePipelines = pipelines.filter(p => p.status === 'running' || p.status === 'active');
            const completedToday = pipelines.filter(p => {
                if (p.status === 'completed' && p.updated_at) {
                    const updatedDate = new Date(p.updated_at);
                    const today = new Date();
                    return updatedDate.toDateString() === today.toDateString();
                }
                return false;
            });
            
            const stats = {
                active: activePipelines.length,
                completedToday: completedToday.length,
                avgDuration: '12m', // TODO: Calculate from real data
                total: pipelines.length
            };
            
            this.updateStatsDisplay(stats);
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                userMessage: 'Unable to load pipeline statistics. Showing default values.',
                context: { component: 'Pipeline', action: 'loadPipelineStats' }
            });
            // Fallback to default stats on error
            const stats = {
                active: 0,
                completedToday: 0,
                avgDuration: '--',
                total: 0
            };
            this.updateStatsDisplay(stats);
        }
    }
    
    async loadActivePipelines() {
        try {
            // Load real pipelines from backend API
            const pipelineData = await API.getPipelines();
            const pipelines = pipelineData.pipelines || [];
            
            // Transform backend data to match frontend expectations
            this.pipelines = pipelines.map(pipeline => ({
                id: pipeline.id,
                name: pipeline.name,
                description: pipeline.description || 'No description',
                status: pipeline.status || 'draft',
                progress: this.calculateProgress(pipeline),
                step: this.getCurrentStep(pipeline),
                startTime: pipeline.created_at ? new Date(pipeline.created_at).getTime() : Date.now(),
                completedTime: pipeline.updated_at ? new Date(pipeline.updated_at).getTime() : null,
                steps: pipeline.steps || []
            }));
            
            this.renderPipelineList();
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                userMessage: 'Unable to load active pipelines. Pipeline list is empty.',
                context: { component: 'Pipeline', action: 'loadActivePipelines' }
            });
            this.pipelines = [];
            this.renderPipelineList();
            this.showNotification('Failed to load pipelines', 'error');
        }
    }
    
    calculateProgress(pipeline) {
        if (pipeline.status === 'completed') return 100;
        if (pipeline.status === 'failed') return 0;
        if (pipeline.status === 'running') return 50; // Mock progress for now
        return 0;
    }
    
    getCurrentStep(pipeline) {
        if (pipeline.status === 'completed') return 'Completed';
        if (pipeline.status === 'failed') return 'Failed';
        if (pipeline.status === 'running') return 'Running...';
        if (pipeline.steps && pipeline.steps.length > 0) {
            return `${pipeline.steps[0].name || 'Step 1'} (1/${pipeline.steps.length})`;
        }
        return 'Ready to start';
    }
    
    updateStatsDisplay(stats) {
        const activePipelinesEl = document.getElementById('activePipelines');
        const completedTodayEl = document.getElementById('completedToday');
        const avgDurationEl = document.getElementById('avgDuration');
        
        if (activePipelinesEl) activePipelinesEl.textContent = stats.active;
        if (completedTodayEl) completedTodayEl.textContent = stats.completedToday;
        if (avgDurationEl) avgDurationEl.textContent = stats.avgDuration;
    }
    
    renderPipelineList() {
        const pipelineList = document.getElementById('pipelineList');
        if (!pipelineList) return;
        
        // Keep the existing static examples for now
        // In a real implementation, this would render dynamic pipeline data
        // This provides a foundation for future dynamic pipeline management
    }
    
    async createPipeline(template) {
        this.showNotification(`Creating ${template} pipeline...`, 'info');
        
        try {
            // Create real pipeline using backend API
            const pipelineData = this.getTemplateData(template);
            const result = await API.createPipeline(pipelineData);
            
            this.showNotification(`${template} pipeline created successfully!`, 'success');
            
            // Refresh pipeline list
            await this.loadActivePipelines();
            await this.loadPipelineStats();
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.VALIDATION,
                recovery: RecoveryStrategy.RETRY,
                userMessage: `Failed to create ${template} pipeline. Please check your configuration and try again.`,
                context: { component: 'Pipeline', action: 'createPipeline', template: template }
            });
            this.showNotification(`Failed to create ${template} pipeline: ${error.message}`, 'error');
        }
    }
    
    getTemplateData(template) {
        const templates = {
            'Classification': {
                name: 'Classification Pipeline',
                description: 'Standard classification pipeline with preprocessing and model training',
                steps: [
                    { name: 'Data Validation', type: 'validation' },
                    { name: 'Data Preprocessing', type: 'preprocessing' },
                    { name: 'Feature Engineering', type: 'feature_engineering' },
                    { name: 'Model Training', type: 'training' },
                    { name: 'Model Evaluation', type: 'evaluation' }
                ]
            },
            'Regression': {
                name: 'Regression Pipeline',
                description: 'Standard regression pipeline with feature selection',
                steps: [
                    { name: 'Data Validation', type: 'validation' },
                    { name: 'Data Preprocessing', type: 'preprocessing' },
                    { name: 'Feature Selection', type: 'feature_selection' },
                    { name: 'Model Training', type: 'training' },
                    { name: 'Model Evaluation', type: 'evaluation' }
                ]
            },
            'NLP': {
                name: 'NLP Pipeline',
                description: 'Natural language processing pipeline with text preprocessing',
                steps: [
                    { name: 'Text Preprocessing', type: 'text_preprocessing' },
                    { name: 'Tokenization', type: 'tokenization' },
                    { name: 'Feature Extraction', type: 'feature_extraction' },
                    { name: 'Model Training', type: 'training' },
                    { name: 'Model Evaluation', type: 'evaluation' }
                ]
            }
        };
        
        return templates[template] || {
            name: `${template} Pipeline`,
            description: `Custom ${template} pipeline`,
            steps: [
                { name: 'Data Processing', type: 'processing' },
                { name: 'Model Training', type: 'training' },
                { name: 'Evaluation', type: 'evaluation' }
            ]
        };
    }
    
    handlePipelineAction(action, pipelineItem) {
        const pipelineName = pipelineItem.querySelector('h4').textContent;
        
        switch (action) {
            case 'view':
                this.viewPipeline(pipelineName);
                break;
            case 'stop':
                this.stopPipeline(pipelineName);
                break;
            case 'deploy':
                this.deployPipeline(pipelineName);
                break;
            case 'retry':
                this.retryPipeline(pipelineName);
                break;
            case 'debug':
                this.debugPipeline(pipelineName);
                break;
            default:
                this.showNotification(`Unknown action: ${action}`, 'error');
        }
    }
    
    viewPipeline(name) {
        this.showNotification(`Opening detailed view for ${name}`, 'info');
        // Future: Open detailed pipeline view modal or navigate to detail page
    }
    
    stopPipeline(name) {
        this.showNotification(`Stopping pipeline: ${name}`, 'warning');
        // Future: Call API to stop pipeline execution
    }
    
    deployPipeline(name) {
        this.showNotification(`Deploying pipeline: ${name}`, 'success');
        // Future: Call API to deploy trained model
    }
    
    retryPipeline(name) {
        this.showNotification(`Retrying pipeline: ${name}`, 'info');
        // Future: Call API to retry failed pipeline
    }
    
    debugPipeline(name) {
        this.showNotification(`Opening debug view for ${name}`, 'info');
        // Future: Open debug console or logs view
    }
    
    updatePipelineStatus(data) {
        // Update pipeline status based on WebSocket data
        const pipeline = this.pipelines.find(p => p.id === data.pipelineId);
        if (pipeline) {
            pipeline.status = data.status;
            pipeline.progress = data.progress;
            this.renderPipelineList();
        }
    }
    
    updatePipelineProgress(data) {
        // Update pipeline progress based on WebSocket data
        const progressBar = document.querySelector(`[data-pipeline-id="${data.pipelineId}"] .progress-fill`);
        const progressText = document.querySelector(`[data-pipeline-id="${data.pipelineId}"] .progress-text`);
        
        if (progressBar) {
            progressBar.style.width = `${data.progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${data.progress}%`;
        }
    }
    
    handlePipelineCompleted(data) {
        this.showNotification(`Pipeline completed: ${data.pipelineName}`, 'success');
        
        // Update pipeline status
        const pipeline = this.pipelines.find(p => p.id === data.pipelineId);
        if (pipeline) {
            pipeline.status = 'completed';
            pipeline.progress = 100;
            pipeline.accuracy = data.accuracy;
            this.renderPipelineList();
        }
        
        // Update stats
        this.loadPipelineStats();
    }
    
    handlePipelineFailed(data) {
        this.showNotification(`Pipeline failed: ${data.pipelineName} - ${data.error}`, 'error');
        
        // Update pipeline status
        const pipeline = this.pipelines.find(p => p.id === data.pipelineId);
        if (pipeline) {
            pipeline.status = 'failed';
            pipeline.error = data.error;
            this.renderPipelineList();
        }
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
        
        console.log(`${emoji[type] || 'ℹ️'} Pipeline: ${message}`);
    }
    
    renderDynamicCards() {
        // Replace all static cards with dynamic components
        this.replaceActivePipelinesCard();
        this.replaceCreatePipelineCard();
        this.replacePipelineStatusCard();
        this.replacePipelineAnalyticsCard();
        this.replaceActivityCard();
    }
    
    replaceActivePipelinesCard() {
        const overviewCard = document.querySelector('.card:first-of-type');
        if (!overviewCard) return;
        
        const metricsData = [
            {
                value: 2,
                label: 'Active Pipelines',
                format: 'number',
                id: 'activePipelines'
            },
            {
                value: 5,
                label: 'Completed Today',
                format: 'number',
                id: 'completedToday'
            },
            {
                value: '12m',
                label: 'Avg Duration',
                format: 'custom',
                id: 'avgDuration'
            }
        ];
        
        const metricsGrid = Grid.createMetricGrid(metricsData, {
            columns: 3,
            gap: 'lg',
            responsive: { sm: 1, md: 3 }
        });
        
        const newCard = Card.create({
            title: 'Active Pipelines',
            icon: '🔄',
            content: metricsGrid,
            id: 'activePipelinesCard'
        });
        
        overviewCard.parentNode.replaceChild(newCard, overviewCard);
    }
    
    replaceCreatePipelineCard() {
        const cards = document.querySelectorAll('.card');
        let createCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Create New Pipeline')) {
                createCard = card;
            }
        });
        
        if (!createCard) return;
        
        const templatesContent = document.createElement('div');
        templatesContent.className = 'pipeline-templates';
        
        // Copy existing templates content
        const existingTemplates = createCard.querySelector('.pipeline-templates');
        if (existingTemplates) {
            templatesContent.innerHTML = existingTemplates.innerHTML;
        }
        
        const newCard = Card.create({
            title: 'Create New Pipeline',
            icon: '⚡',
            content: templatesContent,
            id: 'createPipelineCard'
        });
        
        createCard.parentNode.replaceChild(newCard, createCard);
        
        // Re-attach event listeners for template buttons
        const templateCards = newCard.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            const createBtn = card.querySelector('.btn');
            if (createBtn) {
                createBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const template = card.dataset.template;
                    this.createPipeline(template);
                });
            }
        });
    }
    
    replacePipelineStatusCard() {
        const cards = document.querySelectorAll('.card');
        let statusCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Pipeline Status')) {
                statusCard = card;
            }
        });
        
        if (!statusCard) return;
        
        const statusContent = document.createElement('div');
        statusContent.className = 'pipeline-list';
        statusContent.id = 'pipelineList';
        
        // Copy existing pipeline list content and update progress bars
        const existingList = statusCard.querySelector('.pipeline-list');
        if (existingList) {
            statusContent.innerHTML = existingList.innerHTML;
            
            // Replace progress bars in pipeline items
            const pipelineItems = statusContent.querySelectorAll('.pipeline-item');
            pipelineItems.forEach(item => {
                const progressDiv = item.querySelector('.pipeline-progress');
                const oldProgressBar = progressDiv.querySelector('.progress-bar');
                const progressText = progressDiv.querySelector('.progress-text');
                const progressValue = oldProgressBar ? 
                    parseInt(oldProgressBar.querySelector('.progress-fill').style.width) : 0;
                
                // Determine style based on status
                let style = 'default';
                if (item.classList.contains('completed')) style = 'success';
                else if (item.classList.contains('failed')) style = 'danger';
                
                progressDiv.innerHTML = '';
                const newProgressBar = ProgressBar.create({
                    progress: progressValue,
                    showPercentage: true,
                    style: style,
                    animated: item.classList.contains('running'),
                    height: 12
                });
                progressDiv.appendChild(newProgressBar);
            });
        }
        
        const newCard = Card.create({
            title: 'Pipeline Status',
            icon: '📋',
            content: statusContent,
            id: 'pipelineStatusCard'
        });
        
        statusCard.parentNode.replaceChild(newCard, statusCard);
    }
    
    replacePipelineAnalyticsCard() {
        const cards = document.querySelectorAll('.card');
        let analyticsCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Pipeline Analytics')) {
                analyticsCard = card;
            }
        });
        
        if (!analyticsCard) return;
        
        const analyticsContent = document.createElement('div');
        
        const analyticsGrid = Grid.create({
            columns: 2,
            gap: 'lg',
            responsive: { sm: 1, md: 2 },
            children: [
                this.createAnalyticsMetric('Success Rate (Last 30 Days)', '94.5%', '+2.3%', 'positive'),
                this.createAnalyticsMetric('Average Execution Time', '8m 42s', '+1.2m', 'negative')
            ]
        });
        
        analyticsContent.appendChild(analyticsGrid);
        
        const newCard = Card.create({
            title: 'Pipeline Analytics',
            icon: '📊',
            content: analyticsContent,
            id: 'pipelineAnalyticsCard'
        });
        
        analyticsCard.parentNode.replaceChild(newCard, analyticsCard);
    }
    
    createAnalyticsMetric(title, value, trend, trendType) {
        const metricDiv = document.createElement('div');
        metricDiv.innerHTML = `
            <h4>${title}</h4>
            <div class="metric-large">
                <span class="metric-value">${value}</span>
                <span class="metric-trend ${trendType}">${trend}</span>
            </div>
        `;
        return metricDiv;
    }
    
    replaceActivityCard() {
        const cards = document.querySelectorAll('.card');
        let activityCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Pipeline Activity')) {
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
            title: 'Pipeline Activity',
            icon: '🔍',
            content: activityContent,
            id: 'pipelineActivityCard'
        });
        
        activityCard.parentNode.replaceChild(newCard, activityCard);
        
        // Re-initialize activity feed
        const activityContainer = newCard.querySelector('#activityFeed');
        if (activityContainer && this.activityFeed) {
            this.activityFeed = new ActivityFeed('activityFeed');
        }
    }
    
    updateStatsDisplay(stats) {
        // Update stats using new Metric component
        Metric.update('activePipelines', stats.active, { format: 'number' });
        Metric.update('completedToday', stats.completedToday, { format: 'number' });
        Metric.update('avgDuration', stats.avgDuration, { format: 'custom' });
    }
    
    updatePipelineProgress(data) {
        // Update pipeline progress using ProgressBar component
        const pipelineItem = document.querySelector(`[data-pipeline-id="${data.pipelineId}"]`);
        if (pipelineItem) {
            const progressContainer = pipelineItem.querySelector('.pipeline-progress');
            if (progressContainer) {
                const progressBar = progressContainer.querySelector('.progress-container');
                if (progressBar) {
                    ProgressBar.update(progressBar, data.progress);
                }
            }
        }
    }

    /**
     * Custom cleanup logic for pipeline page
     */
    customCleanup() {
        // Clean up activity feed
        if (this.activityFeed && this.activityFeed.destroy) {
            this.activityFeed.destroy();
        }
        
        // Clear pipelines data
        this.pipelines = [];
        
        console.log('Pipeline: Custom cleanup completed');
    }
}

// Initialize pipeline page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Pipeline();
});

export { Pipeline };