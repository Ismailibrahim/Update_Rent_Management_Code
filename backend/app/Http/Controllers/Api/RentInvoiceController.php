<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RentInvoice;
use App\Models\Tenant;
use App\Models\RentalUnit;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class RentInvoiceController extends Controller
{
    /**
     * Display a listing of rent invoices
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = RentInvoice::with(['tenant', 'property', 'rentalUnit']);

            // Status filter
            if ($request->has('status') && $request->status) {
                $statuses = explode(',', $request->status);
                $query->whereIn('status', $statuses);
            }

            // Month filter
            if ($request->has('month') && $request->month) {
                $query->whereMonth('invoice_date', $request->month);
            }

            // Year filter
            if ($request->has('year') && $request->year) {
                $query->whereYear('invoice_date', $request->year);
            }

            // Tenant filter
            if ($request->has('tenant_id') && $request->tenant_id) {
                $query->where('tenant_id', $request->tenant_id);
            }

            // Rental unit filter
            if ($request->has('rental_unit_id') && $request->rental_unit_id) {
                $query->where('rental_unit_id', $request->rental_unit_id);
            }

            // Use pagination instead of loading all records
            $perPage = $request->get('per_page', 15);
            $page = $request->get('page', 1);
            
            $invoices = $query->orderBy('invoice_date', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'invoices' => $invoices->items(),
                'pagination' => [
                    'current_page' => $invoices->currentPage(),
                    'last_page' => $invoices->lastPage(),
                    'per_page' => $invoices->perPage(),
                    'total' => $invoices->total(),
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch rent invoices',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created rent invoice
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'tenant_id' => 'required|exists:tenants,id',
            'rental_unit_id' => 'required|exists:rental_units,id',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after:invoice_date',
            'rent_amount' => 'required|numeric|min:0',
            'late_fee' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Get rental unit and property info
            $rentalUnit = RentalUnit::with('property')->find($request->rental_unit_id);
            $tenant = Tenant::find($request->tenant_id);

            if (!$rentalUnit || !$tenant) {
                return response()->json([
                    'message' => 'Rental unit or tenant not found'
                ], 404);
            }

            // Generate invoice number
            $shortDate = date('ymd'); // Format: YYMMDD (e.g., 251012 for 2025-10-12)
            $invoiceNumber = 'INV-' . $shortDate . '-' . $rentalUnit->id;

            // Calculate total amount
            $rentAmount = $request->rent_amount;
            $lateFee = $request->late_fee ?? 0;
            $totalAmount = $rentAmount + $lateFee;

            $invoice = RentInvoice::create([
                'invoice_number' => $invoiceNumber,
                'tenant_id' => $request->tenant_id,
                'property_id' => $rentalUnit->property_id,
                'rental_unit_id' => $request->rental_unit_id,
                'invoice_date' => $request->invoice_date,
                'due_date' => $request->due_date,
                'rent_amount' => $rentAmount,
                'late_fee' => $lateFee,
                'total_amount' => $totalAmount,
                'currency' => $rentalUnit->financial['currency'] ?? 'MVR',
                'status' => 'pending',
                'notes' => $request->notes,
            ]);

            $invoice->load(['tenant', 'property', 'rentalUnit']);

            DB::commit();

            return response()->json([
                'message' => 'Rent invoice created successfully',
                'invoice' => $invoice
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create rent invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified rent invoice
     */
    public function show(RentInvoice $rentInvoice): JsonResponse
    {
        try {
            $rentInvoice->load(['tenant', 'property', 'rentalUnit']);

            return response()->json([
                'invoice' => $rentInvoice
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch rent invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified rent invoice
     */
    public function update(Request $request, RentInvoice $rentInvoice): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'status' => 'sometimes|in:pending,paid,overdue,cancelled',
            'paid_date' => 'nullable|date',
            'payment_details' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $updateData = $request->only(['status', 'paid_date', 'payment_details', 'notes']);

            // If marking as paid, set paid_date if not provided
            if ($request->status === 'paid' && !$request->paid_date) {
                $updateData['paid_date'] = now()->toDateString();
            }

            $rentInvoice->update($updateData);
            $rentInvoice->load(['tenant', 'property', 'rentalUnit']);

            return response()->json([
                'message' => 'Rent invoice updated successfully',
                'invoice' => $rentInvoice
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to update rent invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified rent invoice
     */
    public function destroy(RentInvoice $rentInvoice): JsonResponse
    {
        try {
            $rentInvoice->delete();

            return response()->json([
                'message' => 'Rent invoice deleted successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to delete rent invoice',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate monthly rent invoices for all occupied rental units
     */
    public function generateMonthlyInvoices(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020',
            'due_date_offset' => 'nullable|integer|min:1|max:31', // Days after invoice date
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            DB::beginTransaction();

            $month = $request->month;
            $year = $request->year;
            $dueDateOffset = $request->due_date_offset ?? 7; // Default 7 days

            // Get all occupied rental units
            $occupiedUnits = RentalUnit::with(['tenant', 'property'])
                ->where('status', 'occupied')
                ->whereNotNull('tenant_id')
                ->get();

            $generatedInvoices = [];
            $errors = [];
            $skippedTenants = [];

            foreach ($occupiedUnits as $unit) {
                try {
                    // Check if tenant has an active lease for the selected month/year
                    $tenant = $unit->tenant;
                    $selectedMonthStart = Carbon::create($year, $month, 1);
                    $selectedMonthEnd = Carbon::create($year, $month, 1)->endOfMonth();
                    
                    // Skip if tenant doesn't have lease dates set
                    if (!$tenant->lease_start_date || !$tenant->lease_end_date) {
                        $skippedTenants[] = [
                            'tenant_name' => $tenant->full_name,
                            'unit_number' => $unit->unit_number,
                            'reason' => 'No lease dates set'
                        ];
                        continue;
                    }
                    
                    // Skip if lease starts after the selected month
                    if ($tenant->lease_start_date > $selectedMonthEnd) {
                        $skippedTenants[] = [
                            'tenant_name' => $tenant->full_name,
                            'unit_number' => $unit->unit_number,
                            'reason' => 'Lease starts after selected month',
                            'lease_start_date' => $tenant->lease_start_date->format('Y-m-d')
                        ];
                        continue;
                    }
                    
                    // Skip if lease ends before the selected month
                    if ($tenant->lease_end_date < $selectedMonthStart) {
                        $skippedTenants[] = [
                            'tenant_name' => $tenant->full_name,
                            'unit_number' => $unit->unit_number,
                            'reason' => 'Lease ended before selected month',
                            'lease_end_date' => $tenant->lease_end_date->format('Y-m-d')
                        ];
                        continue;
                    }

                    // Check if invoice already exists for this month/year
                    $existingInvoice = RentInvoice::where('tenant_id', $unit->tenant_id)
                        ->where('rental_unit_id', $unit->id)
                        ->whereYear('invoice_date', $year)
                        ->whereMonth('invoice_date', $month)
                        ->first();

                    if ($existingInvoice) {
                        $errors[] = "Invoice already exists for {$unit->tenant->full_name} - Unit {$unit->unit_number}";
                        continue;
                    }

                    // Generate unique invoice number
                    $shortDate = date('ymd', strtotime("$year-$month-01")); // Format: YYMMDD
                    $invoiceNumber = 'INV-' . $shortDate . '-' . $unit->id;
                    $invoiceDate = Carbon::create($year, $month, 1)->toDateString();
                    $dueDate = Carbon::create($year, $month, 1)->addDays($dueDateOffset)->toDateString();
                    $rentAmount = $unit->rent_amount ?? 0;
                    
                    // Debug logging
                    Log::info('Invoice Generation Debug', [
                        'unit_id' => $unit->id,
                        'unit_number' => $unit->unit_number,
                        'financial_data' => $unit->financial,
                        'rent_amount_attribute' => $unit->rent_amount,
                        'rent_amount' => $rentAmount,
                        'tenant_name' => $tenant->full_name
                    ]);

                    $invoice = RentInvoice::create([
                        'invoice_number' => $invoiceNumber,
                        'tenant_id' => $unit->tenant_id,
                        'property_id' => $unit->property_id,
                        'rental_unit_id' => $unit->id,
                        'invoice_date' => $invoiceDate,
                        'due_date' => $dueDate,
                        'rent_amount' => $rentAmount,
                        'late_fee' => 0,
                        'total_amount' => $rentAmount,
                        'currency' => $unit->currency ?? 'MVR',
                        'status' => 'pending',
                        'notes' => "Monthly rent for {$unit->property->name} - Unit {$unit->unit_number}",
                    ]);

                    $invoice->load(['tenant', 'property', 'rentalUnit']);
                    $generatedInvoices[] = $invoice;

                } catch (\Exception $e) {
                    $errors[] = "Failed to generate invoice for Unit {$unit->unit_number}: " . $e->getMessage();
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Monthly rent invoices generated successfully',
                'generated_count' => count($generatedInvoices),
                'invoices' => $generatedInvoices,
                'skipped_tenants' => $skippedTenants,
                'skipped_count' => count($skippedTenants),
                'errors' => $errors
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to generate monthly rent invoices',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark invoice as paid
     */
    public function markAsPaid(Request $request, RentInvoice $rentInvoice): JsonResponse
    {
        // Debug: Log the incoming request data
        Log::info('Mark as Paid Request Data:', [
            'invoice_id' => $rentInvoice->id,
            'request_data' => $request->all(),
            'files' => $request->allFiles(),
            'file_keys' => array_keys($request->allFiles()),
            'has_files' => !empty($request->allFiles()),
        ]);

        // Get all file keys from the request
        $fileKeys = array_keys($request->allFiles());
        
        $validator = Validator::make($request->all(), [
            'payment_type' => 'required|string',
            'payment_mode' => 'required|string',
            'total_amount' => 'required|numeric|min:0',
            'reference_number' => 'nullable|string',
            'notes' => 'nullable|string',
            'payment_date' => 'nullable|date',
        ]);
        
        // Add validation rules for each file (optional)
        foreach ($fileKeys as $key) {
            $validator->addRules([$key => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120']);
        }
        
        // Remove the requirement for at least one file
        // Payment slips are now optional

        if ($validator->fails()) {
            Log::error('Validation failed for mark as paid:', [
                'invoice_id' => $rentInvoice->id,
                'errors' => $validator->errors()->toArray(),
                'request_data' => $request->all(),
            ]);
            
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 400);
        }

        try {
            $paymentDetails = [
                'payment_type' => $request->payment_type,
                'payment_mode' => $request->payment_mode,
                'total_amount' => $request->total_amount,
                'reference_number' => $request->reference_number,
                'notes' => $request->notes,
                'payment_date' => $request->payment_date ?? now()->toDateString(),
            ];

            // Handle multiple file uploads (optional)
            $paymentSlipPaths = [];
            $allFiles = $request->allFiles();
            
            if (!empty($allFiles)) {
                foreach ($allFiles as $key => $file) {
                    $fileName = time() . '_' . uniqid() . '_' . $file->getClientOriginalName();
                    $filePath = $file->storeAs('payment-slips', $fileName, 'public');
                    $paymentSlipPaths[] = $filePath;
                }
                
                $paymentDetails['payment_slip_paths'] = $paymentSlipPaths;
            }

            $rentInvoice->markAsPaid($paymentDetails);
            
            if ($request->notes) {
                $rentInvoice->update(['notes' => $request->notes]);
            }

            $rentInvoice->load(['tenant', 'property', 'rentalUnit']);

            return response()->json([
                'message' => 'Invoice marked as paid successfully',
                'invoice' => $rentInvoice
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to mark invoice as paid',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get payment slip files
     */
    public function getPaymentSlip(RentInvoice $rentInvoice)
    {
        if (!$rentInvoice->payment_slip_paths || empty($rentInvoice->payment_slip_paths)) {
            return response()->json([
                'message' => 'No payment slips found for this invoice'
            ], 404);
        }

        // Return the first payment slip file
        $firstFilePath = $rentInvoice->payment_slip_paths[0];
        $filePath = storage_path('app/public/' . $firstFilePath);
        
        if (!file_exists($filePath)) {
            return response()->json([
                'message' => 'Payment slip file not found'
            ], 404);
        }

        return response()->file($filePath);
    }

    /**
     * Get all payment slip files for an invoice
     */
    public function getAllPaymentSlips(RentInvoice $rentInvoice)
    {
        if (!$rentInvoice->payment_slip_paths || empty($rentInvoice->payment_slip_paths)) {
            return response()->json([
                'message' => 'No payment slips found for this invoice'
            ], 404);
        }

        $files = [];
        foreach ($rentInvoice->payment_slip_paths as $index => $filePath) {
            $fullPath = storage_path('app/public/' . $filePath);
            if (file_exists($fullPath)) {
                $files[] = [
                    'index' => $index,
                    'filename' => basename($filePath),
                    'url' => url('/api/rent-invoices/' . $rentInvoice->id . '/payment-slip/' . $index)
                ];
            }
        }

        return response()->json([
            'invoice_id' => $rentInvoice->id,
            'invoice_number' => $rentInvoice->invoice_number,
            'files' => $files
        ]);
    }

    /**
     * Get specific payment slip file by index
     */
    public function getPaymentSlipByIndex(RentInvoice $rentInvoice, $index)
    {
        if (!$rentInvoice->payment_slip_paths || empty($rentInvoice->payment_slip_paths)) {
            return response()->json([
                'message' => 'No payment slips found for this invoice'
            ], 404);
        }

        $fileIndex = (int) $index;
        if ($fileIndex < 0 || $fileIndex >= count($rentInvoice->payment_slip_paths)) {
            return response()->json([
                'message' => 'Invalid file index'
            ], 404);
        }

        $filePath = $rentInvoice->payment_slip_paths[$fileIndex];
        $fullPath = storage_path('app/public/' . $filePath);
        
        if (!file_exists($fullPath)) {
            return response()->json([
                'message' => 'Payment slip file not found'
            ], 404);
        }

        return response()->file($fullPath);
    }

    /**
     * Get invoice statistics
     */
    public function getStatistics(): JsonResponse
    {
        try {
            $currentMonth = now()->month;
            $currentYear = now()->year;

            $stats = [
                'total_invoices' => RentInvoice::count(),
                'pending_invoices' => RentInvoice::pending()->count(),
                'paid_invoices' => RentInvoice::paid()->count(),
                'overdue_invoices' => RentInvoice::overdue()->count(),
                'current_month_invoices' => RentInvoice::forMonth($currentYear, $currentMonth)->count(),
                'current_month_pending' => RentInvoice::forMonth($currentYear, $currentMonth)->pending()->count(),
                'current_month_paid' => RentInvoice::forMonth($currentYear, $currentMonth)->paid()->count(),
                'total_amount_pending' => RentInvoice::pending()->sum('total_amount'),
                'total_amount_paid' => RentInvoice::paid()->sum('total_amount'),
            ];

            return response()->json([
                'statistics' => $stats
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch invoice statistics',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
