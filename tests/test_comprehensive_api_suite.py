#!/usr/bin/env python3
"""
Comprehensive API Testing Suite for MLOps Dashboard
Tests all endpoints with various scenarios and edge cases
"""

import asyncio
import json
import os
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
import requests
import websockets
from dataclasses import dataclass, field
from enum import Enum


class TestStatus(Enum):
    """Test result status"""
    PASS = "✅ PASS"
    FAIL = "❌ FAIL"
    SKIP = "⏭️ SKIP"
    WARN = "⚠️ WARN"


@dataclass
class TestResult:
    """Individual test result"""
    name: str
    endpoint: str
    method: str
    status: TestStatus
    response_time: float
    status_code: Optional[int] = None
    error: Optional[str] = None
    response_data: Optional[Dict] = None
    

@dataclass 
class TestSuite:
    """Test suite results"""
    name: str
    results: List[TestResult] = field(default_factory=list)
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    
    def add_result(self, result: TestResult):
        self.results.append(result)
        
    def finalize(self):
        self.end_time = time.time()
        
    def get_summary(self) -> Dict[str, Any]:
        total = len(self.results)
        passed = sum(1 for r in self.results if r.status == TestStatus.PASS)
        failed = sum(1 for r in self.results if r.status == TestStatus.FAIL)
        skipped = sum(1 for r in self.results if r.status == TestStatus.SKIP)
        
        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "pass_rate": f"{(passed/total*100):.1f}%" if total > 0 else "0%",
            "duration": f"{(self.end_time - self.start_time):.2f}s" if self.end_time else "N/A"
        }


class APITestRunner:
    """Main API test runner"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_data = {}  # Store data between tests
        
    def _make_request(self, method: str, endpoint: str, **kwargs) -> tuple:
        """Make HTTP request and return response data"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        try:
            response = self.session.request(method, url, **kwargs)
            response_time = time.time() - start_time
            
            try:
                data = response.json()
            except:
                data = {"text": response.text}
                
            return response.status_code, data, response_time, None
            
        except Exception as e:
            response_time = time.time() - start_time
            return None, None, response_time, str(e)
            
    def test_endpoint(self, name: str, method: str, endpoint: str, 
                     expected_status: int = 200, **kwargs) -> TestResult:
        """Test a single endpoint"""
        status_code, data, response_time, error = self._make_request(method, endpoint, **kwargs)
        
        if error:
            return TestResult(
                name=name,
                endpoint=endpoint,
                method=method,
                status=TestStatus.FAIL,
                response_time=response_time,
                error=error
            )
            
        status = TestStatus.PASS if status_code == expected_status else TestStatus.FAIL
        
        return TestResult(
            name=name,
            endpoint=endpoint,
            method=method,
            status=status,
            response_time=response_time,
            status_code=status_code,
            response_data=data,
            error=f"Expected {expected_status}, got {status_code}" if status == TestStatus.FAIL else None
        )
        
    # ==================== Core API Tests ====================
    
    def test_core_apis(self) -> TestSuite:
        """Test core system APIs"""
        suite = TestSuite("Core APIs")
        
        # Health check
        suite.add_result(self.test_endpoint(
            "Health Check", "GET", "/health"
        ))
        
        # System status  
        suite.add_result(self.test_endpoint(
            "System Status", "GET", "/api/status"
        ))
        
        # Activity log
        result = self.test_endpoint(
            "Activity Log", "GET", "/api/activity"
        )
        suite.add_result(result)
        
        # Settings
        suite.add_result(self.test_endpoint(
            "Get Settings", "GET", "/api/settings"
        ))
        
        settings_data = {
            "defaultModel": "automatic",
            "trainingTimeout": 15,
            "autoValidation": True,
            "emailAddress": "test@example.com"
        }
        
        suite.add_result(self.test_endpoint(
            "Update Settings", "POST", "/api/settings",
            json=settings_data
        ))
        
        suite.finalize()
        return suite
        
    # ==================== File Upload Tests ====================
    
    def test_file_upload(self) -> TestSuite:
        """Test file upload functionality"""
        suite = TestSuite("File Upload")
        
        # Test with valid CSV
        csv_content = "age,income,purchase\n25,50000,yes\n30,60000,yes\n35,40000,no"
        files = {"file": ("test_data.csv", csv_content, "text/csv")}
        
        result = self.test_endpoint(
            "Upload Valid CSV", "POST", "/api/upload",
            files=files
        )
        suite.add_result(result)
        
        if result.status == TestStatus.PASS and result.response_data:
            self.test_data["uploaded_file"] = result.response_data
            
        # Test with invalid file type
        files = {"file": ("test.txt", "invalid content", "text/plain")}
        suite.add_result(self.test_endpoint(
            "Upload Invalid File Type", "POST", "/api/upload",
            expected_status=400,
            files=files
        ))
        
        # Test empty file
        files = {"file": ("empty.csv", "", "text/csv")}
        suite.add_result(self.test_endpoint(
            "Upload Empty File", "POST", "/api/upload",
            expected_status=400,
            files=files
        ))
        
        suite.finalize()
        return suite
        
    # ==================== Model Training Tests ====================
    
    def test_model_training(self) -> TestSuite:
        """Test model training APIs"""
        suite = TestSuite("Model Training")
        
        if "uploaded_file" not in self.test_data:
            suite.add_result(TestResult(
                name="Training Tests",
                endpoint="/api/train",
                method="POST",
                status=TestStatus.SKIP,
                response_time=0,
                error="No uploaded file available"
            ))
            suite.finalize()
            return suite
            
        # Start training
        train_data = {
            "file_path": self.test_data["uploaded_file"]["file_path"],
            "model_type": "automatic"
        }
        
        result = self.test_endpoint(
            "Start Training", "POST", "/api/train",
            json=train_data
        )
        suite.add_result(result)
        
        if result.status == TestStatus.PASS and result.response_data:
            job_id = result.response_data.get("job_id")
            self.test_data["job_id"] = job_id
            
            # Check training status
            suite.add_result(self.test_endpoint(
                "Get Training Status", "GET", f"/api/training/{job_id}"
            ))
            
        # List models
        result = self.test_endpoint(
            "List Models", "GET", "/api/models"
        )
        suite.add_result(result)
        
        if result.status == TestStatus.PASS and result.response_data:
            models = result.response_data.get("models", [])
            if models:
                model_id = models[0]["id"]
                self.test_data["model_id"] = model_id
                
                # Get model details
                suite.add_result(self.test_endpoint(
                    "Get Model Details", "GET", f"/api/models/{model_id}"
                ))
                
                # Make prediction
                predict_data = {"features": {"age": 28, "income": 55000}}
                suite.add_result(self.test_endpoint(
                    "Make Prediction", "POST", f"/api/models/{model_id}/predict",
                    json=predict_data
                ))
                
                # Deploy model
                suite.add_result(self.test_endpoint(
                    "Deploy Model", "POST", f"/api/models/{model_id}/deploy"
                ))
                
        suite.finalize()
        return suite
        
    # ==================== Pipeline Management Tests ====================
    
    def test_pipeline_management(self) -> TestSuite:
        """Test pipeline management APIs"""
        suite = TestSuite("Pipeline Management")
        
        # Create pipeline
        pipeline_data = {
            "name": "Test Pipeline",
            "description": "Automated test pipeline",
            "steps": [
                {"name": "Data Preprocessing", "type": "preprocess"},
                {"name": "Feature Engineering", "type": "feature"},
                {"name": "Model Training", "type": "train"}
            ]
        }
        
        result = self.test_endpoint(
            "Create Pipeline", "POST", "/api/pipelines",
            json=pipeline_data
        )
        suite.add_result(result)
        
        if result.status == TestStatus.PASS and result.response_data:
            pipeline_id = result.response_data.get("id")
            self.test_data["pipeline_id"] = pipeline_id
            
            # List pipelines
            suite.add_result(self.test_endpoint(
                "List Pipelines", "GET", "/api/pipelines"
            ))
            
            # Get pipeline details
            suite.add_result(self.test_endpoint(
                "Get Pipeline Details", "GET", f"/api/pipelines/{pipeline_id}"
            ))
            
            # Update pipeline
            update_data = {
                "name": "Updated Test Pipeline",
                "description": "Updated description",
                "steps": pipeline_data["steps"]
            }
            suite.add_result(self.test_endpoint(
                "Update Pipeline", "PUT", f"/api/pipelines/{pipeline_id}",
                json=update_data
            ))
            
            # Run pipeline
            suite.add_result(self.test_endpoint(
                "Run Pipeline", "POST", f"/api/pipelines/{pipeline_id}/run"
            ))
            
            # Get pipeline status
            time.sleep(1)  # Wait for pipeline to start
            suite.add_result(self.test_endpoint(
                "Get Pipeline Status", "GET", f"/api/pipelines/{pipeline_id}/status"
            ))
            
            # Delete pipeline
            suite.add_result(self.test_endpoint(
                "Delete Pipeline", "DELETE", f"/api/pipelines/{pipeline_id}"
            ))
            
        suite.finalize()
        return suite
        
    # ==================== Dataset Management Tests ====================
    
    def test_dataset_management(self) -> TestSuite:
        """Test dataset management APIs"""
        suite = TestSuite("Dataset Management")
        
        # Upload dataset
        csv_content = "id,name,value\n1,Item1,100\n2,Item2,200\n3,Item3,300"
        files = {"file": ("dataset.csv", csv_content, "text/csv")}
        
        result = self.test_endpoint(
            "Upload Dataset", "POST", "/api/datasets",
            files=files
        )
        suite.add_result(result)
        
        if result.status == TestStatus.PASS and result.response_data:
            dataset_id = result.response_data.get("id")
            self.test_data["dataset_id"] = dataset_id
            
            # List datasets
            suite.add_result(self.test_endpoint(
                "List Datasets", "GET", "/api/datasets"
            ))
            
            # Get dataset details
            suite.add_result(self.test_endpoint(
                "Get Dataset Details", "GET", f"/api/datasets/{dataset_id}"
            ))
            
            # Preview dataset
            suite.add_result(self.test_endpoint(
                "Preview Dataset", "GET", f"/api/datasets/{dataset_id}/preview?rows=5"
            ))
            
            # Get statistics
            suite.add_result(self.test_endpoint(
                "Get Dataset Statistics", "GET", f"/api/datasets/{dataset_id}/statistics"
            ))
            
            # Validate dataset
            suite.add_result(self.test_endpoint(
                "Validate Dataset", "POST", f"/api/datasets/{dataset_id}/validate"
            ))
            
            # Delete dataset
            suite.add_result(self.test_endpoint(
                "Delete Dataset", "DELETE", f"/api/datasets/{dataset_id}"
            ))
            
        suite.finalize()
        return suite
        
    # ==================== Component Health Tests ====================
    
    def test_component_health(self) -> TestSuite:
        """Test component health APIs"""
        suite = TestSuite("Component Health")
        
        # Get all components health
        suite.add_result(self.test_endpoint(
            "All Components Health", "GET", "/api/components/health"
        ))
        
        # Test individual components
        components = ["model_service", "data_processor", "websocket_server"]
        
        for component in components:
            suite.add_result(self.test_endpoint(
                f"{component} Health", "GET", f"/api/components/{component}/health"
            ))
            
            suite.add_result(self.test_endpoint(
                f"{component} Metrics", "GET", f"/api/components/{component}/metrics"
            ))
            
        suite.finalize()
        return suite
        
    # ==================== Monitoring Tests ====================
    
    def test_monitoring_apis(self) -> TestSuite:
        """Test monitoring APIs"""
        suite = TestSuite("Monitoring APIs")
        
        # Service status
        suite.add_result(self.test_endpoint(
            "Service Status", "GET", "/api/monitoring/services"
        ))
        
        # Performance metrics
        suite.add_result(self.test_endpoint(
            "Performance Metrics", "GET", "/api/monitoring/metrics"
        ))
        
        # System alerts
        result = self.test_endpoint(
            "System Alerts", "GET", "/api/monitoring/alerts"
        )
        suite.add_result(result)
        
        # Create test alert for acknowledgment test
        # Note: In real implementation, alerts would be created by the system
        # For now, we'll skip the acknowledge test if no alerts exist
        
        suite.finalize()
        return suite
        
    # ==================== WebSocket Tests ====================
    
    async def test_websocket_connection(self) -> TestSuite:
        """Test WebSocket functionality"""
        suite = TestSuite("WebSocket Tests")
        ws_url = self.base_url.replace("http", "ws") + "/ws"
        
        try:
            start_time = time.time()
            async with websockets.connect(ws_url) as websocket:
                connection_time = time.time() - start_time
                
                # Test connection
                suite.add_result(TestResult(
                    name="WebSocket Connection",
                    endpoint="/ws",
                    method="WS",
                    status=TestStatus.PASS,
                    response_time=connection_time
                ))
                
                # Send ping
                ping_data = {"type": "ping", "timestamp": time.time() * 1000}
                await websocket.send(json.dumps(ping_data))
                
                # Wait for pong
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(response)
                    
                    if data.get("type") == "pong":
                        suite.add_result(TestResult(
                            name="WebSocket Ping/Pong",
                            endpoint="/ws",
                            method="WS",
                            status=TestStatus.PASS,
                            response_time=0.1,
                            response_data=data
                        ))
                    else:
                        suite.add_result(TestResult(
                            name="WebSocket Ping/Pong",
                            endpoint="/ws",
                            method="WS",
                            status=TestStatus.FAIL,
                            response_time=0.1,
                            error="Expected pong response"
                        ))
                        
                except asyncio.TimeoutError:
                    suite.add_result(TestResult(
                        name="WebSocket Ping/Pong",
                        endpoint="/ws",
                        method="WS",
                        status=TestStatus.FAIL,
                        response_time=5.0,
                        error="Timeout waiting for pong"
                    ))
                    
        except Exception as e:
            suite.add_result(TestResult(
                name="WebSocket Connection",
                endpoint="/ws",
                method="WS",
                status=TestStatus.FAIL,
                response_time=0,
                error=str(e)
            ))
            
        suite.finalize()
        return suite
        
    # ==================== Edge Case Tests ====================
    
    def test_edge_cases(self) -> TestSuite:
        """Test edge cases and error handling"""
        suite = TestSuite("Edge Cases")
        
        # Non-existent endpoints
        suite.add_result(self.test_endpoint(
            "Non-existent Endpoint", "GET", "/api/nonexistent",
            expected_status=404
        ))
        
        # Invalid model ID
        suite.add_result(self.test_endpoint(
            "Invalid Model ID", "GET", "/api/models/invalid-id",
            expected_status=404
        ))
        
        # Invalid pipeline ID
        suite.add_result(self.test_endpoint(
            "Invalid Pipeline ID", "GET", "/api/pipelines/invalid-id",
            expected_status=404
        ))
        
        # Invalid JSON
        suite.add_result(self.test_endpoint(
            "Invalid JSON Body", "POST", "/api/settings",
            data="invalid json",
            headers={"Content-Type": "application/json"},
            expected_status=422
        ))
        
        # Missing required fields
        suite.add_result(self.test_endpoint(
            "Missing Required Fields", "POST", "/api/pipelines",
            json={},  # Missing name field
            expected_status=422
        ))
        
        suite.finalize()
        return suite
        
    # ==================== Performance Tests ====================
    
    def test_performance(self) -> TestSuite:
        """Test API performance"""
        suite = TestSuite("Performance Tests")
        
        # Concurrent requests test
        endpoints = [
            ("/api/status", "GET"),
            ("/api/models", "GET"),
            ("/api/pipelines", "GET"),
            ("/api/datasets", "GET"),
            ("/api/monitoring/metrics", "GET")
        ]
        
        for endpoint, method in endpoints:
            # Make 5 rapid requests
            response_times = []
            
            for i in range(5):
                start_time = time.time()
                status_code, _, _, error = self._make_request(method, endpoint)
                response_time = time.time() - start_time
                response_times.append(response_time)
                
            avg_time = sum(response_times) / len(response_times)
            max_time = max(response_times)
            
            # Pass if average response time < 100ms and max < 200ms
            if avg_time < 0.1 and max_time < 0.2 and not error:
                status = TestStatus.PASS
                error_msg = None
            else:
                status = TestStatus.WARN
                error_msg = f"Avg: {avg_time:.3f}s, Max: {max_time:.3f}s"
                
            suite.add_result(TestResult(
                name=f"Performance: {endpoint}",
                endpoint=endpoint,
                method=method,
                status=status,
                response_time=avg_time,
                error=error_msg
            ))
            
        suite.finalize()
        return suite
        
    # ==================== Main Test Runner ====================
    
    def run_all_tests(self) -> Dict[str, Any]:
        """Run all test suites"""
        print("🚀 Starting Comprehensive API Test Suite")
        print("=" * 60)
        
        all_suites = []
        
        # Run synchronous tests
        test_methods = [
            self.test_core_apis,
            self.test_file_upload,
            self.test_model_training,
            self.test_pipeline_management,
            self.test_dataset_management,
            self.test_component_health,
            self.test_monitoring_apis,
            self.test_edge_cases,
            self.test_performance
        ]
        
        for test_method in test_methods:
            print(f"\n📋 Running {test_method.__name__.replace('test_', '').replace('_', ' ').title()} Tests...")
            suite = test_method()
            all_suites.append(suite)
            
            # Print results
            summary = suite.get_summary()
            print(f"   Total: {summary['total']} | Passed: {summary['passed']} | "
                  f"Failed: {summary['failed']} | Pass Rate: {summary['pass_rate']}")
            
            # Print failures
            for result in suite.results:
                if result.status == TestStatus.FAIL:
                    print(f"   {result.status.value} {result.name}: {result.error}")
                    
        # Run async WebSocket tests
        print(f"\n📋 Running WebSocket Tests...")
        ws_suite = asyncio.run(self.test_websocket_connection())
        all_suites.append(ws_suite)
        
        summary = ws_suite.get_summary()
        print(f"   Total: {summary['total']} | Passed: {summary['passed']} | "
              f"Failed: {summary['failed']} | Pass Rate: {summary['pass_rate']}")
        
        # Overall summary
        print("\n" + "=" * 60)
        print("📊 OVERALL TEST SUMMARY")
        print("=" * 60)
        
        total_tests = sum(len(suite.results) for suite in all_suites)
        total_passed = sum(sum(1 for r in suite.results if r.status == TestStatus.PASS) 
                          for suite in all_suites)
        total_failed = sum(sum(1 for r in suite.results if r.status == TestStatus.FAIL) 
                          for suite in all_suites)
        total_skipped = sum(sum(1 for r in suite.results if r.status == TestStatus.SKIP) 
                           for suite in all_suites)
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {total_passed} ({total_passed/total_tests*100:.1f}%)")
        print(f"Failed: {total_failed} ({total_failed/total_tests*100:.1f}%)")
        print(f"Skipped: {total_skipped}")
        
        # Generate detailed report
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total": total_tests,
                "passed": total_passed,
                "failed": total_failed,
                "skipped": total_skipped,
                "pass_rate": f"{total_passed/total_tests*100:.1f}%"
            },
            "suites": []
        }
        
        for suite in all_suites:
            suite_data = {
                "name": suite.name,
                "summary": suite.get_summary(),
                "tests": []
            }
            
            for result in suite.results:
                test_data = {
                    "name": result.name,
                    "endpoint": result.endpoint,
                    "method": result.method,
                    "status": result.status.value,
                    "response_time": f"{result.response_time:.3f}s",
                    "status_code": result.status_code,
                    "error": result.error
                }
                suite_data["tests"].append(test_data)
                
            report["suites"].append(suite_data)
            
        # Save report
        report_path = "test_report.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2)
            
        print(f"\n📄 Detailed report saved to: {report_path}")
        
        # Cleanup test data if model was created
        if "model_id" in self.test_data:
            try:
                self._make_request("DELETE", f"/api/models/{self.test_data['model_id']}")
            except:
                pass
                
        return report


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Comprehensive API Test Suite")
    parser.add_argument("--base-url", default="http://localhost:8000", 
                       help="Base URL of the API server")
    parser.add_argument("--save-report", default="test_report.json",
                       help="Path to save the test report")
    
    args = parser.parse_args()
    
    # Check if server is running
    try:
        response = requests.get(f"{args.base_url}/health", timeout=2)
        if response.status_code != 200:
            print("❌ Server health check failed!")
            return 1
    except:
        print("❌ Cannot connect to server. Make sure it's running at:", args.base_url)
        return 1
        
    # Run tests
    runner = APITestRunner(args.base_url)
    report = runner.run_all_tests()
    
    # Return exit code based on failures
    if report["summary"]["failed"] > 0:
        return 1
    return 0


if __name__ == "__main__":
    exit(main())