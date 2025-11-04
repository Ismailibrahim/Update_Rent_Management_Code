#!/bin/bash

# Production Deployment Script
# Quotation Management System

echo "=========================================="
echo "  Production Deployment Script"
echo "  Quotation Management System"
echo "=========================================="
echo

# Configuration
REPO_URL="https://github.com/Ismailibrahim/htmaldives_quote_managment.git"
DEPLOY_DIR="/var/www/quotation-system"
BACKUP_DIR="/var/backups/quotation-system"
BRANCH="master"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root"
    exit 1
fi

# Create backup
print_status "Creating backup..."
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
if [ -d "$DEPLOY_DIR" ]; then
    cp -r "$DEPLOY_DIR" "$BACKUP_DIR/$BACKUP_NAME"
    print_status "Backup created: $BACKUP_DIR/$BACKUP_NAME"
fi

# Create deployment directory if it doesn't exist
mkdir -p "$DEPLOY_DIR"
cd "$DEPLOY_DIR"

# Clone or pull latest changes
if [ -d ".git" ]; then
    print_status "Pulling latest changes from $BRANCH branch..."
    git fetch origin
    git reset --hard origin/$BRANCH
    git clean -fd
else
    print_status "Cloning repository..."
    git clone -b $BRANCH $REPO_URL .
fi

# Set proper permissions
print_status "Setting permissions..."
sudo chown -R www-data:www-data "$DEPLOY_DIR"
sudo chmod -R 755 "$DEPLOY_DIR"

# Backend Setup
print_status "Setting up Laravel backend..."
cd "$DEPLOY_DIR/quotation-system"

# Install PHP dependencies
print_status "Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader --no-interaction

# Set up environment
if [ ! -f ".env" ]; then
    print_status "Creating environment file..."
    cp .env.example .env
    print_warning "Please configure .env file with production settings"
fi

# Generate application key
print_status "Generating application key..."
php artisan key:generate --force

# Run migrations
print_status "Running database migrations..."
php artisan migrate --force

# Seed database (only if needed)
if [ "$1" = "--seed" ]; then
    print_status "Seeding database..."
    php artisan db:seed --force
fi

# Cache configurations
print_status "Optimizing Laravel..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Set storage permissions
sudo chmod -R 775 storage bootstrap/cache

# Frontend Setup
print_status "Setting up Next.js frontend..."
cd "$DEPLOY_DIR/quotation-frontend"

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
npm ci --production

# Build for production
print_status "Building Next.js application..."
npm run build

# Nginx Configuration
print_status "Configuring Nginx..."
sudo cp "$DEPLOY_DIR/nginx-production-optimized.conf" /etc/nginx/sites-available/quotation-system
sudo ln -sf /etc/nginx/sites-available/quotation-system /etc/nginx/sites-enabled/
sudo nginx -t

if [ $? -eq 0 ]; then
    print_status "Reloading Nginx..."
    sudo systemctl reload nginx
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Start Services
print_status "Starting services..."

# Start Laravel backend
sudo systemctl start quotation-backend || print_warning "Backend service not configured"

# Start Next.js frontend
sudo systemctl start quotation-frontend || print_warning "Frontend service not configured"

# Health Check
print_status "Performing health check..."
sleep 5

# Check backend
if curl -f http://localhost:8000/api/health > /dev/null 2>&1; then
    print_status "✅ Backend is running"
else
    print_warning "⚠️ Backend health check failed"
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "✅ Frontend is running"
else
    print_warning "⚠️ Frontend health check failed"
fi

# Check Nginx
if curl -f http://localhost/api/health > /dev/null 2>&1; then
    print_status "✅ Nginx reverse proxy is working"
else
    print_warning "⚠️ Nginx reverse proxy health check failed"
fi

echo
echo "=========================================="
echo "  🎉 Deployment Complete!"
echo "=========================================="
echo
echo "📊 Application URLs:"
echo "  Main App:     http://your-domain.com"
echo "  API Health:   http://your-domain.com/api/health"
echo "  Direct API:   http://your-domain.com:8000"
echo "  Direct App:   http://your-domain.com:3000"
echo
echo "🔧 Management Commands:"
echo "  View logs:    sudo journalctl -u quotation-backend -f"
echo "  Restart:      sudo systemctl restart quotation-backend"
echo "  Status:       sudo systemctl status quotation-backend"
echo
echo "📁 Deployment Directory: $DEPLOY_DIR"
echo "💾 Backup Directory: $BACKUP_DIR"
echo
