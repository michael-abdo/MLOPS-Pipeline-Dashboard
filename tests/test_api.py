import pytest
import asyncio
from fastapi.testclient import TestClient
from backend_api import app

client = TestClient(app)

def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data

def test_system_status():
    """Test system status endpoint"""
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert "total_models" in data
    assert "system_health" in data
    assert "uptime" in data

def test_activity_log():
    """Test activity log endpoint"""
    response = client.get("/api/activity")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_settings_endpoints():
    """Test settings save and retrieve"""
    # Test getting default settings
    response = client.get("/api/settings")
    assert response.status_code == 200
    settings = response.json()
    assert "defaultModel" in settings
    
    # Test saving settings
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
    
    response = client.post("/api/settings", json=new_settings)
    assert response.status_code == 200
    
    # Verify settings were saved
    response = client.get("/api/settings")
    assert response.status_code == 200
    saved_settings = response.json()
    assert saved_settings["defaultModel"] == "classification"
    assert saved_settings["trainingTimeout"] == 30

def test_upload_invalid_file():
    """Test upload with invalid file type"""
    response = client.post(
        "/api/upload", 
        files={"file": ("test.txt", "invalid data", "text/plain")}
    )
    assert response.status_code == 400

def test_models_endpoint():
    """Test models listing"""
    response = client.get("/api/models")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_static_files():
    """Test that static files are served"""
    response = client.get("/")
    assert response.status_code == 200
    assert "ML Pipeline Dashboard" in response.text
    
    response = client.get("/settings")
    assert response.status_code == 200
    assert "Settings - ML Pipeline" in response.text

if __name__ == "__main__":
    pytest.main([__file__, "-v"])