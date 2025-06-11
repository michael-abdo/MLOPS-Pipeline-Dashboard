# Simple version for testing without ML dependencies
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uuid
import json
import os
from datetime import datetime
import asyncio
import psutil
from pathlib import Path

# Get the project root directory (parent of backend/)
PROJECT_ROOT = Path(__file__).parent.parent

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
app.mount("/static", StaticFiles(directory=str(PROJECT_ROOT / "static")), name="static")

# Simple in-memory storage (replace with database in production)
models_store = {}
training_jobs = {}
activity_log = []

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_json(self, data: dict):
        for connection in self.active_connections[:]:
            try:
                await connection.send_json(data)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# Data Models
class TrainingRequestWithFile(BaseModel):
    model_type: str = "automatic"
    target_column: Optional[str] = None
    file_path: str

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

# Simple in-memory settings storage
current_settings = Settings()

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

async def train_model_background(job_id: str, file_path: str, model_type: str):
    """Background task for model training with real-time WebSocket broadcasting"""
    start_time = datetime.now()

    # Define training stages with time estimates
    training_stages = [
        {"name": "Preparing data", "progress": 10, "duration": 1},
        {"name": "Data validation", "progress": 20, "duration": 1.5},
        {"name": "Feature engineering", "progress": 35, "duration": 2},
        {"name": "Model selection", "progress": 50, "duration": 2},
        {"name": "Training model", "progress": 70, "duration": 3},
        {"name": "Model validation", "progress": 85, "duration": 2},
        {"name": "Performance evaluation", "progress": 95, "duration": 1.5},
        {"name": "Finalizing model", "progress": 100, "duration": 1}
    ]

    try:
        # Initialize enhanced training job state
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
            "message": "Starting model training process",
            "estimated_remaining": f"{int(total_estimated_time//60)}m {int(total_estimated_time%60)}s",
            "live_accuracy": 0.0
        })

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

            # Simulate progressive accuracy improvement
            if stage["progress"] >= 35:  # After feature engineering
                base_accuracy = 0.75 + (0.20 * (stage["progress"] - 35) / 65)
                variance = 0.05 * (hash(f"{job_id}_{i}") % 100) / 100
                training_jobs[job_id]["live_accuracy"] = min(0.99, base_accuracy + variance)

            # Simulate predictions processed during training
            if stage["progress"] >= 50:  # During model training
                training_jobs[job_id]["predictions_processed"] = int(100 + (stage["progress"] - 50) * 25)

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

            # Mark stage as completed
            training_jobs[job_id]["stages_completed"].append(stage["name"])

            # Simulate stage processing time
            await asyncio.sleep(stage["duration"])

        # Simulate model creation
        model_id = str(uuid.uuid4())
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
            "file_path": file_path
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
            "message": f"Model training completed successfully! Final accuracy: {final_accuracy:.1%}",
            "final_accuracy": final_accuracy,
            "model_id": model_id,
            "total_time": f"{int(total_elapsed//60)}m {int(total_elapsed%60)}s",
            "predictions_processed": training_jobs[job_id]["predictions_processed"]
        })

        # Log activity with broadcasting
        await log_activity_with_broadcast(
            "Model training completed",
            f"New model trained with {final_accuracy:.1%} accuracy in {int(total_elapsed//60)}m {int(total_elapsed%60)}s",
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

async def broadcast_prediction_volume_update():
    """Broadcast prediction volume updates when significant changes occur"""
    total_predictions = sum(m["predictions_made"] for m in models_store.values())

    # Only broadcast if prediction volume has increased significantly (every 100 predictions)
    if total_predictions > 0 and total_predictions % 100 == 0:
        await broadcast_system_event({
            "type": "prediction_volume",
            "event": "milestone",
            "total_predictions": total_predictions,
            "message": f"🎯 Prediction milestone: {total_predictions:,} predictions completed",
            "timestamp": datetime.now().isoformat(),
            "priority": "low"
        })

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
        # Read file content
        content = await file.read()

        # Save file temporarily
        upload_dir = PROJECT_ROOT / "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = upload_dir / file.filename

        with open(file_path, "wb") as f:
            f.write(content)

        # Simulate CSV validation (simplified)
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="File must be CSV format")

        file_size = len(content)
        if file_size == 0:
            raise HTTPException(status_code=400, detail="File is empty")

        # Simulated file info
        rows = max(1, file_size // 100)  # Rough estimate
        columns = 5  # Simulated

        # Log activity
        log_activity(
            "New data uploaded",
            f"{file.filename} ({rows} rows, {columns} columns)",
            "success"
        )

        return {
            "message": "File uploaded successfully",
            "filename": file.filename,
            "rows": rows,
            "columns": columns,
            "file_path": str(file_path)
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/train")
async def start_training(
    background_tasks: BackgroundTasks,
    request: TrainingRequestWithFile
):
    """Start model training"""
    try:
        # Validate file exists
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=400, detail="File not found")

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
            request.file_path,
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

        # Simulate prediction
        prediction = hash(str(data)) % 2  # Simulated binary prediction

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
    """Deploy model to production with real-time notifications"""
    if model_id not in models_store:
        raise HTTPException(status_code=404, detail="Model not found")

    # Update model status
    models_store[model_id]["status"] = "deployed"
    model_name = models_store[model_id]["name"]
    model_accuracy = models_store[model_id]["accuracy"]

    # Broadcast deployment event
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

# Settings endpoints
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

# WebSocket endpoint for real-time updates with health monitoring
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global previous_system_health

    await manager.connect(websocket)
    try:
        while True:
            # Send system metrics every 5 seconds
            await asyncio.sleep(5)

            # Collect comprehensive system metrics
            cpu_percent = psutil.cpu_percent(interval=None)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            network = psutil.net_io_counters()
            boot_time = psutil.boot_time()
            process_count = len(psutil.pids())

            # Calculate uptime
            uptime_seconds = datetime.now().timestamp() - boot_time
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

            metrics = {
                "type": "system_metrics",
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory.percent, 1),
                "disk_percent": round((disk.used / disk.total) * 100, 1),
                "active_connections": len(manager.active_connections),
                "total_models": len(models_store),
                "active_training_jobs": len(active_training),

                # Enhanced metrics for Phase 2
                "memory_total_gb": round(memory.total / (1024**3), 1),
                "memory_used_gb": round(memory.used / (1024**3), 1),
                "disk_total_gb": round(disk.total / (1024**3), 1),
                "disk_used_gb": round(disk.used / (1024**3), 1),
                "disk_free_gb": round(disk.free / (1024**3), 1),
                "process_count": process_count,
                "uptime_hours": round(uptime_hours, 1),
                "network_bytes_sent": network.bytes_sent if network else 0,
                "network_bytes_recv": network.bytes_recv if network else 0,

                # Performance metrics
                "api_response_time_ms": round(api_response_time, 1),
                "ws_response_time_ms": round(ws_response_time, 1),

                # Training status
                "training_progress": active_training[0]["progress"] if active_training else 0,
                "training_message": active_training[0]["message"] if active_training else "No active training",

                # Health indicators
                "cpu_cores": psutil.cpu_count(),
                "load_average_1m": round(psutil.getloadavg()[0], 2) if hasattr(psutil, 'getloadavg') else 0,

                "timestamp": datetime.now().isoformat()
            }

            await websocket.send_json(metrics)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        pass  # Silently handle WebSocket errors
        manager.disconnect(websocket)

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn

    # Create necessary directories
    os.makedirs(PROJECT_ROOT / "uploads", exist_ok=True)
    os.makedirs(PROJECT_ROOT / "models", exist_ok=True)
    os.makedirs(PROJECT_ROOT / "static", exist_ok=True)

    # Add some sample activity log entries
    log_activity("System started", "ML Pipeline backend initialized", "success")

    uvicorn.run(app, host="0.0.0.0", port=8000)