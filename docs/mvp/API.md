# 📡 MLOps Dashboard API Documentation

## Overview

The MLOps Dashboard provides a RESTful API for managing machine learning workflows. All endpoints return JSON responses and follow standard HTTP status codes.

**Base URL**: `http://localhost:8000`  
**API Version**: `1.4.0`  
**Content-Type**: `application/json` (except file uploads)  
**WebSocket Endpoint**: `ws://localhost:8000/ws` (Phase 4 real-time features)

## 🔑 Authentication

Currently, the API does not require authentication (MVP version). Authentication will be added in Phase 2.

## 📊 Endpoints

### System Endpoints

#### Health Check
```
GET /health
```

Check if the API is running and responsive.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00Z",
  "version": "1.0.0"
}
```

#### System Status
```
GET /api/status
```

Get detailed system status including resource usage.

**Response:**
```json
{
  "status": "operational",
  "models_count": 2,
  "active_jobs": 1,
  "storage_used": "124.5 MB",
  "cpu_usage": "23%",
  "memory_usage": "45%",
  "uptime": "2 days 14:23:45"
}
```

### File Management

#### Upload CSV File
```
POST /api/upload
Content-Type: multipart/form-data
```

Upload a CSV file for training.

**Request:**
- Form field: `file` (CSV file, max 50MB)

**Response (200 OK):**
```json
{
  "file_id": "file_abc123",
  "filename": "customer_data.csv",
  "size": 1024567,
  "rows": 1000,
  "columns": 5,
  "column_names": ["age", "income", "purchases", "region", "will_buy"],
  "upload_time": "2024-01-20T10:30:00Z",
  "validation": {
    "status": "valid",
    "warnings": []
  }
}
```

**Error Response (400 Bad Request):**
```json
{
  "error": "Invalid file format",
  "details": "File must be CSV format with headers",
  "code": "INVALID_FORMAT"
}
```

### Model Training

#### Start Training
```
POST /api/train
```

Start training a model with uploaded data.

**Request:**
```json
{
  "file_id": "file_abc123",
  "model_type": "auto",  // "auto", "classification", "regression"
  "training_params": {
    "test_split": 0.2,
    "random_state": 42,
    "max_training_time": 300  // seconds
  }
}
```

**Response (202 Accepted):**
```json
{
  "job_id": "job_xyz789",
  "status": "started",
  "estimated_time": 120,  // seconds
  "start_time": "2024-01-20T10:31:00Z"
}
```

#### Get Training Status
```
GET /api/training/{job_id}
```

Get the status of a training job.

**Response (200 OK):**
```json
{
  "job_id": "job_xyz789",
  "status": "in_progress",  // "queued", "in_progress", "completed", "failed"
  "progress": 65,  // percentage
  "current_step": "Training model",
  "elapsed_time": 78,  // seconds
  "estimated_remaining": 42  // seconds
}
```

**Completed Response:**
```json
{
  "job_id": "job_xyz789",
  "status": "completed",
  "progress": 100,
  "model_id": "model_def456",
  "metrics": {
    "accuracy": 0.895,
    "precision": 0.887,
    "recall": 0.903,
    "f1_score": 0.895,
    "confusion_matrix": [[85, 15], [10, 90]]
  },
  "training_time": 120,
  "completed_at": "2024-01-20T10:33:00Z"
}
```

### Model Management

#### List Models
```
GET /api/models
```

Get a list of all trained models.

**Query Parameters:**
- `status` (optional): Filter by status ("trained", "deployed", "archived")
- `sort` (optional): Sort by field ("created_at", "accuracy", "name")
- `limit` (optional): Number of results (default: 20)

**Response:**
```json
{
  "models": [
    {
      "id": "model_def456",
      "name": "Customer Churn Predictor",
      "type": "classification",
      "accuracy": 0.895,
      "status": "deployed",
      "created_at": "2024-01-20T10:33:00Z",
      "deployed_at": "2024-01-20T10:35:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

#### Get Model Details
```
GET /api/models/{model_id}
```

Get detailed information about a specific model.

**Response:**
```json
{
  "id": "model_def456",
  "name": "Customer Churn Predictor",
  "type": "classification",
  "algorithm": "RandomForestClassifier",
  "status": "deployed",
  "metrics": {
    "accuracy": 0.895,
    "precision": 0.887,
    "recall": 0.903,
    "f1_score": 0.895
  },
  "training_data": {
    "file_id": "file_abc123",
    "rows": 1000,
    "features": ["age", "income", "purchases", "region"]
  },
  "parameters": {
    "n_estimators": 100,
    "max_depth": 10,
    "random_state": 42
  },
  "created_at": "2024-01-20T10:33:00Z",
  "deployed_at": "2024-01-20T10:35:00Z"
}
```

#### Deploy Model
```
POST /api/models/{model_id}/deploy
```

Deploy a trained model for predictions.

**Response (200 OK):**
```json
{
  "model_id": "model_def456",
  "status": "deployed",
  "deployment_time": "2024-01-20T10:35:00Z",
  "endpoint": "/api/predict/model_def456"
}
```

### Predictions

#### Make Prediction
```
POST /api/predict/{model_id}
```

Make predictions using a deployed model.

**Request:**
```json
{
  "data": [
    {
      "age": 25,
      "income": 50000,
      "purchases": 2,
      "region": "west"
    }
  ]
}
```

**Response:**
```json
{
  "predictions": [
    {
      "prediction": "yes",
      "confidence": 0.87,
      "probabilities": {
        "yes": 0.87,
        "no": 0.13
      }
    }
  ],
  "model_id": "model_def456",
  "timestamp": "2024-01-20T10:40:00Z"
}
```

### Settings

#### Get Settings
```
GET /api/settings
```

Get current application settings.

**Response:**
```json
{
  "general": {
    "appName": "MLOps Dashboard",
    "theme": "light",
    "timezone": "UTC"
  },
  "training": {
    "defaultTimeout": 300,
    "defaultModelType": "auto",
    "autoSaveModels": true
  },
  "notifications": {
    "emailEnabled": false,
    "slackEnabled": false
  },
  "data": {
    "autoCleanup": true,
    "retentionDays": 30
  }
}
```

#### Update Settings
```
PUT /api/settings
```

Update application settings.

**Request:**
```json
{
  "training": {
    "defaultTimeout": 600
  },
  "notifications": {
    "emailEnabled": true,
    "emailAddress": "admin@example.com"
  }
}
```

**Response (200 OK):**
```json
{
  "message": "Settings updated successfully",
  "updated_fields": ["training.defaultTimeout", "notifications.emailEnabled", "notifications.emailAddress"]
}
```

### Activity Log

#### Get Activity Log
```
GET /api/activity
```

Get recent system activity.

**Query Parameters:**
- `limit` (optional): Number of entries (default: 50)
- `type` (optional): Filter by type ("upload", "training", "deployment", "prediction")
- `since` (optional): ISO timestamp to get activities after

**Response:**
```json
{
  "activities": [
    {
      "id": "act_123",
      "type": "deployment",
      "message": "Model 'Customer Churn Predictor' deployed successfully",
      "timestamp": "2024-01-20T10:35:00Z",
      "user": "system",
      "details": {
        "model_id": "model_def456",
        "accuracy": 0.895
      }
    }
  ],
  "total": 150,
  "limit": 50
}
```

## 🔴 Error Responses

All endpoints use standard HTTP status codes and return consistent error responses:

### Error Format
```json
{
  "error": "Short error description",
  "details": "Detailed error message for debugging",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-20T10:30:00Z",
  "request_id": "req_abc123"
}
```

### Common Status Codes
- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `202 Accepted` - Request accepted for processing
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate)
- `413 Payload Too Large` - File too large
- `422 Unprocessable Entity` - Validation error
- `500 Internal Server Error` - Server error

### Error Codes
- `INVALID_FORMAT` - Invalid file or data format
- `FILE_TOO_LARGE` - File exceeds size limit
- `TRAINING_FAILED` - Model training failed
- `MODEL_NOT_FOUND` - Model does not exist
- `INVALID_PARAMETERS` - Invalid request parameters
- `DEPLOYMENT_FAILED` - Model deployment failed

## 🔄 WebSocket API (Phase 4)

### Real-Time Connection
```
WebSocket: ws://localhost:8000/ws
```

### Message Types

#### Client → Server Messages
```json
{
  "type": "ping",
  "timestamp": 1640000000000
}
```

```json
{
  "type": "request_metrics"
}
```

#### Server → Client Messages

**System Metrics** (every 5 seconds):
```json
{
  "type": "system_metrics",
  "timestamp": "2024-01-20T10:30:00Z",
  "cpu_percent": 23.4,
  "memory_percent": 45.2,
  "disk_percent": 67.8,
  "active_connections": 5,
  "total_models": 3,
  "active_training_jobs": 1,
  "system_health": "healthy",
  "api_response_time_ms": 15.2,
  "ws_response_time_ms": 8.1
}
```

**Training Progress** (real-time during training):
```json
{
  "type": "training_progress",
  "job_id": "job_abc123",
  "status": "training",
  "progress": 75,
  "current_stage": "Model validation",
  "message": "Model validation - 75% complete",
  "live_accuracy": 0.847,
  "estimated_remaining": "2m 15s"
}
```

**Connection Status**:
```json
{
  "type": "pong",
  "timestamp": 1640000000000
}
```

### Connection Features
- **Heartbeat**: Ping/pong every 30 seconds
- **Reconnection**: Exponential backoff with jitter
- **Quality Monitoring**: Latency-based connection quality assessment  
- **Fallback**: Automatic HTTP polling if WebSocket fails
- **Connection Limits**: Maximum 100 concurrent connections

## 📝 Notes

1. **File Size Limits**: Maximum upload size is 50MB
2. **Rate Limiting**: Currently no rate limiting (will be added in Phase 2)
3. **Timeouts**: Default timeout for training is 5 minutes
4. **CORS**: Enabled for all origins in development
5. **Async Operations**: Training is asynchronous; use polling to check status
6. **Model Storage**: Models are stored in memory (production will use persistent storage)

## 🚀 Quick Start Example

```bash
# 1. Check health
curl http://localhost:8000/health

# 2. Upload CSV file
curl -X POST -F "file=@data.csv" http://localhost:8000/api/upload

# 3. Start training (use file_id from upload response)
curl -X POST -H "Content-Type: application/json" \
  -d '{"file_id":"file_abc123","model_type":"auto"}' \
  http://localhost:8000/api/train

# 4. Check training status (use job_id from train response)
curl http://localhost:8000/api/training/job_xyz789

# 5. Deploy model (use model_id from completed training)
curl -X POST http://localhost:8000/api/models/model_def456/deploy

# 6. Make prediction
curl -X POST -H "Content-Type: application/json" \
  -d '{"data":[{"age":25,"income":50000,"purchases":2,"region":"west"}]}' \
  http://localhost:8000/api/predict/model_def456
```