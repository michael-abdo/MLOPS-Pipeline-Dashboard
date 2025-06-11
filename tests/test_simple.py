import requests
import time

# Test basic endpoints
base_url = "http://localhost:8000"

def test_endpoints():
    print("Testing MLOps Dashboard API endpoints...")
    
    # Test health check
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"✅ Health check: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False
    
    # Test system status
    try:
        response = requests.get(f"{base_url}/api/status", timeout=5)
        print(f"✅ System status: {response.status_code}")
    except Exception as e:
        print(f"❌ System status failed: {e}")
    
    # Test activity log
    try:
        response = requests.get(f"{base_url}/api/activity", timeout=5)
        print(f"✅ Activity log: {response.status_code}")
        data = response.json()
        print(f"   Found {len(data)} activities")
    except Exception as e:
        print(f"❌ Activity log failed: {e}")
    
    # Test settings
    try:
        response = requests.get(f"{base_url}/api/settings", timeout=5)
        print(f"✅ Get settings: {response.status_code}")
        
        # Test save settings
        new_settings = {
            "defaultModel": "classification",
            "trainingTimeout": 30,
            "autoValidation": True,
            "trainingNotifications": True,
            "errorNotifications": True,
            "emailAddress": "test@example.com",
            "dataCleanup": 60,
            "maxFileSize": 100,
            "showTechnical": True,
            "debugMode": False
        }
        
        response = requests.post(f"{base_url}/api/settings", json=new_settings, timeout=5)
        print(f"✅ Save settings: {response.status_code}")
    except Exception as e:
        print(f"❌ Settings failed: {e}")
    
    # Test models endpoint
    try:
        response = requests.get(f"{base_url}/api/models", timeout=5)
        print(f"✅ Models list: {response.status_code}")
    except Exception as e:
        print(f"❌ Models list failed: {e}")
    
    # Test static file serving
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        print(f"✅ Dashboard page: {response.status_code}")
        if "ML Pipeline Dashboard" in response.text:
            print("   Dashboard content loaded correctly")
    except Exception as e:
        print(f"❌ Dashboard page failed: {e}")
    
    try:
        response = requests.get(f"{base_url}/settings", timeout=5)
        print(f"✅ Settings page: {response.status_code}")
        if "Settings - ML Pipeline" in response.text:
            print("   Settings content loaded correctly")
    except Exception as e:
        print(f"❌ Settings page failed: {e}")
    
    print("\nBasic API test completed!")
    return True

if __name__ == "__main__":
    # Wait a moment for server to fully start
    time.sleep(2)
    test_endpoints()