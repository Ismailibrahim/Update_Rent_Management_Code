# Backend Server Crash Investigation

## Problem
Backend server stops automatically when code is modified.

## Possible Causes

### 1. **OPcache Issues** (Most Likely)
- **Issue**: OPcache may be caching old code when files change
- **Solution**: Disable OPcache for CLI in development
- **Check**: Look for `opcache.enable_cli=1` in php.ini

### 2. **Composer Autoloader**
- **Issue**: When new classes/files are added, autoloader needs regeneration
- **Solution**: Run `composer dump-autoload` after file changes

### 3. **PHP Syntax Errors**
- **Issue**: Syntax errors in modified files cause server to crash
- **Solution**: Always verify syntax before saving
- **Check**: Use `php -l filename.php` or run `check-syntax.ps1`

### 4. **Laravel Configuration Cache**
- **Issue**: Cached config may reference old code
- **Solution**: Clear caches: `php artisan config:clear && php artisan cache:clear`

### 5. **File Permissions**
- **Issue**: Server can't read modified files
- **Solution**: Check file permissions on Windows

## Immediate Fixes

### Step 1: Check for Syntax Errors
```powershell
cd backend
.\check-syntax.ps1
```

### Step 2: Clear All Caches
```powershell
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
composer dump-autoload
```

### Step 3: Disable OPcache for Development
Add to `php.ini` (or create `php-cli.ini`):
```ini
opcache.enable_cli=0
opcache.enable=0
```

### Step 4: Restart Server
```powershell
.\start-server.ps1
```

## Prevention

1. **Always run syntax check** before committing changes
2. **Clear caches** after modifying controllers/resources
3. **Use `composer dump-autoload`** when adding new classes
4. **Monitor logs** in `storage/logs/laravel.log` for errors

## Files Modified Recently
- `app/Http/Controllers/Api/V1/PropertyController.php`
- `app/Http/Resources/PropertyResource.php`

## Next Steps
1. Verify syntax of modified files
2. Clear all Laravel caches
3. Regenerate autoloader
4. Restart server and monitor logs

