<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\HasApiTokens;

class AuthController extends Controller
{
    /**
     * Register a new user
     */
    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'sometimes|in:admin,property_manager,accountant',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            // Check if user already exists
            $existingUser = User::where('email', $request->email)->first();
            if ($existingUser) {
                return response()->json([
                    'message' => 'User already exists with this email'
                ], 400);
            }

            // Get or create role
            $roleName = $request->role ?? 'property_manager';
            $role = Role::where('name', $roleName)->first();
            
            if (!$role) {
                $role = Role::create([
                    'name' => $roleName,
                    'display_name' => ucfirst(str_replace('_', ' ', $roleName)),
                    'description' => 'Auto-created role',
                    'permissions' => [],
                    'is_active' => true,
                ]);
            }

            // Create user
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role_id' => $role->id,
                'legacy_role' => $roleName,
                'is_active' => true,
            ]);

            // Create token
            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'message' => 'User registered successfully',
                'user' => $user->load('role'),
                'token' => $token
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Registration failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Login user
     */
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        // Rate limiting
        $key = 'login:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => 'Too many login attempts. Please try again in ' . $seconds . ' seconds.'
            ], 429);
        }

        try {
            $user = User::where('email', $request->email)->first();

            if (!$user || !Hash::check($request->password, $user->password)) {
                RateLimiter::hit($key, 60); // 1 minute
                return response()->json([
                    'message' => 'Invalid credentials'
                ], 401);
            }

            if (!$user->is_active) {
                return response()->json([
                    'message' => 'Account is deactivated'
                ], 401);
            }

            if ($user->is_locked) {
                return response()->json([
                    'message' => 'Account is locked due to too many failed attempts'
                ], 401);
            }

            // Reset login attempts on successful login
            $user->resetLoginAttempts();

            // Create token
            $token = $user->createToken('auth-token')->plainTextToken;

            // Update last login
            $user->update(['last_login' => now()]);

            return response()->json([
                'message' => 'Login successful',
                'user' => $user->load('role'),
                'token' => $token
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Login failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Logout user
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $request->user()->currentAccessToken()->delete();
            
            return response()->json([
                'message' => 'Logout successful'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Logout failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current user
     */
    public function me(Request $request): JsonResponse
    {
        try {
            $user = $request->user()->load('role');
            
            return response()->json([
                'user' => $user
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to get user data',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Change password
     */
    public function changePassword(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $user = $request->user();

            if (!Hash::check($request->current_password, $user->password)) {
                return response()->json([
                    'message' => 'Current password is incorrect'
                ], 400);
            }

            $user->update([
                'password' => Hash::make($request->new_password)
            ]);

            return response()->json([
                'message' => 'Password changed successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Password change failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update profile
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|min:2|max:255',
            'mobile' => 'sometimes|nullable|string|max:20',
            'id_card_number' => 'sometimes|nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $user = $request->user();
            $user->update($request->only(['name', 'mobile', 'id_card_number']));

            return response()->json([
                'message' => 'Profile updated successfully',
                'user' => $user->load('role')
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Profile update failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}