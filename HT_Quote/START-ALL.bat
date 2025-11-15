@echo off
echo ========================================
echo  Quotation Management System
echo  Starting All Servers (TURBO MODE)
echo ========================================
echo.

echo Starting Laravel Backend on Port 8000...
start "Backend - Laravel" cmd /k "cd /d D:\Sandbox\HT_Quote\quotation-system && C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe artisan serve --port=8000"

timeout /t 2 /nobreak >nul

echo Starting Next.js Frontend with Turbopack (FAST MODE)...
start "Frontend - Next.js TURBO" cmd /k "cd /d D:\Sandbox\HT_Quote\quotation-frontend && npm run dev"

echo.
echo ========================================
echo  Servers Started in TURBO MODE!
echo ========================================
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:3000 (TURBOPACK ENABLED)
echo  Login:    http://localhost:3000/login
echo ========================================
echo.
echo TURBO MODE: 10x faster compilation!
echo First page: ~3-5 seconds
echo Subsequent: Instant
echo.
echo Press any key to close this window...
pause