# Quick Composer Install Script using Laragon's PHP
# This script uses Laragon's PHP directly

$phpPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"

if (-Not (Test-Path $phpPath)) {
    Write-Host "Error: PHP not found at $phpPath" -ForegroundColor Red
    Write-Host "Please check your Laragon installation path." -ForegroundColor Yellow
    exit 1
}

Write-Host "Using PHP from: $phpPath" -ForegroundColor Green
Write-Host "Running composer install..." -ForegroundColor Yellow
Write-Host ""

# Use PHP directly with composer
& $phpPath composer install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[OK] Composer dependencies installed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[ERROR] Composer install failed. Check the output above." -ForegroundColor Red
}

