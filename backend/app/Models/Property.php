<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Property extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'street',
        'city',
        'island',
        'postal_code',
        'country',
        'number_of_floors',
        'number_of_rental_units',
        'bedrooms',
        'bathrooms',
        'square_feet',
        'year_built',
        'description',
        'status',
        // New separate columns
        'photo_paths',
        'amenity_list',
        'assigned_manager_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'number_of_floors' => 'integer',
        'number_of_rental_units' => 'integer',
        'bedrooms' => 'integer',
        'bathrooms' => 'integer',
        'square_feet' => 'integer',
        'year_built' => 'integer',
        'assigned_manager_id' => 'integer',
        'photo_paths' => 'json',
        'amenity_list' => 'json',
    ];

    protected $attributes = [
        'country' => 'Maldives',
        'status' => 'vacant',
        'is_active' => true,
    ];

    // Relationships
    public function assignedManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_manager_id');
    }

    public function rentalUnits(): HasMany
    {
        return $this->hasMany(RentalUnit::class);
    }

    // Accessor for full address
    public function getFullAddressAttribute(): string
    {
        return "{$this->street}, {$this->city}, {$this->island}";
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeVacant($query)
    {
        return $query->where('status', 'vacant');
    }

    public function scopeOccupied($query)
    {
        return $query->where('status', 'occupied');
    }

    // Search scopes for new columns
    public function scopeByAmenity($query, $amenity)
    {
        return $query->where('amenity_list', 'like', "%{$amenity}%");
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('name', 'like', "%{$search}%")
              ->orWhere('city', 'like', "%{$search}%")
              ->orWhere('island', 'like', "%{$search}%")
              ->orWhere('amenity_list', 'like', "%{$search}%");
        });
    }

    // Method to update property status based on rental unit occupancy
    public function updateStatusBasedOnUnits()
    {
        $totalUnits = $this->rentalUnits()->count();
        $occupiedUnits = $this->rentalUnits()->where('status', 'occupied')->count();
        
        if ($totalUnits === 0) {
            $this->update(['status' => 'vacant']);
        } elseif ($occupiedUnits === $totalUnits) {
            $this->update(['status' => 'occupied']);
        } elseif ($occupiedUnits > 0) {
            $this->update(['status' => 'occupied']); // Changed from 'partially_occupied' to 'occupied'
        } else {
            $this->update(['status' => 'vacant']);
        }
        
        return $this->fresh();
    }

    // Accessor to get current occupancy status
    public function getOccupancyStatusAttribute()
    {
        $totalUnits = $this->rentalUnits()->count();
        $occupiedUnits = $this->rentalUnits()->where('status', 'occupied')->count();
        
        if ($totalUnits === 0) {
            return 'vacant';
        } elseif ($occupiedUnits === $totalUnits) {
            return 'occupied';
        } elseif ($occupiedUnits > 0) {
            return 'occupied'; // Changed from 'partially_occupied' to 'occupied'
        } else {
            return 'vacant';
        }
    }

    // Accessor for photos
    public function getPhotosAttribute()
    {
        return $this->photo_paths ?? [];
    }

    // Accessor for amenities
    public function getAmenitiesAttribute()
    {
        return $this->amenity_list ?? [];
    }
}