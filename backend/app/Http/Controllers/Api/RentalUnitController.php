<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RentalUnit;
use App\Models\Property;
use App\Models\Asset;
use App\Models\RentalUnitAsset;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class RentalUnitController extends Controller
{
    /**
     * Display a listing of rental units
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = RentalUnit::with(['property', 'tenant', 'assets' => function($query) {
                $query->orderBy('rental_unit_assets.updated_at', 'desc');
            }]);

            // Property filter
            if ($request->has('property_id') && $request->property_id) {
                $query->where('property_id', $request->property_id);
            }

            // Tenant filter
            if ($request->has('tenant_id') && $request->tenant_id) {
                $query->where('tenant_id', $request->tenant_id);
            }

            // Status filter
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Available units filter
            if ($request->has('available') && $request->available) {
                $query->where('status', 'available')->whereNull('tenant_id');
            }

            $rentalUnits = $query->orderBy('floor_number', 'asc')
                ->orderBy('unit_number', 'asc')
                ->get();

            // Log asset details for debugging
            foreach ($rentalUnits as $unit) {
                if ($unit->assets->count() > 0) {
                    Log::info('Unit assets debug', [
                        'unit_id' => $unit->id,
                        'unit_number' => $unit->unit_number,
                        'assets' => $unit->assets->map(function($asset) {
                            return [
                                'asset_id' => $asset->id,
                                'asset_name' => $asset->name,
                                'pivot_quantity' => $asset->pivot->quantity ?? 'null',
                                'pivot_is_active' => $asset->pivot->is_active ?? 'null',
                                'pivot_updated_at' => $asset->pivot->updated_at ?? 'null'
                            ];
                        })
                    ]);
                }
            }

            Log::info('Rental Units Index Response', [
                'total_units' => $rentalUnits->count(),
                'units_with_assets' => $rentalUnits->filter(fn($unit) => $unit->assets->count() > 0)->count()
            ]);

            return response()->json([
                'rentalUnits' => $rentalUnits
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch rental units',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created rental unit
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'property_id' => 'required|exists:properties,id',
            'unit_number' => 'required|string|max:50',
            'unit_type' => ['required', Rule::in(['residential', 'office', 'shop', 'warehouse', 'other'])],
            'floor_number' => 'required|integer|min:1',
            // Updated to match model structure - flat fields
            'number_of_rooms' => 'required|integer|min:0',
            'number_of_toilets' => 'required|integer|min:0',
            'square_feet' => 'nullable|numeric|min:0',
            // Utility meter information
            'water_meter_number' => 'nullable|string|max:100',
            'water_billing_account' => 'nullable|string|max:100',
            'electricity_meter_number' => 'nullable|string|max:100',
            'electricity_billing_account' => 'nullable|string|max:100',
            // Access card numbers
            'access_card_numbers' => 'nullable|string|max:500',
            'rent_amount' => 'required|numeric|min:0',
            'deposit_amount' => 'required|numeric|min:0',
            'currency' => 'required|string|max:10',
            'status' => ['sometimes', Rule::in(['available', 'occupied', 'maintenance', 'renovation', 'deactivated'])],
            'tenant_id' => 'nullable|exists:tenants,id',
            'move_in_date' => 'nullable|date',
            'lease_end_date' => 'nullable|date|after:move_in_date',
            'amenities' => 'nullable|array',
            'photos' => 'nullable|array',
            'notes' => 'nullable|string',
            'assets' => 'nullable|array',
            'assets.*' => 'nullable',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            // Check property capacity
            $property = Property::findOrFail($request->property_id);
            $existingUnits = RentalUnit::where('property_id', $request->property_id)->count();
            
            if ($existingUnits >= $property->number_of_rental_units) {
                return response()->json([
                    'message' => 'Property has reached maximum rental unit capacity'
                ], 400);
            }

            // Check for duplicate unit number
            $existingUnit = RentalUnit::where('property_id', $request->property_id)
                ->where('unit_number', $request->unit_number)
                ->first();
                
            if ($existingUnit) {
                return response()->json([
                    'message' => 'Unit number already exists for this property'
                ], 400);
            }

            // Check for duplicate access card numbers
            if ($request->has('access_card_numbers') && !empty($request->access_card_numbers)) {
                $inputCards = $request->access_card_numbers;
                // Parse comma-separated card numbers
                $cardNumbers = array_map('trim', explode(',', $inputCards));
                $cardNumbers = array_filter($cardNumbers, function($card) {
                    return !empty($card);
                });
                
                if (!empty($cardNumbers)) {
                    // Load all existing rental units with card numbers once
                    $existingUnits = RentalUnit::whereNotNull('access_card_numbers')
                        ->where('access_card_numbers', '!=', '')
                        ->with('property')
                        ->get();
                    
                    // Check each input card number for duplicates
                    foreach ($cardNumbers as $cardNumber) {
                        foreach ($existingUnits as $existingUnit) {
                            if ($existingUnit->access_card_numbers) {
                                $existingCards = array_map('trim', explode(',', $existingUnit->access_card_numbers));
                                $existingCards = array_filter($existingCards, function($card) {
                                    return !empty($card);
                                });
                                
                                if (in_array($cardNumber, $existingCards)) {
                                    return response()->json([
                                        'message' => 'Validation failed',
                                        'errors' => [
                                            'access_card_numbers' => ["Access card number '{$cardNumber}' is already assigned to Unit {$existingUnit->unit_number} at {$existingUnit->property->name ?? 'Unknown Property'}"]
                                        ]
                                    ], 400);
                                }
                            }
                        }
                    }
                }
            }

            $rentalUnitData = $request->all();
            $rentalUnitData['status'] = $rentalUnitData['status'] ?? 'available';

            $rentalUnit = RentalUnit::create($rentalUnitData);

            // Handle asset assignments
            if ($request->has('assets') && is_array($request->assets)) {
                foreach ($request->assets as $assetData) {
                    $assetId = is_array($assetData) ? $assetData['asset_id'] : $assetData;
                    $quantity = is_array($assetData) ? ($assetData['quantity'] ?? 1) : 1;
                    
                    $asset = Asset::find($assetId);
                    if ($asset) {
                        // Check if asset is already assigned to THIS specific rental unit
                        $existingAssignment = RentalUnitAsset::where('rental_unit_id', $rentalUnit->id)
                            ->where('asset_id', $assetId)
                            ->where('is_active', true)
                            ->first();
                            
                        if (!$existingAssignment) {
                            RentalUnitAsset::create([
                                'rental_unit_id' => $rentalUnit->id,
                                'asset_id' => $assetId,
                                'assigned_date' => now(),
                                'notes' => 'Assigned during unit creation',
                                'is_active' => true,
                                'quantity' => $quantity,
                                'status' => 'working',
                            ]);
                            
                            Log::info('Asset assigned to rental unit', [
                                'rental_unit_id' => $rentalUnit->id,
                                'asset_id' => $assetId,
                                'asset_name' => $asset->name,
                                'quantity' => $quantity
                            ]);
                        } else {
                            Log::info('Asset already assigned to this rental unit', [
                                'rental_unit_id' => $rentalUnit->id,
                                'asset_id' => $assetId,
                                'asset_name' => $asset->name
                            ]);
                        }
                    } else {
                        Log::warning('Asset not found', [
                            'asset_id' => $assetId,
                            'rental_unit_id' => $rentalUnit->id
                        ]);
                    }
                }
            }

            $rentalUnit->load(['property', 'tenant', 'assets']);

            return response()->json([
                'message' => 'Rental unit created successfully',
                'rentalUnit' => $rentalUnit
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create rental unit',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified rental unit
     */
    public function show(RentalUnit $rentalUnit): JsonResponse
    {
        try {
            $rentalUnit->load(['property', 'tenant', 'assets']);

            return response()->json([
                'rentalUnit' => $rentalUnit
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch rental unit',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified rental unit
     */
    public function update(Request $request, RentalUnit $rentalUnit): JsonResponse
    {
        Log::info('Rental Unit Update Request', [
            'rental_unit_id' => $rentalUnit->id,
            'request_data' => $request->all(),
            'request_method' => $request->method(),
            'request_url' => $request->fullUrl()
        ]);
        
        $validator = Validator::make($request->all(), [
            'unit_number' => 'sometimes|string|max:50',
            'unit_type' => ['sometimes', Rule::in(['residential', 'office', 'shop', 'warehouse', 'other'])],
            'floor_number' => 'sometimes|integer|min:1',
            'unit_details' => 'sometimes|array',
            'unit_details.numberOfRooms' => 'sometimes|integer|min:0',
            'unit_details.numberOfToilets' => 'sometimes|numeric|min:0',
            'unit_details.squareFeet' => 'nullable|numeric|min:0',
            // Utility meter information
            'water_meter_number' => 'nullable|string|max:100',
            'water_billing_account' => 'nullable|string|max:100',
            'electricity_meter_number' => 'nullable|string|max:100',
            'electricity_billing_account' => 'nullable|string|max:100',
            // Access card numbers
            'access_card_numbers' => 'nullable|string|max:500',
            'financial' => 'sometimes|array',
            'financial.rentAmount' => 'sometimes|numeric|min:0',
            'financial.depositAmount' => 'sometimes|numeric|min:0',
            'financial.currency' => 'sometimes|string|max:10',
            'status' => ['sometimes', Rule::in(['available', 'occupied', 'maintenance', 'renovation', 'deactivated'])],
            'is_active' => 'sometimes|boolean',
            'tenant_id' => 'nullable|exists:tenants,id',
            'move_in_date' => 'nullable|date',
            'lease_end_date' => 'nullable|date|after:move_in_date',
            'amenities' => 'nullable|array',
            'photos' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            Log::info('Rental Unit Update Validation Failed', [
                'request_data' => $request->all(),
                'validation_errors' => $validator->errors()
            ]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
                'debug_data' => $request->all()
            ], 400);
        }

        try {
            $updateData = $request->all();
            
            // Validate status consistency
            if (isset($updateData['status'])) {
                if ($updateData['status'] === 'occupied' && empty($updateData['tenant_id'])) {
                    Log::info('Status validation failed: occupied without tenant_id', [
                        'status' => $updateData['status'],
                        'tenant_id' => $updateData['tenant_id'] ?? 'not set'
                    ]);
                    return response()->json([
                        'message' => 'Cannot set status to occupied without a tenant_id'
                    ], 400);
                }
                
                if ($updateData['status'] === 'available' && !empty($updateData['tenant_id'])) {
                    Log::info('Status validation failed: available with tenant_id', [
                        'status' => $updateData['status'],
                        'tenant_id' => $updateData['tenant_id']
                    ]);
                    return response()->json([
                        'message' => 'Cannot set status to available with a tenant_id'
                    ], 400);
                }
            }
            
            // Handle is_active changes FIRST - this takes precedence over tenant logic
            if (isset($updateData['is_active'])) {
                if ($updateData['is_active'] === false) {
                    // When deactivating, set status to deactivated (override any other status)
                    $updateData['status'] = 'deactivated';
                    Log::info('Deactivating rental unit', [
                        'rental_unit_id' => $rentalUnit->id,
                        'current_status' => $rentalUnit->status,
                        'new_status' => 'deactivated'
                    ]);
                } else if ($updateData['is_active'] === true && $rentalUnit->is_active === false) {
                    // When reactivating, set status to available (unless tenant is assigned)
                    if (empty($rentalUnit->tenant_id)) {
                        $updateData['status'] = 'available';
                        Log::info('Reactivating rental unit', [
                            'rental_unit_id' => $rentalUnit->id,
                            'current_status' => $rentalUnit->status,
                            'new_status' => 'available'
                        ]);
                    }
                }
            }
            
            // Handle tenant assignments (only if not deactivating)
            if (!isset($updateData['is_active']) || $updateData['is_active'] !== false) {
                // If tenant_id is being set to null, ensure status is available
                if (isset($updateData['tenant_id']) && is_null($updateData['tenant_id'])) {
                    $updateData['status'] = 'available';
                    $updateData['move_in_date'] = null;
                    $updateData['lease_end_date'] = null;
                }
                
                // If tenant_id is being set to a value, ensure status is occupied
                if (isset($updateData['tenant_id']) && !is_null($updateData['tenant_id'])) {
                    $updateData['status'] = 'occupied';
                    if (!isset($updateData['move_in_date'])) {
                        $updateData['move_in_date'] = now()->toDateString();
                    }
                }
            }
            
            // Check for duplicate access card numbers (excluding current rental unit)
            if (isset($updateData['access_card_numbers']) && !empty($updateData['access_card_numbers'])) {
                $inputCards = $updateData['access_card_numbers'];
                // Parse comma-separated card numbers
                $cardNumbers = array_map('trim', explode(',', $inputCards));
                $cardNumbers = array_filter($cardNumbers, function($card) {
                    return !empty($card);
                });
                
                if (!empty($cardNumbers)) {
                    // Load all existing rental units with card numbers once (excluding current unit)
                    $existingUnits = RentalUnit::whereNotNull('access_card_numbers')
                        ->where('access_card_numbers', '!=', '')
                        ->where('id', '!=', $rentalUnit->id) // Exclude current unit
                        ->with('property')
                        ->get();
                    
                    // Check each input card number for duplicates
                    foreach ($cardNumbers as $cardNumber) {
                        foreach ($existingUnits as $existingUnit) {
                            if ($existingUnit->access_card_numbers) {
                                $existingCards = array_map('trim', explode(',', $existingUnit->access_card_numbers));
                                $existingCards = array_filter($existingCards, function($card) {
                                    return !empty($card);
                                });
                                
                                if (in_array($cardNumber, $existingCards)) {
                                    return response()->json([
                                        'message' => 'Validation failed',
                                        'errors' => [
                                            'access_card_numbers' => ["Access card number '{$cardNumber}' is already assigned to Unit {$existingUnit->unit_number} at {$existingUnit->property->name ?? 'Unknown Property'}"]
                                        ]
                                    ], 400);
                                }
                            }
                        }
                    }
                }
            }

            Log::info('About to update rental unit', [
                'rental_unit_id' => $rentalUnit->id,
                'update_data' => $updateData
            ]);
            
            $rentalUnit->update($updateData);
            $rentalUnit->load(['property', 'tenant', 'assets']);

            Log::info('Rental unit updated successfully', [
                'rental_unit_id' => $rentalUnit->id
            ]);

            return response()->json([
                'message' => 'Rental unit updated successfully',
                'rentalUnit' => $rentalUnit
            ]);

        } catch (\Exception $e) {
            Log::error('Rental unit update failed', [
                'rental_unit_id' => $rentalUnit->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Failed to update rental unit',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified rental unit
     */
    public function destroy(RentalUnit $rentalUnit): JsonResponse
    {
        try {
            $rentalUnit->delete();

            return response()->json([
                'message' => 'Rental unit deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete rental unit',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get rental units for a specific property
     */
    public function getByProperty(Request $request, Property $property): JsonResponse
    {
        try {
            $rentalUnits = RentalUnit::where('property_id', $property->id)
                ->with(['property', 'tenant', 'assets'])
                ->orderBy('floor_number', 'asc')
                ->orderBy('unit_number', 'asc')
                ->get();

            return response()->json([
                'rentalUnits' => $rentalUnits
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch rental units',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add assets to rental unit
     */
    public function addAssets(Request $request, RentalUnit $rentalUnit): JsonResponse
    {
        Log::info('Add Assets Request', [
            'rental_unit_id' => $rentalUnit->id,
            'request_data' => $request->all()
        ]);

        $validator = Validator::make($request->all(), [
            'assets' => 'required|array',
            'assets.*.asset_id' => 'required|exists:assets,id',
            'assets.*.quantity' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            Log::error('Add Assets Validation Failed', [
                'errors' => $validator->errors()
            ]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $addedAssets = [];
            $skippedAssets = [];

            foreach ($request->assets as $assetData) {
                $assetId = $assetData['asset_id'];
                $quantity = $assetData['quantity'];
                
                $asset = Asset::find($assetId);
                
                if (!$asset) {
                    Log::warning('Asset not found', ['asset_id' => $assetId]);
                    $skippedAssets[] = $assetId;
                    continue;
                }

                // Check if asset is already assigned to this rental unit (including inactive)
                $existingAssignment = RentalUnitAsset::where('rental_unit_id', $rentalUnit->id)
                    ->where('asset_id', $assetId)
                    ->first();
                    
                if ($existingAssignment) {
                    // Update existing assignment (reactivate if needed and update quantity)
                    Log::info('Before update - existing assignment', [
                        'assignment_id' => $existingAssignment->id,
                        'current_quantity' => $existingAssignment->quantity,
                        'new_quantity' => $quantity
                    ]);
                    
                            $updated = $existingAssignment->update([
                                'quantity' => $quantity,
                                'is_active' => true,
                                'assigned_date' => now(),
                                'notes' => 'Updated via API',
                                'status' => 'working' // Reset to working when updated
                            ]);
                    
                    Log::info('Update result', [
                        'updated' => $updated,
                        'assignment_id' => $existingAssignment->id
                    ]);
                    
                    // Refresh the model to get updated data
                    $existingAssignment->refresh();
                    
                    Log::info('After update - existing assignment', [
                        'assignment_id' => $existingAssignment->id,
                        'quantity' => $existingAssignment->quantity
                    ]);
                    
                    Log::info('Asset assignment updated', [
                        'rental_unit_id' => $rentalUnit->id,
                        'asset_id' => $assetId,
                        'quantity' => $quantity,
                        'assignment_id' => $existingAssignment->id
                    ]);
                    $addedAssets[] = $assetId;
                    continue;
                }

                // Create new assignment with quantity
                $assignment = RentalUnitAsset::create([
                    'rental_unit_id' => $rentalUnit->id,
                    'asset_id' => $assetId,
                    'quantity' => $quantity,
                    'assigned_date' => now(),
                    'notes' => 'Assigned via API',
                    'is_active' => true,
                    'status' => 'working', // Default status
                ]);

                Log::info('Asset assigned successfully', [
                    'rental_unit_id' => $rentalUnit->id,
                    'asset_id' => $assetId,
                    'quantity' => $quantity,
                    'assignment_id' => $assignment->id
                ]);

                $addedAssets[] = $assetId;
            }

            Log::info('Add Assets Completed', [
                'rental_unit_id' => $rentalUnit->id,
                'added_assets' => $addedAssets,
                'skipped_assets' => $skippedAssets
            ]);

            return response()->json([
                'message' => 'Assets processed successfully',
                'added_assets' => $addedAssets,
                'skipped_assets' => $skippedAssets
            ]);

        } catch (\Exception $e) {
            Log::error('Add Assets Failed', [
                'rental_unit_id' => $rentalUnit->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Failed to add assets',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove asset from rental unit
     */
    public function removeAsset(Request $request, RentalUnit $rentalUnit, Asset $asset): JsonResponse
    {
        try {
            $assignment = RentalUnitAsset::where('rental_unit_id', $rentalUnit->id)
                ->where('asset_id', $asset->id)
                ->where('is_active', true)
                ->first();

            if (!$assignment) {
                return response()->json([
                    'message' => 'Asset assignment not found'
                ], 404);
            }

            $assignment->update(['is_active' => false]);

            return response()->json([
                'message' => 'Asset removed successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to remove asset',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get assets for rental unit
     */
    public function getAssets(RentalUnit $rentalUnit): JsonResponse
    {
        try {
            $assets = $rentalUnit->assets()->wherePivot('is_active', true)->get();

            return response()->json([
                'assets' => $assets
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch assets',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update asset status for a specific rental unit
     */
    public function updateAssetStatus(Request $request, RentalUnit $rentalUnit, $assetId): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'status' => ['required', Rule::in(['working', 'maintenance', 'repaired'])],
            'maintenance_notes' => 'nullable|string|max:1000',
            'quantity' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $assignment = RentalUnitAsset::where('rental_unit_id', $rentalUnit->id)
                ->where('asset_id', $assetId)
                ->where('is_active', true)
                ->first();

            if (!$assignment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Asset not found in this rental unit'
                ], 404);
            }

            $updateData = ['status' => $request->status];
            
            if ($request->has('maintenance_notes')) {
                $updateData['maintenance_notes'] = $request->maintenance_notes;
            }
            
            if ($request->has('quantity')) {
                $updateData['quantity'] = $request->quantity;
            }

            $assignment->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Asset status updated successfully',
                'assignment' => $assignment
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update asset status',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all rental unit assets that require maintenance
     */
    public function getMaintenanceAssets(): JsonResponse
    {
        try {
            $maintenanceAssets = RentalUnitAsset::with(['asset', 'rentalUnit.property', 'maintenanceCosts'])
                ->whereIn('status', ['maintenance', 'repaired'])
                ->where('is_active', true)
                ->orderBy('updated_at', 'desc')
                ->get();

            // Transform the data to include asset details and rental unit info
            $transformedAssets = $maintenanceAssets->map(function ($assignment) {
                // Get the most recent maintenance cost
                $maintenanceCost = $assignment->maintenanceCosts->sortByDesc('created_at')->first();
                
                return [
                    'id' => $assignment->id,
                    'asset_id' => $assignment->asset_id,
                    'rental_unit_id' => $assignment->rental_unit_id,
                    'name' => $assignment->asset->name,
                    'brand' => $assignment->asset->brand,
                    'category' => $assignment->asset->category,
                    'status' => $assignment->status,
                    'maintenance_notes' => $assignment->maintenance_notes,
                    'quantity' => $assignment->quantity,
                    'maintenance_cost' => $maintenanceCost ? [
                        'id' => $maintenanceCost->id,
                        'maintenance_request_id' => $maintenanceCost->maintenance_request_id,
                        'repair_cost' => $maintenanceCost->repair_cost,
                        'currency' => $maintenanceCost->currency,
                        'repair_date' => $maintenanceCost->repair_date,
                        'description' => $maintenanceCost->description,
                        'repair_provider' => $maintenanceCost->repair_provider,
                        'notes' => $maintenanceCost->notes,
                    ] : null,
                    'rental_unit' => [
                        'id' => $assignment->rentalUnit->id,
                        'unit_number' => $assignment->rentalUnit->unit_number,
                        'property' => [
                            'id' => $assignment->rentalUnit->property->id,
                            'name' => $assignment->rentalUnit->property->name,
                        ]
                    ],
                    'updated_at' => $assignment->updated_at,
                ];
            });

            return response()->json([
                'success' => true,
                'assets' => $transformedAssets
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch maintenance assets',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}