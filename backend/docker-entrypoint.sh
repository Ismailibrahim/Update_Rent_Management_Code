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

# Fix permissions for host filesystem access (if HOST_UID is set)
if [ -n "$HOST_UID" ] && [ -d "/var/www/html/app" ]; then
    echo "Fixing file permissions for host user (UID: $HOST_UID)..."
    HOST_GID=${HOST_GID:-$HOST_UID}
    # Fix ownership for common directories
    chown -R $HOST_UID:$HOST_GID /var/www/html/app /var/www/html/config /var/www/html/database /var/www/html/routes /var/www/html/artisan 2>/dev/null || true
    # Also fix any root-owned files that might have been created
    find /var/www/html/app -user root -type f -exec chown $HOST_UID:$HOST_GID {} \; 2>/dev/null || true
    find /var/www/html/config -user root -type f -exec chown $HOST_UID:$HOST_GID {} \; 2>/dev/null || true
    find /var/www/html/database -user root -type f -exec chown $HOST_UID:$HOST_GID {} \; 2>/dev/null || true
    find /var/www/html/routes -user root -type f -exec chown $HOST_UID:$HOST_GID {} \; 2>/dev/null || true
    echo "Permissions fixed!"
fi

echo "Application setup complete! Starting PHP-FPM..."

# Start PHP-FPM (this should never fail - it's the main process)
exec php-fpm

