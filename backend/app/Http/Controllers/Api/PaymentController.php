<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Payment::with(['tenant', 'property', 'rentalUnit']);

        // Filter by tenant
        if ($request->has('tenant_id')) {
            $query->where('tenant_id', $request->tenant_id);
        }

        // Filter by property
        if ($request->has('property_id')) {
            $query->where('property_id', $request->property_id);
        }

        // Filter by payment type
        if ($request->has('payment_type')) {
            $query->where('payment_type', $request->payment_type);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('from_date')) {
            $query->where('payment_date', '>=', $request->from_date);
        }
        if ($request->has('to_date')) {
            $query->where('payment_date', '<=', $request->to_date);
        }

        $payments = $query->orderBy('payment_date', 'desc')->paginate(20);

        return response()->json([
            'success' => true,
            'payments' => $payments->items(),
            'pagination' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ]
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'tenant_id' => 'required|exists:tenants,id',
            'property_id' => 'required|exists:properties,id',
            'rental_unit_id' => 'nullable|exists:rental_units,id',
            'amount' => 'required|numeric|min:0',
            'currency' => 'required|string|max:3',
            'payment_type' => 'required|string|max:255',
            'payment_method' => 'required|string|max:255',
            'payment_date' => 'required|date',
            'due_date' => 'nullable|date',
            'description' => 'nullable|string',
            'reference_number' => 'nullable|string|max:255',
            'status' => ['required', Rule::in(['pending', 'completed', 'failed', 'refunded'])],
            'metadata' => 'nullable|array',
        ]);

        $payment = Payment::create($validated);
        $payment->load(['tenant', 'property', 'rentalUnit']);

        return response()->json([
            'success' => true,
            'message' => 'Payment created successfully',
            'payment' => $payment
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $payment = Payment::with(['tenant', 'property', 'rentalUnit'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'payment' => $payment
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $payment = Payment::findOrFail($id);

        $validated = $request->validate([
            'tenant_id' => 'sometimes|exists:tenants,id',
            'property_id' => 'sometimes|exists:properties,id',
            'rental_unit_id' => 'nullable|exists:rental_units,id',
            'amount' => 'sometimes|numeric|min:0',
            'currency' => 'sometimes|string|max:3',
            'payment_type' => 'sometimes|string|max:255',
            'payment_method' => 'sometimes|string|max:255',
            'payment_date' => 'sometimes|date',
            'due_date' => 'nullable|date',
            'description' => 'nullable|string',
            'reference_number' => 'nullable|string|max:255',
            'status' => ['sometimes', Rule::in(['pending', 'completed', 'failed', 'refunded'])],
            'metadata' => 'nullable|array',
        ]);

        $payment->update($validated);
        $payment->load(['tenant', 'property', 'rentalUnit']);

        return response()->json([
            'success' => true,
            'message' => 'Payment updated successfully',
            'payment' => $payment
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $payment = Payment::findOrFail($id);
        $payment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Payment deleted successfully'
        ]);
    }

    /**
     * Get payment statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'statistics' => [
                'total_amount' => 0,
                'completed_payments' => 0,
                'pending_payments' => 0,
                'failed_payments' => 0,
            ]
        ]);
    }
}
