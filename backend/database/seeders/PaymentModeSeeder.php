<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\PaymentMode;
use Illuminate\Support\Facades\DB;

class PaymentModeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * This seeder will:
     * 1. Export existing data from database (if any)
     * 2. Seed default payment modes if table is empty
     */
    public function run(): void
    {
        // Check if there's existing data
        $existingCount = PaymentMode::count();
        
        if ($existingCount > 0) {
            // Export existing data
            $paymentModes = PaymentMode::orderBy('name')->get();
            
            $this->command->info("Found {$existingCount} existing payment modes in database:");
            foreach ($paymentModes as $paymentMode) {
                $this->command->info("  - {$paymentMode->name} (ID: {$paymentMode->id}, Active: " . ($paymentMode->is_active ? 'Yes' : 'No') . ")");
            }
            
            // Update this seeder with current data
            $this->command->warn("To update this seeder with current data, run: php artisan db:seed --class=PaymentModeSeeder --force");
            return;
        }
        
        // Default payment modes
        $defaultPaymentModes = [
            [
                'name' => 'Cash',
                'is_active' => true,
            ],
            [
                'name' => 'Bank Transfer',
                'is_active' => true,
            ],
            [
                'name' => 'Cheque',
                'is_active' => true,
            ],
            [
                'name' => 'Credit Card',
                'is_active' => true,
            ],
            [
                'name' => 'Debit Card',
                'is_active' => true,
            ],
            [
                'name' => 'Mobile Payment',
                'is_active' => true,
            ],
        ];
        
        foreach ($defaultPaymentModes as $paymentModeData) {
            $exists = PaymentMode::whereRaw('LOWER(name) = ?', [strtolower($paymentModeData['name'])])->first();
            
            if (!$exists) {
                PaymentMode::create($paymentModeData);
                $this->command->info("Created payment mode: {$paymentModeData['name']}");
            } else {
                $this->command->info("Payment mode already exists: {$paymentModeData['name']}");
            }
        }
    }
}

