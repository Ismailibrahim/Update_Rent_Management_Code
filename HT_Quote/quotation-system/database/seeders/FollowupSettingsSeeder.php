<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\SystemSetting;

class FollowupSettingsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $settings = [
            [
                'setting_key' => 'quotation_first_followup_days',
                'setting_value' => '7',
                'description' => 'Number of days after sending quotation to send first follow-up reminder'
            ],
            [
                'setting_key' => 'quotation_second_followup_days',
                'setting_value' => '14',
                'description' => 'Number of days after sending quotation to send second follow-up reminder'
            ],
            [
                'setting_key' => 'quotation_final_followup_days',
                'setting_value' => '21',
                'description' => 'Number of days after sending quotation to send final follow-up reminder'
            ],
            [
                'setting_key' => 'quotation_auto_expire_days',
                'setting_value' => '30',
                'description' => 'Number of days after sending to automatically mark quotation as expired'
            ],
            [
                'setting_key' => 'followup_send_to_customer',
                'setting_value' => 'true',
                'description' => 'Send follow-up reminder emails to customers'
            ],
            [
                'setting_key' => 'followup_send_to_internal',
                'setting_value' => 'true',
                'description' => 'Send follow-up reminder emails to internal users'
            ],
            [
                'setting_key' => 'followup_internal_email',
                'setting_value' => 'sales@company.com',
                'description' => 'Email address to send internal follow-up reminders to'
            ],
        ];

        foreach ($settings as $setting) {
            SystemSetting::updateOrCreate(
                ['setting_key' => $setting['setting_key']],
                [
                    'setting_value' => $setting['setting_value'],
                    'description' => $setting['description']
                ]
            );
        }
    }
}
