<?php

namespace App\Http\Controllers;

use App\Models\QuotationItem;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class QuotationItemController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = QuotationItem::with(['quotation.customer', 'product', 'parentItem']);

        // Filter by quotation_id
        if ($request->has('quotation_id')) {
            $query->where('quotation_id', $request->quotation_id);
        }

        // Filter by item_type
        if ($request->has('item_type')) {
            $query->where('item_type', $request->item_type);
        }

        $items = $query->orderBy('created_at', 'desc')->paginate(15);

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'quotation_id' => 'required|exists:quotations,id',
            'product_id' => 'nullable|exists:products,id',
            'item_type' => 'required|in:product,service,amc',
            'description' => 'required|string',
            'quantity' => 'required|numeric|min:0.01',
            'unit_price' => 'required|numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'parent_item_id' => 'nullable|exists:quotation_items,id',
            'is_amc_line' => 'nullable|boolean',
            'amc_description_used' => 'nullable|string',
        ]);

        $item = QuotationItem::create($validated);
        $item->calculateTotal();
        $item->load(['quotation', 'product']);

        return response()->json($item, 201);
    }

    public function show(QuotationItem $quotationItem): JsonResponse
    {
        $quotationItem->load(['quotation', 'product', 'parentItem', 'amcItems']);
        return response()->json($quotationItem);
    }

    public function update(Request $request, QuotationItem $quotationItem): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'nullable|exists:products,id',
            'item_type' => 'in:product,service,amc',
            'description' => 'string',
            'quantity' => 'numeric|min:0.01',
            'unit_price' => 'numeric|min:0',
            'currency' => 'nullable|string|size:3',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'discount_amount' => 'nullable|numeric|min:0',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'parent_item_id' => 'nullable|exists:quotation_items,id',
            'is_amc_line' => 'nullable|boolean',
            'amc_description_used' => 'nullable|string',
        ]);

        $quotationItem->update($validated);
        $quotationItem->calculateTotal();
        $quotationItem->load(['quotation', 'product']);

        return response()->json($quotationItem);
    }

    public function destroy(QuotationItem $quotationItem): JsonResponse
    {
        $quotationItem->delete();
        return response()->json(['message' => 'Quotation item deleted successfully']);
    }
}