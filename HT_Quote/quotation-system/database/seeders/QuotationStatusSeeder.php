<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\QuotationStatus;

class QuotationStatusSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $statuses = [
            [
                'status_name' => 'Draft',
                'status_key' => 'draft',
                'color' => 'gray',
                'sort_order' => 1,
                'is_active' => true
            ],
            [
                'status_name' => 'Sent',
                'status_key' => 'sent',
                'color' => 'blue',
                'sort_order' => 2,
                'is_active' => true
            ],
            [
                'status_name' => 'Accepted',
                'status_key' => 'accepted',
                'color' => 'green',
                'sort_order' => 3,
                'is_active' => true
            ],
            [
                'status_name' => 'Rejected',
                'status_key' => 'rejected',
                'color' => 'red',
                'sort_order' => 4,
                'is_active' => true
            ],
            [
                'status_name' => 'Expired',
                'status_key' => 'expired',
                'color' => 'orange',
                'sort_order' => 5,
                'is_active' => true
            ]
        ];

        foreach ($statuses as $status) {
            QuotationStatus::updateOrCreate(
                ['status_key' => $status['status_key']],
                $status
            );
        }
    }
}
