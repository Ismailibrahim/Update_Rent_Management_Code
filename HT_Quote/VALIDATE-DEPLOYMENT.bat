@echo off
echo ========================================
echo   DEPLOYMENT VALIDATION
echo ========================================
echo.

set ERRORS=0

echo Checking prerequisites...
where php >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PHP not found
    set /a ERRORS+=1
) else (
    echo ✅ PHP found
)

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found
    set /a ERRORS+=1
) else (
    echo ✅ Node.js found
)

where composer >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Composer not found (will use vendor/bin/composer)
) else (
    echo ✅ Composer found
)

echo.
echo Checking project structure...
if exist "quotation-system" (
    echo ✅ Backend directory found
) else (
    echo ❌ Backend directory missing
    set /a ERRORS+=1
)

if exist "quotation-frontend" (
    echo ✅ Frontend directory found
) else (
    echo ❌ Frontend directory missing
    set /a ERRORS+=1
)

echo.
echo Checking configuration files...
if exist "DEPLOY.bat" (
    echo ✅ Deployment script found
) else (
    echo ❌ DEPLOY.bat missing
    set /a ERRORS+=1
)

if exist "quotation-system\env.production.example" (
    echo ✅ Backend env template found
) else (
    echo ⚠️  Backend env template missing
)

echo.
if %ERRORS% equ 0 (
    echo ========================================
    echo   ✅ ALL CHECKS PASSED
    echo   Ready to deploy!
    echo ========================================
    echo.
    echo Run: DEPLOY.bat
) else (
    echo ========================================
    echo   ❌ %ERRORS% ERRORS FOUND
    echo   Please fix issues before deploying
    echo ========================================
    exit /b 1
)

pause

