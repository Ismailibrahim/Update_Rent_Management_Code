<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    protected $fillable = [
        'quotation_number', 'customer_id', 'status', 'valid_until',
        'currency', 'exchange_rate', 'subtotal', 'discount_amount',
        'discount_percentage', 'tax_amount', 'total_amount', 'notes',
        'terms_conditions', 'selected_tc_templates'
    ];

    protected $casts = [
        'selected_tc_templates' => 'array',
        'subtotal' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'valid_until' => 'date'
    ];

    public function customer() {
        return $this->belongsTo(Customer::class);
    }

    public function items() {
        return $this->hasMany(QuotationItem::class);
    }

    public function mainItems() {
        return $this->hasMany(QuotationItem::class)->whereNull('parent_item_id');
    }

    public static function generateQuotationNumber() {
        $year = date('Y');
        $sequence = QuotationSequence::where('year', $year)->first();
        
        if (!$sequence) {
            $sequence = QuotationSequence::create(['year' => $year, 'last_number' => 0]);
        }
        
        $sequence->increment('last_number');
        $prefix = SystemSetting::getValue('quotation_number_prefix', 'Q');
        
        return "{$prefix}-{$year}-" . str_pad($sequence->last_number, 3, '0', STR_PAD_LEFT);
    }
}