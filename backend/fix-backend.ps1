# Script to fix backend server issues after code modifications
# Run this whenever the backend stops after code changes

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Backend Server Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Clear Laravel caches
Write-Host "Step 1: Clearing Laravel caches..." -ForegroundColor Yellow
try {
    # Try to find PHP executable
    $phpPath = $null
    $possiblePaths = @(
        "C:\laragon\bin\php\php-8.3.0-Win32-vs16-x64\php.exe",
        "C:\laragon\bin\php\php-8.2.0-Win32-vs16-x64\php.exe",
        "C:\xampp\php\php.exe",
        "php"
    )
    
    foreach ($path in $possiblePaths) {
        if (Get-Command $path -ErrorAction SilentlyContinue) {
            $phpPath = $path
            break
        }
    }
    
    if ($phpPath) {
        & $phpPath artisan config:clear 2>&1 | Out-Null
        & $phpPath artisan cache:clear 2>&1 | Out-Null
        & $phpPath artisan route:clear 2>&1 | Out-Null
        & $phpPath artisan view:clear 2>&1 | Out-Null
        Write-Host "  ✓ Caches cleared" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ PHP not found, skipping cache clear" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ Could not clear caches: $_" -ForegroundColor Yellow
}

# Step 2: Regenerate Composer autoloader
Write-Host "Step 2: Regenerating Composer autoloader..." -ForegroundColor Yellow
try {
    if (Get-Command composer -ErrorAction SilentlyContinue) {
        composer dump-autoload 2>&1 | Out-Null
        Write-Host "  ✓ Autoloader regenerated" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Composer not found, skipping autoloader regeneration" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ⚠ Could not regenerate autoloader: $_" -ForegroundColor Yellow
}

# Step 3: Check for syntax errors
Write-Host "Step 3: Checking for syntax errors..." -ForegroundColor Yellow
if (Test-Path "check-syntax.ps1") {
    try {
        & .\check-syntax.ps1
    } catch {
        Write-Host "  ⚠ Could not run syntax check: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠ Syntax check script not found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fix complete! You can now restart the server." -ForegroundColor Green
Write-Host "Run: .\start-server.ps1" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan

