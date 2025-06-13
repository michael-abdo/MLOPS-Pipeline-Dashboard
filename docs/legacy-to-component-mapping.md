# Legacy to Component API Mapping

## Conversion Strategy

### 1. Critical Live System Status Cards

#### liveAccuracy (Model Accuracy)
```javascript
// LEGACY (BROKEN):
accuracyEl.textContent = `${accuracy}%`;
accuracyEl.title = `Validation: ${validationAcc}% | F1: ${f1}`;

// COMPONENT API (CORRECT):
Metric.update('liveAccuracy', accuracy * 100, { 
    format: 'percent',
    tooltip: `Validation: ${validationAcc}% | F1: ${f1}`
});
```

#### livePredictions (Prediction Rate)
```javascript
// LEGACY (BROKEN):
predictionsEl.textContent = `${rate}/min`;
predictionsEl.title = `Total: ${total} | Avg: ${avg}ms`;

// COMPONENT API (CORRECT):
Metric.update('livePredictions', rate, {
    format: 'custom',
    suffix: '/min',
    tooltip: `Total: ${total} | Avg: ${avg}ms`
});
```

#### systemHealth (System Status)
```javascript
// LEGACY (BROKEN):
healthEl.textContent = statusEmoji;
healthEl.title = statusText;

// COMPONENT API (CORRECT):
Metric.update('systemHealth', statusEmoji, {
    format: 'custom',
    tooltip: statusText
});
```

### 2. Model Information Display

#### Model Name
```javascript
// LEGACY:
modelNameEl.textContent = `${model.name} v${model.version}`;

// NEW APPROACH:
ModelDisplay.updateName(model.name, model.version);
```

#### Model Description
```javascript
// LEGACY:
descriptionEl.innerHTML = complexHTMLString;

// NEW APPROACH:
ModelDisplay.updateDescription({
    trainedAt: model.created_at,
    predictions: model.predictions_made,
    algorithm: model.hyperparameters?.algorithm,
    trainingTime: model.training_duration,
    samples: model.training_samples
});
```

### 3. Performance Metrics

#### All Performance Metrics
```javascript
// LEGACY:
document.getElementById('trainingDuration').textContent = duration;
document.getElementById('avgResponseTime').textContent = time;
// ... many more

// COMPONENT API:
PerformanceMetrics.update({
    trainingDuration: duration,
    avgResponseTime: time,
    apiCallsToday: calls,
    totalPredictions: predictions,
    // ... all metrics
});
```

### 4. System Status Indicators

#### Status Badge
```javascript
// LEGACY:
statusEl.textContent = status;
statusEl.className = `badge badge-${type}`;

// COMPONENT API:
StatusBadge.update('modelStatus', {
    text: status,
    type: type // 'success', 'warning', 'danger'
});
```

#### Status Indicator
```javascript
// LEGACY:
indicator.className = `status-indicator status-${status}`;

// COMPONENT API:
StatusIndicator.update('systemStatus', {
    status: status, // 'good', 'warning', 'error'
    text: statusText,
    icon: statusIcon
});
```

### 5. Progress Bars

#### All Progress Elements
```javascript
// LEGACY:
// No progress bar updates in legacy code

// COMPONENT API (Already Used):
ProgressBar.update('cpuProgressBar', percent, {
    style: percent > 80 ? 'danger' : 'default'
});
```

### 6. WebSocket Update Consolidation

#### Before (Mixed Approaches):
```javascript
// Some use Metric.update
Metric.update('cpuPercent', cpu, {format: 'percent'});
// Some use direct DOM
document.getElementById('activeConnections').textContent = connections;
// Some do both!
accuracyEl.textContent = accuracy; // Direct
Metric.update('liveAccuracy', accuracy); // Component
```

#### After (Unified Approach):
```javascript
// ALL use component APIs
SystemMetrics.updateBatch({
    cpu: cpu,
    memory: memory,
    disk: disk,
    connections: connections,
    accuracy: accuracy,
    predictions: rate,
    health: status
});
```

## Implementation Priority

1. **CRITICAL**: Fix Live System Status cards (liveAccuracy, livePredictions, systemHealth)
2. **HIGH**: Unify WebSocket handlers to use component APIs
3. **MEDIUM**: Convert model display to structured component
4. **LOW**: Update remaining performance metrics

## Key Principles

1. **Never use .textContent or .innerHTML on component-managed elements**
2. **Always use the appropriate update API (Metric, ProgressBar, etc.)**
3. **Batch updates when possible to reduce DOM thrashing**
4. **Preserve all visual styling and animations**
5. **Maintain backward compatibility with existing IDs**