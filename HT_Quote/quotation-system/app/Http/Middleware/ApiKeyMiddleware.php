<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiKeyMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->header('X-API-Key');
        $expectedApiKey = env('API_KEY', 'your-secret-api-key-here');
        
        if (!$apiKey || $apiKey !== $expectedApiKey) {
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Valid API key required',
                'code' => 'UNAUTHORIZED'
            ], 401);
        }
        
        return $next($request);
    }
}
