# Live System Status - Data Flow Diagram

## Current Implementation

```
┌─────────────────────────────────────────────────────────────────────┐
│                        🔧 LIVE SYSTEM STATUS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐  │
│  │   Current Model Status   │    │   Live Training Progress    │  │
│  │ ┌─────────────────────┐ │    │ ┌─────────────────────────┐ │  │
│  │ │ Model Name: v2.1    │ │    │ │ Progress Bar: ████░░░░ │ │  │
│  │ │ Last Trained: 2h    │ │    │ │ Stage: Ready (100%)    │ │  │
│  │ │ Predictions: 1,247  │ │    │ │ Details: System ready  │ │  │
│  │ │ Status: Live ✅     │ │    │ └─────────────────────────┘ │  │
│  │ └─────────────────────┘ │    └─────────────────────────────┘  │
│  └─────────────────────────┘                                      │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Real-Time Metrics Grid                          │  │
│  │ ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │  │
│  │ │  Accuracy   │  │ Predictions │  │   System Health     │ │  │
│  │ │   94.2%     │  │   23/min    │  │       ✅           │ │  │
│  │ └─────────────┘  └─────────────┘  └─────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Sources & Integration Status

### 1. Current Model Status
```
Frontend Element          Data Source              Status   Update Method
─────────────────────────────────────────────────────────────────────────
Model Name/Version   -->  GET /api/models      --> ✅      Initial Load Only
Last Trained        -->  GET /api/models      --> ✅      Initial Load Only
Predictions Made    -->  GET /api/models      --> ✅      Initial Load Only
Status Indicator    -->  GET /api/models      --> ⚠️      Initial + model_deployed
```

### 2. Live Training Progress
```
Frontend Element          Data Source              Status   Update Method
─────────────────────────────────────────────────────────────────────────
Progress Bar        -->  training_progress WS  --> ✅      Real-time
Training Stage      -->  training_progress WS  --> ✅      Real-time
Training Details    -->  training_completed WS --> ✅      Real-time
```

### 3. Real-Time Metrics Grid
```
Frontend Element          Data Source              Status   Update Method
─────────────────────────────────────────────────────────────────────────
Current Accuracy    -->  GET /api/models      --> ❌      Initial Load Only*
                         (*Should be real-time)
                         
Predictions/Min     -->  Calculated Frontend   --> ❌      Approximated**
                         (**total_predictions / hours_since_created)
                         
System Health       -->  system_metrics WS    --> ✅      Real-time (5s)
```

## WebSocket Event Flow

```
Backend (every 5 seconds)                    Frontend Handlers
────────────────────────                    ─────────────────────
                                           
system_metrics ──────────────────────────> updateSystemMetrics()
  ├─ cpu_percent ────────────────────────> Updates CPU display ✅
  ├─ memory_percent ─────────────────────> Updates Memory display ✅
  ├─ disk_percent ───────────────────────> Updates Disk display ✅
  ├─ active_connections ─────────────────> Updates connection count ✅
  └─ system_health ──────────────────────> Updates health icon ✅
  
model_deployed (on deployment) ──────────> handleModelDeployed()
  ├─ model_name ─────────────────────────> Updates model display ✅
  ├─ model_version ──────────────────────> Updates version ✅
  └─ deployment_timestamp ───────────────> Updates "last trained" ✅

model_status_change ─────────────────────> handleModelStatusChange()
  └─ ❌ NEVER SENT BY BACKEND            Handler exists but unused

model_metrics_update ────────────────────> updateModelMetrics()
  └─ ❌ NEVER SENT BY BACKEND            Handler exists but unused
```

## Missing Data Flows

### What Should Happen (But Doesn't)

```
MISSING FLOW 1: Real-time Model Metrics
───────────────────────────────────────
Backend Should:
- Track each prediction made
- Calculate rolling accuracy
- Emit 'model_metrics_update' every 5-10 seconds

Expected Event:
{
  type: 'model_metrics_update',
  current_accuracy: 0.943,      // From last 100 predictions
  predictions_per_minute: 27,    // Actual rate calculation
  total_predictions: 1289,       // Running total
  model_health: 'healthy'        // Based on performance
}

MISSING FLOW 2: Model Status Changes
────────────────────────────────────
Backend Should:
- Monitor model health/status
- Emit 'model_status_change' when status changes

Expected Event:
{
  type: 'model_status_change',
  model_id: 'model_123',
  old_status: 'active',
  new_status: 'degraded',
  reason: 'Accuracy dropped below threshold'
}

MISSING FLOW 3: System Status Endpoint
──────────────────────────────────────
Backend Should Provide:
GET /api/monitoring/system
{
  active_model: { ... },
  system_status: { ... },
  real_time_metrics: {
    predictions_per_minute: 27,
    live_accuracy: 0.943,
    model_uptime: "2h 15m"
  }
}
```

## Summary

**Fully Integrated (Real-time)**: 
- ✅ System Health
- ✅ CPU/Memory/Disk Usage
- ✅ Training Progress

**Partially Integrated (Initial Load Only)**:
- ⚠️ Model Name/Version
- ⚠️ Last Trained Time
- ⚠️ Total Predictions

**Not Integrated (Static/Calculated)**:
- ❌ Live Accuracy (should be real-time)
- ❌ Predictions/Min (frontend approximation)
- ❌ Model Status Changes (no real-time updates)

The Live System Status section has the UI and handlers ready for full real-time integration, but the backend is only sending system resource metrics, not model performance metrics.