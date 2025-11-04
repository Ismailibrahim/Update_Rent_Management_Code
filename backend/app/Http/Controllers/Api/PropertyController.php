<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\User;
use App\Models\RentalUnitType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class PropertyController extends Controller
{
    /**
     * Display a listing of properties
     */
    public function index(Request $request): JsonResponse
    {
        try {
            Log::info('Properties index request', [
                'user_id' => $request->user()?->id,
                'user_role' => $request->user()?->role?->name,
                'request_params' => $request->all()
            ]);
            
            $query = Property::with(['assignedManager', 'rentalUnits']);

            // Role-based filtering
            $user = $request->user();
            if ($user && $user->role && $user->role->name === 'property_manager') {
                $query->where('assigned_manager_id', $user->id);
            }

            // Search filter
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('street', 'like', "%{$search}%");
                });
            }

            // Type filter
            if ($request->has('type') && $request->type) {
                $query->where('type', $request->type);
            }

            // Status filter
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Pagination
            $page = $request->get('page', 1);
            $limit = $request->get('limit', 10);
            
            $properties = $query->orderBy('created_at', 'desc')
                ->paginate($limit, ['*'], 'page', $page);

            // Update property statuses based on rental unit occupancy
            foreach ($properties->items() as $property) {
                $property->updateStatusBasedOnUnits();
            }

            // Transform properties to include occupancy information
            $transformedProperties = collect($properties->items())->map(function ($property) {
                return [
                    'id' => $property->id,
                    'name' => $property->name,
                    'type' => $property->type,
                    'street' => $property->street,
                    'island' => $property->island,
                    'number_of_rental_units' => $property->number_of_rental_units,
                    'status' => $property->occupancy_status, // Use calculated status
                    'photos' => $property->photos,
                    'amenities' => $property->amenities,
                    'assigned_manager_id' => $property->assigned_manager_id,
                    'is_active' => $property->is_active,
                    'assigned_manager' => $property->assignedManager,
                    'rental_units' => $property->rentalUnits,
                    'created_at' => $property->created_at,
                    'updated_at' => $property->updated_at,
                ];
            });

            return response()->json([
                'properties' => $transformedProperties,
                'pagination' => [
                    'current' => $properties->currentPage(),
                    'pages' => $properties->lastPage(),
                    'total' => $properties->total(),
                    'per_page' => $properties->perPage(),
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Properties index error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id
            ]);
            
            return response()->json([
                'message' => 'Failed to fetch properties',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created property
     */
    public function store(Request $request): JsonResponse
    {
        // Get valid property-level types only
        $validTypes = RentalUnitType::propertyTypes()
            ->where('is_active', true)
            ->pluck('name')
            ->map(fn($name) => strtolower($name))
            ->toArray();

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => ['required', function ($attribute, $value, $fail) use ($validTypes) {
                if (!in_array(strtolower($value), $validTypes)) {
                    $fail('The selected property type is invalid. Please choose from available types.');
                }
            }],
            'street' => 'required|string|max:255',
            'island' => 'required|string|max:255',
            'number_of_rental_units' => 'required|integer|min:1',
            'status' => ['nullable', Rule::in(['occupied', 'vacant', 'maintenance', 'renovation'])],
            'assigned_manager_id' => 'nullable|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            Log::info('Property creation request', [
                'user_id' => $request->user()?->id,
                'user_role' => $request->user()?->role?->name,
                'request_data' => $request->all()
            ]);

            // Check for duplicate property name (case insensitive and trimmed)
            $existingByName = Property::whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($request->name))])->first();
            if ($existingByName) {
                return response()->json([
                    'message' => 'Validation failed',
                    'errors' => [
                        'name' => ['A property with this name already exists.']
                    ]
                ], 400);
            }

            $propertyData = $request->all();
            $propertyData['assigned_manager_id'] = $propertyData['assigned_manager_id'] ?? $request->user()->id;
            $propertyData['status'] = $propertyData['status'] ?? 'vacant';
            
            // Trim string fields to prevent whitespace issues
            if (isset($propertyData['street'])) {
                $propertyData['street'] = trim($propertyData['street']);
            }
            if (isset($propertyData['island'])) {
                $propertyData['island'] = trim($propertyData['island']);
            }
            if (isset($propertyData['name'])) {
                $propertyData['name'] = trim($propertyData['name']);
            }

            $property = Property::create($propertyData);
            $property->load('assignedManager');

            return response()->json([
                'message' => 'Property created successfully',
                'property' => $property
            ], 201);

        } catch (\Exception $e) {
            Log::error('Property creation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id,
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'message' => 'Failed to create property',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified property
     */
    public function show(Request $request, Property $property): JsonResponse
    {
        try {
            $user = $request->user();
            
            // Check access for property managers
            if ($user && $user->role && $user->role->name === 'property_manager' && 
                $property->assigned_manager_id !== $user->id) {
                return response()->json([
                    'message' => 'Access denied'
                ], 403);
            }

            $property->load(['assignedManager', 'rentalUnits']);

            return response()->json([
                'property' => $property
            ]);

        } catch (\Exception $e) {
            Log::error('Property show error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'property_id' => $property->id ?? null,
                'user_id' => $request->user()?->id
            ]);
            
            return response()->json([
                'message' => 'Failed to fetch property',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified property
     */
    public function update(Request $request, Property $property): JsonResponse
    {
        // Get valid property-level types only
        $validTypes = RentalUnitType::propertyTypes()
            ->where('is_active', true)
            ->pluck('name')
            ->map(fn($name) => strtolower($name))
            ->toArray();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'type' => ['sometimes', function ($attribute, $value, $fail) use ($validTypes) {
                if ($value && !in_array(strtolower($value), $validTypes)) {
                    $fail('The selected property type is invalid. Please choose from available types.');
                }
            }],
            'street' => 'sometimes|string|max:255',
            'island' => 'sometimes|string|max:255',
            'number_of_rental_units' => 'sometimes|integer|min:1',
            'status' => ['sometimes', Rule::in(['occupied', 'vacant', 'maintenance', 'renovation'])],
            'assigned_manager_id' => 'nullable|exists:users,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $user = $request->user();
            
            // Check access for property managers
            if ($user && $user->role && $user->role->name === 'property_manager' && 
                $property->assigned_manager_id !== $user->id) {
                return response()->json([
                    'message' => 'Access denied'
                ], 403);
            }

            // Check for duplicate property name (case insensitive and trimmed, excluding current property)
            if ($request->has('name') && strtolower(trim($request->name)) !== strtolower(trim($property->name))) {
                $existingByName = Property::whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($request->name))])
                    ->where('id', '!=', $property->id)
                    ->first();
                if ($existingByName) {
                    return response()->json([
                        'message' => 'Validation failed',
                        'errors' => [
                            'name' => ['A property with this name already exists.']
                        ]
                    ], 400);
                }
            }

            $property->update($request->all());
            $property->load('assignedManager');

            return response()->json([
                'message' => 'Property updated successfully',
                'property' => $property
            ]);

        } catch (\Exception $e) {
            Log::error('Property update error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'property_id' => $property->id ?? null,
                'user_id' => $request->user()?->id,
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'message' => 'Failed to update property',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified property
     */
    public function destroy(Request $request, Property $property): JsonResponse
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'message' => 'Unauthenticated'
                ], 401);
            }

            // Load role relationship if not already loaded
            if (!$user->relationLoaded('role')) {
                $user->load('role');
            }
            
            // Check access for property managers
            if ($user->role && $user->role->name === 'property_manager' && 
                $property->assigned_manager_id !== $user->id) {
                return response()->json([
                    'message' => 'Access denied'
                ], 403);
            }

            // Check if property has rental units
            try {
                $rentalUnitsCount = $property->rentalUnits()->count();
                if ($rentalUnitsCount > 0) {
                    return response()->json([
                        'message' => 'Cannot delete property with rental units. Please delete all rental units first.',
                        'rental_units_count' => $rentalUnitsCount
                    ], 400);
                }
            } catch (\Exception $e) {
                // If rentalUnits relationship doesn't exist or fails, log and continue
                Log::warning('Could not check rental units count', [
                    'property_id' => $property->id,
                    'error' => $e->getMessage()
                ]);
            }

            $property->delete();

            return response()->json([
                'message' => 'Property deleted successfully'
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'message' => 'Property not found'
            ], 404);
        } catch (\Exception $e) {
            Log::error('Property deletion failed', [
                'property_id' => $property->id ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id
            ]);
            
            return response()->json([
                'message' => 'Failed to delete property',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get property capacity information
     */
    public function capacity(Request $request, Property $property): JsonResponse
    {
        try {
            // Check access for property managers
            if ($request->user()->role->name === 'property_manager' && 
                $property->assigned_manager_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Access denied'
                ], 403);
            }

            $rentalUnits = $property->rentalUnits()->active()->get();
            
            $totalUnits = $rentalUnits->count();
            $totalRooms = $rentalUnits->sum('number_of_rooms');
            $totalToilets = $rentalUnits->sum('number_of_toilets');

            $capacity = [
                'property' => [
                    'id' => $property->id,
                    'name' => $property->name,
                    'bedrooms' => $property->bedrooms ?? 0,
                    'bathrooms' => $property->bathrooms ?? 0,
                    'maxUnits' => $property->number_of_rental_units,
                ],
                'current' => [
                    'totalUnits' => $totalUnits,
                    'totalRooms' => $totalRooms,
                    'totalToilets' => $totalToilets,
                ],
                'remaining' => [
                    'units' => $property->number_of_rental_units - $totalUnits,
                    'rooms' => ($property->bedrooms ?? 0) - $totalRooms,
                    'toilets' => ($property->bathrooms ?? 0) - $totalToilets,
                ],
                'canAddMore' => [
                    'units' => $totalUnits < $property->number_of_rental_units,
                    'rooms' => $totalRooms < ($property->bedrooms ?? 0),
                    'toilets' => $totalToilets < ($property->bathrooms ?? 0),
                ]
            ];

            return response()->json($capacity);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to get capacity information',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download CSV template for property import
     */
    public function downloadTemplate(): JsonResponse
    {
        try {
            // Define headers with mandatory indicators (updated to match current schema)
            $headers = [
                'name [REQUIRED]',
                'type [REQUIRED]',
                'street [REQUIRED]',
                'island [REQUIRED]',
                'number_of_rental_units [REQUIRED]',
                'status'
            ];

            // Instructions row
            $instructions = [
                'INSTRUCTIONS: Fields marked with [REQUIRED] must be filled. Type must match a valid property type from the system.',
                '',
                '',
                '',
                '',
                ''
            ];

            $sampleData = [
                [
                    'name [REQUIRED]' => 'Sample Property 1',
                    'type [REQUIRED]' => 'Apartment Building',
                    'street [REQUIRED]' => '123 Main Street',
                    'island [REQUIRED]' => 'Male',
                    'number_of_rental_units [REQUIRED]' => '4',
                    'status' => 'vacant'
                ],
                [
                    'name [REQUIRED]' => 'Sample Property 2',
                    'type [REQUIRED]' => 'Mixed-Use Building',
                    'street [REQUIRED]' => '456 Ocean View',
                    'island [REQUIRED]' => 'Hulhumale',
                    'number_of_rental_units [REQUIRED]' => '8',
                    'status' => 'vacant'
                ]
            ];

            // Build CSV content with instructions and headers
            $csvContent = '"' . implode('","', array_map(function($field) {
                return str_replace('"', '""', $field);
            }, $instructions)) . '"' . "\n";
            $csvContent .= '"' . implode('","', array_map(function($field) {
                return str_replace('"', '""', $field);
            }, $headers)) . '"' . "\n";
            
            // Add sample data
            foreach ($sampleData as $row) {
                $csvContent .= '"' . implode('","', array_map(function($field) {
                    return str_replace('"', '""', $field);
                }, $row)) . '"' . "\n";
            }

            return response()->json([
                'template' => $csvContent,
                'headers' => $headers
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to generate template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Preview CSV import data
     */
    public function previewImport(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'csv_data' => 'required|string',
            'field_mapping' => 'required|array',
            'has_header' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $csvData = $request->csv_data;
            $fieldMapping = $request->field_mapping;
            $hasHeader = $request->has('has_header') ? $request->boolean('has_header') : true;

            // Parse CSV
            $lines = explode("\n", trim($csvData));
            $dataLines = [];
            
            // Filter out empty lines and instruction rows
            foreach ($lines as $line) {
                $trimmedLine = trim($line);
                if (empty($trimmedLine)) {
                    continue;
                }
                
                // Skip instruction rows
                if (stripos($trimmedLine, 'INSTRUCTIONS:') !== false || 
                    stripos($trimmedLine, 'instructions') !== false) {
                    continue;
                }
                
                $dataLines[] = $line;
            }
            
            // Remove header row if present
            if ($hasHeader && count($dataLines) > 0) {
                array_shift($dataLines);
            }

            $previewData = [];
            $errors = [];

            // Get valid property types (category = 'property')
            $validTypes = RentalUnitType::propertyTypes()
                ->where('is_active', true)
                ->pluck('name')
                ->map(fn($name) => strtolower($name))
                ->toArray();

            foreach (array_slice($dataLines, 0, 10) as $index => $line) {
                $rowData = str_getcsv($line);
                if (empty(array_filter($rowData))) {
                    continue; // Skip empty rows
                }

                $mappedData = [];
                $rowErrors = [];

                // Map fields and clean values
                foreach ($fieldMapping as $csvColumn => $propertyField) {
                    if ($propertyField && isset($rowData[$csvColumn])) {
                        $value = trim($rowData[$csvColumn]);
                        // Remove quotes and [REQUIRED] markers if present
                        $value = str_replace(['"', "'"], '', $value);
                        $value = preg_replace('/\s*\[REQUIRED\]\s*/i', '', $value);
                        $mappedData[$propertyField] = $value;
                    }
                }

                // Validate required fields
                $requiredFields = ['name', 'type', 'street', 'island', 'number_of_rental_units'];
                foreach ($requiredFields as $field) {
                    if (empty($mappedData[$field])) {
                        $rowErrors[] = "Row " . ($index + 1) . ": Missing required field '{$field}'";
                    }
                }

                // Validate type (case-insensitive match)
                if (isset($mappedData['type'])) {
                    $typeLower = strtolower(trim($mappedData['type']));
                    if (!in_array($typeLower, $validTypes)) {
                        $rowErrors[] = "Row " . ($index + 1) . ": Invalid property type '{$mappedData['type']}'. Valid types: " . implode(', ', array_map('ucfirst', $validTypes));
                    }
                }

                // Validate and clean numeric fields
                $numericFields = ['number_of_rental_units'];
                foreach ($numericFields as $field) {
                    if (isset($mappedData[$field]) && $mappedData[$field] !== '') {
                        // Remove any non-numeric characters except decimal point and minus sign
                        $cleanValue = preg_replace('/[^0-9.-]/', '', $mappedData[$field]);
                        if (is_numeric($cleanValue)) {
                            $mappedData[$field] = (int) floatval($cleanValue);
                        } else {
                            $rowErrors[] = "Row " . ($index + 1) . ": Field '{$field}' must be numeric (got: '{$mappedData[$field]}')";
                        }
                    }
                }

                if (empty($rowErrors)) {
                    $previewData[] = $mappedData;
                } else {
                    $errors = array_merge($errors, $rowErrors);
                }
            }

            return response()->json([
                'preview' => $previewData,
                'errors' => $errors,
                'total_rows' => count($dataLines)
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to preview import',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Import properties from CSV
     */
    public function import(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'csv_data' => 'required|string',
            'field_mapping' => 'required|array',
            'has_header' => 'boolean',
            'skip_errors' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            DB::beginTransaction();

            $csvData = $request->csv_data;
            $fieldMapping = $request->field_mapping;
            $hasHeader = $request->has('has_header') ? $request->boolean('has_header') : true;
            $skipErrors = $request->has('skip_errors') ? $request->boolean('skip_errors') : false;

            // Parse CSV
            $lines = explode("\n", trim($csvData));
            $dataLines = [];
            
            // Filter out empty lines and instruction rows
            foreach ($lines as $line) {
                $trimmedLine = trim($line);
                if (empty($trimmedLine)) {
                    continue;
                }
                
                // Skip instruction rows
                if (stripos($trimmedLine, 'INSTRUCTIONS:') !== false || 
                    stripos($trimmedLine, 'instructions') !== false) {
                    continue;
                }
                
                $dataLines[] = $line;
            }
            
            // Remove header row if present
            if ($hasHeader && count($dataLines) > 0) {
                array_shift($dataLines);
            }

            // Get valid property types (category = 'property')
            $validTypes = RentalUnitType::propertyTypes()
                ->where('is_active', true)
                ->pluck('name')
                ->map(fn($name) => strtolower($name))
                ->toArray();

            $imported = 0;
            $failed = 0;
            $errors = [];

            foreach ($dataLines as $rowIndex => $line) {
                $rowData = str_getcsv($line);
                if (empty(array_filter($rowData))) {
                    continue; // Skip empty rows
                }

                try {
                    $mappedData = [];

                    // Map fields and clean values
                    foreach ($fieldMapping as $csvColumn => $propertyField) {
                        if ($propertyField && isset($rowData[$csvColumn])) {
                            $value = trim($rowData[$csvColumn]);
                            // Remove quotes and [REQUIRED] markers if present
                            $value = str_replace(['"', "'"], '', $value);
                            $value = preg_replace('/\s*\[REQUIRED\]\s*/i', '', $value);
                            if ($value !== '') {
                                $mappedData[$propertyField] = $value;
                            }
                        }
                    }

                    // Set defaults
                    $mappedData['status'] = $mappedData['status'] ?? 'vacant';
                    $mappedData['assigned_manager_id'] = $mappedData['assigned_manager_id'] ?? $request->user()->id;
                    $mappedData['is_active'] = true;

                    // Convert numeric fields - handle string numbers
                    $numericFields = ['number_of_rental_units'];
                    foreach ($numericFields as $field) {
                        if (isset($mappedData[$field]) && $mappedData[$field] !== '') {
                            // Remove any non-numeric characters except decimal point and minus sign
                            $cleanValue = preg_replace('/[^0-9.-]/', '', $mappedData[$field]);
                            if (is_numeric($cleanValue)) {
                                $mappedData[$field] = (int) floatval($cleanValue);
                            }
                        }
                    }
                    
                    // Trim string fields to prevent whitespace issues
                    if (isset($mappedData['name'])) {
                        $mappedData['name'] = trim($mappedData['name']);
                    }
                    if (isset($mappedData['street'])) {
                        $mappedData['street'] = trim($mappedData['street']);
                    }
                    if (isset($mappedData['island'])) {
                        $mappedData['island'] = trim($mappedData['island']);
                    }

                    // Validate required fields
                    $requiredFields = ['name', 'type', 'street', 'island', 'number_of_rental_units'];
                    foreach ($requiredFields as $field) {
                        if (empty($mappedData[$field])) {
                            throw new \Exception("Missing required field: {$field}");
                        }
                    }

                    // Validate type (case-insensitive match)
                    $typeLower = strtolower(trim($mappedData['type']));
                    if (!in_array($typeLower, $validTypes)) {
                        throw new \Exception("Invalid property type: {$mappedData['type']}. Valid types: " . implode(', ', array_map('ucfirst', $validTypes)));
                    }

                    // Check for duplicate property name (case insensitive and trimmed)
                    $existingByName = Property::whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($mappedData['name']))])->first();
                    if ($existingByName) {
                        throw new \Exception("Property with name '{$mappedData['name']}' already exists");
                    }

                    // Create property - only include fillable fields
                    $propertyData = [
                        'name' => $mappedData['name'],
                        'type' => trim($mappedData['type']),
                        'street' => $mappedData['street'],
                        'island' => $mappedData['island'],
                        'number_of_rental_units' => $mappedData['number_of_rental_units'],
                        'status' => $mappedData['status'] ?? 'vacant',
                        'assigned_manager_id' => $mappedData['assigned_manager_id'] ?? $request->user()->id,
                        'is_active' => true,
                    ];
                    Property::create($propertyData);
                    $imported++;

                } catch (\Exception $e) {
                    $failed++;
                    $errors[] = "Row " . ($rowIndex + 1) . ": " . $e->getMessage();
                    if (!$skipErrors) {
                        DB::rollBack();
                        return response()->json([
                            'message' => 'Import failed',
                            'errors' => $errors,
                            'imported' => $imported,
                            'failed' => $failed
                        ], 400);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Import completed',
                'imported' => $imported,
                'failed' => $failed,
                'errors' => $errors
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Import failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}