# AI Logistics Brain - Local Backend Fast Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Starting AI Logistics Brain Backend (FastAPI + Uvicorn) " -ForegroundColor Green
Write-Host "  Base URL: http://localhost:8000                         " -ForegroundColor Yellow
Write-Host "  Swagger Docs: http://localhost:8000/docs                " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot\..\backend"
$env:ENVIRONMENT = "development"
$env:DATABASE_URL = "sqlite+aiosqlite:///logistics_local.db"

python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
