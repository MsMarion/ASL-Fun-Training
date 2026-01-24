#!/bin/bash
# Startup script to run both the ML WebSocket server and the Next.js game

set -e

echo "🚀 Starting ASL Fun Training Servers"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "asl" ] || [ ! -d "Base test/Sign-Language-Recognition" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Function to cleanup background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $(jobs -p) 2>/dev/null || true
    exit
}

trap cleanup INT TERM

echo ""
echo -e "${BLUE}Step 1: Starting ML WebSocket Server${NC}"
echo "--------------------------------------"

# Check if conda environment exists
if conda env list | grep -q "asl-v_3"; then
    echo "✓ Found conda environment: asl-v_3"
    # Start HTTP server
    conda run -n asl-v_3 python api_server_http.py &
    API_PID=$!
    echo "✓ ML API server started (PID: $API_PID)"
    echo "  Endpoint: http://localhost:8000"

elif conda env list | grep -q "asl-fun"; then
    echo "✓ Found conda environment: asl-fun"
    # Start HTTP server
    conda run -n asl-fun python api_server_http.py &
    API_PID=$!
    echo "✓ ML API server started (PID: $API_PID)"
    echo "  Endpoint: http://localhost:8000"

else
    echo "⚠️  Warning: Conda environment 'asl-v_1' or 'asl-fun' not found"
    echo "   Attempting to start with system Python..."
    echo "   Please ensure dependencies are installed (fastapi, uvicorn, torch, mediapipe, opencv-python)"

    # Start HTTP server
    python3 api_server_http.py &
    API_PID=$!
    echo "✓ ML API server started (PID: $API_PID)"
    echo "  Endpoint: http://localhost:8000"
fi

# Wait a bit for the server to start
sleep 3

echo ""
echo -e "${BLUE}Step 2: Starting Next.js Game Server${NC}"
echo "--------------------------------------"

cd asl

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.local .env
fi

echo "✓ Starting Next.js dev server..."
pnpm dev &
NEXT_PID=$!

cd ..

echo ""
echo -e "${GREEN}✅ All servers running!${NC}"
echo "===================================="
echo ""
echo "🎮 Game:      http://localhost:3000"
echo "🤖 ML API:    http://localhost:8000"
echo "📡 WebSocket: ws://localhost:8000/ws/predict"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for all background processes
wait
