<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shipment extends Model
{
    protected $fillable = [
        'name',
        'description',
        'shipment_date',
        'calculation_method',
        'base_currency',
        'exchange_rate',
        'total_base_cost',
        'total_shared_cost',
        'total_landed_cost',
        'is_finalized',
        'created_by'
    ];

    protected $casts = [
        'shipment_date' => 'date',
        'exchange_rate' => 'decimal:4',
        'total_base_cost' => 'decimal:2',
        'total_shared_cost' => 'decimal:2',
        'total_landed_cost' => 'decimal:2',
        'is_finalized' => 'boolean'
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(ShipmentItem::class);
    }

    public function sharedCosts(): HasMany
    {
        return $this->hasMany(SharedCost::class);
    }

    // Helper method to calculate totals
    public function calculateTotals(): void
    {
        $this->total_base_cost = $this->items->sum('total_item_cost');
        $this->total_shared_cost = $this->sharedCosts->sum('amount');
        $this->total_landed_cost = $this->total_base_cost + $this->total_shared_cost;
        $this->save();
    }
}