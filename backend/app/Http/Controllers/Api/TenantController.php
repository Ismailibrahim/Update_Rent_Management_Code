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
                $query->search($search);
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
            // Tenant type
            'tenant_type' => 'nullable|in:individual,company',
            // New separate columns
            'first_name' => 'nullable|string|max:100',
            'last_name' => 'nullable|string|max:100', // Nullable for company tenants
            'date_of_birth' => 'nullable|date',
            'national_id' => 'nullable|string|max:50',
            'nationality' => 'nullable|string|max:100',
            'gender' => 'nullable|in:male,female,other',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'emergency_contact_name' => 'nullable|string|max:100',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_relationship' => 'nullable|string|max:50',
            'employment_company' => 'nullable|string|max:100',
            'employment_position' => 'nullable|string|max:100',
            'employment_salary' => 'nullable|numeric|min:0',
            'employment_phone' => 'nullable|string|max:20',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'account_holder_name' => 'nullable|string|max:100',
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'suspended'])],
            'notes' => 'nullable|string',
            'lease_start_date' => 'nullable|date',
            'lease_end_date' => 'nullable|date|after_or_equal:lease_start_date',
            'rental_unit_ids' => 'nullable|array',
            'rental_unit_ids.*' => 'exists:rental_units,id',
            // Company-specific fields
            'company_name' => 'nullable|string|max:255',
            'company_address' => 'nullable|string',
            'company_registration_number' => 'nullable|string|max:100',
            'company_gst_tin' => 'nullable|string|max:100',
            'company_telephone' => 'nullable|string|max:20',
            'company_email' => 'nullable|email|max:255',
            'files' => 'nullable|array',
            'files.*' => 'file|mimes:pdf,doc,docx,jpg,jpeg,png|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            Log::error('Tenant creation validation failed', [
                'errors' => $validator->errors(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            Log::info('Tenant creation request', [
                'request_data' => $request->all()
            ]);
            
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

            // Store uploaded documents as JSON in documents field
            if (!empty($uploadedDocuments)) {
                $tenantData['documents'] = json_encode($uploadedDocuments);
            }

            Log::info('Creating tenant with data', ['tenant_data' => $tenantData]);
            Log::info('Contact fields received:', [
                'email' => $request->email,
                'phone' => $request->phone,
                'address' => $request->address,
                'company_email' => $request->company_email,
                'company_telephone' => $request->company_telephone,
                'tenant_type' => $request->tenant_type
            ]);
            
            $tenant = Tenant::create($tenantData);
            
            Log::info('Tenant created successfully', ['tenant_id' => $tenant->id]);
            
            // Handle rental unit assignments
            if ($request->has('rental_unit_ids') && !empty($request->rental_unit_ids)) {
                $moveInDate = $request->lease_start_date ?: now()->toDateString();
                $leaseEndDate = $request->lease_end_date ?: null;
                
                Log::info('Assigning rental units', [
                    'rental_unit_ids' => $request->rental_unit_ids,
                    'move_in_date' => $moveInDate,
                    'lease_end_date' => $leaseEndDate
                ]);
                
                \App\Models\RentalUnit::whereIn('id', $request->rental_unit_ids)->update([
                    'tenant_id' => $tenant->id,
                    'status' => 'occupied',
                    'move_in_date' => $moveInDate,
                    'lease_end_date' => $leaseEndDate
                ]);
            }
            
            $tenant->load('rentalUnits');

            return response()->json([
                'message' => 'Tenant created successfully',
                'tenant' => $tenant
            ], 201);

        } catch (\Exception $e) {
            Log::error('Tenant creation error: ' . $e->getMessage(), [
                'request_data' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to create tenant',
                'error' => $e->getMessage(),
                'details' => config('app.debug') ? $e->getTraceAsString() : null
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
            // New separate columns
            'first_name' => 'nullable|string|max:100',
            'last_name' => 'sometimes|string|max:100',
            'date_of_birth' => 'nullable|date',
            'national_id' => 'nullable|string|max:50',
            'nationality' => 'nullable|string|max:100',
            'gender' => 'nullable|in:male,female,other',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'postal_code' => 'nullable|string|max:20',
            'emergency_contact_name' => 'nullable|string|max:100',
            'emergency_contact_phone' => 'nullable|string|max:20',
            'emergency_contact_relationship' => 'nullable|string|max:50',
            'employment_company' => 'nullable|string|max:100',
            'employment_position' => 'nullable|string|max:100',
            'employment_salary' => 'nullable|numeric|min:0',
            'employment_phone' => 'nullable|string|max:20',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'account_holder_name' => 'nullable|string|max:100',
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'suspended'])],
            'notes' => 'nullable|string',
            'lease_start_date' => 'nullable|date',
            'lease_end_date' => 'nullable|date|after_or_equal:lease_start_date',
            'rental_unit_ids' => 'nullable|array',
            'rental_unit_ids.*' => 'exists:rental_units,id',
            // Company-specific fields
            'company_name' => 'nullable|string|max:255',
            'company_address' => 'nullable|string',
            'company_registration_number' => 'nullable|string|max:100',
            'company_gst_tin' => 'nullable|string|max:100',
            'company_telephone' => 'nullable|string|max:20',
            'company_email' => 'nullable|email|max:255',
            'tenant_type' => 'nullable|in:individual,company',
            'files' => 'nullable|array',
            'files.*' => 'file|mimes:pdf,doc,docx,jpg,jpeg,png|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            Log::error('Tenant update validation failed', [
                'tenant_id' => $tenant->id,
                'errors' => $validator->errors(),
                'request_data' => $request->all()
            ]);
            
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            Log::info('Tenant update request', [
                'tenant_id' => $tenant->id,
                'request_data' => $request->all(),
                'request_method' => $request->method(),
                'content_type' => $request->header('Content-Type'),
                'request_input' => $request->input(),
                'request_files' => $request->file(),
                'request_keys' => array_keys($request->all()),
                'raw_content' => $request->getContent(),
                'is_multipart' => str_contains($request->header('Content-Type', ''), 'multipart/form-data')
            ]);
            Log::info('Document fields received:', [
                'has_files' => $request->hasFile('files'),
                'files_count' => $request->hasFile('files') ? count($request->file('files')) : 0,
                'existing_documents' => $tenant->documents
            ]);
            
            $updateData = $request->all();
            
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

            // Handle documents - merge with existing documents or replace
            if (!empty($uploadedDocuments)) {
                // Get existing documents
                $existingDocuments = [];
                if ($tenant->documents) {
                    try {
                        $existingDocuments = is_string($tenant->documents) 
                            ? json_decode($tenant->documents, true) 
                            : $tenant->documents;
                    } catch (\Exception $e) {
                        Log::warning('Failed to parse existing documents', ['tenant_id' => $tenant->id]);
                        $existingDocuments = [];
                    }
                }
                
                // Merge new documents with existing ones
                $allDocuments = array_merge($existingDocuments, $uploadedDocuments);
                $updateData['documents'] = json_encode($allDocuments);
            }
            
            // Handle rental unit assignments
            if ($request->has('rental_unit_ids')) {
                $rentalUnitIds = $request->rental_unit_ids;
                Log::info('Processing rental unit assignments', [
                    'rental_unit_ids' => $rentalUnitIds,
                    'is_array' => is_array($rentalUnitIds)
                ]);
                
                // First, unlink all current rental units from this tenant
                \App\Models\RentalUnit::where('tenant_id', $tenant->id)->update([
                    'tenant_id' => null,
                    'status' => 'available',
                    'move_in_date' => null,
                    'lease_end_date' => null
                ]);
                
                // Then, link the new rental units to this tenant
                if (!empty($rentalUnitIds)) {
                    $moveInDate = $request->lease_start_date ?: now()->toDateString();
                    $leaseEndDate = $request->lease_end_date ?: null;
                    
                    \App\Models\RentalUnit::whereIn('id', $rentalUnitIds)->update([
                        'tenant_id' => $tenant->id,
                        'status' => 'occupied',
                        'move_in_date' => $moveInDate,
                        'lease_end_date' => $leaseEndDate
                    ]);
                }
                
                // Remove rental_unit_ids from update data since we handle it separately
                unset($updateData['rental_unit_ids']);
            }
            
            Log::info('Updating tenant with data', ['update_data' => $updateData]);
            
            $tenant->update($updateData);
            $tenant->load('rentalUnits');
            
            Log::info('Tenant updated successfully', ['tenant_id' => $tenant->id]);

            return response()->json([
                'message' => 'Tenant updated successfully',
                'tenant' => $tenant
            ]);

        } catch (\Exception $e) {
            Log::error('Tenant update error: ' . $e->getMessage(), [
                'tenant_id' => $tenant->id,
                'request_data' => $request->all(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to update tenant',
                'error' => $e->getMessage(),
                'details' => config('app.debug') ? $e->getTraceAsString() : null
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