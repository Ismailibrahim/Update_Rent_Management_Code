<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ExpenseCategory extends Model
{
    protected $fillable = [
        'name',
        'description',
        'is_active',
        'allows_item_override',
        'sort_order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'allows_item_override' => 'boolean'
    ];

    public function sharedCosts(): HasMany
    {
        return $this->hasMany(SharedCost::class);
    }
}