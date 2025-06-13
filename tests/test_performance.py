#!/usr/bin/env python3
"""
Performance Test Suite for MLOps Dashboard APIs
Tests response times, concurrent requests, and load handling
"""

import asyncio
import concurrent.futures
import json
import statistics
import time
from datetime import datetime
from typing import Dict, List, Tuple
import requests


class PerformanceTests:
    """Performance testing suite"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        
    def time_request(self, method: str, endpoint: str, **kwargs) -> Tuple[float, int]:
        """Time a single request"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.perf_counter()
        
        try:
            response = self.session.request(method, url, **kwargs)
            end_time = time.perf_counter()
            return end_time - start_time, response.status_code
        except Exception as e:
            end_time = time.perf_counter()
            return end_time - start_time, -1
    
    def test_response_times(self) -> Dict[str, any]:
        """Test individual endpoint response times"""
        print("🏃 Testing Response Times...")
        
        endpoints = [
            ("GET", "/health"),
            ("GET", "/api/status"),
            ("GET", "/api/activity"),
            ("GET", "/api/models"),
            ("GET", "/api/pipelines"),
            ("GET", "/api/datasets"),
            ("GET", "/api/components/health"),
            ("GET", "/api/monitoring/services"),
            ("GET", "/api/monitoring/metrics"),
        ]
        
        results = {}
        
        for method, endpoint in endpoints:
            times = []
            status_codes = []
            
            # Run each endpoint 10 times
            for _ in range(10):
                response_time, status_code = self.time_request(method, endpoint)
                times.append(response_time)
                status_codes.append(status_code)
                time.sleep(0.1)  # Small delay
            
            # Calculate statistics
            avg_time = statistics.mean(times)
            min_time = min(times)
            max_time = max(times)
            median_time = statistics.median(times)
            
            # Check if all requests succeeded
            success_rate = sum(1 for code in status_codes if 200 <= code < 300) / len(status_codes)
            
            results[f"{method} {endpoint}"] = {
                "avg_ms": round(avg_time * 1000, 2),
                "min_ms": round(min_time * 1000, 2),
                "max_ms": round(max_time * 1000, 2),
                "median_ms": round(median_time * 1000, 2),
                "success_rate": f"{success_rate:.1%}",
                "status": "✅ FAST" if avg_time < 0.1 else "⚠️ SLOW" if avg_time < 0.5 else "❌ TOO SLOW"
            }
            
            print(f"  {results[f'{method} {endpoint}']['status']} {method} {endpoint}: "
                  f"{results[f'{method} {endpoint}']['avg_ms']}ms avg")
        
        return results
    
    def test_concurrent_requests(self) -> Dict[str, any]:
        """Test concurrent request handling"""
        print("\n🔄 Testing Concurrent Requests...")
        
        def make_request(endpoint_info):
            method, endpoint = endpoint_info
            return self.time_request(method, endpoint)
        
        # Test with increasing concurrency
        test_cases = [
            (5, "Light Load"),
            (10, "Medium Load"), 
            (20, "Heavy Load"),
            (50, "Stress Test")
        ]
        
        results = {}
        endpoint = ("GET", "/api/status")  # Use a simple endpoint
        
        for concurrent_count, test_name in test_cases:
            print(f"  Testing {test_name} ({concurrent_count} concurrent requests)...")
            
            start_time = time.perf_counter()
            
            # Make concurrent requests
            with concurrent.futures.ThreadPoolExecutor(max_workers=concurrent_count) as executor:
                futures = [executor.submit(make_request, endpoint) for _ in range(concurrent_count)]
                request_results = [future.result() for future in futures]
            
            end_time = time.perf_counter()
            total_time = end_time - start_time
            
            # Analyze results
            response_times = [result[0] for result in request_results]
            status_codes = [result[1] for result in request_results]
            
            avg_response_time = statistics.mean(response_times)
            max_response_time = max(response_times)
            success_count = sum(1 for code in status_codes if 200 <= code < 300)
            
            throughput = concurrent_count / total_time
            
            results[test_name] = {
                "concurrent_requests": concurrent_count,
                "total_time_s": round(total_time, 2),
                "avg_response_ms": round(avg_response_time * 1000, 2),
                "max_response_ms": round(max_response_time * 1000, 2),
                "success_rate": f"{success_count/concurrent_count:.1%}",
                "throughput_rps": round(throughput, 1),
                "status": "✅ GOOD" if success_count == concurrent_count and avg_response_time < 0.2 
                         else "⚠️ DEGRADED" if success_count >= concurrent_count * 0.9 
                         else "❌ POOR"
            }
            
            print(f"    {results[test_name]['status']} {success_count}/{concurrent_count} successful, "
                  f"{results[test_name]['throughput_rps']} req/s")
    
        return results
    
    def test_sustained_load(self) -> Dict[str, any]:
        """Test sustained load over time"""
        print("\n⏱️ Testing Sustained Load (30 seconds)...")
        
        duration = 30  # seconds
        requests_per_second = 5
        endpoint = ("GET", "/api/status")
        
        start_time = time.perf_counter()
        end_time = start_time + duration
        
        results = []
        request_count = 0
        
        while time.perf_counter() < end_time:
            response_time, status_code = self.time_request(endpoint[0], endpoint[1])
            results.append({
                "timestamp": time.perf_counter() - start_time,
                "response_time": response_time,
                "status_code": status_code
            })
            request_count += 1
            
            # Maintain target rate
            time.sleep(1.0 / requests_per_second)
        
        # Analyze sustained performance
        response_times = [r["response_time"] for r in results]
        status_codes = [r["status_code"] for r in results]
        
        success_count = sum(1 for code in status_codes if 200 <= code < 300)
        avg_response_time = statistics.mean(response_times)
        
        # Check for performance degradation over time
        first_half = response_times[:len(response_times)//2]
        second_half = response_times[len(response_times)//2:]
        
        degradation = (statistics.mean(second_half) - statistics.mean(first_half)) / statistics.mean(first_half) * 100
        
        result = {
            "duration_s": duration,
            "total_requests": request_count,
            "success_rate": f"{success_count/request_count:.1%}",
            "avg_response_ms": round(avg_response_time * 1000, 2),
            "performance_degradation": f"{degradation:+.1f}%",
            "status": "✅ STABLE" if abs(degradation) < 20 and success_count/request_count > 0.95
                     else "⚠️ DEGRADED" if abs(degradation) < 50 
                     else "❌ UNSTABLE"
        }
        
        print(f"  {result['status']} {request_count} requests, "
              f"{result['success_rate']} success, "
              f"{result['performance_degradation']} degradation")
        
        return result
    
    def test_file_upload_performance(self) -> Dict[str, any]:
        """Test file upload performance with different sizes"""
        print("\n📁 Testing File Upload Performance...")
        
        file_sizes = [
            (100, "Small (100 rows)"),
            (1000, "Medium (1K rows)"),
            (10000, "Large (10K rows)")
        ]
        
        results = {}
        
        for row_count, size_name in file_sizes:
            # Generate CSV content
            csv_content = "id,name,value,category,score\n"
            for i in range(row_count):
                csv_content += f"{i},Item{i},{i*10},Cat{i%5},{i/100:.2f}\n"
            
            files = {"file": (f"test_{row_count}.csv", csv_content, "text/csv")}
            
            # Time the upload
            start_time = time.perf_counter()
            response_time, status_code = self.time_request("POST", "/api/upload", files=files)
            
            file_size_kb = len(csv_content.encode()) / 1024
            upload_speed_kbps = file_size_kb / response_time if response_time > 0 else 0
            
            results[size_name] = {
                "rows": row_count,
                "size_kb": round(file_size_kb, 1),
                "upload_time_s": round(response_time, 2),
                "upload_speed_kbps": round(upload_speed_kbps, 1),
                "status_code": status_code,
                "status": "✅ FAST" if response_time < 1.0 else "⚠️ SLOW" if response_time < 5.0 else "❌ TOO SLOW"
            }
            
            print(f"  {results[size_name]['status']} {size_name}: "
                  f"{results[size_name]['upload_time_s']}s, "
                  f"{results[size_name]['upload_speed_kbps']} KB/s")
            
            time.sleep(1)  # Delay between uploads
        
        return results
    
    def run_all_performance_tests(self) -> Dict[str, any]:
        """Run all performance tests"""
        print("🚀 Starting Performance Test Suite")
        print("=" * 60)
        
        # Check server connectivity
        try:
            response_time, status_code = self.time_request("GET", "/health")
            if status_code != 200:
                print("❌ Server health check failed!")
                return {}
            print(f"✅ Server responsive ({response_time*1000:.1f}ms)")
        except:
            print("❌ Cannot connect to server!")
            return {}
        
        start_time = time.perf_counter()
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "response_times": self.test_response_times(),
            "concurrent_requests": self.test_concurrent_requests(),
            "sustained_load": self.test_sustained_load(),
            "file_upload": self.test_file_upload_performance()
        }
        
        total_time = time.perf_counter() - start_time
        
        print("\n" + "=" * 60)
        print("📊 PERFORMANCE TEST SUMMARY")
        print("=" * 60)
        
        # Count results by status
        all_statuses = []
        
        # Response times
        for test, data in results["response_times"].items():
            all_statuses.append(data["status"])
            
        # Concurrent requests
        for test, data in results["concurrent_requests"].items():
            all_statuses.append(data["status"])
            
        # Sustained load
        all_statuses.append(results["sustained_load"]["status"])
        
        # File upload
        for test, data in results["file_upload"].items():
            all_statuses.append(data["status"])
        
        # Count status types
        good_count = sum(1 for s in all_statuses if s.startswith("✅"))
        warning_count = sum(1 for s in all_statuses if s.startswith("⚠️"))
        bad_count = sum(1 for s in all_statuses if s.startswith("❌"))
        
        print(f"Total Tests: {len(all_statuses)}")
        print(f"Good: {good_count} | Warnings: {warning_count} | Poor: {bad_count}")
        print(f"Test Duration: {total_time:.1f}s")
        
        # Overall assessment
        if bad_count == 0 and warning_count <= len(all_statuses) * 0.2:
            print("🎉 Overall Performance: EXCELLENT")
        elif bad_count <= len(all_statuses) * 0.1:
            print("✅ Overall Performance: GOOD")
        elif bad_count <= len(all_statuses) * 0.3:
            print("⚠️ Overall Performance: NEEDS IMPROVEMENT")
        else:
            print("❌ Overall Performance: POOR")
        
        # Save detailed results
        with open("performance_report.json", "w") as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"\n📄 Detailed performance report saved to: performance_report.json")
        
        return results


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Performance Test Suite")
    parser.add_argument("--base-url", default="http://localhost:8000",
                       help="Base URL of the API server")
    
    args = parser.parse_args()
    
    tester = PerformanceTests(args.base_url)
    results = tester.run_all_performance_tests()
    
    # Return exit code based on results
    if not results:
        return 1
    
    # Count severe issues
    severe_issues = 0
    
    # Check response times
    for test, data in results.get("response_times", {}).items():
        if data["status"].startswith("❌"):
            severe_issues += 1
    
    # Check concurrent performance
    for test, data in results.get("concurrent_requests", {}).items():
        if data["status"].startswith("❌"):
            severe_issues += 1
    
    # Check sustained load
    if results.get("sustained_load", {}).get("status", "").startswith("❌"):
        severe_issues += 1
    
    return 1 if severe_issues > 0 else 0


if __name__ == "__main__":
    exit(main())