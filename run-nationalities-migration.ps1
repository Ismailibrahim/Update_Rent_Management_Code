# Run Nationalities Migration
# This script runs the migration to create the nationalities table

Write-Host "Running nationalities migration..." -ForegroundColor Cyan

# Navigate to backend directory
$backendPath = Join-Path $PSScriptRoot "backend"
Set-Location $backendPath

Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow

# Try to find PHP in common locations
$phpPaths = @(
    "C:\laragon\bin\php\php-8.2.0\php.exe",
    "C:\laragon\bin\php\php-8.3.0\php.exe",
    "C:\laragon\bin\php\php-8.1.0\php.exe",
    "C:\xampp\php\php.exe",
    "C:\wamp64\bin\php\php8.2.0\php.exe",
    "C:\wamp64\bin\php\php8.3.0\php.exe"
)

$phpFound = $false

# Check if php is in PATH
if (Get-Command php -ErrorAction SilentlyContinue) {
    Write-Host "Using PHP from PATH" -ForegroundColor Green
    php artisan migrate
    $phpFound = $true
} else {
    # Try common PHP locations
    foreach ($phpPath in $phpPaths) {
        if (Test-Path $phpPath) {
            Write-Host "Found PHP at: $phpPath" -ForegroundColor Green
            & $phpPath artisan migrate
            $phpFound = $true
            break
        }
    }
}

if (-not $phpFound) {
    Write-Host "`nPHP not found in PATH or common locations." -ForegroundColor Red
    Write-Host "Please run the migration manually:" -ForegroundColor Yellow
    Write-Host "  1. Open Laragon Terminal or Command Prompt" -ForegroundColor Yellow
    Write-Host "  2. Navigate to: $backendPath" -ForegroundColor Yellow
    Write-Host "  3. Run: php artisan migrate" -ForegroundColor Yellow
    Write-Host "`nOr add PHP to your system PATH." -ForegroundColor Yellow
}

