# main.py - Simplified MLOps Backend API
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib
import uuid
import json
import os
from datetime import datetime
import asyncio

app = FastAPI(title="ML Pipeline API", description="Simplified MLOps Dashboard Backend")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (frontend)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Simple in-memory storage (replace with database in production)
models_store = {}
training_jobs = {}
activity_log = []

# Data Models
class TrainingRequest(BaseModel):
    model_type: str = "automatic"
    target_column: Optional[str] = None

class TrainingStatus(BaseModel):
    job_id: str
    status: str  # "uploading", "training", "completed", "failed"
    progress: int
    message: str
    accuracy: Optional[float] = None
    model_id: Optional[str] = None

class ModelInfo(BaseModel):
    model_id: str
    name: str
    accuracy: float
    created_at: str
    status: str
    predictions_made: int
    avg_response_time: float

class Activity(BaseModel):
    id: str
    title: str
    description: str
    status: str
    timestamp: str

# Helper Functions
def log_activity(title: str, description: str, status: str = "success"):
    """Add activity to log"""
    activity = {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": description,
        "status": status,
        "timestamp": datetime.now().isoformat()
    }
    activity_log.insert(0, activity)  # Add to beginning
    if len(activity_log) > 50:  # Keep only last 50 activities
        activity_log.pop()

async def train_model_background(job_id: str, data: pd.DataFrame, model_type: str):
    """Background task for model training"""
    try:
        # Update status to training
        training_jobs[job_id]["status"] = "training"
        training_jobs[job_id]["progress"] = 10
        training_jobs[job_id]["message"] = "Preparing data..."
        
        await asyncio.sleep(1)  # Simulate processing time
        
        # Simple data preprocessing
        # For demo, assume last column is target
        if data.shape[1] < 2:
            raise Exception("Dataset needs at least 2 columns (features + target)")
        
        X = data.iloc[:, :-1]
        y = data.iloc[:, -1]
        
        # Handle non-numeric data (simple approach)
        for col in X.columns:
            if X[col].dtype == 'object':
                X[col] = pd.Categorical(X[col]).codes
        
        if y.dtype == 'object':
            y = pd.Categorical(y).codes
        
        training_jobs[job_id]["progress"] = 30
        training_jobs[job_id]["message"] = "Splitting data..."
        await asyncio.sleep(1)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        training_jobs[job_id]["progress"] = 50
        training_jobs[job_id]["message"] = "Training model..."
        await asyncio.sleep(2)  # Simulate training time
        
        # Choose model based on type
        if model_type == "automatic":
            # Simple heuristic: use classification for categorical targets
            unique_ratio = len(np.unique(y)) / len(y)
            if unique_ratio < 0.1:  # Likely classification
                model = RandomForestClassifier(n_estimators=50, random_state=42)
            else:
                model = RandomForestClassifier(n_estimators=50, random_state=42)
        else:
            model = RandomForestClassifier(n_estimators=50, random_state=42)
        
        training_jobs[job_id]["progress"] = 80
        training_jobs[job_id]["message"] = "Fitting model..."
        
        # Train model
        model.fit(X_train, y_train)
        
        training_jobs[job_id]["progress"] = 90
        training_jobs[job_id]["message"] = "Evaluating model..."
        await asyncio.sleep(1)
        
        # Evaluate model
        y_pred = model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        # Save model
        model_id = str(uuid.uuid4())
        model_path = f"models/{model_id}.joblib"
        os.makedirs("models", exist_ok=True)
        joblib.dump(model, model_path)
        
        # Store model info
        models_store[model_id] = {
            "model_id": model_id,
            "name": f"Model {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "accuracy": float(accuracy),
            "created_at": datetime.now().isoformat(),
            "status": "active",
            "predictions_made": 0,
            "avg_response_time": 23.0,  # Simulated
            "model_path": model_path,
            "feature_names": list(X.columns)
        }
        
        # Complete training
        training_jobs[job_id]["status"] = "completed"
        training_jobs[job_id]["progress"] = 100
        training_jobs[job_id]["message"] = "Training completed!"
        training_jobs[job_id]["accuracy"] = float(accuracy)
        training_jobs[job_id]["model_id"] = model_id
        
        # Log activity
        log_activity(
            "Model training completed",
            f"New model trained with {accuracy:.1%} accuracy",
            "success"
        )
        
    except Exception as e:
        training_jobs[job_id]["status"] = "failed"
        training_jobs[job_id]["message"] = f"Training failed: {str(e)}"
        log_activity("Training failed", str(e), "error")

# API Routes

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main dashboard"""
    try:
        with open("static/index.html", "r") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Dashboard not found</h1><p>Please ensure static files are properly set up.</p>", status_code=404)

@app.get("/settings", response_class=HTMLResponse)
async def settings():
    """Serve the settings page"""
    try:
        with open("static/settings.html", "r") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Settings not found</h1><p>Please ensure static files are properly set up.</p>", status_code=404)

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and validate data file"""
    try:
        # Read CSV file
        content = await file.read()
        
        # Save file temporarily
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = f"{upload_dir}/{file.filename}"
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        # Validate CSV
        df = pd.read_csv(file_path)
        
        if df.empty:
            raise HTTPException(status_code=400, detail="File is empty")
        
        if df.shape[1] < 2:
            raise HTTPException(status_code=400, detail="File must have at least 2 columns")
        
        # Log activity
        log_activity(
            "New data uploaded",
            f"{file.filename} ({len(df)} rows, {df.shape[1]} columns)",
            "success"
        )
        
        return {
            "message": "File uploaded successfully",
            "filename": file.filename,
            "rows": len(df),
            "columns": df.shape[1],
            "file_path": file_path
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class TrainingRequestWithFile(BaseModel):
    model_type: str = "automatic"
    target_column: Optional[str] = None
    file_path: str

@app.post("/api/train")
async def start_training(
    background_tasks: BackgroundTasks,
    request: TrainingRequestWithFile
):
    """Start model training"""
    try:
        # Read data
        df = pd.read_csv(request.file_path)
        
        # Create training job
        job_id = str(uuid.uuid4())
        training_jobs[job_id] = {
            "job_id": job_id,
            "status": "starting",
            "progress": 0,
            "message": "Initializing training...",
            "accuracy": None,
            "model_id": None
        }
        
        # Start background training
        background_tasks.add_task(
            train_model_background,
            job_id,
            df,
            request.model_type
        )
        
        return {"job_id": job_id, "message": "Training started"}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/training/{job_id}")
async def get_training_status(job_id: str):
    """Get training job status"""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Training job not found")
    
    return training_jobs[job_id]

@app.get("/api/models")
async def list_models():
    """Get all trained models"""
    return list(models_store.values())

@app.get("/api/models/{model_id}")
async def get_model(model_id: str):
    """Get specific model info"""
    if model_id not in models_store:
        raise HTTPException(status_code=404, detail="Model not found")
    
    return models_store[model_id]

@app.post("/api/models/{model_id}/predict")
async def predict(model_id: str, data: Dict[str, Any]):
    """Make prediction with model"""
    try:
        if model_id not in models_store:
            raise HTTPException(status_code=404, detail="Model not found")
        
        model_info = models_store[model_id]
        model = joblib.load(model_info["model_path"])
        
        # Convert input data to DataFrame
        input_df = pd.DataFrame([data])
        
        # Make prediction
        prediction = model.predict(input_df)[0]
        
        # Update model stats
        models_store[model_id]["predictions_made"] += 1
        
        return {
            "prediction": int(prediction),
            "model_id": model_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/models/{model_id}/deploy")
async def deploy_model(model_id: str):
    """Deploy model to production"""
    if model_id not in models_store:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Update model status
    models_store[model_id]["status"] = "deployed"
    
    # Log activity
    log_activity(
        "Model deployed",
        f"Model {models_store[model_id]['name']} is now live",
        "success"
    )
    
    return {"message": "Model deployed successfully"}

@app.get("/api/activity")
async def get_activity():
    """Get recent activity log"""
    return activity_log[:10]  # Return last 10 activities

@app.get("/api/status")
async def get_system_status():
    """Get overall system status"""
    total_models = len(models_store)
    active_models = len([m for m in models_store.values() if m["status"] == "active"])
    total_predictions = sum(m["predictions_made"] for m in models_store.values())
    
    # Check for active training jobs
    active_training = len([j for j in training_jobs.values() if j["status"] == "training"])
    
    return {
        "total_models": total_models,
        "active_models": active_models,
        "total_predictions": total_predictions,
        "active_training_jobs": active_training,
        "system_health": "healthy" if active_training < 3 else "busy",
        "uptime": "99.7%"  # Simulated
    }

@app.delete("/api/models/{model_id}")
async def delete_model(model_id: str):
    """Delete a model"""
    if model_id not in models_store:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # Remove model file
    model_path = models_store[model_id]["model_path"]
    if os.path.exists(model_path):
        os.remove(model_path)
    
    # Remove from store
    model_name = models_store[model_id]["name"]
    del models_store[model_id]
    
    # Log activity
    log_activity(
        "Model deleted",
        f"Model {model_name} removed from system",
        "warning"
    )
    
    return {"message": "Model deleted successfully"}

# Settings management
class Settings(BaseModel):
    defaultModel: str = "automatic"
    trainingTimeout: int = 15
    autoValidation: bool = True
    trainingNotifications: bool = True
    errorNotifications: bool = True
    emailAddress: str = ""
    dataCleanup: int = 30
    maxFileSize: int = 50
    showTechnical: bool = False
    debugMode: bool = False

# Simple in-memory settings storage (replace with database in production)
current_settings = Settings()

@app.post("/api/settings")
async def save_settings(settings: Settings):
    """Save system settings"""
    global current_settings
    current_settings = settings
    
    log_activity("Settings updated", "System configuration has been updated", "success")
    
    return {"message": "Settings saved successfully"}

@app.get("/api/settings")
async def get_settings():
    """Get current system settings"""
    return current_settings

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    
    # Create necessary directories
    os.makedirs("uploads", exist_ok=True)
    os.makedirs("models", exist_ok=True)
    os.makedirs("static", exist_ok=True)
    
    # Add some sample activity log entries
    log_activity("System started", "ML Pipeline backend initialized", "success")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
