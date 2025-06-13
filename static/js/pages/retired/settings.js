import { API } from '../common/api.js';
import { Card, Metric, ProgressBar, Grid, ButtonGroup, UploadArea, ChartContainer, initializeUIComponents } from '../components/ui-components.js';
import { BasePageController } from '../common/lifecycle.js';
import { demoData } from '../common/demo-data.js';
import { CONFIG } from '../common/config.js';
import { ErrorHandler, ErrorSeverity, ErrorCategory, RecoveryStrategy } from '../common/error-handler.js';
import { withErrorHandling } from '../common/error-utils.js';

/**
 * Settings Page Controller
 * Handles application settings management and configuration
 */
class Settings extends BasePageController {
    constructor() {
        super(); // Initialize lifecycle management
        
        this.settings = {};
        this.defaultSettings = {
            defaultModel: 'automatic',
            trainingTimeout: 15,
            autoValidation: true,
            trainingNotifications: true,
            errorNotifications: true,
            emailAddress: '',
            dataCleanup: 30,
            maxFileSize: 50,
            showTechnical: false,
            debugMode: false
        };
        
        this.init();
    }
    
    async init() {
        // Initialize components
        this.initializeComponents();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial data
        await this.loadInitialData();
    }
    
    initializeComponents() {
        // Initialize UI components
        initializeUIComponents();
        
        // Replace static cards with dynamic components
        this.renderDynamicCards();
    }
    
    setupEventListeners() {
        // Save settings button - using managed event listener
        const saveButton = document.getElementById('saveSettings');
        if (saveButton) {
            this.addEventListener(saveButton, 'click', () => this.saveSettings());
        }
        
        // Reset settings button - using managed event listener
        const resetButton = document.getElementById('resetSettings');
        if (resetButton) {
            this.addEventListener(resetButton, 'click', () => this.resetSettings());
        }
        
        // Form validation handlers - using managed event listeners
        const form = document.getElementById('settingsForm');
        if (form) {
            this.addEventListener(form, 'change', (e) => this.handleFormChange(e));
            this.addEventListener(form, 'input', (e) => this.handleFormInput(e));
        }
        
        // Environment mode toggle - using managed event listener
        const debugMode = document.getElementById('debugMode');
        if (debugMode) {
            this.addEventListener(debugMode, 'change', (e) => this.handleDebugModeChange(e));
        }
    }
    
    async loadInitialData() {
        try {
            await this.loadSettings();
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.HIGH,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                userMessage: 'Failed to load settings. Using default values.',
                context: { component: 'Settings', action: 'loadInitialData' }
            });
            this.showNotification('Failed to load settings', 'error');
        }
    }
    
    async loadSettings() {
        try {
            let settings = null;
            
            if (CONFIG.DEMO.ENABLED) {
                // Use demo settings in demo mode
                settings = this.getDemoSettings();
            } else {
                // Load real settings from backend API
                settings = await API.getSettings();
            }
            
            // Merge with defaults
            this.settings = { ...this.defaultSettings, ...settings };
            
            // Populate form with loaded settings
            this.populateForm(this.settings);
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.FALLBACK,
                userMessage: 'Unable to load saved settings. Using default configuration.',
                context: { component: 'Settings', action: 'loadSettings' }
            });
            // Fallback to defaults on error
            this.settings = { ...this.defaultSettings };
            this.populateForm(this.settings);
            this.showNotification('Failed to load settings, using defaults', 'warning');
        }
    }
    
    getDemoSettings() {
        // Return demo settings with some realistic values
        return {
            defaultModel: 'automatic',
            trainingTimeout: 20,
            autoValidation: true,
            trainingNotifications: true,
            errorNotifications: true,
            emailAddress: 'demo@example.com',
            dataCleanup: 30,
            maxFileSize: 100,
            showTechnical: CONFIG.DEBUG.ENABLED,
            debugMode: CONFIG.DEBUG.ENABLED
        };
    }
    
    populateForm(settings) {
        // Populate form fields with settings values
        const elements = {
            defaultModel: settings.defaultModel,
            trainingTimeout: settings.trainingTimeout,
            autoValidation: settings.autoValidation,
            trainingNotifications: settings.trainingNotifications,
            errorNotifications: settings.errorNotifications,
            emailAddress: settings.emailAddress,
            dataCleanup: settings.dataCleanup,
            maxFileSize: settings.maxFileSize,
            showTechnical: settings.showTechnical,
            debugMode: settings.debugMode
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });
    }
    
    async saveSettings() {
        try {
            // Collect form values
            const formSettings = this.collectFormValues();
            
            // Validate settings
            const validation = this.validateSettings(formSettings);
            if (!validation.valid) {
                this.showNotification(validation.message, 'error');
                return;
            }
            
            if (CONFIG.DEMO.ENABLED) {
                // Simulate save in demo mode
                await new Promise(resolve => setTimeout(resolve, 500));
                this.settings = { ...formSettings };
                this.showNotification('Settings saved successfully! (Demo Mode)', 'success');
            } else {
                // Save real settings to backend
                await API.saveSettings(formSettings);
                this.settings = { ...formSettings };
                this.showNotification('Settings saved successfully!', 'success');
            }
            
        } catch (error) {
            ErrorHandler.handleError(error, {
                severity: ErrorSeverity.MEDIUM,
                category: ErrorCategory.NETWORK,
                recovery: RecoveryStrategy.RETRY,
                userMessage: 'Failed to save settings. Please try again.',
                context: { component: 'Settings', action: 'saveSettings', formData: formSettings }
            });
            this.showNotification('Failed to save settings', 'error');
        }
    }
    
    collectFormValues() {
        return {
            defaultModel: document.getElementById('defaultModel')?.value || 'automatic',
            trainingTimeout: parseInt(document.getElementById('trainingTimeout')?.value || 15),
            autoValidation: document.getElementById('autoValidation')?.checked || false,
            trainingNotifications: document.getElementById('trainingNotifications')?.checked || false,
            errorNotifications: document.getElementById('errorNotifications')?.checked || false,
            emailAddress: document.getElementById('emailAddress')?.value || '',
            dataCleanup: parseInt(document.getElementById('dataCleanup')?.value || 30),
            maxFileSize: parseInt(document.getElementById('maxFileSize')?.value || 50),
            showTechnical: document.getElementById('showTechnical')?.checked || false,
            debugMode: document.getElementById('debugMode')?.checked || false
        };
    }
    
    validateSettings(settings) {
        // Training timeout validation
        if (settings.trainingTimeout < 5 || settings.trainingTimeout > 60) {
            return {
                valid: false,
                message: 'Training timeout must be between 5 and 60 minutes'
            };
        }
        
        // Max file size validation
        if (settings.maxFileSize < 1 || settings.maxFileSize > 100) {
            return {
                valid: false,
                message: 'Max file size must be between 1 and 100 MB'
            };
        }
        
        // Email validation (if provided)
        if (settings.emailAddress && !this.isValidEmail(settings.emailAddress)) {
            return {
                valid: false,
                message: 'Please enter a valid email address'
            };
        }
        
        return { valid: true };
    }
    
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    resetSettings() {
        // Reset to default values
        this.populateForm(this.defaultSettings);
        this.showNotification('Settings reset to defaults', 'warning');
    }
    
    handleFormChange(event) {
        // Handle form field changes for validation
        const field = event.target;
        this.validateField(field);
    }
    
    handleFormInput(event) {
        // Handle real-time input validation
        const field = event.target;
        this.validateField(field);
    }
    
    validateField(field) {
        // Individual field validation
        switch (field.id) {
            case 'trainingTimeout':
                const timeout = parseInt(field.value);
                if (timeout < 5 || timeout > 60) {
                    field.setCustomValidity('Training timeout must be between 5 and 60 minutes');
                } else {
                    field.setCustomValidity('');
                }
                break;
                
            case 'maxFileSize':
                const size = parseInt(field.value);
                if (size < 1 || size > 100) {
                    field.setCustomValidity('Max file size must be between 1 and 100 MB');
                } else {
                    field.setCustomValidity('');
                }
                break;
                
            case 'emailAddress':
                if (field.value && !this.isValidEmail(field.value)) {
                    field.setCustomValidity('Please enter a valid email address');
                } else {
                    field.setCustomValidity('');
                }
                break;
        }
    }
    
    handleDebugModeChange(event) {
        const isDebugMode = event.target.checked;
        
        if (isDebugMode) {
            this.showNotification('Debug mode enabled - additional logging will be shown', 'info');
        } else {
            this.showNotification('Debug mode disabled', 'info');
        }
    }
    
    showNotification(message, type = 'success') {
        // Dispatch custom notification event
        const event = new CustomEvent('notification', {
            detail: { message, type, timestamp: Date.now() }
        });
        window.dispatchEvent(event);
        
        // Also show in local notification area
        const notification = document.getElementById('notification');
        if (notification) {
            notification.innerHTML = `
                <div class="notification ${type}" style="
                    padding: var(--spacing-md);
                    border-radius: var(--radius-md);
                    background: var(--${type === 'success' ? 'success' : type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'info'}-color);
                    color: white;
                    margin-top: var(--spacing-md);
                ">
                    ${message}
                </div>
            `;
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                notification.innerHTML = '';
            }, 3000);
        }
        
        // Console logging for development
        const emoji = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        console.log(`${emoji[type] || 'ℹ️'} Settings: ${message}`);
    }
    
    renderDynamicCards() {
        // Replace all static cards with dynamic components
        this.replaceTrainingSettingsCard();
        this.replaceNotificationSettingsCard();
        this.replaceDataManagementCard();
        this.replaceAdvancedSettingsCard();
        this.replaceActionButtons();
    }
    
    replaceTrainingSettingsCard() {
        const cards = document.querySelectorAll('.card');
        let trainingCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Training Settings')) {
                trainingCard = card;
            }
        });
        
        if (!trainingCard) return;
        
        const trainingContent = document.createElement('div');
        
        // Copy existing form content
        const existingForm = trainingCard.querySelector('form');
        if (existingForm) {
            trainingContent.innerHTML = existingForm.outerHTML;
        }
        
        const newCard = Card.create({
            title: 'Training Settings',
            icon: '🎯',
            content: trainingContent,
            id: 'trainingSettingsCard'
        });
        
        trainingCard.parentNode.replaceChild(newCard, trainingCard);
    }
    
    replaceNotificationSettingsCard() {
        const cards = document.querySelectorAll('.card');
        let notificationCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Notification Settings')) {
                notificationCard = card;
            }
        });
        
        if (!notificationCard) return;
        
        const notificationContent = document.createElement('div');
        notificationContent.className = 'notification-settings';
        
        // Copy existing notification settings content
        const existingGrid = notificationCard.querySelector('.grid');
        if (existingGrid) {
            notificationContent.innerHTML = existingGrid.outerHTML;
        }
        
        const newCard = Card.create({
            title: 'Notification Settings',
            icon: '🔔',
            content: notificationContent,
            id: 'notificationSettingsCard'
        });
        
        notificationCard.parentNode.replaceChild(newCard, notificationCard);
    }
    
    replaceDataManagementCard() {
        const cards = document.querySelectorAll('.card');
        let dataCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Data Management')) {
                dataCard = card;
            }
        });
        
        if (!dataCard) return;
        
        const dataContent = document.createElement('div');
        dataContent.className = 'data-management-settings';
        
        // Copy existing data management content
        const existingGrid = dataCard.querySelector('.grid');
        if (existingGrid) {
            dataContent.innerHTML = existingGrid.outerHTML;
        }
        
        const newCard = Card.create({
            title: 'Data Management',
            icon: '💾',
            content: dataContent,
            id: 'dataManagementCard'
        });
        
        dataCard.parentNode.replaceChild(newCard, dataCard);
    }
    
    replaceAdvancedSettingsCard() {
        const cards = document.querySelectorAll('.card');
        let advancedCard = null;
        
        cards.forEach(card => {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.includes('Advanced Settings')) {
                advancedCard = card;
            }
        });
        
        if (!advancedCard) return;
        
        const advancedContent = document.createElement('div');
        advancedContent.className = 'advanced-settings';
        
        // Copy existing advanced settings content
        const existingGrid = advancedCard.querySelector('.grid');
        if (existingGrid) {
            advancedContent.innerHTML = existingGrid.outerHTML;
        }
        
        // Add environment detection info if in demo mode
        if (CONFIG.DEMO.ENABLED) {
            const envInfo = document.createElement('div');
            envInfo.style.cssText = 'margin-top: var(--spacing-md); padding: var(--spacing-sm); background: rgba(59, 130, 246, 0.1); border-radius: var(--radius-md); font-size: 0.9rem;';
            envInfo.innerHTML = `
                <strong>Environment:</strong> ${CONFIG.ENVIRONMENT} mode<br>
                <strong>Demo Mode:</strong> ${CONFIG.DEMO.ENABLED ? 'Enabled' : 'Disabled'}<br>
                <strong>Debug Mode:</strong> ${CONFIG.DEBUG.ENABLED ? 'Enabled' : 'Disabled'}
            `;
            advancedContent.appendChild(envInfo);
        }
        
        const newCard = Card.create({
            title: 'Advanced Settings',
            icon: '⚙️',
            content: advancedContent,
            id: 'advancedSettingsCard'
        });
        
        advancedCard.parentNode.replaceChild(newCard, advancedCard);
    }
    
    replaceActionButtons() {
        const buttonContainer = document.querySelector('[style*="text-align: center"]');
        if (!buttonContainer) return;
        
        const buttonGroup = ButtonGroup.create({
            buttons: [
                {
                    text: 'Save Settings',
                    icon: '💾',
                    variant: 'primary',
                    size: 'lg',
                    onClick: () => this.saveSettings()
                },
                {
                    text: 'Reset to Defaults',
                    icon: '🔄',
                    variant: 'secondary',
                    size: 'lg',
                    onClick: () => this.resetSettings()
                }
            ],
            alignment: 'center',
            id: 'settingsButtonGroup'
        });
        
        buttonContainer.innerHTML = '';
        buttonContainer.appendChild(buttonGroup);
    }

    /**
     * Custom cleanup logic for settings page
     */
    customCleanup() {
        // Clear settings data
        this.settings = {};
        
        console.log('Settings: Custom cleanup completed');
    }
}

// Initialize settings page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Settings();
});

export { Settings };