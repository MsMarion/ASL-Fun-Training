# ASL Fun Training - System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                          │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    Game UI (React)                        │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐  │ │
│  │  │ GameCanvas  │  │  Scoreboard  │  │  Note Highway   │  │ │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                              │                                  │
│  ┌───────────────────────────┼──────────────────────────────┐  │
│  │         Game Logic        │                              │  │
│  │  ┌────────────────────────▼─────────────────┐            │  │
│  │  │         useGameLoop                      │            │  │
│  │  │  - Manages game state                    │            │  │
│  │  │  - Evaluates note hits                   │            │  │
│  │  │  - Updates score/streak                  │            │  │
│  │  └────────────┬────────────────┬────────────┘            │  │
│  │               │                │                         │  │
│  │    ┌──────────▼──────────┐  ┌─▼───────────────┐         │  │
│  │    │   useSignDetection  │  │   useWebcam     │         │  │
│  │    │  - WebSocket client │  │  - Camera access│         │  │
│  │    │  - Frame streaming  │  │  - Frame capture│         │  │
│  │    └──────────┬──────────┘  └─┬───────────────┘         │  │
│  └───────────────┼────────────────┼─────────────────────────┘  │
└──────────────────┼────────────────┼────────────────────────────┘
                   │                │
                   │ WebSocket      │ getUserMedia()
                   │ (Binary)       │ (MediaStream)
                   │                │
        ┌──────────▼────────────────▼──────────┐
        │     Browser WebSocket API            │
        │     MediaDevices API                 │
        └──────────┬───────────────────────────┘
                   │
                   │ ws://localhost:8000/ws/predict
                   │ [timestamp][JPEG frame]
                   │
        ┌──────────▼───────────────────────────┐
        │   Python FastAPI Server (Port 8000)  │
        │                                      │
        │  ┌────────────────────────────────┐  │
        │  │  WebSocket Handler             │  │
        │  │  /ws/predict                   │  │
        │  │  - Receive frames              │  │
        │  │  - Parse timestamp + JPEG      │  │
        │  │  - Call predictor              │  │
        │  │  - Send JSON response          │  │
        │  └────────────┬───────────────────┘  │
        │               │                      │
        │  ┌────────────▼───────────────────┐  │
        │  │  ASLPredictor                  │  │
        │  │  ┌──────────────────────────┐  │  │
        │  │  │ 1. Decode JPEG           │  │  │
        │  │  │    (cv2.imdecode)        │  │  │
        │  │  └───────────┬──────────────┘  │  │
        │  │  ┌───────────▼──────────────┐  │  │
        │  │  │ 2. Hand Detection        │  │  │
        │  │  │    (MediaPipe Hands)     │  │  │
        │  │  │    - Detects 21 landmarks│  │  │
        │  │  └───────────┬──────────────┘  │  │
        │  │  ┌───────────▼──────────────┐  │  │
        │  │  │ 3. Feature Extraction    │  │  │
        │  │  │    - Draw landmarks      │  │  │
        │  │  │    - Create feature mask │  │  │
        │  │  │    - Mirror for symmetry │  │  │
        │  │  └───────────┬──────────────┘  │  │
        │  │  ┌───────────▼──────────────┐  │  │
        │  │  │ 4. Transform             │  │  │
        │  │  │    - Resize to 224x224   │  │  │
        │  │  │    - Normalize           │  │  │
        │  │  │    - ToTensor            │  │  │
        │  │  └───────────┬──────────────┘  │  │
        │  │  ┌───────────▼──────────────┐  │  │
        │  │  │ 5. CNN Inference         │  │  │
        │  │  │    (MobileNetV2)         │  │  │
        │  │  │    - Original input      │  │  │
        │  │  │    - Mirrored input      │  │  │
        │  │  │    - Max of both         │  │  │
        │  │  └───────────┬──────────────┘  │  │
        │  │  ┌───────────▼──────────────┐  │  │
        │  │  │ 6. Post-processing       │  │  │
        │  │  │    - Softmax             │  │  │
        │  │  │    - Confidence check    │  │  │
        │  │  │    - Index to letter     │  │  │
        │  │  └──────────────────────────┘  │  │
        │  └────────────────────────────────┘  │
        └──────────────────────────────────────┘
                   │
                   │ Return JSON prediction
                   │ {letter, confidence, timestamp, handDetected}
                   │
        ┌──────────▼───────────────────────────┐
        │         Browser receives             │
        │  - Updates predictions buffer        │
        │  - Game loop evaluates hits          │
        │  - UI shows feedback                 │
        └──────────────────────────────────────┘
```

## Data Flow

### Frame Capture → Prediction (End to End)

```
┌─────────────┐
│ 1. Webcam   │  Browser MediaDevices API
│   Capture   │  - getUserMedia()
└──────┬──────┘  - 640x480 or higher
       │
       ▼
┌─────────────┐
│ 2. Frame    │  Canvas API
│   Encode    │  - drawImage()
└──────┬──────┘  - toBlob('image/jpeg', 0.8)
       │
       ▼
┌─────────────┐
│ 3. Add      │  JavaScript
│  Timestamp  │  - performance.now() / 1000
└──────┬──────┘  - Float64LE encoding
       │
       ▼
┌─────────────┐
│ 4. WebSocket│  WebSocket.send()
│    Send     │  - Binary message
└──────┬──────┘  - [8 bytes][JPEG bytes]
       │
       │ Network (localhost ~1ms)
       │
       ▼
┌─────────────┐
│ 5. Server   │  FastAPI WebSocket
│   Receive   │  - await websocket.receive_bytes()
└──────┬──────┘  - Parse timestamp + frame
       │
       ▼
┌─────────────┐
│ 6. JPEG     │  OpenCV
│   Decode    │  - cv2.imdecode()
└──────┬──────┘  - BGR numpy array
       │
       ▼
┌─────────────┐
│ 7. Hand     │  MediaPipe (~5-10ms)
│  Detection  │  - process(RGB)
└──────┬──────┘  - 21 hand landmarks
       │
       ▼
┌─────────────┐
│ 8. Feature  │  Custom drawing
│ Extraction  │  - Draw landmarks/connections
└──────┬──────┘  - Create mask image
       │
       ▼
┌─────────────┐
│ 9. CNN      │  PyTorch (~10-20ms CPU)
│ Inference   │  - MobileNetV2
└──────┬──────┘  - 26 class outputs (A-Z)
       │
       ▼
┌─────────────┐
│10. Format   │  JSON encoding
│  Response   │  - letter, confidence, etc.
└──────┬──────┘
       │
       ▼
┌─────────────┐
│11. WebSocket│  WebSocket.send_json()
│    Send     │  - JSON message
└──────┬──────┘
       │
       │ Network (localhost ~1ms)
       │
       ▼
┌─────────────┐
│12. Browser  │  WebSocket.onmessage
│   Receive   │  - JSON.parse()
└──────┬──────┘  - Add to predictions buffer
       │
       ▼
┌─────────────┐
│13. Game     │  useGameLoop
│  Evaluate   │  - findBestPrediction()
└──────┬──────┘  - evaluateNote()
       │
       ▼
┌─────────────┐
│14. UI       │  React state update
│   Update    │  - Show score/feedback
└─────────────┘  - Visual effects
```

**Total Latency**: ~30-50ms (localhost)
- Frame capture: ~5ms
- Encode/network: ~5ms
- Hand detection: ~5-10ms
- CNN inference: ~10-20ms (CPU) / ~5ms (GPU)
- Network/decode: ~5ms

## Component Dependencies

### Frontend (Game)

```
GameCanvas
  ├─ useGameLoop
  │   ├─ useSignDetection ← WebSocket client
  │   │   └─ useWebcam ← Camera access
  │   └─ useVisualEffects
  ├─ Scoreboard
  ├─ NoteHighway
  ├─ TargetWindow
  ├─ HitFeedback
  └─ WebcamFeed
```

### Backend (ML Server)

```
FastAPI App
  └─ WebSocket Handler (/ws/predict)
      └─ ASLPredictor
          ├─ PyTorch Model (MobileNetV2)
          ├─ MediaPipe Hands
          ├─ Transform Pipeline
          └─ LabelMapper (A-Z)
```

## Timing & Synchronization

### Game Timing Model

```
Timeline (seconds):
│
├─ 0.0         Song starts
│
├─ 2.0         First note visible (earlyStart = noteTime - 2.0)
│              Player can now hit the note (GREAT)
│
├─ 3.7         PERFECT window starts (noteTime - 0.3)
│
├─ 4.0         ★ Target time ★
│              Ideal hit time
│
├─ 4.3         PERFECT window ends (noteTime + 0.3)
│              Late hits now score OK
│
├─ 4.8         Deadline (noteTime + 0.8)
│              After this: MISS
│
└─ ...         Next notes...
```

### Prediction Matching

```python
# Game evaluates predictions in real-time
for prediction in predictions_buffer:
    if (
        prediction.letter == note.letter and
        prediction.confidence >= 0.7 and
        prediction.handDetected and
        earlyStart <= prediction.timestamp <= deadline
    ):
        # FOUND A MATCH!
        # Score based on timing difference
        timing_diff = abs(prediction.timestamp - note.time)
        if timing_diff <= 0.3:
            score = PERFECT
        elif prediction.timestamp < note.time:
            score = GREAT
        else:
            score = OK
```

## File Organization

```
Project Root/
│
├─ asl/                                 # Next.js Game
│  ├─ src/
│  │  ├─ app/
│  │  │  └─ game/[id]/page.tsx         # Game route
│  │  ├─ components/game/
│  │  │  ├─ GameCanvas.tsx             # Main container
│  │  │  ├─ NoteHighway.tsx            # Note display
│  │  │  ├─ Scoreboard.tsx             # Score/lives
│  │  │  └─ WebcamFeed.tsx             # Camera view
│  │  ├─ hooks/
│  │  │  ├─ useGameLoop.ts             # ★ Core game logic
│  │  │  ├─ useSignDetection.ts        # ★ WebSocket client
│  │  │  └─ useWebcam.ts               # Camera access
│  │  └─ lib/
│  │     ├─ gameScoring.ts             # ★ Scoring logic
│  │     └─ beatmap.ts                 # Note data
│  └─ .env.local                       # Config
│
├─ Base test/Sign-Language-Recognition/ # ML Server
│  ├─ app/
│  │  ├─ websocket_api.py              # ★ WebSocket server (NEW)
│  │  ├─ frame_utils.py                # Feature extraction
│  │  └─ api.py                        # Original HTTP API
│  ├─ data/weights/
│  │  └─ asl_crop_v4_1_mobilenet_weights.pth  # ★ Trained model
│  ├─ model/
│  │  └─ cnn_models.py                 # MobileNetV2 architecture
│  ├─ utils/
│  │  ├─ label_mapper.py               # A-Z mapping
│  │  └─ model_checkpoint.py           # Model loading
│  ├─ requirements-websocket.txt       # Dependencies (NEW)
│  └─ test_websocket_client.py         # Test script (NEW)
│
├─ start-servers.sh                    # Startup (Unix)
├─ start-servers.bat                   # Startup (Windows)
├─ QUICKSTART_INTEGRATION.md           # Quick guide
├─ INTEGRATION_GUIDE.md                # Full docs
└─ ARCHITECTURE.md                     # This file
```

## Performance Considerations

### Bottlenecks

1. **CNN Inference** (~10-20ms CPU)
   - Solution: Use GPU (CUDA) for ~5ms inference
   - Alternative: Reduce frame rate to 10 FPS

2. **MediaPipe Processing** (~5-10ms)
   - Already optimized
   - Can't reduce without losing accuracy

3. **Network Latency** (~1-5ms localhost)
   - Negligible on localhost
   - Use binary protocol (already implemented)

### Optimization Strategies

```
Current:  12 FPS × (10-20ms inference) = ~60-80% CPU
Optimal:  12 FPS × (5ms GPU inference) = ~30% CPU
```

**GPU Acceleration**:
```python
# In websocket_api.py
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
```

**Frame Rate Tuning**:
```typescript
// In useSignDetection.ts
const FRAME_RATE = 12; // Lower = less CPU, higher = more responsive
```

## Security Considerations

### Current Implementation (Development)

- CORS: `allow_origins=["*"]` → All origins allowed
- WebSocket: No authentication
- Local only: localhost:8000

### Production Recommendations

```python
# websocket_api.py (Production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourgame.com"],  # Specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add authentication
@app.websocket("/ws/predict")
async def websocket_predict(websocket: WebSocket, token: str = Query(...)):
    # Verify token
    if not verify_token(token):
        await websocket.close(code=1008)
        return
    # ... rest of handler
```

## Scaling Considerations

### Current: Single User

```
1 Browser ←→ 1 WebSocket Connection ←→ 1 Python Process
```

### Future: Multiple Users

```
Multiple Browsers
    ↓
Load Balancer
    ↓
Multiple Python Processes (Workers)
    ↓
Shared Model (GPU)
```

**Options**:
1. **Process Pool**: Multiple uvicorn workers
2. **Container Scaling**: Docker + Kubernetes
3. **Model Serving**: TorchServe or TensorFlow Serving
