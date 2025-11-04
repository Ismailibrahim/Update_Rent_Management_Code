<?php

namespace App\Http\Middleware;

use App\Services\AuditLogService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuditRequestMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        // Process the request
        $response = $next($request);

        // Calculate execution time
        $executionTime = (microtime(true) - $startTime) * 1000; // Convert to milliseconds

        // Don't log certain routes (health checks, etc.)
        if ($this->shouldSkipLogging($request)) {
            return $response;
        }

        // Log the API request
        try {
            AuditLogService::logApiRequest($executionTime, [
                'response_status' => $response->getStatusCode(),
                'metadata' => [
                    'route_name' => $request->route()?->getName(),
                    'controller' => $request->route()?->getActionName(),
                ],
            ]);
        } catch (\Exception $e) {
            // Don't fail the request if logging fails
            \Log::error('Audit logging failed: ' . $e->getMessage());
        }

        return $response;
    }

    /**
     * Determine if logging should be skipped for this request.
     */
    protected function shouldSkipLogging(Request $request): bool
    {
        $skipRoutes = [
            'api/health',
            'api/logout', // Already logged in AuthController
            'api/login',  // Already logged in AuthController
        ];

        $path = $request->path();

        // Skip health checks
        if (str_contains($path, 'health')) {
            return true;
        }

        // Skip OPTIONS requests (CORS preflight)
        if ($request->isMethod('OPTIONS')) {
            return true;
        }

        // Skip GET requests to list endpoints (to reduce noise)
        // Uncomment this if you want to exclude list views
        // if ($request->isMethod('GET') && str_contains($path, 'api/')) {
        //     return true;
        // }

        return false;
    }
}

