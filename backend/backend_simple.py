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
import time
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

# Additional data models for new API endpoints
class Pipeline(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: str = "draft"  # draft, active, paused, completed, failed
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    steps: List[Dict[str, Any]] = []
    
class PipelineCreate(BaseModel):
    name: str
    description: Optional[str] = None
    steps: List[Dict[str, Any]] = []

class Dataset(BaseModel):
    id: Optional[str] = None
    name: str
    file_path: str
    size: int
    rows: int
    columns: int
    created_at: Optional[datetime] = None
    status: str = "available"  # available, processing, error
    file_type: str = "csv"
    
class ComponentHealth(BaseModel):
    name: str
    status: str  # healthy, warning, critical, unknown
    last_check: datetime
    metrics: Dict[str, Any] = {}
    message: Optional[str] = None
    
class Alert(BaseModel):
    id: Optional[str] = None
    type: str  # error, warning, info
    message: str
    source: str
    timestamp: Optional[datetime] = None
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None

# In-memory storage for new entities
pipelines_store: Dict[str, Pipeline] = {}
datasets_store: Dict[str, Dataset] = {}
alerts_store: Dict[str, Alert] = {}
components_health: Dict[str, ComponentHealth] = {
    "model_service": ComponentHealth(
        name="model_service",
        status="healthy",
        last_check=datetime.now(),
        metrics={"response_time": 45, "requests_per_minute": 120}
    ),
    "data_processor": ComponentHealth(
        name="data_processor",
        status="healthy", 
        last_check=datetime.now(),
        metrics={"queue_size": 5, "processing_rate": 50}
    ),
    "websocket_server": ComponentHealth(
        name="websocket_server",
        status="healthy",
        last_check=datetime.now(),
        metrics={"active_connections": 0, "messages_per_second": 0}
    )
}

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

@app.get("/pipeline", response_class=HTMLResponse)
async def pipeline():
    """Serve the pipeline page"""
    try:
        with open(PROJECT_ROOT / "static" / "pipeline.html", "r") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Pipeline page coming soon</h1><p>This feature is under development.</p>", status_code=404)

@app.get("/architecture", response_class=HTMLResponse)
async def architecture():
    """Serve the architecture page"""
    try:
        with open(PROJECT_ROOT / "static" / "architecture.html", "r") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Architecture page coming soon</h1><p>This feature is under development.</p>", status_code=404)

@app.get("/data", response_class=HTMLResponse)
async def data():
    """Serve the data management page"""
    try:
        with open(PROJECT_ROOT / "static" / "data.html", "r") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Data management page coming soon</h1><p>This feature is under development.</p>", status_code=404)

@app.get("/monitoring", response_class=HTMLResponse)
async def monitoring():
    """Serve the monitoring page"""
    try:
        with open(PROJECT_ROOT / "static" / "monitoring.html", "r") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Monitoring page coming soon</h1><p>This feature is under development.</p>", status_code=404)

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

        # Log activity with broadcast
        await log_activity_with_broadcast(
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

    # Log activity with broadcast
    await log_activity_with_broadcast(
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

    await log_activity_with_broadcast("Settings updated", "System configuration has been updated", "success")

    return {"message": "Settings saved successfully"}

@app.get("/api/settings")
async def get_settings():
    """Get current system settings"""
    return current_settings

# ==================== Pipeline Management APIs ====================

@app.get("/api/pipelines")
async def get_pipelines():
    """List all pipelines"""
    return {
        "pipelines": list(pipelines_store.values()),
        "total": len(pipelines_store)
    }

@app.post("/api/pipelines")
async def create_pipeline(pipeline: PipelineCreate):
    """Create a new pipeline"""
    pipeline_id = str(uuid.uuid4())
    new_pipeline = Pipeline(
        id=pipeline_id,
        name=pipeline.name,
        description=pipeline.description,
        steps=pipeline.steps,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    pipelines_store[pipeline_id] = new_pipeline
    
    # Log activity with broadcast
    await log_activity_with_broadcast(
        "Pipeline created",
        f"New pipeline '{pipeline.name}' has been created",
        "success"
    )
    
    # Send WebSocket update
    await manager.broadcast_json({
        "type": "pipeline_status",
        "pipeline_id": pipeline_id,
        "status": "created",
        "data": new_pipeline.dict()
    })
    
    return new_pipeline

@app.get("/api/pipelines/{pipeline_id}")
async def get_pipeline(pipeline_id: str):
    """Get pipeline details"""
    if pipeline_id not in pipelines_store:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipelines_store[pipeline_id]

@app.put("/api/pipelines/{pipeline_id}")
async def update_pipeline(pipeline_id: str, pipeline: PipelineCreate):
    """Update a pipeline"""
    if pipeline_id not in pipelines_store:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    existing_pipeline = pipelines_store[pipeline_id]
    existing_pipeline.name = pipeline.name
    existing_pipeline.description = pipeline.description
    existing_pipeline.steps = pipeline.steps
    existing_pipeline.updated_at = datetime.now()
    
    await log_activity_with_broadcast(
        "Pipeline updated",
        f"Pipeline '{pipeline.name}' has been updated",
        "info"
    )
    
    return existing_pipeline

@app.delete("/api/pipelines/{pipeline_id}")
async def delete_pipeline(pipeline_id: str):
    """Delete a pipeline"""
    if pipeline_id not in pipelines_store:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    pipeline_name = pipelines_store[pipeline_id].name
    del pipelines_store[pipeline_id]
    
    await log_activity_with_broadcast(
        "Pipeline deleted",
        f"Pipeline '{pipeline_name}' has been deleted",
        "warning"
    )
    
    return {"message": "Pipeline deleted successfully"}

@app.post("/api/pipelines/{pipeline_id}/run")
async def run_pipeline(pipeline_id: str, background_tasks: BackgroundTasks):
    """Execute a pipeline"""
    if pipeline_id not in pipelines_store:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    pipeline = pipelines_store[pipeline_id]
    pipeline.status = "running"
    
    # Simulate pipeline execution
    async def execute_pipeline():
        try:
            # Send initial status
            await manager.broadcast_json({
                "type": "pipeline_progress",
                "pipeline_id": pipeline_id,
                "progress": 0,
                "status": "starting",
                "current_step": "Initializing"
            })
            
            total_steps = len(pipeline.steps)
            for i, step in enumerate(pipeline.steps):
                progress = int((i / total_steps) * 100)
                
                await manager.broadcast_json({
                    "type": "pipeline_progress",
                    "pipeline_id": pipeline_id,
                    "progress": progress,
                    "status": "running",
                    "current_step": step.get("name", f"Step {i+1}")
                })
                
                # Simulate step execution
                await asyncio.sleep(2)
            
            # Pipeline completed
            pipeline.status = "completed"
            pipeline.updated_at = datetime.now()
            
            await manager.broadcast_json({
                "type": "pipeline_completed",
                "pipeline_id": pipeline_id,
                "status": "completed",
                "message": "Pipeline executed successfully"
            })
            
            await log_activity_with_broadcast(
                "Pipeline completed",
                f"Pipeline '{pipeline.name}' executed successfully",
                "success"
            )
            
        except Exception as e:
            pipeline.status = "failed"
            await manager.broadcast_json({
                "type": "pipeline_failed",
                "pipeline_id": pipeline_id,
                "error": str(e)
            })
    
    background_tasks.add_task(execute_pipeline)
    
    return {
        "message": "Pipeline execution started",
        "pipeline_id": pipeline_id,
        "status": "running"
    }

@app.get("/api/pipelines/{pipeline_id}/status")
async def get_pipeline_status(pipeline_id: str):
    """Get pipeline execution status"""
    if pipeline_id not in pipelines_store:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    
    pipeline = pipelines_store[pipeline_id]
    return {
        "pipeline_id": pipeline_id,
        "status": pipeline.status,
        "updated_at": pipeline.updated_at
    }

# ==================== Dataset Management APIs ====================

@app.get("/api/datasets")
async def get_datasets():
    """List all datasets"""
    return {
        "datasets": list(datasets_store.values()),
        "total": len(datasets_store)
    }

@app.post("/api/datasets")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload new dataset"""
    # Reuse existing upload logic
    upload_result = await upload_file(file)
    
    # Create dataset entry
    dataset_id = str(uuid.uuid4())
    dataset = Dataset(
        id=dataset_id,
        name=file.filename,
        file_path=upload_result["file_path"],
        size=upload_result.get("size", 0),
        rows=upload_result["rows"],
        columns=upload_result["columns"],
        created_at=datetime.now(),
        file_type=file.filename.split('.')[-1].lower()
    )
    datasets_store[dataset_id] = dataset
    
    await manager.broadcast_json({
        "type": "dataset_processed",
        "dataset_id": dataset_id,
        "status": "completed",
        "data": dataset.dict()
    })
    
    return dataset

@app.get("/api/datasets/{dataset_id}")
async def get_dataset(dataset_id: str):
    """Get dataset details"""
    if dataset_id not in datasets_store:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return datasets_store[dataset_id]

@app.delete("/api/datasets/{dataset_id}")
async def delete_dataset(dataset_id: str):
    """Delete a dataset"""
    if dataset_id not in datasets_store:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    dataset = datasets_store[dataset_id]
    
    # Delete file if exists
    try:
        if os.path.exists(dataset.file_path):
            os.remove(dataset.file_path)
    except Exception:
        pass
    
    del datasets_store[dataset_id]
    
    await log_activity_with_broadcast(
        "Dataset deleted",
        f"Dataset '{dataset.name}' has been deleted",
        "warning"
    )
    
    return {"message": "Dataset deleted successfully"}

@app.get("/api/datasets/{dataset_id}/preview")
async def preview_dataset(dataset_id: str, rows: int = 10):
    """Preview dataset (first N rows)"""
    if dataset_id not in datasets_store:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    dataset = datasets_store[dataset_id]
    
    # Simple preview - read first N rows
    preview_data = []
    try:
        with open(dataset.file_path, 'r') as f:
            import csv
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if i >= rows:
                    break
                preview_data.append(row)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")
    
    return {
        "dataset_id": dataset_id,
        "rows": preview_data,
        "total_rows": len(preview_data)
    }

@app.get("/api/datasets/{dataset_id}/statistics")
async def get_dataset_statistics(dataset_id: str):
    """Get dataset statistics"""
    if dataset_id not in datasets_store:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    dataset = datasets_store[dataset_id]
    
    # Mock statistics for now
    stats = {
        "dataset_id": dataset_id,
        "basic_stats": {
            "rows": dataset.rows,
            "columns": dataset.columns,
            "size_bytes": dataset.size,
            "file_type": dataset.file_type
        },
        "column_stats": {
            "numeric_columns": dataset.columns // 2,
            "categorical_columns": dataset.columns - (dataset.columns // 2),
            "missing_values": 0
        },
        "quality_score": 95  # Mock quality score
    }
    
    await manager.broadcast_json({
        "type": "quality_assessment",
        "dataset_id": dataset_id,
        "quality_score": stats["quality_score"],
        "stats": stats
    })
    
    return stats

@app.post("/api/datasets/{dataset_id}/validate")
async def validate_dataset(dataset_id: str):
    """Validate dataset quality"""
    if dataset_id not in datasets_store:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Mock validation process
    validation_result = {
        "dataset_id": dataset_id,
        "valid": True,
        "issues": [],
        "warnings": ["Some columns have missing values"],
        "quality_score": 95
    }
    
    await log_activity_with_broadcast(
        "Dataset validated",
        f"Dataset validation completed with quality score: 95%",
        "success"
    )
    
    return validation_result

# ==================== Component Health APIs ====================

@app.get("/api/components/health")
async def get_all_component_health():
    """Get health status of all components"""
    # Update WebSocket server health
    components_health["websocket_server"].metrics["active_connections"] = len(manager.active_connections)
    components_health["websocket_server"].last_check = datetime.now()
    
    # Broadcast component health updates
    for component in components_health.values():
        await manager.broadcast_json({
            "type": "component_health",
            "component": component.name,
            "status": component.status,
            "metrics": component.metrics
        })
    
    return {
        "components": list(components_health.values()),
        "overall_health": "healthy" if all(c.status == "healthy" for c in components_health.values()) else "degraded"
    }

@app.get("/api/components/{component_name}/health")
async def get_component_health(component_name: str):
    """Get specific component health"""
    if component_name not in components_health:
        raise HTTPException(status_code=404, detail="Component not found")
    
    component = components_health[component_name]
    component.last_check = datetime.now()
    
    return component

@app.get("/api/components/{component_name}/metrics")
async def get_component_metrics(component_name: str):
    """Get component performance metrics"""
    if component_name not in components_health:
        raise HTTPException(status_code=404, detail="Component not found")
    
    # Mock detailed metrics
    metrics = {
        "component": component_name,
        "timestamp": datetime.now(),
        "metrics": components_health[component_name].metrics,
        "history": [
            {
                "timestamp": datetime.now().isoformat(),
                "value": 45 + (i * 5)
            } for i in range(10)
        ]
    }
    
    return metrics

# ==================== Monitoring APIs ====================

@app.get("/api/monitoring/services")
async def get_service_status():
    """Get status of all services"""
    services = [
        {
            "name": "API Server",
            "status": "running",
            "uptime": "4d 12h 30m",
            "response_time": "45ms",
            "requests_per_minute": 120
        },
        {
            "name": "Model Service", 
            "status": "running",
            "uptime": "4d 12h 30m",
            "response_time": "120ms",
            "predictions_per_minute": 50
        },
        {
            "name": "Data Processor",
            "status": "running",
            "uptime": "4d 12h 30m",
            "queue_size": 5,
            "processing_rate": "50 records/sec"
        }
    ]
    
    await manager.broadcast_json({
        "type": "service_health",
        "services": services,
        "timestamp": datetime.now().isoformat()
    })
    
    return {"services": services}

@app.get("/api/monitoring/metrics")
async def get_performance_metrics():
    """Get system performance metrics"""
    metrics = {
        "cpu_usage": psutil.cpu_percent(),
        "memory_usage": psutil.virtual_memory().percent,
        "disk_usage": psutil.disk_usage('/').percent,
        "network_io": {
            "bytes_sent": psutil.net_io_counters().bytes_sent,
            "bytes_recv": psutil.net_io_counters().bytes_recv
        },
        "timestamp": datetime.now()
    }
    
    await manager.broadcast_json({
        "type": "performance_metrics",
        "metrics": metrics
    })
    
    return metrics

@app.get("/api/monitoring/alerts")
async def get_system_alerts():
    """Get active system alerts"""
    return {
        "alerts": list(alerts_store.values()),
        "total": len(alerts_store),
        "unacknowledged": len([a for a in alerts_store.values() if not a.acknowledged])
    }

@app.post("/api/monitoring/alerts/acknowledge")
async def acknowledge_alert(alert_id: str, acknowledged_by: str = "system"):
    """Acknowledge an alert"""
    if alert_id not in alerts_store:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert = alerts_store[alert_id]
    alert.acknowledged = True
    alert.acknowledged_by = acknowledged_by
    alert.acknowledged_at = datetime.now()
    
    await log_activity_with_broadcast(
        "Alert acknowledged",
        f"Alert '{alert.message}' has been acknowledged",
        "info"
    )
    
    return alert

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