<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HardwareRepairDetail extends Model
{
    protected $fillable = [
        'quotation_id',
        'case_numbers',
        'labour_charges',
        'labour_inclusive',
        'serial_numbers',
    ];

    protected $casts = [
        'labour_inclusive' => 'boolean',
        'labour_charges' => 'decimal:2',
    ];

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    // Helper method to get case numbers as array
    public function getCaseNumbersArray(): array
    {
        if (empty($this->case_numbers)) {
            return [];
        }
        return array_filter(array_map('trim', explode("\n", $this->case_numbers)));
    }

    // Helper method to get serial numbers as array
    public function getSerialNumbersArray(): array
    {
        if (empty($this->serial_numbers)) {
            return [];
        }
        return array_filter(array_map('trim', explode("\n", $this->serial_numbers)));
    }
}
