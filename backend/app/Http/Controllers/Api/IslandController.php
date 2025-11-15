<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Island;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class IslandController extends Controller
{
    /**
     * Display a listing of islands
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Island::query();

            // Filter by active status if requested
            if ($request->has('active_only') && $request->boolean('active_only')) {
                $query->active();
            }

            // Search functionality
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            // Order results
            $islands = $query->ordered()->get();

            return response()->json([
                'data' => $islands,
                'count' => $islands->count()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch islands',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created island
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:islands,name',
            'code' => 'nullable|string|max:50|unique:islands,code',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $island = Island::create([
                'name' => $request->name,
                'code' => $request->code,
                'description' => $request->description,
                'is_active' => $request->has('is_active') ? $request->boolean('is_active') : true,
                'sort_order' => $request->sort_order ?? 0
            ]);

            return response()->json([
                'message' => 'Island created successfully',
                'data' => $island
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create island',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified island
     */
    public function show(int $id): JsonResponse
    {
        try {
            $island = Island::findOrFail($id);
            
            return response()->json([
                'data' => $island
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Island not found',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified island
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $island = Island::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:islands,name,' . $id,
            'code' => 'nullable|string|max:50|unique:islands,code,' . $id,
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $island->update([
                'name' => $request->name,
                'code' => $request->code,
                'description' => $request->description,
                'is_active' => $request->has('is_active') ? $request->boolean('is_active') : $island->is_active,
                'sort_order' => $request->sort_order ?? $island->sort_order
            ]);

            return response()->json([
                'message' => 'Island updated successfully',
                'data' => $island->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update island',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified island
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $island = Island::findOrFail($id);

            // Check if island is used in properties
            $propertyCount = \App\Models\Property::where('island', $island->name)->count();
            if ($propertyCount > 0) {
                return response()->json([
                    'message' => 'Cannot delete island. It is associated with ' . $propertyCount . ' propert' . ($propertyCount > 1 ? 'ies' : 'y'),
                    'property_count' => $propertyCount
                ], 400);
            }

            $island->delete();

            return response()->json([
                'message' => 'Island deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete island',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}

