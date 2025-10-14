<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use App\Models\MaintenanceRequest;

class MaintenanceController extends Controller
{
    /**
     * Display a listing of maintenance requests
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = MaintenanceRequest::with(['property', 'tenant', 'rentalUnit']);
            
            // Apply filters if provided
            if ($request->has('search')) {
                $search = $request->get('search');
                $query->where(function($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhereHas('property', function($propertyQuery) use ($search) {
                          $propertyQuery->where('name', 'like', "%{$search}%");
                      })
                      ->orWhereHas('tenant', function($tenantQuery) use ($search) {
                          $tenantQuery->where('name', 'like', "%{$search}%");
                      });
                });
            }
            
            if ($request->has('status')) {
                $query->where('status', $request->get('status'));
            }
            
            if ($request->has('priority')) {
                $query->where('priority', $request->get('priority'));
            }
            
            if ($request->has('property_id')) {
                $query->where('property_id', $request->get('property_id'));
            }
            
            $maintenanceRequests = $query->orderBy('created_at', 'desc')->get();
            
            return response()->json([
                'success' => true,
                'maintenance_requests' => $maintenanceRequests
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch maintenance requests',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created maintenance request
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|min:3|max:255',
            'description' => 'required|string|min:10|max:1000',
            'property_id' => 'required|exists:properties,id',
            'rental_unit_id' => 'nullable|exists:rental_units,id',
            'tenant_id' => 'nullable|exists:tenants,id',
            'priority' => 'required|in:low,medium,high',
            'status' => 'required|in:pending,in_progress,completed,repaired,cancelled',
            'request_date' => 'required|date',
            'scheduled_date' => 'nullable|date|after_or_equal:request_date',
            'assigned_to' => 'nullable|string|max:255',
            'estimated_cost' => 'nullable|numeric|min:0',
            'actual_cost' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $maintenanceRequest = MaintenanceRequest::create([
                'title' => $request->title,
                'description' => $request->description,
                'property_id' => $request->property_id,
                'rental_unit_id' => $request->rental_unit_id,
                'tenant_id' => $request->tenant_id,
                'priority' => $request->priority,
                'status' => $request->status,
                'request_date' => $request->request_date,
                'scheduled_date' => $request->scheduled_date,
                'assigned_to' => $request->assigned_to,
                'estimated_cost' => $request->estimated_cost,
                'actual_cost' => $request->actual_cost,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Maintenance request created successfully',
                'maintenance_request' => $maintenanceRequest->load(['property', 'tenant', 'rentalUnit'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create maintenance request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified maintenance request
     */
    public function show(MaintenanceRequest $maintenanceRequest): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'maintenance_request' => $maintenanceRequest->load(['property', 'tenant', 'rentalUnit'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch maintenance request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified maintenance request
     */
    public function update(Request $request, MaintenanceRequest $maintenanceRequest): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|min:3|max:255',
            'description' => 'required|string|min:10|max:1000',
            'property_id' => 'required|exists:properties,id',
            'rental_unit_id' => 'nullable|exists:rental_units,id',
            'tenant_id' => 'nullable|exists:tenants,id',
            'priority' => 'required|in:low,medium,high',
            'status' => 'required|in:pending,in_progress,completed,repaired,cancelled',
            'request_date' => 'required|date',
            'scheduled_date' => 'nullable|date|after_or_equal:request_date',
            'completed_date' => 'nullable|date|after_or_equal:request_date',
            'assigned_to' => 'nullable|string|max:255',
            'estimated_cost' => 'nullable|numeric|min:0',
            'actual_cost' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $updateData = [
                'title' => $request->title,
                'description' => $request->description,
                'property_id' => $request->property_id,
                'rental_unit_id' => $request->rental_unit_id,
                'tenant_id' => $request->tenant_id,
                'priority' => $request->priority,
                'status' => $request->status,
                'request_date' => $request->request_date,
                'scheduled_date' => $request->scheduled_date,
                'assigned_to' => $request->assigned_to,
                'estimated_cost' => $request->estimated_cost,
                'actual_cost' => $request->actual_cost,
            ];

            // Set completed_date if status is completed
            if ($request->status === 'completed' && !$maintenanceRequest->completed_date) {
                $updateData['completed_date'] = now();
            }

            $maintenanceRequest->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Maintenance request updated successfully',
                'maintenance_request' => $maintenanceRequest->load(['property', 'tenant', 'rentalUnit'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update maintenance request',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified maintenance request
     */
    public function destroy(MaintenanceRequest $maintenanceRequest): JsonResponse
    {
        try {
            $maintenanceRequest->delete();

            return response()->json([
                'success' => true,
                'message' => 'Maintenance request deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete maintenance request',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}