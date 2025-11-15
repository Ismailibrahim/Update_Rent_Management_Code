# Laragon Setup Guide for Rent Management System

This guide will help you set up the Rent Management System on Laragon (Windows local development environment).

## Quick Start (Automated)

If you prefer an automated setup, run the PowerShell script:

```powershell
.\setup-laragon.ps1
```

This script will:
- Create `.env` file from `.env.example`
- Attempt to create the MySQL database
- Install Composer dependencies
- Generate application key

Then continue with the manual steps below.

## Prerequisites

- Laragon installed and running
- MySQL service running in Laragon
- PHP 8.2 or higher (Laragon should include this)
- Composer installed (or use Laragon's built-in Composer)

## Step 1: Start Laragon Services

1. Open Laragon
2. Click **Start All** to start Apache/Nginx and MySQL
3. Verify MySQL is running (green indicator)

## Step 2: Create MySQL Database

### Option A: Using Laragon's MySQL Terminal

1. In Laragon, click **Database** or open **HeidiSQL** (if installed)
2. Connect to MySQL:
   - Host: `127.0.0.1` or `localhost`
   - Port: `3306`
   - Username: `root`
   - Password: (usually empty, or check Laragon settings)

3. Run this SQL command to create the database:

```sql
CREATE DATABASE IF NOT EXISTS rent_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Option B: Using Command Line

1. Open Laragon Terminal (or PowerShell)
2. Navigate to MySQL bin directory (usually `C:\laragon\bin\mysql\mysql-8.x.x\bin`)
3. Or use Laragon's MySQL command directly:

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS rent_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

If you have a MySQL password set, use:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS rent_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

## Step 3: Configure Environment File

You need to create a `.env` file in the `backend` directory. 

### Option A: Copy from .env.example (if it exists)

```bash
cd backend
copy .env.example .env
```

### Option B: Create manually

1. Navigate to the `backend` directory
2. Create a new file named `.env`
3. Copy and paste the following content (adjust values as needed):

```env
APP_NAME="Rent Management"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_TIMEZONE=UTC
APP_URL=http://localhost:8000

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=rent_management
DB_USERNAME=root
DB_PASSWORD=

SESSION_DRIVER=database
SESSION_LIFETIME=120

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=database

CACHE_STORE=database

LOG_CHANNEL=stack
LOG_LEVEL=debug
```

**Important**: If your MySQL has a password, update `DB_PASSWORD` in the `.env` file.

## Step 4: Install PHP Dependencies

### Important: Enable PHP Zip Extension First

Before installing dependencies, you need to enable the `zip` extension in PHP:

1. Open `C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.ini`
2. Find the line `;extension=zip` (around line 930)
3. Remove the semicolon: `extension=zip`
4. Save the file
5. Restart Laragon

### Install Dependencies

1. Open Laragon Terminal (or PowerShell)
2. Navigate to the backend directory:

```powershell
cd backend
```

3. Add PHP to PATH and install:

```powershell
$env:Path += ";C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64"
composer install
```

**If you encounter path length issues with `phiki/phiki` package**, see `COMPOSER_INSTALL_FIX.md` for solutions.

## Step 5: Generate Application Key

```bash
php artisan key:generate
```

## Step 6: Run Database Migrations

This will create all the necessary tables:

```bash
php artisan migrate
```

If you encounter any issues, you can run migrations with force:

```bash
php artisan migrate --force
```

## Step 7: (Optional) Run Seeders

To populate initial data (like rental unit types):

```bash
php artisan db:seed
```

Or run specific seeders:

```bash
php artisan db:seed --class=RentalUnitTypeSeeder
php artisan db:seed --class=SeedPropertyTypesSeeder
```

## Step 8: Create Storage Link

```bash
php artisan storage:link
```

## Step 9: Clear and Cache Configuration

```bash
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
```

## Step 10: Start the Laravel Development Server

```bash
php artisan serve
```

The API will be available at: `http://localhost:8000`

Or if you want to use a custom port:

```bash
php artisan serve --port=8000
```

## Step 11: (Optional) Create Admin User

If you have a `create-admin.php` script:

```bash
php create-admin.php
```

Or manually create an admin user through the database or using tinker:

```bash
php artisan tinker
```

Then in tinker:

```php
$user = new App\Models\User();
$user->name = 'Admin';
$user->email = 'admin@example.com';
$user->password = bcrypt('password');
$user->save();
```

## Troubleshooting

### MySQL Connection Issues

1. **Check MySQL is running**: In Laragon, verify MySQL service is green
2. **Check credentials**: Verify username/password in `backend/.env`
3. **Test connection**: Try connecting with HeidiSQL or MySQL Workbench

### Permission Issues

If you encounter permission errors on Windows:

1. Make sure you have write permissions to the `backend/storage` and `backend/bootstrap/cache` directories
2. If needed, run terminal as Administrator

### Port Already in Use

If port 8000 is already in use:

```bash
php artisan serve --port=8001
```

Then update `APP_URL` in `.env` if needed.

### Migration Errors

If migrations fail:

1. Check database exists: `SHOW DATABASES;`
2. Check Laravel logs: `backend/storage/logs/laravel.log`
3. Try running migrations one at a time to identify the issue

### Composer Issues

If Composer commands fail:

1. Update Composer: `composer self-update`
2. Clear Composer cache: `composer clear-cache`
3. Try removing `vendor` folder and `composer.lock`, then run `composer install` again

## Laragon Specific Tips

1. **Virtual Hosts**: You can set up a virtual host in Laragon for easier access
   - Project path: `D:\Sandbox\Rent Update\Update_Rent_Management_Code\backend\public`
   - Domain: `rent-management.test` (or any name you prefer)

2. **Database Management**: Laragon includes HeidiSQL - use it to manage your database visually

3. **PHP Version**: Make sure Laragon is using PHP 8.2+ (check in Laragon Settings > PHP)

## Next Steps

After setup is complete:

1. Frontend setup (if needed) - see `frontend/README.md`
2. Configure email settings (if using email notifications)
3. Configure SMS settings (if using SMS notifications)
4. Set up your first property, tenant, and rental unit

## Quick Reference Commands

```bash
# Navigate to backend
cd backend

# Start development server
php artisan serve

# Run migrations
php artisan migrate

# Run seeders
php artisan db:seed

# Clear caches
php artisan config:clear && php artisan cache:clear

# View logs
type storage\logs\laravel.log

# Access tinker (Laravel REPL)
php artisan tinker
```

