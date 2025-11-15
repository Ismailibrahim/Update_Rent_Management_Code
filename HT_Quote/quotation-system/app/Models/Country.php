<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Country extends Model
{
    protected $fillable = [
        'name',
        'is_active',
        'sort_order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Get all customers in this country
     */
    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class, 'country', 'name');
    }

    /**
     * Scope to get only active countries
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to order by sort order and name
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }

    /**
     * Get all active countries ordered by sort order and name
     */
    public static function getActiveCountries()
    {
        return static::active()->ordered()->get();
    }
}
