/**
 * Error Handling Utilities
 * Helper functions for common error handling patterns
 */

import { 
    errorHandler, 
    MLOpsError, 
    ErrorSeverity, 
    ErrorCategory, 
    RecoveryStrategy,
    createNetworkError,
    createValidationError,
    createUploadError,
    createComponentError
} from './error-handler.js';

/**
 * Wrap API calls with standardized error handling
 */
export const withErrorHandling = {
    /**
     * Wrap an async function with error handling
     */
    async: async function(fn, options = {}) {
        const {
            category = ErrorCategory.SYSTEM,
            severity = ErrorSeverity.MEDIUM,
            recovery = RecoveryStrategy.NONE,
            userMessage = null,
            context = {},
            showToUser = true,
            retryFunction = null,
            fallbackFunction = null
        } = options;

        try {
            return await fn();
        } catch (error) {
            const mlopsError = new MLOpsError(error.message, {
                severity,
                category,
                recovery,
                originalError: error,
                userMessage: userMessage || error.message,
                showToUser,
                context: {
                    ...context,
                    retryFunction,
                    fallbackFunction
                }
            });

            await errorHandler.handleError(mlopsError);
            throw mlopsError;
        }
    },

    /**
     * Wrap API calls with network-specific error handling
     */
    api: async function(apiCall, endpoint, options = {}) {
        return await this.async(apiCall, {
            category: ErrorCategory.NETWORK,
            recovery: RecoveryStrategy.RETRY,
            userMessage: `Failed to connect to ${endpoint}. Please check your connection and try again.`,
            context: { endpoint, operation: 'api_call' },
            retryFunction: apiCall,
            ...options
        });
    },

    /**
     * Wrap upload operations with upload-specific error handling
     */
    upload: async function(uploadCall, fileName, options = {}) {
        return await this.async(uploadCall, {
            category: ErrorCategory.UPLOAD,
            recovery: RecoveryStrategy.RETRY,
            userMessage: `Failed to upload ${fileName}. Please check the file and try again.`,
            context: { fileName, operation: 'file_upload' },
            retryFunction: uploadCall,
            ...options
        });
    },

    /**
     * Wrap component operations with component-specific error handling
     */
    component: async function(componentCall, componentName, options = {}) {
        return await this.async(componentCall, {
            category: ErrorCategory.COMPONENT,
            recovery: RecoveryStrategy.FALLBACK,
            userMessage: `${componentName} encountered an error. Attempting to recover...`,
            context: { component: componentName, operation: 'component_operation' },
            ...options
        });
    },

    /**
     * Wrap WebSocket operations with WebSocket-specific error handling
     */
    websocket: async function(wsCall, eventType, options = {}) {
        return await this.async(wsCall, {
            category: ErrorCategory.WEBSOCKET,
            recovery: RecoveryStrategy.RETRY,
            userMessage: 'Real-time connection issue. Attempting to reconnect...',
            context: { eventType, operation: 'websocket_operation' },
            retryFunction: wsCall,
            ...options
        });
    }
};

/**
 * Enhanced try-catch decorator for class methods
 */
export function withErrorBoundary(category = ErrorCategory.SYSTEM, options = {}) {
    return function(target, propertyName, descriptor) {
        const method = descriptor.value;

        descriptor.value = async function(...args) {
            try {
                return await method.apply(this, args);
            } catch (error) {
                const mlopsError = new MLOpsError(error.message, {
                    severity: options.severity || ErrorSeverity.MEDIUM,
                    category,
                    recovery: options.recovery || RecoveryStrategy.NONE,
                    originalError: error,
                    userMessage: options.userMessage || error.message,
                    showToUser: options.showToUser !== false,
                    context: {
                        className: target.constructor.name,
                        methodName: propertyName,
                        ...options.context
                    }
                });

                await errorHandler.handleError(mlopsError);
                
                if (options.rethrow !== false) {
                    throw mlopsError;
                }
                
                return options.fallbackValue;
            }
        };

        return descriptor;
    };
}

/**
 * Validation helper with error handling
 */
export const validate = {
    /**
     * Validate required fields
     */
    required(value, fieldName) {
        if (value === null || value === undefined || value === '') {
            throw createValidationError(`${fieldName} is required`);
        }
        return true;
    },

    /**
     * Validate email format
     */
    email(value, fieldName = 'Email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
            throw createValidationError(`${fieldName} must be a valid email address`);
        }
        return true;
    },

    /**
     * Validate file type
     */
    fileType(file, allowedTypes, fieldName = 'File') {
        if (!allowedTypes.includes(file.type)) {
            throw createValidationError(`${fieldName} must be one of: ${allowedTypes.join(', ')}`);
        }
        return true;
    },

    /**
     * Validate file size
     */
    fileSize(file, maxSize, fieldName = 'File') {
        if (file.size > maxSize) {
            const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
            throw createValidationError(`${fieldName} must be smaller than ${maxSizeMB}MB`);
        }
        return true;
    },

    /**
     * Validate URL format
     */
    url(value, fieldName = 'URL') {
        try {
            new URL(value);
            return true;
        } catch (error) {
            throw createValidationError(`${fieldName} must be a valid URL`);
        }
    },

    /**
     * Validate number range
     */
    range(value, min, max, fieldName = 'Value') {
        if (value < min || value > max) {
            throw createValidationError(`${fieldName} must be between ${min} and ${max}`);
        }
        return true;
    }
};

/**
 * Timeout helper with error handling
 */
export async function withTimeout(promise, timeoutMs, operation = 'Operation') {
    return new Promise(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
            const timeoutError = new MLOpsError(`${operation} timed out`, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.RETRY,
                userMessage: `${operation} is taking longer than expected. Please try again.`,
                context: { timeout: timeoutMs, operation }
            });
            reject(timeoutError);
        }, timeoutMs);

        try {
            const result = await promise;
            clearTimeout(timeoutId);
            resolve(result);
        } catch (error) {
            clearTimeout(timeoutId);
            reject(error);
        }
    });
}

/**
 * Retry helper with exponential backoff
 */
export async function withRetry(fn, options = {}) {
    const {
        maxAttempts = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffFactor = 2,
        retryCondition = () => true,
        onRetry = null
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if we should retry
            if (attempt === maxAttempts || !retryCondition(error, attempt)) {
                break;
            }

            // Call retry callback if provided
            if (onRetry) {
                await onRetry(error, attempt, delay);
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay));

            // Exponential backoff
            delay = Math.min(delay * backoffFactor, maxDelay);
        }
    }

    // Create retry exhausted error
    const retryError = new MLOpsError('Maximum retry attempts exceeded', {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.NETWORK,
        recovery: RecoveryStrategy.MANUAL,
        originalError: lastError,
        userMessage: 'The operation failed after multiple attempts. Please check your connection and try again later.',
        context: { maxAttempts, lastAttempt: maxAttempts }
    });

    throw retryError;
}

/**
 * Batch error handling for multiple operations
 */
export async function withBatchErrorHandling(operations, options = {}) {
    const {
        continueOnError = false,
        collectErrors = true,
        onError = null
    } = options;

    const results = [];
    const errors = [];

    for (let i = 0; i < operations.length; i++) {
        try {
            const result = await operations[i]();
            results.push({ index: i, result, error: null });
        } catch (error) {
            const batchError = new MLOpsError(`Batch operation ${i + 1} failed`, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.SYSTEM,
                recovery: RecoveryStrategy.NONE,
                originalError: error,
                context: { batchIndex: i, operation: `batch_operation_${i}` }
            });

            if (collectErrors) {
                errors.push(batchError);
            }

            results.push({ index: i, result: null, error: batchError });

            if (onError) {
                await onError(batchError, i);
            }

            if (!continueOnError) {
                break;
            }
        }
    }

    return {
        results,
        errors,
        hasErrors: errors.length > 0,
        successCount: results.filter(r => !r.error).length,
        errorCount: errors.length
    };
}

/**
 * Safe JSON parsing with error handling
 */
export function safeParse(jsonString, fallback = null, context = {}) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        const parseError = new MLOpsError('Failed to parse JSON data', {
            severity: ErrorSeverity.LOW,
            category: ErrorCategory.PARSING,
            recovery: RecoveryStrategy.FALLBACK,
            originalError: error,
            userMessage: 'Invalid data format received',
            showToUser: false,
            context: { jsonString: jsonString.substring(0, 100) + '...', ...context }
        });

        errorHandler.handleError(parseError);
        return fallback;
    }
}

/**
 * Safe async operation wrapper
 */
export async function safeAsync(fn, fallback = null, context = {}) {
    try {
        return await fn();
    } catch (error) {
        const safeError = new MLOpsError('Safe async operation failed', {
            severity: ErrorSeverity.LOW,
            category: ErrorCategory.SYSTEM,
            recovery: RecoveryStrategy.FALLBACK,
            originalError: error,
            showToUser: false,
            context
        });

        await errorHandler.handleError(safeError);
        return fallback;
    }
}

/**
 * Performance monitoring wrapper
 */
export async function withPerformanceMonitoring(fn, operationName, thresholdMs = 5000) {
    const startTime = performance.now();
    
    try {
        const result = await fn();
        const duration = performance.now() - startTime;
        
        if (duration > thresholdMs) {
            const perfWarning = new MLOpsError(`${operationName} performance warning`, {
                severity: ErrorSeverity.LOW,
                category: ErrorCategory.SYSTEM,
                recovery: RecoveryStrategy.NONE,
                userMessage: `${operationName} is running slower than expected`,
                showToUser: false,
                context: { duration, threshold: thresholdMs, operation: operationName }
            });
            
            await errorHandler.handleError(perfWarning);
        }
        
        return result;
    } catch (error) {
        const duration = performance.now() - startTime;
        error.context = { ...error.context, duration, operation: operationName };
        throw error;
    }
}

/**
 * Memory usage monitoring wrapper
 */
export async function withMemoryMonitoring(fn, operationName) {
    const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    
    try {
        const result = await fn();
        
        if (performance.memory) {
            const finalMemory = performance.memory.usedJSHeapSize;
            const memoryDelta = finalMemory - initialMemory;
            
            // Warn if operation used more than 10MB
            if (memoryDelta > 10 * 1024 * 1024) {
                const memoryWarning = new MLOpsError(`${operationName} memory usage warning`, {
                    severity: ErrorSeverity.LOW,
                    category: ErrorCategory.SYSTEM,
                    recovery: RecoveryStrategy.NONE,
                    userMessage: `${operationName} used more memory than expected`,
                    showToUser: false,
                    context: { 
                        memoryDelta: memoryDelta / (1024 * 1024), // MB
                        operation: operationName 
                    }
                });
                
                await errorHandler.handleError(memoryWarning);
            }
        }
        
        return result;
    } catch (error) {
        throw error;
    }
}

// Export all utilities
export default {
    withErrorHandling,
    withErrorBoundary,
    validate,
    withTimeout,
    withRetry,
    withBatchErrorHandling,
    safeParse,
    safeAsync,
    withPerformanceMonitoring,
    withMemoryMonitoring
};