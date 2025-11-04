<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Illuminate\Http\JsonResponse;

class PermissionController extends Controller
{
    /**
     * Display a listing of permissions.
     */
    public function index(Request $request): JsonResponse
    {
        $permissions = Permission::all();

        // Group by category if requested
        if ($request->get('group_by_category', false)) {
            $grouped = $permissions->groupBy(function ($permission) {
                // Extract category from permission name (e.g., 'quotations.view' -> 'quotations')
                $parts = explode('.', $permission->name);
                return $parts[0] ?? 'other';
            })->map(function ($group, $category) {
                return [
                    'category' => $category,
                    'permissions' => $group->map(function ($permission) {
                        return [
                            'id' => $permission->id,
                            'name' => $permission->name,
                            'guard_name' => $permission->guard_name,
                        ];
                    })->values(),
                ];
            })->values();

            return response()->json(['data' => $grouped]);
        }

        return response()->json([
            'data' => $permissions->map(function ($permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'guard_name' => $permission->guard_name,
                ];
            })
        ]);
    }

    /**
     * Display the specified permission.
     */
    public function show(Permission $permission): JsonResponse
    {
        return response()->json([
            'data' => [
                'id' => $permission->id,
                'name' => $permission->name,
                'guard_name' => $permission->guard_name,
                'created_at' => $permission->created_at,
                'updated_at' => $permission->updated_at,
            ]
        ]);
    }
}





