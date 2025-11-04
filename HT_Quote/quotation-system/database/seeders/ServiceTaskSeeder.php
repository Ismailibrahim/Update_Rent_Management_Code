<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ServiceTask;
use App\Models\Product;

class ServiceTaskSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if product with ID 1 exists, if not create a sample service product
        $product = Product::first();
        
        if (!$product) {
            // Create a sample service product if none exists
            $product = Product::create([
                'name' => 'PMS Implementation Support',
                'description' => 'Complete Project Management System implementation service',
                'sku' => 'SVC-PMS-IMP',
                'category_id' => 1, // Assuming category ID 1 exists
                'unit_price' => 12000.00,
                'is_man_day_based' => true,
                'has_amc_option' => true,
                'amc_unit_price' => 2000.00,
                'brand' => 'Service Provider',
                'model' => 'PMS Implementation',
                'is_active' => true,
            ]);
        }

        // Insert service tasks for PMS Implementation Support
        $serviceTasks = [
            [
                'product_id' => $product->id,
                'task_description' => 'Initial requirement gathering and analysis',
                'estimated_man_days' => 2.00,
                'sequence_order' => 1,
            ],
            [
                'product_id' => $product->id,
                'task_description' => 'System configuration and setup',
                'estimated_man_days' => 4.00,
                'sequence_order' => 2,
            ],
            [
                'product_id' => $product->id,
                'task_description' => 'User training and documentation',
                'estimated_man_days' => 3.00,
                'sequence_order' => 3,
            ],
            [
                'product_id' => $product->id,
                'task_description' => 'Go-live support and handover',
                'estimated_man_days' => 2.00,
                'sequence_order' => 4,
            ],
            [
                'product_id' => $product->id,
                'task_description' => 'Post-implementation review',
                'estimated_man_days' => 1.00,
                'sequence_order' => 5,
            ],
        ];

        foreach ($serviceTasks as $taskData) {
            ServiceTask::create($taskData);
        }

        $this->command->info('Service tasks seeded successfully!');
        $this->command->info('Total man days: 12.00');
    }
}

