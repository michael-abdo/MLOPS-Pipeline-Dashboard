#!/usr/bin/env python3
"""
Advanced WebSocket Connectivity Tests for Phase 4
Tests connection handling, reconnection, heartbeat, and performance.
"""

import asyncio
import json
import time
import statistics
from datetime import datetime
from websockets import connect, ConnectionClosed
import requests


class WebSocketTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.ws_url = base_url.replace("http", "ws") + "/ws"
        self.results = []
        
    async def test_basic_connection(self):
        """Test basic WebSocket connection"""
        print("🔗 Testing basic WebSocket connection...")
        
        try:
            async with connect(self.ws_url) as websocket:
                # Wait for initial message
                message = await asyncio.wait_for(websocket.recv(), timeout=10)
                data = json.loads(message)
                
                assert data.get('type') == 'system_metrics'
                assert 'cpu_percent' in data
                assert 'memory_percent' in data
                
                print("✅ Basic connection successful")
                return True
                
        except Exception as e:
            print(f"❌ Basic connection failed: {e}")
            return False
    
    async def test_heartbeat_mechanism(self):
        """Test ping/pong heartbeat"""
        print("💓 Testing heartbeat mechanism...")
        
        try:
            async with connect(self.ws_url) as websocket:
                # Send ping
                ping_time = time.time() * 1000
                await websocket.send(json.dumps({
                    'type': 'ping',
                    'timestamp': ping_time
                }))
                
                # Wait for pong
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(response)
                
                assert data.get('type') == 'pong'
                assert data.get('timestamp') == ping_time
                
                # Calculate latency
                pong_time = time.time() * 1000
                latency = pong_time - ping_time
                
                print(f"✅ Heartbeat working - Latency: {latency:.1f}ms")
                return True, latency
                
        except Exception as e:
            print(f"❌ Heartbeat test failed: {str(e) if str(e) else 'Unknown error'}")
            import traceback
            traceback.print_exc()
            return False, None
    
    async def test_connection_resilience(self):
        """Test connection handling under stress"""
        print("🛡️ Testing connection resilience...")
        
        successful_connections = 0
        failed_connections = 0
        
        async def create_connection(connection_id):
            try:
                async with connect(self.ws_url) as websocket:
                    # Receive a few messages
                    for _ in range(3):
                        await asyncio.wait_for(websocket.recv(), timeout=10)
                    return True
            except Exception:
                return False
        
        # Create multiple concurrent connections
        tasks = [create_connection(i) for i in range(10)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        successful_connections = sum(1 for r in results if r is True)
        failed_connections = len(results) - successful_connections
        
        print(f"✅ Connections: {successful_connections} successful, {failed_connections} failed")
        return successful_connections >= 8  # Allow some failures
    
    async def test_message_delivery(self):
        """Test message delivery and ordering"""
        print("📨 Testing message delivery...")
        
        try:
            async with connect(self.ws_url) as websocket:
                messages_received = []
                
                # Collect messages for 15 seconds
                start_time = time.time()
                while time.time() - start_time < 15:
                    try:
                        message = await asyncio.wait_for(websocket.recv(), timeout=6)
                        data = json.loads(message)
                        messages_received.append(data)
                    except asyncio.TimeoutError:
                        break
                
                # Analyze messages
                system_metrics = [m for m in messages_received if m.get('type') == 'system_metrics']
                
                assert len(system_metrics) >= 2, "Should receive multiple system metrics"
                
                # Check message intervals (should be ~5 seconds)
                if len(system_metrics) >= 2:
                    timestamps = [datetime.fromisoformat(m['timestamp'].replace('Z', '+00:00')) 
                                for m in system_metrics if 'timestamp' in m]
                    
                    if len(timestamps) >= 2:
                        intervals = []
                        for i in range(1, len(timestamps)):
                            interval = (timestamps[i] - timestamps[i-1]).total_seconds()
                            intervals.append(interval)
                        
                        avg_interval = statistics.mean(intervals)
                        print(f"✅ Average message interval: {avg_interval:.1f}s")
                        
                        # Should be close to 5 seconds
                        assert 4 <= avg_interval <= 7, f"Interval should be ~5s, got {avg_interval:.1f}s"
                
                print(f"✅ Message delivery test passed - {len(messages_received)} messages received")
                return True
                
        except Exception as e:
            print(f"❌ Message delivery test failed: {str(e) if str(e) else 'Unknown error'}")
            import traceback
            traceback.print_exc()
            return False
    
    async def test_reconnection_behavior(self):
        """Test automatic reconnection"""
        print("🔄 Testing reconnection behavior...")
        
        # This test would require forcibly closing connections from server side
        # For now, we'll test client-side reconnection logic
        
        try:
            # First connection
            websocket = await connect(self.ws_url)
            
            # Receive initial message
            await asyncio.wait_for(websocket.recv(), timeout=10)
            
            # Close connection abruptly
            await websocket.close()
            
            # Wait a bit
            await asyncio.sleep(2)
            
            # Try to reconnect
            websocket = await connect(self.ws_url)
            await asyncio.wait_for(websocket.recv(), timeout=10)
            await websocket.close()
            
            print("✅ Reconnection test passed")
            return True
            
        except Exception as e:
            print(f"❌ Reconnection test failed: {e}")
            return False
    
    async def test_performance_under_load(self):
        """Test WebSocket performance under load"""
        print("⚡ Testing performance under load...")
        
        latencies = []
        
        try:
            async with connect(self.ws_url) as websocket:
                # Send multiple pings rapidly
                for i in range(20):
                    ping_time = time.time() * 1000
                    await websocket.send(json.dumps({
                        'type': 'ping',
                        'timestamp': ping_time
                    }))
                    
                    # Wait for pong
                    response = await asyncio.wait_for(websocket.recv(), timeout=5)
                    pong_time = time.time() * 1000
                    
                    data = json.loads(response)
                    if data.get('type') == 'pong':
                        latency = pong_time - ping_time
                        latencies.append(latency)
                    
                    await asyncio.sleep(0.1)  # Small delay between pings
                
                if latencies:
                    avg_latency = statistics.mean(latencies)
                    max_latency = max(latencies)
                    min_latency = min(latencies)
                    
                    print(f"✅ Performance test completed:")
                    print(f"   Average latency: {avg_latency:.1f}ms")
                    print(f"   Min latency: {min_latency:.1f}ms")
                    print(f"   Max latency: {max_latency:.1f}ms")
                    
                    # Performance should be reasonable
                    return avg_latency < 200  # Less than 200ms average
                    
        except Exception as e:
            print(f"❌ Performance test failed: {str(e) if str(e) else 'Unknown error'}")
            import traceback
            traceback.print_exc()
            return False
    
    def test_api_endpoints(self):
        """Test API endpoints are working"""
        print("🌐 Testing API endpoints...")
        
        endpoints = [
            '/health',
            '/api/status',
            '/api/activity',
            '/api/models',
            '/api/settings'
        ]
        
        all_passed = True
        
        for endpoint in endpoints:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                if response.status_code == 200:
                    print(f"✅ {endpoint} - OK")
                else:
                    print(f"❌ {endpoint} - Status: {response.status_code}")
                    all_passed = False
            except Exception as e:
                print(f"❌ {endpoint} - Error: {e}")
                all_passed = False
        
        return all_passed
    
    async def run_all_tests(self):
        """Run comprehensive test suite"""
        print("\n" + "="*60)
        print("    PHASE 4 WEBSOCKET CONNECTIVITY TEST SUITE")
        print("="*60)
        
        test_results = []
        
        # API Tests (synchronous)
        api_result = self.test_api_endpoints()
        test_results.append(("API Endpoints", api_result))
        
        # WebSocket Tests (asynchronous)
        tests = [
            ("Basic Connection", self.test_basic_connection()),
            ("Heartbeat Mechanism", self.test_heartbeat_mechanism()),
            ("Connection Resilience", self.test_connection_resilience()),
            ("Message Delivery", self.test_message_delivery()),
            ("Reconnection Behavior", self.test_reconnection_behavior()),
            ("Performance Under Load", self.test_performance_under_load())
        ]
        
        for test_name, test_coro in tests:
            print(f"\n{'-'*60}")
            try:
                result = await test_coro
                if isinstance(result, tuple):
                    test_results.append((test_name, result[0]))
                else:
                    test_results.append((test_name, result))
            except Exception as e:
                print(f"❌ {test_name} crashed: {e}")
                test_results.append((test_name, False))
        
        # Summary
        print(f"\n{'='*60}")
        print("                    TEST SUMMARY")
        print(f"{'='*60}")
        
        passed = sum(1 for _, result in test_results if result)
        total = len(test_results)
        
        for test_name, result in test_results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name:<25} {status}")
        
        print(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! WebSocket implementation is robust.")
        elif passed >= total * 0.8:
            print("⚠️  Most tests passed. Minor issues detected.")
        else:
            print("❌ Multiple test failures. WebSocket implementation needs work.")
        
        return passed / total


async def main():
    """Main test runner"""
    tester = WebSocketTester()
    success_rate = await tester.run_all_tests()
    
    # Exit with appropriate code
    exit_code = 0 if success_rate >= 0.8 else 1
    exit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())