<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Nationality;
use Illuminate\Support\Facades\DB;

class NationalitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * This seeder will:
     * 1. Export existing data from database (if any)
     * 2. Seed default nationalities if table is empty
     */
    public function run(): void
    {
        // Check if there's existing data
        $existingCount = Nationality::count();
        
        if ($existingCount > 0) {
            // Export existing data
            $nationalities = Nationality::orderBy('sort_order')->orderBy('nationality')->get();
            
            $this->command->info("Found {$existingCount} existing nationalities in database:");
            foreach ($nationalities as $nationality) {
                $this->command->info("  - {$nationality->nationality} (ID: {$nationality->id}, Sort: {$nationality->sort_order})");
            }
            
            // Update this seeder with current data
            $this->command->warn("To update this seeder with current data, run: php artisan db:seed --class=NationalitySeeder --force");
            return;
        }
        
        // Default nationalities
        $defaultNationalities = [
            ['nationality' => 'Maldivian', 'sort_order' => 1],
            ['nationality' => 'Indian', 'sort_order' => 2],
            ['nationality' => 'Sri Lankan', 'sort_order' => 3],
            ['nationality' => 'Bangladeshi', 'sort_order' => 4],
            ['nationality' => 'Nepalese', 'sort_order' => 5],
            ['nationality' => 'Filipino', 'sort_order' => 6],
          
        ];
        
        foreach ($defaultNationalities as $nationalityData) {
            $exists = Nationality::whereRaw('LOWER(nationality) = ?', [strtolower($nationalityData['nationality'])])->first();
            
            if (!$exists) {
                Nationality::create($nationalityData);
                $this->command->info("Created nationality: {$nationalityData['nationality']}");
            } else {
                $this->command->info("Nationality already exists: {$nationalityData['nationality']}");
            }
        }
    }
}

