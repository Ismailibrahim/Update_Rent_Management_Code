<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PaymentType;
use Illuminate\Support\Facades\DB;

class PaymentTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * This seeder will:
     * 1. Export existing data from database (if any)
     * 2. Seed default payment types if table is empty
     */
    public function run(): void
    {
        // Check if there's existing data
        $existingCount = PaymentType::count();
        
        if ($existingCount > 0) {
            // Export existing data
            $paymentTypes = PaymentType::orderBy('name')->get();
            
            $this->command->info("Found {$existingCount} existing payment types in database:");
            foreach ($paymentTypes as $paymentType) {
                $this->command->info("  - {$paymentType->name} (ID: {$paymentType->id}, Active: " . ($paymentType->is_active ? 'Yes' : 'No') . ", Description: " . ($paymentType->description ?? 'N/A') . ")");
            }
            
            // Update this seeder with current data
            $this->command->warn("To update this seeder with current data, run: php artisan db:seed --class=PaymentTypeSeeder --force");
            return;
        }
        
        // Default payment types
        $defaultPaymentTypes = [
            [
                'name' => 'Rent',
                'description' => 'Monthly rent payment',
                'is_active' => true,
            ],
            [
                'name' => 'Deposit',
                'description' => 'Security deposit',
                'is_active' => true,
            ],
            [
                'name' => 'Maintenance',
                'description' => 'Maintenance fee',
                'is_active' => true,
            ],
            [
                'name' => 'Utility',
                'description' => 'Utility bill payment',
                'is_active' => true,
            ],
            [
                'name' => 'Other',
                'description' => 'Other payment type',
                'is_active' => true,
            ],
        ];
        
        foreach ($defaultPaymentTypes as $paymentTypeData) {
            $exists = PaymentType::whereRaw('LOWER(name) = ?', [strtolower($paymentTypeData['name'])])->first();
            
            if (!$exists) {
                PaymentType::create($paymentTypeData);
                $this->command->info("Created payment type: {$paymentTypeData['name']}");
            } else {
                $this->command->info("Payment type already exists: {$paymentTypeData['name']}");
            }
        }
    }
}

