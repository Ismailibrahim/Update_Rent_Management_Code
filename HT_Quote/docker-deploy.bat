@echo off
REM Docker Deployment Script for Windows
REM Usage: docker-deploy.bat [production|development]

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=production

set COMPOSE_FILE=docker-compose.yml
if "%ENVIRONMENT%"=="production" set COMPOSE_FILE=docker-compose.production.yml

echo.
echo 🚀 Deploying Quotation Management System (%ENVIRONMENT%)
echo Using compose file: %COMPOSE_FILE%
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker Desktop first.
    exit /b 1
)

echo 📋 Step 1: Stopping existing containers...
docker compose -f %COMPOSE_FILE% down

echo.
echo 🔨 Step 2: Building Docker images...
docker compose -f %COMPOSE_FILE% build --no-cache

echo.
echo 🚀 Step 3: Starting services...
docker compose -f %COMPOSE_FILE% up -d

echo.
echo ⏳ Step 4: Waiting for services to be healthy...
timeout /t 10 /nobreak >nul

echo.
echo 📊 Step 5: Checking service status...
docker compose -f %COMPOSE_FILE% ps

echo.
if "%ENVIRONMENT%"=="production" (
    echo 🗄️  Step 6: Running database migrations...
    docker compose -f %COMPOSE_FILE% exec -T backend php artisan migrate --force || echo ⚠️  Migration failed or already run
    
    echo.
    echo 🔑 Step 7: Generating application key (if needed)...
    docker compose -f %COMPOSE_FILE% exec -T backend php artisan key:generate --ansi || echo ⚠️  Key already exists
    
    echo.
    echo 💾 Step 8: Caching configuration...
    docker compose -f %COMPOSE_FILE% exec -T backend php artisan config:cache || echo.
    docker compose -f %COMPOSE_FILE% exec -T backend php artisan route:cache || echo.
    docker compose -f %COMPOSE_FILE% exec -T backend php artisan view:cache || echo.
)

echo.
echo ✅ Deployment complete!
echo.
echo 📝 Service URLs:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:8000
echo    Nginx (Production): http://localhost:80
echo.
echo 📋 Useful commands:
echo    View logs: docker compose -f %COMPOSE_FILE% logs -f
echo    Stop services: docker compose -f %COMPOSE_FILE% down
echo    Restart: docker compose -f %COMPOSE_FILE% restart
echo.

