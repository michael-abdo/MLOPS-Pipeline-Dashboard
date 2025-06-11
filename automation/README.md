# 🤖 MLOps Frontend Automation Framework

A scalable Puppeteer-based automation framework for testing and interacting with the MLOps Dashboard, featuring comprehensive debugging and AI feedback loop capabilities.

## 🎯 Key Features

- **Comprehensive Logging**: Detailed action-by-action logging with timestamps and screenshots
- **Page Object Model**: Maintainable architecture with separated concerns
- **AI Feedback Ready**: Built-in hooks for AI integration and closed feedback loops
- **Visual Debugging**: Screenshots at every step, optional video recording
- **Human-like Interaction**: Configurable delays and realistic user behavior
- **Flexible Configuration**: Environment-based settings with sensible defaults

## 📁 Project Structure

```
automation/
├── core/
│   └── BaseAutomation.js      # Core automation class with logging
├── pages/
│   └── DashboardPage.js       # Page object for dashboard
├── tests/
│   └── upload-csv.test.js     # CSV upload automation test
├── utils/
│   └── Logger.js              # Advanced logging utility
├── config/
│   └── automation.config.js   # Central configuration
├── logs/                      # Test execution logs
├── screenshots/               # Automated screenshots
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd automation
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Run CSV Upload Test

```bash
# Basic test
npm test

# With visible browser
npm run test:headed

# With debug logging
npm run test:debug

# Full pipeline test
node tests/upload-csv.test.js --full --headed --debug
```

## 🧪 Available Tests

### CSV Upload Test
Tests the file upload functionality with detailed verification:
- Opens dashboard
- Validates page elements
- Uploads CSV file
- Verifies upload success
- Checks activity log
- Confirms train button activation

### Full Pipeline Test
Complete end-to-end workflow:
- Upload → Training → Deployment
- Progress monitoring
- Metrics validation
- Workflow completion verification

## 📋 Detailed Logging

Every action is logged with:
- **Timestamp**: Precise timing for each step
- **Action Counter**: Sequential action numbering
- **Element Info**: Details about interacted elements
- **Screenshots**: Visual record at key points
- **Performance Metrics**: Timing and resource usage

Example log output:
```
[2025-01-10T10:30:45.123Z] [DashboardPage] [Action 1] Navigating to: http://localhost:8000
[2025-01-10T10:30:46.456Z] [DashboardPage] ✅ Successfully navigated to http://localhost:8000
[2025-01-10T10:30:46.789Z] [DashboardPage] [Action 2] Uploading file: simple_test_data.csv
[2025-01-10T10:30:47.234Z] [DashboardPage] ✅ Successfully uploaded file: simple_test_data.csv
```

## 🔧 Configuration Options

### Browser Options
```javascript
{
    headless: false,      // Show browser window
    slowMo: 50,          // Delay between actions (ms)
    devtools: true,      // Open Chrome DevTools
    viewport: {          // Browser window size
        width: 1280,
        height: 800
    }
}
```

### Logging Options
```javascript
{
    debug: true,         // Enable debug logging
    screenshots: true,   // Take screenshots
    video: false,       // Record video (requires setup)
    logDir: './logs'    // Log file directory
}
```

## 🤖 AI Integration Points

The framework is designed for AI feedback integration:

1. **Action Logging**: All actions are logged in structured format
2. **State Capture**: Page state captured at each step
3. **Error Detection**: Comprehensive error handling and reporting
4. **Metrics Collection**: Performance and success metrics
5. **Feedback Hooks**: Ready for AI analysis integration

### Example AI Integration
```javascript
// In BaseAutomation.js
async executeWithAIFeedback(action, selector) {
    const preState = await this.capturePageState();
    
    await this[action](selector);
    
    const postState = await this.capturePageState();
    const feedback = await this.sendToAI({
        action,
        selector,
        preState,
        postState,
        success: true
    });
    
    this.logger.info('AI Feedback:', feedback);
}
```

## 📊 Debugging Features

### Visual Debugging
- **Screenshots**: Automatic at key points
- **Element Highlighting**: Visual indication of interactions
- **Progress Indicators**: Real-time progress tracking
- **Error Screenshots**: Capture state on failures

### Console Debugging
- **Browser Console**: Captured and logged
- **Network Activity**: Request/response logging
- **Performance Metrics**: Timing and resource usage
- **Element Information**: Detailed element properties

### Debug Mode Commands
```bash
# Maximum debugging
node tests/upload-csv.test.js --debug --headed --slow

# Specific debugging
DEBUG=true SCREENSHOTS=true npm test
```

## 🔄 Continuous Integration

The framework is CI/CD ready:

```yaml
# Example GitHub Actions workflow
- name: Run Automation Tests
  run: |
    npm install
    npm test
  env:
    HEADLESS: true
    BASE_URL: ${{ secrets.TEST_URL }}
```

## 🚧 Extending the Framework

### Adding New Page Objects
```javascript
// pages/NewPage.js
const BaseAutomation = require('../core/BaseAutomation');

class NewPage extends BaseAutomation {
    constructor(options) {
        super(options);
        this.selectors = {
            // Define your selectors
        };
    }
    
    // Add page-specific methods
}
```

### Adding New Tests
```javascript
// tests/new-feature.test.js
const DashboardPage = require('../pages/DashboardPage');

async function testNewFeature() {
    const dashboard = new DashboardPage({ debug: true });
    
    await dashboard.initialize();
    // Your test logic
    await dashboard.cleanup();
}
```

## 🐛 Troubleshooting

### Common Issues

1. **Browser Won't Launch**
   - Check Chrome/Chromium is installed
   - Try with `--no-sandbox` flag
   - Verify permissions

2. **Timeouts**
   - Increase timeout in config
   - Check network connectivity
   - Verify selectors are correct

3. **Screenshots Not Saving**
   - Check directory permissions
   - Verify path exists
   - Check disk space

### Debug Commands
```bash
# Check Puppeteer installation
npm list puppeteer

# Test with minimal config
node -e "require('puppeteer').launch().then(b => b.close())"

# Run with all debugging
DEBUG=* npm test
```

## 📈 Performance Optimization

- **Parallel Execution**: Run multiple tests concurrently
- **Smart Waits**: Use intelligent waiting strategies
- **Resource Cleanup**: Proper browser/page disposal
- **Selective Screenshots**: Configure when to capture

## 🔮 Future Enhancements

- [ ] Video recording support
- [ ] Parallel test execution
- [ ] Visual regression testing
- [ ] API mocking capabilities
- [ ] Enhanced AI feedback loop
- [ ] Performance benchmarking
- [ ] Cross-browser support

## 📝 License

MIT License - See LICENSE file in the root directory.