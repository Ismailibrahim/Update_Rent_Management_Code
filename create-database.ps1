# Quick Database Creation Script for Laragon
# This script creates the MySQL database for the Rent Management System

Write-Host "Creating MySQL database for Rent Management System..." -ForegroundColor Cyan
Write-Host ""

# Try to find MySQL in Laragon
$mysqlPaths = @(
    "C:\laragon\bin\mysql\mysql-8*\bin\mysql.exe",
    "C:\laragon\bin\mariadb\*\bin\mysql.exe"
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
    # Try if MySQL is in PATH
    $which = Get-Command mysql -ErrorAction SilentlyContinue
    if ($which) {
        $mysqlExe = $which.Source
    }
}

if (-Not $mysqlExe) {
    Write-Host "Error: MySQL not found. Please ensure:" -ForegroundColor Red
    Write-Host "1. Laragon is installed at C:\laragon" -ForegroundColor Yellow
    Write-Host "2. MySQL is running in Laragon" -ForegroundColor Yellow
    Write-Host "3. MySQL is added to your PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternatively, you can create the database manually:" -ForegroundColor Cyan
    Write-Host "  mysql -u root -e `"CREATE DATABASE IF NOT EXISTS rent_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`"" -ForegroundColor Gray
    exit 1
}

Write-Host "Found MySQL at: $mysqlExe" -ForegroundColor Green
Write-Host "Creating database 'rent_management'..." -ForegroundColor Yellow

# Ask for password if needed
$password = Read-Host "Enter MySQL root password (press Enter if no password)" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

$sqlCommand = "CREATE DATABASE IF NOT EXISTS rent_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

try {
    if ($passwordPlain) {
        $env:MYSQL_PWD = $passwordPlain
        & $mysqlExe -u root -e $sqlCommand
    } else {
        & $mysqlExe -u root -e $sqlCommand
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Database 'rent_management' created successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Make sure .env file exists in backend directory" -ForegroundColor Yellow
        Write-Host "2. Run: cd backend" -ForegroundColor Yellow
        Write-Host "3. Run: composer install" -ForegroundColor Yellow
        Write-Host "4. Run: php artisan key:generate" -ForegroundColor Yellow
        Write-Host "5. Run: php artisan migrate" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "[WARN] Could not create database. Please check:" -ForegroundColor Yellow
        Write-Host "  - MySQL is running in Laragon" -ForegroundColor Yellow
        Write-Host "  - Username and password are correct" -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create the database manually using HeidiSQL or MySQL command line." -ForegroundColor Yellow
}

