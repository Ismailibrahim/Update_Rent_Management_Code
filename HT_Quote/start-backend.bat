@echo off
echo Starting Laravel Backend Server...
cd /d "D:\Sandbox\HT_Quote\quotation-system"
"C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe" artisan serve --host=0.0.0.0 --port=8000