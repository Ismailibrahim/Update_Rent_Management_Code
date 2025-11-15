# Quick Fix for Laragon Server Stop Issues
Write-Host "Fixing Laragon server stop issues..." -ForegroundColor Cyan

$phpIniPath = "C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.ini"

# Fix 1: Disable OPcache for CLI
if (Test-Path $phpIniPath) {
    Write-Host "`n1. Fixing OPcache..." -ForegroundColor Yellow
    $content = Get-Content $phpIniPath -Raw
    
    # Replace any opcache.enable_cli setting
    $content = $content -replace ';?\s*opcache\.enable_cli\s*=\s*\d+', 'opcache.enable_cli=0'
    
    # If still not found, add it after [opcache] section
    if ($content -notmatch 'opcache\.enable_cli\s*=') {
        $content = $content -replace '(\[opcache\])', "[opcache]`nopcache.enable_cli=0"
    }
    
    Set-Content -Path $phpIniPath -Value $content -NoNewline
    Write-Host "   OPcache CLI disabled" -ForegroundColor Green
} else {
    Write-Host "`n1. PHP.ini not found. Please manually edit:" -ForegroundColor Yellow
    Write-Host "   $phpIniPath" -ForegroundColor White
    Write-Host "   Set: opcache.enable_cli=0" -ForegroundColor White
}

# Fix 2: Clear Laravel caches
Write-Host "`n2. Clearing Laravel caches..." -ForegroundColor Yellow
try {
    php artisan config:clear 2>&1 | Out-Null
    php artisan cache:clear 2>&1 | Out-Null
    php artisan route:clear 2>&1 | Out-Null
    Write-Host "   Caches cleared" -ForegroundColor Green
} catch {
    Write-Host "   Could not clear caches (PHP may not be in PATH)" -ForegroundColor Yellow
}

# Fix 3: Regenerate autoloader
Write-Host "`n3. Regenerating autoloader..." -ForegroundColor Yellow
try {
    composer dump-autoload 2>&1 | Out-Null
    Write-Host "   Autoloader regenerated" -ForegroundColor Green
} catch {
    Write-Host "   Could not regenerate autoloader" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "IMPORTANT: Restart your terminal/IDE" -ForegroundColor Yellow
Write-Host "Then restart the server with:" -ForegroundColor Yellow
Write-Host "  php artisan serve" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nAdditional checks:" -ForegroundColor Yellow
Write-Host "• Ensure MySQL is running in Laragon" -ForegroundColor White
Write-Host "• Check Windows Defender isn't blocking PHP" -ForegroundColor White
Write-Host "• Disable sleep/hibernate while developing" -ForegroundColor White

