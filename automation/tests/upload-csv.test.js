/**
 * upload-csv.test.js
 * Automated test for CSV upload functionality
 * Demonstrates complete automation flow with detailed debugging
 */

const DashboardPage = require('../pages/DashboardPage');
const Logger = require('../utils/Logger');
const path = require('path');
const fs = require('fs').promises;

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    debug: args.includes('--debug'),
    headed: args.includes('--headed'),
    video: args.includes('--video'),
    slowMo: args.includes('--slow') ? 250 : 50
};

// Create main logger
const logger = new Logger('CSVUploadTest', options.debug);

/**
 * Main test function
 */
async function testCSVUpload() {
    logger.section('CSV UPLOAD AUTOMATION TEST');
    logger.info('Test configuration:', options);
    
    const dashboard = new DashboardPage(options);
    let testPassed = false;
    
    try {
        // Step 1: Initialize browser
        logger.section('Step 1: Initialize Browser');
        await dashboard.initialize();
        logger.success('Browser initialized');
        
        // Step 2: Open dashboard
        logger.section('Step 2: Open Dashboard');
        await dashboard.open();
        
        // Validate dashboard loaded correctly
        const validation = await dashboard.validateCompleteWorkflow();
        if (!validation.valid) {
            throw new Error('Dashboard validation failed: ' + JSON.stringify(validation.details));
        }
        logger.success('Dashboard validation passed');
        
        // Step 3: Upload CSV file
        logger.section('Step 3: Upload CSV File');
        
        // Use the simple test data file
        const csvPath = path.join(__dirname, '..', '..', 'simple_test_data.csv');
        
        // Verify file exists
        try {
            await fs.access(csvPath);
            logger.info(`CSV file found: ${csvPath}`);
        } catch (error) {
            throw new Error(`CSV file not found at: ${csvPath}`);
        }
        
        // Upload the file
        const uploadResult = await dashboard.uploadCSV(csvPath);
        logger.success('File uploaded successfully:', uploadResult);
        
        // Verify upload details
        if (uploadResult.rows === 0 || uploadResult.columns === 0) {
            throw new Error('Upload verification failed - no data detected');
        }
        
        // Step 4: Wait and verify upload processed
        logger.section('Step 4: Verify Upload Processing');
        await dashboard.wait(2000); // Give time for any async processing
        
        // Check activity log for upload entry
        const activities = await dashboard.getActivityLog();
        const uploadActivity = activities.find(a => 
            a.title.includes('uploaded') || a.description.includes('.csv')
        );
        
        if (uploadActivity) {
            logger.success('Upload recorded in activity log:', uploadActivity);
        } else {
            logger.warning('Upload not found in activity log');
        }
        
        // Step 5: Verify train button is enabled
        logger.section('Step 5: Verify Training Ready');
        const trainEnabled = await dashboard.isTrainButtonEnabled();
        
        if (!trainEnabled) {
            throw new Error('Train button not enabled after successful upload');
        }
        
        logger.success('Train button is enabled - ready for training');
        
        // Step 6: Get final state
        logger.section('Step 6: Final State Verification');
        
        // Take final screenshot
        await dashboard.takeScreenshot('test-complete');
        
        // Get workflow states
        const workflowSteps = await dashboard.getWorkflowStepStates();
        logger.info('Workflow states:', workflowSteps);
        
        // Verify upload step is completed
        const uploadStep = workflowSteps.find(s => s.step === 1);
        if (!uploadStep?.completed) {
            logger.warning('Upload step not marked as completed');
        }
        
        testPassed = true;
        
        // Summary
        logger.section('TEST SUMMARY');
        logger.testResult('CSV Upload Test', testPassed, {
            filename: uploadResult.filename,
            rows: uploadResult.rows,
            columns: uploadResult.columns,
            trainButtonEnabled: trainEnabled,
            workflowSteps: workflowSteps
        });
        
        // Performance metrics
        const metrics = await dashboard.getMetrics();
        logger.info('Performance metrics:', {
            totalActions: metrics.automation.totalActions,
            elapsedTime: `${metrics.automation.elapsedTime}ms`
        });
        
    } catch (error) {
        testPassed = false;
        logger.error('Test failed:', error.message);
        logger.debug('Error stack:', error.stack);
        
        // Take error screenshot
        await dashboard.takeScreenshot('test-error');
        
        logger.testResult('CSV Upload Test', false, {
            error: error.message
        });
        
    } finally {
        // Cleanup
        logger.section('Cleanup');
        await dashboard.cleanup();
        
        // Exit with appropriate code
        process.exit(testPassed ? 0 : 1);
    }
}

/**
 * Advanced test with full pipeline
 */
async function testFullPipeline() {
    logger.section('FULL PIPELINE AUTOMATION TEST');
    
    const dashboard = new DashboardPage(options);
    let testPassed = false;
    
    try {
        // Initialize and open
        await dashboard.initialize();
        await dashboard.open();
        
        // 1. Upload CSV
        logger.section('Phase 1: Upload');
        const csvPath = path.join(__dirname, '..', '..', 'simple_test_data.csv');
        const uploadResult = await dashboard.uploadCSV(csvPath);
        
        // 2. Start training
        logger.section('Phase 2: Training');
        const trainingResult = await dashboard.startTraining();
        
        if (!trainingResult.success) {
            throw new Error('Training failed: ' + trainingResult.error);
        }
        
        logger.success('Training completed:', trainingResult.finalMetrics);
        
        // 3. Deploy model
        logger.section('Phase 3: Deployment');
        await dashboard.deployModel();
        
        // 4. Verify complete workflow
        const finalSteps = await dashboard.getWorkflowStepStates();
        const allCompleted = finalSteps.every(step => step.completed);
        
        if (!allCompleted) {
            throw new Error('Not all workflow steps completed');
        }
        
        testPassed = true;
        
        logger.section('FULL PIPELINE SUMMARY');
        logger.testResult('Full Pipeline Test', testPassed, {
            upload: uploadResult,
            training: trainingResult.finalMetrics,
            deployment: 'Success',
            workflowComplete: allCompleted
        });
        
    } catch (error) {
        testPassed = false;
        logger.error('Full pipeline test failed:', error.message);
        await dashboard.takeScreenshot('pipeline-error');
        
    } finally {
        await dashboard.cleanup();
        process.exit(testPassed ? 0 : 1);
    }
}

// Run the appropriate test
if (args.includes('--full')) {
    testFullPipeline().catch(console.error);
} else {
    testCSVUpload().catch(console.error);
}