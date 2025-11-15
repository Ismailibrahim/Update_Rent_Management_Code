@echo off
REM Laragon-compatible startup script with monitoring
REM This script starts the Laravel server and monitor in separate windows

echo ========================================
echo Starting Laravel Backend with Monitor
echo ========================================
echo.

REM Get the directory where this script is located
cd /d "%~dp0"

REM Check if PHP is available
php --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: PHP is not found in PATH
    echo Please make sure Laragon is running and PHP is in your PATH
    pause
    exit /b 1
)

echo Starting Laravel server...
start "Laravel Backend Server" cmd /k "php artisan serve"

REM Wait a moment for server to start
timeout /t 3 /nobreak >nul

echo Starting server monitor...
start "Server Monitor" powershell -ExecutionPolicy Bypass -File "%~dp0monitor-server.ps1"

echo.
echo ========================================
echo Server and monitor started!
echo ========================================
echo.
echo Server: http://localhost:8000
echo Health Check: http://localhost:8000/api/v1/health
echo.
echo Close the windows to stop the server and monitor.
echo.
pause

