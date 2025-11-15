# Restart Frontend and Backend Servers
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Restarting Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stop Backend (Port 8000)
Write-Host "[1/4] Stopping backend server (port 8000)..." -ForegroundColor Yellow
$backendProcess = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
if ($backendProcess) {
    Stop-Process -Id $backendProcess -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Backend stopped (PID: $backendProcess)" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "? No backend process found on port 8000" -ForegroundColor Yellow
}

# Stop Frontend (Port 3000)
Write-Host "[2/4] Stopping frontend server (port 3000)..." -ForegroundColor Yellow
$frontendProcess = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
if ($frontendProcess) {
    Stop-Process -Id $frontendProcess -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Frontend stopped (PID: $frontendProcess)" -ForegroundColor Green
    Start-Sleep -Seconds 2
} else {
    Write-Host "? No frontend process found on port 3000" -ForegroundColor Yellow
}

Write-Host ""

# Start Backend
Write-Host "[3/4] Starting backend server..." -ForegroundColor Yellow
$phpPath = $null
if (Test-Path "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe") {
    $phpPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"
} else {
    $php = Get-Command php -ErrorAction SilentlyContinue
    if ($php) { $phpPath = $php.Source }
}

if ($phpPath) {
    Set-Location backend
    $backendJob = Start-Process -FilePath $phpPath -ArgumentList "artisan","serve" -PassThru -WindowStyle Minimized
    Write-Host "✓ Backend started (PID: $($backendJob.Id))" -ForegroundColor Green
    Write-Host "  Backend URL: http://localhost:8000" -ForegroundColor Gray
    Set-Location ..
} else {
    Write-Host "✗ PHP not found! Cannot start backend." -ForegroundColor Red
}

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "[4/4] Starting frontend server..." -ForegroundColor Yellow
Set-Location frontend
$nodePath = Get-Command node -ErrorAction SilentlyContinue
if ($nodePath) {
    $frontendJob = Start-Process -FilePath $nodePath.Source -ArgumentList "$PWD\node_modules\.bin\next","dev" -PassThru -WindowStyle Minimized
    Write-Host "✓ Frontend started (PID: $($frontendJob.Id))" -ForegroundColor Green
    Write-Host "  Frontend URL: http://localhost:3000" -ForegroundColor Gray
} else {
    Write-Host "✗ Node.js not found! Cannot start frontend." -ForegroundColor Red
}
Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Restart Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Servers are starting..." -ForegroundColor Yellow
Write-Host "Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Wait a few seconds for servers to fully start, then:" -ForegroundColor Yellow
Write-Host "- Visit http://localhost:3000/login" -ForegroundColor White
Write-Host "- Check http://localhost:8000/api/test to verify backend" -ForegroundColor White
Write-Host ""

