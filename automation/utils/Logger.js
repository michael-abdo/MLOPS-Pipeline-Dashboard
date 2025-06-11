/**
 * Logger.js
 * Comprehensive logging utility with colors, timestamps, and file output
 */

const winston = require('winston');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

class Logger {
    constructor(name = 'Automation', debug = false) {
        this.name = name;
        this.debugMode = debug;
        
        // Ensure logs directory exists
        const logsDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        // Create Winston logger
        this.winston = winston.createLogger({
            level: debug ? 'debug' : 'info',
            format: winston.format.combine(
                winston.format.timestamp({
                    format: 'YYYY-MM-DD HH:mm:ss.SSS'
                }),
                winston.format.json()
            ),
            transports: [
                // File transport
                new winston.transports.File({
                    filename: path.join(logsDir, `automation-${new Date().toISOString().split('T')[0]}.log`),
                    maxsize: 5242880, // 5MB
                    maxFiles: 5
                }),
                // Error file transport
                new winston.transports.File({
                    filename: path.join(logsDir, 'errors.log'),
                    level: 'error'
                })
            ]
        });

        // Console output formatting
        this.consoleFormat = {
            info: chalk.blue,
            success: chalk.green,
            warning: chalk.yellow,
            error: chalk.red,
            debug: chalk.gray,
            action: chalk.cyan
        };
    }

    /**
     * Format message with timestamp and context
     */
    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${this.name}]`;
        
        // Log to Winston
        this.winston.log({
            level: level === 'success' ? 'info' : level,
            name: this.name,
            message,
            data
        });

        // Format for console
        const color = this.consoleFormat[level] || chalk.white;
        let consoleMsg = `${chalk.gray(prefix)} ${color(message)}`;
        
        if (data) {
            consoleMsg += '\n' + chalk.gray(JSON.stringify(data, null, 2));
        }
        
        return consoleMsg;
    }

    /**
     * Log info message
     */
    info(message, data = null) {
        console.log(this.formatMessage('info', message, data));
    }

    /**
     * Log success message
     */
    success(message, data = null) {
        console.log(this.formatMessage('success', message, data));
    }

    /**
     * Log warning message
     */
    warning(message, data = null) {
        console.warn(this.formatMessage('warning', message, data));
    }

    /**
     * Log error message
     */
    error(message, data = null) {
        console.error(this.formatMessage('error', message, data));
    }

    /**
     * Log debug message (only if debug mode is enabled)
     */
    debug(message, data = null) {
        if (this.debugMode) {
            console.log(this.formatMessage('debug', message, data));
        }
    }

    /**
     * Log action message (highlighted for user actions)
     */
    action(message, data = null) {
        console.log(this.formatMessage('action', message, data));
    }

    /**
     * Create a section divider for better readability
     */
    section(title) {
        const divider = '='.repeat(60);
        console.log(chalk.magenta(`\n${divider}`));
        console.log(chalk.magenta.bold(`  ${title}`));
        console.log(chalk.magenta(`${divider}\n`));
        
        this.winston.info(`=== ${title} ===`);
    }

    /**
     * Log test results in a formatted way
     */
    testResult(testName, passed, details = null) {
        const icon = passed ? '✅' : '❌';
        const status = passed ? 'PASSED' : 'FAILED';
        const color = passed ? chalk.green : chalk.red;
        
        console.log(color(`\n${icon} Test: ${testName} - ${status}`));
        
        if (details) {
            console.log(chalk.gray(JSON.stringify(details, null, 2)));
        }
        
        this.winston.info('Test result', {
            test: testName,
            passed,
            details
        });
    }

    /**
     * Create a progress indicator
     */
    progress(current, total, message = '') {
        const percentage = Math.round((current / total) * 100);
        const filled = Math.round(percentage / 5);
        const empty = 20 - filled;
        
        const bar = `[${'█'.repeat(filled)}${' '.repeat(empty)}]`;
        const progress = `${bar} ${percentage}% ${message}`;
        
        // Use carriage return to update same line
        process.stdout.write(`\r${chalk.cyan(progress)}`);
        
        if (current === total) {
            console.log(''); // New line when complete
        }
    }

    /**
     * Log a table of data
     */
    table(data) {
        console.table(data);
        this.winston.info('Table data', { table: data });
    }

    /**
     * Create a summary report
     */
    summary(data) {
        this.section('AUTOMATION SUMMARY');
        
        Object.entries(data).forEach(([key, value]) => {
            const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
            console.log(chalk.cyan(`${formattedKey}:`), chalk.white(value));
        });
        
        console.log('');
        this.winston.info('Summary', data);
    }
}

module.exports = Logger;