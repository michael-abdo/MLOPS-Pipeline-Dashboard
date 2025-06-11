import { wsManager } from '../common/websocket.js';
import { API } from '../common/api.js';
import { ActivityFeed } from '../components/activity-feed.js';

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
        // Initialize activity feed
        const activityContainer = document.getElementById('activityFeed');
        if (activityContainer) {
            this.activityFeed = new ActivityFeed('activityFeed');
        }
        
        // Setup drag and drop
        this.setupDragAndDrop();
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
        // Simulate loading datasets from backend
        // In real implementation, this would call the backend API
        const datasets = [
            {
                id: 'dataset-001',
                name: 'simple_test_data.csv',
                description: 'Training dataset for basic model testing',
                status: 'ready',
                type: 'CSV',
                size: '89.2 KB',
                rows: 1250,
                columns: 8,
                uploadedAt: Date.now() - 86400000, // 1 day ago
            },
            {
                id: 'dataset-002',
                name: 'customer_segments.json',
                description: 'Customer segmentation analysis results',
                status: 'processing',
                type: 'JSON',
                size: '2.3 MB',
                rows: 45680,
                columns: 15,
                uploadedAt: Date.now() - 3600000, // 1 hour ago
            },
            {
                id: 'dataset-003',
                name: 'large_dataset.parquet',
                description: 'Large-scale production dataset',
                status: 'error',
                type: 'Parquet',
                size: '156.8 MB',
                rows: null,
                columns: null,
                error: 'File format validation failed',
                uploadedAt: Date.now() - 7200000, // 2 hours ago
            }
        ];
        
        this.datasets = datasets;
        this.renderDatasets();
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
            // Simulate file upload
            // In real implementation, this would upload to backend
            for (let progress = 0; progress <= 100; progress += 10) {
                await new Promise(resolve => setTimeout(resolve, 200));
                this.updateUploadProgress({ progress });
            }
            
            this.showNotification(`${file.name} uploaded successfully!`, 'success');
            
            // Hide upload progress
            if (uploadProgress) {
                setTimeout(() => {
                    uploadProgress.style.display = 'none';
                }, 1000);
            }
            
            // Reload datasets
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
}

// Initialize data management page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DataManager();
});

export { DataManager };