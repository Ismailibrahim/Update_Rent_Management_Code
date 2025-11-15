<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Currency;
use Illuminate\Support\Facades\DB;

class CurrencySeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * This seeder will:
     * 1. Export existing data from database (if any)
     * 2. Seed default currencies if table is empty
     */
    public function run(): void
    {
        // Check if there's existing data
        $existingCount = Currency::count();
        
        if ($existingCount > 0) {
            // Export existing data
            $currencies = Currency::orderBy('is_default', 'desc')->orderBy('code')->get();
            
            $this->command->info("Found {$existingCount} existing currencies in database:");
            foreach ($currencies as $currency) {
                $this->command->info("  - {$currency->code} (ID: {$currency->id}, Default: " . ($currency->is_default ? 'Yes' : 'No') . ")");
            }
            
            // Update this seeder with current data
            $this->command->warn("To update this seeder with current data, run: php artisan db:seed --class=CurrencySeeder --force");
            return;
        }
        
        // Default currencies
        $defaultCurrencies = [
            ['code' => 'MVR', 'is_default' => true],
            ['code' => 'USD', 'is_default' => false],
            ['code' => 'EUR', 'is_default' => false],
        ];
        
        foreach ($defaultCurrencies as $currencyData) {
            $exists = Currency::where('code', $currencyData['code'])->first();
            
            if (!$exists) {
                Currency::create($currencyData);
                $this->command->info("Created currency: {$currencyData['code']}");
            } else {
                $this->command->info("Currency already exists: {$currencyData['code']}");
            }
        }
    }
}

