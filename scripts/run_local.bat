@echo off
title AI Logistics Brain - Local Full Stack Launcher
echo ==========================================================
echo   AI LOGISTICS BRAIN: Starting Local Services
echo ==========================================================
echo 1. Launching Backend on http://localhost:8000 ...
start "Logistics Backend (FastAPI)" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0start_backend.ps1"

timeout /t 2 /nobreak >nul

echo 2. Launching Frontend on http://localhost:5173 ...
start "Logistics Frontend (Vite)" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0start_frontend.ps1"

echo ==========================================================
echo   Both services started locally!
echo   Frontend Cockpit: http://localhost:5173
echo   Backend API Docs: http://localhost:8000/docs
echo ==========================================================
