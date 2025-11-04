<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class RentalUnit extends Model
{
    use HasFactory;

    protected $fillable = [
        'property_id',
        'unit_number',
        'unit_type',
        'floor_number',
        // New separate columns
        'rent_amount',
        'deposit_amount',
        'currency',
        'number_of_rooms',
        'number_of_toilets',
        'square_feet',
        // Utility meter information
        'water_meter_number',
        'water_billing_account',
        'electricity_meter_number',
        'electricity_billing_account',
        // Access card numbers
        'access_card_numbers',
        'status',
        'tenant_id',
        'move_in_date',
        'lease_end_date',
        'amenities',
        'photos',
        'notes',
        'is_active',
    ];

    protected $casts = [
        // New column casts
        'rent_amount' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'square_feet' => 'decimal:2',
        'is_active' => 'boolean',
        'floor_number' => 'integer',
        'number_of_rooms' => 'integer',
        'number_of_toilets' => 'integer',
        'property_id' => 'integer',
        'tenant_id' => 'integer',
        'move_in_date' => 'date:Y-m-d',
        'lease_end_date' => 'date:Y-m-d',
        'amenities' => 'array',
        'photos' => 'array',
    ];

    protected $attributes = [
        'status' => 'available',
        'is_active' => true,
        'amenities' => '[]',
        'photos' => '[]',
    ];

    // Relationships
    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function assets(): BelongsToMany
    {
        return $this->belongsToMany(Asset::class, 'rental_unit_assets')
            ->withPivot(['assigned_date', 'notes', 'is_active', 'quantity', 'status', 'maintenance_notes'])
            ->withTimestamps()
            ->wherePivot('is_active', true)
            ->orderBy('rental_unit_assets.updated_at', 'desc');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeAvailable($query)
    {
        return $query->where('status', 'available');
    }

    public function scopeOccupied($query)
    {
        return $query->where('status', 'occupied');
    }

    // Search scopes for new columns
    public function scopeByRentRange($query, $minRent, $maxRent)
    {
        return $query->whereBetween('rent_amount', [$minRent, $maxRent]);
    }

    public function scopeByRooms($query, $rooms)
    {
        return $query->where('number_of_rooms', $rooms);
    }

    public function scopeByToilets($query, $toilets)
    {
        return $query->where('number_of_toilets', $toilets);
    }

    public function scopeBySquareFeetRange($query, $minSqft, $maxSqft)
    {
        return $query->whereBetween('square_feet', [$minSqft, $maxSqft]);
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('unit_number', 'like', "%{$search}%")
              ->orWhere('rent_amount', 'like', "%{$search}%")
              ->orWhere('number_of_rooms', 'like', "%{$search}%")
              ->orWhere('number_of_toilets', 'like', "%{$search}%");
        });
    }

    // Accessors - Now using only new columns
    public function getRentAmountAttribute()
    {
        return $this->attributes['rent_amount'] ?? 0;
    }

    public function getDepositAmountAttribute()
    {
        return $this->attributes['deposit_amount'] ?? 0;
    }

    public function getCurrencyAttribute()
    {
        return $this->attributes['currency'] ?? 'MVR';
    }

    public function getNumberOfRoomsAttribute()
    {
        return $this->attributes['number_of_rooms'] ?? 0;
    }

    public function getNumberOfToiletsAttribute()
    {
        return $this->attributes['number_of_toilets'] ?? 0;
    }

    public function getSquareFeetAttribute()
    {
        return $this->attributes['square_feet'] ?? 0;
    }
}