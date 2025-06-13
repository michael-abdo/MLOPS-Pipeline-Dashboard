#!/usr/bin/env python3
"""Test fixtures for model metrics testing"""

import time
import random
from datetime import datetime, timedelta
from typing import Dict, List, Any

class ModelMetricsFixtures:
    """Fixtures for model metrics testing"""
    
    @staticmethod
    def create_sample_prediction_history(model_id: str, count: int = 50, time_window_minutes: int = 10) -> List[Dict[str, Any]]:
        """Create sample prediction history for testing
        
        Args:
            model_id: Model identifier
            count: Number of predictions to generate
            time_window_minutes: Time window in minutes for predictions
            
        Returns:
            List of prediction history entries
        """
        predictions = []
        now = time.time()
        
        for i in range(count):
            # Distribute predictions across time window
            time_offset = (i / count) * time_window_minutes * 60
            timestamp = now - time_offset
            
            # Create realistic input hash
            input_hash = f"hash_{model_id}_{i:04d}"
            
            # Create prediction result with varying accuracy
            # Simulate accuracy degradation over time for testing
            base_accuracy = 0.9 - (i / count) * 0.2  # 90% to 70%
            is_correct = random.random() < base_accuracy
            
            prediction = {
                "timestamp": timestamp,
                "input_hash": input_hash,
                "result": {
                    "prediction": random.choice([0, 1]),
                    "confidence": random.uniform(0.5, 1.0),
                    "actual": random.choice([0, 1]) if random.random() < 0.8 else None  # Some without ground truth
                }
            }
            
            predictions.append(prediction)
        
        # Sort by timestamp (oldest first)
        predictions.sort(key=lambda x: x["timestamp"])
        return predictions
    
    @staticmethod
    def create_accuracy_buffer(size: int = 100, base_accuracy: float = 0.85) -> List[float]:
        """Create accuracy buffer with realistic patterns
        
        Args:
            size: Size of accuracy buffer
            base_accuracy: Base accuracy level
            
        Returns:
            List of accuracy values (0.0 or 1.0)
        """
        buffer = []
        
        for i in range(size):
            # Add some noise and trends to make it realistic
            noise = random.uniform(-0.1, 0.1)
            trend = -0.1 * (i / size)  # Slight degradation over time
            actual_accuracy = base_accuracy + noise + trend
            
            # Convert to binary accuracy (correct/incorrect)
            is_correct = random.random() < max(0.0, min(1.0, actual_accuracy))
            buffer.append(1.0 if is_correct else 0.0)
        
        return buffer
    
    @staticmethod
    def create_model_metrics_data(model_id: str) -> Dict[str, Any]:
        """Create complete model metrics data for testing
        
        Args:
            model_id: Model identifier
            
        Returns:
            Complete model metrics data structure
        """
        now = time.time()
        
        return {
            "active_model_metrics": {
                model_id: {
                    "accuracy": random.uniform(0.75, 0.95),
                    "predictions_per_minute": random.uniform(10.0, 50.0),
                    "health_status": random.choice(["healthy", "warning", "critical"]),
                    "last_prediction": now - random.uniform(0, 300),  # Within last 5 minutes
                    "total_predictions": random.randint(100, 10000)
                }
            },
            "prediction_history": {
                model_id: ModelMetricsFixtures.create_sample_prediction_history(model_id)
            },
            "accuracy_buffers": {
                model_id: ModelMetricsFixtures.create_accuracy_buffer()
            },
            "rate_calculations": {
                model_id: {
                    "last_calculated": now - 30,  # 30 seconds ago
                    "cached_rate": random.uniform(15.0, 35.0),
                    "window_start": now - 300  # 5 minutes ago
                }
            },
            "last_updated": {
                model_id: now - random.uniform(0, 60)  # Within last minute
            }
        }
    
    @staticmethod
    def create_websocket_event_samples() -> Dict[str, Dict[str, Any]]:
        """Create sample WebSocket events for testing
        
        Returns:
            Dictionary of sample WebSocket events
        """
        now = time.time()
        
        return {
            "model_metrics_update": {
                "type": "model_metrics_update",
                "timestamp": now,
                "model_id": "test-model-001",
                "metrics": {
                    "accuracy": 0.891,
                    "predictions_per_minute": 23.5,
                    "health_status": "healthy",
                    "response_time_ms": 45.2
                }
            },
            "prediction_logged": {
                "type": "prediction_logged",
                "timestamp": now,
                "model_id": "test-model-001",
                "prediction_result": {
                    "prediction": 1,
                    "confidence": 0.87
                },
                "total_predictions": 1247,
                "rate_change": "+2.3"
            },
            "system_metrics": {
                "type": "system_metrics",
                "timestamp": now,
                "system_health": {
                    "overall_status": "healthy",
                    "cpu_percent": 45.2,
                    "memory_percent": 67.8,
                    "disk_percent": 23.1
                },
                "model_metrics": {
                    "overall_status": "healthy",
                    "active_models": 2,
                    "avg_accuracy": 0.876,
                    "total_predictions": 3421,
                    "models": {
                        "test-model-001": {
                            "accuracy": 0.891,
                            "predictions_per_minute": 23.5,
                            "health": "healthy"
                        },
                        "test-model-002": {
                            "accuracy": 0.861,
                            "predictions_per_minute": 18.7,
                            "health": "warning"
                        }
                    }
                }
            }
        }
    
    @staticmethod
    def create_api_response_samples() -> Dict[str, Dict[str, Any]]:
        """Create sample API responses for testing
        
        Returns:
            Dictionary of sample API responses
        """
        now = time.time()
        
        return {
            "monitoring_system": {
                "timestamp": datetime.now().isoformat(),
                "system_health": {
                    "overall_status": "healthy",
                    "cpu_percent": 42.3,
                    "memory_percent": 68.9,
                    "disk_percent": 25.4,
                    "active_connections": 3,
                    "uptime_hours": 72.5
                },
                "model_metrics": {
                    "overall_status": "healthy",
                    "active_models": 2,
                    "total_models": 5,
                    "total_predictions": 15847,
                    "active_training_jobs": 0,
                    "avg_accuracy": 0.883,
                    "models": {
                        "model-001": {
                            "accuracy": 0.891,
                            "predictions_per_minute": 23.5,
                            "health": "healthy",
                            "last_prediction": now - 15
                        },
                        "model-002": {
                            "accuracy": 0.875,
                            "predictions_per_minute": 18.2,
                            "health": "warning",
                            "last_prediction": now - 45
                        }
                    }
                },
                "integration_status": {
                    "websocket_connected": True,
                    "model_tracking_active": True,
                    "real_time_updates": True,
                    "last_cleanup": now - 3600
                }
            },
            "model_realtime_metrics": {
                "model_id": "test-model-001",
                "performance": {
                    "accuracy": 0.891,
                    "predictions_per_minute": 23.5,
                    "total_predictions": 1247,
                    "health_status": "healthy",
                    "response_time_avg": 45.2,
                    "last_prediction": now - 12
                },
                "status": {
                    "is_active": True,
                    "deployed_at": (datetime.now() - timedelta(hours=24)).isoformat(),
                    "version": "v2.1.3",
                    "health_check_passed": True
                },
                "history": {
                    "accuracy_trend": "stable",
                    "prediction_volume_trend": "increasing",
                    "recent_accuracy": [0.89, 0.91, 0.88, 0.92, 0.89],
                    "recent_rates": [21.2, 22.8, 24.1, 23.5, 23.9]
                }
            },
            "active_models_status": {
                "active_models": [
                    {
                        "model_id": "test-model-001",
                        "name": "Customer Prediction Model",
                        "version": "v2.1.3",
                        "status": "active",
                        "health": "healthy",
                        "accuracy": 0.891,
                        "predictions_today": 1247,
                        "deployed_at": (datetime.now() - timedelta(hours=24)).isoformat()
                    },
                    {
                        "model_id": "test-model-002",
                        "name": "Churn Prediction Model",
                        "version": "v1.8.2",
                        "status": "active",
                        "health": "warning",
                        "accuracy": 0.875,
                        "predictions_today": 892,
                        "deployed_at": (datetime.now() - timedelta(days=3)).isoformat()
                    }
                ],
                "summary": {
                    "total_active": 2,
                    "healthy_models": 1,
                    "warning_models": 1,
                    "critical_models": 0,
                    "total_predictions_today": 2139,
                    "avg_accuracy": 0.883
                }
            }
        }
    
    @staticmethod
    def create_performance_test_data(model_count: int = 5, predictions_per_model: int = 1000) -> Dict[str, Any]:
        """Create large dataset for performance testing
        
        Args:
            model_count: Number of models to simulate
            predictions_per_model: Number of predictions per model
            
        Returns:
            Large dataset for performance testing
        """
        performance_data = {
            "active_model_metrics": {},
            "prediction_history": {},
            "accuracy_buffers": {},
            "rate_calculations": {},
            "last_updated": {}
        }
        
        for i in range(model_count):
            model_id = f"perf-test-model-{i:03d}"
            
            # Create large prediction history
            performance_data["prediction_history"][model_id] = (
                ModelMetricsFixtures.create_sample_prediction_history(
                    model_id, predictions_per_model, 60  # 1 hour window
                )
            )
            
            # Create large accuracy buffer
            performance_data["accuracy_buffers"][model_id] = (
                ModelMetricsFixtures.create_accuracy_buffer(1000, 0.85)
            )
            
            # Add other metrics
            now = time.time()
            performance_data["active_model_metrics"][model_id] = {
                "accuracy": random.uniform(0.8, 0.95),
                "predictions_per_minute": random.uniform(50.0, 200.0),
                "health_status": random.choice(["healthy", "warning"]),
                "last_prediction": now - random.uniform(0, 60)
            }
            
            performance_data["rate_calculations"][model_id] = {
                "last_calculated": now - 30,
                "cached_rate": random.uniform(50.0, 200.0),
                "window_start": now - 3600
            }
            
            performance_data["last_updated"][model_id] = now - random.uniform(0, 30)
        
        return performance_data
    
    @staticmethod
    def create_edge_case_scenarios() -> Dict[str, Dict[str, Any]]:
        """Create edge case scenarios for testing
        
        Returns:
            Dictionary of edge case test scenarios
        """
        now = time.time()
        
        return {
            "empty_model": {
                "model_id": "empty-model",
                "prediction_history": [],
                "accuracy_buffer": [],
                "expected_accuracy": 0.0,
                "expected_rate": 0.0
            },
            "single_prediction": {
                "model_id": "single-pred-model",
                "prediction_history": [
                    {
                        "timestamp": now - 30,
                        "input_hash": "single_hash",
                        "result": {"prediction": 1, "confidence": 0.9}
                    }
                ],
                "accuracy_buffer": [1.0],
                "expected_accuracy": 1.0,
                "expected_rate": 1.0
            },
            "high_frequency": {
                "model_id": "high-freq-model",
                "prediction_history": [
                    {
                        "timestamp": now - i,
                        "input_hash": f"hash_{i}",
                        "result": {"prediction": i % 2, "confidence": 0.8}
                    }
                    for i in range(1, 61)  # 60 predictions in 60 seconds
                ],
                "accuracy_buffer": [i % 2 for i in range(60)],  # Alternating accuracy
                "expected_accuracy": 0.5,
                "expected_rate": 60.0
            },
            "old_predictions": {
                "model_id": "old-pred-model",
                "prediction_history": [
                    {
                        "timestamp": now - 7200 - i,  # 2+ hours old
                        "input_hash": f"old_hash_{i}",
                        "result": {"prediction": 1, "confidence": 0.8}
                    }
                    for i in range(10)
                ],
                "accuracy_buffer": [1.0] * 10,
                "expected_accuracy": 1.0,
                "expected_rate": 0.0  # No recent predictions
            },
            "degrading_accuracy": {
                "model_id": "degrading-model",
                "prediction_history": [
                    {
                        "timestamp": now - i,
                        "input_hash": f"degrade_hash_{i}",
                        "result": {"prediction": 1, "confidence": max(0.5, 1.0 - i/100)}
                    }
                    for i in range(100)
                ],
                "accuracy_buffer": [max(0.0, 1.0 - i/50) for i in range(100)],  # Linear degradation
                "expected_accuracy": 0.495,  # Average of degradation
                "expected_rate": 100.0
            }
        }

# Convenience functions for quick fixture access
def get_sample_model_data(model_id: str = "test-model") -> Dict[str, Any]:
    """Get sample model data for quick testing"""
    return ModelMetricsFixtures.create_model_metrics_data(model_id)

def get_websocket_samples() -> Dict[str, Dict[str, Any]]:
    """Get WebSocket event samples for testing"""
    return ModelMetricsFixtures.create_websocket_event_samples()

def get_api_samples() -> Dict[str, Dict[str, Any]]:
    """Get API response samples for testing"""
    return ModelMetricsFixtures.create_api_response_samples()

def get_performance_data(models: int = 5, predictions: int = 1000) -> Dict[str, Any]:
    """Get large dataset for performance testing"""
    return ModelMetricsFixtures.create_performance_test_data(models, predictions)

def get_edge_cases() -> Dict[str, Dict[str, Any]]:
    """Get edge case scenarios for testing"""
    return ModelMetricsFixtures.create_edge_case_scenarios()