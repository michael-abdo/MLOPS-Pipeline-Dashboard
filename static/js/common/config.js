/**
 * Environment Detection
 */
function detectEnvironment() {
    // Check URL parameters first
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('demo')) {
        return urlParams.get('demo') === 'true' ? 'demo' : 'production';
    }
    
    // Check localStorage
    const stored = localStorage.getItem('mlops_environment');
    if (stored) {
        return stored;
    }
    
    // Check hostname for development/demo indicators
    const hostname = window.location.hostname;
    if (hostname.includes('demo') || hostname.includes('localhost') || hostname.includes('dev')) {
        return 'demo';
    }
    
    // Default to production
    return 'production';
}

const ENVIRONMENT = detectEnvironment();
const IS_DEMO_MODE = ENVIRONMENT === 'demo';
const IS_DEBUG_MODE = ENVIRONMENT !== 'production';

/**
 * Global configuration for the MLOps dashboard
 */
export const CONFIG = {
    // Environment Configuration
    ENVIRONMENT,
    IS_DEMO_MODE,
    IS_DEBUG_MODE,
    
    // API Configuration
    API_BASE: '/api',
    WS_URL: `ws://${window.location.host}/ws`,
    
    // WebSocket Configuration
    WS_RECONNECT_DELAY: 1000,
    WS_MAX_RECONNECT_ATTEMPTS: 5,
    WS_PING_INTERVAL: 30000, // 30 seconds
    WS_PONG_TIMEOUT: 5000,   // 5 seconds
    
    // Page Routes
    PAGES: {
        DASHBOARD: '/',
        PIPELINE: '/pipeline',
        ARCHITECTURE: '/architecture',
        DATA: '/data',
        MONITORING: '/monitoring',
        SETTINGS: '/settings'
    },
    
    // UI Configuration
    NOTIFICATION_DURATION: 5000, // 5 seconds
    REFRESH_INTERVAL: 5000,      // 5 seconds
    
    // Demo Configuration
    DEMO: {
        ENABLED: IS_DEMO_MODE,
        SHOW_NOTICE: IS_DEMO_MODE,
        SIMULATE_DELAY: IS_DEMO_MODE,
        DELAY_RANGE: [500, 2000],
        FAKE_DATA: IS_DEMO_MODE
    },
    
    // Debug Configuration
    DEBUG: {
        ENABLED: IS_DEBUG_MODE,
        LOG_API: IS_DEBUG_MODE,
        LOG_STATE: IS_DEBUG_MODE,
        LOG_WEBSOCKET: IS_DEBUG_MODE
    },
    
    // Quality Thresholds
    CONNECTION_QUALITY: {
        EXCELLENT: { latency: 50, label: 'excellent' },
        GOOD: { latency: 150, label: 'good' },
        FAIR: { latency: 300, label: 'fair' },
        POOR: { latency: Infinity, label: 'poor' }
    },
    
    // System Health Thresholds
    HEALTH_THRESHOLDS: {
        CPU_WARNING: 80,
        CPU_CRITICAL: 90,
        MEMORY_WARNING: 80,
        MEMORY_CRITICAL: 90,
        DISK_WARNING: 90,
        DISK_CRITICAL: 95
    },
    
    // Model Metrics Configuration
    MODEL_METRICS: {
        // Refresh intervals (milliseconds)
        REFRESH_INTERVAL: 2000,        // 2 seconds for real-time updates
        BATCH_UPDATE_DELAY: 50,        // 50ms debounce for batch updates
        TREND_CALCULATION_WINDOW: 5,   // Number of data points for trend calculation
        
        // Accuracy thresholds (percentages)
        ACCURACY_THRESHOLDS: {
            EXCELLENT: 95,             // Above 95% - green
            GOOD: 90,                  // 90-95% - green
            WARNING: 85,               // 85-90% - yellow
            CRITICAL: 80,              // 80-85% - orange
            POOR: 0                    // Below 80% - red
        },
        
        // Response time thresholds (milliseconds)
        RESPONSE_TIME_THRESHOLDS: {
            EXCELLENT: 50,             // Under 50ms - green
            GOOD: 100,                 // 50-100ms - green
            WARNING: 200,              // 100-200ms - yellow
            CRITICAL: 500,             // 200-500ms - orange
            POOR: Infinity             // Over 500ms - red
        },
        
        // Prediction rate thresholds (predictions per minute)
        PREDICTION_RATE_THRESHOLDS: {
            HIGH: 100,                 // Above 100/min - high activity
            MODERATE: 50,              // 50-100/min - moderate activity
            LOW: 10,                   // 10-50/min - low activity
            MINIMAL: 0                 // Below 10/min - minimal activity
        },
        
        // WebSocket rate limiting
        WS_RATE_LIMITING: {
            MAX_UPDATES_PER_SECOND: 10,   // Maximum 10 updates per second
            BURST_ALLOWANCE: 20,          // Allow burst of 20 updates
            COOLDOWN_PERIOD: 1000         // 1 second cooldown after burst
        },
        
        // Visual indicator settings
        VISUAL_INDICATORS: {
            TREND_ARROW_THRESHOLD: 0.5,    // Minimum change % to show trend arrow
            PULSE_ANIMATION_DURATION: 1500, // Pulse animation duration in ms
            SMOOTH_TRANSITION_DURATION: 300, // Smooth value transition duration
            COLOR_TRANSITION_DURATION: 500  // Color change transition duration
        },
        
        // Health status mappings
        HEALTH_STATUS: {
            HEALTHY: { color: '#10b981', icon: '✅', label: 'Healthy' },
            WARNING: { color: '#f59e0b', icon: '⚠️', label: 'Warning' },
            CRITICAL: { color: '#ef4444', icon: '❌', label: 'Critical' },
            UNKNOWN: { color: '#6b7280', icon: '❓', label: 'Unknown' }
        }
    }
};

/**
 * Environment Management Functions
 */
export const EnvironmentManager = {
    /**
     * Switch environment mode
     */
    switchEnvironment(newEnvironment) {
        localStorage.setItem('mlops_environment', newEnvironment);
        
        // Notify about environment change
        const event = new CustomEvent('environmentChanged', {
            detail: { 
                environment: newEnvironment,
                previousEnvironment: ENVIRONMENT
            }
        });
        window.dispatchEvent(event);
        
        // Recommend page reload for full effect
        if (confirm(`Environment switched to ${newEnvironment}. Reload page to apply changes?`)) {
            window.location.reload();
        }
    },
    
    /**
     * Get current environment info
     */
    getEnvironmentInfo() {
        return {
            environment: ENVIRONMENT,
            isDemoMode: IS_DEMO_MODE,
            isDebugMode: IS_DEBUG_MODE,
            hostname: window.location.hostname,
            timestamp: new Date().toISOString()
        };
    },
    
    /**
     * Toggle demo mode
     */
    toggleDemoMode() {
        const newEnvironment = IS_DEMO_MODE ? 'production' : 'demo';
        this.switchEnvironment(newEnvironment);
    }
};

// Freeze configuration to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.PAGES);
Object.freeze(CONFIG.DEMO);
Object.freeze(CONFIG.DEBUG);
Object.freeze(CONFIG.CONNECTION_QUALITY);
Object.freeze(CONFIG.HEALTH_THRESHOLDS);
Object.freeze(CONFIG.MODEL_METRICS);
Object.freeze(CONFIG.MODEL_METRICS.ACCURACY_THRESHOLDS);
Object.freeze(CONFIG.MODEL_METRICS.RESPONSE_TIME_THRESHOLDS);
Object.freeze(CONFIG.MODEL_METRICS.PREDICTION_RATE_THRESHOLDS);
Object.freeze(CONFIG.MODEL_METRICS.WS_RATE_LIMITING);
Object.freeze(CONFIG.MODEL_METRICS.VISUAL_INDICATORS);
Object.freeze(CONFIG.MODEL_METRICS.HEALTH_STATUS);

// Make environment manager available globally for debugging
if (typeof window !== 'undefined') {
    window.EnvironmentManager = EnvironmentManager;
}