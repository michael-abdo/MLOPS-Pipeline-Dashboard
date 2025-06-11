import { CONFIG } from './config.js';

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
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: response.statusText }));
                throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }
    
    /**
     * Upload file with progress tracking
     */
    async uploadFile(file, onProgress) {
        const formData = new FormData();
        formData.append('file', file);
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
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
                        reject(new Error('Invalid response format'));
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        reject(new Error(error.detail || `HTTP ${xhr.status}`));
                    } catch {
                        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                    }
                }
            });
            
            xhr.addEventListener('error', () => {
                reject(new Error('Network error'));
            });
            
            xhr.open('POST', `${this.baseURL}/upload`);
            xhr.send(formData);
        });
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
}

// Export singleton instance
export const API = new APIClient();