/**
 * DashboardPage.js
 * Page Object Model for MLOps Dashboard
 * Encapsulates all dashboard-specific interactions
 */

const BaseAutomation = require('../core/BaseAutomation');
const path = require('path');

class DashboardPage extends BaseAutomation {
    constructor(options = {}) {
        super(options);
        this.logger.name = 'DashboardPage';
        
        // Define all selectors in one place for maintainability
        this.selectors = {
            // Navigation
            navDashboard: 'a[href="#dashboard"]',
            navSettings: 'a[href="#settings"]',
            
            // Upload area
            uploadArea: '.upload-area',
            fileInput: '#fileInput',
            uploadIcon: '.upload-icon',
            uploadStatus: '.upload-status',
            uploadTitle: '.upload-area h4',
            
            // Buttons
            trainButton: '#trainButton',
            useModelButton: 'button:has-text("Use This Model")',
            viewDetailsButton: 'button:has-text("View Details")',
            
            // Workflow steps
            workflowSteps: '.workflow-steps .step',
            stepUpload: '.step:nth-child(1)',
            stepTrain: '.step:nth-child(2)',
            stepResults: '.step:nth-child(3)',
            stepDeploy: '.step:nth-child(4)',
            
            // Progress indicators
            progressBar: '.progress-fill',
            progressLabel: '.progress-label span:last-child',
            
            // Metrics
            accuracyMetric: '.metric-value:first-child',
            predictionsMetric: '.metric-value:nth-child(2)',
            responseTimeMetric: '.metric-value:nth-child(3)',
            
            // Status indicators
            currentStatus: '.status-indicator',
            statusDot: '.status-dot',
            
            // Activity log
            activityLog: '.card:last-child > div:last-child',
            activityItems: '.card:last-child > div:last-child > div',
            
            // Alerts and messages
            alertSuccess: '.alert-success',
            alertError: '.alert-error',
            spinner: '.spinner'
        };
        
        this.baseUrl = options.baseUrl || 'http://localhost:8000';
    }

    /**
     * Navigate to dashboard
     */
    async open() {
        this.logger.section('Opening MLOps Dashboard');
        await this.navigate(this.baseUrl);
        
        // Verify dashboard loaded
        await this.waitForSelector(this.selectors.uploadArea);
        this.logger.success('Dashboard loaded successfully');
        
        return this;
    }

    /**
     * Upload CSV file with comprehensive feedback
     */
    async uploadCSV(filePath) {
        this.logger.section('CSV Upload Process');
        
        try {
            // Check if file input exists
            const fileInputExists = await this.exists(this.selectors.fileInput);
            if (!fileInputExists) {
                throw new Error('File input not found on page');
            }
            
            // Get initial upload area text
            const initialText = await this.getText(this.selectors.uploadArea);
            this.logger.debug('Initial upload area text:', initialText);
            
            // Upload file
            this.logger.info(`Uploading file: ${path.basename(filePath)}`);
            await this.uploadFile(this.selectors.fileInput, filePath);
            
            // Wait for upload to process
            this.logger.info('Waiting for upload to process...');
            await this.waitForUploadSuccess();
            
            // Get upload confirmation
            const uploadStatus = await this.getUploadStatus();
            this.logger.success('Upload completed:', uploadStatus);
            
            // Verify train button is enabled
            const trainButtonEnabled = await this.isTrainButtonEnabled();
            if (!trainButtonEnabled) {
                throw new Error('Train button not enabled after upload');
            }
            
            return uploadStatus;
            
        } catch (error) {
            this.logger.error('CSV upload failed:', error.message);
            await this.takeScreenshot('upload-failed');
            throw error;
        }
    }

    /**
     * Wait for upload success indication
     */
    async waitForUploadSuccess() {
        this.logger.debug('Waiting for upload success indication');
        
        // Wait for the upload icon to change to checkmark AND title to show success
        await this.page.waitForFunction(
            (iconSel, titleSel) => {
                const icon = document.querySelector(iconSel);
                const title = document.querySelector(titleSel);
                // Look for success icon and success message
                return icon && icon.textContent.includes('✅') && 
                       title && title.textContent.toLowerCase().includes('success');
            },
            { timeout: 10000 },
            this.selectors.uploadIcon,
            this.selectors.uploadTitle
        );
        
        this.logger.debug('Upload success indicators detected');
    }

    /**
     * Get detailed upload status
     */
    async getUploadStatus() {
        const statusText = await this.getText(this.selectors.uploadArea);
        
        // Parse rows and columns from status text
        const rowsMatch = statusText.match(/(\d+)\s*rows/);
        const columnsMatch = statusText.match(/(\d+)\s*columns/);
        
        // Extract filename from success message
        const filenameMatch = statusText.match(/([^\/\\]+\.csv)/i);
        
        return {
            success: statusText.toLowerCase().includes('success'),
            filename: filenameMatch ? filenameMatch[1] : 'unknown',
            rows: rowsMatch ? parseInt(rowsMatch[1]) : 0,
            columns: columnsMatch ? parseInt(columnsMatch[1]) : 0,
            fullText: statusText
        };
    }

    /**
     * Start model training
     */
    async startTraining() {
        this.logger.section('Starting Model Training');
        
        try {
            // Verify train button is enabled
            const enabled = await this.isTrainButtonEnabled();
            if (!enabled) {
                throw new Error('Train button is not enabled');
            }
            
            // Click train button
            await this.click(this.selectors.trainButton);
            
            // Wait for training to start (button text changes)
            await this.page.waitForFunction(
                selector => {
                    const button = document.querySelector(selector);
                    return button && button.textContent.includes('Training');
                },
                { timeout: 5000 },
                this.selectors.trainButton
            );
            
            this.logger.success('Training started successfully');
            
            // Monitor training progress
            return await this.monitorTrainingProgress();
            
        } catch (error) {
            this.logger.error('Failed to start training:', error.message);
            await this.takeScreenshot('training-start-failed');
            throw error;
        }
    }

    /**
     * Monitor training progress with detailed logging
     */
    async monitorTrainingProgress() {
        this.logger.section('Monitoring Training Progress');
        
        const progressHistory = [];
        let lastProgress = 0;
        let completed = false;
        
        while (!completed) {
            try {
                // Get current progress
                const progress = await this.getTrainingProgress();
                
                // Log progress if changed
                if (progress.percentage > lastProgress) {
                    this.logger.progress(progress.percentage, 100, progress.status);
                    progressHistory.push({
                        timestamp: new Date().toISOString(),
                        ...progress
                    });
                    lastProgress = progress.percentage;
                }
                
                // Check if completed
                if (progress.percentage >= 100 || progress.completed) {
                    completed = true;
                    this.logger.success('\nTraining completed!');
                    
                    // Get final metrics
                    const metrics = await this.getModelMetrics();
                    return {
                        success: true,
                        progressHistory,
                        finalMetrics: metrics
                    };
                }
                
                // Check for errors
                if (progress.error) {
                    throw new Error(`Training failed: ${progress.error}`);
                }
                
                // Wait before next check
                await this.wait(1000);
                
            } catch (error) {
                this.logger.error('Training monitoring error:', error.message);
                return {
                    success: false,
                    error: error.message,
                    progressHistory
                };
            }
        }
    }

    /**
     * Get current training progress
     */
    async getTrainingProgress() {
        try {
            const progressText = await this.getText(this.selectors.progressLabel);
            const percentage = parseInt(progressText.replace('%', '')) || 0;
            
            // Check workflow step states
            const steps = await this.getWorkflowStepStates();
            
            // Check if training is complete
            const buttonText = await this.getText(this.selectors.trainButton);
            const completed = buttonText === 'Start Training' && percentage === 100;
            
            return {
                percentage,
                status: progressText,
                completed,
                workflowSteps: steps,
                buttonState: buttonText
            };
            
        } catch (error) {
            return {
                percentage: 0,
                error: error.message
            };
        }
    }

    /**
     * Get workflow step states
     */
    async getWorkflowStepStates() {
        const steps = await this.page.$$eval(this.selectors.workflowSteps, elements => {
            return elements.map((el, index) => ({
                step: index + 1,
                title: el.querySelector('.step-title')?.textContent || '',
                completed: el.classList.contains('completed'),
                active: el.classList.contains('active'),
                error: el.classList.contains('error')
            }));
        });
        
        return steps;
    }

    /**
     * Get model metrics after training
     */
    async getModelMetrics() {
        this.logger.debug('Getting model metrics');
        
        try {
            const accuracy = await this.getText(this.selectors.accuracyMetric);
            const predictions = await this.getText(this.selectors.predictionsMetric);
            const responseTime = await this.getText(this.selectors.responseTimeMetric);
            
            return {
                accuracy,
                predictions,
                responseTime
            };
            
        } catch (error) {
            this.logger.error('Failed to get metrics:', error.message);
            return null;
        }
    }

    /**
     * Deploy the trained model
     */
    async deployModel() {
        this.logger.section('Deploying Model');
        
        try {
            // Click "Use This Model" button
            await this.click(this.selectors.useModelButton);
            
            // Wait for deployment confirmation
            await this.page.waitForFunction(
                () => {
                    const alert = window.alert;
                    return alert && alert.toString().includes('Model Deployed');
                },
                { timeout: 5000 }
            );
            
            // Check workflow completion
            const steps = await this.getWorkflowStepStates();
            const allCompleted = steps.every(step => step.completed);
            
            if (!allCompleted) {
                throw new Error('Not all workflow steps completed after deployment');
            }
            
            this.logger.success('Model deployed successfully');
            return true;
            
        } catch (error) {
            this.logger.error('Deployment failed:', error.message);
            await this.takeScreenshot('deployment-failed');
            throw error;
        }
    }

    /**
     * Get activity log entries
     */
    async getActivityLog() {
        this.logger.debug('Getting activity log');
        
        try {
            const activities = await this.page.$$eval(this.selectors.activityItems, elements => {
                return elements.map(el => ({
                    title: el.querySelector('strong')?.textContent || '',
                    description: el.querySelector('p')?.textContent || '',
                    status: el.querySelector('.status-indicator')?.textContent?.trim() || ''
                }));
            });
            
            return activities;
            
        } catch (error) {
            this.logger.error('Failed to get activity log:', error.message);
            return [];
        }
    }

    /**
     * Check if train button is enabled
     */
    async isTrainButtonEnabled() {
        const disabled = await this.page.$eval(
            this.selectors.trainButton,
            button => button.disabled
        );
        
        return !disabled;
    }

    /**
     * Validate complete workflow
     */
    async validateCompleteWorkflow() {
        this.logger.section('Validating Complete Workflow');
        
        const validation = {
            uploadAreaVisible: await this.exists(this.selectors.uploadArea),
            trainButtonExists: await this.exists(this.selectors.trainButton),
            workflowStepsVisible: await this.exists(this.selectors.workflowSteps),
            metricsVisible: await this.exists(this.selectors.accuracyMetric),
            activityLogVisible: await this.exists(this.selectors.activityLog)
        };
        
        const allValid = Object.values(validation).every(v => v);
        
        this.logger.info('Workflow validation:', validation);
        
        return {
            valid: allValid,
            details: validation
        };
    }
}

module.exports = DashboardPage;