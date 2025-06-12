/**
 * State Integration Helper
 * Provides easy integration of state management into page controllers
 */

import { getGlobalState, getStateAwareAPI, initializeStateManagement } from './state.js';
import { API } from './api.js';

/**
 * Enhanced Base Page Controller with State Management
 */
class StatefulPageController {
    constructor() {
        this.state = getGlobalState();
        this.stateAPI = this.initializeStateAPI();
        this.subscriptions = new Set();
    }

    /**
     * Initialize state-aware API
     */
    initializeStateAPI() {
        let api = getStateAwareAPI();
        if (!api) {
            api = initializeStateManagement(API);
        }
        return api;
    }

    /**
     * Subscribe to state changes with automatic cleanup
     */
    subscribeToState(key, callback) {
        const unsubscribe = this.state.subscribe(key, callback);
        this.subscriptions.add(unsubscribe);
        return unsubscribe;
    }

    /**
     * Set state value
     */
    setState(key, value, options = {}) {
        this.state.set(key, value, options);
        return this;
    }

    /**
     * Get state value
     */
    getState(key, defaultValue = null) {
        return this.state.get(key, defaultValue);
    }

    /**
     * Check if state has key
     */
    hasState(key) {
        return this.state.has(key);
    }

    /**
     * Load data with caching
     */
    async loadCachedData(dataType, options = {}) {
        try {
            switch (dataType) {
                case 'datasets':
                    return await this.stateAPI.getDatasets(options);
                case 'models':
                    return await this.stateAPI.getModels(options);
                case 'pipelines':
                    return await this.stateAPI.getPipelines(options);
                case 'monitoring':
                    return await this.stateAPI.getMonitoringMetrics(options);
                case 'services':
                    return await this.stateAPI.getServices(options);
                case 'alerts':
                    return await this.stateAPI.getAlerts(options);
                default:
                    throw new Error(`Unknown data type: ${dataType}`);
            }
        } catch (error) {
            console.error(`Failed to load ${dataType}:`, error);
            throw error;
        }
    }

    /**
     * Invalidate specific data cache
     */
    invalidateCache(dataType) {
        this.stateAPI.invalidateCache(dataType);
    }

    /**
     * Clear all cache
     */
    clearAllCache() {
        this.stateAPI.clearCache();
    }

    /**
     * Get state store statistics
     */
    getStateStats() {
        return this.state.getStats();
    }

    /**
     * Clean up state subscriptions
     */
    cleanupState() {
        // Unsubscribe from all state subscriptions
        this.subscriptions.forEach(unsubscribe => {
            try {
                unsubscribe();
            } catch (error) {
                console.warn('Failed to unsubscribe from state:', error);
            }
        });
        this.subscriptions.clear();
        
        console.log(`${this.constructor.name}: State cleanup completed`);
    }
}

/**
 * State synchronization helpers
 */
class StateSyncHelper {
    static synchronizeDatasets(sourceController, targetControllers = []) {
        return sourceController.subscribeToState('datasets', (datasets) => {
            targetControllers.forEach(controller => {
                if (controller.updateDatasets) {
                    controller.updateDatasets(datasets);
                }
            });
        });
    }

    static synchronizePipelines(sourceController, targetControllers = []) {
        return sourceController.subscribeToState('pipelines', (pipelines) => {
            targetControllers.forEach(controller => {
                if (controller.updatePipelines) {
                    controller.updatePipelines(pipelines);
                }
            });
        });
    }

    static synchronizeSystemMetrics(sourceController, targetControllers = []) {
        return sourceController.subscribeToState('system_metrics', (metrics) => {
            targetControllers.forEach(controller => {
                if (controller.updateSystemMetrics) {
                    controller.updateSystemMetrics(metrics);
                }
            });
        });
    }

    static synchronizeAll(controllers = []) {
        const subscriptions = [];
        
        // Cross-synchronize datasets
        controllers.forEach(source => {
            const others = controllers.filter(c => c !== source);
            subscriptions.push(this.synchronizeDatasets(source, others));
            subscriptions.push(this.synchronizePipelines(source, others));
            subscriptions.push(this.synchronizeSystemMetrics(source, others));
        });
        
        return subscriptions;
    }
}

/**
 * State persistence helper
 */
class StatePersistence {
    static saveToLocalStorage(key, value) {
        try {
            localStorage.setItem(`mlops_state_${key}`, JSON.stringify(value));
        } catch (error) {
            console.warn(`Failed to save ${key} to localStorage:`, error);
        }
    }

    static loadFromLocalStorage(key, defaultValue = null) {
        try {
            const stored = localStorage.getItem(`mlops_state_${key}`);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (error) {
            console.warn(`Failed to load ${key} from localStorage:`, error);
            return defaultValue;
        }
    }

    static clearLocalStorage(key = null) {
        try {
            if (key) {
                localStorage.removeItem(`mlops_state_${key}`);
            } else {
                // Clear all MLOps state
                Object.keys(localStorage).forEach(storageKey => {
                    if (storageKey.startsWith('mlops_state_')) {
                        localStorage.removeItem(storageKey);
                    }
                });
            }
        } catch (error) {
            console.warn('Failed to clear localStorage:', error);
        }
    }
}

/**
 * Create state-aware controller factory
 */
function createStatefulController(BaseController) {
    return class extends BaseController {
        constructor(...args) {
            super(...args);
            
            // Mix in state functionality
            const stateController = new StatefulPageController();
            Object.assign(this, stateController);
            
            // Override destroy to include state cleanup
            const originalDestroy = this.destroy?.bind(this) || (() => {});
            this.destroy = () => {
                this.cleanupState();
                originalDestroy();
            };
        }
    };
}

export { 
    StatefulPageController, 
    StateSyncHelper, 
    StatePersistence,
    createStatefulController
};