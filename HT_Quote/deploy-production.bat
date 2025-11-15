@echo off
echo ========================================
echo  Production Deployment Script
echo  Quotation Management System
echo ========================================
echo.

set DEPLOY_DIR=D:\Sandbox\HT_Quote
set BACKEND_DIR=%DEPLOY_DIR%\quotation-system
set FRONTEND_DIR=%DEPLOY_DIR%\quotation-frontend
set NGINX_DIR=C:\laragon\bin\nginx\nginx-1.27.3

echo 🔍 Checking prerequisites...
echo.

REM Check if directories exist
if not exist "%BACKEND_DIR%" (
    echo ❌ Backend directory not found: %BACKEND_DIR%
    exit /b 1
)

if not exist "%FRONTEND_DIR%" (
    echo ❌ Frontend directory not found: %FRONTEND_DIR%
    exit /b 1
)

echo ✅ Directories found
echo.

echo 🛑 Stopping existing services...
taskkill /f /im nginx.exe 2>nul
taskkill /f /im node.exe 2>nul
taskkill /f /im php.exe 2>nul
timeout /t 3 /nobreak >nul
echo ✅ Services stopped
echo.

echo 🔧 Backend Production Setup...
cd /d "%BACKEND_DIR%"

REM Copy production environment
if exist "env.production.example" (
    copy "env.production.example" ".env" >nul
    echo ✅ Production environment configured
) else (
    echo ⚠️  Production environment file not found, using existing .env
)

REM Install/update dependencies
echo Installing PHP dependencies...
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe composer install --no-dev --optimize-autoloader
if %errorlevel% neq 0 (
    echo ❌ Failed to install PHP dependencies
    exit /b 1
)

REM Clear and cache configurations
echo Optimizing Laravel...
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan config:cache
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan route:cache
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan view:cache
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan event:cache

REM Run migrations
echo Running database migrations...
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan migrate --force

REM Seed database if needed
echo Seeding database...
C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan db:seed --force

echo ✅ Backend production setup complete
echo.

echo 🔧 Frontend Production Setup...
cd /d "%FRONTEND_DIR%"

REM Install dependencies
echo Installing Node.js dependencies...
call npm ci --production
if %errorlevel% neq 0 (
    echo ❌ Failed to install Node.js dependencies
    exit /b 1
)

REM Build for production
echo Building Next.js application...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Failed to build Next.js application
    exit /b 1
)

echo ✅ Frontend production setup complete
echo.

echo 🚀 Starting Production Services...
echo.

REM Start Laravel backend
echo Starting Laravel backend...
start "Backend - Laravel Production" cmd /k "cd /d %BACKEND_DIR% && C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan serve --host=0.0.0.0 --port=8000"
timeout /t 5 /nobreak >nul

REM Start Next.js frontend
echo Starting Next.js frontend...
start "Frontend - Next.js Production" cmd /k "cd /d %FRONTEND_DIR% && npm start"
timeout /t 5 /nobreak >nul

REM Start Nginx
echo Starting Nginx reverse proxy...
start "Nginx - Production" cmd /k "cd /d %DEPLOY_DIR% && %NGINX_DIR%\nginx.exe -c %DEPLOY_DIR%\nginx-production-optimized.conf"
timeout /t 3 /nobreak >nul

echo.
echo 🔍 Testing Production Setup...
echo.

REM Test services
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -Method GET -TimeoutSec 5; Write-Host '✅ Backend: ' $response.StatusCode } catch { Write-Host '❌ Backend: ' $_.Exception.Message }"
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -Method GET -TimeoutSec 5; Write-Host '✅ Frontend: ' $response.StatusCode } catch { Write-Host '❌ Frontend: ' $_.Exception.Message }"
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8080/api/health' -Method GET -TimeoutSec 5; Write-Host '✅ Nginx API: ' $response.StatusCode } catch { Write-Host '❌ Nginx API: ' $_.Exception.Message }"

echo.
echo ========================================
echo  🎉 Production Deployment Complete!
echo ========================================
echo.
echo 📊 Production URLs:
echo   Main App (Nginx):     http://localhost:8080
echo   API Health:           http://localhost:8080/api/health
echo   Direct Backend:       http://127.0.0.1:8000
echo   Direct Frontend:      http://localhost:3000
echo.
echo 🔐 Login Credentials:
echo   Username: admin
echo   Password: password
echo.
echo 💡 Production Features:
echo   ✅ Optimized Laravel (cached configs)
echo   ✅ Optimized Next.js (production build)
echo   ✅ Nginx reverse proxy
echo   ✅ Security headers
echo   ✅ Rate limiting
echo   ✅ Gzip compression
echo   ✅ SSL ready
echo.
echo Press any key to close...
pause >nul
