# SSH Guide: Accessing and Modifying the Rent Management System

This guide explains how to SSH into your server and work with the codebase to fix bugs and make modifications.

## Prerequisites

- SSH access credentials (username, password, or SSH key)
- Terminal/SSH client installed on your local machine
- Basic knowledge of command line operations

## 1. Connecting to Your Server

### Basic SSH Connection

```bash
ssh username@50.6.203.46
```

Replace `username` with your actual server username. The server will prompt for a password if using password authentication.

### Using SSH Key (Recommended)

If you have an SSH key set up:

```bash
ssh -i /path/to/your/private/key username@50.6.203.46
```

### Default Connection Example

Based on your setup, you might connect with:

```bash
ssh htmaldives@50.6.203.46
```

## 2. Navigating to the Codebase

Once connected, navigate to the project directory:

```bash
cd /home/htmaldives/rent-management
```

Verify you're in the correct directory:

```bash
pwd
# Should output: /home/htmaldives/rent-management
```

## 3. Project Structure Overview

```
rent-management/
├── backend/              # Laravel backend
│   ├── app/
│   ├── database/
│   │   └── migrations/  # Database migrations
│   ├── .env             # Backend environment variables
│   └── Dockerfile
├── frontend/            # Next.js frontend
│   ├── src/
│   ├── .env.example     # Frontend environment variables
│   └── Dockerfile
├── docker-compose.yml   # Docker configuration
├── .env                 # Root environment variables
└── README.md
```

## 4. Working with Docker Containers

### Check Container Status

```bash
docker-compose ps
```

### View Container Logs

**Backend logs:**
```bash
docker-compose logs backend
docker-compose logs backend --tail=50 -f  # Follow logs in real-time
```

**Frontend logs:**
```bash
docker-compose logs frontend
docker-compose logs frontend --tail=50 -f
```

**All services:**
```bash
docker-compose logs --tail=50 -f
```

### Restart Containers

```bash
# Restart specific service
docker-compose restart backend
docker-compose restart frontend

# Restart all services
docker-compose restart
```

### Rebuild Containers (after code changes)

```bash
# Rebuild specific service
docker-compose build backend
docker-compose up -d backend

# Rebuild all services
docker-compose build
docker-compose up -d
```

## 5. Common Development Tasks

### Editing Files

**Using nano (simple editor):**
```bash
nano backend/database/migrations/your_migration_file.php
```

**Using vim:**
```bash
vim backend/app/Models/User.php
```

**Using VS Code remotely (if installed):**
```bash
code backend/.env
```

### Running Laravel Commands

Execute commands inside the backend container:

```bash
# Run migrations
docker-compose exec backend php artisan migrate:fresh --force

# Check migration status
docker-compose exec backend php artisan migrate:status

# Create admin user
docker-compose exec backend php create-admin.php

# Run tinker
docker-compose exec backend php artisan tinker

# Clear cache
docker-compose exec backend php artisan cache:clear
docker-compose exec backend php artisan config:clear
docker-compose exec backend php artisan route:clear

# View routes
docker-compose exec backend php artisan route:list
```

### Working with Database

**Access MySQL container:**
```bash
docker-compose exec mysql mysql -u laravel -ppassword rent_management
```

**Or as root:**
```bash
docker-compose exec mysql mysql -u root -prootpassword
```

**Run SQL queries:**
```bash
docker-compose exec mysql mysql -u laravel -ppassword rent_management -e "SELECT * FROM users;"
```

### Frontend Operations

**Install dependencies:**
```bash
docker-compose exec frontend npm install
```

**Build frontend:**
```bash
docker-compose exec frontend npm run build
```

**Check frontend status:**
```bash
docker-compose exec frontend npm run start
```

## 6. Fixing Common Issues

### Migration Errors

If you encounter duplicate column errors:

1. **Check the migration file:**
   ```bash
   nano backend/database/migrations/YYYY_MM_DD_name_of_migration.php
   ```

2. **Add column existence check:**
   ```php
   if (!Schema::hasColumn('table_name', 'column_name')) {
       $table->string('column_name')->nullable();
   }
   ```

3. **Re-run migrations:**
   ```bash
   docker-compose exec backend php artisan migrate:fresh --force
   ```

### Environment Variables

**Edit backend environment:**
```bash
nano backend/.env
```

**Edit root environment:**
```bash
nano .env
```

**Apply changes:**
```bash
docker-compose restart backend frontend
```

### Container Issues

**If containers won't start:**
```bash
# Check logs
docker-compose logs backend

# Stop all containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

## 7. Code Modification Workflow

### Step-by-Step Bug Fix Process

1. **Identify the issue:**
   ```bash
   docker-compose logs backend --tail=100
   ```

2. **Navigate to relevant file:**
   ```bash
   cd backend/app/Models  # or appropriate directory
   ```

3. **Edit the file:**
   ```bash
   nano YourModel.php
   ```

4. **Save changes** (Ctrl+O, Enter, Ctrl+X in nano)

5. **Test the fix:**
   ```bash
   # If it's a migration fix
   docker-compose exec backend php artisan migrate:fresh --force
   
   # If it's code logic
   docker-compose restart backend
   docker-compose logs backend --tail=50 -f
   ```

6. **Verify the fix:**
   - Check logs for errors
   - Test the application functionality
   - Check database if applicable

## 8. Useful Commands Reference

### File Operations

```bash
# List files
ls -la

# Find files by name
find . -name "*.php" -type f

# Search in files
grep -r "search_term" backend/app/

# View file contents
cat backend/.env
head -20 backend/app/Models/User.php
tail -20 backend/app/Models/User.php
```

### Git Operations (if using version control)

```bash
# Check status
git status

# View changes
git diff

# Commit changes
git add .
git commit -m "Fix: Description of fix"

# Push changes (if remote configured)
git push
```

### System Information

```bash
# Disk usage
df -h

# Memory usage
free -h

# Docker system info
docker system df
docker ps -a
```

## 9. Quick Fix Templates

### Fix Duplicate Column in Migration

```php
// Before
$table->string('column_name')->nullable();

// After
if (!Schema::hasColumn('table_name', 'column_name')) {
    $table->string('column_name')->nullable();
}
```

### Fix JSON Column Access Error

```php
// Before
DB::statement("UPDATE table SET col = JSON_EXTRACT(json_col, '$.key')");

// After
if (Schema::hasColumn('table', 'json_col')) {
    try {
        DB::statement("UPDATE table SET col = JSON_EXTRACT(json_col, '$.key')");
    } catch (\Exception $e) {
        // Skip if column doesn't exist
    }
}
```

### Fix Index Creation for JSON Columns

```php
// Remove direct index on JSON columns
// MySQL doesn't support direct indexing of JSON columns
// Use this instead:
if (Schema::hasColumn('table', 'json_col')) {
    try {
        // Create generated column for indexing if needed
    } catch (\Exception $e) {
        // Handle error
    }
}
```

## 10. Security Best Practices

1. **Use SSH keys instead of passwords**
2. **Keep your private keys secure**
3. **Use strong passwords for database access**
4. **Regularly update your server and dependencies**
5. **Review and limit file permissions:**
   ```bash
   chmod 600 .env files  # Restrict environment files
   chmod 755 directories  # Appropriate directory permissions
   ```

## 11. Troubleshooting

### Can't connect via SSH

- Verify server IP and port
- Check firewall settings
- Verify SSH service is running: `sudo systemctl status ssh`

### Permission Denied Errors

```bash
# Fix file permissions
sudo chown -R $USER:$USER /home/htmaldives/rent-management
chmod -R 755 /home/htmaldives/rent-management
```

### Container Won't Start

```bash
# Check container logs
docker-compose logs service_name

# Inspect container
docker inspect container_name

# Remove and recreate
docker-compose rm -f service_name
docker-compose up -d service_name
```

## 12. Getting Help

If you encounter issues:

1. **Check logs first:**
   ```bash
   docker-compose logs --tail=100
   ```

2. **Search for error messages:**
   ```bash
   docker-compose logs | grep -i "error"
   ```

3. **Check container status:**
   ```bash
   docker-compose ps
   docker ps -a
   ```

4. **Verify environment variables:**
   ```bash
   cat backend/.env | grep DB_
   ```

## 13. Backup Before Major Changes

```bash
# Backup database
docker-compose exec mysql mysqldump -u laravel -ppassword rent_management > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup environment files
cp .env .env.backup
cp backend/.env backend/.env.backup
```

## Quick Reference Card

```bash
# SSH Connect
ssh username@50.6.203.46

# Navigate to project
cd /home/htmaldives/rent-management

# View logs
docker-compose logs backend --tail=50 -f

# Run migration
docker-compose exec backend php artisan migrate:fresh --force

# Edit file
nano backend/database/migrations/filename.php

# Restart service
docker-compose restart backend

# Check container status
docker-compose ps
```

---

**Note:** Replace placeholders like `username`, `password`, and file paths with your actual credentials and paths.

**Last Updated:** Based on current project structure and common issues encountered during deployment.

