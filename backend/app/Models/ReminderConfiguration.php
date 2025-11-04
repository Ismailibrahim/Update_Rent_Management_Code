<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReminderConfiguration extends Model
{
    use HasFactory;

    protected $fillable = [
        'reminder_type',
        'timing_type',
        'days_offset',
        'frequency',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'days_offset' => 'integer',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Get active configurations for a reminder type
     */
    public static function getActiveForType(string $reminderType)
    {
        return self::where('reminder_type', $reminderType)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get();
    }

    /**
     * Get all active configurations
     */
    public static function getAllActive()
    {
        return self::where('is_active', true)
            ->orderBy('reminder_type')
            ->orderBy('sort_order')
            ->get();
    }
}

