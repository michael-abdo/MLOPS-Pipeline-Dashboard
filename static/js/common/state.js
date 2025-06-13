/**
 * Centralized State Management System
 * Provides unified state management across all page controllers
 */

class StateStore {
    constructor() {
        this.state = new Map();
        this.subscribers = new Map();
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.defaultCacheTTL = 30000; // 30 seconds default cache
    }

    /**
     * Set a value in the state store
     */
    set(key, value, options = {}) {
        const { persist = false, notify = true } = options;
        
        this.state.set(key, value);
        
        // Optionally cache with TTL
        if (options.cache) {
            const ttl = options.cacheTTL || this.defaultCacheTTL;
            this.cache.set(key, value);
            this.cacheExpiry.set(key, Date.now() + ttl);
        }
        
        // Notify subscribers
        if (notify && this.subscribers.has(key)) {
            this.subscribers.get(key).forEach(callback => {
                try {
                    callback(value, key);
                } catch (error) {
                    console.warn(`State subscriber error for ${key}:`, error);
                }
            });
        }
        
        return this;
    }

    /**
     * Get a value from the state store
     */
    get(key, defaultValue = null) {
        // Check cache first
        if (this.cache.has(key)) {
            const expiry = this.cacheExpiry.get(key);
            if (Date.now() < expiry) {
                return this.cache.get(key);
            } else {
                // Cache expired, remove it
                this.cache.delete(key);
                this.cacheExpiry.delete(key);
            }
        }
        
        return this.state.has(key) ? this.state.get(key) : defaultValue;
    }

    /**
     * Subscribe to state changes for a key
     */
    subscribe(key, callback) {
        if (!this.subscribers.has(key)) {
            this.subscribers.set(key, new Set());
        }
        this.subscribers.get(key).add(callback);
        
        // Return unsubscribe function
        return () => {
            if (this.subscribers.has(key)) {
                this.subscribers.get(key).delete(callback);
                if (this.subscribers.get(key).size === 0) {
                    this.subscribers.delete(key);
                }
            }
        };
    }

    /**
     * Check if a key exists in the store
     */
    has(key) {
        return this.state.has(key) || this.cache.has(key);
    }

    /**
     * Remove a key from the store
     */
    delete(key) {
        this.state.delete(key);
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
        
        // Notify subscribers of deletion
        if (this.subscribers.has(key)) {
            this.subscribers.get(key).forEach(callback => {
                try {
                    callback(null, key);
                } catch (error) {
                    console.warn(`State subscriber error for ${key} deletion:`, error);
                }
            });
        }
        
        return this;
    }

    /**
     * Clear all state
     */
    clear() {
        this.state.clear();
        this.cache.clear();
        this.cacheExpiry.clear();
        
        return this;
    }

    /**
     * Get all keys
     */
    keys() {
        return Array.from(this.state.keys());
    }

    /**
     * Get store statistics
     */
    getStats() {
        return {
            stateSize: this.state.size,
            cacheSize: this.cache.size,
            subscriberCount: Array.from(this.subscribers.values())
                .reduce((total, set) => total + set.size, 0)
        };
    }
}

/**
 * API Cache Manager
 * Prevents duplicate API calls by caching responses
 */
class APICache {
    constructor(stateStore) {
        this.store = stateStore;
        this.pendingRequests = new Map();
    }

    /**
     * Get cached data or fetch from API
     */
    async getCachedOrFetch(key, fetchFunction, options = {}) {
        const { cacheTTL = 30000, forceRefresh = false } = options;
        
        // Check if data is already cached and valid
        if (!forceRefresh && this.store.has(key)) {
            const cached = this.store.get(key);
            if (cached && cached.timestamp && (Date.now() - cached.timestamp) < cacheTTL) {
                return cached.data;
            }
        }
        
        // Check if request is already pending
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }
        
        // Create new request promise
        const requestPromise = this.executeRequest(key, fetchFunction, cacheTTL);
        this.pendingRequests.set(key, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            this.pendingRequests.delete(key);
        }
    }

    async executeRequest(key, fetchFunction, cacheTTL) {
        try {
            const data = await fetchFunction();
            
            // Cache the result
            this.store.set(key, {
                data,
                timestamp: Date.now()
            }, { cache: true, cacheTTL });
            
            return data;
        } catch (error) {
            console.error(`API request failed for ${key}:`, error);
            throw error;
        }
    }

    /**
     * Invalidate cache for a specific key
     */
    invalidate(key) {
        this.store.delete(key);
        if (this.pendingRequests.has(key)) {
            this.pendingRequests.delete(key);
        }
    }

    /**
     * Clear all cached API data
     */
    clearAll() {
        // Clear only API-related keys (those with timestamp structure)
        for (const key of this.store.keys()) {
            const value = this.store.get(key);
            if (value && typeof value === 'object' && value.timestamp) {
                this.store.delete(key);
            }
        }
        this.pendingRequests.clear();
    }
}

/**
 * State-aware API wrapper
 * Provides caching and state management for API calls
 */
class StateAwareAPI {
    constructor(apiInstance, stateStore) {
        this.api = apiInstance;
        this.store = stateStore;
        this.cache = new APICache(stateStore);
    }

    /**
     * Get datasets with caching
     */
    async getDatasets(options = {}) {
        return this.cache.getCachedOrFetch(
            'api:datasets',
            () => this.api.getDatasets(),
            { cacheTTL: 60000, ...options }
        );
    }

    /**
     * Get models with caching
     */
    async getModels(options = {}) {
        return this.cache.getCachedOrFetch(
            'api:models',
            () => this.api.getModels(),
            { cacheTTL: 30000, ...options }
        );
    }

    /**
     * Get pipelines with caching
     */
    async getPipelines(options = {}) {
        return this.cache.getCachedOrFetch(
            'api:pipelines', 
            () => this.api.getPipelines(),
            { cacheTTL: 30000, ...options }
        );
    }

    /**
     * Get monitoring metrics with caching
     */
    async getMonitoringMetrics(options = {}) {
        return this.cache.getCachedOrFetch(
            'api:monitoring_metrics',
            () => this.api.getMonitoringMetrics(),
            { cacheTTL: 10000, ...options } // Shorter cache for metrics
        );
    }

    /**
     * Get system services with caching
     */
    async getServices(options = {}) {
        return this.cache.getCachedOrFetch(
            'api:services',
            () => this.api.getServices(),
            { cacheTTL: 15000, ...options }
        );
    }

    /**
     * Get alerts with caching
     */
    async getAlerts(options = {}) {
        return this.cache.getCachedOrFetch(
            'api:alerts',
            () => this.api.getAlerts(),
            { cacheTTL: 20000, ...options }
        );
    }

    /**
     * Upload dataset - invalidate datasets cache
     */
    async uploadDataset(file, progressCallback) {
        const result = await this.api.uploadDataset(file, progressCallback);
        
        // Invalidate datasets cache since we added a new one
        this.cache.invalidate('api:datasets');
        
        return result;
    }

    /**
     * Create pipeline - invalidate pipelines cache
     */
    async createPipeline(pipelineData) {
        const result = await this.api.createPipeline(pipelineData);
        
        // Invalidate pipelines cache since we added a new one
        this.cache.invalidate('api:pipelines');
        
        return result;
    }

    /**
     * Invalidate specific cache
     */
    invalidateCache(key) {
        this.cache.invalidate(`api:${key}`);
    }

    /**
     * Clear all API cache
     */
    clearCache() {
        this.cache.clearAll();
    }
}

// Create global state store instance
const globalState = new StateStore();

// Create and export the state-aware API
let stateAwareAPI = null;

/**
 * Initialize state management with API instance
 */
function initializeStateManagement(apiInstance) {
    stateAwareAPI = new StateAwareAPI(apiInstance, globalState);
    
    // Store API reference globally for debugging
    if (typeof window !== 'undefined') {
        window.globalState = globalState;
        window.stateAwareAPI = stateAwareAPI;
    }
    
    return stateAwareAPI;
}

/**
 * Get the global state store
 */
function getGlobalState() {
    return globalState;
}

/**
 * Get the state-aware API instance
 */
function getStateAwareAPI() {
    return stateAwareAPI;
}

export { 
    StateStore, 
    APICache, 
    StateAwareAPI, 
    globalState as state,
    initializeStateManagement,
    getGlobalState,
    getStateAwareAPI
};