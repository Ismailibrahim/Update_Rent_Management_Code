# Quick Application Check
Write-Host "Checking application status..." -ForegroundColor Cyan
Write-Host ""

cd backend

# Find PHP
$phpPath = $null
if (Test-Path "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe") {
    $phpPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe"
} else {
    $php = Get-Command php -ErrorAction SilentlyContinue
    if ($php) { $phpPath = $php.Source }
}

if (-not $phpPath) {
    Write-Host "ERROR: PHP not found!" -ForegroundColor Red
    exit 1
}

Write-Host "PHP: $phpPath" -ForegroundColor Green

# Check .env
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "DB_DATABASE=(.+?)[`r`n]") {
        $db = $matches[1].Trim()
        Write-Host "Database: $db" -ForegroundColor $(if ($db -eq "rent_management") { "Green" } else { "Yellow" })
    }
} else {
    Write-Host "WARNING: .env file missing!" -ForegroundColor Yellow
}

# Check for nationalities table
Write-Host ""
Write-Host "Checking nationalities table..." -ForegroundColor Cyan
$tableCheck = & $phpPath artisan tinker --execute="echo Schema::hasTable('nationalities') ? 'EXISTS' : 'MISSING';" 2>&1
if ($tableCheck -match "EXISTS") {
    Write-Host "Nationalities table: EXISTS" -ForegroundColor Green
} elseif ($tableCheck -match "MISSING") {
    Write-Host "Nationalities table: MISSING - This is the problem!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Run this to fix:" -ForegroundColor Yellow
    Write-Host "  php artisan migrate --force" -ForegroundColor White
} else {
    Write-Host "Could not check table status" -ForegroundColor Yellow
    Write-Host "Output: $tableCheck" -ForegroundColor Gray
}

# Check recent errors
Write-Host ""
Write-Host "Recent errors in log:" -ForegroundColor Cyan
if (Test-Path "storage\logs\laravel.log") {
    $errors = Get-Content "storage\logs\laravel.log" -Tail 50 | Select-String "ERROR|Exception" | Select-Object -First 3
    if ($errors) {
        $errors | ForEach-Object {
            $line = $_.ToString()
            if ($line.Length -gt 100) { $line = $line.Substring(0, 100) + "..." }
            Write-Host "  $line" -ForegroundColor Red
        }
    } else {
        Write-Host "No recent errors" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan


