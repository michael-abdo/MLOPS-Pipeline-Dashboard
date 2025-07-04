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
import threading
from collections import deque
import hashlib
import logging
import signal
import sys

# Import background task components
from background_tasks import task_manager
from cache_manager import cache_manager, cache_result
from utils.cleanup import CleanupManager

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

# Initialize background task components
cleanup_manager = CleanupManager(PROJECT_ROOT)
shutdown_flag = asyncio.Event()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Real-time Model Metrics Tracking System
# Thread-safe prediction tracking with circular buffers and rate limiting
prediction_tracking_lock = threading.RLock()
prediction_tracking = {
    # Real-time metrics per model (updated on each prediction)
    "active_model_metrics": {},  # {model_id: {accuracy: float, predictions_per_minute: float, health: str}}
    
    # Circular buffer storage per model (max 1000 entries to prevent memory bloat)
    "prediction_history": {},    # {model_id: deque([{timestamp, input_hash, result, correct}], maxlen=1000)}
    
    # Cached rate calculations for performance optimization
    "rate_calculations": {},     # {model_id: {last_calc_time: timestamp, cached_rate: float}}
    
    # Rolling accuracy calculations from last 100 predictions
    "accuracy_buffers": {},      # {model_id: deque([bool], maxlen=100)}
    
    # Timestamp tracking for rate limiting and cleanup
    "last_updated": {},          # {model_id: timestamp}
    
    # Memory usage tracking for cleanup thresholds
    "memory_stats": {
        "total_predictions": 0,
        "last_cleanup": time.time(),
        "cleanup_threshold": 100 * 1024 * 1024  # 100MB threshold
    }
}

# Model Metrics Calculation Utilities
# High-performance functions for real-time metric calculations

def calculate_predictions_per_minute(prediction_history, current_time=None):
    """
    Calculate predictions per minute from timestamp history with performance optimization.
    
    Args:
        prediction_history: deque of prediction records with timestamps
        current_time: optional current timestamp (defaults to time.time())
    
    Returns:
        float: Predictions per minute rate
    """
    if not prediction_history:
        return 0.0
    
    current_time = current_time or time.time()
    one_minute_ago = current_time - 60
    
    # Count predictions in the last minute using efficient iteration
    recent_predictions = 0
    for prediction in reversed(prediction_history):
        if prediction['timestamp'] >= one_minute_ago:
            recent_predictions += 1
        else:
            # Since history is chronological, we can break early
            break
    
    return float(recent_predictions)

def calculate_rolling_accuracy(accuracy_buffer):
    """
    Calculate rolling accuracy from boolean accuracy buffer.
    
    Args:
        accuracy_buffer: deque of boolean values (True=correct, False=incorrect)
    
    Returns:
        float: Accuracy percentage (0.0 to 1.0)
    """
    if not accuracy_buffer:
        return 0.0
    
    # Efficient calculation using sum() on boolean values
    correct_predictions = sum(accuracy_buffer)
    total_predictions = len(accuracy_buffer)
    
    return correct_predictions / total_predictions

def calculate_model_health_status(accuracy, predictions_per_minute, avg_response_time=0):
    """
    Determine model health based on performance metrics.
    
    Args:
        accuracy: Current accuracy (0.0 to 1.0)
        predictions_per_minute: Current prediction rate
        avg_response_time: Average response time in milliseconds
    
    Returns:
        str: Health status ('healthy', 'warning', 'critical')
    """
    # Health thresholds
    accuracy_warning = 0.85   # 85%
    accuracy_critical = 0.80  # 80%
    response_time_warning = 100  # 100ms
    response_time_critical = 200  # 200ms
    
    # Check critical conditions first
    if accuracy < accuracy_critical or avg_response_time > response_time_critical:
        return 'critical'
    
    # Check warning conditions
    if accuracy < accuracy_warning or avg_response_time > response_time_warning:
        return 'warning'
    
    return 'healthy'

def log_prediction_with_metrics(model_id, input_data, prediction_result, correct_result=None):
    """
    Thread-safe prediction logging with automatic metric updates.
    
    Args:
        model_id: ID of the model making the prediction
        input_data: Input data for the prediction
        prediction_result: The prediction result
        correct_result: Optional ground truth for accuracy calculation
    
    Returns:
        dict: Updated metrics for the model
    """
    with prediction_tracking_lock:
        current_time = time.time()
        
        # Initialize model tracking if not exists
        if model_id not in prediction_tracking["prediction_history"]:
            prediction_tracking["prediction_history"][model_id] = deque(maxlen=1000)
            prediction_tracking["accuracy_buffers"][model_id] = deque(maxlen=100)
            prediction_tracking["active_model_metrics"][model_id] = {
                "accuracy": 0.0,
                "predictions_per_minute": 0.0,
                "health": "healthy",
                "total_predictions": 0
            }
        
        # Create prediction record
        input_hash = hashlib.md5(str(input_data).encode()).hexdigest()[:8]
        prediction_record = {
            "timestamp": current_time,
            "input_hash": input_hash,
            "result": prediction_result,
            "correct": correct_result is not None and prediction_result == correct_result
        }
        
        # Add to history buffers
        prediction_tracking["prediction_history"][model_id].append(prediction_record)
        
        # Update accuracy buffer if we have ground truth
        if correct_result is not None:
            is_correct = prediction_result == correct_result
            prediction_tracking["accuracy_buffers"][model_id].append(is_correct)
        
        # Calculate updated metrics
        accuracy = calculate_rolling_accuracy(prediction_tracking["accuracy_buffers"][model_id])
        predictions_per_minute = calculate_predictions_per_minute(
            prediction_tracking["prediction_history"][model_id], current_time
        )
        
        # Update cached metrics
        metrics = prediction_tracking["active_model_metrics"][model_id]
        metrics["accuracy"] = accuracy
        metrics["predictions_per_minute"] = predictions_per_minute
        metrics["health"] = calculate_model_health_status(accuracy, predictions_per_minute)
        metrics["total_predictions"] = len(prediction_tracking["prediction_history"][model_id])
        
        # Update last updated timestamp
        prediction_tracking["last_updated"][model_id] = current_time
        
        # Update global stats
        prediction_tracking["memory_stats"]["total_predictions"] += 1
        
        return metrics.copy()

def get_model_metrics(model_id):
    """
    Thread-safe retrieval of current model metrics.
    
    Args:
        model_id: ID of the model
    
    Returns:
        dict: Current metrics or None if model not found
    """
    with prediction_tracking_lock:
        if model_id not in prediction_tracking["active_model_metrics"]:
            return None
        
        return prediction_tracking["active_model_metrics"][model_id].copy()

def cleanup_old_predictions(max_age_hours=24):
    """
    Clean up prediction history older than specified age to prevent memory leaks.
    
    Args:
        max_age_hours: Maximum age of predictions to keep (default 24 hours)
    
    Returns:
        int: Number of predictions cleaned up
    """
    with prediction_tracking_lock:
        current_time = time.time()
        cutoff_time = current_time - (max_age_hours * 3600)
        total_cleaned = 0
        
        for model_id in list(prediction_tracking["prediction_history"].keys()):
            history = prediction_tracking["prediction_history"][model_id]
            
            # Create new deque with only recent predictions
            new_history = deque(maxlen=1000)
            for prediction in history:
                if prediction["timestamp"] >= cutoff_time:
                    new_history.append(prediction)
                else:
                    total_cleaned += 1
            
            prediction_tracking["prediction_history"][model_id] = new_history
        
        # Update cleanup timestamp
        prediction_tracking["memory_stats"]["last_cleanup"] = current_time
        
        return total_cleaned

# Background Task Functions for Periodic Operations
async def recalculate_model_accuracy():
    """Periodically recalculate model accuracy based on recent predictions"""
    logger = logging.getLogger(__name__)
    
    try:
        # Check if we have any active models
        if not models_store:
            return
            
        updated_models = []
        
        for model_id, model_info in models_store.items():
            if model_info.get("status") in ["active", "deployed"]:
                # Get current accuracy from prediction tracking
                current_accuracy = model_info.get("accuracy", 0.0)
                
                # Simulate accuracy drift based on recent predictions
                # In production, this would analyze actual vs predicted outcomes
                drift_factor = (hash(f"{model_id}_{datetime.now().minute}") % 100 - 50) / 10000
                new_accuracy = max(0.5, min(1.0, current_accuracy + drift_factor))
                
                # Update if significant change
                if abs(new_accuracy - current_accuracy) > 0.01:
                    model_info["accuracy"] = new_accuracy
                    model_info["last_accuracy_update"] = datetime.now().isoformat()
                    updated_models.append(model_id)
                    
                    # Broadcast update via WebSocket
                    await manager.broadcast_json({
                        "type": "model_accuracy_update",
                        "model_id": model_id,
                        "old_accuracy": round(current_accuracy, 3),
                        "new_accuracy": round(new_accuracy, 3),
                        "timestamp": datetime.now().isoformat()
                    })
                    
        if updated_models:
            logger.info(f"Updated accuracy for {len(updated_models)} models")
            
            # Log activity
            await log_activity_with_broadcast(
                "Model Accuracy Update",
                f"Recalculated accuracy for {len(updated_models)} active models",
                "info"
            )
            
    except Exception as e:
        logger.error(f"Error in recalculate_model_accuracy: {str(e)}")

async def perform_scheduled_cleanup():
    """Run all cleanup tasks periodically"""
    logger = logging.getLogger(__name__)
    
    try:
        # Run comprehensive cleanup
        cleanup_results = await cleanup_manager.run_full_cleanup(
            models_store=models_store,
            activity_log=activity_log,
            prediction_tracking=prediction_tracking
        )
        
        # Extract summary
        summary = cleanup_results.get("summary", {})
        successful_ops = summary.get("successful_operations", 0)
        total_ops = summary.get("total_operations", 0)
        
        # Broadcast cleanup status
        if successful_ops > 0:
            await manager.broadcast_json({
                "type": "cleanup_completed",
                "timestamp": datetime.now().isoformat(),
                "operations_completed": successful_ops,
                "total_operations": total_ops,
                "results": cleanup_results
            })
            
            # Log activity
            await log_activity_with_broadcast(
                "System Cleanup",
                f"Completed {successful_ops}/{total_ops} cleanup operations",
                "info"
            )
            
        logger.info(f"Scheduled cleanup completed: {successful_ops}/{total_ops} operations")
        
    except Exception as e:
        logger.error(f"Error in perform_scheduled_cleanup: {str(e)}")
        
        # Broadcast error
        await manager.broadcast_json({
            "type": "cleanup_error",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        })

async def cleanup_cache_expired():
    """Clean up expired cache entries"""
    logger = logging.getLogger(__name__)
    
    try:
        expired_count = cache_manager.cleanup_expired()
        
        if expired_count > 0:
            logger.debug(f"Cleaned up {expired_count} expired cache entries")
            
        # Get cache stats for monitoring
        stats = cache_manager.get_stats()
        
        # Broadcast cache status if usage is high
        if stats["usage_percent"] > 80:
            await manager.broadcast_json({
                "type": "cache_usage_high",
                "timestamp": datetime.now().isoformat(),
                "usage_percent": stats["usage_percent"],
                "stats": stats
            })
            
    except Exception as e:
        logger.error(f"Error in cleanup_cache_expired: {str(e)}")

# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger = logging.getLogger(__name__)
    logger.info(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_flag.set()

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

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
        event_type = data.get('type', 'unknown')
        
        # Only log non-routine events in debug mode to reduce noise
        debug_mode = os.getenv('DEBUG', 'False').lower() == 'true'
        if debug_mode and event_type not in ['system_metrics', 'chart_data', 'integration_status']:
            print(f"📡 Broadcasting {event_type} to {len(self.active_connections)} clients")
        
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
                
            except Exception as e:
                if debug_mode and event_type not in ['system_metrics', 'chart_data', 'integration_status']:
                    print(f"   ❌ Failed to send {event_type} to client {client_id}: {e}")
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
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
    
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
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
    
class ComponentHealth(BaseModel):
    name: str
    status: str  # healthy, warning, critical, unknown
    last_check: datetime
    metrics: Dict[str, Any] = {}
    message: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
    
class Alert(BaseModel):
    id: Optional[str] = None
    type: str  # error, warning, info
    message: str
    source: str
    timestamp: Optional[datetime] = None
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

# In-memory storage for new entities
pipelines_store: Dict[str, Pipeline] = {}

async def execute_pipeline_background(pipeline_id: str):
    """Execute a pipeline in the background with progress broadcasting"""
    try:
        pipeline = pipelines_store[pipeline_id]
        pipeline.status = "running"
        
        print(f"🔧 Starting pipeline execution: {pipeline_id}")
        
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
            
            print(f"🔧 Pipeline {pipeline_id} progress: {progress}% - {step.get('name', f'Step {i+1}')}")
            
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
        
        print(f"✅ Pipeline {pipeline_id} completed successfully")
        
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
        print(f"❌ Pipeline {pipeline_id} failed: {str(e)}")
        if pipeline_id in pipelines_store:
            pipeline = pipelines_store[pipeline_id]
            pipeline.status = "failed"
            
            await manager.broadcast_json({
                "type": "pipeline_failed",
                "pipeline_id": pipeline_id,
                "error": str(e)
            })
            
            await log_activity_with_broadcast(
                "Pipeline failed",
                f"Pipeline '{pipeline.name}' failed: {str(e)}",
                "error"
            )
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

# Alert creation and broadcasting
async def create_system_alert(title: str, message: str, priority: str = "medium", alert_type: str = "warning", source: str = "system"):
    """Create a new system alert and broadcast it via WebSocket"""
    alert_id = str(uuid.uuid4())
    alert = Alert(
        id=alert_id,
        type=alert_type,
        message=f"{title}: {message}",
        source=source,
        timestamp=datetime.now()
    )
    
    alerts_store[alert_id] = alert
    
    # Broadcast system alert via WebSocket
    await manager.broadcast_json({
        "type": "system_alert",
        "alert": {
            "id": alert_id,
            "title": title,
            "message": alert.message,
            "priority": priority,
            "alert_type": alert.type,
            "source": source,
            "timestamp": alert.timestamp.isoformat(),
            "acknowledged": False
        }
    })
    
    # Log activity
    await log_activity_with_broadcast(
        f"Alert: {title}",
        message,
        "warning" if priority == "high" else "info"
    )
    
    return alert

# Helper Functions
def log_activity(title: str, description: str, status: str = "success", user: str = "system", action_type: str = "operation", resource: str = None, severity: str = "info"):
    """Add enhanced activity to log with comprehensive metadata"""
    
    # Map status to severity if not explicitly provided
    if severity == "info":
        severity_map = {
            "success": "low",
            "warning": "medium", 
            "error": "high",
            "info": "low"
        }
        severity = severity_map.get(status, "low")
    
    activity = {
        "id": str(uuid.uuid4()),
        "title": title,
        "description": description,
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "user": user,
        "action_type": action_type,
        "resource_affected": resource or "system",
        "severity_level": severity,
        "session_id": "session_" + str(uuid.uuid4())[:8],  # Simulated session
        "ip_address": "127.0.0.1",  # Simulated
        "user_agent": "MLOps Dashboard",
        "action_details": {
            "category": action_type,
            "outcome": status,
            "duration_ms": None,  # Could be filled by timing wrapper
            "affected_components": [resource] if resource else ["system"]
        }
    }
    activity_log.insert(0, activity)  # Add to beginning
    if len(activity_log) > 50:  # Keep only last 50 activities
        activity_log.pop()

async def train_model_background(job_id: str, file_path: str, model_type: str, target_column: Optional[str] = None):
    """Background task for model training with real-time WebSocket broadcasting"""
    start_time = datetime.now()
    
    # Auto-detect target column if not provided
    detected_target_column = target_column
    if not detected_target_column:
        try:
            import pandas as pd
            df = pd.read_csv(file_path)
            # Use last column as target by default
            detected_target_column = df.columns[-1]
        except Exception:
            detected_target_column = "target"  # fallback

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

        # Store enhanced model info with comprehensive metadata
        training_duration = (datetime.now() - start_time).total_seconds()
        
        # Generate realistic hyperparameters based on model type
        hyperparameters = {
            "algorithm": "Random Forest" if model_type == "automatic" else model_type,
            "n_estimators": 100,
            "max_depth": 10,
            "learning_rate": 0.1,
            "feature_selection": "auto",
            "cross_validation_folds": 5
        }
        
        # Generate validation metrics
        validation_metrics = {
            "precision": round(final_accuracy * 0.95 + 0.02, 3),  # Slightly different from accuracy
            "recall": round(final_accuracy * 0.98 + 0.01, 3),
            "f1_score": round(final_accuracy * 0.96 + 0.015, 3),
            "roc_auc": round(final_accuracy * 0.97 + 0.02, 3),
            "train_accuracy": round(final_accuracy * 1.05, 3),  # Training typically higher
            "validation_accuracy": float(final_accuracy),
            "test_accuracy": round(final_accuracy * 0.98, 3)  # Test typically slightly lower
        }
        
        # Generate feature importance (simulated)
        feature_importance = {
            f"feature_{i+1}": round(1.0 / (i + 1) * 0.3 + 0.1, 3) 
            for i in range(min(5, 10))  # Top 5-10 features
        }
        
        # Generate confusion matrix (simulated for binary classification)
        confusion_matrix = {
            "true_positive": int(100 * final_accuracy),
            "true_negative": int(150 * final_accuracy),
            "false_positive": int(50 * (1 - final_accuracy)),
            "false_negative": int(25 * (1 - final_accuracy))
        }
        
        models_store[model_id] = {
            "model_id": model_id,
            "name": f"Model {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "version": "1.0.0",
            "accuracy": float(final_accuracy),
            "created_at": datetime.now().isoformat(),
            "status": "active",
            "predictions_made": 0,
            "avg_response_time": 23.0,  # Simulated
            "file_path": file_path,
            "target_column": detected_target_column,
            "training_duration": training_duration,
            "hyperparameters": hyperparameters,
            "validation_metrics": validation_metrics,
            "feature_importance": feature_importance,
            "confusion_matrix": confusion_matrix,
            "model_size": "2.3 MB",
            "training_samples": 1000,  # Simulated
            "validation_samples": 250,  # Simulated
            "test_samples": 250,  # Simulated
            "algorithm_details": {
                "type": "ensemble",
                "trees": 100,
                "depth": 10,
                "features_used": len(feature_importance)
            }
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
            "success",
            user="system",
            action_type="model_training",
            resource=f"model_{model_id}",
            severity="low"
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

async def log_activity_with_broadcast(title: str, description: str, status: str = "success", user: str = "system", action_type: str = "operation", resource: str = None, severity: str = "info"):
    """Enhanced log_activity that broadcasts to WebSocket clients with rich metadata"""
    # Add to local activity log with enhanced format
    log_activity(title, description, status, user, action_type, resource, severity)

    # Get the latest activity (with all enhanced fields) for broadcasting
    latest_activity = activity_log[0] if activity_log else None
    
    if latest_activity:
        activity_data = {
            "type": "activity_update",
            "activity": latest_activity  # Send full enhanced activity object
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
        
        # Create system alerts for critical and warning conditions
        if current_health == "critical":
            await create_system_alert(
                "Critical System Alert",
                f"System resources critically high - CPU: {cpu_percent:.1f}%, Memory: {memory_percent:.1f}%, Disk: {disk_percent:.1f}%",
                priority="high",
                alert_type="system",
                source="health_monitor"
            )
        elif current_health == "warning":
            await create_system_alert(
                "System Warning",
                f"System resources elevated - CPU: {cpu_percent:.1f}%, Memory: {memory_percent:.1f}%, Disk: {disk_percent:.1f}%", 
                priority="medium",
                alert_type="system",
                source="health_monitor"
            )

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

# WebSocket rate limiting for model metrics updates
last_model_metrics_broadcast = {}

async def broadcast_model_metrics_update(model_id: str, force_broadcast: bool = False):
    """Broadcast model-specific metrics updates with rate limiting"""
    global last_model_metrics_broadcast
    
    current_time = time.time()
    
    # Rate limiting: max 1 update per model per 5 seconds (unless forced)
    if not force_broadcast:
        last_broadcast = last_model_metrics_broadcast.get(model_id, 0)
        if current_time - last_broadcast < 5:
            return  # Skip if too frequent
    
    last_model_metrics_broadcast[model_id] = current_time
    
    try:
        # Get current model metrics
        real_time_metrics = get_model_metrics(model_id)
        
        if real_time_metrics is None or model_id not in models_store:
            return  # Model not found or no metrics
        
        model_info = models_store[model_id]
        
        # Create model metrics update event
        metrics_update = {
            "type": "model_metrics_update",
            "timestamp": datetime.now().isoformat(),
            "model_id": model_id,
            "model_name": model_info.get("name", f"Model {model_id[:8]}"),
            "metrics": {
                "accuracy": round(real_time_metrics["accuracy"], 4),
                "predictions_per_minute": round(real_time_metrics["predictions_per_minute"], 2),
                "health_status": real_time_metrics["health"],
                "total_predictions": real_time_metrics["total_predictions"],
                "avg_response_time": round(model_info.get("avg_response_time", 0.0), 1)
            },
            "status": model_info.get("status", "unknown"),
            "last_updated": prediction_tracking["last_updated"].get(model_id, current_time)
        }
        
        # Broadcast to all connected clients
        await manager.broadcast_json(metrics_update)
        
    except Exception as e:
        print(f"Warning: Failed to broadcast model metrics update for {model_id}: {e}")

async def broadcast_prediction_logged_event(model_id: str, prediction_result: Any, input_hash: str):
    """Broadcast individual prediction logging events for real-time tracking"""
    try:
        if model_id not in models_store:
            return
            
        model_info = models_store[model_id]
        current_metrics = get_model_metrics(model_id)
        
        prediction_event = {
            "type": "prediction_logged",
            "timestamp": datetime.now().isoformat(),
            "model_id": model_id,
            "model_name": model_info.get("name", f"Model {model_id[:8]}"),
            "prediction": {
                "result": prediction_result,
                "input_hash": input_hash,
                "timestamp": time.time()
            },
            "updated_metrics": {
                "total_predictions": current_metrics["total_predictions"] if current_metrics else 0,
                "predictions_per_minute": round(current_metrics["predictions_per_minute"], 1) if current_metrics else 0.0,
                "accuracy": round(current_metrics["accuracy"], 3) if current_metrics else 0.0
            }
        }
        
        # Broadcast with low priority to avoid flooding
        await manager.broadcast_json(prediction_event, priority='low')
        
    except Exception as e:
        print(f"Warning: Failed to broadcast prediction logged event for {model_id}: {e}")

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
    """Upload and validate data file with progress tracking"""
    try:
        # Get file size for progress calculation
        file_size = 0
        content = b""
        
        # Read file in chunks with progress tracking
        chunk_size = 8192  # 8KB chunks
        total_read = 0
        
        await manager.broadcast_json({
            "type": "upload_progress",
            "filename": file.filename,
            "progress": 0,
            "status": "starting"
        })
        
        # Read file content in chunks
        while chunk := await file.read(chunk_size):
            content += chunk
            total_read += len(chunk)
            
            # Broadcast progress (estimate total size during read)
            if total_read > 0:
                await manager.broadcast_json({
                    "type": "upload_progress",
                    "filename": file.filename,
                    "progress": min(50, (total_read / (total_read + 1000)) * 50),  # First 50% for reading
                    "status": "reading"
                })
        
        file_size = len(content)

        # Save file temporarily
        upload_dir = PROJECT_ROOT / "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = upload_dir / file.filename

        await manager.broadcast_json({
            "type": "upload_progress",
            "filename": file.filename,
            "progress": 75,
            "status": "saving"
        })

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

        # Final upload progress
        await manager.broadcast_json({
            "type": "upload_progress",
            "filename": file.filename,
            "progress": 100,
            "status": "completed",
            "rows": rows,
            "columns": columns
        })

        # Log activity with broadcast
        await log_activity_with_broadcast(
            "New data uploaded",
            f"{file.filename} ({rows} rows, {columns} columns)",
            "success",
            user="user",
            action_type="data_upload",
            resource=f"file_{file.filename}",
            severity="low"
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
            request.model_type,
            request.target_column
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
    """Make prediction with model with real-time metrics tracking"""
    try:
        if model_id not in models_store:
            raise HTTPException(status_code=404, detail="Model not found")

        # Simulate prediction
        prediction = hash(str(data)) % 2  # Simulated binary prediction
        prediction_result = int(prediction)

        # Update model stats
        models_store[model_id]["predictions_made"] += 1
        
        # Log prediction with real-time metrics tracking
        try:
            updated_metrics = log_prediction_with_metrics(
                model_id=model_id,
                input_data=data,
                prediction_result=prediction_result,
                correct_result=None  # No ground truth available for real-time predictions
            )
            
            # Update model's average response time (simulated)
            models_store[model_id]["avg_response_time"] = 15.0 + (hash(str(data)) % 20)
            
            # Generate input hash for WebSocket events
            input_hash = hashlib.md5(str(data).encode()).hexdigest()[:8]
            
            # Broadcast prediction logged event for real-time tracking
            await broadcast_prediction_logged_event(model_id, prediction_result, input_hash)
            
            # Broadcast model metrics update if significant changes occurred
            # Check if this is a milestone prediction (every 10th prediction)
            if updated_metrics and updated_metrics.get("total_predictions", 0) % 10 == 0:
                await broadcast_model_metrics_update(model_id, force_broadcast=True)
            else:
                await broadcast_model_metrics_update(model_id)
            
        except Exception as e:
            # Don't break prediction flow if metrics logging fails
            print(f"Warning: Failed to log prediction metrics for model {model_id}: {e}")
        
        # Check if we should broadcast prediction volume update
        total_predictions = sum(m["predictions_made"] for m in models_store.values())
        if total_predictions > 0 and total_predictions % 100 == 0:
            await broadcast_prediction_volume_update()

        return {
            "prediction": prediction_result,
            "model_id": model_id,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/models/{model_id}/metrics/realtime")
async def get_model_realtime_metrics(model_id: str):
    """Get detailed real-time performance metrics for a specific model"""
    try:
        if model_id not in models_store:
            raise HTTPException(status_code=404, detail="Model not found")
            
        model_info = models_store[model_id]
        
        # Get real-time metrics from tracking system
        real_time_metrics = get_model_metrics(model_id)
        
        if real_time_metrics is None:
            # Model exists but no predictions made yet
            real_time_metrics = {
                "accuracy": 0.0,
                "predictions_per_minute": 0.0,
                "health": "healthy",
                "total_predictions": 0
            }
        
        # Get recent prediction history for trend analysis
        prediction_history = []
        with prediction_tracking_lock:
            if model_id in prediction_tracking["prediction_history"]:
                history = prediction_tracking["prediction_history"][model_id]
                # Get last 50 predictions for trend analysis
                recent_predictions = list(history)[-50:] if history else []
                
                for pred in recent_predictions:
                    prediction_history.append({
                        "timestamp": pred["timestamp"],
                        "input_hash": pred["input_hash"],
                        "result": pred["result"],
                        "correct": pred.get("correct", None)
                    })
        
        # Calculate performance trends
        current_time = time.time()
        
        # Calculate accuracy trend (last 10 vs previous 10 predictions)
        accuracy_trend = "stable"
        if len(prediction_history) >= 20:
            recent_accuracy = sum(1 for p in prediction_history[-10:] if p.get("correct", False)) / 10
            previous_accuracy = sum(1 for p in prediction_history[-20:-10] if p.get("correct", False)) / 10
            
            if recent_accuracy > previous_accuracy + 0.05:
                accuracy_trend = "improving"
            elif recent_accuracy < previous_accuracy - 0.05:
                accuracy_trend = "declining"
        
        # Calculate prediction rate trend (last 5 minutes vs previous 5 minutes)
        rate_trend = "stable"
        five_minutes_ago = current_time - 300
        ten_minutes_ago = current_time - 600
        
        recent_predictions = len([p for p in prediction_history if p["timestamp"] > five_minutes_ago])
        previous_predictions = len([p for p in prediction_history if ten_minutes_ago < p["timestamp"] <= five_minutes_ago])
        
        if recent_predictions > previous_predictions * 1.2:
            rate_trend = "increasing"
        elif recent_predictions < previous_predictions * 0.8:
            rate_trend = "decreasing"
        
        # Performance metrics with enriched data
        response = {
            "model_id": model_id,
            "model_name": model_info.get("name", f"Model {model_id[:8]}"),
            "timestamp": datetime.now().isoformat(),
            
            # Core real-time metrics
            "performance": {
                "accuracy": round(real_time_metrics["accuracy"], 4),
                "predictions_per_minute": round(real_time_metrics["predictions_per_minute"], 2),
                "avg_response_time_ms": round(model_info.get("avg_response_time", 0.0), 1),
                "total_predictions": real_time_metrics["total_predictions"],
                "health_status": real_time_metrics["health"]
            },
            
            # Trend analysis
            "trends": {
                "accuracy_trend": accuracy_trend,
                "prediction_rate_trend": rate_trend,
                "last_updated": prediction_tracking["last_updated"].get(model_id, 0)
            },
            
            # Historical performance (simplified)
            "history": {
                "recent_predictions": len(prediction_history),
                "accuracy_samples": len([p for p in prediction_history if p.get("correct") is not None]),
                "oldest_prediction": prediction_history[0]["timestamp"] if prediction_history else None,
                "newest_prediction": prediction_history[-1]["timestamp"] if prediction_history else None
            },
            
            # Model deployment info
            "deployment": {
                "status": model_info.get("status", "unknown"),
                "version": model_info.get("version", "unknown"),
                "created_at": model_info.get("created_at", "unknown"),
                "algorithm": model_info.get("hyperparameters", {}).get("algorithm", "unknown")
            },
            
            # Health assessment details
            "health_details": {
                "accuracy_status": "healthy" if real_time_metrics["accuracy"] >= 0.85 else "warning" if real_time_metrics["accuracy"] >= 0.80 else "critical",
                "response_time_status": "healthy" if model_info.get("avg_response_time", 0) <= 100 else "warning" if model_info.get("avg_response_time", 0) <= 200 else "critical",
                "prediction_volume_status": "active" if real_time_metrics["predictions_per_minute"] > 0 else "idle"
            }
        }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model metrics: {str(e)}")

@app.get("/api/models/active/status")
async def get_active_models_status():
    """Get status and health information for all active models"""
    try:
        active_models = []
        
        # Get all models with their real-time metrics
        for model_id, model_info in models_store.items():
            if model_info.get("status") in ["active", "deployed"]:
                # Get real-time metrics
                real_time_metrics = get_model_metrics(model_id)
                
                if real_time_metrics is None:
                    real_time_metrics = {
                        "accuracy": 0.0,
                        "predictions_per_minute": 0.0,
                        "health": "healthy",
                        "total_predictions": 0
                    }
                
                # Determine overall health based on accuracy and response time
                accuracy_health = "healthy" if real_time_metrics["accuracy"] >= 0.85 else "warning" if real_time_metrics["accuracy"] >= 0.80 else "critical"
                response_time_health = "healthy" if model_info.get("avg_response_time", 0) <= 100 else "warning" if model_info.get("avg_response_time", 0) <= 200 else "critical"
                
                # Overall health is worst of the two
                overall_health = real_time_metrics["health"]
                if accuracy_health == "critical" or response_time_health == "critical":
                    overall_health = "critical"
                elif accuracy_health == "warning" or response_time_health == "warning":
                    overall_health = "warning"
                
                active_models.append({
                    "model_id": model_id,
                    "name": model_info.get("name", f"Model {model_id[:8]}"),
                    "status": model_info.get("status", "unknown"),
                    "accuracy": round(real_time_metrics["accuracy"], 3),
                    "predictions_per_minute": round(real_time_metrics["predictions_per_minute"], 1),
                    "total_predictions": real_time_metrics["total_predictions"],
                    "avg_response_time": round(model_info.get("avg_response_time", 0.0), 1),
                    "health": overall_health,
                    "created_at": model_info.get("created_at", "unknown"),
                    "algorithm": model_info.get("hyperparameters", {}).get("algorithm", "unknown"),
                    "last_prediction": prediction_tracking["last_updated"].get(model_id, 0)
                })
        
        # Calculate summary statistics
        total_active = len(active_models)
        healthy_models = len([m for m in active_models if m["health"] == "healthy"])
        warning_models = len([m for m in active_models if m["health"] == "warning"])
        critical_models = len([m for m in active_models if m["health"] == "critical"])
        
        total_predictions_all = sum(m["total_predictions"] for m in active_models)
        avg_accuracy = sum(m["accuracy"] for m in active_models) / total_active if total_active > 0 else 0.0
        avg_response_time = sum(m["avg_response_time"] for m in active_models) / total_active if total_active > 0 else 0.0
        total_predictions_per_minute = sum(m["predictions_per_minute"] for m in active_models)
        
        # Determine overall system health
        if critical_models > 0:
            system_health = "critical"
        elif warning_models > total_active * 0.3:  # More than 30% in warning
            system_health = "warning"
        else:
            system_health = "healthy"
        
        response = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total_active_models": total_active,
                "healthy_models": healthy_models,
                "warning_models": warning_models,
                "critical_models": critical_models,
                "overall_health": system_health,
                "total_predictions": total_predictions_all,
                "avg_accuracy": round(avg_accuracy, 3),
                "avg_response_time": round(avg_response_time, 1),
                "total_predictions_per_minute": round(total_predictions_per_minute, 1)
            },
            "models": active_models
        }
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get active models status: {str(e)}")

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
        "success",
        user="user",
        action_type="model_deployment",
        resource=f"model_{model_id}",
        severity="medium"
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
    
    # Send WebSocket update - create serializable pipeline data
    pipeline_data = {
        "id": new_pipeline.id,
        "name": new_pipeline.name,
        "description": new_pipeline.description,
        "status": new_pipeline.status,
        "created_at": new_pipeline.created_at.isoformat(),
        "updated_at": new_pipeline.updated_at.isoformat(),
        "steps": new_pipeline.steps
    }
    
    await manager.broadcast_json({
        "type": "pipeline_status",
        "pipeline_id": pipeline_id,
        "status": "created",
        "data": pipeline_data
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
    
    # Start pipeline execution in background using the dedicated function
    print(f"🔧 Creating background task for pipeline {pipeline_id}")
    task = asyncio.create_task(execute_pipeline_background(pipeline_id))
    
    # Store task to prevent garbage collection
    if 'active_tasks' not in globals():
        global active_tasks
        active_tasks = {}
    active_tasks[f"pipeline_{pipeline_id}"] = task
    
    # Add callback to clean up task when done
    def cleanup_pipeline_task(task_ref):
        print(f"🧹 Cleaning up completed pipeline task for {pipeline_id}")
        task_key = f"pipeline_{pipeline_id}"
        if task_key in active_tasks:
            del active_tasks[task_key]
    
    task.add_done_callback(cleanup_pipeline_task)
    
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
        "updated_at": pipeline.updated_at.isoformat() if pipeline.updated_at else None
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
    
    # Create serializable dataset data
    dataset_data = {
        "id": dataset.id,
        "name": dataset.name,
        "file_path": dataset.file_path,
        "size": dataset.size,
        "rows": dataset.rows,
        "columns": dataset.columns,
        "created_at": dataset.created_at.isoformat(),
        "status": dataset.status,
        "file_type": dataset.file_type
    }
    
    await manager.broadcast_json({
        "type": "dataset_processed",
        "dataset_id": dataset_id,
        "status": "completed",
        "data": dataset_data
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

# ==================== Data Processing Jobs ====================

# In-memory storage for processing jobs
processing_jobs = {}
# Store for active background tasks to prevent garbage collection
active_tasks = {}

async def execute_processing_job(job_id: str, dataset_id: str, job_name: str):
    """Execute a processing job in the background with progress broadcasting"""
    try:
        job = processing_jobs[job_id]
        job.status = "running"
        job.started_at = datetime.now()
        job.updated_at = datetime.now()
        
        print(f"🎯 Starting processing job: {job_id} for dataset: {dataset_id}")
        
        # Simulate processing steps
        steps = [
            ("Data Validation", 20),
            ("Data Cleaning", 40), 
            ("Feature Extraction", 60),
            ("Quality Analysis", 80),
            ("Finalizing Results", 100)
        ]
        
        for step_name, progress in steps:
            job.progress = progress
            job.updated_at = datetime.now()
            
            print(f"📊 Job {job_id} progress: {progress}% - {step_name}")
            
            await manager.broadcast_json({
                "type": "job_progress",
                "job_id": job_id,
                "progress": progress,
                "status": "running",
                "current_step": step_name,
                "dataset_id": dataset_id
            })
            
            # Simulate processing time
            await asyncio.sleep(2)
        
        # Job completed successfully
        job.status = "completed"
        job.completed_at = datetime.now()
        job.updated_at = datetime.now()
        job.result = {
            "processed_rows": 1000,
            "quality_score": 92,
            "features_extracted": 15,
            "anomalies_detected": 3
        }
        
        print(f"✅ Job {job_id} completed successfully")
        
        await manager.broadcast_json({
            "type": "job_completed",
            "job_id": job_id,
            "status": "completed",
            "result": job.result,
            "dataset_id": dataset_id,
            "duration": "10s"
        })
        
        await log_activity_with_broadcast(
            "Processing job completed",
            f"Data processing for '{job.name}' completed successfully",
            "success"
        )
        
    except Exception as e:
        print(f"❌ Job {job_id} failed: {str(e)}")
        if job_id in processing_jobs:
            job = processing_jobs[job_id]
            job.status = "failed"
            job.error = str(e)
            job.updated_at = datetime.now()
            
            await manager.broadcast_json({
                "type": "job_completed",
                "job_id": job_id,
                "status": "failed",
                "error": str(e),
                "dataset_id": dataset_id
            })
            
            await log_activity_with_broadcast(
                "Processing job failed",
                f"Data processing for job {job_id} failed: {str(e)}",
                "error"
            )

class ProcessingJob(BaseModel):
    id: str
    name: str
    description: str
    status: str = "pending"  # pending, running, completed, failed
    progress: int = 0
    dataset_id: str
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[dict] = None
    error: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

@app.post("/api/datasets/{dataset_id}/process")
async def create_processing_job(dataset_id: str, background_tasks: BackgroundTasks, job_name: str = "Data Processing"):
    """Create and start a data processing job"""
    if dataset_id not in datasets_store:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    job_id = str(uuid.uuid4())
    job = ProcessingJob(
        id=job_id,
        name=job_name,
        description=f"Processing dataset {datasets_store[dataset_id].name}",
        dataset_id=dataset_id,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )
    processing_jobs[job_id] = job
    
    # Start processing job in background using asyncio task
    print(f"🚀 Creating background task for job {job_id}")
    task = asyncio.create_task(execute_processing_job(job_id, dataset_id, job_name))
    active_tasks[job_id] = task
    
    # Add callback to clean up task when done
    def cleanup_task(task_ref):
        print(f"🧹 Cleaning up completed task for job {job_id}")
        if job_id in active_tasks:
            del active_tasks[job_id]
    
    task.add_done_callback(cleanup_task)
    
    return {
        "job_id": job_id,
        "message": "Processing job started",
        "status": "running"
    }

@app.get("/api/processing-jobs")
async def get_processing_jobs():
    """Get all processing jobs"""
    return {
        "jobs": list(processing_jobs.values()),
        "total": len(processing_jobs)
    }

@app.get("/api/processing-jobs/{job_id}")
async def get_processing_job(job_id: str):
    """Get specific processing job status"""
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return processing_jobs[job_id]

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
        "timestamp": datetime.now().isoformat(),
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
        "timestamp": datetime.now().isoformat()
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

@app.get("/api/monitoring/system")
async def get_system_monitoring():
    """Get comprehensive system status combining system health with active model metrics"""
    try:
        # Get basic system metrics
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Calculate system health
        system_health = determine_system_health(cpu_percent, memory.percent, disk.used / disk.total * 100)
        
        # Get active training jobs
        active_training = len([j for j in training_jobs.values() if j["status"] == "training"])
        
        # Collect real-time model metrics
        model_metrics = {}
        with prediction_tracking_lock:
            for model_id in prediction_tracking["active_model_metrics"]:
                if model_id in models_store:
                    model_info = models_store[model_id]
                    metrics = prediction_tracking["active_model_metrics"][model_id]
                    
                    model_metrics[model_id] = {
                        "model_name": model_info.get("name", f"Model {model_id[:8]}"),
                        "status": model_info.get("status", "unknown"),
                        "accuracy": round(metrics.get("accuracy", 0.0), 3),
                        "predictions_per_minute": round(metrics.get("predictions_per_minute", 0.0), 1),
                        "health": metrics.get("health", "unknown"),
                        "total_predictions": metrics.get("total_predictions", 0),
                        "avg_response_time": model_info.get("avg_response_time", 0.0),
                        "last_updated": prediction_tracking["last_updated"].get(model_id, 0)
                    }
        
        # Calculate overall model system health
        active_models = len([m for m in models_store.values() if m.get("status") == "active"])
        total_predictions = sum(m["predictions_made"] for m in models_store.values())
        
        # Determine overall model health based on individual model health
        model_health_scores = []
        for metrics in model_metrics.values():
            if metrics["health"] == "healthy":
                model_health_scores.append(100)
            elif metrics["health"] == "warning":
                model_health_scores.append(70)
            elif metrics["health"] == "critical":
                model_health_scores.append(30)
        
        overall_model_health = "healthy"
        if model_health_scores:
            avg_health = sum(model_health_scores) / len(model_health_scores)
            if avg_health < 50:
                overall_model_health = "critical"
            elif avg_health < 80:
                overall_model_health = "warning"
        
        response = {
            "timestamp": datetime.now().isoformat(),
            "system_health": {
                "overall_status": system_health,
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory.percent, 1),
                "disk_percent": round((disk.used / disk.total) * 100, 1),
                "active_connections": len(manager.active_connections),
                "uptime_hours": round((time.time() - psutil.boot_time()) / 3600, 1) if hasattr(psutil, 'boot_time') else 0
            },
            "model_metrics": {
                "overall_status": overall_model_health,
                "active_models": active_models,
                "total_models": len(models_store),
                "total_predictions": total_predictions,
                "active_training_jobs": active_training,
                "models": model_metrics
            },
            "integration_status": {
                "websocket_connected": len(manager.active_connections) > 0,
                "model_tracking_active": len(model_metrics) > 0,
                "real_time_updates": True,
                "last_cleanup": prediction_tracking["memory_stats"]["last_cleanup"]
            }
        }
        
        return response
        
    except Exception as e:
        # Graceful fallback if metrics collection fails
        return {
            "timestamp": datetime.now().isoformat(),
            "system_health": {
                "overall_status": "unknown",
                "error": "Failed to collect system metrics"
            },
            "model_metrics": {
                "overall_status": "unknown", 
                "error": "Failed to collect model metrics"
            },
            "integration_status": {
                "websocket_connected": False,
                "model_tracking_active": False,
                "real_time_updates": False,
                "error": str(e)
            }
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

            # Collect real-time model metrics for WebSocket broadcast
            model_metrics_summary = {}
            active_models_count = 0
            total_predictions_per_minute = 0.0
            avg_model_accuracy = 0.0
            model_health_counts = {"healthy": 0, "warning": 0, "critical": 0}
            
            with prediction_tracking_lock:
                for model_id in prediction_tracking["active_model_metrics"]:
                    if model_id in models_store and models_store[model_id].get("status") in ["active", "deployed"]:
                        metrics_data = prediction_tracking["active_model_metrics"][model_id]
                        model_info = models_store[model_id]
                        
                        active_models_count += 1
                        total_predictions_per_minute += metrics_data.get("predictions_per_minute", 0.0)
                        avg_model_accuracy += metrics_data.get("accuracy", 0.0)
                        
                        health = metrics_data.get("health", "healthy")
                        model_health_counts[health] = model_health_counts.get(health, 0) + 1
                        
                        # Add individual model data (limited for WebSocket efficiency)
                        model_metrics_summary[model_id] = {
                            "name": model_info.get("name", f"Model {model_id[:8]}"),
                            "accuracy": round(metrics_data.get("accuracy", 0.0), 3),
                            "predictions_per_minute": round(metrics_data.get("predictions_per_minute", 0.0), 1),
                            "health": health,
                            "total_predictions": metrics_data.get("total_predictions", 0),
                            "response_time": round(model_info.get("avg_response_time", 0.0), 1)
                        }
            
            # Calculate model metrics averages
            if active_models_count > 0:
                avg_model_accuracy = avg_model_accuracy / active_models_count
            
            # Determine overall model health
            overall_model_health = "healthy"
            if model_health_counts["critical"] > 0:
                overall_model_health = "critical"
            elif model_health_counts["warning"] > active_models_count * 0.3:
                overall_model_health = "warning"

            # Create optimized metrics payload with model metrics
            metrics = {
                "type": "system_metrics",
                "timestamp": datetime.now().isoformat(),
                "client_id": client_id,
                
                # Core system metrics
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory.percent, 1),
                "disk_percent": round((disk.used / disk.total) * 100, 1),
                
                # Connection stats
                "active_connections": manager.get_connection_stats()['active_connections'],
                "total_models": len(models_store),
                "active_training_jobs": len(active_training),
                
                # Live Model Metrics Integration
                "model_metrics": {
                    "active_models": active_models_count,
                    "overall_health": overall_model_health,
                    "avg_accuracy": round(avg_model_accuracy, 3),
                    "total_predictions_per_minute": round(total_predictions_per_minute, 1),
                    "health_breakdown": model_health_counts,
                    "models": model_metrics_summary  # Individual model data
                },
                
                # Extended system metrics
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
            
            # Send chart data for real-time visualizations
            chart_data = {
                "type": "chart_data",
                "timestamp": datetime.now().isoformat(),
                "charts": {
                    "resource": {
                        "cpu": round(cpu_percent, 1),
                        "memory": round(memory.percent, 1),
                        "disk": round((disk.used / disk.total) * 100, 1)
                    },
                    "network": {
                        "bytes_sent": network.bytes_sent if network else 0,
                        "bytes_recv": network.bytes_recv if network else 0,
                        "packets_sent": network.packets_sent if network else 0,
                        "packets_recv": network.packets_recv if network else 0
                    },
                    "performance": {
                        "api_latency": round(api_response_time, 1),
                        "ws_latency": round(ws_response_time, 1),
                        "throughput": len(manager.active_connections) * 10  # Simulated throughput
                    }
                }
            }
            await websocket.send_json(chart_data)
            
            # Send integration status for architecture page
            integration_status = {
                "type": "integration_status",
                "timestamp": datetime.now().isoformat(),
                "integrations": {
                    "websocket": {
                        "status": "connected",
                        "latency": round(ws_response_time, 1),
                        "connections": len(manager.active_connections)
                    },
                    "api": {
                        "status": "healthy",
                        "response_time": round(api_response_time, 1),
                        "endpoints_active": 25
                    },
                    "database": {
                        "status": "connected",
                        "pool_size": 10,
                        "active_connections": 3
                    },
                    "ml_engine": {
                        "status": "ready" if models_store else "inactive",
                        "models_loaded": len(models_store),
                        "processing_queue": len(active_training)
                    }
                }
            }
            await websocket.send_json(integration_status)
            
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

# Server Lifecycle Handlers
@app.on_event("startup")
async def startup_event():
    """Initialize server and start background tasks"""
    logger = logging.getLogger(__name__)
    
    try:
        # Create necessary directories
        os.makedirs(PROJECT_ROOT / "uploads", exist_ok=True)
        os.makedirs(PROJECT_ROOT / "models", exist_ok=True)
        os.makedirs(PROJECT_ROOT / "static", exist_ok=True)
        os.makedirs(PROJECT_ROOT / "logs", exist_ok=True)
        
        # Configure file logging
        log_file = PROJECT_ROOT / "logs" / "server.log"
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(logging.INFO)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        file_handler.setFormatter(formatter)
        
        # Add file handler to root logger
        root_logger = logging.getLogger()
        root_logger.addHandler(file_handler)
        
        # Register periodic background tasks
        task_manager.register_periodic_task(
            "accuracy_recalculation",
            recalculate_model_accuracy,
            interval_seconds=30,  # Every 30 seconds
            initial_delay=60  # Wait 1 minute before first run
        )
        
        task_manager.register_periodic_task(
            "scheduled_cleanup",
            perform_scheduled_cleanup,
            interval_seconds=3600,  # Every hour
            initial_delay=300  # Wait 5 minutes before first run
        )
        
        task_manager.register_periodic_task(
            "cache_cleanup",
            cleanup_cache_expired,
            interval_seconds=60,  # Every minute
            initial_delay=30  # Wait 30 seconds before first run
        )
        
        # Start all background tasks
        await task_manager.start_all_tasks()
        
        logger.info("Background task manager started with all periodic tasks")
        
        # Initial system status
        await log_activity_with_broadcast(
            "System Started",
            "ML Pipeline backend initialized with background task manager",
            "success"
        )
        
        # Broadcast startup event
        await manager.broadcast_json({
            "type": "system_startup",
            "timestamp": datetime.now().isoformat(),
            "background_tasks": len(task_manager._periodic_tasks),
            "cache_enabled": True
        })
        
        logger.info("Server startup completed successfully")
        
    except Exception as e:
        logger.error(f"Error during server startup: {str(e)}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Graceful shutdown of server and background tasks"""
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("Initiating server shutdown...")
        
        # Set shutdown flag
        shutdown_flag.set()
        
        # Broadcast shutdown notification
        await manager.broadcast_json({
            "type": "system_shutdown",
            "timestamp": datetime.now().isoformat(),
            "message": "Server is shutting down gracefully"
        })
        
        # Give clients time to receive shutdown message
        await asyncio.sleep(1)
        
        # Close all WebSocket connections
        for client_id in list(manager.active_connections.keys()):
            conn_info = manager.active_connections[client_id]
            try:
                await conn_info['websocket'].close(
                    code=1001, 
                    reason="Server shutting down"
                )
            except Exception as e:
                logger.warning(f"Error closing WebSocket connection {client_id}: {e}")
                
        # Shutdown background tasks
        await task_manager.shutdown(timeout=30)
        
        # Clear cache
        cache_manager.clear()
        
        # Log final activity
        await log_activity_with_broadcast(
            "System Shutdown",
            "Server shutdown completed gracefully",
            "info"
        )
        
        logger.info("Server shutdown completed")
        
    except Exception as e:
        logger.error(f"Error during server shutdown: {str(e)}")

# Enhanced Health check with background task status
@app.get("/health")
async def health_check():
    """Enhanced health check with background task and cache status"""
    try:
        # Check if shutdown is in progress
        if shutdown_flag.is_set():
            return {
                "status": "shutting_down",
                "timestamp": datetime.now().isoformat()
            }
            
        # Get background task status
        task_status = task_manager.get_task_status()
        tasks_healthy = all(
            task_info["is_running"] for task_info in task_status.values()
        )
        
        # Get cache statistics
        cache_stats = cache_manager.get_stats()
        
        # Get connection statistics
        connection_stats = manager.get_connection_stats()
        
        # Overall health assessment
        overall_status = "healthy"
        if not tasks_healthy:
            overall_status = "degraded"
        elif cache_stats["usage_percent"] > 90:
            overall_status = "warning"
            
        return {
            "status": overall_status,
            "timestamp": datetime.now().isoformat(),
            "background_tasks": {
                "count": len(task_status),
                "healthy": tasks_healthy,
                "details": task_status
            },
            "cache": {
                "usage_percent": cache_stats["usage_percent"],
                "hit_rate_percent": cache_stats["hit_rate_percent"],
                "total_items": cache_stats["total_items"]
            },
            "connections": {
                "active": connection_stats["active_connections"],
                "total": connection_stats["total_connections"]
            },
            "models": {
                "loaded": len(models_store),
                "active_training": len([j for j in training_jobs.values() if j["status"] == "training"])
            }
        }
        
    except Exception as e:
        return {
            "status": "error",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

# Debug endpoint to manually create system alerts
@app.post("/debug/create-alert")
async def debug_create_alert(title: str = "Test Alert", message: str = "This is a test system alert", priority: str = "medium"):
    """Debug endpoint to manually create and broadcast system alerts"""
    print(f"🚨 Debug: Creating manual system alert - {title}")
    
    try:
        alert = await create_system_alert(title, message, priority, "warning", "debug")
        return {"message": "Alert created successfully", "alert_id": alert.id}
    except Exception as e:
        print(f"🔥 Debug: Error creating alert: {str(e)}")
        return {"error": str(e)}

# Enhanced endpoint to trigger high CPU simulation for health alerts
@app.post("/debug/trigger-high-cpu")
async def debug_trigger_high_cpu():
    """Debug endpoint to simulate high CPU and trigger health alerts"""
    print(f"💻 Debug: Simulating high CPU usage to trigger health alerts")
    
    # Simulate high resource usage by creating alerts
    await create_system_alert(
        "High CPU Usage Detected",
        "System CPU usage is critically high at 95%",
        priority="high",
        alert_type="error",
        source="cpu_monitor"
    )
    
    await create_system_alert(
        "Memory Warning",
        "System memory usage is elevated at 85%",
        priority="medium", 
        alert_type="warning",
        source="memory_monitor"
    )
    
    return {"message": "High resource alerts triggered"}

# Endpoint to test health change events
@app.post("/debug/trigger-health-change")
async def debug_trigger_health_change():
    """Debug endpoint to trigger health change events"""
    print(f"💓 Debug: Triggering health change events")
    
    # Manually trigger health change
    await check_and_broadcast_health_changes("critical", 95.0, 90.0, 88.0)
    
    return {"message": "Health change events triggered"}

if __name__ == "__main__":
    import uvicorn
    
    # Note: Directory creation and initialization now handled in startup_event()
    uvicorn.run(app, host="0.0.0.0", port=8000)