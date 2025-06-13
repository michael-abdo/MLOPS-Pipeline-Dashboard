# Legacy DOM Elements Documentation

## Elements Updated by Legacy Code

### 1. updateCurrentModelDisplay() - Lines 419-471

#### Direct DOM Manipulations:
- **`.card strong`** (querySelector)
  - Updates: `textContent` with model name and version
  - Current: Plain text overwrite
  - Should be: Structured component update

- **`.card p`** (querySelector)  
  - Updates: `innerHTML` with model description
  - Current: Raw HTML insertion
  - Should be: Structured component with data attributes

- **`#liveAccuracy`** (getElementById) ⚠️ CRITICAL
  - Updates: `textContent` with accuracy percentage
  - Current: DESTROYS component structure
  - Should be: `Metric.update('liveAccuracy', value, {format: 'percent'})`

- **`#livePredictions`** (getElementById) ⚠️ CRITICAL
  - Updates: `textContent` with predictions/min
  - Current: DESTROYS component structure  
  - Should be: `Metric.update('livePredictions', value)`

- **`#modelPredictionCount`** (in innerHTML)
  - Updates: Part of innerHTML template
  - Current: Embedded in description
  - Should be: Separate updatable element

### 2. updateModelPerformanceSection() - Lines 488-618

#### Direct DOM Manipulations:
- **`#trainingDuration`** (getElementById)
  - Updates: `textContent` with duration

- **`#avgResponseTime`** (getElementById)
  - Updates: `textContent` with response time

- **`#apiCallsToday`** (getElementById)
  - Updates: `textContent` with API calls

- **`#totalPredictions`** (getElementById)
  - Updates: `textContent` with total predictions

- **`#predictionAccuracy`** (getElementById)
  - Updates: `textContent` with accuracy

- **`#dataUtilization`** (getElementById)
  - Updates: `textContent` with utilization

- **`#modelStatus`** (getElementById)
  - Updates: `textContent` and `className` for status badge

- **`#modelDrift`** (getElementById)
  - Updates: `textContent` with drift percentage

- **Multiple chart updates** using Chart.js directly

### 3. updateSystemStatusDisplay() - Lines 620-698

#### Direct DOM Manipulations:
- **`#systemHealth`** (getElementById) ⚠️ CRITICAL
  - Updates: `textContent` with emoji status
  - Current: DESTROYS component structure
  - Should be: `Metric.update('systemHealth', value)`

- **`#totalPredictions`** (getElementById)
  - Updates: `textContent` with prediction count

- **`#systemStatusText`** (getElementById)
  - Updates: `textContent` and `style.color`

- **`#systemStatusIcon`** (getElementById)
  - Updates: `textContent` with status emoji

- **`.status-indicator`** (querySelector)
  - Updates: `className` for status styling

- **`.status-dot`** (querySelector)
  - Updates: Through parent class changes

### 4. updateSystemMetrics() - Lines 1347-1646

#### WebSocket Handler DOM Updates:
- **`#cpuPercent`** - Uses `Metric.update()` ✅
- **`#memoryPercent`** - Uses `Metric.update()` ✅
- **`#diskPercent`** - Uses `Metric.update()` ✅
- **`#activeConnections`** - Direct `textContent`
- **`#averageLatency`** - Direct `textContent`
- **`#apiResponseTime`** - Direct `textContent`
- **`#wsResponseTime`** - Direct `textContent`
- **`#totalModels`** - Direct `textContent`
- **`#queueJobs`** - Direct `textContent`
- **`#liveAccuracy`** - Mixed (both Metric.update and direct) ⚠️
- **`#livePredictions`** - Direct manipulation ⚠️
- **`#systemHealth`** - Direct `textContent` ⚠️

## Critical Conflicts

### Primary Issue: Live System Status Cards
The three main metric cards are created properly by `renderDynamicCards()` but then destroyed by:
1. `updateCurrentModelDisplay()` - Sets `textContent` on structured components
2. `updateSystemMetrics()` - Inconsistent update methods
3. `updateSystemStatusDisplay()` - Direct DOM manipulation

### Timing Sequence:
1. **T+0ms**: `renderDynamicCards()` creates proper structure
2. **T+100ms**: `loadInitialData()` starts
3. **T+200ms**: `updateCurrentModelDisplay()` DESTROYS structure
4. **T+300ms**: WebSocket updates try to use broken structure

## Required Mappings

### Legacy → Component API
```
element.textContent = value → Metric.update(id, value)
element.innerHTML = html → Component creation/update
element.className = class → Component state update
element.style.prop = value → Component styling API
```

### Elements Needing Component Wrappers
1. Model info display (name, description, stats)
2. System status indicator (dot, text, color)
3. Performance metrics grid
4. All chart containers