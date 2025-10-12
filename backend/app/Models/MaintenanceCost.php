<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\TenantLedger;
use App\Models\PaymentType;

class MaintenanceCost extends Model
{
    protected $fillable = [
        'rental_unit_asset_id',
        'repair_cost',
        'currency',
        'description',
        'bill_file_paths',
        'repair_date',
        'repair_provider',
        'status',
        'notes',
    ];

    protected $casts = [
        'repair_cost' => 'decimal:2',
        'repair_date' => 'date',
    ];

    protected $attributes = [
        'currency' => 'MVR',
        'status' => 'draft',
    ];

    /**
     * Boot method to handle model events
     */
    protected static function boot()
    {
        parent::boot();

        // Automatically create tenant ledger entry when maintenance cost is created
        static::created(function ($maintenanceCost) {
            $maintenanceCost->createTenantLedgerEntry();
        });

        // Update tenant ledger entry when maintenance cost is updated
        static::updated(function ($maintenanceCost) {
            if ($maintenanceCost->wasChanged(['repair_cost', 'status'])) {
                $maintenanceCost->updateTenantLedgerEntry();
            }
        });

        // Delete tenant ledger entry when maintenance cost is deleted
        static::deleted(function ($maintenanceCost) {
            $maintenanceCost->deleteTenantLedgerEntry();
        });
    }

    // Relationships
    public function rentalUnitAsset(): BelongsTo
    {
        return $this->belongsTo(RentalUnitAsset::class);
    }

    // Accessor for formatted cost
    public function getFormattedCostAttribute(): string
    {
        return number_format($this->repair_cost, 2) . ' ' . $this->currency;
    }

    /**
     * Get the tenant through rental unit asset relationship
     */
    public function getTenant()
    {
        return $this->rentalUnitAsset?->rentalUnit?->tenant;
    }

    /**
     * Create tenant ledger entry for this maintenance cost
     */
    public function createTenantLedgerEntry()
    {
        try {
            $tenant = $this->getTenant();
            if (!$tenant) {
                \Log::warning("No tenant found for maintenance cost {$this->id}");
                return;
            }

            // Get or create a "Maintenance" payment type
            $paymentType = PaymentType::firstOrCreate(
                ['name' => 'Maintenance'],
                [
                    'description' => 'Maintenance and repair costs',
                    'is_active' => true
                ]
            );

            // Calculate the current balance for the tenant
            $lastBalance = TenantLedger::where('tenant_id', $tenant->id)
                ->orderBy('transaction_date', 'desc')
                ->orderBy('ledger_id', 'desc')
                ->first();
            $currentBalance = $lastBalance ? $lastBalance->balance : 0;
            $newBalance = $currentBalance + $this->repair_cost; // Add to balance (debit)

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
                \Log::warning("Could not load unit/asset info for maintenance cost {$this->id}: " . $e->getMessage());
            }

            TenantLedger::create([
                'tenant_id' => $tenant->id,
                'payment_type_id' => $paymentType->id,
                'transaction_date' => $this->repair_date ?? now()->toDateString(),
                'description' => "Maintenance Cost - {$unitNumber} ({$assetName}): {$this->description}",
                'reference_no' => 'MAINT-' . $this->id,
                'debit_amount' => $this->repair_cost,
                'credit_amount' => 0,
                'balance' => $newBalance,
                'payment_method' => null,
                'transfer_reference_no' => null,
                'remarks' => $this->notes,
                'created_by' => 'System',
            ]);

            \Log::info("Created tenant ledger entry for maintenance cost {$this->id}");
        } catch (\Exception $e) {
            \Log::error("Failed to create tenant ledger entry for maintenance cost {$this->id}: " . $e->getMessage());
        }
    }

    /**
     * Update tenant ledger entry when maintenance cost is updated
     */
    public function updateTenantLedgerEntry()
    {
        try {
            $tenant = $this->getTenant();
            if (!$tenant) {
                \Log::warning("No tenant found for maintenance cost {$this->id}");
                return;
            }

            $ledgerEntry = TenantLedger::where('reference_no', 'MAINT-' . $this->id)
                ->where('tenant_id', $tenant->id)
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
                    \Log::warning("Could not load unit/asset info for maintenance cost {$this->id}: " . $e->getMessage());
                }

                // Update the debit amount and recalculate balance
                $ledgerEntry->update([
                    'debit_amount' => $this->repair_cost,
                    'description' => "Maintenance Cost - {$unitNumber} ({$assetName}): {$this->description}",
                    'remarks' => $this->notes,
                ]);

                // Recalculate balances for all subsequent entries
                $this->recalculateTenantBalances($tenant->id, $ledgerEntry->transaction_date, $ledgerEntry->ledger_id);

                \Log::info("Updated tenant ledger entry for maintenance cost {$this->id}");
            }
        } catch (\Exception $e) {
            \Log::error("Failed to update tenant ledger entry for maintenance cost {$this->id}: " . $e->getMessage());
        }
    }

    /**
     * Delete tenant ledger entry when maintenance cost is deleted
     */
    public function deleteTenantLedgerEntry()
    {
        try {
            $tenant = $this->getTenant();
            if (!$tenant) {
                \Log::warning("No tenant found for maintenance cost {$this->id}");
                return;
            }

            $ledgerEntry = TenantLedger::where('reference_no', 'MAINT-' . $this->id)
                ->where('tenant_id', $tenant->id)
                ->first();

            if ($ledgerEntry) {
                $tenantId = $ledgerEntry->tenant_id;
                $transactionDate = $ledgerEntry->transaction_date;
                $ledgerId = $ledgerEntry->ledger_id;

                $ledgerEntry->delete();

                // Recalculate balances for all subsequent entries
                $this->recalculateTenantBalances($tenantId, $transactionDate, $ledgerId);

                \Log::info("Deleted tenant ledger entry for maintenance cost {$this->id}");
            }
        } catch (\Exception $e) {
            \Log::error("Failed to delete tenant ledger entry for maintenance cost {$this->id}: " . $e->getMessage());
        }
    }

    /**
     * Recalculates balances for all ledger entries for a given tenant from a specific point in time
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
