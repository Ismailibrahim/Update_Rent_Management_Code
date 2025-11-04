<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MaintenanceRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'property_id',
        'rental_unit_id',
        'tenant_id',
        'priority',
        'status',
        'request_date',
        'scheduled_date',
        'completed_date',
        'assigned_to',
        'estimated_cost',
        'actual_cost',
    ];

    protected $casts = [
        'request_date' => 'date',
        'scheduled_date' => 'date',
        'completed_date' => 'date',
        'estimated_cost' => 'decimal:2',
        'actual_cost' => 'decimal:2',
    ];

    /**
     * Get the property that owns the maintenance request.
     */
    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * Get the rental unit that owns the maintenance request.
     */
    public function rentalUnit()
    {
        return $this->belongsTo(RentalUnit::class);
    }

    /**
     * Get the tenant that owns the maintenance request.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the maintenance costs associated with this request.
     */
    public function maintenanceCosts(): HasMany
    {
        return $this->hasMany(MaintenanceCost::class);
    }

    /**
     * Scope a query to only include pending maintenance requests.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope a query to only include in-progress maintenance requests.
     */
    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    /**
     * Scope a query to only include completed maintenance requests.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope a query to only include repaired maintenance requests.
     */
    public function scopeRepaired($query)
    {
        return $query->where('status', 'repaired');
    }

    /**
     * Scope a query to only include high priority maintenance requests.
     */
    public function scopeHighPriority($query)
    {
        return $query->where('priority', 'high');
    }

    /**
     * Scope a query to only include medium priority maintenance requests.
     */
    public function scopeMediumPriority($query)
    {
        return $query->where('priority', 'medium');
    }

    /**
     * Scope a query to only include low priority maintenance requests.
     */
    public function scopeLowPriority($query)
    {
        return $query->where('priority', 'low');
    }
}