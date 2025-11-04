<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerContact extends Model
{
    protected $fillable = [
        'customer_id',
        'contact_person',
        'designation',
        'email',
        'phone',
        'mobile',
        'is_primary',
        'contact_type',
        'notes',
        'created_by'
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the primary contact for a customer
     */
    public static function getPrimaryContact($customerId)
    {
        return static::where('customer_id', $customerId)
                    ->where('is_primary', true)
                    ->first();
    }

    /**
     * Get contacts by type for a customer
     */
    public static function getContactsByType($customerId, $contactType)
    {
        return static::where('customer_id', $customerId)
                    ->where('contact_type', $contactType)
                    ->get();
    }
}
