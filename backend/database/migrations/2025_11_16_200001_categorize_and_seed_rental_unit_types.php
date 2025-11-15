<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Categorize existing types and add missing property-level and unit-level types
     */
    public function up(): void
    {
        // Property-level types (building/complex level)
        $propertyTypes = [
            'Apartment Building' => 'A multi-story building with multiple residential units',
            'Commercial Building' => 'A building primarily for business/commercial use',
            'Residential Complex' => 'A collection of residential buildings',
            'Mixed-Use Building' => 'A building with both residential and commercial spaces',
            'Office Building' => 'A building designed for office spaces',
            'Retail Complex' => 'A shopping center or mall',
            'Industrial Complex' => 'Warehouses and industrial facilities',
            'Villa Complex' => 'A collection of luxury villas',
        ];

        // Unit-level types (individual unit level)
        $unitTypes = [
            'Residential' => 'Standard residential unit',
            'Studio' => 'Small residential unit without separate bedroom',
            '1BR' => 'One bedroom residential unit',
            '2BR' => 'Two bedroom residential unit',
            '3BR' => 'Three bedroom residential unit',
            '4BR' => 'Four bedroom residential unit',
            'Penthouse' => 'Luxury top-floor unit',
        ];

        // Categorize existing types
        $existingTypeMappings = [
            // Map existing types to property-level
            'Apartment' => ['property' => 'Apartment Building', 'unit' => 'Residential'],
            'House' => ['property' => 'House', 'unit' => null], // Keep as property-level only
            'Office' => ['property' => 'Office Building', 'unit' => 'Office'],
            'Shop' => ['property' => 'Retail Complex', 'unit' => 'Retail/Shop'],
            'Warehouse' => ['property' => 'Industrial Complex', 'unit' => 'Warehouse'],
            // Handle other existing types
            'Residential' => ['property' => null, 'unit' => 'Residential'],
            'Other' => ['property' => null, 'unit' => 'Other'],
        ];

        // Update existing types
        foreach ($existingTypeMappings as $existingName => $mappings) {
            $existing = DB::table('rental_unit_types')
                ->whereRaw('LOWER(name) = ?', [strtolower($existingName)])
                ->first();

            if ($existing) {
                // Determine category based on usage
                $propertyCount = DB::table('properties')
                    ->whereRaw('LOWER(type) = ?', [strtolower($existingName)])
                    ->count();
                
                $unitCount = DB::table('rental_units')
                    ->whereRaw('LOWER(unit_type) = ?', [strtolower($existingName)])
                    ->count();

                // If used as property type, categorize as property
                // If used as unit type, categorize as unit
                // If used in both, keep as unit but we'll add property version separately
                if ($propertyCount > 0 && $unitCount == 0) {
                    // Only used as property type
                    DB::table('rental_unit_types')
                        ->where('id', $existing->id)
                        ->update([
                            'category' => 'property',
                            'name' => $mappings['property'] ?? $existing->name,
                            'updated_at' => now()
                        ]);
                } elseif ($unitCount > 0 && $propertyCount == 0) {
                    // Only used as unit type
                    $newName = $mappings['unit'] ?? $existing->name;
                    // Check if the new name already exists (avoid duplicate)
                    $nameExists = DB::table('rental_unit_types')
                        ->whereRaw('LOWER(name) = ?', [strtolower($newName)])
                        ->where('id', '!=', $existing->id)
                        ->exists();
                    
                    if (!$nameExists) {
                        DB::table('rental_unit_types')
                            ->where('id', $existing->id)
                            ->update([
                                'category' => 'unit',
                                'name' => $newName,
                                'updated_at' => now()
                            ]);
                    } else {
                        // Just update category if name already exists
                        DB::table('rental_unit_types')
                            ->where('id', $existing->id)
                            ->update([
                                'category' => 'unit',
                                'updated_at' => now()
                            ]);
                    }
                } else {
                    // Used in both or neither - default to unit and rename
                    if ($mappings['unit']) {
                        $newName = $mappings['unit'];
                        // Check if the new name already exists (avoid duplicate)
                        $nameExists = DB::table('rental_unit_types')
                            ->whereRaw('LOWER(name) = ?', [strtolower($newName)])
                            ->where('id', '!=', $existing->id)
                            ->exists();
                        
                        if (!$nameExists) {
                            DB::table('rental_unit_types')
                                ->where('id', $existing->id)
                                ->update([
                                    'category' => 'unit',
                                    'name' => $newName,
                                    'updated_at' => now()
                                ]);
                        } else {
                            // Just update category if name already exists
                            DB::table('rental_unit_types')
                                ->where('id', $existing->id)
                                ->update([
                                    'category' => 'unit',
                                    'updated_at' => now()
                                ]);
                        }
                    }
                }
            }
        }

        // Add property-level types
        foreach ($propertyTypes as $name => $description) {
            $exists = DB::table('rental_unit_types')
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->exists();

            if (!$exists) {
                DB::table('rental_unit_types')->insert([
                    'name' => $name,
                    'description' => $description,
                    'category' => 'property',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Add unit-level types
        foreach ($unitTypes as $name => $description) {
            $exists = DB::table('rental_unit_types')
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->exists();

            if (!$exists) {
                DB::table('rental_unit_types')->insert([
                    'name' => $name,
                    'description' => $description,
                    'category' => 'unit',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Add missing unit types that might be needed
        $additionalUnitTypes = [
            'Retail/Shop' => 'Retail store or shop space',
        ];

        foreach ($additionalUnitTypes as $name => $description) {
            $exists = DB::table('rental_unit_types')
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->exists();

            if (!$exists) {
                DB::table('rental_unit_types')->insert([
                    'name' => $name,
                    'description' => $description,
                    'category' => 'unit',
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Add "House" as property-level if it doesn't exist
        $houseExists = DB::table('rental_unit_types')
            ->whereRaw('LOWER(name) = ?', ['house'])
            ->exists();

        if (!$houseExists) {
            DB::table('rental_unit_types')->insert([
                'name' => 'House',
                'description' => 'Single-family residential house',
                'category' => 'property',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // Ensure "Other" exists as unit-level
        $otherExists = DB::table('rental_unit_types')
            ->whereRaw('LOWER(name) = ?', ['other'])
            ->exists();

        if (!$otherExists) {
            DB::table('rental_unit_types')->insert([
                'name' => 'Other',
                'description' => 'Any other specialized unit type',
                'category' => 'unit',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Don't delete data, just leave it as is
        // The category column will be removed in the previous migration's down method
    }
};

