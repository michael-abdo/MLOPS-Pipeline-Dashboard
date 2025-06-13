/**
 * Demo Data Service
 * Provides realistic demo data for development and demonstration purposes
 */

import { CONFIG } from './config.js';

class DemoDataService {
    constructor() {
        this.cache = new Map();
        this.isEnabled = CONFIG.DEMO.ENABLED;
        
        // Real-time simulation state
        this.simulationStartTime = Date.now();
        this.baselineAccuracy = 94.2;
        this.baselinePredictionRate = 23;
        this.totalPredictions = 15847;
        this.lastPredictionTime = Date.now();
        
        // Trend simulation
        this.accuracyTrend = this.generateTrendData();
        this.predictionRateTrend = this.generateTrendData();
        
        // Start real-time simulation if in demo mode
        if (this.isEnabled) {
            this.startRealTimeSimulation();
        }
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
     * Generate realistic trend data for simulation
     */
    generateTrendData() {
        const points = 20; // 20 data points for trend calculation
        const trendData = [];
        
        for (let i = 0; i < points; i++) {
            // Generate natural-looking variations
            const variation = (Math.sin(i * 0.3) + Math.random() * 0.4 - 0.2) * 0.02;
            trendData.push(1 + variation); // Base 1.0 with small variations
        }
        
        return trendData;
    }

    /**
     * Get current time-based variation factor
     */
    getTimeBasedVariation(seed = 1) {
        const elapsed = (Date.now() - this.simulationStartTime) / 1000; // seconds
        
        // Combine multiple sine waves for realistic variation
        const slowWave = Math.sin(elapsed * 0.01 * seed) * 0.015; // Very slow drift
        const mediumWave = Math.sin(elapsed * 0.05 * seed) * 0.008; // Medium fluctuation
        const fastWave = Math.sin(elapsed * 0.2 * seed) * 0.003; // Fast minor changes
        const randomNoise = (Math.random() - 0.5) * 0.002; // Small random component
        
        return slowWave + mediumWave + fastWave + randomNoise;
    }

    /**
     * Get real-time model accuracy with natural variations
     */
    getCurrentModelAccuracy() {
        const variation = this.getTimeBasedVariation(1.2);
        const currentAccuracy = this.baselineAccuracy * (1 + variation);
        
        // Ensure accuracy stays within realistic bounds (85-98%)
        return Math.max(85, Math.min(98, currentAccuracy));
    }

    /**
     * Get real-time prediction rate with fluctuations
     */
    getCurrentPredictionRate() {
        const variation = this.getTimeBasedVariation(0.8);
        const currentRate = this.baselinePredictionRate * (1 + variation);
        
        // Ensure rate stays within realistic bounds (5-100 per minute)
        return Math.max(5, Math.min(100, currentRate));
    }

    /**
     * Get real-time model metrics for live updates
     */
    getRealTimeModelMetrics() {
        const now = Date.now();
        const accuracy = this.getCurrentModelAccuracy();
        const predictionRate = this.getCurrentPredictionRate();
        
        // Calculate predictions since last call
        const timeSinceLastPrediction = (now - this.lastPredictionTime) / 1000 / 60; // minutes
        const newPredictions = Math.floor(predictionRate * timeSinceLastPrediction);
        
        if (newPredictions > 0) {
            this.totalPredictions += newPredictions;
            this.lastPredictionTime = now;
        }

        // Calculate response time with variations
        const baseResponseTime = 25;
        const responseTimeVariation = this.getTimeBasedVariation(1.5);
        const avgResponseTime = Math.max(10, Math.min(100, 
            baseResponseTime * (1 + responseTimeVariation * 2)
        ));

        return {
            model_id: 'model_001',
            model_name: 'Customer Prediction Model',
            accuracy: accuracy / 100, // Convert to decimal
            current_accuracy: accuracy,
            prediction_rate: Math.round(predictionRate),
            predictions_per_minute: Math.round(predictionRate),
            total_predictions: this.totalPredictions,
            avg_response_time: Math.round(avgResponseTime),
            p95_response_time: Math.round(avgResponseTime * 1.8),
            f1_score: (accuracy - 2) / 100, // Slightly lower than accuracy
            validation_accuracy: (accuracy - 1.5) / 100,
            timestamp: now,
            is_live: true,
            overall_health: accuracy > 90 ? 'healthy' : accuracy > 85 ? 'warning' : 'critical'
        };
    }

    /**
     * Get real-time system metrics with variations
     */
    getRealTimeSystemMetrics() {
        const now = Date.now();
        
        // CPU usage with realistic patterns (higher during training)
        const cpuBase = 35;
        const cpuVariation = this.getTimeBasedVariation(2.1);
        const cpuUsage = Math.max(15, Math.min(85, cpuBase * (1 + cpuVariation * 1.5)));
        
        // Memory usage with gradual increases
        const memoryBase = 65;
        const memoryVariation = this.getTimeBasedVariation(0.5);
        const memoryUsage = Math.max(40, Math.min(90, memoryBase * (1 + memoryVariation * 0.8)));
        
        // Network activity based on prediction rate
        const predictionRate = this.getCurrentPredictionRate();
        const networkActivity = Math.round(predictionRate * 0.8); // Correlated with predictions
        
        return {
            cpu_usage: Math.round(cpuUsage),
            memory_usage: Math.round(memoryUsage),
            disk_usage: Math.round(50 + Math.sin(Date.now() / 100000) * 5), // Slow disk changes
            network_activity: networkActivity,
            active_connections: Math.max(1, Math.round(predictionRate * 0.6)),
            api_response_time: Math.round(20 + Math.random() * 30),
            ws_latency: Math.round(8 + Math.random() * 15),
            timestamp: now,
            overall_health: cpuUsage < 70 && memoryUsage < 80 ? 'healthy' : 
                           cpuUsage < 85 && memoryUsage < 90 ? 'warning' : 'critical'
        };
    }

    /**
     * Start real-time simulation with periodic updates
     */
    startRealTimeSimulation() {
        // Update internal state every 2 seconds
        this.simulationInterval = setInterval(() => {
            // Update trend data occasionally
            if (Math.random() < 0.1) { // 10% chance every 2 seconds
                this.accuracyTrend.push(1 + (Math.random() - 0.5) * 0.04);
                this.predictionRateTrend.push(1 + (Math.random() - 0.5) * 0.06);
                
                // Keep only recent trend data
                if (this.accuracyTrend.length > 20) {
                    this.accuracyTrend.shift();
                    this.predictionRateTrend.shift();
                }
            }
            
            // Randomly adjust baseline values slightly for long-term trends
            if (Math.random() < 0.05) { // 5% chance every 2 seconds
                this.baselineAccuracy += (Math.random() - 0.5) * 0.2;
                this.baselineAccuracy = Math.max(88, Math.min(96, this.baselineAccuracy));
                
                this.baselinePredictionRate += (Math.random() - 0.5) * 1;
                this.baselinePredictionRate = Math.max(15, Math.min(35, this.baselinePredictionRate));
            }
        }, 2000);
    }

    /**
     * Stop real-time simulation
     */
    stopRealTimeSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
    }

    /**
     * Generate a realistic prediction logged event
     */
    generatePredictionLoggedEvent() {
        const now = Date.now();
        const confidence = 0.7 + Math.random() * 0.25; // 70-95% confidence
        const predictionValue = Math.random() > 0.7 ? 'high_value' : 'standard'; // 30% high value
        
        this.totalPredictions++;
        
        return {
            prediction_id: `pred_${now}_${Math.random().toString(36).substr(2, 6)}`,
            model_id: 'model_001',
            model_name: 'Customer Prediction Model',
            prediction_value: predictionValue,
            confidence: confidence,
            response_time: Math.round(20 + Math.random() * 40), // 20-60ms
            input_features: 12,
            timestamp: now,
            updated_metrics: {
                total_predictions: this.totalPredictions,
                current_accuracy: this.getCurrentModelAccuracy(),
                prediction_rate: this.getCurrentPredictionRate()
            }
        };
    }

    /**
     * Generate realistic model status change event
     */
    generateModelStatusChangeEvent() {
        const statuses = ['healthy', 'warning', 'training', 'deploying'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        return {
            model_id: 'model_001',
            model_name: 'Customer Prediction Model',
            old_status: 'healthy',
            new_status: randomStatus,
            status: randomStatus,
            model_status: randomStatus,
            accuracy: this.getCurrentModelAccuracy() / 100,
            deployment_timestamp: Date.now(),
            health_score: Math.random() * 0.3 + 0.7, // 70-100%
            timestamp: Date.now()
        };
    }

    /**
     * Enhanced getModels with real-time data
     */
    async getModelsWithRealTimeData() {
        await this.simulateDelay();
        
        const realTimeMetrics = this.getRealTimeModelMetrics();
        const models = await this.getModels();
        
        // Update the first model with real-time data
        if (models.length > 0) {
            models[0] = {
                ...models[0],
                accuracy: realTimeMetrics.current_accuracy,
                predictions_made: realTimeMetrics.total_predictions,
                avg_response_time: realTimeMetrics.avg_response_time,
                predictions_per_minute: realTimeMetrics.prediction_rate,
                status: realTimeMetrics.overall_health === 'healthy' ? 'active' : 'warning',
                is_active: true,
                validation_metrics: {
                    validation_accuracy: realTimeMetrics.validation_accuracy,
                    f1_score: realTimeMetrics.f1_score,
                    precision: realTimeMetrics.f1_score * 1.02,
                    recall: realTimeMetrics.f1_score * 0.98
                }
            };
        }
        
        return models;
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