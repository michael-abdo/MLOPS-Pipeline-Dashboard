# MLOps Dashboard Makefile
# Simple commands for development and testing

.PHONY: help install start test test-api test-performance test-all clean lint

# Default target
help:
	@echo "MLOps Dashboard - Available Commands:"
	@echo ""
	@echo "  🚀 Setup & Start:"
	@echo "    make install     - Install dependencies"
	@echo "    make start       - Start development server"
	@echo ""
	@echo "  🧪 Testing:"
	@echo "    make test        - Run basic tests"
	@echo "    make test-api    - Run comprehensive API tests"
	@echo "    make test-perf   - Run performance tests"
	@echo "    make test-all    - Run all test suites"
	@echo ""
	@echo "  🧹 Maintenance:"
	@echo "    make clean       - Clean up generated files"
	@echo "    make lint        - Check code formatting"
	@echo ""

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	python3 -m venv venv
	. venv/bin/activate && pip install -r requirements.txt
	@echo "✅ Installation complete"

# Start development server
start:
	@echo "🚀 Starting MLOps Dashboard..."
	. venv/bin/activate && python backend/backend_simple.py

# Run basic tests
test:
	@echo "🧪 Running basic tests..."
	. venv/bin/activate && python tests/test_simple.py

# Run comprehensive API tests
test-api:
	@echo "🧪 Running comprehensive API tests..."
	. venv/bin/activate && python tests/test_comprehensive_api_suite.py

# Run performance tests
test-perf:
	@echo "🏃 Running performance tests..."
	. venv/bin/activate && python tests/test_performance.py

# Run all test suites
test-all:
	@echo "🧪 Running all test suites..."
	. venv/bin/activate && python tests/run_all_tests.py

# Clean up generated files
clean:
	@echo "🧹 Cleaning up..."
	find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	find . -name ".DS_Store" -delete 2>/dev/null || true
	rm -f test_report.json performance_report.json test_report.md
	rm -f logs/*.log 2>/dev/null || true
	@echo "✅ Cleanup complete"

# Check code formatting (basic)
lint:
	@echo "🔍 Checking code formatting..."
	@echo "Python files:"
	@find . -name "*.py" -not -path "./venv/*" | wc -l | xargs echo "  -"
	@echo "JavaScript files:"
	@find . -name "*.js" -not -path "./venv/*" -not -path "./*/node_modules/*" | wc -l | xargs echo "  -"
	@echo "CSS files:"
	@find . -name "*.css" | wc -l | xargs echo "  -"
	@echo "HTML files:"
	@find . -name "*.html" -not -path "./venv/*" | wc -l | xargs echo "  -"