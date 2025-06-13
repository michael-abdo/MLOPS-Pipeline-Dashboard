/**
 * Update Strategies Module
 * Provides unified update methods using component APIs
 * Replaces legacy direct DOM manipulation
 */

import { Metric, ProgressBar } from '../components/ui-core.js';

class UpdateStrategies {
    constructor() {
        // Queue for updates that arrive before components are ready
        this.updateQueue = [];
        this.componentsReady = false;
        
        // Batch update timeout
        this.batchTimeout = null;
        this.pendingUpdates = {};
    }
    
    /**
     * Mark components as ready and process queued updates
     */
    setComponentsReady() {
        this.componentsReady = true;
        this.processUpdateQueue();
    }
    
    /**
     * Process any queued updates
     */
    processUpdateQueue() {
        while (this.updateQueue.length > 0) {
            const update = this.updateQueue.shift();
            this[update.method].apply(this, update.args);
        }
    }
    
    /**
     * Queue an update if components aren't ready
     */
    queueUpdate(method, ...args) {
        if (!this.componentsReady) {
            this.updateQueue.push({ method, args });
            return true;
        }
        return false;
    }
    
    /**
     * Update Live System Status metrics
     * Replaces direct DOM manipulation in updateCurrentModelDisplay
     */
    updateLiveSystemStatus(data) {
        if (this.queueUpdate('updateLiveSystemStatus', data)) return;
        
        // Model Accuracy
        if (data.accuracy !== undefined) {
            const accuracyPercent = data.accuracy * 100;
            const validationAcc = data.validationAccuracy ? 
                (data.validationAccuracy * 100).toFixed(1) : accuracyPercent.toFixed(1);
            
            Metric.update('liveAccuracy', accuracyPercent, {
                format: 'percent',
                tooltip: `Validation: ${validationAcc}% | F1: ${data.f1Score || 'N/A'}`
            });
        }
        
        // Prediction Rate
        if (data.predictionRate !== undefined || data.predictionsPerMinute !== undefined) {
            const rate = data.predictionRate || data.predictionsPerMinute || 0;
            const total = data.totalPredictions || 0;
            const avgTime = data.avgResponseTime || 'N/A';
            
            Metric.update('livePredictions', rate, {
                format: 'custom',
                suffix: '/min',
                tooltip: `Total: ${total} | Avg response: ${avgTime}ms`
            });
        }
        
        // System Health
        if (data.systemHealth !== undefined || data.health !== undefined) {
            const health = data.systemHealth || data.health;
            let emoji, tooltip;
            
            switch (health) {
                case 'healthy':
                case 'good':
                    emoji = '✅';
                    tooltip = 'All systems operational';
                    break;
                case 'warning':
                    emoji = '⚠️';
                    tooltip = 'Minor issues detected';
                    break;
                case 'error':
                case 'critical':
                    emoji = '❌';
                    tooltip = 'System issues require attention';
                    break;
                default:
                    emoji = '❓';
                    tooltip = 'Status unknown';
            }
            
            Metric.update('systemHealth', emoji, {
                format: 'custom',
                tooltip: tooltip
            });
        }
    }
    
    /**
     * Update model information display
     * Replaces innerHTML manipulation
     */
    updateModelInfo(model) {
        if (this.queueUpdate('updateModelInfo', model)) return;
        
        // Model name - find the element and update safely
        const modelNameEl = document.querySelector('.card strong');
        if (modelNameEl && model.name) {
            // Create a temporary span to preserve structure
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${model.name} v${model.version || '1.0.0'}`;
            modelNameEl.replaceChildren(nameSpan);
        }
        
        // Model description - use structured updates
        const descriptionEl = document.querySelector('.card p');
        if (descriptionEl) {
            this.updateModelDescription(descriptionEl, model);
        }
    }
    
    /**
     * Update model description preserving structure
     */
    updateModelDescription(element, model) {
        // Clear existing content
        element.innerHTML = '';
        
        // Build structured content
        const timeAgo = this.formatTimeAgo(model.created_at);
        
        // Create time span
        const timeSpan = document.createElement('span');
        timeSpan.setAttribute('data-timestamp', model.created_at || '');
        timeSpan.textContent = timeAgo;
        
        // Create prediction count span
        const predCountSpan = document.createElement('span');
        predCountSpan.id = 'modelPredictionCount';
        predCountSpan.textContent = model.predictions_made || 0;
        
        // Add main text
        element.appendChild(document.createTextNode('Last trained '));
        element.appendChild(timeSpan);
        element.appendChild(document.createTextNode(' • '));
        element.appendChild(predCountSpan);
        element.appendChild(document.createTextNode(' predictions made'));
        
        // Add algorithm info if available
        if (model.hyperparameters) {
            const br = document.createElement('br');
            element.appendChild(br);
            
            const small = document.createElement('small');
            small.style.color = 'var(--text-secondary)';
            
            const algorithm = model.hyperparameters?.algorithm || 'Unknown Algorithm';
            const trainingTime = model.training_duration ? 
                `${Math.floor(model.training_duration / 60)}m ${Math.floor(model.training_duration % 60)}s` : 
                'Unknown';
            const samples = model.training_samples || 0;
            
            small.textContent = `${algorithm} • Training time: ${trainingTime} • ${samples} samples`;
            element.appendChild(small);
        }
    }
    
    /**
     * Batch update system metrics
     * Used by WebSocket handlers
     */
    batchUpdateSystemMetrics(updates) {
        if (this.queueUpdate('batchUpdateSystemMetrics', updates)) return;
        
        // Merge with pending updates
        Object.assign(this.pendingUpdates, updates);
        
        // Clear existing timeout
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }
        
        // Set new timeout for batch processing
        this.batchTimeout = setTimeout(() => {
            this.processBatchUpdates();
        }, 50); // 50ms debounce
    }
    
    /**
     * Process batched updates
     */
    processBatchUpdates() {
        const updates = this.pendingUpdates;
        this.pendingUpdates = {};
        
        // CPU, Memory, Disk - already using Metric.update
        if (updates.cpu !== undefined) {
            Metric.update('cpuPercent', updates.cpu, { format: 'percent' });
            ProgressBar.update('cpuProgressBar', updates.cpu, {
                style: updates.cpu > 80 ? 'danger' : updates.cpu > 60 ? 'warning' : 'default'
            });
        }
        
        if (updates.memory !== undefined) {
            Metric.update('memoryPercent', updates.memory, { format: 'percent' });
            ProgressBar.update('memoryProgressBar', updates.memory, {
                style: updates.memory > 80 ? 'danger' : updates.memory > 60 ? 'warning' : 'default'
            });
        }
        
        if (updates.disk !== undefined) {
            Metric.update('diskPercent', updates.disk, { format: 'percent' });
            ProgressBar.update('diskProgressBar', updates.disk, {
                style: updates.disk > 90 ? 'danger' : updates.disk > 70 ? 'warning' : 'default'
            });
        }
        
        // Convert remaining direct DOM updates
        if (updates.activeConnections !== undefined) {
            this.updateTextElement('activeConnections', `${updates.activeConnections} Active`);
        }
        
        if (updates.avgLatency !== undefined) {
            this.updateTextElement('averageLatency', `${Math.round(updates.avgLatency)}ms`);
        }
        
        if (updates.apiResponseTime !== undefined) {
            this.updateTextElement('apiResponseTime', `${Math.round(updates.apiResponseTime)}ms`);
        }
        
        if (updates.wsResponseTime !== undefined) {
            this.updateTextElement('wsResponseTime', `${Math.round(updates.wsResponseTime)}ms`);
        }
        
        // Live System Status updates
        this.updateLiveSystemStatus({
            accuracy: updates.accuracy || updates.modelAccuracy,
            predictionRate: updates.predictionRate || updates.predictionsPerMinute,
            systemHealth: updates.systemHealth || updates.health
        });
    }
    
    /**
     * Safely update text content of an element
     */
    updateTextElement(id, text) {
        const element = document.getElementById(id);
        if (element) {
            // Preserve any child elements, only update text
            const textNode = Array.from(element.childNodes)
                .find(node => node.nodeType === Node.TEXT_NODE);
            
            if (textNode) {
                textNode.textContent = text;
            } else {
                element.textContent = text;
            }
        }
    }
    
    /**
     * Format time ago string
     */
    formatTimeAgo(dateString) {
        if (!dateString) return 'Unknown';
        
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
}

// Export singleton instance
export const updateStrategies = new UpdateStrategies();