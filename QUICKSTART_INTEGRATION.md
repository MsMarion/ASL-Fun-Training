# Quick Start: ML Model Integration

Get your ASL rhythm game working with the trained model in 3 easy steps!

## TL;DR

```bash
# 1. Install ML server dependencies
cd "Base test/Sign-Language-Recognition"
pip install -r requirements-websocket.txt

# 2. Start both servers
cd ../..
./start-servers.sh

# 3. Open browser
# http://localhost:3000
```

## Detailed Setup

### Step 1: Install Python Dependencies

```bash
cd "Base test/Sign-Language-Recognition"

# Option A: Use conda (if you have it)
conda env create -f environment/deployment.yml
conda activate asl-deployment

# Option B: Use pip + virtualenv
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements-websocket.txt
```

### Step 2: Test the ML Server

Start the WebSocket server:

```bash
python -m app.websocket_api
```

You should see:

```
[ASLPredictor] Using device: cpu  # or cuda
[ASLPredictor] Model loaded from: ...
[Server] ASL WebSocket API ready - model version: v4.1-mobilenet
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Test it works:

```bash
# In a new terminal
cd "Base test/Sign-Language-Recognition"
python test_websocket_client.py --duration 5
```

This will capture your webcam and test predictions for 5 seconds.

### Step 3: Start the Game

```bash
# In a new terminal (from project root)
cd asl
pnpm install  # First time only
pnpm dev
```

Game will be at `http://localhost:3000`

### Step 4: Play!

1. Navigate to a game page
2. Allow camera access
3. Make ASL signs matching the notes!

## Quick Test Checklist

✓ ML server running on port 8000
✓ Game running on port 3000
✓ Camera permissions granted
✓ Connection indicator shows "Connected"
✓ Hand detection works (check visual feedback)

## Common Issues

**"Module not found"** → Run `pip install -r requirements-websocket.txt`
**"Model file not found"** → Check `Base test/Sign-Language-Recognition/data/weights/` exists
**"WebSocket disconnected"** → Make sure ML server is running on port 8000
**"Camera not working"** → Grant browser camera permissions

## Architecture

```
Browser (Game)          Python (ML Server)
    |                         |
    |--- WebSocket conn ------|
    |                         |
    |-- Send frames (12fps) ->|
    |                         |-- MediaPipe + CNN
    |                         |
    |<- Predictions (A-Z) ----|
    |                         |
```

## Files Created

- `Base test/Sign-Language-Recognition/app/websocket_api.py` - WebSocket server
- `Base test/Sign-Language-Recognition/requirements-websocket.txt` - Dependencies
- `Base test/Sign-Language-Recognition/test_websocket_client.py` - Test client
- `start-servers.sh` - Automated startup script
- `INTEGRATION_GUIDE.md` - Full documentation

## Next Steps

1. **Calibrate timing**: Adjust game scoring windows in `asl/src/lib/gameScoring.ts`
2. **Tune confidence**: Modify `CONFIDENCE_THRESHOLD` in `websocket_api.py`
3. **Add visual feedback**: Show hand landmarks on game screen
4. **Test different signs**: Practice all 26 letters

## Need Help?

Check the full [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for:

- Detailed protocol specification
- Performance tuning
- Advanced configuration
- Troubleshooting guide
