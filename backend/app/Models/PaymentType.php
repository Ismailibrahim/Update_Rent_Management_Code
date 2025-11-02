<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentType extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'is_active',
        'is_recurring',
        'requires_approval',
        'settings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'is_recurring' => 'boolean',
        'requires_approval' => 'boolean',
        'settings' => 'array',
    ];

    /**
     * Scope a query to only include active payment types.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get all ledger entries for this payment type.
     */
    public function ledgerEntries(): HasMany
    {
        return $this->hasMany(TenantLedger::class, 'payment_type_id');
    }
}
