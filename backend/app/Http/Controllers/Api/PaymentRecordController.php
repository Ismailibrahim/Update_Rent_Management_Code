<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use App\Models\PaymentRecord;

class PaymentRecordController extends Controller
{
    /**
     * Display a listing of payment records
     */
    public function index(Request $request): JsonResponse
    {
        try {
            // Load relationships without any filtering to include deactivated units
            $query = PaymentRecord::with([
                'rentalUnit' => function($query) {
                    // Don't filter by is_active - include all units (active and deactivated)
                    $query->with(['tenant', 'property']);
                },
                'paymentType', 
                'paymentMode',
                'currency',
                'rentInvoice'
            ]);
            
            // Apply filters if provided
            if ($request->has('search')) {
                $search = $request->get('search');
                $query->where(function($q) use ($search) {
                    $q->where('remarks', 'like', "%{$search}%")
                      ->orWhere('paid_by', 'like', "%{$search}%")
                      ->orWhereHas('rentalUnit.tenant', function($tenantQuery) use ($search) {
                          $tenantQuery->where('first_name', 'like', "%{$search}%")
                                     ->orWhere('last_name', 'like', "%{$search}%")
                                     ->orWhere('email', 'like', "%{$search}%")
                                     ->orWhere('phone', 'like', "%{$search}%");
                      });
                });
            }
            
            if ($request->has('status')) {
                $query->where('is_active', $request->get('status') === 'completed' ? 1 : 0);
            }
            
            // Use pagination instead of loading all records
            $perPage = $request->get('per_page', 15);
            $page = $request->get('page', 1);
            
            $paymentRecords = $query->orderBy('created_at', 'desc')->paginate($perPage, ['*'], 'page', $page);
            
            // Debug: Log payment records and their relationships
            Log::info('Payment Records Debug:', [
                'total_records' => $paymentRecords->total(),
                'current_page' => $paymentRecords->currentPage(),
                'per_page' => $paymentRecords->perPage(),
                'sample_record' => $paymentRecords->first() ? [
                    'id' => $paymentRecords->first()->id,
                    'unit_id' => $paymentRecords->first()->unit_id,
                    'rent_invoice' => $paymentRecords->first()->rentInvoice ? [
                        'id' => $paymentRecords->first()->rentInvoice->id,
                        'invoice_number' => $paymentRecords->first()->rentInvoice->invoice_number,
                    ] : null
                ] : null
            ]);
            
            // Transform the data to match frontend expectations
            $transformedRecords = $paymentRecords->getCollection()->map(function($record) {
                // Debug logging to see what we're getting
                Log::info('Payment Record Debug', [
                    'record_id' => $record->id,
                    'rental_unit_id' => $record->rentalUnit?->id,
                    'rental_unit_number' => $record->rentalUnit?->unit_number,
                    'rental_unit_status' => $record->rentalUnit?->status,
                    'rental_unit_is_active' => $record->rentalUnit?->is_active,
                    'tenant_id' => $record->rentalUnit?->tenant_id,
                    'tenant_exists' => $record->rentalUnit?->tenant ? 'Yes' : 'No',
                    'tenant_name' => $record->rentalUnit?->tenant ? 
                        $record->rentalUnit->tenant->full_name : 
                        'No tenant'
                ]);
                
                return [
                    'id' => $record->id,
                    'tenant_id' => $record->rentalUnit->tenant_id ?? null,
                    'property_id' => $record->rentalUnit->property_id ?? null,
                    'payment_type_id' => $record->payment_type_id,
                    'payment_mode_id' => $record->payment_mode_id,
                    'amount' => $record->amount,
                    'currency' => $record->currency ? [
                        'code' => $record->currency->code,
                        'symbol' => $record->currency->symbol,
                    ] : null,
                    'rental_unit' => $record->rentalUnit ? [
                        'unit_number' => $record->rentalUnit->unit_number,
                        'status' => $record->rentalUnit->status,
                        'unit_type' => $record->rentalUnit->unit_type ?? null,
                    ] : null,
                    'reference_number' => $record->remarks, // Using remarks as reference
                    'payment_date' => $record->paid_date,
                    'status' => $record->is_active ? 'completed' : 'pending',
                    'notes' => $record->remarks,
                    'rent_invoice' => $record->rentInvoice ? [
                        'id' => $record->rentInvoice->id,
                        'invoice_number' => $record->rentInvoice->invoice_number,
                        'total_amount' => $record->rentInvoice->total_amount,
                        'currency' => $record->rentInvoice->currency,
                        'invoice_date' => $record->rentInvoice->invoice_date,
                        'due_date' => $record->rentInvoice->due_date,
                        'status' => $record->rentInvoice->status,
                    ] : null,
                    'tenant' => $record->rentalUnit->tenant ? [
                        'name' => $record->rentalUnit->tenant->full_name
                    ] : null,
                    'property' => $record->rentalUnit->property ? [
                        'name' => $record->rentalUnit->property->name
                    ] : null,
                    'paymentType' => $record->paymentType ? [
                        'name' => $record->paymentType->name
                    ] : null,
                    'paymentMode' => $record->paymentMode ? [
                        'name' => $record->paymentMode->name
                    ] : null,
                    'created_at' => $record->created_at,
                    'updated_at' => $record->updated_at,
                ];
            });
            
            return response()->json([
                'success' => true,
                'payment_records' => $transformedRecords->values(),
                'pagination' => [
                    'current_page' => $paymentRecords->currentPage(),
                    'last_page' => $paymentRecords->lastPage(),
                    'per_page' => $paymentRecords->perPage(),
                    'total' => $paymentRecords->total(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment records',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created payment record
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'tenant_id' => 'required|exists:tenants,id',
            'property_id' => 'required|exists:properties,id',
            'payment_type_id' => 'required|exists:payment_types,id',
            'payment_mode_id' => 'required|exists:payment_modes,id',
            'amount' => 'required|numeric|min:0',
            'reference_number' => 'nullable|string|max:255',
            'payment_date' => 'required|date',
            'status' => 'required|in:pending,completed,failed,cancelled',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $paymentRecord = PaymentRecord::create([
                'tenant_id' => $request->tenant_id,
                'property_id' => $request->property_id,
                'payment_type_id' => $request->payment_type_id,
                'payment_mode_id' => $request->payment_mode_id,
                'amount' => $request->amount,
                'reference_number' => $request->reference_number,
                'payment_date' => $request->payment_date,
                'status' => $request->status,
                'notes' => $request->notes,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment record created successfully',
                'payment_record' => $paymentRecord->load(['tenant', 'property', 'paymentType', 'paymentMode'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create payment record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified payment record
     */
    public function show(PaymentRecord $paymentRecord): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'payment_record' => $paymentRecord->load(['tenant', 'property', 'paymentType', 'paymentMode'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified payment record
     */
    public function update(Request $request, PaymentRecord $paymentRecord): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'tenant_id' => 'required|exists:tenants,id',
            'property_id' => 'required|exists:properties,id',
            'payment_type_id' => 'required|exists:payment_types,id',
            'payment_mode_id' => 'required|exists:payment_modes,id',
            'amount' => 'required|numeric|min:0',
            'reference_number' => 'nullable|string|max:255',
            'payment_date' => 'required|date',
            'status' => 'required|in:pending,completed,failed,cancelled',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $paymentRecord->update([
                'tenant_id' => $request->tenant_id,
                'property_id' => $request->property_id,
                'payment_type_id' => $request->payment_type_id,
                'payment_mode_id' => $request->payment_mode_id,
                'amount' => $request->amount,
                'reference_number' => $request->reference_number,
                'payment_date' => $request->payment_date,
                'status' => $request->status,
                'notes' => $request->notes,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment record updated successfully',
                'payment_record' => $paymentRecord->load(['tenant', 'property', 'paymentType', 'paymentMode'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update payment record',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified payment record
     */
    public function destroy(PaymentRecord $paymentRecord): JsonResponse
    {
        try {
            $paymentRecord->delete();

            return response()->json([
                'success' => true,
                'message' => 'Payment record deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete payment record',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}