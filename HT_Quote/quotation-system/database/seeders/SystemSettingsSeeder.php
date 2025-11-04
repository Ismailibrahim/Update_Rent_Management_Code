<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class SystemSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['setting_key' => 'quotation_validity_days', 'setting_value' => '14', 'description' => 'Default quotation validity period in days'],
            ['setting_key' => 'default_tax_rate', 'setting_value' => '6.00', 'description' => 'Default GST/VAT tax rate percentage'],
            ['setting_key' => 'company_name', 'setting_value' => 'Your IT Company', 'description' => 'Company name for quotations'],
            ['setting_key' => 'company_address', 'setting_value' => 'Your Address', 'description' => 'Company address for quotations'],
            ['setting_key' => 'company_tax_number', 'setting_value' => 'TAX-123456', 'description' => 'Company tax identification number'],
            ['setting_key' => 'default_currency', 'setting_value' => 'USD', 'description' => 'Default currency for quotations'],
            ['setting_key' => 'quotation_number_prefix', 'setting_value' => 'Q', 'description' => 'Prefix for quotation numbers'],
            ['setting_key' => 'quotation_number_format', 'setting_value' => 'Q-{year}-{sequence}-{resort_code}', 'description' => 'Format for quotation numbers'],
            ['setting_key' => 'import_duty_percentage', 'setting_value' => '5.00', 'description' => 'Default import duty percentage for hardware products'],
        ];

        foreach ($settings as $setting) {
            SystemSetting::updateOrCreate(
                ['setting_key' => $setting['setting_key']],
                $setting
            );
        }
    }
}