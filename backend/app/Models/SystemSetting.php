<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $fillable = [
        'setting_key',
        'setting_value',
        'description',
    ];

    /**
     * Get setting value by key
     */
    public static function getValue(string $key, $default = null)
    {
        $setting = self::where('setting_key', $key)->first();
        return $setting ? $setting->setting_value : $default;
    }

    /**
     * Set setting value by key
     */
    public static function setValue(string $key, $value, string $description = null)
    {
        return self::updateOrCreate(
            ['setting_key' => $key],
            [
                'setting_value' => $value,
                'description' => $description ?? self::getDescription($key),
            ]
        );
    }

    protected static function getDescription(string $key): string
    {
        $descriptions = [
            'invoice_generation_date' => 'Day of month to automatically generate rent invoices (1-31)',
            'invoice_generation_enabled' => 'Enable/disable automatic rent invoice generation',
            'invoice_due_date_offset' => 'Number of days after invoice date to set due date (default: 7)',
        ];

        return $descriptions[$key] ?? '';
    }
}

