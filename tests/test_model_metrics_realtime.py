#!/usr/bin/env python3
"""Comprehensive tests for real-time model metrics functionality"""

import pytest
import asyncio
import json
import time
import threading
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
import sys
import os

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Import backend modules for testing
from backend_simple import (
    prediction_tracking, prediction_tracking_lock,
    log_prediction_with_metrics, calculate_rolling_accuracy,
    calculate_predictions_per_minute, get_model_metrics,
    cleanup_old_predictions
)

class TestPredictionTracking:
    """Test prediction logging and tracking functionality"""
    
    def setup_method(self):
        """Reset prediction tracking state before each test"""
        with prediction_tracking_lock:
            prediction_tracking["active_model_metrics"] = {}
            prediction_tracking["prediction_history"] = {}
            prediction_tracking["rate_calculations"] = {}
            prediction_tracking["accuracy_buffers"] = {}
            prediction_tracking["last_updated"] = {}
            prediction_tracking["memory_stats"]["total_predictions"] = 0
    
    def test_log_prediction_basic(self):
        """Test basic prediction logging functionality"""
        model_id = "test-model-001"
        input_data = {"feature1": 1.0, "feature2": 2.0}
        result = {"prediction": 1, "confidence": 0.85}
        
        # Log a prediction
        log_prediction_with_metrics(model_id, input_data, result)
        
        # Verify tracking data was created
        assert model_id in prediction_tracking["prediction_history"]
        assert len(prediction_tracking["prediction_history"][model_id]) == 1
        
        # Verify prediction data structure
        logged_prediction = prediction_tracking["prediction_history"][model_id][0]
        assert "timestamp" in logged_prediction
        assert "input_hash" in logged_prediction
        assert "result" in logged_prediction
        assert logged_prediction["result"] == result
        
    def test_log_prediction_circular_buffer(self):
        """Test that prediction history maintains circular buffer of max 1000 entries"""
        model_id = "test-model-buffer"
        
        # Log 1005 predictions to test circular buffer
        for i in range(1005):
            input_data = {"feature": i}
            result = {"prediction": i % 2}
            log_prediction_with_metrics(model_id, input_data, result)
        
        # Should only keep last 1000 predictions
        assert len(prediction_tracking["prediction_history"][model_id]) == 1000
        
        # Verify newest predictions are kept (last 1000)
        first_prediction = prediction_tracking["prediction_history"][model_id][0]
        last_prediction = prediction_tracking["prediction_history"][model_id][-1]
        
        # The first prediction should be from iteration 5 (0-indexed, so feature: 5)
        # The last prediction should be from iteration 1004
        assert first_prediction["result"]["prediction"] == 1  # 5 % 2 = 1
        assert last_prediction["result"]["prediction"] == 0   # 1004 % 2 = 0
    
    def test_thread_safety_concurrent_logging(self):
        """Test thread safety of concurrent prediction logging"""
        model_id = "test-model-concurrent"
        results = []
        
        def log_predictions_worker(worker_id, count):
            """Worker function for concurrent logging"""
            worker_results = []
            for i in range(count):
                input_data = {"worker": worker_id, "iteration": i}
                result = {"prediction": (worker_id + i) % 2, "worker_id": worker_id}
                log_prediction_with_metrics(model_id, input_data, result)
                worker_results.append((worker_id, i))
            results.extend(worker_results)
        
        # Create multiple threads logging concurrently
        threads = []
        for worker_id in range(5):
            thread = threading.Thread(
                target=log_predictions_worker, 
                args=(worker_id, 20)
            )
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify all predictions were logged without data corruption
        total_logged = len(prediction_tracking["prediction_history"][model_id])
        assert total_logged == 100  # 5 workers * 20 predictions each
        
        # Verify no duplicate timestamps (within reasonable precision)
        timestamps = [p["timestamp"] for p in prediction_tracking["prediction_history"][model_id]]
        assert len(set(timestamps)) >= 95  # Allow small overlap due to timing

class TestAccuracyCalculation:
    """Test real-time accuracy calculation functionality"""
    
    def setup_method(self):
        """Reset state before each test"""
        with prediction_tracking_lock:
            prediction_tracking["accuracy_buffers"] = {}
    
    def test_rolling_accuracy_calculation(self):
        """Test rolling accuracy calculation with various scenarios"""
        model_id = "test-accuracy-001"
        
        # Test empty buffer
        accuracy = calculate_rolling_accuracy(model_id, 10)
        assert accuracy == 0.0
        
        # Add some predictions with known accuracy pattern
        # Accuracy buffer stores (actual, predicted) tuples or accuracy values
        prediction_tracking["accuracy_buffers"][model_id] = [
            1.0, 1.0, 0.0, 1.0, 1.0,  # 4/5 = 0.8
            0.0, 0.0, 1.0, 0.0, 1.0   # 3/5 = 0.6, total: 7/10 = 0.7
        ]
        
        # Test rolling accuracy for last 10 predictions
        accuracy = calculate_rolling_accuracy(model_id, 10)
        assert accuracy == 0.7
        
        # Test rolling accuracy for last 5 predictions
        accuracy = calculate_rolling_accuracy(model_id, 5)
        assert accuracy == 0.6
    
    def test_accuracy_buffer_overflow(self):
        """Test accuracy buffer maintains max size"""
        model_id = "test-accuracy-overflow"
        
        # Fill buffer beyond max size (100)
        accuracy_values = [i % 2 for i in range(150)]  # Alternating 0, 1
        prediction_tracking["accuracy_buffers"][model_id] = accuracy_values
        
        # Calculate accuracy should handle overflow gracefully
        accuracy = calculate_rolling_accuracy(model_id, 100)
        
        # Should use last 100 values: 50 zeros, 50 ones = 0.5 accuracy
        assert accuracy == 0.5

class TestPredictionRateCalculation:
    """Test predictions per minute calculation"""
    
    def test_predictions_per_minute_calculation(self):
        """Test rate calculation from timestamps"""
        model_id = "test-rate-001"
        
        # Create prediction history with timestamps over 2 minutes
        now = time.time()
        timestamps = [
            now - 120,  # 2 minutes ago
            now - 90,   # 1.5 minutes ago
            now - 60,   # 1 minute ago
            now - 30,   # 30 seconds ago
            now - 15,   # 15 seconds ago
            now - 5,    # 5 seconds ago
        ]
        
        prediction_tracking["prediction_history"][model_id] = [
            {"timestamp": ts, "input_hash": f"hash_{i}", "result": {"prediction": i % 2}}
            for i, ts in enumerate(timestamps)
        ]
        
        # Calculate rate for last 60 seconds (should find 3 predictions)
        rate = calculate_predictions_per_minute(model_id, 60)
        assert rate == 3.0  # 3 predictions in last 60 seconds
        
        # Calculate rate for last 120 seconds (should find 5 predictions)
        rate = calculate_predictions_per_minute(model_id, 120)
        assert rate == 2.5  # 5 predictions in 120 seconds = 2.5 per minute
    
    def test_predictions_per_minute_edge_cases(self):
        """Test edge cases for rate calculation"""
        model_id = "test-rate-edge"
        
        # Test empty history
        rate = calculate_predictions_per_minute(model_id, 60)
        assert rate == 0.0
        
        # Test single prediction
        now = time.time()
        prediction_tracking["prediction_history"][model_id] = [
            {"timestamp": now - 30, "input_hash": "hash_1", "result": {"prediction": 1}}
        ]
        
        rate = calculate_predictions_per_minute(model_id, 60)
        assert rate == 1.0  # 1 prediction in 60 second window

class TestGetModelMetrics:
    """Test model metrics retrieval functionality"""
    
    def setup_method(self):
        """Set up test data"""
        with prediction_tracking_lock:
            prediction_tracking["active_model_metrics"] = {}
            prediction_tracking["prediction_history"] = {}
    
    def test_get_model_metrics(self):
        """Test basic model metrics retrieval"""
        model_id = "test-metrics-001"
        
        # Set up model with prediction history
        now = time.time()
        prediction_tracking["prediction_history"][model_id] = [
            {"timestamp": now - 30, "result": {"prediction": 1}},
            {"timestamp": now - 20, "result": {"prediction": 0}},
            {"timestamp": now - 10, "result": {"prediction": 1}},
        ]
        
        # Get metrics
        metrics = get_model_metrics(model_id)
        
        # Verify metrics structure
        assert isinstance(metrics, dict)
        # The function should return basic metrics without raising errors

class TestMemoryManagement:
    """Test memory management and cleanup functionality"""
    
    def test_memory_tracking(self):
        """Test memory usage tracking"""
        # Verify memory stats structure exists
        assert "memory_stats" in prediction_tracking
        assert "total_predictions" in prediction_tracking["memory_stats"]
        assert "last_cleanup" in prediction_tracking["memory_stats"]
        assert "cleanup_threshold" in prediction_tracking["memory_stats"]
    
    def test_cleanup_threshold(self):
        """Test cleanup threshold configuration"""
        # Verify cleanup threshold is set to 100MB
        expected_threshold = 100 * 1024 * 1024  # 100MB
        assert prediction_tracking["memory_stats"]["cleanup_threshold"] == expected_threshold

class TestErrorHandling:
    """Test error handling in model metrics functionality"""
    
    def test_log_prediction_with_invalid_data(self):
        """Test prediction logging handles invalid data gracefully"""
        model_id = "test-error-001"
        
        # Test with None input data
        try:
            log_prediction_with_metrics(model_id, None, {"prediction": 1})
            # Should not raise exception
        except Exception as e:
            pytest.fail(f"log_prediction_with_metrics raised exception with None input: {e}")
        
        # Test with empty result
        try:
            log_prediction_with_metrics(model_id, {"feature": 1}, {})
            # Should not raise exception
        except Exception as e:
            pytest.fail(f"log_prediction_with_metrics raised exception with empty result: {e}")
    
    def test_accuracy_calculation_with_missing_model(self):
        """Test accuracy calculation with non-existent model"""
        accuracy = calculate_rolling_accuracy("non-existent-model", 10)
        assert accuracy == 0.0
    
    def test_rate_calculation_with_missing_model(self):
        """Test rate calculation with non-existent model"""
        rate = calculate_predictions_per_minute("non-existent-model", 60)
        assert rate == 0.0

if __name__ == "__main__":
    pytest.main([__file__, "-v"])