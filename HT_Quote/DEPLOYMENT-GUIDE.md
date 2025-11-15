# Deployment Guide - Quotation Management System

## Overview

This guide covers deploying the Quotation Management System to the internet using various hosting platforms.

## Pre-Deployment Preparation

### 1. Environment Configuration

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
NEXT_PUBLIC_APP_URL=https://your-frontend-domain.com
```

#### Backend (.env)
```env
APP_NAME="Quotation System"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-backend-domain.com

DB_CONNECTION=mysql
DB_HOST=your-database-host
DB_PORT=3306
DB_DATABASE=your-database-name
DB_USERNAME=your-database-user
DB_PASSWORD=your-database-password

# Security
APP_KEY=your-generated-app-key
SANCTUM_STATEFUL_DOMAINS=your-frontend-domain.com
SESSION_DOMAIN=your-backend-domain.com

# CORS
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### 2. Security Considerations

#### Remove Development Files
- Remove test files and development scripts
- Remove sensitive configuration files
- Update CORS settings for production domains

#### Database Security
- Use strong database passwords
- Enable SSL connections
- Restrict database access to application servers only

#### Application Security
- Set `APP_DEBUG=false`
- Generate new `APP_KEY`
- Configure proper CORS origins
- Enable HTTPS/SSL

## Deployment Options

### Option 1: Vercel + Railway (Recommended for Free)

#### Frontend Deployment (Vercel)

1. **Prepare Frontend**:
   ```bash
   cd quotation-frontend
   npm run build
   ```

2. **Deploy to Vercel**:
   - Go to https://vercel.com
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set output directory: `.next`
   - Add environment variables:
     ```
     NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app/api
     ```

#### Backend Deployment (Railway)

1. **Prepare Backend**:
   ```bash
   cd quotation-system
   composer install --optimize-autoloader --no-dev
   ```

2. **Deploy to Railway**:
   - Go to https://railway.app
   - Connect GitHub repository
   - Add MySQL database service
   - Set environment variables
   - Deploy

### Option 2: DigitalOcean Droplet (Full Control)

#### Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Nginx, PHP, MySQL
sudo apt install nginx php8.2-fpm php8.2-mysql php8.2-xml php8.2-mbstring php8.2-curl php8.2-zip mysql-server -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

#### Database Setup
```sql
CREATE DATABASE quotation_system;
CREATE USER 'quotation_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON quotation_system.* TO 'quotation_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Application Deployment
```bash
# Clone repository
git clone https://github.com/yourusername/quotation-system.git
cd quotation-system

# Backend setup
cd quotation-system
composer install --optimize-autoloader --no-dev
cp .env.example .env
# Edit .env with production values
php artisan key:generate
php artisan migrate --force
php artisan db:seed --force

# Frontend setup
cd ../quotation-frontend
npm install
npm run build
```

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/quotation-system
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/quotation-system/public;
    index index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}

# Frontend (Next.js)
server {
    listen 80;
    server_name app.your-domain.com;
    root /var/www/quotation-frontend/out;
    index index.html;

    location / {
        try_files $uri $uri.html $uri/ =404;
    }
}
```

### Option 3: Docker Deployment

#### Dockerfile (Backend)
```dockerfile
FROM php:8.2-fpm

# Install dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy application
COPY . .

# Install dependencies
RUN composer install --optimize-autoloader --no-dev

# Set permissions
RUN chown -R www-data:www-data /var/www
RUN chmod -R 755 /var/www/storage

EXPOSE 9000
CMD ["php-fpm"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:9000"
    volumes:
      - ./:/var/www
    depends_on:
      - db

  db:
    image: mysql:8.0
    environment:
      MYSQL_DATABASE: quotation_system
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_USER: quotation_user
      MYSQL_PASSWORD: user_password
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app

volumes:
  mysql_data:
```

## Domain and SSL Setup

### Domain Configuration
1. **Purchase domain** (Namecheap, GoDaddy, etc.)
2. **Point DNS** to your hosting provider
3. **Configure subdomains**:
   - `app.yourdomain.com` → Frontend
   - `api.yourdomain.com` → Backend

### SSL Certificate
```bash
# Using Let's Encrypt (Certbot)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d app.yourdomain.com -d api.yourdomain.com
```

## Environment Variables

### Production Environment Variables

#### Frontend (Vercel/Railway)
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
```

#### Backend (Railway/DigitalOcean)
```
APP_NAME="Quotation System"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.yourdomain.com

DB_CONNECTION=mysql
DB_HOST=your-database-host
DB_PORT=3306
DB_DATABASE=quotation_system
DB_USERNAME=quotation_user
DB_PASSWORD=secure_password

SANCTUM_STATEFUL_DOMAINS=app.yourdomain.com
SESSION_DOMAIN=api.yourdomain.com
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com

MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
```

## Database Migration

### Production Database Setup
```bash
# Run migrations
php artisan migrate --force

# Seed initial data
php artisan db:seed --force

# Create admin user
php artisan tinker
User::create([
    'name' => 'Admin',
    'username' => 'admin',
    'email' => 'admin@yourdomain.com',
    'password_hash' => Hash::make('secure_password'),
    'full_name' => 'System Administrator',
    'role' => 'admin',
    'is_active' => true,
]);
```

## Monitoring and Maintenance

### Log Monitoring
```bash
# Laravel logs
tail -f storage/logs/laravel.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Backup Strategy
```bash
# Database backup
mysqldump -u quotation_user -p quotation_system > backup_$(date +%Y%m%d).sql

# Application backup
tar -czf app_backup_$(date +%Y%m%d).tar.gz /var/www/quotation-system
```

### Performance Optimization
```bash
# Laravel optimizations
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Composer optimizations
composer install --optimize-autoloader --no-dev
```

## Security Checklist

- [ ] Set `APP_DEBUG=false`
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure proper CORS origins
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Database backups
- [ ] Monitor logs for suspicious activity

## Cost Estimation

### Free Tier Options
- **Vercel**: Free (frontend)
- **Railway**: Free tier (backend + database)
- **Total**: $0/month

### Paid Options
- **DigitalOcean Droplet**: $5-10/month
- **Domain**: $10-15/year
- **SSL**: Free (Let's Encrypt)
- **Total**: $5-10/month

## Support and Troubleshooting

### Common Issues
1. **CORS errors**: Check CORS_ALLOWED_ORIGINS
2. **Database connection**: Verify database credentials
3. **File permissions**: Check Laravel storage permissions
4. **SSL issues**: Verify certificate installation

### Useful Commands
```bash
# Check application status
php artisan about

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# Check database connection
php artisan tinker
DB::connection()->getPdo();
```

---

**Ready to deploy?** Choose your preferred option and follow the steps above!












