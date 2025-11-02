#!/bin/sh
set -e

echo "Starting Laravel application setup..."

# Wait for database to be ready
echo "Waiting for database connection..."
max_attempts=30
attempt=0

until php -r "
try {
    \$pdo = new PDO(
        'mysql:host=${DB_HOST};port=${DB_PORT:-3306};dbname=${DB_DATABASE}',
        '${DB_USERNAME}',
        '${DB_PASSWORD}',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo 'Database connected successfully';
    exit(0);
} catch (PDOException \$e) {
    exit(1);
}" 2>/dev/null; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "Failed to connect to database after $max_attempts attempts"
        exit 1
    fi
    echo "Database is unavailable - sleeping (attempt $attempt/$max_attempts)"
    sleep 2
done

echo "Database is ready!"

# Generate application key if not set
if [ -z "$APP_KEY" ]; then
    echo "Generating application key..."
    php artisan key:generate --force
fi

# Run migrations
echo "Running database migrations..."
php artisan migrate --force

# Clear and cache configuration
echo "Optimizing application..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Create storage link if it doesn't exist
if [ ! -L public/storage ]; then
    echo "Creating storage symlink..."
    php artisan storage:link || true
fi

echo "Application setup complete!"

# Start PHP-FPM
exec php-fpm

