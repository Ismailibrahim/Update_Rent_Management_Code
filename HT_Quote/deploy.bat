@echo off
echo 🚀 Preparing Quotation Management System for Deployment...

REM Check if we're in the right directory
if not exist "quotation-system" (
    echo ❌ quotation-system directory not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

if not exist "quotation-frontend" (
    echo ❌ quotation-frontend directory not found
    echo Please run this script from the project root directory
    pause
    exit /b 1
)

echo ✅ Starting deployment preparation...

REM 1. Backend Preparation
echo.
echo 📦 Preparing Backend (Laravel)...
cd quotation-system

REM Check if .env exists
if not exist ".env" (
    echo ⚠️  .env file not found. Please create it from .env.example
    echo ⚠️  Make sure to set APP_ENV=production and APP_DEBUG=false
)

REM Install dependencies
echo ✅ Installing PHP dependencies...
"C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe" "C:\laragon\bin\composer\composer.phar" install --optimize-autoloader --no-dev

REM Generate app key if needed
echo ✅ Generating application key...
"C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe" artisan key:generate

REM Cache configurations
echo ✅ Caching configurations...
"C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe" artisan config:cache
"C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe" artisan route:cache
"C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe" artisan view:cache

cd ..

REM 2. Frontend Preparation
echo.
echo 📦 Preparing Frontend (Next.js)...
cd quotation-frontend

REM Install dependencies
echo ✅ Installing Node.js dependencies...
npm install

REM Build for production
echo ✅ Building for production...
npm run build

cd ..

REM 3. Create deployment package
echo.
echo 📦 Creating deployment package...

REM Create deployment directory
set DEPLOY_DIR=quotation-system-deployment
if exist "%DEPLOY_DIR%" rmdir /s /q "%DEPLOY_DIR%"
mkdir "%DEPLOY_DIR%"

REM Copy backend files
echo ✅ Copying backend files...
xcopy "quotation-system" "%DEPLOY_DIR%\quotation-system" /E /I /H /Y
rmdir /s /q "%DEPLOY_DIR%\quotation-system\node_modules" 2>nul
rmdir /s /q "%DEPLOY_DIR%\quotation-system\vendor" 2>nul

REM Copy frontend build
echo ✅ Copying frontend build...
xcopy "quotation-frontend" "%DEPLOY_DIR%\quotation-frontend" /E /I /H /Y
rmdir /s /q "%DEPLOY_DIR%\quotation-frontend\node_modules" 2>nul
rmdir /s /q "%DEPLOY_DIR%\quotation-frontend\.next" 2>nul

REM Copy documentation
echo ✅ Copying documentation...
copy "README.md" "%DEPLOY_DIR%\" >nul
copy "DEPLOYMENT-GUIDE.md" "%DEPLOY_DIR%\" >nul
copy "PRODUCTION-CONFIG.md" "%DEPLOY_DIR%\" >nul

REM Create deployment info
echo Quotation Management System - Deployment Package > "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo Generated on: %date% %time% >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo Version: 1.0.0 >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo. >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo Contents: >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo - quotation-system/ (Laravel Backend) >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo - quotation-frontend/ (Next.js Frontend) >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo - Documentation files >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo. >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo Next Steps: >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo 1. Upload this folder to your server >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo 2. Configure environment variables >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo 3. Set up database >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo 4. Run migrations >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo 5. Configure web server >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo. >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"
echo See DEPLOYMENT-GUIDE.md for detailed instructions. >> "%DEPLOY_DIR%\DEPLOYMENT-INFO.txt"

echo.
echo ✅ Deployment preparation completed!
echo.
echo 📁 Files created:
echo    - %DEPLOY_DIR%\ (Ready for upload)
echo.
echo 📋 Next steps:
echo    1. Upload %DEPLOY_DIR%\ folder to your server
echo    2. Extract the files
echo    3. Follow DEPLOYMENT-GUIDE.md for setup instructions
echo    4. Configure your domain and SSL certificate
echo.
echo 🌐 Recommended hosting platforms:
echo    - Frontend: Vercel (free) or Netlify (free)
echo    - Backend: Railway (free) or DigitalOcean ($5/month)
echo    - Database: Railway MySQL (free) or DigitalOcean Managed Database
echo.
echo ✅ Happy deploying! 🚀
echo.
pause











