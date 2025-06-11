/**
 * Global configuration for the MLOps dashboard
 */
export const CONFIG = {
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

// Freeze configuration to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.PAGES);
Object.freeze(CONFIG.CONNECTION_QUALITY);
Object.freeze(CONFIG.HEALTH_THRESHOLDS);