<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Nationality;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class NationalityController extends Controller
{
    /**
     * Display a listing of nationalities
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Nationality::query();

            // Search functionality
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where('nationality', 'like', "%{$search}%");
            }

            // Order results
            $nationalities = $query->ordered()->get();

            return response()->json([
                'data' => $nationalities,
                'count' => $nationalities->count()
            ]);
        } catch (\Exception $e) {
            // Check if table doesn't exist
            $errorMessage = $e->getMessage();
            $isTableMissing = str_contains($e->getMessage(), "doesn't exist") || 
                             str_contains($e->getMessage(), "Base table or view not found");
            
            // Log the error for debugging
            \Log::error('Error fetching nationalities: ' . $errorMessage, [
                'trace' => $e->getTraceAsString(),
                'exception' => get_class($e)
            ]);
            
            if ($isTableMissing) {
                return response()->json([
                    'message' => 'The nationalities table does not exist',
                    'error' => $errorMessage,
                    'hint' => 'Please run the migration: php artisan migrate'
                ], 500);
            }
            
            return response()->json([
                'message' => 'Failed to fetch nationalities',
                'error' => $errorMessage,
                'hint' => 'Check the Laravel logs for more details: storage/logs/laravel.log'
            ], 500);
        }
    }

    /**
     * Store a newly created nationality
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'nationality' => 'required|string|max:255|unique:nationalities,nationality',
            'sort_order' => 'nullable|integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $nationality = Nationality::create([
                'nationality' => $request->nationality,
                'sort_order' => $request->sort_order ?? 0
            ]);

            return response()->json([
                'message' => 'Nationality created successfully',
                'data' => $nationality
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create nationality',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified nationality
     */
    public function show(int $id): JsonResponse
    {
        try {
            $nationality = Nationality::findOrFail($id);
            
            return response()->json([
                'data' => $nationality
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Nationality not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified nationality
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $nationality = Nationality::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'nationality' => 'required|string|max:255|unique:nationalities,nationality,' . $id,
            'sort_order' => 'nullable|integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $nationality->update([
                'nationality' => $request->nationality,
                'sort_order' => $request->sort_order ?? $nationality->sort_order
            ]);

            return response()->json([
                'message' => 'Nationality updated successfully',
                'data' => $nationality->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update nationality',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified nationality
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $nationality = Nationality::findOrFail($id);

            // Check if nationality is used in tenants
            $tenantCount = \App\Models\Tenant::where('nationality', $nationality->nationality)->count();
            if ($tenantCount > 0) {
                return response()->json([
                    'message' => 'Cannot delete nationality. It is associated with ' . $tenantCount . ' tenant' . ($tenantCount > 1 ? 's' : ''),
                    'tenant_count' => $tenantCount
                ], 400);
            }

            $nationality->delete();

            return response()->json([
                'message' => 'Nationality deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete nationality',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

