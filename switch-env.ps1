# Environment switching script for Rent Management System (PowerShell)
# Usage: .\switch-env.ps1 [dev|prod|status]

param(
    [Parameter(Position=0)]
    [ValidateSet('dev', 'prod', 'development', 'production', 'status', 'stop', 'help')]
    [string]$Command = 'help'
)

$envFile = ".env.current"
$composeBase = "docker-compose.yml"
$composeDev = "docker-compose.dev.yml"
$composeProd = "docker-compose.prod.yml"

function Stop-AllContainers {
    Write-Host "Stopping all containers..." -ForegroundColor Yellow
    docker-compose -f $composeBase -f $composeDev down 2>$null
    docker-compose -f $composeBase -f $composeProd down 2>$null
    docker-compose -f $composeBase down 2>$null
}

function Start-Development {
    Write-Host "Starting DEVELOPMENT environment..." -ForegroundColor Green
    Stop-AllContainers
    "dev" | Out-File -FilePath $envFile -Encoding utf8
    docker-compose -f $composeBase -f $composeDev up -d --build
    Write-Host "✓ Development environment started!" -ForegroundColor Green
    Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Green
    Write-Host "  Backend API: http://localhost:8000/api" -ForegroundColor Green
    Write-Host "  Nginx: http://localhost" -ForegroundColor Green
}

function Start-Production {
    Write-Host "Starting PRODUCTION environment..." -ForegroundColor Green
    Stop-AllContainers
    "prod" | Out-File -FilePath $envFile -Encoding utf8
    docker-compose -f $composeBase -f $composeProd up -d --build
    Write-Host "✓ Production environment started!" -ForegroundColor Green
}

function Show-Status {
    if (Test-Path $envFile) {
        $currentEnv = Get-Content $envFile
        Write-Host "Current environment: $currentEnv" -ForegroundColor Green
    } else {
        Write-Host "Current environment: Unknown" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Container status:"
    docker-compose ps 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "No active containers"
    }
}

function Show-Help {
    Write-Host "Environment Switcher for Rent Management System" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\switch-env.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  dev     - Start development environment"
    Write-Host "  prod    - Start production environment"
    Write-Host "  status  - Show current environment status"
    Write-Host "  stop    - Stop all containers"
    Write-Host "  help    - Show this help message"
    Write-Host ""
}

# Main script logic
switch ($Command.ToLower()) {
    { $_ -in 'dev', 'development' } {
        Start-Development
    }
    { $_ -in 'prod', 'production' } {
        Start-Production
    }
    'status' {
        Show-Status
    }
    'stop' {
        Stop-AllContainers
        Write-Host "All containers stopped." -ForegroundColor Green
    }
    default {
        Show-Help
    }
}

