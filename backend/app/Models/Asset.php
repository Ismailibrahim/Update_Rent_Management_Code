<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Asset extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'brand',
        'serial_no',
        'category',
        'status',
        'maintenance_notes',
    ];

    protected $attributes = [
        'category' => 'other',
        'status' => 'working',
    ];

    // Relationships
    public function rentalUnits(): BelongsToMany
    {
        return $this->belongsToMany(RentalUnit::class, 'rental_unit_assets')
            ->withPivot(['assigned_date', 'notes', 'is_active', 'quantity', 'status', 'maintenance_notes'])
            ->withTimestamps();
    }

    // Accessors
    public function getFullNameAttribute()
    {
        $parts = array_filter([$this->brand, $this->name]);
        return implode(' ', $parts);
    }
}