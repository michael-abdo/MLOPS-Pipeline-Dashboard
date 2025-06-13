/**
 * System Metrics Component
 * Centralizes all system metrics updates
 * Ensures consistent use of component APIs
 */

import { Metric, ProgressBar } from './ui-core.js';
import { updateStrategies } from '../common/update-strategies.js';

class SystemMetrics {
    constructor() {
        // Track metric state for animations
        this.previousValues = {};
        
        // Animation thresholds
        this.animationThresholds = {
            accuracy: 0.1,      // 0.1% change triggers animation
            predictions: 5,     // 5 predictions/min change
            cpu: 5,            // 5% change
            memory: 5,         // 5% change
            disk: 2            // 2% change
        };
        
        // Health status mappings
        this.healthStatusMap = {
            'healthy': { emoji: '✅', text: 'All systems operational', class: 'good' },
            'good': { emoji: '✅', text: 'All systems operational', class: 'good' },
            'warning': { emoji: '⚠️', text: 'Minor issues detected', class: 'warning' },
            'degraded': { emoji: '⚠️', text: 'Performance degraded', class: 'warning' },
            'error': { emoji: '❌', text: 'System issues require attention', class: 'error' },
            'critical': { emoji: '❌', text: 'Critical system failure', class: 'error' },
            'unknown': { emoji: '❓', text: 'Status unknown', class: 'unknown' }
        };
    }
    
    /**
     * Update all system metrics from WebSocket data
     * This is the main entry point for WebSocket handlers
     */
    updateFromWebSocket(data) {
        // Delegate to update strategies for batch processing
        updateStrategies.batchUpdateSystemMetrics({
            // Resource metrics
            cpu: data.cpu_percent,
            memory: data.memory_percent,
            disk: data.disk_percent,
            
            // Connection metrics
            activeConnections: data.active_connections,
            avgLatency: data.avg_latency_ms,
            apiResponseTime: data.api_response_time_ms,
            wsResponseTime: data.ws_response_time_ms,
            
            // Model metrics
            accuracy: data.current_accuracy || data.model_accuracy,
            predictionRate: data.predictions_per_minute || data.prediction_rate,
            
            // System health
            systemHealth: data.system_health || data.overall_health,
            
            // Additional metrics
            totalModels: data.total_models,
            activeJobs: data.active_training_jobs
        });
    }
    
    /**
     * Update Live System Status cards specifically
     * Used when model data changes
     */
    updateLiveSystemStatus(accuracy, predictionRate, health) {
        // Model Accuracy with animation
        if (accuracy !== undefined) {
            this.updateMetricWithAnimation('liveAccuracy', accuracy * 100, {
                format: 'percent',
                threshold: this.animationThresholds.accuracy
            });
        }
        
        // Prediction Rate with trend
        if (predictionRate !== undefined) {
            this.updatePredictionRate(predictionRate);
        }
        
        // System Health
        if (health !== undefined) {
            this.updateSystemHealth(health);
        }
    }
    
    /**
     * Update metric with animation if change is significant
     */
    updateMetricWithAnimation(metricId, newValue, options = {}) {
        const element = document.getElementById(metricId);
        if (!element) return;
        
        // Get previous value
        const previousValue = this.previousValues[metricId] || 0;
        const threshold = options.threshold || 0;
        
        // Check if change is significant
        if (Math.abs(newValue - previousValue) > threshold) {
            // Add animation
            element.style.transition = 'all 0.3s ease';
            element.style.transform = 'scale(1.05)';
            
            // Update using Metric API
            Metric.update(metricId, newValue, options);
            
            // Remove animation after delay
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 300);
        } else {
            // Update without animation
            Metric.update(metricId, newValue, options);
        }
        
        // Store new value
        this.previousValues[metricId] = newValue;
    }
    
    /**
     * Update prediction rate with trend indicator
     */
    updatePredictionRate(rate) {
        const element = document.getElementById('livePredictions');
        if (!element) return;
        
        const previousRate = this.previousValues['livePredictions'] || 0;
        const roundedRate = Math.round(rate);
        
        // Determine trend
        let trend = '→';  // neutral
        let trendClass = 'stable';
        
        if (roundedRate > previousRate + this.animationThresholds.predictions) {
            trend = '↗';
            trendClass = 'increasing';
        } else if (roundedRate < previousRate - this.animationThresholds.predictions) {
            trend = '↘';
            trendClass = 'decreasing';
        }
        
        // Store previous rate for tracking
        element.setAttribute('data-previous-rate', previousRate);
        element.setAttribute('data-last-update', Date.now());
        
        // Build rate display with trend
        const rateDisplay = `${roundedRate}/min <span style="color: var(--text-secondary); opacity: 0.7;">${trend}</span>`;
        
        // Update with animation if significant change
        if (Math.abs(roundedRate - previousRate) > this.animationThresholds.predictions) {
            element.style.transition = 'transform 0.2s ease';
            element.style.transform = 'scale(1.1)';
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 200);
        }
        
        // Update using component structure
        const valueDiv = element.querySelector('.metric-value') || element;
        valueDiv.innerHTML = rateDisplay;
        valueDiv.className = `metric-value ${trendClass}`;
        
        // Update tooltip
        const totalPredictions = element.getAttribute('data-total-predictions') || 'N/A';
        const avgResponse = element.getAttribute('data-avg-response') || 'N/A';
        element.title = `Total: ${totalPredictions} | Avg response: ${avgResponse}ms`;
        
        // Add health indicator
        if (roundedRate === 0) {
            valueDiv.innerHTML += ' <span style="font-size: 0.8em; opacity: 0.8;">💤</span>';
        } else if (roundedRate > 100) {
            valueDiv.innerHTML += ' <span style="font-size: 0.8em; opacity: 0.8;">🔥</span>';
        } else if (roundedRate > 50) {
            valueDiv.innerHTML += ' <span style="font-size: 0.8em; opacity: 0.8;">❤️</span>';
        }
        
        this.previousValues['livePredictions'] = roundedRate;
    }
    
    /**
     * Update system health indicator
     */
    updateSystemHealth(health) {
        const status = this.healthStatusMap[health] || this.healthStatusMap['unknown'];
        
        // Update metric
        Metric.update('systemHealth', status.emoji, {
            format: 'custom',
            tooltip: status.text
        });
        
        // Update system status indicator if it exists
        const statusIndicator = document.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator status-${status.class}`;
            
            const statusText = statusIndicator.querySelector('span') || 
                             document.getElementById('systemStatusText');
            if (statusText) {
                statusText.textContent = status.text;
            }
        }
    }
    
    /**
     * Update performance metrics
     */
    updatePerformanceMetrics(metrics) {
        // Training Duration
        if (metrics.trainingDuration !== undefined) {
            updateStrategies.updateTextElement('trainingDuration', 
                this.formatDuration(metrics.trainingDuration));
        }
        
        // Response Time
        if (metrics.avgResponseTime !== undefined) {
            updateStrategies.updateTextElement('avgResponseTime', 
                `${Math.round(metrics.avgResponseTime)}ms`);
        }
        
        // API Calls
        if (metrics.apiCallsToday !== undefined) {
            updateStrategies.updateTextElement('apiCallsToday', 
                metrics.apiCallsToday.toLocaleString());
        }
        
        // Total Predictions
        if (metrics.totalPredictions !== undefined) {
            updateStrategies.updateTextElement('totalPredictions', 
                metrics.totalPredictions.toLocaleString());
            
            // Also update in model description
            const predCountEl = document.getElementById('modelPredictionCount');
            if (predCountEl) {
                predCountEl.textContent = metrics.totalPredictions.toLocaleString();
            }
        }
    }
    
    /**
     * Format duration in human-readable format
     */
    formatDuration(seconds) {
        if (!seconds || seconds === 0) return 'N/A';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
    
    /**
     * Handle prediction logged event
     */
    handlePredictionLogged(data) {
        // Increment prediction counter with animation
        const predCountEl = document.getElementById('modelPredictionCount');
        if (predCountEl) {
            const currentCount = parseInt(predCountEl.textContent.replace(/,/g, '')) || 0;
            const newCount = currentCount + 1;
            
            // Animate counter
            predCountEl.style.transition = 'transform 0.2s ease';
            predCountEl.style.transform = 'scale(1.2)';
            predCountEl.textContent = newCount.toLocaleString();
            
            setTimeout(() => {
                predCountEl.style.transform = 'scale(1)';
            }, 200);
        }
        
        // Update Live System Status if metrics provided
        if (data.updated_metrics) {
            this.updateLiveSystemStatus(
                data.updated_metrics.accuracy,
                data.updated_metrics.predictions_per_minute,
                data.updated_metrics.health
            );
        }
    }
}

// Export singleton instance
export const systemMetrics = new SystemMetrics();

// Export convenience functions
export const updateSystemMetrics = (data) => systemMetrics.updateFromWebSocket(data);
export const updateLiveSystemStatus = (accuracy, rate, health) => 
    systemMetrics.updateLiveSystemStatus(accuracy, rate, health);
export const handlePredictionLogged = (data) => systemMetrics.handlePredictionLogged(data);