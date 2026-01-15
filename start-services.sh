#!/bin/bash
# NT-POC Services Startup Script
# Starts all services in the correct order

set -e

echo "========================================="
echo "  NT-POC Services Startup"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0.32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    lsof -ti:$1 > /dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    echo -n "Waiting for $name to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo -e " ${GREEN}✓${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
        ((attempt++))
    done
    echo -e " ${RED}✗${NC} (timeout)"
    return 1
}

# Check if backend is running
echo "1. Checking Backend Service (Port 3000)..."
if check_port 3000; then
    echo -e "   ${GREEN}✓${NC} Backend already running"
else
    echo -e "   ${YELLOW}!${NC} Backend not running. Please start it:"
    echo "     npm run dev --workspace=@nt-poc/backend"
    exit 1
fi

# Start Simulator
echo ""
echo "2. Starting Simulator Service (Port 8001)..."
if check_port 8001; then
    echo -e "   ${YELLOW}!${NC} Port 8001 already in use. Skipping."
else
    cd services/simulator
    if [ ! -d "venv" ]; then
        echo "   Creating Python virtual environment..."
        python3 -m venv venv
    fi
    source venv/bin/activate

    echo "   Installing dependencies..."
    pip install -q -r requirements.txt 2>&1 | tail -1 || {
        echo -e "   ${RED}✗${NC} Failed to install dependencies"
        echo "   Please install manually: cd services/simulator && pip install -r requirements.txt"
    }

    echo "   Starting simulator..."
    python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 > /tmp/simulator.log 2>&1 &
    SIMULATOR_PID=$!
    cd ../..

    wait_for_service "http://localhost:8001/api/health" "Simulator"
fi

# Start MLOps
echo ""
echo "3. Starting MLOps Service (Port 8000)..."
if check_port 8000; then
    echo -e "   ${YELLOW}!${NC} Port 8000 already in use. Skipping."
else
    cd services/mlops
    if [ ! -d "venv" ]; then
        echo "   Creating Python virtual environment..."
        python3 -m venv venv
    fi
    source venv/bin/activate

    echo "   Installing dependencies..."
    pip install -q -r requirements.txt 2>&1 | tail -1 || {
        echo -e "   ${RED}✗${NC} Failed to install dependencies"
        echo "   Please install manually: cd services/mlops && pip install -r requirements.txt"
    }

    echo "   Starting MLOps..."
    uvicorn src.main:app --host 0.0.0.0 --port 8000 > /tmp/mlops.log 2>&1 &
    MLOPS_PID=$!
    cd ../..

    wait_for_service "http://localhost:8000/health" "MLOps"
fi

# Start LINE Bot
echo ""
echo "4. Starting LINE Bot Service (Port 3002)..."
if check_port 3002; then
    echo -e "   ${YELLOW}!${NC} Port 3002 already in use. Skipping."
else
    cd services/line-bot
    npm run dev > /tmp/line-bot.log 2>&1 &
    LINE_BOT_PID=$!
    cd ../..

    wait_for_service "http://localhost:3002/health" "LINE Bot"
fi

# Summary
echo ""
echo "========================================="
echo "  Services Status"
echo "========================================="
echo ""
echo "✓ Backend:   http://localhost:3000 (Already running)"
echo "✓ Simulator: http://localhost:8001 (API Docs: /docs)"
echo "✓ MLOps:     http://localhost:8000 (API Docs: /docs)"
echo "✓ LINE Bot:  http://localhost:3002"
echo ""
echo "To start Frontend:"
echo "  npm run dev --workspace=@nt-poc/frontend"
echo "  Access at: http://localhost:5173"
echo ""
echo "To view logs:"
echo "  Simulator: tail -f /tmp/simulator.log"
echo "  MLOps:     tail -f /tmp/mlops.log"
echo "  LINE Bot:  tail -f /tmp/line-bot.log"
echo ""
echo "To stop services:"
echo "  Kill the processes or run: pkill -f 'uvicorn\|npm run dev'"
echo ""
echo "========================================="
