import { CONFIG } from './config.js';
import { 
    withErrorHandling, 
    withTimeout, 
    withRetry,
    validate
} from './error-utils.js';
import { 
    ErrorCategory, 
    ErrorSeverity, 
    RecoveryStrategy,
    createNetworkError,
    createUploadError
} from './error-handler.js';

/**
 * Centralized API client for all HTTP requests
 */
class APIClient {
    constructor() {
        this.baseURL = CONFIG.API_BASE;
    }
    
    /**
     * Make HTTP request with consistent error handling
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const timeout = options.timeout || CONFIG.API_TIMEOUT || 30000;
        
        return await withErrorHandling.api(async () => {
            return await withTimeout(
                this._makeRequest(url, options),
                timeout,
                `API ${options.method || 'GET'} ${endpoint}`
            );
        }, endpoint, {
            severity: ErrorSeverity.MEDIUM,
            recovery: RecoveryStrategy.RETRY,
            context: { 
                method: options.method || 'GET',
                url,
                timeout 
            }
        });
    }

    /**
     * Internal method to make the actual HTTP request
     */
    async _makeRequest(url, options) {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            let errorDetail;
            try {
                const errorData = await response.json();
                errorDetail = errorData.detail || errorData.message || response.statusText;
            } catch (parseError) {
                errorDetail = response.statusText;
            }
            
            throw createNetworkError(
                `HTTP ${response.status}: ${errorDetail}`,
                null,
                {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url,
                    userMessage: this._getUserFriendlyErrorMessage(response.status, errorDetail)
                }
            );
        }
        
        return await response.json();
    }

    /**
     * Convert HTTP status codes to user-friendly messages
     */
    _getUserFriendlyErrorMessage(status, detail) {
        switch (status) {
            case 400:
                return 'Invalid request. Please check your input and try again.';
            case 401:
                return 'Authentication required. Please log in and try again.';
            case 403:
                return 'Permission denied. You don\'t have access to this resource.';
            case 404:
                return 'Resource not found. The requested item may have been moved or deleted.';
            case 408:
                return 'Request timeout. Please try again.';
            case 429:
                return 'Too many requests. Please wait a moment and try again.';
            case 500:
                return 'Server error. Please try again later.';
            case 502:
            case 503:
            case 504:
                return 'Service temporarily unavailable. Please try again later.';
            default:
                return detail || 'An unexpected error occurred. Please try again.';
        }
    }
    
    /**
     * Upload file with progress tracking
     */
    async uploadFile(file, onProgress) {
        // Validate file before upload
        this._validateUploadFile(file);
        
        return await withErrorHandling.upload(async () => {
            return await this._performUpload(file, onProgress, '/upload');
        }, file.name, {
            severity: ErrorSeverity.MEDIUM,
            recovery: RecoveryStrategy.RETRY,
            context: { 
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                operation: 'file_upload'
            }
        });
    }

    /**
     * Validate file before upload
     */
    _validateUploadFile(file) {
        validate.required(file, 'File');
        
        // File size validation (50MB limit)
        const maxSize = 50 * 1024 * 1024;
        validate.fileSize(file, maxSize, 'File');
        
        // File type validation
        const allowedTypes = [
            'text/csv',
            'application/csv',
            'text/plain',
            'application/json',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        validate.fileType(file, allowedTypes, 'File');
    }

    /**
     * Perform the actual file upload
     */
    async _performUpload(file, onProgress, endpoint) {
        const formData = new FormData();
        formData.append('file', file);
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const timeout = CONFIG.UPLOAD_TIMEOUT || 300000; // 5 minutes
            
            // Set timeout
            xhr.timeout = timeout;
            
            // Track upload progress
            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = (e.loaded / e.total) * 100;
                        onProgress(percentComplete);
                    }
                });
            }
            
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        reject(createUploadError(
                            'Invalid server response format',
                            error,
                            { userMessage: 'Server returned invalid data. Please try again.' }
                        ));
                    }
                } else {
                    let errorDetail;
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        errorDetail = errorData.detail || errorData.message || xhr.statusText;
                    } catch {
                        errorDetail = xhr.statusText || 'Upload failed';
                    }
                    
                    reject(createUploadError(
                        `HTTP ${xhr.status}: ${errorDetail}`,
                        null,
                        {
                            status: xhr.status,
                            userMessage: this._getUserFriendlyUploadErrorMessage(xhr.status, errorDetail, file)
                        }
                    ));
                }
            });
            
            xhr.addEventListener('error', () => {
                reject(createUploadError(
                    'Network error during upload',
                    null,
                    { userMessage: 'Network connection failed during upload. Please check your connection and try again.' }
                ));
            });
            
            xhr.addEventListener('timeout', () => {
                reject(createUploadError(
                    'Upload timeout',
                    null,
                    { userMessage: `Upload timed out after ${timeout/1000} seconds. Please try uploading a smaller file.` }
                ));
            });
            
            xhr.addEventListener('abort', () => {
                reject(createUploadError(
                    'Upload aborted',
                    null,
                    { userMessage: 'Upload was cancelled.' }
                ));
            });
            
            xhr.open('POST', `${this.baseURL}${endpoint}`);
            xhr.send(formData);
        });
    }

    /**
     * Get user-friendly upload error messages
     */
    _getUserFriendlyUploadErrorMessage(status, detail, file) {
        switch (status) {
            case 400:
                return `Invalid file format. Please ensure ${file.name} is a valid CSV or Excel file.`;
            case 413:
                return `File too large. ${file.name} exceeds the maximum file size limit.`;
            case 415:
                return `Unsupported file type. Please upload a CSV or Excel file.`;
            case 422:
                return `Invalid file content. Please check that ${file.name} contains valid data.`;
            case 507:
                return 'Server storage full. Please try again later or contact support.';
            default:
                return `Failed to upload ${file.name}. ${detail || 'Please try again.'}`;
        }
    }
    
    // File Operations
    async upload(file, onProgress) {
        return this.uploadFile(file, onProgress);
    }
    
    // Training Operations
    async startTraining(params) {
        return this.request('/train', {
            method: 'POST',
            body: JSON.stringify(params)
        });
    }
    
    async getTrainingStatus(jobId) {
        return this.request(`/training/${jobId}`);
    }
    
    // Model Operations
    async getModels() {
        return this.request('/models');
    }
    
    async getModel(modelId) {
        return this.request(`/models/${modelId}`);
    }
    
    async deployModel(modelId) {
        return this.request(`/models/${modelId}/deploy`, {
            method: 'POST'
        });
    }
    
    async deleteModel(modelId) {
        return this.request(`/models/${modelId}`, {
            method: 'DELETE'
        });
    }
    
    async predict(modelId, data) {
        return this.request(`/models/${modelId}/predict`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    // Activity Operations
    async getActivity() {
        return this.request('/activity');
    }
    
    // System Operations
    async getSystemStatus() {
        return this.request('/status');
    }
    
    async getHealth() {
        return this.request('/health');
    }
    
    // Settings Operations
    async getSettings() {
        return this.request('/settings');
    }
    
    async saveSettings(settings) {
        return this.request('/settings', {
            method: 'POST',
            body: JSON.stringify(settings)
        });
    }
    
    // Pipeline Operations
    async getPipelines() {
        return this.request('/pipelines');
    }
    
    async createPipeline(pipelineData) {
        return this.request('/pipelines', {
            method: 'POST',
            body: JSON.stringify(pipelineData)
        });
    }
    
    async getPipeline(pipelineId) {
        return this.request(`/pipelines/${pipelineId}`);
    }
    
    async updatePipeline(pipelineId, pipelineData) {
        return this.request(`/pipelines/${pipelineId}`, {
            method: 'PUT',
            body: JSON.stringify(pipelineData)
        });
    }
    
    async deletePipeline(pipelineId) {
        return this.request(`/pipelines/${pipelineId}`, {
            method: 'DELETE'
        });
    }
    
    async runPipeline(pipelineId) {
        return this.request(`/pipelines/${pipelineId}/run`, {
            method: 'POST'
        });
    }
    
    async getPipelineStatus(pipelineId) {
        return this.request(`/pipelines/${pipelineId}/status`);
    }
    
    // Dataset Operations
    async getDatasets() {
        return this.request('/datasets');
    }
    
    async uploadDataset(file, onProgress) {
        // Validate file before upload
        this._validateUploadFile(file);
        
        return await withErrorHandling.upload(async () => {
            return await this._performUpload(file, onProgress, '/datasets');
        }, file.name, {
            severity: ErrorSeverity.MEDIUM,
            recovery: RecoveryStrategy.RETRY,
            context: { 
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                operation: 'dataset_upload'
            }
        });
    }
    
    async getDataset(datasetId) {
        return this.request(`/datasets/${datasetId}`);
    }
    
    async deleteDataset(datasetId) {
        return this.request(`/datasets/${datasetId}`, {
            method: 'DELETE'
        });
    }
    
    async previewDataset(datasetId, rows = 10) {
        return this.request(`/datasets/${datasetId}/preview?rows=${rows}`);
    }
    
    async getDatasetStatistics(datasetId) {
        return this.request(`/datasets/${datasetId}/statistics`);
    }
    
    async validateDataset(datasetId) {
        return this.request(`/datasets/${datasetId}/validate`, {
            method: 'POST'
        });
    }
    
    // Component Health Operations
    async getComponentsHealth() {
        return this.request('/components/health');
    }
    
    async getComponentHealth(componentName) {
        return this.request(`/components/${componentName}/health`);
    }
    
    async getComponentMetrics(componentName) {
        return this.request(`/components/${componentName}/metrics`);
    }
    
    // Monitoring Operations
    async getServices() {
        return this.request('/monitoring/services');
    }
    
    async getMonitoringMetrics() {
        return this.request('/monitoring/metrics');
    }
    
    async getAlerts() {
        return this.request('/monitoring/alerts');
    }
    
    async acknowledgeAlert(alertId, acknowledgedBy = 'user') {
        return this.request('/monitoring/alerts/acknowledge', {
            method: 'POST',
            body: JSON.stringify({ alert_id: alertId, acknowledged_by: acknowledgedBy })
        });
    }
}

// Export singleton instance
export const API = new APIClient();