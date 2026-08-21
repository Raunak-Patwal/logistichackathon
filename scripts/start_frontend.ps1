# AI Logistics Brain - Local Frontend Fast Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting AI Logistics Brain Frontend (Vite + React 18)  " -ForegroundColor Green
Write-Host "  Cockpit URL: http://localhost:5173                      " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\..\frontend"
npm run dev -- --host 0.0.0.0 --port 5173
