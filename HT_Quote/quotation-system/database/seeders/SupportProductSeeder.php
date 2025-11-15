<?php

namespace Database\Seeders;

use App\Models\SupportProduct;
use Illuminate\Database\Seeder;

class SupportProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $products = [
            ['name' => 'OPERA', 'sort_order' => 1, 'is_active' => true],
            ['name' => 'OPERA Cloud', 'sort_order' => 2, 'is_active' => true],
            ['name' => 'RES', 'sort_order' => 3, 'is_active' => true],
            ['name' => '9700', 'sort_order' => 4, 'is_active' => true],
            ['name' => 'Simphony', 'sort_order' => 5, 'is_active' => true],
            ['name' => 'Simphony Cloud', 'sort_order' => 6, 'is_active' => true],
            ['name' => 'MC Support', 'sort_order' => 7, 'is_active' => true],
            ['name' => 'Sun Support', 'sort_order' => 8, 'is_active' => true],
            ['name' => 'Hardware Support', 'sort_order' => 9, 'is_active' => true],
        ];

        foreach ($products as $product) {
            SupportProduct::updateOrCreate(
                ['name' => $product['name']],
                $product
            );
        }
    }
}
