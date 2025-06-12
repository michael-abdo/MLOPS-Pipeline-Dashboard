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
            console.error('Failed to load pipeline stats:', error);
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
            console.error('Failed to load pipelines:', error);
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
            console.error('Failed to create pipeline:', error);
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
}

// Initialize pipeline page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Pipeline();
});

export { Pipeline };