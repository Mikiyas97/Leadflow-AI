Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  LeadFlow AI - Autonomous Sales Operations Agent" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Write-Host "`n[1/2] Starting Backend FastAPI on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\backend\venv\Scripts\python.exe -m uvicorn backend.app.main:app --port 8000 --reload"

Write-Host "[2/2] Starting Frontend Vite on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

Write-Host "`nBoth servers started in separate windows!" -ForegroundColor Green
Write-Host "App UI:   http://localhost:5173" -ForegroundColor White
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor White

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
