# 🧪 Testing Guide - MLOps Dashboard

## Overview
Comprehensive testing suite for the MLOps Dashboard with 5 different test types covering all functionality.

## Quick Start

### 1. Setup
```bash
# Activate virtual environment
source venv/bin/activate

# Start server (in separate terminal)
python backend/backend_simple.py
```

### 2. Run All Tests
```bash
# Using Makefile (recommended)
make test-all

# Or manually
python tests/run_all_tests.py
```

## Test Suites

### 1. Basic API Tests (`test_simple.py`)
**Purpose**: Quick health check of core functionality
- ✅ Health endpoint
- ✅ System status
- ✅ Settings CRUD
- ✅ Model listing
- ✅ Page serving

**Run**: `python tests/test_simple.py`
**Duration**: ~3 seconds

### 2. Core API Tests (`test_api.py`)
**Purpose**: Standard API functionality validation
- ✅ File upload
- ✅ Model training
- ✅ Activity logging
- ✅ Error handling

**Run**: `python tests/test_api.py`
**Duration**: ~5 seconds

### 3. New APIs Tests (`test_new_apis.py`)
**Purpose**: Test all newly implemented endpoints
- ✅ Pipeline management (7 endpoints)
- ✅ Dataset management (6 endpoints)
- ✅ Component health (3 endpoints)
- ✅ Monitoring APIs (4 endpoints)

**Run**: `python tests/test_new_apis.py`
**Duration**: ~10 seconds

### 4. Comprehensive Test Suite (`test_comprehensive_api_suite.py`)
**Purpose**: Complete API coverage with edge cases
- ✅ **47 total tests** across all endpoints
- ✅ File upload with validation
- ✅ Model training lifecycle
- ✅ Pipeline execution simulation
- ✅ Dataset CRUD operations
- ✅ WebSocket functionality
- ✅ Error handling & edge cases
- ✅ Performance validation

**Features**:
- JSON test reports
- Response time tracking
- Data persistence between tests
- WebSocket ping/pong testing
- Invalid input validation

**Run**: `python tests/test_comprehensive_api_suite.py`
**Duration**: ~30 seconds

### 5. Performance Tests (`test_performance.py`)
**Purpose**: Performance benchmarking and load testing
- ✅ Response time analysis (9 endpoints)
- ✅ Concurrent request handling (5-50 concurrent)
- ✅ Sustained load testing (30 seconds)
- ✅ File upload performance (different sizes)

**Metrics Tracked**:
- Average/min/max response times
- Throughput (requests/second)
- Success rates under load
- Performance degradation over time
- Upload speeds

**Run**: `python tests/test_performance.py`
**Duration**: ~60 seconds

### 6. WebSocket Tests (`test_websocket_only.py`)
**Purpose**: Real-time communication testing
- ✅ WebSocket connection
- ✅ Ping/pong heartbeat
- ✅ Event broadcasting
- ✅ Connection resilience

**Run**: `python tests/test_websocket_only.py`
**Duration**: ~5 seconds

## Test Reports

### Generated Files
- `test_report.json` - Comprehensive test results
- `performance_report.json` - Performance metrics
- `test_report.md` - Summary report

### Sample Test Results
```
📊 OVERALL TEST SUMMARY
============================================================
Total Tests: 47
Passed: 47 (100.0%)
Failed: 0 (0.0%)
Skipped: 0

Performance Summary:
- Average response time: 2.6ms
- Concurrent handling: 943 req/s
- Success rate: 100%
- File upload: 6487 KB/s
```

## Using the Makefile

### Available Commands
```bash
make help        # Show all commands
make install     # Install dependencies
make start       # Start development server
make test        # Run basic tests
make test-api    # Run comprehensive API tests
make test-perf   # Run performance tests
make test-all    # Run all test suites
make clean       # Clean up generated files
make lint        # Check code formatting
```

## Test Categories by Purpose

### 🚀 Development Testing (Fast)
```bash
make test                    # Basic smoke tests (3s)
python tests/test_simple.py  # Quick health check
```

### 🔍 Feature Testing (Medium)
```bash
python tests/test_new_apis.py    # New endpoint validation (10s)
python tests/test_api.py         # Core API validation (5s)
```

### 🏆 Release Testing (Comprehensive)
```bash
make test-all                              # Everything (90s)
python tests/test_comprehensive_api_suite.py  # Full coverage (30s)
python tests/test_performance.py          # Performance validation (60s)
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: |
    source venv/bin/activate
    python tests/run_all_tests.py
```

### Exit Codes
- `0` - All tests passed
- `1` - Some tests failed

## Troubleshooting

### Common Issues

**Server not running**:
```bash
# Start server first
python backend/backend_simple.py
```

**Virtual environment not activated**:
```bash
source venv/bin/activate
```

**Dependencies missing**:
```bash
pip install -r requirements.txt
```

**Port 8000 in use**:
```bash
# Kill existing processes
pkill -f "backend_simple.py"
```

### Debug Mode
```bash
# Run with verbose output
python tests/test_comprehensive_api_suite.py --base-url http://localhost:8000
```

## Test Coverage

### Endpoints Tested (20 total)
- ✅ Core APIs (5): Health, status, activity, settings, models
- ✅ File APIs (2): Upload, validation
- ✅ Training APIs (3): Start, status, completion
- ✅ Pipeline APIs (7): CRUD, execution, status
- ✅ Dataset APIs (6): CRUD, preview, statistics, validation
- ✅ Component APIs (3): Health monitoring
- ✅ Monitoring APIs (4): Services, metrics, alerts

### Scenarios Tested
- ✅ Happy path workflows
- ✅ Error conditions
- ✅ Edge cases
- ✅ Performance under load
- ✅ Concurrent access
- ✅ WebSocket real-time updates
- ✅ File upload/download
- ✅ Data validation
- ✅ Authentication (when implemented)

## Best Practices

### Running Tests
1. Always start with `make test` for quick validation
2. Use `make test-all` before commits
3. Run performance tests for major changes
4. Check test reports for detailed analysis

### Writing New Tests
1. Add to appropriate test file
2. Follow existing patterns
3. Include error cases
4. Update this guide
5. Test with real data scenarios

## Future Enhancements

### Planned Additions
- [ ] Database integration tests
- [ ] Authentication/authorization tests
- [ ] Cross-browser automation tests
- [ ] Load testing with >100 concurrent users
- [ ] Integration with external services
- [ ] Test data factories
- [ ] Mock service testing
- [ ] End-to-end user journey tests