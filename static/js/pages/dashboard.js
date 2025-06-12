import { wsManager } from '../common/websocket.js';
import { API } from '../common/api.js';
import { ActivityFeed } from '../components/activity-feed.js';
import { formatDuration, formatBytes } from '../common/utils.js';
// Import only the core components needed for dashboard
import { Card, Metric, ProgressBar, Grid, initializeCoreUIStyles } from '../components/ui-core.js';
import { ButtonGroup, UploadArea, initializeFormUIStyles } from '../components/ui-forms.js';
import { ChartContainer, initializeChartUIStyles } from '../components/ui-charts.js';
import { BasePageController } from '../common/lifecycle.js';
import { StatefulPageController } from '../common/state-integration.js';
import { demoData } from '../common/demo-data.js';
import { CONFIG } from '../common/config.js';
// Import centralized error handling system
import { errorHandler, ErrorSeverity, ErrorCategory, RecoveryStrategy } from '../common/error-handler.js';
import { withErrorHandling } from '../common/error-utils.js';

/**
 * Dashboard Page Controller
 * Manages dashboard-specific functionality with state management
 */
class Dashboard extends BasePageController {
    constructor() {
        super(); // Initialize lifecycle management
        
        // Initialize state management manually
        this.state = null;
        this.stateAPI = null;
        this.subscriptions = new Set();
        
        try {
            // Import state functionality
            this.initializeStateManagement();
        } catch (error) {
            // State management initialization failed, continuing without state
        }
        
        this.currentFile = null;
        this.currentJobId = null;
        this.isTraining = false;
        this.activityFeed = null;
        
        // Wrap init() call to catch errors
        this.init().catch(error => {
            errorHandler.handleError(error, {
                severity: ErrorSeverity.HIGH,
                category: ErrorCategory.SYSTEM,
                recovery: RecoveryStrategy.FALLBACK,
                context: { component: 'Dashboard', action: 'constructor' },
                userMessage: 'Dashboard failed to initialize properly.'
            });
        });
    }
    
    async initializeStateManagement() {
        try {
            const { getGlobalState, getStateAwareAPI, initializeStateManagement } = await import('../common/state.js');
            this.state = getGlobalState();
            let api = getStateAwareAPI();
            if (!api) {
                api = initializeStateManagement(API);
            }
            this.stateAPI = api;
        } catch (error) {
            // Failed to initialize state management - fallback methods will handle it
        }
    }
    
    // Provide fallback state methods
    setState(key, value, options = {}) {
        if (this.state && this.state.set) {
            this.state.set(key, value, options);
        }
        return this;
    }
    
    getState(key, defaultValue = null) {
        if (this.state && this.state.get) {
            return this.state.get(key, defaultValue);
        }
        return defaultValue;
    }
    
    subscribeToState(key, callback) {
        if (this.state && this.state.subscribe) {
            const unsubscribe = this.state.subscribe(key, callback);
            this.subscriptions.add(unsubscribe);
            return unsubscribe;
        }
        return () => {}; // No-op unsubscribe
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
        
        // Initialize activity feed if container exists
        const activityContainer = document.getElementById('activityFeed');
        if (activityContainer) {
            this.activityFeed = new ActivityFeed('activityFeed');
        }
        
        // Replace static cards with dynamic components
        this.renderDynamicCards();
    }
    
    setupEventListeners() {
        // File upload - using managed event listener
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            this.addEventListener(fileInput, 'change', (e) => this.handleFileUpload(e));
        }
        
        // Upload area click and drag and drop - using managed event listeners
        const uploadArea = document.querySelector('.upload-area');
        if (uploadArea) {
            this.addEventListener(uploadArea, 'click', () => {
                const fileInput = document.getElementById('fileInput');
                if (fileInput) fileInput.click();
            });
            this.addEventListener(uploadArea, 'dragover', (e) => this.handleDragOver(e));
            this.addEventListener(uploadArea, 'dragleave', (e) => this.handleDragLeave(e));
            this.addEventListener(uploadArea, 'drop', (e) => this.handleFileDrop(e));
        }
        
        // Training button - using managed event listener
        const trainButton = document.getElementById('trainButton');
        if (trainButton) {
            this.addEventListener(trainButton, 'click', () => this.startTraining());
        }
        
        // Advanced options toggle - using managed event listener
        const advancedToggle = document.getElementById('advancedToggle');
        if (advancedToggle) {
            this.addEventListener(advancedToggle, 'click', (e) => {
                e.preventDefault();
                this.toggleAdvanced();
            });
        }
        
        // Use model button - using managed event listener
        const useModelButton = document.getElementById('useModelButton');
        if (useModelButton) {
            this.addEventListener(useModelButton, 'click', () => this.useModel());
        }
        
        // View details button - using managed event listener
        const viewDetailsButton = document.getElementById('viewDetailsButton');
        if (viewDetailsButton) {
            this.addEventListener(viewDetailsButton, 'click', () => this.viewDetails());
        }
    }
    
    setupWebSocketListeners() {
        // Training progress updates - using managed WebSocket handlers
        this.addWebSocketHandler('training_progress', (data) => {
            this.updateTrainingProgress(data);
        });
        
        // Training completed - using managed WebSocket handlers
        this.addWebSocketHandler('training_completed', (data) => {
            this.handleTrainingCompleted(data);
        });
        
        // Training failed - using managed WebSocket handlers
        this.addWebSocketHandler('training_failed', (data) => {
            this.handleTrainingFailed(data);
        });
        
        // System metrics updates - using managed WebSocket handlers
        this.addWebSocketHandler('system_metrics', (data) => {
            this.updateSystemMetrics(data);
        });
        
        // Health changes - using managed WebSocket handlers
        this.addWebSocketHandler('health_change', (data) => {
            this.updateSystemHealth(data);
        });
        
        // Prediction volume milestones - using managed WebSocket handlers
        this.addWebSocketHandler('prediction_volume', (data) => {
            this.handlePredictionVolume(data);
        });
        
        // Model deployed - using managed WebSocket handlers
        this.addWebSocketHandler('model_deployed', (data) => {
            this.handleModelDeployed(data);
        });
    }
    
    async loadInitialData() {
        try {
            // Load current models using cached API
            await this.loadCurrentModelMetrics();
            
            // Load system status using cached API
            await this.loadSystemStatus();
            
        } catch (error) {
            errorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.SYSTEM,
                recovery: RecoveryStrategy.FALLBACK,
                context: { component: 'Dashboard', action: 'loadInitialData' },
                userMessage: 'Failed to load dashboard data. Using fallback data.'
            });
        }
    }
    
    async loadCurrentModelMetrics() {
        try {
            let models = null;
            let activeModel = null;
            
            if (CONFIG.DEMO.ENABLED) {
                // Use demo data in demo mode
                models = await demoData.getModels();
                activeModel = models.find(m => m.status === 'active' || m.status === 'deployed');
            } else {
                // Use cached API call to prevent duplicate requests
                models = await this.loadCachedData('models');
                activeModel = models?.find(m => m.status === 'active' || m.status === 'deployed');
            }
            
            if (activeModel) {
                // Store in state for cross-page access
                this.setState('active_model', activeModel);
                
                this.updateCurrentModelDisplay(activeModel);
                this.updateModelPerformanceSection(activeModel);
            } else if (CONFIG.DEMO.ENABLED) {
                // Fallback to demo data if no active model found
                const demoModels = await demoData.getModels();
                const demoModel = demoModels[0]; // Use first demo model
                this.setState('active_model', demoModel);
                this.updateCurrentModelDisplay(demoModel);
                this.updateModelPerformanceSection(demoModel);
            }
        } catch (error) {
            errorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                context: { component: 'Dashboard', action: 'loadCurrentModelMetrics' },
                userMessage: 'Failed to load model metrics. Showing demo data.'
            });
            
            // Fallback to demo data on error if in demo mode
            if (CONFIG.DEMO.ENABLED) {
                try {
                    const demoModels = await demoData.getModels();
                    const demoModel = demoModels[0];
                    this.updateCurrentModelDisplay(demoModel);
                    this.updateModelPerformanceSection(demoModel);
                } catch (demoError) {
                    console.error('Failed to load demo model data:', demoError);
                }
            }
        }
    }
    
    updateModelPerformanceSection(model) {
        // Update model accuracy with enhanced tooltips
        const accuracyEl = document.getElementById('modelAccuracy');
        if (accuracyEl) {
            const accuracy = (model.accuracy * 100).toFixed(1);
            accuracyEl.textContent = `${accuracy}%`;
            
            if (model.validation_metrics) {
                const precision = (model.validation_metrics.precision * 100).toFixed(1);
                const recall = (model.validation_metrics.recall * 100).toFixed(1);
                const f1 = (model.validation_metrics.f1_score * 100).toFixed(1);
                accuracyEl.title = `Precision: ${precision}% | Recall: ${recall}% | F1: ${f1}%`;
            }
        }
        
        // Update prediction count with enhanced info
        const predictionEl = document.getElementById('predictionCount');
        if (predictionEl) {
            predictionEl.textContent = model.predictions_made || '0';
            
            if (model.training_samples) {
                predictionEl.title = `Training samples: ${model.training_samples} | Validation: ${model.validation_samples || 'N/A'}`;
            }
        }
        
        // Update response time with model size info
        const responseEl = document.getElementById('responseTime');
        if (responseEl) {
            // Use demo data if in demo mode and no real data available
            let responseTime = model.avg_response_time;
            if (!responseTime && CONFIG.DEMO.ENABLED) {
                // Get fallback from demo data instead of hardcoded value
                responseTime = 25; // Will be replaced with dynamic demo data in async context
            }
            responseEl.textContent = `${responseTime || 25}ms`;
            
            if (model.model_size) {
                responseEl.title = `Model size: ${model.model_size} | Algorithm: ${model.hyperparameters?.algorithm || 'Unknown'}`;
            }
        }
    }
    
    async loadSystemStatus() {
        try {
            let status = null;
            
            if (CONFIG.DEMO.ENABLED) {
                // Use demo data in demo mode
                status = await demoData.getSystemStatus();
            } else {
                // Use cached API call to prevent duplicate requests
                status = await this.loadCachedData('monitoring');
            }
            
            // Store in state for cross-page access
            this.setState('system_status', status);
            
            this.updateSystemStatusDisplay(status);
        } catch (error) {
            errorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                context: { component: 'Dashboard', action: 'loadSystemStatus' },
                userMessage: 'Failed to load system status. Using cached data.'
            });
            
            // Fallback to demo data on error if in demo mode
            if (CONFIG.DEMO.ENABLED) {
                try {
                    const demoStatus = await demoData.getSystemStatus();
                    this.setState('system_status', demoStatus);
                    this.updateSystemStatusDisplay(demoStatus);
                } catch (demoError) {
                    console.error('Failed to load demo system status:', demoError);
                }
            }
        }
    }
    
    updateCurrentModelDisplay(model) {
        // Update model name and info with enhanced details
        const modelNameEl = document.querySelector('.card strong');
        if (modelNameEl && model.name) {
            modelNameEl.textContent = `${model.name} v${model.version || '1.0.0'}`;
        }
        
        // Update model description with algorithm info
        const descriptionEl = document.querySelector('.card p');
        if (descriptionEl && model.hyperparameters) {
            const trainingTime = model.training_duration ? 
                `${Math.floor(model.training_duration / 60)}m ${Math.floor(model.training_duration % 60)}s` : 
                'Unknown';
            descriptionEl.innerHTML = `
                Last trained ${this.formatTimeAgo(model.created_at)} • 
                ${model.predictions_made || 0} predictions made<br>
                <small style="color: var(--text-secondary);">
                    ${model.hyperparameters?.algorithm || 'Unknown Algorithm'} • 
                    Training time: ${trainingTime} • 
                    ${model.training_samples || 0} samples
                </small>
            `;
        }
        
        // Update accuracy with validation metrics
        const accuracyEl = document.getElementById('liveAccuracy');
        if (accuracyEl) {
            const accuracy = (model.accuracy * 100).toFixed(1);
            const validationAcc = model.validation_metrics?.validation_accuracy ? 
                (model.validation_metrics.validation_accuracy * 100).toFixed(1) : accuracy;
            accuracyEl.textContent = `${accuracy}%`;
            accuracyEl.title = `Validation: ${validationAcc}% | F1: ${model.validation_metrics?.f1_score || 'N/A'}`;
        }
        
        // Update predictions with enhanced info
        const predictionsEl = document.getElementById('livePredictions');
        if (predictionsEl) {
            if (model.predictions_made > 0) {
                // Calculate rate based on model age
                const hoursSinceCreated = (Date.now() - new Date(model.created_at)) / (1000 * 60 * 60);
                const rate = Math.max(1, Math.round(model.predictions_made / hoursSinceCreated / 60));
                predictionsEl.textContent = `${rate}/min`;
                predictionsEl.title = `Total: ${model.predictions_made} | Avg response: ${model.avg_response_time}ms`;
            } else {
                predictionsEl.textContent = '0/min';
                predictionsEl.title = 'No predictions made yet';
            }
        }
    }
    
    formatTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (diffHours < 1) {
            const diffMins = Math.floor(diffMs / (1000 * 60));
            return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else {
            const diffDays = Math.floor(diffHours / 24);
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }
    }
    
    updateSystemStatusDisplay(status) {
        // Update system health indicator
        const healthEl = document.getElementById('systemHealth');
        if (healthEl) {
            healthEl.textContent = status.system_health === 'healthy' ? '✅' : '⚠️';
        }
        
        // Update training status if active
        if (status.active_training_jobs > 0) {
            this.showTrainingInProgress();
        }
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }
    
    handleDragOver(event) {
        event.preventDefault();
        event.target.classList.add('dragover');
    }
    
    handleDragLeave(event) {
        event.preventDefault();
        event.target.classList.remove('dragover');
    }
    
    handleFileDrop(event) {
        event.preventDefault();
        event.target.classList.remove('dragover');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }
    
    async processFile(file) {
        if (!file.name.endsWith('.csv')) {
            this.showError('Please select a CSV file');
            return;
        }
        
        const uploadArea = document.querySelector('.upload-area');
        const trainButton = document.getElementById('trainButton');
        
        try {
            // Show upload progress
            uploadArea.innerHTML = `
                <div class="upload-icon">📤</div>
                <h4>Uploading...</h4>
                <div class="progress-bar" style="margin-top: 1rem;">
                    <div class="progress-fill" id="uploadProgress" style="width: 0%"></div>
                </div>
            `;
            
            // Upload file with progress
            const result = await API.upload(file, (progress) => {
                const progressEl = document.getElementById('uploadProgress');
                if (progressEl) {
                    progressEl.style.width = `${progress}%`;
                }
            });
            
            // Update UI with success
            this.currentFile = result;
            this.showFileUploadSuccess(result);
            
            // Enable training button
            if (trainButton) {
                trainButton.disabled = false;
            }
            
        } catch (error) {
            errorHandler.handleError(error, {
                severity: ErrorSeverity.HIGH,
                category: ErrorCategory.UPLOAD,
                recovery: RecoveryStrategy.RETRY,
                context: { component: 'Dashboard', action: 'handleFileUpload', file: file?.name },
                userMessage: 'File upload failed. Please try again or check your file format.'
            });
            this.resetUploadArea();
        }
    }
    
    showFileUploadSuccess(result) {
        const uploadArea = document.querySelector('.upload-area');
        uploadArea.innerHTML = `
            <div class="upload-icon">✅</div>
            <h4>File uploaded successfully!</h4>
            <p style="color: var(--text-secondary); margin-top: var(--spacing-sm);">
                ${result.filename} (${result.rows} rows, ${result.columns} columns)
            </p>
        `;
    }
    
    resetUploadArea() {
        const uploadArea = document.querySelector('.upload-area');
        uploadArea.innerHTML = `
            <div class="upload-icon">📊</div>
            <h4>Upload Your Data</h4>
            <p style="color: var(--text-secondary); margin-top: var(--spacing-sm);">
                Click here or drag & drop your CSV file
            </p>
        `;
    }
    
    async startTraining() {
        if (!this.currentFile || this.isTraining) {
            return;
        }
        
        try {
            const response = await API.startTraining({
                file_path: this.currentFile.file_path,
                model_type: 'automatic'
            });
            
            this.currentJobId = response.job_id;
            this.isTraining = true;
            
            // Update UI
            this.showTrainingInProgress();
            
        } catch (error) {
            errorHandler.handleError(error, {
                severity: ErrorSeverity.HIGH,
                category: ErrorCategory.SYSTEM,
                recovery: RecoveryStrategy.RETRY,
                context: { component: 'Dashboard', action: 'startTraining', jobId: this.currentJobId },
                userMessage: 'Failed to start training. Please check your data and try again.'
            });
        }
    }
    
    showTrainingInProgress() {
        // Show detailed training card
        const detailedCard = document.getElementById('detailedTrainingCard');
        if (detailedCard) {
            detailedCard.style.display = 'block';
        }
        
        // Update training button
        const trainButton = document.getElementById('trainButton');
        if (trainButton) {
            ButtonGroup.setLoading(trainButton, true);
        }
    }
    
    updateTrainingProgress(data) {
        // Update main progress bar using new ProgressBar component
        ProgressBar.update('mainProgressBarContainer', data.progress, {
            label: data.stage || 'Training in progress...',
            style: data.progress < 100 ? 'default' : 'success'
        });
        
        // Update stage info
        const stageEl = document.getElementById('trainingStage');
        if (stageEl) {
            stageEl.textContent = data.current_stage;
        }
        
        const percentEl = document.getElementById('trainingPercent');
        if (percentEl) {
            percentEl.textContent = `${data.progress}%`;
        }
        
        // Update detailed progress if visible
        this.updateDetailedTrainingProgress(data);
    }
    
    updateDetailedTrainingProgress(data) {
        // Update current stage
        const currentStageEl = document.getElementById('currentTrainingStage');
        if (currentStageEl) {
            currentStageEl.textContent = data.current_stage;
        }
        
        // Update time remaining
        const timeRemainingEl = document.getElementById('trainingTimeRemaining');
        if (timeRemainingEl && data.estimated_remaining) {
            timeRemainingEl.textContent = `Estimated: ${data.estimated_remaining} remaining`;
        }
        
        // Update live accuracy if available
        if (data.live_accuracy) {
            const liveAccuracyEl = document.getElementById('liveTrainingAccuracy');
            if (liveAccuracyEl) {
                liveAccuracyEl.textContent = `${(data.live_accuracy * 100).toFixed(1)}%`;
            }
        }
        
        // Update predictions processed
        if (data.predictions_processed) {
            const predictionsEl = document.getElementById('predictionsProcessed');
            if (predictionsEl) {
                predictionsEl.textContent = data.predictions_processed.toLocaleString();
            }
        }
        
        // Update elapsed time
        if (data.elapsed_time) {
            const elapsedEl = document.getElementById('trainingElapsedTime');
            if (elapsedEl) {
                elapsedEl.textContent = data.elapsed_time;
            }
        }
    }
    
    handleTrainingCompleted(data) {
        this.isTraining = false;
        
        // Update progress to 100%
        ProgressBar.update('mainProgressBarContainer', 100, {
            label: `✅ Training completed! Accuracy: ${(data.final_accuracy * 100).toFixed(1)}%`,
            style: 'success'
        });
        
        // Show success message
        this.showSuccess(`Training completed! Final accuracy: ${(data.final_accuracy * 100).toFixed(1)}%`);
        
        // Reset training button
        const trainButton = document.getElementById('trainButton');
        if (trainButton) {
            ButtonGroup.setLoading(trainButton, false);
            trainButton.disabled = false;
        }
        
        // Hide detailed training card after a delay
        setTimeout(() => {
            const detailedCard = document.getElementById('detailedTrainingCard');
            if (detailedCard) {
                detailedCard.style.display = 'none';
            }
        }, 5000);
        
        // Reload model metrics
        this.loadCurrentModelMetrics();
    }
    
    handleTrainingFailed(data) {
        this.isTraining = false;
        
        // Show error
        this.showError(`Training failed: ${data.error || 'Unknown error'}`);
        
        // Reset UI
        const trainButton = document.getElementById('trainButton');
        if (trainButton) {
            ButtonGroup.setLoading(trainButton, false);
            trainButton.disabled = false;
        }
        
        const detailedCard = document.getElementById('detailedTrainingCard');
        if (detailedCard) {
            detailedCard.style.display = 'none';
        }
    }
    
    updateSystemMetrics(data) {
        // Update CPU usage
        if (data.cpu !== undefined) {
            Metric.update('cpuPercent', data.cpu, { format: 'percent' });
            ProgressBar.update('cpuProgressBar', data.cpu, {
                style: data.cpu > 80 ? 'danger' : data.cpu > 60 ? 'warning' : 'default'
            });
        }
        
        // Update memory usage
        if (data.memory !== undefined) {
            Metric.update('memoryPercent', data.memory, { format: 'percent' });
            ProgressBar.update('memoryProgressBar', data.memory, {
                style: data.memory > 80 ? 'danger' : data.memory > 60 ? 'warning' : 'default'
            });
        }
        
        // Update disk usage
        if (data.disk !== undefined) {
            Metric.update('diskPercent', data.disk, { format: 'percent' });
            ProgressBar.update('diskProgressBar', data.disk, {
                style: data.disk > 90 ? 'danger' : data.disk > 70 ? 'warning' : 'default'
            });
        }
        
        // Update active connections
        if (data.active_connections !== undefined) {
            const connEl = document.getElementById('activeConnections');
            if (connEl) connEl.textContent = data.active_connections;
        }
        
        // Update last update time
        const updateEl = document.getElementById('lastUpdateTime');
        if (updateEl) {
            updateEl.textContent = 'Just now';
        }
    }
    
    updateSystemHealth(data) {
        const healthEl = document.getElementById('systemHealth');
        if (healthEl) {
            switch (data.current_health) {
                case 'critical':
                    healthEl.textContent = '🚨';
                    break;
                case 'warning':
                    healthEl.textContent = '⚠️';
                    break;
                default:
                    healthEl.textContent = '✅';
            }
        }
    }
    
    handlePredictionVolume(data) {
        // Show notification for prediction milestones
        const message = data.message || `Prediction milestone reached: ${data.total_predictions} predictions!`;
        
        // Use global notifications object
        if (window.notifications) {
            window.notifications.show(message, 'info', 7000);
        }
        
        // Update prediction counter in the dashboard
        const totalPredictionsEl = document.getElementById('totalPredictions');
        if (totalPredictionsEl) {
            totalPredictionsEl.textContent = data.total_predictions.toLocaleString();
        }
        
        // Also update any model-specific prediction counters
        if (data.model_id) {
            const modelCard = document.querySelector(`[data-model-id="${data.model_id}"]`);
            if (modelCard) {
                const predCountEl = modelCard.querySelector('.prediction-count');
                if (predCountEl) {
                    predCountEl.textContent = `${data.total_predictions} predictions`;
                }
            }
        }
    }
    
    handleModelDeployed(data) {
        // Show notification for model deployment
        const modelName = data.model_name || 'Model';
        const accuracy = data.model_accuracy ? ` (${(data.model_accuracy * 100).toFixed(1)}% accuracy)` : '';
        const message = `🚀 ${modelName} has been deployed successfully${accuracy}!`;
        
        // Use global notifications object
        if (window.notifications) {
            window.notifications.show(message, 'success', 8000);
        }
        
        // Refresh models list to show updated deployment status
        this.loadCurrentModelMetrics();
        
        // Update deployment status if this model is currently displayed
        const modelCards = document.querySelectorAll('.metric-card');
        modelCards.forEach(card => {
            const modelNameEl = card.querySelector('.model-name');
            if (modelNameEl && modelNameEl.textContent === modelName) {
                // Add visual indicator for deployed status
                card.classList.add('deployed');
                
                // Update any status indicator
                const statusEl = card.querySelector('.model-status');
                if (statusEl) {
                    statusEl.textContent = 'Deployed';
                    statusEl.className = 'model-status deployed';
                }
            }
        });
        
        // Update active models count
        const activeModelsEl = document.getElementById('activeModels');
        if (activeModelsEl) {
            const currentCount = parseInt(activeModelsEl.textContent) || 0;
            activeModelsEl.textContent = currentCount + 1;
        }
    }
    
    toggleAdvanced() {
        const container = document.querySelector('.card');
        if (container) {
            container.classList.toggle('show-advanced');
            
            const link = document.querySelector('[onclick="toggleAdvanced()"]');
            if (link) {
                const isShowing = container.classList.contains('show-advanced');
                link.textContent = isShowing ? 'Hide Advanced Options' : 'Show Advanced Options';
            }
        }
    }
    
    showSuccess(message) {
        // Simple success notification - will be enhanced in future phases
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        // Simple error notification - will be enhanced in future phases
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        // Simple notification system - placeholder for future enhancement
        // Could be enhanced with toast notifications, sound alerts, etc.
        const event = new CustomEvent('notification', {
            detail: { message, type, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
    }
    
    useModel() {
        // Deploy the current model - will be implemented in Phase 2
        this.showSuccess('Model deployment feature coming in Phase 2');
    }
    
    viewDetails() {
        // Show detailed model information - will be implemented in Phase 2
        this.showSuccess('Model details view coming in Phase 2');
    }
    
    renderDynamicCards() {
        // Replace Live System Status card
        this.replaceLiveSystemStatusCard();
        
        // Replace System Performance Monitor card
        this.replaceSystemPerformanceCard();
        
        // Replace Activity Feed card
        this.replaceActivityFeedCard();
        
        // Replace main action buttons with ButtonGroups
        this.replaceActionButtons();
        
        // Replace upload area with UploadArea component
        this.replaceUploadArea();
    }
    
    replaceLiveSystemStatusCard() {
        const existingCard = document.querySelector('.main-content > .card:first-of-type');
        if (!existingCard) return;
        
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
        
        const newCard = Card.create({
            title: 'Live System Status',
            icon: '🔧',
            content: statusContent,
            className: 'system-status-card',
            id: 'systemStatusCard'
        });
        
        // Add training progress bar
        const progressContainer = newCard.querySelector('#trainingProgressContainer');
        const progressBar = ProgressBar.create({
            progress: 100,
            label: '🚀 Ready for New Training',
            showPercentage: true,
            style: 'success',
            id: 'mainProgressBarContainer'
        });
        progressContainer.appendChild(progressBar);
        
        // Add system metrics grid
        const metricsContainer = newCard.querySelector('#systemMetricsGrid');
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
        
        // Replace the existing card
        existingCard.parentNode.replaceChild(newCard, existingCard);
    }
    
    replaceSystemPerformanceCard() {
        // Find the System Performance Monitor card by looking for the specific title
        const cards = document.querySelectorAll('.card');
        let performanceCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('System Performance Monitor')) {
                performanceCard = card;
            }
        });
        
        if (!performanceCard) return;
        
        const resourcesContent = document.createElement('div');
        
        // System Metrics Grid
        const metricsGrid = Grid.createMetricGrid([
            {
                value: 0,
                label: 'CPU Usage',
                format: 'percent',
                id: 'cpuPercent',
                className: 'cpu-metric'
            },
            {
                value: 0,
                label: 'Memory Usage',
                format: 'percent',
                id: 'memoryPercent',
                className: 'memory-metric'
            },
            {
                value: 0,
                label: 'Disk Usage',
                format: 'percent',
                id: 'diskPercent',
                className: 'disk-metric'
            }
        ], {
            columns: 3,
            gap: 'lg',
            responsive: { sm: 1, md: 3 }
        });
        
        resourcesContent.appendChild(metricsGrid);
        
        // Add progress bars under each metric
        const cpuMetric = metricsGrid.querySelector('#cpuPercent').parentElement;
        const cpuProgress = ProgressBar.create({
            progress: 0,
            showPercentage: false,
            style: 'default',
            height: 8,
            id: 'cpuProgressBar'
        });
        cpuMetric.appendChild(cpuProgress);
        
        const memoryMetric = metricsGrid.querySelector('#memoryPercent').parentElement;
        const memoryProgress = ProgressBar.create({
            progress: 0,
            showPercentage: false,
            style: 'default',
            height: 8,
            id: 'memoryProgressBar'
        });
        memoryMetric.appendChild(memoryProgress);
        
        const diskMetric = metricsGrid.querySelector('#diskPercent').parentElement;
        const diskProgress = ProgressBar.create({
            progress: 0,
            showPercentage: false,
            style: 'default',
            height: 8,
            id: 'diskProgressBar'
        });
        diskMetric.appendChild(diskProgress);
        
        // System Health Status
        const healthStatus = document.createElement('div');
        healthStatus.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacing-lg); margin-bottom: var(--spacing-lg); padding: var(--spacing-md); border: 2px solid var(--border-color); border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.05);">
                <div>
                    <h4 style="margin: 0; display: flex; align-items: center; gap: var(--spacing-sm);">
                        <span id="systemStatusIcon">✅</span>
                        <span id="systemStatusText">System Healthy</span>
                    </h4>
                    <p style="margin: var(--spacing-sm) 0 0 0; color: var(--text-secondary); font-size: 0.9rem;" id="systemStatusDetail">
                        All metrics within normal range • Last updated: <span id="lastUpdateTime">Just now</span>
                    </p>
                </div>
                <div style="text-align: right;">
                    <div class="metric-value" id="activeConnections" style="font-size: 1.5rem; color: var(--success-color);">0</div>
                    <div class="metric-label">Active Connections</div>
                </div>
            </div>
        `;
        resourcesContent.appendChild(healthStatus);
        
        // Additional System Info Grid
        const infoGrid = Grid.create({
            columns: 2,
            gap: 'lg',
            responsive: { sm: 1, md: 2 },
            children: [
                this.createInfoPanel('Response Times', [
                    { label: 'API Average:', value: '23ms', id: 'apiResponseTime' },
                    { label: 'WebSocket:', value: '12ms', id: 'wsResponseTime' }
                ]),
                this.createInfoPanel('Resource Status', [
                    { label: 'ML Models:', value: '2 Active', id: 'totalModels' },
                    { label: 'Queue Jobs:', value: '0 Pending', id: 'queueJobs' }
                ])
            ]
        });
        resourcesContent.appendChild(infoGrid);
        
        const newCard = Card.create({
            title: 'System Performance Monitor',
            icon: '⚡',
            content: resourcesContent,
            collapsible: true,
            id: 'systemPerformanceCard'
        });
        
        performanceCard.parentNode.replaceChild(newCard, performanceCard);
    }
    
    createInfoPanel(title, items) {
        const panel = document.createElement('div');
        panel.style.cssText = 'padding: var(--spacing-md); background: var(--background-color); border-radius: var(--radius-md);';
        
        const titleEl = document.createElement('h5');
        titleEl.style.cssText = 'margin: 0 0 var(--spacing-sm) 0; color: var(--text-primary);';
        titleEl.textContent = title;
        panel.appendChild(titleEl);
        
        items.forEach((item, index) => {
            const row = document.createElement('div');
            row.style.cssText = `display: flex; justify-content: space-between; ${index < items.length - 1 ? 'margin-bottom: var(--spacing-sm);' : ''}`;
            row.innerHTML = `
                <span style="color: var(--text-secondary);">${item.label}</span>
                <span id="${item.id}" style="font-weight: 600;">${item.value}</span>
            `;
            panel.appendChild(row);
        });
        
        return panel;
    }
    
    replaceActivityFeedCard() {
        // Find the Activity Feed card
        const cards = document.querySelectorAll('.card');
        let activityCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Live Activity Feed')) {
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
            title: 'Live Activity Feed',
            icon: '🔍',
            content: activityContent,
            className: 'activity-feed-card',
            id: 'activityFeedCard'
        });
        
        activityCard.parentNode.replaceChild(newCard, activityCard);
        
        // Re-initialize activity feed
        const activityContainer = newCard.querySelector('#activityFeed');
        if (activityContainer && this.activityFeed) {
            this.activityFeed = new ActivityFeed('activityFeed');
        }
    }
    
    replaceActionButtons() {
        // Replace training button with ButtonGroup
        const trainButton = document.getElementById('trainButton');
        if (trainButton) {
            const buttonGroup = ButtonGroup.create({
                buttons: [
                    {
                        text: 'Start Training',
                        icon: '🚀',
                        variant: 'primary',
                        size: 'lg',
                        id: 'trainButton',
                        disabled: !this.currentFile,
                        onClick: () => this.startTraining()
                    }
                ],
                alignment: 'center',
                id: 'trainingButtonGroup'
            });
            
            trainButton.parentNode.replaceChild(buttonGroup, trainButton);
        }
        
        // Replace model action buttons with ButtonGroup
        const useModelButton = document.getElementById('useModelButton');
        if (useModelButton) {
            const modelButtons = ButtonGroup.create({
                buttons: [
                    {
                        text: 'Use This Model',
                        icon: '✅',
                        variant: 'success',
                        size: 'lg',
                        onClick: () => this.useModel()
                    },
                    {
                        text: 'View Details',
                        icon: '📊',
                        variant: 'secondary',
                        size: 'md',
                        onClick: () => this.viewDetails()
                    }
                ],
                alignment: 'center',
                id: 'modelActionButtonGroup'
            });
            
            // Replace both buttons and their container
            const buttonContainer = useModelButton.parentNode;
            buttonContainer.innerHTML = '';
            buttonContainer.appendChild(modelButtons);
        }
    }
    
    replaceUploadArea() {
        // Find existing upload area
        const existingUploadArea = document.querySelector('.upload-area');
        if (existingUploadArea) {
            const newUploadArea = UploadArea.create({
                accept: ['.csv', '.xlsx'],
                multiple: false,
                maxSize: 50,
                placeholder: 'Drag & drop your CSV file here or click to browse',
                onUpload: (file) => this.handleUploadAreaFile(file),
                onError: (errors) => this.showError(errors.join('\n')),
                id: 'modernUploadArea'
            });
            
            existingUploadArea.parentNode.replaceChild(newUploadArea, existingUploadArea);
        }
    }
    
    handleUploadAreaFile(file) {
        // Handle file from new UploadArea component
        this.processFileUpload(file);
    }
    
    processFileUpload(file) {
        // Process uploaded file - this method handles the file upload logic
        // Set state and call existing upload handling
        this.currentFile = { name: file.name, size: file.size };
        
        // Create FormData and call existing API upload logic
        const formData = new FormData();
        formData.append('file', file);
        
        // Call the existing handleFileUpload method logic
        this.uploadFileToServer(formData);
    }
    
    async uploadFileToServer(formData) {
        try {
            const result = await API.uploadFile(formData);
            this.currentFile = result;
            this.showFileUploadSuccess(result);
            
            // Enable training button
            const trainButton = document.getElementById('trainButton');
            if (trainButton) {
                trainButton.disabled = false;
            }
        } catch (error) {
            console.error('Upload failed:', error);
            this.showError(`Upload failed: ${error.message}`);
        }
    }

    /**
     * Custom cleanup logic for dashboard page
     */
    customCleanup() {
        // Clean up activity feed
        if (this.activityFeed && this.activityFeed.destroy) {
            this.activityFeed.destroy();
        }
        
        // Clean up state subscriptions
        if (this.cleanupState) {
            this.cleanupState();
        }
        
        // Reset training state
        this.isTraining = false;
        this.currentFile = null;
        this.currentJobId = null;
        
        console.log('Dashboard: Custom cleanup completed');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});

export { Dashboard };