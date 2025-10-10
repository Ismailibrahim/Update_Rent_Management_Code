<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaintenanceCost extends Model
{
    protected $fillable = [
        'rental_unit_asset_id',
        'repair_cost',
        'currency',
        'description',
        // New separate column
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
}
