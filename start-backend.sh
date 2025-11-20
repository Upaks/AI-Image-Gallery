#!/bin/bash
echo "Starting AI Image Gallery Backend..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1
echo ""
echo "Backend starting on http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""
uvicorn main:app --reload

