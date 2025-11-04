<?php

namespace App\Models;

use App\Traits\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Quotation extends Model
{
    use Auditable;
    protected $fillable = [
        'quotation_number',
        'customer_id',
        'status',
        'valid_until',
        'currency',
        'exchange_rate',
        'subtotal',
        'discount_amount',
        'discount_percentage',
        'tax_amount',
        'total_amount',
        'notes',
        'terms_conditions',
        'selected_tc_templates',
        'created_by',
        'sent_date',
        'accepted_date',
        'rejected_date'
    ];

    protected $casts = [
        'selected_tc_templates' => 'array',
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'discount_percentage' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'exchange_rate' => 'decimal:4',
        'valid_until' => 'date',
        'sent_date' => 'date',
        'accepted_date' => 'date',
        'rejected_date' => 'date'
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function mainItems(): HasMany
    {
        return $this->hasMany(QuotationItem::class)->whereNull('parent_item_id');
    }

    public function followups(): HasMany
    {
        return $this->hasMany(QuotationFollowup::class);
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function hardwareRepairDetail(): HasOne
    {
        return $this->hasOne(HardwareRepairDetail::class);
    }

    public function termsConditionsTemplates()
    {
        if (!$this->selected_tc_templates || !is_array($this->selected_tc_templates)) {
            return collect([]);
        }

        return TermsConditionsTemplate::whereIn('id', $this->selected_tc_templates)->get();
    }

    public static function generateQuotationNumber($customerId)
    {
        return QuotationSequence::generateQuotationNumber($customerId);
    }

    public function calculateTotals()
    {
        $subtotal = $this->items->sum('item_total');
        $discountAmount = ($this->discount_percentage / 100) * $subtotal;
        $afterDiscount = $subtotal - $discountAmount;
        $taxAmount = $this->items->sum(function ($item) {
            return ($item->tax_rate / 100) * $item->item_total;
        });
        $total = $afterDiscount + $taxAmount;

        $this->update([
            'subtotal' => $subtotal,
            'discount_amount' => $discountAmount,
            'tax_amount' => $taxAmount,
            'total_amount' => $total
        ]);
    }
}