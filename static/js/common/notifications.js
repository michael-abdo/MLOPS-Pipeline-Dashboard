/**
 * Centralized Notification System
 * Handles all user notifications across the application
 */

class NotificationManager {
    constructor() {
        if (NotificationManager.instance) {
            return NotificationManager.instance;
        }

        this.notifications = [];
        this.maxNotifications = 5;
        this.defaultDuration = 5000; // 5 seconds
        this.container = null;
        
        this.init();
        NotificationManager.instance = this;
    }

    init() {
        // Create notification container if it doesn't exist
        this.createContainer();
        
        // Listen for custom notification events
        window.addEventListener('notification', (e) => {
            this.show(e.detail.message, e.detail.type, e.detail.duration);
        });
        
        // Listen for WebSocket notifications
        this.setupWebSocketListeners();
    }

    createContainer() {
        // Check if container already exists
        this.container = document.getElementById('notification-container');
        
        if (!this.container) {
            // Create container
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
            
            // Add styles
            this.injectStyles();
        }
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: var(--spacing-sm);
                max-width: 400px;
            }

            .notification {
                background: var(--surface-color);
                border: 1px solid var(--border-color);
                border-radius: var(--radius-md);
                padding: var(--spacing-md);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: flex-start;
                gap: var(--spacing-md);
                animation: slideIn 0.3s ease-out;
                transition: all 0.3s ease;
            }

            .notification.hiding {
                animation: slideOut 0.3s ease-out;
                opacity: 0;
                transform: translateX(100%);
            }

            .notification-icon {
                font-size: 1.25rem;
                flex-shrink: 0;
            }

            .notification-content {
                flex: 1;
            }

            .notification-message {
                color: var(--text-primary);
                font-size: 0.9rem;
                line-height: 1.4;
                margin: 0;
            }

            .notification-time {
                color: var(--text-secondary);
                font-size: 0.75rem;
                margin-top: var(--spacing-sm);
            }

            .notification-close {
                background: none;
                border: none;
                color: var(--text-secondary);
                cursor: pointer;
                font-size: 1.25rem;
                padding: 0;
                line-height: 1;
                transition: color 0.2s ease;
            }

            .notification-close:hover {
                color: var(--text-primary);
            }

            /* Type-specific styles */
            .notification.success {
                border-color: var(--success-color);
                background: rgba(16, 185, 129, 0.05);
            }

            .notification.error {
                border-color: var(--danger-color);
                background: rgba(239, 68, 68, 0.05);
            }

            .notification.warning {
                border-color: var(--warning-color);
                background: rgba(245, 158, 11, 0.05);
            }

            .notification.info {
                border-color: var(--primary-color);
                background: rgba(37, 99, 235, 0.05);
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }

            @media (max-width: 768px) {
                .notification-container {
                    left: 10px;
                    right: 10px;
                    max-width: none;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setupWebSocketListeners() {
        // Import WebSocket manager when needed
        import('./websocket.js').then(({ wsManager }) => {
            // Listen for system notifications
            wsManager.on('notification', (data) => {
                this.show(data.message, data.type || 'info', data.duration);
            });
            
            // Listen for error events
            wsManager.on('error', (data) => {
                this.show(data.message || 'An error occurred', 'error');
            });
            
            // Listen for success events
            wsManager.on('success', (data) => {
                this.show(data.message, 'success');
            });
        }).catch(err => {
            console.warn('WebSocket manager not available for notifications:', err);
        });
    }

    /**
     * Show a notification
     * @param {string} message - The notification message
     * @param {string} type - Type of notification (success, error, warning, info)
     * @param {number} duration - Duration in milliseconds (0 for persistent)
     * @returns {object} Notification object with remove() method
     */
    show(message, type = 'info', duration = null) {
        const notification = {
            id: Date.now() + Math.random(),
            message,
            type,
            timestamp: new Date(),
            element: null
        };

        // Create notification element
        const element = this.createElement(notification);
        notification.element = element;
        
        // Add to container
        this.container.appendChild(element);
        
        // Add to notifications array
        this.notifications.push(notification);
        
        // Remove oldest if exceeding max
        if (this.notifications.length > this.maxNotifications) {
            const oldest = this.notifications.shift();
            this.remove(oldest.id);
        }
        
        // Auto-remove after duration
        if (duration !== 0) {
            const autoRemoveDuration = duration || this.defaultDuration;
            setTimeout(() => {
                this.remove(notification.id);
            }, autoRemoveDuration);
        }
        
        // Return notification object with remove method
        return {
            id: notification.id,
            remove: () => this.remove(notification.id)
        };
    }

    createElement(notification) {
        const element = document.createElement('div');
        element.className = `notification ${notification.type}`;
        element.dataset.notificationId = notification.id;
        
        // Icon mapping
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        // Format time
        const time = notification.timestamp.toLocaleTimeString();
        
        element.innerHTML = `
            <div class="notification-icon">${icons[notification.type] || icons.info}</div>
            <div class="notification-content">
                <p class="notification-message">${this.escapeHtml(notification.message)}</p>
                <div class="notification-time">${time}</div>
            </div>
            <button class="notification-close" aria-label="Close notification">×</button>
        `;
        
        // Add close handler
        const closeBtn = element.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.remove(notification.id);
        });
        
        return element;
    }

    remove(notificationId) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index === -1) return;
        
        const notification = this.notifications[index];
        const element = notification.element;
        
        if (element && element.parentNode) {
            // Add hiding animation
            element.classList.add('hiding');
            
            // Remove after animation
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 300);
        }
        
        // Remove from array
        this.notifications.splice(index, 1);
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        // Copy array to avoid modification during iteration
        const notificationIds = this.notifications.map(n => n.id);
        notificationIds.forEach(id => this.remove(id));
    }

    /**
     * Show success notification
     */
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    /**
     * Show error notification
     */
    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    /**
     * Show warning notification
     */
    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    /**
     * Show info notification
     */
    info(message, duration) {
        return this.show(message, 'info', duration);
    }

    /**
     * Get notification history
     */
    getHistory() {
        return this.notifications.map(n => ({
            message: n.message,
            type: n.type,
            timestamp: n.timestamp
        }));
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create singleton instance
const notificationManager = new NotificationManager();

// Export for use in other modules
export { notificationManager as notifications };