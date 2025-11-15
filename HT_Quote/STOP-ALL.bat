@echo off
title Quotation System - Stop All Services
color 0C

echo ========================================
echo  QUOTATION SYSTEM - STOP ALL SERVICES
echo ========================================
echo.

echo 🛑 Stopping all services...
echo.

echo Stopping Nginx...
taskkill /f /im nginx.exe 2>nul
if %errorLevel% == 0 (
    echo ✅ Nginx stopped
) else (
    echo ℹ️  Nginx was not running
)

echo Stopping Node.js processes...
taskkill /f /im node.exe 2>nul
if %errorLevel% == 0 (
    echo ✅ Node.js processes stopped
) else (
    echo ℹ️  Node.js processes were not running
)

echo Stopping PHP processes...
taskkill /f /im php.exe 2>nul
if %errorLevel% == 0 (
    echo ✅ PHP processes stopped
) else (
    echo ℹ️  PHP processes were not running
)

echo.
echo ========================================
echo  All services stopped successfully!
echo ========================================
echo.
echo Press any key to close...
pause >nul







