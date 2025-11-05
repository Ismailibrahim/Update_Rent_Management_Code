<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\TenantLedger;
use App\Models\PaymentType;
use App\Models\MaintenanceInvoice;
use App\Models\Currency;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class MaintenanceCost extends Model
{
    protected $fillable = [
        'rental_unit_asset_id',
        'maintenance_request_id',
        'maintenance_invoice_id',
        'repair_cost',
        'currency_id',
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
            
            // Update maintenance invoice when maintenance cost is updated
            if ($maintenanceCost->wasChanged(['repair_cost', 'description', 'repair_provider', 'repair_date', 'notes', 'currency_id'])) {
                $maintenanceCost->updateMaintenanceInvoice();
            }
            
            // Create maintenance invoice when status changes to 'paid'
            if ($maintenanceCost->wasChanged('status') && $maintenanceCost->status === 'paid') {
                $maintenanceCost->createMaintenanceInvoice();
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

    public function maintenanceRequest(): BelongsTo
    {
        return $this->belongsTo(MaintenanceRequest::class);
    }

    public function maintenanceInvoice(): BelongsTo
    {
        return $this->belongsTo(MaintenanceInvoice::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    // Accessor for formatted cost
    public function getFormattedCostAttribute(): string
    {
        $currencyCode = $this->currency ? $this->currency->code : 'MVR';
        return number_format($this->repair_cost, 2) . ' ' . $currencyCode;
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
                    'code' => 'maintenance',
                    'description' => 'Maintenance and repair costs',
                    'is_active' => true,
                    'is_recurring' => false,
                    'requires_approval' => false,
                    'settings' => []
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

    /**
     * Create maintenance invoice for this maintenance cost
     */
    public function createMaintenanceInvoice()
    {
        try {
            // Check if invoice already exists
            if ($this->maintenanceInvoice) {
                \Log::info("Maintenance invoice already exists for maintenance cost {$this->id}");
                return;
            }

            $tenant = $this->getTenant();
            if (!$tenant) {
                \Log::warning("No tenant found for maintenance cost {$this->id}, attempting to assign one");
                
                // Try to assign a tenant to the rental unit
                if ($this->rentalUnitAsset && $this->rentalUnitAsset->rentalUnit) {
                    $rentalUnit = $this->rentalUnitAsset->rentalUnit;
                    
                    // Find the first available tenant
                    $availableTenant = \App\Models\Tenant::first();
                    if ($availableTenant) {
                        $rentalUnit->update(['tenant_id' => $availableTenant->id]);
                        $tenant = $availableTenant;
                        \Log::info("Assigned tenant {$tenant->id} ({$tenant->full_name}) to rental unit {$rentalUnit->unit_number}");
                    } else {
                        \Log::error("No tenants available in database for maintenance cost {$this->id}");
                        return;
                    }
                } else {
                    \Log::error("No rental unit found for maintenance cost {$this->id}");
                    return;
                }
            }

            // Get unit and asset information safely
            $unitNumber = 'Unit';
            $assetName = 'Asset';
            $propertyName = 'Property';
            try {
                if ($this->rentalUnitAsset) {
                    if ($this->rentalUnitAsset->rentalUnit && $this->rentalUnitAsset->rentalUnit->unit_number) {
                        $unitNumber = $this->rentalUnitAsset->rentalUnit->unit_number;
                    }
                    if ($this->rentalUnitAsset->rentalUnit && $this->rentalUnitAsset->rentalUnit->property) {
                        $propertyName = $this->rentalUnitAsset->rentalUnit->property->name;
                    }
                    if ($this->rentalUnitAsset->asset && $this->rentalUnitAsset->asset->name) {
                        $assetName = $this->rentalUnitAsset->asset->name;
                    }
                }
            } catch (\Exception $e) {
                \Log::warning("Could not load unit/asset info for maintenance cost {$this->id}: " . $e->getMessage());
            }

            // Generate unique invoice number
            $invoiceNumber = 'MAINT-INV-' . date('Ymd') . '-' . $this->id;
            
            // Set invoice date to repair date or current date
            $invoiceDate = $this->repair_date ?? now()->toDateString();
            $dueDate = now()->addDays(30)->toDateString(); // 30 days from now

            $maintenanceInvoice = MaintenanceInvoice::create([
                'invoice_number' => $invoiceNumber,
                'maintenance_cost_id' => $this->id,
                'tenant_id' => $tenant->id,
                'property_id' => $this->rentalUnitAsset->rentalUnit->property_id,
                'rental_unit_id' => $this->rentalUnitAsset->rental_unit_id,
                'rental_unit_asset_id' => $this->rental_unit_asset_id,
                'invoice_date' => $invoiceDate,
                'due_date' => $dueDate,
                'maintenance_amount' => $this->repair_cost,
                'total_amount' => $this->repair_cost,
                'currency' => $this->currency ? $this->currency->code : 'MVR',
                'status' => 'pending',
                'description' => "Maintenance Invoice - {$unitNumber} ({$assetName}): {$this->description}",
                'notes' => $this->notes,
                'repair_provider' => $this->repair_provider,
                'repair_date' => $this->repair_date,
            ]);

            // Update the maintenance cost to link it to the invoice
            $this->update(['maintenance_invoice_id' => $maintenanceInvoice->id]);

            \Log::info("Created maintenance invoice {$maintenanceInvoice->id} for maintenance cost {$this->id}");
        } catch (\Exception $e) {
            \Log::error("Failed to create maintenance invoice for maintenance cost {$this->id}: " . $e->getMessage());
        }
    }

    /**
     * Update maintenance invoice when maintenance cost is updated
     */
    public function updateMaintenanceInvoice()
    {
        try {
            // Check if maintenance invoice exists
            if (!$this->maintenance_invoice_id) {
                \Log::info("No maintenance invoice found for maintenance cost {$this->id}");
                return;
            }

            $maintenanceInvoice = MaintenanceInvoice::find($this->maintenance_invoice_id);
            if (!$maintenanceInvoice) {
                \Log::warning("Maintenance invoice {$this->maintenance_invoice_id} not found for maintenance cost {$this->id}");
                return;
            }

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

            // Update the maintenance invoice with new data
            $maintenanceInvoice->update([
                'maintenance_amount' => $this->repair_cost,
                'total_amount' => $this->repair_cost,
                'currency' => $this->currency ? $this->currency->code : 'MVR',
                'description' => "Maintenance Invoice - {$unitNumber} ({$assetName}): {$this->description}",
                'notes' => $this->notes,
                'repair_provider' => $this->repair_provider,
                'repair_date' => $this->repair_date,
            ]);

            \Log::info("Updated maintenance invoice {$maintenanceInvoice->id} for maintenance cost {$this->id}");
        } catch (\Exception $e) {
            \Log::error("Failed to update maintenance invoice for maintenance cost {$this->id}: " . $e->getMessage());
        }
    }
}
