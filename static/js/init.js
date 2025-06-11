/**
 * Global Initialization Script
 * Sets up shared functionality across all pages
 */

import { wsManager } from './common/websocket.js';
import { notifications } from './common/notifications.js';
import { CONFIG } from './common/config.js';

/**
 * Initialize global functionality
 */
class GlobalInit {
    constructor() {
        this.initialized = false;
    }

    /**
     * Main initialization function
     */
    async init() {
        if (this.initialized) {
            console.warn('Global init already completed');
            return;
        }

        try {
            // Initialize components in order
            await this.initializeWebSocket();
            this.initializeNotifications();
            this.setupGlobalEventHandlers();
            this.loadUserPreferences();
            this.setupPerformanceMonitoring();
            
            this.initialized = true;
            console.log('✅ Global initialization complete');
            
        } catch (error) {
            console.error('❌ Global initialization failed:', error);
            notifications.error('System initialization failed. Please refresh the page.');
        }
    }

    /**
     * Initialize WebSocket connection
     */
    async initializeWebSocket() {
        console.log('🔌 Initializing WebSocket connection...');
        
        // Connect to WebSocket
        await wsManager.connect();
        
        // Setup connection event handlers
        wsManager.on('connected', () => {
            notifications.success('Connected to server', 3000);
        });
        
        wsManager.on('disconnected', () => {
            notifications.warning('Connection lost. Attempting to reconnect...', 0);
        });
        
        wsManager.on('reconnected', () => {
            notifications.success('Connection restored', 3000);
        });
        
        wsManager.on('error', (error) => {
            notifications.error(`Connection error: ${error.message}`);
        });
    }

    /**
     * Initialize notification system
     */
    initializeNotifications() {
        console.log('🔔 Initializing notification system...');
        
        // Notification system is auto-initialized via singleton
        // Just verify it's ready
        if (!notifications) {
            throw new Error('Notification system failed to initialize');
        }
    }

    /**
     * Setup global event handlers
     */
    setupGlobalEventHandlers() {
        console.log('🎯 Setting up global event handlers...');
        
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error);
            notifications.error('An unexpected error occurred');
        });
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            notifications.error('An unexpected error occurred');
        });
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('Page hidden - pausing updates');
                wsManager.pauseReconnect();
            } else {
                console.log('Page visible - resuming updates');
                wsManager.resumeReconnect();
            }
        });
        
        // Handle online/offline events
        window.addEventListener('online', () => {
            notifications.success('Connection restored');
            wsManager.reconnect();
        });
        
        window.addEventListener('offline', () => {
            notifications.warning('No internet connection');
        });
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K to clear notifications
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                notifications.clearAll();
            }
            
            // Escape to close modals (future feature)
            if (e.key === 'Escape') {
                this.closeActiveModal();
            }
        });
    }

    /**
     * Load user preferences from localStorage
     */
    loadUserPreferences() {
        console.log('⚙️ Loading user preferences...');
        
        try {
            const preferences = localStorage.getItem('userPreferences');
            if (preferences) {
                const prefs = JSON.parse(preferences);
                this.applyPreferences(prefs);
            }
        } catch (error) {
            console.warn('Failed to load user preferences:', error);
        }
    }

    /**
     * Apply user preferences
     */
    applyPreferences(preferences) {
        // Apply theme preference
        if (preferences.theme) {
            document.body.dataset.theme = preferences.theme;
        }
        
        // Apply notification preferences
        if (preferences.notifications) {
            if (preferences.notifications.duration) {
                notifications.defaultDuration = preferences.notifications.duration;
            }
            if (preferences.notifications.maxCount) {
                notifications.maxNotifications = preferences.notifications.maxCount;
            }
        }
        
        // Apply other preferences as needed
        window.userPreferences = preferences;
    }

    /**
     * Setup performance monitoring
     */
    setupPerformanceMonitoring() {
        console.log('📊 Setting up performance monitoring...');
        
        // Monitor page load performance
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            if (perfData) {
                console.log('Page load metrics:', {
                    domContentLoaded: Math.round(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart),
                    loadComplete: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
                    totalTime: Math.round(perfData.loadEventEnd - perfData.fetchStart)
                });
            }
        });
        
        // Monitor long tasks (if supported)
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (entry.duration > 50) {
                            console.warn('Long task detected:', {
                                duration: Math.round(entry.duration),
                                startTime: Math.round(entry.startTime)
                            });
                        }
                    }
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (e) {
                // Long task monitoring not supported
            }
        }
    }

    /**
     * Close active modal (placeholder for future feature)
     */
    closeActiveModal() {
        const modal = document.querySelector('.modal.active');
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    }

    /**
     * Public method to check if initialization is complete
     */
    isReady() {
        return this.initialized;
    }

    /**
     * Wait for initialization to complete
     */
    async waitForInit() {
        if (this.initialized) return;
        
        // Wait up to 5 seconds for initialization
        const maxWait = 5000;
        const checkInterval = 100;
        let waited = 0;
        
        while (!this.initialized && waited < maxWait) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
        }
        
        if (!this.initialized) {
            throw new Error('Global initialization timeout');
        }
    }
}

// Create singleton instance
const globalInit = new GlobalInit();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        globalInit.init();
    });
} else {
    // DOM already loaded
    globalInit.init();
}

// Export for use in other modules
export { globalInit };