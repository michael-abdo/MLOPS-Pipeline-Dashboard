# Error Handling System Documentation

## Overview

The MLOps Dashboard implements a centralized error handling system that provides consistent error management, logging, recovery strategies, and user feedback across the entire application.

## Architecture

### Core Components

1. **ErrorHandler** (`error-handler.js`)
   - Singleton service that manages all error handling
   - Provides global error event listeners
   - Maintains error log history
   - Integrates with notification system
   - Implements recovery strategies

2. **MLOpsError** (`error-handler.js`)
   - Custom error class with enhanced metadata
   - Includes severity levels, categories, and recovery strategies
   - Provides structured error information

3. **Error Utilities** (`error-utils.js`)
   - Helper functions for common error handling patterns
   - Decorators and wrappers for consistent error handling
   - Validation utilities with error generation

## Error Severity Levels

- **LOW**: Minor issues that don't affect functionality
- **MEDIUM**: Issues that may affect user experience
- **HIGH**: Critical issues requiring immediate attention
- **CRITICAL**: System failures requiring manual intervention

## Error Categories

- **NETWORK**: API calls, WebSocket connections
- **VALIDATION**: Input validation, data format issues
- **AUTHENTICATION**: Login, token expiration
- **PERMISSION**: Access control violations
- **UPLOAD**: File upload issues
- **WEBSOCKET**: Real-time connection problems
- **PARSING**: JSON/data parsing errors
- **COMPONENT**: UI component failures
- **SYSTEM**: General system errors

## Recovery Strategies

- **RETRY**: Automatic retry with exponential backoff
- **FALLBACK**: Use alternative method or cached data
- **RELOAD**: Prompt user to reload the page
- **REDIRECT**: Navigate to safe page
- **MANUAL**: Require user intervention
- **NONE**: No recovery action needed

## Usage Examples

### Basic Error Handling

```javascript
import { errorHandler, MLOpsError, ErrorSeverity, ErrorCategory, RecoveryStrategy } from './error-handler.js';

// Throw a custom error
throw new MLOpsError('Failed to load data', {
    severity: ErrorSeverity.MEDIUM,
    category: ErrorCategory.NETWORK,
    recovery: RecoveryStrategy.RETRY,
    userMessage: 'Unable to load data. Retrying...'
});

// Handle an error
try {
    await someAsyncOperation();
} catch (error) {
    errorHandler.handleError(error, {
        severity: ErrorSeverity.HIGH,
        category: ErrorCategory.SYSTEM,
        context: { operation: 'dataLoad' }
    });
}
```

### Using Error Utilities

```javascript
import { withErrorHandling, validate } from './error-utils.js';

// Wrap API calls
const data = await withErrorHandling.api(
    () => fetch('/api/models'),
    '/api/models'
);

// Validate inputs
validate.required(userInput, 'User Name');
validate.email(emailInput, 'Email Address');
validate.fileType(file, ['text/csv'], 'Data File');
```

### Component Error Boundaries

```javascript
import { withErrorBoundary } from './error-utils.js';

class MyComponent {
    @withErrorBoundary(ErrorCategory.COMPONENT, {
        severity: ErrorSeverity.MEDIUM,
        fallbackValue: []
    })
    async loadData() {
        // Method automatically wrapped with error handling
        return await API.getData();
    }
}
```

## Integration Points

### With API Client

The API client (`api.js`) integrates error handling for all HTTP requests:
- Automatic retry for network failures
- Timeout handling
- Response validation
- User-friendly error messages

### With WebSocket Manager

WebSocket connections include error handling for:
- Connection failures
- Reconnection logic
- Message parsing errors
- Heartbeat timeouts

### With UI Components

UI components use error handling for:
- Component initialization failures
- Data loading errors
- User input validation
- Graceful degradation

## Best Practices

1. **Always provide user-friendly messages**
   ```javascript
   userMessage: 'Please check your internet connection and try again'
   ```

2. **Include context for debugging**
   ```javascript
   context: { 
       component: 'Dashboard',
       action: 'loadModels',
       userId: currentUser.id 
   }
   ```

3. **Choose appropriate severity levels**
   - Use CRITICAL sparingly for true system failures
   - Most user-facing errors should be MEDIUM
   - Use LOW for recoverable issues

4. **Implement recovery strategies**
   - Prefer RETRY for transient network issues
   - Use FALLBACK for non-critical features
   - Reserve MANUAL for unrecoverable errors

5. **Don't expose sensitive information**
   - Error messages should be helpful but secure
   - Log detailed errors server-side only

## Configuration

Error handling behavior can be configured through:

```javascript
// Maximum retry attempts
errorHandler.maxRetries = 3;

// Retry delay (milliseconds)
errorHandler.retryDelay = 1000;

// Maximum error log size
errorHandler.maxLogSize = 1000;
```

## Monitoring and Debugging

### Error Statistics

```javascript
const stats = errorHandler.getErrorStats();
console.log(stats);
// {
//   total: 42,
//   bySeverity: { low: 10, medium: 25, high: 7, critical: 0 },
//   byCategory: { network: 15, validation: 20, ... },
//   recent: [...]
// }
```

### Error Event Listeners

```javascript
errorHandler.addErrorListener((error) => {
    // Custom error handling logic
    if (error.severity === ErrorSeverity.CRITICAL) {
        // Send to monitoring service
    }
});
```

## Migration Guide

To integrate the error handling system into existing code:

1. Replace `console.error()` with `errorHandler.handleError()`
2. Wrap async operations with `withErrorHandling`
3. Use `MLOpsError` for custom errors
4. Add recovery strategies where appropriate
5. Provide user-friendly error messages

## Future Enhancements

- Integration with external error monitoring services
- Error analytics and reporting dashboard
- Automated error pattern detection
- Smart retry strategies based on error history