#!/usr/bin/env python3
"""Test prediction_volume and model_deployed events"""

import requests
import time

BASE_URL = "http://localhost:8000"

def test_prediction_volume():
    """Test prediction volume milestone events"""
    print("🔮 Testing Prediction Volume Events")
    print("-" * 40)
    
    # First, get a model to make predictions with
    models_response = requests.get(f"{BASE_URL}/api/models")
    if models_response.status_code != 200 or not models_response.json():
        print("❌ No models available. Creating one...")
        
        # Upload training data
        csv_content = "feature1,feature2,target\\n1,2,0\\n3,4,1\\n5,6,0\\n"
        files = {'file': ('train.csv', csv_content, 'text/csv')}
        upload_response = requests.post(f"{BASE_URL}/api/upload", files=files)
        
        if upload_response.status_code == 200:
            file_path = upload_response.json()['file_path']
            
            # Train model
            training_data = {
                "model_type": "automatic",
                "file_path": file_path
            }
            train_response = requests.post(f"{BASE_URL}/api/train", json=training_data)
            
            if train_response.status_code == 200:
                print("⏳ Training model... (this takes ~15 seconds)")
                time.sleep(15)
                
                # Get the newly created model
                models_response = requests.get(f"{BASE_URL}/api/models")
    
    if models_response.status_code == 200 and models_response.json():
        models = models_response.json()
        model = models[0]
        model_id = model['model_id']
        current_predictions = model.get('predictions_made', 0)
        
        print(f"✅ Using model: {model['name']}")
        print(f"📊 Current predictions: {current_predictions}")
        
        # Calculate how many predictions needed to reach next milestone
        next_milestone = ((current_predictions // 100) + 1) * 100
        predictions_needed = next_milestone - current_predictions
        
        print(f"🎯 Next milestone: {next_milestone} (need {predictions_needed} more)")
        print("📈 Making predictions...")
        
        # Make predictions to trigger milestone
        for i in range(predictions_needed + 5):  # +5 to ensure we pass the milestone
            prediction_data = {
                "feature1": i * 2,
                "feature2": i * 3,
                "data": {"value": i}
            }
            
            response = requests.post(
                f"{BASE_URL}/api/models/{model_id}/predict", 
                json=prediction_data
            )
            
            if response.status_code == 200:
                if (current_predictions + i + 1) % 10 == 0:
                    print(f"   Made {current_predictions + i + 1} total predictions...")
            else:
                print(f"❌ Prediction failed: {response.status_code}")
                break
        
        print(f"✅ Completed {predictions_needed + 5} predictions")
        print("🎉 Prediction volume milestone should have been triggered!")
        
        # Wait a moment for WebSocket event
        time.sleep(2)
        
        # Verify new prediction count
        models_response = requests.get(f"{BASE_URL}/api/models")
        if models_response.status_code == 200:
            updated_model = next((m for m in models_response.json() if m['model_id'] == model_id), None)
            if updated_model:
                print(f"📊 New total predictions: {updated_model['predictions_made']}")
    else:
        print("❌ No models available")

def test_model_deployed():
    """Test model deployed event"""
    print("\n🚀 Testing Model Deployed Event")
    print("-" * 40)
    
    # Get available models
    models_response = requests.get(f"{BASE_URL}/api/models")
    
    if models_response.status_code == 200 and models_response.json():
        models = models_response.json()
        
        # Find a model that's not deployed
        undeployed_model = next((m for m in models if m.get('status') != 'deployed'), None)
        
        if undeployed_model:
            model_id = undeployed_model['model_id']
            model_name = undeployed_model['name']
            model_accuracy = undeployed_model.get('accuracy', 0)
            
            print(f"✅ Found undeployed model: {model_name}")
            print(f"📊 Model accuracy: {model_accuracy:.1%}")
            print("🔄 Deploying model...")
            
            # Deploy the model
            deploy_response = requests.post(f"{BASE_URL}/api/models/{model_id}/deploy")
            
            if deploy_response.status_code == 200:
                print("✅ Model deployment triggered successfully!")
                print("🎉 Model deployed event should have been sent!")
                
                # Wait for WebSocket event
                time.sleep(2)
                
                # Verify deployment status
                models_response = requests.get(f"{BASE_URL}/api/models")
                if models_response.status_code == 200:
                    updated_model = next((m for m in models_response.json() if m['model_id'] == model_id), None)
                    if updated_model:
                        print(f"📊 Model status: {updated_model.get('status', 'unknown')}")
            else:
                print(f"❌ Deployment failed: {deploy_response.status_code}")
        else:
            # All models are deployed, pick one to re-deploy
            model = models[0]
            model_id = model['model_id']
            model_name = model['name']
            
            print(f"ℹ️ All models are deployed. Re-deploying: {model_name}")
            
            deploy_response = requests.post(f"{BASE_URL}/api/models/{model_id}/deploy")
            if deploy_response.status_code == 200:
                print("✅ Model re-deployment triggered!")
                print("🎉 Model deployed event should have been sent!")
    else:
        print("❌ No models available for deployment")

def main():
    print("🔍 Testing Unused WebSocket Events")
    print("=" * 50)
    print("Make sure:")
    print("1. Backend is running on http://localhost:8000")
    print("2. Frontend is open in a browser")
    print("3. You're on the dashboard page to see notifications")
    print("=" * 50)
    
    input("\nPress Enter when ready...")
    
    # Test prediction volume
    test_prediction_volume()
    
    # Test model deployed
    test_model_deployed()
    
    print("\n✅ Test complete!")
    print("Check your browser for:")
    print("- 📥 Prediction milestone notification (blue info toast)")
    print("- 🚀 Model deployed notification (green success toast)")

if __name__ == "__main__":
    main()