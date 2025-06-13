# WebSocket API Documentation

## Overview
The MLOps Pipeline Dashboard uses WebSocket connections for real-time updates across all system components. This document describes the WebSocket event API and implementation details.

## Connection Management

### Connection URL
```javascript
const WS_URL = 'ws://localhost:8001/ws';
```

### Connection Events
- `connected` - WebSocket connection established
- `disconnected` - WebSocket connection lost
- `reconnecting` - Attempting to reconnect
- `error` - Connection error occurred
- `max_reconnect_attempts` - Maximum reconnection attempts reached

### Connection Quality
Based on ping/pong latency measurements:
- `excellent` - < 50ms latency
- `good` - 50-150ms latency  
- `fair` - 150-300ms latency
- `poor` - > 300ms latency

---

## Live System Status Events

### Current Model Status

#### `model_deployed`
Triggered when a new model is deployed to production.

**Payload:**
```javascript
{
  type: 'model_deployed',
  model_name: 'Customer Predictor v3.2',
  model_version: 'v3.2',
  model_accuracy: 0.973,
  deployment_timestamp: '2025-12-06T10:30:00Z',
  model_id: 'cp_v32_20251206'
}
```

**UI Updates:**
- Updates model name and version display
- Refreshes deployment timestamp with time-ago formatting
- Updates status indicator to "Deployed & Active"

#### `model_status_change`
Triggered when model operational status changes.

**Payload:**
```javascript
{
  type: 'model_status_change',
  status: 'active',        // 'active', 'training', 'error', 'inactive'
  model_id: 'cp_v32_20251206',
  health_score: 0.95,
  last_prediction: '2025-12-06T10:29:45Z'
}
```

**Status Values:**
- `active` - Model operational and receiving requests
- `training` - Model currently being retrained
- `error` - Model encountered errors, needs attention
- `inactive` - Model stopped or not deployed

**UI Updates:**
- Changes status dot color (green/yellow/red/gray)
- Updates health status text
- Enables/disables action buttons based on status

#### `prediction_volume`
Triggered when prediction milestones are reached or volume changes significantly.

**Payload:**
```javascript
{
  type: 'prediction_volume',
  total_predictions: 5247,
  predictions_per_minute: 42,
  milestone_reached: 5000,
  timestamp: '2025-12-06T10:30:00Z',
  message: '5000 predictions milestone reached!'
}
```

**UI Updates:**
- Updates total predictions counter with smooth increment animation
- Calculates and displays predictions per minute rate
- Shows milestone notification if applicable

---

### Training Progress

#### `training_progress`
Triggered during model training to show real-time progress.

**Payload:**
```javascript
{
  type: 'training_progress',
  progress: 65,                    // 0-100 percentage
  stage: 'model_training',         // Current training stage
  current_stage: 'Training model', // Human-readable stage
  estimated_time_remaining: 180,   // Seconds
  current_epoch: 15,
  total_epochs: 20,
  current_loss: 0.0234,
  message: 'Training 65% complete - Epoch 15/20'
}
```

**Training Stages:**
- `data_preparation` - Preparing and validating data
- `feature_engineering` - Creating feature sets
- `model_training` - Training the model
- `validation` - Validating model performance
- `finalization` - Finalizing and saving model

**UI Updates:**
- Updates progress bar width (0-100%)
- Updates stage text and description
- Updates percentage display
- Updates training details message
- Updates estimated time remaining

#### `training_completed`
Triggered when model training completes successfully.

**Payload:**
```javascript
{
  type: 'training_completed',
  final_accuracy: 0.968,
  training_time: '4m 23s',
  validation_score: 0.971,
  model_size: '2.3MB',
  total_epochs: 20,
  message: 'Training completed successfully!',
  model_id: 'cp_v33_20251206'
}
```

**UI Updates:**
- Shows completion message with success styling
- Updates final accuracy result
- Resets progress to "Ready" state after celebration
- Enables "Deploy Model" button
- Shows training summary statistics

#### `training_failed`
Triggered when model training encounters an error.

**Payload:**
```javascript
{
  type: 'training_failed',
  error: 'Insufficient memory available for training',
  error_code: 'MEMORY_ERROR',
  stage_failed: 'model_training',
  progress_when_failed: 45,
  suggestions: ['Reduce batch size', 'Use smaller dataset'],
  timestamp: '2025-12-06T10:25:30Z'
}
```

**UI Updates:**
- Shows detailed error message
- Resets progress bar to error state (red background)
- Enables comprehensive retry button system
- Provides actionable error suggestions
- Updates button styling to warning state

---

### Real-Time Metrics

#### `system_metrics`
Comprehensive system metrics update with performance data.

**Payload:**
```javascript
{
  type: 'system_metrics',
  current_accuracy: 0.942,        // Current model accuracy
  model_accuracy: 0.942,          // Alternative field name
  predictions_per_minute: 31,     // Rate calculations
  prediction_rate: 31,            // Alternative field name
  current_health: 'healthy',      // 'healthy', 'warning', 'critical'
  cpu_percent: 45.2,
  memory_percent: 67.8,
  disk_percent: 23.1,
  active_connections: 15,
  api_response_time_ms: 142,
  ws_response_time_ms: 18,
  timestamp: '2025-12-06T10:30:00Z'
}
```

**Health Status:**
- `healthy` - All systems operating normally
- `warning` - Elevated resource usage or minor issues
- `critical` - High resource usage or system problems

**UI Updates:**
- **liveAccuracy**: Scale animation on change, 1-decimal formatting
- **livePredictions**: Trend arrows (↗️ +5, ↘️ -3), timestamp-based calculation
- **systemHealth**: Pulse animation on status changes (✅/⚠️/🚨)
- **CPU/Memory/Disk**: Progress bars with color coding
- **Connections**: Counter with animation on changes

#### `health_change`
Specific health status change event with detailed context.

**Payload:**
```javascript
{
  type: 'health_change',
  current_health: 'warning',
  previous_health: 'healthy',
  reason: 'High CPU usage detected',
  metrics: {
    cpu_percent: 85.4,
    memory_percent: 72.1
  },
  recommended_action: 'Consider scaling resources'
}
```

---

## File Management Events

#### `file_validated`
Triggered after file upload validation completes.

**Payload:**
```javascript
{
  type: 'file_validated',
  status: 'success',              // 'success' or 'error'
  filename: 'customer_data.csv',
  file_path: '/tmp/uploads/customer_data.csv',
  rows: 10000,
  columns: 12,
  file_size: '2.4MB',
  target_column: 'churn_status',
  summary: 'Customer churn dataset with 12 features',
  validation_time: 1.23,
  error?: 'Invalid file format'   // Only if status is 'error'
}
```

#### `upload_progress`
Triggered during file upload to show progress.

**Payload:**
```javascript
{
  type: 'upload_progress',
  filename: 'large_dataset.csv',
  bytes_uploaded: 1048576,
  total_bytes: 5242880,
  progress_percent: 20,
  upload_speed: '2.1 MB/s',
  estimated_time_remaining: 15
}
```

---

## Activity and Monitoring Events

#### `activity_update`
Triggered for system activity logging and user actions.

**Payload:**
```javascript
{
  type: 'activity_update',
  activity: {
    id: 'act_20251206_001',
    title: 'Model Training Started',
    description: 'Training Customer Predictor v3.3',
    user: 'system',
    action_type: 'training_start',
    status: 'in_progress',
    timestamp: '2025-12-06T10:30:00Z',
    severity_level: 'info',
    duration: null,
    metadata: {
      model_name: 'Customer Predictor v3.3',
      dataset_size: 10000
    }
  }
}
```

#### `system_alert`
Triggered for important system notifications.

**Payload:**
```javascript
{
  type: 'system_alert',
  alert: {
    id: 'alert_20251206_001',
    title: 'High Memory Usage',
    message: 'System memory usage above 80%',
    alert_type: 'resource_warning',
    priority: 'medium',           // 'low', 'medium', 'high'
    source: 'monitoring_service',
    timestamp: '2025-12-06T10:30:00Z',
    auto_dismiss: false,
    actions: ['Scale Resources', 'Optimize Models']
  }
}
```

---

## Auto-Refresh Fallback

When WebSocket connection is lost, the system automatically polls REST endpoints:

### Fallback Endpoints
- `GET /api/models` - Model status and metrics (every 30s)
- `GET /api/monitoring/system` - System metrics (every 30s)  
- `GET /api/activity` - Activity feed updates (every 30s)

### Offline Mode Indicators
- Connection status shows "Offline Mode"
- Last update timestamp shows "Refreshed (offline mode)"
- UI elements display warning colors during offline operation

---

## Implementation Notes

### Event Handler Registration
```javascript
// Register WebSocket event handler
this.addWebSocketHandler('model_deployed', (data) => {
    this.handleModelDeployed(data);
});
```

### Animation Performance
- CSS transitions use hardware acceleration
- Scale transformations: `transform: scale(1.1)`
- Pulse animations: Custom `@keyframes` for health status
- Trend indicators: Color-coded with smooth transitions

### Error Handling
- Automatic reconnection with exponential backoff
- Maximum 5 reconnection attempts before manual retry
- Comprehensive error logging and user notifications
- Graceful degradation to polling mode

### Memory Management
- Automatic cleanup of event listeners on page unload
- WebSocket handler unsubscription on component destruction
- Interval cleanup for time-based updates

---

## Testing

### Manual Testing
```bash
# Open interactive test page
open automation/verify-live-system-status-complete.html

# Run verification script
node automation/execute-live-system-status.js
```

### Event Simulation
Use browser console to trigger test events:
```javascript
// Simulate model deployment
wsManager.emit('model_deployed', {
    model_name: 'Test Model v1.0',
    model_accuracy: 0.95,
    deployment_timestamp: new Date().toISOString()
});

// Simulate training progress
wsManager.emit('training_progress', {
    progress: 50,
    stage: 'model_training',
    message: 'Training 50% complete'
});
```

This WebSocket API provides comprehensive real-time communication for all dashboard components with robust error handling and offline fallback capabilities.