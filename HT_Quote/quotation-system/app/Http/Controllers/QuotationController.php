<?php

namespace App\Http\Controllers;

use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\SystemSetting;
use App\Models\QuotationStatusHistory;
use App\Models\ProductCostPrice;
use App\Services\QuotationFollowupService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class QuotationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('quotations.view')) {
            return response()->json(['message' => 'You do not have permission to view quotations'], 403);
        }

        try {
            $query = Quotation::with([
                'customer:id,resort_name,holding_company,country', // Only load needed customer fields
                'items:id,quotation_id,product_id,item_type,description,quantity,unit_price,item_total' // Only load needed item fields
            ]);

            // If user doesn't have view_all permission, only show their own quotations
            if (!$user->can('quotations.view_all')) {
                $query->where('created_by', $user->id);
            }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        $quotations = $query->orderBy('created_at', 'desc')->paginate(10);

        return response()->json($quotations);
        } catch (\Exception $e) {
            \Log::error('Error fetching quotations: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to fetch quotations',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function previewNumber(Request $request): JsonResponse
    {
        try {
            $customerId = $request->input('customer_id');
            
            if (!$customerId) {
                return response()->json([
                    'error' => 'Customer ID is required'
                ], 400);
            }

            // Generate preview quotation number
            $quotationNumber = \App\Models\QuotationSequence::generatePreviewQuotationNumber($customerId);
            
            return response()->json([
                'quotation_number' => $quotationNumber
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('quotations.create')) {
            return response()->json(['message' => 'You do not have permission to create quotations'], 403);
        }

        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'currency' => 'required|string|size:3',
            'valid_until' => 'nullable|date|after:today',
            'notes' => 'nullable|string',
            'terms_conditions' => 'nullable|string',
            'selected_tc_templates' => 'nullable|array',
            'selected_tc_templates.*' => 'exists:terms_conditions_templates,id',
            'discount_type' => 'nullable|in:value,percentage',
            'discount_amount' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.item_type' => 'required|in:product,service,amc',
            'items.*.description' => 'required|string|max:1000',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.item_total' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.import_duty' => 'nullable|numeric|min:0',
            'items.*.import_duty_inclusive' => 'nullable|boolean',
            'items.*.parent_item_id' => 'nullable|integer',
            'items.*.is_amc_line' => 'nullable|boolean',
            'items.*.amc_description_used' => 'nullable|string',
            'items.*.is_service_item' => 'nullable|boolean',
            'items.*.man_days' => 'nullable|numeric|min:0',
        ]);

        // Calculate discount values
        $discountAmount = 0;
        $discountPercentage = 0;
        
        if (isset($validated['discount_amount']) && $validated['discount_amount'] > 0) {
            if (($validated['discount_type'] ?? 'percentage') === 'percentage') {
                $discountPercentage = $validated['discount_amount'];
            } else {
                $discountAmount = $validated['discount_amount'];
            }
        }

        $quotation = Quotation::create([
            'quotation_number' => Quotation::generateQuotationNumber($validated['customer_id']),
            'customer_id' => $validated['customer_id'],
            'currency' => $validated['currency'] ?? 'USD',
            'valid_until' => $validated['valid_until'] ?? now()->addDays(
                (int) SystemSetting::getValue('quotation_validity_days', 14)
            ),
            'discount_percentage' => $discountPercentage,
            'discount_amount' => $discountAmount,
            'notes' => $validated['notes'] ?? '',
            'terms_conditions' => $validated['terms_conditions'] ?? '',
            'selected_tc_templates' => $validated['selected_tc_templates'] ?? null,
            'created_by' => auth()->id(),
        ]);

        $previousItem = null;
        foreach ($validated['items'] as $index => $itemData) {
            $item = new QuotationItem($itemData);
            $item->quotation_id = $quotation->id;

            // Auto-detect AMC items by checking if:
            // 1. Same product_id as previous item
            // 2. Import duty is 0
            // 3. Description contains "Maintenance" or "Support" or "AMC"
            if ($previousItem &&
                isset($itemData['product_id']) &&
                $itemData['product_id'] == $previousItem->product_id &&
                ($itemData['import_duty'] == 0 || !isset($itemData['import_duty'])) &&
                (stripos($itemData['description'], 'Maintenance') !== false ||
                 stripos($itemData['description'], 'Support') !== false ||
                 stripos($itemData['description'], 'AMC') !== false)) {

                $item->is_amc_line = true;
                $item->parent_item_id = $previousItem->id;
                $item->item_type = 'amc';
            }

            $item->save();
            $previousItem = $item;
        }

        $quotation->calculateTotals();
        $quotation->load(['customer', 'items.product']);

        return response()->json($quotation, 201);
    }

    public function show(Request $request, Quotation $quotation): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('quotations.view')) {
            return response()->json(['message' => 'You do not have permission to view quotations'], 403);
        }

        // If user doesn't have view_all permission, only show their own quotations
        if (!$user->can('quotations.view_all') && $quotation->created_by !== $user->id) {
            return response()->json(['message' => 'You can only view your own quotations'], 403);
        }

        $quotation->load([
            'customer',
            'customer.contacts',
            'items.product',
            'items.amcItems',
            'createdByUser'
        ]);
        
        // Load service terms for print view
        $serviceTerms = \App\Models\ServiceTermsTemplate::getDefaultTemplates();

        // Calculate cost and profit for each item
        $totalCost = 0;
        $totalProfit = 0;

        foreach ($quotation->items as $item) {
            // Only calculate cost/profit for items with products (not services)
            if ($item->product_id) {
                // Get the latest cost price before or on the quotation created date
                $costPrice = ProductCostPrice::where('product_id', $item->product_id)
                    ->where('shipment_received_date', '<=', $quotation->created_at)
                    ->orderBy('shipment_received_date', 'desc')
                    ->value('cost_price');

                if ($costPrice) {
                    $itemCost = $costPrice * $item->quantity;
                    $itemRevenue = $item->item_total;
                    $itemProfit = $itemRevenue - $itemCost;

                    $totalCost += $itemCost;
                    $totalProfit += $itemProfit;

                    // Add cost and profit to item for reference
                    $item->cost_price = $costPrice;
                    $item->total_cost = $itemCost;
                    $item->profit = $itemProfit;
                }
            }
        }

        // Calculate profit margin percentage
        $profitMargin = $quotation->total_amount > 0
            ? ($totalProfit / $quotation->total_amount) * 100
            : 0;

        // Add cost and profit summary to quotation
        $quotation->total_cost = round($totalCost, 2);
        $quotation->total_profit = round($totalProfit, 2);
        $quotation->profit_margin = round($profitMargin, 2);

        return response()->json([
            'quotation' => $quotation,
            'serviceTerms' => $serviceTerms
        ]);
    }

    public function update(Request $request, Quotation $quotation): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('quotations.edit')) {
            return response()->json(['message' => 'You do not have permission to edit quotations'], 403);
        }

        // If user doesn't have view_all permission, only allow editing their own quotations
        if (!$user->can('quotations.view_all') && $quotation->created_by !== $user->id) {
            return response()->json(['message' => 'You can only edit your own quotations'], 403);
        }

        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'currency' => 'required|string|size:3',
            'valid_until' => 'nullable|date|after:today',
            'notes' => 'nullable|string',
            'terms_conditions' => 'nullable|string',
            'selected_tc_templates' => 'nullable|array',
            'selected_tc_templates.*' => 'exists:terms_conditions_templates,id',
            'discount_type' => 'nullable|in:value,percentage',
            'discount_amount' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.item_type' => 'required|in:product,service,amc',
            'items.*.description' => 'required|string|max:1000',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.item_total' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.import_duty' => 'nullable|numeric|min:0',
            'items.*.import_duty_inclusive' => 'nullable|boolean',
            'items.*.parent_item_id' => 'nullable|integer',
            'items.*.is_amc_line' => 'nullable|boolean',
            'items.*.amc_description_used' => 'nullable|string',
            'items.*.is_service_item' => 'nullable|boolean',
            'items.*.man_days' => 'nullable|numeric|min:0',
        ]);

        // Calculate discount values
        $discountAmount = 0;
        $discountPercentage = 0;
        
        if (isset($validated['discount_amount']) && $validated['discount_amount'] > 0) {
            if (($validated['discount_type'] ?? 'percentage') === 'percentage') {
                $discountPercentage = $validated['discount_amount'];
            } else {
                $discountAmount = $validated['discount_amount'];
            }
        }

        // Update quotation basic info
        $quotation->update([
            'customer_id' => $validated['customer_id'],
            'currency' => $validated['currency'] ?? 'USD',
            'valid_until' => $validated['valid_until'] ?? $quotation->valid_until,
            'discount_percentage' => $discountPercentage,
            'discount_amount' => $discountAmount,
            'notes' => $validated['notes'] ?? '',
            'terms_conditions' => $validated['terms_conditions'] ?? '',
            'selected_tc_templates' => $validated['selected_tc_templates'] ?? null,
        ]);

        // Delete existing items
        $quotation->items()->delete();

        // Create new items
        $previousItem = null;
        foreach ($validated['items'] as $index => $itemData) {
            $item = new QuotationItem($itemData);
            $item->quotation_id = $quotation->id;

            // Auto-detect AMC items by checking if:
            // 1. Same product_id as previous item
            // 2. Import duty is 0
            // 3. Description contains "Maintenance" or "Support" or "AMC"
            if ($previousItem &&
                isset($itemData['product_id']) &&
                $itemData['product_id'] == $previousItem->product_id &&
                ($itemData['import_duty'] == 0 || !isset($itemData['import_duty'])) &&
                (stripos($itemData['description'], 'Maintenance') !== false ||
                 stripos($itemData['description'], 'Support') !== false ||
                 stripos($itemData['description'], 'AMC') !== false)) {

                $item->is_amc_line = true;
                $item->parent_item_id = $previousItem->id;
                $item->item_type = 'amc';
            }

            $item->save();
            $previousItem = $item;
        }

        $quotation->calculateTotals();
        $quotation->load(['customer', 'items.product']);

        return response()->json($quotation);
    }

    public function destroy(Request $request, Quotation $quotation): JsonResponse
    {
        // Check authentication and permission
        $user = $request->user();
        if (!$user || !$user->can('quotations.delete')) {
            return response()->json(['message' => 'You do not have permission to delete quotations'], 403);
        }

        // If user doesn't have view_all permission, only allow deleting their own quotations
        if (!$user->can('quotations.view_all') && $quotation->created_by !== $user->id) {
            return response()->json(['message' => 'You can only delete your own quotations'], 403);
        }

        try {
            // Check if quotation exists
            if (!$quotation) {
                return response()->json(['message' => 'Quotation not found'], 404);
            }

            // Check if quotation can be deleted (only draft quotations)
            if ($quotation->status !== 'draft') {
                return response()->json(['message' => 'Only draft quotations can be deleted'], 400);
            }

            // Delete related items first to handle self-referencing foreign key
            // Delete AMC items (child items with parent_item_id) first
            \DB::table('quotation_items')
                ->where('quotation_id', $quotation->id)
                ->whereNotNull('parent_item_id')
                ->delete();
            
            // Then delete parent items
            \DB::table('quotation_items')
                ->where('quotation_id', $quotation->id)
                ->delete();
            
            // Finally delete the quotation
            $quotation->delete();
            
            return response()->json(['message' => 'Quotation deleted successfully']);
        } catch (\Exception $e) {
            \Log::error('Error deleting quotation: ' . $e->getMessage(), [
                'quotation_id' => $quotation->id ?? 'unknown',
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Failed to delete quotation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function sendQuotation(Quotation $quotation): JsonResponse
    {
        $oldStatus = $quotation->status;

        $quotation->update([
            'status' => 'sent',
            'sent_date' => now()
        ]);

        // Log status change
        QuotationStatusHistory::create([
            'quotation_id' => $quotation->id,
            'old_status' => $oldStatus,
            'new_status' => 'sent',
            'changed_by' => auth()->id(),
        ]);

        // Create follow-up reminders
        $followupService = new QuotationFollowupService();
        $followupService->createFollowupsForQuotation($quotation);

        return response()->json(['message' => 'Quotation sent successfully']);
    }

    public function acceptQuotation(Quotation $quotation): JsonResponse
    {
        $oldStatus = $quotation->status;

        $quotation->update([
            'status' => 'accepted',
            'accepted_date' => now()
        ]);

        // Log status change
        QuotationStatusHistory::create([
            'quotation_id' => $quotation->id,
            'old_status' => $oldStatus,
            'new_status' => 'accepted',
            'changed_by' => auth()->id(),
        ]);

        // Cancel pending follow-ups
        $followupService = new QuotationFollowupService();
        $followupService->cancelPendingFollowups($quotation, 'Quotation accepted');

        return response()->json(['message' => 'Quotation accepted']);
    }

    public function rejectQuotation(Quotation $quotation): JsonResponse
    {
        $oldStatus = $quotation->status;

        $quotation->update([
            'status' => 'rejected',
            'rejected_date' => now()
        ]);

        // Log status change
        QuotationStatusHistory::create([
            'quotation_id' => $quotation->id,
            'old_status' => $oldStatus,
            'new_status' => 'rejected',
            'changed_by' => auth()->id(),
        ]);

        // Cancel pending follow-ups
        $followupService = new QuotationFollowupService();
        $followupService->cancelPendingFollowups($quotation, 'Quotation rejected');

        return response()->json(['message' => 'Quotation rejected']);
    }

    public function getStatusHistory(Quotation $quotation): JsonResponse
    {
        $history = QuotationStatusHistory::with('changedBy')
            ->where('quotation_id', $quotation->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($history);
    }

    public function generatePdf(Quotation $quotation): JsonResponse
    {
        return response()->json(['message' => 'PDF generation not implemented yet']);
    }
}