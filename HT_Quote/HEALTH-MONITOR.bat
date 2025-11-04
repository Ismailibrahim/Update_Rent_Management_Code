@echo off
title Quotation System - Health Monitor
color 0E

echo ========================================
echo  QUOTATION SYSTEM HEALTH MONITOR
echo ========================================
echo.

:monitor_loop
echo [%date% %time%] Checking system health...
echo.

REM Check Backend
echo 🔍 Backend (Laravel)...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -Method GET -TimeoutSec 5; Write-Host '✅ Backend: ' $response.StatusCode ' - ' $response.Content } catch { Write-Host '❌ Backend: ' $_.Exception.Message }"

REM Check Frontend
echo 🔍 Frontend (Next.js)...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -Method GET -TimeoutSec 5; Write-Host '✅ Frontend: ' $response.StatusCode } catch { Write-Host '❌ Frontend: ' $_.Exception.Message }"

REM Check Nginx
echo 🔍 Nginx (Reverse Proxy)...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8080/api/health' -Method GET -TimeoutSec 5; Write-Host '✅ Nginx: ' $response.StatusCode ' - ' $response.Content } catch { Write-Host '❌ Nginx: ' $_.Exception.Message }"

echo.
echo ⏳ Waiting 30 seconds before next check...
echo Press Ctrl+C to stop monitoring
echo.

timeout /t 30 /nobreak >nul
goto monitor_loop







