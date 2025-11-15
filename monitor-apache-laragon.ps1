# Monitor Apache and Laragon Processes
# Run this script to see when Apache stops and what Laragon is doing

Write-Host "Monitoring Apache and Laragon..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop monitoring" -ForegroundColor Yellow
Write-Host ""

$previousApacheState = $null

while ($true) {
    $apache = Get-Process | Where-Object {$_.ProcessName -like "*httpd*"} | Select-Object -First 1
    $laragon = Get-Process | Where-Object {$_.ProcessName -like "*laragon*"} | Select-Object -First 1
    $mysql = Get-Process | Where-Object {$_.ProcessName -like "*mysqld*"} | Select-Object -First 1
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    
    $apacheRunning = $apache -ne $null
    $laragonRunning = $laragon -ne $null
    $mysqlRunning = $mysql -ne $null
    
    # Only show changes or current state
    if ($apacheRunning -ne $previousApacheState -or $previousApacheState -eq $null) {
        Write-Host "`n[$time]" -ForegroundColor White
        
        if ($apacheRunning) {
            $mem = [math]::Round($apache.WorkingSet / 1MB, 2)
            $cpu = [math]::Round($apache.CPU, 2)
            Write-Host "  Apache:  RUNNING" -ForegroundColor Green -NoNewline
            Write-Host " (PID: $($apache.Id), Memory: ${mem}MB, CPU: ${cpu}s)" -ForegroundColor Gray
        } else {
            Write-Host "  Apache:  STOPPED!" -ForegroundColor Red
        }
        
        if ($laragonRunning) {
            Write-Host "  Laragon: RUNNING" -ForegroundColor Cyan -NoNewline
            Write-Host " (PID: $($laragon.Id))" -ForegroundColor Gray
        } else {
            Write-Host "  Laragon: STOPPED" -ForegroundColor Yellow
        }
        
        if ($mysqlRunning) {
            Write-Host "  MySQL:   RUNNING" -ForegroundColor Green -NoNewline
            Write-Host " (PID: $($mysql.Id))" -ForegroundColor Gray
        } else {
            Write-Host "  MySQL:   STOPPED" -ForegroundColor Yellow
        }
        
        if (-not $apacheRunning -and $laragonRunning) {
            Write-Host "  WARNING: Apache stopped but Laragon is still running!" -ForegroundColor Red
            Write-Host "  This suggests Laragon stopped Apache, not a crash." -ForegroundColor Yellow
        }
        
        $previousApacheState = $apacheRunning
    }
    
    Start-Sleep -Seconds 2
}

