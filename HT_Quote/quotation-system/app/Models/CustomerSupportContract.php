<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class CustomerSupportContract extends Model
{
    protected $fillable = [
        'customer_id',
        'contract_type',
        'products',
        'contract_number',
        'start_date',
        'expiry_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'products' => 'array',
        'start_date' => 'date',
        'expiry_date' => 'date',
    ];

    /**
     * Get the customer that owns the contract
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Check if the contract is expired
     */
    public function isExpired(): bool
    {
        if (!$this->expiry_date) {
            return false;
        }

        return $this->expiry_date->isPast() && $this->status === 'active';
    }

    /**
     * Check if the contract is expiring soon (within 30 days)
     */
    public function isExpiringSoon(): bool
    {
        if (!$this->expiry_date || $this->status !== 'active') {
            return false;
        }

        $daysUntilExpiry = now()->diffInDays($this->expiry_date, false);
        return $daysUntilExpiry >= 0 && $daysUntilExpiry <= 30;
    }

    /**
     * Get days until expiry
     */
    public function daysUntilExpiry(): ?int
    {
        if (!$this->expiry_date) {
            return null;
        }

        return now()->diffInDays($this->expiry_date, false);
    }

    /**
     * Get status badge color
     */
    public function getStatusColor(): string
    {
        if ($this->status === 'expired' || $this->status === 'manually_inactive') {
            return 'red';
        }

        if ($this->isExpiringSoon()) {
            return 'yellow';
        }

        return 'green';
    }
}
