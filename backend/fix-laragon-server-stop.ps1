# Comprehensive Fix for Laragon Server Stop Issues
# This script addresses common causes of php artisan serve stopping in Laragon

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Laragon Server Stop Fix" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$phpIniPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.ini"

# 1. Fix OPcache for CLI
Write-Host "1. Fixing OPcache settings..." -ForegroundColor Yellow
if (Test-Path $phpIniPath) {
    $content = Get-Content $phpIniPath -Raw
    
    # Uncomment and set opcache.enable_cli=0
    $content = $content -replace ';opcache\.enable_cli=\d+', 'opcache.enable_cli=0'
    $content = $content -replace 'opcache\.enable_cli=1', 'opcache.enable_cli=0'
    
    # If the setting doesn't exist, add it
    if ($content -notmatch 'opcache\.enable_cli') {
        $content = $content -replace '(\[opcache\])', "`$1`nopcache.enable_cli=0"
    }
    
    Set-Content -Path $phpIniPath -Value $content -NoNewline
    Write-Host "   ✓ OPcache CLI disabled" -ForegroundColor Green
} else {
    Write-Host "   ⚠ PHP.ini not found at expected path" -ForegroundColor Yellow
    Write-Host "   Please manually edit php.ini and set: opcache.enable_cli=0" -ForegroundColor Yellow
}

# 2. Increase PHP memory and execution time
Write-Host "`n2. Checking PHP memory and timeout settings..." -ForegroundColor Yellow
if (Test-Path $phpIniPath) {
    $content = Get-Content $phpIniPath -Raw
    
    # Increase memory limit if too low
    if ($content -match 'memory_limit\s*=\s*(\d+)M') {
        $currentLimit = [int]$matches[1]
        if ($currentLimit -lt 256) {
            $content = $content -replace 'memory_limit\s*=\s*\d+M', 'memory_limit=256M'
            Write-Host "   ✓ Memory limit increased to 256M" -ForegroundColor Green
        } else {
            Write-Host "   ✓ Memory limit is adequate ($currentLimit MB)" -ForegroundColor Green
        }
    }
    
    # Increase max execution time
    $content = $content -replace 'max_execution_time\s*=\s*\d+', 'max_execution_time=0'
    if ($content -notmatch 'max_execution_time\s*=') {
        $content = $content -replace '(\[PHP\])', "`$1`nmax_execution_time=0"
    }
    
    Set-Content -Path $phpIniPath -Value $content -NoNewline
    Write-Host "   ✓ Max execution time set to unlimited" -ForegroundColor Green
}

# 3. Clear Laravel caches
Write-Host "`n3. Clearing Laravel caches..." -ForegroundColor Yellow
$cacheCommands = @(
    "php artisan config:clear",
    "php artisan cache:clear",
    "php artisan route:clear",
    "php artisan view:clear"
)

foreach ($cmd in $cacheCommands) {
    try {
        $result = Invoke-Expression $cmd 2>&1
        Write-Host "   ✓ $($cmd -replace 'php artisan ', '')" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠ Could not run: $cmd" -ForegroundColor Yellow
    }
}

# 4. Regenerate autoloader
Write-Host "`n4. Regenerating Composer autoloader..." -ForegroundColor Yellow
try {
    composer dump-autoload 2>&1 | Out-Null
    Write-Host "   ✓ Autoloader regenerated" -ForegroundColor Green
} catch {
    Write-Host "   ⚠ Could not regenerate autoloader" -ForegroundColor Yellow
}

# 5. Check for port conflicts
Write-Host "`n5. Checking port 8000..." -ForegroundColor Yellow
$port8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port8000) {
    Write-Host "   ⚠ Port 8000 is in use by PID: $($port8000.OwningProcess)" -ForegroundColor Yellow
    $process = Get-Process -Id $port8000.OwningProcess -ErrorAction SilentlyContinue
    if ($process -and $process.ProcessName -eq "php") {
        Write-Host "   ✓ Port is used by PHP (this is normal if server is running)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ Port is used by another process - you may need to stop it" -ForegroundColor Red
    }
} else {
    Write-Host "   ✓ Port 8000 is available" -ForegroundColor Green
}

# 6. Create improved start script with auto-restart
Write-Host "`n6. Creating improved server start script..." -ForegroundColor Yellow
$startScript = @"
# Laragon-Optimized Server Start Script
# Auto-restarts on crash with better error handling

`$ErrorActionPreference = "Continue"
`$script:RestartCount = 0
`$script:MaxRestarts = 999
`$script:RestartDelay = 3

function Start-LaravelServer {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Starting Laravel Server (Laragon)" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Server: http://127.0.0.1:8000" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""

    while (`$script:RestartCount -lt `$script:MaxRestarts) {
        try {
            `$script:RestartCount++
            
            if (`$script:RestartCount -gt 1) {
                Write-Host "[`$(Get-Date -Format 'HH:mm:ss')] Restarting... (Attempt `$script:RestartCount)" -ForegroundColor Yellow
                Start-Sleep -Seconds `$script:RestartDelay
            }

            # Change to backend directory
            Set-Location "`$PSScriptRoot"

            # Start server with explicit PHP path (Laragon)
            `$phpPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"
            if (-not (Test-Path `$phpPath)) {
                # Try to find PHP in Laragon
                `$laragonPhp = Get-ChildItem "C:\laragon\bin\php" -Filter "php.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                if (`$laragonPhp) {
                    `$phpPath = `$laragonPhp.FullName
                } else {
                    `$phpPath = "php"
                }
            }

            Write-Host "[`$(Get-Date -Format 'HH:mm:ss')] Starting server..." -ForegroundColor Green
            
            # Run with explicit error handling
            `$process = Start-Process -FilePath `$phpPath -ArgumentList "artisan", "serve", "--port=8000" -NoNewWindow -PassThru
            
            # Wait for process
            `$process.WaitForExit()
            
            `$exitCode = `$process.ExitCode
            
            if (`$exitCode -eq 0) {
                Write-Host "[`$(Get-Date -Format 'HH:mm:ss')] Server stopped normally" -ForegroundColor Green
                break
            } else {
                Write-Host "[`$(Get-Date -Format 'HH:mm:ss')] Server exited with code: `$exitCode" -ForegroundColor Red
            }

        } catch {
            Write-Host "[`$(Get-Date -Format 'HH:mm:ss')] Error: `$_" -ForegroundColor Red
        }

        if (`$script:RestartCount -ge `$script:MaxRestarts) {
            Write-Host "Maximum restart attempts reached" -ForegroundColor Red
            break
        }
    }
}

Start-LaravelServer
"@

Set-Content -Path "start-laragon-server.ps1" -Value $startScript
Write-Host "   ✓ Created start-laragon-server.ps1" -ForegroundColor Green

# 7. Recommendations
Write-Host "`n7. Additional Recommendations:" -ForegroundColor Yellow
Write-Host "   • Disable Windows sleep/hibernate while developing" -ForegroundColor Cyan
Write-Host "   • Add project folder to Windows Defender exclusions" -ForegroundColor Cyan
Write-Host "   • Ensure MySQL is running in Laragon" -ForegroundColor Cyan
Write-Host "   • Check Laragon settings for auto-stop features" -ForegroundColor Cyan
Write-Host "   • Use the new start-laragon-server.ps1 script" -ForegroundColor Cyan

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Fix Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your terminal" -ForegroundColor White
Write-Host "2. Run: .\start-laragon-server.ps1" -ForegroundColor White
Write-Host "3. Monitor the server - it will auto-restart on crashes" -ForegroundColor White
Write-Host ""

