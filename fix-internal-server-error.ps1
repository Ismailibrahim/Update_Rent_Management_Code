# Fix Internal Server Error - Rent Management System
# This script diagnoses and fixes common issues causing Internal Server Error

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Rent Management - Error Diagnosis Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if we're in the right directory
$backendPath = "backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "ERROR: 'backend' directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Yellow
    exit 1
}

Write-Host "[1/6] Checking backend directory..." -ForegroundColor Green
Set-Location $backendPath

# Step 2: Check if .env file exists
Write-Host "[2/6] Checking .env file..." -ForegroundColor Green
if (-not (Test-Path ".env")) {
    Write-Host "WARNING: .env file not found!" -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Write-Host "Copying .env.example to .env..." -ForegroundColor Yellow
        Copy-Item ".env.example" ".env"
        Write-Host "Please edit .env file and set your database credentials!" -ForegroundColor Yellow
        Write-Host "Press any key to continue after editing .env..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    } else {
        Write-Host "ERROR: .env.example also not found!" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✓ .env file exists" -ForegroundColor Green
}

# Step 3: Find PHP executable
Write-Host "[3/6] Finding PHP executable..." -ForegroundColor Green
$phpPath = $null

# Check common Laragon PHP paths
$laragonPaths = @(
    "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe",
    "C:\laragon\bin\php\php-8.2.*\php.exe",
    "C:\laragon\bin\php\php-8.1.*\php.exe"
)

# Try to find PHP in Laragon
foreach ($path in $laragonPaths) {
    if ($path -like "*.*") {
        # Handle wildcards
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

# Check if PHP is in PATH
if (-not $phpPath) {
    $phpPath = Get-Command php -ErrorAction SilentlyContinue
    if ($phpPath) {
        $phpPath = $phpPath.Source
    }
}

if (-not $phpPath -or -not (Test-Path $phpPath)) {
    Write-Host "ERROR: PHP executable not found!" -ForegroundColor Red
    Write-Host "Please install PHP or add it to your PATH." -ForegroundColor Yellow
    Write-Host "Or update this script with your PHP path." -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Found PHP at: $phpPath" -ForegroundColor Green

# Step 4: Check database connection
Write-Host "[4/6] Checking database connection..." -ForegroundColor Green
$dbCheck = & $phpPath artisan db:show 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Could not verify database connection" -ForegroundColor Yellow
    Write-Host "Make sure MySQL is running in Laragon and .env has correct credentials" -ForegroundColor Yellow
} else {
    Write-Host "✓ Database connection OK" -ForegroundColor Green
}

# Step 5: Clear Laravel caches
Write-Host "[5/6] Clearing Laravel caches..." -ForegroundColor Green
& $phpPath artisan config:clear 2>&1 | Out-Null
& $phpPath artisan cache:clear 2>&1 | Out-Null
& $phpPath artisan route:clear 2>&1 | Out-Null
& $phpPath artisan view:clear 2>&1 | Out-Null
Write-Host "✓ Caches cleared" -ForegroundColor Green

# Step 6: Run migrations
Write-Host "[6/6] Running database migrations..." -ForegroundColor Green
Write-Host "This will create all missing tables including 'nationalities'..." -ForegroundColor Yellow
Write-Host ""

$migrateOutput = & $phpPath artisan migrate --force 2>&1
$migrateExitCode = $LASTEXITCODE

if ($migrateExitCode -eq 0) {
    Write-Host "✓ Migrations completed successfully!" -ForegroundColor Green
} else {
    Write-Host "ERROR: Migrations failed!" -ForegroundColor Red
    Write-Host "Migration output:" -ForegroundColor Yellow
    Write-Host $migrateOutput
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "1. Database doesn't exist - Create it first: CREATE DATABASE rent_management;" -ForegroundColor Yellow
    Write-Host "2. Wrong database credentials in .env file" -ForegroundColor Yellow
    Write-Host "3. MySQL service not running in Laragon" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start the Laravel server: php artisan serve" -ForegroundColor White
Write-Host "2. Or access via Laragon virtual host" -ForegroundColor White
Write-Host "3. Check the application in your browser" -ForegroundColor White
Write-Host ""
Write-Host "If you still see errors, check:" -ForegroundColor Yellow
Write-Host "- storage/logs/laravel.log for detailed error messages" -ForegroundColor White
Write-Host "- Make sure APP_KEY is set in .env (run: php artisan key:generate)" -ForegroundColor White
Write-Host ""


