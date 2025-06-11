# Phase 2: Test Script Development - CSV Complexity Testing

## Overview
Develop automated testing framework to sequentially process complexity-graded CSV datasets while monitoring and comparing real system metrics.

## Test Script Architecture

### Core Testing Framework (`test_complexity_monitoring.py`)
**Location**: `tests/test_complexity_monitoring.py`

**Primary Functions**:
1. **Baseline Capture**: Record system state at rest
2. **Sequential Processing**: Upload and train each complexity level
3. **Metric Monitoring**: Real-time WebSocket metric capture during training
4. **Performance Comparison**: Analyze metric differences across complexities
5. **Report Generation**: Document findings and prove monitoring authenticity

### Test Script Structure
```python
# Main test orchestration
def test_complexity_monitoring():
    baseline_metrics = capture_system_baseline()
    
    datasets = [
        ('Simple', 'test_simple.csv'),
        ('Medium', 'test_medium.csv'), 
        ('Complex', 'test_complex.csv')
    ]
    
    results = {}
    for name, dataset in datasets:
        result = test_single_complexity(name, dataset)
        results[name] = result
        
    generate_comparison_report(results)
```

### Key Testing Components

#### 1. System Metric Capture
```python
def capture_system_metrics():
    return {
        'timestamp': datetime.now().isoformat(),
        'cpu_percent': psutil.cpu_percent(interval=1),
        'memory_percent': psutil.virtual_memory().percent,
        'memory_used_mb': psutil.virtual_memory().used // 1024 // 1024,
        'disk_percent': psutil.disk_usage('/').used / psutil.disk_usage('/').total * 100,
        'process_count': len(psutil.pids()),
        'active_connections': get_websocket_connection_count()
    }
```

#### 2. WebSocket Monitoring Integration
```python
async def monitor_websocket_during_training(job_id):
    metrics_captured = []
    
    async with websockets.connect('ws://localhost:8000/ws') as websocket:
        while True:
            message = await websocket.recv()
            data = json.loads(message)
            
            if data.get('type') == 'system_metrics':
                metrics_captured.append({
                    'timestamp': data.get('timestamp'),
                    'cpu_percent': data.get('cpu_percent'),
                    'memory_percent': data.get('memory_percent'),
                    'active_connections': data.get('active_connections')
                })
                
            if data.get('type') == 'training_completed':
                break
                
    return metrics_captured
```

#### 3. Training Pipeline Integration
```python
def test_single_complexity(name, dataset_filename):
    print(f"\n🧪 Testing {name} Complexity Dataset")
    
    # Capture pre-training state
    pre_metrics = capture_system_metrics()
    
    # Upload dataset
    upload_start = time.time()
    upload_result = upload_csv_file(dataset_filename)
    upload_duration = time.time() - upload_start
    
    # Start training with monitoring
    training_start = time.time()
    job_id = start_training(upload_result['file_path'])
    
    # Monitor WebSocket metrics during training
    websocket_metrics = monitor_websocket_during_training(job_id)
    
    # Wait for completion and capture final state
    training_result = wait_for_training_completion(job_id)
    training_duration = time.time() - training_start
    post_metrics = capture_system_metrics()
    
    return {
        'dataset': name,
        'filename': dataset_filename,
        'pre_metrics': pre_metrics,
        'post_metrics': post_metrics,
        'websocket_metrics': websocket_metrics,
        'upload_duration': upload_duration,
        'training_duration': training_duration,
        'training_result': training_result
    }
```

## Monitoring Validation Points

### 1. CPU Usage Validation
- **Baseline Recording**: System CPU at rest
- **Training Peak**: Maximum CPU during model training
- **Progression Verification**: Simple < Medium < Complex CPU usage

### 2. Memory Consumption Analysis
- **Memory Baseline**: RAM usage before processing
- **Peak Memory**: Maximum memory allocation during training
- **Memory Scaling**: Verify linear correlation with dataset size

### 3. Training Performance Metrics
- **Duration Tracking**: Processing time for each complexity level
- **Accuracy Comparison**: Model performance across datasets
- **Resource Efficiency**: CPU-time and memory-time products

### 4. WebSocket Real-time Accuracy
- **Metric Correlation**: WebSocket broadcasts match psutil readings
- **Latency Impact**: Connection quality under different system loads
- **Broadcasting Reliability**: Consistent metric delivery during high load

## Test Execution Strategy

### Sequential Test Process
1. **System Baseline**: Capture clean system state
2. **Simple Test**: Process minimal dataset, record all metrics
3. **Cooldown Period**: Allow system to return to baseline
4. **Medium Test**: Process moderate dataset, compare to simple
5. **Cooldown Period**: System reset
6. **Complex Test**: Process heavy dataset, compare to previous levels
7. **Final Analysis**: Generate comprehensive comparison report

### Cooldown Management
```python
def wait_for_system_cooldown():
    """Wait for system to return to baseline after training"""
    baseline_cpu = capture_baseline_cpu()
    
    while True:
        current_cpu = psutil.cpu_percent(interval=1)
        if current_cpu <= baseline_cpu + 5:  # Within 5% of baseline
            break
        time.sleep(5)
        print(f"Cooling down... CPU: {current_cpu}%")
```

## Expected Test Results

### Performance Progression
- **Simple → Medium**: 3-5x CPU increase, 2-3x memory usage
- **Medium → Complex**: 2-3x CPU increase, 2x memory usage  
- **Training Time**: Exponential scaling with dataset complexity

### WebSocket Validation
- **Real-time Accuracy**: Broadcast metrics match actual system state
- **Load Impact**: Connection quality degrades appropriately under load
- **Recovery**: System returns to baseline after training completion

## Success Criteria
- ✅ **Automated Testing**: Script runs all complexity levels without intervention
- ✅ **Metric Capture**: Comprehensive system monitoring throughout process
- ✅ **WebSocket Validation**: Real-time broadcasts proven accurate
- ✅ **Performance Scaling**: Clear correlation between complexity and resource usage
- ✅ **Authenticity Proof**: Demonstrate monitoring reflects real workload

## Deliverables
- `test_complexity_monitoring.py` - Complete automated testing framework
- Metric capture and comparison logic
- WebSocket monitoring integration
- Comprehensive reporting functionality
- Cooldown and cleanup management

**Next Phase**: Execution & Validation - Run tests and analyze results