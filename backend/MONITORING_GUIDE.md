# Backend Server Monitoring Guide

This guide explains how to monitor your Laravel backend server and diagnose issues when it stops unexpectedly.

## Quick Start

### 1. Start the Server Monitor

Run the server monitor in a separate terminal window:

```powershell
cd backend
.\monitor-server.ps1
```

The monitor will:
- Check server health every 30 seconds
- Log all checks to `storage/logs/server-monitor.log`
- Alert you when the server goes down
- Generate crash reports when issues are detected

### 2. Check Server Health

Visit the health check endpoint in your browser or use curl:

```powershell
# Basic health check
curl http://localhost:8000/api/v1/health

# Detailed diagnostics
curl http://localhost:8000/api/v1/health/diagnostics

# Crash summary
curl http://localhost:8000/api/v1/health/crashes
```

## Health Check Endpoints

### `/api/v1/health`

Returns a comprehensive health status with checks for:
- Database connectivity
- Memory usage
- Disk space
- Cache functionality
- Log file size
- Recent errors
- PHP configuration

**Response Example:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "database": {
      "healthy": true,
      "connected": true,
      "table_count": 25
    },
    "memory": {
      "healthy": true,
      "usage_percent": 45.2,
      "usage": "128.5 MB"
    },
    "disk": {
      "healthy": true,
      "usage_percent": 35.8
    }
  }
}
```

### `/api/v1/health/diagnostics`

Returns detailed diagnostic information including:
- Server information
- PHP configuration
- Database connection details
- Memory statistics
- Disk usage
- Recent errors from logs
- Route information

### `/api/v1/health/crashes`

Returns a summary of crashes in the last 7 days:
- Total crash count
- Crashes by type
- Recent crash details

## Crash Reports

When the server crashes, detailed crash reports are automatically generated in:
- `storage/logs/crashes/` - Individual crash report JSON files
- `storage/logs/crashes.log` - Text log of all crashes
- `storage/logs/server-crashes.log` - Monitor-detected crashes

### View Crash Reports

Use the artisan command to view crash summaries:

```powershell
# View crashes from last 7 days (default)
php artisan crash:view

# View crashes from last 30 days
php artisan crash:view --days=30

# View a specific crash report
php artisan crash:view --file=crash-2024-01-15_103045.json
```

## Monitoring Script

The `monitor-server.ps1` script continuously monitors your server:

**Features:**
- Health checks every 30 seconds
- Automatic crash detection
- Alerts after 3 consecutive failures
- Detailed logging
- Process monitoring

**Log Files:**
- `storage/logs/server-monitor.log` - All monitor activity
- `storage/logs/server-crashes.log` - Detected crashes

**Configuration:**
You can modify the script to change:
- Check interval (default: 30 seconds)
- Alert threshold (default: 3 failures)
- API URL (default: http://localhost:8000)

## Common Issues and Solutions

### Server Stops Unexpectedly

1. **Check the crash reports:**
   ```powershell
   php artisan crash:view --days=1
   ```

2. **Check the Laravel log:**
   ```powershell
   Get-Content backend\storage\logs\laravel.log -Tail 50
   ```

3. **Check the monitor log:**
   ```powershell
   Get-Content backend\storage\logs\server-monitor.log -Tail 50
   ```

### High Memory Usage

If memory usage is above 80%:
- Check for memory leaks in your code
- Increase PHP memory limit in `php.ini`
- Review recent code changes
- Check for large data processing operations

### Database Connection Issues

If database checks fail:
- Verify MySQL is running in Laragon
- Check database credentials in `.env`
- Test connection: `php artisan tinker` then `DB::connection()->getPdo();`

### Disk Space Issues

If disk usage is above 90%:
- Clean old log files: `php artisan log:clear` (if available)
- Rotate logs manually
- Check for large files in `storage/`

### High Error Count

If recent error count is high:
- Review the errors in `storage/logs/laravel.log`
- Check for recurring patterns
- Review recent code changes
- Check database queries for issues

## Automatic Crash Detection

The system automatically detects and reports:
- Fatal PHP errors
- Uncaught exceptions
- Memory exhaustion
- Database connection failures
- Critical application errors

All crashes are logged with:
- Timestamp
- Error type and message
- Server state at time of crash
- PHP configuration
- Memory usage
- Recent log entries
- Request information (if available)

## Best Practices

1. **Always run the monitor** when developing or in production
2. **Check health regularly** using the health endpoints
3. **Review crash reports** after any server issues
4. **Monitor log file sizes** - rotate logs regularly
5. **Set up alerts** for production environments
6. **Keep crash reports** for at least 30 days for analysis

## Integration with Laragon

Since you're using Laragon, you can:

1. **Add monitor to Laragon startup:**
   - Create a batch file that starts the monitor
   - Add it to Laragon's startup scripts

2. **Monitor multiple services:**
   - The monitor can check multiple endpoints
   - Modify the script to check frontend, backend, and database

3. **Automatic restarts:**
   - Use Laragon's service management
   - Combine with the monitor for automatic recovery

## Troubleshooting

### Monitor script won't run

If you get execution policy errors:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Health endpoint returns 404

Make sure:
- Server is running
- Routes are cached: `php artisan route:clear`
- Check route list: `php artisan route:list | findstr health`

### Crash reports not generating

Check:
- `storage/logs/crashes/` directory exists and is writable
- Laravel can write to storage directory
- Check permissions on Windows

## Next Steps

1. Set up the monitor to run automatically
2. Configure alerts for production
3. Set up log rotation
4. Create dashboards using health endpoint data
5. Integrate with monitoring services (optional)

For more information, check:
- `BACKEND_CRASH_INVESTIGATION.md` - Common crash causes
- `docs/STARTING_BACKEND.md` - Server startup guide
- Laravel documentation for error handling

