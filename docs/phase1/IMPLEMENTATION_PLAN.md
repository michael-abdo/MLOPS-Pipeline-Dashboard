# Real-Time Monitoring Implementation Plan

## Phase 1: WebSocket Foundation (Week 1)

### Add WebSocket Infrastructure
- Add psutil==5.9.6 to requirements.txt
- Create ConnectionManager class in backend/backend_api.py after line 38
  - Add active_connections list
  - Add connect() method
  - Add disconnect() method
  - Add broadcast_json() method
- Add WebSocket endpoint /ws in backend/backend_api.py after line 448
  - Accept WebSocket connection
  - Send system metrics every 5 seconds
  - Handle disconnections
- Test basic WebSocket connectivity

### Frontend WebSocket Client
- Add WebSocket initialization to static/index.html after line 577
  - Create websocket variable
  - Add initWebSocket() function
  - Connect to ws://localhost:8000/ws
- Implement message handling
  - Add onmessage handler for system_metrics
  - Add updateSystemMetrics() function
- Add reconnection logic
  - Add onclose handler
  - Implement 5-second reconnect delay
- Initialize WebSocket on page load
  - Add initWebSocket() call to DOMContentLoaded
- Test real-time connectivity

## Phase 2: System Monitoring Dashboard (Week 2)

### Add System Metrics Display
- Create system metrics card in static/index.html after line 530
  - Add "System Performance" section
  - Add CPU usage metric display
  - Add memory usage metric display
  - Add active connections metric display
- Update WebSocket backend to send detailed metrics
  - Add CPU percentage using psutil.cpu_percent()
  - Add memory percentage using psutil.virtual_memory().percent
  - Add timestamp to metrics
- Implement visual health indicators
  - Add color coding for metrics (green/yellow/red)
  - Add status indicators based on thresholds
- Test real-time metrics updates

### Enhanced System Monitoring
- Add disk usage monitoring
  - Extend WebSocket metrics with disk_percent
  - Add disk usage display to frontend
- Add connection count tracking
  - Track active WebSocket connections
  - Display connection count in metrics
- Add system status indicators
  - Implement health status logic
  - Add visual status indicators to dashboard

## Phase 3: Real-Time Progress Streaming (Week 3)

### Training Progress Broadcasting
- Modify train_model_background() function in backend/backend_api.py
  - Add WebSocket broadcasting for progress updates
  - Send training_progress messages with job_id and progress
  - Add detailed training stage messages
  - Broadcast training completion and errors
- Update training job status storage
  - Enhance training_jobs dictionary with real-time data
  - Add current stage tracking
  - Add estimated time remaining

### Frontend Progress Integration
- Replace polling with WebSocket listeners in static/index.html
  - Add training_progress message handler
  - Remove pollTrainingStatus() intervals when WebSocket connected
  - Update progress display in real-time
- Implement fallback to polling
  - Keep HTTP polling as backup
  - Gracefully handle WebSocket disconnections
- Add detailed training stages display
  - Show current training stage
  - Display estimated time remaining
  - Show live accuracy updates

### Real-Time Activity Feed
- Broadcast activity updates via WebSocket
  - Modify addActivityLog() to broadcast new activities
  - Send activity_update messages to all connections
- Update frontend activity display
  - Add activity_update message handler
  - Update activity feed in real-time without page refresh
- Add system event notifications
  - Broadcast system health changes
  - Send prediction volume updates
  - Notify on model deployments

## Phase 4: Polish & Testing (Week 4)

### Error Handling & Resilience
- Add comprehensive WebSocket error handling
  - Handle connection timeouts
  - Implement exponential backoff for reconnections
  - Add connection status indicators
- Enhance fallback mechanisms
  - Seamless fallback to HTTP polling
  - Graceful degradation when WebSocket unavailable
- Add connection health monitoring
  - Ping/pong heartbeat implementation
  - Connection quality indicators

### Performance Optimization
- Optimize WebSocket message frequency
  - Rate limit system metrics to 5-second intervals
  - Batch multiple updates into single messages
  - Implement message prioritization
- Memory usage optimization
  - Limit connection history
  - Clean up disconnected clients
  - Optimize psutil call frequency

### Testing & Documentation
- Update automation tests
  - Add WebSocket connectivity tests
  - Test real-time feature functionality
  - Verify fallback mechanisms
- Update documentation
  - Add WebSocket API documentation to docs/API.md
  - Update troubleshooting guide
  - Add real-time features to README.md
- Performance testing
  - Test with multiple connections
  - Verify system metrics accuracy
  - Test reconnection scenarios

## Implementation Notes

### Dependencies Required
- psutil==5.9.6 (for system metrics)
- No additional frontend dependencies (uses native WebSocket API)

### Files to Modify
- requirements.txt (add psutil)
- backend/backend_api.py (WebSocket endpoint and broadcasting)
- static/index.html (WebSocket client and real-time UI)

### Key Integration Points
- WebSocket endpoint: /ws in backend/backend_api.py after line 448
- Frontend WebSocket client: static/index.html after line 577
- System metrics display: static/index.html after line 530
- Training progress: Modify train_model_background() function

### Success Criteria
- WebSocket connection established and stable
- Real-time system metrics displaying correctly
- Training progress streams without polling
- Activity feed updates in real-time
- Fallback to HTTP polling when needed
- No disruption to existing functionality