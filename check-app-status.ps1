# Check Application Status
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Checking Application Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if port 8000 is listening
Write-Host "[1/4] Checking if server is running on port 8000..." -ForegroundColor Green
$portCheck = netstat -ano | findstr ":8000"
if ($portCheck) {
    Write-Host "✓ Server is running on port 8000" -ForegroundColor Green
    $portCheck | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "✗ No server found on port 8000" -ForegroundColor Red
    Write-Host "  Start server with: cd backend && php artisan serve" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check PHP processes
Write-Host "[2/4] Checking PHP processes..." -ForegroundColor Green
$phpProcesses = Get-Process | Where-Object {$_.ProcessName -eq "php"}
if ($phpProcesses) {
    Write-Host "✓ Found $($phpProcesses.Count) PHP process(es)" -ForegroundColor Green
    $phpProcesses | ForEach-Object {
        Write-Host "  Process ID: $($_.Id) (Started: $($_.StartTime))" -ForegroundColor Gray
    }
} else {
    Write-Host "? No PHP processes found" -ForegroundColor Yellow
}

Write-Host ""

# Test API endpoints
Write-Host "[3/4] Testing API endpoints..." -ForegroundColor Green

# Test health endpoint
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8000/api/health" -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Health endpoint: OK (Status: $($health.StatusCode))" -ForegroundColor Green
    $healthData = $health.Content | ConvertFrom-Json
    if ($healthData.database -eq "connected") {
        Write-Host "  Database: Connected" -ForegroundColor Green
    } else {
        Write-Host "  Database: Disconnected" -ForegroundColor Yellow
    }
} catch {
    Write-Host "✗ Health endpoint: FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test test endpoint
try {
    $test = Invoke-WebRequest -Uri "http://localhost:8000/api/test" -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Test endpoint: OK (Status: $($test.StatusCode))" -ForegroundColor Green
    $testData = $test.Content | ConvertFrom-Json
    Write-Host "  Message: $($testData.message)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Test endpoint: FAILED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# Check for errors in log
Write-Host "[4/4] Checking recent errors..." -ForegroundColor Green
if (Test-Path "backend\storage\logs\laravel.log") {
    $recentErrors = Get-Content "backend\storage\logs\laravel.log" -Tail 50 | Select-String -Pattern "ERROR|Exception" | Select-Object -First 3
    if ($recentErrors) {
        Write-Host "⚠ Recent errors found:" -ForegroundColor Yellow
        $recentErrors | ForEach-Object {
            $line = $_.ToString()
            if ($line.Length -gt 120) { $line = $line.Substring(0, 120) + "..." }
            Write-Host "  $line" -ForegroundColor Red
        }
    } else {
        Write-Host "✓ No recent errors in log" -ForegroundColor Green
    }
} else {
    Write-Host "? Log file not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Application URL: http://localhost:8000" -ForegroundColor White
Write-Host "API Base URL: http://localhost:8000/api" -ForegroundColor White
Write-Host ""
Write-Host "If you see errors above, check:" -ForegroundColor Yellow
Write-Host "1. Database connection in backend/.env" -ForegroundColor White
Write-Host "2. Run migrations: cd backend && php artisan migrate" -ForegroundColor White
Write-Host "3. Check logs: backend/storage/logs/laravel.log" -ForegroundColor White
Write-Host ""

