import { CONFIG } from './config.js';

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
        
        try {
            this.ws = new WebSocket(CONFIG.WS_URL);
            
            this.ws.onopen = () => this.handleOpen();
            this.ws.onmessage = (event) => this.handleMessage(event);
            this.ws.onclose = () => this.handleClose();
            this.ws.onerror = (error) => this.handleError(error);
            
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.handleError(error);
        }
    }
    
    /**
     * Handle WebSocket open event
     */
    handleOpen() {
        console.log('WebSocket connected');
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
        try {
            const data = JSON.parse(event.data);
            
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
            console.error('Error parsing WebSocket message:', error);
        }
    }
    
    /**
     * Handle WebSocket close event
     */
    handleClose() {
        console.log('WebSocket disconnected');
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
        console.error('WebSocket error:', error);
        this.updateStatus('error');
        this.emit('error', { error: error.message || 'Unknown error' });
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
        
        console.log(`Reconnecting in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);
        
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
                    console.error(`Error in ${event} listener:`, error);
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