<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProductCategory;

class MainCategoriesSeeder extends Seeder
{
    public function run(): void
    {
        // Define the 4 fixed main categories
        $mainCategories = [
            [
                'name' => 'Hardware',
                'description' => 'Computer Hardware and Equipment',
                'category_type' => 'hardware',
                'parent_id' => null,
                'is_active' => true,
            ],
            [
                'name' => 'Software',
                'description' => 'Software Licenses and Applications',
                'category_type' => 'software',
                'parent_id' => null,
                'is_active' => true,
            ],
            [
                'name' => 'Services',
                'description' => 'IT Support and Services',
                'category_type' => 'services',
                'parent_id' => null,
                'is_active' => true,
            ],
            [
                'name' => 'Spare Parts',
                'description' => 'Replacement Parts and Components',
                'category_type' => 'spare_parts',
                'parent_id' => null,
                'is_active' => true,
            ],
        ];

        foreach ($mainCategories as $categoryData) {
            ProductCategory::updateOrCreate(
                [
                    'name' => $categoryData['name'],
                    'parent_id' => null, // Main categories have no parent
                ],
                $categoryData
            );
        }

        $this->command->info('Main categories seeded successfully!');
    }
}









