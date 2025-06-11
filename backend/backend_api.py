# main.py - Simplified MLOps Backend API
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
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
import time
from datetime import datetime
import asyncio
import psutil

app = FastAPI(title="ML Pipeline API", description="Simplified MLOps Dashboard Backend")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (frontend) - Updated for project structure
from pathlib import Path
PROJECT_ROOT = Path(__file__).parent.parent
app.mount("/static", StaticFiles(directory=str(PROJECT_ROOT / "static")), name="static")

# Simple in-memory storage (replace with database in production)
models_store = {}
training_jobs = {}
activity_log = []

# Enhanced WebSocket Connection Manager with Phase 4 optimizations
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, dict] = {}
        self.max_connections = 100  # Limit concurrent connections
        self.connection_history_limit = 1000  # Limit connection history
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = time.time()

    async def connect(self, websocket: WebSocket, client_id: str = None):
        """Connect with enhanced tracking and limits"""
        # Enforce connection limits
        if len(self.active_connections) >= self.max_connections:
            await websocket.close(code=1013, reason="Server overloaded")
            return False
            
        if not client_id:
            client_id = str(uuid.uuid4())
            
        await websocket.accept()
        
        self.active_connections[client_id] = {
            'websocket': websocket,
            'connected_at': time.time(),
            'last_ping': time.time(),
            'message_count': 0,
            'bytes_sent': 0
        }
        
        # Periodic cleanup
        await self._cleanup_if_needed()
        return client_id

    def disconnect(self, websocket: WebSocket):
        """Disconnect with cleanup"""
        client_id = None
        for cid, conn_info in self.active_connections.items():
            if conn_info['websocket'] == websocket:
                client_id = cid
                break
                
        if client_id:
            del self.active_connections[client_id]

    async def broadcast_json(self, data: dict, priority: str = 'normal'):
        """Enhanced broadcast with message prioritization and cleanup"""
        disconnected_clients = []
        
        for client_id, conn_info in self.active_connections.items():
            try:
                websocket = conn_info['websocket']
                
                # Skip slow connections for low priority messages
                if priority == 'low' and time.time() - conn_info['last_ping'] > 30:
                    continue
                
                await websocket.send_json(data)
                
                # Update connection stats
                conn_info['message_count'] += 1
                conn_info['bytes_sent'] += len(json.dumps(data))
                
            except Exception:
                disconnected_clients.append(client_id)
        
        # Clean up disconnected clients
        for client_id in disconnected_clients:
            if client_id in self.active_connections:
                del self.active_connections[client_id]

    def update_ping(self, client_id: str):
        """Update last ping time for client"""
        if client_id in self.active_connections:
            self.active_connections[client_id]['last_ping'] = time.time()

    async def _cleanup_if_needed(self):
        """Periodic cleanup of stale connections"""
        current_time = time.time()
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
            
        self.last_cleanup = current_time
        stale_clients = []
        
        for client_id, conn_info in self.active_connections.items():
            # Mark clients as stale if no ping for 2 minutes
            if current_time - conn_info['last_ping'] > 120:
                stale_clients.append(client_id)
        
        # Remove stale connections
        for client_id in stale_clients:
            try:
                conn_info = self.active_connections[client_id]
                await conn_info['websocket'].close(code=1000, reason="Timeout")
            except:
                pass
            finally:
                if client_id in self.active_connections:
                    del self.active_connections[client_id]

    def get_connection_stats(self):
        """Get connection statistics"""
        current_time = time.time()
        total_connections = len(self.active_connections)
        active_connections = sum(1 for conn in self.active_connections.values() 
                               if current_time - conn['last_ping'] < 60)
        
        return {
            'total_connections': total_connections,
            'active_connections': active_connections,
            'max_connections': self.max_connections
        }

# Initialize connection manager
manager = ConnectionManager()

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
    """Background task for model training with Phase 3 real-time WebSocket broadcasting"""
    start_time = datetime.now()

    # Define training stages with time estimates for real ML training
    training_stages = [
        {"name": "Data validation", "progress": 10, "duration": 1},
        {"name": "Data preprocessing", "progress": 25, "duration": 1.5},
        {"name": "Feature engineering", "progress": 40, "duration": 2},
        {"name": "Model selection", "progress": 55, "duration": 1.5},
        {"name": "Training model", "progress": 75, "duration": 3},
        {"name": "Model validation", "progress": 90, "duration": 2},
        {"name": "Performance evaluation", "progress": 95, "duration": 1},
        {"name": "Finalizing model", "progress": 100, "duration": 1}
    ]

    try:
        # Initialize enhanced training job state for Phase 3
        total_estimated_time = sum(stage["duration"] for stage in training_stages)
        training_jobs[job_id].update({
            "status": "training",
            "progress": 0,
            "current_stage": "Initializing",
            "stages_completed": [],
            "start_time": start_time.isoformat(),
            "estimated_total_time": total_estimated_time,
            "elapsed_time": 0,
            "estimated_remaining": total_estimated_time,
            "live_accuracy": 0.0,
            "predictions_processed": 0
        })

        # Broadcast training start
        await broadcast_training_progress(job_id, {
            "type": "training_progress",
            "job_id": job_id,
            "status": "training",
            "progress": 0,
            "current_stage": "Training Started",
            "message": "Starting ML model training process",
            "estimated_remaining": f"{int(total_estimated_time//60)}m {int(total_estimated_time%60)}s",
            "live_accuracy": 0.0
        })

        # Data validation and preparation
        current_time = datetime.now()
        elapsed = (current_time - start_time).total_seconds()
        training_jobs[job_id].update({
            "progress": 10,
            "current_stage": "Data validation",
            "elapsed_time": elapsed,
            "estimated_remaining": max(0, total_estimated_time - elapsed)
        })

        await broadcast_training_progress(job_id, {
            "type": "training_progress",
            "job_id": job_id,
            "status": "training",
            "progress": 10,
            "current_stage": "Data validation",
            "message": "Validating dataset structure and quality",
            "estimated_remaining": f"{int((total_estimated_time - elapsed)//60)}m {int((total_estimated_time - elapsed)%60)}s",
            "stage_index": 1,
            "total_stages": len(training_stages)
        })

        # Simple data preprocessing with real ML validation
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

        # Execute training stages with real-time broadcasting
        for i, stage in enumerate(training_stages):
            current_time = datetime.now()
            elapsed = (current_time - start_time).total_seconds()

            # Update job state
            training_jobs[job_id].update({
                "progress": stage["progress"],
                "current_stage": stage["name"],
                "elapsed_time": elapsed,
                "estimated_remaining": max(0, total_estimated_time - elapsed)
            })

            # Simulate progressive accuracy improvement for ML training
            if stage["progress"] >= 40:  # After feature engineering
                base_accuracy = 0.70 + (0.25 * (stage["progress"] - 40) / 60)
                variance = 0.05 * (hash(f"{job_id}_{i}") % 100) / 100
                training_jobs[job_id]["live_accuracy"] = min(0.98, base_accuracy + variance)

            # Simulate predictions processed during training
            if stage["progress"] >= 55:  # During model training
                training_jobs[job_id]["predictions_processed"] = int(len(data) * (stage["progress"] - 55) / 45)

            # Broadcast current stage progress
            await broadcast_training_progress(job_id, {
                "type": "training_progress",
                "job_id": job_id,
                "status": "training",
                "progress": stage["progress"],
                "current_stage": stage["name"],
                "message": f"{stage['name']} - {stage['progress']}% complete",
                "elapsed_time": f"{int(elapsed//60)}m {int(elapsed%60)}s",
                "estimated_remaining": f"{int((total_estimated_time - elapsed)//60)}m {int((total_estimated_time - elapsed)%60)}s" if elapsed < total_estimated_time else "Finishing up...",
                "live_accuracy": training_jobs[job_id]["live_accuracy"],
                "predictions_processed": training_jobs[job_id]["predictions_processed"],
                "stage_index": i + 1,
                "total_stages": len(training_stages)
            })

            # Perform actual ML operations for key stages
            if stage["name"] == "Data preprocessing":
                # Split data
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42
                )
            elif stage["name"] == "Training model":
                # Choose and train model based on type
                if model_type == "automatic":
                    model = RandomForestClassifier(n_estimators=50, random_state=42)
                else:
                    model = RandomForestClassifier(n_estimators=50, random_state=42)  # Default

                # Train the model
                model.fit(X_train, y_train)
            elif stage["name"] == "Model validation":
                # Evaluate model
                y_pred = model.predict(X_test)
                final_accuracy = accuracy_score(y_test, y_pred)
                training_jobs[job_id]["live_accuracy"] = final_accuracy

            # Mark stage as completed
            training_jobs[job_id]["stages_completed"].append(stage["name"])

            # Simulate stage processing time
            await asyncio.sleep(stage["duration"])

        # Model creation and finalization
        model_id = str(uuid.uuid4())
        model_path = PROJECT_ROOT / "models" / f"{model_id}.joblib"
        os.makedirs(PROJECT_ROOT / "models", exist_ok=True)
        joblib.dump(model, model_path)

        # Get final accuracy from training job state
        final_accuracy = training_jobs[job_id]["live_accuracy"]

        # Store model info
        models_store[model_id] = {
            "model_id": model_id,
            "name": f"Model {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "accuracy": float(final_accuracy),
            "created_at": datetime.now().isoformat(),
            "status": "active",
            "predictions_made": 0,
            "avg_response_time": 23.0,  # Simulated
            "model_path": str(model_path),
            "feature_names": list(X.columns)
        }

        # Complete training
        final_time = datetime.now()
        total_elapsed = (final_time - start_time).total_seconds()

        training_jobs[job_id].update({
            "status": "completed",
            "progress": 100,
            "current_stage": "Completed",
            "message": "Training completed successfully!",
            "accuracy": float(final_accuracy),
            "model_id": model_id,
            "elapsed_time": total_elapsed,
            "estimated_remaining": 0,
            "completed_at": final_time.isoformat()
        })

        # Broadcast training completion
        await broadcast_training_progress(job_id, {
            "type": "training_completed",
            "job_id": job_id,
            "status": "completed",
            "progress": 100,
            "current_stage": "Training Complete",
            "message": f"ML model training completed successfully! Final accuracy: {final_accuracy:.1%}",
            "final_accuracy": final_accuracy,
            "model_id": model_id,
            "total_time": f"{int(total_elapsed//60)}m {int(total_elapsed%60)}s",
            "predictions_processed": training_jobs[job_id]["predictions_processed"]
        })

        # Log activity with broadcasting
        await log_activity_with_broadcast(
            "Model training completed",
            f"New ML model trained with {final_accuracy:.1%} accuracy in {int(total_elapsed//60)}m {int(total_elapsed%60)}s",
            "success"
        )

    except Exception as e:
        error_time = datetime.now()
        elapsed = (error_time - start_time).total_seconds()

        training_jobs[job_id].update({
            "status": "failed",
            "message": f"Training failed: {str(e)}",
            "elapsed_time": elapsed,
            "error_at": error_time.isoformat()
        })

        # Broadcast training failure
        await broadcast_training_progress(job_id, {
            "type": "training_failed",
            "job_id": job_id,
            "status": "failed",
            "current_stage": "Error",
            "message": f"Training failed: {str(e)}",
            "error": str(e),
            "elapsed_time": f"{int(elapsed//60)}m {int(elapsed%60)}s"
        })

        await log_activity_with_broadcast("Training failed", str(e), "error")

# Phase 3: Real-Time Broadcasting Functions
async def broadcast_training_progress(job_id: str, progress_data: dict):
    """Broadcast training progress to all connected WebSocket clients"""
    try:
        await manager.broadcast_json(progress_data)
    except Exception as e:
        pass  # Silently handle broadcast failures

async def log_activity_with_broadcast(title: str, description: str, status: str = "success"):
    """Enhanced log_activity that broadcasts to WebSocket clients"""
    # Add to local activity log
    log_activity(title, description, status)

    # Broadcast activity update to all connected clients
    activity_data = {
        "type": "activity_update",
        "activity": {
            "id": str(uuid.uuid4()),
            "title": title,
            "description": description,
            "status": status,
            "timestamp": datetime.now().isoformat()
        }
    }

    try:
        await manager.broadcast_json(activity_data)
    except Exception as e:
        pass  # Silently handle broadcast failures

async def broadcast_system_event(event_data: dict):
    """Broadcast system events (deployments, health changes, etc.) to all connected clients"""
    try:
        await manager.broadcast_json(event_data)
    except Exception as e:
        pass  # Silently handle broadcast failures

# Global variables for health monitoring
previous_system_health = "healthy"
health_change_threshold = {"cpu": 80, "memory": 80, "disk": 90}

def determine_system_health(cpu_percent: float, memory_percent: float, disk_percent: float) -> str:
    """Determine overall system health based on resource usage"""
    if cpu_percent > 90 or memory_percent > 90 or disk_percent > 95:
        return "critical"
    elif cpu_percent > 80 or memory_percent > 80 or disk_percent > 90:
        return "warning"
    else:
        return "healthy"

async def check_and_broadcast_health_changes(current_health: str, cpu_percent: float, memory_percent: float, disk_percent: float):
    """Check for health changes and broadcast system events"""
    global previous_system_health

    if current_health != previous_system_health:
        # Health status changed - broadcast event
        health_event = {
            "type": "health_change",
            "event": "system_health",
            "previous_health": previous_system_health,
            "current_health": current_health,
            "metrics": {
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory_percent, 1),
                "disk_percent": round(disk_percent, 1)
            },
            "timestamp": datetime.now().isoformat(),
            "priority": "high" if current_health == "critical" else "medium"
        }

        # Determine message based on health change
        if current_health == "critical":
            message = "🚨 System Critical: High resource usage detected"
            description = f"CPU: {cpu_percent:.1f}%, Memory: {memory_percent:.1f}%, Disk: {disk_percent:.1f}%"
        elif current_health == "warning":
            message = "⚠️ System Warning: Resource usage elevated"
            description = f"CPU: {cpu_percent:.1f}%, Memory: {memory_percent:.1f}%, Disk: {disk_percent:.1f}%"
        else:
            message = "✅ System Healthy: Resource usage normalized"
            description = f"CPU: {cpu_percent:.1f}%, Memory: {memory_percent:.1f}%, Disk: {disk_percent:.1f}%"

        # Broadcast health change event
        await broadcast_system_event(health_event)

        # Log activity with broadcast
        await log_activity_with_broadcast(message, description, "info")

        # Update previous health state
        previous_system_health = current_health

# API Routes

@app.get("/", response_class=HTMLResponse)
async def root():
    """Serve the main dashboard"""
    try:
        with open(PROJECT_ROOT / "static" / "index.html", "r") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Dashboard not found</h1><p>Please ensure static files are properly set up.</p>", status_code=404)

@app.get("/settings", response_class=HTMLResponse)
async def settings():
    """Serve the settings page"""
    try:
        with open(PROJECT_ROOT / "static" / "settings.html", "r") as f:
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
        upload_dir = PROJECT_ROOT / "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = upload_dir / file.filename

        with open(file_path, "wb") as f:
            f.write(content)

        # Validate CSV
        df = pd.read_csv(file_path)

        if df.empty:
            raise HTTPException(status_code=400, detail="File is empty")

        if df.shape[1] < 2:
            raise HTTPException(status_code=400, detail="File must have at least 2 columns")

        # Log activity with broadcast
        await log_activity_with_broadcast(
            "New data uploaded",
            f"{file.filename} ({len(df)} rows, {df.shape[1]} columns)",
            "success"
        )

        return {
            "message": "File uploaded successfully",
            "filename": file.filename,
            "rows": len(df),
            "columns": df.shape[1],
            "file_path": str(file_path)
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
    """Deploy model to production with Phase 3 real-time notifications"""
    if model_id not in models_store:
        raise HTTPException(status_code=404, detail="Model not found")

    # Update model status
    models_store[model_id]["status"] = "deployed"
    model_name = models_store[model_id]["name"]
    model_accuracy = models_store[model_id]["accuracy"]

    # Broadcast deployment event with Phase 3 real-time streaming
    await broadcast_system_event({
        "type": "model_deployed",
        "event": "deployment",
        "model_id": model_id,
        "model_name": model_name,
        "model_accuracy": model_accuracy,
        "message": f"Model {model_name} deployed successfully",
        "timestamp": datetime.now().isoformat(),
        "priority": "high"
    })

    # Log activity with broadcasting
    await log_activity_with_broadcast(
        "Model deployed",
        f"Model {model_name} is now live with {model_accuracy:.1%} accuracy",
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

    # Log activity with broadcast
    await log_activity_with_broadcast(
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

    await log_activity_with_broadcast("Settings updated", "System configuration has been updated", "success")

    return {"message": "Settings saved successfully"}

@app.get("/api/settings")
async def get_settings():
    """Get current system settings"""
    return current_settings

# Global variables for health monitoring
previous_system_health = "healthy"
health_change_threshold = {"cpu": 80, "memory": 80, "disk": 90}

def determine_system_health(cpu_percent: float, memory_percent: float, disk_percent: float) -> str:
    """Determine overall system health based on resource usage"""
    if cpu_percent > 90 or memory_percent > 90 or disk_percent > 95:
        return "critical"
    elif cpu_percent > 80 or memory_percent > 80 or disk_percent > 90:
        return "warning"
    else:
        return "healthy"

async def check_and_broadcast_health_changes(current_health: str, cpu_percent: float, memory_percent: float, disk_percent: float):
    """Check for health changes and broadcast system events"""
    global previous_system_health

    if current_health != previous_system_health:
        # Health status changed - broadcast event
        health_event = {
            "type": "health_change",
            "event": "system_health",
            "previous_health": previous_system_health,
            "current_health": current_health,
            "metrics": {
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory_percent, 1),
                "disk_percent": round(disk_percent, 1)
            },
            "timestamp": datetime.now().isoformat(),
            "priority": "high" if current_health == "critical" else "medium"
        }

        # Determine message based on health change
        if current_health == "critical":
            message = "🚨 System Critical: High resource usage detected"
            description = f"CPU: {cpu_percent:.1f}%, Memory: {memory_percent:.1f}%, Disk: {disk_percent:.1f}%"
        elif current_health == "warning":
            message = "⚠️ System Warning: Resource usage elevated"
            description = f"CPU: {cpu_percent:.1f}%, Memory: {memory_percent:.1f}%, Disk: {disk_percent:.1f}%"
        else:
            message = "✅ System Healthy: Resource usage normalized"
            description = f"CPU: {cpu_percent:.1f}%, Memory: {memory_percent:.1f}%, Disk: {disk_percent:.1f}%"

        # Broadcast health change event
        await manager.broadcast_json(health_event)

        # Log activity
        log_activity(message, description, "info")

        # Update previous health state
        previous_system_health = current_health

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Enhanced WebSocket endpoint with Phase 4 improvements
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global previous_system_health
    
    client_id = str(uuid.uuid4())
    last_metrics_time = 0
    
    client_id = await manager.connect(websocket, client_id)
    if not client_id:
        return  # Connection was rejected
    
    async def handle_client_message():
        """Handle incoming messages from client"""
        try:
            while True:
                message = await websocket.receive_text()
                data = json.loads(message)
                
                # Handle ping messages for heartbeat
                if data.get('type') == 'ping':
                    manager.update_ping(client_id)
                    await websocket.send_json({
                        'type': 'pong',
                        'timestamp': data.get('timestamp', time.time() * 1000)
                    })
                
                # Handle immediate metrics request
                elif data.get('type') == 'request_metrics':
                    await send_system_metrics()
                    
        except WebSocketDisconnect:
            pass
        except Exception:
            pass
    
    async def send_system_metrics():
        """Send system metrics with optimized frequency"""
        nonlocal last_metrics_time
        current_time = time.time()
        
        # Rate limit to every 5 seconds
        if current_time - last_metrics_time < 5:
            return
            
        last_metrics_time = current_time
        
        try:
            # Collect comprehensive system metrics
            cpu_percent = psutil.cpu_percent(interval=None)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            network = psutil.net_io_counters()
            boot_time = psutil.boot_time()
            process_count = len(psutil.pids())

            # Calculate uptime
            uptime_seconds = current_time - boot_time
            uptime_hours = uptime_seconds / 3600

            # Get active training jobs
            active_training = [j for j in training_jobs.values() if j["status"] == "training"]

            # Calculate average response time (simulated based on system load)
            base_response_time = 15
            load_factor = (cpu_percent + memory.percent) / 2
            api_response_time = base_response_time + (load_factor * 0.5)
            ws_response_time = max(5, api_response_time * 0.4)

            # Monitor system health changes
            current_health = determine_system_health(cpu_percent, memory.percent, disk.used / disk.total * 100)
            await check_and_broadcast_health_changes(current_health, cpu_percent, memory.percent, disk.used / disk.total * 100)

            # Create optimized metrics payload
            metrics = {
                "type": "system_metrics",
                "timestamp": datetime.now().isoformat(),
                "client_id": client_id,
                
                # Core metrics
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory.percent, 1),
                "disk_percent": round((disk.used / disk.total) * 100, 1),
                
                # Connection stats
                "active_connections": manager.get_connection_stats()['active_connections'],
                "total_models": len(models_store),
                "active_training_jobs": len(active_training),
                
                # Extended metrics
                "memory_total_gb": round(memory.total / (1024**3), 1),
                "memory_used_gb": round(memory.used / (1024**3), 1),
                "disk_total_gb": round(disk.total / (1024**3), 1),
                "disk_used_gb": round(disk.used / (1024**3), 1),
                "disk_free_gb": round(disk.free / (1024**3), 1),
                "process_count": process_count,
                "uptime_hours": round(uptime_hours, 1),
                
                # Network stats
                "network_bytes_sent": network.bytes_sent if network else 0,
                "network_bytes_recv": network.bytes_recv if network else 0,
                
                # Performance metrics
                "api_response_time_ms": round(api_response_time, 1),
                "ws_response_time_ms": round(ws_response_time, 1),
                
                # Training status
                "training_progress": active_training[0]["progress"] if active_training else 0,
                "training_message": active_training[0]["message"] if active_training else "No active training",
                
                # System info
                "cpu_cores": psutil.cpu_count(),
                "load_average_1m": round(psutil.getloadavg()[0], 2) if hasattr(psutil, 'getloadavg') else 0,
                "system_health": current_health
            }

            await websocket.send_json(metrics)
            
        except Exception:
            pass
    
    # Start background tasks
    try:
        # Create concurrent tasks for message handling and metrics sending
        message_task = asyncio.create_task(handle_client_message())
        
        # Metrics sending loop
        while True:
            await asyncio.sleep(5)  # 5-second interval
            await send_system_metrics()
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
    finally:
        # Clean up tasks
        if 'message_task' in locals():
            message_task.cancel()

if __name__ == "__main__":
    import uvicorn

    # Create necessary directories
    os.makedirs(PROJECT_ROOT / "uploads", exist_ok=True)
    os.makedirs(PROJECT_ROOT / "models", exist_ok=True)
    os.makedirs(PROJECT_ROOT / "static", exist_ok=True)

    # Add some sample activity log entries
    log_activity("System started", "ML Pipeline backend initialized", "success")

    uvicorn.run(app, host="0.0.0.0", port=8000)
