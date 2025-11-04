<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsLog extends Model
{
    protected $fillable = [
        'tenant_id',
        'rental_unit_id',
        'template_id',
        'phone_number',
        'message_content',
        'status',
        'api_response',
        'error_message',
        'sent_at',
    ];

    protected $casts = [
        'api_response' => 'array',
        'sent_at' => 'datetime',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function rentalUnit()
    {
        return $this->belongsTo(RentalUnit::class);
    }

    public function template()
    {
        return $this->belongsTo(SmsTemplate::class, 'template_id');
    }
}
