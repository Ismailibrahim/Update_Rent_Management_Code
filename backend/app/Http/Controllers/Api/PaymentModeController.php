<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use App\Models\PaymentMode;

class PaymentModeController extends Controller
{
    /**
     * Display a listing of payment modes
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = PaymentMode::query();
            
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
            
            $paymentModes = $query->orderBy('created_at', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);
            
            return response()->json([
                'success' => true,
                'payment_modes' => $paymentModes->items(),
                'pagination' => [
                    'current_page' => $paymentModes->currentPage(),
                    'last_page' => $paymentModes->lastPage(),
                    'per_page' => $paymentModes->perPage(),
                    'total' => $paymentModes->total(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment modes',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created payment mode
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:255|unique:payment_modes',
            'code' => 'nullable|string|min:2|max:50|unique:payment_modes|regex:/^[a-z_]+$/',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'requires_reference' => 'boolean',
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
                while (PaymentMode::where('code', $code)->exists()) {
                    $code = $originalCode . '_' . $counter;
                    $counter++;
                }
            }

            $paymentMode = PaymentMode::create([
                'name' => $request->name,
                'code' => $code,
                'description' => $request->description,
                'is_active' => $request->boolean('is_active', true),
                'requires_reference' => $request->boolean('requires_reference', false),
                'settings' => $request->settings ?? [],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment mode created successfully',
                'payment_mode' => $paymentMode
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create payment mode',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified payment mode
     */
    public function show(PaymentMode $paymentMode): JsonResponse
    {
        try {
            return response()->json([
                'success' => true,
                'payment_mode' => $paymentMode
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payment mode',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified payment mode
     */
    public function update(Request $request, PaymentMode $paymentMode): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|min:2|max:255|unique:payment_modes,name,' . $paymentMode->id,
            'code' => 'nullable|string|min:2|max:50|unique:payment_modes,code,' . $paymentMode->id . '|regex:/^[a-z_]+$/',
            'description' => 'nullable|string|max:500',
            'is_active' => 'boolean',
            'requires_reference' => 'boolean',
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
                'requires_reference' => $request->boolean('requires_reference', false),
                'settings' => $request->settings ?? [],
            ];

            // Only update code if provided
            if ($request->has('code') && !empty($request->code)) {
                $updateData['code'] = $request->code;
            }

            $paymentMode->update($updateData);

            return response()->json([
                'success' => true,
                'message' => 'Payment mode updated successfully',
                'payment_mode' => $paymentMode
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update payment mode',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified payment mode
     */
    public function destroy(PaymentMode $paymentMode): JsonResponse
    {
        try {
            $paymentMode->delete();

            return response()->json([
                'success' => true,
                'message' => 'Payment mode deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete payment mode',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}