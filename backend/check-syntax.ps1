# PowerShell script to check PHP syntax of modified files
# This helps identify if syntax errors are causing server crashes

Write-Host "Checking PHP syntax of key files..." -ForegroundColor Cyan

$files = @(
    "app/Http/Controllers/Api/V1/PropertyController.php",
    "app/Http/Resources/PropertyResource.php"
)

$errors = @()

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Checking: $file" -ForegroundColor Yellow
        
        # Try to find PHP executable
        $phpPath = $null
        $possiblePaths = @(
            "C:\laragon\bin\php\php-8.3.0-Win32-vs16-x64\php.exe",
            "C:\laragon\bin\php\php-8.2.0-Win32-vs16-x64\php.exe",
            "C:\xampp\php\php.exe",
            "php"
        )
        
        foreach ($path in $possiblePaths) {
            if (Get-Command $path -ErrorAction SilentlyContinue) {
                $phpPath = $path
                break
            }
        }
        
        if ($phpPath) {
            $result = & $phpPath -l $file 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Syntax OK" -ForegroundColor Green
            } else {
                Write-Host "  ✗ Syntax Error!" -ForegroundColor Red
                Write-Host $result -ForegroundColor Red
                $errors += "$file : $result"
            }
        } else {
            Write-Host "  ⚠ PHP not found in PATH, skipping syntax check" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✗ File not found: $file" -ForegroundColor Red
        $errors += "File not found: $file"
    }
}

if ($errors.Count -gt 0) {
    Write-Host "`nErrors found:" -ForegroundColor Red
    $errors | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    exit 1
} else {
    Write-Host "`nAll files have valid syntax!" -ForegroundColor Green
    exit 0
}

