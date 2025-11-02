<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
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
                      ->orWhere('street', 'like', "%{$search}%")
                      ->orWhere('city', 'like', "%{$search}%");
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
                    'city' => $property->city,
                    'island' => $property->island,
                    'postal_code' => $property->postal_code,
                    'country' => $property->country,
                    'number_of_floors' => $property->number_of_floors,
                    'number_of_rental_units' => $property->number_of_rental_units,
                    'bedrooms' => $property->bedrooms,
                    'bathrooms' => $property->bathrooms,
                    'square_feet' => $property->square_feet,
                    'year_built' => $property->year_built,
                    'description' => $property->description,
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
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => ['required', Rule::in(['house', 'apartment', 'villa', 'commercial', 'office', 'shop', 'warehouse', 'land'])],
            'street' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'island' => 'required|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:100',
            'number_of_floors' => 'required|integer|min:1',
            'number_of_rental_units' => 'required|integer|min:1',
            'bedrooms' => 'required|integer|min:1',
            'bathrooms' => 'required|integer|min:1',
            'square_feet' => 'nullable|numeric|min:0',
            'year_built' => 'nullable|numeric|min:1800|max:' . date('Y'),
            'description' => 'nullable|string',
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

            $propertyData = $request->all();
            $propertyData['assigned_manager_id'] = $propertyData['assigned_manager_id'] ?? $request->user()->id;
            $propertyData['status'] = $propertyData['status'] ?? 'vacant';
            $propertyData['country'] = $propertyData['country'] ?? 'Maldives';
            
            // Convert numeric strings to integers
            if (isset($propertyData['square_feet']) && is_numeric($propertyData['square_feet'])) {
                $propertyData['square_feet'] = (int) $propertyData['square_feet'];
            }
            if (isset($propertyData['year_built']) && is_numeric($propertyData['year_built'])) {
                $propertyData['year_built'] = (int) $propertyData['year_built'];
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
            // Check access for property managers
            if ($request->user()->role->name === 'property_manager' && 
                $property->assigned_manager_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Access denied'
                ], 403);
            }

            $property->load('assignedManager');

            return response()->json([
                'property' => $property
            ]);

        } catch (\Exception $e) {
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
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'type' => ['sometimes', Rule::in(['house', 'apartment', 'villa', 'commercial', 'office', 'shop', 'warehouse', 'land'])],
            'street' => 'sometimes|string|max:255',
            'city' => 'sometimes|string|max:255',
            'island' => 'sometimes|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'country' => 'nullable|string|max:100',
            'number_of_floors' => 'sometimes|integer|min:1',
            'number_of_rental_units' => 'sometimes|integer|min:1',
            'bedrooms' => 'sometimes|integer|min:1',
            'bathrooms' => 'sometimes|integer|min:1',
            'square_feet' => 'nullable|numeric|min:0',
            'year_built' => 'nullable|numeric|min:1800|max:' . date('Y'),
            'description' => 'nullable|string',
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
            // Check access for property managers
            if ($request->user()->role->name === 'property_manager' && 
                $property->assigned_manager_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Access denied'
                ], 403);
            }

            $property->update($request->all());
            $property->load('assignedManager');

            return response()->json([
                'message' => 'Property updated successfully',
                'property' => $property
            ]);

        } catch (\Exception $e) {
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
            // Check access for property managers
            if ($request->user()->role->name === 'property_manager' && 
                $property->assigned_manager_id !== $request->user()->id) {
                return response()->json([
                    'message' => 'Access denied'
                ], 403);
            }

            // Check if property has rental units
            $rentalUnitsCount = $property->rentalUnits()->count();
            if ($rentalUnitsCount > 0) {
                return response()->json([
                    'message' => 'Cannot delete property with rental units. Please delete all rental units first.',
                    'rental_units_count' => $rentalUnitsCount
                ], 400);
            }

            $property->delete();

            return response()->json([
                'message' => 'Property deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('Property deletion failed', [
                'property_id' => $property->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
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
}