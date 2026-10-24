@echo off
title LeadFlow AI Launcher
echo ========================================================
echo   LeadFlow AI - Autonomous Sales Operations Agent
echo ========================================================
echo.
echo [1/2] Starting Backend FastAPI server on port 8000...
start "LeadFlow Backend (FastAPI)" cmd /k ".\backend\venv\Scripts\python.exe -m uvicorn backend.app.main:app --port 8000 --reload"

echo [2/2] Starting Frontend Vite development server on port 5173...
start "LeadFlow Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo Servers are launching in separate windows:
echo   - Web App UI:       http://localhost:5173
echo   - Backend API Docs: http://localhost:8000/docs
echo ========================================================
timeout /t 3 >nul
start http://localhost:5173
