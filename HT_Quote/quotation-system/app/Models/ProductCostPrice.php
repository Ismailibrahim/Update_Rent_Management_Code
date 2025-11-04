<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductCostPrice extends Model
{
    protected $fillable = [
        'product_id',
        'cost_price',
        'shipment_received_date',
        'supplier_name',
        'invoice_number',
        'notes',
        'created_by'
    ];

    protected $casts = [
        'cost_price' => 'decimal:2',
        'shipment_received_date' => 'date',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
