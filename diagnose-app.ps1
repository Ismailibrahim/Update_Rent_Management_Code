# Comprehensive Application Diagnostic Script
# This script checks all aspects of the application to identify issues

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Rent Management - Full Diagnostic" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$backendPath = "backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "ERROR: 'backend' directory not found!" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath

# Find PHP
Write-Host "[1/10] Finding PHP..." -ForegroundColor Green
$phpPath = $null
$laragonPaths = @(
    "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe",
    "C:\laragon\bin\php\php-8.2.*\php.exe"
)

foreach ($path in $laragonPaths) {
    if ($path -like "*.*") {
        $found = Get-ChildItem -Path (Split-Path $path) -Filter "php.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $phpPath = $found.FullName
            break
        }
    } elseif (Test-Path $path) {
        $phpPath = $path
        break
    }
}

if (-not $phpPath) {
    $phpPath = Get-Command php -ErrorAction SilentlyContinue
    if ($phpPath) { $phpPath = $phpPath.Source }
}

if (-not $phpPath -or -not (Test-Path $phpPath)) {
    Write-Host "ERROR: PHP not found!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ PHP found: $phpPath" -ForegroundColor Green

# Check .env
Write-Host "[2/10] Checking .env file..." -ForegroundColor Green
if (-not (Test-Path ".env")) {
    Write-Host "✗ .env file missing!" -ForegroundColor Red
} else {
    Write-Host "✓ .env exists" -ForegroundColor Green
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "DB_DATABASE=(\w+)") {
        $dbName = $matches[1]
        Write-Host "  Database: $dbName" -ForegroundColor Yellow
        if ($dbName -eq "laravel") {
            Write-Host "  WARNING: Database is 'laravel', should be 'rent_management'!" -ForegroundColor Yellow
        }
    }
    if ($envContent -notmatch "APP_KEY=base64:") {
        Write-Host "  WARNING: APP_KEY may not be set!" -ForegroundColor Yellow
    }
}

# Check database connection
Write-Host "[3/10] Testing database connection..." -ForegroundColor Green
try {
    $dbTest = & $phpPath artisan db:show 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database connection OK" -ForegroundColor Green
    } else {
        Write-Host "✗ Database connection failed" -ForegroundColor Red
        Write-Host $dbTest
    }
} catch {
    Write-Host "✗ Could not test database" -ForegroundColor Red
}

# Check migrations
Write-Host "[4/10] Checking migration status..." -ForegroundColor Green
try {
    $migrateStatus = & $phpPath artisan migrate:status 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Migrations accessible" -ForegroundColor Green
        $pending = ($migrateStatus | Select-String "Pending").Count
        if ($pending -gt 0) {
            Write-Host "  WARNING: $pending pending migrations!" -ForegroundColor Yellow
        }
    } else {
        Write-Host "✗ Could not check migrations" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Migration check failed" -ForegroundColor Red
}

# Check if nationalities table exists
Write-Host "[5/10] Checking if nationalities table exists..." -ForegroundColor Green
try {
    $tableCheck = & $phpPath artisan tinker --execute="echo Schema::hasTable('nationalities') ? 'exists' : 'missing';" 2>&1
    if ($tableCheck -match "exists") {
        Write-Host "✓ Nationalities table exists" -ForegroundColor Green
    } elseif ($tableCheck -match "missing") {
        Write-Host "✗ Nationalities table MISSING!" -ForegroundColor Red
        Write-Host "  This is likely causing the Internal Server Error!" -ForegroundColor Yellow
    } else {
        Write-Host "? Could not determine table status" -ForegroundColor Yellow
    }
} catch {
    Write-Host "? Could not check table (tinker may not be available)" -ForegroundColor Yellow
}

# Check recent errors in log
Write-Host "[6/10] Checking recent errors in log..." -ForegroundColor Green
if (Test-Path "storage\logs\laravel.log") {
    $recentErrors = Get-Content "storage\logs\laravel.log" -Tail 100 | Select-String -Pattern "ERROR|Exception|Fatal" -CaseSensitive:$false
    if ($recentErrors) {
        Write-Host "✗ Found recent errors:" -ForegroundColor Red
        $recentErrors | Select-Object -First 5 | ForEach-Object {
            $line = $_.ToString()
            if ($line -match "Table.*doesn`'t exist") {
                Write-Host "  - Missing table error detected" -ForegroundColor Yellow
            } elseif ($line -match "Connection.*refused|Access denied") {
                Write-Host "  - Database connection error" -ForegroundColor Yellow
            } else {
                Write-Host "  - $($line.Substring(0, [Math]::Min(80, $line.Length)))" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "✓ No recent errors in log" -ForegroundColor Green
    }
} else {
    Write-Host "? Log file not found" -ForegroundColor Yellow
}

# Check APP_KEY
Write-Host "[7/10] Checking APP_KEY..." -ForegroundColor Green
$config = & $phpPath artisan config:show app.key 2>&1
if ($config -match "base64:") {
    Write-Host "✓ APP_KEY is set" -ForegroundColor Green
} else {
    Write-Host "✗ APP_KEY is NOT set!" -ForegroundColor Red
    Write-Host "  Run: php artisan key:generate" -ForegroundColor Yellow
}

# Check storage permissions
Write-Host "[8/10] Checking storage permissions..." -ForegroundColor Green
$storageWritable = Test-Path "storage" -PathType Container
$cacheWritable = Test-Path "bootstrap\cache" -PathType Container
if ($storageWritable -and $cacheWritable) {
    Write-Host "✓ Storage directories exist" -ForegroundColor Green
} else {
    Write-Host "✗ Storage directory issues" -ForegroundColor Red
}

# Check routes
Write-Host "[9/10] Checking routes..." -ForegroundColor Green
try {
    $routes = & $phpPath artisan route:list --path=api 2>&1 | Select-Object -First 5
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Routes loaded" -ForegroundColor Green
    } else {
        Write-Host "? Could not list routes" -ForegroundColor Yellow
    }
} catch {
    Write-Host "? Route check failed" -ForegroundColor Yellow
}

# Check vendor
Write-Host "[10/10] Checking vendor directory..." -ForegroundColor Green
if (Test-Path "vendor\autoload.php") {
    Write-Host "✓ Vendor directory exists" -ForegroundColor Green
} else {
    Write-Host "✗ Vendor directory missing! Run: composer install" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Diagnostic Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. If nationalities table is missing, run: php artisan migrate" -ForegroundColor White
Write-Host "2. If APP_KEY is missing, run: php artisan key:generate" -ForegroundColor White
Write-Host "3. If database name is wrong, edit .env file" -ForegroundColor White
Write-Host "4. Clear caches: php artisan config:clear && php artisan cache:clear" -ForegroundColor White
Write-Host ""

