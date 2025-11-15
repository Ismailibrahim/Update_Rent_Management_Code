# Production Configuration Guide

## Environment Variables for Production

### Backend (.env)
```env
# Application
APP_NAME="Quotation System"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.yourdomain.com

# Database (MySQL)
DB_CONNECTION=mysql
DB_HOST=your-database-host
DB_PORT=3306
DB_DATABASE=quotation_system
DB_USERNAME=quotation_user
DB_PASSWORD=your_secure_password

# Security
APP_KEY=base64:your-generated-app-key-here
SANCTUM_STATEFUL_DOMAINS=app.yourdomain.com
SESSION_DOMAIN=api.yourdomain.com

# CORS
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email@yourdomain.com
MAIL_PASSWORD=your-email-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME="${APP_NAME}"

# Cache
CACHE_STORE=database
SESSION_DRIVER=database
QUEUE_CONNECTION=database

# Logging
LOG_CHANNEL=stack
LOG_LEVEL=error

# File Storage
FILESYSTEM_DISK=local
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
```

## Quick Deployment Steps

### 1. Prepare for Deployment
```bash
# Generate production app key
cd quotation-system
php artisan key:generate

# Optimize for production
composer install --optimize-autoloader --no-dev
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

### 2. Frontend Build
```bash
cd quotation-frontend
npm run build
```

### 3. Database Setup
```sql
CREATE DATABASE quotation_system;
CREATE USER 'quotation_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON quotation_system.* TO 'quotation_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Run Migrations
```bash
php artisan migrate --force
php artisan db:seed --force
```

## Security Checklist

- [ ] Set APP_DEBUG=false
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL
- [ ] Configure proper CORS origins
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Database backups
- [ ] Monitor logs for suspicious activity












