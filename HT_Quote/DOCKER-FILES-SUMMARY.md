# Docker Deployment Files Summary

All Docker deployment files for the Quotation Management System.

## 📦 Docker Files

### Core Docker Files

1. **`docker-compose.production.yml`** - Production Docker Compose configuration
   - MySQL 8.0 database with health checks
   - Redis 7 cache with persistence
   - Laravel backend (PHP 8.3) with Nginx
   - Next.js frontend (Node 18) standalone build
   - Nginx reverse proxy with SSL support
   - Health checks for all services
   - Persistent volumes for data

2. **`docker-compose.yml`** - Development Docker Compose configuration
   - Simplified setup for local development
   - MySQL and Redis services
   - Development-friendly settings

3. **`quotation-frontend/Dockerfile.production`**
   - Multi-stage build (deps → builder → runner)
   - Node 18 Alpine base image
   - Standalone output for minimal size
   - Production optimizations

4. **`quotation-system/Dockerfile.production`**
   - PHP 8.3 FPM Alpine base
   - Includes Nginx, MySQL client, Redis extension
   - OPcache enabled
   - Automatic database wait and migration
   - Startup script with health checks

### Configuration Files

5. **`quotation-frontend/.dockerignore`**
   - Excludes node_modules, .next, logs, etc.
   - Reduces build context size

6. **`quotation-system/.dockerignore`**
   - Excludes vendor, storage/cache, logs
   - Prevents sensitive files from being copied

7. **`.dockerignore`** (root)
   - Root-level ignore patterns

8. **`docker-compose.override.yml.example`**
   - Template for environment-specific overrides
   - SSL certificate mounting example

### Deployment Scripts

9. **`docker-deploy.sh`** (Linux/Mac)
   - Automated deployment script
   - Handles build, start, migrations, caching
   - Status checks and health monitoring

10. **`docker-deploy.bat`** (Windows)
    - Windows equivalent of deploy script
    - Same functionality as shell script

### Documentation

11. **`DOCKER-DEPLOYMENT.md`**
    - Complete deployment guide
    - Configuration instructions
    - Troubleshooting guide
    - Backup/restore procedures

## 🚀 Quick Start

### Production Deployment

```bash
# Linux/Mac
./docker-deploy.sh production

# Windows
docker-deploy.bat production
```

### Manual Deployment

```bash
# Create .env file
cp env.production.example .env
# Edit .env with your values

# Build and start
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Run migrations
docker-compose -f docker-compose.production.yml exec backend php artisan migrate --force
```

### Development Deployment

```bash
# Linux/Mac
./docker-deploy.sh development

# Windows
docker-deploy.bat development

# Or manually
docker-compose up -d
```

## 📋 Required Environment Variables

Create a `.env` file in the root directory:

```env
# Application
APP_NAME="Quotation Management System"
APP_ENV=production
APP_KEY=base64:your-key-here
APP_DEBUG=false
APP_URL=https://your-domain.com

# Database
DB_DATABASE=quotation_system
DB_USERNAME=quotation_user
DB_PASSWORD=your_secure_password
DB_ROOT_PASSWORD=your_root_password

# Redis
REDIS_PASSWORD=

# Frontend
NEXT_PUBLIC_API_URL=https://your-domain.com/api

# Ports (optional)
HTTP_PORT=80
HTTPS_PORT=443
BACKEND_PORT=8000
FRONTEND_PORT=3000
DB_PORT=3306
REDIS_PORT=6379
```

## 🏗️ Architecture

```
┌─────────────────┐
│   Nginx:80/443  │  ← Internet
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌──▼──────┐
│Frontend│  │ Backend │
│ :3000  │  │  :8000  │
└────┬───┘  └──┬──────┘
     │         │
     │    ┌────┴────┐
     │    │         │
     │ ┌──▼──┐  ┌──▼───┐
     │ │MySQL│  │Redis │
     │ │:3306│  │:6379 │
     │ └─────┘  └──────┘
     │
     └─────────┐
               │
         Docker Network
```

## 🔧 Service Details

### Frontend Container
- **Image**: Custom build from `quotation-frontend/Dockerfile.production`
- **Port**: 3000
- **Health Check**: HTTP GET on port 3000
- **Dependencies**: backend

### Backend Container
- **Image**: Custom build from `quotation-system/Dockerfile.production`
- **Port**: 8000
- **Health Check**: HTTP GET `/api/health`
- **Dependencies**: mysql, redis
- **Volumes**: Code, storage, cache

### MySQL Container
- **Image**: mysql:8.0
- **Port**: 3306
- **Health Check**: mysqladmin ping
- **Volumes**: Persistent data storage
- **Character Set**: utf8mb4

### Redis Container
- **Image**: redis:7-alpine
- **Port**: 6379
- **Health Check**: redis-cli ping
- **Volumes**: Persistent data (AOF)
- **Persistence**: Append-only file enabled

### Nginx Container
- **Image**: nginx:alpine
- **Ports**: 80, 443
- **Health Check**: HTTP GET `/health`
- **Config**: `nginx-production-optimized.conf`
- **Dependencies**: backend, frontend

## 📊 Volume Management

### Persistent Volumes
- `mysql_data`: Database files
- `redis_data`: Redis persistence
- `backend_storage`: Laravel storage
- `backend_cache`: Laravel cache
- `nginx_logs`: Nginx access/error logs

### Backup Volumes
```bash
# Backup MySQL
docker-compose -f docker-compose.production.yml exec mysql mysqldump -u root -p database > backup.sql

# Backup Redis
docker-compose -f docker-compose.production.yml exec redis redis-cli SAVE
```

## 🔍 Monitoring

### View Logs
```bash
# All services
docker-compose -f docker-compose.production.yml logs -f

# Specific service
docker-compose -f docker-compose.production.yml logs -f backend
```

### Check Status
```bash
# Service status
docker-compose -f docker-compose.production.yml ps

# Resource usage
docker stats
```

### Health Checks
```bash
# Backend health
curl http://localhost/api/health

# Frontend health
curl http://localhost

# Database connection
docker-compose -f docker-compose.production.yml exec backend php artisan tinker
```

## 🛠️ Maintenance

### Update Application
```bash
git pull
docker-compose -f docker-compose.production.yml up -d --build
docker-compose -f docker-compose.production.yml exec backend php artisan migrate --force
```

### Clear Caches
```bash
docker-compose -f docker-compose.production.yml exec backend php artisan cache:clear
docker-compose -f docker-compose.production.yml exec backend php artisan config:clear
docker-compose -f docker-compose.production.yml exec backend php artisan route:clear
docker-compose -f docker-compose.production.yml exec backend php artisan view:clear
```

### Fix Permissions
```bash
docker-compose -f docker-compose.production.yml exec backend chown -R www-data:www-data storage bootstrap/cache
docker-compose -f docker-compose.production.yml exec backend chmod -R 775 storage bootstrap/cache
```

## 🚨 Troubleshooting

### Services Won't Start
1. Check logs: `docker-compose -f docker-compose.production.yml logs`
2. Check Docker: `docker ps -a`
3. Verify .env file exists and is configured
4. Check port conflicts: `netstat -tulpn | grep -E ':(80|443|3000|8000|3306|6379)'`

### Database Connection Issues
1. Verify MySQL is healthy: `docker-compose -f docker-compose.production.yml ps mysql`
2. Check credentials in .env match docker-compose.yml
3. Test connection: `docker-compose -f docker-compose.production.yml exec backend php artisan tinker`

### Frontend Build Failures
1. Check Node version (should be 18+)
2. Clear Next.js cache: `rm -rf quotation-frontend/.next`
3. Rebuild: `docker-compose -f docker-compose.production.yml build --no-cache frontend`

### Backend 500 Errors
1. Check Laravel logs: `docker-compose -f docker-compose.production.yml exec backend tail -f storage/logs/laravel.log`
2. Verify APP_KEY is set
3. Clear caches (see Maintenance section)
4. Check file permissions

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Laravel Docker Deployment](https://laravel.com/docs/deployment#docker)
- [Next.js Docker Documentation](https://nextjs.org/docs/deployment#docker-image)

