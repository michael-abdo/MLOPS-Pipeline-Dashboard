#!/usr/bin/env python3
"""
Test script for new API endpoints
Tests all the newly added endpoints to ensure they're working correctly
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_endpoint(method, endpoint, data=None, description=""):
    """Test an API endpoint and print results"""
    url = f"{BASE_URL}{endpoint}"
    print(f"\n{'='*60}")
    print(f"Testing: {method} {endpoint}")
    if description:
        print(f"Description: {description}")
    
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        elif method == "PUT":
            response = requests.put(url, json=data)
        elif method == "DELETE":
            response = requests.delete(url)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code < 400:
            print("✅ Success")
            if response.text:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2, default=str)[:200]}...")
                return data
        else:
            print("❌ Failed")
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
    
    return None

def test_pipeline_apis():
    """Test Pipeline Management APIs"""
    print("\n" + "="*80)
    print("TESTING PIPELINE MANAGEMENT APIs")
    print("="*80)
    
    # Create pipeline
    pipeline_data = {
        "name": "Test Pipeline",
        "description": "A test ML pipeline",
        "steps": [
            {"name": "Data Preprocessing", "type": "preprocess"},
            {"name": "Feature Engineering", "type": "feature_eng"},
            {"name": "Model Training", "type": "train"},
            {"name": "Model Evaluation", "type": "evaluate"}
        ]
    }
    
    result = test_endpoint("POST", "/api/pipelines", pipeline_data, "Create new pipeline")
    pipeline_id = result.get("id") if result else None
    
    # List pipelines
    test_endpoint("GET", "/api/pipelines", description="List all pipelines")
    
    if pipeline_id:
        # Get specific pipeline
        test_endpoint("GET", f"/api/pipelines/{pipeline_id}", description="Get pipeline details")
        
        # Update pipeline
        update_data = {
            "name": "Updated Test Pipeline",
            "description": "Updated description",
            "steps": pipeline_data["steps"]
        }
        test_endpoint("PUT", f"/api/pipelines/{pipeline_id}", update_data, "Update pipeline")
        
        # Run pipeline
        test_endpoint("POST", f"/api/pipelines/{pipeline_id}/run", description="Execute pipeline")
        
        # Check status
        time.sleep(2)
        test_endpoint("GET", f"/api/pipelines/{pipeline_id}/status", description="Get pipeline status")
        
        # Delete pipeline
        time.sleep(5)
        test_endpoint("DELETE", f"/api/pipelines/{pipeline_id}", description="Delete pipeline")

def test_dataset_apis():
    """Test Dataset Management APIs"""
    print("\n" + "="*80)
    print("TESTING DATASET MANAGEMENT APIs")
    print("="*80)
    
    # List datasets
    result = test_endpoint("GET", "/api/datasets", description="List all datasets")
    
    # Get first dataset if any exist
    if result and result.get("datasets"):
        dataset_id = result["datasets"][0]["id"]
        
        # Get dataset details
        test_endpoint("GET", f"/api/datasets/{dataset_id}", description="Get dataset details")
        
        # Preview dataset
        test_endpoint("GET", f"/api/datasets/{dataset_id}/preview?rows=5", description="Preview dataset")
        
        # Get statistics
        test_endpoint("GET", f"/api/datasets/{dataset_id}/statistics", description="Get dataset statistics")
        
        # Validate dataset
        test_endpoint("POST", f"/api/datasets/{dataset_id}/validate", description="Validate dataset")
    else:
        print("ℹ️  No datasets found. Upload a file through the dashboard first.")

def test_component_health_apis():
    """Test Component Health APIs"""
    print("\n" + "="*80)
    print("TESTING COMPONENT HEALTH APIs")
    print("="*80)
    
    # Get all component health
    test_endpoint("GET", "/api/components/health", description="Get all component health")
    
    # Get specific component health
    test_endpoint("GET", "/api/components/model_service/health", description="Get model service health")
    
    # Get component metrics
    test_endpoint("GET", "/api/components/model_service/metrics", description="Get model service metrics")

def test_monitoring_apis():
    """Test Monitoring APIs"""
    print("\n" + "="*80)
    print("TESTING MONITORING APIs")
    print("="*80)
    
    # Get service status
    test_endpoint("GET", "/api/monitoring/services", description="Get service status")
    
    # Get performance metrics
    test_endpoint("GET", "/api/monitoring/metrics", description="Get performance metrics")
    
    # Get alerts
    test_endpoint("GET", "/api/monitoring/alerts", description="Get system alerts")

def test_page_routes():
    """Test that page routes are serving HTML"""
    print("\n" + "="*80)
    print("TESTING PAGE ROUTES")
    print("="*80)
    
    pages = ["/pipeline", "/architecture", "/data", "/monitoring"]
    
    for page in pages:
        url = f"{BASE_URL}{page}"
        try:
            response = requests.get(url)
            if response.status_code == 200 and "<!DOCTYPE html>" in response.text:
                print(f"✅ {page} - Page served successfully")
            else:
                print(f"❌ {page} - Failed (Status: {response.status_code})")
        except Exception as e:
            print(f"❌ {page} - Exception: {str(e)}")

if __name__ == "__main__":
    print("🚀 Testing New API Endpoints")
    print("Make sure the backend server is running on http://localhost:8000")
    
    # Test page routes first
    test_page_routes()
    
    # Test API endpoints
    test_pipeline_apis()
    test_dataset_apis()
    test_component_health_apis()
    test_monitoring_apis()
    
    print("\n✅ All tests completed!")