# Laragon Setup Script for Rent Management System
# Run this script in PowerShell from the project root

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Laragon Setup for Rent Management" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-Not (Test-Path "backend")) {
    Write-Host "Error: backend directory not found. Please run this script from the project root." -ForegroundColor Red
    exit 1
}

# Step 1: Check if .env exists, if not create from .env.example
Write-Host "Step 1: Setting up .env file..." -ForegroundColor Yellow
$envPath = "backend\.env"
$envExamplePath = "backend\.env.example"

if (-Not (Test-Path $envPath)) {
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envPath
        Write-Host "[OK] Created .env file from .env.example" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Warning: .env.example not found. You may need to create .env manually." -ForegroundColor Yellow
    }
} else {
    Write-Host "[OK] .env file already exists" -ForegroundColor Green
}

# Step 2: Check MySQL connection
Write-Host ""
Write-Host "Step 2: Checking MySQL connection..." -ForegroundColor Yellow

# Try to find MySQL in common Laragon locations
$mysqlPaths = @(
    "C:\laragon\bin\mysql\mysql-8*\bin\mysql.exe",
    "C:\laragon\bin\mariadb\*\bin\mysql.exe",
    "mysql.exe"  # If in PATH
)

$mysqlExe = $null
foreach ($path in $mysqlPaths) {
    $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $mysqlExe = $found.FullName
        break
    }
}

if (-Not $mysqlExe) {
    Write-Host "[WARN] MySQL not found in common Laragon locations." -ForegroundColor Yellow
    Write-Host "  Please ensure MySQL is running in Laragon and create the database manually." -ForegroundColor Yellow
    Write-Host "  Database name: rent_management" -ForegroundColor Yellow
} else {
    Write-Host "[OK] Found MySQL at: $mysqlExe" -ForegroundColor Green
    
    # Try to create database
    Write-Host "  Attempting to create database 'rent_management'..." -ForegroundColor Gray
    $createDbCmd = "CREATE DATABASE IF NOT EXISTS rent_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    
    try {
        & $mysqlExe -u root -e $createDbCmd 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Database 'rent_management' created successfully" -ForegroundColor Green
        } else {
            Write-Host "[WARN] Could not create database automatically. You may need to create it manually." -ForegroundColor Yellow
            Write-Host "  Run: mysql -u root -e `"CREATE DATABASE IF NOT EXISTS rent_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`"" -ForegroundColor Gray
        }
    } catch {
        Write-Host "[WARN] Could not create database automatically: $_" -ForegroundColor Yellow
        Write-Host "  Please create the database manually using HeidiSQL or MySQL command line." -ForegroundColor Yellow
    }
}

# Step 3: Check Composer
Write-Host ""
Write-Host "Step 3: Checking Composer..." -ForegroundColor Yellow
$composerPaths = @(
    "C:\laragon\bin\composer\composer.bat",
    "composer.bat",
    "composer"
)

$composerExe = $null
foreach ($path in $composerPaths) {
    if (Test-Path $path) {
        $composerExe = $path
        break
    }
    # Try if it's in PATH
    $which = Get-Command $path -ErrorAction SilentlyContinue
    if ($which) {
        $composerExe = $which.Source
        break
    }
}

if (-Not $composerExe) {
    Write-Host "[WARN] Composer not found. Please install Composer or use Laragon's Composer." -ForegroundColor Yellow
} else {
    Write-Host "[OK] Found Composer at: $composerExe" -ForegroundColor Green
}

# Step 4: Check PHP
Write-Host ""
Write-Host "Step 4: Checking PHP..." -ForegroundColor Yellow
$phpPaths = @(
    "C:\laragon\bin\php\php-8*\php.exe",
    "php.exe"
)

$phpExe = $null
foreach ($path in $phpPaths) {
    $found = Get-ChildItem -Path $path -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $phpExe = $found.FullName
        break
    }
    # Try if it's in PATH
    $which = Get-Command $path -ErrorAction SilentlyContinue
    if ($which) {
        $phpExe = $which.Source
        break
    }
}

if (-Not $phpExe) {
    Write-Host "[WARN] PHP not found. Please ensure PHP is installed and in PATH." -ForegroundColor Yellow
} else {
    Write-Host "[OK] Found PHP at: $phpExe" -ForegroundColor Green
    $phpVersion = & $phpExe -v | Select-Object -First 1
    Write-Host "  Version: $phpVersion" -ForegroundColor Gray
}

# Step 5: Install dependencies
Write-Host ""
Write-Host "Step 5: Installing PHP dependencies..." -ForegroundColor Yellow
if ($composerExe) {
    Push-Location backend
    Write-Host "  Running: $composerExe install" -ForegroundColor Gray
    & $composerExe install
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Composer dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Composer install had issues. Please check the output above." -ForegroundColor Yellow
    }
    Pop-Location
} else {
    Write-Host "[WARN] Skipping Composer install - Composer not found" -ForegroundColor Yellow
}

# Step 6: Generate application key
Write-Host ""
Write-Host "Step 6: Generating application key..." -ForegroundColor Yellow
if ($phpExe) {
    Push-Location backend
    if (Test-Path "artisan") {
        & $phpExe artisan key:generate
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Application key generated" -ForegroundColor Green
        } else {
            Write-Host "[WARN] Could not generate application key. Run manually: php artisan key:generate" -ForegroundColor Yellow
        }
    }
    Pop-Location
} else {
    Write-Host "[WARN] Skipping key generation - PHP not found" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Ensure MySQL is running in Laragon" -ForegroundColor White
Write-Host "2. Create database if not done: rent_management" -ForegroundColor White
Write-Host "3. Navigate to backend directory: cd backend" -ForegroundColor White
Write-Host "4. Run migrations: php artisan migrate" -ForegroundColor White
Write-Host "5. (Optional) Run seeders: php artisan db:seed" -ForegroundColor White
Write-Host "6. Start server: php artisan serve" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see: LARAGON_SETUP.md" -ForegroundColor Cyan
Write-Host ""

