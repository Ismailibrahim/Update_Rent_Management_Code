# Diagnostic script to identify why the server stops
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Server Stop Diagnostic Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if PHP process is running
Write-Host "1. Checking PHP processes..." -ForegroundColor Yellow
$phpProcesses = Get-Process -Name "php" -ErrorAction SilentlyContinue
if ($phpProcesses) {
    Write-Host "   Found $($phpProcesses.Count) PHP process(es)" -ForegroundColor Green
    $phpProcesses | ForEach-Object {
        Write-Host "   - PID: $($_.Id), Memory: $([math]::Round($_.WorkingSet64/1MB, 2)) MB, CPU: $($_.CPU)" -ForegroundColor Gray
    }
} else {
    Write-Host "   No PHP processes running" -ForegroundColor Red
}

# 2. Check port 8000
Write-Host "`n2. Checking port 8000..." -ForegroundColor Yellow
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port8000) {
    Write-Host "   Port 8000 is in use by PID: $($port8000.OwningProcess)" -ForegroundColor Green
    $process = Get-Process -Id $port8000.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "   Process: $($process.ProcessName), Memory: $([math]::Round($process.WorkingSet64/1MB, 2)) MB" -ForegroundColor Gray
    }
} else {
    Write-Host "   Port 8000 is not in use" -ForegroundColor Red
}

# 3. Check PHP configuration
Write-Host "`n3. Checking PHP configuration..." -ForegroundColor Yellow
try {
    $phpVersion = php -r "echo PHP_VERSION;"
    Write-Host "   PHP Version: $phpVersion" -ForegroundColor Green
    
    $memoryLimit = php -r "echo ini_get('memory_limit');"
    Write-Host "   Memory Limit: $memoryLimit" -ForegroundColor Green
    
    $maxExecutionTime = php -r "echo ini_get('max_execution_time');"
    Write-Host "   Max Execution Time: $maxExecutionTime seconds" -ForegroundColor Green
    
    $opcacheEnabled = php -r "echo ini_get('opcache.enable') ? 'Enabled' : 'Disabled';"
    Write-Host "   OPcache: $opcacheEnabled" -ForegroundColor $(if ($opcacheEnabled -eq 'Enabled') { 'Yellow' } else { 'Green' })
    
    $opcacheCli = php -r "echo ini_get('opcache.enable_cli') ? 'Enabled' : 'Disabled';"
    Write-Host "   OPcache CLI: $opcacheCli" -ForegroundColor $(if ($opcacheCli -eq 'Enabled') { 'Red' } else { 'Green' })
    if ($opcacheCli -eq 'Enabled') {
        Write-Host "   ⚠ WARNING: OPcache is enabled for CLI - this can cause issues!" -ForegroundColor Red
    }
} catch {
    Write-Host "   Could not check PHP configuration: $_" -ForegroundColor Red
}

# 4. Check Laravel logs for recent errors
Write-Host "`n4. Checking recent Laravel errors..." -ForegroundColor Yellow
if (Test-Path "storage\logs\laravel.log") {
    $recentErrors = Get-Content "storage\logs\laravel.log" -Tail 50 | Select-String -Pattern "ERROR|CRITICAL|FATAL" | Select-Object -Last 5
    if ($recentErrors) {
        Write-Host "   Recent errors found:" -ForegroundColor Yellow
        $recentErrors | ForEach-Object {
            Write-Host "   - $_" -ForegroundColor Gray
        }
    } else {
        Write-Host "   No recent errors in log" -ForegroundColor Green
    }
} else {
    Write-Host "   Laravel log file not found" -ForegroundColor Yellow
}

# 5. Check database connection
Write-Host "`n5. Checking database connection..." -ForegroundColor Yellow
try {
    $dbTest = php artisan tinker --execute="DB::connection()->getPdo(); echo 'OK';" 2>&1
    if ($dbTest -match "OK") {
        Write-Host "   Database connection: OK" -ForegroundColor Green
    } else {
        Write-Host "   Database connection: FAILED" -ForegroundColor Red
        Write-Host "   Error: $dbTest" -ForegroundColor Gray
    }
} catch {
    Write-Host "   Could not test database: $_" -ForegroundColor Yellow
}

# 6. Check for Windows Event Viewer errors (if accessible)
Write-Host "`n6. Checking system resources..." -ForegroundColor Yellow
$memory = Get-CimInstance Win32_OperatingSystem
$freeMemory = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
$totalMemory = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
Write-Host "   Available Memory: $freeMemory GB / $totalMemory GB" -ForegroundColor $(if ($freeMemory -lt 1) { 'Red' } else { 'Green' })

# 7. Check if antivirus or security software might be interfering
Write-Host "`n7. Recommendations:" -ForegroundColor Yellow
Write-Host "   - If OPcache CLI is enabled, disable it in php.ini" -ForegroundColor Cyan
Write-Host "   - Check Windows Event Viewer for process termination events" -ForegroundColor Cyan
Write-Host "   - Verify antivirus isn't blocking/quarantining PHP processes" -ForegroundColor Cyan
Write-Host "   - Check if Laragon/Apache is conflicting on port 8000" -ForegroundColor Cyan
Write-Host "   - Ensure database is running and accessible" -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Diagnostic complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

