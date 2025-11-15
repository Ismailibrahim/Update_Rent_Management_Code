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
                'description' => 'Apartment, house, or other residential unit',
                'category' => 'unit',
                'is_active' => true
            ],
            [
                'name' => 'Office',
                'description' => 'Commercial office space',
                'category' => 'unit',
                'is_active' => true
            ],
            [
                'name' => 'Shop',
                'description' => 'Retail shop or store space',
                'category' => 'unit',
                'is_active' => true
            ],
            [
                'name' => 'Warehouse',
                'description' => 'Storage or warehouse facility',
                'category' => 'unit',
                'is_active' => true
            ],
            [
                'name' => 'Other',
                'description' => 'Other types of rental units',
                'category' => 'unit',
                'is_active' => true
            ]
        ];

        foreach ($unitTypes as $unitType) {
            // Check if unit type already exists (by name, case-insensitive)
            $existing = RentalUnitType::whereRaw('LOWER(name) = ?', [strtolower($unitType['name'])])->first();
            
            if (!$existing) {
                RentalUnitType::create($unitType);
            } else {
                // Update existing to ensure category is set
                $existing->update([
                    'category' => 'unit',
                    'is_active' => true
                ]);
            }
        }
    }
}
