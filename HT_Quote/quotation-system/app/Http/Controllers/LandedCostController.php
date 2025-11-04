<?php

namespace App\Http\Controllers;

use App\Models\Shipment;
use App\Models\ShipmentItem;
use App\Models\SharedCost;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class LandedCostController extends Controller
{
    public function calculate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shipment_name' => 'required|string|max:255',
            'shipment_date' => 'required|date',
            'calculation_method' => 'required|in:proportional,equal,weight_based,quantity_based',
            'base_currency' => 'required|string|size:3',
            'exchange_rate' => 'required|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.weight' => 'nullable|numeric|min:0',
            'shared_costs' => 'required|array|min:1',
            'shared_costs.*.expense_category_id' => 'required|exists:expense_categories,id',
            'shared_costs.*.description' => 'required|string|max:255',
            'shared_costs.*.amount' => 'required|numeric|min:0',
            'shared_costs.*.manual_allocations' => 'nullable|array',
            'shared_costs.*.manual_allocations.*' => 'nullable|numeric|min:0',
        ]);

        try {
            // Calculate landed costs without saving to database
            $calculationResult = $this->calculateLandedCostsOnly($validated);

            return response()->json([
                'shipment' => $calculationResult['shipment'],
                'calculation_summary' => $calculationResult['calculation_summary'],
                'items' => $calculationResult['items'],
                'shared_costs' => $calculationResult['shared_costs']
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error calculating landed costs: ' . $e->getMessage()
            ], 500);
        }
    }

    public function createShipment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shipment_name' => 'required|string|max:255',
            'shipment_date' => 'required|date',
            'calculation_method' => 'required|in:proportional,equal,weight_based,quantity_based',
            'base_currency' => 'required|string|size:3',
            'exchange_rate' => 'required|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.weight' => 'nullable|numeric|min:0',
            'shared_costs' => 'required|array|min:1',
            'shared_costs.*.expense_category_id' => 'required|exists:expense_categories,id',
            'shared_costs.*.description' => 'required|string|max:255',
            'shared_costs.*.amount' => 'required|numeric|min:0',
            'shared_costs.*.manual_allocations' => 'nullable|array',
            'shared_costs.*.manual_allocations.*' => 'nullable|numeric|min:0',
        ]);

        try {
            DB::beginTransaction();

            // Create shipment
            $shipment = Shipment::create([
                'name' => $validated['shipment_name'],
                'shipment_date' => $validated['shipment_date'],
                'calculation_method' => $validated['calculation_method'],
                'base_currency' => $validated['base_currency'],
                'exchange_rate' => $validated['exchange_rate'],
                'created_by' => auth()->id(),
            ]);

            // Create shipment items
            $items = [];
            foreach ($validated['items'] as $itemData) {
                $totalItemCost = $itemData['quantity'] * $itemData['unit_cost'];
                
                $item = ShipmentItem::create([
                    'shipment_id' => $shipment->id,
                    'product_id' => $itemData['product_id'],
                    'item_name' => $itemData['item_name'],
                    'quantity' => $itemData['quantity'],
                    'unit_cost' => $itemData['unit_cost'],
                    'weight' => $itemData['weight'] ?? null,
                    'total_item_cost' => $totalItemCost,
                ]);
                
                $items[] = $item;
            }

            // Create shared costs
            $sharedCosts = [];
            $manualAllocationsData = [];
            foreach ($validated['shared_costs'] as $costIndex => $costData) {
                $sharedCost = SharedCost::create([
                    'shipment_id' => $shipment->id,
                    'expense_category_id' => $costData['expense_category_id'],
                    'description' => $costData['description'],
                    'amount' => $costData['amount'],
                ]);
                
                // Store manual allocations if provided
                if (isset($costData['manual_allocations']) && !empty($costData['manual_allocations'])) {
                    $manualAllocationsData[$sharedCost->id] = $costData['manual_allocations'];
                }
                
                $sharedCosts[] = $sharedCost;
            }

            // Calculate landed costs
            $this->calculateLandedCosts($shipment, $items, $sharedCosts, $manualAllocationsData);

            // Reload shipment with relationships including allocations
            $shipment->load([
                'items.product', 
                'items.allocations.sharedCost.expenseCategory',
                'sharedCosts.expenseCategory', 
                'sharedCosts.allocations',
                'createdBy'
            ]);

            DB::commit();

            return response()->json([
                'shipment' => $shipment,
                'calculation_summary' => $this->getCalculationSummary($shipment)
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error creating shipment: ' . $e->getMessage()
            ], 500);
        }
    }

    private function calculateLandedCostsOnly(array $validated): array
    {
        // Create temporary objects for calculation (not saved to database)
        $shipment = (object) [
            'id' => null,
            'name' => $validated['shipment_name'],
            'shipment_date' => $validated['shipment_date'],
            'calculation_method' => $validated['calculation_method'],
            'base_currency' => $validated['base_currency'],
            'exchange_rate' => $validated['exchange_rate'],
            'created_by' => auth()->id(),
        ];

        // Create temporary items for calculation
        $items = [];
        foreach ($validated['items'] as $index => $itemData) {
            $totalItemCost = $itemData['quantity'] * $itemData['unit_cost'];
            
            $item = (object) [
                'id' => $index,
                'product_id' => $itemData['product_id'],
                'item_name' => $itemData['item_name'],
                'quantity' => $itemData['quantity'],
                'unit_cost' => $itemData['unit_cost'],
                'weight' => $itemData['weight'] ?? null,
                'total_item_cost' => $totalItemCost,
                'percentage_share' => 0,
                'allocated_shared_cost' => 0,
                'total_landed_cost' => 0,
                'landed_cost_per_unit' => 0,
            ];
            
            $items[] = $item;
        }

        // Create temporary shared costs for calculation
        $sharedCosts = [];
        $manualAllocationsData = [];
        foreach ($validated['shared_costs'] as $costIndex => $costData) {
            $sharedCost = (object) [
                'id' => $costIndex,
                'expense_category_id' => $costData['expense_category_id'],
                'description' => $costData['description'],
                'amount' => $costData['amount'],
            ];
            
            // Store manual allocations if provided
            if (isset($costData['manual_allocations']) && !empty($costData['manual_allocations'])) {
                $manualAllocationsData[$sharedCost->id] = $costData['manual_allocations'];
            }
            
            $sharedCosts[] = $sharedCost;
        }

        // Calculate landed costs using the existing logic
        $this->calculateLandedCostsLogic($shipment, $items, $sharedCosts, $manualAllocationsData);

        // Create calculation summary
        $calculationSummary = [
            'total_shipment_base_cost' => $shipment->total_base_cost,
            'total_shared_costs' => $shipment->total_shared_cost,
            'grand_total_landed_cost' => $shipment->total_landed_cost,
            'calculation_method' => $shipment->calculation_method,
            'base_currency' => $shipment->base_currency,
            'exchange_rate' => $shipment->exchange_rate,
        ];

        return [
            'shipment' => $shipment,
            'calculation_summary' => $calculationSummary,
            'items' => $items,
            'shared_costs' => $sharedCosts
        ];
    }

    private function calculateLandedCostsLogic($shipment, array $items, array $sharedCosts, array $manualAllocationsData = []): void
    {
        $totalSharedCost = collect($sharedCosts)->sum('amount');
        $totalBaseCost = collect($items)->sum('total_item_cost');
        
        // Calculate allocation based on method
        $allocations = $this->calculateAllocations($items, $totalBaseCost, $shipment->calculation_method);
        
        // Initialize item allocated costs
        $itemAllocatedCosts = array_fill(0, count($items), 0);
        
        // Process each shared cost
        foreach ($sharedCosts as $sharedCost) {
            $sharedCostId = $sharedCost->id;
            
            // Check if this shared cost has manual allocations
            if (isset($manualAllocationsData[$sharedCostId])) {
                // Use manual allocations
                $manualAllocations = $manualAllocationsData[$sharedCostId];
                foreach ($manualAllocations as $itemIndex => $amount) {
                    if (isset($items[$itemIndex])) {
                        $itemAllocatedCosts[$itemIndex] += $amount;
                    }
                }
            } else {
                // Use automatic distribution
                foreach ($items as $index => $item) {
                    $allocatedAmount = $allocations[$index] * $sharedCost->amount;
                    $itemAllocatedCosts[$index] += $allocatedAmount;
                }
            }
        }
        
        // Update items with calculated values
        foreach ($items as $index => $item) {
            $allocatedCost = $itemAllocatedCosts[$index];
            $totalLandedCost = $item->total_item_cost + $allocatedCost;
            $landedCostPerUnit = $totalLandedCost / $item->quantity;
            
            $item->percentage_share = $totalBaseCost > 0 ? ($item->total_item_cost / $totalBaseCost) : 0;
            $item->allocated_shared_cost = $allocatedCost;
            $item->total_landed_cost = $totalLandedCost;
            $item->landed_cost_per_unit = $landedCostPerUnit;
        }
        
        // Update shipment totals
        $shipment->total_base_cost = $totalBaseCost;
        $shipment->total_shared_cost = $totalSharedCost;
        $shipment->total_landed_cost = $totalBaseCost + $totalSharedCost;
    }

    private function calculateLandedCosts(Shipment $shipment, array $items, array $sharedCosts, array $manualAllocationsData = []): void
    {
        // First, calculate the logic without database operations
        $this->calculateLandedCostsLogic($shipment, $items, $sharedCosts, $manualAllocationsData);
        
        // Then create database records for allocations
        $totalSharedCost = collect($sharedCosts)->sum('amount');
        $totalBaseCost = collect($items)->sum('total_item_cost');
        $allocations = $this->calculateAllocations($items, $totalBaseCost, $shipment->calculation_method);
        
        // Process each shared cost to create allocation records
        foreach ($sharedCosts as $sharedCost) {
            $sharedCostId = $sharedCost->id;
            
            // Check if this shared cost has manual allocations
            if (isset($manualAllocationsData[$sharedCostId])) {
                // Use manual allocations
                $manualAllocations = $manualAllocationsData[$sharedCostId];
                foreach ($manualAllocations as $itemIndex => $amount) {
                    if (isset($items[$itemIndex])) {
                        // Create allocation record
                        \App\Models\SharedCostAllocation::create([
                            'shared_cost_id' => $sharedCostId,
                            'shipment_item_id' => $items[$itemIndex]->id,
                            'allocated_amount' => $amount,
                            'is_manual_override' => true
                        ]);
                    }
                }
            } else {
                // Use automatic distribution
                foreach ($items as $index => $item) {
                    $allocatedAmount = $allocations[$index] * $sharedCost->amount;
                    
                    // Create allocation record
                    \App\Models\SharedCostAllocation::create([
                        'shared_cost_id' => $sharedCostId,
                        'shipment_item_id' => $item->id,
                        'allocated_amount' => $allocatedAmount,
                        'is_manual_override' => false
                    ]);
                }
            }
        }
        
        // Update items with calculated values in database
        foreach ($items as $index => $item) {
            $item->update([
                'percentage_share' => $item->percentage_share,
                'allocated_shared_cost' => $item->allocated_shared_cost,
                'total_landed_cost' => $item->total_landed_cost,
                'landed_cost_per_unit' => $item->landed_cost_per_unit,
            ]);
        }
        
        // Update shipment totals in database
        $shipment->update([
            'total_base_cost' => $shipment->total_base_cost,
            'total_shared_cost' => $shipment->total_shared_cost,
            'total_landed_cost' => $shipment->total_landed_cost,
        ]);
    }

    private function calculateAllocations(array $items, float $totalBaseCost, string $method): array
    {
        $allocations = [];
        
        switch ($method) {
            case 'proportional':
                // Based on item value
                foreach ($items as $item) {
                    $allocations[] = $totalBaseCost > 0 ? $item->total_item_cost / $totalBaseCost : 0;
                }
                break;
                
            case 'equal':
                // Equal distribution
                $equalShare = count($items) > 0 ? 1 / count($items) : 0;
                $allocations = array_fill(0, count($items), $equalShare);
                break;
                
            case 'weight_based':
                // Based on weight
                $totalWeight = collect($items)->sum('weight') ?: 1; // Avoid division by zero
                foreach ($items as $item) {
                    $allocations[] = ($item->weight ?? 0) / $totalWeight;
                }
                break;
                
            case 'quantity_based':
                // Based on quantity
                $totalQuantity = collect($items)->sum('quantity');
                foreach ($items as $item) {
                    $allocations[] = $totalQuantity > 0 ? $item->quantity / $totalQuantity : 0;
                }
                break;
        }
        
        return $allocations;
    }

    private function getCalculationSummary(Shipment $shipment): array
    {
        return [
            'total_shipment_base_cost' => $shipment->total_base_cost,
            'total_shared_costs' => $shipment->total_shared_cost,
            'grand_total_landed_cost' => $shipment->total_landed_cost,
            'calculation_method' => $shipment->calculation_method,
            'base_currency' => $shipment->base_currency,
            'exchange_rate' => $shipment->exchange_rate,
        ];
    }

    public function updateProductPrices(Shipment $shipment): JsonResponse
    {
        if ($shipment->is_finalized) {
            return response()->json([
                'message' => 'This shipment has already been finalized'
            ], 422);
        }

        try {
            DB::beginTransaction();

            foreach ($shipment->items as $item) {
                $item->product->update([
                    'landed_cost' => $item->landed_cost_per_unit
                ]);
            }

            $shipment->update(['is_finalized' => true]);

            DB::commit();

            return response()->json([
                'message' => 'Product prices updated successfully',
                'updated_products_count' => $shipment->items->count()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error updating product prices: ' . $e->getMessage()
            ], 500);
        }
    }

    public function getShipments(): JsonResponse
    {
        $shipments = Shipment::with(['items.product', 'sharedCosts.expenseCategory', 'createdBy'])
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($shipments);
    }

    public function getShipment(Shipment $shipment): JsonResponse
    {
        $shipment->load(['items.product', 'sharedCosts.expenseCategory', 'createdBy']);
        
        return response()->json([
            'shipment' => $shipment,
            'calculation_summary' => $this->getCalculationSummary($shipment)
        ]);
    }
}