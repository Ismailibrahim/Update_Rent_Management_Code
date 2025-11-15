<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Island;
use App\Models\Nationality;
use App\Models\Asset;
use App\Models\Currency;
use App\Models\PaymentType;
use App\Models\PaymentMode;
use App\Models\RentalUnitType;
use Illuminate\Support\Facades\File;

class ExportMasterDataSeeder extends Seeder
{
    /**
     * Export all master data from database to seeders
     * 
     * Run: php artisan db:seed --class=ExportMasterDataSeeder
     */
    public function run(): void
    {
        $this->command->info("Exporting master data from database...");
        
        // Export Islands
        $islands = Island::orderBy('sort_order')->orderBy('name')->get();
        $this->exportToSeeder('IslandSeeder', 'Island', $islands, ['name', 'code', 'description', 'is_active', 'sort_order']);
        
        // Export Nationalities
        $nationalities = Nationality::orderBy('sort_order')->orderBy('nationality')->get();
        $this->exportToSeeder('NationalitySeeder', 'Nationality', $nationalities, ['nationality', 'sort_order']);
        
        // Export Currencies
        $currencies = Currency::orderBy('is_default', 'desc')->orderBy('code')->get();
        $this->exportToSeeder('CurrencySeeder', 'Currency', $currencies, ['code', 'is_default']);
        
        // Export Payment Types
        $paymentTypes = PaymentType::orderBy('name')->get();
        $this->exportToSeeder('PaymentTypeSeeder', 'PaymentType', $paymentTypes, ['name', 'description', 'is_active']);
        
        // Export Payment Modes
        $paymentModes = PaymentMode::orderBy('name')->get();
        $this->exportToSeeder('PaymentModeSeeder', 'PaymentMode', $paymentModes, ['name', 'is_active']);
        
        // Export Assets
        $assets = Asset::orderBy('category')->orderBy('name')->get();
        $this->exportToSeeder('AssetSeeder', 'Asset', $assets, ['name', 'brand', 'category']);
        
        $this->command->info("Export complete! Check the seeder files for updated data.");
    }
    
    private function exportToSeeder($seederName, $modelName, $items, $fields)
    {
        if ($items->isEmpty()) {
            $this->command->warn("  {$modelName}: No data found");
            return;
        }
        
        $this->command->info("  {$modelName}: Found {$items->count()} records");
        
        // Generate PHP array code
        $dataArray = "[\n";
        foreach ($items as $item) {
            $dataArray .= "            [\n";
            foreach ($fields as $field) {
                $value = $item->$field;
                if (is_bool($value)) {
                    $dataArray .= "                '{$field}' => " . ($value ? 'true' : 'false') . ",\n";
                } elseif (is_null($value)) {
                    $dataArray .= "                '{$field}' => null,\n";
                } elseif (is_string($value)) {
                    $value = addslashes($value);
                    $dataArray .= "                '{$field}' => '{$value}',\n";
                } else {
                    $dataArray .= "                '{$field}' => {$value},\n";
                }
            }
            $dataArray .= "            ],\n";
        }
        $dataArray .= "        ]";
        
        $this->command->line("  Data array for {$modelName}:");
        $this->command->line($dataArray);
        $this->command->line("");
    }
}

