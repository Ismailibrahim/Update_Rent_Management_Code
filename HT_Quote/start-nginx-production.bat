@echo off
echo ========================================
echo  Nginx Production Setup
echo ========================================
echo.

echo 🔍 Checking servers...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -Method GET -TimeoutSec 3; Write-Host '✅ Backend: Running' } catch { Write-Host '❌ Backend: Not running' }"
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3000' -Method GET -TimeoutSec 3; Write-Host '✅ Frontend: Running' } catch { Write-Host '❌ Frontend: Not running' }"

echo.
echo 🛑 Stopping any existing Nginx...
taskkill /f /im nginx.exe 2>nul

echo.
echo 🔧 Creating required directories...
if not exist "logs" mkdir logs
if not exist "temp" mkdir temp
if not exist "temp\client_body_temp" mkdir temp\client_body_temp

echo.
echo 🚀 Starting Nginx on port 8080...
C:\laragon\bin\nginx\nginx-1.27.3\nginx.exe -c "D:\Sandbox\HT_Quote\nginx-simple.conf"

echo ⏳ Waiting for Nginx to start...
timeout /t 5 /nobreak >nul

echo.
echo 🔍 Testing Nginx Reverse Proxy...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8080/api/health' -Method GET -TimeoutSec 5; Write-Host '✅ Nginx API: ' $response.StatusCode } catch { Write-Host '❌ Nginx API: ' $_.Exception.Message }"
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8080' -Method GET -TimeoutSec 5; Write-Host '✅ Nginx Frontend: ' $response.StatusCode } catch { Write-Host '❌ Nginx Frontend: ' $_.Exception.Message }"

echo.
echo ========================================
echo  🎉 Nginx Production Setup Complete!
echo ========================================
echo.
echo 📊 Server Status:
echo   Backend (Laravel):  http://127.0.0.1:8000
echo   Frontend (Next.js): http://localhost:3000
echo   Nginx (Reverse Proxy): http://localhost:8080
echo.
echo 🔗 Access URLs:
echo   Main App (via Nginx):     http://localhost:8080
echo   API Health (via Nginx):   http://localhost:8080/api/health
echo   Direct Backend:           http://127.0.0.1:8000/api/health
echo   Direct Frontend:          http://localhost:3000
echo.
echo 💡 Production Benefits:
echo   ✅ Single domain (no CORS)
echo   ✅ Nginx reverse proxy
echo   ✅ SSL ready (Laragon)
echo   ✅ Production scalable
echo.
echo Press any key to close...
pause >nul







