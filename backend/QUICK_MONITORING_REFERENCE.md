# Quick Monitoring Reference

## Start Monitoring

```powershell
cd backend
.\monitor-server.ps1
```

## Check Health

**Browser:**
- http://localhost:8000/api/v1/health
- http://localhost:8000/api/v1/health/diagnostics
- http://localhost:8000/api/v1/health/crashes

**Command Line:**
```powershell
curl http://localhost:8000/api/v1/health
```

## View Crash Reports

```powershell
# Last 7 days
php artisan crash:view

# Last 30 days
php artisan crash:view --days=30

# Specific file
php artisan crash:view --file=crash-2024-01-15_103045.json
```

## Check Logs

```powershell
# Laravel log (last 50 lines)
Get-Content storage\logs\laravel.log -Tail 50

# Monitor log
Get-Content storage\logs\server-monitor.log -Tail 50

# Crash log
Get-Content storage\logs\crashes.log -Tail 50
```

## Common Issues

**Server stopped:**
1. Check crash reports: `php artisan crash:view`
2. Check Laravel log: `Get-Content storage\logs\laravel.log -Tail 50`
3. Check monitor log: `Get-Content storage\logs\server-monitor.log -Tail 50`

**High memory:**
- Check health endpoint for memory usage
- Review recent code changes
- Check for memory leaks

**Database issues:**
- Verify MySQL is running in Laragon
- Check `.env` database credentials
- Test: `php artisan tinker` → `DB::connection()->getPdo();`

## Files to Check

- `storage/logs/laravel.log` - Main application log
- `storage/logs/server-monitor.log` - Monitor activity
- `storage/logs/crashes.log` - Crash log
- `storage/logs/crashes/*.json` - Individual crash reports
- `storage/logs/server-crashes.log` - Monitor-detected crashes

## Health Check Status

- **healthy** - All systems operational
- **degraded** - Some issues but still functional
- **unhealthy** - Critical issues, server may not be working properly

