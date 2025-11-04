<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SharedCostAllocation extends Model
{
    protected $fillable = [
        'shared_cost_id',
        'shipment_item_id',
        'allocated_amount',
        'is_manual_override'
    ];

    protected $casts = [
        'allocated_amount' => 'decimal:2',
        'is_manual_override' => 'boolean'
    ];

    public function sharedCost(): BelongsTo
    {
        return $this->belongsTo(SharedCost::class);
    }

    public function shipmentItem(): BelongsTo
    {
        return $this->belongsTo(ShipmentItem::class);
    }
}
