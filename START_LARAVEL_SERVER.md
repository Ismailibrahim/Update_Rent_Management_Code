# How to Start Laravel Server

## Option 1: Using Laragon (Recommended)

1. **Open Laragon**
2. **Click "Start All"** - This should start Apache/Nginx and MySQL
3. **Check the status indicators** - They should turn green
4. **Access your site:**
   - If virtual host configured: `http://rentapp.test`
   - Or: `http://localhost`

## Option 2: Use Laravel Built-in Server (Quick Fix)

### Method A: Double-click the batch file
1. Navigate to `backend` folder
2. Double-click `start-server.bat`
3. Server will start at `http://localhost:8000`

### Method B: Use Laragon Terminal
1. In Laragon, click **"Terminal"** button
2. Run:
   ```bash
   cd D:\Sandbox\RentApplicaiton\backend
   php artisan serve
   ```
3. Server will start at `http://localhost:8000`

### Method C: Use Command Prompt/PowerShell
1. Open Command Prompt or PowerShell
2. Navigate to Laragon's PHP folder (usually `C:\laragon\bin\php\php-8.x`)
3. Or add PHP to PATH temporarily
4. Run:
   ```bash
   cd D:\Sandbox\RentApplicaiton\backend
   php artisan serve
   ```

## Option 3: Fix Laragon Apache/Nginx

If "Start All" doesn't work in Laragon:

1. **Check Laragon Menu:**
   - Menu → Apache → Start (or Nginx → Start)
   - Check for error messages

2. **Check Port Conflicts:**
   - Laragon → Menu → Tools → Check Ports
   - If port 80 is in use, stop the conflicting service

3. **Check Logs:**
   - Laragon → Menu → Apache → Error Log (or Nginx → Error Log)
   - Look for startup errors

4. **Restart Laragon:**
   - Close Laragon completely
   - Open Task Manager
   - End any `httpd.exe` or `nginx.exe` processes
   - Restart Laragon as Administrator
   - Click "Start All"

## Quick Test

Once server is running, test:
- `http://localhost:8000` (Laravel built-in server)
- `http://localhost` (Apache/Nginx)
- `http://rentapp.test` (Virtual host, if configured)

## Troubleshooting

**If you get "php is not recognized":**
- Use Laragon's Terminal (it has PHP in PATH)
- Or navigate to Laragon's PHP folder first

**If port 8000 is in use:**
```bash
php artisan serve --port=8001
```

**If you get database errors:**
```bash
php artisan migrate
```

