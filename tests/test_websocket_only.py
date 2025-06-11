# Test just the WebSocket parts of backend_api.py without ML dependencies
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from typing import List
import asyncio
import psutil
from datetime import datetime

app = FastAPI(title="WebSocket Test")

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Simple storage for testing
models_store = {}
training_jobs = {}

# WebSocket Connection Manager (from our implementation)
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast_json(self, data: dict):
        """Broadcast JSON data to all connected clients"""
        for connection in self.active_connections[:]:
            try:
                await connection.send_json(data)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@app.get("/")
async def get_dashboard():
    try:
        with open("static/index.html") as f:
            html_content = f.read()
        return HTMLResponse(content=html_content)
    except FileNotFoundError:
        return HTMLResponse(content="<h1>Dashboard not found</h1>", status_code=404)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time system monitoring and updates"""
    await manager.connect(websocket)
    print(f"✅ WebSocket client connected. Total: {len(manager.active_connections)}")
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
                "total_models": len(models_store),
                "active_training_jobs": len([j for j in training_jobs.values() if j.get("status") == "training"])
            }
            
            print(f"📊 Broadcasting: CPU: {metrics['cpu_percent']}%, Memory: {metrics['memory_percent']}%, Clients: {metrics['active_connections']}")
            
            # Send metrics to this specific connection
            await websocket.send_json(metrics)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print(f"❌ WebSocket client disconnected. Remaining: {len(manager.active_connections)}")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting WebSocket-only test server...")
    print("📡 WebSocket endpoint: ws://localhost:8000/ws")
    print("🌐 Dashboard: http://localhost:8000")
    print("🔍 Check browser console for WebSocket messages")
    uvicorn.run(app, host="0.0.0.0", port=8000)