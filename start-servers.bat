@echo off
REM Startup script for Windows to run both the ML WebSocket server and the Next.js game

echo ============================================
echo Starting ASL Fun Training Servers
echo ============================================
echo.

REM Check if we're in the right directory
if not exist "asl" (
    echo Error: Please run this script from the project root directory
    pause
    exit /b 1
)

echo Step 1: Starting ML WebSocket Server
echo --------------------------------------------

REM Check for conda
where conda >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Found conda, using asl-deployment environment
    cd "Base test\Sign-Language-Recognition"
    start "ML WebSocket Server" cmd /k "conda activate asl-deployment && python -m app.websocket_api"
    cd ..\..
) else (
    echo Conda not found, using virtualenv
    cd "Base test\Sign-Language-Recognition"

    if not exist "venv" (
        echo Creating virtual environment...
        python -m venv venv
        call venv\Scripts\activate
        pip install -r requirements-websocket.txt
    )

    start "ML WebSocket Server" cmd /k "venv\Scripts\activate && python -m app.websocket_api"
    cd ..\..
)

echo WebSocket server started in new window
echo Endpoint: ws://localhost:8000/ws/predict
echo.

REM Wait a bit for the server to start
timeout /t 5 /nobreak >nul

echo Step 2: Starting Next.js Game Server
echo --------------------------------------------

cd asl

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call pnpm install
)

REM Copy environment file if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    copy .env.local .env
)

echo Starting Next.js dev server...
start "Next.js Game" cmd /k "pnpm dev"

cd ..

echo.
echo ============================================
echo All servers running!
echo ============================================
echo.
echo Game:      http://localhost:3000
echo ML API:    http://localhost:8000
echo WebSocket: ws://localhost:8000/ws/predict
echo.
echo Close the server windows to stop the servers
echo.
pause
