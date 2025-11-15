<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string[]  ...$guards
     * @return mixed
     *
     * @throws \Illuminate\Auth\AuthenticationException
     */
    public function handle($request, Closure $next, ...$guards)
    {
        try {
            return parent::handle($request, $next, ...$guards);
        } catch (\Illuminate\Auth\AuthenticationException $e) {
            // For API routes, return JSON response instead of redirect
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                    'error' => 'Authentication required'
                ], 401);
            }
            
            throw $e;
        }
    }

    /**
     * Get the path the user should be redirected to when they are not authenticated.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string|null
     */
    protected function redirectTo($request)
    {
        // For API routes or JSON requests, don't redirect
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }
        
        // For web routes, redirect to login (if login route exists)
        return route('login');
    }
}
