<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Currency extends Model
{
    protected $fillable = [
        'code',
        'name',
        'symbol',
        'exchange_rate',
        'is_base',
        'is_active',
        'decimal_places',
        'thousands_separator',
        'decimal_separator',
    ];

    protected $casts = [
        'exchange_rate' => 'decimal:4',
        'is_base' => 'boolean',
        'is_active' => 'boolean',
        'decimal_places' => 'integer',
    ];

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeBase($query)
    {
        return $query->where('is_base', true);
    }
}
