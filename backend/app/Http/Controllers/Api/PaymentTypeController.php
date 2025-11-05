<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use App\Models\PaymentType;

class PaymentTypeController extends Controller
{
    /**
     * Display a listing of payment types
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = PaymentType::query();
            
            // Apply filters if provided
            if ($request->has('search')) {
                $search = $request->get('search');
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }
            
            if ($request->has('status')) {
                $query->where('is_active', $request->get('status') === 'active');
            }
            
            // Use pagination instead of loading all records
            $perPage = $request->get('per_page', 15);
            $page = $request->get('page', 1);
            
            $paymentTypes = $query->orderBy('created_at', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);
            
            return response()->json([
                'success' => true,
                'payment_types' => $paymentTypes->items(),
                'pagination' => [
                    'current_page' => $paymentTypes->currentPage(),
                    'last_page' => $paymentTypes->lastPage(),
                    'per_page' => $paymentTypes->perPage(),
                    'total' => $paymentTypes->total(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment types',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created payment type
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:255|unique:payment_types',
            'code' => 'nullable|string|min:2|max:50|unique:payment_types|regex:/^[a-z_]+$/',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'is_recurring' => 'boolean',
            'requires_approval' => 'boolean',
            'settings' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            // Auto-generate code if not provided
            $code = $request->code;
            if (empty($code)) {
                $code = strtolower(preg_replace('/[^a-zA-Z0-9]/', '_', $request->name));
                $code = preg_replace('/_+/', '_', $code); // Replace multiple underscores with single
                $code = trim($code, '_'); // Remove leading/trailing underscores
                
                // Ensure uniqueness
                $originalCode = $code;
                $counter = 1;
                while (PaymentType::where('code', $code)->exists()) {
                    $code = $originalCode . '_' . $counter;
                    $counter++;
                }
            }

            $paymentType = PaymentType::create([
                'name' => $request->name,
                'code' => $code,
                'description' => $request->description,
                'is_active' => $request->boolean('is_active', true),
                'is_recurring' => $request->boolean('is_recurring', false),
                'requires_approval' => $request->boolean('requires_approval', false),
                'settings' => $request->settings ?? [],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment type created successfully',
                'payment_type' => $paymentType
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create payment type',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified payment type
     */
    public function show(PaymentType $paymentType): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'payment_type' => $paymentType
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment type',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified payment type
     */
    public function update(Request $request, PaymentType $paymentType): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:255|unique:payment_types,name,' . $paymentType->id,
            'code' => 'nullable|string|min:2|max:50|unique:payment_types,code,' . $paymentType->id . '|regex:/^[a-z_]+$/',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'is_recurring' => 'boolean',
            'requires_approval' => 'boolean',
            'settings' => 'nullable|array',
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
                'name' => $request->name,
                'description' => $request->description,
                'is_active' => $request->boolean('is_active', true),
                'is_recurring' => $request->boolean('is_recurring', false),
                'requires_approval' => $request->boolean('requires_approval', false),
                'settings' => $request->settings ?? [],
            ];

            // Only update code if provided
            if ($request->has('code') && !empty($request->code)) {
                $updateData['code'] = $request->code;
            }

            $paymentType->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Payment type updated successfully',
                'payment_type' => $paymentType
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update payment type',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified payment type
     */
    public function destroy(PaymentType $paymentType): JsonResponse
    {
        try {
            // Check if payment type is being used in tenant ledger entries
            $ledgerCount = \App\Models\TenantLedger::where('payment_type_id', $paymentType->id)->count();
            
            if ($ledgerCount > 0) {
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete payment type '{$paymentType->name}' because it is being used in {$ledgerCount} ledger entries. Please deactivate it instead or update the ledger entries first.",
                    'error' => 'Foreign key constraint violation'
                ], 422);
            }

            $paymentType->delete();

            return response()->json([
                'success' => true,
                'message' => 'Payment type deleted successfully'
            ]);
        } catch (\Illuminate\Database\QueryException $e) {
            // Handle foreign key constraint violations
            if ($e->getCode() == 23000) { // MySQL foreign key constraint error code
                return response()->json([
                    'success' => false,
                    'message' => "Cannot delete payment type '{$paymentType->name}' because it is being used in other records. Please deactivate it instead or update the related records first.",
                    'error' => 'Foreign key constraint violation'
                ], 422);
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete payment type',
                'error' => $e->getMessage()
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete payment type',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}