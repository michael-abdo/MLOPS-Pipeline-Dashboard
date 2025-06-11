# Simple WebSocket client test
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws"
    print(f"Connecting to {uri}")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connected successfully!")
            
            # Listen for messages for 30 seconds
            for i in range(6):  # 6 * 5 seconds = 30 seconds
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    data = json.loads(message)
                    print(f"📊 Received metrics: CPU: {data['cpu_percent']}%, Memory: {data['memory_percent']}%, Connections: {data['active_connections']}")
                except asyncio.TimeoutError:
                    print("⏰ Timeout waiting for message")
                    break
                except Exception as e:
                    print(f"❌ Error receiving message: {e}")
                    break
                    
    except Exception as e:
        print(f"❌ Failed to connect: {e}")

if __name__ == "__main__":
    print("🧪 Testing WebSocket connection...")
    asyncio.run(test_websocket())