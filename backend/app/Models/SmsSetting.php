<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SmsSetting extends Model
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
            'sms_api_url' => 'SMS API endpoint URL',
            'sms_api_key' => 'SMS API key',
            'sms_api_secret' => 'SMS API secret',
            'sms_sender_id' => 'SMS sender ID (phone number or name)',
            'sms_enabled' => 'Enable/disable SMS service',
            'rent_reminder_day' => 'Day of month to send rent reminders (1-31)',
            'rent_reminder_time' => 'Time to send rent reminders (HH:MM format)',
            'timezone' => 'Timezone for scheduling (e.g., Indian/Maldives)',
        ];

        return $descriptions[$key] ?? '';
    }
}
