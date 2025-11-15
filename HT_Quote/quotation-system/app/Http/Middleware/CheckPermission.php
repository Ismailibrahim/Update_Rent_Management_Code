<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Services\AuditLogService;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();

        if (!$user) {
            AuditLogService::log('permission_denied', null, [
                'description' => "Unauthenticated user attempted to access: {$request->method()} {$request->path()}",
                'response_status' => 401,
                'metadata' => ['required_permission' => $permission],
            ]);

            return response()->json([
                'message' => 'Unauthenticated'
            ], 401);
        }

        if (!$user->can($permission)) {
            AuditLogService::log('permission_denied', $user->id, [
                'description' => "User '{$user->username}' denied permission '{$permission}' for: {$request->method()} {$request->path()}",
                'response_status' => 403,
                'metadata' => [
                    'required_permission' => $permission,
                    'user_roles' => $user->getRoleNames()->toArray(),
                    'user_permissions' => $user->getAllPermissions()->pluck('name')->toArray(),
                ],
            ]);

            return response()->json([
                'message' => 'You do not have permission to perform this action.',
                'permission' => $permission
            ], 403);
        }

        return $next($request);
    }
}





