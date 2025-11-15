<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

use App\Models\RentalUnit;
use App\Models\Tenant;
use App\Models\Property;
use App\Models\Currency;
use App\Models\RentInvoice;
use App\Models\Payment;
class PaymentRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_id',
        'tenant_id',
        'property_id',
        'rental_unit_id',
        'rent_invoice_id',
        'payment_type_id',
        'payment_mode_id',
        'currency_id',
        'amount',
        'exchange_rate',
        'amount_in_base_currency',
        'payment_date',
        'due_date',
        'reference_number',
        'description',
        'status',
        'metadata',
        'processed_by',
        'processed_at',
    ];

    protected $casts = [
        'payment_date' => 'date',
        'due_date' => 'date',
        'amount' => 'decimal:2',
        'exchange_rate' => 'decimal:4',
        'amount_in_base_currency' => 'decimal:2',
        'metadata' => 'array',
        'processed_at' => 'datetime',
    ];

    /**
     * Get the payment that owns this payment record.
     */
    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }

    /**
     * Get the rental unit that owns the payment record.
     */
    public function rentalUnit()
    {
        return $this->belongsTo(RentalUnit::class, 'rental_unit_id');
    }

    /**
     * Get the tenant for this payment record.
     */
    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * Get the property for this payment record.
     */
    public function property()
    {
        return $this->belongsTo(Property::class);
    }

    /**
     * Get the payment type for this payment record.
     */
    public function paymentType()
    {
        return $this->belongsTo(PaymentType::class);
    }

    /**
     * Get the payment mode for this payment record.
     */
    public function paymentMode()
    {
        return $this->belongsTo(PaymentMode::class);
    }

    /**
     * Get the currency for this payment record.
     */
    public function currency()
    {
        return $this->belongsTo(Currency::class, 'currency_id');
    }

    /**
     * Get the associated rent invoice (direct relationship).
     */
    public function rentInvoice()
    {
        return $this->belongsTo(RentInvoice::class, 'rent_invoice_id');
    }

    /**
     * Scope a query to only include completed payment records.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope a query to only include pending payment records.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }
}
