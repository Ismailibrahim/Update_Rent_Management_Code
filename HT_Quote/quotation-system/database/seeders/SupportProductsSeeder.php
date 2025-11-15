<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SupportProduct;

class SupportProductsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if support products already exist
        if (SupportProduct::count() > 0) {
            $this->command->info('Support products already exist. Skipping seeding.');
            return;
        }

        $supportProducts = [
            [
                'name' => 'OPERA Cloud',
                'is_active' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Simphony Cloud',
                'is_active' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'MC Support',
                'is_active' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'SUN Support',
                'is_active' => true,
                'sort_order' => 4,
            ],
            [
                'name' => 'Opera On Prem',
                'is_active' => true,
                'sort_order' => 5,
            ],
            [
                'name' => 'Simphony On Prem',
                'is_active' => true,
                'sort_order' => 6,
            ],
            [
                'name' => 'R&A Support',
                'is_active' => true,
                'sort_order' => 7,
            ],
            [
                'name' => 'Hardware Support',
                'is_active' => true,
                'sort_order' => 8,
            ],
            [
                'name' => 'Jurudata Support',
                'is_active' => true,
                'sort_order' => 9,
            ],
        ];

        foreach ($supportProducts as $productData) {
            SupportProduct::create($productData);
        }

        $this->command->info('Support products seeded successfully!');
    }
}







