<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class TenantController extends Controller
{
    /**
     * Display a listing of tenants
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Tenant::query();

            // Status filter
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Search filter
            if ($request->has('search') && $request->search) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->whereRaw("JSON_EXTRACT(personal_info, '$.firstName') LIKE ?", ["%{$search}%"])
                      ->orWhereRaw("JSON_EXTRACT(personal_info, '$.lastName') LIKE ?", ["%{$search}%"])
                      ->orWhereRaw("JSON_EXTRACT(contact_info, '$.email') LIKE ?", ["%{$search}%"]);
                });
            }

            $tenants = $query->with('rentalUnits.property')->orderBy('created_at', 'desc')->get();

            return response()->json([
                'tenants' => $tenants
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch tenants',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created tenant
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'personal_info' => 'required|array',
            'personal_info.firstName' => 'required|string|max:100',
            'personal_info.lastName' => 'required|string|max:100',
            'personal_info.dateOfBirth' => 'nullable|date',
            'personal_info.gender' => 'nullable|in:male,female,other',
            'personal_info.nationality' => 'nullable|string|max:100',
            'personal_info.idNumber' => 'nullable|string|max:50',
            'contact_info' => 'required|array',
            'contact_info.email' => 'required|email|max:255',
            'contact_info.phone' => 'required|string|max:20',
            'contact_info.address' => 'nullable|string',
            'emergency_contact' => 'nullable|array',
            'employment_info' => 'nullable|array',
            'financial_info' => 'nullable|array',
            'documents' => 'nullable|array',
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'suspended'])],
            'notes' => 'nullable|string',
            'lease_start_date' => 'nullable|date',
            'lease_end_date' => 'nullable|date|after_or_equal:lease_start_date',
            'rental_unit_ids' => 'nullable|array',
            'rental_unit_ids.*' => 'exists:rental_units,id',
            'files' => 'nullable|array',
            'files.*' => 'file|mimes:pdf,doc,docx,jpg,jpeg,png|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $tenantData = $request->all();
            $tenantData['status'] = $tenantData['status'] ?? 'active';

            // Handle file uploads
            $uploadedDocuments = [];
            if ($request->hasFile('files')) {
                foreach ($request->file('files') as $file) {
                    $fileName = time() . '_' . $file->getClientOriginalName();
                    $filePath = $file->storeAs('tenant-documents', $fileName, 'public');
                    
                    $uploadedDocuments[] = [
                        'name' => $file->getClientOriginalName(),
                        'path' => $filePath,
                        'size' => $file->getSize(),
                        'type' => $file->getMimeType(),
                        'uploaded_at' => now()->toISOString(),
                    ];
                }
            }

            // Merge uploaded documents with any existing documents
            $existingDocuments = $tenantData['documents'] ?? [];
            $tenantData['documents'] = array_merge($existingDocuments, $uploadedDocuments);

            $tenant = Tenant::create($tenantData);
            
            // Handle rental unit assignments
            if ($request->has('rental_unit_ids') && !empty($request->rental_unit_ids)) {
                \App\Models\RentalUnit::whereIn('id', $request->rental_unit_ids)->update([
                    'tenant_id' => $tenant->id,
                    'status' => 'occupied',
                    'move_in_date' => $tenant->lease_start_date ?? now()->toDateString(),
                    'lease_end_date' => $tenant->lease_end_date
                ]);
            }
            
            $tenant->load('rentalUnits');

            return response()->json([
                'message' => 'Tenant created successfully',
                'tenant' => $tenant
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to create tenant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified tenant
     */
    public function show(Tenant $tenant): JsonResponse
    {
        try {
            $tenant->load('rentalUnits');

            return response()->json([
                'tenant' => $tenant
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch tenant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified tenant
     */
    public function update(Request $request, Tenant $tenant): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'personal_info' => 'sometimes|array',
            'contact_info' => 'sometimes|array',
            'emergency_contact' => 'nullable|array',
            'employment_info' => 'nullable|array',
            'financial_info' => 'nullable|array',
            'documents' => 'nullable|array',
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'suspended'])],
            'notes' => 'nullable|string',
            'lease_start_date' => 'nullable|date',
            'lease_end_date' => 'nullable|date|after_or_equal:lease_start_date',
            'rental_unit_ids' => 'nullable|array',
            'rental_unit_ids.*' => 'exists:rental_units,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $updateData = $request->all();
            
            // Handle rental unit assignments
            if ($request->has('rental_unit_ids')) {
                $rentalUnitIds = $request->rental_unit_ids;
                
                // First, unlink all current rental units from this tenant
                \App\Models\RentalUnit::where('tenant_id', $tenant->id)->update([
                    'tenant_id' => null,
                    'status' => 'available',
                    'move_in_date' => null,
                    'lease_end_date' => null
                ]);
                
                // Then, link the new rental units to this tenant
                if (!empty($rentalUnitIds)) {
                    \App\Models\RentalUnit::whereIn('id', $rentalUnitIds)->update([
                        'tenant_id' => $tenant->id,
                        'status' => 'occupied',
                        'move_in_date' => $tenant->lease_start_date ?? now()->toDateString(),
                        'lease_end_date' => $tenant->lease_end_date
                    ]);
                }
                
                // Remove rental_unit_ids from update data since we handle it separately
                unset($updateData['rental_unit_ids']);
            }
            
            $tenant->update($updateData);
            $tenant->load('rentalUnits');

            return response()->json([
                'message' => 'Tenant updated successfully',
                'tenant' => $tenant
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update tenant',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified tenant
     */
    public function destroy(Tenant $tenant): JsonResponse
    {
        try {
            $tenant->delete();

            return response()->json([
                'message' => 'Tenant deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete tenant',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}