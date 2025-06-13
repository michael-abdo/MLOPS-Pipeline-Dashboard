# WebSocket Update Points Documentation

## All WebSocket Handlers in Dashboard

### 1. Critical Handlers (Affect Live System Status)

#### `system_metrics` → `updateSystemMetrics()` (Line 1347)
**Updates:**
- CPU, Memory, Disk usage (Uses Metric.update ✅)
- Active connections (Direct DOM ❌)
- API/WebSocket response times (Direct DOM ❌)
- **liveAccuracy** (Mixed approach ⚠️)
- **livePredictions** (Direct DOM ❌)
- **systemHealth** (Direct DOM ❌)

#### `model_metrics_update` → `updateModelMetrics()` (Line 1485)
**Updates:**
- **liveAccuracy** (Uses Metric.update ✅)
- **livePredictions** (Direct DOM ❌)
- Model health status
- Real-time performance data

#### `prediction_logged` → `handlePredictionLogged()` (Line 1955)
**Updates:**
- Prediction counter animation
- Total predictions display
- Rate calculations

### 2. Training-Related Handlers

#### `training_progress` → `updateTrainingProgress()` (Line 972)
**Updates:**
- Progress bar (Uses ProgressBar.update ✅)
- Training status text
- Accuracy during training

#### `training_completed` → `handleTrainingCompleted()` (Line 1165)
**Updates:**
- Progress bar completion
- Model list refresh
- Activity feed

#### `training_failed` → `handleTrainingFailed()` (Line 1244)
**Updates:**
- Error state display
- Progress bar status
- Error messages

### 3. System Status Handlers

#### `health_change` → `updateSystemHealth()` (Line 194)
**Updates:**
- System health indicators
- Status colors and icons

#### `resource_status` → `updateResourceStatus()` (Line 238)
**Updates:**
- Resource usage displays
- Warning indicators

#### `system_alert` → `handleSystemAlert()` (Line 258)
**Updates:**
- Alert notifications
- System status badges

### 4. Model-Related Handlers

#### `model_deployed` → `handleModelDeployed()` (Line 203)
**Updates:**
- Deployment status
- Model cards
- Activity feed

#### `model_status_change` → `handleModelStatusChange()` (Line 213)
**Updates:**
- Model status badges
- Active model display

### 5. Activity and Performance Handlers

#### `activity_update` → `handleActivityUpdate()` (Line 208)
**Updates:**
- Activity feed only (Works correctly ✅)

#### `performance_metrics` → `updatePerformanceMetrics()` (Line 233)
**Updates:**
- Performance charts
- Metric displays

#### `connection_count` → `updateConnectionCount()` (Line 228)
**Updates:**
- Active connections display

## Update Patterns Analysis

### Good Patterns (Keep These)
```javascript
// Using component APIs
Metric.update('cpuPercent', data.cpu_percent, { format: 'percent' });
ProgressBar.update('trainingProgress', data.progress);
this.activityFeed.addActivity(data);
```

### Bad Patterns (Fix These)
```javascript
// Direct DOM manipulation
document.getElementById('activeConnections').textContent = connections;
accuracyEl.textContent = `${accuracy}%`;
predictionsEl.innerHTML = rateHtml;
```

### Mixed Patterns (Consolidate)
```javascript
// Updates same element twice!
accuracyEl.textContent = accuracy; // Direct
Metric.update('liveAccuracy', accuracy); // Component
```

## Priority WebSocket Handlers to Fix

1. **CRITICAL**: `system_metrics` - Mixed update approaches
2. **CRITICAL**: `model_metrics_update` - Updates Live System Status
3. **HIGH**: `prediction_logged` - Direct DOM updates
4. **MEDIUM**: All other handlers with direct DOM

## Recommended Approach

### Create Unified Update Strategy
```javascript
// Instead of scattered updates across handlers
class WebSocketUpdateStrategy {
    updateSystemMetrics(data) {
        // ALL updates use component APIs
        SystemMetrics.batchUpdate({
            cpu: data.cpu_percent,
            memory: data.memory_percent,
            accuracy: data.current_accuracy,
            predictionRate: data.predictions_per_minute,
            systemHealth: data.system_health
        });
    }
}
```

### Benefits:
1. Single source of truth for updates
2. Consistent update patterns
3. Easier to maintain
4. No more competing update methods