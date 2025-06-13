/**
 * Model Display Component
 * Handles structured display of model information
 * Replaces legacy innerHTML manipulation
 */

import { updateStrategies } from '../common/update-strategies.js';

export class ModelDisplay {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.modelData = null;
        
        // Element references
        this.elements = {
            name: null,
            description: null,
            status: null,
            metrics: null
        };
        
        this.initialize();
    }
    
    /**
     * Initialize the component structure
     */
    initialize() {
        if (!this.container) {
            console.warn('ModelDisplay: Container not found');
            return;
        }
        
        // Find existing elements or create structure
        this.elements.name = this.container.querySelector('.model-name') || 
                            this.container.querySelector('strong');
        this.elements.description = this.container.querySelector('.model-description') || 
                                   this.container.querySelector('p');
        this.elements.status = this.container.querySelector('.model-status');
        this.elements.metrics = this.container.querySelector('.model-metrics');
    }
    
    /**
     * Update complete model display
     */
    update(model) {
        if (!model) return;
        
        this.modelData = model;
        
        this.updateName(model.name, model.version);
        this.updateDescription(model);
        this.updateStatus(model.status);
        this.updateMetrics(model);
    }
    
    /**
     * Update model name preserving structure
     */
    updateName(name, version) {
        if (!this.elements.name || !name) return;
        
        // Create structured name display
        const nameText = `${name} v${version || '1.0.0'}`;
        
        // Preserve any icons or badges
        const existingIcons = Array.from(this.elements.name.children)
            .filter(child => child.tagName !== 'SPAN' || child.classList.contains('icon'));
        
        // Clear and rebuild
        this.elements.name.textContent = nameText;
        
        // Re-add preserved elements
        existingIcons.forEach(icon => this.elements.name.appendChild(icon));
    }
    
    /**
     * Update model description with structured content
     */
    updateDescription(model) {
        if (!this.elements.description) return;
        
        // Delegate to update strategies for consistent formatting
        updateStrategies.updateModelDescription(this.elements.description, model);
    }
    
    /**
     * Update model status badge
     */
    updateStatus(status) {
        if (!status) return;
        
        // Find or create status element
        let statusEl = this.elements.status;
        if (!statusEl) {
            statusEl = this.container.querySelector('.badge') || 
                      this.container.querySelector('[id*="status"]');
        }
        
        if (statusEl) {
            // Update text
            statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            
            // Update styling
            statusEl.className = `badge badge-${this.getStatusClass(status)}`;
        }
    }
    
    /**
     * Update model metrics display
     */
    updateMetrics(model) {
        // Update Live System Status metrics
        updateStrategies.updateLiveSystemStatus({
            accuracy: model.accuracy,
            validationAccuracy: model.validation_metrics?.validation_accuracy,
            f1Score: model.validation_metrics?.f1_score,
            predictionRate: this.calculatePredictionRate(model),
            totalPredictions: model.predictions_made,
            avgResponseTime: model.avg_response_time
        });
    }
    
    /**
     * Calculate prediction rate from model data
     */
    calculatePredictionRate(model) {
        if (!model.predictions_made || model.predictions_made === 0) {
            return 0;
        }
        
        if (model.prediction_rate !== undefined) {
            return model.prediction_rate;
        }
        
        // Calculate based on model age
        if (model.created_at) {
            const hoursSinceCreated = (Date.now() - new Date(model.created_at).getTime()) / (1000 * 60 * 60);
            return Math.max(1, Math.round(model.predictions_made / hoursSinceCreated / 60));
        }
        
        return 0;
    }
    
    /**
     * Get status class for styling
     */
    getStatusClass(status) {
        switch (status) {
            case 'active':
            case 'deployed':
                return 'success';
            case 'training':
            case 'pending':
                return 'warning';
            case 'failed':
            case 'error':
                return 'danger';
            default:
                return 'secondary';
        }
    }
    
    /**
     * Static helper to update model displays
     */
    static updateAll(model) {
        // Update main model display
        const mainDisplay = document.querySelector('.card');
        if (mainDisplay) {
            // Use update strategies for consistent updates
            updateStrategies.updateModelInfo(model);
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
    
    /**
     * Handle demo mode display
     */
    static showDemoModel(demoModel) {
        // Add demo indicator
        const nameEl = document.querySelector('.card strong');
        if (nameEl && !nameEl.querySelector('.demo-badge')) {
            const demoBadge = document.createElement('span');
            demoBadge.className = 'badge badge-info demo-badge';
            demoBadge.textContent = 'DEMO';
            demoBadge.style.marginLeft = '8px';
            demoBadge.style.fontSize = '0.75em';
            nameEl.appendChild(demoBadge);
        }
        
        // Update with demo data
        ModelDisplay.updateAll(demoModel);
    }
}

// Export static methods for easy access
export const updateModelDisplay = ModelDisplay.updateAll;
export const showDemoModel = ModelDisplay.showDemoModel;