<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TermsConditionsTemplate extends Model
{
    protected $fillable = [
        'title',
        'content',
        'category_type',
        'is_default',
        'is_active',
        'display_in_quotation'
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
        'display_in_quotation' => 'boolean'
    ];

    public static function getTemplatesForProducts($products)
    {
        $categoryTypes = collect($products)->pluck('category.category_type')->unique();

        return static::where('is_active', true)
            ->where(function ($query) use ($categoryTypes) {
                $query->whereIn('category_type', $categoryTypes)
                    ->orWhere('category_type', 'general');
            })
            ->get();
    }
}