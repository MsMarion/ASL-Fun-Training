# ASL Sign Language Recognition

Real-time American Sign Language (A-Z) detection using MediaPipe and deep learning.

## Quick Start

### 1. Setup Environment

```bash
conda env create -f environment/deployment.yml
conda activate asl-deployment
```

### 2. Run the Desktop App

```bash
python -m app.frame
```

### 3. Run the API Server

```bash
uvicorn app.api:app --host 0.0.0.0 --port 8000
```

Then open:

- Video stream: http://localhost:8000/video
- API docs: http://localhost:8000/docs

## API Endpoints

| Endpoint    | Method | Description                    |
| ----------- | ------ | ------------------------------ |
| `/predict`  | GET    | Get current detected letter    |
| `/sentence` | GET    | Get accumulated sentence       |
| `/video`    | GET    | Live video stream              |
| `/add`      | POST   | Add current letter to sentence |
| `/space`    | POST   | Add space                      |
| `/reset`    | POST   | Clear sentence                 |

## Project Structure

```
├── app/           # Application code
│   ├── frame.py   # Tkinter GUI
│   ├── api.py     # FastAPI server
│   └── frame_utils.py
├── model/         # CNN architectures
├── train/         # Training scripts
├── data/weights/  # Trained models
└── utils/         # Helper functions
```

## How It Works

1. Webcam captures hand gestures
2. MediaPipe detects 21 hand landmarks
3. MobileNetV2 classifies the sign (A-Z)
4. Predictions are smoothed over 10 frames
5. Letters build into sentences

## Requirements

- Python 3.10+
- Webcam
- CUDA GPU (optional, for faster inference)
