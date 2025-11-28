#!/bin/bash

# Define paths
BASE_DIR=$(pwd)
BACKEND_DIR="$BASE_DIR/backend"
FRONTEND_FILE="$BASE_DIR/frontend/index.html"

echo "Starting Land Use Trend & Target Analyzer..."

# 1. Setup Backend
echo "Setting up backend..."
cd "$BACKEND_DIR"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt > /dev/null 2>&1

# Start Backend Server
echo "Starting FastAPI server..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait for server to start
sleep 3

# 2. Start Frontend Server
echo "Starting Frontend Server..."
cd "$BASE_DIR/frontend"
# Kill any existing process on port 8001
lsof -ti:8001 | xargs kill -9 2>/dev/null
python3 -m http.server 8001 &
FRONTEND_PID=$!

# Wait for server to start
sleep 2

# 3. Open Frontend
echo "Opening frontend..."
open "http://localhost:8001"

echo "App is running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:8001"
echo "Press Ctrl+C to stop."

# Wait for user interrupt
wait $BACKEND_PID $FRONTEND_PID
