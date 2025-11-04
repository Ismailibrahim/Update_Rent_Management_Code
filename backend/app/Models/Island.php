<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Island extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'is_active',
        'sort_order'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer'
    ];

    protected $attributes = [
        'is_active' => true,
        'sort_order' => 0
    ];

    // Relationships
    // Note: Since Property.island is a string (not a foreign key), 
    // we use a custom query scope instead of a standard relationship
    public function properties()
    {
        // Return a query builder that filters by island name
        return Property::where('island', $this->name);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }
}

