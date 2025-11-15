<?php

namespace App\Http\Controllers;

use App\Models\CustomerSupportContract;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CustomerSupportContractController extends Controller
{
    /**
     * Get all support contracts with filters
     */
    public function index(Request $request): JsonResponse
    {
        $query = CustomerSupportContract::with('customer');

        // Search filter
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('customer', function($q) use ($search) {
                $q->where('resort_name', 'like', "%{$search}%")
                  ->orWhere('resort_code', 'like', "%{$search}%")
                  ->orWhere('holding_company', 'like', "%{$search}%");
            });
        }

        // Contract type filter
        if ($request->has('contract_type') && $request->contract_type) {
            $query->where('contract_type', $request->contract_type);
        }

        // Product filter
        if ($request->has('product') && $request->product) {
            $query->whereJsonContains('products', $request->product);
        }

        // Status filter
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Update expired contracts before fetching
        $this->updateExpiredContracts();

        // Handle pagination
        $perPage = $request->get('per_page', 10);
        
        if ($request->has('page') && $request->has('per_page')) {
            // Use Laravel pagination
            $contracts = $query->orderBy('expiry_date', 'asc')->paginate($perPage);
            
            // Add computed fields to paginated results
            $contracts->getCollection()->each(function($contract) {
                $contract->days_until_expiry = $contract->daysUntilExpiry();
                $contract->status_color = $contract->getStatusColor();
                $contract->is_expiring_soon = $contract->isExpiringSoon();
            });
            
            return response()->json($contracts);
        } else {
            // Return all results (for backward compatibility)
            $contracts = $query->orderBy('expiry_date', 'asc')->get();

            // Add computed fields
            $contracts->each(function($contract) {
                $contract->days_until_expiry = $contract->daysUntilExpiry();
                $contract->status_color = $contract->getStatusColor();
                $contract->is_expiring_soon = $contract->isExpiringSoon();
            });

            return response()->json([
                'success' => true,
                'data' => $contracts
            ]);
        }
    }

    /**
     * Get contracts for a specific customer
     */
    public function getByCustomer($customerId): JsonResponse
    {
        $this->updateExpiredContracts();

        $contracts = CustomerSupportContract::where('customer_id', $customerId)
            ->orderBy('expiry_date', 'desc')
            ->get();

        $contracts->each(function($contract) {
            $contract->days_until_expiry = $contract->daysUntilExpiry();
            $contract->status_color = $contract->getStatusColor();
            $contract->is_expiring_soon = $contract->isExpiringSoon();
        });

        return response()->json([
            'success' => true,
            'data' => $contracts
        ]);
    }

    /**
     * Store a new support contract
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'contract_type' => 'required|string',
            'products' => 'required|array',
            'products.*' => 'string',
            'contract_number' => 'nullable|string',
            'start_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'status' => 'nullable|in:active,expired,manually_inactive',
            'notes' => 'nullable|string',
        ]);

        $contract = CustomerSupportContract::create($validated);
        $contract->load('customer');

        return response()->json([
            'success' => true,
            'message' => 'Support contract created successfully',
            'data' => $contract
        ], 201);
    }

    /**
     * Show a specific support contract
     */
    public function show($id): JsonResponse
    {
        $contract = CustomerSupportContract::with('customer')->findOrFail($id);

        $contract->days_until_expiry = $contract->daysUntilExpiry();
        $contract->status_color = $contract->getStatusColor();
        $contract->is_expiring_soon = $contract->isExpiringSoon();

        return response()->json([
            'success' => true,
            'data' => $contract
        ]);
    }

    /**
     * Update a support contract
     */
    public function update(Request $request, $id): JsonResponse
    {
        $contract = CustomerSupportContract::findOrFail($id);

        $validated = $request->validate([
            'customer_id' => 'sometimes|exists:customers,id',
            'contract_type' => 'sometimes|string',
            'products' => 'sometimes|array',
            'products.*' => 'string',
            'contract_number' => 'nullable|string',
            'start_date' => 'nullable|date',
            'expiry_date' => 'nullable|date',
            'status' => 'sometimes|in:active,expired,manually_inactive',
            'notes' => 'nullable|string',
        ]);

        $contract->update($validated);
        $contract->load('customer');

        return response()->json([
            'success' => true,
            'message' => 'Support contract updated successfully',
            'data' => $contract
        ]);
    }

    /**
     * Delete a support contract
     */
    public function destroy($id): JsonResponse
    {
        $contract = CustomerSupportContract::findOrFail($id);
        $contract->delete();

        return response()->json([
            'success' => true,
            'message' => 'Support contract deleted successfully'
        ]);
    }

    /**
     * Renew a contract (create a new one based on existing)
     */
    public function renew(Request $request, $id): JsonResponse
    {
        $oldContract = CustomerSupportContract::findOrFail($id);

        $validated = $request->validate([
            'start_date' => 'required|date',
            'expiry_date' => 'required|date|after:start_date',
            'contract_number' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $newContract = CustomerSupportContract::create([
            'customer_id' => $oldContract->customer_id,
            'contract_type' => $oldContract->contract_type,
            'products' => $oldContract->products,
            'contract_number' => $validated['contract_number'] ?? null,
            'start_date' => $validated['start_date'],
            'expiry_date' => $validated['expiry_date'],
            'status' => 'active',
            'notes' => $validated['notes'] ?? null,
        ]);

        $newContract->load('customer');

        return response()->json([
            'success' => true,
            'message' => 'Contract renewed successfully',
            'data' => $newContract
        ], 201);
    }

    /**
     * Manually set contract as inactive
     */
    public function setInactive($id): JsonResponse
    {
        $contract = CustomerSupportContract::findOrFail($id);
        $contract->update(['status' => 'manually_inactive']);

        return response()->json([
            'success' => true,
            'message' => 'Contract set to inactive',
            'data' => $contract
        ]);
    }

    /**
     * Update expired contracts
     */
    private function updateExpiredContracts(): void
    {
        CustomerSupportContract::where('status', 'active')
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<', now())
            ->update(['status' => 'expired']);
    }

    /**
     * Get contract statistics
     */
    public function statistics(): JsonResponse
    {
        $this->updateExpiredContracts();

        $stats = [
            'total' => CustomerSupportContract::count(),
            'active' => CustomerSupportContract::where('status', 'active')->count(),
            'expired' => CustomerSupportContract::where('status', 'expired')->count(),
            'manually_inactive' => CustomerSupportContract::where('status', 'manually_inactive')->count(),
            'expiring_soon' => CustomerSupportContract::where('status', 'active')
                ->whereNotNull('expiry_date')
                ->whereBetween('expiry_date', [now(), now()->addDays(30)])
                ->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }
}
