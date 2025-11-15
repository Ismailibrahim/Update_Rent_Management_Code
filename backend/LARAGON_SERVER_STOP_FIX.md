# Laragon Server Stop - Complete Fix Guide

## ✅ What Was Fixed

1. **OPcache disabled for CLI** - This was the most likely cause. OPcache can cause the server to use stale code and crash.
2. **Laravel caches cleared** - Ensures no stale configuration
3. **Autoloader regenerated** - Ensures all classes are properly loaded

## 🔍 Root Causes (Laragon-Specific)

### 1. **OPcache Enabled for CLI** ⚠️ MOST COMMON
**Problem**: OPcache caches compiled PHP code. When enabled for CLI, it can cause the server to crash after file changes.

**Fix Applied**: ✅ Disabled in `php.ini`:
```ini
opcache.enable_cli=0
```

### 2. **Laragon Auto-Stop Features**
**Problem**: Laragon may have settings that stop services after inactivity.

**Check**:
- Open Laragon
- Go to **Menu** → **Preferences** → **Services**
- Ensure "Auto Start" and "Stop All" settings are configured correctly
- Check if there's an idle timeout setting

### 3. **Windows Power Management**
**Problem**: Windows sleep/hibernate can kill processes.

**Fix**:
1. Open **Power Options** (Control Panel)
2. Set "Put computer to sleep" to **Never** while developing
3. Or use: `powercfg /change standby-timeout-ac 0`

### 4. **Windows Defender / Antivirus**
**Problem**: Security software may quarantine or block PHP processes.

**Fix**:
1. Open **Windows Security** → **Virus & threat protection**
2. Click **Manage settings**
3. Add exclusions for:
   - `C:\laragon\bin\php`
   - `D:\Sandbox\RentApplicaiton\backend`

### 5. **Database Connection Issues**
**Problem**: If MySQL stops or connection fails, the server may hang and be killed.

**Check**:
- Ensure MySQL is running in Laragon (green indicator)
- Test connection: `php artisan tinker` then `DB::connection()->getPdo();`
- Run migrations: `php artisan migrate`

### 6. **Port Conflicts**
**Problem**: Another process using port 8000.

**Check**:
```powershell
netstat -ano | findstr :8000
```

**Fix**: Kill the process or use a different port:
```powershell
php artisan serve --port=8001
```

### 7. **PHP Memory Exhaustion**
**Problem**: PHP runs out of memory.

**Check**: Look in `storage/logs/laravel.log` for "Allowed memory size" errors.

**Fix**: Increase in `php.ini`:
```ini
memory_limit=256M
```

### 8. **File System Watchers**
**Problem**: File watchers (like VS Code extensions) may interfere.

**Fix**: Disable unnecessary file watchers or add project to exclusions.

## 🚀 How to Start Server (After Fix)

### Option 1: Use Laragon Terminal
1. Open Laragon
2. Click **Terminal** button
3. Navigate to backend: `cd D:\Sandbox\RentApplicaiton\backend`
4. Run: `php artisan serve`

### Option 2: Use PowerShell with Auto-Restart
Use the `start-server.ps1` script which auto-restarts on crashes:
```powershell
.\start-server.ps1
```

### Option 3: Use Batch File
Double-click `start-with-monitor-laragon.bat` in the backend folder.

## 🔧 If Server Still Stops

### Step 1: Check Recent Errors
```powershell
Get-Content storage\logs\laravel.log -Tail 50 | Select-String "ERROR|FATAL|CRITICAL"
```

### Step 2: Check Windows Event Viewer
1. Open **Event Viewer**
2. Go to **Windows Logs** → **Application**
3. Look for events around the time server stopped
4. Check for process termination events

### Step 3: Monitor Server Process
```powershell
# Watch PHP processes
Get-Process php -ErrorAction SilentlyContinue | Format-Table Id, CPU, WorkingSet64

# Check if port is listening
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
```

### Step 4: Test Database Connection
```powershell
php artisan tinker
# Then in tinker:
DB::connection()->getPdo();
# Should return: PDO object
```

### Step 5: Check Laragon Logs
- Laragon logs: `C:\laragon\logs\`
- PHP error log: `C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\logs\php_error.log`

## 📋 Prevention Checklist

- [x] OPcache disabled for CLI
- [ ] Windows sleep/hibernate disabled
- [ ] Project folder in Windows Defender exclusions
- [ ] MySQL running in Laragon
- [ ] Database migrations up to date
- [ ] Using auto-restart script (`start-server.ps1`)
- [ ] Monitoring enabled (`monitor-server.ps1`)

## 🆘 Still Having Issues?

1. **Check PHP version compatibility**:
   ```powershell
   php -v
   ```
   Should be PHP 8.3.x

2. **Verify Laragon PHP path**:
   ```powershell
   php --ini
   ```
   Should point to Laragon's PHP

3. **Test basic PHP functionality**:
   ```powershell
   php -r "echo 'PHP is working';"
   ```

4. **Check Laravel installation**:
   ```powershell
   php artisan --version
   ```

5. **Review all logs**:
   - `storage/logs/laravel.log`
   - `storage/logs/server-crashes.log`
   - `storage/logs/server-monitor.log`

## 📝 Notes

- The fix script (`quick-fix-laragon.ps1`) has been run and OPcache is now disabled
- **You must restart your terminal/IDE** for PHP configuration changes to take effect
- The server should now be more stable, but if it still stops, check the items above

