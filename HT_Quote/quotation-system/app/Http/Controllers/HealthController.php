<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

class HealthController extends Controller
{
    /**
     * Health check endpoint
     */
    public function check(): JsonResponse
    {
        try {
            $startTime = microtime(true);
            
            // Check database connection
            DB::connection()->getPdo();
            $dbStatus = 'connected';
            
            // Check cache
            $cacheStatus = 'working';
            try {
                Cache::put('health_check', 'ok', 60);
                $cacheValue = Cache::get('health_check');
                if ($cacheValue !== 'ok') {
                    $cacheStatus = 'failed';
                }
            } catch (\Exception $e) {
                $cacheStatus = 'failed';
            }
            
            $responseTime = round((microtime(true) - $startTime) * 1000, 2);
            
            return response()->json([
                'status' => 'healthy',
                'timestamp' => now()->toISOString(),
                'database' => $dbStatus,
                'cache' => $cacheStatus,
                'response_time_ms' => $responseTime,
                'version' => app()->version(),
                'environment' => app()->environment(),
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'unhealthy',
                'timestamp' => now()->toISOString(),
                'error' => $e->getMessage(),
                'database' => 'failed',
                'cache' => 'unknown',
            ], 500);
        }
    }
    
    /**
     * Detailed system status
     */
    public function status(): JsonResponse
    {
        try {
            $status = [
                'status' => 'healthy',
                'timestamp' => now()->toISOString(),
                'services' => [
                    'database' => $this->checkDatabase(),
                    'cache' => $this->checkCache(),
                    'storage' => $this->checkStorage(),
                ],
                'system' => [
                    'php_version' => PHP_VERSION,
                    'laravel_version' => app()->version(),
                    'environment' => app()->environment(),
                    'memory_usage' => $this->getMemoryUsage(),
                ]
            ];
            
            return response()->json($status);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'unhealthy',
                'error' => $e->getMessage(),
                'timestamp' => now()->toISOString(),
            ], 500);
        }
    }
    
    private function checkDatabase(): array
    {
        try {
            $startTime = microtime(true);
            DB::select('SELECT 1');
            $responseTime = round((microtime(true) - $startTime) * 1000, 2);
            
            return [
                'status' => 'connected',
                'response_time_ms' => $responseTime,
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
            ];
        }
    }
    
    private function checkCache(): array
    {
        try {
            $startTime = microtime(true);
            Cache::put('health_check_cache', 'ok', 60);
            $value = Cache::get('health_check_cache');
            $responseTime = round((microtime(true) - $startTime) * 1000, 2);
            
            return [
                'status' => $value === 'ok' ? 'working' : 'failed',
                'response_time_ms' => $responseTime,
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
            ];
        }
    }
    
    private function checkStorage(): array
    {
        try {
            $storagePath = storage_path();
            $writable = is_writable($storagePath);
            $freeSpace = disk_free_space($storagePath);
            
            return [
                'status' => $writable ? 'accessible' : 'failed',
                'writable' => $writable,
                'free_space_mb' => round($freeSpace / 1024 / 1024, 2),
            ];
        } catch (\Exception $e) {
            return [
                'status' => 'failed',
                'error' => $e->getMessage(),
            ];
        }
    }
    
    private function getMemoryUsage(): array
    {
        return [
            'current_mb' => round(memory_get_usage() / 1024 / 1024, 2),
            'peak_mb' => round(memory_get_peak_usage() / 1024 / 1024, 2),
            'limit_mb' => ini_get('memory_limit'),
        ];
    }
}









