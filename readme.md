# 🚀 MLOps Simple Dashboard - MVP

> A simplified, user-friendly machine learning pipeline for business analysts and non-technical users.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-MVP-orange.svg)

## ✨ What This Is

A **simple 4-step ML pipeline** that anyone can use:

1. **📊 Upload Data** - Drag & drop your CSV file
2. **🤖 Train Model** - AI automatically learns from your data  
3. **📈 View Results** - See how accurate your model is
4. **🚀 Deploy** - Start using your model for predictions

**Perfect for**: Business analysts, product managers, and anyone who needs ML without the complexity.

## 🎯 Key Features

- **5-minute learnable** - No ML expertise required
- **Traffic light status** - Green/Yellow/Red indicators
- **Business language** - No technical jargon
- **Single dashboard** - Everything in one place
- **Automatic training** - AI picks the best model type
- **Real-time progress** - Watch your model train
- **System monitoring** - Live CPU, memory, disk usage tracking
- **Visual health indicators** - Color-coded system status
- **WebSocket streaming** - Real-time metrics updates every 5 seconds
- **Enterprise reliability** - Enhanced error handling, reconnection, and connection quality monitoring
- **Connection resilience** - Automatic failover with exponential backoff and heartbeat monitoring
- **Complete event coverage** - All 17 WebSocket events fully implemented with frontend handlers
- **Datetime serialization** - Fixed JSON serialization issues for robust API responses
- **Enhanced data structures** - Rich model metadata with 20+ fields including hyperparameters, validation metrics
- **Intelligent target detection** - Auto-detects target columns from CSV data for seamless training
- **Comprehensive activity logging** - 13+ fields per activity including user context and severity levels
- **Modular architecture** - Component-based design with shared modules for maintainability
- **Single-page application** - All functionality consolidated into one powerful dashboard
- **Reusable UI components** - Card, Metric, ProgressBar, and Grid components reducing code duplication by 71%
- **Advanced UI components** - ButtonGroup, UploadArea, and ChartContainer for enhanced user interactions
- **Component-based architecture** - Standardized UI elements with real-time update capabilities
- **Modern upload experience** - Drag & drop file handling with validation and visual feedback  
- **Accessibility compliant** - Full keyboard navigation, screen reader support, and ARIA attributes
- **Chart preparation** - Chart.js integration infrastructure with loading states and error handling
- **Enterprise memory management** - Automatic cleanup of timers, event listeners, and WebSocket handlers
- **🔧 Legacy Code Modernization** - Complete elimination of direct DOM manipulation conflicts
- **⚡ TimestampManager System** - Unified timestamp handling with automatic 30-second updates
- **📋 UploadArea State Management** - Comprehensive upload states (progress/success/validation/error)
- **🎯 Component API Integration** - All updates use modern component APIs preventing structure conflicts
- **🔧 Live System Status** - Real-time model metrics tracking with WebSocket-powered updates
- **📊 Real-time Model Analytics** - Live accuracy tracking, prediction rates, and health monitoring
- **📈 Visual Trend Indicators** - Dynamic arrows showing metric changes with color-coded health status
- **⚡ WebSocket Performance** - Sub-second metric updates with automatic rate limiting and reconnection
- **🎯 Prediction Flow Tracking** - Thread-safe circular buffers for high-volume prediction logging
- **💾 Memory Management** - Automatic cleanup with 100MB thresholds and 24-hour data retention
- **🔄 Enhanced WebSocket integration** - 15+ event handlers with visual animations and robust offline fallback
- **✨ Advanced UI animations** - Pulse effects, trend indicators, and scale transformations for engaging user experience
- **🛠️ Comprehensive error recovery** - Smart retry systems for training failures with visual feedback
- **Centralized state management** - StateStore with caching and API request deduplication
- **Environment-aware data handling** - Smart demo/production mode switching with realistic data simulation
- **Comprehensive testing framework** - 60 automated tests covering memory management, state, and integration
- **Centralized error handling** - Consistent error management with recovery strategies and user feedback
- **ES6 module compatibility** - Fixed import/export issues for seamless JavaScript module loading

## 🚀 Quick Start (2 Minutes)

### Prerequisites
- Python 3.8+
- 50MB+ free space

### Installation
```bash
# 1. Download the project
git clone <this-repository>
cd mlops/development

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the server
python backend/backend_api.py
# Or for testing: python backend/backend_simple.py
```

### First Use
1. Open `http://localhost:8000` in your browser
2. Upload a CSV file (sample data included)
3. Click "Start Training"
4. Watch the progress bar
5. Click "Use This Model" when complete

**That's it!** Your ML model is ready to use.

## 🔧 Live System Status Features

The dashboard includes a **Live System Status** section that provides real-time monitoring of your ML models and system performance:

### Real-time Model Metrics
- **Live Accuracy Tracking** - Watch model accuracy update in real-time as predictions are made
- **Prediction Rate Monitoring** - See predictions per minute with trend indicators
- **Health Status Indicators** - Color-coded health (green/yellow/red) based on performance thresholds
- **Model Activity** - Track which models are actively processing predictions

### Visual Indicators
- **Trend Arrows** - See if metrics are improving (↗), declining (↘), or stable (→)
- **Pulse Animations** - Visual feedback when metrics update
- **Color-coded Metrics** - Instant visual health assessment
- **Progress Animations** - Smooth transitions for engaging user experience

### Technical Features
- **WebSocket Updates** - Sub-second real-time updates without page refresh
- **Thread-safe Logging** - High-volume prediction tracking with concurrent access
- **Memory Management** - Automatic cleanup of old data (24-hour retention, 100MB limit)
- **Rate Limiting** - Smart throttling to prevent UI flooding

### API Endpoints
- `/api/monitoring/system` - Combined system and model metrics
- `/api/models/active/status` - Current active model information
- `/api/models/{id}/metrics/realtime` - Detailed per-model performance data

## 📁 What's Included

```
📦 mlops/development/
├── requirements.txt        # Python dependencies
├── readme.md              # This file
├── LICENSE                # MIT License
├── CONTRIBUTING.md        # Contribution guidelines  
├── CHANGELOG.md           # Version history and changes
├── .env.example           # Environment configuration template
├── .gitignore             # Git ignore rules
├── 🔧 backend/
│   ├── backend_api.py     # FastAPI server with full ML capabilities
│   └── backend_simple.py  # Simplified server with Phase 4 enhancements:
│                          # - Enhanced WebSocket error handling & resilience
│                          # - Exponential backoff with jitter
│                          # - Ping/pong heartbeat mechanism
│                          # - Connection quality assessment
│                          # - Memory optimization & connection limits
├── 🎨 static/
│   ├── css/
│   │   ├── shared.css      # Design system and common styles
│   │   └── dashboard.css   # Dashboard-specific styles
│   ├── js/
│   │   ├── common/         # Core modules (websocket, api, config, utils)
│   │   ├── components/     # Reusable UI components (navigation, activity-feed, ui-components)
│   │   └── pages/          # Page-specific controllers (dashboard.js)
│   ├── index.html         # Main dashboard (modular architecture):
│   │                      # - Shared CSS and JavaScript modules
│   │                      # - Component-based navigation
│   │                      # - WebSocket singleton management
│   │                      # - Real-time activity feed
│   └── settings.html      # Settings page (modular architecture)
├── 📚 docs/
│   ├── mvp/               # MVP documentation
│   │   ├── API.md         # API documentation
│   │   ├── AUTOMATION_GUIDE.md     # Frontend automation guide
│   │   ├── DATA_FORMAT.md          # Data format specifications
│   │   ├── DEPLOYMENT.md           # Deployment instructions
│   │   ├── SECURITY.md            # Security guidelines
│   │   └── TROUBLESHOOTING.md     # Common issues and fixes
│   ├── phase1/            # Phase 1 implementation docs
│   │   ├── IMPLEMENTATION_PLAN.md         # Phase 1 roadmap
│   │   ├── PHASE1_IMPLEMENTATION_GAPS.md  # Gap analysis and todos
│   │   ├── PHASE1_SPECIFICATION_ANALYSIS.md  # Spec compliance
│   │   ├── phase1_dashboard.html          # Expected dashboard UI
│   │   └── phase1_spec.md                 # Phase 1 specifications
│   ├── retired/           # Archived documentation
│   │   ├── IMPLEMENTATION_SUMMARY.md  # Legacy implementation details
│   │   └── project_structure.md       # Legacy technical documentation
│   ├── BACKEND_REORGANIZATION.md   # Backend refactoring details
│   ├── PHASE3_IMPLEMENTATION_COMPARISON.md  # Phase 3 requirements analysis
│   ├── PHASE3_TESTING_REPORT.md    # Phase 3 testing results
│   └── PHASE3_VERIFICATION_REPORT.md # Phase 3 comprehensive verification
├── 🧪 tests/
│   ├── test_api.py        # Comprehensive API tests
│   ├── test_simple.py     # Basic endpoint tests
│   ├── test_pipeline.py   # Complete pipeline test
│   ├── test_websocket.py  # WebSocket connectivity tests
│   ├── test_websocket_client.py     # WebSocket client tests
│   ├── test_websocket_only.py       # Isolated WebSocket tests
│   ├── test_websocket_advanced.py   # Phase 4 comprehensive tests
│   └── test_websocket_manual.html   # Manual WebSocket testing tool
├── 🤖 automation/         # Frontend automation framework
│   ├── core/              # Base automation classes
│   ├── pages/             # Page object models
│   ├── tests/             # UI automation tests
│   ├── utils/             # Logging and utilities
│   ├── logs/              # Test execution logs (auto-generated)
│   ├── screenshots/       # Visual test records (auto-generated)
│   ├── config/            # Automation configuration
│   ├── package.json       # Node.js dependencies
│   ├── run-automation-demo.sh  # Demo script
│   └── README.md          # Automation documentation
├── 📁 uploads/            # File upload storage
│   └── simple_test_data.csv   # Sample data for testing
├── 📁 models/             # Trained model storage
└── 🐍 venv/               # Python virtual environment (auto-generated)
```

## 🎮 How to Use

### Step 1: Upload Your Data
- **File Type**: CSV with headers
- **Size Limit**: 50MB
- **Format**: Each row = one example, last column = what you want to predict
- **Example**: Customer data with "Will Buy" as last column

### Step 2: Train Your Model
- Click **"Start Training"**
- System automatically:
  - Validates your data
  - Picks the best algorithm
  - Trains and tests the model
  - Shows you the accuracy

### Step 3: Use Your Model
- If accuracy looks good (80%+), click **"Use This Model"**
- Model is now ready for predictions
- Check the activity log to confirm deployment

### Example Data Format
```csv
age,income,previous_purchases,will_buy
25,50000,2,yes
34,75000,5,yes
19,30000,0,no
```

## 🎯 Design Principles

This dashboard follows the **"Grandma Test"** - if your grandmother can't figure it out in 5 minutes, it's too complex.

### What Makes It Simple
- **Maximum 3 buttons** visible at any time
- **Traffic light colors** - Green = good, Yellow = warning, Red = problem  
- **Plain English** - "Training" not "model fitting"
- **Visual progress** - Progress bars instead of technical logs
- **One main screen** - No complex navigation, everything in the dashboard

### What's Hidden
- Technical details (accessible in settings)
- Advanced configuration options
- Complex error messages
- ML algorithm selection
- Feature engineering steps

## 📊 System Requirements

### Minimum
- **RAM**: 2GB
- **Storage**: 1GB
- **CPU**: Any modern processor
- **OS**: Windows 10+, macOS 10.14+, Linux

### Recommended
- **RAM**: 4GB+
- **Storage**: 5GB+
- **CPU**: 4+ cores for faster training

## 📁 Project Structure

```
mlops/development/
├── automation/            # Browser automation framework
│   ├── config/           # Automation configuration
│   ├── core/             # Base automation classes
│   ├── logs/             # Automation test logs
│   ├── pages/            # Page object models
│   ├── tests/            # WebSocket & upload tests
│   ├── utils/            # Logger and utilities
│   └── package.json      # Node.js dependencies
├── backend/               # Python backend services
│   ├── backend_api.py    # Full API implementation
│   └── backend_simple.py # Enhanced backend with 20+ new APIs
├── claude/                # AI development documentation
│   └── phases/           # Implementation phases
│       ├── backend_integration/  # Backend API docs
│       ├── csv_compelixity/     # CSV testing docs
│       └── frontend/            # Frontend architecture docs
├── docs/                  # Project documentation
│   ├── phase1_2/         # Phase 1-2 specifications
│   ├── phase3/           # Phase 3 implementation
│   └── retired/          # Archived documentation
├── logs/                  # Application logs
│   ├── backend.log       # Backend server logs
│   └── backend_server.log # Server operation logs
├── models/                # Trained ML models storage
├── static/                # Frontend application
│   ├── css/              # Modular stylesheets
│   │   ├── shared.css    # Global styles
│   │   ├── dashboard.css # Dashboard page styles
│   │   ├── pipeline.css  # Pipeline page styles
│   │   ├── architecture.css # Architecture page styles
│   │   ├── data.css      # Data management styles
│   │   └── monitoring.css # Monitoring page styles
│   ├── js/               # Modular JavaScript
│   │   ├── common/       # Shared utilities
│   │   │   ├── api.js    # API client
│   │   │   ├── websocket.js # WebSocket manager
│   │   │   ├── notifications.js # Toast notifications
│   │   │   ├── config.js # App configuration
│   │   │   └── utils.js  # Helper functions
│   │   ├── components/   # Reusable UI components
│   │   │   ├── navigation.js # Top navigation bar
│   │   │   ├── activity-feed.js # Real-time feed
│   │   │   └── ui-components.js # Card, Metric, ProgressBar, Grid components
│   │   └── pages/        # Page controllers
│   │       ├── dashboard.js # Dashboard logic
│   │       ├── pipeline.js  # Pipeline management
│   │       ├── architecture.js # System architecture
│   │       ├── data.js      # Data management
│   │       └── monitoring.js # System monitoring
│   ├── assets/           # Icons and images
│   ├── index.html        # Dashboard page
│   ├── pipeline.html     # Pipeline management page
│   ├── architecture.html # Architecture visualization
│   ├── data.html         # Data management page
│   ├── monitoring.html   # System monitoring page
│   └── settings.html     # Settings page
├── tests/                 # Comprehensive test suite
│   ├── test_api.py       # Basic API tests
│   ├── test_new_apis.py  # New endpoints tests
│   ├── test_websocket.py # WebSocket tests
│   ├── test_complexity_monitoring.py # CSV complexity tests
│   ├── test_manual_upload.html # Manual upload test
│   └── test_*.py         # Additional test files
├── uploads/               # User uploaded datasets
│   └── *.csv             # Sample test data files
├── venv/                  # Python virtual environment
├── CHANGELOG.md          # Version history
├── CONTRIBUTING.md       # Contribution guidelines
├── LICENSE               # MIT license
├── readme.md             # This file
└── requirements.txt      # Python dependencies
```

## 🔧 Configuration

Basic settings in `Settings` page:
- **Training timeout**: How long to spend training (5-60 minutes)
- **Model type**: Automatic (recommended) or manual
- **Notifications**: Email alerts when training completes
- **Data cleanup**: Auto-delete old files

Advanced settings available for technical users.

## 🚢 Deployment Options

### Development (Local)
```bash
source venv/bin/activate
python backend/backend_api.py
# Access at http://localhost:8000
```

### Testing (Simplified)
```bash
source venv/bin/activate
python backend/backend_simple.py
# Access at http://localhost:8000
```

### Cloud Deployment
See `docs/project_structure.md` for detailed deployment instructions.

## 🧪 Testing

### Backend Testing
```bash
# Activate virtual environment
source venv/bin/activate

# Run basic endpoint tests
python tests/test_simple.py

# Run comprehensive API tests
python tests/test_api.py

# Or use pytest for advanced testing
pip install pytest
pytest tests/ -v
```

### Frontend Automation Testing
```bash
# Navigate to automation directory
cd automation

# Install dependencies (first time only)
npm install

# Run CSV upload test
npm test

# Run with visible browser
npm run test:headed

# Run with debug logging
npm run test:debug

# Run complete pipeline test
node tests/upload-csv.test.js --full --headed --debug

# Run accessibility tests
node test-keyboard-navigation.js
node test-screen-reader.js

# Run ultimate test suite (3x repetition)
node ultimate-test.js

# Test Live System Status features
node automation/execute-live-system-status.js
open automation/verify-live-system-status-complete.html
```

See `docs/AUTOMATION_GUIDE.md` for detailed automation documentation.

## 📈 What's Next (Future Development)

Current version includes **Phase 4 - Polish & Testing** with enterprise-grade reliability, **Complete WebSocket Implementation** (17/17 events), **Enhanced Data Structures** with intelligent auto-detection, **UI Components Library** achieving 71% code reduction, and **Advanced Component Integration** (ButtonGroup, UploadArea, ChartContainer). Future phases add:

- 👥 **Multi-user support** - Team collaboration
- 🔐 **User authentication** - Secure login system  
- 📊 **Advanced charts** - Detailed model insights
- 🤖 **Model monitoring** - Track performance over time
- 🔗 **API integrations** - Connect to other systems
- 🏢 **Enterprise features** - Advanced security and compliance

**Timeline**: 4-6 weeks additional development
**Investment**: $3.5K-4K additional

## 🆘 Support

### Quick Fixes
- **Upload fails**: Check file is CSV with headers
- **Training fails**: Ensure at least 2 columns in data
- **Low accuracy**: Try cleaning data or adding more examples
- **Page won't load**: Check `http://localhost:8000/health`

### Documentation
- 📖 **Implementation Guide**: `docs/IMPLEMENTATION_SUMMARY.md`
- 🔧 **Technical Docs**: `docs/project_structure.md`
- 📡 **API Reference**: `docs/API.md`
- 🚀 **Deployment Guide**: `docs/DEPLOYMENT.md`
- 🔒 **Security Guide**: `docs/SECURITY.md`
- 📊 **Data Format Specs**: `docs/DATA_FORMAT.md`
- 🔧 **Troubleshooting**: `docs/TROUBLESHOOTING.md`
- 🤖 **Automation Guide**: `docs/AUTOMATION_GUIDE.md`
- ✨ **Legacy Code Removal**: `docs/LEGACY_CODE_REMOVAL_COMPLETE.md`

## 🏗️ Recent Architecture Improvements

### Component-Based Update System
The dashboard now uses a modern component-based architecture that eliminates conflicts between legacy DOM manipulation and modern UI components:

- **TimestampManager**: Unified timestamp handling with automatic updates every 30 seconds
- **UploadArea Components**: Comprehensive state management for file uploads (progress, success, validation, error states)
- **SystemMetrics Coordination**: Centralized WebSocket update delegation preventing DOM conflicts
- **UpdateStrategies**: Batch processing with 50ms debouncing for optimal performance

### Key Benefits
- **Visual Bug Fixed**: Eliminated "load → revert → populate" cycle in Live System Status cards
- **Performance Improved**: Reduced DOM queries through element caching and batched updates
- **Code Quality**: Removed 150+ lines of duplicate code and consolidated update logic
- **Maintainability**: Clear separation of concerns with component APIs

### Developer Experience
- All updates now use component APIs: `Metric.update()`, `UploadArea.showProgress()`, `setJustNow()`
- Automatic timestamp tracking with `TimestampManager.scanForTimestampElements()`
- Centralized error handling and consistent state management
- Future-ready architecture for TypeScript integration and automated testing

### Get Help
- 🐛 **Common Issues**: See `docs/TROUBLESHOOTING.md`
- 📧 **Support**: Create GitHub issue with error details

## 📝 License

MIT License - see `LICENSE` file for details.

---

**Ready to train your first model?** 
```bash
source venv/bin/activate
python backend/backend_simple.py
```
Then open `http://localhost:8000` and upload your data! 🎉