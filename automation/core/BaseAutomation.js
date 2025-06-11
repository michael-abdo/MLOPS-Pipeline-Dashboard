/**
 * BaseAutomation.js
 * Core automation class with comprehensive logging and debugging
 * Provides foundation for all page-specific automation
 */

const puppeteer = require('puppeteer');
const Logger = require('../utils/Logger');
const path = require('path');
const fs = require('fs').promises;

class BaseAutomation {
    constructor(options = {}) {
        this.options = {
            headless: !options.headed,
            slowMo: options.slowMo || 50, // Human-like delays
            defaultTimeout: options.timeout || 30000,
            viewportWidth: options.width || 1280,
            viewportHeight: options.height || 800,
            debug: options.debug || false,
            screenshots: options.screenshots !== false,
            video: options.video || false,
            ...options
        };
        
        this.logger = new Logger('BaseAutomation', this.options.debug);
        this.browser = null;
        this.page = null;
        this.actionCount = 0;
        this.startTime = null;
    }

    /**
     * Initialize browser and page with comprehensive setup
     */
    async initialize() {
        this.startTime = Date.now();
        this.logger.info('🚀 Initializing browser automation');
        this.logger.debug('Options:', this.options);

        try {
            // Launch browser with detailed configuration
            this.browser = await puppeteer.launch({
                headless: this.options.headless,
                slowMo: this.options.slowMo,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    `--window-size=${this.options.viewportWidth},${this.options.viewportHeight}`
                ],
                defaultViewport: {
                    width: this.options.viewportWidth,
                    height: this.options.viewportHeight
                }
            });

            this.page = await this.browser.newPage();
            
            // Set up console message logging
            this.page.on('console', msg => {
                const type = msg.type();
                const text = msg.text();
                this.logger.debug(`[Browser Console] ${type}: ${text}`);
            });

            // Set up error logging
            this.page.on('pageerror', error => {
                this.logger.error('[Page Error]', error.message);
            });

            // Set up request logging
            if (this.options.debug) {
                this.page.on('request', request => {
                    this.logger.debug(`[Request] ${request.method()} ${request.url()}`);
                });

                this.page.on('response', response => {
                    this.logger.debug(`[Response] ${response.status()} ${response.url()}`);
                });
            }

            // Set default timeout
            this.page.setDefaultTimeout(this.options.defaultTimeout);

            this.logger.success('✅ Browser initialized successfully');
            await this.takeScreenshot('initialized');

        } catch (error) {
            this.logger.error('Failed to initialize browser:', error);
            throw error;
        }
    }

    /**
     * Navigate to URL with logging and error handling
     */
    async navigate(url) {
        this.actionCount++;
        this.logger.action(`[Action ${this.actionCount}] Navigating to: ${url}`);
        
        try {
            const response = await this.page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: this.options.defaultTimeout
            });

            if (!response.ok()) {
                throw new Error(`Navigation failed with status: ${response.status()}`);
            }

            this.logger.success(`✅ Successfully navigated to ${url}`);
            await this.takeScreenshot('navigated');
            
            // Wait for page to stabilize
            await this.wait(500);
            
            return response;
        } catch (error) {
            this.logger.error(`Navigation failed: ${error.message}`);
            await this.takeScreenshot('navigation-error');
            throw error;
        }
    }

    /**
     * Click element with detailed logging
     */
    async click(selector, options = {}) {
        this.actionCount++;
        this.logger.action(`[Action ${this.actionCount}] Clicking: ${selector}`);
        
        try {
            // Wait for element to be visible
            await this.waitForSelector(selector);
            
            // Get element info for logging
            const elementInfo = await this.getElementInfo(selector);
            this.logger.debug('Element info:', elementInfo);
            
            // Hover before clicking (human-like)
            await this.page.hover(selector);
            await this.wait(100);
            
            // Click with options
            await this.page.click(selector, options);
            
            this.logger.success(`✅ Successfully clicked ${selector}`);
            await this.takeScreenshot(`clicked-${this.sanitizeFilename(selector)}`);
            
        } catch (error) {
            this.logger.error(`Click failed on ${selector}: ${error.message}`);
            await this.takeScreenshot('click-error');
            throw error;
        }
    }

    /**
     * Type text with human-like delays
     */
    async type(selector, text, options = {}) {
        this.actionCount++;
        this.logger.action(`[Action ${this.actionCount}] Typing into ${selector}: "${text}"`);
        
        try {
            await this.waitForSelector(selector);
            
            // Clear existing text if specified
            if (options.clear) {
                await this.page.click(selector, { clickCount: 3 });
                await this.page.keyboard.press('Backspace');
            }
            
            // Focus on element
            await this.page.focus(selector);
            
            // Type with delay for human-like behavior
            await this.page.type(selector, text, { 
                delay: options.delay || 50 
            });
            
            this.logger.success(`✅ Successfully typed text into ${selector}`);
            await this.takeScreenshot(`typed-${this.sanitizeFilename(selector)}`);
            
        } catch (error) {
            this.logger.error(`Type failed on ${selector}: ${error.message}`);
            await this.takeScreenshot('type-error');
            throw error;
        }
    }

    /**
     * Upload file with comprehensive logging
     */
    async uploadFile(selector, filePath) {
        this.actionCount++;
        this.logger.action(`[Action ${this.actionCount}] Uploading file: ${filePath} to ${selector}`);
        
        try {
            // Ensure file exists
            await fs.access(filePath);
            
            // Wait for file input (handle hidden inputs)
            const fileInput = await this.page.waitForSelector(selector, {
                visible: false, // Allow hidden elements
                timeout: this.options.defaultTimeout
            });
            
            if (!fileInput) {
                throw new Error(`File input not found: ${selector}`);
            }
            
            // Upload file
            await fileInput.uploadFile(filePath);
            
            this.logger.success(`✅ Successfully uploaded file: ${path.basename(filePath)}`);
            await this.takeScreenshot('file-uploaded');
            
            // Wait for upload processing
            await this.wait(1000);
            
        } catch (error) {
            this.logger.error(`File upload failed: ${error.message}`);
            await this.takeScreenshot('upload-error');
            throw error;
        }
    }

    /**
     * Wait for selector with timeout and logging
     */
    async waitForSelector(selector, options = {}) {
        this.logger.debug(`Waiting for selector: ${selector}`);
        
        try {
            const element = await this.page.waitForSelector(selector, {
                visible: true,
                timeout: options.timeout || this.options.defaultTimeout,
                ...options
            });
            
            this.logger.debug(`✅ Found selector: ${selector}`);
            return element;
            
        } catch (error) {
            this.logger.error(`Selector not found: ${selector}`);
            await this.takeScreenshot('selector-not-found');
            throw error;
        }
    }

    /**
     * Get text content with logging
     */
    async getText(selector) {
        this.logger.debug(`Getting text from: ${selector}`);
        
        try {
            await this.waitForSelector(selector);
            const text = await this.page.$eval(selector, el => el.textContent);
            
            this.logger.debug(`Text content: "${text}"`);
            return text.trim();
            
        } catch (error) {
            this.logger.error(`Failed to get text from ${selector}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check if element exists
     */
    async exists(selector) {
        try {
            const element = await this.page.$(selector);
            const exists = element !== null;
            
            this.logger.debug(`Element ${selector} exists: ${exists}`);
            return exists;
            
        } catch (error) {
            return false;
        }
    }

    /**
     * Get element information for debugging
     */
    async getElementInfo(selector) {
        try {
            const info = await this.page.$eval(selector, el => {
                const rect = el.getBoundingClientRect();
                return {
                    tagName: el.tagName,
                    id: el.id,
                    className: el.className,
                    visible: rect.width > 0 && rect.height > 0,
                    position: {
                        x: rect.x,
                        y: rect.y,
                        width: rect.width,
                        height: rect.height
                    },
                    text: el.textContent?.substring(0, 50)
                };
            });
            
            return info;
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Take screenshot with timestamp and description
     */
    async takeScreenshot(description = 'screenshot') {
        if (!this.options.screenshots) return;
        
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${timestamp}-${this.sanitizeFilename(description)}.png`;
            const filepath = path.join(__dirname, '..', 'screenshots', filename);
            
            await this.page.screenshot({ 
                path: filepath,
                fullPage: false 
            });
            
            this.logger.debug(`📸 Screenshot saved: ${filename}`);
            
        } catch (error) {
            this.logger.error('Screenshot failed:', error.message);
        }
    }

    /**
     * Wait for specified milliseconds
     */
    async wait(ms) {
        this.logger.debug(`Waiting ${ms}ms...`);
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Sanitize filename for screenshots
     */
    sanitizeFilename(str) {
        return str.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    }

    /**
     * Get current page metrics
     */
    async getMetrics() {
        const metrics = await this.page.metrics();
        const performance = await this.page.evaluate(() => JSON.stringify(window.performance.timing));
        
        return {
            puppeteer: metrics,
            browser: JSON.parse(performance),
            automation: {
                totalActions: this.actionCount,
                elapsedTime: Date.now() - this.startTime
            }
        };
    }

    /**
     * Clean up browser and resources
     */
    async cleanup() {
        this.logger.info('🧹 Cleaning up browser resources');
        
        try {
            if (this.page) {
                await this.page.close();
            }
            
            if (this.browser) {
                await this.browser.close();
            }
            
            const metrics = {
                totalActions: this.actionCount,
                totalTime: Date.now() - this.startTime
            };
            
            this.logger.success('✅ Cleanup completed', metrics);
            
        } catch (error) {
            this.logger.error('Cleanup error:', error.message);
        }
    }
}

module.exports = BaseAutomation;