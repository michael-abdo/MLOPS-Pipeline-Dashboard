/**
 * Timestamp Manager Component
 * Centralizes all timestamp display and updating logic
 * Replaces multiple legacy timestamp functions with unified system
 */

import { updateStrategies } from '../common/update-strategies.js';

class TimestampManager {
    constructor() {
        // Tracked timestamp elements
        this.trackedElements = new Map();
        
        // Single interval for all timestamp updates
        this.updateInterval = null;
        this.updateFrequency = 30000; // 30 seconds
        
        // Initialize the manager
        this.initialize();
    }
    
    /**
     * Initialize the timestamp manager
     */
    initialize() {
        // Find and register all existing timestamp elements
        this.scanForTimestampElements();
        
        // Start the unified update timer
        this.startUpdateTimer();
    }
    
    /**
     * Scan DOM for elements with data-timestamp attributes
     */
    scanForTimestampElements() {
        document.querySelectorAll('[data-timestamp]').forEach(element => {
            const timestamp = element.getAttribute('data-timestamp');
            if (timestamp) {
                this.trackElement(element.id || this.generateElementId(element), parseInt(timestamp));
            }
        });
    }
    
    /**
     * Generate a unique ID for elements that don't have one
     */
    generateElementId(element) {
        const id = `timestamp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        element.id = id;
        return id;
    }
    
    /**
     * Track a timestamp element for automatic updates
     */
    trackElement(elementId, timestamp) {
        this.trackedElements.set(elementId, {
            timestamp: timestamp,
            lastUpdated: Date.now()
        });
        
        // Immediately update the display
        this.updateElementDisplay(elementId);
    }
    
    /**
     * Set a timestamp for an element (replaces legacy setTimestamp functions)
     */
    setTimestamp(elementId, timestamp = Date.now()) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Store timestamp in data attribute (for compatibility)
        element.setAttribute('data-timestamp', timestamp);
        
        // Track for automatic updates
        this.trackElement(elementId, timestamp);
    }
    
    /**
     * Set "Just now" timestamp (replaces updateLastUpdateTime, updateTrainingLastUpdate)
     */
    setJustNow(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const now = Date.now();
        
        // Use component API if available, otherwise fallback to direct update
        if (this.canUseComponentAPI(element)) {
            updateStrategies.updateTextElement(elementId, 'Just now');
        } else {
            element.textContent = 'Just now';
        }
        
        // Track for future updates
        this.setTimestamp(elementId, now);
    }
    
    /**
     * Check if element can use component API
     */
    canUseComponentAPI(element) {
        // Check if element is part of a metric component
        return element.closest('.metric-card, .card, .status-indicator') !== null;
    }
    
    /**
     * Update display text for a tracked element
     */
    updateElementDisplay(elementId) {
        const tracked = this.trackedElements.get(elementId);
        if (!tracked) return;
        
        const element = document.getElementById(elementId);
        if (!element) {
            // Element no longer exists, stop tracking
            this.trackedElements.delete(elementId);
            return;
        }
        
        const formattedTime = this.formatTimeAgo(tracked.timestamp);
        const currentText = element.textContent.trim();
        
        // Only update if text has changed
        if (currentText !== formattedTime) {
            if (this.canUseComponentAPI(element)) {
                // Use component API for updates
                updateStrategies.updateTextElement(elementId, formattedTime);
            } else {
                // Add subtle animation for direct updates
                this.animateTextUpdate(element, formattedTime);
            }
            
            tracked.lastUpdated = Date.now();
        }
    }
    
    /**
     * Animate text updates with subtle transition
     */
    animateTextUpdate(element, newText) {
        element.style.transition = 'opacity 0.2s ease';
        element.style.opacity = '0.7';
        
        setTimeout(() => {
            element.textContent = newText;
            element.style.opacity = '1';
        }, 100);
        
        // Clear transition after animation
        setTimeout(() => {
            element.style.transition = '';
        }, 300);
    }
    
    /**
     * Format timestamp to relative time string
     */
    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (seconds < 5) {
            return 'Just now';
        } else if (seconds < 60) {
            return `${seconds}s ago`;
        } else if (minutes < 60) {
            return `${minutes}m ago`;
        } else if (hours < 24) {
            return `${hours}h ago`;
        } else if (days < 7) {
            return `${days}d ago`;
        } else {
            // For older timestamps, show actual date
            return new Date(timestamp).toLocaleDateString();
        }
    }
    
    /**
     * Start the unified update timer
     */
    startUpdateTimer() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            this.updateAllTrackedElements();
        }, this.updateFrequency);
    }
    
    /**
     * Update all tracked timestamp elements
     */
    updateAllTrackedElements() {
        for (const elementId of this.trackedElements.keys()) {
            this.updateElementDisplay(elementId);
        }
    }
    
    /**
     * Stop tracking an element
     */
    stopTracking(elementId) {
        this.trackedElements.delete(elementId);
    }
    
    /**
     * Clean up - stop all timers and clear tracking
     */
    cleanup() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        this.trackedElements.clear();
    }
    
    /**
     * Get status of tracked elements (for debugging)
     */
    getStatus() {
        return {
            trackedCount: this.trackedElements.size,
            updateFrequency: this.updateFrequency,
            isRunning: this.updateInterval !== null,
            trackedElements: Array.from(this.trackedElements.keys())
        };
    }
}

// Export singleton instance
export const timestampManager = new TimestampManager();

// Export convenience functions for easy migration
export const setTimestamp = (elementId, timestamp) => timestampManager.setTimestamp(elementId, timestamp);
export const setJustNow = (elementId) => timestampManager.setJustNow(elementId);
export const trackTimestamp = (elementId, timestamp) => timestampManager.trackElement(elementId, timestamp);