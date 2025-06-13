import { wsManager } from '../common/websocket.js';
import { API } from '../common/api.js';
import { ActivityFeed } from '../components/activity-feed.js';
// Import only needed UI components (split modules for better performance)
import { Card, Metric, ProgressBar, Grid, initializeCoreUIStyles } from '../components/ui-core.js';
import { ButtonGroup, UploadArea, initializeFormUIStyles } from '../components/ui-forms.js';
import { ChartContainer, initializeChartUIStyles } from '../components/ui-charts.js';
import { BasePageController } from '../common/lifecycle.js';
import { demoData } from '../common/demo-data.js';
import { CONFIG } from '../common/config.js';
// Import centralized error handling system
import { ErrorHandler, ErrorSeverity, ErrorCategory, RecoveryStrategy } from '../common/error-handler.js';
import { withErrorHandling } from '../common/error-utils.js';

/**
 * Data Management Page Controller
 * Handles dataset uploads, processing, and quality assessment
 */
class DataManager extends BasePageController {
    constructor() {
        super(); // Initialize lifecycle management
        
        this.datasets = [];
        this.processingJobs = [];
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
        
        // Note: Drag and drop is now handled by UploadArea component
        
        // Replace static cards with dynamic components
        this.renderDynamicCards();
    }
    
    setupEventListeners() {
        // File input change - using managed event listener
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            this.addEventListener(fileInput, 'change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileUpload(e.target.files[0]);
                }
            });
        }
        
        // Dataset filter - using managed event listener
        const datasetFilter = document.getElementById('datasetFilter');
        if (datasetFilter) {
            this.addEventListener(datasetFilter, 'change', (e) => {
                this.filterDatasets(e.target.value);
            });
        }
        
        // Refresh datasets - using managed event listener
        const refreshBtn = document.getElementById('refreshDatasets');
        if (refreshBtn) {
            this.addEventListener(refreshBtn, 'click', () => {
                this.loadDatasets();
            });
        }
        
        // Create job button - using managed event listener
        const createJobBtn = document.getElementById('createJobBtn');
        if (createJobBtn) {
            this.addEventListener(createJobBtn, 'click', () => {
                this.createProcessingJob();
            });
        }
        
        // Dataset and job actions - using managed event listener
        const actionHandler = (e) => {
            if (e.target.matches('.dataset-actions .btn')) {
                const action = e.target.textContent.toLowerCase();
                const datasetCard = e.target.closest('.dataset-card');
                if (datasetCard) {
                    this.handleDatasetAction(action, datasetCard);
                }
            }
            
            if (e.target.matches('.job-actions .btn')) {
                const action = e.target.textContent.toLowerCase();
                const jobItem = e.target.closest('.job-item');
                if (jobItem) {
                    this.handleJobAction(action, jobItem);
                }
            }
        };
        this.addEventListener(document, 'click', actionHandler);
    }
    
    // setupDragAndDrop method removed - now handled by UploadArea component
    
    setupWebSocketListeners() {
        // Dataset upload progress - using managed WebSocket handlers
        this.addWebSocketHandler('upload_progress', (data) => {
            this.updateUploadProgress(data);
        });
        
        // Dataset processing status - using managed WebSocket handlers
        this.addWebSocketHandler('dataset_processed', (data) => {
            this.handleDatasetProcessed(data);
        });
        
        // Data quality updates - using managed WebSocket handlers
        this.addWebSocketHandler('quality_assessment', (data) => {
            this.updateQualityMetrics(data);
        });
        
        // Processing job updates - using managed WebSocket handlers
        this.addWebSocketHandler('job_progress', (data) => {
            this.updateJobProgress(data);
        });
        
        // Job completed - using managed WebSocket handlers
        this.addWebSocketHandler('job_completed', (data) => {
            this.handleJobCompleted(data);
        });
    }
    
    async loadInitialData() {
        try {
            // Load datasets
            await this.loadDatasets();
            
            // Load processing jobs
            await this.loadProcessingJobs();
            
            // Load quality metrics
            await this.loadQualityMetrics();
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.SYSTEM,
                recovery: RecoveryStrategy.FALLBACK,
                context: { component: 'Data', action: 'loadInitialData' },
                userMessage: 'Failed to load data management dashboard. Using fallback data.'
            });
            this.showNotification('Failed to load data', 'error');
        }
    }
    
    async loadDatasets() {
        try {
            // Load real datasets from backend API
            const response = await API.getDatasets();
            const backendDatasets = response.datasets || [];
            
            // Transform backend data to match frontend expectations
            const datasets = backendDatasets.map(dataset => ({
                id: dataset.id,
                name: dataset.name,
                description: `Dataset with ${dataset.rows} rows and ${dataset.columns} columns`,
                status: dataset.status === 'available' ? 'ready' : dataset.status,
                type: dataset.file_type ? dataset.file_type.toUpperCase() : 'CSV',
                size: this.formatFileSize(dataset.size || 0),
                rows: dataset.rows,
                columns: dataset.columns,
                uploadedAt: dataset.created_at ? new Date(dataset.created_at).getTime() : Date.now(),
                error: dataset.status === 'error' ? 'Processing failed' : null
            }));
            
            this.datasets = datasets;
            this.renderDatasetList();
            this.updateDatasetStats();
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                context: { component: 'Data', action: 'loadDatasets' },
                userMessage: 'Failed to load datasets. Showing demo data.'
            });
            // Fallback to empty list on error
            this.datasets = [];
            this.renderDatasetList();
            this.showNotification('Failed to load datasets', 'error');
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    async loadProcessingJobs() {
        try {
            let jobs = [];
            
            if (CONFIG.DEMO.ENABLED) {
                // Use demo data in demo mode
                jobs = demoData.getDemoProcessingJobs();
            } else {
                // Load real processing jobs from API
                // TODO: Implement real API call when backend supports it
                jobs = [];
            }
            
            this.processingJobs = jobs;
            this.renderProcessingJobs();
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                context: { component: 'Data', action: 'loadProcessingJobs' },
                userMessage: 'Failed to load processing jobs. Using cached data.'
            });
            
            // Fallback to demo data on error if in demo mode
            if (CONFIG.DEMO.ENABLED) {
                this.processingJobs = demoData.getDemoProcessingJobs();
                this.renderProcessingJobs();
            }
        }
    }
    
    async loadQualityMetrics() {
        try {
            let metrics = null;
            
            if (CONFIG.DEMO.ENABLED) {
                // Use demo data in demo mode
                metrics = demoData.getDemoQualityMetrics();
            } else {
                // Load real quality metrics from API
                // TODO: Implement real API call when backend supports it
                metrics = {
                    overallScore: 0,
                    completeness: 0,
                    accuracy: 0,
                    consistency: 0,
                    validity: 0
                };
            }
            
            this.updateQualityDisplay(metrics);
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                context: { component: 'Data', action: 'loadQualityMetrics' },
                userMessage: 'Failed to load data quality metrics. Using demo data.'
            });
            
            // Fallback to demo data on error if in demo mode
            if (CONFIG.DEMO.ENABLED) {
                const demoMetrics = demoData.getDemoQualityMetrics();
                this.updateQualityDisplay(demoMetrics);
            }
        }
    }
    
    renderDatasets() {
        // Datasets are already rendered in HTML as static examples
        // In a real implementation, this would dynamically render dataset cards
        this.showNotification('Dataset library updated', 'info');
    }
    
    renderProcessingJobs() {
        // Processing jobs are already rendered in HTML as static examples
        // In a real implementation, this would dynamically render job items
        this.showNotification('Processing jobs updated', 'info');
    }
    
    updateQualityDisplay(metrics) {
        // Update quality score circle and metrics
        const scoreValue = document.querySelector('.score-value');
        if (scoreValue) {
            scoreValue.textContent = `${metrics.overallScore}%`;
        }
        
        // Update individual metric bars
        const metricFills = document.querySelectorAll('.metric-fill');
        const values = [metrics.completeness, metrics.accuracy, metrics.consistency, metrics.validity];
        
        metricFills.forEach((fill, index) => {
            if (values[index]) {
                fill.style.width = `${values[index]}%`;
            }
        });
    }
    
    async handleFileUpload(file) {
        this.showNotification(`Uploading ${file.name}...`, 'info');
        
        // Show upload progress
        const uploadProgressContainer = document.getElementById('uploadProgressContainer');
        if (uploadProgressContainer) {
            uploadProgressContainer.style.display = 'block';
        }
        
        // Set UploadArea to uploading state
        const uploadArea = document.getElementById('modernUploadArea');
        if (uploadArea) {
            UploadArea.setState(uploadArea, 'uploading', 'Uploading...');
        }
        
        try {
            // Upload file using real backend API
            const result = await API.uploadDataset(file, (progress) => {
                this.updateUploadProgress({ progress });
            });
            
            this.showNotification(`${file.name} uploaded successfully!`, 'success');
            
            // Hide upload progress
            if (uploadProgressContainer) {
                setTimeout(() => {
                    uploadProgressContainer.style.display = 'none';
                }, 2000);
            }
            
            // Reload datasets to show the new upload
            await this.loadDatasets();
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.HIGH,
                category: ErrorCategory.UPLOAD,
                recovery: RecoveryStrategy.RETRY,
                context: { component: 'Data', action: 'handleFileUpload', file: file?.name },
                userMessage: 'File upload failed. Please check your file format and try again.'
            });
            this.showNotification(`Upload failed: ${error.message}`, 'error');
            
            // Set error state
            if (uploadArea) {
                UploadArea.setState(uploadArea, 'error', `Upload failed: ${error.message}`);
            }
            
            if (uploadProgressContainer) {
                uploadProgressContainer.style.display = 'none';
            }
        }
    }
    
    updateUploadProgress(data) {
        const progressFill = document.getElementById('uploadProgressFill');
        const progressText = document.getElementById('uploadProgressText');
        
        if (progressFill) {
            progressFill.style.width = `${data.progress}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${data.progress}%`;
        }
    }
    
    filterDatasets(filter) {
        // Implement dataset filtering logic
        this.showNotification(`Filtering datasets by: ${filter}`, 'info');
        
        // In real implementation, this would filter the dataset grid
        // based on the selected filter criteria
    }
    
    handleDatasetAction(action, datasetCard) {
        const datasetName = datasetCard.querySelector('h4').textContent;
        
        switch (action) {
            case 'preview':
                this.previewDataset(datasetName);
                break;
            case 'profile':
                this.profileDataset(datasetName);
                break;
            case 'download':
                this.downloadDataset(datasetName);
                break;
            case 'retry':
                this.retryDatasetProcessing(datasetName);
                break;
            case 'debug':
                this.debugDataset(datasetName);
                break;
            case 'delete':
                this.deleteDataset(datasetName);
                break;
            default:
                this.showNotification(`Unknown action: ${action}`, 'error');
        }
    }
    
    previewDataset(name) {
        this.showNotification(`Opening preview for ${name}`, 'info');
        // Future: Open dataset preview modal with sample data
    }
    
    profileDataset(name) {
        this.showNotification(`Generating data profile for ${name}`, 'info');
        // Future: Open data profiling view with statistics
    }
    
    downloadDataset(name) {
        this.showNotification(`Downloading ${name}...`, 'info');
        // Future: Trigger dataset download
    }
    
    retryDatasetProcessing(name) {
        this.showNotification(`Retrying processing for ${name}`, 'info');
        // Future: Retry failed dataset processing
    }
    
    debugDataset(name) {
        this.showNotification(`Opening debug view for ${name}`, 'info');
        // Future: Open debug console for dataset issues
    }
    
    deleteDataset(name) {
        if (confirm(`Are you sure you want to delete ${name}?`)) {
            this.showNotification(`Deleting ${name}...`, 'warning');
            // Future: Delete dataset via API
        }
    }
    
    createProcessingJob() {
        this.showNotification('Creating new processing job...', 'info');
        // Future: Open job creation modal or navigate to job creation page
    }
    
    handleJobAction(action, jobItem) {
        const jobName = jobItem.querySelector('h4').textContent;
        
        switch (action) {
            case 'view':
            case 'view results':
                this.viewJob(jobName);
                break;
            case 'stop':
                this.stopJob(jobName);
                break;
            case 'download':
                this.downloadJobResults(jobName);
                break;
            default:
                this.showNotification(`Unknown job action: ${action}`, 'error');
        }
    }
    
    viewJob(name) {
        this.showNotification(`Opening job details for ${name}`, 'info');
        // Future: Open job details modal or page
    }
    
    stopJob(name) {
        this.showNotification(`Stopping job: ${name}`, 'warning');
        // Future: Stop running job via API
    }
    
    downloadJobResults(name) {
        this.showNotification(`Downloading results for ${name}`, 'info');
        // Future: Download job output files
    }
    
    updateJobProgress(data) {
        // Update job progress based on WebSocket data
        const job = this.processingJobs.find(j => j.id === data.jobId);
        if (job) {
            job.progress = data.progress;
            this.renderProcessingJobs();
        }
    }
    
    handleJobCompleted(data) {
        this.showNotification(`Processing job completed: ${data.jobName}`, 'success');
        
        // Update job status
        const job = this.processingJobs.find(j => j.id === data.jobId);
        if (job) {
            job.status = 'completed';
            job.progress = 100;
            job.completedAt = Date.now();
            job.duration = data.duration;
            this.renderProcessingJobs();
        }
    }
    
    handleDatasetProcessed(data) {
        this.showNotification(`Dataset processed: ${data.datasetName}`, 'success');
        
        // Update dataset status
        const dataset = this.datasets.find(d => d.id === data.datasetId);
        if (dataset) {
            dataset.status = 'ready';
            this.renderDatasets();
        }
        
        // Reload quality metrics
        this.loadQualityMetrics();
    }
    
    updateQualityMetrics(data) {
        // Update quality assessment based on WebSocket data
        this.updateQualityDisplay(data.metrics);
        this.showNotification('Data quality assessment updated', 'info');
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
        
        console.log(`${emoji[type] || 'ℹ️'} Data: ${message}`);
    }
    
    renderDynamicCards() {
        // Replace all static cards with dynamic components
        this.replaceUploadCard();
        this.replaceDatasetLibraryCard();
        this.replaceDataQualityCard();
        this.replaceProcessingJobsCard();
        this.replaceActivityCard();
    }
    
    replaceUploadCard() {
        const uploadCard = document.querySelector('.card:first-of-type');
        if (!uploadCard) return;
        
        // Create content div to hold the UploadArea component
        const uploadContent = document.createElement('div');
        uploadContent.id = 'uploadContainer';
        
        const newCard = Card.create({
            title: 'Upload Dataset',
            icon: '📂',
            content: uploadContent,
            id: 'uploadCard'
        });
        
        // Create modern UploadArea component
        const uploadArea = UploadArea.create({
            accept: ['.csv', '.json', '.parquet'],
            multiple: false,
            maxSize: 100,
            placeholder: 'Drop your dataset files here or click to browse',
            onUpload: (file) => this.handleFileUpload(file),
            onError: (errors) => this.showNotification(errors.join('\n'), 'error'),
            id: 'modernUploadArea'
        });
        
        uploadContent.appendChild(uploadArea);
        
        // Add progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.id = 'uploadProgressContainer';
        progressContainer.style.marginTop = 'var(--spacing-md)';
        progressContainer.style.display = 'none';
        
        const progressBar = ProgressBar.create({
            progress: 0,
            label: 'Uploading...',
            showPercentage: true,
            id: 'uploadProgressBar'
        });
        progressContainer.appendChild(progressBar);
        uploadContent.appendChild(progressContainer);
        
        uploadCard.parentNode.replaceChild(newCard, uploadCard);
    }
    
    replaceDatasetLibraryCard() {
        const cards = document.querySelectorAll('.card');
        let datasetCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Dataset Library')) {
                datasetCard = card;
            }
        });
        
        if (!datasetCard) return;
        
        // Create header actions with modern components
        const headerActions = document.createElement('div');
        headerActions.className = 'card-actions';
        headerActions.style.display = 'flex';
        headerActions.style.gap = 'var(--spacing-md)';
        headerActions.style.alignItems = 'center';
        
        const filterSelect = document.createElement('select');
        filterSelect.id = 'datasetFilter';
        filterSelect.className = 'select';
        filterSelect.innerHTML = `
            <option value="all">All Datasets</option>
            <option value="training">Training Data</option>
            <option value="validation">Validation Data</option>
            <option value="test">Test Data</option>
        `;
        
        const refreshButtonGroup = ButtonGroup.create({
            buttons: [
                {
                    text: 'Refresh',
                    icon: '🔄',
                    variant: 'secondary',
                    onClick: () => this.loadDatasets()
                }
            ],
            id: 'refreshButtonGroup'
        });
        
        headerActions.appendChild(filterSelect);
        headerActions.appendChild(refreshButtonGroup);
        
        const datasetContent = `<div class="dataset-grid" id="datasetGrid"></div>`;
        
        const newCard = Card.create({
            title: 'Dataset Library',
            icon: '📚',
            content: datasetContent,
            headerActions: headerActions,
            id: 'datasetLibraryCard'
        });
        
        // Copy existing dataset grid content
        const existingGrid = datasetCard.querySelector('.dataset-grid');
        const newGrid = newCard.querySelector('.dataset-grid');
        if (existingGrid && newGrid) {
            newGrid.innerHTML = existingGrid.innerHTML;
        }
        
        datasetCard.parentNode.replaceChild(newCard, datasetCard);
        
        // Re-attach event listeners
        const filterEl = newCard.querySelector('#datasetFilter');
        if (filterEl) {
            filterEl.addEventListener('change', (e) => this.filterDatasets(e.target.value));
        }
        
        const refreshBtn = newCard.querySelector('#refreshDatasets');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadDatasets());
        }
    }
    
    replaceDataQualityCard() {
        const cards = document.querySelectorAll('.card');
        let qualityCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Data Quality Assessment')) {
                qualityCard = card;
            }
        });
        
        if (!qualityCard) return;
        
        const qualityContent = document.createElement('div');
        
        // Overall quality score
        const scoreSection = document.createElement('div');
        scoreSection.className = 'quality-overview';
        scoreSection.innerHTML = `
            <div class="quality-score">
                <div class="score-circle">
                    <div class="score-value" id="overallScore">85%</div>
                </div>
                <div class="score-label">Overall Quality Score</div>
            </div>
            <div id="qualityMetricsGrid"></div>
        `;
        qualityContent.appendChild(scoreSection);
        
        const newCard = Card.create({
            title: 'Data Quality Assessment',
            icon: '🔍',
            content: qualityContent,
            id: 'dataQualityCard'
        });
        
        // Add quality metrics grid using new components
        const metricsContainer = newCard.querySelector('#qualityMetricsGrid');
        const metricsGrid = Grid.create({
            columns: 2,
            gap: 'lg',
            responsive: { sm: 1, md: 2 },
            children: [
                this.createQualityMetricCard('✅', 'Completeness', '92% of data points are complete', 92, 'default'),
                this.createQualityMetricCard('🎯', 'Accuracy', '88% of values within expected ranges', 88, 'default'),
                this.createQualityMetricCard('🔗', 'Consistency', '95% of data follows standard formats', 95, 'success'),
                this.createQualityMetricCard('⚠️', 'Validity', '76% of records pass validation rules', 76, 'warning')
            ]
        });
        metricsContainer.appendChild(metricsGrid);
        
        qualityCard.parentNode.replaceChild(newCard, qualityCard);
    }
    
    createQualityMetricCard(icon, title, description, value, style) {
        const metricCard = document.createElement('div');
        metricCard.className = 'quality-metric';
        metricCard.innerHTML = `
            <div class="metric-icon">${icon}</div>
            <div class="metric-info">
                <h4>${title}</h4>
                <p>${description}</p>
                <div id="${title.toLowerCase()}Progress"></div>
            </div>
        `;
        
        // Add progress bar
        const progressContainer = metricCard.querySelector(`#${title.toLowerCase()}Progress`);
        const progressBar = ProgressBar.create({
            progress: value,
            showPercentage: false,
            style: style,
            height: 8,
            id: `${title.toLowerCase()}ProgressBar`
        });
        progressContainer.appendChild(progressBar);
        
        return metricCard;
    }
    
    replaceProcessingJobsCard() {
        const cards = document.querySelectorAll('.card');
        let jobsCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Data Processing Jobs')) {
                jobsCard = card;
            }
        });
        
        if (!jobsCard) return;
        
        const headerActions = ButtonGroup.create({
            buttons: [
                {
                    text: 'Create Job',
                    icon: '➕',
                    variant: 'primary',
                    onClick: () => this.createProcessingJob()
                }
            ],
            id: 'createJobButtonGroup'
        });
        
        const jobsContent = `<div class="job-list" id="jobList"></div>`;
        
        const newCard = Card.create({
            title: 'Data Processing Jobs',
            icon: '⚙️',
            content: jobsContent,
            headerActions: headerActions,
            id: 'processingJobsCard'
        });
        
        // Copy existing job list content and update progress bars
        const existingJobList = jobsCard.querySelector('.job-list');
        const newJobList = newCard.querySelector('.job-list');
        if (existingJobList && newJobList) {
            newJobList.innerHTML = existingJobList.innerHTML;
            
            // Replace progress bars in job items
            const jobItems = newJobList.querySelectorAll('.job-item');
            jobItems.forEach(item => {
                const progressDiv = item.querySelector('.job-progress');
                const oldProgressBar = progressDiv.querySelector('.progress-bar');
                const progressValue = oldProgressBar ? 
                    parseInt(oldProgressBar.querySelector('.progress-fill').style.width) : 0;
                
                progressDiv.innerHTML = '';
                const newProgressBar = ProgressBar.create({
                    progress: progressValue,
                    showPercentage: false,
                    style: progressValue === 100 ? 'success' : 'default',
                    animated: progressValue < 100,
                    height: 8
                });
                progressDiv.appendChild(newProgressBar);
            });
        }
        
        jobsCard.parentNode.replaceChild(newCard, jobsCard);
    }
    
    replaceActivityCard() {
        const cards = document.querySelectorAll('.card');
        let activityCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Data Activity')) {
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
            title: 'Data Activity',
            icon: '🔍',
            content: activityContent,
            id: 'dataActivityCard'
        });
        
        activityCard.parentNode.replaceChild(newCard, activityCard);
        
        // Re-initialize activity feed
        const activityContainer = newCard.querySelector('#activityFeed');
        if (activityContainer && this.activityFeed) {
            this.activityFeed = new ActivityFeed('activityFeed');
        }
    }
    
    updateUploadProgress(data) {
        // Update progress using new ProgressBar component
        ProgressBar.update('uploadProgressBar', data.progress, {
            label: `Uploading... ${data.progress}%`
        });
        
        // Show/hide upload progress container
        const uploadProgressContainer = document.getElementById('uploadProgressContainer');
        if (uploadProgressContainer) {
            uploadProgressContainer.style.display = data.progress < 100 ? 'block' : 'none';
        }
        
        // Update UploadArea state
        const uploadArea = document.getElementById('modernUploadArea');
        if (uploadArea) {
            if (data.progress < 100) {
                UploadArea.setState(uploadArea, 'uploading', `Uploading... ${data.progress}%`);
            } else {
                UploadArea.setState(uploadArea, 'success', 'Upload completed successfully!');
                // Reset to ready state after 2 seconds
                setTimeout(() => {
                    UploadArea.setState(uploadArea, 'ready');
                }, 2000);
            }
        }
    }
    
    renderDatasetList() {
        const datasetGrid = document.getElementById('datasetGrid');
        if (!datasetGrid) return;
        
        // Clear existing content
        datasetGrid.innerHTML = '';
        
        // Render datasets
        this.datasets.forEach(dataset => {
            const statusClass = dataset.status === 'ready' ? 'status-ready' : 
                               dataset.status === 'processing' ? 'status-processing' : 
                               'status-error';
            
            const datasetCard = document.createElement('div');
            datasetCard.className = 'dataset-card';
            datasetCard.innerHTML = `
                <div class="dataset-header">
                    <div class="dataset-icon">${dataset.status === 'error' ? '⚠️' : '📊'}</div>
                    <div class="dataset-info">
                        <h4>${dataset.name}</h4>
                        <p>${dataset.description}</p>
                    </div>
                    <div class="dataset-status">
                        <span class="status-badge ${statusClass}">${dataset.status}</span>
                    </div>
                </div>
                <div class="dataset-stats">
                    <div class="stat">
                        <span class="stat-label">Rows:</span>
                        <span class="stat-value">${dataset.rows || 'Unknown'}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Columns:</span>
                        <span class="stat-value">${dataset.columns || 'Unknown'}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Size:</span>
                        <span class="stat-value">${dataset.size}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Type:</span>
                        <span class="stat-value">${dataset.type}</span>
                    </div>
                </div>
                <div class="dataset-actions">
                    ${dataset.status === 'ready' ? `
                        <button class="btn btn-primary">Preview</button>
                        <button class="btn btn-secondary">Profile</button>
                        <button class="btn btn-secondary">Download</button>
                    ` : dataset.status === 'error' ? `
                        <button class="btn btn-primary">Retry</button>
                        <button class="btn btn-secondary">Debug</button>
                        <button class="btn btn-danger">Delete</button>
                    ` : `
                        <button class="btn btn-secondary" disabled>Processing...</button>
                    `}
                </div>
            `;
            
            datasetGrid.appendChild(datasetCard);
        });
        
        // If no datasets, show empty state
        if (this.datasets.length === 0) {
            datasetGrid.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📦</div>
                    <p>No datasets uploaded yet. Upload your first dataset to get started!</p>
                </div>
            `;
        }
    }
    
    updateDatasetStats() {
        // Update any dataset statistics displayed elsewhere
        const totalDatasets = this.datasets.length;
        const readyDatasets = this.datasets.filter(d => d.status === 'ready').length;
        
        console.log(`Total datasets: ${totalDatasets}, Ready: ${readyDatasets}`);
    }

    /**
     * Custom cleanup logic for data management page
     */
    customCleanup() {
        // Clean up activity feed
        if (this.activityFeed && this.activityFeed.destroy) {
            this.activityFeed.destroy();
        }
        
        // Clear datasets and jobs
        this.datasets = [];
        this.processingJobs = [];
        
        console.log('DataManager: Custom cleanup completed');
    }
}

// Initialize data management page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DataManager();
});

export { DataManager };