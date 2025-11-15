@echo off
echo ========================================
echo  Production Monitoring Script
echo  Quotation Management System
echo ========================================
echo.

:monitor_loop
cls
echo ========================================
echo  Production System Status
echo  %date% %time%
echo ========================================
echo.

echo 🔍 Checking Services...
echo.

REM Check Backend
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -Method GET -TimeoutSec 3; Write-Host '✅ Backend (Laravel):' $response.StatusCode ' - Response Time:' $response.Headers['X-Response-Time'] } catch { Write-Host '❌ Backend (Laravel): DOWN -' $_.Exception.Message }"

REM Check Frontend
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -Method GET -TimeoutSec 3; Write-Host '✅ Frontend (Next.js):' $response.StatusCode } catch { Write-Host '❌ Frontend (Next.js): DOWN -' $_.Exception.Message }"

REM Check Nginx
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8080/api/health' -Method GET -TimeoutSec 3; Write-Host '✅ Nginx (Reverse Proxy):' $response.StatusCode } catch { Write-Host '❌ Nginx (Reverse Proxy): DOWN -' $_.Exception.Message }"

echo.
echo 📊 Process Information...
echo.

REM Check running processes
echo Backend Processes:
tasklist | findstr php.exe
echo.
echo Frontend Processes:
tasklist | findstr node.exe
echo.
echo Nginx Processes:
tasklist | findstr nginx.exe
echo.

echo 💾 System Resources...
echo.

REM Check disk space
for /f "tokens=3" %%a in ('dir /-c %~dp0 ^| find "bytes free"') do set freespace=%%a
set /a freespaceGB=%freespace% / 1073741824
echo Available Disk Space: %freespaceGB% GB

REM Check memory usage
for /f "skip=1" %%p in ('wmic os get TotalVisibleMemorySize /value') do if "%%p" neq "" set totalmem=%%p
for /f "skip=1" %%p in ('wmic os get FreePhysicalMemory /value') do if "%%p" neq "" set freemem=%%p
set /a usedmem=(%totalmem%-%freemem%)/1024
set /a totalmem=%totalmem%/1024
echo Memory Usage: %usedmem% MB / %totalmem% MB

echo.
echo 🔄 Auto-refresh in 30 seconds...
echo Press Ctrl+C to stop monitoring
echo.

timeout /t 30 /nobreak >nul
goto monitor_loop
