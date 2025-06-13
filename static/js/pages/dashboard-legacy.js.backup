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
        
        // Start time-ago updater
        this.startTimeAgoUpdater();
        
        // Set up auto-refresh fallback
        this.setupAutoRefresh();
        
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
        
        // Upload area drag and drop - using managed event listeners (click handled by UploadArea component)
        const uploadArea = document.querySelector('.upload-area');
        if (uploadArea) {
            // Don't add click listener here - UploadArea component handles clicks
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
        
        // Activity updates - using managed WebSocket handlers
        this.addWebSocketHandler('activity_update', (data) => {
            this.handleActivityUpdate(data);
        });
        
        // Model status changes
        this.addWebSocketHandler('model_status_change', (data) => {
            this.handleModelStatusChange(data);
        });
        
        // File validation events
        this.addWebSocketHandler('file_validated', (data) => {
            this.handleFileValidated(data);
        });
        
        // Model metrics updates
        this.addWebSocketHandler('model_metrics_update', (data) => {
            this.updateModelMetrics(data);
        });
        
        // Connection count updates
        this.addWebSocketHandler('connection_count', (data) => {
            this.updateConnectionCount(data);
        });
        
        // Performance metrics
        this.addWebSocketHandler('performance_metrics', (data) => {
            this.updatePerformanceMetrics(data);
        });
        
        // Resource status updates
        this.addWebSocketHandler('resource_status', (data) => {
            this.updateResourceStatus(data);
        });
        
        // Chart data updates for real-time visualizations
        this.addWebSocketHandler('chart_data', (data) => {
            // This will be used for future chart implementations
        });
        
        // Integration status for architecture page
        this.addWebSocketHandler('integration_status', (data) => {
            // This will be used for integration monitoring
        });
        
        // Upload progress events
        this.addWebSocketHandler('upload_progress', (data) => {
            this.handleUploadProgress(data);
        });
        
        // System alerts
        this.addWebSocketHandler('system_alert', (data) => {
            this.handleSystemAlert(data);
        });
        
        // Prediction logged events for real-time prediction tracking
        this.addWebSocketHandler('prediction_logged', (data) => {
            this.handlePredictionLogged(data);
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
                    // Failed to load demo model data - continue with empty state
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
                    // Failed to load demo system status - continue with empty state
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
        if (descriptionEl) {
            const trainingTime = model.training_duration ? 
                `${Math.floor(model.training_duration / 60)}m ${Math.floor(model.training_duration % 60)}s` : 
                'Unknown';
            
            // Create time ago element with data-timestamp
            const timeAgo = model.created_at ? this.formatTimeAgo(model.created_at) : 'Unknown';
            
            descriptionEl.innerHTML = `
                Last trained <span data-timestamp="${model.created_at}">${timeAgo}</span> • 
                <span id="modelPredictionCount">${model.predictions_made || 0}</span> predictions made<br>
                ${model.hyperparameters ? `<small style="color: var(--text-secondary);">
                    ${model.hyperparameters?.algorithm || 'Unknown Algorithm'} • 
                    Training time: ${trainingTime} • 
                    ${model.training_samples || 0} samples
                </small>` : ''}
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
    
    startTimeAgoUpdater() {
        // Update time-ago displays every 30 seconds with enhanced formatting
        if (this.timeAgoInterval) {
            clearInterval(this.timeAgoInterval);
        }
        
        this.timeAgoInterval = setInterval(() => {
            // Update all elements with data-timestamp attribute
            document.querySelectorAll('[data-timestamp]').forEach(el => {
                const timestamp = el.getAttribute('data-timestamp');
                if (timestamp) {
                    const oldText = el.textContent;
                    const newText = this.formatTimeAgo(timestamp);
                    
                    if (oldText !== newText) {
                        // Add subtle animation when time updates
                        el.style.transition = 'opacity 0.2s ease';
                        el.style.opacity = '0.7';
                        
                        setTimeout(() => {
                            el.textContent = newText;
                            el.style.opacity = '1';
                        }, 100);
                        
                        setTimeout(() => {
                            el.style.transition = '';
                        }, 300);
                    }
                }
            });
            
            // Also update "Last trained X ago" in model status
            this.updateModelTimestamps();
        }, 30000); // Update every 30 seconds
    }
    
    updateModelTimestamps() {
        // Update model training timestamps dynamically
        const modelDescEl = document.querySelector('.card p');
        if (modelDescEl && modelDescEl.querySelector('[data-timestamp]')) {
            const timestampEl = modelDescEl.querySelector('[data-timestamp]');
            const timestamp = timestampEl.getAttribute('data-timestamp');
            if (timestamp) {
                timestampEl.textContent = this.formatTimeAgo(timestamp);
            }
        }
    }
    
    setupAutoRefresh() {
        // Set up auto-refresh fallback when WebSocket is disconnected
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        this.autoRefreshInterval = setInterval(() => {
            const connInfo = wsManager.getConnectionInfo();
            
            // Only refresh if WebSocket is disconnected or in error state
            if (!connInfo.isConnected && (connInfo.status === 'disconnected' || connInfo.status === 'error')) {
                this.performOfflineRefresh();
            }
        }, 30000); // Check every 30 seconds
    }
    
    async performOfflineRefresh() {
        const api = this.stateAPI || API;
        
        try {
            // Poll /api/models endpoint every 30s for model updates
            const modelsData = await api.get('/api/models');
            if (modelsData && Array.isArray(modelsData)) {
                const activeModel = modelsData.find(m => m.status === 'active' || m.status === 'deployed');
                if (activeModel) {
                    // Update model metrics in Live System Status
                    this.updateCurrentModelDisplay(activeModel);
                    this.updateModelPerformanceSection(activeModel);
                    
                    // Simulate model_metrics_update event
                    this.updateModelMetrics({
                        accuracy: activeModel.accuracy,
                        predictions_made: activeModel.predictions_made,
                        avg_response_time: activeModel.avg_response_time,
                        predictions_per_minute: activeModel.predictions_per_minute || 0
                    });
                    
                    // Update Live System Status metrics
                    const systemMetrics = {
                        model_accuracy: activeModel.accuracy,
                        predictions_per_minute: activeModel.predictions_per_minute || 0,
                        current_accuracy: activeModel.accuracy,
                        prediction_rate: activeModel.predictions_per_minute || 0
                    };
                    this.updateSystemMetrics(systemMetrics);
                }
            }
        } catch (error) {
            console.error('Failed to refresh models data:', error);
        }
        
        try {
            // Refresh system status and metrics
            const systemStatus = await api.get('/api/monitoring/system');
            if (systemStatus) {
                this.updateSystemMetrics(systemStatus);
                this.updateSystemStatusDisplay(systemStatus);
            }
        } catch (error) {
            console.error('Failed to refresh system metrics:', error);
        }
        
        try {
            // Refresh activity feed
            if (this.activityFeed) {
                const activities = await api.get('/api/activity');
                if (activities && Array.isArray(activities)) {
                    this.activityFeed.setActivities(activities.slice(0, 50)); // Limit to 50 items
                }
            }
        } catch (error) {
            console.error('Failed to refresh activities:', error);
        }
        
        // Update disconnected indicator
        const lastUpdateEl = document.getElementById('lastUpdateTime');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = 'Refreshed (offline mode)';
            lastUpdateEl.style.color = 'var(--warning-color)';
            lastUpdateEl.setAttribute('data-timestamp', Date.now());
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
        // Initialize training state
        this.trainingStartTime = Date.now();
        this.currentStageStartTime = Date.now();
        this.lastCurrentStage = null;
        
        // Show detailed training card with animation
        const detailedCard = document.getElementById('detailedTrainingCard');
        if (detailedCard) {
            detailedCard.style.display = 'block';
            detailedCard.style.opacity = '0';
            detailedCard.style.transform = 'translateY(20px)';
            detailedCard.style.transition = 'all 0.5s ease';
            
            setTimeout(() => {
                detailedCard.style.opacity = '1';
                detailedCard.style.transform = 'translateY(0)';
            }, 100);
        }
        
        // Initialize the detailed training monitor
        const initialData = {
            current_stage: 'Preparing data',
            progress: 0,
            stage_index: 1,
            total_stages: 8,
            stages_completed: [],
            live_accuracy: 0,
            predictions_processed: 0,
            estimated_time_remaining: 600 // 10 minutes estimate
        };
        this.updateDetailedTrainingProgress(initialData);
        
        // Start training timers
        this.startTrainingTimers();
        
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
            stageEl.innerHTML = `<span aria-hidden="true">🔄</span> ${data.current_stage || data.stage || 'Training'}`;
        }
        
        const percentEl = document.getElementById('trainingPercent');
        if (percentEl) {
            percentEl.textContent = `${data.progress}%`;
        }
        
        // Show detailed training card if not visible
        const detailedCard = document.getElementById('detailedTrainingCard');
        if (detailedCard && detailedCard.style.display === 'none') {
            this.showTrainingInProgress();
        }
        
        // Update training details
        const detailsEl = document.getElementById('trainingDetails');
        if (detailsEl) {
            if (data.message) {
                detailsEl.textContent = data.message;
            } else if (data.estimated_remaining) {
                detailsEl.textContent = `${data.current_stage} • ${data.progress}% complete • Est. ${data.estimated_remaining} remaining`;
            }
        }
        
        // Update detailed progress if visible
        this.updateDetailedTrainingProgress(data);
    }
    
    updateDetailedTrainingProgress(data) {
        // Initialize training start time if not set
        if (!this.trainingStartTime && data.progress > 0) {
            this.trainingStartTime = Date.now();
            this.startTrainingTimers();
        }
        
        // Update Training Stages Timeline
        this.updateTrainingStagesTimeline(data);
        
        // Update Live Training Metrics
        this.updateLiveTrainingMetrics(data);
        
        // Update Training Status Messages
        this.updateTrainingStatusMessages(data);
    }
    
    updateTrainingStagesTimeline(data) {
        // Update current stage with animation
        const currentStageEl = document.getElementById('currentTrainingStage');
        if (currentStageEl && data.current_stage) {
            if (currentStageEl.textContent !== data.current_stage) {
                // Animate stage change
                currentStageEl.style.transition = 'opacity 0.3s ease';
                currentStageEl.style.opacity = '0.5';
                
                setTimeout(() => {
                    currentStageEl.textContent = data.current_stage;
                    currentStageEl.style.opacity = '1';
                }, 150);
            }
        }
        
        // Update time remaining with formatting
        const timeRemainingEl = document.getElementById('trainingTimeRemaining');
        if (timeRemainingEl) {
            if (data.estimated_time_remaining !== undefined) {
                const timeStr = this.formatTrainingTime(data.estimated_time_remaining);
                timeRemainingEl.textContent = `Estimated: ${timeStr} remaining`;
            } else if (data.estimated_remaining) {
                timeRemainingEl.textContent = `Estimated: ${data.estimated_remaining} remaining`;
            }
        }
        
        // Update stages progress bar with smooth animation
        if (data.stage_index !== undefined && data.total_stages) {
            const progressBar = document.getElementById('stagesProgressBar');
            if (progressBar) {
                const progress = (data.stage_index / data.total_stages) * 100;
                progressBar.style.transition = 'width 0.5s ease';
                progressBar.style.width = `${progress}%`;
            }
            
            const progressText = document.getElementById('stageProgressText');
            if (progressText) {
                progressText.textContent = `Stage ${data.stage_index}/${data.total_stages}`;
            }
        }
        
        // Update training stages list with animations
        this.updateTrainingStagesList(data);
    }
    
    updateTrainingStagesList(data) {
        const stagesList = document.getElementById('trainingStagesList');
        if (!stagesList) return;
        
        const stageItems = stagesList.querySelectorAll('.stage-item');
        
        // Define standard training stages if not provided
        const standardStages = [
            { name: 'Preparing data', icon: '📋', estimatedTime: 75 },
            { name: 'Data validation', icon: '🔍', estimatedTime: 45 },
            { name: 'Feature engineering', icon: '⚙️', estimatedTime: 120 },
            { name: 'Model selection', icon: '🎯', estimatedTime: 90 },
            { name: 'Training model', icon: '🧠', estimatedTime: 180 },
            { name: 'Validation', icon: '✅', estimatedTime: 60 },
            { name: 'Optimization', icon: '⚡', estimatedTime: 90 },
            { name: 'Finalizing model', icon: '🎉', estimatedTime: 30 }
        ];
        
        stageItems.forEach((item, index) => {
            const stageName = item.querySelector('.stage-name').textContent;
            const stageIcon = item.querySelector('.stage-icon');
            const stageTime = item.querySelector('.stage-time');
            
            let newStatus = 'pending';
            let newIcon = '⏳';
            
            // Determine stage status
            if (data.stages_completed && data.stages_completed.includes(stageName)) {
                newStatus = 'completed';
                newIcon = '✅';
                
                // Update elapsed time for completed stages
                if (data.stage_times && data.stage_times[stageName]) {
                    const elapsedTime = this.formatTrainingTime(data.stage_times[stageName]);
                    stageTime.textContent = elapsedTime;
                    stageTime.style.color = 'var(--success-color)';
                }
            } else if (stageName === data.current_stage) {
                newStatus = 'active';
                newIcon = '🔄';
                
                // Show real-time elapsed time for current stage
                if (this.currentStageStartTime) {
                    const elapsed = Math.floor((Date.now() - this.currentStageStartTime) / 1000);
                    stageTime.textContent = this.formatTrainingTime(elapsed);
                    stageTime.style.color = 'var(--primary-color)';
                }
            } else {
                newStatus = 'pending';
                const stageInfo = standardStages[index];
                if (stageInfo) {
                    newIcon = stageInfo.icon;
                    stageTime.textContent = this.formatTrainingTime(stageInfo.estimatedTime);
                    stageTime.style.color = 'var(--text-secondary)';
                }
            }
            
            // Animate status changes
            if (item.className !== `stage-item ${newStatus}`) {
                item.style.transition = 'all 0.3s ease';
                item.className = `stage-item ${newStatus}`;
                
                // Animate icon change
                if (stageIcon.textContent !== newIcon) {
                    stageIcon.style.transform = 'scale(1.2)';
                    stageIcon.textContent = newIcon;
                    
                    setTimeout(() => {
                        stageIcon.style.transform = 'scale(1)';
                    }, 200);
                }
            }
        });
        
        // Track current stage start time for elapsed time calculation
        if (data.current_stage && this.lastCurrentStage !== data.current_stage) {
            this.currentStageStartTime = Date.now();
            this.lastCurrentStage = data.current_stage;
        }
    }
    
    updateLiveTrainingMetrics(data) {
        // Update live accuracy with trend indicator
        if (data.live_accuracy !== undefined) {
            const liveAccuracyEl = document.getElementById('liveTrainingAccuracy');
            if (liveAccuracyEl) {
                const newAccuracy = (data.live_accuracy * 100).toFixed(1);
                const oldAccuracy = parseFloat(liveAccuracyEl.textContent) || 0;
                
                // Add trend indicator
                let trendIcon = '';
                if (newAccuracy > oldAccuracy) {
                    trendIcon = ' <span style="color: var(--success-color); font-size: 0.8em;">↗️</span>';
                } else if (newAccuracy < oldAccuracy) {
                    trendIcon = ' <span style="color: var(--warning-color); font-size: 0.8em;">↘️</span>';
                } else if (oldAccuracy > 0) {
                    trendIcon = ' <span style="color: var(--text-secondary); font-size: 0.8em;">→</span>';
                }
                
                // Animate accuracy change
                if (Math.abs(newAccuracy - oldAccuracy) > 0.1) {
                    liveAccuracyEl.style.transition = 'all 0.3s ease';
                    liveAccuracyEl.style.transform = 'scale(1.1)';
                    liveAccuracyEl.style.color = 'var(--success-color)';
                    
                    setTimeout(() => {
                        liveAccuracyEl.style.transform = 'scale(1)';
                        liveAccuracyEl.style.color = 'var(--primary-color)';
                    }, 300);
                }
                
                liveAccuracyEl.innerHTML = `${newAccuracy}%${trendIcon}`;
            }
        }
        
        // Update predictions processed with smooth increment
        if (data.predictions_processed !== undefined) {
            const predictionsEl = document.getElementById('predictionsProcessed');
            if (predictionsEl) {
                const newCount = data.predictions_processed;
                const oldCount = parseInt(predictionsEl.textContent.replace(/,/g, '')) || 0;
                
                if (newCount > oldCount) {
                    // Animate counter increment
                    this.animateCounter(predictionsEl, oldCount, newCount, 1000);
                } else {
                    predictionsEl.textContent = newCount.toLocaleString();
                }
            }
        }
        
        // The elapsed time will be updated by the real-time timer
    }
    
    updateTrainingStatusMessages(data) {
        // Update training status message with detailed info
        const statusMsgEl = document.getElementById('trainingStatusMessage');
        if (statusMsgEl) {
            let statusMessage = '';
            
            if (data.current_stage && data.progress !== undefined) {
                statusMessage = `${data.current_stage} - ${data.progress}% complete`;
                
                if (data.estimated_time_remaining !== undefined) {
                    const timeStr = this.formatTrainingTime(data.estimated_time_remaining);
                    statusMessage += ` • Estimated: ${timeStr} remaining`;
                } else if (data.estimated_remaining) {
                    statusMessage += ` • Estimated: ${data.estimated_remaining} remaining`;
                }
                
                if (data.live_accuracy !== undefined) {
                    statusMessage += ` • Accuracy: ${(data.live_accuracy * 100).toFixed(1)}%`;
                }
                
                if (data.current_epoch && data.total_epochs) {
                    statusMessage += ` • Epoch: ${data.current_epoch}/${data.total_epochs}`;
                }
            } else if (data.message) {
                statusMessage = data.message;
            }
            
            statusMsgEl.textContent = statusMessage;
        }
        
        // Update last update timestamp
        this.updateTrainingLastUpdate();
    }
    
    updateTrainingLastUpdate() {
        const lastUpdateEl = document.getElementById('trainingLastUpdate');
        if (lastUpdateEl) {
            lastUpdateEl.textContent = 'Just now';
            lastUpdateEl.setAttribute('data-timestamp', Date.now());
        }
    }
    
    startTrainingTimers() {
        // Start elapsed time timer (updates every second)
        if (this.trainingElapsedTimer) {
            clearInterval(this.trainingElapsedTimer);
        }
        
        this.trainingElapsedTimer = setInterval(() => {
            if (this.trainingStartTime) {
                const elapsed = Math.floor((Date.now() - this.trainingStartTime) / 1000);
                const elapsedEl = document.getElementById('trainingElapsedTime');
                if (elapsedEl) {
                    elapsedEl.textContent = this.formatTrainingTime(elapsed);
                }
            }
        }, 1000);
        
        // Start last update timer (updates every 5 seconds)
        if (this.trainingLastUpdateTimer) {
            clearInterval(this.trainingLastUpdateTimer);
        }
        
        this.trainingLastUpdateTimer = setInterval(() => {
            const lastUpdateEl = document.getElementById('trainingLastUpdate');
            if (lastUpdateEl) {
                const timestamp = parseInt(lastUpdateEl.getAttribute('data-timestamp') || '0');
                if (timestamp) {
                    const secondsAgo = Math.floor((Date.now() - timestamp) / 1000);
                    if (secondsAgo < 60) {
                        lastUpdateEl.textContent = secondsAgo <= 5 ? 'Just now' : `${secondsAgo} seconds ago`;
                    } else {
                        const minutesAgo = Math.floor(secondsAgo / 60);
                        lastUpdateEl.textContent = `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
                    }
                }
            }
        }, 5000);
    }
    
    stopTrainingTimers() {
        if (this.trainingElapsedTimer) {
            clearInterval(this.trainingElapsedTimer);
            this.trainingElapsedTimer = null;
        }
        
        if (this.trainingLastUpdateTimer) {
            clearInterval(this.trainingLastUpdateTimer);
            this.trainingLastUpdateTimer = null;
        }
        
        this.trainingStartTime = null;
        this.currentStageStartTime = null;
        this.lastCurrentStage = null;
    }
    
    formatTrainingTime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        }
    }
    
    animateCounter(element, startValue, endValue, duration) {
        const range = endValue - startValue;
        const startTime = Date.now();
        
        const updateCounter = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Use easing function for smooth animation
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(startValue + (range * easeProgress));
            
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        };
        
        requestAnimationFrame(updateCounter);
    }
    
    handleTrainingCompleted(data) {
        this.isTraining = false;
        
        // Stop training timers
        this.stopTrainingTimers();
        
        // Update progress to 100%
        ProgressBar.update('mainProgressBarContainer', 100, {
            label: `✅ Training completed! Accuracy: ${(data.final_accuracy * 100).toFixed(1)}%`,
            style: 'success'
        });
        
        // Update detailed training monitor with completion state
        const finalData = {
            current_stage: 'Training completed',
            progress: 100,
            live_accuracy: data.final_accuracy,
            stage_index: 8,
            total_stages: 8,
            stages_completed: [
                'Preparing data', 'Data validation', 'Feature engineering', 
                'Model selection', 'Training model', 'Validation', 
                'Optimization', 'Finalizing model'
            ]
        };
        this.updateDetailedTrainingProgress(finalData);
        
        // Update training status with completion message
        const statusMsgEl = document.getElementById('trainingStatusMessage');
        if (statusMsgEl) {
            statusMsgEl.innerHTML = `
                <span style="color: var(--success-color); font-weight: 600;">✅ Training Completed Successfully!</span><br>
                Final accuracy: ${(data.final_accuracy * 100).toFixed(1)}% • 
                Training time: ${data.training_time || 'N/A'} • 
                Model ready for deployment
            `;
        }
        
        // Show success message
        this.showSuccess(`Training completed! Final accuracy: ${(data.final_accuracy * 100).toFixed(1)}%`);
        
        // Reset training button
        const trainButton = document.getElementById('trainButton');
        if (trainButton) {
            ButtonGroup.setLoading(trainButton, false);
            trainButton.disabled = false;
        }
        
        // Show use model button with animation
        const useModelButton = document.getElementById('useModelButton');
        if (useModelButton) {
            useModelButton.disabled = false;
            useModelButton.style.transform = 'scale(1.05)';
            useModelButton.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.3)';
            
            setTimeout(() => {
                useModelButton.style.transform = 'scale(1)';
                useModelButton.style.boxShadow = '';
            }, 300);
        }
        
        // Hide detailed training card after showing completion for 10 seconds
        setTimeout(() => {
            const detailedCard = document.getElementById('detailedTrainingCard');
            if (detailedCard) {
                detailedCard.style.transition = 'opacity 0.5s ease';
                detailedCard.style.opacity = '0';
                
                setTimeout(() => {
                    detailedCard.style.display = 'none';
                    detailedCard.style.opacity = '1';
                }, 500);
            }
        }, 10000);
        
        // Reload model metrics
        this.loadCurrentModelMetrics();
    }
    
    handleTrainingFailed(data) {
        this.isTraining = false;
        
        // Show error message with retry button
        const errorMessage = data.error || 'Unknown error';
        
        // Update progress bar to show error state
        ProgressBar.update('mainProgressBarContainer', 0, {
            label: `❌ Training failed: ${errorMessage}`,
            style: 'danger'
        });
        
        // Show error notification
        this.showError(`Training failed: ${errorMessage}`);
        
        // Reset and enable training button as retry button
        const trainButton = document.getElementById('trainButton');
        if (trainButton) {
            ButtonGroup.setLoading(trainButton, false);
            trainButton.disabled = false;
            trainButton.textContent = 'Retry Training';
            trainButton.classList.add('btn-warning');
            trainButton.classList.remove('btn-primary');
            
            // Add retry functionality
            trainButton.onclick = () => {
                trainButton.textContent = 'Start Training';
                trainButton.classList.remove('btn-warning');
                trainButton.classList.add('btn-primary');
                this.startTraining();
            };
        }
        
        // Update training details with retry message
        const detailsEl = document.getElementById('trainingDetails');
        if (detailsEl) {
            detailsEl.innerHTML = `
                <span style="color: var(--danger-color);">❌ Training failed: ${errorMessage}</span>
                <button class="btn btn-sm btn-warning" onclick="dashboard.retryTraining()" style="margin-left: var(--spacing-md);">
                    🔄 Retry Training
                </button>
            `;
        }
        
        // Keep detailed card visible to show error details
        const detailedCard = document.getElementById('detailedTrainingCard');
        if (detailedCard) {
            detailedCard.style.display = 'block';
            
            // Update training status with error details
            const statusMsgEl = document.getElementById('trainingStatusMessage');
            if (statusMsgEl) {
                statusMsgEl.innerHTML = `
                    <span style="color: var(--danger-color); font-weight: 600;">❌ Training Failed</span><br>
                    <span style="color: var(--text-secondary);">${errorMessage}</span><br>
                    <button class="btn btn-sm btn-primary" onclick="dashboard.retryTraining()" style="margin-top: var(--spacing-sm);">
                        🔄 Retry Training
                    </button>
                `;
            }
        }
    }
    
    retryTraining() {
        // Reset training state and restart
        this.isTraining = false;
        
        // Reset progress bar
        ProgressBar.update('mainProgressBarContainer', 0, {
            label: '🚀 Ready for Training',
            style: 'default'
        });
        
        // Reset training details
        const detailsEl = document.getElementById('trainingDetails');
        if (detailsEl) {
            detailsEl.textContent = 'Click "Start Training" to begin training your model';
        }
        
        // Hide detailed training card
        const detailedCard = document.getElementById('detailedTrainingCard');
        if (detailedCard) {
            detailedCard.style.display = 'none';
        }
        
        // Reset train button
        const trainButton = document.getElementById('trainButton');
        if (trainButton) {
            trainButton.textContent = 'Start Training';
            trainButton.classList.remove('btn-warning');
            trainButton.classList.add('btn-primary');
            trainButton.disabled = !this.currentFile;
            trainButton.onclick = () => this.startTraining();
        }
        
        // Start training if file is available
        if (this.currentFile) {
            this.startTraining();
        } else {
            this.showError('Please upload a file before retrying training');
        }
    }
    
    updateSystemMetrics(data) {
        
        // Update CPU usage - fix field name mismatch (backend sends cpu_percent)
        if (data.cpu_percent !== undefined) {
            Metric.update('cpuPercent', data.cpu_percent, { format: 'percent' });
            ProgressBar.update('cpuProgressBar', data.cpu_percent, {
                style: data.cpu_percent > 80 ? 'danger' : data.cpu_percent > 60 ? 'warning' : 'default'
            });
        }
        
        // Update memory usage - fix field name mismatch (backend sends memory_percent)
        if (data.memory_percent !== undefined) {
            Metric.update('memoryPercent', data.memory_percent, { format: 'percent' });
            ProgressBar.update('memoryProgressBar', data.memory_percent, {
                style: data.memory_percent > 80 ? 'danger' : data.memory_percent > 60 ? 'warning' : 'default'
            });
        }
        
        // Update disk usage - fix field name mismatch (backend sends disk_percent)
        if (data.disk_percent !== undefined) {
            Metric.update('diskPercent', data.disk_percent, { format: 'percent' });
            ProgressBar.update('diskProgressBar', data.disk_percent, {
                style: data.disk_percent > 90 ? 'danger' : data.disk_percent > 70 ? 'warning' : 'default'
            });
        }
        
        // Update active connections
        if (data.active_connections !== undefined) {
            const connEl = document.getElementById('activeConnections');
            if (connEl) connEl.textContent = data.active_connections;
        }
        
        // Update last update time with timestamp tracking
        const updateEl = document.getElementById('lastUpdateTime');
        if (updateEl) {
            updateEl.textContent = 'Just now';
            updateEl.setAttribute('data-timestamp', Date.now());
            
            // Set up auto-update for relative time
            if (!this.lastUpdateInterval) {
                this.lastUpdateInterval = setInterval(() => {
                    this.updateRelativeTime();
                }, 1000);
            }
        }
        
        // Update API and WebSocket response times if available
        if (data.api_response_time_ms !== undefined) {
            const apiEl = document.getElementById('apiResponseTime');
            if (apiEl) apiEl.textContent = `${Math.round(data.api_response_time_ms)}ms`;
        }
        
        if (data.ws_response_time_ms !== undefined) {
            const wsEl = document.getElementById('wsResponseTime');
            if (wsEl) wsEl.textContent = `${Math.round(data.ws_response_time_ms)}ms`;
        }
        
        // Update total models count
        if (data.total_models !== undefined) {
            const modelsEl = document.getElementById('totalModels');
            if (modelsEl) modelsEl.textContent = `${data.total_models} Active`;
        }
        
        // Update queue jobs count
        if (data.active_training_jobs !== undefined) {
            const jobsEl = document.getElementById('queueJobs');
            if (jobsEl) jobsEl.textContent = `${data.active_training_jobs} Pending`;
        }
        
        // Update live metrics in the real-time metrics grid
        // Update live accuracy from system_metrics with animation
        if (data.current_accuracy !== undefined || data.model_accuracy !== undefined) {
            const accuracy = data.current_accuracy || data.model_accuracy;
            const accuracyEl = document.getElementById('liveAccuracy');
            
            if (accuracyEl) {
                const oldValue = parseFloat(accuracyEl.textContent) || 0;
                const newValue = parseFloat((accuracy * 100).toFixed(1));
                
                // Apply animation on change
                if (Math.abs(oldValue - newValue) > 0.1) {
                    accuracyEl.style.transition = 'all 0.3s ease';
                    accuracyEl.style.transform = 'scale(1.1)';
                    accuracyEl.style.color = 'var(--primary-color)';
                    
                    setTimeout(() => {
                        accuracyEl.style.transform = 'scale(1)';
                        accuracyEl.style.color = '';
                    }, 300);
                }
                
                Metric.update('liveAccuracy', accuracy * 100, { format: 'percent' });
            } else {
                Metric.update('liveAccuracy', accuracy * 100, { format: 'percent' });
            }
        }
        
        // Update predictions per minute with enhanced trend arrows
        if (data.predictions_per_minute !== undefined || data.prediction_rate !== undefined) {
            const rate = data.predictions_per_minute || data.prediction_rate;
            const predEl = document.getElementById('livePredictions');
            if (predEl) {
                const roundedRate = Math.round(rate);
                const previousRate = parseInt(predEl.getAttribute('data-previous-rate') || '0');
                const timestamp = Date.now();
                
                let html = `${roundedRate}/min`;
                let trendClass = '';
                
                // Calculate per minute from timestamp if available
                if (data.timestamp) {
                    const timeDiff = (timestamp - new Date(data.timestamp).getTime()) / 1000 / 60;
                    if (timeDiff > 0 && data.total_predictions) {
                        const calculatedRate = Math.round(data.total_predictions / timeDiff);
                        html = `${calculatedRate}/min`;
                    }
                }
                
                // Enhanced trend indicators with animation
                if (roundedRate > previousRate && previousRate > 0) {
                    const increase = roundedRate - previousRate;
                    html += ` <span class="trend-up" style="color: var(--success-color); font-weight: bold; animation: trendPulse 0.5s ease;">↗️ +${increase}</span>`;
                    trendClass = 'trending-up';
                } else if (roundedRate < previousRate && previousRate > 0) {
                    const decrease = previousRate - roundedRate;
                    html += ` <span class="trend-down" style="color: var(--danger-color); font-weight: bold; animation: trendPulse 0.5s ease;">↘️ -${decrease}</span>`;
                    trendClass = 'trending-down';
                } else if (roundedRate === previousRate && previousRate > 0) {
                    html += ` <span style="color: var(--text-secondary); opacity: 0.7;">→</span>`;
                    trendClass = 'stable';
                }
                
                predEl.innerHTML = html;
                predEl.setAttribute('data-previous-rate', roundedRate);
                predEl.setAttribute('data-last-update', timestamp);
                predEl.className = `metric-value ${trendClass}`;
            }
        }
        
        // Process enhanced model metrics section from real-time WebSocket events
        if (data.model_metrics) {
            const modelMetrics = data.model_metrics;
            
            // Update Live System Status with real-time model metrics
            if (modelMetrics.avg_accuracy !== undefined) {
                const accuracyEl = document.getElementById('liveAccuracy');
                if (accuracyEl) {
                    const oldValue = parseFloat(accuracyEl.textContent) || 0;
                    const newValue = parseFloat((modelMetrics.avg_accuracy * 100).toFixed(1));
                    
                    // Apply enhanced animation on significant change (>1% for aggregated metrics)
                    if (Math.abs(oldValue - newValue) > 1.0) {
                        accuracyEl.style.transition = 'all 0.4s ease';
                        accuracyEl.style.transform = 'scale(1.15)';
                        
                        // Color-code based on accuracy thresholds
                        if (newValue >= 85) {
                            accuracyEl.style.color = 'var(--success-color)';
                            accuracyEl.style.textShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
                        } else if (newValue >= 80) {
                            accuracyEl.style.color = 'var(--warning-color)';
                            accuracyEl.style.textShadow = '0 0 10px rgba(251, 191, 36, 0.5)';
                        } else {
                            accuracyEl.style.color = 'var(--danger-color)';
                            accuracyEl.style.textShadow = '0 0 10px rgba(239, 68, 68, 0.5)';
                        }
                        
                        setTimeout(() => {
                            accuracyEl.style.transform = 'scale(1)';
                            accuracyEl.style.color = '';
                            accuracyEl.style.textShadow = '';
                        }, 400);
                    }
                    
                    Metric.update('liveAccuracy', modelMetrics.avg_accuracy * 100, { format: 'percent' });
                }
            }
            
            // Update predictions per minute with enhanced model context
            if (modelMetrics.total_predictions_per_minute !== undefined) {
                const predEl = document.getElementById('livePredictions');
                if (predEl) {
                    const rate = modelMetrics.total_predictions_per_minute;
                    const roundedRate = Math.round(rate * 10) / 10; // Keep one decimal place
                    const previousRate = parseFloat(predEl.getAttribute('data-previous-rate') || '0');
                    const timestamp = Date.now();
                    
                    let html = `${roundedRate}/min`;
                    let trendClass = '';
                    
                    // Enhanced trend indicators with model health context
                    const changeThreshold = 0.5;
                    if (rate > previousRate + changeThreshold) {
                        const increase = (rate - previousRate).toFixed(1);
                        html += ` <span class="trend-up" style="color: var(--success-color); font-weight: bold;">↗ +${increase}</span>`;
                        trendClass = 'trending-up';
                    } else if (rate < previousRate - changeThreshold) {
                        const decrease = (previousRate - rate).toFixed(1);
                        html += ` <span class="trend-down" style="color: var(--danger-color); font-weight: bold;">↘ -${decrease}</span>`;
                        trendClass = 'trending-down';
                    } else if (Math.abs(rate - previousRate) < changeThreshold && previousRate > 0) {
                        html += ` <span style="color: var(--text-secondary); opacity: 0.7;">→</span>`;
                        trendClass = 'stable';
                    }
                    
                    // Add model health indicator
                    if (modelMetrics.overall_health) {
                        const healthIcons = {
                            'healthy': '💚',
                            'warning': '💛',
                            'critical': '❤️'
                        };
                        const healthIcon = healthIcons[modelMetrics.overall_health] || '❓';
                        html += ` <span style="font-size: 0.8em; opacity: 0.8;">${healthIcon}</span>`;
                    }
                    
                    predEl.innerHTML = html;
                    predEl.setAttribute('data-previous-rate', rate.toString());
                    predEl.setAttribute('data-last-update', timestamp);
                    predEl.className = `metric-value ${trendClass}`;
                }
            }
            
            // Update active models with health breakdown
            if (modelMetrics.active_models !== undefined) {
                const modelsEl = document.getElementById('totalModels');
                if (modelsEl) {
                    const activeCount = modelMetrics.active_models;
                    let displayText = `${activeCount} Active`;
                    
                    // Add health breakdown for visual context
                    if (modelMetrics.health_breakdown) {
                        const breakdown = modelMetrics.health_breakdown;
                        const criticalCount = breakdown.critical || 0;
                        const warningCount = breakdown.warning || 0;
                        const healthyCount = breakdown.healthy || 0;
                        
                        if (criticalCount > 0) {
                            displayText += ` (${criticalCount} critical)`;
                            modelsEl.style.color = 'var(--danger-color)';
                            modelsEl.style.fontWeight = 'bold';
                        } else if (warningCount > 0) {
                            displayText += ` (${warningCount} warning)`;
                            modelsEl.style.color = 'var(--warning-color)';
                            modelsEl.style.fontWeight = '600';
                        } else if (healthyCount > 0) {
                            modelsEl.style.color = 'var(--success-color)';
                            modelsEl.style.fontWeight = '';
                        } else {
                            modelsEl.style.color = '';
                            modelsEl.style.fontWeight = '';
                        }
                    }
                    
                    modelsEl.textContent = displayText;
                }
            }
            
            // Update system health indicator based on model metrics
            const systemHealthEl = document.getElementById('systemStatusText');
            const systemIconEl = document.getElementById('systemStatusIcon');
            if (systemHealthEl && systemIconEl && modelMetrics.overall_health) {
                const overallHealth = modelMetrics.overall_health;
                const healthMap = {
                    'healthy': { text: 'System Healthy', icon: '✅', color: 'var(--success-color)' },
                    'warning': { text: 'System Warning', icon: '⚠️', color: 'var(--warning-color)' },
                    'critical': { text: 'System Critical', icon: '🚨', color: 'var(--danger-color)' }
                };
                
                const healthInfo = healthMap[overallHealth] || healthMap['healthy'];
                systemHealthEl.textContent = healthInfo.text;
                systemIconEl.textContent = healthInfo.icon;
                systemHealthEl.style.color = healthInfo.color;
            }
        }
    }
    
    updateRelativeTime() {
        const updateEl = document.getElementById('lastUpdateTime');
        if (!updateEl) return;
        
        const timestamp = parseInt(updateEl.getAttribute('data-timestamp') || '0');
        if (!timestamp) return;
        
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 5) {
            updateEl.textContent = 'Just now';
        } else if (seconds < 60) {
            updateEl.textContent = `${seconds}s ago`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            updateEl.textContent = `${minutes}m ago`;
        } else {
            const hours = Math.floor(seconds / 3600);
            updateEl.textContent = `${hours}h ago`;
        }
    }
    
    updateSystemHealth(data) {
        const healthEl = document.getElementById('systemHealth');
        if (healthEl) {
            const oldHealth = healthEl.textContent;
            let newHealth;
            
            switch (data.current_health) {
                case 'critical':
                    newHealth = '🚨';
                    break;
                case 'warning':
                    newHealth = '⚠️';
                    break;
                default:
                    newHealth = '✅';
            }
            
            // Add pulse animation if health status changed
            if (oldHealth !== newHealth) {
                healthEl.textContent = newHealth;
                healthEl.style.animation = 'healthPulse 0.6s ease-in-out';
                
                setTimeout(() => {
                    healthEl.style.animation = '';
                }, 600);
            }
        }
        
        // Update system status text and icon
        const statusIcon = document.getElementById('systemStatusIcon');
        const statusText = document.getElementById('systemStatusText');
        const statusDetail = document.getElementById('systemStatusDetail');
        
        if (statusIcon && statusText) {
            switch (data.current_health) {
                case 'critical':
                    statusIcon.textContent = '🚨';
                    statusText.textContent = 'System Critical';
                    if (statusDetail) {
                        statusDetail.textContent = `Critical resource usage detected • CPU: ${data.metrics?.cpu_percent || 0}% Memory: ${data.metrics?.memory_percent || 0}%`;
                    }
                    break;
                case 'warning':
                    statusIcon.textContent = '⚠️';
                    statusText.textContent = 'System Warning';
                    if (statusDetail) {
                        statusDetail.textContent = `Elevated resource usage • CPU: ${data.metrics?.cpu_percent || 0}% Memory: ${data.metrics?.memory_percent || 0}%`;
                    }
                    break;
                default:
                    statusIcon.textContent = '✅';
                    statusText.textContent = 'System Healthy';
                    if (statusDetail) {
                        statusDetail.textContent = 'All metrics within normal range • Last updated: Just now';
                    }
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
    
    handleActivityUpdate(data) {
        if (!this.activityFeed || !data.activity) return;
        
        // Add the new activity to the feed
        this.activityFeed.addActivity(data.activity);
        
        // Limit the activity feed to last 50 items
        const activities = this.activityFeed.getActivities();
        if (activities.length > 50) {
            this.activityFeed.removeOldestActivities(activities.length - 50);
        }
    }
    
    handleUploadProgress(data) {
        const uploadArea = document.querySelector('.upload-area');
        if (!uploadArea) return;
        
        if (data.status === 'starting') {
            uploadArea.innerHTML = `
                <div class="upload-icon">📤</div>
                <h4>Uploading ${data.filename}...</h4>
                <div class="progress-container" style="margin-top: 1rem;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="wsUploadProgress" style="width: 0%"></div>
                    </div>
                </div>
                <p style="color: var(--text-secondary); margin-top: var(--spacing-sm);">
                    Starting upload...
                </p>
            `;
        } else if (data.status === 'reading' || data.status === 'saving') {
            const progressEl = document.getElementById('wsUploadProgress');
            if (progressEl) {
                progressEl.style.width = `${data.progress}%`;
            }
            const statusText = uploadArea.querySelector('p');
            if (statusText) {
                statusText.textContent = data.status === 'reading' ? 'Reading file...' : 'Processing file...';
            }
        } else if (data.status === 'completed') {
            uploadArea.innerHTML = `
                <div class="upload-icon">✅</div>
                <h4>Upload Complete!</h4>
                <p style="color: var(--text-secondary); margin-top: var(--spacing-sm);">
                    ${data.filename} (${data.rows} rows, ${data.columns} columns)
                </p>
            `;
        }
    }
    
    handleSystemAlert(data) {
        if (!data.alert) return;
        
        const alert = data.alert;
        
        // Show notification
        if (window.notifications) {
            const notificationType = alert.priority === 'high' ? 'error' : 
                                   alert.priority === 'medium' ? 'warning' : 'info';
            window.notifications.show(alert.message, notificationType, 10000);
        }
        
        // Add to activity feed if available
        if (this.activityFeed) {
            const activity = {
                id: alert.id,
                title: alert.title,
                description: alert.message,
                status: alert.alert_type,
                timestamp: alert.timestamp,
                user: alert.source,
                action_type: 'alert',
                severity_level: alert.priority
            };
            this.activityFeed.addActivity(activity);
        }
    }
    
    handleModelStatusChange(data) {
        // Update model health status
        const modelStatus = data.status || data.model_status;
        const modelId = data.model_id;
        
        // Update status dot and health indicator
        const statusEl = document.querySelector('.status-indicator');
        if (statusEl) {
            statusEl.className = 'status-indicator';
            switch (modelStatus) {
                case 'active':
                case 'deployed':
                    statusEl.classList.add('status-good');
                    statusEl.innerHTML = '<div class="status-dot"></div>Live & Healthy';
                    break;
                case 'training':
                    statusEl.classList.add('status-warning');
                    statusEl.innerHTML = '<div class="status-dot"></div>Training in Progress';
                    break;
                case 'error':
                case 'failed':
                    statusEl.classList.add('status-error');
                    statusEl.innerHTML = '<div class="status-dot"></div>Error - Check Logs';
                    break;
                case 'inactive':
                    statusEl.classList.add('status-neutral');
                    statusEl.innerHTML = '<div class="status-dot"></div>Inactive';
                    break;
            }
        }
        
        // Update model deployment timestamp if provided
        if (data.deployment_timestamp) {
            const modelEl = document.querySelector('.card strong');
            if (modelEl) {
                const timeAgo = this.formatTimeAgo(data.deployment_timestamp);
                const descEl = modelEl.nextElementSibling;
                if (descEl) {
                    descEl.innerHTML = descEl.innerHTML.replace(/Last trained.*?•/, 
                        `Last deployed <span data-timestamp="${data.deployment_timestamp}">${timeAgo}</span> •`);
                }
            }
        }
        
        // Enable/disable action buttons based on status
        const useModelBtn = document.getElementById('useModelButton');
        if (useModelBtn) {
            useModelBtn.disabled = modelStatus !== 'active' && modelStatus !== 'deployed';
        }
    }
    
    handleFileValidated(data) {
        const uploadArea = document.querySelector('.upload-area');
        if (!uploadArea) return;
        
        if (data.status === 'success') {
            // Show validation success
            uploadArea.innerHTML = `
                <div class="upload-icon">✅</div>
                <h4>File Validated Successfully!</h4>
                <p style="color: var(--text-secondary); margin-top: var(--spacing-sm);">
                    ${data.filename} • ${data.rows} rows, ${data.columns} columns
                </p>
                <div style="margin-top: var(--spacing-md); padding: var(--spacing-md); background: var(--background-color); border-radius: var(--radius-md);">
                    <h5 style="margin: 0 0 var(--spacing-sm) 0;">Data Summary:</h5>
                    <div style="font-size: 0.9rem; color: var(--text-secondary);">
                        ${data.summary || 'Ready for training'}
                    </div>
                </div>
            `;
            
            // Enable train button
            const trainButton = document.getElementById('trainButton');
            if (trainButton) {
                trainButton.disabled = false;
                ButtonGroup.setLoading(trainButton, false);
            }
            
            // Store validated file info
            this.currentFile = {
                file_path: data.file_path,
                filename: data.filename,
                rows: data.rows,
                columns: data.columns
            };
        } else {
            // Show validation error
            uploadArea.innerHTML = `
                <div class="upload-icon">❌</div>
                <h4>Validation Failed</h4>
                <p style="color: var(--danger-color); margin-top: var(--spacing-sm);">
                    ${data.error || 'Invalid file format'}
                </p>
                <button class="btn btn-secondary" onclick="dashboard.resetUploadArea()" style="margin-top: var(--spacing-md);">
                    Try Again
                </button>
            `;
            
            // Disable train button
            const trainButton = document.getElementById('trainButton');
            if (trainButton) {
                trainButton.disabled = true;
            }
        }
    }
    
    handlePredictionLogged(data) {
        try {
            // Extract prediction information
            const modelName = data.model_name || `Model ${data.model_id?.slice(0, 8)}`;
            const prediction = data.prediction || {};
            const updatedMetrics = data.updated_metrics || {};
            
            // Update Live System Status prediction counters
            const livePredictionsEl = document.getElementById('livePredictions');
            if (livePredictionsEl && updatedMetrics.total_predictions !== undefined) {
                // Animate the counter increment
                const currentCount = parseInt(livePredictionsEl.textContent.replace(/[^\d]/g, '') || '0');
                const newCount = updatedMetrics.total_predictions;
                
                if (newCount > currentCount) {
                    // Add pulse animation
                    livePredictionsEl.style.transform = 'scale(1.1)';
                    livePredictionsEl.style.transition = 'transform 0.2s ease';
                    
                    // Update the count with animation
                    this.animateCounter(livePredictionsEl, currentCount, newCount, 300);
                    
                    // Reset animation
                    setTimeout(() => {
                        livePredictionsEl.style.transform = 'scale(1)';
                    }, 200);
                }
            }
            
            // Update predictions per minute if available
            if (updatedMetrics.predictions_per_minute !== undefined) {
                const rateDisplay = document.querySelector('#livePredictions .metric-rate');
                if (rateDisplay) {
                    const rate = Math.round(updatedMetrics.predictions_per_minute * 10) / 10;
                    rateDisplay.textContent = `${rate}/min`;
                    
                    // Add trend indicator based on previous rate
                    const previousRate = parseFloat(rateDisplay.dataset.previousRate || '0');
                    let trendIcon = '';
                    let trendColor = 'var(--text-secondary)';
                    
                    if (rate > previousRate * 1.1) {
                        trendIcon = '↗';
                        trendColor = 'var(--success-color)';
                    } else if (rate < previousRate * 0.9) {
                        trendIcon = '↘';
                        trendColor = 'var(--warning-color)';
                    } else {
                        trendIcon = '→';
                    }
                    
                    // Update trend indicator
                    const trendEl = rateDisplay.querySelector('.trend-indicator') || 
                                  document.createElement('span');
                    trendEl.className = 'trend-indicator';
                    trendEl.textContent = trendIcon;
                    trendEl.style.color = trendColor;
                    trendEl.style.marginLeft = 'var(--spacing-xs)';
                    
                    if (!rateDisplay.querySelector('.trend-indicator')) {
                        rateDisplay.appendChild(trendEl);
                    }
                    
                    // Store current rate for next comparison
                    rateDisplay.dataset.previousRate = rate.toString();
                }
            }
            
            // Update model-specific prediction counter
            const predictionCountEl = document.getElementById('predictionCount');
            if (predictionCountEl && updatedMetrics.total_predictions !== undefined) {
                const formatNumber = (num) => {
                    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
                    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
                    return num.toString();
                };
                
                predictionCountEl.textContent = formatNumber(updatedMetrics.total_predictions);
                
                // Add subtle glow effect
                predictionCountEl.style.textShadow = '0 0 8px var(--primary-color)';
                setTimeout(() => {
                    predictionCountEl.style.textShadow = 'none';
                }, 500);
            }
            
            // Show subtle notification for milestone predictions (every 50th prediction)
            if (updatedMetrics.total_predictions && updatedMetrics.total_predictions % 50 === 0) {
                const message = `${modelName} reached ${updatedMetrics.total_predictions} predictions`;
                
                // Use a subtle success notification that doesn't interrupt workflow
                if (window.notifications) {
                    window.notifications.show(message, 'success', {
                        duration: 3000,
                        icon: '🎯',
                        position: 'bottom-right'
                    });
                }
            }
            
        } catch (error) {
            console.warn('Failed to handle prediction logged event:', error);
        }
    }
    
    updateModelMetrics(data) {
        // Update model accuracy with animation
        if (data.accuracy !== undefined) {
            const accuracyEl = document.getElementById('modelAccuracy');
            if (accuracyEl) {
                const newAccuracy = (data.accuracy * 100).toFixed(1);
                const oldAccuracy = parseFloat(accuracyEl.textContent);
                
                // Animate value change
                if (oldAccuracy !== parseFloat(newAccuracy)) {
                    accuracyEl.style.transition = 'color 0.3s ease';
                    accuracyEl.style.color = 'var(--success-color)';
                    accuracyEl.textContent = `${newAccuracy}%`;
                    
                    setTimeout(() => {
                        accuracyEl.style.color = '';
                    }, 300);
                }
                
                // Update trend indicator
                if (data.accuracy_trend) {
                    const trend = data.accuracy_trend > 0 ? '↑' : data.accuracy_trend < 0 ? '↓' : '→';
                    const trendColor = data.accuracy_trend > 0 ? 'var(--success-color)' : 
                                     data.accuracy_trend < 0 ? 'var(--danger-color)' : 'var(--text-secondary)';
                    accuracyEl.innerHTML = `${newAccuracy}% <span style="color: ${trendColor}; font-size: 0.8em;">${trend}</span>`;
                }
            }
            
            // Also update live accuracy
            Metric.update('liveAccuracy', data.accuracy * 100, { format: 'percent' });
        }
        
        // Update prediction count with increment animation
        if (data.predictions_made !== undefined) {
            const predEl = document.getElementById('predictionCount');
            if (predEl) {
                const oldCount = parseInt(predEl.textContent.replace(/,/g, '')) || 0;
                const newCount = data.predictions_made;
                
                if (newCount > oldCount) {
                    // Animate counter increment
                    let current = oldCount;
                    const increment = Math.ceil((newCount - oldCount) / 20);
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= newCount) {
                            current = newCount;
                            clearInterval(timer);
                        }
                        predEl.textContent = current.toLocaleString();
                    }, 50);
                } else {
                    predEl.textContent = newCount.toLocaleString();
                }
            }
        }
        
        // Update response time with color coding
        if (data.avg_response_time !== undefined) {
            const responseEl = document.getElementById('responseTime');
            if (responseEl) {
                const responseTime = Math.round(data.avg_response_time);
                responseEl.textContent = `${responseTime}ms`;
                
                // Color code by threshold
                if (responseTime < 50) {
                    responseEl.style.color = 'var(--success-color)';
                } else if (responseTime < 200) {
                    responseEl.style.color = 'var(--warning-color)';
                } else {
                    responseEl.style.color = 'var(--danger-color)';
                }
                
                // Add P95 if available
                if (data.p95_response_time) {
                    responseEl.title = `Average: ${responseTime}ms | P95: ${Math.round(data.p95_response_time)}ms`;
                }
            }
        }
        
        // Update predictions per minute with trend
        if (data.predictions_per_minute !== undefined) {
            const predEl = document.getElementById('livePredictions');
            if (predEl) {
                const rate = Math.round(data.predictions_per_minute);
                const previousRate = parseInt(predEl.getAttribute('data-previous-rate') || '0');
                
                let html = `${rate}/min`;
                if (rate > previousRate) {
                    html += ` <span style="color: var(--success-color);">↑</span>`;
                } else if (rate < previousRate && previousRate > 0) {
                    html += ` <span style="color: var(--danger-color);">↓</span>`;
                }
                
                predEl.innerHTML = html;
                predEl.setAttribute('data-previous-rate', rate);
            }
        }
    }
    
    updateConnectionCount(data) {
        const connEl = document.getElementById('activeConnections');
        if (connEl && data.count !== undefined) {
            const oldCount = parseInt(connEl.textContent) || 0;
            const newCount = data.count;
            
            // Animate on change
            if (oldCount !== newCount) {
                connEl.style.transition = 'transform 0.3s ease';
                connEl.style.transform = 'scale(1.2)';
                connEl.textContent = newCount;
                
                setTimeout(() => {
                    connEl.style.transform = 'scale(1)';
                }, 300);
            }
            
            // Show connection types on hover if available
            if (data.breakdown) {
                connEl.title = Object.entries(data.breakdown)
                    .map(([type, count]) => `${type}: ${count}`)
                    .join(' | ');
            }
        }
    }
    
    updatePerformanceMetrics(data) {
        // Update API response time with rolling average
        if (data.api_response_time !== undefined) {
            const apiEl = document.getElementById('apiResponseTime');
            if (apiEl) {
                const avgTime = Math.round(data.api_response_time);
                apiEl.textContent = `${avgTime}ms`;
                
                // Color code by speed
                if (avgTime < 100) {
                    apiEl.style.color = 'var(--success-color)';
                } else if (avgTime < 300) {
                    apiEl.style.color = 'var(--warning-color)';
                } else {
                    apiEl.style.color = 'var(--danger-color)';
                }
            }
        }
        
        // Update WebSocket latency including ping time
        if (data.ws_latency !== undefined) {
            const wsEl = document.getElementById('wsResponseTime');
            if (wsEl) {
                const latency = Math.round(data.ws_latency);
                wsEl.textContent = `${latency}ms`;
                
                // Add ping time if available
                if (data.ping_time) {
                    wsEl.title = `Latency: ${latency}ms | Ping: ${Math.round(data.ping_time)}ms`;
                }
            }
        }
    }
    
    updateResourceStatus(data) {
        // Update total models count
        if (data.models !== undefined) {
            const modelsEl = document.getElementById('totalModels');
            if (modelsEl) {
                const active = data.models.active || 0;
                const total = data.models.total || 0;
                modelsEl.textContent = `${active} Active`;
                
                // List model names on hover
                if (data.models.list && data.models.list.length > 0) {
                    modelsEl.title = 'Active models: ' + data.models.list.join(', ');
                }
            }
        }
        
        // Update queue jobs count
        if (data.queue !== undefined) {
            const jobsEl = document.getElementById('queueJobs');
            if (jobsEl) {
                const pending = data.queue.pending || 0;
                const processing = data.queue.processing || 0;
                
                jobsEl.textContent = `${pending} Pending`;
                
                // Add warning if queue backed up
                if (pending > 10) {
                    jobsEl.style.color = 'var(--warning-color)';
                    jobsEl.innerHTML = `${pending} Pending <span style="color: var(--warning-color);">⚠️</span>`;
                } else {
                    jobsEl.style.color = '';
                }
                
                // Show breakdown on hover
                if (processing > 0) {
                    jobsEl.title = `Pending: ${pending} | Processing: ${processing}`;
                }
            }
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
                label: 'Model Accuracy',
                format: 'percent',
                id: 'liveAccuracy',
                trend: 'up',
                trendValue: 2.3,
                tooltip: 'Current model accuracy calculated from the last 100 predictions'
            },
            {
                value: 23,
                label: 'Prediction Rate',
                format: 'custom',
                id: 'livePredictions',
                trend: 'neutral',
                trendValue: 0,
                tooltip: 'Number of predictions processed per minute with trend indicator'
            },
            {
                value: '✅',
                label: 'System Status',
                format: 'custom',
                id: 'systemHealth',
                tooltip: 'Overall system health: ✅ Healthy, ⚠️ Warning, ❌ Critical'
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
        
        // Clear intervals
        if (this.lastUpdateInterval) {
            clearInterval(this.lastUpdateInterval);
            this.lastUpdateInterval = null;
        }
        
        if (this.timeAgoInterval) {
            clearInterval(this.timeAgoInterval);
            this.timeAgoInterval = null;
        }
        
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
        
        // Reset training state
        this.isTraining = false;
        this.currentFile = null;
        this.currentJobId = null;
        
        // Dashboard custom cleanup completed
    }
}

// Expose modules to global scope for compatibility and debugging
// This fixes the issue where ES6 modules load but aren't accessible globally
try {
    window.Dashboard = Dashboard;
    window.API = API;
    window.CONFIG = CONFIG;
    window.errorHandler = errorHandler;
    
    // Add development mode logging
    if (CONFIG.DEBUG_MODE || window.location.hostname === 'localhost') {
        console.log('✅ Modules exposed globally:', {
            Dashboard: typeof window.Dashboard,
            API: typeof window.API,
            CONFIG: typeof window.CONFIG,
            errorHandler: typeof window.errorHandler
        });
    }
} catch (error) {
    console.error('❌ Failed to expose modules globally:', error);
    // Fallback: Ensure at least basic functionality
    if (typeof window.console !== 'undefined') {
        window.console.error('Module exposure failed - upload functionality may not work');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});

export { Dashboard };