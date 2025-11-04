<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\PaymentRecord;
use App\Models\TenantLedger;
use App\Models\PaymentType;

class RentInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'tenant_id',
        'property_id',
        'rental_unit_id',
        'invoice_date',
        'due_date',
        'rent_amount',
        'late_fee',
        'total_amount',
        'currency',
        'status',
        'paid_date',
        'notes',
        // New separate columns
        'payment_method',
        'payment_reference',
        'payment_bank',
        'payment_account',
        'payment_notes',
        'payment_slip_files',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'paid_date' => 'date',
        'rent_amount' => 'decimal:2',
        'late_fee' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    protected $attributes = [
        'status' => 'pending',
        'currency' => 'MVR',
        'late_fee' => 0,
    ];

    /**
     * Boot method to handle model events
     */
    protected static function boot()
    {
        parent::boot();

        // Automatically create tenant ledger entry when rent invoice is created
        static::created(function ($invoice) {
            $invoice->createTenantLedgerEntry();
        });

        // Update tenant ledger entry when rent invoice is updated
        static::updated(function ($invoice) {
            if ($invoice->wasChanged(['total_amount', 'status'])) {
                $invoice->updateTenantLedgerEntry();
            }
        });

        // Delete tenant ledger entry when rent invoice is deleted
        static::deleted(function ($invoice) {
            $invoice->deleteTenantLedgerEntry();
        });
    }

    // Relationships
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function rentalUnit(): BelongsTo
    {
        return $this->belongsTo(RentalUnit::class);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'overdue');
    }

    public function scopeForMonth($query, $year, $month)
    {
        return $query->whereYear('invoice_date', $year)
                    ->whereMonth('invoice_date', $month);
    }

    // Search scopes for new columns
    public function scopeByPaymentMethod($query, $method)
    {
        return $query->where('payment_method', $method);
    }

    public function scopeByPaymentReference($query, $reference)
    {
        return $query->where('payment_reference', 'like', "%{$reference}%");
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('invoice_number', 'like', "%{$search}%")
              ->orWhere('payment_method', 'like', "%{$search}%")
              ->orWhere('payment_reference', 'like', "%{$search}%")
              ->orWhere('payment_bank', 'like', "%{$search}%");
        });
    }

    // Accessors
    public function getIsOverdueAttribute()
    {
        return $this->status === 'pending' && $this->due_date < now()->toDateString();
    }

    public function getFormattedInvoiceNumberAttribute()
    {
        return 'INV-' . str_pad($this->id, 6, '0', STR_PAD_LEFT);
    }

    // Methods
    public function markAsPaid($paymentDetails = null, $skipLedgerEntry = false)
    {
        $updateData = [
            'status' => 'paid',
            'paid_date' => now()->toDateString(),
            'payment_details' => $paymentDetails,
        ];

        // Add payment slip paths if provided
        if (isset($paymentDetails['payment_slip_paths'])) {
            $updateData['payment_slip_paths'] = $paymentDetails['payment_slip_paths'];
        }

        $this->update($updateData);

        // Skip creating ledger entry if it's already been created by the tenant ledger controller
        if ($skipLedgerEntry) {
            Log::info("Skipping ledger entry creation for invoice {$this->invoice_number} - already created by tenant ledger");
            return;
        }

        // Note: Tenant ledger entry is now created by the frontend/API, not here
        // This prevents duplicate ledger entries

        // Always create a Payment Record entry when invoice is marked paid
        // Load tenant relationship to get tenant details
        $this->load('tenant');

        $tenantFullName = null;
        $tenantPhone = null;
        if ($this->tenant) {
            // Use the new flat column structure
            $tenantFullName = $this->tenant->full_name ?: trim($this->tenant->first_name . ' ' . $this->tenant->last_name) ?: null;
            $tenantPhone = $this->tenant->phone;
        }

        // Provide sensible defaults for historical backfill if details are missing
        $paymentTypeId = $paymentDetails['payment_type'] ?? 1; // assume 1 exists (e.g., Rent)
        $paymentModeId = $paymentDetails['payment_mode'] ?? 1; // assume 1 exists (e.g., Cash)

        PaymentRecord::create([
            'unit_id' => $this->rental_unit_id,
            'amount' => $paymentDetails['total_amount'] ?? $this->total_amount,
            'payment_type_id' => $paymentTypeId,
            'payment_mode_id' => $paymentModeId,
            'paid_date' => $paymentDetails['payment_date'] ?? now()->toDateString(),
            'paid_by' => $tenantFullName,
            'mobile_no' => $tenantPhone,
            'remarks' => $paymentDetails['notes'] ?? "Payment for invoice {$this->invoice_number}",
            'currency_id' => 1, // Default currency ID (assuming 1 is MVR)
            'created_by_id' => 1, // Default admin user ID
            'is_active' => 1,
        ]);
    }

    public function markAsOverdue()
    {
        $this->update(['status' => 'overdue']);
    }

    public function calculateLateFee($dailyLateFee = 10)
    {
        if ($this->is_overdue) {
            $daysOverdue = now()->diffInDays($this->due_date);
            return $daysOverdue * $dailyLateFee;
        }
        return 0;
    }

    /**
     * Create tenant ledger credit entry when payment is made
     */
    public function createPaymentLedgerEntry($paymentDetails = null)
    {
        try {
            // Get or create a "Rent Payment" payment type
            $paymentType = PaymentType::firstOrCreate(
                ['name' => 'Rent Payment'],
                [
                    'code' => 'rent_payment',
                    'description' => 'Payment received for rent',
                    'is_active' => true,
                    'is_recurring' => false,
                    'requires_approval' => false,
                    'settings' => []
                ]
            );

            // Calculate the current balance for the tenant
            $lastBalance = TenantLedger::where('tenant_id', $this->tenant_id)
                ->orderBy('transaction_date', 'desc')
                ->orderBy('ledger_id', 'desc')
                ->first();
            $currentBalance = $lastBalance ? $lastBalance->balance : 0;
            $newBalance = $currentBalance - $this->total_amount; // Subtract from balance (credit)

            TenantLedger::create([
                'tenant_id' => $this->tenant_id,
                'payment_type_id' => $paymentType->id,
                'transaction_date' => $paymentDetails['payment_date'] ?? now()->toDateString(),
                'description' => "Payment for Rent Invoice {$this->invoice_number}",
                'reference_no' => $this->invoice_number . '-PAY',
                'debit_amount' => 0,
                'credit_amount' => $this->total_amount,
                'balance' => $newBalance,
                'payment_method' => $paymentDetails['payment_method'] ?? null,
                'transfer_reference_no' => $paymentDetails['payment_reference'] ?? null,
                'remarks' => $paymentDetails['notes'] ?? "Payment received for invoice {$this->invoice_number}",
                'created_by' => 'System',
            ]);

            Log::info("Created payment ledger entry for rent invoice {$this->invoice_number}");
        } catch (\Exception $e) {
            Log::error("Failed to create payment ledger entry for rent invoice {$this->invoice_number}: " . $e->getMessage());
        }
    }

    /**
     * Create tenant ledger entry for this rent invoice
     */
    public function createTenantLedgerEntry()
    {
        try {
            // Get or create a "Rent" payment type
            $paymentType = PaymentType::firstOrCreate(
                ['name' => 'Rent'],
                [
                    'code' => 'rent',
                    'description' => 'Monthly rent payment',
                    'is_active' => true,
                    'is_recurring' => true,
                    'requires_approval' => false,
                    'settings' => []
                ]
            );

            // Calculate the current balance for the tenant
            $lastBalance = TenantLedger::where('tenant_id', $this->tenant_id)
                ->orderBy('transaction_date', 'desc')
                ->orderBy('ledger_id', 'desc')
                ->first();
            $currentBalance = $lastBalance ? $lastBalance->balance : 0;
            $newBalance = $currentBalance + $this->total_amount; // Add to balance (debit)

            // Load rental unit relationship if not already loaded
            $unitNumber = 'Unit';
            try {
                if (!$this->relationLoaded('rentalUnit')) {
                    $this->load('rentalUnit');
                }
                if ($this->rentalUnit && $this->rentalUnit->unit_number) {
                    $unitNumber = $this->rentalUnit->unit_number;
                }
            } catch (\Exception $e) {
                Log::warning("Could not load rental unit for invoice {$this->invoice_number}: " . $e->getMessage());
            }

            TenantLedger::create([
                'tenant_id' => $this->tenant_id,
                'payment_type_id' => $paymentType->id,
                'transaction_date' => $this->invoice_date,
                'description' => "Rent Invoice {$this->invoice_number} - {$unitNumber}",
                'reference_no' => $this->invoice_number,
                'debit_amount' => $this->total_amount,
                'credit_amount' => 0,
                'balance' => $newBalance,
                'payment_method' => null, // Will be filled when payment is made
                'transfer_reference_no' => null,
                'remarks' => $this->notes,
                'created_by' => 'System',
            ]);

            Log::info("Created tenant ledger entry for rent invoice {$this->invoice_number}");
        } catch (\Exception $e) {
            Log::error("Failed to create tenant ledger entry for rent invoice {$this->invoice_number}: " . $e->getMessage());
        }
    }

    /**
     * Update tenant ledger entry when rent invoice is updated
     */
    public function updateTenantLedgerEntry()
    {
        try {
            $ledgerEntry = TenantLedger::where('reference_no', $this->invoice_number)
                ->where('tenant_id', $this->tenant_id)
                ->first();

            if ($ledgerEntry) {
                // Load rental unit relationship if not already loaded
                $unitNumber = 'Unit';
                try {
                    if (!$this->relationLoaded('rentalUnit')) {
                        $this->load('rentalUnit');
                    }
                    if ($this->rentalUnit && $this->rentalUnit->unit_number) {
                        $unitNumber = $this->rentalUnit->unit_number;
                    }
                } catch (\Exception $e) {
                    Log::warning("Could not load rental unit for invoice {$this->invoice_number}: " . $e->getMessage());
                }

                // Update the debit amount and recalculate balance
                $ledgerEntry->update([
                    'debit_amount' => $this->total_amount,
                    'description' => "Rent Invoice {$this->invoice_number} - {$unitNumber}",
                    'remarks' => $this->notes,
                ]);

                // Recalculate balances for all subsequent entries
                $this->recalculateTenantBalances($this->tenant_id, $ledgerEntry->transaction_date, $ledgerEntry->ledger_id);

                Log::info("Updated tenant ledger entry for rent invoice {$this->invoice_number}");
            }
        } catch (\Exception $e) {
            Log::error("Failed to update tenant ledger entry for rent invoice {$this->invoice_number}: " . $e->getMessage());
        }
    }

    /**
     * Delete tenant ledger entry when rent invoice is deleted
     */
    public function deleteTenantLedgerEntry()
    {
        try {
            $ledgerEntry = TenantLedger::where('reference_no', $this->invoice_number)
                ->where('tenant_id', $this->tenant_id)
                ->first();

            if ($ledgerEntry) {
                $tenantId = $ledgerEntry->tenant_id;
                $transactionDate = $ledgerEntry->transaction_date;
                $ledgerId = $ledgerEntry->ledger_id;

                $ledgerEntry->delete();

                // Recalculate balances for all subsequent entries
                $this->recalculateTenantBalances($tenantId, $transactionDate, $ledgerId);

                Log::info("Deleted tenant ledger entry for rent invoice {$this->invoice_number}");
            }
        } catch (\Exception $e) {
            Log::error("Failed to delete tenant ledger entry for rent invoice {$this->invoice_number}: " . $e->getMessage());
        }
    }

    /**
     * Recalculate balances for all ledger entries for a tenant from a specific point
     */
    private function recalculateTenantBalances($tenantId, $transactionDate, $startLedgerId)
    {
        DB::transaction(function () use ($tenantId, $transactionDate, $startLedgerId) {
            $entriesToRecalculate = TenantLedger::where('tenant_id', $tenantId)
                ->where(function ($query) use ($transactionDate, $startLedgerId) {
                    $query->where('transaction_date', '>', $transactionDate)
                          ->orWhere(function ($query) use ($transactionDate, $startLedgerId) {
                              $query->where('transaction_date', $transactionDate)
                                    ->where('ledger_id', '>', $startLedgerId);
                          });
                })
                ->orderBy('transaction_date')
                ->orderBy('ledger_id')
                ->get();

            $previousEntry = TenantLedger::where('tenant_id', $tenantId)
                ->where(function ($query) use ($transactionDate, $startLedgerId) {
                    $query->where('transaction_date', '<', $transactionDate)
                          ->orWhere(function ($query) use ($transactionDate, $startLedgerId) {
                              $query->where('transaction_date', $transactionDate)
                                    ->where('ledger_id', '<', $startLedgerId);
                          });
                })
                ->orderBy('transaction_date', 'desc')
                ->orderBy('ledger_id', 'desc')
                ->first();

            $currentBalance = $previousEntry ? $previousEntry->balance : 0;

            foreach ($entriesToRecalculate as $entry) {
                $entry->balance = $currentBalance - $entry->debit_amount + $entry->credit_amount;
                $entry->save();
                $currentBalance = $entry->balance;
            }
        });
    }
}
