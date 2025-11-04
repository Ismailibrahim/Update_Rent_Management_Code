<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Seeds property types into rental_unit_types table if they don't exist
     */
    public function up(): void
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

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't delete existing data, just leave it as is
    }
};

