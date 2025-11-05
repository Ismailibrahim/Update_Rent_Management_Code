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
        $currencies = Currency::query()->orderBy('code')->get();

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
            'is_default' => 'boolean',
        ]);

        // If this is set as default currency, unset others
        if ($validated['is_default'] ?? false) {
            Currency::where('is_default', true)->update(['is_default' => false]);
        }

        $currency = Currency::create([
            'code' => strtoupper($validated['code']),
            'is_default' => $validated['is_default'] ?? false,
        ]);

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
            'is_default' => 'boolean',
        ]);

        // If this is set as default currency, unset others
        if ($validated['is_default'] ?? false) {
            Currency::where('is_default', true)->where('id', '!=', $id)->update(['is_default' => false]);
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
        
        // Prevent deletion of default currency
        if ($currency->is_default) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete the default currency'
            ], 400);
        }
        
        $currency->delete();

        return response()->json([
            'success' => true,
            'message' => 'Currency deleted successfully'
        ]);
    }

    /**
     * Get default currency
     */
    public function default(): JsonResponse
    {
        $defaultCurrency = Currency::default()->first();

        return response()->json([
            'success' => true,
            'currency' => $defaultCurrency
        ]);
    }

}
