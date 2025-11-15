# Server Health Monitor for Laravel Backend
# Continuously monitors server health and logs issues

$ErrorActionPreference = "Continue"
$script:CheckInterval = 30 # seconds
$script:ApiUrl = "http://localhost:8000/api/v1"
$script:HealthEndpoint = "$script:ApiUrl/health"
$script:DiagnosticsEndpoint = "$script:ApiUrl/health/diagnostics"
$script:LogFile = "storage\logs\server-monitor.log"
$script:CrashLogFile = "storage\logs\server-crashes.log"
$script:AlertThreshold = 3 # Alert after 3 consecutive failures
$script:ConsecutiveFailures = 0
$script:LastHealthStatus = $null

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    
    # Write to console with color
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN" { Write-Host $logMessage -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logMessage -ForegroundColor Green }
        default { Write-Host $logMessage -ForegroundColor Cyan }
    }
    
    # Write to log file
    $logPath = Join-Path $PSScriptRoot $script:LogFile
    $logDir = Split-Path $logPath -Parent
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    Add-Content -Path $logPath -Value $logMessage
}

function Write-CrashLog {
    param(
        [string]$Message,
        [hashtable]$Details = @{}
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $crashLogPath = Join-Path $PSScriptRoot $script:CrashLogFile
    $logDir = Split-Path $crashLogPath -Parent
    
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    $crashEntry = @"
========================================
CRASH DETECTED: $timestamp
========================================
$Message

Details:
$(($Details.GetEnumerator() | ForEach-Object { "$($_.Key): $($_.Value)" }) -join "`n")

========================================

"@
    
    Add-Content -Path $crashLogPath -Value $crashEntry
    Write-Log "Crash logged to $crashLogFile" "ERROR"
}

function Test-ServerHealth {
    try {
        $response = Invoke-WebRequest -Uri $script:HealthEndpoint -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        $healthData = $response.Content | ConvertFrom-Json
        
        if ($response.StatusCode -eq 200) {
            $script:ConsecutiveFailures = 0
            
            # Check health status
            $status = $healthData.status
            $checks = $healthData.checks
            
            # Log any unhealthy checks
            $unhealthyChecks = @()
            foreach ($check in $checks.PSObject.Properties) {
                $checkData = $check.Value
                if (-not $checkData.healthy) {
                    $unhealthyChecks += "$($check.Name): $($checkData.error -or 'Unhealthy')"
                }
            }
            
            if ($unhealthyChecks.Count -gt 0) {
                Write-Log "Server unhealthy: $($unhealthyChecks -join ', ')" "WARN"
            }
            
            # Check for warnings
            $warnings = @()
            foreach ($check in $checks.PSObject.Properties) {
                $checkData = $check.Value
                if ($checkData.warning) {
                    $warnings += "$($check.Name): $($checkData.warning)"
                }
            }
            
            if ($warnings.Count -gt 0) {
                Write-Log "Warnings: $($warnings -join ', ')" "WARN"
            }
            
            # Memory check
            if ($checks.memory) {
                $memPercent = $checks.memory.usage_percent
                if ($memPercent -gt 80) {
                    Write-Log "High memory usage: $memPercent%" "WARN"
                }
            }
            
            # Disk check
            if ($checks.disk) {
                $diskPercent = $checks.disk.usage_percent
                if ($diskPercent -gt 90) {
                    Write-Log "Low disk space: $diskPercent% used" "WARN"
                }
            }
            
            # Recent errors check
            if ($checks.recent_errors -and $checks.recent_errors.error_count -gt 10) {
                Write-Log "High error count: $($checks.recent_errors.error_count) errors in recent logs" "WARN"
            }
            
            $script:LastHealthStatus = $healthData
            return $true
        } else {
            Write-Log "Server returned status code: $($response.StatusCode)" "WARN"
            $script:ConsecutiveFailures++
            return $false
        }
    } catch {
        $script:ConsecutiveFailures++
        $errorMessage = $_.Exception.Message
        
        Write-Log "Health check failed: $errorMessage" "ERROR"
        
        if ($script:ConsecutiveFailures -ge $script:AlertThreshold) {
            Write-CrashLog "Server appears to be down or unresponsive" @{
                "ConsecutiveFailures" = $script:ConsecutiveFailures
                "Error" = $errorMessage
                "Endpoint" = $script:HealthEndpoint
            }
            
            Write-Log "ALERT: Server has been down for $($script:ConsecutiveFailures) consecutive checks!" "ERROR"
        }
        
        return $false
    }
}

function Get-Diagnostics {
    try {
        $response = Invoke-WebRequest -Uri $script:DiagnosticsEndpoint -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        $diagnostics = $response.Content | ConvertFrom-Json
        
        return $diagnostics
    } catch {
        Write-Log "Failed to get diagnostics: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

function Test-ProcessRunning {
    $processes = Get-Process php -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*artisan serve*" -or $_.ProcessName -eq "php"
    }
    
    return $processes.Count -gt 0
}

function Main {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Laravel Backend Server Monitor" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Monitoring: $script:HealthEndpoint" -ForegroundColor Yellow
    Write-Host "Check Interval: $script:CheckInterval seconds" -ForegroundColor Yellow
    Write-Host "Log File: $script:LogFile" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Log "Monitor started" "SUCCESS"
    
    while ($true) {
        $timestamp = Get-Date -Format "HH:mm:ss"
        
        # Check if PHP process is running
        $processRunning = Test-ProcessRunning
        
        if (-not $processRunning) {
            Write-Log "WARNING: No PHP artisan serve process detected!" "WARN"
        }
        
        # Perform health check
        $healthy = Test-ServerHealth
        
        if ($healthy) {
            Write-Log "Health check passed" "SUCCESS"
        } else {
            Write-Log "Health check failed (Consecutive failures: $script:ConsecutiveFailures)" "ERROR"
            
            # Get diagnostics on failure
            if ($script:ConsecutiveFailures -ge $script:AlertThreshold) {
                Write-Log "Collecting diagnostics..." "WARN"
                $diagnostics = Get-Diagnostics
                
                if ($diagnostics) {
                    Write-CrashLog "Server health check failed" @{
                        "ConsecutiveFailures" = $script:ConsecutiveFailures
                        "DatabaseConnected" = $diagnostics.database.connected
                        "MemoryUsage" = "$($diagnostics.memory.usage_percent)%"
                        "DiskUsage" = "$($diagnostics.disk.usage_percent)%"
                        "RecentErrors" = $diagnostics.recent_errors.Count
                    }
                }
            }
        }
        
        Write-Host ""
        Start-Sleep -Seconds $script:CheckInterval
    }
}

# Handle Ctrl+C gracefully
$null = Register-EngineEvent PowerShell.Exiting -Action {
    Write-Log "Monitor stopped by user" "INFO"
}

# Start monitoring
try {
    Main
} catch {
    Write-Log "Monitor error: $($_.Exception.Message)" "ERROR"
    Write-Log "Stack trace: $($_.ScriptStackTrace)" "ERROR"
} finally {
    Write-Log "Monitor stopped" "INFO"
}

