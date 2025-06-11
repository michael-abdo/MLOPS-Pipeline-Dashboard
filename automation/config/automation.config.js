/**
 * automation.config.js
 * Central configuration for automation framework
 */

module.exports = {
    // Base configuration
    baseUrl: process.env.BASE_URL || 'http://localhost:8000',
    
    // Browser options
    browser: {
        headless: process.env.HEADLESS !== 'false',
        slowMo: parseInt(process.env.SLOW_MO) || 50,
        devtools: process.env.DEVTOOLS === 'true',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    },
    
    // Viewport settings
    viewport: {
        width: 1280,
        height: 800
    },
    
    // Timeouts
    timeouts: {
        default: 30000,
        navigation: 30000,
        fileUpload: 60000,
        training: 300000 // 5 minutes for training
    },
    
    // Logging
    logging: {
        debug: process.env.DEBUG === 'true',
        screenshots: process.env.SCREENSHOTS !== 'false',
        video: process.env.VIDEO === 'true',
        logDir: './automation/logs',
        screenshotDir: './automation/screenshots'
    },
    
    // Test data
    testData: {
        csvFile: '../simple_test_data.csv',
        largeCSV: '../test_data/large_dataset.csv'
    },
    
    // Retry configuration
    retry: {
        attempts: 3,
        delay: 1000
    },
    
    // AI feedback configuration
    aiFeedback: {
        enabled: process.env.AI_FEEDBACK === 'true',
        endpoint: process.env.AI_ENDPOINT || 'http://localhost:8001/feedback',
        apiKey: process.env.AI_API_KEY
    }
};