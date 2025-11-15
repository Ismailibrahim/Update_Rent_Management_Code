<?php

namespace Database\Seeders;

use App\Models\TermsConditionsTemplate;
use Illuminate\Database\Seeder;

class TermsConditionsSeeder extends Seeder
{
    public function run(): void
    {
        $templates = [
            [
                'title' => 'General Terms',
                'content' => 'Payment Terms: Net 30 days. All prices are in USD. Quotation valid for 14 days.',
                'category_type' => 'general',
                'is_default' => true
            ],
            [
                'title' => 'Hardware Warranty',
                'content' => 'Hardware Warranty: 1 year limited warranty. On-site support available during business hours.',
                'category_type' => 'hardware',
                'is_default' => false
            ],
            [
                'title' => 'Software License',
                'content' => 'License Terms: Perpetual license. Includes 12 months maintenance. Usage limited to authorized users.',
                'category_type' => 'software',
                'is_default' => true
            ],
            [
                'title' => 'Service Level Agreement',
                'content' => 'SLA: 99.5% uptime guarantee. Support response within 2 business hours.',
                'category_type' => 'services',
                'is_default' => true
            ],
        ];

        foreach ($templates as $template) {
            TermsConditionsTemplate::create($template);
        }
    }
}