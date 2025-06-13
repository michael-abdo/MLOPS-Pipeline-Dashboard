#!/usr/bin/env python3
"""Test model metrics real-time integration"""

import asyncio
import json
import time
import websockets
import requests
from datetime import datetime

BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws"

async def test_model_metrics_integration():
    """Test complete model metrics integration flow"""
    print("🧪 Testing Live System Status Model Metrics Integration")
    print("=" * 60)
    
    # Test 1: Check new API endpoints
    print("\n1️⃣ Testing new API endpoints...")
    
    endpoints_to_test = [
        "/api/monitoring/system",
        "/api/models/active/status",
        "/api/models"
    ]
    
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ {endpoint} - OK")
                
                # Check for model_metrics section in monitoring/system
                if endpoint == "/api/monitoring/system":
                    if "model_metrics" in data:
                        print(f"      📊 Model metrics included: {len(data['model_metrics'].get('models', {}))} models")
                    else:
                        print(f"      ⚠️  No model_metrics section found")
                        
            else:
                print(f"   ❌ {endpoint} - Failed ({response.status_code})")
        except Exception as e:
            print(f"   ❌ {endpoint} - Error: {e}")
    
    # Test 2: Create a test model by uploading data and training
    print("\n2️⃣ Creating test model for metrics tracking...")
    
    try:
        # Upload test data
        csv_content = "feature1,feature2,target\n1,2,0\n3,4,1\n5,6,0\n7,8,1\n"
        files = {'file': ('test_metrics.csv', csv_content, 'text/csv')}
        
        upload_response = requests.post(f"{BASE_URL}/api/upload", files=files)
        if upload_response.status_code == 200:
            file_info = upload_response.json()
            print(f"   ✅ Test data uploaded: {file_info['filename']}")
            
            # Start training
            training_data = {
                "model_type": "classification",
                "file_path": file_info["file_path"],
                "target_column": "target"
            }
            
            train_response = requests.post(f"{BASE_URL}/api/train", json=training_data)
            if train_response.status_code == 200:
                job_info = train_response.json()
                job_id = job_info["job_id"]
                print(f"   ✅ Training started: {job_id}")
                
                # Wait for training to complete
                print("   ⏳ Waiting for training to complete...")
                for i in range(30):  # Wait up to 30 seconds
                    status_response = requests.get(f"{BASE_URL}/api/training/{job_id}")
                    if status_response.status_code == 200:
                        status = status_response.json()
                        if status["status"] == "completed":
                            model_id = status.get("model_id")
                            print(f"   ✅ Training completed! Model ID: {model_id}")
                            return model_id
                        elif status["status"] == "failed":
                            print(f"   ❌ Training failed: {status.get('message', 'Unknown error')}")
                            return None
                    await asyncio.sleep(1)
                    
                print("   ⚠️  Training timeout")
                return None
        else:
            print(f"   ❌ Upload failed: {upload_response.status_code}")
            return None
            
    except Exception as e:
        print(f"   ❌ Model creation error: {e}")
        return None

async def test_prediction_and_websocket(model_id):
    """Test making predictions and WebSocket events"""
    if not model_id:
        print("\n⚠️  Skipping prediction tests - no model available")
        return
        
    print(f"\n3️⃣ Testing predictions and WebSocket events for model {model_id}...")
    
    # Connect to WebSocket
    websocket_events = []
    
    try:
        ws = await websockets.connect(WS_URL)
        print("   ✅ Connected to WebSocket")
        
        # Start listening for events
        async def listen_for_events():
            try:
                while True:
                    message = await asyncio.wait_for(ws.recv(), timeout=2.0)
                    data = json.loads(message)
                    event_type = data.get('type', 'unknown')
                    
                    if event_type in ['model_metrics_update', 'prediction_logged', 'system_metrics']:
                        websocket_events.append(event_type)
                        print(f"   📡 Received: {event_type}")
                        
                        # Show model metrics if present
                        if event_type == 'system_metrics' and 'model_metrics' in data:
                            model_count = len(data['model_metrics'].get('models', {}))
                            avg_accuracy = data['model_metrics'].get('avg_accuracy', 0)
                            print(f"      📊 Models: {model_count}, Avg Accuracy: {avg_accuracy:.3f}")
                            
            except asyncio.TimeoutError:
                pass
            except Exception as e:
                print(f"   ⚠️  WebSocket error: {e}")
        
        # Start listening task
        listen_task = asyncio.create_task(listen_for_events())
        
        # Make several test predictions
        print("   🎯 Making test predictions...")
        for i in range(5):
            prediction_data = {
                "feature1": i * 2,
                "feature2": i * 3,
                "test_id": i
            }
            
            try:
                response = requests.post(f"{BASE_URL}/api/models/{model_id}/predict", json=prediction_data)
                if response.status_code == 200:
                    result = response.json()
                    print(f"      Prediction {i+1}: {result['prediction']}")
                else:
                    print(f"      ❌ Prediction {i+1} failed: {response.status_code}")
            except Exception as e:
                print(f"      ❌ Prediction {i+1} error: {e}")
            
            # Small delay between predictions
            await asyncio.sleep(0.5)
        
        # Wait a bit more for WebSocket events
        await asyncio.sleep(3)
        listen_task.cancel()
        
        await ws.close()
        
        # Summarize WebSocket events received
        print(f"\n   📊 WebSocket Events Summary:")
        event_counts = {}
        for event in websocket_events:
            event_counts[event] = event_counts.get(event, 0) + 1
            
        for event_type, count in event_counts.items():
            print(f"      {event_type}: {count} events")
            
    except Exception as e:
        print(f"   ❌ WebSocket test error: {e}")

    # Test 4: Check real-time metrics endpoint
    print(f"\n4️⃣ Testing real-time metrics endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/api/models/{model_id}/metrics/realtime")
        if response.status_code == 200:
            metrics = response.json()
            print(f"   ✅ Real-time metrics retrieved")
            print(f"      Accuracy: {metrics['performance']['accuracy']:.3f}")
            print(f"      Predictions/min: {metrics['performance']['predictions_per_minute']}")
            print(f"      Health: {metrics['performance']['health_status']}")
            print(f"      Total predictions: {metrics['performance']['total_predictions']}")
        else:
            print(f"   ❌ Metrics endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Metrics test error: {e}")

async def main():
    """Run all integration tests"""
    print("🚀 Live System Status Integration Test Suite")
    print("Make sure the backend is running on http://localhost:8000")
    print("-" * 60)
    
    # Create test model
    model_id = await test_model_metrics_integration()
    
    # Test predictions and WebSocket
    await test_prediction_and_websocket(model_id)
    
    print("\n" + "="*60)
    print("✅ Integration test completed!")
    print("\nNext: Frontend handlers need to be implemented to process")
    print("the model_metrics_update and prediction_logged events.")

if __name__ == "__main__":
    asyncio.run(main())