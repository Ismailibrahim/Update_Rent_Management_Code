<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\ExpenseCategory;

class ExpenseCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Freight',
                'description' => 'Shipping and transportation costs',
                'sort_order' => 1,
            ],
            [
                'name' => 'Government Tax',
                'description' => 'Import duties and government taxes',
                'sort_order' => 2,
            ],
            [
                'name' => 'Clearance',
                'description' => 'Customs clearance and documentation fees',
                'sort_order' => 3,
            ],
            [
                'name' => 'Insurance',
                'description' => 'Cargo insurance costs',
                'sort_order' => 4,
            ],
            [
                'name' => 'Handling',
                'description' => 'Port handling and loading/unloading fees',
                'sort_order' => 5,
            ],
            [
                'name' => 'Storage',
                'description' => 'Warehouse and storage costs',
                'sort_order' => 6,
            ],
            [
                'name' => 'Inspection',
                'description' => 'Quality inspection and testing fees',
                'sort_order' => 7,
            ],
            [
                'name' => 'Other',
                'description' => 'Other miscellaneous expenses',
                'sort_order' => 8,
            ],
        ];

        foreach ($categories as $category) {
            ExpenseCategory::create($category);
        }
    }
}