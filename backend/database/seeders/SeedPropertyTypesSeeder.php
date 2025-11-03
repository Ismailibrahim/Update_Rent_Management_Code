<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SeedPropertyTypesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Property types that should be in rental_unit_types
        $propertyTypes = [
            'apartment' => 'Apartment building or unit',
            'house' => 'Residential house',
            'villa' => 'Luxury villa',
            'commercial' => 'Commercial property',
            'office' => 'Office space',
            'shop' => 'Retail shop',
            'warehouse' => 'Storage warehouse',
            'land' => 'Vacant land',
            // Unit types that might already exist
            'residential' => 'Residential property',
            'other' => 'Other property type',
        ];

        foreach ($propertyTypes as $name => $description) {
            // Check if type already exists (case-insensitive)
            $exists = DB::table('rental_unit_types')
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->exists();

            if (!$exists) {
                DB::table('rental_unit_types')->insert([
                    'name' => ucfirst($name),
                    'description' => $description,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}

