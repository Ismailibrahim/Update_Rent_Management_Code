#!/bin/bash

# Deployment Script for Quotation Management System
# Run this script to prepare the application for production deployment

echo "🚀 Preparing Quotation Management System for Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -d "quotation-system" ] || [ ! -d "quotation-frontend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Starting deployment preparation..."

# 1. Backend Preparation
echo ""
echo "📦 Preparing Backend (Laravel)..."
cd quotation-system

# Check if .env exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Please create it from .env.example"
    print_warning "Make sure to set APP_ENV=production and APP_DEBUG=false"
fi

# Install dependencies
print_status "Installing PHP dependencies..."
composer install --optimize-autoloader --no-dev

# Generate app key if not set
if ! grep -q "APP_KEY=base64:" .env 2>/dev/null; then
    print_status "Generating application key..."
    php artisan key:generate
fi

# Cache configurations
print_status "Caching configurations..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Set proper permissions
print_status "Setting file permissions..."
chmod -R 755 storage bootstrap/cache

cd ..

# 2. Frontend Preparation
echo ""
echo "📦 Preparing Frontend (Next.js)..."
cd quotation-frontend

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install

# Build for production
print_status "Building for production..."
npm run build

cd ..

# 3. Create deployment package
echo ""
echo "📦 Creating deployment package..."

# Create deployment directory
DEPLOY_DIR="quotation-system-deployment"
rm -rf $DEPLOY_DIR
mkdir $DEPLOY_DIR

# Copy backend files
print_status "Copying backend files..."
cp -r quotation-system $DEPLOY_DIR/
rm -rf $DEPLOY_DIR/quotation-system/node_modules
rm -rf $DEPLOY_DIR/quotation-system/vendor
rm -rf $DEPLOY_DIR/quotation-system/storage/logs/*
rm -rf $DEPLOY_DIR/quotation-system/storage/framework/cache/*
rm -rf $DEPLOY_DIR/quotation-system/storage/framework/sessions/*
rm -rf $DEPLOY_DIR/quotation-system/storage/framework/views/*

# Copy frontend build
print_status "Copying frontend build..."
cp -r quotation-frontend $DEPLOY_DIR/
rm -rf $DEPLOY_DIR/quotation-frontend/node_modules
rm -rf $DEPLOY_DIR/quotation-frontend/.next

# Copy documentation
print_status "Copying documentation..."
cp README.md $DEPLOY_DIR/
cp DEPLOYMENT-GUIDE.md $DEPLOY_DIR/
cp PRODUCTION-CONFIG.md $DEPLOY_DIR/

# Create deployment info
cat > $DEPLOY_DIR/DEPLOYMENT-INFO.txt << EOF
Quotation Management System - Deployment Package
Generated on: $(date)
Version: 1.0.0

Contents:
- quotation-system/ (Laravel Backend)
- quotation-frontend/ (Next.js Frontend)
- Documentation files

Next Steps:
1. Upload this folder to your server
2. Configure environment variables
3. Set up database
4. Run migrations
5. Configure web server

See DEPLOYMENT-GUIDE.md for detailed instructions.
EOF

# Create zip file
print_status "Creating deployment archive..."
zip -r quotation-system-deployment.zip $DEPLOY_DIR/

# Cleanup
rm -rf $DEPLOY_DIR

echo ""
print_status "Deployment preparation completed!"
echo ""
echo "📁 Files created:"
echo "   - quotation-system-deployment.zip (Ready for upload)"
echo ""
echo "📋 Next steps:"
echo "   1. Upload quotation-system-deployment.zip to your server"
echo "   2. Extract the files"
echo "   3. Follow DEPLOYMENT-GUIDE.md for setup instructions"
echo "   4. Configure your domain and SSL certificate"
echo ""
echo "🌐 Recommended hosting platforms:"
echo "   - Frontend: Vercel (free) or Netlify (free)"
echo "   - Backend: Railway (free) or DigitalOcean ($5/month)"
echo "   - Database: Railway MySQL (free) or DigitalOcean Managed Database"
echo ""
print_status "Happy deploying! 🚀"











