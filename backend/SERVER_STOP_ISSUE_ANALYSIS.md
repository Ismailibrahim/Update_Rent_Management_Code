# Server Stop Issue - Root Cause Analysis

## Problem Summary
The Laravel backend server (`php artisan serve`) stops automatically without clear error messages in the logs.

## Investigation Findings

### 1. **Process Behavior**
- ✅ PHP processes are running (2 detected)
- ✅ Port 8000 is in use
- ❌ Process stops unexpectedly (monitor detects "No PHP artisan serve process detected")
- ❌ No fatal PHP errors in logs

### 2. **Common Error Patterns Found**
- Database errors: Missing `nationalities` table (shouldn't crash server)
- Route errors: Missing `login` route (handled gracefully)
- No fatal errors or memory exhaustion detected

### 3. **Most Likely Root Causes**

#### **A. OPcache Enabled for CLI (HIGH PROBABILITY)**
**Issue**: OPcache caches compiled PHP code. When enabled for CLI, it can cause the server to use stale code after file changes, leading to crashes.

**Symptoms**:
- Server stops after code changes
- No clear error in logs
- Process just disappears

**Solution**:
1. Find your `php.ini` file (usually in Laragon: `C:\laragon\bin\php\php-8.x\php.ini`)
2. Add or modify these settings:
   ```ini
   opcache.enable_cli=0
   opcache.enable=0  ; Or set to 1 for web, but 0 for CLI
   ```
3. Restart the server

**Quick Check**:
```powershell
php -r "echo ini_get('opcache.enable_cli') ? 'ENABLED (PROBLEM!)' : 'Disabled (OK)';"
```

#### **B. Windows Process Timeout/Resource Limits**
**Issue**: Windows may kill long-running processes that appear idle or consume too many resources.

**Symptoms**:
- Server stops after a period of inactivity
- No error messages
- Process just terminates

**Solution**:
1. Check Windows Event Viewer for process termination events:
   - Open Event Viewer → Windows Logs → Application
   - Look for events around the time the server stops
2. Check Task Scheduler for any tasks that might kill PHP processes
3. Verify antivirus isn't blocking/quarantining PHP

#### **C. Database Connection Issues**
**Issue**: Database connection failures or timeouts can cause the server to hang and eventually be killed.

**Symptoms**:
- Server stops after database operations
- Database errors in logs (like missing tables)
- Connection timeouts

**Solution**:
1. Ensure MySQL/MariaDB is running in Laragon
2. Verify database credentials in `.env`
3. Run migrations to create missing tables:
   ```powershell
   php artisan migrate
   ```
4. Check database connection timeout settings

#### **D. File Watcher/Antivirus Interference**
**Issue**: Antivirus or file watchers may interfere with PHP processes accessing files.

**Symptoms**:
- Server stops when files are accessed
- Random stops during development

**Solution**:
1. Add project folder to antivirus exclusions
2. Disable file watchers if not needed
3. Check Windows Defender exclusions

## Immediate Fixes to Try

### Fix 1: Disable OPcache for CLI
```powershell
# Find php.ini location
php --ini

# Edit php.ini and add:
opcache.enable_cli=0
```

### Fix 2: Clear All Caches
```powershell
php artisan config:clear
php artisan cache:clear
php artisan route:clear
php artisan view:clear
composer dump-autoload
```

### Fix 3: Check Database
```powershell
# Test database connection
php artisan tinker
# Then in tinker:
DB::connection()->getPdo();
```

### Fix 4: Run Migrations
```powershell
php artisan migrate
```

### Fix 5: Use the Auto-Restart Script
The `start-server.ps1` script should automatically restart the server if it crashes. Make sure you're using it:
```powershell
.\start-server.ps1
```

## Prevention Strategies

1. **Always use the monitoring script**: `monitor-server.ps1` will alert you when the server stops
2. **Check logs regularly**: Review `storage/logs/laravel.log` for patterns
3. **Keep database in sync**: Run migrations regularly
4. **Disable OPcache for development**: Only enable it in production
5. **Monitor system resources**: Ensure adequate memory and CPU

## Diagnostic Commands

Run the diagnostic script:
```powershell
.\diagnose-server-issue.ps1
```

Check recent errors:
```powershell
Get-Content storage\logs\laravel.log -Tail 50 | Select-String "ERROR|CRITICAL|FATAL"
```

Check if server is running:
```powershell
Get-NetTCPConnection -LocalPort 8000
Get-Process -Name "php" -ErrorAction SilentlyContinue
```

## Next Steps

1. **First**: Check and disable OPcache for CLI (most common cause)
2. **Second**: Run migrations to fix database issues
3. **Third**: Clear all caches
4. **Fourth**: Use the auto-restart script (`start-server.ps1`)
5. **Fifth**: Monitor with `monitor-server.ps1` to catch when it stops

## If Problem Persists

1. Check Windows Event Viewer for system-level errors
2. Review antivirus logs for blocked processes
3. Check Laragon logs for MySQL/php-fpm issues
4. Try running server with verbose output:
   ```powershell
   php artisan serve --verbose
   ```
5. Check PHP error log (usually in Laragon: `C:\laragon\bin\php\php-8.x\logs\php_error.log`)

