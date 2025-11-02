# Multi-stage build for Laravel backend
FROM php:8.2-fpm-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    git \
    curl \
    libpng-dev \
    libxml2-dev \
    zip \
    unzip \
    oniguruma-dev \
    mysql-client \
    nodejs \
    npm \
    linux-headers

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd sockets

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files
COPY composer.json composer.lock ./

# Copy artisan file (needed for composer post-install scripts)
COPY artisan ./

# Install PHP dependencies (no dev dependencies in production)
# Skip scripts during install to avoid errors, will run them later
RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist --no-scripts

# Copy application files
COPY . .

# Run composer scripts now that all files are in place
RUN composer dump-autoload --optimize --classmap-authoritative

# Set permissions - optimized: only change what needs to be writable
# Create storage structure first
RUN mkdir -p storage/framework/{sessions,views,cache} storage/logs bootstrap/cache

# Set ownership ONLY on storage and cache directories (skip vendor to save time)
# These are the only directories that need to be writable by www-data
RUN chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache

# Set basic ownership on app files (excluding vendor)
# This ensures Laravel files are readable, but avoids chown on vendor (10k+ files)
RUN chown -R www-data:www-data app bootstrap config database routes tests \
    && chown www-data:www-data artisan composer.json composer.lock .env || true

# Production stage
FROM base AS production

# Copy application files
COPY . .

# Generate optimized autoloader
RUN composer dump-autoload --optimize --classmap-authoritative

# Expose port
EXPOSE 9000

# PHP-FPM configuration for production
RUN sed -i 's/listen = 127.0.0.1:9000/listen = 0.0.0.0:9000/' /usr/local/etc/php-fpm.d/www.conf \
    && sed -i 's/;clear_env = no/clear_env = no/' /usr/local/etc/php-fpm.d/www.conf

# Copy and set permissions for entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Use entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]

