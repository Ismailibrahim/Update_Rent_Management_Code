<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TenantLedger extends Model
{
    use HasFactory;

    protected $table = 'tenant_ledgers';
    protected $primaryKey = 'ledger_id';

    protected $fillable = [
        'tenant_id',
        'payment_type_id',
        'rental_unit_id',
        'transaction_date',
        'description',
        'reference_no',
        'debit_amount',
        'credit_amount',
        'payment_method',
        'transfer_reference_no',
        'remarks',
        'created_by',
        // Note: 'balance' is calculated automatically, not filled from input
    ];

    protected $casts = [
        'transaction_date' => 'datetime',
        'debit_amount' => 'decimal:2',
        'credit_amount' => 'decimal:2',
        'balance' => 'decimal:2',
    ];

    protected $attributes = [
        'debit_amount' => 0.00,
        'credit_amount' => 0.00,
        'balance' => 0.00,
    ];

    // Relationships
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function paymentType(): BelongsTo
    {
        return $this->belongsTo(PaymentType::class, 'payment_type_id');
    }

    /**
     * Get the rental unit associated with this ledger entry
     */
    public function rentalUnit(): BelongsTo
    {
        return $this->belongsTo(RentalUnit::class, 'rental_unit_id');
    }

    // Accessors
    public function getTransactionTypeAttribute(): string
    {
        return $this->debit_amount > 0 ? 'Debit' : 'Credit';
    }

    public function getAmountAttribute(): float
    {
        return $this->debit_amount > 0 ? $this->debit_amount : $this->credit_amount;
    }

    public function getFormattedTransactionDateAttribute(): string
    {
        return $this->transaction_date->format('Y-m-d H:i:s');
    }

    // Scopes
    public function scopeForTenant($query, $tenantId)
    {
        return $query->where('tenant_id', $tenantId);
    }

    public function scopeByPaymentType($query, $paymentTypeId)
    {
        return $query->where('payment_type_id', $paymentTypeId);
    }

    public function scopeDebitTransactions($query)
    {
        return $query->where('debit_amount', '>', 0);
    }

    public function scopeCreditTransactions($query)
    {
        return $query->where('credit_amount', '>', 0);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('transaction_date', [$startDate, $endDate]);
    }

    public function scopeOrderByTransactionDate($query, $direction = 'desc')
    {
        return $query->orderBy('transaction_date', $direction);
    }

    public function scopeWithPositiveBalance($query)
    {
        return $query->where('balance', '>', 0);
    }

    public function scopeWithNegativeBalance($query)
    {
        return $query->where('balance', '<', 0);
    }

    // Static methods for balance calculations
    public static function getTenantBalance($tenantId): float
    {
        $latestEntry = static::forTenant($tenantId)
            ->orderByTransactionDate('desc')
            ->orderBy('ledger_id', 'desc')
            ->first();

        return $latestEntry ? $latestEntry->balance : 0.00;
    }

    public static function getTenantTotalDebits($tenantId): float
    {
        return static::forTenant($tenantId)
            ->debitTransactions()
            ->sum('debit_amount');
    }

    public static function getTenantTotalCredits($tenantId): float
    {
        return static::forTenant($tenantId)
            ->creditTransactions()
            ->sum('credit_amount');
    }

    // Model events
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($ledger) {
            // Debug: Log the ledger data being created
            Log::info('TenantLedger Creating:', [
                'tenant_id' => $ledger->tenant_id,
                'debit_amount' => $ledger->debit_amount,
                'credit_amount' => $ledger->credit_amount,
                'description' => $ledger->description
            ]);
            
            // Calculate running balance - get the most recent entry before this one
            $previousEntry = static::forTenant($ledger->tenant_id)
                ->orderByTransactionDate('desc')
                ->orderBy('ledger_id', 'desc')
                ->first();
            
            $previousBalance = $previousEntry ? $previousEntry->balance : 0.00;
            
            if ($ledger->debit_amount > 0) {
                // Debit: tenant owes money (increase balance)
                $ledger->balance = $previousBalance + $ledger->debit_amount;
            } else {
                // Credit: tenant paid money (decrease balance)
                $ledger->balance = $previousBalance - $ledger->credit_amount;
            }

            // Set created_by if not provided
            if (!$ledger->created_by) {
                $ledger->created_by = Auth::user()?->name ?? 'System';
            }
            
            // Debug: Log the balance calculation
            Log::info('TenantLedger Balance Calculation:', [
                'previous_balance' => $previousBalance,
                'debit_amount' => $ledger->debit_amount,
                'credit_amount' => $ledger->credit_amount,
                'new_balance' => $ledger->balance
            ]);
        });

        static::created(function ($ledger) {
            // Update subsequent entries' balances if needed
            static::updateSubsequentBalances($ledger->tenant_id, $ledger->transaction_date);
        });

        static::updated(function ($ledger) {
            // If amounts were changed, recalculate all balances for this tenant
            if ($ledger->wasChanged(['debit_amount', 'credit_amount'])) {
                static::recalculateAllBalances($ledger->tenant_id);
            }
        });

        static::deleted(function ($ledger) {
            // Recalculate all balances after deletion
            static::recalculateAllBalances($ledger->tenant_id);
        });
    }

    // Helper method to update subsequent balances
    private static function updateSubsequentBalances($tenantId, $transactionDate)
    {
        $subsequentEntries = static::forTenant($tenantId)
            ->where('transaction_date', '>', $transactionDate)
            ->orderByTransactionDate('asc')
            ->orderBy('ledger_id', 'asc')
            ->get();

        $runningBalance = static::getTenantBalance($tenantId);

        foreach ($subsequentEntries as $entry) {
            if ($entry->debit_amount > 0) {
                // Debit: tenant owes money (increase balance)
                $runningBalance += $entry->debit_amount;
            } else {
                // Credit: tenant paid money (decrease balance)
                $runningBalance -= $entry->credit_amount;
            }

            $entry->update(['balance' => $runningBalance]);
        }
    }

    // Helper method to recalculate all balances for a tenant
    private static function recalculateAllBalances($tenantId)
    {
        try {
            $allEntries = static::forTenant($tenantId)
                ->orderByTransactionDate('asc')
                ->orderBy('ledger_id', 'asc')
                ->get();

            $runningBalance = 0.00;

            foreach ($allEntries as $entry) {
                if ($entry->debit_amount > 0) {
                    // Debit: tenant owes money (increase balance)
                    $runningBalance += $entry->debit_amount;
                } else {
                    // Credit: tenant paid money (decrease balance)
                    $runningBalance -= $entry->credit_amount;
                }

                // Update balance directly using DB to avoid triggering model events
                // This prevents infinite loops when updating balances
                DB::table('tenant_ledgers')
                    ->where('ledger_id', $entry->ledger_id)
                    ->update(['balance' => $runningBalance]);
            }
        } catch (\Exception $e) {
            Log::error('Error recalculating balances for tenant ' . $tenantId . ': ' . $e->getMessage());
            throw $e;
        }
    }

    // Validation rules
    public static function validationRules(): array
    {
        return [
            'tenant_id' => 'required|exists:tenants,id',
            'payment_type_id' => 'required|exists:payment_types,id',
            'rental_unit_id' => 'nullable|exists:rental_units,id',
            'transaction_date' => 'required|date_format:Y-m-d',
            'description' => 'required|string|max:255',
            'reference_no' => 'nullable|string|max:255',
            'debit_amount' => 'nullable|numeric|min:0',
            'credit_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|max:50',
            'transfer_reference_no' => 'nullable|string|max:50',
            'remarks' => 'nullable|string',
            'created_by' => 'nullable|string|max:50',
        ];
    }
}