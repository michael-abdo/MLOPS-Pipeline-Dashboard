import { wsManager } from '../common/websocket.js';
import { API } from '../common/api.js';
import { ActivityFeed } from '../components/activity-feed.js';

/**
 * Pipeline Page Controller
 * Manages pipeline creation, monitoring, and management
 */
class Pipeline {
    constructor() {
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
        // Initialize activity feed
        const activityContainer = document.getElementById('activityFeed');
        if (activityContainer) {
            this.activityFeed = new ActivityFeed('activityFeed');
        }
    }
    
    setupEventListeners() {
        // Template card clicks
        const templateCards = document.querySelectorAll('.template-card');
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
        
        // Pipeline action buttons
        document.addEventListener('click', (e) => {
            if (e.target.matches('.pipeline-actions .btn')) {
                const action = e.target.textContent.toLowerCase();
                const pipelineItem = e.target.closest('.pipeline-item');
                if (pipelineItem) {
                    this.handlePipelineAction(action, pipelineItem);
                }
            }
        });
    }
    
    setupWebSocketListeners() {
        // Pipeline status updates
        wsManager.on('pipeline_status', (data) => {
            this.updatePipelineStatus(data);
        });
        
        // Pipeline progress updates
        wsManager.on('pipeline_progress', (data) => {
            this.updatePipelineProgress(data);
        });
        
        // Pipeline completed
        wsManager.on('pipeline_completed', (data) => {
            this.handlePipelineCompleted(data);
        });
        
        // Pipeline failed
        wsManager.on('pipeline_failed', (data) => {
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
            console.error('Failed to load pipeline data:', error);
            this.showNotification('Failed to load pipeline data', 'error');
        }
    }
    
    async loadPipelineStats() {
        // Simulate loading pipeline statistics
        // In real implementation, this would call the backend API
        const stats = {
            active: 2,
            completedToday: 5,
            avgDuration: '12m'
        };
        
        this.updateStatsDisplay(stats);
    }
    
    async loadActivePipelines() {
        // Simulate loading active pipelines
        // In real implementation, this would call the backend API
        const pipelines = [
            {
                id: 'pipe-001',
                name: 'Customer Segmentation Training',
                description: 'Training RandomForest model with customer data',
                status: 'running',
                progress: 42,
                step: 'Feature Engineering (3/7)',
                startTime: Date.now() - 120000, // 2 minutes ago
            },
            {
                id: 'pipe-002',
                name: 'Product Recommendation Model',
                description: 'Collaborative filtering pipeline completed',
                status: 'completed',
                progress: 100,
                duration: '8m 34s',
                accuracy: 89.2,
                completedTime: Date.now() - 3600000, // 1 hour ago
            },
            {
                id: 'pipe-003',
                name: 'Fraud Detection Pipeline',
                description: 'Failed during data validation step',
                status: 'failed',
                progress: 15,
                error: 'Invalid column format',
                failedTime: Date.now() - 10800000, // 3 hours ago
            }
        ];
        
        this.pipelines = pipelines;
        this.renderPipelineList();
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
    
    createPipeline(template) {
        // Pipeline creation logic
        this.showNotification(`Creating ${template} pipeline...`, 'info');
        
        // Simulate pipeline creation
        setTimeout(() => {
            this.showNotification(`${template} pipeline created successfully!`, 'success');
            // In real implementation, this would:
            // 1. Call backend API to create pipeline
            // 2. Update pipeline list
            // 3. Start monitoring pipeline status
        }, 1000);
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
}

// Initialize pipeline page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Pipeline();
});

export { Pipeline };