<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RentalUnitAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'rental_unit_id',
        'asset_id',
        'assigned_date',
        'notes',
        'is_active',
        'quantity',
        'status',
        'maintenance_notes',
    ];

    protected $casts = [
        'assigned_date' => 'datetime',
        'is_active' => 'boolean',
        'rental_unit_id' => 'integer',
        'asset_id' => 'integer',
        'quantity' => 'integer',
    ];

    protected $attributes = [
        'is_active' => true,
        'status' => 'working',
    ];

    // Relationships
    public function rentalUnit(): BelongsTo
    {
        return $this->belongsTo(RentalUnit::class);
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function maintenanceCosts(): HasMany
    {
        return $this->hasMany(MaintenanceCost::class, 'rental_unit_asset_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}