<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\RentalUnitType;

class RentalUnitTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $unitTypes = [
            [
                'name' => 'Residential',
                'description' => 'Apartment, house, or other residential unit'
            ],
            [
                'name' => 'Office',
                'description' => 'Commercial office space'
            ],
            [
                'name' => 'Shop',
                'description' => 'Retail shop or store space'
            ],
            [
                'name' => 'Warehouse',
                'description' => 'Storage or warehouse facility'
            ],
            [
                'name' => 'Other',
                'description' => 'Other types of rental units'
            ]
        ];

        foreach ($unitTypes as $unitType) {
            RentalUnitType::create($unitType);
        }
    }
}
