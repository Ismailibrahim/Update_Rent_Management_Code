# Clean Frontend and Backend Codebase
# This script removes build artifacts, cache files, and dependencies
# You can reinstall dependencies with: npm install (frontend) and composer install (backend)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleaning Codebase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "WARNING: This will remove:" -ForegroundColor Yellow
Write-Host "- node_modules (frontend)" -ForegroundColor White
Write-Host "- .next build folder (frontend)" -ForegroundColor White
Write-Host "- vendor folder (backend)" -ForegroundColor White
Write-Host "- Laravel cache files" -ForegroundColor White
Write-Host "- Build artifacts" -ForegroundColor White
Write-Host ""
Write-Host "Source code and config files will be preserved." -ForegroundColor Green
Write-Host ""

$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cleaning cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Starting cleanup..." -ForegroundColor Cyan
Write-Host ""

# Clean Frontend
Write-Host "[1/2] Cleaning Frontend..." -ForegroundColor Green
Set-Location frontend

# Remove node_modules
if (Test-Path "node_modules") {
    Write-Host "  Removing node_modules..." -ForegroundColor Yellow
    Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ node_modules removed" -ForegroundColor Green
} else {
    Write-Host "  node_modules not found" -ForegroundColor Gray
}

# Remove .next build folder
if (Test-Path ".next") {
    Write-Host "  Removing .next build folder..." -ForegroundColor Yellow
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ .next removed" -ForegroundColor Green
} else {
    Write-Host "  .next not found" -ForegroundColor Gray
}

# Remove npm cache
Write-Host "  Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null
Write-Host "  ✓ npm cache cleared" -ForegroundColor Green

# Remove .turbo if exists
if (Test-Path ".turbo") {
    Remove-Item -Path ".turbo" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ .turbo removed" -ForegroundColor Green
}

Set-Location ..
Write-Host "✓ Frontend cleaned" -ForegroundColor Green
Write-Host ""

# Clean Backend
Write-Host "[2/2] Cleaning Backend..." -ForegroundColor Green
Set-Location backend

# Remove vendor folder
if (Test-Path "vendor") {
    Write-Host "  Removing vendor folder..." -ForegroundColor Yellow
    Remove-Item -Path "vendor" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ vendor removed" -ForegroundColor Green
} else {
    Write-Host "  vendor not found" -ForegroundColor Gray
}

# Clear Laravel caches
Write-Host "  Clearing Laravel caches..." -ForegroundColor Yellow

# Bootstrap cache
if (Test-Path "bootstrap\cache") {
    Get-ChildItem -Path "bootstrap\cache" -Exclude ".gitignore" | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "    Bootstrap cache cleared" -ForegroundColor Gray
}

# Storage cache
if (Test-Path "storage\framework\cache") {
    Get-ChildItem -Path "storage\framework\cache" -Exclude ".gitignore" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "    Storage cache cleared" -ForegroundColor Gray
}

# Storage views
if (Test-Path "storage\framework\views") {
    Get-ChildItem -Path "storage\framework\views" -Exclude ".gitignore" | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "    Compiled views cleared" -ForegroundColor Gray
}

# Storage sessions (keep structure)
if (Test-Path "storage\framework\sessions") {
    Get-ChildItem -Path "storage\framework\sessions" -Exclude ".gitignore" | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "    Session files cleared" -ForegroundColor Gray
}

# Clear logs (keep last 7 days)
if (Test-Path "storage\logs") {
    Write-Host "  Cleaning old log files..." -ForegroundColor Yellow
    $cutoffDate = (Get-Date).AddDays(-7)
    Get-ChildItem -Path "storage\logs" -Filter "*.log" | Where-Object { $_.LastWriteTime -lt $cutoffDate } | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "    ✓ Old logs removed (kept last 7 days)" -ForegroundColor Gray
}

# Remove .env.backup if exists
if (Test-Path ".env.backup") {
    Remove-Item -Path ".env.backup" -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ .env.backup removed" -ForegroundColor Gray
}

# Clear Composer cache (optional)
Write-Host "  Clearing Composer cache..." -ForegroundColor Yellow
composer clear-cache 2>&1 | Out-Null
Write-Host "  ✓ Composer cache cleared" -ForegroundColor Green

Set-Location ..
Write-Host "✓ Backend cleaned" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To restore dependencies:" -ForegroundColor Yellow
Write-Host "  Frontend: cd frontend && npm install" -ForegroundColor White
Write-Host "  Backend:  cd backend && composer install" -ForegroundColor White
Write-Host ""
Write-Host "To start servers:" -ForegroundColor Yellow
Write-Host "  Frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host "  Backend:  cd backend && php artisan serve" -ForegroundColor White
Write-Host ""

