#!/usr/bin/env python3
"""Test WebSocket events are properly broadcast"""

import asyncio
import json
import time
import websockets
import requests
from datetime import datetime

BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws"

class WebSocketEventTester:
    def __init__(self):
        self.events_received = []
        self.ws = None
        
    async def connect(self):
        """Connect to WebSocket"""
        self.ws = await websockets.connect(WS_URL)
        print(f"✅ Connected to WebSocket at {WS_URL}")
        
    async def listen(self):
        """Listen for WebSocket messages"""
        try:
            while True:
                message = await asyncio.wait_for(self.ws.recv(), timeout=1.0)
                data = json.loads(message)
                event_type = data.get('type', 'unknown')
                
                # Log event (skip noisy ones)
                if event_type not in ['system_metrics', 'chart_data', 'integration_status']:
                    self.events_received.append(event_type)
                    print(f"📥 Received: {event_type}")
                    
                    # Print event details for important ones
                    if event_type in ['pipeline_progress', 'pipeline_completed', 'pipeline_failed']:
                        print(f"   Details: {json.dumps(data, indent=2)}")
                        
        except asyncio.TimeoutError:
            pass
        except websockets.exceptions.ConnectionClosed:
            print("❌ WebSocket connection closed")
            
    async def test_pipeline_events(self):
        """Test pipeline WebSocket events"""
        print("\n🧪 Testing Pipeline Events...")
        
        # Create a pipeline
        pipeline_data = {
            "name": "Test Pipeline",
            "description": "Testing WebSocket events",
            "steps": [
                {"name": "Step 1", "type": "process"},
                {"name": "Step 2", "type": "transform"},
                {"name": "Step 3", "type": "output"}
            ]
        }
        
        response = requests.post(f"{BASE_URL}/api/pipelines", json=pipeline_data)
        if response.status_code == 200:
            pipeline = response.json()
            pipeline_id = pipeline['id']
            print(f"✅ Created pipeline: {pipeline_id}")
            
            # Wait a bit to catch pipeline_status event
            await asyncio.sleep(1)
            
            # Run the pipeline
            run_response = requests.post(f"{BASE_URL}/api/pipelines/{pipeline_id}/run")
            if run_response.status_code == 200:
                print("✅ Started pipeline execution")
                
                # Wait for pipeline to complete
                await asyncio.sleep(10)
                
    async def test_monitoring_events(self):
        """Test monitoring WebSocket events"""
        print("\n🧪 Testing Monitoring Events...")
        
        # Trigger monitoring events
        requests.get(f"{BASE_URL}/api/monitoring/services")
        print("✅ Triggered service_health")
        
        requests.get(f"{BASE_URL}/api/monitoring/metrics")
        print("✅ Triggered performance_metrics")
        
        # Trigger a system alert
        requests.post(f"{BASE_URL}/debug/create-alert", params={
            "title": "Test Alert",
            "message": "Testing WebSocket alerts",
            "priority": "high"
        })
        print("✅ Triggered system_alert")
        
        await asyncio.sleep(2)
        
    async def test_data_events(self):
        """Test data management WebSocket events"""
        print("\n🧪 Testing Data Management Events...")
        
        # Upload a dataset
        csv_content = "name,value\\ntest1,100\\ntest2,200\\n"
        files = {'file': ('test_data.csv', csv_content, 'text/csv')}
        
        response = requests.post(f"{BASE_URL}/api/datasets", files=files)
        if response.status_code == 200:
            dataset = response.json()
            dataset_id = dataset['id']
            print(f"✅ Uploaded dataset: {dataset_id}")
            
            # Trigger quality assessment
            requests.get(f"{BASE_URL}/api/datasets/{dataset_id}/statistics")
            print("✅ Triggered quality_assessment")
            
            # Create a processing job
            job_response = requests.post(f"{BASE_URL}/api/datasets/{dataset_id}/process")
            if job_response.status_code == 200:
                print("✅ Started data processing job")
                
        await asyncio.sleep(5)
        
    async def test_architecture_events(self):
        """Test architecture WebSocket events"""
        print("\n🧪 Testing Architecture Events...")
        
        # Trigger component health
        requests.get(f"{BASE_URL}/api/components/health")
        print("✅ Triggered component_health")
        
        # integration_status is triggered automatically by WebSocket
        
        await asyncio.sleep(2)
        
    async def run_all_tests(self):
        """Run all test methods"""
        await self.test_pipeline_events()
        await self.test_monitoring_events()
        await self.test_data_events()
        await self.test_architecture_events()
        
    async def run_tests(self):
        """Run all WebSocket event tests"""
        try:
            await self.connect()
            
            # Start listening in background
            listen_task = asyncio.create_task(self.listen())
            
            # Run all tests concurrently with listening
            test_task = asyncio.create_task(self.run_all_tests())
            
            # Keep listening for 30 seconds to catch all events
            await asyncio.sleep(30)
            
            # Cancel listener
            listen_task.cancel()
            
            # Close WebSocket
            await self.ws.close()
            
            # Print summary
            self.print_summary()
            
        except Exception as e:
            print(f"❌ Error: {e}")
            
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("📊 WebSocket Event Test Summary")
        print("="*50)
        
        expected_events = [
            'pipeline_status', 'pipeline_progress', 'pipeline_completed',
            'service_health', 'performance_metrics', 'system_alert',
            'upload_progress', 'dataset_processed', 'quality_assessment',
            'job_progress', 'job_completed', 'component_health'
        ]
        
        unique_events = list(set(self.events_received))
        
        print(f"\nTotal events received: {len(self.events_received)}")
        print(f"Unique event types: {len(unique_events)}")
        
        print("\nExpected Events Status:")
        for event in expected_events:
            if event in unique_events:
                count = self.events_received.count(event)
                print(f"  ✅ {event} ({count} times)")
            else:
                print(f"  ❌ {event} (not received)")
                
        print("\nAll received events:")
        for event in unique_events:
            count = self.events_received.count(event)
            print(f"  - {event} ({count} times)")

async def main():
    tester = WebSocketEventTester()
    await tester.run_tests()

if __name__ == "__main__":
    print("🚀 WebSocket Event Test Suite")
    print("Make sure the backend is running on http://localhost:8000")
    print("-" * 50)
    
    asyncio.run(main())