/**
 * Centralized Error Handling System
 * Provides consistent error handling, logging, recovery, and user feedback
 */

// Error severity levels
export const ErrorSeverity = {
    LOW: 'low',
    MEDIUM: 'medium', 
    HIGH: 'high',
    CRITICAL: 'critical'
};

// Error categories for better classification
export const ErrorCategory = {
    NETWORK: 'network',
    VALIDATION: 'validation',
    AUTHENTICATION: 'authentication',
    PERMISSION: 'permission',
    UPLOAD: 'upload',
    WEBSOCKET: 'websocket',
    PARSING: 'parsing',
    COMPONENT: 'component',
    SYSTEM: 'system'
};

// Error recovery strategies
export const RecoveryStrategy = {
    RETRY: 'retry',
    FALLBACK: 'fallback', 
    RELOAD: 'reload',
    REDIRECT: 'redirect',
    MANUAL: 'manual',
    NONE: 'none'
};

/**
 * Standardized Error class with enhanced information
 */
export class MLOpsError extends Error {
    constructor(message, options = {}) {
        super(message);
        this.name = 'MLOpsError';
        this.severity = options.severity || ErrorSeverity.MEDIUM;
        this.category = options.category || ErrorCategory.SYSTEM;
        this.recovery = options.recovery || RecoveryStrategy.NONE;
        this.context = options.context || {};
        this.userMessage = options.userMessage || message;
        this.showToUser = options.showToUser !== false;
        this.timestamp = new Date().toISOString();
        this.id = this.generateErrorId();
        this.originalError = options.originalError || null;
    }

    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            message: this.message,
            userMessage: this.userMessage,
            severity: this.severity,
            category: this.category,
            recovery: this.recovery,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

/**
 * Centralized Error Handler
 */
export class ErrorHandler {
    constructor() {
        this.errorListeners = new Set();
        this.errorLog = [];
        this.maxLogSize = 1000;
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.notificationManager = null;
        this.setupGlobalErrorHandling();
    }

    /**
     * Initialize the error handler with notification system
     */
    async initialize() {
        try {
            // Import notification system
            const { notifications } = await import('./notifications.js');
            this.notificationManager = notifications;
        } catch (error) {
            console.warn('Could not initialize notification system:', error);
        }
    }

    /**
     * Set up global error handling
     */
    setupGlobalErrorHandling() {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            const error = new MLOpsError('Unhandled promise rejection', {
                severity: ErrorSeverity.HIGH,
                category: ErrorCategory.SYSTEM,
                originalError: event.reason,
                context: { type: 'unhandledrejection' }
            });
            this.handleError(error);
            event.preventDefault(); // Prevent console logging
        });

        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            const error = new MLOpsError('Uncaught error', {
                severity: ErrorSeverity.HIGH,
                category: ErrorCategory.SYSTEM,
                originalError: event.error,
                context: { 
                    filename: event.filename,
                    line: event.lineno,
                    column: event.colno
                }
            });
            this.handleError(error);
        });
    }

    /**
     * Main error handling method
     */
    async handleError(error, context = {}) {
        let mlopsError;

        // Convert regular errors to MLOpsError
        if (!(error instanceof MLOpsError)) {
            mlopsError = new MLOpsError(error.message || 'Unknown error', {
                severity: context.severity || ErrorSeverity.MEDIUM,
                category: context.category || ErrorCategory.SYSTEM,
                recovery: context.recovery || RecoveryStrategy.NONE,
                originalError: error,
                context: { ...context }
            });
        } else {
            mlopsError = error;
            mlopsError.context = { ...mlopsError.context, ...context };
        }

        // Log the error
        this.logError(mlopsError);

        // Notify listeners
        this.notifyListeners(mlopsError);

        // Show user notification if appropriate
        if (mlopsError.showToUser) {
            await this.showUserNotification(mlopsError);
        }

        // Attempt recovery if strategy is defined
        if (mlopsError.recovery !== RecoveryStrategy.NONE) {
            await this.attemptRecovery(mlopsError);
        }

        return mlopsError;
    }

    /**
     * Log error to internal log
     */
    logError(error) {
        // Add to internal log
        this.errorLog.unshift(error.toJSON());
        
        // Maintain log size
        if (this.errorLog.length > this.maxLogSize) {
            this.errorLog = this.errorLog.slice(0, this.maxLogSize);
        }

        // Console logging based on severity
        const logMethod = this.getLogMethod(error.severity);
        logMethod(`[${error.severity.toUpperCase()}] ${error.category}: ${error.message}`, {
            id: error.id,
            context: error.context,
            stack: error.stack
        });
    }

    /**
     * Get appropriate console log method for severity
     */
    getLogMethod(severity) {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                return console.error.bind(console);
            case ErrorSeverity.MEDIUM:
                return console.warn.bind(console);
            case ErrorSeverity.LOW:
                return console.log.bind(console);
            default:
                return console.log.bind(console);
        }
    }

    /**
     * Show user notification
     */
    async showUserNotification(error) {
        if (!this.notificationManager) {
            // Fallback to basic notification
            this.showBasicNotification(error);
            return;
        }

        const notificationType = this.getNotificationType(error.severity);
        const message = error.userMessage;
        
        let options = {
            duration: this.getNotificationDuration(error.severity),
            actions: []
        };

        // Add retry action if applicable
        if (error.recovery === RecoveryStrategy.RETRY) {
            options.actions.push({
                text: 'Retry',
                handler: () => this.attemptRecovery(error)
            });
        }

        // Add report action for high severity errors
        if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
            options.actions.push({
                text: 'Report Issue',
                handler: () => this.reportError(error)
            });
        }

        this.notificationManager.show(message, notificationType, options);
    }

    /**
     * Fallback notification method
     */
    showBasicNotification(error) {
        const event = new CustomEvent('notification', {
            detail: {
                message: error.userMessage,
                type: this.getNotificationType(error.severity),
                timestamp: Date.now(),
                errorId: error.id
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Get notification type based on severity
     */
    getNotificationType(severity) {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
            case ErrorSeverity.HIGH:
                return 'error';
            case ErrorSeverity.MEDIUM:
                return 'warning';
            case ErrorSeverity.LOW:
                return 'info';
            default:
                return 'info';
        }
    }

    /**
     * Get notification duration based on severity
     */
    getNotificationDuration(severity) {
        switch (severity) {
            case ErrorSeverity.CRITICAL:
                return 0; // Persistent
            case ErrorSeverity.HIGH:
                return 10000; // 10 seconds
            case ErrorSeverity.MEDIUM:
                return 5000; // 5 seconds
            case ErrorSeverity.LOW:
                return 3000; // 3 seconds
            default:
                return 5000;
        }
    }

    /**
     * Attempt error recovery
     */
    async attemptRecovery(error) {
        const retryKey = `${error.category}_${error.context.operation || 'unknown'}`;
        
        switch (error.recovery) {
            case RecoveryStrategy.RETRY:
                await this.retryOperation(error, retryKey);
                break;
                
            case RecoveryStrategy.FALLBACK:
                await this.fallbackOperation(error);
                break;
                
            case RecoveryStrategy.RELOAD:
                await this.reloadPage(error);
                break;
                
            case RecoveryStrategy.REDIRECT:
                await this.redirectUser(error);
                break;
                
            case RecoveryStrategy.MANUAL:
                await this.requestManualIntervention(error);
                break;
                
            default:
                // No recovery strategy
                break;
        }
    }

    /**
     * Retry operation with exponential backoff
     */
    async retryOperation(error, retryKey) {
        const attempts = this.retryAttempts.get(retryKey) || 0;
        
        if (attempts >= this.maxRetries) {
            const maxRetriesError = new MLOpsError('Maximum retry attempts exceeded', {
                severity: ErrorSeverity.HIGH,
                category: error.category,
                recovery: RecoveryStrategy.MANUAL,
                context: { ...error.context, originalError: error.id, retryAttempts: attempts }
            });
            await this.handleError(maxRetriesError);
            return;
        }

        this.retryAttempts.set(retryKey, attempts + 1);
        
        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempts);
        
        setTimeout(async () => {
            try {
                if (error.context.retryFunction) {
                    await error.context.retryFunction();
                    // Clear retry count on success
                    this.retryAttempts.delete(retryKey);
                }
            } catch (retryError) {
                // Handle retry failure
                await this.handleError(retryError, {
                    category: error.category,
                    recovery: RecoveryStrategy.RETRY,
                    retryAttempt: attempts + 1
                });
            }
        }, delay);
    }

    /**
     * Fallback operation
     */
    async fallbackOperation(error) {
        if (error.context.fallbackFunction) {
            try {
                await error.context.fallbackFunction();
            } catch (fallbackError) {
                await this.handleError(fallbackError, {
                    category: error.category,
                    recovery: RecoveryStrategy.MANUAL
                });
            }
        }
    }

    /**
     * Reload page
     */
    async reloadPage(error) {
        if (confirm('An error occurred. Would you like to reload the page?')) {
            window.location.reload();
        }
    }

    /**
     * Redirect user
     */
    async redirectUser(error) {
        const redirectUrl = error.context.redirectUrl || '/';
        if (confirm(`An error occurred. Would you like to go to ${redirectUrl}?`)) {
            window.location.href = redirectUrl;
        }
    }

    /**
     * Request manual intervention
     */
    async requestManualIntervention(error) {
        const message = `A ${error.severity} error requires manual intervention:\n${error.userMessage}\nError ID: ${error.id}`;
        alert(message);
    }

    /**
     * Report error to monitoring system
     */
    async reportError(error) {
        try {
            // This would integrate with error reporting service
            console.log('Reporting error:', error.toJSON());
            
            // For now, copy error details to clipboard
            const errorDetails = JSON.stringify(error.toJSON(), null, 2);
            
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(errorDetails);
                this.showBasicNotification(new MLOpsError('Error details copied to clipboard', {
                    severity: ErrorSeverity.LOW,
                    showToUser: true
                }));
            }
        } catch (reportError) {
            console.error('Failed to report error:', reportError);
        }
    }

    /**
     * Add error listener
     */
    addErrorListener(listener) {
        this.errorListeners.add(listener);
    }

    /**
     * Remove error listener
     */
    removeErrorListener(listener) {
        this.errorListeners.delete(listener);
    }

    /**
     * Notify all listeners
     */
    notifyListeners(error) {
        this.errorListeners.forEach(listener => {
            try {
                listener(error);
            } catch (listenerError) {
                console.error('Error listener failed:', listenerError);
            }
        });
    }

    /**
     * Get error statistics
     */
    getErrorStats() {
        const stats = {
            total: this.errorLog.length,
            bySeverity: {},
            byCategory: {},
            recent: this.errorLog.slice(0, 10)
        };

        // Count by severity
        Object.values(ErrorSeverity).forEach(severity => {
            stats.bySeverity[severity] = this.errorLog.filter(
                error => error.severity === severity
            ).length;
        });

        // Count by category
        Object.values(ErrorCategory).forEach(category => {
            stats.byCategory[category] = this.errorLog.filter(
                error => error.category === category
            ).length;
        });

        return stats;
    }

    /**
     * Clear error log
     */
    clearErrorLog() {
        this.errorLog = [];
        this.retryAttempts.clear();
    }
}

// Create singleton instance
export const errorHandler = new ErrorHandler();

// Initialize on module load
errorHandler.initialize().catch(error => {
    console.warn('Failed to initialize error handler:', error);
});

// Convenience functions for common error types
export const createNetworkError = (message, originalError, context = {}) => {
    return new MLOpsError(message, {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.NETWORK,
        recovery: RecoveryStrategy.RETRY,
        originalError,
        userMessage: 'Network connection issue. Please check your connection and try again.',
        ...context
    });
};

export const createValidationError = (message, context = {}) => {
    return new MLOpsError(message, {
        severity: ErrorSeverity.LOW,
        category: ErrorCategory.VALIDATION,
        recovery: RecoveryStrategy.NONE,
        userMessage: message,
        ...context
    });
};

export const createUploadError = (message, originalError, context = {}) => {
    return new MLOpsError(message, {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.UPLOAD,
        recovery: RecoveryStrategy.RETRY,
        originalError,
        userMessage: 'File upload failed. Please try again.',
        ...context
    });
};

export const createComponentError = (componentName, message, originalError, context = {}) => {
    return new MLOpsError(`${componentName}: ${message}`, {
        severity: ErrorSeverity.MEDIUM,
        category: ErrorCategory.COMPONENT,
        recovery: RecoveryStrategy.FALLBACK,
        originalError,
        userMessage: 'A component error occurred. The page will attempt to recover.',
        context: { component: componentName, ...context }
    });
};