<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RentalUnitType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class RentalUnitTypeController extends Controller
{
    /**
     * Display a listing of rental unit types
     */
    public function index(Request $request): JsonResponse
    {
        try {
            Log::info('Rental Unit Type Index Request', [
                'request_params' => $request->all(),
                'active_only' => $request->has('active_only') ? $request->active_only : 'not set'
            ]);

            $query = RentalUnitType::query();

            // Filter by active status
            if ($request->has('active_only') && $request->active_only) {
                $query->active();
            }

            // Filter by category (property or unit)
            if ($request->has('category')) {
                $category = $request->category;
                if (in_array($category, ['property', 'unit'])) {
                    $query->byCategory($category);
                }
            }

            $unitTypes = $query->ordered()->get(['id','name','description','category','is_active','created_at','updated_at']);
            
            Log::info('Rental Unit Types Found', [
                'count' => $unitTypes->count(),
                'unit_types' => $unitTypes->toArray()
            ]);

            return response()->json([
                'success' => true,
                'data' => [
                    'unitTypes' => $unitTypes
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching rental unit types: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch rental unit types'
            ], 500);
        }
    }

    /**
     * Store a newly created rental unit type
     */
    public function store(Request $request): JsonResponse
    {
        Log::info('Rental Unit Type Store Request', [
            'request_data' => $request->all(),
            'headers' => $request->headers->all()
        ]);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100|unique:rental_unit_types,name',
            'description' => 'nullable|string|max:500',
            'category' => 'required|in:property,unit',
            'is_active' => 'nullable'
        ]);

        if ($validator->fails()) {
            Log::error('Rental Unit Type Validation Failed', [
                'errors' => $validator->errors()->toArray()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $createData = [
                'name' => $request->name,
                'description' => $request->description ?? '',
                'category' => $request->category ?? 'unit',
                'is_active' => $request->has('is_active') ? (bool) $request->is_active : true,
            ];
            
            Log::info('Creating Rental Unit Type', ['data' => $createData]);
            
            $unitType = RentalUnitType::create($createData);
            
            Log::info('Rental Unit Type Created Successfully', ['unit_type' => $unitType->toArray()]);

            return response()->json([
                'success' => true,
                'message' => 'Rental unit type created successfully',
                'data' => [
                    'unitType' => $unitType
                ]
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating rental unit type: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create rental unit type'
            ], 500);
        }
    }

    /**
     * Display the specified rental unit type
     */
    public function show(RentalUnitType $rentalUnitType): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'data' => [
                    'unitType' => $rentalUnitType
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error fetching rental unit type: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch rental unit type'
            ], 500);
        }
    }

    /**
     * Update the specified rental unit type
     */
    public function update(Request $request, RentalUnitType $rentalUnitType): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:100|unique:rental_unit_types,name,' . $rentalUnitType->id,
            'description' => 'nullable|string|max:500',
            'category' => 'sometimes|in:property,unit',
            'is_active' => 'nullable'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $updateData = [];
            if ($request->has('name')) $updateData['name'] = $request->name;
            if ($request->has('description')) $updateData['description'] = $request->description ?? '';
            if ($request->has('category')) $updateData['category'] = $request->category;
            if ($request->has('is_active')) $updateData['is_active'] = (bool) $request->is_active;
            
            $rentalUnitType->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Rental unit type updated successfully',
                'data' => [
                    'unitType' => $rentalUnitType
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error updating rental unit type: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update rental unit type'
            ], 500);
        }
    }

    /**
     * Remove the specified rental unit type
     */
    public function destroy(RentalUnitType $rentalUnitType): JsonResponse
    {
        try {
            // Check if any rental units are using this type
            $rentalUnitsCount = $rentalUnitType->rentalUnits()->count();
            if ($rentalUnitsCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete rental unit type that is being used by rental units',
                    'rental_units_count' => $rentalUnitsCount
                ], 400);
            }

            $rentalUnitType->delete();

            return response()->json([
                'success' => true,
                'message' => 'Rental unit type deleted successfully'
            ]);
        } catch (\Exception $e) {
            Log::error('Error deleting rental unit type: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete rental unit type'
            ], 500);
        }
    }
}
