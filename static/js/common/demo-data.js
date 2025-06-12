/**
 * Demo Data Service
 * Provides realistic demo data for development and demonstration purposes
 */

import { CONFIG } from './config.js';

class DemoDataService {
    constructor() {
        this.cache = new Map();
        this.isEnabled = CONFIG.DEMO.ENABLED;
    }

    /**
     * Simulate network delay for realistic demo experience
     */
    async simulateDelay() {
        if (!CONFIG.DEMO.SIMULATE_DELAY) return;
        
        const [min, max] = CONFIG.DEMO.DELAY_RANGE;
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Generate demo system metrics
     */
    async getSystemMetrics() {
        await this.simulateDelay();
        
        const now = Date.now();
        const cacheKey = 'system_metrics';
        
        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (now - cached.timestamp < 5000) { // 5 second cache
                return cached.data;
            }
        }
        
        const metrics = {
            uptime: '99.8%',
            cpu_usage: Math.floor(Math.random() * 40) + 20, // 20-60%
            memory_usage: (Math.random() * 2 + 1.5).toFixed(1), // 1.5-3.5 GB
            disk_usage: Math.floor(Math.random() * 30) + 40, // 40-70%
            response_time: Math.floor(Math.random() * 50) + 15, // 15-65ms
            timestamp: now
        };
        
        // Cache the result
        this.cache.set(cacheKey, { data: metrics, timestamp: now });
        
        return metrics;
    }

    /**
     * Generate demo models data
     */
    async getModels() {
        await this.simulateDelay();
        
        const models = [
            {
                id: 'model_001',
                name: 'Customer Prediction Model',
                version: '2.1.3',
                status: 'active',
                accuracy: 94.2,
                predictions_made: 15847,
                avg_response_time: 23,
                training_duration: 342, // seconds
                created_at: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
                hyperparameters: {
                    algorithm: 'Random Forest',
                    n_estimators: 100,
                    max_depth: 10
                },
                model_size: '12.4MB',
                training_samples: 10000,
                validation_samples: 2500
            },
            {
                id: 'model_002',
                name: 'Sales Forecasting Model',
                version: '1.8.1',
                status: 'deployed',
                accuracy: 87.6,
                predictions_made: 8421,
                avg_response_time: 31,
                training_duration: 428,
                created_at: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
                hyperparameters: {
                    algorithm: 'XGBoost',
                    n_estimators: 150,
                    learning_rate: 0.1
                },
                model_size: '8.7MB',
                training_samples: 7500,
                validation_samples: 1875
            }
        ];
        
        return models;
    }

    /**
     * Generate demo datasets
     */
    async getDatasets() {
        await this.simulateDelay();
        
        const datasets = [
            {
                id: 'dataset_001',
                name: 'customer_data_latest.csv',
                status: 'available',
                rows: 15847,
                columns: 12,
                size: 2048576, // 2MB
                file_type: 'csv',
                created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
                quality_score: 92
            },
            {
                id: 'dataset_002',
                name: 'sales_history_2024.csv',
                status: 'processing',
                rows: 8421,
                columns: 8,
                size: 1536000, // 1.5MB
                file_type: 'csv',
                created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                quality_score: 87
            },
            {
                id: 'dataset_003',
                name: 'user_interactions.json',
                status: 'error',
                rows: 0,
                columns: 0,
                size: 512000, // 500KB
                file_type: 'json',
                created_at: new Date(Date.now() - 3600000 * 6).toISOString(), // 6 hours ago
                quality_score: 45,
                error_message: 'Invalid JSON format detected'
            }
        ];
        
        return { datasets };
    }

    /**
     * Generate demo pipelines
     */
    async getPipelines() {
        await this.simulateDelay();
        
        const pipelines = [
            {
                id: 'pipeline_001',
                name: 'Customer Segmentation Pipeline',
                description: 'End-to-end pipeline for customer analysis',
                status: 'running',
                progress: 67,
                created_at: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
                updated_at: new Date(Date.now() - 300000).toISOString(), // 5 min ago
                steps: [
                    { name: 'Data Validation', status: 'completed' },
                    { name: 'Feature Engineering', status: 'running' },
                    { name: 'Model Training', status: 'pending' },
                    { name: 'Evaluation', status: 'pending' }
                ]
            },
            {
                id: 'pipeline_002', 
                name: 'Sales Forecasting Pipeline',
                description: 'Quarterly sales prediction model',
                status: 'completed',
                progress: 100,
                created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
                updated_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                accuracy: 89.2,
                steps: [
                    { name: 'Data Validation', status: 'completed' },
                    { name: 'Feature Engineering', status: 'completed' },
                    { name: 'Model Training', status: 'completed' },
                    { name: 'Evaluation', status: 'completed' }
                ]
            }
        ];
        
        return { pipelines };
    }

    /**
     * Generate demo services data
     */
    async getServices() {
        await this.simulateDelay();
        
        const services = [
            {
                name: 'API Server',
                status: 'running',
                response_time: '23ms',
                requests_per_minute: 150,
                uptime: '99.8%'
            },
            {
                name: 'Model Service',
                status: 'running',
                response_time: '31ms',
                predictions_per_minute: 45,
                uptime: '99.5%'
            },
            {
                name: 'Data Processor',
                status: 'running',
                processing_rate: '1.2GB/min',
                queue_size: 3,
                uptime: '99.9%'
            }
        ];
        
        return { services };
    }

    /**
     * Generate demo alerts
     */
    async getAlerts() {
        await this.simulateDelay();
        
        const alerts = [
            {
                id: 'alert_001',
                title: 'Model Accuracy Drop',
                message: 'Customer prediction model accuracy decreased to 91.2%',
                priority: 'warning',
                timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
                acknowledged: false
            },
            {
                id: 'alert_002',
                title: 'High CPU Usage',
                message: 'System CPU usage exceeded 85% for 10 minutes',
                priority: 'critical',
                timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                acknowledged: true
            }
        ];
        
        return { alerts };
    }

    /**
     * Generate demo processing jobs
     */
    getDemoProcessingJobs() {
        return [
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
    }

    /**
     * Generate demo quality metrics
     */
    getDemoQualityMetrics() {
        return {
            overallScore: 85,
            completeness: 92,
            accuracy: 88,
            consistency: 95,
            validity: 76
        };
    }

    /**
     * Generate demo system status
     */
    async getSystemStatus() {
        await this.simulateDelay();
        
        return {
            overall_health: 'healthy',
            services_running: 4,
            services_total: 4,
            cpu_usage: Math.floor(Math.random() * 40) + 20,
            memory_usage: Math.floor(Math.random() * 40) + 40,
            disk_usage: Math.floor(Math.random() * 30) + 50,
            last_updated: new Date().toISOString()
        };
    }

    /**
     * Check if demo mode is enabled
     */
    isEnabled() {
        return this.isEnabled;
    }

    /**
     * Clear demo data cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Create and export demo data service instance
const demoData = new DemoDataService();

export { DemoDataService, demoData };

// Make demo data available globally for debugging
if (typeof window !== 'undefined') {
    window.demoData = demoData;
}