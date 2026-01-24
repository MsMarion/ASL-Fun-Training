# ASL Fun Training - Setup Guide

This guide will help you set up and run the ASL Fun Training game on your local machine (Mac, Windows, or Linux).

## Prerequisites

1.  **Node.js**: Install Node.js (v18 or later) from [nodejs.org](https://nodejs.org/).
    *   Verify with `node -v`.
2.  **Conda (Recommended)**: Install Miniconda or Anaconda from [anaconda.com](https://www.anaconda.com/download).
    *   Verify with `conda --version`.

---

## 1. Backend Setup (ML API)

We use a Python server for Hand Sign Detection.

### Step 1: Create Conda Environment
Open your terminal (Terminal on Mac/Linux, Anaconda Prompt on Windows) and run:

```bash
conda create -n asl-fun python=3.10
conda activate asl-fun
```

### Step 2: Install Dependencies
Install the required packages. We use PyTorch and MediaPipe.

**Common Dependencies:**
```bash
pip install fastapi uvicorn mediapipe opencv-python pydantic python-multipart
```

**PyTorch (Mac/Linux):**
```bash
pip install torch torchvision
```

**PyTorch (Windows):**
Visit [pytorch.org/get-started](https://pytorch.org/get-started/locally/) for the exact command if you have an NVIDIA GPU. For CPU-only:
```bash
pip install torch torchvision
```

---

## 2. Frontend Setup (Game)

The game is built with Next.js.

### Step 1: Install Dependencies
Open a *new* terminal window (regular terminal/PowerShell is fine), navigate to the project folder, then to the `asl` folder:

```bash
cd asl
nom install  # or npm install / pnpm install
```

---

## 3. Running the Project

We have scripts to start both servers for you.

### Option A: One-Click Script (Recommended)

**Mac / Linux:**
Run the shell script from the project root:
```bash
./start-servers.sh
```

**Windows:**
Double-click `start-servers.bat` or run it from Command Prompt:
```cmd
start-servers.bat
```

This will launch:
1.  **ML API Server** at `http://localhost:8000`
2.  **Game Client** at `http://localhost:3000`

### Option B: Manual Start

**Backend (Terminal 1):**
```bash
conda activate asl-fun
python api_server_http.py
```

**Frontend (Terminal 2):**
```bash
cd asl
npm run dev
```

---

## Troubleshooting

### Windows Users
*   **"Conda is not recognized"**: Make sure you added Anaconda to your PATH during installation, or use the "Anaconda Prompt" instead of standard CMD/PowerShell.
*   **Camera Permission**: Windows might block camera access. Check Settings > Privacy > Camera.
*   **`ImportError: cannot import name 'Image' from 'PIL'`**: This indicates a corrupted installation or version conflict between Pillow and Matplotlib.
    Run these commands **exactly as shown** to clean and reinstall them:
    ```bash
    pip uninstall matplotlib pillow -y
    pip install --no-cache-dir matplotlib pillow
    ```
    If that still fails, try installing via Conda instead:
    ```bash
    pip uninstall pillow -y
    conda install -c conda-forge pillow
    ```

### All Users
*   **"Module not found" error**: Make sure you activated the environment (`conda activate asl-fun`) before running the server.
*   **Laggy Recognition**: Ensure your computer is plugged in (power saving modes slow down AI) and you have good lighting.
