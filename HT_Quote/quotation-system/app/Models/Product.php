<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use Auditable;
    protected $fillable = [
        'name',
        'description',
        'sku',
        'category_id',
        'unit_price',
        'landed_cost',
        'total_man_days',
        'currency',
        'is_man_day_based',
        'has_amc_option',
        'amc_unit_price',
        'amc_description_id',
        'brand',
        'model',
        'part_number',
        'tax_rate',
        'is_discountable',
        'is_refurbished',
        'is_active',
        'sort_order',
        'pricing_model',
        'created_by'
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'landed_cost' => 'decimal:2',
        'total_man_days' => 'decimal:2',
        'amc_unit_price' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'is_man_day_based' => 'boolean',
        'has_amc_option' => 'boolean',
        'is_discountable' => 'boolean',
        'is_refurbished' => 'boolean',
        'is_active' => 'boolean'
    ];

    protected $appends = ['category_type', 'man_day_rate', 'total_lot_price', 'is_service_product'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'category_id');
    }

    public function amcDescription(): BelongsTo
    {
        return $this->belongsTo(AmcDescription::class, 'amc_description_id');
    }

    public function quotationItems(): HasMany
    {
        return $this->hasMany(QuotationItem::class, 'product_id');
    }

    // Relationship with service tasks
    public function serviceTasks()
    {
        return $this->hasMany(ServiceTask::class)->where('is_active', true)->orderBy('sequence_order');
    }


    // For service products, unit_price is the per-day rate
    // This returns the per-day rate (which is just unit_price for services)
    public function getManDayRateAttribute()
    {
        $isService = $this->category?->category_type === 'services' || $this->is_man_day_based;
        if (!$isService) {
            return 0;
        }
        
        // For service products, unit_price IS the per-day rate
        return $this->unit_price;
    }
    
    // Calculate total lot price (per-day rate × total man days)
    public function getTotalLotPriceAttribute()
    {
        $isService = $this->category?->category_type === 'services' || $this->is_man_day_based;
        if (!$isService || ($this->total_man_days ?? 0) == 0) {
            return $this->unit_price;
        }
        
        // Total lot price = per-day rate × number of days
        return $this->unit_price * $this->total_man_days;
    }

    // Check if this is a service product
    public function isServiceProduct()
    {
        return $this->category?->category_type === 'services' || $this->is_man_day_based;
    }

    // Get is_service_product attribute for API responses
    public function getIsServiceProductAttribute()
    {
        return $this->category?->category_type === 'services' || $this->is_man_day_based;
    }

    // Helper to check if product has service tasks
    public function getHasServiceTasksAttribute()
    {
        return $this->serviceTasks->count() > 0;
    }

    // Get category type for easy access
    public function getCategoryTypeAttribute()
    {
        return $this->category?->category_type;
    }

    // Check if this is a spare part
    public function isSparePart()
    {
        return $this->category?->category_type === 'spare_parts';
    }

    // Check if this is a hardware product
    public function isHardware()
    {
        return $this->category?->category_type === 'hardware';
    }

    // Check if this is a software product
    public function isSoftware()
    {
        return $this->category?->category_type === 'software';
    }
}