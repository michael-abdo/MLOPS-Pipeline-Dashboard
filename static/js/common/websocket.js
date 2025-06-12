import { CONFIG } from './config.js';
import { 
    errorHandler,
    MLOpsError,
    ErrorSeverity,
    ErrorCategory,
    RecoveryStrategy
} from './error-handler.js';
import { withErrorHandling, safeParse } from './error-utils.js';

/**
 * WebSocket Manager Singleton
 * Manages a single WebSocket connection across all pages
 */
export class WebSocketManager {
    constructor() {
        if (WebSocketManager.instance) {
            return WebSocketManager.instance;
        }
        
        this.ws = null;
        this.connectionStatus = 'disconnected';
        this.reconnectAttempts = 0;
        this.listeners = new Map();
        this.lastPing = Date.now();
        this.latency = 0;
        this.connectionQuality = 'good';
        this.pingInterval = null;
        this.reconnectTimeout = null;
        
        WebSocketManager.instance = this;
        
        // Auto-connect on instantiation
        this.connect();
    }
    
    /**
     * Connect to WebSocket server
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }
        
        this.updateStatus('connecting');
        
        return withErrorHandling.websocket(async () => {
            this.ws = new WebSocket(CONFIG.WS_URL);
            
            this.ws.onopen = () => this.handleOpen();
            this.ws.onmessage = (event) => this.handleMessage(event);
            this.ws.onclose = () => this.handleClose();
            this.ws.onerror = (error) => this.handleError(error);
            
        }, 'connection_setup', {
            severity: ErrorSeverity.HIGH,
            recovery: RecoveryStrategy.RETRY,
            context: { 
                url: CONFIG.WS_URL,
                attempt: this.reconnectAttempts + 1
            },
            retryFunction: () => this.connect()
        }).catch(error => {
            this.handleConnectionError(error);
        });
    }
    
    /**
     * Handle WebSocket open event
     */
    handleOpen() {
        this.updateStatus('connected');
        this.reconnectAttempts = 0;
        
        // Clear any existing reconnect timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        // Start ping/pong for connection quality monitoring
        this.startPingPong();
        
        // Notify all listeners
        this.emit('connected', { timestamp: Date.now() });
    }
    
    /**
     * Handle incoming WebSocket messages
     */
    handleMessage(event) {
        const data = safeParse(event.data, null, {
            operation: 'websocket_message_parse',
            rawMessage: event.data.substring(0, 100)
        });
        
        if (data === null) {
            // Error was already handled by safeParse
            return;
        }
        
        try {
            // Handle pong response for latency measurement
            if (data.type === 'pong') {
                this.handlePong(data);
                return;
            }
            
            // Emit message to all listeners
            this.emit('message', data);
            
            // Emit specific event types
            if (data.type) {
                this.emit(data.type, data);
            }
            
        } catch (error) {
            const messageError = new MLOpsError('WebSocket message handling failed', {
                severity: ErrorSeverity.LOW,
                category: ErrorCategory.WEBSOCKET,
                recovery: RecoveryStrategy.NONE,
                originalError: error,
                userMessage: 'Real-time data processing error',
                showToUser: false,
                context: { 
                    messageType: data.type,
                    operation: 'message_handling'
                }
            });
            
            errorHandler.handleError(messageError);
        }
    }
    
    /**
     * Handle WebSocket close event
     */
    handleClose() {
        this.ws = null;
        
        // Stop ping/pong
        this.stopPingPong();
        
        // Update status based on reconnect attempts
        if (this.reconnectAttempts < CONFIG.WS_MAX_RECONNECT_ATTEMPTS) {
            this.updateStatus('reconnecting');
            this.scheduleReconnect();
        } else {
            this.updateStatus('disconnected');
            this.emit('max_reconnect_attempts', { attempts: this.reconnectAttempts });
        }
        
        this.emit('disconnected', { timestamp: Date.now() });
    }
    
    /**
     * Handle WebSocket errors
     */
    handleError(error) {
        const wsError = new MLOpsError('WebSocket connection error', {
            severity: this.reconnectAttempts < CONFIG.WS_MAX_RECONNECT_ATTEMPTS ? 
                ErrorSeverity.MEDIUM : ErrorSeverity.HIGH,
            category: ErrorCategory.WEBSOCKET,
            recovery: this.reconnectAttempts < CONFIG.WS_MAX_RECONNECT_ATTEMPTS ? 
                RecoveryStrategy.RETRY : RecoveryStrategy.MANUAL,
            originalError: error,
            userMessage: this.reconnectAttempts < CONFIG.WS_MAX_RECONNECT_ATTEMPTS ?
                'Real-time connection lost. Attempting to reconnect...' :
                'Real-time connection failed. Please refresh the page.',
            context: {
                attempt: this.reconnectAttempts,
                maxAttempts: CONFIG.WS_MAX_RECONNECT_ATTEMPTS,
                operation: 'websocket_error'
            }
        });
        
        errorHandler.handleError(wsError);
        this.updateStatus('error');
        this.emit('error', { error: error.message || 'Unknown error', errorId: wsError.id });
    }

    /**
     * Handle connection-specific errors
     */
    handleConnectionError(error) {
        const connectionError = new MLOpsError('Failed to establish WebSocket connection', {
            severity: ErrorSeverity.HIGH,
            category: ErrorCategory.WEBSOCKET,
            recovery: RecoveryStrategy.RETRY,
            originalError: error,
            userMessage: 'Unable to establish real-time connection. Please check your network connection.',
            context: {
                url: CONFIG.WS_URL,
                attempt: this.reconnectAttempts,
                operation: 'connection_establishment'
            },
            retryFunction: () => this.connect()
        });
        
        errorHandler.handleError(connectionError);
        this.updateStatus('error');
    }
    
    /**
     * Schedule reconnection with exponential backoff
     */
    scheduleReconnect() {
        this.reconnectAttempts++;
        
        // Calculate delay with exponential backoff and jitter
        const baseDelay = CONFIG.WS_RECONNECT_DELAY;
        const maxDelay = baseDelay * Math.pow(2, Math.min(this.reconnectAttempts - 1, 5));
        const jitter = Math.random() * 0.3 * maxDelay;
        const delay = Math.min(maxDelay + jitter, 30000); // Max 30 seconds
        
        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, delay);
    }
    
    /**
     * Start ping/pong for connection quality monitoring
     */
    startPingPong() {
        this.stopPingPong(); // Clear any existing interval
        
        this.pingInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const pingTime = Date.now();
                this.send({
                    type: 'ping',
                    timestamp: pingTime
                });
                
                // Set timeout for pong response
                setTimeout(() => {
                    if (Date.now() - this.lastPing > CONFIG.WS_PONG_TIMEOUT) {
                        console.warn('Pong timeout - connection may be degraded');
                        this.updateConnectionQuality(Infinity);
                    }
                }, CONFIG.WS_PONG_TIMEOUT);
            }
        }, CONFIG.WS_PING_INTERVAL);
    }
    
    /**
     * Stop ping/pong interval
     */
    stopPingPong() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    /**
     * Handle pong response
     */
    handlePong(data) {
        const now = Date.now();
        this.lastPing = now;
        
        if (data.timestamp) {
            this.latency = now - data.timestamp;
            this.updateConnectionQuality(this.latency);
        }
    }
    
    /**
     * Update connection quality based on latency
     */
    updateConnectionQuality(latency) {
        let quality = 'poor';
        
        for (const [key, config] of Object.entries(CONFIG.CONNECTION_QUALITY)) {
            if (latency <= config.latency) {
                quality = config.label;
                break;
            }
        }
        
        if (quality !== this.connectionQuality) {
            this.connectionQuality = quality;
            this.emit('quality_changed', { quality, latency });
        }
    }
    
    /**
     * Update connection status
     */
    updateStatus(status) {
        if (status !== this.connectionStatus) {
            this.connectionStatus = status;
            this.emit('status_changed', { status });
        }
    }
    
    /**
     * Send data through WebSocket
     */
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            return true;
        }
        return false;
    }
    
    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
                callbacks.delete(callback);
            }
        };
    }
    
    /**
     * Remove event listener
     */
    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    }
    
    /**
     * Emit event to all listeners
     */
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    const listenerError = new MLOpsError(`WebSocket listener error for event ${event}`, {
                        severity: ErrorSeverity.LOW,
                        category: ErrorCategory.WEBSOCKET,
                        recovery: RecoveryStrategy.NONE,
                        originalError: error,
                        userMessage: 'Real-time event processing error',
                        showToUser: false,
                        context: {
                            event,
                            operation: 'listener_callback'
                        }
                    });
                    
                    errorHandler.handleError(listenerError);
                }
            });
        }
    }
    
    /**
     * Get current connection info
     */
    getConnectionInfo() {
        return {
            status: this.connectionStatus,
            quality: this.connectionQuality,
            latency: this.latency,
            reconnectAttempts: this.reconnectAttempts,
            isConnected: this.ws && this.ws.readyState === WebSocket.OPEN
        };
    }
    
    /**
     * Manually close connection
     */
    close() {
        this.stopPingPong();
        
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        this.updateStatus('disconnected');
    }
    
    /**
     * Manually reconnect
     */
    reconnect() {
        this.close();
        this.reconnectAttempts = 0;
        this.connect();
    }
}

// Export singleton instance
export const wsManager = new WebSocketManager();