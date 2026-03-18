#!/bin/bash
# MLX Fold Studio — Start both backend and frontend servers

set -e

echo "╔══════════════════════════════════════════════════╗"
echo "║          MLX Fold Studio — Starting...           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check Python deps
echo -e "${BLUE}[1/3]${NC} Checking Python dependencies..."
if ! pip3 show fastapi &> /dev/null; then
    echo "  Installing Python backend dependencies..."
    pip3 install -r "$SCRIPT_DIR/requirements.txt"
fi
echo -e "  ${GREEN}✓${NC} Python dependencies ready"

# Check Node deps
echo -e "${BLUE}[2/3]${NC} Checking Node dependencies..."
if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
    echo "  Installing Node dependencies..."
    cd "$SCRIPT_DIR" && npm install
fi
echo -e "  ${GREEN}✓${NC} Node dependencies ready"

# Start servers
echo -e "${BLUE}[3/3]${NC} Starting servers..."
echo ""

# Start Python backend in background
echo -e "  ${GREEN}→${NC} Starting Python backend on http://localhost:8000"
cd "$SCRIPT_DIR" && python3 -m uvicorn server.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Give backend a moment to start
sleep 2

# Start Vite frontend
echo -e "  ${GREEN}→${NC} Starting Vite frontend on http://localhost:3000"
echo ""
cd "$SCRIPT_DIR" && npm run dev &
FRONTEND_PID=$!

echo ""
echo -e "${GREEN}Both servers running!${NC}"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

# Trap Ctrl+C to kill both processes
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for either to exit
wait
