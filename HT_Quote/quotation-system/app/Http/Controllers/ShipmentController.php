<?php

namespace App\Http\Controllers;

use App\Models\Shipment;
use App\Models\ShipmentItem;
use App\Models\SharedCost;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ShipmentController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $shipments = Shipment::with(['createdBy', 'items', 'sharedCosts'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($shipments);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'shipment_date' => 'required|date',
            'calculation_method' => 'required|string|in:proportional,equal,weight_based,quantity_based',
            'base_currency' => 'required|string|in:USD,MVR',
            'exchange_rate' => 'required|numeric|min:0.0001',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.weight' => 'nullable|numeric|min:0',
            'shared_costs' => 'required|array|min:1',
            'shared_costs.*.expense_category_id' => 'required|integer|exists:expense_categories,id',
            'shared_costs.*.description' => 'required|string|max:255',
            'shared_costs.*.amount' => 'required|numeric|min:0.01',
        ]);

        try {
            DB::beginTransaction();

            // Create shipment
            $shipment = Shipment::create([
                'name' => $validated['name'],
                'shipment_date' => $validated['shipment_date'],
                'calculation_method' => $validated['calculation_method'],
                'base_currency' => $validated['base_currency'],
                'exchange_rate' => $validated['exchange_rate'],
                'created_by' => auth()->id(),
                'is_finalized' => false
            ]);

            // Create shipment items
            foreach ($validated['items'] as $itemData) {
                $totalItemCost = $itemData['quantity'] * $itemData['unit_cost'];
                
                ShipmentItem::create([
                    'shipment_id' => $shipment->id,
                    'product_id' => $itemData['product_id'],
                    'item_name' => $itemData['item_name'],
                    'quantity' => $itemData['quantity'],
                    'unit_cost' => $itemData['unit_cost'],
                    'weight' => $itemData['weight'] ?? 0,
                    'total_item_cost' => $totalItemCost,
                ]);
            }

            // Create shared costs
            foreach ($validated['shared_costs'] as $costData) {
                SharedCost::create([
                    'shipment_id' => $shipment->id,
                    'expense_category_id' => $costData['expense_category_id'],
                    'description' => $costData['description'],
                    'amount' => $costData['amount'],
                ]);
            }

            // Calculate and save totals
            $shipment->calculateTotals();

            DB::commit();

            return response()->json([
                'message' => 'Shipment saved successfully',
                'shipment' => $shipment->load(['items.product', 'sharedCosts.expenseCategory', 'createdBy'])
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to save shipment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $shipment = Shipment::with(['items.product', 'sharedCosts.expenseCategory', 'createdBy'])
            ->findOrFail($id);

        return response()->json($shipment);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $shipment = Shipment::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'shipment_date' => 'sometimes|required|date',
            'calculation_method' => 'sometimes|required|string|in:proportional,equal,weight_based,quantity_based',
            'base_currency' => 'sometimes|required|string|in:USD,MVR',
            'exchange_rate' => 'sometimes|required|numeric|min:0.0001',
            'is_finalized' => 'sometimes|boolean',
        ]);

        $shipment->update($validated);

        return response()->json([
            'message' => 'Shipment updated successfully',
            'shipment' => $shipment->load(['items.product', 'sharedCosts.expenseCategory', 'createdBy'])
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        $shipment = Shipment::findOrFail($id);

        try {
            DB::beginTransaction();

            // Delete related items and costs
            $shipment->items()->delete();
            $shipment->sharedCosts()->delete();
            
            // Delete shipment
            $shipment->delete();

            DB::commit();

            return response()->json([
                'message' => 'Shipment deleted successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to delete shipment',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
