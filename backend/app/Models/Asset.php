<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Facades\Schema;

class Asset extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'brand',
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
        // Use a static cache to avoid checking schema on every call
        static $hasSerialNumbersColumn = null;
        static $hasAssetLocationColumn = null;
        static $hasInstallationDateColumn = null;
        
        $pivotColumns = ['assigned_date', 'notes', 'is_active', 'quantity', 'status', 'maintenance_notes'];
        
        // Check if serial_numbers column exists (cached)
        if ($hasSerialNumbersColumn === null) {
            try {
                $hasSerialNumbersColumn = Schema::hasColumn('rental_unit_assets', 'serial_numbers');
            } catch (\Exception $e) {
                // If schema check fails, assume column doesn't exist
                $hasSerialNumbersColumn = false;
            }
        }
        
        if ($hasSerialNumbersColumn) {
            $pivotColumns[] = 'serial_numbers';
        }
        
        // Check if asset_location column exists (cached)
        if ($hasAssetLocationColumn === null) {
            try {
                $hasAssetLocationColumn = Schema::hasColumn('rental_unit_assets', 'asset_location');
            } catch (\Exception $e) {
                // If schema check fails, assume column doesn't exist
                $hasAssetLocationColumn = false;
            }
        }
        
        if ($hasAssetLocationColumn) {
            $pivotColumns[] = 'asset_location';
        }
        
        // Check if installation_date column exists (cached)
        if ($hasInstallationDateColumn === null) {
            try {
                $hasInstallationDateColumn = Schema::hasColumn('rental_unit_assets', 'installation_date');
            } catch (\Exception $e) {
                // If schema check fails, assume column doesn't exist
                $hasInstallationDateColumn = false;
            }
        }
        
        if ($hasInstallationDateColumn) {
            $pivotColumns[] = 'installation_date';
        }
        
        return $this->belongsToMany(RentalUnit::class, 'rental_unit_assets')
            ->withPivot($pivotColumns)
            ->withTimestamps();
    }

    // Accessors
    public function getFullNameAttribute()
    {
        $parts = array_filter([$this->brand, $this->name]);
        return implode(' ', $parts);
    }
}