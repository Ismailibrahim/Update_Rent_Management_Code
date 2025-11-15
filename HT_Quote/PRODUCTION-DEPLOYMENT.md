# Production Deployment Guide
## Quotation Management System

This guide covers deploying the Quotation Management System to production.

## 🚀 Quick Start

### Option 1: Windows Batch Script (Recommended for Windows)
```bash
# Run the production deployment script
deploy-production.bat
```

### Option 2: Docker Compose
```bash
# Copy environment variables
cp env.production.example .env.production

# Edit environment variables
notepad .env.production

# Start production stack
docker-compose -f docker-compose.production.yml up -d
```

### Option 3: Manual Setup
Follow the detailed steps below.

## 📋 Prerequisites

### System Requirements
- **OS**: Windows 10/11, Linux, or macOS
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 10GB free space
- **CPU**: 2+ cores recommended

### Software Requirements
- **PHP**: 8.3+ with extensions (pdo_mysql, mbstring, gd, zip, intl)
- **Node.js**: 18+ with npm
- **MySQL**: 8.0+
- **Redis**: 6.0+ (optional but recommended)
- **Nginx**: 1.18+ (for reverse proxy)

## 🔧 Manual Production Setup

### 1. Backend (Laravel) Setup

```bash
cd quotation-system

# Copy production environment
cp env.production.example .env

# Edit environment variables
notepad .env

# Install dependencies
composer install --no-dev --optimize-autoloader

# Generate application key
php artisan key:generate

# Run migrations
php artisan migrate --force

# Seed database
php artisan db:seed --force

# Cache configurations
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Set permissions
chmod -R 755 storage bootstrap/cache
```

### 2. Frontend (Next.js) Setup

```bash
cd quotation-frontend

# Install dependencies
npm ci --production

# Build for production
npm run build

# Start production server
npm start
```

### 3. Nginx Configuration

```bash
# Copy production nginx config
cp nginx-production-optimized.conf /etc/nginx/nginx.conf

# Test configuration
nginx -t

# Start nginx
nginx
```

## 🐳 Docker Deployment

### 1. Prepare Environment
```bash
# Copy environment file
cp env.production.example .env.production

# Edit environment variables
nano .env.production
```

### 2. Build and Deploy
```bash
# Build all services
docker-compose -f docker-compose.production.yml build

# Start production stack
docker-compose -f docker-compose.production.yml up -d

# Check status
docker-compose -f docker-compose.production.yml ps
```

### 3. View Logs
```bash
# All services
docker-compose -f docker-compose.production.yml logs

# Specific service
docker-compose -f docker-compose.production.yml logs backend
```

## 🔐 Security Configuration

### 1. Environment Variables
Update these critical settings in your `.env` file:

```env
# Security
APP_DEBUG=false
APP_KEY=base64:your-secure-key-here
API_KEY=your-super-secure-api-key-here

# Database
DB_PASSWORD=your-very-secure-password

# Session Security
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=strict
```

### 2. SSL Certificate
For HTTPS deployment:

```bash
# Generate SSL certificate (Let's Encrypt)
certbot --nginx -d your-domain.com

# Or use self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/your-domain.key \
  -out /etc/ssl/certs/your-domain.crt
```

### 3. Firewall Configuration
```bash
# Allow only necessary ports
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

## 📊 Monitoring

### 1. Health Checks
```bash
# Backend health
curl http://localhost:8000/api/health

# Frontend health
curl http://localhost:3000

# Nginx proxy health
curl http://localhost:8080/api/health
```

### 2. Monitoring Script
```bash
# Run monitoring script
monitor-production.bat

# Or check logs
tail -f quotation-system/storage/logs/laravel.log
```

### 3. Performance Monitoring
- **Laravel**: Check `storage/logs/laravel.log`
- **Nginx**: Check `/var/log/nginx/access.log` and `/var/log/nginx/error.log`
- **System**: Use `htop` or Task Manager

## 🔄 Updates and Maintenance

### 1. Application Updates
```bash
# Pull latest changes
git pull origin main

# Update backend
cd quotation-system
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache

# Update frontend
cd ../quotation-frontend
npm ci --production
npm run build
```

### 2. Database Backups
```bash
# Create backup
mysqldump -u username -p quotation_system > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
mysql -u username -p quotation_system < backup_file.sql
```

### 3. Log Rotation
```bash
# Configure logrotate for Laravel logs
echo "/path/to/quotation-system/storage/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 644 www-data www-data
}" > /etc/logrotate.d/quotation-system
```

## 🌐 Production URLs

After successful deployment:

- **Main Application**: http://localhost:8080 (or your domain)
- **API Health**: http://localhost:8080/api/health
- **Direct Backend**: http://localhost:8000
- **Direct Frontend**: http://localhost:3000

## 🔑 Default Login Credentials

- **Username**: `admin`
- **Password**: `password`

**⚠️ Important**: Change these credentials immediately after deployment!

## 🆘 Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if backend is running on port 8000
   - Verify nginx configuration

2. **Database Connection Error**
   - Check database credentials in `.env`
   - Ensure MySQL is running
   - Verify database exists

3. **Permission Denied**
   - Check file permissions on `storage/` and `bootstrap/cache/`
   - Run: `chmod -R 755 storage bootstrap/cache`

4. **Frontend Not Loading**
   - Check if Next.js is running on port 3000
   - Verify build was successful
   - Check browser console for errors

### Log Locations
- **Laravel**: `quotation-system/storage/logs/laravel.log`
- **Nginx**: `/var/log/nginx/error.log`
- **System**: `/var/log/syslog` (Linux) or Event Viewer (Windows)

## 📞 Support

For production support and issues:
1. Check the troubleshooting section above
2. Review application logs
3. Verify all services are running
4. Check system resources (CPU, Memory, Disk)

## 🎯 Performance Optimization

### 1. Laravel Optimizations
- Enable OPcache in PHP
- Use Redis for caching and sessions
- Configure queue workers for background jobs
- Enable gzip compression in Nginx

### 2. Next.js Optimizations
- Use CDN for static assets
- Enable image optimization
- Configure proper caching headers
- Use production build optimizations

### 3. Database Optimizations
- Configure MySQL for production
- Add proper indexes
- Regular database maintenance
- Monitor slow queries

---

**🎉 Congratulations!** Your Quotation Management System is now production-ready!
