<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ShipmentItem extends Model
{
    protected $fillable = [
        'shipment_id',
        'product_id',
        'item_name',
        'quantity',
        'unit_cost',
        'weight',
        'total_item_cost',
        'percentage_share',
        'allocated_shared_cost',
        'total_landed_cost',
        'landed_cost_per_unit'
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
        'weight' => 'decimal:3',
        'total_item_cost' => 'decimal:2',
        'percentage_share' => 'decimal:4',
        'allocated_shared_cost' => 'decimal:2',
        'total_landed_cost' => 'decimal:2',
        'landed_cost_per_unit' => 'decimal:2'
    ];

    public function shipment(): BelongsTo
    {
        return $this->belongsTo(Shipment::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(SharedCostAllocation::class);
    }
}