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
use Illuminate\Support\Facades\DB;
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

            // Use pagination instead of loading all records
            $perPage = $request->get('per_page', 15);
            $page = $request->get('page', 1);
            
            $rentalUnits = $query->orderBy('floor_number', 'asc')
                ->orderBy('unit_number', 'asc')
                ->paginate($perPage, ['*'], 'page', $page);

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
                'total_units' => $rentalUnits->total(),
                'current_page' => $rentalUnits->currentPage(),
                'per_page' => $rentalUnits->perPage(),
                'units_with_assets' => $rentalUnits->filter(fn($unit) => $unit->assets->count() > 0)->count()
            ]);

            return response()->json([
                'rentalUnits' => $rentalUnits->items(),
                'pagination' => [
                    'current_page' => $rentalUnits->currentPage(),
                    'last_page' => $rentalUnits->lastPage(),
                    'per_page' => $rentalUnits->perPage(),
                    'total' => $rentalUnits->total(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Rental Units Index Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            return response()->json([
                'message' => 'Failed to fetch rental units',
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    /**
     * Store a newly created rental unit
     */
    public function store(Request $request): JsonResponse
    {
        // Convert empty strings to null for nullable numeric fields
        $requestData = $request->all();
        $nullableNumericFields = ['floor_number', 'number_of_rooms', 'number_of_toilets', 'square_feet'];
        foreach ($nullableNumericFields as $field) {
            // Handle empty strings, null, or missing values
            if (isset($requestData[$field])) {
                if ($requestData[$field] === '' || $requestData[$field] === null) {
                    unset($requestData[$field]); // Remove from request data - Laravel nullable will handle missing fields
                }
            }
        }
        
        $validator = Validator::make($requestData, [
            'property_id' => 'required|exists:properties,id',
            'unit_number' => 'required|string|max:50',
            'unit_type' => ['required', Rule::in(['residential', 'office', 'shop', 'warehouse', 'other'])],
            'floor_number' => 'nullable|integer|min:1',
            // Updated to match model structure - flat fields
            'number_of_rooms' => 'nullable|integer|min:0',
            'number_of_toilets' => 'nullable|numeric|min:0',
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
            'assets.*.asset_id' => 'required|exists:assets,id',
            'assets.*.quantity' => 'required|integer|min:1',
            'assets.*.asset_location' => 'nullable|string|max:255',
            'assets.*.installation_date' => 'nullable|date',
            'assets.*.serial_numbers' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            // Check property capacity
            $property = Property::findOrFail($requestData['property_id']);
            $existingUnits = RentalUnit::where('property_id', $requestData['property_id'])->count();
            $remainingUnits = $property->number_of_rental_units - $existingUnits;
            
            if ($existingUnits >= $property->number_of_rental_units) {
                return response()->json([
                    'message' => sprintf(
                        'Cannot create rental unit. Property "%s" has reached its maximum capacity of %d units. No more units can be added to this property.',
                        $property->name,
                        $property->number_of_rental_units
                    ),
                    'property_name' => $property->name,
                    'max_units' => $property->number_of_rental_units,
                    'existing_units' => $existingUnits,
                    'remaining_units' => 0
                ], 400);
            }

            // Check for duplicate unit number
            $existingUnit = RentalUnit::where('property_id', $requestData['property_id'])
                ->where('unit_number', $requestData['unit_number'])
                ->first();
                
            if ($existingUnit) {
                return response()->json([
                    'message' => 'Unit number already exists for this property'
                ], 400);
            }

            // Check for duplicate access card numbers - optimized with database queries
            if (isset($requestData['access_card_numbers']) && !empty($requestData['access_card_numbers'])) {
                $inputCards = $requestData['access_card_numbers'];
                // Parse comma-separated card numbers
                $cardNumbers = array_map('trim', explode(',', $inputCards));
                $cardNumbers = array_filter($cardNumbers, function($card) {
                    return !empty($card);
                });
                
                if (!empty($cardNumbers)) {
                    // Use database query instead of nested loops - much more efficient
                    foreach ($cardNumbers as $cardNumber) {
                        // Check if card number exists in any rental unit using FIND_IN_SET or LIKE
                        $existingUnit = RentalUnit::whereNotNull('access_card_numbers')
                            ->where('access_card_numbers', '!=', '')
                            ->where(function($query) use ($cardNumber) {
                                $query->whereRaw('FIND_IN_SET(?, access_card_numbers)', [$cardNumber])
                                      ->orWhere('access_card_numbers', 'like', "{$cardNumber},%")
                                      ->orWhere('access_card_numbers', 'like', "%,{$cardNumber},%")
                                      ->orWhere('access_card_numbers', 'like', "%,{$cardNumber}");
                            })
                            ->with('property:id,name')
                            ->first();
                        
                        if ($existingUnit) {
                            $propertyName = $existingUnit->property?->name ?? 'Unknown Property';
                            return response()->json([
                                'message' => 'Validation failed',
                                'errors' => [
                                    'access_card_numbers' => ["Access card number '{$cardNumber}' is already assigned to Unit {$existingUnit->unit_number} at {$propertyName}"]
                                ]
                            ], 400);
                        }
                    }
                }
            }

            $rentalUnitData = $requestData;
            $rentalUnitData['status'] = $rentalUnitData['status'] ?? 'available';

            // Set default values for optional fields if not provided (handles case where migration hasn't been run)
            // These defaults will be used if the database columns are still NOT NULL
            if (!isset($rentalUnitData['floor_number'])) {
                $rentalUnitData['floor_number'] = 1; // Default to floor 1
            }
            if (!isset($rentalUnitData['number_of_rooms'])) {
                $rentalUnitData['number_of_rooms'] = 0; // Default to 0 rooms
            }
            if (!isset($rentalUnitData['number_of_toilets'])) {
                $rentalUnitData['number_of_toilets'] = 0; // Default to 0 toilets
            }

            try {
                $rentalUnit = RentalUnit::create($rentalUnitData);
            } catch (\Illuminate\Database\QueryException $e) {
                // Log the actual database error for debugging
                Log::error('Database error creating rental unit', [
                    'error' => $e->getMessage(),
                    'code' => $e->getCode(),
                    'data' => $rentalUnitData
                ]);
                
                // Check if it's a NOT NULL constraint violation
                if (str_contains($e->getMessage(), 'NOT NULL') || str_contains($e->getMessage(), 'cannot be null')) {
                    return response()->json([
                        'message' => 'Database schema error: Please run the migration to make floor_number, number_of_rooms, and number_of_toilets optional. Error: ' . $e->getMessage()
                    ], 500);
                }
                
                // Re-throw other database errors
                throw $e;
            }

            // Handle asset assignments
            if (isset($requestData['assets']) && is_array($requestData['assets'])) {
                foreach ($requestData['assets'] as $assetData) {
                    $assetId = is_array($assetData) ? $assetData['asset_id'] : $assetData;
                    $quantity = is_array($assetData) ? ($assetData['quantity'] ?? 1) : 1;
                    $serialNumbers = is_array($assetData) && isset($assetData['serial_numbers']) ? trim($assetData['serial_numbers']) : null;
                    $assetLocation = is_array($assetData) && isset($assetData['asset_location']) ? trim($assetData['asset_location']) : null;
                    $installationDate = is_array($assetData) && isset($assetData['installation_date']) ? $assetData['installation_date'] : null;
                    
                    $asset = Asset::find($assetId);
                    if ($asset) {
                        // Allow multiple entries of the same asset for different locations/installation dates
                        // No longer checking for existing assignments since we support multiple entries
                        $assignmentData = [
                            'rental_unit_id' => $rentalUnit->id,
                            'asset_id' => $assetId,
                            'assigned_date' => now(),
                            'notes' => 'Assigned during unit creation',
                            'is_active' => true,
                            'quantity' => $quantity,
                            'status' => 'working',
                        ];
                        
                        if ($serialNumbers !== null && $serialNumbers !== '') {
                            $assignmentData['serial_numbers'] = $serialNumbers;
                        }
                        
                        if ($assetLocation !== null && $assetLocation !== '') {
                            $assignmentData['asset_location'] = $assetLocation;
                        }
                        
                        if ($installationDate !== null && $installationDate !== '') {
                            $assignmentData['installation_date'] = $installationDate;
                        } else {
                            // Default to today's date if not provided
                            $assignmentData['installation_date'] = now()->toDateString();
                        }
                        
                        RentalUnitAsset::create($assignmentData);
                        
                        Log::info('Asset assigned to rental unit', [
                            'rental_unit_id' => $rentalUnit->id,
                            'asset_id' => $assetId,
                            'asset_name' => $asset->name,
                            'quantity' => $quantity,
                            'location' => $assetLocation,
                            'installation_date' => $installationDate
                        ]);
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

        } catch (\Illuminate\Database\QueryException $e) {
            // Log the database error
            Log::error('Database error creating rental unit', [
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
                'sql' => $e->getSql() ?? 'N/A',
                'bindings' => $e->getBindings() ?? []
            ]);
            
            return response()->json([
                'message' => 'Database error while creating rental unit',
                'error' => $e->getMessage(),
                'hint' => 'If you see a NOT NULL constraint error, please run the migration: php artisan migrate'
            ], 500);
        } catch (\Exception $e) {
            // Log the error
            Log::error('Error creating rental unit', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to create rental unit',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk store multiple rental units with upfront capacity validation
     */
    public function bulkStore(Request $request): JsonResponse
    {
        $requestData = $request->all();

        // Validate the request structure
        $validator = Validator::make($requestData, [
            'property_id' => 'required|exists:properties,id',
            'units' => 'required|array|min:1',
            'units.*.unit_number' => 'required|string|max:50',
            'units.*.unit_type' => ['required', Rule::in(['residential', 'office', 'shop', 'warehouse', 'other'])],
            'units.*.floor_number' => 'nullable|integer|min:1',
            'units.*.number_of_rooms' => 'nullable|integer|min:0',
            'units.*.number_of_toilets' => 'nullable|numeric|min:0',
            'units.*.square_feet' => 'nullable|numeric|min:0',
            'units.*.water_meter_number' => 'nullable|string|max:100',
            'units.*.water_billing_account' => 'nullable|string|max:100',
            'units.*.electricity_meter_number' => 'nullable|string|max:100',
            'units.*.electricity_billing_account' => 'nullable|string|max:100',
            'units.*.access_card_numbers' => 'nullable|string|max:500',
            'units.*.rent_amount' => 'required|numeric|min:0',
            'units.*.deposit_amount' => 'required|numeric|min:0',
            'units.*.currency' => 'required|string|max:10',
            'units.*.status' => ['sometimes', Rule::in(['available', 'occupied', 'maintenance', 'renovation', 'deactivated'])],
            'units.*.tenant_id' => 'nullable|exists:tenants,id',
            'units.*.move_in_date' => 'nullable|date',
            'units.*.lease_end_date' => 'nullable|date|after:units.*.move_in_date',
            'units.*.amenities' => 'nullable|array',
            'units.*.photos' => 'nullable|array',
            'units.*.notes' => 'nullable|string',
            'units.*.assets' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $propertyId = $requestData['property_id'];
            $units = $requestData['units'];
            $unitsToCreate = count($units);

            // Get property and check capacity UPFRONT
            $property = Property::findOrFail($propertyId);
            $existingUnits = RentalUnit::where('property_id', $propertyId)->count();
            $remainingUnits = $property->number_of_rental_units - $existingUnits;

            // Check if property has enough capacity for all units
            if ($remainingUnits < $unitsToCreate) {
                return response()->json([
                    'message' => sprintf(
                        'Cannot create %d rental unit(s). Property "%s" only has %d unit(s) remaining (maximum capacity: %d, existing: %d).',
                        $unitsToCreate,
                        $property->name,
                        $remainingUnits,
                        $property->number_of_rental_units,
                        $existingUnits
                    ),
                    'property_name' => $property->name,
                    'max_units' => $property->number_of_rental_units,
                    'existing_units' => $existingUnits,
                    'remaining_units' => $remainingUnits,
                    'requested_units' => $unitsToCreate
                ], 400);
            }

            // Get all existing unit numbers for this property to check duplicates
            $existingUnitNumbers = RentalUnit::where('property_id', $propertyId)
                ->pluck('unit_number')
                ->toArray();

            // Check for duplicate unit numbers within the request and with existing units
            $requestUnitNumbers = [];
            $duplicateInRequest = [];
            $duplicateWithExisting = [];

            foreach ($units as $index => $unit) {
                $unitNumber = $unit['unit_number'];
                
                // Check for duplicates within the request
                if (in_array($unitNumber, $requestUnitNumbers)) {
                    $duplicateInRequest[] = $unitNumber;
                } else {
                    $requestUnitNumbers[] = $unitNumber;
                }

                // Check for duplicates with existing units
                if (in_array($unitNumber, $existingUnitNumbers)) {
                    $duplicateWithExisting[] = $unitNumber;
                }
            }

            if (!empty($duplicateInRequest)) {
                return response()->json([
                    'message' => 'Duplicate unit numbers found within the request',
                    'errors' => [
                        'units' => ['The following unit numbers appear multiple times: ' . implode(', ', array_unique($duplicateInRequest))]
                    ],
                    'duplicate_units' => array_unique($duplicateInRequest)
                ], 400);
            }

            if (!empty($duplicateWithExisting)) {
                return response()->json([
                    'message' => 'Some unit numbers already exist for this property',
                    'errors' => [
                        'units' => ['The following unit numbers already exist: ' . implode(', ', array_unique($duplicateWithExisting))]
                    ],
                    'duplicate_units' => array_unique($duplicateWithExisting)
                ], 400);
            }

            // Check for duplicate access card numbers across all units (request + existing)
            $allAccessCards = [];
            $existingAccessCards = RentalUnit::whereNotNull('access_card_numbers')
                ->where('access_card_numbers', '!=', '')
                ->with('property')
                ->get();

            foreach ($existingAccessCards as $existingUnit) {
                if ($existingUnit->access_card_numbers) {
                    $cards = array_map('trim', explode(',', $existingUnit->access_card_numbers));
                    $cards = array_filter($cards, function($card) {
                        return !empty($card);
                    });
                    $allAccessCards = array_merge($allAccessCards, $cards);
                }
            }

            $duplicateAccessCards = [];
            foreach ($units as $unit) {
                if (isset($unit['access_card_numbers']) && !empty($unit['access_card_numbers'])) {
                    $inputCards = array_map('trim', explode(',', $unit['access_card_numbers']));
                    $inputCards = array_filter($inputCards, function($card) {
                        return !empty($card);
                    });
                    
                    foreach ($inputCards as $card) {
                        if (in_array($card, $allAccessCards)) {
                            $duplicateAccessCards[] = $card;
                        } else {
                            $allAccessCards[] = $card;
                        }
                    }
                }
            }

            if (!empty($duplicateAccessCards)) {
                return response()->json([
                    'message' => 'Some access card numbers are already assigned',
                    'errors' => [
                        'access_card_numbers' => ['The following access card numbers are already assigned: ' . implode(', ', array_unique($duplicateAccessCards))]
                    ],
                    'duplicate_access_cards' => array_unique($duplicateAccessCards)
                ], 400);
            }

            // All validations passed - create all units in a transaction
            DB::beginTransaction();

            try {
                $createdUnits = [];
                $errors = [];

                foreach ($units as $index => $unitData) {
                    try {
                        // Clean up null/empty values
                        $nullableNumericFields = ['floor_number', 'number_of_rooms', 'number_of_toilets', 'square_feet'];
                        foreach ($nullableNumericFields as $field) {
                            if (isset($unitData[$field]) && ($unitData[$field] === '' || $unitData[$field] === null)) {
                                unset($unitData[$field]);
                            }
                        }

                        // Set defaults
                        $unitData['property_id'] = $propertyId;
                        $unitData['status'] = $unitData['status'] ?? 'available';
                        
                        if (!isset($unitData['floor_number'])) {
                            $unitData['floor_number'] = 1;
                        }
                        if (!isset($unitData['number_of_rooms'])) {
                            $unitData['number_of_rooms'] = 0;
                        }
                        if (!isset($unitData['number_of_toilets'])) {
                            $unitData['number_of_toilets'] = 0;
                        }

                        // Store assets separately if provided
                        $assets = $unitData['assets'] ?? null;
                        unset($unitData['assets']);

                        $rentalUnit = RentalUnit::create($unitData);

                        // Handle asset assignments
                        if ($assets && is_array($assets)) {
                            foreach ($assets as $assetData) {
                                $assetId = is_array($assetData) ? $assetData['asset_id'] : $assetData;
                                $quantity = is_array($assetData) ? ($assetData['quantity'] ?? 1) : 1;
                                
                                $asset = Asset::find($assetId);
                                if ($asset) {
                                    $existingAssignment = RentalUnitAsset::where('rental_unit_id', $rentalUnit->id)
                                        ->where('asset_id', $assetId)
                                        ->where('is_active', true)
                                        ->first();
                                    
                                    if (!$existingAssignment) {
                                        RentalUnitAsset::create([
                                            'rental_unit_id' => $rentalUnit->id,
                                            'asset_id' => $assetId,
                                            'assigned_date' => now(),
                                            'notes' => 'Assigned during bulk unit creation',
                                            'is_active' => true,
                                            'quantity' => $quantity,
                                            'status' => 'working',
                                        ]);
                                    }
                                }
                            }
                        }

                        $rentalUnit->load(['property', 'tenant', 'assets']);
                        $createdUnits[] = $rentalUnit;

                    } catch (\Exception $e) {
                        Log::error('Error creating unit in bulk operation', [
                            'unit_index' => $index,
                            'unit_number' => $unitData['unit_number'] ?? 'unknown',
                            'error' => $e->getMessage()
                        ]);
                        $errors[] = [
                            'unit_number' => $unitData['unit_number'] ?? 'unknown',
                            'error' => $e->getMessage()
                        ];
                    }
                }

                // If any errors occurred, rollback and return error
                if (!empty($errors)) {
                    DB::rollBack();
                    return response()->json([
                        'message' => 'Failed to create some rental units',
                        'errors' => $errors,
                        'created_count' => count($createdUnits),
                        'failed_count' => count($errors)
                    ], 400);
                }

                // All units created successfully
                DB::commit();

                Log::info('Bulk rental units created successfully', [
                    'property_id' => $propertyId,
                    'property_name' => $property->name,
                    'units_created' => count($createdUnits),
                    'unit_numbers' => array_column($createdUnits, 'unit_number')
                ]);

                return response()->json([
                    'message' => sprintf(
                        'Successfully created %d rental unit(s) for property "%s"',
                        count($createdUnits),
                        $property->name
                    ),
                    'created_count' => count($createdUnits),
                    'rental_units' => $createdUnits
                ], 201);

            } catch (\Exception $e) {
                DB::rollBack();
                throw $e;
            }

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Property not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Error in bulk rental unit creation', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'property_id' => $requestData['property_id'] ?? null
            ]);
            
            return response()->json([
                'message' => 'Failed to create rental units',
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

        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Database error fetching rental unit', [
                'rental_unit_id' => $rentalUnit->id,
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
                'sql' => $e->getSql() ?? 'N/A',
            ]);
            
            // Check if it's a column not found error
            if (str_contains($e->getMessage(), "Unknown column 'serial_numbers'") || 
                str_contains($e->getMessage(), "serial_numbers") ||
                str_contains($e->getMessage(), "doesn't exist")) {
                return response()->json([
                    'message' => 'Database schema error: Please run the migration to add serial_numbers column. Run: php artisan migrate',
                    'error' => $e->getMessage(),
                    'hint' => 'Migration file: 2025_12_15_000000_add_serial_numbers_to_rental_unit_assets_table.php'
                ], 500);
            }
            
            return response()->json([
                'message' => 'Database error while fetching rental unit',
                'error' => $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            Log::error('Error fetching rental unit', [
                'rental_unit_id' => $rentalUnit->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
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
            'floor_number' => 'nullable|integer|min:1',
            'number_of_rooms' => 'nullable|integer|min:0',
            'number_of_toilets' => 'nullable|numeric|min:0',
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
            
            // Check for duplicate access card numbers (excluding current rental unit) - optimized
            if (isset($updateData['access_card_numbers']) && !empty($updateData['access_card_numbers'])) {
                $inputCards = $updateData['access_card_numbers'];
                // Parse comma-separated card numbers
                $cardNumbers = array_map('trim', explode(',', $inputCards));
                $cardNumbers = array_filter($cardNumbers, function($card) {
                    return !empty($card);
                });
                
                if (!empty($cardNumbers)) {
                    // Use database query instead of nested loops - much more efficient
                    foreach ($cardNumbers as $cardNumber) {
                        // Check if card number exists in any rental unit (excluding current) using FIND_IN_SET or LIKE
                        $existingUnit = RentalUnit::whereNotNull('access_card_numbers')
                            ->where('access_card_numbers', '!=', '')
                            ->where('id', '!=', $rentalUnit->id) // Exclude current unit
                            ->where(function($query) use ($cardNumber) {
                                $query->whereRaw('FIND_IN_SET(?, access_card_numbers)', [$cardNumber])
                                      ->orWhere('access_card_numbers', 'like', "{$cardNumber},%")
                                      ->orWhere('access_card_numbers', 'like', "%,{$cardNumber},%")
                                      ->orWhere('access_card_numbers', 'like', "%,{$cardNumber}");
                            })
                            ->with('property:id,name')
                            ->first();
                        
                        if ($existingUnit) {
                            $propertyName = $existingUnit->property?->name ?? 'Unknown Property';
                            return response()->json([
                                'message' => 'Validation failed',
                                'errors' => [
                                    'access_card_numbers' => ["Access card number '{$cardNumber}' is already assigned to Unit {$existingUnit->unit_number} at {$propertyName}"]
                                ]
                            ], 400);
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
            'assets.*.serial_numbers' => 'nullable|string',
            'assets.*.asset_location' => 'nullable|string|max:255',
            'assets.*.installation_date' => 'nullable|date',
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
                $serialNumbers = isset($assetData['serial_numbers']) ? trim($assetData['serial_numbers']) : null;
                $assetLocation = isset($assetData['asset_location']) ? trim($assetData['asset_location']) : null;
                $installationDate = isset($assetData['installation_date']) ? $assetData['installation_date'] : null;
                
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
                    
                            $updateData = [
                                'quantity' => $quantity,
                                'is_active' => true,
                                'assigned_date' => now(),
                                'notes' => 'Updated via API',
                                'status' => 'working' // Reset to working when updated
                            ];
                            
                            if ($serialNumbers !== null) {
                                $updateData['serial_numbers'] = $serialNumbers;
                            }
                            
                            if ($assetLocation !== null) {
                                $updateData['asset_location'] = $assetLocation;
                            }
                            
                            if ($installationDate !== null) {
                                $updateData['installation_date'] = $installationDate;
                            }
                            
                            $updated = $existingAssignment->update($updateData);
                    
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
                $assignmentData = [
                    'rental_unit_id' => $rentalUnit->id,
                    'asset_id' => $assetId,
                    'quantity' => $quantity,
                    'assigned_date' => now(),
                    'notes' => 'Assigned via API',
                    'is_active' => true,
                    'status' => 'working', // Default status
                ];
                
                if ($serialNumbers !== null) {
                    $assignmentData['serial_numbers'] = $serialNumbers;
                }
                
                if ($assetLocation !== null) {
                    $assignmentData['asset_location'] = $assetLocation;
                }
                
                if ($installationDate !== null) {
                    $assignmentData['installation_date'] = $installationDate;
                } else {
                    // Default to today's date if not provided
                    $assignmentData['installation_date'] = now()->toDateString();
                }
                
                $assignment = RentalUnitAsset::create($assignmentData);

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
            // Get RentalUnitAsset records with relationships loaded
            $rentalUnitAssets = RentalUnitAsset::with(['asset', 'rentalUnit'])
                ->where('rental_unit_id', $rentalUnit->id)
                ->where('is_active', true)
                ->orderBy('updated_at', 'desc')
                ->get();

            // Transform to match frontend expectations
            $assets = $rentalUnitAssets->map(function ($rentalUnitAsset) {
                return [
                    'id' => $rentalUnitAsset->id,
                    'asset_id' => $rentalUnitAsset->asset_id,
                    'rental_unit_id' => $rentalUnitAsset->rental_unit_id,
                    'quantity' => $rentalUnitAsset->quantity,
                    'serial_numbers' => $rentalUnitAsset->serial_numbers,
                    'purchase_date' => $rentalUnitAsset->assigned_date?->format('Y-m-d'),
                    'warranty_end_date' => null, // Not stored in current schema
                    'estimated_life_remaining' => null, // Not stored in current schema
                    'status' => $rentalUnitAsset->status ?? 'active',
                    'asset' => $rentalUnitAsset->asset ? [
                        'id' => $rentalUnitAsset->asset->id,
                        'name' => $rentalUnitAsset->asset->name,
                        'brand' => $rentalUnitAsset->asset->brand,
                        'category' => $rentalUnitAsset->asset->category,
                    ] : null,
                    'rental_unit' => $rentalUnitAsset->rentalUnit ? [
                        'id' => $rentalUnitAsset->rentalUnit->id,
                        'unit_number' => $rentalUnitAsset->rentalUnit->unit_number,
                    ] : null,
                ];
            });

            return response()->json([
                'assets' => $assets
            ]);

        } catch (\Exception $e) {
            Log::error('Get Assets Failed', [
                'rental_unit_id' => $rentalUnit->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Failed to fetch assets',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Bulk assign assets to multiple rental units
     */
    public function bulkAssignAssets(Request $request): JsonResponse
    {
        Log::info('Bulk Assign Assets Request', [
            'request_data' => $request->all()
        ]);

        $validator = Validator::make($request->all(), [
            'rental_unit_ids' => 'required|array|min:1',
            'rental_unit_ids.*' => 'required|exists:rental_units,id',
            'assets' => 'required|array|min:1',
            'assets.*.asset_id' => 'required|exists:assets,id',
            'assets.*.quantity' => 'required|integer|min:1',
            'assets.*.serial_numbers' => 'nullable|string',
            'assets.*.asset_location' => 'nullable|string|max:255',
            'assets.*.installation_date' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            Log::error('Bulk Assign Assets Validation Failed', [
                'errors' => $validator->errors()
            ]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $rentalUnitIds = $request->rental_unit_ids;
            $assets = $request->assets;
            
            $results = [
                'success' => 0,
                'failed' => 0,
                'total_units' => count($rentalUnitIds),
                'total_assets' => count($assets),
                'unit_results' => []
            ];

            DB::beginTransaction();

            foreach ($rentalUnitIds as $rentalUnitId) {
                $unitResult = [
                    'rental_unit_id' => $rentalUnitId,
                    'success' => 0,
                    'failed' => 0,
                    'skipped' => 0,
                    'errors' => []
                ];

                $rentalUnit = RentalUnit::find($rentalUnitId);
                
                if (!$rentalUnit) {
                    $unitResult['failed'] = count($assets);
                    $unitResult['errors'][] = 'Rental unit not found';
                    $results['failed']++;
                    $results['unit_results'][] = $unitResult;
                    continue;
                }

                foreach ($assets as $assetData) {
                    try {
                        $assetId = $assetData['asset_id'];
                        $quantity = $assetData['quantity'];
                        $serialNumbers = isset($assetData['serial_numbers']) ? trim($assetData['serial_numbers']) : null;
                        $assetLocation = isset($assetData['asset_location']) ? trim($assetData['asset_location']) : null;
                        $installationDate = isset($assetData['installation_date']) ? $assetData['installation_date'] : null;
                        
                        $asset = Asset::find($assetId);
                        
                        if (!$asset) {
                            $unitResult['failed']++;
                            $unitResult['errors'][] = "Asset ID {$assetId} not found";
                            continue;
                        }

                        // Check if asset is already assigned to this rental unit
                        $existingAssignment = RentalUnitAsset::where('rental_unit_id', $rentalUnitId)
                            ->where('asset_id', $assetId)
                            ->first();
                            
                        if ($existingAssignment) {
                            // Update existing assignment
                            $updateData = [
                                'quantity' => $quantity,
                                'is_active' => true,
                                'assigned_date' => now(),
                                'notes' => 'Updated via bulk assignment',
                                'status' => 'working'
                            ];
                            
                            if ($serialNumbers !== null) {
                                $updateData['serial_numbers'] = $serialNumbers;
                            }
                            
                            if ($assetLocation !== null) {
                                $updateData['asset_location'] = $assetLocation;
                            }
                            
                            if ($installationDate !== null) {
                                $updateData['installation_date'] = $installationDate;
                            }
                            
                            $existingAssignment->update($updateData);
                            $unitResult['success']++;
                        } else {
                            // Create new assignment
                            $assignmentData = [
                                'rental_unit_id' => $rentalUnitId,
                                'asset_id' => $assetId,
                                'quantity' => $quantity,
                                'assigned_date' => now(),
                                'notes' => 'Assigned via bulk assignment',
                                'is_active' => true,
                                'status' => 'working',
                            ];
                            
                            if ($serialNumbers !== null) {
                                $assignmentData['serial_numbers'] = $serialNumbers;
                            }
                            
                            if ($assetLocation !== null) {
                                $assignmentData['asset_location'] = $assetLocation;
                            }
                            
                            if ($installationDate !== null) {
                                $assignmentData['installation_date'] = $installationDate;
                            } else {
                                // Default to today's date if not provided
                                $assignmentData['installation_date'] = now()->toDateString();
                            }
                            
                            RentalUnitAsset::create($assignmentData);
                            $unitResult['success']++;
                        }
                    } catch (\Exception $e) {
                        $unitResult['failed']++;
                        $unitResult['errors'][] = "Asset ID {$assetData['asset_id']}: " . $e->getMessage();
                        Log::error('Error assigning asset in bulk operation', [
                            'rental_unit_id' => $rentalUnitId,
                            'asset_id' => $assetData['asset_id'],
                            'error' => $e->getMessage()
                        ]);
                    }
                }

                if ($unitResult['success'] > 0) {
                    $results['success']++;
                } else {
                    $results['failed']++;
                }

                $results['unit_results'][] = $unitResult;
            }

            DB::commit();

            Log::info('Bulk Assign Assets Completed', [
                'total_units' => count($rentalUnitIds),
                'success' => $results['success'],
                'failed' => $results['failed']
            ]);

            return response()->json([
                'message' => 'Bulk asset assignment completed',
                'results' => $results
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Bulk Assign Assets Failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Failed to assign assets',
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
            'serial_numbers' => 'nullable|string',
            'asset_location' => 'nullable|string|max:255',
            'installation_date' => 'nullable|date',
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
            
            if ($request->has('serial_numbers')) {
                $updateData['serial_numbers'] = $request->serial_numbers ? trim($request->serial_numbers) : null;
            }
            
            if ($request->has('asset_location')) {
                $updateData['asset_location'] = $request->asset_location ? trim($request->asset_location) : null;
            }
            
            if ($request->has('installation_date')) {
                $updateData['installation_date'] = $request->installation_date;
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
    public function getMaintenanceAssets(Request $request): JsonResponse
    {
        try {
            $query = RentalUnitAsset::with(['asset', 'rentalUnit.property', 'maintenanceCosts'])
                ->whereIn('status', ['maintenance', 'repaired'])
                ->where('is_active', true)
                ->orderBy('updated_at', 'desc');

            // Use pagination
            $perPage = $request->get('per_page', 15);
            $page = $request->get('page', 1);
            
            $maintenanceAssets = $query->paginate($perPage, ['*'], 'page', $page);

            // Transform the data to include asset details and rental unit info
            $transformedAssets = $maintenanceAssets->getCollection()->map(function ($assignment) {
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
                'assets' => $transformedAssets->values()->all(),
                'pagination' => [
                    'current_page' => $maintenanceAssets->currentPage(),
                    'last_page' => $maintenanceAssets->lastPage(),
                    'per_page' => $maintenanceAssets->perPage(),
                    'total' => $maintenanceAssets->total(),
                ]
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