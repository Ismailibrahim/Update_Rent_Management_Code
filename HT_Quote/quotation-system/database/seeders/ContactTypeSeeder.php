<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\ContactType;

class ContactTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $contactTypes = [
            [
                'name' => 'Primary',
                'description' => 'Main contact person for the customer',
                'color' => '#3B82F6',
                'is_active' => true,
                'sort_order' => 1
            ],
            [
                'name' => 'Manager',
                'description' => 'Management level contact',
                'color' => '#10B981',
                'is_active' => true,
                'sort_order' => 2
            ],
            [
                'name' => 'Technical',
                'description' => 'Technical support contact',
                'color' => '#F59E0B',
                'is_active' => true,
                'sort_order' => 3
            ],
            [
                'name' => 'Billing',
                'description' => 'Billing and payment contact',
                'color' => '#EF4444',
                'is_active' => true,
                'sort_order' => 4
            ],
            [
                'name' => 'Operations',
                'description' => 'Operations and logistics contact',
                'color' => '#8B5CF6',
                'is_active' => true,
                'sort_order' => 5
            ],
            [
                'name' => 'Other',
                'description' => 'Other type of contact',
                'color' => '#6B7280',
                'is_active' => true,
                'sort_order' => 6
            ]
        ];

        foreach ($contactTypes as $contactType) {
            ContactType::updateOrCreate(
                ['name' => $contactType['name']],
                $contactType
            );
        }
    }
}
