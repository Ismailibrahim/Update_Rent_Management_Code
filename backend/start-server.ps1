# Laravel Backend Process Manager for Windows
# This script automatically restarts the server if it crashes

$ErrorActionPreference = "Continue"
$script:RestartCount = 0
$script:MaxRestarts = 10
$script:RestartDelay = 5

function Start-BackendServer {
    param(
        [string]$Port = "8000",
        [int]$MaxRestarts = 10,
        [int]$RestartDelay = 5
    )

    $script:MaxRestarts = $MaxRestarts
    $script:RestartDelay = $RestartDelay

    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Laravel Backend Process Manager" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Server will auto-restart on crash" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""

    while ($script:RestartCount -lt $script:MaxRestarts) {
        try {
            $script:RestartCount++
            
            if ($script:RestartCount -gt 1) {
                Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Restarting server (Attempt $script:RestartCount/$script:MaxRestarts)..." -ForegroundColor Yellow
                Start-Sleep -Seconds $script:RestartDelay
            } else {
                Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Starting server..." -ForegroundColor Green
            }

            # Change to backend directory
            $backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
            Set-Location $backendDir

            # Start the server
            Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Server running on http://127.0.0.1:$Port" -ForegroundColor Green
            Write-Host ""

            # Run php artisan serve with error handling
            $process = Start-Process -FilePath "php" -ArgumentList "artisan", "serve", "--port=$Port" -NoNewWindow -PassThru -RedirectStandardOutput "$backendDir\storage\logs\artisan-serve.log" -RedirectStandardError "$backendDir\storage\logs\artisan-serve-error.log"

            # Wait for process to exit
            $process.WaitForExit()
            
            $exitCode = $process.ExitCode
            
            if ($exitCode -eq 0) {
                Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Server stopped normally (Exit code: $exitCode)" -ForegroundColor Green
                break
            } else {
                Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Server crashed (Exit code: $exitCode)" -ForegroundColor Red
                
                # Log the error
                if (Test-Path "$backendDir\storage\logs\artisan-serve-error.log") {
                    $errorContent = Get-Content "$backendDir\storage\logs\artisan-serve-error.log" -Tail 20
                    Write-Host "Last error output:" -ForegroundColor Red
                    $errorContent | ForEach-Object { Write-Host $_ -ForegroundColor Red }
                }
            }

        } catch {
            Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] Error starting server: $_" -ForegroundColor Red
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

# Check if port is provided as argument
$port = if ($args.Count -gt 0) { $args[0] } else { "8000" }

# Start the server
Start-BackendServer -Port $port

