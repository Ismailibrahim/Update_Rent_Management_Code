# Composer Install Issue - Fix Guide

## Problem
The `phiki/phiki` package is failing to install due to Windows path length limitations (260 character limit). Most packages installed successfully, but this one package is causing issues.

## Solutions

### Option 1: Enable Windows Long Path Support (Recommended)

1. **Open PowerShell as Administrator** (Right-click PowerShell → Run as Administrator)

2. **Enable long paths**:
   ```powershell
   New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
   ```

3. **Restart your computer** (required for the change to take effect)

4. **Then try installing again**:
   ```powershell
   cd backend
   $env:Path += ";C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64"
   composer install
   ```

### Option 2: Enable PHP Zip Extension (Faster Downloads)

The zip extension is missing, which forces Composer to use git instead of downloading zip files. This is slower and causes path issues.

1. **Open Laragon's PHP configuration**:
   - Open `C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.ini`

2. **Find the line** (around line 930):
   ```ini
   ;extension=zip
   ```

3. **Uncomment it** (remove the semicolon):
   ```ini
   extension=zip
   ```

4. **Save the file and restart Laragon**

5. **Clear Composer cache and try again**:
   ```powershell
   cd backend
   $env:Path += ";C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64"
   composer clear-cache
   composer install
   ```

### Option 3: Skip the Problematic Package Temporarily

If you don't need Laravel Pint immediately, you can:

1. **Edit `composer.json`** to temporarily remove the dependency, or
2. **Install without dev dependencies** (but phiki is a regular dependency, not dev)

Actually, `phiki/phiki` is required by Laravel Pint, which you might need. So this option isn't ideal.

### Option 4: Use a Shorter Path

If possible, move your project to a shorter path like `C:\Projects\RentManagement` instead of `D:\Sandbox\Rent Update\Update_Rent_Management_Code`. This will reduce the overall path length.

## Quick Fix (Try This First)

1. **Enable zip extension** in PHP (Option 2 above) - this is the fastest fix
2. **Clear cache**: `composer clear-cache`
3. **Try installing again**: `composer install`

## Verify Installation

After successful installation, check:

```powershell
cd backend
$env:Path += ";C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64"
php artisan --version
```

If this works, you're good to go!

## Next Steps After Installation

Once Composer install succeeds:

1. **Generate app key**:
   ```powershell
   php artisan key:generate
   ```

2. **Run migrations**:
   ```powershell
   php artisan migrate
   ```

3. **Start the server**:
   ```powershell
   php artisan serve
   ```

## Notes

- The zip extension is essential for faster Composer downloads
- Most packages (113 out of 114) installed successfully before hitting the phiki issue
- This is a known Windows limitation, but the fixes above should resolve it

