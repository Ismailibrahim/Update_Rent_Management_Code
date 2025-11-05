<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaintenanceCost;
use App\Models\RentalUnitAsset;
use App\Models\Currency;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class MaintenanceCostController extends Controller
{
    /**
     * Display a listing of maintenance costs
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = MaintenanceCost::with(['rentalUnitAsset.asset', 'rentalUnitAsset.rentalUnit.property', 'currency']);

            // Status filter
            if ($request->has('status') && $request->status) {
                $query->where('status', $request->status);
            }

            // Date range filter
            if ($request->has('date_from') && $request->date_from) {
                $query->where('repair_date', '>=', $request->date_from);
            }

            if ($request->has('date_to') && $request->date_to) {
                $query->where('repair_date', '<=', $request->date_to);
            }

            // Use pagination instead of loading all records
            $perPage = $request->get('per_page', 15);
            $page = $request->get('page', 1);
            
            $maintenanceCosts = $query->orderBy('created_at', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'success' => true,
                'maintenance_costs' => $maintenanceCosts->items(),
                'pagination' => [
                    'current_page' => $maintenanceCosts->currentPage(),
                    'last_page' => $maintenanceCosts->lastPage(),
                    'per_page' => $maintenanceCosts->perPage(),
                    'total' => $maintenanceCosts->total(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch maintenance costs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created maintenance cost
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'rental_unit_asset_id' => 'required|exists:rental_unit_assets,id',
            'maintenance_request_id' => 'nullable|exists:maintenance_requests,id',
            'repair_cost' => 'required|numeric|min:0',
            'currency_id' => 'nullable|exists:currencies,id',
            'description' => 'nullable|string|max:1000',
            'repair_date' => 'nullable|date',
            'repair_provider' => 'nullable|string|max:255',
            'status' => 'nullable|in:draft,pending,paid,rejected',
            'notes' => 'nullable|string|max:1000',
            'bills' => 'nullable|array',
            'bills.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $attachedBills = [];
            
            // Handle file uploads
            if ($request->hasFile('bills')) {
                foreach ($request->file('bills') as $file) {
                    $filename = time() . '_' . $file->getClientOriginalName();
                    $path = $file->storeAs('maintenance_bills', $filename, 'public');
                    $attachedBills[] = $path;
                }
            }

            // Get default currency if currency_id not provided
            $currencyId = $request->currency_id;
            if (!$currencyId) {
                $defaultCurrency = Currency::where('is_default', true)->first();
                if (!$defaultCurrency) {
                    // Fallback to first currency or MVR
                    $defaultCurrency = Currency::where('code', 'MVR')->first() ?? Currency::first();
                }
                $currencyId = $defaultCurrency ? $defaultCurrency->id : null;
            }

            $maintenanceCost = MaintenanceCost::create([
                'rental_unit_asset_id' => $request->rental_unit_asset_id,
                'maintenance_request_id' => $request->maintenance_request_id,
                'repair_cost' => $request->repair_cost,
                'currency_id' => $currencyId,
                'description' => $request->description,
                'bill_file_paths' => implode(',', $attachedBills),
                'repair_date' => $request->repair_date,
                'repair_provider' => $request->repair_provider,
                'status' => 'draft', // Set as draft initially - only visible after Done button
                'notes' => $request->notes,
            ]);

            $maintenanceCost->load(['rentalUnitAsset.asset', 'rentalUnitAsset.rentalUnit.property', 'currency']);

            return response()->json([
                'success' => true,
                'message' => 'Maintenance cost created successfully',
                'maintenance_cost' => $maintenanceCost
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create maintenance cost',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified maintenance cost
     */
    public function show(MaintenanceCost $maintenanceCost): JsonResponse
    {
        try {
            $maintenanceCost->load(['rentalUnitAsset.asset', 'rentalUnitAsset.rentalUnit.property', 'currency']);

            return response()->json([
                'success' => true,
                'maintenance_cost' => $maintenanceCost
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch maintenance cost',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified maintenance cost
     */
    public function update(Request $request, MaintenanceCost $maintenanceCost): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'maintenance_request_id' => 'nullable|exists:maintenance_requests,id',
            'repair_cost' => 'sometimes|numeric|min:0',
            'currency_id' => 'nullable|exists:currencies,id',
            'description' => 'nullable|string|max:1000',
            'repair_date' => 'nullable|date',
            'repair_provider' => 'nullable|string|max:255',
            'status' => 'sometimes|in:draft,pending,paid,rejected',
            'notes' => 'nullable|string|max:1000',
            'bills' => 'nullable|array',
            'bills.*' => 'file|mimes:pdf,jpg,jpeg,png|max:10240',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            // Check if request is JSON or FormData
            $isJson = $request->isJson() || $request->header('Content-Type') === 'application/json';
            
            if ($isJson) {
                // Handle JSON request
                $updateData = $request->only([
                    'maintenance_request_id', 'repair_cost', 'currency_id', 'description', 'repair_date', 
                    'repair_provider', 'status', 'notes'
                ]);
                
                Log::info('🔍 DEBUG: JSON request processing', [
                    'update_data' => $updateData,
                    'is_json' => true
                ]);
            } else {
                // Handle FormData request using $_POST directly
                $updateData = [];
                
                // Get maintenance_request_id
                $maintenanceRequestId = $_POST['maintenance_request_id'] ?? null;
                if ($maintenanceRequestId !== null && $maintenanceRequestId !== '') {
                    $updateData['maintenance_request_id'] = $maintenanceRequestId;
                }
                
                // Get repair_cost
                $repairCost = $_POST['repair_cost'] ?? null;
                if ($repairCost !== null && $repairCost !== '') {
                    $updateData['repair_cost'] = $repairCost;
                }
                
                // Get currency_id
                $currencyId = $_POST['currency_id'] ?? null;
                if ($currencyId !== null && $currencyId !== '') {
                    $updateData['currency_id'] = $currencyId;
                }
                
                // Get description
                $description = $_POST['description'] ?? null;
                if ($description !== null && $description !== '') {
                    $updateData['description'] = $description;
                }
                
                // Get repair_date
                $repairDate = $_POST['repair_date'] ?? null;
                if ($repairDate !== null && $repairDate !== '') {
                    $updateData['repair_date'] = $repairDate;
                }
                
                // Get repair_provider
                $repairProvider = $_POST['repair_provider'] ?? null;
                if ($repairProvider !== null && $repairProvider !== '') {
                    $updateData['repair_provider'] = $repairProvider;
                }
                
                // Get notes
                $notes = $_POST['notes'] ?? null;
                if ($notes !== null && $notes !== '') {
                    $updateData['notes'] = $notes;
                }
                
                // Get status
                $status = $_POST['status'] ?? null;
                if ($status !== null && $status !== '') {
                    $updateData['status'] = $status;
                }

                Log::info('🔍 DEBUG: FormData processing with $_POST', [
                    'repair_cost' => $repairCost,
                    'currency_id' => $currencyId,
                    'description' => $description,
                    'repair_date' => $repairDate,
                    'repair_provider' => $repairProvider,
                    'notes' => $notes,
                    'status' => $status,
                    'update_data' => $updateData,
                    'raw_post' => $_POST
                ]);
            }

            Log::info('Maintenance Cost Update Request', [
                'id' => $maintenanceCost->id,
                'update_data' => $updateData
            ]);
            
            // Always set status to draft when updating (unless explicitly provided)
            if (!isset($updateData['status']) || $updateData['status'] === null || $updateData['status'] === '') {
                $updateData['status'] = 'draft';
            }

            Log::info('Final update data', ['update_data' => $updateData]);

            // Handle new file uploads (only for FormData requests)
            if (!$isJson && $request->hasFile('bills')) {
                $existingBills = $maintenanceCost->bill_file_paths ? explode(',', $maintenanceCost->bill_file_paths) : [];
                
                foreach ($request->file('bills') as $file) {
                    $filename = time() . '_' . $file->getClientOriginalName();
                    $path = $file->storeAs('maintenance_bills', $filename, 'public');
                    $existingBills[] = $path;
                }
                
                $updateData['bill_file_paths'] = implode(',', $existingBills);
            }

            $maintenanceCost->update($updateData);
            $maintenanceCost->load(['rentalUnitAsset.asset', 'rentalUnitAsset.rentalUnit.property', 'currency']);

            Log::info('Maintenance Cost Updated Successfully', [
                'id' => $maintenanceCost->id,
                'updated_data' => $maintenanceCost->toArray()
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Maintenance cost updated successfully',
                'maintenance_cost' => $maintenanceCost
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update maintenance cost',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified maintenance cost
     */
    public function destroy(MaintenanceCost $maintenanceCost): JsonResponse
    {
        try {
            // Delete attached files
            if ($maintenanceCost->bill_file_paths) {
                $billPaths = explode(',', $maintenanceCost->bill_file_paths);
                foreach ($billPaths as $bill) {
                    Storage::disk('public')->delete(trim($bill));
                }
            }

            $maintenanceCost->delete();

            return response()->json([
                'success' => true,
                'message' => 'Maintenance cost deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete maintenance cost',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get maintenance costs for a specific rental unit asset
     */
    public function getByRentalUnitAsset($rentalUnitAssetId): JsonResponse
    {
        try {
            $maintenanceCosts = MaintenanceCost::with(['rentalUnitAsset.asset', 'rentalUnitAsset.rentalUnit.property', 'currency'])
                ->where('rental_unit_asset_id', $rentalUnitAssetId)
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'maintenance_costs' => $maintenanceCosts
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch maintenance costs',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
