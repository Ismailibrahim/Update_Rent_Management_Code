<?php

namespace App\Http\Controllers;

use App\Models\Designation;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DesignationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        try {
            $designations = Designation::ordered()->get();
            return response()->json([
                'success' => true,
                'data' => $designations
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch designations',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:designations,name',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0'
        ]);

        try {
            $designation = Designation::create($validated);
            return response()->json([
                'success' => true,
                'message' => 'Designation created successfully',
                'data' => $designation
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create designation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Designation $designation): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $designation
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch designation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Designation $designation): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:designations,name,' . $designation->id,
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0'
        ]);

        try {
            $designation->update($validated);
            return response()->json([
                'success' => true,
                'message' => 'Designation updated successfully',
                'data' => $designation
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update designation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Designation $designation): JsonResponse
    {
        try {
            // Check if designation is being used
            $usageCount = \App\Models\CustomerContact::where('designation', $designation->name)->count();
            
            if ($usageCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete designation. It is being used by {$usageCount} contact(s)."
                ], 400);
            }

            $designation->delete();
            return response()->json([
                'success' => true,
                'message' => 'Designation deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete designation',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
