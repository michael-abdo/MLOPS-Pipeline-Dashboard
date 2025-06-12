#!/usr/bin/env python3
"""
Test Runner - Executes all available tests
"""

import os
import sys
import subprocess
import time
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_test(test_name: str, test_command: list) -> bool:
    """Run a single test and return success status"""
    print(f"\n{'='*60}")
    print(f"🧪 Running: {test_name}")
    print(f"{'='*60}")
    
    start_time = time.time()
    
    try:
        result = subprocess.run(
            test_command,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        duration = time.time() - start_time
        
        if result.returncode == 0:
            print(f"✅ PASSED ({duration:.2f}s)")
            if result.stdout:
                print("\nOutput:")
                print(result.stdout[-500:])  # Last 500 chars
            return True
        else:
            print(f"❌ FAILED ({duration:.2f}s)")
            if result.stderr:
                print("\nError:")
                print(result.stderr[-500:])
            if result.stdout:
                print("\nOutput:")
                print(result.stdout[-500:])
            return False
            
    except subprocess.TimeoutExpired:
        print(f"⏱️ TIMEOUT (exceeded 60s)")
        return False
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False


def main():
    """Run all tests"""
    print("🚀 MLOps Dashboard - Complete Test Suite")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # Check if virtual environment is activated
    if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        print("⚠️  Warning: Virtual environment not activated!")
        print("   Run: source venv/bin/activate")
        print()
    
    # Define all test suites
    tests = [
        ("Basic API Tests", ["python", "tests/test_simple.py"]),
        ("API Endpoint Tests", ["python", "tests/test_api.py"]),
        ("New API Tests", ["python", "tests/test_new_apis.py"]),
        ("Pipeline Tests", ["python", "tests/test_pipeline.py"]),
        ("WebSocket Tests", ["python", "tests/test_websocket_only.py"]),
        ("Comprehensive Test Suite", ["python", "tests/test_comprehensive_api_suite.py"]),
    ]
    
    # Check if server is running
    print("🔍 Checking server status...")
    try:
        import requests
        response = requests.get("http://localhost:8000/health", timeout=2)
        if response.status_code == 200:
            print("✅ Server is running")
        else:
            print("❌ Server returned non-200 status")
    except:
        print("❌ Cannot connect to server at http://localhost:8000")
        print("   Please start the server first:")
        print("   python backend/backend_simple.py")
        return 1
    
    # Run all tests
    results = {}
    total_start = time.time()
    
    for test_name, test_command in tests:
        success = run_test(test_name, test_command)
        results[test_name] = success
        
        # Small delay between tests
        time.sleep(0.5)
    
    total_duration = time.time() - total_start
    
    # Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for success in results.values() if success)
    failed = len(results) - passed
    
    print(f"Total Tests: {len(results)}")
    print(f"Passed: {passed} ({passed/len(results)*100:.1f}%)")
    print(f"Failed: {failed} ({failed/len(results)*100:.1f}%)")
    print(f"Duration: {total_duration:.2f}s")
    
    print("\nDetails:")
    for test_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status} - {test_name}")
    
    # Generate test report
    report_content = f"""# Test Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary
- Total Tests: {len(results)}
- Passed: {passed} ({passed/len(results)*100:.1f}%)
- Failed: {failed} ({failed/len(results)*100:.1f}%)
- Duration: {total_duration:.2f}s

## Results
"""
    
    for test_name, success in results.items():
        status = "PASS ✅" if success else "FAIL ❌"
        report_content += f"- **{test_name}**: {status}\n"
    
    # Save report
    report_path = "test_report.md"
    with open(report_path, "w") as f:
        f.write(report_content)
    
    print(f"\n📄 Test report saved to: {report_path}")
    
    # Return appropriate exit code
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())