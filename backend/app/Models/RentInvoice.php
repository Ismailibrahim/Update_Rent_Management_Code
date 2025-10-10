<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\PaymentRecord;

class RentInvoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_number',
        'tenant_id',
        'property_id',
        'rental_unit_id',
        'invoice_date',
        'due_date',
        'rent_amount',
        'late_fee',
        'total_amount',
        'currency',
        'status',
        'paid_date',
        'notes',
        // New separate columns
        'payment_method',
        'payment_reference',
        'payment_bank',
        'payment_account',
        'payment_notes',
        'payment_slip_files',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'paid_date' => 'date',
        'rent_amount' => 'decimal:2',
        'late_fee' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    protected $attributes = [
        'status' => 'pending',
        'currency' => 'MVR',
        'late_fee' => 0,
    ];

    // Relationships
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function rentalUnit(): BelongsTo
    {
        return $this->belongsTo(RentalUnit::class);
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'paid');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'overdue');
    }

    public function scopeForMonth($query, $year, $month)
    {
        return $query->whereYear('invoice_date', $year)
                    ->whereMonth('invoice_date', $month);
    }

    // Search scopes for new columns
    public function scopeByPaymentMethod($query, $method)
    {
        return $query->where('payment_method', $method);
    }

    public function scopeByPaymentReference($query, $reference)
    {
        return $query->where('payment_reference', 'like', "%{$reference}%");
    }

    public function scopeSearch($query, $search)
    {
        return $query->where(function($q) use ($search) {
            $q->where('invoice_number', 'like', "%{$search}%")
              ->orWhere('payment_method', 'like', "%{$search}%")
              ->orWhere('payment_reference', 'like', "%{$search}%")
              ->orWhere('payment_bank', 'like', "%{$search}%");
        });
    }

    // Accessors
    public function getIsOverdueAttribute()
    {
        return $this->status === 'pending' && $this->due_date < now()->toDateString();
    }

    public function getFormattedInvoiceNumberAttribute()
    {
        return 'INV-' . str_pad($this->id, 6, '0', STR_PAD_LEFT);
    }

    // Methods
    public function markAsPaid($paymentDetails = null)
    {
        $updateData = [
            'status' => 'paid',
            'paid_date' => now()->toDateString(),
            'payment_details' => $paymentDetails,
        ];

        // Add payment slip paths if provided
        if (isset($paymentDetails['payment_slip_paths'])) {
            $updateData['payment_slip_paths'] = $paymentDetails['payment_slip_paths'];
        }

        $this->update($updateData);

        // Always create a Payment Record entry when invoice is marked paid
        // Load tenant relationship to get tenant details
        $this->load('tenant');

        $tenantFullName = null;
        $tenantPhone = null;
        if ($this->tenant) {
            // Use the new flat column structure
            $tenantFullName = $this->tenant->full_name ?: trim($this->tenant->first_name . ' ' . $this->tenant->last_name) ?: null;
            $tenantPhone = $this->tenant->phone;
        }

        // Provide sensible defaults for historical backfill if details are missing
        $paymentTypeId = $paymentDetails['payment_type'] ?? 1; // assume 1 exists (e.g., Rent)
        $paymentModeId = $paymentDetails['payment_mode'] ?? 1; // assume 1 exists (e.g., Cash)

        PaymentRecord::create([
            'unit_id' => $this->rental_unit_id,
            'amount' => $paymentDetails['total_amount'] ?? $this->total_amount,
            'payment_type_id' => $paymentTypeId,
            'payment_mode_id' => $paymentModeId,
            'paid_date' => $paymentDetails['payment_date'] ?? now()->toDateString(),
            'paid_by' => $tenantFullName,
            'mobile_no' => $tenantPhone,
            'remarks' => $paymentDetails['notes'] ?? "Payment for invoice {$this->invoice_number}",
            'currency_id' => 1, // Default currency ID (assuming 1 is MVR)
            'created_by_id' => 1, // Default admin user ID
            'is_active' => 1,
        ]);
    }

    public function markAsOverdue()
    {
        $this->update(['status' => 'overdue']);
    }

    public function calculateLateFee($dailyLateFee = 10)
    {
        if ($this->is_overdue) {
            $daysOverdue = now()->diffInDays($this->due_date);
            return $daysOverdue * $dailyLateFee;
        }
        return 0;
    }
}
