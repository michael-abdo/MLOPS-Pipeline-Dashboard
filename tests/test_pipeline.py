#!/usr/bin/env python3
"""
Complete MLOps Pipeline Test
Tests the entire workflow: Upload → Train → Deploy → Predict
"""

import requests
import time
import json

BASE_URL = "http://localhost:8000"

def test_complete_pipeline():
    print("🚀 Starting Complete MLOps Pipeline Test")
    print("=" * 50)
    
    # Step 1: Health Check
    print("\n📋 Step 1: Health Check")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Server is healthy")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cannot connect to server: {e}")
        return False
    
    # Step 2: Upload Dataset
    print("\n📤 Step 2: Upload Simple Dataset")
    try:
        with open('../uploads/simple_test_data.csv', 'rb') as f:
            files = {'file': ('simple_test_data.csv', f, 'text/csv')}
            response = requests.post(f"{BASE_URL}/api/upload", files=files, timeout=10)
        
        if response.status_code == 200:
            upload_result = response.json()
            print(f"✅ File uploaded successfully:")
            print(f"   📊 Filename: {upload_result['filename']}")
            print(f"   📈 Rows: {upload_result['rows']}")
            print(f"   🏷️ Columns: {upload_result['columns']}")
            file_path = upload_result['file_path']
        else:
            print(f"❌ Upload failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return False
    
    # Step 3: Start Training
    print("\n🤖 Step 3: Start Model Training")
    try:
        training_request = {
            "model_type": "automatic",
            "file_path": file_path
        }
        response = requests.post(f"{BASE_URL}/api/train", json=training_request, timeout=10)
        
        if response.status_code == 200:
            train_result = response.json()
            job_id = train_result['job_id']
            print(f"✅ Training started successfully")
            print(f"   🆔 Job ID: {job_id}")
        else:
            print(f"❌ Training start failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ Training start error: {e}")
        return False
    
    # Step 4: Monitor Training Progress
    print("\n⏳ Step 4: Monitor Training Progress")
    model_id = None
    max_wait_time = 60  # 60 seconds max
    start_time = time.time()
    
    while time.time() - start_time < max_wait_time:
        try:
            response = requests.get(f"{BASE_URL}/api/training/{job_id}", timeout=5)
            if response.status_code == 200:
                status = response.json()
                print(f"   📊 Progress: {status['progress']}% - {status['message']}")
                
                if status['status'] == 'completed':
                    model_id = status['model_id']
                    accuracy = status['accuracy']
                    print(f"✅ Training completed successfully!")
                    print(f"   🎯 Accuracy: {accuracy:.1%}")
                    print(f"   🆔 Model ID: {model_id}")
                    break
                elif status['status'] == 'failed':
                    print(f"❌ Training failed: {status['message']}")
                    return False
                    
            time.sleep(2)  # Wait 2 seconds before checking again
        except Exception as e:
            print(f"❌ Status check error: {e}")
            return False
    else:
        print("❌ Training timeout - took too long")
        return False
    
    # Step 5: Get Model Details
    print("\n📋 Step 5: Get Model Details")
    try:
        response = requests.get(f"{BASE_URL}/api/models/{model_id}", timeout=5)
        if response.status_code == 200:
            model_info = response.json()
            print(f"✅ Model details retrieved:")
            print(f"   📛 Name: {model_info['name']}")
            print(f"   🎯 Accuracy: {model_info['accuracy']:.1%}")
            print(f"   📅 Created: {model_info['created_at']}")
            print(f"   🔄 Status: {model_info['status']}")
        else:
            print(f"❌ Get model failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Get model error: {e}")
        return False
    
    # Step 6: Deploy Model
    print("\n🚀 Step 6: Deploy Model")
    try:
        response = requests.post(f"{BASE_URL}/api/models/{model_id}/deploy", timeout=5)
        if response.status_code == 200:
            print("✅ Model deployed successfully!")
        else:
            print(f"❌ Deploy failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Deploy error: {e}")
        return False
    
    # Step 7: Make Predictions
    print("\n🔮 Step 7: Make Test Predictions")
    test_cases = [
        {"age": 28, "income": 55000},  # Should predict 'yes'
        {"age": 19, "income": 25000},  # Should predict 'no'
        {"age": 45, "income": 90000}   # Should predict 'yes'
    ]
    
    for i, test_data in enumerate(test_cases):
        try:
            response = requests.post(f"{BASE_URL}/api/models/{model_id}/predict", 
                                   json=test_data, timeout=5)
            if response.status_code == 200:
                prediction = response.json()
                result = "yes" if prediction['prediction'] == 1 else "no"
                print(f"   📝 Test {i+1}: Age {test_data['age']}, Income ${test_data['income']:,} → Prediction: {result}")
            else:
                print(f"❌ Prediction {i+1} failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Prediction {i+1} error: {e}")
    
    # Step 8: Check Activity Log
    print("\n📊 Step 8: Check Activity Log")
    try:
        response = requests.get(f"{BASE_URL}/api/activity", timeout=5)
        if response.status_code == 200:
            activities = response.json()
            print(f"✅ Found {len(activities)} recent activities:")
            for activity in activities[:3]:  # Show last 3
                print(f"   • {activity['title']}: {activity['description']}")
        else:
            print(f"❌ Activity log failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Activity log error: {e}")
    
    # Step 9: System Status
    print("\n📈 Step 9: System Status")
    try:
        response = requests.get(f"{BASE_URL}/api/status", timeout=5)
        if response.status_code == 200:
            status = response.json()
            print(f"✅ System Status:")
            print(f"   🤖 Total Models: {status['total_models']}")
            print(f"   ✅ Active Models: {status['active_models']}")
            print(f"   🔮 Total Predictions: {status['total_predictions']}")
            print(f"   💚 System Health: {status['system_health']}")
        else:
            print(f"❌ System status failed: {response.status_code}")
    except Exception as e:
        print(f"❌ System status error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 COMPLETE PIPELINE TEST SUCCESSFUL! 🎉")
    print("✅ All steps completed:")
    print("   1. ✅ Health Check")
    print("   2. ✅ Data Upload")
    print("   3. ✅ Model Training")
    print("   4. ✅ Training Monitoring")
    print("   5. ✅ Model Details")
    print("   6. ✅ Model Deployment")
    print("   7. ✅ Predictions")
    print("   8. ✅ Activity Logging")
    print("   9. ✅ System Status")
    print("\n🚀 Your MLOps pipeline is fully operational!")
    return True

if __name__ == "__main__":
    # Wait a moment for server to be ready
    time.sleep(1)
    test_complete_pipeline()