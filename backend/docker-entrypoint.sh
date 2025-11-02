#!/bin/sh
set +e  # Don't exit on errors - allow graceful handling

echo "Starting Laravel application setup..."

# Wait for database to be ready
echo "Waiting for database connection..."
max_attempts=60
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
        echo "Warning: Failed to connect to database after $max_attempts attempts - continuing anyway"
        break
    fi
    echo "Database is unavailable - sleeping (attempt $attempt/$max_attempts)"
    sleep 2
done

echo "Database connection check complete!"

# Generate application key if not set
if [ -z "$APP_KEY" ]; then
    echo "Generating application key..."
    php artisan key:generate --force || echo "Warning: Could not generate app key"
fi

# Run migrations (don't fail if they already exist)
echo "Running database migrations..."
php artisan migrate --force || echo "Warning: Migrations may have failed or already exist"

# Clear and cache configuration (allow failures)
echo "Optimizing application..."
php artisan config:clear || true
php artisan route:clear || true
php artisan view:clear || true

# Create storage link if it doesn't exist
if [ ! -L public/storage ]; then
    echo "Creating storage symlink..."
    php artisan storage:link || echo "Warning: Could not create storage link"
fi

echo "Application setup complete! Starting PHP-FPM..."

# Start PHP-FPM (this should never fail - it's the main process)
exec php-fpm

