<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuotationFollowup extends Model
{
    protected $fillable = [
        'quotation_id',
        'followup_number',
        'due_date',
        'sent_date',
        'status',
        'recipient_type',
        'customer_email_content',
        'internal_email_content',
        'customer_email_status',
        'internal_email_status',
        'error_message',
        'sent_by',
        'notes'
    ];

    protected $casts = [
        'due_date' => 'date',
        'sent_date' => 'date',
    ];

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function sentBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }

    /**
     * Check if this follow-up is overdue
     */
    public function isOverdue(): bool
    {
        return $this->status === 'pending' && $this->due_date->isPast();
    }

    /**
     * Check if this follow-up is due today
     */
    public function isDueToday(): bool
    {
        return $this->status === 'pending' && $this->due_date->isToday();
    }
}
