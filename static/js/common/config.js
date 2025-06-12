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

// Make environment manager available globally for debugging
if (typeof window !== 'undefined') {
    window.EnvironmentManager = EnvironmentManager;
}