<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Currency;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CurrencyController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Currency::query();

        // Filter by active status
        if ($request->has('active_only') && $request->active_only) {
            $query->active();
        }

        $currencies = $query->orderBy('code')->get();

        return response()->json([
            'success' => true,
            'currencies' => $currencies
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => 'required|string|max:3|unique:currencies,code',
            'name' => 'required|string|max:255',
            'symbol' => 'required|string|max:10',
            'exchange_rate' => 'required|numeric|min:0',
            'is_base' => 'boolean',
            'is_active' => 'boolean',
            'decimal_places' => 'integer|min:0|max:4',
            'thousands_separator' => 'string|max:1',
            'decimal_separator' => 'string|max:1',
        ]);

        // If this is set as base currency, unset others
        if ($validated['is_base'] ?? false) {
            Currency::where('is_base', true)->update(['is_base' => false]);
        }

        $currency = Currency::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Currency created successfully',
            'currency' => $currency
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $currency = Currency::findOrFail($id);

        return response()->json([
            'success' => true,
            'currency' => $currency
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $currency = Currency::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|string|max:3|unique:currencies,code,' . $id,
            'name' => 'sometimes|string|max:255',
            'symbol' => 'sometimes|string|max:10',
            'exchange_rate' => 'sometimes|numeric|min:0',
            'is_base' => 'boolean',
            'is_active' => 'boolean',
            'decimal_places' => 'integer|min:0|max:4',
            'thousands_separator' => 'string|max:1',
            'decimal_separator' => 'string|max:1',
        ]);

        // If this is set as base currency, unset others
        if ($validated['is_base'] ?? false) {
            Currency::where('is_base', true)->where('id', '!=', $id)->update(['is_base' => false]);
        }

        $currency->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Currency updated successfully',
            'currency' => $currency
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $currency = Currency::findOrFail($id);

        // Prevent deletion of base currency
        if ($currency->is_base) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete the base currency'
            ], 400);
        }

        $currency->delete();

        return response()->json([
            'success' => true,
            'message' => 'Currency deleted successfully'
        ]);
    }

    /**
     * Get base currency
     */
    public function base(): JsonResponse
    {
        $baseCurrency = Currency::base()->first();

        return response()->json([
            'success' => true,
            'currency' => $baseCurrency
        ]);
    }

    /**
     * Convert amount between currencies
     */
    public function convert(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0',
            'from_currency' => 'required|string|exists:currencies,code',
            'to_currency' => 'required|string|exists:currencies,code',
        ]);

        $fromCurrency = Currency::where('code', $validated['from_currency'])->first();
        $toCurrency = Currency::where('code', $validated['to_currency'])->first();

        // Convert to base currency first, then to target currency
        $baseAmount = $validated['amount'] / $fromCurrency->exchange_rate;
        $convertedAmount = $baseAmount * $toCurrency->exchange_rate;

        return response()->json([
            'success' => true,
            'original_amount' => $validated['amount'],
            'converted_amount' => round($convertedAmount, $toCurrency->decimal_places),
            'from_currency' => $fromCurrency->code,
            'to_currency' => $toCurrency->code,
            'exchange_rate' => $toCurrency->exchange_rate / $fromCurrency->exchange_rate
        ]);
    }
}
