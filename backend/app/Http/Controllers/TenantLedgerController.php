<?php

namespace App\Http\Controllers;

use App\Models\TenantLedger;
use App\Models\Tenant;
use App\Models\PaymentType;
use App\Models\RentInvoice;
use App\Models\RentalUnit;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TenantLedgerController extends Controller
{
    /**
     * Display a listing of tenant ledger entries.
     */
    public function index(Request $request): JsonResponse
    {
        $query = TenantLedger::with(['tenant', 'paymentType'])
            ->orderByTransactionDate('desc');

        // Filter by tenant
        if ($request->has('tenant_id')) {
            $query->forTenant($request->tenant_id);
        }

        // Filter by payment type
        if ($request->has('payment_type_id')) {
            $query->byPaymentType($request->payment_type_id);
        }

        // Filter by transaction type
        if ($request->has('transaction_type')) {
            if ($request->transaction_type === 'debit') {
                $query->debitTransactions();
            } elseif ($request->transaction_type === 'credit') {
                $query->creditTransactions();
            }
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->byDateRange($request->start_date, $request->end_date);
        }

        // Filter by balance status
        if ($request->has('balance_status')) {
            if ($request->balance_status === 'positive') {
                $query->withPositiveBalance();
            } elseif ($request->balance_status === 'negative') {
                $query->withNegativeBalance();
            }
        }

        // Search by description or reference number
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('reference_no', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 15);
        
        // Eager load rental unit and property relationships upfront to avoid N+1 queries
        $query->with(['rentalUnit.property']);
        
        // Also eager load invoices that might be referenced
        $ledgerEntries = $query->paginate($perPage);
        
        // Collect all reference numbers and rental unit IDs for batch loading
        $referenceNos = $ledgerEntries->getCollection()
            ->pluck('reference_no')
            ->filter()
            ->unique()
            ->values()
            ->toArray();
        
        $rentalUnitIds = $ledgerEntries->getCollection()
            ->pluck('rental_unit_id')
            ->filter()
            ->unique()
            ->values()
            ->toArray();
        
        $tenantIds = $ledgerEntries->getCollection()
            ->pluck('tenant_id')
            ->unique()
            ->values()
            ->toArray();
        
        // Batch load invoices by reference number
        $invoicesByReference = [];
        if (!empty($referenceNos)) {
            $invoices = RentInvoice::whereIn('invoice_number', $referenceNos)
                ->with('rentalUnit.property')
                ->get();
            foreach ($invoices as $invoice) {
                $invoicesByReference[$invoice->invoice_number] = $invoice;
            }
        }
        
        // Batch load rental units by ID (for direct references)
        $rentalUnitsById = [];
        if (!empty($rentalUnitIds)) {
            $rentalUnits = RentalUnit::whereIn('id', $rentalUnitIds)
                ->with('property')
                ->get();
            foreach ($rentalUnits as $unit) {
                $rentalUnitsById[$unit->id] = $unit;
            }
        }
        
        // Batch load first occupied rental unit per tenant (for fallback)
        $occupiedUnitsByTenant = [];
        if (!empty($tenantIds)) {
            $occupiedUnits = RentalUnit::whereIn('tenant_id', $tenantIds)
                ->where('status', 'occupied')
                ->with('property')
                ->get()
                ->groupBy('tenant_id');
            foreach ($occupiedUnits as $tenantId => $units) {
                $occupiedUnitsByTenant[$tenantId] = $units->first();
            }
        }
        
        // Add rental unit information to each entry using pre-loaded data
        $ledgerEntries->getCollection()->transform(function ($entry) use ($rentalUnitsById, $invoicesByReference, $occupiedUnitsByTenant) {
            $rentalUnit = null;
            
            // First, try to use the direct rental_unit_id relationship (pre-loaded)
            if ($entry->rental_unit_id && isset($rentalUnitsById[$entry->rental_unit_id])) {
                $rentalUnit = $rentalUnitsById[$entry->rental_unit_id];
            }
            
            // Fallback: try to find the rental unit through the invoice reference (pre-loaded)
            if (!$rentalUnit && $entry->reference_no && isset($invoicesByReference[$entry->reference_no])) {
                $invoice = $invoicesByReference[$entry->reference_no];
                if ($invoice->rentalUnit) {
                    $rentalUnit = $invoice->rentalUnit;
                }
            }
            
            // Final fallback: Get the first occupied rental unit for this tenant (pre-loaded)
            if (!$rentalUnit && isset($occupiedUnitsByTenant[$entry->tenant_id])) {
                $rentalUnit = $occupiedUnitsByTenant[$entry->tenant_id];
            }
            
            if ($rentalUnit) {
                $entry->rental_unit = [
                    'unit_number' => $rentalUnit->unit_number,
                    'property' => [
                        'name' => $rentalUnit->property->name ?? null
                    ]
                ];
            } else {
                $entry->rental_unit = null;
            }
            
            return $entry;
        });

        return response()->json([
            'success' => true,
            'data' => $ledgerEntries,
            'message' => 'Tenant ledger entries retrieved successfully'
        ]);
    }

    /**
     * Store a newly created ledger entry.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Debug: Log the incoming request data
            Log::info('TenantLedger Store Request:', $request->all());
            Log::info('Rental Unit ID in request:', ['rental_unit_id' => $request->get('rental_unit_id')]);
            
            $validated = $request->validate(TenantLedger::validationRules());
            
            // Debug: Log the validated data
            Log::info('TenantLedger Validated Data:', $validated);
            Log::info('Rental Unit ID in validated:', ['rental_unit_id' => $validated['rental_unit_id'] ?? 'NOT SET']);

            // Additional validation: ensure either debit or credit amount is provided
            $debitAmount = $validated['debit_amount'] ?? 0;
            $creditAmount = $validated['credit_amount'] ?? 0;
            
            if ($debitAmount == 0 && $creditAmount == 0) {
                throw ValidationException::withMessages([
                    'amount' => ['Either debit amount or credit amount must be greater than 0.']
                ]);
            }

            // Additional validation: ensure only one amount is provided
            if ($debitAmount > 0 && $creditAmount > 0) {
                throw ValidationException::withMessages([
                    'amount' => ['Cannot have both debit and credit amounts in the same transaction.']
                ]);
            }

            $ledgerEntry = TenantLedger::create($validated);

            // Check if this is a rent payment and update invoice status
            Log::info("About to call updateInvoiceStatusIfNeeded for ledger entry {$ledgerEntry->ledger_id}");
            try {
                $this->updateInvoiceStatusIfNeeded($ledgerEntry);
                Log::info("updateInvoiceStatusIfNeeded completed successfully for ledger entry {$ledgerEntry->ledger_id}");
            } catch (\Exception $e) {
                Log::error("Exception in updateInvoiceStatusIfNeeded for ledger entry {$ledgerEntry->ledger_id}: " . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'data' => $ledgerEntry->load(['tenant', 'paymentType']),
                'message' => 'Ledger entry created successfully'
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to create ledger entry',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified ledger entry.
     */
    public function show(TenantLedger $tenantLedger): JsonResponse
    {
        $tenantLedger->load(['tenant', 'paymentType']);

        return response()->json([
            'success' => true,
            'data' => $tenantLedger,
            'message' => 'Ledger entry retrieved successfully'
        ]);
    }

    /**
     * Update the specified ledger entry.
     */
    public function update(Request $request, TenantLedger $tenantLedger): JsonResponse
    {
        try {
            $validated = $request->validate(TenantLedger::validationRules());

            // Additional validation: ensure either debit or credit amount is provided
            $debitAmount = $validated['debit_amount'] ?? 0;
            $creditAmount = $validated['credit_amount'] ?? 0;
            
            if ($debitAmount == 0 && $creditAmount == 0) {
                throw ValidationException::withMessages([
                    'amount' => ['Either debit amount or credit amount must be greater than 0.']
                ]);
            }

            // Additional validation: ensure only one amount is provided
            if ($debitAmount > 0 && $creditAmount > 0) {
                throw ValidationException::withMessages([
                    'amount' => ['Cannot have both debit and credit amounts in the same transaction.']
                ]);
            }

            $tenantLedger->update($validated);

            return response()->json([
                'success' => true,
                'data' => $tenantLedger->load(['tenant', 'paymentType']),
                'message' => 'Ledger entry updated successfully'
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update ledger entry',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified ledger entry.
     */
    public function destroy(TenantLedger $tenantLedger): JsonResponse
    {
        try {
            $tenantId = $tenantLedger->tenant_id;
            $transactionDate = $tenantLedger->transaction_date;

            $tenantLedger->delete();

            // Recalculate balances for subsequent entries
            $this->recalculateBalances($tenantId, $transactionDate);

            return response()->json([
                'success' => true,
                'message' => 'Ledger entry deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete ledger entry',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get tenant balance summary.
     */
    public function getTenantBalance(Request $request, $tenantId): JsonResponse
    {
        try {
            $tenant = Tenant::findOrFail($tenantId);
            
            $currentBalance = TenantLedger::getTenantBalance($tenantId);
            $totalDebits = TenantLedger::getTenantTotalDebits($tenantId);
            $totalCredits = TenantLedger::getTenantTotalCredits($tenantId);

            return response()->json([
                'success' => true,
                'data' => [
                    'tenant' => $tenant,
                    'current_balance' => $currentBalance,
                    'total_debits' => $totalDebits,
                    'total_credits' => $totalCredits,
                    'balance_status' => $currentBalance > 0 ? 'outstanding' : ($currentBalance < 0 ? 'credit' : 'balanced')
                ],
                'message' => 'Tenant balance retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve tenant balance',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get tenant ledger summary by date range.
     */
    public function getTenantSummary(Request $request, $tenantId): JsonResponse
    {
        try {
            $startDate = $request->get('start_date', Carbon::now()->startOfMonth());
            $endDate = $request->get('end_date', Carbon::now()->endOfMonth());

            $tenant = Tenant::findOrFail($tenantId);

            $summary = TenantLedger::forTenant($tenantId)
                ->byDateRange($startDate, $endDate)
                ->selectRaw('
                    payment_type_id,
                    SUM(debit_amount) as total_debits,
                    SUM(credit_amount) as total_credits,
                    COUNT(*) as transaction_count
                ')
                ->with('paymentType')
                ->groupBy('payment_type_id')
                ->get();

            $totalDebits = $summary->sum('total_debits');
            $totalCredits = $summary->sum('total_credits');
            $netAmount = $totalDebits - $totalCredits;

            return response()->json([
                'success' => true,
                'data' => [
                    'tenant' => $tenant,
                    'period' => [
                        'start_date' => $startDate,
                        'end_date' => $endDate
                    ],
                    'summary_by_payment_type' => $summary,
                    'totals' => [
                        'total_debits' => $totalDebits,
                        'total_credits' => $totalCredits,
                        'net_amount' => $netAmount
                    ]
                ],
                'message' => 'Tenant summary retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve tenant summary',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all tenants with their current balances.
     */
    public function getAllTenantBalances(Request $request): JsonResponse
    {
        try {
            $query = Tenant::query();

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->status);
            }

            $tenants = $query->get();
            
            // Batch load all balances efficiently instead of N queries
            $tenantIds = $tenants->pluck('id')->toArray();
            
            // Get the latest balance for each tenant using a more compatible approach
            $balancesByTenant = [];
            if (!empty($tenantIds)) {
                // Use a subquery approach that works across MySQL versions
                $latestEntries = DB::table('tenant_ledgers as tl1')
                    ->select('tl1.tenant_id', 'tl1.balance')
                    ->whereIn('tl1.tenant_id', $tenantIds)
                    ->whereRaw('tl1.ledger_id = (
                        SELECT tl2.ledger_id 
                        FROM tenant_ledgers tl2 
                        WHERE tl2.tenant_id = tl1.tenant_id 
                        ORDER BY tl2.transaction_date DESC, tl2.ledger_id DESC 
                        LIMIT 1
                    )')
                    ->get();
                
                foreach ($latestEntries as $entry) {
                    $balancesByTenant[$entry->tenant_id] = (float) $entry->balance;
                }
            }
            
            $tenants = $tenants->map(function($tenant) use ($balancesByTenant) {
                $currentBalance = $balancesByTenant[$tenant->id] ?? 0.00;
                return [
                    'id' => $tenant->id,
                    'name' => $tenant->full_name,
                    'email' => $tenant->email,
                    'phone' => $tenant->phone,
                    'status' => $tenant->status,
                    'current_balance' => $currentBalance,
                    'balance_status' => $currentBalance > 0 ? 'outstanding' : ($currentBalance < 0 ? 'credit' : 'balanced')
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $tenants,
                'message' => 'All tenant balances retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to retrieve tenant balances',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update invoice status if this ledger entry represents a rent payment
     */
    private function updateInvoiceStatusIfNeeded($ledgerEntry)
    {
        try {
            Log::info("updateInvoiceStatusIfNeeded called for ledger entry {$ledgerEntry->ledger_id}");
            
            // Only process credit entries (payments received)
            if ($ledgerEntry->credit_amount <= 0) {
                Log::info("Skipping - no credit amount for ledger entry {$ledgerEntry->ledger_id}");
                return;
            }

            // Check if this is a rent-related payment type
            $paymentType = $ledgerEntry->paymentType;
            if (!$paymentType) {
                Log::info("Skipping - no payment type for ledger entry {$ledgerEntry->ledger_id}");
                return;
            }

            $paymentTypeName = strtolower($paymentType->name);
            $isRentPayment = str_contains($paymentTypeName, 'rent') || 
                           str_contains($paymentTypeName, 'payment') ||
                           str_contains($paymentTypeName, 'advance');
            
            $isMaintenancePayment = str_contains($paymentTypeName, 'maintenance') ||
                                  str_contains($paymentTypeName, 'repair') ||
                                  str_contains($paymentTypeName, 'fix') ||
                                  str_contains($paymentTypeName, 'service');

            Log::info("Payment type check for ledger entry {$ledgerEntry->ledger_id}: {$paymentTypeName}, isRentPayment: " . ($isRentPayment ? 'true' : 'false') . ", isMaintenancePayment: " . ($isMaintenancePayment ? 'true' : 'false'));

            if (!$isRentPayment && !$isMaintenancePayment) {
                Log::info("Skipping - not a rent or maintenance payment for ledger entry {$ledgerEntry->ledger_id}");
                return;
            }

            // Try to find the invoice by reference number
            if ($ledgerEntry->reference_no) {
                Log::info("Looking for invoice with reference: {$ledgerEntry->reference_no}, tenant_id: {$ledgerEntry->tenant_id}");
                
                $invoice = null;
                $invoiceType = null;
                
                // First try to find a rent invoice
                if ($isRentPayment) {
                    $invoice = RentInvoice::where('invoice_number', $ledgerEntry->reference_no)
                        ->where('tenant_id', $ledgerEntry->tenant_id)
                        ->where('status', '!=', 'paid')
                        ->first();
                    if ($invoice) {
                        $invoiceType = 'rent';
                    }
                }
                
                // If no rent invoice found and this is a maintenance payment, try maintenance invoice
                if (!$invoice && $isMaintenancePayment) {
                    $invoice = \App\Models\MaintenanceInvoice::where('invoice_number', $ledgerEntry->reference_no)
                        ->where('tenant_id', $ledgerEntry->tenant_id)
                        ->where('status', '!=', 'paid')
                        ->first();
                    if ($invoice) {
                        $invoiceType = 'maintenance';
                    }
                }

                if ($invoice) {
                    Log::info("Found {$invoiceType} invoice: {$invoice->invoice_number}, amount: {$invoice->total_amount}, status: {$invoice->status}");
                    
                    // Check if the payment amount matches the invoice amount
                    if (abs($invoice->total_amount - $ledgerEntry->credit_amount) < 0.01) {
                        // Mark the invoice as paid
                        $paymentDetails = [
                            'payment_date' => $ledgerEntry->transaction_date->format('Y-m-d'),
                            'payment_method' => $ledgerEntry->payment_method,
                            'payment_reference' => $ledgerEntry->transfer_reference_no,
                            'notes' => $ledgerEntry->remarks,
                            'total_amount' => $ledgerEntry->credit_amount,
                        ];

                        $invoice->markAsPaid($paymentDetails, true); // Skip ledger entry creation since we already created it
                        
                        Log::info("{$invoiceType} invoice {$invoice->invoice_number} marked as paid via ledger entry {$ledgerEntry->ledger_id}");
                    } else {
                        Log::warning("Payment amount mismatch for {$invoiceType} invoice {$invoice->invoice_number}. Invoice: {$invoice->total_amount}, Payment: {$ledgerEntry->credit_amount}");
                    }
                } else {
                    Log::info("No unpaid invoice found with reference number: {$ledgerEntry->reference_no}");
                }
            } else {
                Log::info("No reference number for ledger entry {$ledgerEntry->ledger_id}");
            }

        } catch (\Exception $e) {
            Log::error("Failed to update invoice status for ledger entry {$ledgerEntry->ledger_id}: " . $e->getMessage());
        }
    }

    /**
     * Recalculate balances for a tenant after a transaction is modified or deleted.
     */
    private function recalculateBalances($tenantId, $fromDate = null)
    {
        $query = TenantLedger::forTenant($tenantId)->orderByTransactionDate('asc');
        
        if ($fromDate) {
            $query->where('transaction_date', '>=', $fromDate);
        }

        $entries = $query->get();
        $runningBalance = 0;

        // Get the balance before the fromDate if it exists
        if ($fromDate) {
            $previousEntry = TenantLedger::forTenant($tenantId)
                ->where('transaction_date', '<', $fromDate)
                ->orderByTransactionDate('desc')
                ->first();
            
            if ($previousEntry) {
                $runningBalance = $previousEntry->balance;
            }
        }

        foreach ($entries as $entry) {
            if ($entry->debit_amount > 0) {
                $runningBalance += $entry->debit_amount;
            } else {
                $runningBalance -= $entry->credit_amount;
            }

            $entry->update(['balance' => $runningBalance]);
        }
    }
}