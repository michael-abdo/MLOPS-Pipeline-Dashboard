import { wsManager } from '../common/websocket.js';
import { API } from '../common/api.js';
import { ActivityFeed } from '../components/activity-feed.js';
import { Card, Metric, ProgressBar, Grid, initializeUIComponents } from '../components/ui-components.js';

/**
 * Data Management Page Controller
 * Handles dataset uploads, processing, and quality assessment
 */
class DataManager {
    constructor() {
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
        // Initialize UI components
        initializeUIComponents();
        
        // Initialize activity feed
        const activityContainer = document.getElementById('activityFeed');
        if (activityContainer) {
            this.activityFeed = new ActivityFeed('activityFeed');
        }
        
        // Setup drag and drop
        this.setupDragAndDrop();
        
        // Replace static cards with dynamic components
        this.renderDynamicCards();
    }
    
    setupEventListeners() {
        // File input change
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFileUpload(e.target.files[0]);
                }
            });
        }
        
        // Dataset filter
        const datasetFilter = document.getElementById('datasetFilter');
        if (datasetFilter) {
            datasetFilter.addEventListener('change', (e) => {
                this.filterDatasets(e.target.value);
            });
        }
        
        // Refresh datasets
        const refreshBtn = document.getElementById('refreshDatasets');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadDatasets();
            });
        }
        
        // Create job button
        const createJobBtn = document.getElementById('createJobBtn');
        if (createJobBtn) {
            createJobBtn.addEventListener('click', () => {
                this.createProcessingJob();
            });
        }
        
        // Dataset and job actions
        document.addEventListener('click', (e) => {
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
        });
    }
    
    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        if (!uploadArea) return;
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });
        
        uploadArea.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
    }
    
    setupWebSocketListeners() {
        // Dataset upload progress
        wsManager.on('upload_progress', (data) => {
            this.updateUploadProgress(data);
        });
        
        // Dataset processing status
        wsManager.on('dataset_processed', (data) => {
            this.handleDatasetProcessed(data);
        });
        
        // Data quality updates
        wsManager.on('quality_assessment', (data) => {
            this.updateQualityMetrics(data);
        });
        
        // Processing job updates
        wsManager.on('job_progress', (data) => {
            this.updateJobProgress(data);
        });
        
        // Job completed
        wsManager.on('job_completed', (data) => {
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
            console.error('Failed to load data management data:', error);
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
            console.error('Failed to load datasets:', error);
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
        // Simulate loading processing jobs
        const jobs = [
            {
                id: 'job-001',
                name: 'Data Cleaning & Normalization',
                description: 'Cleaning customer data and normalizing features',
                status: 'running',
                progress: 67,
                startedAt: Date.now() - 300000, // 5 minutes ago
            },
            {
                id: 'job-002',
                name: 'Feature Engineering',
                description: 'Generated 12 new features from raw data',
                status: 'completed',
                progress: 100,
                startedAt: Date.now() - 7200000, // 2 hours ago
                completedAt: Date.now() - 6337000, // 2 hours ago + 14m 23s
                duration: '14m 23s',
            }
        ];
        
        this.processingJobs = jobs;
        this.renderProcessingJobs();
    }
    
    async loadQualityMetrics() {
        // Simulate loading quality assessment data
        const metrics = {
            overallScore: 85,
            completeness: 92,
            accuracy: 88,
            consistency: 95,
            validity: 76
        };
        
        this.updateQualityDisplay(metrics);
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
        const uploadProgress = document.getElementById('uploadProgress');
        if (uploadProgress) {
            uploadProgress.style.display = 'flex';
        }
        
        try {
            // Upload file using real backend API
            const result = await API.uploadDataset(file, (progress) => {
                this.updateUploadProgress({ progress });
            });
            
            this.showNotification(`${file.name} uploaded successfully!`, 'success');
            
            // Hide upload progress
            if (uploadProgress) {
                setTimeout(() => {
                    uploadProgress.style.display = 'none';
                }, 1000);
            }
            
            // Reload datasets to show the new upload
            await this.loadDatasets();
            
        } catch (error) {
            console.error('Upload failed:', error);
            this.showNotification(`Upload failed: ${error.message}`, 'error');
            
            if (uploadProgress) {
                uploadProgress.style.display = 'none';
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
        
        const uploadContent = `
            <div class="upload-area" id="uploadArea">
                <input type="file" id="fileInput" accept=".csv,.json,.parquet" style="display: none;">
                <div class="upload-content">
                    <div class="upload-icon">📁</div>
                    <h4>Drop files here or click to browse</h4>
                    <p>Supported formats: CSV, JSON, Parquet</p>
                    <button class="btn btn-primary" onclick="document.getElementById('fileInput').click()">
                        Choose File
                    </button>
                </div>
            </div>
            
            <div class="upload-progress" id="uploadProgress" style="display: none;">
                <div id="uploadProgressContainer"></div>
            </div>
        `;
        
        const newCard = Card.create({
            title: 'Upload Dataset',
            icon: '📂',
            content: uploadContent,
            id: 'uploadCard'
        });
        
        // Add progress bar
        const progressContainer = newCard.querySelector('#uploadProgressContainer');
        if (progressContainer) {
            const progressBar = ProgressBar.create({
                progress: 0,
                label: 'Uploading...',
                showPercentage: true,
                id: 'uploadProgressBar'
            });
            progressContainer.appendChild(progressBar);
        }
        
        uploadCard.parentNode.replaceChild(newCard, uploadCard);
        
        // Re-setup drag and drop after card replacement
        this.setupDragAndDrop();
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
        
        // Create header actions
        const headerActions = document.createElement('div');
        headerActions.className = 'card-actions';
        headerActions.innerHTML = `
            <select class="select" id="datasetFilter">
                <option value="all">All Datasets</option>
                <option value="training">Training Data</option>
                <option value="validation">Validation Data</option>
                <option value="test">Test Data</option>
            </select>
            <button class="btn btn-secondary" id="refreshDatasets">Refresh</button>
        `;
        
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
        
        const headerActions = document.createElement('button');
        headerActions.className = 'btn btn-primary';
        headerActions.id = 'createJobBtn';
        headerActions.textContent = 'Create Job';
        headerActions.onclick = () => this.createProcessingJob();
        
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
        const uploadProgress = document.getElementById('uploadProgress');
        if (uploadProgress) {
            uploadProgress.style.display = data.progress < 100 ? 'flex' : 'none';
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
}

// Initialize data management page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DataManager();
});

export { DataManager };