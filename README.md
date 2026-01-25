# 🤟 SignHero 

**A real-time American Sign Language (ASL) learning platform combining rhythm-based gaming with AI-powered hand sign recognition.**

<p align="center">
  <img src="Base test/image.png" alt="ASL Training Demo" width="600"/>
</p>

---

## 🌟 Overview

ASL Fun Training is a full-stack application that teaches ASL fingerspelling through interactive gameplay. The system uses a webcam to detect hand signs in real-time via a trained machine learning model, then challenges players to sign along to beatmaps synced with music—like Guitar Hero, but with sign language.

| Component | Description |
|-----------|-------------|
| **Frontend Game** (`asl/`) | Next.js 15 web app with rhythm game modes, visual effects, and real-time scoring |
| **ML Backend** (`Base test/`) | PyTorch model (MobileNetV2) trained on ASL alphabet data |
| **API Server** (`api_server_http.py`) | FastAPI server for real-time sign prediction via webcam frames |

---

## 🎮 Features

### Game Modes

- **Song Game** — Rhythm-based gameplay with scrolling note highway and combo scoring
- **Training Mode** — Step-by-step practice with visual hand pose hints
- **Testing Mode** — Timed challenges with accuracy tracking
- **Whack-A-Sign** — Arcade-style reflex game

### AI Sign Detection

- Real-time webcam analysis using MediaPipe hand tracking
- MobileNetV2 CNN for letter classification (A-Z)
- ~30-50ms inference latency on localhost

### Visual & Audio

- Synthwave aesthetic with neon effects
- Particle bursts, screen flash, streak glow
- Sound effects for hits/misses

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Next.js Game (asl/)                                 ││
│  │  • GameCanvas • NoteHighway • WebcamFeed            ││
│  │  • useGameLoop • useSignDetection • useWebcam       ││
│  └────────────────────────┬────────────────────────────┘│
└───────────────────────────┼─────────────────────────────┘
                            │ HTTP POST /predict_frame
                            │ (JPEG + timestamp)
┌───────────────────────────▼─────────────────────────────┐
│        FastAPI Server (api_server_http.py)              │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ASLPredictor                                       │ │
│  │  1. Decode JPEG (cv2)                              │ │
│  │  2. Hand Detection (MediaPipe)                     │ │
│  │  3. Feature Extraction (landmark mask)             │ │
│  │  4. CNN Inference (PyTorch MobileNetV2)            │ │
│  │  5. Return {letter, confidence, handDetected}      │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system diagrams.

---

## 📁 Project Structure

```
ASL-Fun-Training/
│
├── asl/                              # 🎮 Next.js Frontend Application
│   ├── src/
│   │   ├── app/                      # App Router pages (game, training, testing)
│   │   ├── components/game/          # GameCanvas, NoteHighway, effects
│   │   ├── hooks/                    # useGameLoop, useSignDetection, useWebcam
│   │   └── lib/                      # Scoring, beatmaps, utilities
│   └── README.md                     # Frontend-specific docs
│
├── Base test/Sign-Language-Recognition/  # 🧠 ML Training & Model
│   ├── app/                          # API & frame extraction scripts
│   ├── model/                        # CNN architecture (MobileNetV2)
│   ├── train/                        # Training scripts
│   ├── data/weights/                 # Trained model weights (.pth)
│   └── utils/                        # Label mapping, model loading
│
├── api_server_http.py                # 🚀 FastAPI prediction server
├── api_server_mock.py                # Mock server for testing
├── start-servers.sh                  # One-click startup (Unix)
├── start-servers.bat                 # One-click startup (Windows)
│
├── models/                           # Additional model storage
├── training/                         # Training data/scripts
├── dataset/                          # Raw dataset
├── asset_generation/                 # Hand sign SVG assets
│
├── ARCHITECTURE.md                   # System architecture diagrams
├── INTEGRATION_GUIDE.md              # Full integration documentation
├── QUICKSTART_INTEGRATION.md         # Quick setup guide
└── SETUP.md                          # Environment setup
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+** with pip
- **Node.js 20+** with pnpm
- **MongoDB** instance
- **Webcam** for sign detection

### 1. Start the ML Server

```bash
# Navigate to project root
cd ASL-Fun-Training

# Create Python virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install torch torchvision opencv-python mediapipe fastapi uvicorn python-multipart

# Start the API server
python api_server_http.py
# Server runs at http://localhost:8000
```

### 2. Start the Frontend

```bash
# In a new terminal
cd asl

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with MongoDB URI

# Start dev server
pnpm dev
# App runs at http://localhost:3000
```

### One-Click Startup

```bash
# Unix/Mac
./start-servers.sh

# Windows
start-servers.bat
```

---

## 🛠️ Tech Stack

### Frontend (`asl/`)

| Tech | Purpose |
|------|---------|
| Next.js 15 | React framework (App Router, Turbopack) |
| TypeScript | Type safety |
| Tailwind CSS 4 | Styling |
| Framer Motion | Animations |
| tRPC | Type-safe API layer |
| Prisma + MongoDB | Database |

### Backend (`Base test/` + `api_server_http.py`)

| Tech | Purpose |
|------|---------|
| FastAPI | HTTP API server |
| PyTorch | Deep learning framework |
| MobileNetV2 | CNN architecture for classification |
| MediaPipe | Hand landmark detection |
| OpenCV | Image processing |

---

## 🧠 Model Training

The sign detection model is a MobileNetV2 trained on hand landmark features:

```
Input: 224×224 RGB image (hand feature mask)
  ↓
MobileNetV2 CNN
  ↓
Output: 26 classes (A-Z)
```

**Training Pipeline:**
1. Webcam captures hand images
2. MediaPipe extracts 21 hand landmarks
3. Landmarks drawn as feature mask on black background
4. Both original and mirrored images processed
5. Max confidence from both used for prediction

Model weights: `Base test/Sign-Language-Recognition/data/weights/asl_crop_v4_1_mobilenet_weights.pth`

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System diagrams, data flow, timing model |
| [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) | Full integration documentation |
| [QUICKSTART_INTEGRATION.md](QUICKSTART_INTEGRATION.md) | 5-minute setup guide |
| [SETUP.md](SETUP.md) | Environment configuration |
| [asl/README.md](asl/README.md) | Frontend-specific documentation |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

Educational project for ASL learning.

---

## 🙏 Acknowledgments

- [T3 Stack](https://create.t3.gg/) for the Next.js template
- [MediaPipe](https://mediapipe.dev/) for hand tracking
- ASL fingerspelling resources for training data
