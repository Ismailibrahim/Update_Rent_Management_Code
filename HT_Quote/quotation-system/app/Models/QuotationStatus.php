<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuotationStatus extends Model
{
    protected $fillable = [
        'status_name',
        'status_key',
        'color',
        'sort_order',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer'
    ];

    // Scope to get only active statuses
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Scope to get statuses ordered by sort_order
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order');
    }
}
