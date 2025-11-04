<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RentalUnitType extends Model
{
    protected $fillable = [
        'name',
        'description',
        'category',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];

    protected $attributes = [
        'is_active' => true,
        
    ];

    // Relationships
    public function rentalUnits(): HasMany
    {
        return $this->hasMany(RentalUnit::class, 'unit_type', 'name');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('id');
    }

    public function scopePropertyTypes($query)
    {
        return $query->where('category', 'property');
    }

    public function scopeUnitTypes($query)
    {
        return $query->where('category', 'unit');
    }

    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }
}
