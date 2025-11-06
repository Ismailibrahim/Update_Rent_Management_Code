<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Asset;
use Illuminate\Support\Facades\DB;

class AssetSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * This seeder will:
     * 1. Export existing data from database (if any)
     * 2. Seed default assets if table is empty
     */
    public function run(): void
    {
        // Check if there's existing data
        $existingCount = Asset::count();
        
        if ($existingCount > 0) {
            // Export existing data
            $assets = Asset::orderBy('category')->orderBy('name')->get();
            
            $this->command->info("Found {$existingCount} existing assets in database:");
            foreach ($assets as $asset) {
                $this->command->info("  - {$asset->name}" . ($asset->brand ? " ({$asset->brand})" : "") . " - Category: {$asset->category} (ID: {$asset->id})");
            }
            
            // Update this seeder with current data
            $this->command->warn("To update this seeder with current data, run: php artisan db:seed --class=AssetSeeder --force");
            return;
        }
        
        // Default assets (common property assets)
        $defaultAssets = [
            ['name' => 'Air Conditioner', 'category' => 'hvac', 'brand' => null],
            ['name' => 'Refrigerator', 'category' => 'appliance', 'brand' => null],
            ['name' => 'Washing Machine', 'category' => 'appliance', 'brand' => null],
            ['name' => 'Water Heater', 'category' => 'plumbing', 'brand' => null],
            ['name' => 'Television', 'category' => 'electronics', 'brand' => null],
            ['name' => 'Sofa', 'category' => 'furniture', 'brand' => null],
            ['name' => 'Bed', 'category' => 'furniture', 'brand' => null],
            ['name' => 'Dining Table', 'category' => 'furniture', 'brand' => null],
        ];
        
        foreach ($defaultAssets as $assetData) {
            $exists = Asset::whereRaw('LOWER(name) = ?', [strtolower($assetData['name'])])
                ->where('category', $assetData['category'])
                ->first();
            
            if (!$exists) {
                Asset::create($assetData);
                $this->command->info("Created asset: {$assetData['name']} ({$assetData['category']})");
            } else {
                $this->command->info("Asset already exists: {$assetData['name']} ({$assetData['category']})");
            }
        }
    }
}

