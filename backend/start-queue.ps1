# Laravel Queue Worker Process Manager for Windows
# This script automatically restarts the queue worker if it crashes

$ErrorActionPreference = "Continue"
$script:RestartCount = 0
$script:MaxRestarts = 10
$script:RestartDelay = 5

function Start-QueueWorker {
    param(
        [int]$MaxRestarts = 10,
        [int]$RestartDelay = 5,
        [int]$Tries = 1
    )

    $script:MaxRestarts = $MaxRestarts
    $script:RestartDelay = $RestartDelay

    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Laravel Queue Worker Process Manager" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Queue worker will auto-restart on crash" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""

    while ($script:RestartCount -lt $script:MaxRestarts) {
        try {
            $script:RestartCount++
            
            if ($script:RestartCount -gt 1) {
                Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Restarting queue worker (Attempt $script:RestartCount/$script:MaxRestarts)..." -ForegroundColor Yellow
                Start-Sleep -Seconds $script:RestartDelay
            } else {
                Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Starting queue worker..." -ForegroundColor Green
            }

            # Change to backend directory
            $backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
            Set-Location $backendDir

            # Start the queue worker
            Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Queue worker running..." -ForegroundColor Green
            Write-Host ""

            # Run php artisan queue:listen with error handling
            $process = Start-Process -FilePath "php" -ArgumentList "artisan", "queue:listen", "--tries=$Tries" -NoNewWindow -PassThru -RedirectStandardOutput "$backendDir\storage\logs\queue-worker.log" -RedirectStandardError "$backendDir\storage\logs\queue-worker-error.log"

            # Wait for process to exit
            $process.WaitForExit()
            
            $exitCode = $process.ExitCode
            
            if ($exitCode -eq 0) {
                Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Queue worker stopped normally (Exit code: $exitCode)" -ForegroundColor Green
                break
            } else {
                Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Queue worker crashed (Exit code: $exitCode)" -ForegroundColor Red
                
                # Log the error
                if (Test-Path "$backendDir\storage\logs\queue-worker-error.log") {
                    $errorContent = Get-Content "$backendDir\storage\logs\queue-worker-error.log" -Tail 20
                    Write-Host "Last error output:" -ForegroundColor Red
                    $errorContent | ForEach-Object { Write-Host $_ -ForegroundColor Red }
                }
            }

        } catch {
            Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Error starting queue worker: $_" -ForegroundColor Red
        }

        if ($script:RestartCount -ge $script:MaxRestarts) {
            Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Maximum restart attempts reached ($script:MaxRestarts). Stopping." -ForegroundColor Red
            break
        }
    }
}

# Handle Ctrl+C gracefully
$null = Register-EngineEvent PowerShell.Exiting -Action {
    Write-Host "`n[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Shutting down..." -ForegroundColor Yellow
}

# Start the queue worker
Start-QueueWorker

