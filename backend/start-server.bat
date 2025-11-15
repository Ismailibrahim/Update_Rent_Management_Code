@echo off
echo Starting Laravel Development Server...
echo.
echo Server will be available at: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
cd /d "%~dp0"
php artisan serve

