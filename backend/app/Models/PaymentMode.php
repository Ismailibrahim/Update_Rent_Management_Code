<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PaymentMode extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'description',
        'is_active',
        'requires_reference',
        'settings',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'requires_reference' => 'boolean',
        'settings' => 'array',
    ];

    /**
     * Scope a query to only include active payment modes.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Get the payment records for this payment mode.
     */
    public function paymentRecords()
    {
        return $this->hasMany(PaymentRecord::class);
    }
}
