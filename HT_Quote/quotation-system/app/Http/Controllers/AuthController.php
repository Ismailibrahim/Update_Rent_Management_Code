<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->username)
                   ->where('is_active', true)
                   ->first();

        if (!$user || !Hash::check($request->password, $user->password_hash)) {
            // Log failed login attempt
            AuditLogService::logAuth('login_failed', null, [
                'description' => "Failed login attempt for username: {$request->username}",
                'response_status' => 401,
                'metadata' => ['username' => $request->username],
            ]);

            throw ValidationException::withMessages([
                'username' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user->update(['last_login' => now()]);
        $token = $user->createToken('auth_token')->plainTextToken;

        // Log successful login
        AuditLogService::logAuth('login', $user->id, [
            'description' => "User logged in successfully",
            'response_status' => 200,
            'metadata' => ['token_created' => true],
        ]);

        // Load roles and permissions
        $user->load('roles', 'permissions');
        
        return response()->json([
            'user' => $user,
            'token' => $token,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'message' => 'Login successful'
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        $user->currentAccessToken()->delete();

        // Log logout
        AuditLogService::logAuth('logout', $user->id, [
            'description' => "User logged out successfully",
            'response_status' => 200,
        ]);

        return response()->json([
            'message' => 'Logout successful'
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->load('roles', 'permissions');
        
        return response()->json([
            'user' => $user,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    public function register(Request $request)
    {
        $request->validate([
            'username' => 'required|string|unique:users',
            'email' => 'required|string|email|unique:users',
            'password' => 'required|string|min:6',
            'full_name' => 'required|string',
            'role' => 'in:admin,user'
        ]);

        $user = User::create([
            'username' => $request->username,
            'email' => $request->email,
            'password_hash' => Hash::make($request->password),
            'full_name' => $request->full_name,
            'role' => $request->role ?? 'user',
            'is_active' => true,
        ]);

        // Log user registration
        AuditLogService::logCreated($user, [
            'description' => "New user registered: {$user->username}",
            'metadata' => ['role' => $user->role],
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
            'message' => 'Registration successful'
        ], 201);
    }
}