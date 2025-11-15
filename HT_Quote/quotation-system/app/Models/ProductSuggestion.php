<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductSuggestion extends Model
{
    protected $fillable = [
        'product_id',
        'suggested_product_id',
        'display_order',
    ];

    /**
     * Get the product that owns this suggestion
     */
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    /**
     * Get the suggested product
     */
    public function suggestedProduct()
    {
        return $this->belongsTo(Product::class, 'suggested_product_id');
    }
}
