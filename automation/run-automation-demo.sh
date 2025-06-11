#!/bin/bash

# MLOps Automation Demo Script
# Demonstrates the Puppeteer automation framework

echo "🤖 MLOps Frontend Automation Demo"
echo "=================================="
echo

# Check if backend is running
echo "📡 Checking if backend is running..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend not running. Starting it..."
    echo "   Run this in another terminal: source venv/bin/activate && python backend_simple.py"
    echo
    read -p "Press Enter when backend is ready..."
fi

# Navigate to automation directory
cd automation

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo
    echo "📦 Installing Puppeteer dependencies..."
    npm install
fi

echo
echo "🎯 Running CSV Upload Automation Test"
echo "======================================"
echo "This test will:"
echo "1. Open the MLOps dashboard"
echo "2. Upload a CSV file"
echo "3. Verify the upload was successful"
echo "4. Take screenshots at each step"
echo

# Run the test with visible browser and debug logging
echo "🚀 Starting automation (browser will be visible)..."
echo
node tests/upload-csv.test.js --headed --debug

echo
echo "✨ Demo complete! Check the following:"
echo "  - automation/screenshots/ for visual record"
echo "  - automation/logs/ for detailed logs"
echo
echo "To run the full pipeline test (upload → train → deploy):"
echo "  cd automation && node tests/upload-csv.test.js --full --headed --debug"