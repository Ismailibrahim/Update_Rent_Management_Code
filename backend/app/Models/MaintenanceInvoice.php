<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\TenantLedger;
use App\Models\PaymentType;

class MaintenanceInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'maintenance_cost_id',
        'tenant_id',
        'property_id',
        'rental_unit_id',
        'rental_unit_asset_id',
        'invoice_date',
        'due_date',
        'maintenance_amount',
        'total_amount',
        'currency',
        'status',
        'paid_date',
        'description',
        'notes',
        'repair_provider',
        'repair_date',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'paid_date' => 'date',
        'repair_date' => 'date',
        'maintenance_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    protected $attributes = [
        'status' => 'pending',
        'currency' => 'MVR',
    ];

    /**
     * Boot method to handle model events
     */
    protected static function boot()
    {
        parent::boot();

        // Automatically create tenant ledger entry when maintenance invoice is created
        static::created(function ($invoice) {
            $invoice->createTenantLedgerEntry();
        });

        // Update tenant ledger entry when maintenance invoice is updated
        static::updated(function ($invoice) {
            if ($invoice->wasChanged(['total_amount', 'status'])) {
                $invoice->updateTenantLedgerEntry();
            }
        });

        // Delete tenant ledger entry when maintenance invoice is deleted
        static::deleted(function ($invoice) {
            $invoice->deleteTenantLedgerEntry();
        });
    }

    // Relationships
    public function maintenanceCost(): BelongsTo
    {
        return $this->belongsTo(MaintenanceCost::class);
    }

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

    public function rentalUnitAsset(): BelongsTo
    {
        return $this->belongsTo(RentalUnitAsset::class);
    }

    /**
     * Create tenant ledger entry for this maintenance invoice
     */
    public function createTenantLedgerEntry()
    {
        try {
            // Get or create a "Maintenance Invoice" payment type
            $paymentType = PaymentType::firstOrCreate(
                ['name' => 'Maintenance Invoice'],
                [
                    'description' => 'Maintenance repair invoices',
                    'is_active' => true
                ]
            );

            // Calculate the current balance for the tenant
            $lastBalance = TenantLedger::where('tenant_id', $this->tenant_id)
                ->orderBy('transaction_date', 'desc')
                ->orderBy('ledger_id', 'desc')
                ->first();
            $currentBalance = $lastBalance ? $lastBalance->balance : 0;
            $newBalance = $currentBalance + $this->total_amount; // Add to balance (debit)

            // Get unit and asset information safely
            $unitNumber = 'Unit';
            $assetName = 'Asset';
            try {
                if ($this->rentalUnitAsset) {
                    if ($this->rentalUnitAsset->rentalUnit && $this->rentalUnitAsset->rentalUnit->unit_number) {
                        $unitNumber = $this->rentalUnitAsset->rentalUnit->unit_number;
                    }
                    if ($this->rentalUnitAsset->asset && $this->rentalUnitAsset->asset->name) {
                        $assetName = $this->rentalUnitAsset->asset->name;
                    }
                }
            } catch (\Exception $e) {
                Log::warning("Could not load unit/asset info for maintenance invoice {$this->id}: " . $e->getMessage());
            }

            TenantLedger::create([
                'tenant_id' => $this->tenant_id,
                'payment_type_id' => $paymentType->id,
                'transaction_date' => $this->invoice_date,
                'description' => "Maintenance Invoice - {$unitNumber} ({$assetName}): {$this->description}",
                'reference_no' => $this->invoice_number,
                'debit_amount' => $this->total_amount,
                'credit_amount' => 0,
                'balance' => $newBalance,
                'payment_method' => null,
                'transfer_reference_no' => null,
                'remarks' => $this->notes,
                'created_by' => 'System',
            ]);

            Log::info("Created tenant ledger entry for maintenance invoice {$this->id}");
        } catch (\Exception $e) {
            Log::error("Failed to create tenant ledger entry for maintenance invoice {$this->id}: " . $e->getMessage());
        }
    }

    /**
     * Update tenant ledger entry when maintenance invoice is updated
     */
    public function updateTenantLedgerEntry()
    {
        try {
            $ledgerEntry = TenantLedger::where('reference_no', $this->invoice_number)
                ->where('tenant_id', $this->tenant_id)
                ->first();

            if ($ledgerEntry) {
                // Get unit and asset information safely
                $unitNumber = 'Unit';
                $assetName = 'Asset';
                try {
                    if ($this->rentalUnitAsset) {
                        if ($this->rentalUnitAsset->rentalUnit && $this->rentalUnitAsset->rentalUnit->unit_number) {
                            $unitNumber = $this->rentalUnitAsset->rentalUnit->unit_number;
                        }
                        if ($this->rentalUnitAsset->asset && $this->rentalUnitAsset->asset->name) {
                            $assetName = $this->rentalUnitAsset->asset->name;
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning("Could not load unit/asset info for maintenance invoice {$this->id}: " . $e->getMessage());
                }

                // Update the debit amount and recalculate balance
                $ledgerEntry->update([
                    'debit_amount' => $this->total_amount,
                    'description' => "Maintenance Invoice - {$unitNumber} ({$assetName}): {$this->description}",
                    'remarks' => $this->notes,
                ]);

                // Recalculate balances for all subsequent entries
                $this->recalculateTenantBalances($this->tenant_id, $ledgerEntry->transaction_date, $ledgerEntry->ledger_id);

                Log::info("Updated tenant ledger entry for maintenance invoice {$this->id}");
            }
        } catch (\Exception $e) {
            Log::error("Failed to update tenant ledger entry for maintenance invoice {$this->id}: " . $e->getMessage());
        }
    }

    /**
     * Delete tenant ledger entry when maintenance invoice is deleted
     */
    public function deleteTenantLedgerEntry()
    {
        try {
            $ledgerEntry = TenantLedger::where('reference_no', $this->invoice_number)
                ->where('tenant_id', $this->tenant_id)
                ->first();

            if ($ledgerEntry) {
                $transactionDate = $ledgerEntry->transaction_date;
                $ledgerId = $ledgerEntry->ledger_id;
                $tenantId = $this->tenant_id;

                $ledgerEntry->delete();

                // Recalculate balances for all subsequent entries
                $this->recalculateTenantBalances($tenantId, $transactionDate, $ledgerId);

                Log::info("Deleted tenant ledger entry for maintenance invoice {$this->id}");
            }
        } catch (\Exception $e) {
            Log::error("Failed to delete tenant ledger entry for maintenance invoice {$this->id}: " . $e->getMessage());
        }
    }

    /**
     * Recalculate tenant balances after a ledger entry change
     */
    protected function recalculateTenantBalances(int $tenantId, string $transactionDate, int $startLedgerId)
    {
        \DB::transaction(function () use ($tenantId, $transactionDate, $startLedgerId) {
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
