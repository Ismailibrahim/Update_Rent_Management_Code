#!/bin/bash

# Docker Deployment Script
# Usage: ./docker-deploy.sh [production|development]

set -e

ENVIRONMENT=${1:-production}
COMPOSE_FILE="docker-compose.yml"

if [ "$ENVIRONMENT" = "production" ]; then
    COMPOSE_FILE="docker-compose.production.yml"
fi

echo "🚀 Deploying Quotation Management System ($ENVIRONMENT)"
echo "Using compose file: $COMPOSE_FILE"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    exit 1
fi

# Use docker compose (v2) if available, otherwise docker-compose (v1)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo "📋 Step 1: Stopping existing containers..."
$DOCKER_COMPOSE -f $COMPOSE_FILE down

echo ""
echo "🔨 Step 2: Building Docker images..."
$DOCKER_COMPOSE -f $COMPOSE_FILE build --no-cache

echo ""
echo "🚀 Step 3: Starting services..."
$DOCKER_COMPOSE -f $COMPOSE_FILE up -d

echo ""
echo "⏳ Step 4: Waiting for services to be healthy..."
sleep 10

echo ""
echo "📊 Step 5: Checking service status..."
$DOCKER_COMPOSE -f $COMPOSE_FILE ps

echo ""
if [ "$ENVIRONMENT" = "production" ]; then
    echo "🗄️  Step 6: Running database migrations..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T backend php artisan migrate --force || echo "⚠️  Migration failed or already run"
    
    echo ""
    echo "🔑 Step 7: Generating application key (if needed)..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T backend php artisan key:generate --ansi || echo "⚠️  Key already exists"
    
    echo ""
    echo "💾 Step 8: Caching configuration..."
    $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T backend php artisan config:cache || true
    $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T backend php artisan route:cache || true
    $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T backend php artisan view:cache || true
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Service URLs:"
echo "   Frontend: http://localhost:${FRONTEND_PORT:-3000}"
echo "   Backend API: http://localhost:${BACKEND_PORT:-8000}"
echo "   Nginx (Production): http://localhost:${HTTP_PORT:-80}"
echo ""
echo "📋 Useful commands:"
echo "   View logs: $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f"
echo "   Stop services: $DOCKER_COMPOSE -f $COMPOSE_FILE down"
echo "   Restart: $DOCKER_COMPOSE -f $COMPOSE_FILE restart"
echo ""

