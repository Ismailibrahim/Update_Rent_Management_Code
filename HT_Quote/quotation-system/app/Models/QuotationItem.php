<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class QuotationItem extends Model
{
    use Auditable;
    protected $fillable = [
        'quotation_id',
        'product_id',
        'item_type',
        'description',
        'quantity',
        'unit_price',
        'currency',
        'discount_percentage',
        'discount_amount',
        'tax_rate',
        'import_duty',
        'import_duty_inclusive',
        'item_total',
        'parent_item_id',
        'is_amc_line',
        'amc_description_used',
        'is_service_item',
        'man_days'
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'import_duty' => 'decimal:2',
        'import_duty_inclusive' => 'boolean',
        'item_total' => 'decimal:2',
        'is_amc_line' => 'boolean',
        'is_service_item' => 'boolean',
        'man_days' => 'decimal:2'
    ];

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function amcItems(): HasMany
    {
        return $this->hasMany(QuotationItem::class, 'parent_item_id');
    }

    public function parentItem(): BelongsTo
    {
        return $this->belongsTo(QuotationItem::class, 'parent_item_id');
    }

    public function calculateTotal()
    {
        $baseTotal = $this->quantity * $this->unit_price;
        $discountedTotal = $baseTotal - $this->discount_amount;

        $this->item_total = $discountedTotal;
        $this->save();

        return $this->item_total;
    }
}