<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ProductCategory;

class SparePartsCategoriesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $sparePartsCategories = [
            [
                'name' => 'Electronics Spare Parts',
                'category_type' => 'spare_parts',
                'description' => 'Electronic components and spare parts',
                'is_active' => true,
            ],
            [
                'name' => 'Mechanical Spare Parts',
                'category_type' => 'spare_parts',
                'description' => 'Mechanical components and spare parts',
                'is_active' => true,
            ],
            [
                'name' => 'Consumables',
                'category_type' => 'spare_parts',
                'description' => 'Consumable spare parts and supplies',
                'is_active' => true,
            ],
            [
                'name' => 'Accessories',
                'category_type' => 'spare_parts',
                'description' => 'Accessories and add-on components',
                'is_active' => true,
            ],
            [
                'name' => 'Replacement Parts',
                'category_type' => 'spare_parts',
                'description' => 'Direct replacement parts for equipment',
                'is_active' => true,
            ],
        ];

        foreach ($sparePartsCategories as $category) {
            ProductCategory::firstOrCreate(
                ['name' => $category['name']],
                $category
            );
        }
    }
}





