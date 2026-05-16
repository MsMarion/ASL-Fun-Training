import asyncio
import time
import json
import websockets
import random

# Generate mock 21 landmarks
def generate_mock_landmarks():
    return [{"x": random.uniform(0.1, 0.9), "y": random.uniform(0.1, 0.9), "z": random.uniform(-0.1, 0.1)} for _ in range(21)]

async def simulate_player(player_id, uri):
    try:
        async with websockets.connect(uri) as websocket:
            # Wait for ready message
            msg = await websocket.recv()
            print(f"[Player {player_id}] Connected: {json.loads(msg)['message']}")
            
            for i in range(100): # 100 frames (~3.3 seconds)
                now = time.time()
                payload = {
                    "clientTimestamp": now,
                    "handDetected": True,
                    "landmarks": generate_mock_landmarks()
                }
                await websocket.send(json.dumps(payload))
                
                # Await prediction (One-in-Flight)
                response = await websocket.recv()
                data = json.loads(response)
                
                latency = (time.time() - data['clientTimestamp']) * 1000
                if i % 25 == 0:
                    print(f"[Player {player_id}] Frame {i}: Detected {data['letter']} ({data['confidence']:.2f}) | Latency: {latency:.1f}ms")
                
                await asyncio.sleep(0.033) # 30 FPS
                
    except Exception as e:
        print(f"[Player {player_id}] Error: {e}")

async def main():
    uri = "ws://localhost:4001/ws/predict"
    print(f"Starting Concurrency Load Test with 10 Simultaneous Players connecting to {uri}...")
    
    tasks = [simulate_player(i, uri) for i in range(10)]
    await asyncio.gather(*tasks)
    print("Load Test Completed Successfully!")

if __name__ == "__main__":
    asyncio.run(main())
