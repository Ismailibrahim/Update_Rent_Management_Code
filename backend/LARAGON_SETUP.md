# Laragon Setup Guide

This guide explains how to set up the monitoring system to work with Laragon.

## Option 1: Start Server + Monitor Together (Recommended)

Use the batch file to start both the server and monitor:

1. **Double-click** `start-with-monitor-laragon.bat` in the `backend` folder
   - This will open two windows:
     - Laravel Backend Server (running `php artisan serve`)
     - Server Monitor (checking health every 30 seconds)

2. The server will be available at:
   - API: http://localhost:8000/api/v1
   - Health: http://localhost:8000/api/v1/health

## Option 2: Use Laragon's Terminal + Monitor

If you prefer to start the server through Laragon's interface:

1. **Start the server** using Laragon's terminal or interface
   ```powershell
   cd D:\Sandbox\RentApplicaiton\backend
   php artisan serve
   ```

2. **In a separate terminal**, start the monitor:
   - Double-click `start-monitor-laragon.bat`
   - Or run: `powershell -ExecutionPolicy Bypass -File monitor-server.ps1`

## Option 3: Add to Laragon's Startup

You can configure Laragon to automatically start the monitor:

### Method A: Using Laragon's "Start All" Feature

1. Open Laragon
2. Go to **Menu** → **Tools** → **Quick add**
3. Add a custom service:
   - Name: `Backend Monitor`
   - Command: `powershell -ExecutionPolicy Bypass -File "D:\Sandbox\RentApplicaiton\backend\monitor-server.ps1"`
   - Working Directory: `D:\Sandbox\RentApplicaiton\backend`

### Method B: Create a Startup Script

1. Create a file `laragon-startup.bat` in your project root:
   ```batch
   @echo off
   cd /d "D:\Sandbox\RentApplicaiton\backend"
   start "Backend Monitor" powershell -ExecutionPolicy Bypass -File "monitor-server.ps1"
   ```

2. Add this to Laragon's startup scripts (if available)

## Health Check Endpoints

Once the server is running, you can check health:

- **Basic Health**: http://localhost:8000/api/v1/health
- **Diagnostics**: http://localhost:8000/api/v1/health/diagnostics
- **Crash Summary**: http://localhost:8000/api/v1/health/crashes

## Troubleshooting

### PowerShell Execution Policy Error

If you get an execution policy error:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Server Not Starting

1. Make sure Laragon is running
2. Check if port 8000 is available:
   ```powershell
   netstat -ano | findstr :8000
   ```
3. If port is in use, change the port in `start-with-monitor-laragon.bat`:
   ```batch
   php artisan serve --port=8001
   ```

### Monitor Can't Connect

1. Verify the server is running: http://localhost:8000/api/v1
2. Check the API URL in `monitor-server.ps1` matches your server port
3. Check firewall settings

### Path Issues

If scripts can't find files:
- Make sure you're running from the `backend` directory
- Use absolute paths in batch files if needed
- Check that all files are in the correct locations

## Integration with Laragon Services

### Auto-Start on Laragon Startup

1. Create `laragon-services.json` in Laragon's config (if supported)
2. Or use Laragon's service manager to add the monitor

### Database Monitoring

The monitor also checks database connectivity. Make sure:
- MySQL is running in Laragon
- Database credentials in `.env` are correct
- Database exists and migrations are run

## Quick Commands

**Start everything:**
```batch
start-with-monitor-laragon.bat
```

**Start monitor only:**
```batch
start-monitor-laragon.bat
```

**View crash reports:**
```powershell
php artisan crash:view
```

**Check health:**
```powershell
curl http://localhost:8000/api/v1/health
```

## Next Steps

1. Test the setup by starting the server and monitor
2. Visit the health endpoint to verify monitoring works
3. Let it run and check logs if issues occur
4. Review crash reports when server stops unexpectedly

For more details, see:
- `MONITORING_GUIDE.md` - Complete monitoring guide
- `QUICK_MONITORING_REFERENCE.md` - Quick reference

