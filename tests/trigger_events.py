#!/usr/bin/env python3
"""Trigger various WebSocket events for testing"""

import requests
import time
import sys

BASE_URL = "http://localhost:8000"

def trigger_pipeline_events():
    print("\n🔧 Triggering Pipeline Events...")
    
    # Create pipeline
    pipeline_data = {
        "name": "Test Pipeline",
        "description": "Testing WebSocket events",
        "steps": [
            {"name": "Load Data", "type": "input"},
            {"name": "Process", "type": "process"},
            {"name": "Save Results", "type": "output"}
        ]
    }
    
    response = requests.post(f"{BASE_URL}/api/pipelines", json=pipeline_data)
    if response.status_code == 200:
        pipeline = response.json()
        pipeline_id = pipeline['id']
        print(f"✅ Created pipeline: {pipeline_id}")
        time.sleep(1)
        
        # Run pipeline
        run_response = requests.post(f"{BASE_URL}/api/pipelines/{pipeline_id}/run")
        if run_response.status_code == 200:
            print("✅ Started pipeline execution")
        else:
            print(f"❌ Failed to run pipeline: {run_response.status_code}")
    else:
        print(f"❌ Failed to create pipeline: {response.status_code}")

def trigger_data_events():
    print("\n📊 Triggering Data Events...")
    
    # Upload dataset
    csv_content = "name,age,salary\\nAlice,30,75000\\nBob,35,85000\\nCharlie,28,65000\\n"
    files = {'file': ('employees.csv', csv_content, 'text/csv')}
    
    response = requests.post(f"{BASE_URL}/api/datasets", files=files)
    if response.status_code == 200:
        dataset = response.json()
        dataset_id = dataset['id']
        print(f"✅ Uploaded dataset: {dataset_id}")
        time.sleep(1)
        
        # Get statistics (triggers quality_assessment)
        stats_response = requests.get(f"{BASE_URL}/api/datasets/{dataset_id}/statistics")
        if stats_response.status_code == 200:
            print("✅ Retrieved dataset statistics")
        
        time.sleep(1)
        
        # Start processing job
        job_response = requests.post(f"{BASE_URL}/api/datasets/{dataset_id}/process")
        if job_response.status_code == 200:
            print("✅ Started data processing job")
        else:
            print(f"❌ Failed to start processing: {job_response.status_code}")
    else:
        print(f"❌ Failed to upload dataset: {response.status_code}")

def trigger_monitoring_events():
    print("\n📈 Triggering Monitoring Events...")
    
    # Service health
    response = requests.get(f"{BASE_URL}/api/monitoring/services")
    if response.status_code == 200:
        print("✅ Retrieved service health")
    
    time.sleep(1)
    
    # Performance metrics
    response = requests.get(f"{BASE_URL}/api/monitoring/metrics")
    if response.status_code == 200:
        print("✅ Retrieved performance metrics")
    
    time.sleep(1)
    
    # System alert
    response = requests.post(f"{BASE_URL}/debug/create-alert", params={
        "title": "Test System Alert",
        "message": "This is a test alert for WebSocket verification",
        "priority": "medium"
    })
    if response.status_code == 200:
        print("✅ Created system alert")

def trigger_architecture_events():
    print("\n🏗️ Triggering Architecture Events...")
    
    # Component health
    response = requests.get(f"{BASE_URL}/api/components/health")
    if response.status_code == 200:
        print("✅ Retrieved component health")

def trigger_training_events():
    print("\n🤖 Triggering Training Events...")
    
    # Upload training data
    csv_content = "feature1,feature2,target\\n1,2,0\\n3,4,1\\n5,6,0\\n7,8,1\\n"
    files = {'file': ('training_data.csv', csv_content, 'text/csv')}
    
    response = requests.post(f"{BASE_URL}/api/upload", files=files)
    if response.status_code == 200:
        upload_data = response.json()
        file_path = upload_data['file_path']
        print(f"✅ Uploaded training data: {file_path}")
        time.sleep(1)
        
        # Start training
        training_data = {
            "model_type": "automatic",
            "file_path": file_path
        }
        
        train_response = requests.post(f"{BASE_URL}/api/train", json=training_data)
        if train_response.status_code == 200:
            job_data = train_response.json()
            print(f"✅ Started training job: {job_data['job_id']}")
            print("⏳ Training will take ~15 seconds...")
        else:
            print(f"❌ Failed to start training: {train_response.status_code}")
    else:
        print(f"❌ Failed to upload training data: {response.status_code}")

def main():
    print("🚀 WebSocket Event Trigger Script")
    print("Make sure:")
    print("1. Backend is running on http://localhost:8000")
    print("2. WebSocket listener is running in another terminal")
    print("-" * 50)
    
    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        # Trigger all events
        trigger_pipeline_events()
        time.sleep(2)
        trigger_data_events()
        time.sleep(2)
        trigger_monitoring_events()
        time.sleep(2)
        trigger_architecture_events()
        time.sleep(2)
        trigger_training_events()
    else:
        # Interactive mode
        while True:
            print("\nSelect events to trigger:")
            print("1. Pipeline events")
            print("2. Data management events")
            print("3. Monitoring events")
            print("4. Architecture events")
            print("5. Training events")
            print("6. All events")
            print("0. Exit")
            
            choice = input("\nEnter choice (0-6): ")
            
            if choice == "0":
                break
            elif choice == "1":
                trigger_pipeline_events()
            elif choice == "2":
                trigger_data_events()
            elif choice == "3":
                trigger_monitoring_events()
            elif choice == "4":
                trigger_architecture_events()
            elif choice == "5":
                trigger_training_events()
            elif choice == "6":
                trigger_pipeline_events()
                time.sleep(2)
                trigger_data_events()
                time.sleep(2)
                trigger_monitoring_events()
                time.sleep(2)
                trigger_architecture_events()
                time.sleep(2)
                trigger_training_events()
            else:
                print("Invalid choice")
    
    print("\n✅ Done!")

if __name__ == "__main__":
    main()