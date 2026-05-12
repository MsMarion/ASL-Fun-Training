import asyncio
import json
import logging
import random
import time
import struct
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MockAPI")

app = FastAPI(
    title="ASL Mock API",
    description="Mock server for testing ASL frontend integration",
    version="0.1.0"
)

# CORS (Allow all for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock Data
SIGNS = ["A", "B", "C", "D", "E", "F", "HELLO", "WORLD", "THANK YOU", "ILOVE YOU"]

class SignPrediction(BaseModel):
    letter: str
    confidence: float
    timestamp: float
    clientTimestamp: float
    handDetected: bool

@app.on_event("startup")
async def startup_event():
    logger.info("Mock API Server Started")

@app.get("/")
async def root():
    return {"message": "Hello from ASL Mock API"}

@app.post("/predict_frame")
async def predict_frame(file: UploadFile = File(...), client_timestamp: float = 0.0):
    # Simulate processing
    await asyncio.sleep(0.05)
    
    # Mock prediction logic
    hand_detected = True # Force detection for debugging
    prediction = SignPrediction(
        letter="A", # Force letter A
        confidence=0.95,
        timestamp=time.time(),
        clientTimestamp=client_timestamp,
        handDetected=hand_detected
    )
    return prediction

@app.websocket("/ws/predict")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket connection accepted")
    
    # Send "ready" control message
    await websocket.send_text(json.dumps({
        "type": "ready",
        "modelVersion": "mock-v1"
    }))

    try:
        while True:
            # Receive message (binary)
            # Frontend sends: [8 bytes float64 timestamp] + [JPEG bytes]
            data = await websocket.receive_bytes()
            
            # Parse timestamp (first 8 bytes)
            if len(data) >= 8:
                client_timestamp = struct.unpack('<d', data[:8])[0]
                image_size = len(data) - 8
                # logger.info(f"Received frame: {image_size} bytes, TS: {client_timestamp}")
                
                # Simulate processing delay
                await asyncio.sleep(0.05) # 50ms inference time

                # Generate mock prediction
                # 80% chance of hand detection
                hand_detected = random.random() > 0.2
                
                prediction = SignPrediction(
                    letter=random.choice(SIGNS) if hand_detected else "None",
                    confidence=random.uniform(0.7, 0.99) if hand_detected else 0.0,
                    timestamp=time.time(),
                    clientTimestamp=client_timestamp,
                    handDetected=hand_detected
                )
                
                # Send response (JSON bytes)
                response_json = prediction.model_dump_json()
                await websocket.send_bytes(response_json.encode('utf-8'))
                
            else:
                logger.warning("Received data too short")

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        # Try to send error message if still connected
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": str(e)
            }))
        except:
            pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4001)
