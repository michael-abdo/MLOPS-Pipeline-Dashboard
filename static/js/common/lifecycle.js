/**
 * Component Lifecycle Management System
 * Provides memory management and cleanup capabilities for page controllers
 */

import { wsManager } from './websocket.js';

class LifecycleManager {
    constructor() {
        this.eventListeners = new Map();
        this.timers = new Set();
        this.webSocketHandlers = new Map();
        this.cleanupCallbacks = new Set();
    }

    /**
     * Register an event listener for cleanup
     */
    addEventListener(element, event, handler, options = {}) {
        const key = `${element.id || 'element'}-${event}`;
        
        // Store the listener for cleanup
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }
        this.eventListeners.get(key).push({
            element,
            event,
            handler,
            options
        });

        // Add the actual event listener
        element.addEventListener(event, handler, options);
        
        return this;
    }

    /**
     * Register a timer for cleanup
     */
    addTimer(timerId) {
        this.timers.add(timerId);
        return this;
    }

    /**
     * Register a WebSocket handler for cleanup
     */
    addWebSocketHandler(eventName, handler) {
        if (!this.webSocketHandlers.has(eventName)) {
            this.webSocketHandlers.set(eventName, []);
        }
        this.webSocketHandlers.get(eventName).push(handler);
        
        // Register handler with WebSocket manager
        if (wsManager && wsManager.on) {
            const unsubscribe = wsManager.on(eventName, handler);
            handler._unsubscribe = unsubscribe;
        }
        
        return this;
    }

    /**
     * Register a custom cleanup callback
     */
    addCleanupCallback(callback) {
        this.cleanupCallbacks.add(callback);
        return this;
    }

    /**
     * Clean up all registered resources
     */
    destroy() {
        // Clean up event listeners
        for (const [key, listeners] of this.eventListeners) {
            listeners.forEach(({ element, event, handler, options }) => {
                try {
                    element.removeEventListener(event, handler, options);
                } catch (error) {
                    console.warn(`Failed to remove event listener ${key}:`, error);
                }
            });
        }
        this.eventListeners.clear();

        // Clean up timers
        for (const timerId of this.timers) {
            try {
                clearInterval(timerId);
                clearTimeout(timerId);
            } catch (error) {
                console.warn('Failed to clear timer:', error);
            }
        }
        this.timers.clear();

        // Clean up WebSocket handlers
        for (const [eventName, handlers] of this.webSocketHandlers) {
            handlers.forEach(handler => {
                try {
                    // Use stored unsubscribe function if available
                    if (handler._unsubscribe && typeof handler._unsubscribe === 'function') {
                        console.log(`🧹 Unsubscribing WebSocket handler for ${eventName}`);
                        handler._unsubscribe();
                    } else if (wsManager && wsManager.off) {
                        console.log(`🧹 Removing WebSocket handler for ${eventName} via off method`);
                        wsManager.off(eventName, handler);
                    } else {
                        console.warn(`No cleanup method available for WebSocket handler: ${eventName}`);
                    }
                } catch (error) {
                    console.warn(`Failed to remove WebSocket handler for ${eventName}:`, error);
                }
            });
        }
        this.webSocketHandlers.clear();

        // Execute custom cleanup callbacks
        for (const callback of this.cleanupCallbacks) {
            try {
                callback();
            } catch (error) {
                console.warn('Failed to execute cleanup callback:', error);
            }
        }
        this.cleanupCallbacks.clear();
    }

    /**
     * Get cleanup statistics
     */
    getStats() {
        return {
            eventListeners: this.eventListeners.size,
            timers: this.timers.size,
            webSocketHandlers: this.webSocketHandlers.size,
            cleanupCallbacks: this.cleanupCallbacks.size
        };
    }
}

/**
 * Base class for page controllers with automatic lifecycle management
 */
class BasePageController {
    constructor() {
        this.lifecycle = new LifecycleManager();
        
        // Register cleanup when page is unloaded
        this.lifecycle.addEventListener(window, 'beforeunload', () => this.destroy());
        
        // Register cleanup for SPA navigation (if applicable)
        this.lifecycle.addEventListener(window, 'popstate', () => this.destroy());
    }

    /**
     * Add event listener with automatic cleanup
     */
    addEventListener(element, event, handler, options = {}) {
        this.lifecycle.addEventListener(element, event, handler, options);
        return this;
    }

    /**
     * Add timer with automatic cleanup
     */
    addTimer(callback, interval, isTimeout = false) {
        const timerId = isTimeout ? 
            setTimeout(callback, interval) : 
            setInterval(callback, interval);
        
        this.lifecycle.addTimer(timerId);
        return timerId;
    }

    /**
     * Add WebSocket handler with automatic cleanup
     */
    addWebSocketHandler(eventName, handler) {
        this.lifecycle.addWebSocketHandler(eventName, handler);
        
        // Add the handler to wsManager
        const wsManager = window.wsManager;
        if (wsManager && wsManager.on) {
            wsManager.on(eventName, handler);
        } else if (wsManager && wsManager.addEventListener) {
            wsManager.addEventListener(eventName, handler);
        }
        
        return this;
    }

    /**
     * Add custom cleanup logic
     */
    addCleanupCallback(callback) {
        this.lifecycle.addCleanupCallback(callback);
        return this;
    }

    /**
     * Get lifecycle statistics
     */
    getLifecycleStats() {
        return this.lifecycle.getStats();
    }

    /**
     * Destroy the component and clean up all resources
     * Override this method in subclasses for custom cleanup
     */
    destroy() {
        console.log(`Destroying ${this.constructor.name} with stats:`, this.getLifecycleStats());
        
        this.lifecycle.destroy();
        
        // Call custom cleanup if implemented
        if (this.customCleanup) {
            this.customCleanup();
        }
    }
}

// Export for use in page controllers
export { LifecycleManager, BasePageController };