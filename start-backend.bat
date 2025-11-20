@echo off
echo Starting AI Image Gallery Backend...
cd backend
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt >nul 2>&1
echo.
echo Backend starting on http://localhost:8000
echo Press Ctrl+C to stop
echo.
uvicorn main:app --reload

