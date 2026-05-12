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
    echo Found conda. Checking for environment...
    
    REM Try asl-v_1
    call conda activate asl-v_1 >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo Using 'asl-v_1' environment
        start "ML API Server" cmd /k "conda activate asl-v_3 && python api_server_http.py"
        goto :SERVER_STARTED
    )

    REM Try asl-fun
    call conda activate asl-fun >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo Using 'asl-fun' environment
        start "ML API Server" cmd /k "conda activate asl-fun && python api_server_http.py"
        goto :SERVER_STARTED
    )
    
    echo Warning: Conda environments 'asl-v_1' or 'asl-fun' not found.
    echo Attempting to use base/current python...
    start "ML API Server" cmd /k "python api_server_http.py"
) else (
    echo Conda not found. Using system python...
    start "ML API Server" cmd /k "python api_server_http.py"
)

:SERVER_STARTED
echo ML API server started in new window
echo Endpoint: http://localhost:4001

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
start "Next.js Game" cmd /k "pnpm dev --port 4000"

cd ..

echo.
echo ============================================
echo All servers running!
echo ============================================
echo.
echo Game:      http://localhost:4000
echo ML API:    http://localhost:4001
echo WebSocket: ws://localhost:4001/ws/predict
echo.
echo Close the server windows to stop the servers
echo.
pause
