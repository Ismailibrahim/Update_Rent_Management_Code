<?php

namespace App\Http\Controllers;

use App\Models\ProductSuggestion;
use App\Models\Product;
use Illuminate\Http\Request;

class ProductSuggestionController extends Controller
{
    /**
     * Get all product suggestions (for admin management)
     */
    public function index()
    {
        $suggestions = ProductSuggestion::with(['product', 'suggestedProduct.category'])
            ->orderBy('product_id')
            ->orderBy('display_order')
            ->get();

        return response()->json($suggestions);
    }

    /**
     * Get suggestions for a specific product (for quotation creation)
     */
    public function getSuggestionsForProduct($productId)
    {
        $suggestions = ProductSuggestion::with(['suggestedProduct.category', 'suggestedProduct.serviceTasks'])
            ->where('product_id', $productId)
            ->orderBy('display_order')
            ->limit(10)
            ->get();

        return response()->json($suggestions->map(function ($suggestion) {
            return $suggestion->suggestedProduct;
        }));
    }

    /**
     * Store a new product suggestion
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'suggested_product_id' => 'required|exists:products,id|different:product_id',
            'display_order' => 'integer|min:0',
        ]);

        // Check if suggestion already exists
        $exists = ProductSuggestion::where('product_id', $validated['product_id'])
            ->where('suggested_product_id', $validated['suggested_product_id'])
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'This suggestion already exists'], 422);
        }

        // Check if we've reached the limit of 10 suggestions
        $count = ProductSuggestion::where('product_id', $validated['product_id'])->count();
        if ($count >= 10) {
            return response()->json(['message' => 'Maximum 10 suggestions allowed per product'], 422);
        }

        $suggestion = ProductSuggestion::create($validated);
        $suggestion->load(['product', 'suggestedProduct.category']);

        return response()->json($suggestion, 201);
    }

    /**
     * Update a product suggestion
     */
    public function update(Request $request, $id)
    {
        $suggestion = ProductSuggestion::findOrFail($id);

        $validated = $request->validate([
            'display_order' => 'integer|min:0',
        ]);

        $suggestion->update($validated);
        $suggestion->load(['product', 'suggestedProduct.category']);

        return response()->json($suggestion);
    }

    /**
     * Delete a product suggestion
     */
    public function destroy($id)
    {
        $suggestion = ProductSuggestion::findOrFail($id);
        $suggestion->delete();

        return response()->json(['message' => 'Suggestion deleted successfully']);
    }

    /**
     * Bulk store suggestions for a product
     */
    public function bulkStore(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'suggested_product_ids' => 'required|array|max:10',
            'suggested_product_ids.*' => 'required|exists:products,id',
        ]);

        // Delete existing suggestions for this product
        ProductSuggestion::where('product_id', $validated['product_id'])->delete();

        // Create new suggestions
        $suggestions = [];
        foreach ($validated['suggested_product_ids'] as $index => $suggestedProductId) {
            if ($suggestedProductId != $validated['product_id']) {
                $suggestions[] = ProductSuggestion::create([
                    'product_id' => $validated['product_id'],
                    'suggested_product_id' => $suggestedProductId,
                    'display_order' => $index + 1,
                ]);
            }
        }

        return response()->json([
            'message' => 'Suggestions updated successfully',
            'count' => count($suggestions),
        ]);
    }

    /**
     * Reorder product suggestions
     */
    public function reorder(Request $request)
    {
        $validated = $request->validate([
            'suggestions' => 'required|array',
            'suggestions.*.id' => 'required|exists:product_suggestions,id',
            'suggestions.*.display_order' => 'required|integer|min:1',
        ]);

        foreach ($validated['suggestions'] as $item) {
            ProductSuggestion::where('id', $item['id'])
                ->update(['display_order' => $item['display_order']]);
        }

        return response()->json([
            'message' => 'Suggestions reordered successfully',
        ]);
    }
}
