@echo off
REM Start only the monitor (if server is already running in Laragon)
REM This is useful if you're starting the server through Laragon's interface

echo ========================================
echo Starting Server Monitor
echo ========================================
echo.

REM Get the directory where this script is located
cd /d "%~dp0"

echo Starting server monitor...
start "Server Monitor" powershell -ExecutionPolicy Bypass -File "%~dp0monitor-server.ps1"

echo.
echo Monitor started in a new window.
echo Close the window to stop monitoring.
echo.
pause

