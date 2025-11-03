<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsTemplate extends Model
{
    protected $fillable = [
        'name',
        'type',
        'content',
        'variables',
        'is_active',
    ];

    protected $casts = [
        'variables' => 'array',
        'is_active' => 'boolean',
    ];

    public function smsLogs()
    {
        return $this->hasMany(SmsLog::class, 'template_id');
    }
}
