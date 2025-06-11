# Minimal WebSocket test server
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from typing import List
import asyncio
import psutil
import json
from datetime import datetime

app = FastAPI(title="WebSocket Test Server")

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"Client disconnected. Total connections: {len(self.active_connections)}")

manager = ConnectionManager()

@app.get("/")
async def get_dashboard():
    """Serve the main dashboard"""
    try:
        with open("static/index.html") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Dashboard not found</h1><p>Please ensure static files are properly set up.</p>", status_code=404)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time system monitoring"""
    await manager.connect(websocket)
    try:
        while True:
            # Send system metrics every 5 seconds
            await asyncio.sleep(5)
            
            # Collect system metrics
            cpu_percent = psutil.cpu_percent(interval=None)
            memory_info = psutil.virtual_memory()
            disk_info = psutil.disk_usage('/')
            
            # Prepare metrics data
            metrics = {
                "type": "system_metrics",
                "timestamp": datetime.now().isoformat(),
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory_info.percent, 1),
                "disk_percent": round((disk_info.used / disk_info.total) * 100, 1),
                "active_connections": len(manager.active_connections),
                "total_models": 0,  # Simplified for test
                "active_training_jobs": 0  # Simplified for test
            }
            
            print(f"Sending metrics: CPU: {metrics['cpu_percent']}%, Memory: {metrics['memory_percent']}%, Connections: {metrics['active_connections']}")
            
            # Send metrics to this specific connection
            await websocket.send_json(metrics)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("WebSocket client disconnected normally")
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    print("Starting WebSocket test server...")
    print("Visit http://localhost:8000 to test WebSocket connectivity")
    print("Check browser console for WebSocket messages")
    uvicorn.run(app, host="0.0.0.0", port=8000)