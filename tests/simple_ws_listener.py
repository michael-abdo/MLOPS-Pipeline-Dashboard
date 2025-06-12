#!/usr/bin/env python3
"""Simple WebSocket listener to verify events"""

import asyncio
import json
import websockets

async def listen():
    uri = "ws://localhost:8000/ws"
    events = []
    
    async with websockets.connect(uri) as websocket:
        print("✅ Connected to WebSocket")
        print("🎧 Listening for events (press Ctrl+C to stop)...\n")
        
        try:
            while True:
                message = await websocket.recv()
                data = json.loads(message)
                event_type = data.get('type', 'unknown')
                
                # Skip noisy events
                if event_type not in ['system_metrics', 'chart_data', 'integration_status']:
                    events.append(event_type)
                    print(f"📥 {event_type}")
                    
                    # Show details for key events
                    if 'pipeline' in event_type:
                        print(f"   Pipeline: {data.get('pipeline_id', 'N/A')}")
                        print(f"   Status: {data.get('status', 'N/A')}")
                    elif 'job' in event_type:
                        print(f"   Job: {data.get('job_id', 'N/A')}")
                        print(f"   Progress: {data.get('progress', 'N/A')}%")
                    elif event_type == 'upload_progress':
                        print(f"   File: {data.get('filename', 'N/A')}")
                        print(f"   Progress: {data.get('progress', 'N/A')}%")
                        
        except KeyboardInterrupt:
            print(f"\n\n📊 Summary: Received {len(events)} events")
            unique = list(set(events))
            print(f"Unique event types ({len(unique)}): {', '.join(unique)}")

if __name__ == "__main__":
    print("🚀 Simple WebSocket Event Listener")
    print("Make sure backend is running on http://localhost:8000")
    print("-" * 50)
    
    asyncio.run(listen())