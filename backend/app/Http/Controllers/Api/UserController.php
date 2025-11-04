<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    /**
     * Display a listing of users
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = User::with('role');
            
            // Apply filters if provided
            if ($request->has('search')) {
                $search = $request->get('search');
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('legacy_role', 'like', "%{$search}%");
                });
            }
            
            if ($request->has('role')) {
                $query->where('legacy_role', $request->get('role'));
            }
            
            if ($request->has('status')) {
                $query->where('is_active', $request->get('status') === 'active');
            }
            
            $users = $query->orderBy('created_at', 'desc')->get();
            
            return response()->json([
                'success' => true,
                'users' => $users
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch users',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created user
     */
    public function store(Request $request): JsonResponse
    {
        // Debug: Log the incoming request data
        \Log::info('User creation request data:', $request->all());
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'legacy_role' => 'required|in:admin,property_manager,accountant',
            'mobile' => 'nullable|string|max:20',
            'id_card_number' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $role = Role::where('name', $request->legacy_role)->first();
            if (!$role) {
                $role = Role::create([
                    'name' => $request->legacy_role,
                    'display_name' => ucfirst(str_replace('_', ' ', $request->legacy_role)),
                    'description' => 'Auto-created role for ' . $request->legacy_role,
                    'permissions' => [],
                    'is_active' => true,
                ]);
            }

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role_id' => $role->id,
                'legacy_role' => $request->legacy_role,
                'mobile' => $request->mobile,
                'id_card_number' => $request->id_card_number,
                'is_active' => $request->is_active ?? true,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'User created successfully',
                'user' => $user->load('role')
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified user
     */
    public function show($id): JsonResponse
    {
        return response()->json([
            'success' => true,
            'user' => null
        ]);
    }

    /**
     * Update the specified user
     */
    public function update(Request $request, $id): JsonResponse
    {
        $user = User::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|min:2|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $id,
            'password' => 'sometimes|string|min:6',
            'legacy_role' => 'sometimes|in:admin,property_manager,accountant',
            'mobile' => 'nullable|string|max:20',
            'id_card_number' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $data = $request->only(['name', 'email', 'mobile', 'id_card_number', 'legacy_role', 'is_active']);

            if ($request->has('password')) {
                $data['password'] = Hash::make($request->password);
            }

            if ($request->has('legacy_role')) {
                $role = Role::where('name', $request->legacy_role)->first();
                if (!$role) {
                    $role = Role::create([
                        'name' => $request->legacy_role,
                        'display_name' => ucfirst(str_replace('_', ' ', $request->legacy_role)),
                        'description' => 'Auto-created role for ' . $request->legacy_role,
                        'permissions' => [],
                        'is_active' => true,
                    ]);
                }
                $data['role_id'] = $role->id;
            }

            $user->update($data);

            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'user' => $user->load('role')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update user',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified user
     */
    public function destroy($id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);
            $user->delete();

            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}