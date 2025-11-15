# Docker Deployment Guide

Complete guide for deploying the Quotation Management System using Docker.

## 🐳 Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

### One-Command Deployment

```bash
# Production Deployment
docker-compose -f docker-compose.production.yml up -d

# Development Deployment
docker-compose up -d
```

## 📋 Configuration

### 1. Environment Variables

Create a `.env` file in the root directory:

```bash
# Application
APP_NAME="Quotation Management System"
APP_ENV=production
APP_KEY=base64:your-production-app-key-here
APP_DEBUG=false
APP_URL=https://your-domain.com

# Database
DB_DATABASE=quotation_system
DB_USERNAME=quotation_user
DB_PASSWORD=your_secure_password
DB_ROOT_PASSWORD=your_secure_root_password

# Redis
REDIS_PASSWORD=your_redis_password

# Frontend API URL
NEXT_PUBLIC_API_URL=https://your-domain.com/api

# Ports (optional)
HTTP_PORT=80
HTTPS_PORT=443
BACKEND_PORT=8000
FRONTEND_PORT=3000
DB_PORT=3306
REDIS_PORT=6379
```

### 2. SSL Certificates

Place your SSL certificates in the `ssl/` directory:

```
ssl/
  ├── certs/
  │   └── your-domain.crt
  └── private/
      └── your-domain.key
```

Update `nginx-production-optimized.conf` with your certificate paths.

### 3. Generate Laravel Application Key

```bash
docker-compose -f docker-compose.production.yml exec backend php artisan key:generate
```

## 🚀 Deployment Steps

### Step 1: Clone Repository

```bash
git clone <your-repo-url>
cd HT_Quote
```

### Step 2: Configure Environment

```bash
cp env.production.example .env
# Edit .env with your production values
```

### Step 3: Build and Start Services

```bash
# Build images
docker-compose -f docker-compose.production.yml build

# Start all services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f
```

### Step 4: Run Database Migrations

```bash
docker-compose -f docker-compose.production.yml exec backend php artisan migrate --force
```

### Step 5: Seed Database (Optional)

```bash
docker-compose -f docker-compose.production.yml exec backend php artisan db:seed --force
```

## 📦 Docker Images

### Frontend Image (`quotation-frontend`)
- **Base**: `node:18-alpine`
- **Port**: 3000
- **Multi-stage build** for optimized size
- **Standalone output** for minimal runtime

### Backend Image (`quotation-backend`)
- **Base**: `php:8.3-fpm-alpine`
- **Port**: 8000
- **Includes**: Nginx, PHP-FPM, Composer
- **Extensions**: MySQL, Redis, GD, Zip, XML

### Database Image
- **MySQL 8.0**
- Persistent volumes for data

### Redis Image
- **Redis 7-alpine**
- AOF persistence enabled

### Nginx Image
- **nginx:alpine**
- Reverse proxy configuration
- SSL/TLS support

## 🔧 Management Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f backend
docker-compose -f docker-compose.production.yml logs -f frontend
```

### Restart Services
```bash
# All services
docker-compose -f docker-compose.production.yml restart

# Specific service
docker-compose -f docker-compose.production.yml restart backend
```

### Stop Services
```bash
docker-compose -f docker-compose.production.yml down
```

### Stop and Remove Volumes
```bash
docker-compose -f docker-compose.production.yml down -v
```

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose -f docker-compose.production.yml up -d --build
```

### Execute Commands
```bash
# Laravel Artisan
docker-compose -f docker-compose.production.yml exec backend php artisan <command>

# Composer
docker-compose -f docker-compose.production.yml exec backend composer <command>

# Shell access
docker-compose -f docker-compose.production.yml exec backend sh
docker-compose -f docker-compose.production.yml exec frontend sh
```

## 🔍 Health Checks

All services include health checks:

```bash
# Check service status
docker-compose -f docker-compose.production.yml ps

# Test backend health
curl http://localhost/api/health

# Test frontend
curl http://localhost
```

## 📊 Monitoring

### View Resource Usage
```bash
docker stats
```

### View Network
```bash
docker network inspect ht_quote_quotation_network
```

### View Volumes
```bash
docker volume ls
```

## 🛡️ Security Best Practices

1. **Change Default Passwords**: Update all default passwords in `.env`
2. **SSL Certificates**: Use valid SSL certificates for production
3. **Firewall**: Only expose necessary ports (80, 443)
4. **Secrets**: Never commit `.env` files to Git
5. **Updates**: Regularly update Docker images and base images

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if MySQL is running
docker-compose -f docker-compose.production.yml ps mysql

# Check MySQL logs
docker-compose -f docker-compose.production.yml logs mysql

# Test connection
docker-compose -f docker-compose.production.yml exec backend php artisan tinker
```

### Frontend Not Loading
```bash
# Check frontend logs
docker-compose -f docker-compose.production.yml logs frontend

# Rebuild frontend
docker-compose -f docker-compose.production.yml build --no-cache frontend
docker-compose -f docker-compose.production.yml up -d frontend
```

### Backend 500 Errors
```bash
# Check Laravel logs
docker-compose -f docker-compose.production.yml exec backend tail -f storage/logs/laravel.log

# Clear caches
docker-compose -f docker-compose.production.yml exec backend php artisan cache:clear
docker-compose -f docker-compose.production.yml exec backend php artisan config:clear
```

### Permission Issues
```bash
# Fix storage permissions
docker-compose -f docker-compose.production.yml exec backend chown -R www-data:www-data storage bootstrap/cache
docker-compose -f docker-compose.production.yml exec backend chmod -R 775 storage bootstrap/cache
```

## 📝 Production Checklist

- [ ] Environment variables configured in `.env`
- [ ] SSL certificates installed
- [ ] Database passwords changed
- [ ] Application key generated
- [ ] Migrations run successfully
- [ ] Health checks passing
- [ ] Logs monitored
- [ ] Backup strategy in place
- [ ] Firewall configured
- [ ] Domain DNS configured

## 🔄 Backup & Restore

### Backup Database
```bash
docker-compose -f docker-compose.production.yml exec mysql mysqldump -u root -p${DB_ROOT_PASSWORD} ${DB_DATABASE} > backup.sql
```

### Restore Database
```bash
docker-compose -f docker-compose.production.yml exec -T mysql mysql -u root -p${DB_ROOT_PASSWORD} ${DB_DATABASE} < backup.sql
```

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Laravel Docker Documentation](https://laravel.com/docs/deployment#docker)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)

## 🆘 Support

For issues or questions:
1. Check logs: `docker-compose -f docker-compose.production.yml logs`
2. Check health: `docker-compose -f docker-compose.production.yml ps`
3. Review configuration files
4. Check network connectivity between services

