<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AmcDescription extends Model
{
    protected $fillable = [
        'description',
        'product_type',
        'is_default',
        'is_active'
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean'
    ];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'amc_description_id');
    }

    public static function getDefault($productType)
    {
        return static::where('product_type', $productType)
            ->where('is_default', true)
            ->where('is_active', true)
            ->first();
    }
}