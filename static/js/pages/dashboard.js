import { wsManager } from '../common/websocket.js';
import { API } from '../common/api.js';
import { ActivityFeed } from '../components/activity-feed.js';
import { formatDuration } from '../common/utils.js';
// Import only the core components needed for dashboard
import { Card, Metric, ProgressBar, Grid, initializeCoreUIStyles } from '../components/ui-core.js';
import { ButtonGroup, UploadArea, initializeFormUIStyles } from '../components/ui-forms.js';
import { ChartContainer, initializeChartUIStyles } from '../components/ui-charts.js';
import { BasePageController } from '../common/lifecycle.js';
import { demoData } from '../common/demo-data.js';
import { CONFIG } from '../common/config.js';
// Import centralized error handling system
import { errorHandler, ErrorSeverity, ErrorCategory, RecoveryStrategy } from '../common/error-handler.js';
// Import new update modules to fix legacy DOM manipulation
import { updateStrategies } from '../common/update-strategies.js';
import { updateModelDisplay, showDemoModel } from '../components/model-display.js';
import { systemMetrics, updateSystemMetrics, handlePredictionLogged } from '../components/system-metrics.js';
import { timestampManager, setJustNow, setTimestamp } from '../components/timestamp-manager.js';

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
        
        // Real-time model status updates (enhanced version)
        this.addWebSocketHandler('model_status_realtime', (data) => {
            this.handleModelStatusRealtime(data);
        });
        
        // Enhanced model metrics with real-time features
        this.addWebSocketHandler('model_metrics_realtime', (data) => {
            this.handleModelMetricsRealtime(data);
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
        // Update model accuracy using component API
        if (model.accuracy !== undefined) {
            const accuracy = model.accuracy * 100;
            
            // Build tooltip with validation metrics
            let tooltip = null;
            if (model.validation_metrics) {
                const precision = (model.validation_metrics.precision * 100).toFixed(1);
                const recall = (model.validation_metrics.recall * 100).toFixed(1);
                const f1 = (model.validation_metrics.f1_score * 100).toFixed(1);
                tooltip = `Precision: ${precision}% | Recall: ${recall}% | F1: ${f1}%`;
            }
            
            Metric.update('modelAccuracy', accuracy, {
                format: 'percent',
                tooltip: tooltip
            });
        }
        
        // Update prediction count using component API
        if (model.predictions_made !== undefined) {
            const tooltip = model.training_samples 
                ? `Training samples: ${model.training_samples} | Validation: ${model.validation_samples || 'N/A'}`
                : null;
                
            Metric.update('predictionCount', model.predictions_made, {
                format: 'number',
                tooltip: tooltip
            });
        }
        
        // Update response time using component API
        const responseTime = model.avg_response_time || (CONFIG.DEMO.ENABLED ? 25 : null);
        if (responseTime !== null) {
            const tooltip = model.model_size
                ? `Model size: ${model.model_size} | Algorithm: ${model.hyperparameters?.algorithm || 'Unknown'}`
                : null;
                
            Metric.update('responseTime', responseTime, {
                format: 'custom',
                suffix: 'ms',
                tooltip: tooltip
            });
        }
        
        // Also update Live System Status if this is the active model
        if (model.is_active || model.status === 'active') {
            updateStrategies.updateLiveSystemStatus({
                accuracy: model.accuracy,
                validationAccuracy: model.validation_metrics?.validation_accuracy,
                f1Score: model.validation_metrics?.f1_score,
                predictionRate: model.prediction_rate,
                totalPredictions: model.predictions_made,
                avgResponseTime: model.avg_response_time
            });
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
        // Use new component-based update approach
        updateModelDisplay(model);
        
        // Ensure update strategies are ready for component updates
        updateStrategies.setComponentsReady();
    }
    
    
    startTimeAgoUpdater() {
        // Modern approach: Use centralized TimestampManager instead of custom timer
        // The TimestampManager automatically handles all timestamp updates with animations
        
        // Clear any existing legacy interval
        if (this.timeAgoInterval) {
            clearInterval(this.timeAgoInterval);
            this.timeAgoInterval = null;
        }
        
        // Initialize the timestamp manager to scan for existing elements
        // The manager will handle all future updates automatically
        timestampManager.scanForTimestampElements();
        
        // Keep a simplified interval for periodic timestamp rescanning
        // This ensures new dynamic timestamps are picked up by TimestampManager
        this.timeAgoInterval = setInterval(() => {
            timestampManager.scanForTimestampElements();
        }, 30000); // Rescan every 30 seconds
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
        // Use component-based update for system health
        systemMetrics.updateSystemHealth(status.system_health);
        
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
        // Use modern UploadArea component API instead of direct DOM manipulation
        UploadArea.showSuccess('uploadArea', {
            filename: result.filename,
            rows: result.rows,
            columns: result.columns,
            size: result.size || null
        });
    }
    
    resetUploadArea() {
        // Use modern UploadArea component API instead of direct DOM manipulation
        UploadArea.reset('uploadArea');
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
                const timeStr = formatDuration(data.estimated_time_remaining);
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
                    const elapsedTime = formatDuration(data.stage_times[stageName]);
                    stageTime.textContent = elapsedTime;
                    stageTime.style.color = 'var(--success-color)';
                }
            } else if (stageName === data.current_stage) {
                newStatus = 'active';
                newIcon = '🔄';
                
                // Show real-time elapsed time for current stage
                if (this.currentStageStartTime) {
                    const elapsed = Math.floor((Date.now() - this.currentStageStartTime) / 1000);
                    stageTime.textContent = formatDuration(elapsed);
                    stageTime.style.color = 'var(--primary-color)';
                }
            } else {
                newStatus = 'pending';
                const stageInfo = standardStages[index];
                if (stageInfo) {
                    newIcon = stageInfo.icon;
                    stageTime.textContent = formatDuration(stageInfo.estimatedTime);
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
                    const timeStr = formatDuration(data.estimated_time_remaining);
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
        // Use modern timestamp manager instead of legacy DOM manipulation
        setJustNow('trainingLastUpdate');
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
                    elapsedEl.textContent = formatDuration(elapsed);
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
        try {
            // Enhanced system metrics processing with model data integration
            import('../common/config.js').then(({ CONFIG }) => {
                // Delegate all updates to the centralized system metrics handler
                systemMetrics.updateFromWebSocket(data);
                
                // Process model-specific data if present
                if (data.model_accuracy !== undefined || data.current_accuracy !== undefined) {
                    const accuracy = data.model_accuracy || data.current_accuracy;
                    this.updateLiveModelMetrics({
                        accuracy: accuracy,
                        model_id: data.model_id || 'current',
                        timestamp: data.timestamp || Date.now()
                    });
                }
                
                // Process prediction rate data if present
                if (data.predictions_per_minute !== undefined || data.prediction_rate !== undefined) {
                    const rate = data.predictions_per_minute || data.prediction_rate;
                    this.updatePredictionRate({
                        rate: rate,
                        total_predictions: data.total_predictions,
                        model_id: data.model_id || 'current',
                        timestamp: data.timestamp || Date.now()
                    });
                }
                
                // Enhanced health monitoring with model considerations
                if (data.model_health || data.model_status) {
                    this.updateModelHealthStatus({
                        status: data.model_health || data.model_status,
                        accuracy: data.model_accuracy || data.current_accuracy,
                        response_time: data.avg_response_time,
                        model_id: data.model_id
                    });
                }
                
                // Update last update time
                this.updateLastUpdateTime();
                
                // Rate limiting and performance optimization
                if (CONFIG.MODEL_METRICS?.WS_RATE_LIMITING) {
                    this.applyRateLimiting('system_metrics', CONFIG.MODEL_METRICS.WS_RATE_LIMITING);
                }
                
            }).catch(() => {
                // Fallback if CONFIG import fails
                systemMetrics.updateFromWebSocket(data);
                this.updateLastUpdateTime();
            });
            
        } catch (error) {
            console.warn('Enhanced system metrics update failed, using fallback:', error);
            // Fallback to original behavior
            systemMetrics.updateFromWebSocket(data);
            this.updateLastUpdateTime();
        }
    }

    /**
     * Update live model metrics with real-time accuracy updates
     * @param {Object} data - Model metrics data
     */
    updateLiveModelMetrics(data) {
        try {
            const { accuracy, model_id, timestamp } = data;
            
            if (accuracy !== undefined) {
                // Update live accuracy with enhanced features
                Metric.updateWithHealth('liveAccuracy', accuracy * 100, {
                    metricType: 'accuracy',
                    format: 'percent',
                    animated: true,
                    showTrend: true,
                    previousValue: this.cachedMetrics?.accuracy || null
                });
                
                // Add visual trend indicators with threshold-based arrows
                const previousAccuracy = this.cachedMetrics?.accuracy || accuracy * 100;
                const change = (accuracy * 100) - previousAccuracy;
                
                if (Math.abs(change) > 0.5) { // Threshold for showing trend
                    const trendDirection = change > 0 ? 'up' : 'down';
                    Metric.setTrend('liveAccuracy', trendDirection, Math.abs(change), {
                        animated: true,
                        threshold: 0.5
                    });
                    
                    // Pulse for significant changes
                    if (Math.abs(change) > 2) {
                        Metric.pulse('liveAccuracy', { 
                            intensity: 'medium',
                            color: change > 0 ? '#10b981' : '#ef4444'
                        });
                    }
                }
                
                // Cache for trend calculation
                if (!this.cachedMetrics) this.cachedMetrics = {};
                this.cachedMetrics.accuracy = accuracy * 100;
                this.cachedMetrics.lastAccuracyUpdate = timestamp || Date.now();
                
                // Update system health based on accuracy
                this.updateSystemHealthFromAccuracy(accuracy);
            }
            
        } catch (error) {
            console.warn('Failed to update live model metrics:', error);
        }
    }

    /**
     * Update prediction rate with real-time calculations
     * @param {Object} data - Prediction rate data
     */
    updatePredictionRate(data) {
        try {
            const { rate, total_predictions, model_id, timestamp } = data;
            
            if (rate !== undefined) {
                // Update live prediction rate with enhanced features
                Metric.updateWithHealth('livePredictions', rate, {
                    metricType: 'prediction_rate', 
                    format: 'custom',
                    suffix: '/min',
                    animated: true,
                    showTrend: true,
                    previousValue: this.cachedMetrics?.predictionRate || null
                });
                
                // Calculate and show trend for prediction rate
                const previousRate = this.cachedMetrics?.predictionRate || rate;
                const rateChange = rate - previousRate;
                
                if (Math.abs(rateChange) > 2) { // Threshold for prediction rate trend
                    const trendDirection = rateChange > 0 ? 'up' : 'down';
                    Metric.setTrend('livePredictions', trendDirection, Math.abs(rateChange), {
                        animated: true,
                        threshold: 2,
                        showValue: true
                    });
                    
                    // Light pulse for rate changes
                    if (Math.abs(rateChange) > 10) {
                        Metric.pulse('livePredictions', { 
                            intensity: 'light',
                            color: rateChange > 0 ? '#3b82f6' : '#f59e0b'
                        });
                    }
                }
                
                // Update total predictions counter
                if (total_predictions !== undefined) {
                    Metric.updateRealTime('totalPredictions', total_predictions, {
                        format: 'number',
                        minInterval: 1000 // Update at most once per second
                    });
                }
                
                // Cache for trend calculation
                if (!this.cachedMetrics) this.cachedMetrics = {};
                this.cachedMetrics.predictionRate = rate;
                this.cachedMetrics.totalPredictions = total_predictions;
                this.cachedMetrics.lastRateUpdate = timestamp || Date.now();
                
                // Update activity level indicator based on prediction rate
                this.updateActivityLevel(rate);
            }
            
        } catch (error) {
            console.warn('Failed to update prediction rate:', error);
        }
    }

    /**
     * Update model health status based on metrics
     * @param {Object} data - Model health data
     */
    updateModelHealthStatus(data) {
        try {
            const { status, accuracy, response_time, model_id } = data;
            
            // Determine overall health from multiple factors
            let healthStatus = 'healthy';
            let healthIcon = '✅';
            let healthText = 'Live & Healthy';
            
            // Health based on accuracy
            if (accuracy !== undefined) {
                if (accuracy < 0.8) {
                    healthStatus = 'critical';
                    healthIcon = '❌';
                    healthText = 'Critical - Low Accuracy';
                } else if (accuracy < 0.85) {
                    healthStatus = 'warning';
                    healthIcon = '⚠️';
                    healthText = 'Warning - Accuracy Below Threshold';
                }
            }
            
            // Health based on response time
            if (response_time !== undefined && response_time > 500) {
                if (healthStatus === 'healthy') {
                    healthStatus = 'warning';
                    healthIcon = '⚠️';
                    healthText = 'Warning - High Response Time';
                }
            }
            
            // Update system health indicator
            const healthElement = document.getElementById('systemHealth');
            if (healthElement) {
                Metric.update('systemHealth', healthIcon, {
                    format: 'custom',
                    tooltip: healthText
                });
                
                Metric.setHealth('systemHealth', healthStatus, {
                    animated: true,
                    showIcon: false // Icon is already the value
                });
            }
            
        } catch (error) {
            console.warn('Failed to update model health status:', error);
        }
    }

    /**
     * Update system health based on accuracy thresholds
     * @param {number} accuracy - Model accuracy (0-1)
     */
    updateSystemHealthFromAccuracy(accuracy) {
        try {
            import('../common/config.js').then(({ CONFIG }) => {
                const thresholds = CONFIG.MODEL_METRICS?.ACCURACY_THRESHOLDS || {
                    WARNING: 85,
                    CRITICAL: 80
                };
                
                const accuracyPercent = accuracy * 100;
                let healthStatus = 'healthy';
                
                if (accuracyPercent < thresholds.CRITICAL) {
                    healthStatus = 'critical';
                } else if (accuracyPercent < thresholds.WARNING) {
                    healthStatus = 'warning';
                }
                
                systemMetrics.updateSystemHealth(healthStatus);
                
            }).catch(() => {
                // Fallback thresholds
                const accuracyPercent = accuracy * 100;
                const healthStatus = accuracyPercent < 80 ? 'critical' : 
                                  accuracyPercent < 85 ? 'warning' : 'healthy';
                systemMetrics.updateSystemHealth(healthStatus);
            });
            
        } catch (error) {
            console.warn('Failed to update system health from accuracy:', error);
        }
    }

    /**
     * Update activity level indicator based on prediction rate
     * @param {number} rate - Predictions per minute
     */
    updateActivityLevel(rate) {
        try {
            // Visual activity indicator
            const activityElement = document.querySelector('.activity-indicator');
            if (activityElement) {
                let activityLevel = 'low';
                let activityColor = '#6b7280';
                
                if (rate > 50) {
                    activityLevel = 'high';
                    activityColor = '#10b981';
                } else if (rate > 20) {
                    activityLevel = 'medium';
                    activityColor = '#f59e0b';
                }
                
                activityElement.className = `activity-indicator activity-${activityLevel}`;
                activityElement.style.color = activityColor;
            }
            
        } catch (error) {
            console.warn('Failed to update activity level:', error);
        }
    }

    /**
     * Apply rate limiting for WebSocket updates
     * @param {string} eventType - Type of event for rate limiting
     * @param {Object} rateLimitConfig - Rate limiting configuration
     */
    applyRateLimiting(eventType, rateLimitConfig) {
        try {
            const { MAX_UPDATES_PER_SECOND, BURST_ALLOWANCE, COOLDOWN_PERIOD } = rateLimitConfig;
            
            if (!this.rateLimiters) this.rateLimiters = {};
            if (!this.rateLimiters[eventType]) {
                this.rateLimiters[eventType] = {
                    count: 0,
                    lastReset: Date.now(),
                    inCooldown: false
                };
            }
            
            const limiter = this.rateLimiters[eventType];
            const now = Date.now();
            
            // Reset counter every second
            if (now - limiter.lastReset > 1000) {
                limiter.count = 0;
                limiter.lastReset = now;
                limiter.inCooldown = false;
            }
            
            limiter.count++;
            
            // Check if rate limit exceeded
            if (limiter.count > MAX_UPDATES_PER_SECOND && !limiter.inCooldown) {
                console.warn(`Rate limit exceeded for ${eventType}, entering cooldown`);
                limiter.inCooldown = true;
                
                // Apply cooldown
                setTimeout(() => {
                    limiter.inCooldown = false;
                    limiter.count = 0;
                }, COOLDOWN_PERIOD);
            }
            
        } catch (error) {
            console.warn('Rate limiting failed:', error);
        }
    }
    
    updateLastUpdateTime() {
        // Use modern timestamp manager instead of legacy DOM manipulation
        setJustNow('lastUpdateTime');
        
        // Clear legacy interval if it exists
        if (this.lastUpdateInterval) {
            clearInterval(this.lastUpdateInterval);
            this.lastUpdateInterval = null;
        }
    }
    
    updateSystemHealth(data) {
        // Delegate to system metrics handler
        systemMetrics.updateSystemHealth(data.current_health);
    }
    
    handlePredictionVolume(data) {
        // Show notification for prediction milestones
        const message = data.message || `Prediction milestone reached: ${data.total_predictions} predictions!`;
        
        // Use global notifications object
        if (window.notifications) {
            window.notifications.show(message, 'info', 7000);
        }
        
        // Update prediction counter using component APIs
        if (data.total_predictions !== undefined) {
            // Use Metric component for total predictions display
            Metric.update('totalPredictions', data.total_predictions, {
                format: 'number',
                tooltip: `Total predictions made across all models`
            });
            
            // Also update through system metrics for consistency
            systemMetrics.updatePerformanceMetrics({
                totalPredictions: data.total_predictions
            });
        }
        
        // Update model-specific prediction counters using component APIs
        if (data.model_id) {
            const modelCard = document.querySelector(`[data-model-id="${data.model_id}"]`);
            if (modelCard) {
                const predCountEl = modelCard.querySelector('.prediction-count');
                if (predCountEl && predCountEl.id) {
                    // Use component API if element has ID
                    Metric.update(predCountEl.id, data.total_predictions, {
                        format: 'number',
                        suffix: ' predictions'
                    });
                } else if (predCountEl) {
                    // Fallback for elements without ID (but avoid direct manipulation when possible)
                    updateStrategies.updateTextElement(
                        predCountEl.id || 'model-prediction-' + data.model_id, 
                        `${data.total_predictions.toLocaleString()} predictions`
                    );
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
        // Use modern UploadArea component API instead of direct DOM manipulation
        
        if (data.status === 'starting') {
            UploadArea.showProgress('uploadArea', {
                percent: 0,
                stage: 'Uploading',
                filename: data.filename,
                eta: 'Starting upload...'
            });
        } else if (data.status === 'reading' || data.status === 'saving') {
            const stage = data.status === 'reading' ? 'Reading file' : 'Processing file';
            UploadArea.showProgress('uploadArea', {
                percent: data.progress || 0,
                stage: stage,
                filename: data.filename,
                eta: data.eta || ''
            });
        } else if (data.status === 'completed') {
            UploadArea.showSuccess('uploadArea', {
                filename: data.filename,
                rows: data.rows,
                columns: data.columns
            });
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
        // Update model health status using component APIs
        const modelStatus = data.status || data.model_status;
        const modelId = data.model_id;
        
        // Map status to display information
        const statusConfig = {
            'active': { 
                text: 'Live & Healthy', 
                class: 'status-good', 
                emoji: '✅',
                health: 'healthy' 
            },
            'deployed': { 
                text: 'Live & Healthy', 
                class: 'status-good', 
                emoji: '✅',
                health: 'healthy' 
            },
            'training': { 
                text: 'Training in Progress', 
                class: 'status-warning', 
                emoji: '⚠️',
                health: 'warning' 
            },
            'error': { 
                text: 'Error - Check Logs', 
                class: 'status-error', 
                emoji: '❌',
                health: 'error' 
            },
            'failed': { 
                text: 'Error - Check Logs', 
                class: 'status-error', 
                emoji: '❌',
                health: 'error' 
            },
            'inactive': { 
                text: 'Inactive', 
                class: 'status-neutral', 
                emoji: '⚪',
                health: 'unknown' 
            }
        };
        
        const statusInfo = statusConfig[modelStatus] || statusConfig['inactive'];
        
        // Update status indicator using system metrics (consistent with other health indicators)
        systemMetrics.updateSystemHealth(statusInfo.health);
        
        // Update specific status indicator element if it exists
        const statusEl = document.querySelector('.status-indicator');
        if (statusEl) {
            // Use component-like approach for status updates
            statusEl.className = `status-indicator ${statusInfo.class}`;
            statusEl.innerHTML = `<div class="status-dot"></div>${statusInfo.text}`;
        }
        
        // Update model deployment timestamp using TimestampManager
        if (data.deployment_timestamp) {
            // Create or update deployment timestamp element
            const timestampId = 'modelDeploymentTime';
            let timestampEl = document.getElementById(timestampId);
            
            if (!timestampEl) {
                // Find model description to add timestamp
                const descEl = document.querySelector('.card p');
                if (descEl) {
                    // Create timestamp span with proper ID for tracking
                    const span = document.createElement('span');
                    span.id = timestampId;
                    span.setAttribute('data-timestamp', data.deployment_timestamp);
                    
                    // Insert into description with proper structure
                    const timeText = `Last deployed ${timestampManager.formatTimeAgo(data.deployment_timestamp)}`;
                    span.textContent = timeText;
                    
                    // Replace existing time text or add new
                    const regex = /Last (trained|deployed) [^•]+/;
                    const newText = descEl.innerHTML.replace(regex, `Last deployed ${span.outerHTML}`);
                    if (newText !== descEl.innerHTML) {
                        descEl.innerHTML = newText;
                    } else {
                        // Add timestamp if not present
                        descEl.innerHTML = descEl.innerHTML.replace('•', `• Last deployed ${span.outerHTML} •`);
                    }
                }
            }
            
            // Track with timestamp manager
            setTimestamp(timestampId, data.deployment_timestamp);
        }
        
        // Enable/disable action buttons based on status using component approach
        const useModelBtn = document.getElementById('useModelButton');
        if (useModelBtn) {
            const isEnabled = modelStatus === 'active' || modelStatus === 'deployed';
            useModelBtn.disabled = !isEnabled;
            
            // Use ButtonGroup API if available for consistent styling
            if (typeof ButtonGroup !== 'undefined' && ButtonGroup.setDisabled) {
                ButtonGroup.setDisabled(useModelBtn, !isEnabled);
            }
        }
    }
    
    handleFileValidated(data) {
        // Use modern UploadArea component API instead of direct DOM manipulation
        
        if (data.status === 'success') {
            // Show validation success with detailed info
            const summary = `${data.filename} • ${data.rows} rows, ${data.columns} columns${data.summary ? ' • ' + data.summary : ' • Ready for training'}`;
            
            UploadArea.showValidation('uploadArea', {
                isValid: true,
                filename: data.filename,
                summary: summary,
                errors: [],
                warnings: data.warnings || [],
                showRetryButton: false
            });
            
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
            // Show validation error with details
            UploadArea.showValidation('uploadArea', {
                isValid: false,
                filename: data.filename || 'Unknown file',
                summary: '',
                errors: data.errors || [data.error || 'Invalid file format'],
                warnings: data.warnings || [],
                showRetryButton: true
            });
            
            // Disable train button
            const trainButton = document.getElementById('trainButton');
            if (trainButton) {
                trainButton.disabled = true;
            }
        }
    }
    
    handlePredictionLogged(data) {
        try {
            // Delegate to system metrics handler for consistent updates
            systemMetrics.handlePredictionLogged(data);
            
            // Show milestone notifications
            const updatedMetrics = data.updated_metrics || {};
            if (updatedMetrics.total_predictions && updatedMetrics.total_predictions % 50 === 0) {
                const modelName = data.model_name || `Model ${data.model_id?.slice(0, 8)}`;
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

    /**
     * Handle real-time model status updates with enhanced features
     * @param {Object} data - Real-time model status data
     */
    handleModelStatusRealtime(data) {
        try {
            // Import CONFIG for real-time thresholds
            import('../common/config.js').then(({ CONFIG }) => {
                // Enhanced error handling with rate limiting
                const now = Date.now();
                const lastUpdate = this.lastModelStatusUpdate || 0;
                const minInterval = CONFIG.MODEL_METRICS?.WS_RATE_LIMITING?.MAX_UPDATES_PER_SECOND 
                    ? 1000 / CONFIG.MODEL_METRICS.WS_RATE_LIMITING.MAX_UPDATES_PER_SECOND 
                    : 100;
                
                if (now - lastUpdate < minInterval) {
                    // Queue the update
                    clearTimeout(this.modelStatusUpdateTimeout);
                    this.modelStatusUpdateTimeout = setTimeout(() => {
                        this.processModelStatusRealtime(data);
                    }, minInterval - (now - lastUpdate));
                    return;
                }
                
                this.processModelStatusRealtime(data);
                this.lastModelStatusUpdate = now;
                
            }).catch(() => {
                // Fallback if CONFIG import fails
                this.processModelStatusRealtime(data);
            });
            
        } catch (error) {
            console.warn('Failed to handle real-time model status update:', error);
            // Fallback to existing handler
            this.handleModelStatusChange(data);
        }
    }

    /**
     * Process real-time model status with enhanced UI updates
     * @param {Object} data - Model status data
     */
    processModelStatusRealtime(data) {
        // Call existing handler first
        this.handleModelStatusChange(data);
        
        // Enhanced real-time features
        const modelStatus = data.status || data.model_status;
        const modelId = data.model_id;
        
        // Update with enhanced Metric component features
        if (data.accuracy !== undefined) {
            // Use new updateWithHealth method for accuracy
            Metric.updateWithHealth('liveAccuracy', data.accuracy * 100, {
                metricType: 'accuracy',
                format: 'percent',
                animated: true,
                showTrend: true,
                previousValue: this.lastModelAccuracy || null
            });
            this.lastModelAccuracy = data.accuracy * 100;
        }
        
        if (data.avg_response_time !== undefined) {
            // Use new updateWithHealth method for response time
            Metric.updateWithHealth('responseTime', data.avg_response_time, {
                metricType: 'response_time',
                format: 'custom',
                suffix: 'ms',
                animated: true,
                showTrend: true,
                previousValue: this.lastResponseTime || null
            });
            this.lastResponseTime = data.avg_response_time;
        }
        
        // Add live indicator for active metrics
        if (modelStatus === 'active' || modelStatus === 'deployed') {
            const accuracyElement = document.getElementById('liveAccuracy');
            const responseTimeElement = document.getElementById('responseTime');
            
            if (accuracyElement) accuracyElement.classList.add('metric-live');
            if (responseTimeElement) responseTimeElement.classList.add('metric-live');
        }
        
        // Enhanced notification for critical status changes
        if (data.old_status && data.old_status !== modelStatus) {
            if (modelStatus === 'error' || modelStatus === 'failed') {
                if (window.notifications) {
                    window.notifications.show(
                        `Model ${data.model_name || modelId} status changed to ${modelStatus}`,
                        'error',
                        { duration: 8000, icon: '⚠️' }
                    );
                }
            } else if (modelStatus === 'active' || modelStatus === 'deployed') {
                if (window.notifications) {
                    window.notifications.show(
                        `Model ${data.model_name || modelId} is now ${modelStatus}`,
                        'success',
                        { duration: 5000, icon: '✅' }
                    );
                }
            }
        }
    }

    /**
     * Handle enhanced real-time model metrics updates
     * @param {Object} data - Real-time model metrics data
     */
    handleModelMetricsRealtime(data) {
        try {
            // Enhanced metrics processing with trend calculation
            import('../common/config.js').then(({ CONFIG }) => {
                // Rate limiting check
                const now = Date.now();
                const lastUpdate = this.lastMetricsUpdate || 0;
                const minInterval = CONFIG.MODEL_METRICS?.REFRESH_INTERVAL || 2000;
                
                if (now - lastUpdate < minInterval) {
                    // Queue the update
                    clearTimeout(this.metricsUpdateTimeout);
                    this.metricsUpdateTimeout = setTimeout(() => {
                        this.processModelMetricsRealtime(data);
                    }, minInterval - (now - lastUpdate));
                    return;
                }
                
                this.processModelMetricsRealtime(data);
                this.lastMetricsUpdate = now;
                
            }).catch(() => {
                // Fallback if CONFIG import fails
                this.processModelMetricsRealtime(data);
            });
            
        } catch (error) {
            console.warn('Failed to handle real-time model metrics:', error);
            // Fallback to existing handler
            this.updateModelMetrics(data);
        }
    }

    /**
     * Process real-time model metrics with enhanced UI features
     * @param {Object} data - Model metrics data
     */
    processModelMetricsRealtime(data) {
        // Call existing handler first
        this.updateModelMetrics(data);
        
        // Enhanced real-time updates with new Metric features
        if (data.accuracy !== undefined) {
            Metric.updateRealTime('liveAccuracy', data.accuracy * 100, {
                metricType: 'accuracy',
                format: 'percent',
                minInterval: 500 // Maximum 2 updates per second
            });
            
            // Pulse for significant accuracy changes
            if (this.lastLiveAccuracy && Math.abs(data.accuracy * 100 - this.lastLiveAccuracy) > 1) {
                Metric.pulse('liveAccuracy', { intensity: 'medium' });
            }
            this.lastLiveAccuracy = data.accuracy * 100;
        }
        
        if (data.predictions_per_minute !== undefined) {
            Metric.updateRealTime('livePredictions', data.predictions_per_minute, {
                metricType: 'prediction_rate',
                format: 'custom',
                suffix: '/min',
                minInterval: 500
            });
            
            // Pulse for significant rate changes
            if (this.lastPredictionRate && Math.abs(data.predictions_per_minute - this.lastPredictionRate) > 5) {
                Metric.pulse('livePredictions', { intensity: 'light' });
            }
            this.lastPredictionRate = data.predictions_per_minute;
        }
        
        if (data.avg_response_time !== undefined) {
            Metric.updateRealTime('responseTime', data.avg_response_time, {
                metricType: 'response_time',
                format: 'custom',
                suffix: 'ms',
                minInterval: 1000 // Less frequent updates for response time
            });
        }
        
        // Update system health indicator
        if (data.overall_health) {
            systemMetrics.updateSystemHealth(data.overall_health);
        }
        
        // Enhanced activity logging
        if (this.activityFeed && data.significant_change) {
            const activity = {
                id: `metrics_${Date.now()}`,
                title: 'Model Metrics Updated',
                description: `${data.model_name || 'Model'} metrics updated - Accuracy: ${(data.accuracy * 100).toFixed(1)}%`,
                status: 'info',
                timestamp: new Date().toISOString(),
                user: 'System',
                action_type: 'metrics_update'
            };
            this.activityFeed.addActivity(activity);
        }
    }
    
    updateModelMetrics(data) {
        // Delegate all updates to component APIs through update strategies
        updateStrategies.batchUpdateSystemMetrics({
            // Model accuracy
            accuracy: data.accuracy,
            accuracyTrend: data.accuracy_trend,
            
            // Predictions
            totalPredictions: data.predictions_made,
            predictionRate: data.predictions_per_minute,
            
            // Response times
            avgResponseTime: data.avg_response_time,
            p95ResponseTime: data.p95_response_time,
            
            // Additional metrics
            f1Score: data.f1_score,
            validationAccuracy: data.validation_accuracy
        });
        
        // Update Live System Status section specifically
        if (data.accuracy !== undefined || data.predictions_per_minute !== undefined) {
            systemMetrics.updateLiveSystemStatus(
                data.accuracy,
                data.predictions_per_minute,
                data.overall_health || 'healthy'
            );
        }
        
        // Handle any model-specific display updates
        if (data.model_id) {
            // Update specific model card if needed
            const modelCard = document.querySelector(`[data-model-id="${data.model_id}"]`);
            if (modelCard) {
                // Use component APIs for any model card updates
                const accuracyEl = modelCard.querySelector('.model-accuracy');
                if (accuracyEl && data.accuracy !== undefined) {
                    Metric.update(accuracyEl.id || 'model-accuracy-' + data.model_id, 
                        data.accuracy * 100, { format: 'percent' });
                }
            }
        }
    }
    
    updateConnectionCount(data) {
        // Delegate to update strategies for consistent component-based updates
        if (data.count !== undefined) {
            updateStrategies.batchUpdateSystemMetrics({
                activeConnections: data.count
            });
            
            // Update tooltip with breakdown if available
            if (data.breakdown) {
                const tooltip = Object.entries(data.breakdown)
                    .map(([type, count]) => `${type}: ${count}`)
                    .join(' | ');
                
                Metric.update('activeConnections', `${data.count} Active`, {
                    format: 'custom',
                    tooltip: tooltip
                });
            }
        }
    }
    
    updatePerformanceMetrics(data) {
        // Delegate all performance metrics to update strategies
        updateStrategies.batchUpdateSystemMetrics({
            apiResponseTime: data.api_response_time,
            wsResponseTime: data.ws_latency,
            pingTime: data.ping_time
        });
        
        // Update additional performance metrics if available
        if (data.training_duration || data.avg_response_time || data.total_predictions) {
            systemMetrics.updatePerformanceMetrics({
                trainingDuration: data.training_duration,
                avgResponseTime: data.avg_response_time,
                apiCallsToday: data.api_calls_today,
                totalPredictions: data.total_predictions
            });
        }
    }
    
    updateResourceStatus(data) {
        // Delegate to update strategies for consistent updates
        const updates = {};
        
        // Update total models count
        if (data.models !== undefined) {
            const active = data.models.active || 0;
            updates.totalModels = active;
            updates.activeJobs = data.models.total || 0;
            
            // Create tooltip with model names
            const tooltip = data.models.list && data.models.list.length > 0 
                ? 'Active models: ' + data.models.list.join(', ')
                : null;
                
            if (tooltip) {
                Metric.update('totalModels', `${active} Active`, {
                    format: 'custom',
                    tooltip: tooltip
                });
            }
        }
        
        // Update queue jobs if available
        if (data.queue !== undefined) {
            const pending = data.queue.pending || 0;
            const processing = data.queue.processing || 0;
            
            // Format display with warning if needed
            let display = `${pending} Pending`;
            if (pending > 10) {
                display += ' ⚠️';
            }
            
            const tooltip = processing > 0 
                ? `Pending: ${pending} | Processing: ${processing}`
                : null;
                
            Metric.update('queueJobs', display, {
                format: 'custom',
                tooltip: tooltip,
                style: pending > 10 ? 'warning' : 'default'
            });
        }
        
        // Batch update any numeric metrics
        if (Object.keys(updates).length > 0) {
            updateStrategies.batchUpdateSystemMetrics(updates);
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
    
} catch (error) {
    console.error('❌ Failed to expose modules globally:', error);
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});

export { Dashboard };