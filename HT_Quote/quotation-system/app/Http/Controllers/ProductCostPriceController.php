<?php

namespace App\Http\Controllers;

use App\Models\ProductCostPrice;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProductCostPriceController extends Controller
{
    /**
     * Display a listing of product cost prices with search
     */
    public function index(Request $request): JsonResponse
    {
        $query = ProductCostPrice::with(['product', 'creator']);

        // Search functionality
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('supplier_name', 'like', "%{$search}%")
                  ->orWhere('invoice_number', 'like', "%{$search}%")
                  ->orWhereHas('product', function($pq) use ($search) {
                      $pq->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                  });
            });
        }

        // Filter by product
        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        // Filter by date range
        if ($request->has('date_from')) {
            $query->where('shipment_received_date', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->where('shipment_received_date', '<=', $request->date_to);
        }

        $costPrices = $query->orderBy('shipment_received_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($costPrices);
    }

    /**
     * Store a newly created cost price
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'cost_price' => 'required|numeric|min:0',
            'shipment_received_date' => 'required|date',
            'supplier_name' => 'nullable|string|max:255',
            'invoice_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = auth()->id();

        $costPrice = ProductCostPrice::create($validated);
        $costPrice->load(['product', 'creator']);

        return response()->json($costPrice, 201);
    }

    /**
     * Display the specified cost price
     */
    public function show(ProductCostPrice $productCostPrice): JsonResponse
    {
        $productCostPrice->load(['product', 'creator']);
        return response()->json($productCostPrice);
    }

    /**
     * Update the specified cost price
     */
    public function update(Request $request, ProductCostPrice $productCostPrice): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'cost_price' => 'required|numeric|min:0',
            'shipment_received_date' => 'required|date',
            'supplier_name' => 'nullable|string|max:255',
            'invoice_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $productCostPrice->update($validated);
        $productCostPrice->load(['product', 'creator']);

        return response()->json($productCostPrice);
    }

    /**
     * Remove the specified cost price
     */
    public function destroy(ProductCostPrice $productCostPrice): JsonResponse
    {
        $productCostPrice->delete();
        return response()->json(['message' => 'Cost price deleted successfully']);
    }

    /**
     * Get latest cost price for a product
     */
    public function getLatestByProduct($productId): JsonResponse
    {
        $latestCostPrice = ProductCostPrice::where('product_id', $productId)
            ->orderBy('shipment_received_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->first();

        if (!$latestCostPrice) {
            return response()->json(['message' => 'No cost price found'], 404);
        }

        $latestCostPrice->load(['product', 'creator']);
        return response()->json($latestCostPrice);
    }
}
