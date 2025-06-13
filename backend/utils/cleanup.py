#!/usr/bin/env python3
"""
Cleanup utilities for automatic maintenance of MLOps backend
Handles removal of old files, models, and data to prevent resource exhaustion
"""

import os
import time
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional
import asyncio
import threading

class CleanupManager:
    """Manages automatic cleanup of old files and data with configurable policies"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.logger = logging.getLogger(__name__)
        self._lock = threading.RLock()
        
        # Default cleanup policies - can be customized
        self.cleanup_policies = {
            "uploads": {
                "max_age_days": 7,
                "max_size_mb": 1000,
                "file_extensions": [".csv", ".txt", ".json", ".xlsx"]
            },
            "models": {
                "max_age_days": 30,
                "max_inactive_days": 14,
                "keep_deployed": True
            },
            "logs": {
                "max_age_days": 30,
                "max_size_mb": 500,
                "max_entries": 1000
            },
            "predictions": {
                "max_age_hours": 24,
                "max_entries_per_model": 1000
            }
        }
        
    def update_cleanup_policy(self, category: str, **kwargs) -> None:
        """Update cleanup policy for a specific category"""
        with self._lock:
            if category in self.cleanup_policies:
                self.cleanup_policies[category].update(kwargs)
                self.logger.info(f"Updated cleanup policy for {category}: {kwargs}")
            else:
                self.logger.warning(f"Unknown cleanup category: {category}")
                
    async def cleanup_old_uploads(self) -> Dict[str, Any]:
        """Remove old uploaded files based on policy"""
        uploads_dir = self.project_root / "uploads"
        if not uploads_dir.exists():
            return {"status": "skipped", "reason": "uploads directory not found"}
            
        policy = self.cleanup_policies["uploads"]
        max_age = timedelta(days=policy["max_age_days"])
        current_time = datetime.now()
        
        removed_files = []
        total_size_removed = 0
        
        try:
            for file_path in uploads_dir.iterdir():
                if file_path.is_file():
                    # Check file age
                    file_age = datetime.fromtimestamp(file_path.stat().st_mtime)
                    if current_time - file_age > max_age:
                        # Check file extension if specified
                        if policy["file_extensions"] and file_path.suffix not in policy["file_extensions"]:
                            continue
                            
                        # Remove file
                        file_size = file_path.stat().st_size
                        file_path.unlink()
                        removed_files.append(file_path.name)
                        total_size_removed += file_size
                        
            result = {
                "status": "completed",
                "removed_count": len(removed_files),
                "size_removed_mb": round(total_size_removed / (1024 * 1024), 2),
                "files_removed": removed_files[:10]  # Show first 10 files
            }
            
            if removed_files:
                self.logger.info(
                    f"Cleanup removed {len(removed_files)} old upload files "
                    f"({result['size_removed_mb']} MB)"
                )
                
            return result
            
        except Exception as e:
            self.logger.error(f"Error during upload cleanup: {str(e)}")
            return {"status": "error", "error": str(e)}
            
    async def cleanup_inactive_models(self, models_store: Dict[str, Any]) -> Dict[str, Any]:
        """Remove inactive models based on policy"""
        policy = self.cleanup_policies["models"]
        max_inactive = timedelta(days=policy["max_inactive_days"])
        current_time = datetime.now()
        
        models_to_remove = []
        removed_files = []
        
        try:
            with self._lock:
                for model_id, model_info in list(models_store.items()):
                    # Skip deployed models if policy says to keep them
                    if policy["keep_deployed"] and model_info.get("status") == "deployed":
                        continue
                        
                    # Check if model is inactive
                    last_used_str = model_info.get("last_used", model_info.get("created_at"))
                    if last_used_str:
                        try:
                            # Handle different datetime formats
                            if isinstance(last_used_str, str):
                                if "T" in last_used_str:
                                    last_used = datetime.fromisoformat(last_used_str.replace("Z", "+00:00"))
                                else:
                                    last_used = datetime.strptime(last_used_str, "%Y-%m-%d %H:%M:%S")
                            else:
                                last_used = last_used_str
                                
                            if current_time - last_used > max_inactive:
                                models_to_remove.append(model_id)
                                
                        except (ValueError, TypeError) as e:
                            self.logger.warning(f"Could not parse date for model {model_id}: {e}")
                            
                # Remove identified models
                for model_id in models_to_remove:
                    model_info = models_store[model_id]
                    
                    # Remove model file if it exists
                    model_path = model_info.get("model_path")
                    if model_path and Path(model_path).exists():
                        Path(model_path).unlink()
                        removed_files.append(model_path)
                        
                    # Remove from store
                    del models_store[model_id]
                    
            result = {
                "status": "completed",
                "removed_models": len(models_to_remove),
                "removed_files": len(removed_files),
                "model_ids": models_to_remove
            }
            
            if models_to_remove:
                self.logger.info(
                    f"Cleanup removed {len(models_to_remove)} inactive models"
                )
                
            return result
            
        except Exception as e:
            self.logger.error(f"Error during model cleanup: {str(e)}")
            return {"status": "error", "error": str(e)}
            
    async def cleanup_old_logs(self, activity_log: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Trim old activity logs based on policy"""
        policy = self.cleanup_policies["logs"]
        max_entries = policy["max_entries"]
        
        try:
            with self._lock:
                original_count = len(activity_log)
                
                if original_count > max_entries:
                    # Keep only the most recent entries
                    removed_count = original_count - max_entries
                    # Modify the list in-place to preserve the reference
                    del activity_log[:-max_entries]
                    
                    result = {
                        "status": "completed",
                        "removed_entries": removed_count,
                        "remaining_entries": len(activity_log)
                    }
                    
                    self.logger.info(
                        f"Cleanup removed {removed_count} old activity log entries"
                    )
                    
                else:
                    result = {
                        "status": "completed",
                        "removed_entries": 0,
                        "remaining_entries": original_count
                    }
                    
            return result
            
        except Exception as e:
            self.logger.error(f"Error during log cleanup: {str(e)}")
            return {"status": "error", "error": str(e)}
            
    async def cleanup_old_predictions(self, prediction_tracking: Dict[str, Any]) -> Dict[str, Any]:
        """Clean up old prediction history using the existing function logic"""
        policy = self.cleanup_policies["predictions"]
        max_age_hours = policy["max_age_hours"]
        
        try:
            current_time = time.time()
            cutoff_time = current_time - (max_age_hours * 3600)
            total_cleaned = 0
            
            with self._lock:
                for model_id in list(prediction_tracking.get("prediction_history", {}).keys()):
                    history = prediction_tracking["prediction_history"][model_id]
                    original_count = len(history)
                    
                    # Create new deque with only recent predictions
                    from collections import deque
                    new_history = deque(maxlen=1000)
                    
                    for prediction in history:
                        if prediction.get("timestamp", 0) >= cutoff_time:
                            new_history.append(prediction)
                        else:
                            total_cleaned += 1
                            
                    prediction_tracking["prediction_history"][model_id] = new_history
                    
                # Update cleanup timestamp
                if "memory_stats" in prediction_tracking:
                    prediction_tracking["memory_stats"]["last_cleanup"] = current_time
                    
            result = {
                "status": "completed", 
                "predictions_cleaned": total_cleaned,
                "cutoff_age_hours": max_age_hours
            }
            
            if total_cleaned > 0:
                self.logger.info(f"Cleanup removed {total_cleaned} old predictions")
                
            return result
            
        except Exception as e:
            self.logger.error(f"Error during prediction cleanup: {str(e)}")
            return {"status": "error", "error": str(e)}
            
    async def run_full_cleanup(
        self, 
        models_store: Optional[Dict[str, Any]] = None,
        activity_log: Optional[List[Dict[str, Any]]] = None,
        prediction_tracking: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Run all cleanup operations"""
        cleanup_results = {}
        
        # Run all cleanup operations
        cleanup_results["uploads"] = await self.cleanup_old_uploads()
        
        if models_store is not None:
            cleanup_results["models"] = await self.cleanup_inactive_models(models_store)
            
        if activity_log is not None:
            cleanup_results["logs"] = await self.cleanup_old_logs(activity_log)
            
        if prediction_tracking is not None:
            cleanup_results["predictions"] = await self.cleanup_old_predictions(prediction_tracking)
            
        # Calculate summary
        total_operations = len(cleanup_results)
        successful_operations = sum(
            1 for result in cleanup_results.values() 
            if result.get("status") == "completed"
        )
        
        cleanup_results["summary"] = {
            "total_operations": total_operations,
            "successful_operations": successful_operations,
            "timestamp": datetime.now().isoformat()
        }
        
        self.logger.info(
            f"Full cleanup completed: {successful_operations}/{total_operations} operations successful"
        )
        
        return cleanup_results
        
    def get_disk_usage(self) -> Dict[str, Any]:
        """Get disk usage statistics for monitored directories"""
        usage_stats = {}
        
        directories = ["uploads", "models", "logs"]
        
        for dir_name in directories:
            dir_path = self.project_root / dir_name
            if dir_path.exists():
                total_size = 0
                file_count = 0
                
                try:
                    for file_path in dir_path.rglob("*"):
                        if file_path.is_file():
                            total_size += file_path.stat().st_size
                            file_count += 1
                            
                    usage_stats[dir_name] = {
                        "size_mb": round(total_size / (1024 * 1024), 2),
                        "file_count": file_count,
                        "path": str(dir_path)
                    }
                    
                except Exception as e:
                    usage_stats[dir_name] = {
                        "error": str(e),
                        "path": str(dir_path)
                    }
            else:
                usage_stats[dir_name] = {
                    "size_mb": 0,
                    "file_count": 0,
                    "path": str(dir_path),
                    "exists": False
                }
                
        return usage_stats