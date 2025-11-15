<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Island;
use Illuminate\Support\Facades\DB;

class IslandSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * This seeder will:
     * 1. Export existing data from database (if any)
     * 2. Seed default islands if table is empty
     */
    public function run(): void
    {
        // Check if there's existing data
        $existingCount = Island::count();
        
        if ($existingCount > 0) {
            // Export existing data
            $islands = Island::orderBy('sort_order')->orderBy('name')->get();
            
            $this->command->info("Found {$existingCount} existing islands in database:");
            foreach ($islands as $island) {
                $this->command->info("  - {$island->name} (ID: {$island->id}, Sort: {$island->sort_order}, Active: " . ($island->is_active ? 'Yes' : 'No') . ")");
            }
            
            // Update this seeder with current data
            $this->command->warn("To update this seeder with current data, run: php artisan db:seed --class=IslandSeeder --force");
            return;
        }
        
        // Default islands for Maldives
        $defaultIslands = [
            ['name' => 'Malé', 'code' => 'MLE', 'sort_order' => 1, 'is_active' => true],
            ['name' => 'Hulhumalé', 'code' => 'HUL', 'sort_order' => 2, 'is_active' => true],
            ['name' => 'Vilimalé', 'code' => 'VIL', 'sort_order' => 3, 'is_active' => true],
            ['name' => 'Thilafushi', 'code' => 'THI', 'sort_order' => 4, 'is_active' => true],
        ];
        
        foreach ($defaultIslands as $islandData) {
            $exists = Island::whereRaw('LOWER(name) = ?', [strtolower($islandData['name'])])->first();
            
            if (!$exists) {
                Island::create($islandData);
                $this->command->info("Created island: {$islandData['name']}");
            } else {
                $this->command->info("Island already exists: {$islandData['name']}");
            }
        }
    }
}

